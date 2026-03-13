"""
Named Entity Recognition (NER) Module
======================================

Uses spaCy NLP pipeline to extract named entities from text.
Provides specialized extraction for job postings and resumes.

Entity types used:
- PERSON   — Person names
- ORG      — Organizations, companies
- GPE      — Geopolitical entities (countries, cities, states)
- LOC      — Non-GPE locations (mountains, rivers, regions)
- MONEY    — Monetary values
- DATE     — Dates, periods
- PRODUCT  — Products, technologies
- NORP     — Nationalities, religious/political groups
"""

import spacy
import re
from typing import Optional

# Lazy-loaded spaCy model
_nlp = None


def _get_nlp():
    """Lazy-load spaCy model for performance."""
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            raise RuntimeError(
                "spaCy model 'en_core_web_sm' not found. Install it with:\n"
                "  python -m spacy download en_core_web_sm"
            )
    return _nlp


def extract_entities(text: str, max_length: int = 100000) -> dict:
    """
    Extract all named entities from text, grouped by label.

    Args:
        text: Input text to analyze.
        max_length: Maximum text length to process (truncated if longer).

    Returns:
        dict with entity labels as keys and lists of unique entity strings as values.
        Example: {"ORG": ["Google", "Microsoft"], "GPE": ["New York", "London"]}
    """
    nlp = _get_nlp()
    doc = nlp(text[:max_length])

    entities = {}
    for ent in doc.ents:
        label = ent.label_
        value = ent.text.strip()
        if not value:
            continue
        if label not in entities:
            entities[label] = []
        if value not in entities[label]:
            entities[label].append(value)

    return entities


def extract_job_entities(text: str) -> dict:
    """
    Extract entities from a job posting with scam-signal analysis.

    Returns:
        dict with:
        - companies: list of ORG entities (potential company names)
        - locations: list of GPE/LOC entities (job locations)
        - money: list of MONEY entities (salary mentions)
        - dates: list of DATE entities
        - persons: list of PERSON entities
        - entity_count: total entities found
        - scam_signals: list of entity-based red flags
    """
    entities = extract_entities(text)

    companies = entities.get("ORG", [])
    locations = entities.get("GPE", []) + entities.get("LOC", [])
    money = entities.get("MONEY", [])
    dates = entities.get("DATE", [])
    persons = entities.get("PERSON", [])

    # De-duplicate locations
    locations = list(dict.fromkeys(locations))

    total_entities = sum(len(v) for v in entities.values())

    # --- Scam Signal Analysis ---
    scam_signals = []

    # No organization found — suspicious for a job posting
    if not companies:
        scam_signals.append({
            "signal": "no_company_entity",
            "severity": "medium",
            "message": "No company/organization name detected by NER — legitimate postings typically mention the hiring company"
        })

    # No location found
    if not locations:
        scam_signals.append({
            "signal": "no_location_entity",
            "severity": "low",
            "message": "No specific location detected — vague location details can be a red flag"
        })

    # Too many person names in a job posting (unusual)
    if len(persons) > 5:
        scam_signals.append({
            "signal": "excessive_person_names",
            "severity": "low",
            "message": f"{len(persons)} person names detected — unusual for a standard job posting"
        })

    # High monetary values (potential "guaranteed income" scam)
    for m in money:
        cleaned = re.sub(r'[,$₹]', '', m)
        numbers = re.findall(r'\d+', cleaned)
        for num_str in numbers:
            num = int(num_str)
            if num > 500000:
                scam_signals.append({
                    "signal": "high_money_entity",
                    "severity": "medium",
                    "message": f"Very high monetary value detected: '{m}' — verify this is a realistic salary"
                })
                break

    return {
        "companies": companies,
        "locations": locations,
        "money": money,
        "dates": dates,
        "persons": persons,
        "entity_count": total_entities,
        "all_entities": entities,
        "scam_signals": scam_signals,
    }


def extract_resume_entities(text: str) -> dict:
    """
    Extract entities from a resume with structured output.

    Returns:
        dict with:
        - name: detected person name (first PERSON entity, likely the candidate)
        - organizations: list of ORG entities (employers, universities)
        - locations: list of GPE/LOC entities
        - dates: list of DATE entities (employment periods, graduation dates)
        - skills_from_ner: list of PRODUCT entities (sometimes captures tech names)
        - entity_count: total entities found
    """
    entities = extract_entities(text)

    persons = entities.get("PERSON", [])
    organizations = entities.get("ORG", [])
    locations = entities.get("GPE", []) + entities.get("LOC", [])
    dates = entities.get("DATE", [])
    products = entities.get("PRODUCT", [])

    # De-duplicate locations
    locations = list(dict.fromkeys(locations))

    # The first PERSON entity in a resume is usually the candidate's name
    name = persons[0] if persons else None

    total_entities = sum(len(v) for v in entities.values())

    return {
        "name": name,
        "all_persons": persons,
        "organizations": organizations,
        "locations": locations,
        "dates": dates,
        "skills_from_ner": products,
        "entity_count": total_entities,
        "all_entities": entities,
    }
