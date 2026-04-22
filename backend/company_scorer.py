import whois
import re
from datetime import datetime
from urllib.parse import urlparse
import socket
import ssl
from database import get_db


# ---------------------------
# NORMALIZATION
# ---------------------------
def normalize_domain(domain: str) -> str:
    if not domain:
        return ""

    value = domain.strip().lower()

    if "://" not in value:
        value = f"https://{value}"

    parsed = urlparse(value)
    hostname = parsed.hostname or ""

    return hostname.replace("www.", "")


# ---------------------------
# DOMAIN SIGNALS
# ---------------------------
def domain_dns_resolves(domain: str) -> bool:
    try:
        socket.getaddrinfo(domain, None)
        return True
    except:
        return False


def domain_has_https(domain: str) -> bool:
    context = ssl.create_default_context()
    try:
        with socket.create_connection((domain, 443), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=domain):
                return True
    except:
        return False


def get_domain_info(domain: str) -> dict:
    domain = normalize_domain(domain)

    result = {
        "domain": domain,
        "age_days": None,
        "age_years": None,
        "registrar": None,
        "dns_resolves": domain_dns_resolves(domain),
        "https": domain_has_https(domain),
        "whois_available": False,
    }

    # WHOIS (best effort)
    try:
        w = whois.whois(domain)
        creation_date = w.creation_date

        if isinstance(creation_date, list):
            creation_date = creation_date[0]

        if creation_date:
            age_days = (datetime.now() - creation_date).days
            result.update({
                "age_days": age_days,
                "age_years": round(age_days / 365, 2),
                "registrar": getattr(w, "registrar", None),
                "whois_available": True,
            })
    except:
        pass

    return result


# ---------------------------
# EMAIL ANALYSIS
# ---------------------------
def analyze_email(email: str, domain: str | None) -> dict:
    if not email:
        # No email should be truly neutral — don't penalize for missing info
        return {"score": 50, "confidence": 0.1, "reason": "No email provided"}

    email_domain = email.split("@")[-1].lower()

    free_providers = {
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
        "protonmail.com", "rediffmail.com"
    }

    if email_domain in free_providers:
        return {
            "score": 40,
            "confidence": 1.0,
            "reason": "Free email provider"
        }

    if domain and email_domain == domain:
        return {
            "score": 90,
            "confidence": 1.0,
            "reason": "Matches company domain"
        }

    if domain and email_domain.endswith("." + domain):
        return {
            "score": 80,
            "confidence": 0.9,
            "reason": "Subdomain email"
        }

    return {
        "score": 60,
        "confidence": 0.8,
        "reason": "Different domain"
    }


# ---------------------------
# WELL-KNOWN COMPANIES
# ---------------------------
WELL_KNOWN_COMPANIES = {
    "google", "microsoft", "apple", "amazon", "meta", "facebook", "netflix",
    "tesla", "adobe", "ibm", "intel", "nvidia", "oracle", "salesforce",
    "uber", "airbnb", "spotify", "twitter", "linkedin", "github",
    "samsung", "sony", "toshiba", "cisco", "dell", "hp", "lenovo",
    "tcs", "infosys", "wipro", "hcl", "cognizant", "accenture", "deloitte",
    "kpmg", "ey", "pwc", "mckinsey", "bain", "bcg",
    "jpmorgan", "goldman sachs", "morgan stanley", "barclays", "hsbc",
    "walmart", "target", "coca cola", "pepsi", "nike", "adidas",
    "reliance", "tata", "mahindra", "bajaj", "hdfc", "icici", "sbi",
    "flipkart", "paytm", "swiggy", "zomato", "ola", "razorpay", "zerodha",
    "stripe", "shopify", "atlassian", "slack", "zoom", "snowflake",
    "databricks", "cloudflare", "twilio", "paypal", "square", "block",
}


# ---------------------------
# SOCIAL / NAME ANALYSIS
# ---------------------------
def analyze_company_name(name: str) -> dict:
    score = 50
    signals = []

    name_lower = name.lower().strip()

    # Check if it's a well-known company first
    if name_lower in WELL_KNOWN_COMPANIES or any(wk in name_lower for wk in WELL_KNOWN_COMPANIES):
        return {
            "score": 95,
            "confidence": 1.0,
            "signals": ["Well-known established company"]
        }

    suspicious_patterns = [
        r"earn\s*money",
        r"quick\s*cash",
        r"no\s*experience",
        r"guaranteed\s*income",
        r"work\s*from\s*home",
        r"data\s*entry",
    ]

    for p in suspicious_patterns:
        if re.search(p, name_lower):
            score -= 30
            signals.append("Suspicious phrase detected")

    if len(name_lower) > 3:
        score += 10

    # Common legit suffixes
    legit_suffixes = ["ltd", "inc", "corp", "tech", "solutions", "pvt", "llc",
                      "limited", "technologies", "systems", "group", "consulting"]
    if any(x in name_lower for x in legit_suffixes):
        score += 15
        signals.append("Has corporate suffix")

    # Overly short or generic names are suspicious
    if len(name_lower) <= 2:
        score -= 15
        signals.append("Very short company name")

    return {
        "score": max(0, min(score, 100)),
        "confidence": 0.7,
        "signals": signals
    }


