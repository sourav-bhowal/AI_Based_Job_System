"""
Resume-Job Semantic Matcher — Sentence-BERT Edition
=====================================================

Replaces the TF-IDF cosine similarity in resume_matcher.py with
Sentence-BERT embeddings for much stronger semantic matching.

"built REST APIs" ↔ "backend web services experience" → high similarity
(TF-IDF would score this near 0 because no keywords overlap)

All other logic (skill matching, ATS, course recs, roadmap) is
imported from the original resume_matcher.py — no duplication.

Requires: sentence-transformers (which pulls torch + transformers)
"""

from resume_matcher import (
    extract_job_requirements,
    COURSE_RECOMMENDATIONS,
    compute_ats_score,
    generate_training_roadmap,
)
SBERT_MODEL_NAME = "all-MiniLM-L6-v2"

_sbert_model = None


def _load_sbert():
    """Lazy-load the Sentence-BERT model (~80 MB, downloaded once)."""
    global _sbert_model
    if _sbert_model is not None:
        return _sbert_model

    from sentence_transformers import SentenceTransformer
    _sbert_model = SentenceTransformer(SBERT_MODEL_NAME)
    return _sbert_model


def compute_semantic_similarity(text_a: str, text_b: str) -> float:
    """Compute cosine similarity using Sentence-BERT embeddings."""
    from sentence_transformers import util

    model = _load_sbert()
    embeddings = model.encode([text_a, text_b], convert_to_tensor=True)
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
    return max(0.0, min(1.0, similarity))


def _tfidf_fallback(text_a: str, text_b: str) -> float:
    """TF-IDF cosine similarity as fallback if SBERT fails to load."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    vectorizer = TfidfVectorizer(stop_words="english", max_features=3000)
    try:
        tfidf_matrix = vectorizer.fit_transform([text_a, text_b])
        return float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
    except Exception:
        return 0.0


def compute_match_score(resume_data: dict, job_text: str) -> dict:
    """
    Compute match score between a resume and job posting.

    Uses Sentence-BERT cosine similarity for overall semantic match and
    skill-by-skill comparison for detailed breakdown.

    Drop-in replacement for resume_matcher.compute_match_score() —
    returns the exact same dict structure.
    """
    resume_text = resume_data["text"]
    resume_skills = resume_data["skills"]

    # --- 1. Semantic Similarity (Sentence-BERT) ---
    similarity_method = "sentence_bert"
    try:
        similarity = compute_semantic_similarity(resume_text, job_text)
    except Exception:
        similarity = _tfidf_fallback(resume_text, job_text)
        similarity_method = "tfidf_fallback"

    # --- 2. Skill-by-Skill Matching (same as original) ---
    job_requirements = extract_job_requirements(job_text)
    job_skills = job_requirements["skills"]

    resume_skill_set = set()
    for category_skills in resume_skills.values():
        resume_skill_set.update(s.lower() for s in category_skills)

    job_skill_set = set()
    for category_skills in job_skills.values():
        job_skill_set.update(s.lower() for s in category_skills)

    if not job_skill_set:
        skill_match_ratio = similarity
    else:
        matching_skills = resume_skill_set.intersection(job_skill_set)
        missing_skills = job_skill_set - resume_skill_set
        extra_skills = resume_skill_set - job_skill_set
        skill_match_ratio = len(matching_skills) / len(job_skill_set) if job_skill_set else 0

    # --- 3. Combined Match Score ---
    match_score = round((0.4 * similarity + 0.6 * skill_match_ratio) * 100, 1)
    match_score = min(match_score, 100)

    # --- 4. Strengths (matching skills) ---
    strengths = []
    if job_skill_set:
        matching = resume_skill_set.intersection(job_skill_set)
        for skill in sorted(matching):
            strengths.append({
                "skill": skill,
                "status": "match",
                "message": f"Your resume includes '{skill}' which is required for this role"
            })

    if resume_data.get("experience_years", 0) > 0:
        strengths.append({
            "skill": "experience",
            "status": "match",
            "message": f"You have {resume_data['experience_years']} years of experience"
        })

    if resume_data.get("education"):
        strengths.append({
            "skill": "education",
            "status": "match",
            "message": f"Education: {', '.join(resume_data['education'][:2])}"
        })

    # --- 5. Weaknesses (missing skills) ---
    weaknesses = []
    if job_skill_set:
        missing = job_skill_set - resume_skill_set
        for skill in sorted(missing):
            weaknesses.append({
                "skill": skill,
                "status": "missing",
                "message": f"The job requires '{skill}' but it's not found in your resume",
                "priority": "high" if skill in COURSE_RECOMMENDATIONS else "medium"
            })

    # --- 6. Course Recommendations for Missing Skills ---
    recommendations = []
    if job_skill_set:
        missing = job_skill_set - resume_skill_set
        for skill in sorted(missing):
            if skill in COURSE_RECOMMENDATIONS:
                for course in COURSE_RECOMMENDATIONS[skill]:
                    recommendations.append({
                        "skill": skill,
                        **course
                    })
            else:
                recommendations.append({
                    "skill": skill,
                    "title": f"Learn {skill.title()}",
                    "platform": "YouTube / Google",
                    "url": f"https://www.youtube.com/results?search_query=learn+{skill.replace(' ', '+')}",
                    "level": "Beginner"
                })

    # --- 7. ATS Score ---
    ats_score = compute_ats_score(resume_data, job_text)

    # --- 8. Training Roadmap ---
    roadmap = generate_training_roadmap(weaknesses, recommendations)

    return {
        "match_score": match_score,
        "cosine_similarity": round(similarity * 100, 1),
        "similarity_method": similarity_method,
        "skill_match_percentage": round(skill_match_ratio * 100, 1),
        "total_job_skills": len(job_skill_set),
        "matching_skills_count": len(resume_skill_set.intersection(job_skill_set)) if job_skill_set else 0,
        "missing_skills_count": len(job_skill_set - resume_skill_set) if job_skill_set else 0,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "recommendations": recommendations[:15],
        "ats_score": ats_score,
        "training_roadmap": roadmap,
    }
