"""
AI Text Generator Detector — BERT/Transformer Edition
======================================================

Uses a pretrained RoBERTa-based transformer model (via HuggingFace) for
significantly more accurate AI-generated text detection compared to the
TF-IDF + Random Forest approach in ai_text_detector.py.

Requires: torch, transformers

The detect_ai_text() function returns the exact same dict format as the
original ai_text_detector.py so it's a drop-in replacement.
"""

import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BERT_MODEL_DIR = os.path.join(SCRIPT_DIR, "models", "ai_detector_bert")
CSV_PATH = os.path.join(SCRIPT_DIR, "datasets", "AI_Human.csv")

DEFAULT_MODEL_NAME = "openai-community/roberta-base-openai-detector"

_detector_pipeline = None


def _load_detector():
    """Lazy-load the transformer-based AI text detector pipeline."""
    global _detector_pipeline
    if _detector_pipeline is not None:
        return _detector_pipeline

    import torch
    from transformers import pipeline as hf_pipeline

    local_model_exists = os.path.exists(os.path.join(BERT_MODEL_DIR, "config.json"))
    model_path = BERT_MODEL_DIR if local_model_exists else DEFAULT_MODEL_NAME

    device = 0 if torch.cuda.is_available() else -1

    _detector_pipeline = hf_pipeline(
        "text-classification",
        model=model_path,
        tokenizer=model_path,
        device=device,
        truncation=True,
        max_length=512,
    )
    return _detector_pipeline


def detect_ai_text(text: str) -> dict:
    """
    Detect AI-generated text using a pretrained transformer model.

    Returns the same dict structure as the original ai_text_detector.py:
        ai_probability, human_probability, verdict, confidence, method
    """
    try:
        detector = _load_detector()
    except Exception:
        # Graceful fallback to original TF-IDF detector if BERT fails
        from ai_text_detector import detect_ai_text as fallback_detect
        result = fallback_detect(text)
        result["method"] = "fallback_tfidf"
        return result

    result = detector(text[:2048])[0]
    label = result["label"]
    score = result["score"]

    # openai-community/roberta-base-openai-detector labels:
    #   LABEL_0 / Real  = Human-written
    #   LABEL_1 / Fake  = AI-generated
    if label in ("LABEL_1", "Fake", "AI"):
        ai_prob = score
        human_prob = 1.0 - score
    else:
        human_prob = score
        ai_prob = 1.0 - score

    if ai_prob >= 0.65:
        verdict = "likely_ai"
    elif ai_prob >= 0.40:
        verdict = "uncertain"
    else:
        verdict = "likely_human"

    return {
        "ai_probability": round(ai_prob * 100, 1),
        "human_probability": round(human_prob * 100, 1),
        "verdict": verdict,
        "confidence": round(max(ai_prob, human_prob) * 100, 1),
        "method": "bert_transformer",
    }


# ---------------------------------------------------------------------------
# Fine-tuning on your own AI_Human.csv dataset (optional, requires GPU)
# ---------------------------------------------------------------------------

def train_ai_detector_bert(csv_path: str = CSV_PATH, sample_size: int = 10000,
                           epochs: int = 3, batch_size: int = 16):
    """
    Fine-tune the pretrained RoBERTa detector on the local AI_Human.csv dataset.

    This saves the fine-tuned model into models/ai_detector_bert/ so that
    detect_ai_text() will automatically pick it up on next load.

    Args:
        csv_path:    Path to AI_Human.csv (columns: text, generated)
        sample_size: Rows to sample (default 10K — increase if you have GPU RAM)
        epochs:      Training epochs (3 is usually enough for fine-tuning)
        batch_size:  Per-device batch size (reduce to 8 if you run out of VRAM)
    """
    import pandas as pd
    import torch
    from torch.utils.data import Dataset as TorchDataset
    from transformers import (
        AutoTokenizer,
        AutoModelForSequenceClassification,
        Trainer,
        TrainingArguments,
    )
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, classification_report
    import numpy as np

    # --- 1. Load & sample dataset ---
    print(f"Loading dataset from: {csv_path}")
    df = pd.read_csv(csv_path)

    text_col = "text" if "text" in df.columns else "content_text"
    label_col = "generated" if "generated" in df.columns else "author_type"

    print(f"  Total samples: {len(df)}")
    if len(df) > sample_size:
        print(f"  Sampling to {sample_size} records...")
        df = df.sample(n=sample_size, random_state=42)

    texts = df[text_col].fillna("").tolist()
    labels = pd.to_numeric(df[label_col], errors="coerce").fillna(0).astype(int).tolist()

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )

    # --- 2. Tokenizer & model ---
    print(f"Loading pretrained model: {DEFAULT_MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(DEFAULT_MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(
        DEFAULT_MODEL_NAME, num_labels=2
    )

    class _TextDataset(TorchDataset):
        def __init__(self, texts, labels):
            self.texts = texts
            self.labels = labels

        def __len__(self):
            return len(self.labels)

        def __getitem__(self, idx):
            encoding = tokenizer(
                self.texts[idx],
                truncation=True,
                padding="max_length",
                max_length=512,
                return_tensors="pt",
            )
            item = {k: v.squeeze(0) for k, v in encoding.items()}
            item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
            return item

    train_dataset = _TextDataset(X_train, y_train)
    test_dataset = _TextDataset(X_test, y_test)

    # --- 3. Training ---
    device_str = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  Device: {device_str}")
    print(f"  Training: {len(train_dataset)} samples, Testing: {len(test_dataset)} samples")

    training_args = TrainingArguments(
        output_dir=BERT_MODEL_DIR,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        logging_steps=50,
        report_to="none",
    )

    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        preds = np.argmax(logits, axis=-1)
        acc = accuracy_score(labels, preds)
        return {"accuracy": acc}

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=test_dataset,
        compute_metrics=compute_metrics,
    )

    print("Starting fine-tuning...")
    trainer.train()

    # --- 4. Evaluate & save ---
    eval_result = trainer.evaluate()
    print(f"\nEval accuracy: {eval_result.get('eval_accuracy', 'N/A')}")

    trainer.save_model(BERT_MODEL_DIR)
    tokenizer.save_pretrained(BERT_MODEL_DIR)
    print(f"-> Fine-tuned model saved to: {BERT_MODEL_DIR}")

    # Invalidate cache so next detect_ai_text() call uses the new model
    global _detector_pipeline
    _detector_pipeline = None

    # Classification report on test set
    preds = trainer.predict(test_dataset)
    y_pred = np.argmax(preds.predictions, axis=-1)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Human", "AI-Generated"]))

    return {"accuracy": eval_result.get("eval_accuracy")}


if __name__ == "__main__":
    train_ai_detector_bert()
