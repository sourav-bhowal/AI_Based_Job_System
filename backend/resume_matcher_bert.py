"""
Resume-Job Semantic Matcher — Sentence-BERT Edition
=====================================================

Two layers of SBERT intelligence:

1. DOCUMENT similarity  — encodes full resume + job text, cosine similarity
   captures overall alignment ("are you in the right field?")

2. FUZZY SKILL matching — encodes individual skill names, finds the closest
   resume skill for every job-required skill.

   Before (exact match only):
     resume has: pytorch       job needs: tensorflow  →  MISSING  ❌
     resume has: javascript    job needs: react        →  MISSING  ❌

   After (fuzzy):
     resume has: pytorch       job needs: tensorflow  →  87% covered  ⚠️
     resume has: javascript    job needs: react        →  91% covered  ⚠️

Thresholds:
  sim >= 0.72  →  "partial_match"  (contributes sim score to skill_match_ratio)
  sim <  0.72  →  "missing"        (0 contribution, shows in gaps)

All other logic (ATS, course recs, roadmap) imported from resume_matcher.py.
"""

from resume_matcher import (
    extract_job_requirements,
    COURSE_RECOMMENDATIONS,
    compute_ats_score,
    generate_training_roadmap,
)

SBERT_MODEL_NAME = "all-MiniLM-L6-v2"

# Fuzzy match threshold — below this a skill is considered truly missing
PARTIAL_MATCH_THRESHOLD = 0.72

_sbert_model = None
_skill_emb_cache: dict = {}   # skill_name (lowercase) -> tensor, persists across calls


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def _load_sbert():
    """Lazy-load the Sentence-BERT model (~80 MB, downloaded once)."""
    global _sbert_model
    if _sbert_model is not None:
        return _sbert_model
    from sentence_transformers import SentenceTransformer
    _sbert_model = SentenceTransformer(SBERT_MODEL_NAME)
    return _sbert_model


# ---------------------------------------------------------------------------
# Document-level similarity (unchanged from previous version)
# ---------------------------------------------------------------------------

def compute_semantic_similarity(text_a: str, text_b: str) -> float:
    """Cosine similarity between two full-text documents via SBERT embeddings."""
    from sentence_transformers import util
    model = _load_sbert()
    embeddings = model.encode([text_a, text_b], convert_to_tensor=True)
    return float(max(0.0, min(1.0, util.cos_sim(embeddings[0], embeddings[1]).item())))


