from fpdf import FPDF
from datetime import datetime
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(SCRIPT_DIR, "reports")

# Ensure reports directory exists
os.makedirs(REPORTS_DIR, exist_ok=True)


class ScamReportPDF(FPDF):
    """Custom PDF class for scam analysis reports."""

    _UNICODE_REPLACEMENTS = str.maketrans({
        "\u2018": "'",
        "\u2019": "'",
        "\u201C": '"',
        "\u201D": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2022": "*",
        "\u2026": "...",
        "\u00A0": " ",
    })

    def _sanitize_text(self, value):
        text = "" if value is None else str(value)
        text = text.translate(self._UNICODE_REPLACEMENTS)
        return text.encode("latin-1", errors="replace").decode("latin-1")

    def cell(self, *args, **kwargs):
        if "text" in kwargs:
            kwargs["text"] = self._sanitize_text(kwargs["text"])
        elif "txt" in kwargs:
            kwargs["txt"] = self._sanitize_text(kwargs["txt"])
        elif len(args) >= 3:
            args = list(args)
            args[2] = self._sanitize_text(args[2])
            args = tuple(args)
        return super().cell(*args, **kwargs)

    def multi_cell(self, *args, **kwargs):
        if "text" in kwargs:
            kwargs["text"] = self._sanitize_text(kwargs["text"])
        elif "txt" in kwargs:
            kwargs["txt"] = self._sanitize_text(kwargs["txt"])
        elif len(args) >= 3:
            args = list(args)
            args[2] = self._sanitize_text(args[2])
            args = tuple(args)
        return super().multi_cell(*args, **kwargs)

    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(41, 128, 185)  # Blue
        self.cell(0, 10, "AI Job Scam Detector", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(128, 128, 128)
        self.cell(0, 5, "Automated Job Analysis Report", new_x="LMARGIN", new_y="NEXT", align="C")
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')} | Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(44, 62, 80)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(41, 128, 185)
        self.line(10, self.get_y(), 80, self.get_y())
        self.ln(4)

    def add_key_value(self, key, value):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(52, 73, 94)
        self.cell(60, 7, f"{key}:", align="L")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(0, 0, 0)
        self.cell(0, 7, str(value), new_x="LMARGIN", new_y="NEXT")

    def add_risk_badge(self, score, level):
        self.set_font("Helvetica", "B", 12)
        if level == "High Risk":
            self.set_text_color(231, 76, 60)  # Red
        elif level == "Medium Risk":
            self.set_text_color(243, 156, 18)  # Orange
        else:
            self.set_text_color(39, 174, 96)  # Green
        self.cell(0, 10, f"Risk Score: {score}/100 - {level}", new_x="LMARGIN", new_y="NEXT", align="C")
        self.set_text_color(0, 0, 0)
        self.ln(5)

    def add_bullet_list(self, items, bullet_char="-"):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(0, 0, 0)
        for item in items:
            text = f"  {bullet_char} {item}"
            self.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")


def generate_scan_report(scan_data: dict, explanation_data: dict = None, 
                         salary_data: dict = None, company_data: dict = None) -> str:
    """
    Generate a comprehensive PDF report for a job scan analysis.
    
    Returns the file path of the generated PDF.
    """
    pdf = ScamReportPDF()
    pdf.alias_nb_pages()
    pdf.add_page()

    # --- Overview ---
    pdf.section_title("Scan Overview")
    pdf.add_key_value("URL", scan_data.get("url", "N/A"))
    pdf.add_key_value("Job Title", scan_data.get("job_title", "N/A"))
    pdf.add_key_value("Company", scan_data.get("company_name", "N/A"))
    pdf.add_key_value("Scan Date", datetime.now().strftime("%B %d, %Y at %I:%M %p"))
    pdf.ln(5)

    # --- Risk Score ---
    pdf.section_title("Risk Assessment")
    score = scan_data.get("risk_score", 0)
    level = scan_data.get("risk_level", "Unknown")
    pdf.add_risk_badge(score, level)

    pdf.add_key_value("NLP Score", f"{scan_data.get('nlp_score', 0):.1f}%")
    pdf.add_key_value("Salary Score", f"{scan_data.get('salary_score', 0):.1f}%")
    pdf.add_key_value("Domain Score", f"{scan_data.get('domain_score', 0):.1f}%")
    pdf.ln(5)

    # --- Explainable AI Section ---
    if explanation_data:
        pdf.section_title("AI Explanation (Why This Score?)")
        pdf.add_key_value("Prediction", explanation_data.get("prediction", "N/A").upper())
        pdf.add_key_value("Confidence", f"{explanation_data.get('confidence', 0)}%")
        pdf.ln(3)

        if explanation_data.get("top_scam_indicators"):
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 7, "Top Scam Indicators:", new_x="LMARGIN", new_y="NEXT")
            messages = [f["message"] for f in explanation_data["top_scam_indicators"][:5]]
            pdf.add_bullet_list(messages)
            pdf.ln(3)

        if explanation_data.get("top_legit_indicators"):
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 7, "Legitimacy Indicators:", new_x="LMARGIN", new_y="NEXT")
            messages = [f["message"] for f in explanation_data["top_legit_indicators"][:5]]
            pdf.add_bullet_list(messages)
            pdf.ln(3)

        if explanation_data.get("red_flags"):
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(231, 76, 60)
            pdf.cell(0, 7, "Red Flags Detected:", new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)
            messages = [f"{f['message']} (Severity: {f['severity']})" for f in explanation_data["red_flags"]]
            pdf.add_bullet_list(messages, bullet_char="!")
        pdf.ln(5)

    # --- Salary Analysis ---
    if salary_data:
        pdf.section_title("Salary Analysis")
        pdf.add_key_value("Salary Provided", salary_data.get("salary_provided", "N/A"))
        pdf.add_key_value("Detected Role", salary_data.get("detected_role", "N/A"))
        pdf.add_key_value("Anomaly Level", salary_data.get("anomaly_level", "N/A").replace("_", " ").title())
        if salary_data.get("analysis"):
            pdf.add_bullet_list(salary_data["analysis"])
        pdf.ln(5)

    # --- Company Trust Score ---
    if company_data:
        pdf.section_title("Company Reputation")
        pdf.add_key_value("Company", company_data.get("company_name", "N/A"))
        pdf.add_key_value("Trust Score", f"{company_data.get('trust_score', 0)}/100")
        pdf.add_key_value("Trust Level", company_data.get("trust_level", "N/A").title())

        if company_data.get("details"):
            pdf.ln(2)
            messages = [d["message"] for d in company_data["details"]]
            pdf.add_bullet_list(messages)
        pdf.ln(5)

    # --- Disclaimer ---
    pdf.section_title("Disclaimer")
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(128, 128, 128)
    pdf.multi_cell(0, 5,
        "This report is generated by an AI-based system and is intended for informational purposes only. "
        "The analysis is based on machine learning models and heuristic rules, which may not capture all "
        "nuances of job posting legitimacy. Always conduct your own research before applying to any job. "
        "The creators of this tool are not responsible for any decisions made based on this report."
    )

    # Save PDF
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"scan_report_{timestamp}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    pdf.output(filepath)

    return filepath


