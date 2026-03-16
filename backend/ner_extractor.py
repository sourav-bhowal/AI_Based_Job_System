"""
Named Entity Recognition (NER) Module — BERT Edition
=====================================================

Uses a pretrained BERT-based NER model (dslim/bert-base-NER via HuggingFace)
for high-accuracy entity extraction from job postings and resumes.

Compared to the previous spaCy en_core_web_sm approach (~85% F1), this
transformer model achieves ~92% F1 on CoNLL-2003 and virtually eliminates
false-positive locations (e.g., "Node.js", "React", "Svenska" no longer
classified as locations).

Entity types from the model:
- PER  → PERSON  (person names)
- ORG  → ORG     (organizations, companies)
- LOC  → LOC/GPE (geographic locations)
- MISC → MISC    (nationalities, languages, events, etc.)

Additional entity types extracted via regex:
- MONEY — Monetary values ($50K, ₹5,00,000, 80000/year, etc.)
- DATE  — Dates and time periods (Jan 2024, 3+ years, etc.)

Requires: torch, transformers  (already in requirements.txt)
"""

import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NER_MODEL_DIR = os.path.join(SCRIPT_DIR, "models", "ner_bert")
DEFAULT_NER_MODEL = "dslim/bert-base-NER"

_ner_pipeline = None

_LABEL_MAP = {
    "PER": "PERSON",
    "ORG": "ORG",
    "LOC": "LOC",
    "MISC": "MISC",
}

MIN_ENTITY_SCORE = 0.60


def _get_ner_pipeline():
    """Lazy-load the BERT NER pipeline."""
    global _ner_pipeline
    if _ner_pipeline is not None:
        return _ner_pipeline

    import torch
    from transformers import pipeline as hf_pipeline

    local_model_exists = os.path.exists(os.path.join(NER_MODEL_DIR, "config.json"))
    model_path = NER_MODEL_DIR if local_model_exists else DEFAULT_NER_MODEL

    device = 0 if torch.cuda.is_available() else -1

    _ner_pipeline = hf_pipeline(
        "token-classification",
        model=model_path,
        tokenizer=model_path,
        device=device,
        aggregation_strategy="simple",
    )
    return _ner_pipeline


# ---------------------------------------------------------------------------
# Regex patterns for MONEY and DATE (BERT NER doesn't cover these)
# ---------------------------------------------------------------------------

_MONEY_PATTERN = re.compile(
    r"[\$€£₹¥]\s*\d[\d,]*(?:\.\d+)?(?:\s*[kKmM]\b)?"
    r"|\d[\d,]*(?:\.\d+)?\s*(?:USD|EUR|GBP|INR|JPY|CAD|AUD)\b"
    r"|\d[\d,]*(?:\.\d+)?\s*(?:per|/)\s*(?:year|month|week|hour|annum|yr|mo|hr)\b",
    re.IGNORECASE,
)

_DATE_PATTERN = re.compile(
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
    r"Dec(?:ember)?)\s+\d{4}"
    r"|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|"
    r"Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|"
    r"Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}"
    r"|\d{1,2}/\d{1,2}/\d{2,4}"
    r"|\d{4}-\d{2}-\d{2}"
    r"|\d+\+?\s*(?:years?|months?|weeks?|days?)\s*(?:of\s+)?(?:experience|exp)?",
    re.IGNORECASE,
)


def _extract_money(text: str) -> list:
    """Extract monetary values from text using regex."""
    return list(dict.fromkeys(m.strip() for m in _MONEY_PATTERN.findall(text)))


def _extract_dates(text: str) -> list:
    """Extract date/period mentions from text using regex."""
    return list(dict.fromkeys(m.strip() for m in _DATE_PATTERN.findall(text)))


# ---------------------------------------------------------------------------
# Chunked extraction (BERT has a 512-token limit)
# ---------------------------------------------------------------------------

