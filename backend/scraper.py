from bs4 import BeautifulSoup
import re
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from ner_extractor import extract_job_entities


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
    """Fetch page HTML using Playwright only."""
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=REQUEST_HEADERS["User-Agent"],
                locale="en-US",
                extra_http_headers={
                    "Accept": REQUEST_HEADERS["Accept"],
                    "Accept-Language": REQUEST_HEADERS["Accept-Language"],
                    "Cache-Control": REQUEST_HEADERS["Cache-Control"],
                    "Pragma": REQUEST_HEADERS["Pragma"],
                },
            )
            page = context.new_page()
            page.set_extra_http_headers({"User-Agent": REQUEST_HEADERS["User-Agent"]})
            page.goto(url, wait_until="networkidle", timeout=35000)
            try:
                page.wait_for_load_state("networkidle", timeout=10000)
            except PlaywrightTimeoutError:
                pass

            html = page.content()
            context.close()
            browser.close()

            if not html or not html.strip():
                raise RuntimeError("Playwright loaded the page but no HTML content was returned")
            return html
    except PlaywrightTimeoutError as exc:
        raise RuntimeError(f"Playwright timed out while loading the URL: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Unable to fetch the provided URL with Playwright: {exc}") from exc


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _extract_job_title(soup: BeautifulSoup) -> str | None:
    """Extract a best-effort job title from common page elements."""
    selectors = [
        "meta[property='og:title']",
        "meta[name='twitter:title']",
        "meta[name='title']",
        "h1",
        "title",
    ]

    for selector in selectors:
        node = soup.select_one(selector)
        if not node:
            continue
        value = node.get("content") if node.has_attr("content") else node.get_text(" ", strip=True)
        value = _normalize_text(value)
        if value:
            return value[:200]

    return None


def _extract_company_name(soup: BeautifulSoup, entities: dict) -> str | None:
    """Extract company name, preferring NER-detected organizations."""
    companies = entities.get("companies") or []
    if companies:
        best_company = _normalize_text(companies[0])
        if best_company:
            return best_company[:150]

    selectors = [
        "meta[property='og:site_name']",
        "meta[name='application-name']",
    ]

    for selector in selectors:
        node = soup.select_one(selector)
        if not node:
            continue
        value = _normalize_text(node.get("content", ""))
        if value:
            return value[:150]

    return None


def extract_job_description(soup: BeautifulSoup) -> str:
    """Extract full rendered body text from the page."""

    for script_like in soup(["script", "style", "noscript"]):
        script_like.decompose()

    body_text = _normalize_text(soup.get_text(separator=" "))
    if len(body_text) <= 120:
        return ""

    return body_text

# Scrape job details from a given URL
def scrape_job(url: str):
    url = validate_job_url(url)

    try:
        # Fetch rendered HTML with Playwright
        html = _fetch_url(url)

        # Parse the HTML content using BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")

        page_title = (soup.title.string if soup.title and soup.title.string else "").lower()
        html_lower = html.lower()
        html_len = len(html)
        text_preview = soup.get_text(strip=True)[:500]
        low_content = len(text_preview) < 200
        
        print(f"[SCRAPER DEBUG] Title: {page_title}")
        print(f"[SCRAPER DEBUG] HTML length: {html_len}")
        print(f"[SCRAPER DEBUG] Text preview length: {len(text_preview)}")
        
        suspicious_title = page_title.strip() in ["access denied", "just a moment"]
        has_block_keywords = any(term in html_lower for term in ["cf-browser-verification", "captcha", "cloudflare", "bot detection"])
        
        if suspicious_title or (has_block_keywords and html_len < 2000 and low_content):
            return {
                "success": False,
                "error": "SCRAPE_BLOCKED",
                "message": "Target website blocked automated scraping",
                "url": url,
                "domain": urlparse(url).netloc
            }

        # Extract the text content from the page
        text = extract_job_description(soup)
        if not text:
            raise RuntimeError("The provided page does not contain readable text content")
    except Exception as e:
        return {
            "success": False,
            "error": "SCRAPE_FAILED",
            "message": "Unable to fetch job automatically. Please paste job description manually."
        }

    # NER entity extraction
    try:
        entities = extract_job_entities(text)
    except Exception:
        entities = {"companies": [], "locations": [], "money": [], "dates": [], "persons": [], "entity_count": 0, "all_entities": {}, "scam_signals": []}

    job_title = _extract_job_title(soup)
    company_name = _extract_company_name(soup, entities)

    # Return a dictionary with the job description, salary, email, and NER entities
    return {
        "success": True,
        "description": text,
        "salary": extract_salary(text),
        "email": extract_email(text),
        "job_title": job_title,
        "company_name": company_name,
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