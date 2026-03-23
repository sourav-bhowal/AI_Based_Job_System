import re
from ner_extractor import extract_resume_entities

# Skills database organized by category
SKILLS_DATABASE = {
    "programming_languages": [
        "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go", "golang",
        "rust", "swift", "kotlin", "php", "scala", "r", "matlab", "perl", "dart", "lua",
        "html", "css", "sql", "bash", "shell", "powershell", "objective-c", "assembly",
        "haskell", "elixir", "clojure", "groovy", "visual basic", "vb.net", "f#",
    ],
    "frameworks": [
        "react", "reactjs", "react.js", "angular", "angularjs", "vue", "vuejs", "vue.js",
        "django", "flask", "fastapi", "spring", "spring boot", "express", "expressjs",
        "next.js", "nextjs", "nuxt.js", "nuxtjs", "svelte", "gatsby", "rails",
        "ruby on rails", "laravel", "asp.net", ".net", "dotnet", "flutter", "react native",
        "electron", "ember", "backbone", "jquery", "bootstrap", "tailwind", "tailwindcss",
        "material ui", "chakra ui", "ant design", "redux", "mobx", "graphql",
    ],
    "databases": [
        "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch",
        "sqlite", "oracle", "sql server", "mssql", "cassandra", "dynamodb",
        "firebase", "firestore", "couchdb", "neo4j", "mariadb", "cockroachdb",
        "supabase", "prisma", "sequelize", "mongoose", "typeorm",
    ],
    "cloud_devops": [
        "aws", "amazon web services", "azure", "gcp", "google cloud", "heroku",
        "docker", "kubernetes", "k8s", "jenkins", "ci/cd", "terraform", "ansible",
        "github actions", "gitlab ci", "circleci", "travis ci", "nginx", "apache",
        "linux", "ubuntu", "centos", "vagrant", "puppet", "chef",
        "cloudflare", "netlify", "vercel", "digitalocean", "linode",
    ],
    "data_science_ml": [
        "machine learning", "deep learning", "artificial intelligence", "ai", "ml",
        "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn", "pandas", "numpy",
        "scipy", "matplotlib", "seaborn", "plotly", "tableau", "power bi",
        "nlp", "natural language processing", "computer vision", "opencv",
        "neural networks", "cnn", "rnn", "lstm", "transformer", "bert", "gpt",
        "data mining", "data analysis", "data visualization", "statistics",
        "regression", "classification", "clustering", "reinforcement learning",
        "spark", "hadoop", "hive", "kafka", "airflow", "etl", "data pipeline",
        "jupyter", "colab", "hugging face", "spacy", "nltk",
    ],
    "tools": [
        "git", "github", "gitlab", "bitbucket", "jira", "confluence", "trello",
        "slack", "vs code", "visual studio", "intellij", "eclipse", "postman",
        "swagger", "figma", "sketch", "adobe xd", "photoshop", "illustrator",
        "notion", "asana", "monday.com", "webpack", "vite", "babel", "eslint",
        "prettier", "npm", "yarn", "pnpm", "pip", "conda", "maven", "gradle",
    ],
    "soft_skills": [
        "leadership", "communication", "teamwork", "problem solving", "critical thinking",
        "project management", "agile", "scrum", "kanban", "time management",
        "presentation", "mentoring", "collaboration", "analytical", "creative",
        "detail oriented", "self motivated", "adaptable", "organized",
    ],
}

# Flatten skills for quick lookup
ALL_SKILLS = {}
for category, skills in SKILLS_DATABASE.items():
    for skill in skills:
        ALL_SKILLS[skill.lower()] = category

# Education patterns
EDUCATION_PATTERNS = [
    r"\b(?:bachelor(?:'s)?|b\.\s?s\.?|b\.\s?tech|b\.\s?e\.?|b\.\s?sc|b\.\s?a\.?|b\.\s?com)\b",
    r"\b(?:master(?:'s)?|m\.\s?s\.?|m\.\s?tech|m\.\s?e\.?|m\.\s?sc|m\.\s?a\.?|mba|m\.\s?b\.\s?a\.?)\b",
    r"\b(?:ph\.\s?d\.?|doctorate|doctoral)\b",
    r"\b(?:diploma|associate|certification|certificate)\b",
    r"\b(?:10th|12th|high school|higher secondary|intermediate|ssc|hsc)\b",
]

SECTION_HEADER_PATTERN = re.compile(
    r"^\s*(education|academics|qualification|qualifications|experience|projects|skills|certifications|summary|objective|achievements)\s*:?")


def _extract_education_section_lines(text: str) -> list:
    """Extract lines from the education section when present."""
    lines = [line.strip(" •\t-") for line in text.splitlines() if line.strip()]
    if not lines:
        return []

    start_index = None
    for index, line in enumerate(lines):
        if re.match(r"^\s*(education|academics|qualification|qualifications)\s*:?$", line, re.IGNORECASE):
            start_index = index + 1
            break

    if start_index is None:
        return lines

    section_lines = []
    for line in lines[start_index:]:
        if SECTION_HEADER_PATTERN.match(line):
            break
        section_lines.append(line)

    return section_lines if section_lines else lines

# Experience patterns
EXPERIENCE_PATTERNS = [
    r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)",
    r"experience\s*(?:of\s+)?(\d+)\+?\s*(?:years?|yrs?)",
    r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:in|of|working)",
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file bytes."""
    try:
        import PyPDF2
        import io
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX file bytes."""
    try:
        import docx
        import io
        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")