def _chunk_and_extract(text: str, max_chars: int = 1500) -> list:
    """
    Run BERT NER on *text*, splitting into sentence-boundary chunks when the
    text is too long for a single pass.  Returns de-duplicated pipeline entities.
    """
    pipe = _get_ner_pipeline()

    if len(text) <= max_chars:
        return pipe(text)

    sentences = re.split(r"(?<=[.!?\n])\s+", text)
    chunks, current = [], ""
    for sent in sentences:
        if len(current) + len(sent) + 1 > max_chars:
            if current:
                chunks.append(current.strip())
            current = sent
        else:
            current = (current + " " + sent).strip()
    if current.strip():
        chunks.append(current.strip())
    if not chunks:
        chunks = [text[:max_chars]]

    all_entities = []
    seen = set()
    for chunk in chunks:
        for ent in pipe(chunk):
            key = (ent["entity_group"], ent["word"].strip().lower())
            if key not in seen:
                seen.add(key)
                all_entities.append(ent)

    return all_entities


# ---------------------------------------------------------------------------
# Public API (same signatures as the previous spaCy-based version)
# ---------------------------------------------------------------------------

def extract_entities(text: str, max_length: int = 100000) -> dict:
    """
    Extract all named entities from text, grouped by label.

    Args:
        text: Input text to analyze.
        max_length: Maximum text length to process (truncated if longer).

    Returns:
        dict with entity labels as keys and lists of unique entity strings
        as values.  Example: {"ORG": ["Google"], "LOC": ["New York"]}

        For backward compatibility, LOC entities are also exposed under
        the "GPE" key (spaCy used GPE for geopolitical entities).
    """
    text = text[:max_length]
    raw_entities = _chunk_and_extract(text)

    entities: dict[str, list[str]] = {}
    for ent in raw_entities:
        if ent["score"] < MIN_ENTITY_SCORE:
            continue
        label = _LABEL_MAP.get(ent["entity_group"], ent["entity_group"])
        value = re.sub(r"\s*##\s*", "", ent["word"]).strip()
        if not value or len(value) < 2:
            continue
        entities.setdefault(label, [])
        if value not in entities[label]:
            entities[label].append(value)

    # Backward compat: expose LOC under GPE as well
    if "LOC" in entities:
        entities["GPE"] = list(entities["LOC"])

    # Regex-based MONEY and DATE
    money = _extract_money(text)
    if money:
        entities["MONEY"] = money
    dates = _extract_dates(text)
    if dates:
        entities["DATE"] = dates

    return entities


def extract_job_entities(text: str) -> dict:
    """
    Extract entities from a job posting with scam-signal analysis.

    Returns:
        dict with:
        - companies: list of ORG entities (potential company names)
        - locations: list of LOC/GPE entities (job locations)
        - money: list of MONEY entities (salary mentions)
        - dates: list of DATE entities
        - persons: list of PERSON entities
        - entity_count: total entities found
        - scam_signals: list of entity-based red flags
    """
    entities = extract_entities(text)

    companies = entities.get("ORG", [])
    locations = entities.get("LOC", [])
    money = entities.get("MONEY", [])
    dates = entities.get("DATE", [])
    persons = entities.get("PERSON", [])

    locations = list(dict.fromkeys(locations))
    total_entities = sum(len(v) for v in entities.values())

    # --- Scam Signal Analysis ---
    scam_signals = []

    if not companies:
        scam_signals.append({
            "signal": "no_company_entity",
            "severity": "medium",
            "message": "No company/organization name detected — legitimate postings typically mention the hiring company",
        })

    if not locations:
        scam_signals.append({
            "signal": "no_location_entity",
            "severity": "low",
            "message": "No specific location detected — vague location details can be a red flag",
        })

    if len(persons) > 5:
        scam_signals.append({
            "signal": "excessive_person_names",
            "severity": "low",
            "message": f"{len(persons)} person names detected — unusual for a standard job posting",
        })

    for m in money:
        cleaned = re.sub(r"[,$₹€£¥]", "", m)
        numbers = re.findall(r"\d+", cleaned)
        for num_str in numbers:
            if int(num_str) > 500000:
                scam_signals.append({
                    "signal": "high_money_entity",
                    "severity": "medium",
                    "message": f"Very high monetary value detected: '{m}' — verify this is a realistic salary",
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
        - locations: list of LOC/GPE entities
        - dates: list of DATE entities (employment periods, graduation dates)
        - skills_from_ner: list of MISC entities (sometimes captures tech names)
        - entity_count: total entities found
    """
    entities = extract_entities(text)

    persons = entities.get("PERSON", [])
    organizations = entities.get("ORG", [])
    locations = entities.get("LOC", [])
    dates = entities.get("DATE", [])
    products = entities.get("MISC", [])

    locations = list(dict.fromkeys(locations))
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
