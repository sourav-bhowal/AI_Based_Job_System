import joblib
import os

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

# Function to predict scam probability
def predict_scam(text: str):
    """Predict the probability of a job posting being a scam."""
    load_model()
    # Preprocess and vectorize the input text
    X = vectorizer.transform([text])
    # Predict the probability of being a scam
    prob = model.predict_proba(X)[0][1]
    return prob