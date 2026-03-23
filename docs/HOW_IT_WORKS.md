# AI Job Analysis and Detection System — How Everything Works (Presentation Guide)

> Written for **web developers** — no AI/ML background needed.
> This explains _why_ every decision was made, _how_ each piece works, and _what_ every concept means.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [How the ML Models Work](#how-the-ml-models-work)
3. [Why These 5 Models Were Chosen](#why-these-5-models-were-chosen)
4. [TF-IDF — How Text Becomes Numbers](#tf-idf--how-text-becomes-numbers)
5. [How the Models Are Trained](#how-the-models-are-trained)
6. [The Risk Scoring System](#the-risk-scoring-system)
7. [Explainable AI — Why a Job Was Flagged](#explainable-ai--why-a-job-was-flagged)
8. [AI Text Generator Detector — Catching ChatGPT Scams](#ai-text-generator-detector--catching-chatgpt-scams)
9. [Named Entity Recognition (NER) — Why & How](#named-entity-recognition-ner--why--how)
10. [Resume Parsing — How Text is Extracted](#resume-parsing--how-text-is-extracted)
11. [Resume-Job Matching — TF-IDF Cosine Similarity](#resume-job-matching--tf-idf-cosine-similarity)
12. [ATS Score — What It Is & How It's Calculated](#ats-score--what-it-is--how-its-calculated)
13. [Salary Prediction with Random Forest — ML-Enhanced Anomaly Detection](#salary-prediction-with-random-forest--ml-enhanced-anomaly-detection)
14. [Salary Anomaly Detection — How It Catches Fake Salaries](#salary-anomaly-detection--how-it-catches-fake-salaries)
15. [Company Trust Scoring — The 4-Signal Approach](#company-trust-scoring--the-4-signal-approach)
16. [Auto-Blacklisting — How Community Reports Build a Database](#auto-blacklisting--how-community-reports-build-a-database)
17. [Course Recommendations & Training Roadmap](#course-recommendations--training-roadmap)
18. [Key ML Metrics — What Accuracy, Precision, Recall, F1 Mean](#key-ml-metrics--what-accuracy-precision-recall-f1-mean)
19. [Glossary of Terms](#glossary-of-terms)

---

## The Big Picture

Imagine you're a job seeker. You find a job posting online. How do you know if it's real or a scam?

**Our system answers this question using 7 layers of analysis:**

```
  Job Posting URL / Text
         │
         ▼
  ┌──────────────────────────────────────────────┐
  │  Layer 1: Web Scraping                       │
  │  Pull the text off the web page              │
  ├──────────────────────────────────────────────┤
  │  Layer 2: ML Model Prediction                │
  │  Trained on 17,880 real job posts (scam vs   │
  │  legitimate). Predicts: "is this a scam?"    │
  ├──────────────────────────────────────────────┤
  │  Layer 3: AI Text Generator Detection        │
  │  Was this post written by ChatGPT?           │
  │  Random Forest ML classifier on TF-IDF       │
  ├──────────────────────────────────────────────┤
  │  Layer 4: NER (Named Entity Recognition)     │
  │  Finds company names, locations, salaries    │
  │  using dslim/bert-base-NER (BERT transformer)│
  ├──────────────────────────────────────────────┤
  │  Layer 5: Salary Anomaly Detection           │
  │  RF Regressor predicts expected salary,      │
  │  compares against posted salary + benchmarks │
  ├──────────────────────────────────────────────┤
  │  Layer 6: Email Domain Analysis              │
  │  Is the contact email from gmail.com?        │
  │  Or does the domain even exist?              │
  ├──────────────────────────────────────────────┤
  │  Layer 7: Community Reports                  │
  │  Has anyone else reported this company?      │
  └──────────────────────────────────────────────┘
         │
         ▼
    Risk Score: 0—100
    (0 = totally safe, 100 = definitely scam)
```

---

## How the ML Models Work

### What is a Machine Learning Model?

Think of it like this: if you've seen 1000 scam emails and 1000 real emails, you start noticing _patterns_ — scam emails use words like "guaranteed income", "urgent", "no experience needed".

A **machine learning model** does the same thing, but with math. You feed it thousands of examples labeled "scam" or "legit", and it _learns the patterns automatically_.

### The Process (in web developer terms):

1. **Training** = teaching the model using labeled data (like seeding a database)
2. **Prediction** = asking the trained model about new, unseen data (like querying the database)
3. **Model file (.pkl)** = the saved "knowledge" (like a database dump you can reload)

---

## Why These 5 Models Were Chosen

We train **5 different models** and pick the best one. Here's why each was included:

### 1. Logistic Regression

- **What it is:** The simplest ML classifier. Draws a "line" between scam and legit texts.
- **Why included:** It's fast, interpretable (we can see _which words_ matter), and works great on text data. It's our default winner because you can inspect its decision — which is critical for explaining to users _why_ a job was flagged.
- **Web analogy:** Like a simple `if (score > threshold) return "scam"` — but the score is calculated from thousands of word weights learned automatically.

### 2. Random Forest

- **What it is:** Builds 100 "decision trees" (think nested `if/else` statements) and lets them vote.
- **Why included:** Good at handling messy, real-world data. Doesn't overfit easily. Acts as a strong baseline to compare against.
- **Web analogy:** Like having 100 spam filters, each looking at different features, and taking a majority vote.

### 3. Support Vector Machine (SVM)

- **What it is:** Finds the "widest boundary" between scam and legit texts in high-dimensional space.
- **Why included:** Extremely effective for text classification. Often the top performer on NLP tasks. Fast to train with linear kernel.
- **Web analogy:** Like finding the most definitive rule that separates two categories with the biggest margin of safety.

### 4. Naive Bayes

- **What it is:** Uses probability theory (Bayes' theorem). Calculates: "given these words appear, what's the probability this is a scam?"
- **Why included:** Classic spam detection algorithm. Gmail's original spam filter used Naive Bayes. Very fast and surprisingly effective.
- **Web analogy:** Like calculating: "If an email contains 'guaranteed income', there's a 90% chance it's spam."

### 5. Gradient Boosting

- **What it is:** Builds many small decision trees _sequentially_, where each new tree corrects the mistakes of the previous ones.
- **Why included:** Often wins machine learning competitions. Very accurate. Included to see if it outperforms simpler models on our data.
- **Web analogy:** Like iteratively debugging code — each pass fixes the errors from the previous pass.

### Why not just use one model?

Because you don't know which works best until you try. By training all 5 and comparing metrics (accuracy, precision, recall, F1), we scientifically pick the best one. The winner is saved as `model.pkl`.

**In our case, SVM (Linear) wins** with the best **F1-score (82.20%)** and **73% recall on scams**. Here's why:

1. Linear SVM is highly effective on high-dimensional sparse text data (TF-IDF vectors)
2. It achieves strong recall (73.41%) — meaning it catches most scams while keeping precision at 93.38%
3. With `CalibratedClassifierCV` wrapping, it gains proper `predict_proba()` support for calibrated probability estimates
4. Like Logistic Regression, Linear SVM has a `coef_` vector (accessible via the wrapped estimator), so we still get full **explainability** (we can show _which words_ caused the flag)
5. All models use `class_weight="balanced"` to handle the 95:5 dataset imbalance — this dramatically improved Logistic Regression's recall from 46% → 90%

---

## TF-IDF — How Text Becomes Numbers

ML models can't read text. They need numbers. So how do we convert "This job offers guaranteed income" into numbers a model can understand?

### The Problem

Computers don't understand English. They understand numbers. We need to convert:

```
"This job offers guaranteed income with no experience needed"
```

into something like:

```
[0, 0, 0.42, 0, 0.67, 0.31, 0, ...]   (a vector of 5000 numbers)
```

### The Solution: TF-IDF (Term Frequency-Inverse Document Frequency)

**Step 1: Term Frequency (TF)**
How often does this word appear in _this_ document?

```
"guaranteed" appears 3 times in a 100-word posting → TF = 3/100 = 0.03
```

**Step 2: Inverse Document Frequency (IDF)**
How rare is this word across _all_ documents?

```
"the" appears in 99% of postings → IDF is LOW (not useful)
"guaranteed" appears in only 2% of postings → IDF is HIGH (very useful!)
```

**Step 3: TF × IDF = TF-IDF Score**

```
Common words like "the", "is", "and" → low TF-IDF (filtered out)
Rare, meaningful words like "guaranteed", "upfront fee" → high TF-IDF (kept)
```

### Our Configuration

```python
TfidfVectorizer(
    stop_words="english",    # Remove "the", "is", "and", etc.
    max_features=5000,       # Keep only top 5000 most important words
    ngram_range=(1, 2)       # Look at single words AND two-word phrases
)
```

**Why `ngram_range=(1,2)`?** Because "no experience" as a phrase means something different than "no" and "experience" separately. Two-word phrases (bigrams) capture these patterns.

**Why `max_features=5000`?** If we kept all 50,000+ unique words, the model would be slow and might overfit (memorize noise instead of learning patterns). 5000 is the sweet spot.

### Web Analogy

Think of TF-IDF like a **search engine's relevance scoring**. When you search "python tutorial" on Google, it ranks pages by how relevant those specific words are. Common words like "the" are ignored, and rare matches like "python Django tutorial" are boosted.

---

## How the Models Are Trained

### The Dataset: `fake_job_postings.csv`

- **17,880 job postings** from real job boards
- Each labeled as `fraudulent = 0` (real) or `fraudulent = 1` (scam)
- Has 17 columns: title, description, requirements, salary_range, company_profile, etc.

### Training Steps (file: `train_model.py`)

```
Step 1: Load CSV → 17,880 rows
        ▼
Step 2: Combine 13 text columns into one "text" field
        (because scam signals can be in any field)
        ▼
Step 3: Split into Training (80%) and Test (20%)
        - Training: ~14,304 examples → model learns from these
        - Test:     ~3,576 examples  → model is tested on these (never seen before)
        - "stratified" = keeps the same scam/legit ratio in both sets
        ▼
Step 4: TF-IDF vectorize all text → 5000-dimension number vectors
        ▼
Step 5: Train all 5 models on the training set
         (with class_weight="balanced" for LR, RF, SVM to handle 95:5 imbalance)
        ▼
Step 6: Test all 5 models on the test set → get accuracy/precision/recall/F1
        ▼
Step 7: Pick the best model (highest F1 score — not accuracy, because accuracy
         is misleading on imbalanced data where 95% is the majority class)
        ▼
Step 8: Save to model.pkl and vectorizer.pkl
```

### Why 80/20 Split?

If you train AND test on the same data, the model just memorizes answers (like an open-book exam). The 20% test set is data the model has **never seen** — this tells us how well it will perform on real, new job postings.

### Why Save the Vectorizer Too?

The vectorizer learned a specific vocabulary of 5000 words during training. When a new job posting comes in, we need the **same vocabulary** to convert it to numbers. If we used a different vectorizer, the word positions would be different and the model's predictions would be wrong.

---

## The Risk Scoring System

The final risk score is **not** just the ML model output. It's a **weighted combination** of 3 signals:

```
Final Score = (50% × NLP Score) + (30% × Salary Score) + (20% × Domain Score)
```

### Why these weights?

| Signal                   | Weight | Why                                                                                                       |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------------- |
| **NLP Score** (ML model) | 50%    | Most reliable — trained on 17,880 examples. The text of a job posting is the strongest signal.            |
| **Salary Score**         | 30%    | Scam jobs often promise crazy salaries ("Earn $5000/week!"). This is a strong red flag.                   |
| **Domain Score**         | 20%    | If the recruiter uses a gmail.com email instead of company email, that's suspicious — but not conclusive. |

### Why not 100% ML?

Because ML models aren't perfect. A scam job with grammatically good text might fool the ML model, but the salary ($1M/year for an intern?) or the email (gmail.com) would still catch it. **Multiple layers of defense** = more robust.

### Risk Levels

| Score  | Level           | Meaning                  |
| ------ | --------------- | ------------------------ |
| 0–29   | **Safe**        | Looks legitimate         |
| 30–59  | **Medium Risk** | Some suspicious elements |
| 60–100 | **High Risk**   | Strong scam indicators   |

---

## Explainable AI — Why a Job Was Flagged

### The Problem

If your system just says "Risk: 85% — High Risk", the user asks: **"Why? What specifically is suspicious?"**

This is the most important part for user trust.

### How It Works (file: `explainer.py`)

**Step 1: Feature Contributions**

Remember that TF-IDF converts text into 5000 numbers? And linear models (like our SVM or Logistic Regression) have 5000 corresponding "weights" (coefficients)? Our trained model is an SVM wrapped in `CalibratedClassifierCV` — the explainer automatically unwraps this to access the inner SVM's `coef_` vector.

```
For each word in the job posting:
  contribution = coefficient[word] × tfidf_value[word]

  If contribution > 0 → word pushes TOWARDS scam
  If contribution < 0 → word pushes TOWARDS legitimate
```

**Example:**

```
"guaranteed" → coefficient: +2.3, tfidf: 0.15 → contribution: +0.345 (scam signal!)
"requirements" → coefficient: -1.8, tfidf: 0.12 → contribution: -0.216 (legit signal!)
```

**Step 2: Sort by Impact**

We sort all words by how much they contributed (positive or negative) and show the top 10 in each direction.

**Step 3: Red Flag Detection (Regex Patterns)**

On top of the ML explanation, we also scan for **known scam patterns** using regular expressions:

| Red Flag                 | What It Catches                          | Severity    |
| ------------------------ | ---------------------------------------- | ----------- |
| **Upfront Payment**      | "registration fee", "pay for training"   | 🔴 Critical |
| **Personal Info Early**  | "send your Aadhaar/PAN/bank details"     | 🔴 Critical |
| **Guaranteed Income**    | "earn $5000/week guaranteed"             | 🟠 High     |
| **No Experience Needed** | "no experience required, work from home" | 🟠 High     |
| **WhatsApp Only**        | "contact us on WhatsApp"                 | 🟠 High     |
| **Urgency**              | "apply NOW, limited spots"               | 🟡 Medium   |
| **Generic Email**        | "send CV to <hr@gmail.com>"              | 🟡 Medium   |
| **Vague Description**    | "various tasks and activities"           | 🟢 Low      |

### Step 4: NER Entity Analysis

We also check what the BERT NER model found:

- **No company name detected?** → Suspicious (legit postings always mention the company)
- **No location?** → Slightly suspicious
- **Very high monetary values?** → Could be a "guaranteed income" scam

### Why Is This Important?

1. **User trust** — People trust AI more when they can see _why_ it made a decision
2. **Actionable feedback** — "The word 'guaranteed' is a scam indicator" tells the user what to look for
3. **Presentation value** — This is one of the most impressive features. It shows your system isn't a black box.

---

## AI Text Generator Detector — Catching ChatGPT Scams

### The Problem

Modern scammers use **ChatGPT and other AI tools** to write convincing, grammatically perfect fake job postings. Traditional scam detection misses these because the text _looks_ professional.

Our AI Text Detector answers: **"Was this job posting written by a human or by AI?"**

### How It Works (file: `ai_text_detector.py`)

We use a **Random Forest Classifier** trained on a massive 1GB dataset (`AI_Human.csv`) containing thousands of examples of both human-written and AI-generated text.

#### The Process:

1. **Vectorization (TF-IDF):** Similar to our main scam model, the incoming job posting text is converted into numbers.
2. **Classification:** A Random Forest model evaluates these features to classify the text.
3. **Probability Scoring:** It calculates a confidence percentage for both AI and Human (e.g., 72% AI, 28% Human).

### Scoring & Verdict

```
Model outputs combined AI probability (0-100%)

Verdict:
  < 40% AI probability  →  "likely_human"
  40-65%                 →  "uncertain"
  > 65%                  →  "likely_ai"
```

When AI probability > 60%, it's added as a **red flag** in the explainer.

### Why This Replaced the Old System

Our previous version used rule-based linguistic features (like checking average sentence length). However, modern LLMs write too well to be caught by simple math rules. Training a pure ML model on real Human vs. AI text provides significantly higher accuracy.

### Web Analogy

Like training a spam filter on thousands of known spam vs real emails, instead of trying to manually write regex rules for every possible spam phrase.

### Option B: BERT/RoBERTa Transformer Upgrade (`ai_text_detector_bert.py`)

An alternative deep learning version is also available using a pretrained **RoBERTa transformer** model (`openai-community/roberta-base-openai-detector`). This is significantly more accurate on modern LLM-generated text because:

- **Contextual understanding:** TF-IDF treats words as independent; BERT/RoBERTa understands how words relate to each other in context.
- **Pretrained knowledge:** RoBERTa was trained on millions of documents and then specifically fine-tuned for AI text detection.
- **Fine-tunable:** You can further fine-tune it on the local `AI_Human.csv` dataset for even better accuracy on your specific domain.

**How to switch:** Change the import in `main.py` and `explainer.py`:

```python
from ai_text_detector_bert import detect_ai_text  # instead of ai_text_detector
```

**Tradeoff:** The BERT model is ~500 MB (vs ~31 MB for Random Forest) and inference is slower on CPU. But accuracy on modern AI-generated text is substantially higher.

Both options return the exact same response format, so the rest of the system works identically regardless of which you choose.

---

## Named Entity Recognition (NER) — Why & How

### What is NER?

NER is when a computer reads text and identifies **real-world entities** — person names, companies, cities, money amounts, dates.

**Example:**

```
Input:  "Google is hiring a Software Engineer in New York for $150,000"
Output: Google   → ORG  (Organization — detected by BERT)
        New York → LOC  (Location — detected by BERT; also exposed as GPE for backward compat)
        $150,000 → MONEY (extracted by regex — BERT NER does not cover monetary values)
```

### How Does It Work?

We use **`dslim/bert-base-NER`**, a BERT-base model fine-tuned on the CoNLL-2003 NER benchmark (~92% F1). It's loaded via the HuggingFace `transformers` pipeline and runs on GPU if available, otherwise CPU. The model understands entities based on:

- **Bidirectional context:** BERT reads the entire sentence simultaneously in both directions, so "Apple" in "Apple released a new phone" vs "I ate an apple" is understood differently
- **Subword tokenization:** Complex words, names, and tech terms are handled via WordPiece tokenization
- **CoNLL-2003 fine-tuning:** Trained on thousands of annotated news documents for high-precision entity recognition
- **Long text chunking:** Texts longer than ~1500 characters are automatically split at sentence boundaries to respect BERT's 512-token limit

### Why Did We Add NER?

**Without NER** (before):

- Skills extracted using a hardcoded skills list (regex: `\bpython\b`)
- Company names, locations = not extracted at all
- Salary = regex patterns only ($, ₹)

**With NER** (after):

- Company names auto-detected (even ones not in any list)
- Locations auto-detected from text context
- Person names from resumes detected (candidate name)
- Past employers from resumes detected
- Additional scam signals: "no company name found"

### Where NER Is Used

All four modules call `ner_extractor.py`, which runs `dslim/bert-base-NER` via HuggingFace (lazy-loaded, shared pipeline instance).

| Module                | What NER Does There                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **scraper.py**        | Extracts ORG, LOC, MONEY, DATE entities from scraped job pages                                |
| **explainer.py**      | Adds entity-based scam signals ("no company detected", "no location", "high monetary value")  |
| **resume_parser.py**  | Detects candidate name (first PER), past employers (ORG), locations (LOC)                     |
| **company_scorer.py** | Validates if a company name is recognized as ORG by BERT (+10 points to trust heuristic)      |

### Why `dslim/bert-base-NER` and Not Something Else?

| Option                                 | Why Chosen/Not                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| **dslim/bert-base-NER (HuggingFace)** ✅ | ~92% F1 on CoNLL-2003, eliminates false-positive locations (e.g. "React", "Node.js" are no longer flagged as places), offline after first download, free |
| spaCy `en_core_web_sm`                 | Faster (~10ms vs ~200ms) but CNN-based (~85% F1) — more false positives on tech job text    |
| NLTK NER                               | Slower, less accurate, requires more setup                                                    |
| Google Cloud NLP API                   | Costs money per API call, requires internet connection on every request                       |
| Custom training                        | Would require thousands of manually labeled job postings — not worth the effort               |

---

## Resume Parsing — How Text is Extracted

### The Challenge

Resumes come in 3 formats: PDF, DOCX, TXT. We need to extract structured information from _unstructured_ documents.

### How Each Format is Handled

| Format   | Library         | How It Works                                                              |
| -------- | --------------- | ------------------------------------------------------------------------- |
| **PDF**  | PyPDF2          | Reads each page, extracts text layer (doesn't work on scanned/image PDFs) |
| **DOCX** | python-docx     | Reads the XML inside the .docx file, extracts paragraph text              |
| **TXT**  | Built-in Python | Simple UTF-8 decode                                                       |

### What's Extracted (7 things!)

**1. Skills (Regex + Dictionary Matching)**

We have a database of **200+ skills** across 7 categories:

```python
SKILLS_DATABASE = {
    "programming_languages": ["python", "java", "javascript", ...],  # 35 skills
    "frameworks": ["react", "django", "flask", "angular", ...],      # 38 skills
    "databases": ["mysql", "mongodb", "postgresql", ...],            # 22 skills
    "cloud_devops": ["aws", "docker", "kubernetes", ...],            # 30 skills
    "data_science_ml": ["tensorflow", "pytorch", "pandas", ...],     # 42 skills
    "tools": ["git", "jira", "postman", ...],                        # 32 skills
    "soft_skills": ["leadership", "teamwork", "agile", ...],         # 19 skills
}
```

Each skill is matched using regex **word boundaries** (`\bpython\b`) to avoid false positives (e.g., "typescript" wouldn't match "script").

**2. Education (Regex Patterns)**

Matches: B.S., B.Tech, M.S., MBA, Ph.D., Diploma, 10th, 12th, etc.

**3. Experience Years (Regex)**

Patterns like: "5+ years experience", "experience of 3 years"

**4. Contact Info (Regex)**

Email, phone (international formats), LinkedIn URL, GitHub URL

**5-7. NER Entities (BERT — `dslim/bert-base-NER`)**

Name (first PER entity), past employers (ORG), locations (LOC)

### Why Regex AND NER?

- **Regex** is deterministic — if someone writes "python", our regex _will_ find it. 100% reliable for known patterns.
- **NER** is probabilistic — it can find entities we never put in our list, but might miss some or make mistakes.
- **Together** they cover both known patterns (regex) and unknown/dynamic entities (NER).

---

## Resume-Job Matching — TF-IDF Cosine Similarity

### The Goal

Given a resume and a job posting, answer: **"How well does this candidate fit this job?"**

### Two Ways We Measure It

#### Method 1: Cosine Similarity (40% of match score)

**Concept:** Convert both resume and job posting into TF-IDF vectors (arrays of 3000 numbers), then measure the _angle_ between them.

```
Resume  →  [0.2, 0.0, 0.5, 0.1, ...]   (3000 numbers)
Job     →  [0.3, 0.0, 0.4, 0.0, ...]   (3000 numbers)

Cosine Similarity = how similar these two vectors point in the same direction
```

- **1.0** = exactly the same content (perfect match)
- **0.0** = completely different topics (no match)
- **0.5** = moderately similar

**Web Analogy:** Like comparing two web pages — if they use the same keywords and phrases, they're about the same topic.

#### Method 2: Skill-by-Skill Match (60% of match score)

```
Resume Skills: {python, react, mongodb, docker, git}
Job Requires:  {python, react, aws, kubernetes, sql}

Matching:  {python, react}           → 2 matches
Missing:   {aws, kubernetes, sql}    → 3 gaps
Extra:     {mongodb, docker, git}    → 3 bonus skills

Skill Match Ratio = 2/5 = 40%
```

### Why 40% Cosine + 60% Skills?

- **Cosine similarity** captures overall topic alignment (are you in the right field?)
- **Skill matching** captures specific requirements (do you have the exact skills?)
- Skills matter more (60%) because recruiters look at specific skill checkboxes first

### Final Formula

```
match_score = (0.4 × cosine_similarity + 0.6 × skill_match_ratio) × 100
```

### Option B: Sentence-BERT Semantic Matching (`resume_matcher_semantic.py`)

An alternative deep learning version replaces the TF-IDF cosine similarity with **Sentence-BERT embeddings** (model: `all-MiniLM-L6-v2`). Everything else (skill matching, ATS scoring, course recommendations, training roadmap) stays exactly the same.

**Why it's better at similarity:**

```
TF-IDF (Option A):
  Resume says: "built REST APIs"
  Job says:    "backend development experience"
  → Similarity: ~0.0 (no shared keywords)

Sentence-BERT (Option B):
  Resume says: "built REST APIs"
  Job says:    "backend development experience"
  → Similarity: ~0.74 (understands they're semantically related)
```

Sentence-BERT converts entire sentences into dense vectors that capture _meaning_, not just word overlap. Two sentences about the same concept get similar vectors even if they use completely different words.

**How to switch:** Change the import in `main.py`:

```python
from resume_matcher_semantic import compute_match_score  # instead of resume_matcher
```

**Tradeoff:** The Sentence-BERT model is ~80 MB and slightly slower than TF-IDF. But matching quality is noticeably more accurate for real-world resumes and job postings.

Both options return the exact same response format, so the frontend and database work identically regardless of which you choose.

---

## ATS Score — What It Is & How It's Calculated

### What is ATS?

**ATS = Applicant Tracking System** — software that companies use to automatically screen resumes before a human ever sees them. If your resume doesn't pass the ATS, it goes to the trash.

~75% of resumes are rejected by ATS before reaching a recruiter.

### Our ATS Simulation (out of 100 points)

| Component           | Max Points | How It's Scored                                            |
| ------------------- | ---------- | ---------------------------------------------------------- |
| **Keyword Density** | 30         | How many words from the job posting appear in your resume? |
| **Skills Coverage** | 30         | ≥10 skills = 30pts, ≥5 = 20pts, <5 = 10pts                 |
| **Contact Info**    | 10         | 5pts for email, 5pts for phone number                      |
| **Education**       | 10         | Education section detected = 10pts                         |
| **Experience**      | 10         | Experience years mentioned = 10pts                         |
| **Word Count**      | 10         | 200-1000 words = 10pts (too short or too long penalized)   |

### Why Is ATS Important for Our Project?

It adds practical value beyond scam detection. Users upload resumes anyway — this gives them **actionable feedback** on how to improve their resume for real applications. It makes the platform more useful and sticky.

---

## Salary Prediction with Random Forest — ML-Enhanced Anomaly Detection

### Why Upgrade from Heuristics to ML?

The original salary detector used **hardcoded benchmarks** ("software engineer salary is $50K-$200K"). This works but has limitations:

- Can't adapt to market changes
- Doesn't consider experience level
- Same thresholds for every situation

The **Random Forest Regressor** learns salary patterns from data, giving personalized predictions.

### How the RF Pipeline Works

A **Scikit-Learn Pipeline** combines data preprocessing and the Random Forest Regressor into a single workflow.

```
Input Features Extracted from Job Text:
  [Position, YearsExperience, EducationLevel, Industry, Location]

Preprocessing (ColumnTransformer):
  - Categorical features (Position, Education, etc.): OneHotEncoded
  - Numerical features (YearsExp): StandardScaler

Output: predicted_salary (single number)
```

### Training Data (`synthetic_salary_dataset.csv`)

The model is trained on a dedicated CSV dataset containing structured salary records:

| Field             | Type   | Example             |
| ----------------- | ------ | ------------------- |
| `Position`        | string | "Software Engineer" |
| `YearsExperience` | float  | 3.5                 |
| `EducationLevel`  | string | "Bachelors"         |
| `Industry`        | string | "Technology"        |
| `Location`        | string | "Remote"            |
| `Salary(INR)`     | float  | 85000.0             |

---

## Salary Anomaly Detection — How It Catches Fake Salaries

### The Core Idea

Scam jobs often lure victims with _unrealistically high salaries_. We detect this by comparing the posted salary against the **ML model's predicted salary** for that role, experience level, and industry.

### How It Works

**Step 1:** Extract features from the job text — position, experience level, education, industry, location (using keyword matching)

**Step 2:** Detect the currency ($ = USD, ₹ = INR, "LPA" = Indian format)

**Step 3:** Parse the salary into numbers ("$55,000-$100,000" → min=55000, max=100000)

**Step 4:** Get the ML prediction — the Random Forest Regressor predicts the expected salary in INR (converted to USD if needed, at ~₹83/USD)

**Step 5:** Compare posted salary against the ML prediction:

| Check                               | Anomaly Score | Why                                                          |
| ----------------------------------- | ------------- | ------------------------------------------------------------ |
| Salary > 2.5× ML prediction         | +0.60         | Strong scam indicator ("Earn $400K as junior dev!")          |
| Salary > 1.8× ML prediction         | +0.40         | Significantly above expected market rate                     |
| Salary < 0.4× ML prediction         | +0.30         | Unusually low — may be exploitative                          |
| Deviation > 50% from prediction     | +0.20         | Unusual deviation from expected range                        |
| Very wide salary range               | +0.20         | "Salary: $20K-$200K" is vague and suspicious                |
| Suspiciously round numbers           | +0.05         | "$100,000 exactly" is more common in fake postings           |
| No salary provided                   | +0.30         | Slightly suspicious (legit jobs usually disclose ranges)     |

Score is capped at 1.0.

### Why Both USD and INR?

Because this is an Indian project. Many Indian job scams quote salaries in LPA (Lakhs Per Annum) or ₹ format. The ML model predicts in INR and automatically converts to USD when comparing against dollar-denominated postings.

---

## Company Trust Scoring — The 4-Signal Approach

### Why 4 Signals?

No single check can definitively say a company is legitimate or fake. So we combine 4 different signals, each with a different weight:

### Signal 1: Domain Age (25%)

**How:** Use WHOIS lookup to check when the company's website domain was registered.

**Why it works:** Scam companies create new websites frequently. A domain registered 10 years ago is probably real. A domain registered 2 weeks ago is suspicious.

| Domain Age   | Score                 |
| ------------ | --------------------- |
| > 5 years    | 90 (well-established) |
| > 2 years    | 70 (probably real)    |
| > 0 years    | 40 (relatively new)   |
| Can't verify | 20 (suspicious)       |
| Not provided | 50 (neutral)          |

### Signal 2: Email Analysis (25%)

**How:** Check if the contact email uses a corporate domain or a free email provider.

**Why it works:** Real companies have emails like `hr@google.com`. Scammers use `google.careers2024@gmail.com`.

| Email Type                              | Score |
| --------------------------------------- | ----- |
| Matches company domain (hr@company.com) | 90    |
| Different corporate domain              | 60    |
| Free email (Gmail, Yahoo, etc.)         | 20    |
| Not provided                            | 50    |

### Signal 3: Social Presence Heuristics (20%)

**How:** Analyze the company name for suspicious patterns.

| Check                                               | Effect     |
| --------------------------------------------------- | ---------- |
| Name too short (< 3 chars)                          | Warning    |
| Contains "work from home", "earn money"             | -20 points |
| Has suffix like "Ltd", "Inc", "LLC", "Technologies" | +15 points |
| Recognized as ORG by BERT NER (`dslim/bert-base-NER`)| +10 points |

### Signal 4: Community Reports (30%)

**How:** Check our own database for reports filed against this company.

**Why it's the highest weight (30%):** User-generated reports from real people who were scammed are extremely strong evidence — more reliable than any automated check.

| Community Data         | Score         |
| ---------------------- | ------------- |
| Company is blacklisted | 0 (untrusted) |
| > 5 reports            | 10            |
| 1-5 reports            | 40            |
| No reports             | 80            |

### Final Trust Score

```
trust_score = 0.25 × domain + 0.25 × email + 0.20 × social + 0.30 × community
```

Levels: ≥70 = Trusted, ≥50 = Moderate, ≥30 = Suspicious, <30 = Untrusted

---

## Auto-Blacklisting — How Community Reports Build a Database

### The Flow

```
User reports a company → scam_reports table
                            │
                            ▼
                     Count total reports
                     for this company
                            │
                     Is count ≥ 3?
                    ╱           ╲
                  YES            NO
                   │              │
                   ▼              ▼
            Add/Update         Do nothing
            company_blacklist   (wait for more)
            table               reports)
```

### Why ≥ 3 Reports?

One person might have a grudge. Two might be a coincidence. **Three independent reports** is a strong signal of a real problem. This threshold prevents false positives while still being responsive.

### Trust Score Decay

```
trust_score = max(0, 50 - (report_count × 10))
```

| Reports | Trust Score | Status                         |
| ------- | ----------- | ------------------------------ |
| 3       | 20          | Just blacklisted               |
| 5       | 0           | Zero trust                     |
| 10      | 0           | Still zero (can't go negative) |

### Voting System

Users can upvote (confirm) or downvote (dispute) reports. This adds community validation:

- **Toggle:** Clicking the same vote type again removes your vote
- **Switch:** Changing from upvote to downvote adjusts both counters
- **One vote per user per report:** Enforced by a unique constraint in the database

---

## Course Recommendations & Training Roadmap

### Why Course Recommendations?

When a user's resume is missing skills that a job requires, simply saying "you don't know Python" isn't helpful. We go further:

1. **Identify the gap** → "Python is required but not in your resume"
2. **Recommend courses** → "Take 'Python for Everybody' on Coursera"
3. **Build a roadmap** → "Week 1-2: Learn Python. Week 3-4: Learn SQL."

### How It Works

We have a **hardcoded course database** (`COURSE_RECOMMENDATIONS` in `resume_matcher.py`) with curated courses for 20+ skills:

```python
"python": [
    {"title": "Python for Everybody", "platform": "Coursera", "level": "Beginner"},
    {"title": "Automate the Boring Stuff", "platform": "Udemy", "level": "Beginner"},
],
"machine learning": [
    {"title": "ML by Andrew Ng", "platform": "Coursera", "level": "Beginner"},
],
```

**For skills without pre-curated courses**, we generate a YouTube search link as fallback:

```
https://www.youtube.com/results?search_query=learn+{skill}
```

### Training Roadmap Generation

```
1. Take missing skills from the match analysis
2. Sort by priority (high = course recommendation exists)
3. Group into 2-week learning blocks
4. Assign resources from the course database
5. Cap at 6 skills (realistic 12-week plan)
```

**Example output:**

```
Week 1-2:  Learn Python (HIGH priority) — Coursera: Python for Everybody
Week 3-4:  Learn SQL (HIGH) — Udemy: The Complete SQL Bootcamp
Week 5-6:  Learn Docker (MEDIUM) — Udemy: Docker Mastery
```

### Why Is This Useful?

- **Users get actionable next steps**, not just "you don't match this job"
- **Differentiates the platform** from just being a scam detector
- **Increases user engagement** — they come back to track progress

---

## Key ML Metrics — What Accuracy, Precision, Recall, F1 Mean

These are the 4 numbers you'll see in the analytics dashboard:

### Accuracy — "How often is the model correct overall?"

```
Accuracy = (correct predictions) / (total predictions)

Example: 95% accuracy = out of 100 job postings, it correctly classifies 95
```

### Precision — "When it says SCAM, how often is it actually a scam?"

```
Precision = (true scams caught) / (total flagged as scam)

High precision = fewer false alarms
Low precision = lots of legit jobs falsely flagged as scams (bad for users!)
```

### Recall — "Of all actual scams, how many did it catch?"

```
Recall = (true scams caught) / (total actual scams)

High recall = catches most scams
Low recall = many scams slip through undetected (dangerous!)
```

### F1 Score — "The balance between Precision and Recall"

```
F1 = 2 × (Precision × Recall) / (Precision + Recall)

It's the harmonic mean — penalizes models that are good at one but bad at the other.
```

### The Tradeoff (Important for presentation!)

If you set the model to flag _everything_ as a scam:

- **Recall = 100%** (it caught all scams!)
- **Precision = very low** (it also flagged all legit jobs!)

If you set the model to only flag the most obvious scams:

- **Precision = 100%** (every flag is correct!)
- **Recall = very low** (many subtle scams slip through!)

**F1 score finds the sweet spot** between catching scams and not annoying users with false alarms.

### Confusion Matrix (Visual)

```
                    Predicted
                 Scam    Legit
Actual  Scam  [  TP  |  FN  ]    TP = True Positive (correctly caught scam)
        Legit [  FP  |  TN  ]    FP = False Positive (legit job wrongly flagged)
                                  FN = False Negative (scam slipped through)
                                  TN = True Negative (correctly identified legit)
```

---

## Glossary of Terms

| Term                  | Meaning                                                        | Web Analogy                                                  |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| **Model**             | A trained algorithm that makes predictions                     | Like a database with learned rules                           |
| **Training**          | Teaching the model using labeled examples                      | Like seeding initial data into a database                    |
| **Prediction**        | Asking the model to classify new input                         | Like running a database query                                |
| **TF-IDF**            | Method to convert text into numbers by word importance         | Like search engine relevance scoring                         |
| **Cosine Similarity** | Measure of how similar two text vectors are (0-1)              | Like comparing two pages                                     |
| **Vectorizer**        | Converts raw text into number arrays                           | Like a text-to-JSON serializer                               |
| **Feature**           | A measurable property used for prediction                      | Like a database column                                       |
| **Coefficient**       | Weight assigned to a feature by the model                      | Like priority/importance weighting                           |
| **Overfitting**       | Model memorizes training data instead of learning patterns     | Like hardcoding test cases instead of writing general logic  |
| **Stratified Split**  | Train/test split that preserves label ratios                   | Like ensuring dev/prod databases have same data distribution |
| **NER**               | Named Entity Recognition — finding real-world entities in text | Like auto-tagging names and places in a blog post            |
| **HuggingFace**       | ML model hub and `transformers` library for BERT, RoBERTa, etc | Like npm but for AI models                                   |
| **Tokenizer**         | Splits text into individual words/tokens                       | Like `.split(" ")` but smarter                               |
| **Scam Indicator**    | A word or pattern that increases scam probability              | Like a red flag rule                                         |
| **ATS**               | Applicant Tracking System — auto-screens resumes               | Like a form validator that rejects incomplete applications   |
| **WHOIS**             | Protocol to look up domain registration info                   | Like checking a website's SSL certificate details            |
| **Confusion Matrix**  | Table showing correct vs incorrect predictions                 | Like a test result report showing pass/fail breakdown        |
| **pkl file**          | Python pickle/joblib file — serialized object                  | Like a JSON export of an object                              |
| **Bigram**            | Two consecutive words treated as one unit                      | Like "New York" vs "New" + "York"                            |
| **Stop Words**        | Common words removed during processing                         | Like excluding "the", "is" from a search query               |
| **Anomaly**           | Something that deviates from the expected normal               | Like a 404 error in monitoring                               |
| **Heuristic**         | A practical rule-of-thumb (not ML)                             | Like business rules in your app logic                        |

---

_This document was created for presentation preparation. It explains the complete AI Job Scam Detector system for a web development audience._
