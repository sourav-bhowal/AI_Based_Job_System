"""
AI Job Analysis and Detection System — FastAPI Backend
=====================================

Full-featured backend with:
- Job analysis and detection with explainable AI
- Resume parsing and job matching
- Company reputation scoring
- Community scam reporting
- Analytics dashboard
- PDF report generation
- JWT authentication
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from typing import Optional
import json

# Local modules
from database import get_db
from auth import (
    register_user, login_user, get_current_user, get_optional_user
)
from scraper import scrape_job
from risk_engine import compute_risk
from model import predict_scam
from explainer import explain_prediction
from resume_parser import parse_resume
from resume_matcher_semantic import compute_match_score
# from resume_matcher import compute_match_score
from salary_predictor import predict_salary_anomaly
from company_scorer import compute_company_trust_score
from community import create_report, get_reports, vote_report, get_blacklist
from analytics import (
    get_overview_stats, get_scan_trends, get_top_reported_companies,
    get_model_comparison, get_recent_scans, get_report_categories
)
from report_generator import generate_scan_report, generate_resume_match_report
from ai_text_detector_bert import detect_ai_text
# from ai_text_detector import detect_ai_text

# ========== App Setup ==========
app = FastAPI(
    title="AI Job Analysis and Detection System",
    description="AI-powered job posting analysis with explainable ML, resume matching, and community reporting",
    version="2.0.0",
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "Authorization"],
)


# ========== Pydantic Models ==========

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class JobRequest(BaseModel):
    url: str

class TextAnalyzeRequest(BaseModel):
    text: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None

class ReportRequest(BaseModel):
    company_name: str
    description: str
    job_url: Optional[str] = None
    job_title: Optional[str] = None
    evidence: Optional[str] = None
    category: Optional[str] = "other"

class VoteRequest(BaseModel):
    vote_type: str  # "up" or "down"

class CompanyCheckRequest(BaseModel):
    company_name: str
    domain: Optional[str] = None
    email: Optional[EmailStr] = None

class MatchJobRequest(BaseModel):
    resume_id: int
    job_url: Optional[str] = None
    job_text: Optional[str] = None


# ========== Helper ==========

def risk_level(score):
    if score < 30:
        return "Safe"
    elif score < 60:
        return "Medium Risk"
    else:
        return "High Risk"


# ========== Auth Routes ==========

@app.post("/api/auth/register", tags=["Authentication"])
def api_register(req: RegisterRequest):
    """Register a new user account."""
    return register_user(req.username, req.email, req.password, req.full_name)


@app.post("/api/auth/login", tags=["Authentication"])
def api_login(req: LoginRequest):
    """Login and get access token."""
    return login_user(req.username, req.password)


@app.get("/api/auth/me", tags=["Authentication"])
def api_me(user=Depends(get_current_user)):
    """Get current user profile."""
    return {
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "full_name": user["full_name"],
        "created_at": user["created_at"],
        "is_admin": user["is_admin"],
    }


# ========== Job Scanning Routes ==========

@app.post("/api/scan/url", tags=["Job Scanning"])
def scan_job_url(req: JobRequest, user=Depends(get_optional_user)):
    """Scan a job posting URL for scam indicators."""
    try:
        # Scrape job details
        job = scrape_job(req.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    description = (job.get("description") or "").strip()
    if not description:
        raise HTTPException(status_code=422, detail="No readable job description found at the provided URL")

    salary = job.get("salary")
    email = job.get("email")
    job_title = job.get("job_title")
    company_name = job.get("company_name")

    try:
        # Compute risk
        score = compute_risk(description, salary, email)
        level = risk_level(score)

        # Get explanation
        explanation = explain_prediction(description)

        # Salary analysis
        salary_analysis = predict_salary_anomaly(salary, description)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Job analysis failed: {exc}") from exc

    # Save to history if user is logged in
    if user:
        conn = get_db()
        conn.execute(
            """INSERT INTO scan_history 
                             (user_id, url, job_title, company_name, risk_score, risk_level, nlp_score, salary_score, domain_score, 
                                description, salary, email_found)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                            (user["id"], req.url, job_title, company_name, score, level,
             explanation.get("scam_probability", 0),
             salary_analysis.get("anomaly_score", 0) * 100,
             0,  # domain score from risk engine
               description, salary, email)
        )
        conn.commit()
        conn.close()

    return {
        "risk_score": score,
        "risk_level": level,
        "job_details": job,
        "explanation": explanation,
        "salary_analysis": salary_analysis,
    }


@app.post("/api/scan/text", tags=["Job Scanning"])
def scan_job_text(req: TextAnalyzeRequest, user=Depends(get_optional_user)):
    """Analyze job posting text directly (no URL needed)."""
    # NLP prediction
    scam_prob = predict_scam(req.text)
    explanation = explain_prediction(req.text)

    # Salary analysis (extract from text)
    from scraper import extract_salary
    salary = extract_salary(req.text)
    salary_analysis = predict_salary_anomaly(salary, req.text)

    # Simple risk score
    score = round(scam_prob * 100, 2)
    level = risk_level(score)

    return {
        "risk_score": score,
        "risk_level": level,
        "explanation": explanation,
        "salary_analysis": salary_analysis,
    }


