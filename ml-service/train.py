from __future__ import annotations

import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

from generate_dataset import main as make_data

ROOT = os.path.dirname(__file__)
DATA = os.path.join(ROOT, "data", "training_data.csv")
MODEL_DIR = os.path.join(ROOT, "models")
FEATURES = ["age", "gender", "height", "weight", "body_fat", "muscle_mass", "experience", "goal", "days", "duration", "activity", "sleep", "stress"]


def train_one(df: pd.DataFrame, label: str, name: str):
    x = df[FEATURES]
    y = df[label]
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=180, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    acc = accuracy_score(y_test, pred)
    print(f"\n=== {name} accuracy: {acc:.3f} ===")
    print(classification_report(y_test, pred))
    path = os.path.join(MODEL_DIR, f"{name}.joblib")
    joblib.dump(model, path)
    print("saved", path)
    return model


def main():
    if not os.path.exists(DATA):
        make_data()
    os.makedirs(MODEL_DIR, exist_ok=True)
    df = pd.read_csv(DATA)
    train_one(df, "strategy", "strategy_model")
    train_one(df, "split", "split_model")


if __name__ == "__main__":
    main()