def _tfidf_fallback(text_a: str, text_b: str) -> float:
    """TF-IDF cosine fallback if SBERT fails to load."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as sk_cos
    try:
        vec = TfidfVectorizer(stop_words="english", max_features=3000)
        mat = vec.fit_transform([text_a, text_b])
        return float(sk_cos(mat[0:1], mat[1:2])[0][0])
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Skill-level fuzzy matching
# ---------------------------------------------------------------------------

def _encode_skills(skills: list) -> None:
    """Batch-encode any skills not yet in the cache and store them."""
    model = _load_sbert()
    new = [s for s in skills if s not in _skill_emb_cache]
    if not new:
        return
    embeddings = model.encode(new, convert_to_tensor=True, show_progress_bar=False)
    for skill, emb in zip(new, embeddings):
        _skill_emb_cache[skill] = emb


def _fuzzy_skill_match(required_skill: str, resume_skills: set) -> tuple:
    """
    Find the most similar skill in resume_skills to required_skill.

    Returns:
        (best_matching_resume_skill: str, similarity: float)
        similarity is 0.0 if resume_skills is empty or encoding fails.
    """
    from sentence_transformers import util

    if not resume_skills:
        return ("", 0.0)

    all_skills = list(resume_skills) + [required_skill]
    try:
        _encode_skills(all_skills)
    except Exception:
        return ("", 0.0)

    if required_skill not in _skill_emb_cache:
        return ("", 0.0)

    req_emb = _skill_emb_cache[required_skill]
    best_skill, best_sim = "", 0.0

    for s in resume_skills:
        if s not in _skill_emb_cache:
            continue
        sim = util.cos_sim(req_emb, _skill_emb_cache[s]).item()
        if sim > best_sim:
            best_sim = sim
            best_skill = s

    return (best_skill, float(best_sim))


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def compute_match_score(resume_data: dict, job_text: str) -> dict:
    """
    Compute match score between a resume and job posting.

    Skill matching is now fuzzy: job-required skills not found verbatim in
    the resume are matched against resume skills via SBERT similarity.
    A partial match (sim >= PARTIAL_MATCH_THRESHOLD) contributes its
    similarity score (0.72–1.0) to the overall skill_match_ratio instead
    of counting as a full miss.

    Returns the same dict structure as resume_matcher.compute_match_score().
    """
    resume_text = resume_data["text"]
    resume_skills = resume_data["skills"]

    # --- 1. Document-level similarity (SBERT) ---
    similarity_method = "sentence_bert"
    try:
        similarity = compute_semantic_similarity(resume_text, job_text)
    except Exception:
        similarity = _tfidf_fallback(resume_text, job_text)
        similarity_method = "tfidf_fallback"

    # --- 2. Skill sets ---
    job_requirements = extract_job_requirements(job_text)
    job_skill_set = set()
    for cat_skills in job_requirements["skills"].values():
        job_skill_set.update(s.lower() for s in cat_skills)

    resume_skill_set = set()
    for cat_skills in resume_skills.values():
        resume_skill_set.update(s.lower() for s in cat_skills)

    # --- 3. Fuzzy skill classification ---
    #   exact        — verbatim match
    #   partial_match — sim >= PARTIAL_MATCH_THRESHOLD (contributes sim to ratio)
    #   missing       — sim <  PARTIAL_MATCH_THRESHOLD (0 contribution)

    skill_results = {}   # required_skill -> {"type", "bridge_skill", "sim"}

    if job_skill_set:
        # Pre-encode all skills in one batch (fast)
        all_skills_to_encode = list(job_skill_set | resume_skill_set)
        try:
            _encode_skills(all_skills_to_encode)
        except Exception:
            pass

        for req in job_skill_set:
            if req in resume_skill_set:
                skill_results[req] = {"type": "exact", "bridge_skill": req, "sim": 1.0}
            else:
                bridge, sim = _fuzzy_skill_match(req, resume_skill_set)
                if sim >= PARTIAL_MATCH_THRESHOLD:
                    skill_results[req] = {"type": "partial_match", "bridge_skill": bridge, "sim": round(sim, 2)}
                else:
                    skill_results[req] = {"type": "missing", "bridge_skill": bridge, "sim": round(sim, 2)}

    # --- 4. Skill match ratio (fuzzy-weighted) ---
    if not job_skill_set:
        skill_match_ratio = similarity
    else:
        total = sum(
            v["sim"] if v["type"] in ("exact", "partial_match") else 0.0
            for v in skill_results.values()
        )
        skill_match_ratio = total / len(job_skill_set)

    # --- 5. Combined match score ---
    match_score = round((0.4 * similarity + 0.6 * skill_match_ratio) * 100, 1)
    match_score = min(match_score, 100)

    # --- 6. Strengths ---
    strengths = []
    for req, info in sorted(skill_results.items()):
        if info["type"] == "exact":
            strengths.append({
                "skill": req,
                "status": "match",
                "message": f"Your resume includes '{req}' which is required for this role",
            })
        elif info["type"] == "partial_match":
            pct = round(info["sim"] * 100)
            strengths.append({
                "skill": req,
                "status": "partial_match",
                "bridge_skill": info["bridge_skill"],
                "similarity": pct,
                "message": (
                    f"'{req}' not listed, but your '{info['bridge_skill']}' experience "
                    f"covers ~{pct}% of it — a short bridge course should close this gap"
                ),
            })

    if resume_data.get("experience_years", 0) > 0:
        strengths.append({
            "skill": "experience",
            "status": "match",
            "message": f"You have {resume_data['experience_years']} years of experience",
        })
    if resume_data.get("education"):
        strengths.append({
            "skill": "education",
            "status": "match",
            "message": f"Education: {', '.join(resume_data['education'][:2])}",
        })

    # --- 7. Weaknesses (truly missing only) ---
    weaknesses = []
    for req, info in sorted(skill_results.items()):
        if info["type"] == "missing":
            weaknesses.append({
                "skill": req,
                "status": "missing",
                "message": f"The job requires '{req}' and it's not covered by your current skills",
                "priority": "high" if req in COURSE_RECOMMENDATIONS else "medium",
            })

    # --- 8. Course recommendations for missing skills ---
    recommendations = []
    for w in weaknesses:
        skill = w["skill"]
        if skill in COURSE_RECOMMENDATIONS:
            for course in COURSE_RECOMMENDATIONS[skill]:
                recommendations.append({"skill": skill, **course})
        else:
            recommendations.append({
                "skill": skill,
                "title": f"Learn {skill.title()}",
                "platform": "YouTube / Google",
                "url": f"https://www.youtube.com/results?search_query=learn+{skill.replace(' ', '+')}",
                "level": "Beginner",
            })

    # --- 9. ATS Score ---
    ats_score = compute_ats_score(resume_data, job_text)

    # --- 10. Training Roadmap ---
    roadmap = generate_training_roadmap(weaknesses, recommendations)

    # Summary counts
    exact_count   = sum(1 for v in skill_results.values() if v["type"] == "exact")
    partial_count = sum(1 for v in skill_results.values() if v["type"] == "partial_match")
    missing_count = sum(1 for v in skill_results.values() if v["type"] == "missing")

    return {
        "match_score": match_score,
        "cosine_similarity": round(similarity * 100, 1),
        "similarity_method": similarity_method,
        "skill_match_percentage": round(skill_match_ratio * 100, 1),
        "total_job_skills": len(job_skill_set),
        "matching_skills_count": exact_count,
        "partial_match_skills_count": partial_count,
        "missing_skills_count": missing_count,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations[:15],
        "ats_score": ats_score,
        "training_roadmap": roadmap,
    }