@app.get("/api/scan/history", tags=["Job Scanning"])
def get_scan_history(user=Depends(get_current_user)):
    """Get scan history for the logged-in user."""
    conn = get_db()
    results = conn.execute(
        "SELECT * FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 50",
        (user["id"],)
    ).fetchall()
    conn.close()
    return {"history": [dict(r) for r in results]}


@app.post("/api/scan/detect-ai", tags=["Job Scanning"])
def detect_ai_generated(req: TextAnalyzeRequest):
    """Detect if job posting text is AI-generated (e.g., written by ChatGPT)."""
    result = detect_ai_text(req.text)
    return result


# ========== Resume Routes ==========

@app.post("/api/resume/upload", tags=["Resume Analysis"])
async def upload_resume(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Upload and parse a resume (PDF, DOCX, or TXT)."""
    # Validate file type
    ext = file.filename.lower().split(".")[-1]
    if ext not in ["pdf", "docx", "doc", "txt"]:
        raise HTTPException(400, "Unsupported file type. Upload PDF, DOCX, or TXT.")

    # Read file
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(400, "File too large. Max 5MB.")

    # Parse resume
    resume_data = parse_resume(contents, file.filename)

    # Save to database
    conn = get_db()
    cursor = conn.execute(
        """INSERT INTO resumes (user_id, filename, extracted_text, skills, experience, education)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user["id"], file.filename, resume_data["text"][:5000],
         json.dumps(resume_data["skills"]),
         str(resume_data["experience_years"]),
         json.dumps(resume_data["education"]))
    )
    resume_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "resume_id": resume_id,
        "filename": file.filename,
        "skills": resume_data["skills"],
        "total_skills_found": resume_data["total_skills_found"],
        "education": resume_data["education"],
        "experience_years": resume_data["experience_years"],
        "contact": resume_data["contact"],
        "word_count": resume_data["word_count"],
    }