# ---------------------------
# DOMAIN SCORING (IMPROVED)
# ---------------------------
def score_domain(info: dict) -> dict:
    score = 50
    confidence = 0.5
    reasons = []

    if info["dns_resolves"]:
        score += 10
        reasons.append("DNS resolves")

    if info["https"]:
        score += 10
        reasons.append("HTTPS available")

    if info["whois_available"]:
        confidence = 0.9

        if info["age_years"] > 5:
            score += 30
            reasons.append("Old domain")
        elif info["age_years"] > 2:
            score += 20
        elif info["age_years"] > 0:
            score -= 10
            reasons.append("New domain")

    else:
        # fallback logic (IMPORTANT FIX)
        if info["dns_resolves"] and info["https"]:
            score += 5
            confidence = 0.7

    return {
        "score": max(0, min(score, 100)),
        "confidence": confidence,
        "reasons": reasons
    }


# ---------------------------
# COMMUNITY DATA LOOKUP
# ---------------------------
def get_community_reports(company_name: str) -> dict:
    """Fetch community scam report count and details for a company."""
    conn = get_db()
    count_row = conn.execute(
        "SELECT COUNT(*) AS cnt FROM scam_reports WHERE LOWER(company_name) = ?",
        (company_name.lower(),)
    ).fetchone()
    report_count = list(count_row.values())[0] if count_row else 0

    # Get recent reports (up to 5) for context
    recent = conn.execute(
        """SELECT category, description, upvotes, downvotes, created_at 
           FROM scam_reports WHERE LOWER(company_name) = ?
           ORDER BY created_at DESC LIMIT 5""",
        (company_name.lower(),)
    ).fetchall()
    conn.close()

    return {
        "report_count": report_count,
        "recent_reports": [dict(r) for r in recent],
    }


def check_company_blacklist(company_name: str) -> dict | None:
    """Check if a company is on the blacklist."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM company_blacklist WHERE LOWER(company_name) = ?",
        (company_name.lower(),)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def compute_community_score(company_name: str) -> dict:
    """Compute a community trust score based on reports and blacklist status."""
    reports = get_community_reports(company_name)
    blacklist_entry = check_company_blacklist(company_name)

    score = 70  # neutral starting point
    confidence = 0.5
    reasons = []

    report_count = reports["report_count"]

    if report_count == 0:
        score = 70
        reasons.append("No community reports")
        confidence = 0.2  # Very low weight — absence of reports shouldn't strongly influence score
    elif report_count < 3:
        score = 50
        reasons.append(f"{report_count} community report(s)")
        confidence = 0.7
    else:
        score = max(10, 50 - (report_count * 8))
        reasons.append(f"{report_count} community reports")
        confidence = 0.9

    if blacklist_entry:
        score = min(score, int(blacklist_entry.get("trust_score", 20)))
        reasons.append("Company is blacklisted")
        confidence = 1.0

    return {
        "score": max(0, min(score, 100)),
        "confidence": confidence,
        "reasons": reasons,
        "report_count": report_count,
        "is_blacklisted": blacklist_entry is not None,
        "blacklist_entry": blacklist_entry,
    }


# ---------------------------
# FINAL TRUST SCORE
# ---------------------------
def compute_company_trust_score(company_name: str, domain: str = None, email: str = None) -> dict:

    # --- DOMAIN ---
    domain_info = get_domain_info(domain) if domain else None
    domain_result = score_domain(domain_info) if domain else {
        "score": 50, "confidence": 0.3, "reasons": ["No domain"]
    }

    # --- EMAIL ---
    email_result = analyze_email(email, domain_info["domain"] if domain_info else None)

    # --- NAME ---
    name_result = analyze_company_name(company_name)

    # --- COMMUNITY ---
    community_result = compute_community_score(company_name)

    # --- WEIGHTING (reliability-based) ---
    components = [
        ("domain", domain_result),
        ("email", email_result),
        ("name", name_result),
        ("community", community_result),
    ]

    total_weight = 0
    weighted_score = 0

    for _, comp in components:
        weight = comp["confidence"]
        weighted_score += comp["score"] * weight
        total_weight += weight

    final_score = round(weighted_score / total_weight, 1) if total_weight else 50

    # --- LABEL ---
    if final_score >= 75:
        level = "trusted"
    elif final_score >= 55:
        level = "moderate"
    elif final_score >= 35:
        level = "suspicious"
    else:
        level = "untrusted"

    return {
        "company": company_name,
        "trust_score": final_score,
        "trust_level": level,
        "confidence": round(total_weight / len(components), 2),
        "details": {
            "domain": domain_result,
            "email": email_result,
            "name": name_result,
            "community": community_result,
        },
        "community_data": {
            "report_count": community_result["report_count"],
            "is_blacklisted": community_result["is_blacklisted"],
            "blacklist_entry": community_result["blacklist_entry"],
        },
    }