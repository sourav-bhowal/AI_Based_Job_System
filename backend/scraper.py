import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse
from ner_extractor import extract_job_entities

try:
    import cloudscraper
except ImportError:
    cloudscraper = None


REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Upgrade-Insecure-Requests": "1",
}


def validate_job_url(url: str) -> str:
    """Validate and normalize a job URL."""
    normalized_url = (url or "").strip()
    if not normalized_url:
        raise ValueError("Job URL is required")

    parsed = urlparse(normalized_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Provide a valid job URL starting with http:// or https://")

    return normalized_url


def _fetch_url(url: str):
    """Fetch a URL using progressively stronger scraping strategies."""
    errors = []

    try:
        response = requests.get(url, timeout=15, headers=REQUEST_HEADERS, allow_redirects=True)
        response.raise_for_status()
        return response
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        errors.append(f"requests HTTP {status_code}" if status_code else "requests HTTP error")
    except requests.RequestException:
        errors.append("requests network error")

    if cloudscraper is not None:
        try:
            scraper = cloudscraper.create_scraper(
                browser={"browser": "chrome", "platform": "windows", "mobile": False}
            )
            response = scraper.get(url, timeout=20, headers=REQUEST_HEADERS, allow_redirects=True)
            response.raise_for_status()
            return response
        except requests.HTTPError as exc:
            status_code = exc.response.status_code if exc.response is not None else None
            errors.append(f"cloudscraper HTTP {status_code}" if status_code else "cloudscraper HTTP error")
        except requests.RequestException:
            errors.append("cloudscraper network error")

    error_summary = ", ".join(errors) if errors else "unknown fetch error"
    if "403" in error_summary:
        raise RuntimeError(
            "The target site blocked automated access (403 Forbidden). "
            "Try /api/scan/text with the job description text for this listing."
        )

    raise RuntimeError(f"Unable to fetch the provided URL: {error_summary}")

# Scrape job details from a given URL
def scrape_job(url: str):
    url = validate_job_url(url)

    # Make a GET request to the URL
    res = _fetch_url(url)

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(res.text, "html.parser")

    # Extract the text content from the page
    text = re.sub(r"\s+", " ", soup.get_text(separator=" ")).strip()
    if not text:
        raise RuntimeError("The provided page does not contain readable text content")

    # NER entity extraction
    try:
        entities = extract_job_entities(text[:5000])
    except Exception:
        entities = {"companies": [], "locations": [], "money": [], "dates": [], "persons": [], "entity_count": 0, "all_entities": {}, "scam_signals": []}

    # Return a dictionary with the job description, salary, email, and NER entities
    return {
        "description": text[:5000],  # truncate
        "salary": extract_salary(text),
        "email": extract_email(text),
        "entities": entities,
    }

# Helper function to extract salary from text
def extract_salary(text):
    """Extract salary information from text, supporting $ and ₹ formats."""
    
    # Try Indian formats first: "₹50,000", "Rs. 50000", "INR 50,000", "5 LPA", "5-10 Lakhs"
    # LPA (Lakhs Per Annum) pattern
    lpa_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*(?:LPA|Lakhs?(?:\s*per\s*annum)?)', text, re.IGNORECASE)
    if lpa_match:
        if lpa_match.group(2):
            return f"₹{lpa_match.group(1)}-{lpa_match.group(2)} LPA"
        return f"₹{lpa_match.group(1)} LPA"
    
    # ₹ or Rs or INR salary ranges: "₹50,000-₹1,00,000" or "Rs 50000 - 100000"
    inr_range = re.search(r'(?:₹|Rs\.?|INR)\s*(\d{1,3}(?:,\d{2,3})*|\d+)\s*[-\u2013to]+\s*(?:₹|Rs\.?|INR)?\s*(\d{1,3}(?:,\d{2,3})*|\d+)', text, re.IGNORECASE)
    if inr_range:
        return f"₹{inr_range.group(1)}-₹{inr_range.group(2)}"
    
    # Single ₹ value: "₹50,000" or "Rs. 50000" or "INR 50000"
    inr_single = re.search(r'(?:₹|Rs\.?|INR)\s*(\d{1,3}(?:,\d{2,3})*|\d{4,})', text, re.IGNORECASE)
    if inr_single:
        return f"₹{inr_single.group(1)}"
    
    # USD salary ranges: "$55,000-$100,000"
    usd_range = re.search(r'\$\s*(\d{1,3}(?:,\d{3})*|\d+)\s*[-\u2013]\s*\$?\s*(\d{1,3}(?:,\d{3})*|\d+)', text)
    if usd_range:
        return f"${usd_range.group(1)}-${usd_range.group(2)}"
    
    # Single USD value
    usd_single = re.search(r'\$\s*(\d{1,3}(?:,\d{3})*|\d{4,})', text)
    if usd_single:
        return usd_single.group(0)
    
    # Try "per week/month/year" patterns
    period_match = re.search(r'(\d{1,3}(?:,\d{3})*|\d+)\s*(?:per|/)\s*(?:week|month|year|hr|hour|annum)', text, re.IGNORECASE)
    if period_match:
        return period_match.group(0)
    
    return None

# Helper function to extract email from text
def extract_email(text):
    """Extract email address from text."""
    # More robust email pattern
    match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    return match.group() if match else None