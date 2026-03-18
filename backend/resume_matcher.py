import re
from resume_parser import extract_skills
# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.metrics.pairwise import cosine_similarity

# Course recommendations for skill gaps
COURSE_RECOMMENDATIONS = {
    "python": [
        {"title": "Python for Everybody", "platform": "Coursera", "url": "https://www.coursera.org/specializations/python", "level": "Beginner"},
        {"title": "Automate the Boring Stuff with Python", "platform": "Udemy", "url": "https://www.udemy.com/course/automate/", "level": "Beginner"},
    ],
    "java": [
        {"title": "Java Programming Masterclass", "platform": "Udemy", "url": "https://www.udemy.com/course/java-the-complete-java-developer-course/", "level": "Beginner"},
    ],
    "javascript": [
        {"title": "The Complete JavaScript Course", "platform": "Udemy", "url": "https://www.udemy.com/course/the-complete-javascript-course/", "level": "Beginner"},
        {"title": "JavaScript Algorithms and Data Structures", "platform": "freeCodeCamp", "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", "level": "Beginner"},
    ],
    "react": [
        {"title": "React - The Complete Guide", "platform": "Udemy", "url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/", "level": "Intermediate"},
    ],
    "machine learning": [
        {"title": "Machine Learning by Andrew Ng", "platform": "Coursera", "url": "https://www.coursera.org/learn/machine-learning", "level": "Beginner"},
        {"title": "Hands-On Machine Learning", "platform": "Book", "url": "https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/", "level": "Intermediate"},
    ],
    "deep learning": [
        {"title": "Deep Learning Specialization", "platform": "Coursera", "url": "https://www.coursera.org/specializations/deep-learning", "level": "Intermediate"},
    ],
    "sql": [
        {"title": "The Complete SQL Bootcamp", "platform": "Udemy", "url": "https://www.udemy.com/course/the-complete-sql-bootcamp/", "level": "Beginner"},
    ],
    "docker": [
        {"title": "Docker Mastery", "platform": "Udemy", "url": "https://www.udemy.com/course/docker-mastery/", "level": "Intermediate"},
    ],
    "aws": [
        {"title": "AWS Certified Cloud Practitioner", "platform": "AWS Training", "url": "https://aws.amazon.com/training/", "level": "Beginner"},
    ],
    "tensorflow": [
        {"title": "TensorFlow Developer Certificate", "platform": "Coursera", "url": "https://www.coursera.org/professional-certificates/tensorflow-in-practice", "level": "Intermediate"},
    ],
    "pytorch": [
        {"title": "PyTorch for Deep Learning", "platform": "Udemy", "url": "https://www.udemy.com/course/pytorch-for-deep-learning/", "level": "Intermediate"},
    ],
    "django": [
        {"title": "Django for Everybody", "platform": "Coursera", "url": "https://www.coursera.org/specializations/django", "level": "Beginner"},
    ],
    "flask": [
        {"title": "REST APIs with Flask and Python", "platform": "Udemy", "url": "https://www.udemy.com/course/rest-api-flask-and-python/", "level": "Intermediate"},
    ],
    "git": [
        {"title": "Git & GitHub Crash Course", "platform": "YouTube", "url": "https://www.youtube.com/watch?v=RGOj5yH7evk", "level": "Beginner"},
    ],
    "kubernetes": [
        {"title": "Kubernetes for the Absolute Beginners", "platform": "Udemy", "url": "https://www.udemy.com/course/learn-kubernetes/", "level": "Beginner"},
    ],
    "data analysis": [
        {"title": "Google Data Analytics Certificate", "platform": "Coursera", "url": "https://www.coursera.org/professional-certificates/google-data-analytics", "level": "Beginner"},
    ],
    "nlp": [
        {"title": "Natural Language Processing Specialization", "platform": "Coursera", "url": "https://www.coursera.org/specializations/natural-language-processing", "level": "Intermediate"},
    ],
    "mongodb": [
        {"title": "MongoDB University", "platform": "MongoDB", "url": "https://university.mongodb.com/", "level": "Beginner"},
    ],
    "typescript": [
        {"title": "Understanding TypeScript", "platform": "Udemy", "url": "https://www.udemy.com/course/understanding-typescript/", "level": "Intermediate"},
    ],
    "nodejs": [
        {"title": "The Complete Node.js Developer Course", "platform": "Udemy", "url": "https://www.udemy.com/course/the-complete-nodejs-developer-course-2/", "level": "Intermediate"},
    ],
    "agile": [
        {"title": "Agile with Atlassian Jira", "platform": "Coursera", "url": "https://www.coursera.org/learn/agile-atlassian-jira", "level": "Beginner"},
    ],
}


