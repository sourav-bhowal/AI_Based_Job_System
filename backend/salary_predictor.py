"""
Salary Anomaly Predictor
=========================

Detects whether a job posting's salary is anomalous (too high, too low,
or suspiciously structured) for the given role and experience level.

Purely ML-Based Approach:
- Trains a Random Forest Regressor Pipeline on `synthetic_salary_dataset.csv`.
- Uses features: Position, YearsExperience, EducationLevel, Industry, Location.
- Predicts expected Salary in INR.
- Flags large deviations from the predicted ML average as anomalies.
"""

import re
import numpy as np
import os
import joblib

try:
    import pandas as pd
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.pipeline import Pipeline
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SALARY_MODEL_PATH = os.path.join(SCRIPT_DIR, "models", "salary_model.pkl")
CSV_PATH = os.path.join(SCRIPT_DIR, "data", "synthetic_salary_dataset.csv")

# Lazy-loaded RF model Pipeline
_salary_model = None


def _load_salary_model():
    """Lazy-load the trained salary model pipeline."""
    global _salary_model
    if _salary_model is None and os.path.exists(SALARY_MODEL_PATH):
        _salary_model = joblib.load(SALARY_MODEL_PATH)
    return _salary_model


def train_salary_model(csv_path: str = CSV_PATH):
    """
    Train a Random Forest Regressor Pipeline for salary prediction purely on the dataset.
    """
    if not HAS_SKLEARN:
        raise RuntimeError("scikit-learn and pandas are required. pip install scikit-learn pandas")
        
    global _salary_model
    
    print(f"Loading salary dataset from {csv_path}...")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")
        
    df = pd.read_csv(csv_path)
    print(f"  Total samples found: {len(df)}")
    
    # Expected columns: Position, YearsExperience, EducationLevel, Industry, Location, Salary(INR)
    target_col = "Salary(INR)" if "Salary(INR)" in df.columns else "salary"
    
    # Drop rows with missing targets
    df = df.dropna(subset=[target_col])
    
    X = df[["Position", "YearsExperience", "EducationLevel", "Industry", "Location"]]
    y = df[target_col].values
    
    # Build preprocessing pipeline
    categorical_features = ["Position", "EducationLevel", "Industry", "Location"]
    numeric_features = ["YearsExperience"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
        ]
    )
    
    # Build the full pipeline
    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_split=5, random_state=42, n_jobs=-1))
    ])
    
    print("Training ML ML Pipeline (Random Forest + Encoders)...")
    pipeline.fit(X, y)
    
    # Evaluate
    predictions = pipeline.predict(X)
    mae = np.mean(np.abs(predictions - y))
    r2 = pipeline.score(X, y)
    
    print(f"  MAE (INR): ₹{mae:,.0f}")
    print(f"  R² Score (Accuracy ≈): {r2 * 100:.2f}%")
    
    # Save model pipeline
    joblib.dump(pipeline, SALARY_MODEL_PATH)
    _salary_model = pipeline
    print(f"  Model saved to {SALARY_MODEL_PATH}")
    
    return {"mae": float(mae), "r2": float(r2), "samples": len(y)}


def _predict_with_rf(position: str, years_exp: float, education: str, industry: str, location: str) -> float:
    """Predict expected salary in INR using the trained ML pipeline."""
    model = _load_salary_model()
    if model is None:
        try:
            train_salary_model()
            model = _load_salary_model()
        except Exception:
            return None
    
    if model is None:
        return None
        
    # Create a single-row dataframe for the pipeline
    import pandas as pd
    input_df = pd.DataFrame([{
        "Position": position,
        "YearsExperience": years_exp,
        "EducationLevel": education,
        "Industry": industry,
        "Location": location
    }])
    
    prediction = model.predict(input_df)[0]
    return float(prediction)


def detect_currency(salary_str: str) -> str:
    """Detect currency from salary string."""
    if not salary_str:
        return "unknown"
    if "₹" in salary_str or "rs" in salary_str.lower() or "inr" in salary_str.lower() or "lpa" in salary_str.lower():
        return "INR"
    if "$" in salary_str or "usd" in salary_str.lower():
        return "USD"
    return "unknown"


def parse_salary_value(salary_str: str) -> tuple:
    """Parse salary string into numeric min, max values."""
    if not salary_str:
        return None, None
    
    # Handle LPA format
    if "lpa" in salary_str.lower() or "lakhs" in salary_str.lower():
        numbers = re.findall(r'(\d+(?:\.\d+)?)', salary_str)
        if len(numbers) >= 2:
            return float(numbers[0]) * 100000, float(numbers[1]) * 100000
        elif len(numbers) == 1:
            val = float(numbers[0]) * 100000
            return val, val
    
    # Remove currency symbols
    cleaned = re.sub(r'[$₹,]', '', salary_str)
    numbers = re.findall(r'\d+', cleaned)
    
    if len(numbers) >= 2:
        return int(numbers[0]), int(numbers[1])
    elif len(numbers) == 1:
        return int(numbers[0]), int(numbers[0])
    
    return None, None


