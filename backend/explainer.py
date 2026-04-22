import numpy as np
import model as scam_model
import re
from ner_extractor import extract_job_entities
from ai_text_detector_bert import detect_ai_text
# from ai_text_detector import detect_ai_text


def explain_prediction(text: str, num_features: int = 10) -> dict:
    """
    Explain why a job posting was flagged as scam or legitimate.
    
    Uses model feature weights (TF-IDF coefficients) to identify 
    the most influential words in the prediction. This is a 
    model-intrinsic explanation method similar to LIME.
    
    Returns:
        dict with prediction, confidence, and top contributing features
    """
    current_model, current_vectorizer = scam_model.get_model_objects()

    # Get prediction
    X_text = current_vectorizer.transform([text])
    
    import scipy.sparse as sp
    if hasattr(current_model, "n_features_in_") and current_model.n_features_in_ > X_text.shape[1]:
        extra = np.zeros((1, current_model.n_features_in_ - X_text.shape[1]))
        X_pred = sp.hstack([X_text, extra])
    else:
        X_pred = X_text

    prediction = current_model.predict(X_pred)[0]
    legit_prob, scam_prob = scam_model.predict_probabilities(text)

    # Get feature names and their weights
    feature_names = current_vectorizer.get_feature_names_out()

    # Get model coefficients (for LogisticRegression)
    if hasattr(current_model, 'coef_'):
        coefficients = current_model.coef_[0][:X_text.shape[1]]
    else:
        # Fallback for non-linear models
        return {
            "prediction": "scam" if prediction == 1 else "legitimate",
            "scam_probability": round(float(scam_prob) * 100, 1),
            "legit_probability": round(float(legit_prob) * 100, 1),
            "explanation": "Model explanation not available for this model type",
            "top_features": [],
            "top_words": [],
            "scores": [],
        }

    # Get the TF-IDF values for this specific text
    tfidf_values = X_text.toarray()[0]

    # Calculate feature contributions: coefficient * tfidf_value
    contributions = coefficients * tfidf_values

    # Get non-zero contributions
    non_zero_mask = tfidf_values > 0
    active_indices = np.where(non_zero_mask)[0]

    if len(active_indices) == 0:
        return {
            "prediction": "scam" if prediction == 1 else "legitimate",
            "scam_probability": round(float(scam_prob) * 100, 1),
            "legit_probability": round(float(legit_prob) * 100, 1),
            "explanation": "No significant features found in the text",
            "top_features": [],
            "top_words": [],
            "scores": [],
        }

    # Sort by absolute contribution
    active_contributions = [(feature_names[i], contributions[i], tfidf_values[i]) for i in active_indices]
    active_contributions.sort(key=lambda x: abs(x[1]), reverse=True)

    # Top features pushing towards SCAM (positive coefficients)
    scam_indicators = []
    legit_indicators = []

    for word, contribution, tfidf in active_contributions[:num_features * 2]:
        feature_info = {
            "word": word,
            "contribution": round(float(contribution), 4),
            "tfidf_weight": round(float(tfidf), 4),
            "impact_percentage": round(abs(float(contribution)) / max(sum(abs(c) for _, c, _ in active_contributions[:50]), 1e-10) * 100, 1),
        }
        if contribution > 0:
            feature_info["direction"] = "scam"
            feature_info["message"] = f"'{word}' increased scam probability by {feature_info['impact_percentage']}%"
            scam_indicators.append(feature_info)
        else:
            feature_info["direction"] = "legitimate"
            feature_info["message"] = f"'{word}' decreased scam probability by {feature_info['impact_percentage']}%"
            legit_indicators.append(feature_info)

    # Additional red flags from text analysis
    red_flags = detect_red_flags(text)

    # NER-based entity analysis
    try:
        entity_data = extract_job_entities(text)
        entity_analysis = {
            "companies_found": entity_data.get("companies", []),
            "locations_found": entity_data.get("locations", []),
            "money_found": entity_data.get("money", []),
            "entity_count": entity_data.get("entity_count", 0),
        }
        # Add NER scam signals to red flags
        for signal in entity_data.get("scam_signals", []):
            red_flags.append({
                "flag": signal["signal"].replace("_", " ").title(),
                "severity": signal["severity"],
                "message": signal["message"],
            })
    except Exception:
        entity_analysis = {"companies_found": [], "locations_found": [], "money_found": [], "entity_count": 0}

    # AI-generated text detection
    try:
        ai_detection = detect_ai_text(text)
        if ai_detection.get("ai_probability", 0) > 60:
            red_flags.append({
                "flag": "AI-Generated Text",
                "severity": "medium",
                "message": f"Text appears to be AI-generated ({ai_detection['ai_probability']}% probability) — scammers increasingly use ChatGPT to create convincing fake postings",
            })
    except Exception:
        ai_detection = None

    top_words = [item["word"] for item in scam_indicators[:5]]
    scores = [item["contribution"] for item in scam_indicators[:5]]

    return {
        "prediction": "scam" if prediction == 1 else "legitimate",
        "scam_probability": round(float(scam_prob) * 100, 1),
        "legit_probability": round(float(legit_prob) * 100, 1),
        "confidence": round(float(max(scam_prob, legit_prob)) * 100, 1),
        "top_scam_indicators": scam_indicators[:num_features],
        "top_legit_indicators": legit_indicators[:num_features],
        "top_words": top_words,
        "scores": scores,
        "red_flags": red_flags,
        "entity_analysis": entity_analysis,
        "ai_detection": ai_detection,
        "total_features_analyzed": len(active_indices),
    }