def generate_resume_match_report(resume_data: dict, match_data: dict, job_url: str = None) -> str:
    """Generate a PDF report for resume-job matching analysis."""
    pdf = ScamReportPDF()
    pdf.alias_nb_pages()
    pdf.add_page()

    # --- Header ---
    pdf.section_title("Resume-Job Match Analysis")
    if job_url:
        pdf.add_key_value("Job URL", job_url[:80])
    pdf.add_key_value("Match Score", f"{match_data.get('match_score', 0)}%")
    pdf.add_key_value("ATS Score", f"{match_data.get('ats_score', {}).get('score', 0)}%")
    pdf.add_key_value("Skills Matched", f"{match_data.get('matching_skills_count', 0)}/{match_data.get('total_job_skills', 0)}")
    pdf.ln(5)

    # --- Strengths ---
    if match_data.get("strengths"):
        pdf.section_title("Your Strengths")
        messages = [s["message"] for s in match_data["strengths"]]
        pdf.add_bullet_list(messages)
        pdf.ln(5)

    # --- Weaknesses ---
    if match_data.get("weaknesses"):
        pdf.section_title("Areas to Improve")
        messages = [w["message"] for w in match_data["weaknesses"][:10]]
        pdf.add_bullet_list(messages)
        pdf.ln(5)

    # --- Training Roadmap ---
    if match_data.get("training_roadmap"):
        pdf.section_title("Personalized Training Roadmap")
        for step in match_data["training_roadmap"]:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 7, f"{step['week']} - Learn {step['skill'].title()} ({step['priority'].upper()} priority)", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 9)
            pdf.cell(0, 6, f"  Goal: {step['goal']}", new_x="LMARGIN", new_y="NEXT")
            if step.get("resources"):
                for resource in step["resources"]:
                    pdf.cell(0, 6, f"    - {resource['title']} ({resource['platform']})", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)
        pdf.ln(3)

    # --- ATS Feedback ---
    if match_data.get("ats_score", {}).get("feedback"):
        pdf.section_title("ATS Optimization Tips")
        for tip in match_data["ats_score"]["feedback"]:
            prefix = "+" if tip["type"] == "good" else ("!" if tip["type"] == "error" else "-")
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 6, f"  {prefix} {tip['message']}", new_x="LMARGIN", new_y="NEXT")

    # Save
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"match_report_{timestamp}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)
    pdf.output(filepath)

    return filepath
