import whois
import re
from datetime import datetime
from urllib.parse import urlparse
import socket
import ssl
from database import get_db
from ner_extractor import extract_entities


def normalize_domain(domain: str) -> str:
    """Normalize a domain-like input into a bare hostname."""
    if not domain:
        return ""

    value = domain.strip().lower()
    if not value:
        return ""

    if "://" not in value:
        value = f"https://{value}"

    parsed = urlparse(value)
    hostname = (parsed.hostname or "").strip().lower()
    if hostname.startswith("www."):
        hostname = hostname[4:]

    return hostname


def domain_dns_resolves(domain: str) -> bool:
    """Check if domain resolves in DNS."""
    if not domain:
        return False

    try:
        socket.getaddrinfo(domain, None)
        return True
    except Exception:
        return False


def domain_has_https(domain: str) -> bool:
    """Check if domain has an HTTPS endpoint with a valid handshake."""
    if not domain:
        return False

    context = ssl.create_default_context()

    try:
        with socket.create_connection((domain, 443), timeout=4) as sock:
            with context.wrap_socket(sock, server_hostname=domain):
                return True
    except Exception:
        return False


def get_domain_age(domain: str) -> dict:
    """Get domain age and registration info."""
    normalized = normalize_domain(domain)

    try:
        w = whois.whois(normalized)
        creation_date = w.creation_date
        if isinstance(creation_date, list):
            creation_date = creation_date[0]
        
        if creation_date:
            age_days = (datetime.now() - creation_date).days
            age_years = round(age_days / 365, 1)
            return {
                "domain": normalized,
                "creation_date": str(creation_date),
                "age_days": age_days,
                "age_years": age_years,
                "registrar": w.registrar if hasattr(w, 'registrar') else None,
                "status": "active",
                "dns_resolves": domain_dns_resolves(normalized),
                "https_reachable": domain_has_https(normalized),
                "verification_strength": "high",
            }
    except Exception:
        pass

    return {
        "domain": normalized,
        "creation_date": None,
        "age_days": 0,
        "age_years": 0,
        "registrar": None,
        "status": "unknown",
        "dns_resolves": domain_dns_resolves(normalized),
        "https_reachable": domain_has_https(normalized),
        "verification_strength": "low",
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

    reliability = {}

    # --- 1. Domain Analysis (25%) ---
    domain_score = 50  # default neutral
    normalized_domain = normalize_domain(domain) if domain else None
    if domain:
        domain_info = get_domain_age(normalized_domain)
        if domain_info["age_years"] > 5:
            domain_score = 90
            details.append({"type": "good", "message": f"Domain is {domain_info['age_years']} years old — well established"})
            reliability["domain"] = 1.0
        elif domain_info["age_years"] > 2:
            domain_score = 70
            details.append({"type": "good", "message": f"Domain is {domain_info['age_years']} years old"})
            reliability["domain"] = 0.95
        elif domain_info["age_years"] > 0:
            domain_score = 40
            details.append({"type": "warning", "message": f"Domain is only {domain_info['age_years']} years old — relatively new"})
            reliability["domain"] = 0.9
        elif domain_info["status"] == "unknown":
            if domain_info.get("dns_resolves") and domain_info.get("https_reachable"):
                domain_score = 55
                details.append({"type": "warning", "message": "WHOIS unavailable, but domain resolves and HTTPS is reachable"})
                reliability["domain"] = 0.75
            elif domain_info.get("dns_resolves"):
                domain_score = 45
                details.append({"type": "warning", "message": "WHOIS unavailable, but domain resolves in DNS"})
                reliability["domain"] = 0.65
            else:
                domain_score = 25
                details.append({"type": "danger", "message": "Could not verify domain registration and domain did not resolve"})
                reliability["domain"] = 0.45
    else:
        details.append({"type": "warning", "message": "No company domain provided"})
        reliability["domain"] = 0.35
    
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
            reliability["email"] = 1.0
        elif normalized_domain and email_domain == normalized_domain:
            email_score = 90
            details.append({"type": "good", "message": "Email matches company domain"})
            reliability["email"] = 1.0
        elif normalized_domain and email_domain.endswith(f".{normalized_domain}"):
            email_score = 80
            details.append({"type": "good", "message": "Email is from a company subdomain"})
            reliability["email"] = 0.95
        else:
            email_score = 60
            if normalized_domain:
                details.append({"type": "warning", "message": f"Email domain ({email_domain}) differs from company domain"})
            else:
                details.append({"type": "warning", "message": f"Email provided ({email_domain}) but no company domain to cross-verify"})
            reliability["email"] = 0.85
    else:
        details.append({"type": "warning", "message": "No contact email found"})
        reliability["email"] = 0.4
    
    scores["email"] = email_score

    # --- 3. Social Presence (20%) ---
    social = check_social_presence(company_name)
    social_score = min(max(social["score"], 0), 100)
    scores["social"] = social_score
    reliability["social"] = 0.7
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

    reliability["community"] = 1.0
    
    scores["community"] = community_score

    # --- Final Weighted Score (reliability-aware) ---
    base_weights = {
        "domain": 0.25,
        "email": 0.25,
        "social": 0.20,
        "community": 0.30,
    }

    weighted_components = {
        key: base_weights[key] * reliability.get(key, 0.0)
        for key in base_weights
    }
    total_weight = sum(weighted_components.values())

    if total_weight <= 0:
        normalized_weights = base_weights
    else:
        normalized_weights = {
            key: weighted_components[key] / total_weight
            for key in base_weights
        }

    trust_score = round(
        normalized_weights["domain"] * scores["domain"] +
        normalized_weights["email"] * scores["email"] +
        normalized_weights["social"] * scores["social"] +
        normalized_weights["community"] * scores["community"],
        1
    )

    confidence_score = round(
        sum(base_weights[key] * reliability.get(key, 0.0) for key in base_weights),
        2
    )
    if confidence_score >= 0.8:
        confidence = "high"
    elif confidence_score >= 0.55:
        confidence = "medium"
    else:
        confidence = "low"

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
        "confidence": confidence,
        "confidence_score": confidence_score,
        "signal_reliability": reliability,
        "effective_weights": {k: round(v, 3) for k, v in normalized_weights.items()},
        "details": details,
        "community_data": community,
    }
