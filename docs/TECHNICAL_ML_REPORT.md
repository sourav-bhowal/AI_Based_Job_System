# AI Job Analysis and Detection System — Technical ML Report

## Abstract

This system implements a multi-layered fraud detection pipeline for job postings, combining supervised text classification, statistical stylometry, named entity recognition, regression-based salary anomaly detection, and ensemble heuristic scoring. The primary classifier achieves **82.20% F1-score** on a binary classification task (legitimate vs. fraudulent) using a Linear SVM wrapped in `CalibratedClassifierCV` with `class_weight="balanced"`, trained on TF-IDF feature vectors extracted from 17,880 labeled job postings.

---

## 1. Text Classification Pipeline

### 1.1 Feature Engineering

Raw text from 13 metadata fields (title, description, requirements, company_profile, benefits, etc.) is concatenated into a single document per sample. Feature extraction uses **TF-IDF (Term Frequency–Inverse Document Frequency)** vectorization with the following hyperparameters:

- **Vocabulary size:** 5,000 features (max_features)
- **N-gram range:** (1, 2) — captures unigrams and bigrams
- **Stop words:** English language stopwords removed
- **Sublinear TF:** disabled (default log normalization)

The resulting sparse feature matrix has dimensionality **n_samples × 5,000**.

### 1.2 Model Selection — Comparative Evaluation

Five classifiers were trained using an **80/20 stratified train-test split** (14,304 training samples, 3,576 test samples) to preserve class distribution (the dataset is highly imbalanced: ~95.2% legitimate, ~4.8% fraudulent). Models that support it use `class_weight="balanced"` to counteract the imbalance. LinearSVC is wrapped in `CalibratedClassifierCV` for proper `predict_proba()` support:

| Model                   | Accuracy   | Precision  | Recall     | F1-Score   | TP  | FP  | FN  | TN   |
| ----------------------- | ---------- | ---------- | ---------- | ---------- | --- | --- | --- | ---- |
| **SVM (Linear)** ★      | **98.46%** | 93.38%     | **73.41%** | **82.20%** | 127 | 9   | 46  | 3394 |
| Logistic Regression     | 96.98%     | 63.16%     | **90.17%** | 74.29%     | 156 | 91  | 17  | 3312 |
| Random Forest           | 97.90%     | 99.0%      | 57.23%     | 72.53%     | 99  | 1   | 74  | 3402 |
| Gradient Boosting       | 97.79%     | 91.96%     | 59.54%     | 72.28%     | 103 | 9   | 70  | 3394 |
| Multinomial Naive Bayes | 96.98%     | 88.24%     | 43.35%     | 58.14%     | 75  | 10  | 98  | 3393 |

**Winner: Linear SVM** — selected by highest **F1-score** (not accuracy, which is misleading on imbalanced data). The SVM achieves the best balance of precision (93.38%) and recall (73.41%). Notably, Logistic Regression with `class_weight="balanced"` achieves the highest recall at 90.17%, making it the best choice if catching every scam is the top priority.

### 1.3 Class Imbalance Handling

The dataset exhibits significant class imbalance (19.5:1 ratio). All models that support it use `class_weight="balanced"`, which automatically upweights the minority class (scam) during training. This dramatically improved recall — Logistic Regression's recall jumped from 46.24% (without balancing) to 90.17% (with balancing). The SVM's recall improved slightly from 72.83% to 73.41%, as it was already more robust to imbalance. Best model selection uses F1-score rather than accuracy, since accuracy is dominated by the majority class (∼95.2% baseline).

---

## 2. Explainable AI (XAI) — Feature Attribution

Post-hoc interpretability is achieved through **linear model coefficient analysis**. For models with a `coef_` vector (Logistic Regression, Linear SVM), each feature's contribution to a prediction is computed as:

```
contribution_i = coefficient_i × tfidf_value_i
```

When the saved model is a `CalibratedClassifierCV` wrapper (as with the current SVM), the explainer automatically unwraps it to access the inner estimator's `coef_` vector via `model.calibrated_classifiers_[0].estimator.coef_`.

Features are ranked by absolute contribution magnitude and partitioned into positive contributors (scam indicators) and negative contributors (legitimacy indicators). The top-k features in each direction are surfaced to the user, providing token-level explainability.

