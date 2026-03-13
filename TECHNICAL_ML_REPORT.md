# AI Job Scam Detector — Technical ML Report

## Abstract

This system implements a multi-layered fraud detection pipeline for job postings, combining supervised text classification, statistical stylometry, named entity recognition, regression-based salary anomaly detection, and ensemble heuristic scoring. The primary classifier achieves **98.55% accuracy** on a binary classification task (legitimate vs. fraudulent) using a Linear SVM trained on TF-IDF feature vectors extracted from 17,880 labeled job postings.

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

Five classifiers were trained using an **80/20 stratified train-test split** (14,304 training samples, 3,576 test samples) to preserve class distribution (the dataset is highly imbalanced: ~95.2% legitimate, ~4.8% fraudulent):

| Model                   | Accuracy   | Precision  | Recall     | F1-Score   | TP  | FP  | FN  | TN   |
| ----------------------- | ---------- | ---------- | ---------- | ---------- | --- | --- | --- | ---- |
| **SVM (Linear)** ★      | **98.55%** | **96.18%** | **72.83%** | **82.89%** | 126 | 5   | 47  | 3398 |
| Random Forest           | 97.99%     | 100.0%     | 58.38%     | 73.72%     | 101 | 0   | 72  | 3403 |
| Gradient Boosting       | 97.79%     | 91.96%     | 59.54%     | 72.28%     | 103 | 9   | 70  | 3394 |
| Logistic Regression     | 97.40%     | 100.0%     | 46.24%     | 63.24%     | 80  | 0   | 93  | 3403 |
| Multinomial Naive Bayes | 96.98%     | 88.24%     | 43.35%     | 58.14%     | 75  | 10  | 98  | 3393 |

**Winner: Linear SVM** — selected by highest accuracy. Notably, SVM achieves the best F1-score (82.89%) and recall (72.83%), meaning it catches the most fraudulent postings while maintaining 96.18% precision. The linear kernel operates in the TF-IDF feature space without kernel trick transformation, making it computationally efficient for high-dimensional sparse text data.

### 1.3 Class Imbalance

The dataset exhibits significant class imbalance (19.5:1 ratio). This explains why all models achieve >96% accuracy (majority class baseline is ~95.2%) but show lower recall on the minority class (scam). The SVM's superior recall (72.83% vs. 43-59% for others) makes it the optimal choice for this fraud detection use case where **false negatives are more costly than false positives**.

---

## 2. Explainable AI (XAI) — Feature Attribution

Post-hoc interpretability is achieved through **linear model coefficient analysis**. For models with a `coef_` vector (Logistic Regression, Linear SVM), each feature's contribution to a prediction is computed as:

```
contribution_i = coefficient_i × tfidf_value_i
```

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

## 5. Named Entity Recognition — Transfer Learning

Entity extraction leverages **spaCy's `en_core_web_sm`** pre-trained pipeline — a CNN-based NER model trained on OntoNotes 5.0 (1,745K tokens). The model recognizes 18 entity types; we utilize 5 for job scam analysis:

| Entity Type         | Label  | Application                                    |
| ------------------- | ------ | ---------------------------------------------- |
| Organization        | ORG    | Company name extraction, legitimacy validation |
| Geopolitical Entity | GPE    | Location extraction, "no location" scam signal |
| Monetary Value      | MONEY  | Salary entity detection                        |
| Person              | PERSON | Resume candidate name extraction               |
| Date                | DATE   | Timeline extraction from resumes               |

NER outputs are integrated into 4 downstream modules: scraping (entity enrichment), explanation (entity-based scam signals), resume parsing (contact/employer extraction), and company scoring (ORG entity validation adding +10 to trust heuristic).

---

## 6. Resume-Job Matching — Cosine Similarity + Feature Matching

Document similarity is computed using **cosine similarity** on TF-IDF vectors (3,000 features, separate vectorizer from the classifier). This captures semantic alignment between resume and job description in the vector space.

A secondary **set-intersection metric** computes exact skill overlap ratio using a curated taxonomy of 200+ skills across 7 categories, matched via regex word-boundary patterns (`\b{skill}\b`).

Final match score blends both signals: `0.4 × cosine_similarity + 0.6 × skill_match_ratio`.

---

## 7. Ensemble Risk Scoring

The final risk score is a **weighted linear combination** of three independent signals:

```
risk_score = 0.50 × P(scam|text) + 0.30 × salary_anomaly + 0.20 × domain_score
```

This multi-signal ensemble reduces variance and provides robustness against adversarial evasion of any single detection modality.

---

_Dataset: 17,880 labeled job postings | 5 classifiers | 98.55% accuracy | Linear SVM selected | TF-IDF (5K features, bigrams)_