def extract_features_from_text(job_text: str):
    """
    Extract mock or guessed features from raw job description text 
    if strictly structural fields aren't provided.
    """
    text_lower = job_text.lower()
    
    # 1. Experience
    years_exp = 2.0  # default mid-level
    if any(w in text_lower for w in ["senior", "lead", "principal", "8+ year", "10+ year"]):
        years_exp = 8.0
    elif any(w in text_lower for w in ["junior", "entry", "fresher", "0-1 year", "0-2 year", "intern"]):
        years_exp = 0.5
        
    # 2. Position
    position = "Software Engineer"
    if "data sci" in text_lower or "machine learning" in text_lower:
        position = "Data Scientist"
    elif "web dev" in text_lower or "frontend" in text_lower:
        position = "Web Developer"
    elif "devops" in text_lower or "sre" in text_lower:
        position = "DevOps Engineer"
    
    # 3. Education
    education = "Bachelors"
    if "phd" in text_lower or "doctorate" in text_lower:
        education = "PhD"
    elif "master" in text_lower or "msc" in text_lower:
        education = "Masters"
        
    # 4. Industry
    industry = "Technology"
    if "finance" in text_lower or "bank" in text_lower:
        industry = "Finance"
    elif "health" in text_lower or "medical" in text_lower:
        industry = "Healthcare"
        
    # 5. Location
    location = "Remote"
    if "onsite" in text_lower or "office" in text_lower:
        location = "On-site"
        
    return position, years_exp, education, industry, location


def extract_structured_features(job_text: str):
    """
    Extract specific structural features for post-prediction anomaly adjustments
    without polluting the ML base model inputs.
    """
    text_lower = job_text.lower()
    
    is_fresher = False
    if any(w in text_lower for w in ["junior", "entry", "fresher", "0-1 year", "0-2 year", "0 years", "0 to 1", "0 to 2", "0- 1"]):
        is_fresher = True
        
    job_type = "full-time"
    if "intern" in text_lower or "internship" in text_lower:
        job_type = "internship"
        is_fresher = True  # Internships are mostly entry level
        
    company_tier = "unknown"
    if any(w in text_lower for w in ["tcs", "infosys", "wipro", "cognizant", "accenture", "mass recruiter", "tech mahindra", "capgemini", "hcl", "ibm"]):
        company_tier = "mass_recruiter"
    elif "startup" in text_lower:
        company_tier = "startup"
        
    return {
        "is_fresher": is_fresher,
        "job_type": job_type,
        "company_tier": company_tier
    }