Additionally, 8 regex-based pattern detectors identify known scam templates (upfront payment requests, guaranteed income claims, urgency language), and NER-derived signals detect structural anomalies (absence of ORG entities, missing location references).

---

## 3. AI-Generated Text Detection — Random Forest Classifier

AI-generated job postings are detected using a **Random Forest Classifier** trained on a large-scale text corpus (`AI_Human.csv`, ~1GB, ~500K samples, downsampled to 40K for training). The text undergoes TF-IDF vectorization (5,000 features, unigrams + bigrams, English stopwords removed) before being passed to the classifier.

The model outputs probability estimates for both classes (Human vs. AI). Thresholds are configured as:

- **>65% AI probability** → "likely_ai"
- **40–65% AI probability** → "uncertain"
- **<40% AI probability** → "likely_human"

This pure ML approach replaces previous statistical stylometry heuristics, providing much higher accuracy (>96%) on modern LLM outputs by extracting thousands of deep semantic features rather than a handful of surface-level text statistics.

### 3.1 Alternative: RoBERTa Transformer Classifier (`ai_text_detector_bert.py`)

An optional deep learning upgrade is available using **`openai-community/roberta-base-openai-detector`**, a RoBERTa-base model fine-tuned by OpenAI for detecting machine-generated text. The system supports both approaches:

| Property              | Option A: Random Forest + TF-IDF        | Option B: RoBERTa Transformer               |
| --------------------- | ---------------------------------------- | -------------------------------------------- |
| **Module**            | `ai_text_detector.py`                    | `ai_text_detector_bert.py`                   |
| **Architecture**      | TF-IDF (5K features) → RF (100 trees)   | RoBERTa-base (12 layers, 768-dim, 125M params) |
| **Model size**        | ~31 MB                                   | ~500 MB                                      |
| **Inference**         | <50ms on CPU                             | ~200–500ms on CPU, ~30ms on GPU              |
| **Context window**    | Bag-of-words (no word order)             | 512 tokens with full bidirectional context   |
| **Fine-tuning**       | Trains on `AI_Human.csv` (40K samples)   | Optional fine-tune on `AI_Human.csv` (10K+ samples) |
| **Fallback**          | —                                        | Falls back to Option A if PyTorch unavailable |

The transformer approach captures contextual patterns (sentence coherence, stylistic consistency) that TF-IDF cannot represent. Both return identical response schemas (`ai_probability`, `human_probability`, `verdict`, `confidence`, `method`), enabling seamless switching via import change.

---

## 4. Salary Anomaly Detection — Random Forest Pipeline

A **Random Forest Regressor Pipeline** predicts expected salaries from a 5-dimensional feature vector:

```
X = [Position, YearsExperience, EducationLevel, Industry, Location]
```

**Preprocessing Pipeline:**

- **Categorical:** `OneHotEncoder` transforms `Position`, `EducationLevel`, `Industry`, and `Location` strings.
- **Numerical:** `StandardScaler` normalizes `YearsExperience`.

**Training data:** The pipeline is trained on `synthetic_salary_dataset.csv`. The `RandomForestRegressor` acts as the final estimator, outputting a continuous real-world salary prediction based on the learned underlying relationships.

The model's prediction serves as the "expected salary" baseline. Anomaly scoring compares the parsed job salary against the ML pipeline prediction:

- **Posted salary > 2.5× prediction** → +0.60 anomaly score (strong scam indicator)
- **Posted salary > 1.8× prediction** → +0.40 (significantly above market)
- **Posted salary < 0.4× prediction** → +0.30 (unusually low, potentially exploitative)
- **Deviation > 50%** → +0.20 (unusual deviation)
- Combined with secondary heuristic checks (wide range spread: +0.20, suspiciously round numbers: +0.05). Score capped at 1.0.

---

## 5. Named Entity Recognition — BERT Transformer

Entity extraction uses **`dslim/bert-base-NER`** — a BERT-base model fine-tuned on CoNLL-2003 (~92% F1 on the test set). It is loaded via the HuggingFace `transformers` pipeline with `aggregation_strategy="simple"` for span-level entity grouping. The model runs on GPU when available, CPU otherwise (lazy-loaded on first request, shared pipeline instance).