@app.post("/api/resume/match", tags=["Resume Analysis"])
def match_resume_to_job(req: MatchJobRequest, user=Depends(get_current_user)):
    """Match a resume against a job posting and get detailed analysis."""
    # Get resume from database
    conn = get_db()
    resume_row = conn.execute(
        "SELECT * FROM resumes WHERE id = ? AND user_id = ?",
        (req.resume_id, user["id"])
    ).fetchone()
    conn.close()

    if not resume_row:
        raise HTTPException(404, "Resume not found")

    resume_data = {
        "text": resume_row["extracted_text"],
        "skills": json.loads(resume_row["skills"]) if resume_row["skills"] else {},
        "education": json.loads(resume_row["education"]) if resume_row["education"] else [],
        "experience_years": int(resume_row["experience"]) if resume_row["experience"] else 0,
        "total_skills_found": 0,
        "word_count": len(resume_row["extracted_text"].split()) if resume_row["extracted_text"] else 0,
    }
    resume_data["total_skills_found"] = sum(len(v) for v in resume_data["skills"].values())

    # Get job text
    if req.job_url:
        job = scrape_job(req.job_url)
        job_text = job["description"]
    elif req.job_text:
        job_text = req.job_text
    else:
        raise HTTPException(400, "Provide either job_url or job_text")

    # Compute match
    match_result = compute_match_score(resume_data, job_text)

    # Save to history
    conn = get_db()
    conn.execute(
        """INSERT INTO match_history 
           (user_id, resume_id, job_url, match_score, strengths, weaknesses, recommendations)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user["id"], req.resume_id, req.job_url,
         match_result["match_score"],
         json.dumps(match_result["strengths"]),
         json.dumps(match_result["weaknesses"]),
         json.dumps(match_result["recommendations"]))
    )
    conn.commit()
    conn.close()

    return match_result


@app.get("/api/resume/list", tags=["Resume Analysis"])
def list_resumes(user=Depends(get_current_user)):
    """List all uploaded resumes for the user."""
    conn = get_db()
    results = conn.execute(
        "SELECT id, filename, skills, experience, education, uploaded_at FROM resumes WHERE user_id = ? ORDER BY uploaded_at DESC",
        (user["id"],)
    ).fetchall()
    conn.close()

    resumes = []
    for r in results:
        resumes.append({
            "id": r["id"],
            "filename": r["filename"],
            "skills": json.loads(r["skills"]) if r["skills"] else {},
            "experience": r["experience"],
            "education": json.loads(r["education"]) if r["education"] else [],
            "uploaded_at": r["uploaded_at"],
        })

    return {"resumes": resumes}


@app.get("/api/resume/match-history", tags=["Resume Analysis"])
def get_match_history(user=Depends(get_current_user)):
    """Get resume-job match history."""
    conn = get_db()
    results = conn.execute(
        """SELECT mh.*, r.filename 
           FROM match_history mh
           JOIN resumes r ON mh.resume_id = r.id
           WHERE mh.user_id = ?
           ORDER BY mh.matched_at DESC LIMIT 50""",
        (user["id"],)
    ).fetchall()
    conn.close()
    return {"history": [dict(r) for r in results]}


# ========== Company Reputation Routes ==========

@app.post("/api/company/check", tags=["Company Reputation"])
def check_company(req: CompanyCheckRequest):
    """Check company reputation and trust score."""
    return compute_company_trust_score(req.company_name, req.domain, req.email)


# ========== Community Reporting Routes ==========

@app.post("/api/reports/create", tags=["Community Reports"])
def api_create_report(req: ReportRequest, user=Depends(get_current_user)):
    """Submit a scam report."""
    return create_report(
        user_id=user["id"],
        company_name=req.company_name,
        description=req.description,
        job_url=req.job_url,
        job_title=req.job_title,
        evidence=req.evidence,
        category=req.category,
    )


@app.get("/api/reports", tags=["Community Reports"])
def api_get_reports(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
):
    """Get community scam reports."""
    return get_reports(page=page, per_page=per_page, category=category)


@app.post("/api/reports/{report_id}/vote", tags=["Community Reports"])
def api_vote_report(report_id: int, req: VoteRequest, user=Depends(get_current_user)):
    """Vote on a scam report."""
    return vote_report(report_id, user["id"], req.vote_type)


@app.get("/api/reports/blacklist", tags=["Community Reports"])
def api_blacklist():
    """Get the company blacklist."""
    return {"blacklist": get_blacklist()}


# ========== Analytics Routes ==========

@app.get("/api/analytics/overview", tags=["Analytics"])
def api_overview():
    """Get platform overview statistics."""
    return get_overview_stats()


@app.get("/api/analytics/trends", tags=["Analytics"])
def api_trends(days: int = Query(30, ge=1, le=365)):
    """Get scan trends over time."""
    return {"trends": get_scan_trends(days)}


@app.get("/api/analytics/top-reported", tags=["Analytics"])
def api_top_reported(limit: int = Query(10, ge=1, le=50)):
    """Get most reported companies."""
    return {"companies": get_top_reported_companies(limit)}


@app.get("/api/analytics/models", tags=["Analytics"])
def api_model_comparison():
    """Get ML model comparison metrics."""
    return get_model_comparison()


@app.get("/api/analytics/recent-scans", tags=["Analytics"])
def api_recent_scans(limit: int = Query(20, ge=1, le=100)):
    """Get recent scan activity."""
    return {"scans": get_recent_scans(limit)}


@app.get("/api/analytics/report-categories", tags=["Analytics"])
def api_report_categories():
    """Get scam report distribution by category."""
    return {"categories": get_report_categories()}


# ========== PDF Report Routes ==========

@app.post("/api/reports/generate-scan-pdf", tags=["PDF Reports"])
def api_generate_scan_pdf(req: JobRequest, user=Depends(get_optional_user)):
    """Generate a PDF report for a job scan."""
    # Scan the job
    job = scrape_job(req.url)
    score = compute_risk(job["description"], job["salary"], job["email"])
    level = risk_level(score)
    explanation = explain_prediction(job["description"])
    salary_analysis = predict_salary_anomaly(job["salary"], job["description"])

    scan_data = {
        "url": req.url,
        "risk_score": score,
        "risk_level": level,
        "nlp_score": explanation.get("scam_probability", 0),
        "salary_score": salary_analysis.get("anomaly_score", 0) * 100,
        "domain_score": 0,
    }

    filepath = generate_scan_report(scan_data, explanation, salary_analysis)
    return FileResponse(filepath, media_type="application/pdf", filename="scan_report.pdf")


@app.post("/api/reports/generate-match-pdf", tags=["PDF Reports"])
def api_generate_match_pdf(req: MatchJobRequest, user=Depends(get_current_user)):
    """Generate a PDF report for resume-job match."""
    # Get resume
    conn = get_db()
    resume_row = conn.execute(
        "SELECT * FROM resumes WHERE id = ? AND user_id = ?",
        (req.resume_id, user["id"])
    ).fetchone()
    conn.close()

    if not resume_row:
        raise HTTPException(404, "Resume not found")

    resume_data = {
        "text": resume_row["extracted_text"],
        "skills": json.loads(resume_row["skills"]) if resume_row["skills"] else {},
        "education": json.loads(resume_row["education"]) if resume_row["education"] else [],
        "experience_years": int(resume_row["experience"]) if resume_row["experience"] else 0,
        "total_skills_found": 0,
        "word_count": len(resume_row["extracted_text"].split()) if resume_row["extracted_text"] else 0,
    }
    resume_data["total_skills_found"] = sum(len(v) for v in resume_data["skills"].values())

    if req.job_url:
        job = scrape_job(req.job_url)
        job_text = job["description"]
    elif req.job_text:
        job_text = req.job_text
    else:
        raise HTTPException(400, "Provide either job_url or job_text")

    match_result = compute_match_score(resume_data, job_text)
    filepath = generate_resume_match_report(resume_data, match_result, req.job_url)
    return FileResponse(filepath, media_type="application/pdf", filename="match_report.pdf")


# ========== Health Check ==========

@app.get("/api/health", tags=["System"])
def health_check():
    return {
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
            "Analytics Dashboard",
        ]
    }