def predict_salary_anomaly(salary_str: str, job_text: str) -> dict:
    """
    Predict whether a salary is anomalous purely using the trained ML model.
    """
    currency = detect_currency(salary_str)
    min_sal, max_sal = parse_salary_value(salary_str)
    
    position, years_exp, education, industry, location = extract_features_from_text(job_text)
    
    result = {
        "salary_provided": salary_str,
        "detected_role": position,
        "currency": currency,
        "anomaly_score": 0.0,
        "anomaly_level": "normal",
        "analysis": [],
        "ml_prediction": None,
    }

    # Extract structured features for post-processing ONLY
    structured_features = extract_structured_features(job_text)

    # RF ML Prediction
    rf_predicted_inr = _predict_with_rf(position, years_exp, education, industry, location)
    
    avg_salary_temp = (min_sal + max_sal) / 2 if min_sal is not None else None
    
    if rf_predicted_inr:
        print(f"[DEBUG Salary ML] Base RF Prediction: ₹{rf_predicted_inr:,.0f}")
        print(f"[DEBUG Salary ML] Structured Features: {structured_features}")

        adjusted_inr = rf_predicted_inr

        is_missing = avg_salary_temp is None
        avg_salary_inr = avg_salary_temp
        if avg_salary_temp and currency == "USD":
            avg_salary_inr = avg_salary_temp * 83.0
            
        is_unrealistic = False
        if avg_salary_inr:
            if avg_salary_inr > 1200000 or avg_salary_inr > rf_predicted_inr * 2.5:
                is_unrealistic = True

        # Soft Corrections
        if structured_features["job_type"] == "internship":
            if is_missing or is_unrealistic:
                adjusted_inr *= 0.7
                print(f"[DEBUG Salary ML] Applied Internship Correction (x0.7)")
            else:
                pass
        elif structured_features["is_fresher"]:
            if is_missing or is_unrealistic:
                adjusted_inr *= 0.85
                print(f"[DEBUG Salary ML] Applied Fresher Correction (x0.85)")
            else:
                pass

        # Company Tier as Weak Signal
        if structured_features["company_tier"] == "mass_recruiter":
            adjusted_inr = min(adjusted_inr, 500000.0)
            print(f"[DEBUG Salary ML] Applied Mass Recruiter Cap (Max 5 LPA)")

        # Salary Clamping for entry-level roles
        if structured_features["is_fresher"]:
            adjusted_inr = max(adjusted_inr, 250000.0)
            adjusted_inr = min(adjusted_inr, 1200000.0)
            print(f"[DEBUG Salary ML] Applied Entry-Level Clamping (2.5 LPA - 12 LPA)")

        print(f"[DEBUG Salary ML] Final Adjusted Prediction: ₹{adjusted_inr:,.0f}")

        # Convert prediction to USD if requested salary is in USD
        prediction_val = adjusted_inr / 83.0 if currency == "USD" else adjusted_inr
        
        result["ml_prediction"] = {
            "predicted_salary": round(prediction_val, 0),
            "model": "Random Forest Regressor + Post-Processing",
            "inferred_experience_years": years_exp,
            "inferred_education": education,
            "base_rf_prediction": round(rf_predicted_inr, 0),
        }

    if min_sal is None:
        result["anomaly_score"] = 0.3
        result["anomaly_level"] = "suspicious"
        result["analysis"].append("No salary information provided — slightly suspicious")
        return result

    avg_salary = (min_sal + max_sal) / 2
    anomaly_score = 0.0

    # ML-based deviation check (Primary mechanism)
    if rf_predicted_inr and avg_salary > 0:
        prediction_val = adjusted_inr / 83.0 if currency == "USD" else adjusted_inr
        deviation = abs(avg_salary - prediction_val) / prediction_val
        
        is_reasonable_range = (currency == "INR" and 200000 <= avg_salary <= 1200000)
        
        # 1. Way above market rate (scam indicator)
        if avg_salary > prediction_val * 2.5:
            if is_reasonable_range and structured_features["is_fresher"]:
                anomaly_score += 0.2
                result["analysis"].append("Salary is above prediction but within reasonable entry-level bounds (2-12 LPA)")
            else:
                anomaly_score += 0.6
                result["analysis"].append(f"Salary is more than 2.5x the expected adjusted rate ({currency} {prediction_val:,.0f}) — strong scam indicator")
        elif avg_salary > prediction_val * 1.8:
            if is_reasonable_range and structured_features["is_fresher"]:
                anomaly_score += 0.1
                result["analysis"].append("Salary is slightly above prediction, but plausible for entry-level")
            else:
                anomaly_score += 0.4
                result["analysis"].append("Salary is significantly above expected market rate — highly suspicious")
            
        # 2. Too low (exploitative)
        elif avg_salary < prediction_val * 0.4:
            if structured_features["is_fresher"] and avg_salary > 100000 and currency == "INR":
                anomaly_score += 0.1
                result["analysis"].append("Salary is lower than prediction, but within plausible bounds for entry level. Model uncertainty flagged.")
            else:
                anomaly_score += 0.3
                result["analysis"].append("Salary is unusually low compared to expected prediction — may be exploitative")
            
        # General deviation notice
        threshold = 0.5
        if structured_features["job_type"] == "internship":
            threshold = 0.65
        elif structured_features["is_fresher"]:
            threshold = 0.6
            
        if deviation > threshold and anomaly_score < 0.3:
            if structured_features["is_fresher"] and 100000 <= avg_salary <= 400000 and currency == "INR":
                result["analysis"].append("Model deviation ignored due to standard entry-level salary bounds.")
            else:
                anomaly_score += 0.2
                result["analysis"].append(f"Salary deviates {deviation:.0%} from expected value — unusual")
            
        result["ml_prediction"]["deviation_percent"] = round(deviation * 100, 1)

    # Secondary heuristic checks
    if max_sal and min_sal and max_sal > min_sal:
        salary_range = max_sal - min_sal
        if salary_range > avg_salary: # e.g. 10k - 50k (range 40k, avg 30k)
            anomaly_score += 0.2
            result["analysis"].append("Very wide salary range spread — vague postings are a red flag")

    if avg_salary >= 2000000 and avg_salary % 1000000 == 0:
        anomaly_score += 0.05
        result["analysis"].append("Suspiciously round salary numbers")

    if not result["analysis"]:
        result["analysis"].append("Salary is within normal expected ML range")

    anomaly_score = min(anomaly_score, 1.0)
    result["anomaly_score"] = round(anomaly_score, 2)

    if anomaly_score < 0.2:
        result["anomaly_level"] = "normal"
    elif anomaly_score < 0.4:
        result["anomaly_level"] = "slightly_suspicious"
    elif anomaly_score < 0.6:
        result["anomaly_level"] = "suspicious"
    else:
        result["anomaly_level"] = "highly_suspicious"

    return result

if __name__ == "__main__":
    train_salary_model()