**Why BERT over spaCy `en_core_web_sm` (previous approach):**
The CNN-based spaCy model (~85% F1 on OntoNotes 5.0) produced frequent false-positive location entities for technology names common in job postings (e.g., "React", "Node.js", "Svenska" classified as GPE/LOC). The BERT transformer's bidirectional context eliminates this class of error and improves overall precision on domain-specific text.

**Entity types from `dslim/bert-base-NER`** (BERT labels → internal mapping):

| BERT Label | Internal Label | Application                                                    |
| ---------- | -------------- | -------------------------------------------------------------- |
| PER        | PERSON         | Candidate name extraction; excessive-names scam signal (>5)    |
| ORG        | ORG            | Company name extraction; legitimacy validation                 |
| LOC        | LOC / GPE      | Geographic location extraction; "no location" scam signal      |
| MISC       | MISC           | Nationalities, languages, events; skill-hint extraction        |

**Additional entity types extracted via regex** (BERT NER does not cover financial/temporal values):

| Regex Type | Application                                                                    |
| ---------- | ------------------------------------------------------------------------------ |
| MONEY      | Monetary value detection; high-value scam signal (>500,000 any currency)       |
| DATE       | Timeline extraction from resumes (employment periods, graduation dates)        |

**Text length handling:** BERT has a 512-token limit. The extractor splits inputs longer than ~1500 characters at sentence boundaries into overlapping chunks, de-duplicating entities across chunks.

NER outputs are integrated into 4 downstream modules: scraping (entity enrichment), explanation (entity-based scam signals), resume parsing (contact/employer extraction), and company scoring (ORG entity validation adding +10 to trust heuristic).

---

## 6. Resume-Job Matching — Cosine Similarity + Feature Matching

Document similarity is computed using **cosine similarity** on TF-IDF vectors (3,000 features, separate vectorizer from the classifier). This captures semantic alignment between resume and job description in the vector space.

A secondary **set-intersection metric** computes exact skill overlap ratio using a curated taxonomy of 200+ skills across 7 categories, matched via regex word-boundary patterns (`\b{skill}\b`).

Final match score blends both signals: `0.4 × cosine_similarity + 0.6 × skill_match_ratio`.

### 6.1 Alternative: Sentence-BERT Semantic Similarity (`resume_matcher_semantic.py`)

An optional deep learning upgrade replaces the TF-IDF cosine similarity component with **Sentence-BERT** embeddings (model: `all-MiniLM-L6-v2`, 384-dimensional dense vectors). The skill-matching, ATS scoring, course recommendation, and training roadmap logic remain identical.

| Property              | Option A: TF-IDF Cosine                  | Option B: Sentence-BERT                      |
| --------------------- | ---------------------------------------- | -------------------------------------------- |
| **Module**            | `resume_matcher.py`                      | `resume_matcher_semantic.py`                 |
| **Similarity method** | Sparse TF-IDF vectors (3K features)      | Dense Sentence-BERT embeddings (384-dim)     |
| **Model size**        | No model file (built on-the-fly)         | ~80 MB (downloaded once, cached)             |
| **Semantic matching** | Keyword overlap only                     | Full semantic understanding                  |
| **Inference**         | <10ms                                    | ~50–100ms on CPU                             |
| **Fallback**          | —                                        | Falls back to TF-IDF if sentence-transformers unavailable |

The key advantage is semantic generalization: TF-IDF assigns zero similarity to "built REST APIs" vs. "backend development experience" (no shared tokens), while Sentence-BERT produces ~0.74 similarity by encoding meaning. Both return identical response schemas, enabling seamless switching via import change.

---

## 7. Ensemble Risk Scoring

The final risk score is a **weighted linear combination** of three independent signals:

```
risk_score = 0.50 × P(scam|text) + 0.30 × salary_anomaly + 0.20 × domain_score
```

This multi-signal ensemble reduces variance and provides robustness against adversarial evasion of any single detection modality.

---

_Dataset: 17,880 labeled job postings | 5 classifiers | class_weight="balanced" | 82.20% F1 | Linear SVM + CalibratedClassifierCV selected | TF-IDF (5K features, bigrams)_