def extract_skills(text: str) -> dict:
    """Extract skills from text and categorize them."""
    text_lower = text.lower()
    found_skills = {}

    for skill, category in ALL_SKILLS.items():
        # Use word boundary matching to avoid partial matches
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            if category not in found_skills:
                found_skills[category] = []
            if skill not in found_skills[category]:
                found_skills[category].append(skill)

    return found_skills


def extract_education(text: str) -> list:
    """Extract education qualifications from text."""
    education = []
    degree_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in EDUCATION_PATTERNS]
    candidate_lines = _extract_education_section_lines(text)

    for line in candidate_lines:
        normalized = re.sub(r"\s+", " ", line).strip(" ,;:-")
        if len(normalized) < 6 or len(normalized) > 120:
            continue

        if any(pattern.search(normalized) for pattern in degree_patterns):
            if normalized not in education:
                education.append(normalized)

    return education[:5]  # Return top 5


def extract_experience_years(text: str) -> int:
    """Extract years of experience from text."""
    for pattern in EXPERIENCE_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return 0


def extract_contact_info(text: str) -> dict:
    """Extract contact information from resume."""
    contact = {}

    # Normalize text to fix common PDF extraction artifacts:
    # - Collapse multiple whitespace/newlines into single spaces
    # - Remove spaces around @ and . that PDF extractors often insert
    normalized = re.sub(r'\s+', ' ', text)

    # Build an email-friendly version: remove spaces around @ and dots
    # e.g. "john @ gmail . com" -> "john@gmail.com"
    email_text = re.sub(r'\s*@\s*', '@', normalized)
    email_text = re.sub(r'\s*\.\s*', '.', email_text)

    # Email
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', email_text)
    if email_match:
        contact["email"] = email_match.group()

    # Phone: strip all whitespace from a copy so digits are contiguous,
    # then match common phone formats (Indian & international)
    phone_text = re.sub(r'[^\d+().\-]', ' ', normalized)  # keep digits and phone chars
    phone_text = re.sub(r'\s+', ' ', phone_text).strip()

    phone_match = re.search(
        r'(?:\+?\d{1,3}[-.\s]?)?'   # optional country code
        r'\(?\d{3,5}\)?[-.\s]?'      # area code
        r'\d{3,4}[-.\s]?'            # first group
        r'\d{3,4}',                  # second group
        phone_text
    )
    if phone_match:
        contact["phone"] = phone_match.group().strip()

    # Also try matching on normalized text directly (handles formats like +91 98765 43210)
    if "phone" not in contact:
        phone_match2 = re.search(
            r'(?:\+?\d{1,3}[-.\s]?)?'
            r'\(?\d{3,5}\)?[-.\s]?'
            r'\d{3,4}[-.\s]?'
            r'\d{3,4}',
            normalized
        )
        if phone_match2:
            contact["phone"] = phone_match2.group().strip()

    # LinkedIn
    linkedin_text = re.sub(r'\s*/\s*', '/', normalized)  # fix "linkedin . com / in / user"
    linkedin_text = re.sub(r'\s*\.\s*', '.', linkedin_text)
    linkedin_match = re.search(r'linkedin\.com/in/[\w-]+', linkedin_text, re.IGNORECASE)
    if linkedin_match:
        contact["linkedin"] = linkedin_match.group()

    # GitHub
    github_text = linkedin_text  # reuse the same cleaned text
    github_match = re.search(r'github\.com/[\w-]+', github_text, re.IGNORECASE)
    if github_match:
        contact["github"] = github_match.group()

    return contact


def parse_resume(file_bytes: bytes, filename: str) -> dict:
    """
    Parse a resume file and extract structured information.
    
    Returns:
        dict with keys: text, skills, education, experience_years, contact
    """
    # Extract text based on file type
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        text = extract_text_from_pdf(file_bytes)
    elif ext in ("docx", "doc"):
        text = extract_text_from_docx(file_bytes)
    elif ext == "txt":
        text = file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError(f"Unsupported file format: {ext}. Supported: PDF, DOCX, TXT")

    if not text or len(text) < 50:
        raise ValueError("Could not extract enough text from the resume. Please upload a valid resume.")

    # Extract all components
    skills = extract_skills(text)
    education = extract_education(text)
    experience_years = extract_experience_years(text)
    contact = extract_contact_info(text)

    # NER extraction for richer entity data
    try:
        ner_data = extract_resume_entities(text)
    except Exception:
        ner_data = {"name": None, "organizations": [], "locations": [], "dates": [], "skills_from_ner": [], "entity_count": 0, "all_entities": {}, "all_persons": []}

    # Enrich contact info with NER-detected name
    if ner_data.get("name") and "name" not in contact:
        contact["name"] = ner_data["name"]

    # Calculate basic stats
    total_skills = sum(len(v) for v in skills.values())

    return {
        "text": text,
        "skills": skills,
        "total_skills_found": total_skills,
        "education": education,
        "experience_years": experience_years,
        "contact": contact,
        "word_count": len(text.split()),
        "ner_entities": {
            "name": ner_data.get("name"),
            "organizations": ner_data.get("organizations", []),
            "locations": ner_data.get("locations", []),
            "dates": ner_data.get("dates", []),
            "skills_from_ner": ner_data.get("skills_from_ner", []),
            "entity_count": ner_data.get("entity_count", 0),
        },
    }
