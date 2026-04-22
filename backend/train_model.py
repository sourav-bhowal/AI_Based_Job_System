"""
Multi-Model Training Pipeline for Job Scam Detection.

Trains and compares 5 different ML models:
1. Logistic Regression
2. Random Forest  
3. Support Vector Machine (SVM)
4. Naive Bayes
5. XGBoost (Gradient Boosting)

Saves the best model and all metrics to the database.
"""

import pandas as pd
import scipy.sparse as sp
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report, accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix
)
import joblib
import os
import json
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def load_and_prepare_data():
    """Load dataset and prepare features."""
    csv_path = os.path.join(SCRIPT_DIR, "data", "fake_job_postings.csv")
    print(f"Loading data from: {csv_path}")
    df = pd.read_csv(csv_path)

    print(f"Dataset shape: {df.shape}")
    print(f"Label distribution:\n{df['fraudulent'].value_counts()}")

    # Combine all text fields
    text_columns = [
        'title', 'location', 'department', 'salary_range', 'company_profile',
        'description', 'requirements', 'benefits', 'employment_type',
        'required_experience', 'required_education', 'industry', 'function'
    ]

    def combine_text(row):
        parts = []
        for col in text_columns:
            if pd.notna(row[col]):
                parts.append(str(row[col]))
        return " ".join(parts)

    print("\nCombining text fields...")
    df["text"] = df.apply(combine_text, axis=1)

    return df


def train_all_models():
    """Train and compare all models. Returns metrics and best model info."""
    df = load_and_prepare_data()

    X_text = df["text"]
    X_struct = df[['telecommuting', 'has_company_logo', 'has_questions']].fillna(0).astype(int).values
    y = df["fraudulent"]

    # Split data
    X_train_txt, X_test_txt, X_train_str, X_test_str, y_train, y_test = train_test_split(
        X_text, X_struct, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\nTraining set: {len(X_train_txt)} | Test set: {len(X_test_txt)}")

    # Vectorize
    print("\nVectorizing text...")
    vectorizer = TfidfVectorizer(stop_words="english", max_features=5000, ngram_range=(1, 2))
    X_train_vec = vectorizer.fit_transform(X_train_txt)
    X_test_vec = vectorizer.transform(X_test_txt)
    
    # Combine features
    print("Combining structured and text features...")
    X_train_comb = sp.hstack([X_train_vec, X_train_str])
    X_test_comb = sp.hstack([X_test_vec, X_test_str])

    from imblearn.over_sampling import SMOTE
    print("\nApplying SMOTE strictly to training data to handle class imbalance...")
    smote = SMOTE(random_state=42)
    X_train_smote, y_train_smote = smote.fit_resample(X_train_comb, y_train)
    print(f"Original training shape: {X_train_comb.shape}, resampled shape: {X_train_smote.shape}")

    # Define models — class_weight="balanced" handles the 95:5 scam imbalance
    # CalibratedClassifierCV wraps LinearSVC to give proper predict_proba() support
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.ensemble import VotingClassifier

    lr = LogisticRegression(max_iter=1000, random_state=42, class_weight="balanced")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1, class_weight="balanced")
    svm = CalibratedClassifierCV(LinearSVC(max_iter=2000, random_state=42, class_weight="balanced"), cv=3)

    voting_clf = VotingClassifier(
        estimators=[('lr', lr), ('rf', rf), ('svm', svm)],
        voting='soft'
    )

    models = {
        "Logistic Regression": lr,
        "Random Forest": rf,
        "SVM (Linear)": svm,
        "Naive Bayes": MultinomialNB(),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
        "Ensemble (Voting)": voting_clf,
    }

    results = []
    best_f1 = 0
    best_model_name = None
    best_model = None

    for name, model in models.items():
        print(f"\n{'=' * 50}")
        print(f"Training: {name}")
        print(f"{'=' * 50}")

        import copy
        # Train base version to get before metrics
        base_model = copy.deepcopy(model)
        base_model.fit(X_train_comb, y_train)
        y_pred_base = base_model.predict(X_test_comb)
        f1_base = f1_score(y_test, y_pred_base, zero_division=0)
        rec_base = recall_score(y_test, y_pred_base, zero_division=0)

        # Train SMOTE version
        model.fit(X_train_smote, y_train_smote)
        
        # Predict using SMOTE model
        y_pred = model.predict(X_test_comb)

        # Calculate metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        cm = confusion_matrix(y_test, y_pred).tolist()

        print(f"--- SMOTE Comparison ({name}) ---")
        print(f"Base F1-Score: {f1_base * 100:.2f}% | Base Recall: {rec_base * 100:.2f}%")
        print(f"SMOTE F1-Score: {f1 * 100:.2f}% | SMOTE Recall: {rec * 100:.2f}%")
        print(f"Improvement: {(f1 - f1_base) * 100:.2f} Pts F1, {(rec - rec_base) * 100:.2f} Pts Recall")
        print("---------------------------------")

        print(f"\nFinal Detailed Metrics:")
        print(f"Accuracy: {acc * 100:.2f}%")
        print(f"Precision: {prec * 100:.2f}%")
        print(f"Recall: {rec * 100:.2f}%")
        print(f"F1-Score: {f1 * 100:.2f}%")
        print(f"\nConfusion Matrix:\n{cm}")
        print(f"\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=["Legitimate", "Scam"]))

        model_result = {
            "model_name": name,
            "accuracy": round(acc * 100, 2),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1_score": round(f1 * 100, 2),
            "confusion_matrix": cm,
            "training_samples": len(X_train_txt),
            "test_samples": len(X_test_txt),
            "trained_at": datetime.now().isoformat(),
        }
        results.append(model_result)

        # Track best model by F1 score (not accuracy — accuracy is misleading on imbalanced data)
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model = model

    # Save best model and vectorizer
    print(f"\n{'#' * 50}")
    print(f"BEST MODEL: {best_model_name} ({best_f1 * 100:.2f}% F1)")
    print(f"{'#' * 50}")

    model_path = os.path.join(SCRIPT_DIR, "models", "model.pkl")
    vectorizer_path = os.path.join(SCRIPT_DIR, "models", "vectorizer.pkl")

    joblib.dump(best_model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    print(f"Best model saved to: {model_path}")
    print(f"Vectorizer saved to: {vectorizer_path}")

    # Save all models for comparison access
    all_models_path = os.path.join(SCRIPT_DIR, "models", "all_models.pkl")
    joblib.dump({name: m for name, m in models.items()}, all_models_path)

    # Save metrics to JSON
    metrics_path = os.path.join(SCRIPT_DIR, "models", "model_metrics.json")
    metrics_data = {
        "best_model": best_model_name,
        "models": results,
        "vectorizer_features": vectorizer.max_features,
        "dataset_size": len(df),
        "trained_at": datetime.now().isoformat(),
    }
    with open(metrics_path, "w") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Metrics saved to: {metrics_path}")

    # Save metrics to database
    try:
        from database import get_db
        conn = get_db()
        for r in results:
            conn.execute(
                """INSERT INTO model_metrics 
                   (model_name, accuracy, precision_score, recall, f1_score, training_samples, test_samples)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (r["model_name"], r["accuracy"], r["precision"], r["recall"],
                 r["f1_score"], r["training_samples"], r["test_samples"])
            )
        conn.commit()
        conn.close()
        print("Metrics saved to database!")
    except Exception as e:
        print(f"Could not save to database: {e}")

    return metrics_data


if __name__ == "__main__":
    train_all_models()