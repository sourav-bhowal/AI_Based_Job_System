# AI Job Analysis and Detection System — API Documentation

**Base URL:** `http://localhost:8000`  
**Version:** `2.0.0`  
**Auth:** JWT Bearer Token (via `Authorization: Bearer <token>` header)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Job Scanning](#2-job-scanning)
3. [Resume Analysis](#3-resume-analysis)
4. [Company Reputation](#4-company-reputation)
5. [Community Reports](#5-community-reports)
6. [Analytics](#6-analytics)
7. [PDF Reports](#7-pdf-reports)
8. [System](#8-system)

---

## 1. Authentication

### `POST /api/auth/register`

Register a new user account.

**Request Body:**

```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "full_name": "string (optional)"
}
```

**Success Response `200`:**

```json
{
  "user_id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Status | Detail                                    |
| ------ | ----------------------------------------- |
| `400`  | `"Username or email already registered"`  |
| `422`  | Validation error (missing/invalid fields) |

---

### `POST /api/auth/login`

Login and receive an access token.

**Request Body:**

```json
{
  "username": "string (required — accepts username or email)",
  "password": "string (required)"
}
```

**Success Response `200`:**

```json
{
  "user_id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Status | Detail                           |
| ------ | -------------------------------- |
| `401`  | `"Invalid username or password"` |
| `422`  | Validation error                 |

---

### `GET /api/auth/me`

Get the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <token>` _(required)_

**Success Response `200`:**

```json
{
  "user_id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "created_at": "2026-03-12T10:30:00",
  "is_admin": 0
}
```

**Error Responses:**

| Status | Detail                   |
| ------ | ------------------------ |
| `401`  | Invalid or missing token |

---

## 2. Job Scanning

### `POST /api/scan/url`

Scan a job posting URL for scam indicators. Scrapes the page, runs ML prediction, salary analysis, and explainable AI.

**Headers:** `Authorization: Bearer <token>` _(optional — saves to scan history if provided)_

**Request Body:**

```json
{
  "url": "string (required — full job posting URL)"
}
```

**Success Response `200`:**

```json
{
  "risk_score": 72.5,
  "risk_level": "High Risk",
  "job_details": {
    "description": "We are looking for...",
    "salary": "$50000-$80000",
    "email": "hr@company.com",
    "entities": {
      "companies": ["Acme Corp"],
      "locations": ["New York"],
      "money": ["$50,000"],
      "dates": ["2026"],
      "persons": [],
      "entity_count": 5,
      "all_entities": {},
      "scam_signals": []
    }
  },
  "explanation": {
    "prediction": "scam",
    "scam_probability": 0.85,
    "confidence": "high",
    "top_scam_features": [{ "word": "guaranteed", "weight": 0.42 }],
    "top_legit_features": [{ "word": "requirements", "weight": -0.31 }],
    "red_flags": []
  },
  "salary_analysis": {
    "anomaly_score": 0.3,
    "salary_provided": "$50000-$80000",
    "currency": "USD",
    "detected_role": "Software Engineer",
    "ml_prediction": {
      "predicted_salary": 65000,
      "model": "Random Forest Regressor (ML Pipeline)",
      "inferred_experience_years": 2.0,
      "inferred_education": "Bachelors",
      "deviation_percent": 12.5
    },
    "analysis": ["Salary deviates 12.5% from ML-predicted value — unusual"]
  }
}
```

> [!NOTE]
> `risk_level` values: `"Safe"` (score < 30), `"Medium Risk"` (30–59), `"High Risk"` (≥ 60)

**Error Responses:**

| Status | Detail                                           |
| ------ | ------------------------------------------------ |
| `422`  | Validation error (missing `url`)                 |
| `500`  | Scraping failed (URL unreachable, timeout, etc.) |

---

### `POST /api/scan/text`

Analyze job posting text directly without a URL.

**Headers:** `Authorization: Bearer <token>` _(optional)_

**Request Body:**

```json
{
  "text": "string (required — the job posting text)",
  "job_title": "string (optional)",
  "company_name": "string (optional)"
}
```

**Success Response `200`:**

```json
{
  "risk_score": 45.2,
  "risk_level": "Medium Risk",
  "explanation": {
    "prediction": "scam",
    "scam_probability": 0.452,
    "confidence": "medium",
    "top_scam_features": [],
    "top_legit_features": [],
    "red_flags": []
  },
  "salary_analysis": {
    "anomaly_score": 0.1,
    "analysis": "..."
  }
}
```

**Error Responses:**

| Status | Detail                            |
| ------ | --------------------------------- |
| `422`  | Validation error (missing `text`) |

---

### `GET /api/scan/history`

Get scan history for the authenticated user (last 50 scans).

**Headers:** `Authorization: Bearer <token>` _(required)_

**Success Response `200`:**

```json
{
  "history": [
    {
      "id": 1,
      "user_id": 1,
      "url": "https://example.com/job/123",
      "risk_score": 72.5,
      "risk_level": "High Risk",
      "nlp_score": 0.85,
      "salary_score": 30.0,
      "domain_score": 0,
      "description": "We are looking for...",
      "salary": "$50000-$80000",
      "email_found": "hr@company.com",
      "scanned_at": "2026-03-12T10:30:00"
    }
  ]
}
```

**Error Responses:**

| Status | Detail                   |
| ------ | ------------------------ |
| `401`  | Invalid or missing token |

---

### `POST /api/scan/detect-ai`

Detect if job posting text was AI-generated (e.g., ChatGPT).

**Request Body:**

```json
{
  "text": "string (required — the text to analyze)",
  "job_title": "string (optional)",
  "company_name": "string (optional)"
}
```

**Success Response `200`:**

```json
{
  "ai_probability": 72.0,
  "human_probability": 28.0,
  "verdict": "likely_ai",
  "confidence": 72.0,
  "method": "pure_ml_classifier"
}
```

> [!NOTE]
> `verdict` values: `"likely_human"` (prob < 0.40), `"uncertain"` (0.40–0.64), `"likely_ai"` (≥ 0.65)

**Error Responses:**

| Status | Detail                            |
| ------ | --------------------------------- |
| `422`  | Validation error (missing `text`) |

---

## 3. Resume Analysis

### `POST /api/resume/upload`

Upload and parse a resume file. Extracts skills, education, experience, and contact info.

**Headers:** `Authorization: Bearer <token>` _(required)_

**Request:** `multipart/form-data`

| Field  | Type | Required | Description                      |
| ------ | ---- | -------- | -------------------------------- |
| `file` | File | Yes      | PDF, DOCX, or TXT file (max 5MB) |

**Success Response `200`:**

```json
{
  "resume_id": 1,
  "filename": "resume.pdf",
  "skills": {
    "programming_languages": ["python", "javascript"],
    "frameworks": ["react", "django"],
    "databases": ["postgresql"],
    "cloud_devops": ["aws", "docker"],
    "data_ml": [],
    "tools": ["git", "jira"],
    "soft_skills": ["leadership"]
  },
  "total_skills_found": 8,
  "education": ["Bachelor of Science", "Master of Technology"],
  "experience_years": 5,
  "contact": {
    "email": "john@example.com",
    "phone": "+1-234-567-8900",
    "linkedin": "linkedin.com/in/johndoe",
    "github": "github.com/johndoe"
  },
  "word_count": 450
}
```

**Error Responses:**

| Status | Detail                                               |
| ------ | ---------------------------------------------------- |
| `400`  | `"Unsupported file type. Upload PDF, DOCX, or TXT."` |
| `400`  | `"File too large. Max 5MB."`                         |
| `401`  | Invalid or missing token                             |

---

### `POST /api/resume/match`

Match a previously uploaded resume against a job posting. Returns detailed skill analysis, ATS score, and training roadmap.

**Headers:** `Authorization: Bearer <token>` _(required)_

**Request Body:**

```json
{
  "resume_id": 1,
  "job_url": "string (optional — provide this OR job_text)",
  "job_text": "string (optional — provide this OR job_url)"
}
```

> [!IMPORTANT]
> You must provide either `job_url` or `job_text`. If both are provided, `job_url` takes priority.

**Success Response `200`:**

```json
{
  "match_score": 72.5,
  "strengths": [
    "Strong Python skills matching job requirements",
    "Cloud experience with AWS"
  ],
  "weaknesses": [
    "Missing Kubernetes experience",
    "No TypeScript skills detected"
  ],
  "recommendations": [
    "Consider learning Kubernetes for container orchestration",
    "Add TypeScript to your toolkit"
  ],
  "skill_match_details": {
    "matched_skills": ["python", "aws", "react"],
    "missing_skills": ["kubernetes", "typescript"],
    "extra_skills": ["django"]
  },
  "ats_score": {
    "score": 68,
    "keyword_match_rate": 0.72,
    "format_score": 85,
    "section_scores": {},
    "tips": []
  },
  "training_roadmap": [
    {
      "skill": "kubernetes",
      "priority": "high",
      "courses": [
        {
          "title": "Kubernetes for Developers",
          "platform": "Udemy",
          "url": "https://...",
          "level": "Intermediate"
        }
      ]
    }
  ]
}
```

**Error Responses:**

| Status | Detail                                 |
| ------ | -------------------------------------- |
| `400`  | `"Provide either job_url or job_text"` |
| `401`  | Invalid or missing token               |
| `404`  | `"Resume not found"`                   |

---

### `GET /api/resume/list`

List all uploaded resumes for the authenticated user.

**Headers:** `Authorization: Bearer <token>` _(required)_

**Success Response `200`:**

```json
{
  "resumes": [
    {
      "id": 1,
      "filename": "resume.pdf",
      "skills": {
        "programming_languages": ["python"],
        "frameworks": ["react"]
      },
      "experience": "5",
      "education": ["Bachelor of Science"],
      "uploaded_at": "2026-03-12T10:30:00"
    }
  ]
}
```

**Error Responses:**

| Status | Detail                   |
| ------ | ------------------------ |
| `401`  | Invalid or missing token |

---

### `GET /api/resume/match-history`

Get resume-job match history (last 50 matches).

**Headers:** `Authorization: Bearer <token>` _(required)_

**Success Response `200`:**

```json
{
  "history": [
    {
      "id": 1,
      "user_id": 1,
      "resume_id": 1,
      "filename": "resume.pdf",
      "job_url": "https://example.com/job/123",
      "match_score": 72.5,
      "strengths": "[\"Strong Python skills\"]",
      "weaknesses": "[\"Missing Kubernetes\"]",
      "recommendations": "[\"Learn Kubernetes\"]",
      "matched_at": "2026-03-12T10:30:00"
    }
  ]
}
```

**Error Responses:**

| Status | Detail                   |
| ------ | ------------------------ |
| `401`  | Invalid or missing token |

---

## 4. Company Reputation

### `POST /api/company/check`

Check a company's reputation and trust score. Analyzes domain age, email legitimacy, social presence, and community reports.

**Request Body:**

```json
{
  "company_name": "string (required)",
  "domain": "string (optional — e.g., 'company.com')",
  "email": "string (optional — e.g., 'hr@company.com')"
}
```

**Success Response `200`:**

```json
{
  "trust_score": 75,
  "trust_level": "Moderate Trust",
  "breakdown": {
    "domain_age_score": 80,
    "email_score": 70,
    "social_presence_score": 65,
    "community_score": 85
  },
  "domain_info": {
    "age_years": 5,
    "registrar": "GoDaddy",
    "creation_date": "2021-01-15"
  },
  "social_presence": {
    "linkedin": true,
    "twitter": false,
    "github": true
  },
  "community_reports": {
    "report_count": 2,
    "is_blacklisted": false,
    "avg_severity": "low"
  },
  "warnings": []
}
```

**Error Responses:**

| Status | Detail                                    |
| ------ | ----------------------------------------- |
| `422`  | Validation error (missing `company_name`) |

---

## 5. Community Reports

### `POST /api/reports/create`

Submit a new scam report. Automatically updates the company blacklist if report threshold is reached.

**Headers:** `Authorization: Bearer <token>` _(required)_

**Request Body:**

```json
{
  "company_name": "string (required)",
  "description": "string (required)",
  "job_url": "string (optional)",
  "job_title": "string (optional)",
  "evidence": "string (optional)",
  "category": "string (optional, default: 'other')"
}
```

**Success Response `200`:**

```json
{
  "report_id": 1,
  "message": "Report submitted successfully"
}
```

**Error Responses:**

| Status | Detail                   |
| ------ | ------------------------ |
| `401`  | Invalid or missing token |
| `422`  | Validation error         |

---

### `GET /api/reports`

Get community scam reports with pagination and optional category filter.

**Query Parameters:**

| Param      | Type   | Default | Constraints | Description               |
| ---------- | ------ | ------- | ----------- | ------------------------- |
| `page`     | int    | `1`     | ≥ 1         | Page number               |
| `per_page` | int    | `20`    | 1–100       | Results per page          |
| `category` | string | `null`  | optional    | Filter by report category |

**Success Response `200`:**

```json
{
  "reports": [
    {
      "id": 1,
      "user_id": 1,
      "username": "johndoe",
      "company_name": "Scam Corp",
      "job_title": "Data Entry Specialist",
      "job_url": "https://fake-job.com/post",
      "description": "Asked for upfront payment...",
      "evidence": "Screenshot of payment request",
      "category": "payment_scam",
      "upvotes": 5,
      "downvotes": 1,
      "created_at": "2026-03-12T10:30:00"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20,
  "total_pages": 3
}
```

---

### `POST /api/reports/{report_id}/vote`

Vote on a scam report (upvote/downvote). Toggle behavior — voting the same type again removes the vote.

**Headers:** `Authorization: Bearer <token>` _(required)_

**Path Parameters:**

| Param       | Type | Description                 |
| ----------- | ---- | --------------------------- |
| `report_id` | int  | ID of the report to vote on |

**Request Body:**

```json
{
  "vote_type": "string (required — 'up' or 'down')"
}
```

**Success Response `200`:**

```json
{
  "message": "Vote recorded",
  "action": "added"
}
```

> [!NOTE]
> Possible `action` values: `"added"` (new vote), `"changed"` (switched vote), `"removed"` (toggled off)

**Error Responses:**

| Status | Detail                             |
| ------ | ---------------------------------- |
| `401`  | Invalid or missing token           |
| `422`  | Validation error                   |
| `500`  | `vote_type` not `"up"` or `"down"` |

---

### `GET /api/reports/blacklist`

Get the full company blacklist (auto-populated from report thresholds).

**Success Response `200`:**

```json
{
  "blacklist": [
    {
      "id": 1,
      "company_name": "Scam Corp",
      "total_reports": 10,
      "added_at": "2026-03-12T10:30:00"
    }
  ]
}
```

---

## 6. Analytics

### `GET /api/analytics/overview`

Get platform-wide overview statistics.

**Success Response `200`:**

```json
{
  "total_users": 150,
  "total_scans": 1200,
  "total_reports": 85,
  "total_resumes": 320,
  "blacklisted_companies": 12,
  "average_risk_score": 42.3,
  "scans_today": 15,
  "risk_distribution": {
    "high_risk": 180,
    "medium_risk": 450,
    "safe": 570
  }
}
```

---

### `GET /api/analytics/trends`

Get daily scan trends over a period.

**Query Parameters:**

| Param  | Type | Default | Constraints | Description                 |
| ------ | ---- | ------- | ----------- | --------------------------- |
| `days` | int  | `30`    | 1–365       | Number of days to look back |

**Success Response `200`:**

```json
{
  "trends": [
    {
      "date": "2026-03-12",
      "count": 45,
      "avg_risk_score": 38.5
    }
  ]
}
```

---

### `GET /api/analytics/top-reported`

Get the most frequently reported companies.

**Query Parameters:**

| Param   | Type | Default | Constraints | Description             |
| ------- | ---- | ------- | ----------- | ----------------------- |
| `limit` | int  | `10`    | 1–50        | Max companies to return |

**Success Response `200`:**

```json
{
  "companies": [
    {
      "company_name": "Scam Corp",
      "report_count": 15,
      "total_upvotes": 42
    }
  ]
}
```

---

### `GET /api/analytics/models`

Get ML model comparison metrics (from training pipeline).

**Success Response `200`:**

```json
{
  "best_model": "Logistic Regression",
  "models": [
    {
      "model_name": "Logistic Regression",
      "accuracy": 97.82,
      "precision": 85.71,
      "recall": 72.1,
      "f1_score": 78.33,
      "training_samples": 14304,
      "test_samples": 3576
    }
  ],
  "vectorizer_features": 5000,
  "dataset_size": 17880,
  "trained_at": "2026-03-12T10:30:00"
}
```

> [!NOTE]
> Returns `{"message": "No model metrics available. Run train_model.py first."}` if no training has been done.

---

### `GET /api/analytics/recent-scans`

Get recent scan activity across all users.

**Query Parameters:**

| Param   | Type | Default | Constraints | Description         |
| ------- | ---- | ------- | ----------- | ------------------- |
| `limit` | int  | `20`    | 1–100       | Max scans to return |

**Success Response `200`:**

```json
{
  "scans": [
    {
      "id": 1,
      "user_id": 1,
      "username": "johndoe",
      "url": "https://example.com/job/123",
      "risk_score": 72.5,
      "risk_level": "High Risk",
      "scanned_at": "2026-03-12T10:30:00"
    }
  ]
}
```

---

### `GET /api/analytics/report-categories`

Get scam report distribution by category.

**Success Response `200`:**

```json
{
  "categories": [
    { "category": "payment_scam", "count": 25 },
    { "category": "fake_company", "count": 18 },
    { "category": "identity_theft", "count": 12 },
    { "category": "other", "count": 30 }
  ]
}
```

---

## 7. PDF Reports

### `POST /api/reports/generate-scan-pdf`

Generate a downloadable PDF report for a job URL scan.

**Headers:** `Authorization: Bearer <token>` _(optional)_

**Request Body:**

```json
{
  "url": "string (required — job posting URL)"
}
```

**Success Response `200`:**

Returns a **PDF file** (`application/pdf`) as a file download with filename `scan_report.pdf`.

**Error Responses:**

| Status | Detail                            |
| ------ | --------------------------------- |
| `422`  | Validation error (missing `url`)  |
| `500`  | Scraping or PDF generation failed |

---

### `POST /api/reports/generate-match-pdf`

Generate a downloadable PDF report for resume-job match analysis.

**Headers:** `Authorization: Bearer <token>` _(required)_

**Request Body:**

```json
{
  "resume_id": 1,
  "job_url": "string (optional — provide this OR job_text)",
  "job_text": "string (optional — provide this OR job_url)"
}
```

**Success Response `200`:**

Returns a **PDF file** (`application/pdf`) as a file download with filename `match_report.pdf`.

**Error Responses:**

| Status | Detail                                 |
| ------ | -------------------------------------- |
| `400`  | `"Provide either job_url or job_text"` |
| `401`  | Invalid or missing token               |
| `404`  | `"Resume not found"`                   |

---

## 8. System

### `GET /api/health`

Health check endpoint.

**Success Response `200`:**

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "features": [
    "Job Scam Detection (Multi-Model ML)",
    "Explainable AI (Feature Analysis)",
    "Resume Parsing & Skill Extraction",
    "Resume-Job Matching with ATS Score",
    "Salary Anomaly Detection",
    "Company Reputation Scoring",
    "Community Scam Reporting",
    "PDF Report Generation",
    "Analytics Dashboard"
  ]
}
```

---

## Global Error Responses

All endpoints may return these standard error responses:

| Status | Meaning                                    | Example                                                                                           |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `401`  | Unauthorized — missing/invalid JWT token   | `{"detail": "Not authenticated"}`                                                                 |
| `422`  | Validation Error — malformed request body  | `{"detail": [{"loc": ["body", "text"], "msg": "field required", "type": "value_error.missing"}]}` |
| `500`  | Internal Server Error — unexpected failure | `{"detail": "Internal server error"}`                                                             |

---

## Endpoint Summary

| #   | Method | Endpoint                           | Auth | Description         |
| --- | ------ | ---------------------------------- | ---- | ------------------- |
| 1   | `POST` | `/api/auth/register`               | —    | Register new user   |
| 2   | `POST` | `/api/auth/login`                  | —    | Login & get token   |
| 3   | `GET`  | `/api/auth/me`                     | ✅   | Get user profile    |
| 4   | `POST` | `/api/scan/url`                    | ⚪   | Scan job URL        |
| 5   | `POST` | `/api/scan/text`                   | ⚪   | Analyze job text    |
| 6   | `GET`  | `/api/scan/history`                | ✅   | Get scan history    |
| 7   | `POST` | `/api/scan/detect-ai`              | —    | Detect AI text      |
| 8   | `POST` | `/api/resume/upload`               | ✅   | Upload resume       |
| 9   | `POST` | `/api/resume/match`                | ✅   | Match resume to job |
| 10  | `GET`  | `/api/resume/list`                 | ✅   | List resumes        |
| 11  | `GET`  | `/api/resume/match-history`        | ✅   | Match history       |
| 12  | `POST` | `/api/company/check`               | —    | Check company       |
| 13  | `POST` | `/api/reports/create`              | ✅   | Submit report       |
| 14  | `GET`  | `/api/reports`                     | —    | List reports        |
| 15  | `POST` | `/api/reports/{id}/vote`           | ✅   | Vote on report      |
| 16  | `GET`  | `/api/reports/blacklist`           | —    | Get blacklist       |
| 17  | `GET`  | `/api/analytics/overview`          | —    | Platform stats      |
| 18  | `GET`  | `/api/analytics/trends`            | —    | Scan trends         |
| 19  | `GET`  | `/api/analytics/top-reported`      | —    | Top reported        |
| 20  | `GET`  | `/api/analytics/models`            | —    | Model metrics       |
| 21  | `GET`  | `/api/analytics/recent-scans`      | —    | Recent scans        |
| 22  | `GET`  | `/api/analytics/report-categories` | —    | Report categories   |
| 23  | `POST` | `/api/reports/generate-scan-pdf`   | ⚪   | Generate scan PDF   |
| 24  | `POST` | `/api/reports/generate-match-pdf`  | ✅   | Generate match PDF  |
| 25  | `GET`  | `/api/health`                      | —    | Health check        |

> **Auth Legend:** ✅ = Required | ⚪ = Optional (enhances response) | — = Not needed
