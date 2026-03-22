import whois
import re
from datetime import datetime
from urllib.parse import urlparse
import socket
import ssl


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
        return {"score": 50, "confidence": 0.3, "reason": "No email provided"}

    email_domain = email.split("@")[-1].lower()

    free_providers = {
        "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
        "protonmail.com", "rediffmail.com"
    }

    if email_domain in free_providers:
        return {
            "score": 40,  # not too harsh
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
# SOCIAL / NAME ANALYSIS
# ---------------------------
def analyze_company_name(name: str) -> dict:
    score = 50
    signals = []

    name_lower = name.lower().strip()

    suspicious_patterns = [
        r"earn\s*money",
        r"quick\s*cash",
        r"no\s*experience",
        r"guaranteed\s*income",
    ]

    for p in suspicious_patterns:
        if re.search(p, name_lower):
            score -= 30
            signals.append("Suspicious phrase detected")

    if len(name_lower) > 3:
        score += 10

    # common legit suffix
    if any(x in name_lower for x in ["ltd", "inc", "corp", "tech", "solutions"]):
        score += 10

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

    # --- WEIGHTING (reliability-based) ---
    components = [
        ("domain", domain_result),
        ("email", email_result),
        ("name", name_result),
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
        }
    }