def extract_job_requirements(job_text: str) -> dict:
    """Extract requirements from a job posting text."""
    job_skills = extract_skills(job_text)

    # Try to extract specific sections
    sections = {
        "requirements": "",
        "qualifications": "",
        "responsibilities": "",
    }

    text_lower = job_text.lower()
    for section in sections:
        pattern = rf"(?:{section}|what we.re looking for|what you.ll need|must have)[\s:]*\n(.*?)(?:\n\n|\n[A-Z]|$)"
        match = re.search(pattern, text_lower, re.DOTALL | re.IGNORECASE)
        if match:
            sections[section] = match.group(1).strip()

    return {
        "skills": job_skills,
        "sections": sections,
    }


# def compute_match_score(resume_data: dict, job_text: str) -> dict:
#     """
#     Compute match score between a resume and job posting.
    
#     Uses TF-IDF cosine similarity for overall match and
#     skill-by-skill comparison for detailed breakdown.
    
#     Returns:
#         dict with match_score, strengths, weaknesses, recommendations, 
#         training_roadmap, ats_score
#     """
#     resume_text = resume_data["text"]
#     resume_skills = resume_data["skills"]

#     # --- 1. TF-IDF Cosine Similarity Score ---
#     vectorizer = TfidfVectorizer(stop_words="english", max_features=3000)
#     try:
#         tfidf_matrix = vectorizer.fit_transform([resume_text, job_text])
#         similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
#     except:
#         similarity = 0.0

#     # --- 2. Skill-by-Skill Matching ---
#     job_requirements = extract_job_requirements(job_text)
#     job_skills = job_requirements["skills"]

#     # Flatten skills
#     resume_skill_set = set()
#     for category_skills in resume_skills.values():
#         resume_skill_set.update(s.lower() for s in category_skills)

#     job_skill_set = set()
#     for category_skills in job_skills.values():
#         job_skill_set.update(s.lower() for s in category_skills)

#     if not job_skill_set:
#         # If we couldn't extract specific skills, use a broader match
#         skill_match_ratio = similarity
#     else:
#         matching_skills = resume_skill_set.intersection(job_skill_set)
#         missing_skills = job_skill_set - resume_skill_set
#         extra_skills = resume_skill_set - job_skill_set
#         skill_match_ratio = len(matching_skills) / len(job_skill_set) if job_skill_set else 0

#     # --- 3. Combined Match Score ---
#     match_score = round((0.4 * similarity + 0.6 * skill_match_ratio) * 100, 1)
#     match_score = min(match_score, 100)  # Cap at 100

#     # --- 4. Strengths (matching skills) ---
#     strengths = []
#     if job_skill_set:
#         matching = resume_skill_set.intersection(job_skill_set)
#         for skill in sorted(matching):
#             strengths.append({
#                 "skill": skill,
#                 "status": "match",
#                 "message": f"Your resume includes '{skill}' which is required for this role"
#             })
    
#     if resume_data.get("experience_years", 0) > 0:
#         strengths.append({
#             "skill": "experience",
#             "status": "match",
#             "message": f"You have {resume_data['experience_years']} years of experience"
#         })

#     if resume_data.get("education"):
#         strengths.append({
#             "skill": "education",
#             "status": "match",
#             "message": f"Education: {', '.join(resume_data['education'][:2])}"
#         })

#     # --- 5. Weaknesses (missing skills) ---
#     weaknesses = []
#     if job_skill_set:
#         missing = job_skill_set - resume_skill_set
#         for skill in sorted(missing):
#             weaknesses.append({
#                 "skill": skill,
#                 "status": "missing",
#                 "message": f"The job requires '{skill}' but it's not found in your resume",
#                 "priority": "high" if skill in COURSE_RECOMMENDATIONS else "medium"
#             })

#     # --- 6. Course Recommendations for Missing Skills ---
#     recommendations = []
#     if job_skill_set:
#         missing = job_skill_set - resume_skill_set
#         for skill in sorted(missing):
#             if skill in COURSE_RECOMMENDATIONS:
#                 for course in COURSE_RECOMMENDATIONS[skill]:
#                     recommendations.append({
#                         "skill": skill,
#                         **course
#                     })
#             else:
#                 recommendations.append({
#                     "skill": skill,
#                     "title": f"Learn {skill.title()}",
#                     "platform": "YouTube / Google",
#                     "url": f"https://www.youtube.com/results?search_query=learn+{skill.replace(' ', '+')}",
#                     "level": "Beginner"
#                 })

#     # --- 7. ATS (Applicant Tracking System) Score ---
#     ats_score = compute_ats_score(resume_data, job_text)

