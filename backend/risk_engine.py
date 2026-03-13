import whois
import re
from model import predict_scam

# Simple risk engine combining NLP, salary anomaly detection, and email domain risk
def parse_salary_range(salary_str):
    """Parse salary range string like '$55016-$100476' and return min, max values."""
    if not salary_str:
        return None, None
    
    # Handle string salary ranges
    if isinstance(salary_str, str):
        # Remove currency symbols and commas
        cleaned = re.sub(r'[$,₹]', '', salary_str)
        # Find all numbers
        numbers = re.findall(r'\d+', cleaned)
        if len(numbers) >= 2:
            return int(numbers[0]), int(numbers[1])
        elif len(numbers) == 1:
            return int(numbers[0]), int(numbers[0])
    elif isinstance(salary_str, (int, float)):
        return salary_str, salary_str
    
    return None, None

def salary_anomaly(salary):
    """Detect salary anomalies - unusually high salaries are red flags."""
    if not salary:
        return 0.3  # Missing salary is slightly suspicious
    
    min_sal, max_sal = parse_salary_range(salary)
    
    if min_sal is None:
        return 0.3
    
    # Very high salary ranges are suspicious (e.g., "Earn $5000/week")
    if max_sal and max_sal > 150000:
        return 0.7
    
    # Extremely wide salary ranges are suspicious
    if min_sal and max_sal and (max_sal - min_sal) > 80000:
        return 0.5
    
    # Normal salary range
    return 0.1

def domain_risk(email):
    if not email:
        return 0.5
    
    domain = email.split("@")[-1]

    if domain in ["gmail.com", "yahoo.com", "outlook.com"]:
        return 0.7

    try:
        w = whois.whois(domain)
        if w.creation_date:
            return 0.1
    except:
        return 0.8
    
    return 0.2

def compute_risk(description, salary, email):
    nlp_score = predict_scam(description)
    salary_score = salary_anomaly(salary)
    domain_score = domain_risk(email)

    final_score = (
        0.5 * nlp_score +
        0.3 * salary_score +
        0.2 * domain_score
    )

    return round(final_score * 100, 2)