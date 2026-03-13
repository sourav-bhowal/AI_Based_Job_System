import whois
import re
from datetime import datetime
from database import get_db
from ner_extractor import extract_entities


def get_domain_age(domain: str) -> dict:
    """Get domain age and registration info."""
    try:
        w = whois.whois(domain)
        creation_date = w.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
        
        if creation_date:
            age_days = (datetime.now() - creation_date).days
            age_years = round(age_days / 365, 1)
            return {
                "domain": domain,
                "creation_date": str(creation_date),
                "age_days": age_days,
                "age_years": age_years,
                "registrar": w.registrar if hasattr(w, 'registrar') else None,
                "status": "active",
            }
    except Exception:
        pass

    return {
        "domain": domain,
        "creation_date": None,
        "age_days": 0,
        "age_years": 0,
        "registrar": None,
        "status": "unknown",
    }


def check_social_presence(company_name: str) -> dict:
    """Check for company social media presence indicators."""
    # Simple heuristic checks (not actual API calls to avoid rate limits)
    score = 0
    signals = []
    
    # Check for common company name patterns that may indicate legitimacy
    name_lower = company_name.lower().strip()
    
    if len(name_lower) < 3:
        signals.append({"type": "warning", "message": "Company name is very short — suspicious"})
    else:
        score += 10
    
    # Check for suspicious patterns
    suspicious_patterns = [
        r"work\s*from\s*home",
        r"earn\s*money",
        r"quick\s*cash",
        r"guaranteed\s*income",
        r"no\s*experience\s*needed",
        r"unlimited\s*earning",
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, name_lower):
            signals.append({"type": "danger", "message": f"Suspicious phrase found in company name: '{pattern}'"})
            score -= 20
    
    # Legitimate company name patterns
    if any(suffix in name_lower for suffix in ["ltd", "pvt", "inc", "llc", "corp", "limited", "solutions", "technologies", "tech"]):
        score += 15
        signals.append({"type": "good", "message": "Company has a standard business suffix"})
    
    # NER validation — check if spaCy recognizes this as an organization
    try:
        ner_entities = extract_entities(company_name)
        if "ORG" in ner_entities and company_name.strip() in ner_entities["ORG"]:
            score += 10
            signals.append({"type": "good", "message": "Company name recognized as an organization by NER"})
    except Exception:
        pass  # NER validation is optional, don't fail the scoring

    return {
        "score": max(score, 0),
        "signals": signals,
    }


def get_community_reports(company_name: str) -> dict:
    """Check company against community scam reports database."""
    conn = get_db()
    
    # Check exact and fuzzy matches
    reports = conn.execute(
        """SELECT COUNT(*) as count, 
           SUM(upvotes) as total_upvotes,
           SUM(downvotes) as total_downvotes
           FROM scam_reports 
           WHERE LOWER(company_name) LIKE ?""",
        (f"%{company_name.lower()}%",)
    ).fetchone()
    
    # Check blacklist
    blacklisted = conn.execute(
        "SELECT * FROM company_blacklist WHERE LOWER(company_name) LIKE ?",
        (f"%{company_name.lower()}%",)
    ).fetchone()
    
    conn.close()
    
    report_count = reports["count"] if reports else 0
    
    return {
        "total_reports": report_count,
        "total_upvotes": reports["total_upvotes"] or 0 if reports else 0,
        "is_blacklisted": blacklisted is not None,
        "blacklist_trust_score": blacklisted["trust_score"] if blacklisted else None,
    }


def compute_company_trust_score(company_name: str, domain: str = None, email: str = None) -> dict:
    """
    Compute an overall company trust/reputation score.
    
    Combines multiple signals:
    - Domain age and registration (25%)
    - Email domain analysis (25%)
    - Social presence indicators (20%)
    - Community reports (30%)
    
    Returns score from 0 (scam) to 100 (trusted).
    """
    scores = {}
    details = []

    # --- 1. Domain Analysis (25%) ---
    domain_score = 50  # default neutral
    if domain:
        domain_info = get_domain_age(domain)
        if domain_info["age_years"] > 5:
            domain_score = 90
            details.append({"type": "good", "message": f"Domain is {domain_info['age_years']} years old — well established"})
        elif domain_info["age_years"] > 2:
            domain_score = 70
            details.append({"type": "good", "message": f"Domain is {domain_info['age_years']} years old"})
        elif domain_info["age_years"] > 0:
            domain_score = 40
            details.append({"type": "warning", "message": f"Domain is only {domain_info['age_years']} years old — relatively new"})
        elif domain_info["status"] == "unknown":
            domain_score = 20
            details.append({"type": "danger", "message": "Could not verify domain registration — suspicious"})
    else:
        details.append({"type": "warning", "message": "No company domain provided"})
    
    scores["domain"] = domain_score

    # --- 2. Email Analysis (25%) ---
    email_score = 50
    if email:
        email_domain = email.split("@")[-1].lower()
        free_providers = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", 
                         "protonmail.com", "mail.com", "yandex.com", "rediffmail.com"]
        
        if email_domain in free_providers:
            email_score = 20
            details.append({"type": "danger", "message": f"Using free email ({email_domain}) — legitimate companies use corporate email"})
        elif domain and email_domain == domain:
            email_score = 90
            details.append({"type": "good", "message": "Email matches company domain"})
        else:
            email_score = 60
            details.append({"type": "warning", "message": f"Email domain ({email_domain}) differs from company domain"})
    else:
        details.append({"type": "warning", "message": "No contact email found"})
    
    scores["email"] = email_score

    # --- 3. Social Presence (20%) ---
    social = check_social_presence(company_name)
    social_score = min(max(social["score"], 0), 100)
    scores["social"] = social_score
    details.extend(social["signals"])

    # --- 4. Community Reports (30%) ---
    community = get_community_reports(company_name)
    community_score = 80  # default no reports = slightly positive
    
    if community["is_blacklisted"]:
        community_score = 0
        details.append({"type": "danger", "message": "⚠️ This company is BLACKLISTED by the community"})
    elif community["total_reports"] > 5:
        community_score = 10
        details.append({"type": "danger", "message": f"Multiple scam reports ({community['total_reports']}) filed against this company"})
    elif community["total_reports"] > 0:
        community_score = 40
        details.append({"type": "warning", "message": f"{community['total_reports']} report(s) filed against this company"})
    else:
        details.append({"type": "good", "message": "No scam reports found for this company"})
    
    scores["community"] = community_score

    # --- Final Weighted Score ---
    trust_score = round(
        0.25 * scores["domain"] +
        0.25 * scores["email"] +
        0.20 * scores["social"] +
        0.30 * scores["community"],
        1
    )

    # Determine trust level
    if trust_score >= 70:
        trust_level = "trusted"
    elif trust_score >= 50:
        trust_level = "moderate"
    elif trust_score >= 30:
        trust_level = "suspicious"
    else:
        trust_level = "untrusted"

    return {
        "company_name": company_name,
        "trust_score": trust_score,
        "trust_level": trust_level,
        "breakdown": scores,
        "details": details,
        "community_data": community,
    }
