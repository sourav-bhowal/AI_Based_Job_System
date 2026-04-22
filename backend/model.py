import joblib
import os
import math
import scipy.sparse as sp
import numpy as np

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Load the trained model and vectorizer
model_path = os.path.join(SCRIPT_DIR, "models", "model.pkl")
vectorizer_path = os.path.join(SCRIPT_DIR, "models", "vectorizer.pkl")

model = None
vectorizer = None

def load_model():
    """Load model and vectorizer if not already loaded."""
    global model, vectorizer
    if model is None or vectorizer is None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}. Please run train_model.py first.")
        model = joblib.load(model_path)
        vectorizer = joblib.load(vectorizer_path)


def get_model_objects():
    """Return the loaded model and vectorizer."""
    load_model()
    return model, vectorizer


def _sigmoid(value: float) -> float:
    """Convert a decision score to a pseudo-probability."""
    if value >= 0:
        z = math.exp(-value)
        return 1 / (1 + z)
    z = math.exp(value)
    return z / (1 + z)


def predict_probabilities(text: str, telecommuting: int = 0, has_company_logo: int = 0, has_questions: int = 0):
    """Return [legit_probability, scam_probability] for a text sample."""
    current_model, current_vectorizer = get_model_objects()
    X_text = current_vectorizer.transform([text])

    # Ensure backward compatibility: pad with extra features if the model expects them
    if hasattr(current_model, "n_features_in_") and current_model.n_features_in_ > X_text.shape[1]:
        extra = np.array([[telecommuting, has_company_logo, has_questions]])
        X = sp.hstack([X_text, extra])
    else:
        X = X_text

    if hasattr(current_model, "predict_proba"):
        probabilities = current_model.predict_proba(X)[0]
        return float(probabilities[0]), float(probabilities[1])

    if hasattr(current_model, "decision_function"):
        decision = current_model.decision_function(X)
        score = float(decision[0] if hasattr(decision, "__len__") else decision)
        scam_prob = _sigmoid(score)
        legit_prob = 1.0 - scam_prob
        return legit_prob, scam_prob

    prediction = current_model.predict(X)[0]
    scam_prob = 1.0 if int(prediction) == 1 else 0.0
    legit_prob = 1.0 - scam_prob
    return legit_prob, scam_prob

# Function to predict scam probability
def predict_scam(text: str, telecommuting: int = 0, has_company_logo: int = 0, has_questions: int = 0):
    """Predict the probability of a job posting being a scam."""
    _, scam_prob = predict_probabilities(text, telecommuting, has_company_logo, has_questions)
    return scam_prob