#     # --- 8. Training Roadmap ---
#     roadmap = generate_training_roadmap(weaknesses, recommendations)

#     return {
#         "match_score": match_score,
#         "cosine_similarity": round(similarity * 100, 1),
#         "skill_match_percentage": round(skill_match_ratio * 100, 1),
#         "total_job_skills": len(job_skill_set),
#         "matching_skills_count": len(resume_skill_set.intersection(job_skill_set)) if job_skill_set else 0,
#         "missing_skills_count": len(job_skill_set - resume_skill_set) if job_skill_set else 0,
#         "strengths": strengths,
#         "weaknesses": weaknesses,
#         "recommendations": recommendations[:15],  # Limit to top 15
#         "ats_score": ats_score,
#         "training_roadmap": roadmap,
#     }


def compute_ats_score(resume_data: dict, job_text: str) -> dict:
    """
    Compute ATS (Applicant Tracking System) compatibility score.
    Checks how well the resume would pass through automated screening.
    """
    score = 0
    max_score = 100
    feedback = []

    # 1. Keyword density (30 points)
    resume_text = resume_data["text"].lower()
    job_words = set(job_text.lower().split())
    resume_words = set(resume_text.split())
    common_words = job_words.intersection(resume_words)
    keyword_ratio = len(common_words) / len(job_words) if job_words else 0
    keyword_score = min(keyword_ratio * 100, 30)
    score += keyword_score
    if keyword_ratio < 0.3:
        feedback.append({"type": "warning", "message": "Low keyword match — customize your resume for this job"})
    else:
        feedback.append({"type": "good", "message": "Good keyword density for ATS systems"})

    # 2. Skills coverage (30 points)
    total_skills = resume_data.get("total_skills_found", 0)
    if total_skills >= 10:
        score += 30
        feedback.append({"type": "good", "message": f"Strong skills section with {total_skills} identified skills"})
    elif total_skills >= 5:
        score += 20
        feedback.append({"type": "warning", "message": f"Moderate skills ({total_skills}). Add more relevant technical skills"})
    else:
        score += 10
        feedback.append({"type": "error", "message": f"Weak skills section ({total_skills} skills). ATS may reject this resume"})

    # 3. Contact info (10 points)
    contact = resume_data.get("contact", {})
    if contact.get("email"):
        score += 5
    else:
        feedback.append({"type": "error", "message": "No email found — ATS requires contact information"})
    if contact.get("phone"):
        score += 5
    else:
        feedback.append({"type": "warning", "message": "No phone number found"})

    # 4. Education (10 points)
    if resume_data.get("education"):
        score += 10
        feedback.append({"type": "good", "message": "Education section found"})
    else:
        feedback.append({"type": "warning", "message": "No education details detected — add your qualifications"})

    # 5. Experience mention (10 points)
    if resume_data.get("experience_years", 0) > 0:
        score += 10
        feedback.append({"type": "good", "message": f"{resume_data['experience_years']} years of experience detected"})
    else:
        feedback.append({"type": "warning", "message": "No explicit experience years found — quantify your experience"})

    # 6. Word count (10 points)
    word_count = resume_data.get("word_count", 0)
    if 200 <= word_count <= 1000:
        score += 10
        feedback.append({"type": "good", "message": f"Good resume length ({word_count} words)"})
    elif word_count < 200:
        score += 3
        feedback.append({"type": "error", "message": f"Resume too short ({word_count} words). Aim for 300-800 words"})
    else:
        score += 5
        feedback.append({"type": "warning", "message": f"Resume might be too long ({word_count} words). Keep it concise"})

    return {
        "score": min(round(score), 100),
        "feedback": feedback,
    }


def generate_training_roadmap(weaknesses: list, recommendations: list) -> list:
    """Generate a prioritized training roadmap based on skill gaps."""
    roadmap = []
    seen_skills = set()

    # Group by priority
    high_priority = [w for w in weaknesses if w.get("priority") == "high"]
    medium_priority = [w for w in weaknesses if w.get("priority") != "high"]

    week = 1
    for weakness in (high_priority + medium_priority)[:6]:  # Top 6 skills
        skill = weakness["skill"]
        if skill in seen_skills:
            continue
        seen_skills.add(skill)

        courses = [r for r in recommendations if r["skill"] == skill]
        roadmap.append({
            "week": f"Week {week}-{week + 1}",
            "skill": skill,
            "priority": weakness.get("priority", "medium"),
            "goal": f"Learn {skill.title()} fundamentals and build a small project",
            "resources": courses[:2] if courses else [],
        })
        week += 2

    return roadmap