def detect_red_flags(text: str) -> list:
    """Detect common scam red flags in job posting text."""
    flags = []
    text_lower = text.lower()

    red_flag_patterns = {
        "guaranteed_income": {
            "patterns": [r"guaranteed\s+(?:income|salary|earnings?)", r"earn\s+\$?\d+.*(?:per|/)\s*(?:day|week|hour)"],
            "severity": "high",
            "message": "Promises guaranteed income — a classic scam indicator"
        },
        "upfront_payment": {
            "patterns": [r"(?:pay|fee|charge|deposit)\s*(?:for|before)\s*(?:training|registration|kit|materials)", r"registration\s*fee", r"advance\s*(?:payment|fee)"],
            "severity": "critical",
            "message": "Asks for upfront payment — legitimate jobs never ask candidates to pay"
        },
        "personal_info_early": {
            "patterns": [r"(?:send|share|provide)\s*(?:your)?\s*(?:aadhaar|pan|passport|bank|ssn|social security)", r"bank\s*(?:account|details)"],
            "severity": "critical",
            "message": "Requests sensitive personal information — do not share before formal hiring"
        },
        "too_good": {
            "patterns": [r"no\s*(?:experience|qualification|skill)\s*(?:required|needed|necessary)", r"work\s*from\s*home.*earn"],
            "severity": "high",
            "message": "Claims no experience needed — unrealistic for most legitimate positions"
        },
        "urgency": {
            "patterns": [r"(?:apply|act|respond)\s*(?:now|immediately|today|asap|urgently)", r"limited\s*(?:spots|positions|openings|time)", r"offer\s*(?:expires?|ends?)"],
            "severity": "medium",
            "message": "Creates false urgency — pressure tactics are common in scams"
        },
        "vague_description": {
            "patterns": [r"(?:various|multiple|different)\s*(?:tasks?|activities|duties)"],
            "severity": "low",
            "message": "Vague job description — legitimate postings have specific requirements"
        },
        "whatsapp_only": {
            "patterns": [r"(?:contact|reach|call|message)\s*(?:us\s*)?(?:on|via|through)\s*whatsapp", r"whatsapp\s*(?:only|number|no\.?)"],
            "severity": "high",
            "message": "WhatsApp-only communication — legitimate companies use official email"
        },
        "generic_email": {
            "patterns": [r"(?:send|email|mail)\s*(?:your\s*)?(?:resume|cv)\s*(?:to|at)\s*\S+@(?:gmail|yahoo|hotmail)"],
            "severity": "medium",
            "message": "Uses free email service — legitimate companies have corporate email"
        },
    }

    for flag_name, flag_data in red_flag_patterns.items():
        for pattern in flag_data["patterns"]:
            if re.search(pattern, text_lower):
                flags.append({
                    "flag": flag_name.replace("_", " ").title(),
                    "severity": flag_data["severity"],
                    "message": flag_data["message"],
                })
                break  # Only add once per flag type

    return flags
