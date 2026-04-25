# AI Job Analysis and Detection System — Technical Documentation

> **Version 2.0.0** | A prototype-scale, full-stack AI-powered platform for detecting fraudulent job postings, analyzing resumes, and building a community-driven scam reporting ecosystem.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [File Structure](#file-structure)
4. [Database Schema — How Data is Stored](#database-schema--how-data-is-stored)
5. [Data Processing Pipelines](#data-processing-pipelines)
   - [Job Scam Detection Pipeline](#1-job-scam-detection-pipeline)
   - [ML Model Training Pipeline](#2-ml-model-training-pipeline)
   - [Explainable AI (XAI) Pipeline](#3-explainable-ai-xai-pipeline)
   - [Named Entity Recognition (NER) Pipeline](#4-named-entity-recognition-ner-pipeline)
   - [Resume Parsing Pipeline](#5-resume-parsing-pipeline)
   - [Resume-Job Matching Pipeline](#6-resume-job-matching-pipeline)
   - [Salary Anomaly Detection Pipeline](#7-salary-anomaly-detection-pipeline)
   - [Company Trust Scoring Pipeline](#8-company-trust-scoring-pipeline)
   - [Community Reporting Pipeline](#9-community-reporting-pipeline)
   - [Analytics Pipeline](#10-analytics-pipeline)
   - [PDF Report Generation Pipeline](#11-pdf-report-generation-pipeline)
6. [System Limitations & Future Work](#system-limitations--future-work)
7. [Authentication System](#authentication-system)
8. [API Reference](#api-reference)
9. [Data Files & Serialized Models](#data-files--serialized-models)
10. [Dependencies](#dependencies)
11. [Setup & Running](#setup--running)

---

## Project Overview

The AI Job Analysis and Detection System is a **FastAPI-based backend** that combines multiple machine learning models, natural language processing, web scraping, and community-driven insights to help users identify fraudulent job postings. It provides:

- **Multi-signal Web Scraping** — extracts data with block detection fallbacks for protected sites
- **Multi-model ML scam detection** (5 classifiers compared and best selected)
- **AI-generated text detection** — catches ChatGPT-written fake job postings (two options: TF-IDF + Random Forest, or BERT/RoBERTa transformer for higher accuracy)
- **Explainable AI** — shows _why_ a posting was flagged, word-by-word
- **Named Entity Recognition (NER)** — globally-cached BERT transformer-powered entity extraction for job postings and resumes (`dslim/bert-base-NER`)
- **Resume parsing and persistence** — data is persisted in a database (SQLite Cloud) with optimistic UI updates and skill extraction. Route shadowing and caching issues (resolved via `export const dynamic = "force-dynamic";`) have been addressed to ensure seamless hydration.
- **Resume-to-job matching** with ATS score and training roadmap (two options: TF-IDF cosine similarity, or Sentence-BERT semantic matching)
- **ML salary anomaly detection** — Hybrid system using a Random Forest Regressor Pipeline refined by rule-based heuristic corrections (experience and internship multipliers)
- **Company reputation scoring** from 4 weighted signals + NER validation
- **Community scam reporting** with voting and auto-blacklisting
- **PDF report generation** — in-memory generation streaming directly to the client
- **Analytics dashboard** with trends, distributions, and model comparison
- **Modern SaaS UI** — compressed hero section, scrollable resume lists, responsive grid system, and improved feature hierarchy
- **Robust Error Handling** — silent failure patterns were removed, ensuring all API errors are surfaced explicitly to prevent hidden data issues.
---

## Architecture & Tech Stack

### Backend

| Layer                   | Technology                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Web Framework**       | FastAPI (Python)                                                                      |
| **ASGI Server**         | Uvicorn                                                                               |
| **Database**            | SQLite 3 (file-based, `scam_detector.db`)                                             |
| **ML / NLP**            | scikit-learn, TF-IDF Vectorization, Random Forest, SVM, Logistic Regression, Gradient Boosting, Naive Bayes |
| **Deep Learning (Opt.)** | PyTorch, HuggingFace Transformers, Sentence-BERT (`sentence-transformers`) — optional upgrade path |
| **AI Text Detection**   | **Option A (default):** Random Forest + TF-IDF · **Option B:** RoBERTa transformer via HuggingFace |
| **Resume-Job Matching** | **Option A (default):** TF-IDF cosine similarity · **Option B:** Sentence-BERT semantic embeddings |
| **Salary Prediction**   | Hybrid: Random Forest Regressor + Heuristic Post-Processing                            |
| **NER**                 | BERT transformer (`dslim/bert-base-NER` via HuggingFace, globally cached, ~92% F1)                    |
| **Web Scraping**        | Playwright (Chromium), BeautifulSoup4                                                 |
| **Domain Analysis**     | python-whois                                                                          |
| **Resume Parsing**      | PyPDF2, python-docx                                                                   |
| **PDF Generation**      | fpdf2                                                                                 |
| **Authentication**      | JWT (python-jose), bcrypt (passlib)                                                   |
| **Model Serialization** | joblib (`.pkl` files)                                                                 |

### Frontend

| Layer              | Technology                           |
| ------------------ | ------------------------------------ |
| **Framework**      | Next.js 16 (App Router)              |
| **UI Library**     | React 19                             |
| **Language**       | TypeScript 5                         |
| **Styling**        | Tailwind CSS 4                       |
| **Package Manager**| Bun                                  |

### Datasets

| Dataset                          | Size     | Records  | Purpose                                             |
| -------------------------------- | -------- | -------- | --------------------------------------------------- |
| `fake_job_postings.csv`          | ~50 MB   | 17,880   | Job scam detection model training (binary label `fraudulent`) |
| `AI_Human.csv`                   | ~1.06 GB | ~500,000 | AI-generated text detection (Human vs AI classification)      |
| `synthetic_salary_dataset.csv`   | ~28 KB   | ~500     | Salary anomaly prediction (position, experience, education, industry, location → salary in INR) |

---

## File Structure

```
ai-job-scam-detector/
├── README.md                        # This file
│
├── docs/                            # Project documentation
│   ├── API_DOCS.md                  #   API endpoint documentation
│   ├── HOW_IT_WORKS.md              #   High-level system overview
│   └── TECHNICAL_ML_REPORT.md       #   ML model evaluation report
│
├── backend/
│   ├── main.py                      # FastAPI app — all routes and endpoint definitions
│   ├── database.py                  # SQLite schema initialization (8 tables)
│   ├── auth.py                      # JWT authentication (register, login, token decoding)
│   ├── ai_text_detector.py          # ★ AI-generated text detector (Random Forest classifier) [Option A]
│   ├── ai_text_detector_bert.py     # ★ AI-generated text detector (RoBERTa transformer)     [Option B]
│   ├── ner_extractor.py             # ★ NER module — BERT transformer entity extraction for jobs & resumes
│   ├── scraper.py                   # Web scraper — extracts description, salary, email + NER
│   ├── model.py                     # Model loader — lazy-loads model.pkl and vectorizer.pkl
│   ├── train_model.py               # Multi-model training pipeline (5 classifiers)
│   ├── risk_engine.py               # Weighted risk score computation (NLP + salary + domain)
│   ├── explainer.py                 # Explainable AI — feature contributions, red flags + NER
│   ├── resume_parser.py             # Resume text extraction, structured parsing + NER
│   ├── resume_matcher.py            # TF-IDF cosine similarity matching + ATS scoring        [Option A]
│   ├── resume_matcher_semantic.py   # Sentence-BERT semantic matching + ATS scoring           [Option B]
│   ├── salary_predictor.py          # ★ ML salary prediction (RF Regressor Pipeline)
│   ├── company_scorer.py            # Company trust scoring (domain, email, social, community)
│   ├── community.py                 # Scam report CRUD, voting, auto-blacklisting
│   ├── analytics.py                 # Dashboard statistics, trends, model comparison
│   ├── report_generator.py          # PDF report generation (scan & match reports)
│   ├── requirements.txt             # Python dependencies
│   │
│   ├── database/                         # SQLite runtime database (auto-created)
│   │   └── scam_detector.db              #   Main application database
│   │
│   ├── datasets/                         # Training datasets
│   │   ├── fake_job_postings.csv         #   Job scam detection (~50 MB, 17,880 rows)
│   │   ├── AI_Human.csv                  #   AI text detection (~1.06 GB, ~500K rows)
│   │   └── synthetic_salary_dataset.csv  #   Salary prediction (~28 KB, ~500 rows)
│   │
│   ├── models/                               # Serialized ML models (auto-generated by training)
│   │   ├── model.pkl                         #   Best scam detection model (~40 KB)
│   │   ├── vectorizer.pkl                    #   TF-IDF vectorizer for scam detection (~197 KB)
│   │   ├── all_models.pkl                    #   All 5 trained classifiers (~5.7 MB)
│   │   ├── ai_detector_model.pkl             #   AI text detection classifier (~30.8 MB)
│   │   ├── ai_detector_vectorizer.pkl        #   TF-IDF vectorizer for AI detection (~190 KB)
│   │   ├── salary_model.pkl                  #   RF salary regressor pipeline (~1.9 MB)
│   │   ├── model_metrics.json                #   All 5 model metrics + best model info
│   │   ├── ai_detector_bert/                 #   Fine-tuned RoBERTa model (+ checkpoint-500/, checkpoint-1000/)
│   │   └── ner_bert/                         #   HuggingFace cache for dslim/bert-base-NER (auto-downloaded)

```

---

## System Limitations

As a prototype-scale application built for research and demonstration, the system has the following limitations:

- **No real-time model retraining:** The core ML models use a static dataset and do not automatically retrain on new data.
- **Heuristic adjustments used in salary prediction:** To compensate for limited ML training data, the salary pipeline relies on conditional heuristic adjustments to stabilize edge cases.
- **Scraping may fail on protected sites:** Some job platforms (e.g., LinkedIn, Naukri) use anti-bot protections that may block automated scraping. In such cases, the system falls back to manual job description input.
- **ML models run within backend process:** The models run directly in the synchronous FastAPI worker process, not in a distributed or microservice architecture.

---

## Database Schema — How Data is Stored

The application uses a **single SQLite database** file (`scam_detector.db`) located in the `backend/database/` directory. It is initialized automatically on import via `init_db()` in `database.py`. Foreign keys are enforced via `PRAGMA foreign_keys = ON`.

### Table 1: `users`

Stores registered user accounts.

| Column          | Type      | Constraints                | Description                      |
| --------------- | --------- | -------------------------- | -------------------------------- |
| `id`            | INTEGER   | PRIMARY KEY, AUTOINCREMENT | Unique user ID                   |
| `username`      | TEXT      | UNIQUE, NOT NULL           | Login username                   |
| `email`         | TEXT      | UNIQUE, NOT NULL           | User email address               |
| `password_hash` | TEXT      | NOT NULL                   | bcrypt-hashed password           |
| `full_name`     | TEXT      | nullable                   | Display name                     |
| `created_at`    | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP  | Account creation time            |
| `is_admin`      | INTEGER   | DEFAULT 0                  | Admin flag (0 = user, 1 = admin) |

**Relationships:** Referenced by `scan_history`, `resumes`, `match_history`, `scam_reports`, `report_votes`.

---

## PDF Report Generation (Direct Streaming)

Generated PDF reports are created in-memory using `fpdf2` and streamed directly to the client via FastAPI `StreamingResponse`. 

- **No Local Storage:** PDFs are never saved to disk on the server.
- **No S3 Storage:** Dependencies on Amazon S3 and pre-signed URLs have been completely removed for a faster, stateless architecture.
- **Secure Proxy Flow:** To protect authentication tokens, the Next.js frontend uses a Backend-For-Frontend (BFF) API route. The Next.js route securely reads the `httpOnly` auth cookie and forwards the request to the FastAPI backend, which streams the binary PDF back to the browser.

### Table 2: `scan_history`

Stores every job URL/text scan performed by logged-in users.

| Column         | Type      | Constraints                | Description                                   |
| -------------- | --------- | -------------------------- | --------------------------------------------- |
| `id`           | INTEGER   | PRIMARY KEY, AUTOINCREMENT | Scan record ID                                |
| `user_id`      | INTEGER   | FK → `users(id)`           | Who performed the scan                        |
| `url`          | TEXT      | NOT NULL                   | Scanned job posting URL                       |
| `job_title`    | TEXT      | nullable                   | Extracted job title                           |
| `company_name` | TEXT      | nullable                   | Extracted company name                        |
| `risk_score`   | REAL      | —                          | Composite risk score (0-100)                  |
| `risk_level`   | TEXT      | —                          | "Safe" / "Medium Risk" / "High Risk"          |
| `nlp_score`    | REAL      | —                          | ML model scam probability                     |
| `salary_score` | REAL      | —                          | Salary anomaly score (0-100)                  |
| `domain_score` | REAL      | —                          | Email domain risk score (0-100)               |
| `description`  | TEXT      | —                          | Scraped description (truncated to 1000 chars) |
| `salary`       | TEXT      | —                          | Extracted salary string                       |
| `email_found`  | TEXT      | —                          | Extracted contact email                       |
| `scanned_at`   | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP  | When the scan was performed                   |

**Data stored here comes from:** `scraper.py` (description, salary, email) → `risk_engine.py` (scores) → `explainer.py` (NLP score).

---

### Table 3: `resumes`

Stores uploaded resume files (parsed text, not raw files).

| Column           | Type      | Constraints                | Description                                                       |
| ---------------- | --------- | -------------------------- | ----------------------------------------------------------------- |
| `id`             | INTEGER   | PRIMARY KEY, AUTOINCREMENT | Resume record ID                                                  |
| `user_id`        | INTEGER   | FK → `users(id)`, NOT NULL | Owner of the resume                                               |
| `filename`       | TEXT      | NOT NULL                   | Original uploaded filename                                        |
| `extracted_text` | TEXT      | —                          | Plain text extracted from PDF/DOCX/TXT (first 10,000 chars)       |
| `skills`         | TEXT      | —                          | JSON string of categorized skills `{"category": ["skill1", ...]}` |
| `experience`     | TEXT      | —                          | Years of experience as string                                     |
| `education`      | TEXT      | —                          | JSON array of education qualifications                            |
| `contact`        | TEXT      | —                          | JSON object with email, phone, linkedin, github                   |
| `uploaded_at`    | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP  | Upload timestamp                                                  |

**Important:** Raw binary files are **not stored** in the database. Only extracted text and parsed metadata are saved. Skills are stored as a JSON-serialized dictionary keyed by category. Contact info is stored as a JSON object and used by ATS scoring during resume-job matching.

---

### Table 4: `match_history`

Stores resume-to-job matching results.

| Column            | Type      | Constraints                  | Description                                 |
| ----------------- | --------- | ---------------------------- | ------------------------------------------- |
| `id`              | INTEGER   | PRIMARY KEY, AUTOINCREMENT   | Match record ID                             |
| `user_id`         | INTEGER   | FK → `users(id)`, NOT NULL   | User who ran the match                      |
| `resume_id`       | INTEGER   | FK → `resumes(id)`, NOT NULL | Which resume was used                       |
| `job_url`         | TEXT      | nullable                     | Job URL matched against                     |
| `job_title`       | TEXT      | nullable                     | Job title                                   |
| `match_score`     | REAL      | —                            | Combined match score (0-100)                |
| `strengths`       | TEXT      | —                            | JSON array of strength objects              |
| `weaknesses`      | TEXT      | —                            | JSON array of weakness objects              |
| `recommendations` | TEXT      | —                            | JSON array of course recommendation objects |
| `matched_at`      | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP    | When matching was performed                 |

**Strengths/weaknesses/recommendations are stored as JSON strings**, each containing arrays of objects with `skill`, `status`, `message`, and `priority` fields.

---

### Table 5: `scam_reports`

Community-submitted scam reports.

| Column         | Type      | Constraints                | Description                                                            |
| -------------- | --------- | -------------------------- | ---------------------------------------------------------------------- |
| `id`           | INTEGER   | PRIMARY KEY, AUTOINCREMENT | Report ID                                                              |
| `user_id`      | INTEGER   | FK → `users(id)`, NOT NULL | Reporter                                                               |
| `job_url`      | TEXT      | nullable                   | URL of the suspicious posting                                          |
| `company_name` | TEXT      | NOT NULL                   | Company being reported                                                 |
| `job_title`    | TEXT      | nullable                   | Job title                                                              |
| `description`  | TEXT      | NOT NULL                   | Description of the scam                                                |
| `evidence`     | TEXT      | nullable                   | Supporting evidence                                                    |
| `category`     | TEXT      | DEFAULT 'other'            | Category: e.g., "phishing", "fake_company", "upfront_payment", "other" |
| `status`       | TEXT      | DEFAULT 'pending'          | Report status: "pending", "verified", "rejected"                       |
| `upvotes`      | INTEGER   | DEFAULT 0                  | Community upvote count                                                 |
| `downvotes`    | INTEGER   | DEFAULT 0                  | Community downvote count                                               |
| `created_at`   | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP  | Submission time                                                        |

---

### Table 6: `report_votes`

Tracks individual votes on scam reports (prevents duplicate voting).

| Column      | Type      | Constraints                       | Description               |
| ----------- | --------- | --------------------------------- | ------------------------- |
| `id`        | INTEGER   | PRIMARY KEY, AUTOINCREMENT        | Vote record ID            |
| `report_id` | INTEGER   | FK → `scam_reports(id)`, NOT NULL | Which report was voted on |
| `user_id`   | INTEGER   | FK → `users(id)`, NOT NULL        | Who voted                 |
| `vote_type` | TEXT      | NOT NULL, CHECK IN ('up', 'down') | "up" or "down"            |
| `voted_at`  | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP         | When vote was cast        |

**Constraint:** `UNIQUE(report_id, user_id)` — each user can only vote once per report.

**Vote behavior:** Voting the same type again **removes** the vote (toggle). Voting the opposite type **changes** the vote and adjusts both counters.

---

### Table 7: `company_blacklist`

Auto-generated blacklist from community reports.

| Column           | Type      | Constraints                | Description                                                     |
| ---------------- | --------- | -------------------------- | --------------------------------------------------------------- |
| `id`             | INTEGER   | PRIMARY KEY, AUTOINCREMENT | Blacklist entry ID                                              |
| `company_name`   | TEXT      | UNIQUE, NOT NULL           | Blacklisted company name                                        |
| `domain`         | TEXT      | nullable                   | Company domain                                                  |
| `total_reports`  | INTEGER   | DEFAULT 1                  | Number of scam reports                                          |
| `trust_score`    | REAL      | DEFAULT 50.0               | Auto-calculated trust score: `max(0, 50 - (report_count × 10))` |
| `blacklisted_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP  | When first blacklisted                                          |
| `last_reported`  | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP  | Most recent report                                              |

**Auto-blacklisting trigger:** A company is added to this table automatically when it receives **≥ 3** scam reports. The `trust_score` decreases by 10 for each additional report.

---

### Table 8: `model_metrics`

Stores ML model training performance metrics (for analytics dashboard).

| Column             | Type      | Constraints                | Description                                  |
| ------------------ | --------- | -------------------------- | -------------------------------------------- |
| `id`               | INTEGER   | PRIMARY KEY, AUTOINCREMENT | Metric record ID                             |
| `model_name`       | TEXT      | NOT NULL                   | e.g., "Logistic Regression", "Random Forest" |
| `accuracy`         | REAL      | —                          | Accuracy percentage                          |
| `precision_score`  | REAL      | —                          | Precision percentage                         |
| `recall`           | REAL      | —                          | Recall percentage                            |
| `f1_score`         | REAL      | —                          | F1 score percentage                          |
| `training_samples` | INTEGER   | —                          | Number of training samples                   |
| `test_samples`     | INTEGER   | —                          | Number of test samples                       |
| `trained_at`       | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP  | Training timestamp                           |

---

### Entity-Relationship Diagram

```
users (1) ──── (N) scan_history
  │
  ├──── (N) resumes (1) ──── (N) match_history
  │
  ├──── (N) scam_reports (1) ──── (N) report_votes
  │                                         │
  └─────────────────────────────────────────┘
                                    (user can vote on reports)

scam_reports ──── auto-populates ──── company_blacklist (≥3 reports)

model_metrics (standalone — populated by train_model.py)
```

---

## Data Processing Pipelines

### 1. Job Scam Detection Pipeline

**Entry point:** `POST /api/scan/url` or `POST /api/scan/text`

#### URL Scan Flow (`/api/scan/url`)

```
User submits URL
       │
       ▼
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  scraper.py │───▶│ risk_engine  │────▶│  explainer.py  │
│             │     │   .py        │     │                │
│ HTTP GET    │     │ compute_risk │     │ explain_       │
│ BeautifulSoup│    │              │     │ prediction     │
│ extract:    │     │ Weighted:    │     │                │
│ - description│    │ 50% NLP      │     │ Feature        │
│ - salary    │     │ 30% salary   │     │ contributions  │
│ - email     │     │ 20% domain   │     │ + red flags    │
└─────────────┘     └──────────────┘     └────────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────────┐ ┌──────────────┐    ┌────────────────┐
│salary_predictor  │ │  model.py    │    │ scan_history   │
│.py               │ │              │    │ (DB save if    │
│                  │ │ predict_scam │    │  user logged   │
│ anomaly analysis │ │ (TF-IDF +    │    │  in)           │
│ vs benchmarks    │ │  best model) │    └────────────────┘
└──────────────────┘ └──────────────┘
```

**Detailed data flow:**

1. **Scraping** (`scraper.py → scrape_job(url)`):
   - Makes HTTP GET with 10s timeout
   - Parses HTML with BeautifulSoup
   - Extracts full text (truncated to 5000 chars)
   - Extracts salary via regex (supports `$`, `₹`, `Rs`, `INR`, `LPA` formats)
   - Extracts email via regex
   - **Runs NER** via `ner_extractor.extract_job_entities()` → extracts companies (ORG), locations (LOC), monetary values (MONEY via regex), dates (via regex), and generates entity-based scam signals

2. **NLP Prediction** (`model.py → predict_scam(text)`):
   - Lazy-loads `model.pkl` (best trained model) and `vectorizer.pkl` (TF-IDF)
   - Transforms text with TF-IDF vectorizer (5000 features, unigrams + bigrams)
   - Calls `model.predict_proba()` → returns scam probability [0.0 - 1.0]

3. **Risk Score Computation** (`risk_engine.py → compute_risk(description, salary, email)`):
   - **NLP score** (50% weight): `predict_scam(description)` → [0-1]
   - **Salary score** (30% weight): Currency-aware heuristic checks:
     - No salary → 0.3 (slightly suspicious)
     - Detects ₹/Rs/INR and normalizes to USD-equivalent (÷83) for consistent thresholds
     - Max > $150,000 (or ₹equivalent) → 0.7
     - Range > $80,000 width → 0.5
     - Normal → 0.1
   - **Domain score** (20% weight): WHOIS lookup on email domain:
     - Free email (gmail/yahoo/outlook) → 0.7
     - WHOIS lookup fails → 0.8
     - Has valid creation date → 0.1
     - No email → 0.5
   - **Final score** = `(0.5 × NLP + 0.3 × salary + 0.2 × domain) × 100`

4. **Risk Level Classification:**
   - Score < 30 → **"Safe"**
   - 30 ≤ Score < 60 → **"Medium Risk"**
   - Score ≥ 60 → **"High Risk"**

5. **Database Storage** (if user is authenticated):
   - Inserts into `scan_history` with all scores, description (first 1000 chars), salary, email

#### Text Scan Flow (`/api/scan/text`)

Same as above but skips the scraping step. Salary is extracted from the provided text directly using `scraper.extract_salary()`.

---

### 2. ML Model Training Pipeline

**Entry point:** `python train_model.py`

```
fake_job_postings.csv
       │
       ▼
┌─────────────────────┐
│ Load & Prepare Data │
│                     │
│ Combine 13 columns: │
│ title, location,    │
│ department,         │
│ salary_range,       │
│ company_profile,    │
│ description,        │
│ requirements,       │
│ benefits,           │
│ employment_type,    │
│ required_experience,│
│ required_education, │
│ industry, function  │
│        ▼            │
│ Concatenate into    │
│ single "text" field │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Train/Test Split    │
│ 80/20, stratified   │
│ random_state=42     │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ TF-IDF Vectorizer   │
│ max_features=5000   │
│ ngram_range=(1,2)   │
│ stop_words=english  │
└─────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Train 5 Models (class_weight=       │
│ "balanced" for imbalanced data):    │
│                                     │
│ 1. Logistic Regression (balanced)   │
│ 2. Random Forest (balanced)         │
│ 3. Linear SVM + CalibratedCV        │
│    (balanced, with predict_proba)   │
│ 4. Multinomial Naive Bayes          │
│ 5. Gradient Boosting                │
│                                     │
│ Metrics per model:                  │
│ - Accuracy, Precision, Recall, F1   │
│ - Confusion Matrix                  │
│ - Classification Report             │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Select Best Model (by F1 score)     │
│                                     │
│ Save to:                            │
│ - model.pkl         (best model)    │
│ - vectorizer.pkl    (TF-IDF)        │
│ - all_models.pkl    (all 5 models)  │
│ - model_metrics.json (all metrics)  │
│ - model_metrics DB table            │
└─────────────────────────────────────┘
```

**Training dataset:** `datasets/fake_job_postings.csv` — ~17,880 records with binary label `fraudulent` (0 = legitimate, 1 = scam). Column `text` is created by concatenating 13 text fields. Dataset is heavily imbalanced (~95.2% legitimate, ~4.8% fraudulent), so `class_weight="balanced"` is applied to handle this.

**Serialized artifacts (saved to `models/`):**

- `model.pkl` — best performing model by F1 score (currently **SVM Linear** wrapped in `CalibratedClassifierCV` at **82.20% F1**)
- `vectorizer.pkl` (~197 KB) — fitted TF-IDF vectorizer with 5000-feature vocabulary
- `all_models.pkl` (~5.7 MB) — all 5 trained classifiers for comparison

**Latest model comparison results (with `class_weight="balanced"`):**

| Model               | Accuracy | Precision | Recall | F1 Score |
| -------------------- | -------- | --------- | ------ | -------- |
| **SVM (Linear)** ★   | **98.46%** | 93.38%  | **73.41%** | **82.20%** |
| Logistic Regression  | 96.98%   | 63.16%    | **90.17%** | 74.29%   |
| Random Forest        | 97.90%   | 99.0%     | 57.23% | 72.53%   |
| Gradient Boosting    | 97.79%   | 91.96%    | 59.54% | 72.28%   |
| Naive Bayes          | 96.98%   | 88.24%    | 43.35% | 58.14%   |

---

### 3. Explainable AI (XAI) Pipeline

**Entry point:** `explainer.py → explain_prediction(text)`

```
Input text
    │
    ▼
┌────────────────────────┐
│ TF-IDF Transform       │
│ + Model Prediction     │
│                        │
│ Get: prediction,       │
│ scam_prob, legit_prob  │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ Feature Contribution   │  (only for models with .coef_ like Logistic Regression)
│ Analysis               │
│                        │
│ contribution[i] =      │
│   coef[i] × tfidf[i]   │
│                        │
│ Sort by |contribution| │
│ Split into:            │
│ - scam_indicators      │
│   (positive coef)      │
│ - legit_indicators     │
│   (negative coef)      │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ Red Flag Detection     │
│ (Regex + NER)          │
│                        │
│ 8 regex categories:    │
│ - guaranteed_income    │
│ - upfront_payment      │
│ - personal_info_early  │
│ - too_good (no exp)    │
│ - urgency              │
│ - vague_description    │
│ - whatsapp_only        │
│ - generic_email        │
│                        │
│ + NER scam signals:    │
│ - no_company_entity    │
│ - no_location_entity   │
│ - high_money_entity    │
│ - excessive_persons    │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ NER Entity Analysis    │
│                        │
│ companies_found: [ORG] │
│ locations_found: [GPE] │
│ money_found: [MONEY]   │
│ entity_count: total    │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ AI Text Detection      │
│                        │
│ Option A (default):    │
│  ai_text_detector.py   │
│  Random Forest + TF-IDF│
│  trained on 1GB dataset│
│                        │
│ Option B (DL upgrade): │
│  ai_text_detector_     │
│  bert.py               │
│  RoBERTa transformer   │
│  via HuggingFace       │
│                        │
│ If AI prob > 60%:      │
│ → add to red_flags     │
└────────────────────────┘
```

**Output structure:**

```json
{
  "prediction": "scam" | "legitimate",
  "scam_probability": 87.5,
  "legit_probability": 12.5,
  "confidence": 87.5,
  "top_scam_indicators": [
    { "word": "guaranteed", "contribution": 0.342, "tfidf_weight": 0.156, "impact_percentage": 12.3, "message": "..." }
  ],
  "top_legit_indicators": [...],
  "red_flags": [
    { "flag": "Upfront Payment", "severity": "critical", "message": "..." },
    { "flag": "No Company Entity", "severity": "medium", "message": "No company/organization name detected by NER" }
  ],
  "entity_analysis": {
    "companies_found": ["Google", "Alphabet Inc"],
    "locations_found": ["New York", "California"],
    "money_found": ["$150,000"],
    "entity_count": 12
  },
  "total_features_analyzed": 142
}
```

**Severity levels:** `critical` > `high` > `medium` > `low`

---

### 4. Named Entity Recognition (NER) Pipeline

**Entry point:** `ner_extractor.py` — centralized NER module used by `scraper.py`, `explainer.py`, `resume_parser.py`, and `company_scorer.py`

**Model:** `dslim/bert-base-NER` (BERT-base fine-tuned on CoNLL-2003, ~92% F1, lazy-loaded via HuggingFace on first use)

```
Input text (job posting or resume)
    │
    ▼
┌────────────────────────────────────┐
│ BERT NER Pipeline                  │
│ (dslim/bert-base-NER)              │
│                                    │
│ Tokenizer → BERT Encoder →         │
│ Token Classification Head          │
│ (aggregation_strategy="simple")    │
│                                    │
│ Extracted entity types (BERT):     │
│ ┌────────┬───────────────────────┐ │
│ │ Label  │ What It Captures      │ │
│ ├────────┼───────────────────────┤ │
│ │ PER    │ Person names          │ │
│ │ ORG    │ Companies, orgs       │ │
│ │ LOC    │ Geographic locations  │ │
│ │ MISC   │ Nationalities, events │ │
│ └────────┴───────────────────────┘ │
│                                    │
│ Additional types via regex:        │
│ ┌────────┬───────────────────────┐ │
│ │ MONEY  │ Monetary values       │ │
│ │ DATE   │ Dates, time periods   │ │
│ └────────┴───────────────────────┘ │
└────────────────────────────────────┘
    │
    ├── extract_job_entities(text)
    │   Returns: companies, locations,
    │   money, dates, persons,
    │   scam_signals (entity-based)
    │
    └── extract_resume_entities(text)
        Returns: name (first PER entity),
        organizations, locations,
        dates, skills_from_ner (MISC)
```

**NER Scam Signals** (generated by `extract_job_entities`):

| Signal                   | Severity | Condition                                    |
| ------------------------ | -------- | -------------------------------------------- |
| `no_company_entity`      | medium   | No ORG entities found in posting             |
| `no_location_entity`     | low      | No LOC entities found                        |
| `excessive_person_names` | low      | >5 PER entities (unusual for job post)       |
| `high_money_entity`      | medium   | MONEY regex value >500,000 (any currency)    |

**Integration points:**

| Module              | Function Used               | Purpose                                                      |
| ------------------- | --------------------------- | ------------------------------------------------------------ |
| `scraper.py`        | `extract_job_entities()`    | Adds `entities` dict to scraped job data                     |
| `explainer.py`      | `extract_job_entities()`    | Adds `entity_analysis` + NER scam signals to red flags       |
| `resume_parser.py`  | `extract_resume_entities()` | Adds `ner_entities` (name, orgs, locations) to parsed resume |
| `company_scorer.py` | `extract_entities()`        | Validates company name is recognized as ORG (+10 score)      |

---

### 5. Resume Parsing Pipeline

**Entry point:** `POST /api/resume/upload` → `resume_parser.py → parse_resume(file_bytes, filename)`

```
File Upload (PDF / DOCX / TXT, max 5MB)
    │
    ▼
┌────────────────────────┐
│ Text Extraction        │
│                        │
│ PDF  → PyPDF2          │
│ DOCX → python-docx     │
│ TXT  → UTF-8 decode    │
│                        │
│ Reject if < 50 chars   │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ Skill Extraction       │
│                        │
│ 7 categories, 200+     │
│ skills in database:    │
│                        │
│ 1. programming_langs   │
│    (35 skills)         │
│ 2. frameworks          │
│    (38 skills)         │
│ 3. databases           │
│    (22 skills)         │
│ 4. cloud_devops        │
│    (30 skills)         │
│ 5. data_science_ml     │
│    (42 skills)         │
│ 6. tools               │
│    (32 skills)         │
│ 7. soft_skills         │
│    (19 skills)         │
│                        │
│ Uses regex word-       │
│ boundary matching:     │
│ \b{skill}\b            │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ Education Extraction   │
│                        │
│ Regex patterns for:    │
│ B.S., B.Tech, M.S.,    │
│ MBA, Ph.D., Diploma,   │
│ 10th, 12th, etc.       │
│                        │
│ Returns top 5 matches  │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ Experience Extraction  │
│                        │
│ Patterns like:         │
│ "5+ years experience"  │
│ "experience of 3 years"│
│                        │
│ Returns integer years  │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ Contact Info Extraction│
│                        │
│ - Email (regex)        │
│ - Phone (intl formats) │
│ - LinkedIn profile URL │
│ - GitHub profile URL   │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ NER Entity Extraction  │
│ (BERT via              │
│  ner_extractor.py)     │
│                        │
│ - name (PER)           │
│ - organizations (ORG)  │
│ - locations (LOC/GPE)  │
│ - dates (DATE, regex)  │
│ - skills_from_ner      │
│   (PRODUCT entities)   │
│                        │
│ Enriches contact info  │
│ with detected name     │
└────────────────────────┘
    │
    ▼
┌────────────────────────┐
│ Database Storage       │
│                        │
│ resumes table:         │
│ - extracted_text       │
│   (first 5000 chars)   │
│ - skills (JSON string) │
│ - experience (string)  │
│ - education (JSON)     │
└────────────────────────┘
```

**Data stored in DB:** Text is truncated to 5000 characters. Skills are serialized as `json.dumps({"programming_languages": ["python", "java"], ...})`. Education is serialized as a JSON array.

**NER entities returned in API response** (not persisted to DB): `ner_entities.name`, `ner_entities.organizations`, `ner_entities.locations`, `ner_entities.dates`, `ner_entities.skills_from_ner`, `ner_entities.entity_count`.

---

### 6. Resume-Job Matching Pipeline

**Entry point:** `POST /api/resume/match` → `resume_matcher.py → compute_match_score(resume_data, job_text)`

```
Resume Data (from DB) + Job Text (URL or raw text)
    │
    ▼
┌────────────────────────────────┐
│ Step 1: Text Similarity         │
│                                │
│ Option A (resume_matcher.py):  │
│  TF-IDF cosine similarity     │
│  TfidfVectorizer(3000 feat.)  │
│                                │
│ Option B (resume_matcher_     │
│  semantic.py):                 │
│  Sentence-BERT embeddings     │
│  Model: all-MiniLM-L6-v2     │
│  Semantic cosine similarity   │
│                                │
│ → similarity ∈ [0.0, 1.0]      │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Step 2: Skill-by-Skill Match   │
│                                │
│ Extract skills from job text   │
│ using same SKILLS_DATABASE     │
│                                │
│ matching = resume ∩ job        │
│ missing  = job - resume        │
│ extra    = resume - job        │
│                                │
│ skill_match_ratio =            │
│   |matching| / |job_skills|    │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Step 3: Combined Match Score   │
│                                │
│ match_score = (0.4 × cosine +  │
│   0.6 × skill_ratio) × 100     │
│                                │
│ Capped at 100                  │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Step 4: Strengths & Weaknesses │
│                                │
│ Strengths: matched skills,     │
│   experience, education        │
│ Weaknesses: missing skills     │
│   with priority (high if course│
│   recommendation available)    │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Step 5: Course Recommendations │
│                                │
│ Built-in course database for   │
│ 20+ skills with:               │
│ - Title, Platform, URL, Level  │
│ - Sources: Coursera, Udemy,    │
│   freeCodeCamp, AWS Training,  │
│   YouTube, Books               │
│                                │
│ Fallback: YouTube search URL   │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Step 6: ATS Score (out of 100) │
│                                │
│ 30 pts: keyword density        │
│ 30 pts: skills coverage        │
│   ≥10 skills = 30pts           │
│   ≥5  skills = 20pts           │
│   <5  skills = 10pts           │
│ 10 pts: contact info           │
│   5pts email + 5pts phone      │
│ 10 pts: education section      │
│ 10 pts: experience mention     │
│ 10 pts: word count             │
│   200-1000 words = 10pts       │
│   <200 = 3pts, >1000 = 5pts    │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Step 7: Training Roadmap       │
│                                │
│ Top 6 missing skills, grouped  │
│ by priority, with 2-week       │
│ learning blocks + resources    │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Database Storage               │
│                                │
│ match_history table:           │
│ strengths, weaknesses,         │
│ recommendations → JSON strings │
└────────────────────────────────┘
```

---

### 7. Salary Anomaly Detection Pipeline

**Entry point:** `salary_predictor.py → predict_salary_anomaly(salary_str, job_text)`

```
Salary String + Job Text
    │
    ▼
┌────────────────────────────────┐
│ Step 1: Feature Extraction     │
│                                │
│ Infer features from job text:  │
│ - Position (e.g. Developer)    │
│ - YearsExperience (0.5 to 8.0) │
│ - EducationLevel (Bachelors)   │
│ - Industry (Technology, etc)   │
│ - Location (Remote/On-site)    │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Step 2: ML Salary Prediction   │
│                                │
│ Random Forest Regressor pipe-  │
│ line trained on synthetic_sal- │
│ ary_dataset.csv predicts       │
│ expected base salary in INR.   │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Step 3: Salary Parsing         │
│                                │
│ Extract posted salary numbers  │
│ and detect currency (USD/INR). │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ Step 4: Anomaly Scoring                │
│                                        │
│ Compare parsed avg_salary to ML        │
│ predicted salary (converted to USD/INR)│
│                                        │
│ - deviation = |posted - predicted|     │
│               / predicted              │
│                                        │
│ Anomaly checks:                        │
│ - +0.6 if posted > 2.5× prediction     │
│ - +0.4 if posted > 1.8× prediction     │
│ - +0.3 if posted < 0.4× prediction     │
│ - +0.2 if deviation > 50%              │
│                                        │
│ Secondary heuristic checks:            │
│ - +0.2 if range spread > average       │
│ - +0.05 for suspiciously round numbers │
│                                        │
│ Score capped at 1.0                    │
└────────────────────────────────────────┘
    │
    ▼
Anomaly Levels:
  < 0.2  → "normal"
  < 0.4  → "slightly_suspicious"
  < 0.6  → "suspicious"
  ≥ 0.6  → "highly_suspicious"
```

---

### 8. Company Trust Scoring Pipeline

**Entry point:** `POST /api/company/check` → `company_scorer.py → compute_company_trust_score(name, domain, email)`

```
Company Name + Domain (optional) + Email (optional)
    │
    ▼
┌─────────────────────────────────────────────┐
│ Signal 1: Domain Age (25% weight)           │
│                                             │
│ WHOIS lookup on company domain:             │
│ > 5 years → 90 pts                          │
│ > 2 years → 70 pts                          │
│ > 0 years → 40 pts                          │
│ Unknown   → 20 pts                          │
│ No domain → 50 pts (neutral)                │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│ Signal 2: Email Analysis (25% weight)       │
│                                             │
│ Free provider (gmail, yahoo, etc.) → 20 pts │
│ Matches company domain → 90 pts             │
│ Different domain → 60 pts                   │
│ No email → 50 pts                           │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│ Signal 3: Social Presence (20% weight)      │
│                                             │
│ Heuristic checks on company name:           │
│ - Too short (<3 chars) → warning            │
│ - Suspicious phrases ("work from home",     │
│   "earn money", "quick cash") → -20 pts     │
│ - Business suffixes (Ltd, Inc, LLC) → +15   │
│ - NER ORG validation → +10 pts              │
│   (if BERT recognizes name as ORG)          │
└─────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│ Signal 4: Community Reports (30% weight)    │
│                                             │
│ Query scam_reports + company_blacklist DB:  │
│ Blacklisted → 0 pts                         │
│ > 5 reports → 10 pts                        │
│ > 0 reports → 40 pts                        │
│ No reports  → 80 pts                        │
└─────────────────────────────────────────────┘
    │
    ▼
trust_score = 0.25×domain + 0.25×email + 0.20×social + 0.30×community

Trust Levels:
  ≥ 70 → "trusted"
  ≥ 50 → "moderate"
  ≥ 30 → "suspicious"
  < 30 → "untrusted"
```

---

### 9. Community Reporting Pipeline

**Entry point:** `community.py`

#### Submitting a Report (`POST /api/reports/create`)

```
Authenticated user submits report
    │
    ▼
INSERT into scam_reports table
    │
    ▼
┌──────────────────────────────┐
│ Auto-Blacklist Check         │
│                              │
│ Count reports for this       │
│ company (case-insensitive)   │
│                              │
│ If count ≥ 3:                │
│   trust_score =              │
│     max(0, 50 - count × 10)  │
│                              │
│   INSERT or UPDATE           │
│   company_blacklist          │
└──────────────────────────────┘
```

#### Voting on Reports (`POST /api/reports/{id}/vote`)

```
Vote Request: { vote_type: "up" | "down" }
    │
    ▼
Check existing vote in report_votes
    │
    ├── Same vote type exists → REMOVE vote (toggle off)
    │   Decrement upvotes/downvotes counter
    │
    ├── Different vote exists → CHANGE vote
    │   Swap counters (+1 new, -1 old)
    │
    └── No existing vote → ADD new vote
        Increment corresponding counter
```

#### Getting Reports (`GET /api/reports`)

Paginated query with optional `category` filter. Joins with `users` table for username. Returns: `reports[]`, `total`, `page`, `per_page`, `total_pages`.

---

### 10. Analytics Pipeline

**Entry point:** `analytics.py` — 6 functions serving the analytics dashboard

| Function                            | Data Source                                   | What It Returns                                                                                                                   |
| ----------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `get_overview_stats()`              | All tables                                    | total_users, total_scans, total_reports, total_resumes, blacklisted_companies, average_risk_score, scans_today, risk_distribution |
| `get_scan_trends(days)`             | `scan_history`                                | Daily scan counts and average risk scores for last N days                                                                         |
| `get_top_reported_companies(limit)` | `scam_reports`                                | Company names, report counts, upvotes (grouped case-insensitive)                                                                  |
| `get_model_comparison()`            | `models/model_metrics.json` or `model_metrics` table | All 5 model metrics (accuracy, precision, recall, F1)                                                                        |
| `get_recent_scans(limit)`           | `scan_history` JOIN `users`                   | Latest scan records with username                                                                                                 |
| `get_report_categories()`           | `scam_reports`                                | Category distribution (count per category)                                                                                        |

**Data retrieval priority for model metrics:** JSON file first (`models/model_metrics.json`), database fallback.

---

### 11. PDF Report Generation Pipeline

**Entry point:** `report_generator.py`

Two report types are generated:

#### Scan Report PDF (`generate_scan_report`)

Triggered by `POST /api/reports/generate-scan-pdf`. Sections:

1. **Scan Overview** — URL, job title, company, scan date
2. **Risk Assessment** — Color-coded risk badge (red/orange/green), NLP/salary/domain score breakdown
3. **AI Explanation** — Top scam indicators, legitimacy indicators, red flags with severity
4. **Salary Analysis** — Provided salary, detected role, anomaly level, analysis points
5. **Company Reputation** — Trust score, breakdown details
6. **Disclaimer** — Legal notice

#### Match Report PDF (`generate_resume_match_report`)

Triggered by `POST /api/reports/generate-match-pdf`. Sections:

1. **Match Analysis** — Match score, ATS score, skills ratio
2. **Strengths** — Matched skills list
3. **Areas to Improve** — Missing skills list
4. **Training Roadmap** — Prioritized learning blocks with course resources
5. **ATS Optimization Tips** — Feedback items

**Output:** PDF files saved to `backend/reports/` with timestamped filenames (e.g., `scan_report_20260313_035600.pdf`). Returned as `FileResponse` with `application/pdf` MIME type.

---

## Authentication System

**Module:** `auth.py`

| Feature              | Detail                                                  |
| -------------------- | ------------------------------------------------------- |
| **Password Hashing** | bcrypt via `passlib.CryptContext`                       |
| **Token Type**       | JWT (JSON Web Token)                                    |
| **Token Algorithm**  | HS256                                                   |
| **Token Expiry**     | 24 hours (1440 minutes)                                 |
| **Secret Key**       | Environment variable `SECRET_KEY` (defaults to dev key) |
| **Token Payload**    | `{"sub": "<user_id>", "exp": "<timestamp>"}`            |

## Authentication System

Authentication is handled using `httpOnly` cookies to prevent client-side access to tokens.

Since `httpOnly` cookies cannot be accessed in the browser (to protect against XSS), a Next.js API route is used as a backend-for-frontend (BFF) layer. This route reads the cookie server-side and attaches the Bearer token to backend requests via the `Authorization` header.

This ensures secure communication without exposing tokens in the frontend client.

**Registration flow:**
1. Check uniqueness (username, email)
2. Hash password with bcrypt
3. Insert into `users` table
4. Generate JWT token and set as `httpOnly` cookie via Next.js
5. Return user info

---

## API Reference

### Authentication

| Method | Path                 | Auth     | Description              |
| ------ | -------------------- | -------- | ------------------------ |
| POST   | `/api/auth/register` | None     | Register new account     |
| POST   | `/api/auth/login`    | None     | Login, get JWT           |
| GET    | `/api/auth/me`       | Required | Get current user profile |

### Job Scanning

| Method | Path                  | Auth     | Description                              |
| ------ | --------------------- | -------- | ---------------------------------------- |
| POST   | `/api/scan/url`       | Optional | Scan a job posting URL                   |
| POST   | `/api/scan/text`      | Optional | Analyze job text directly                |
| POST   | `/api/scan/detect-ai` | None     | Detect if text is AI-generated (ChatGPT) |
| GET    | `/api/scan/history`   | Required | Get user's scan history (last 50)        |

### Resume Analysis

| Method | Path                        | Auth     | Description                          |
| ------ | --------------------------- | -------- | ------------------------------------ |
| POST   | `/api/resume/upload`        | Required | Upload & parse resume (PDF/DOCX/TXT) |
| POST   | `/api/resume/match`         | Required | Match resume vs job posting          |
| GET    | `/api/resume/list`          | Required | List user's uploaded resumes         |
| GET    | `/api/resume/match-history` | Required | Get match history (last 50)          |

### Company Reputation

| Method | Path                 | Auth | Description               |
| ------ | -------------------- | ---- | ------------------------- |
| POST   | `/api/company/check` | None | Check company trust score |

### Community Reports

| Method | Path                     | Auth     | Description                |
| ------ | ------------------------ | -------- | -------------------------- |
| POST   | `/api/reports/create`    | Required | Submit a scam report       |
| GET    | `/api/reports`           | None     | Browse reports (paginated) |
| POST   | `/api/reports/{id}/vote` | Required | Vote on a report           |
| GET    | `/api/reports/blacklist` | None     | Get company blacklist      |

### Analytics

| Method | Path                               | Auth | Description                     |
| ------ | ---------------------------------- | ---- | ------------------------------- |
| GET    | `/api/analytics/overview`          | None | Platform statistics             |
| GET    | `/api/analytics/trends`            | None | Scan trends (configurable days) |
| GET    | `/api/analytics/top-reported`      | None | Most reported companies         |
| GET    | `/api/analytics/models`            | None | ML model comparison metrics     |
| GET    | `/api/analytics/recent-scans`      | None | Recent scan activity            |
| GET    | `/api/analytics/report-categories` | None | Report category distribution    |

### PDF Reports

| Method | Path                              | Auth     | Description                 |
| ------ | --------------------------------- | -------- | --------------------------- |
| POST   | `/api/reports/generate-scan-pdf`  | Optional | Generate scan analysis PDF  |
| POST   | `/api/reports/generate-match-pdf` | Required | Generate match analysis PDF |

### System

| Method | Path          | Auth | Description                 |
| ------ | ------------- | ---- | --------------------------- |
| GET    | `/api/health` | None | Health check + feature list |

---

## Data Files & Serialized Models

### Training Datasets (`backend/datasets/`)

| File                           | Size     | Format | Records  | Description                                                                                           |
| ------------------------------ | -------- | ------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `fake_job_postings.csv`        | ~50 MB   | CSV    | 17,880   | Main scam detection dataset — 17 columns, binary label `fraudulent` (0 = legit, 1 = scam). 13 text fields concatenated for training. |
| `AI_Human.csv`                 | ~1.06 GB | CSV    | ~500,000 | Human vs AI-generated text dataset — columns: `text` (content), `generated` (0 = Human, 1 = AI). Sampled to 40K records during training to avoid OOM. |
| `synthetic_salary_dataset.csv` | ~28 KB   | CSV    | ~500     | Salary prediction dataset — columns: `Position`, `YearsExperience`, `EducationLevel`, `Industry`, `Location`, `Salary(INR)`. |

### Serialized Models (`backend/models/`)

| File                         | Size     | Format        | Description                                                                             |
| ---------------------------- | -------- | ------------- | --------------------------------------------------------------------------------------- |
| `model.pkl`                  | ~40 KB   | joblib pickle | Best scam detection model (SVM Linear, 98.55% accuracy)                                 |
| `vectorizer.pkl`             | ~197 KB  | joblib pickle | Fitted TF-IDF vectorizer (5000 features, unigrams + bigrams, English stopwords removed) |
| `all_models.pkl`             | ~5.7 MB  | joblib pickle | All 5 trained classifiers (LR, RF, SVM, NB, GB) for model comparison                   |
| `ai_detector_model.pkl`      | ~30.8 MB | joblib pickle | Random Forest classifier for AI-generated text detection                                |
| `ai_detector_vectorizer.pkl` | ~190 KB  | joblib pickle | TF-IDF vectorizer for AI text detection (5000 features)                                 |
| `salary_model.pkl`           | ~1.9 MB  | joblib pickle | Random Forest Regressor pipeline with OneHotEncoder + StandardScaler for salary prediction |
| `ai_detector_bert/`          | ~500 MB  | HuggingFace   | Fine-tuned RoBERTa transformer for AI text detection (used by `ai_text_detector_bert.py`). Contains `checkpoint-500/` and `checkpoint-1000/` from fine-tuning on `AI_Human.csv`. |
| `ner_bert/`                  | ~420 MB  | HuggingFace   | Local cache for `dslim/bert-base-NER` (auto-downloaded on first use by `ner_extractor.py`; delete to re-download). |

### Runtime Files

| File                 | Size    | Format   | Description                                              |
| -------------------- | ------- | -------- | -------------------------------------------------------- |
| `database/scam_detector.db`   | Dynamic | SQLite 3 | Runtime database (all 8 tables, auto-created on startup) |
| `models/model_metrics.json`   | Dynamic | JSON     | All 5 model metrics + best model info + dataset metadata |

---

## Setup & Running

### Prerequisites

- Python 3.11+
- Node.js 18+ or Bun (for frontend)

### 1. Backend Setup

```bash
cd backend
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python -m playwright install chromium
```

If your virtual environment is managed with `uv` and `python -m pip` is unavailable, use:

```bash
cd backend
.venv\Scripts\activate

uv pip install -r requirements.txt
python -m playwright install chromium
```

To fine-tune the RoBERTa AI detector on your own `AI_Human.csv` dataset:

```bash
python ai_text_detector_bert.py
```

---

### 2. Train Models (First Time Only)

```bash
cd backend

# Train the scam detection model (5 classifiers compared, best saved)
python train_model.py

# Train the salary prediction model
python salary_predictor.py

# Train the AI text detector
python ai_text_detector.py
```

This generates:

- `models/model.pkl` + `models/vectorizer.pkl` — best scam detection model + TF-IDF vectorizer
- `models/all_models.pkl` — all 5 classifiers for comparison
- `models/salary_model.pkl` — salary regressor pipeline
- `models/ai_detector_model.pkl` + `models/ai_detector_vectorizer.pkl` — AI text detector
- `models/model_metrics.json` — training metrics for all models

> **Note:** The AI text detector model will auto-train on first API call if models are not found, provided the `AI_Human.csv` dataset is present in `datasets/`. Training samples 40K records from the ~500K dataset to avoid memory issues.

### 3. Run the Backend Server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive Swagger docs at `http://localhost:8000/docs`.

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies (Bun recommended, npm also works)
bun install
# or: npm install

# Start development server
bun dev
# or: npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 5. Additional Documentation

| File                    | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `docs/API_DOCS.md`           | Detailed API endpoint reference                   |
| `docs/HOW_IT_WORKS.md`       | High-level system overview and feature walkthrough |
| `docs/TECHNICAL_ML_REPORT.md`| ML model evaluation and performance analysis      |

---

_Generated on 2026-03-13. This document is intended as a technical reference for building search reports and understanding the data architecture of the AI Job Scam Detector system._
