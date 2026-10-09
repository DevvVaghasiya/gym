from __future__ import annotations

import os
import sys
import json

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

ROOT = os.path.dirname(__file__)
DATASET_CANDIDATES = [
    os.path.join(ROOT, "..", "gym_members_exercise_tracking_synthetic_data.csv"),
]
DATA = next((p for p in DATASET_CANDIDATES if os.path.exists(p)), DATASET_CANDIDATES[0])
MODEL_DIR = os.path.join(ROOT, "models")
COACH_DATASET = os.path.join(ROOT, "data", "knowledge_base.json")
FEATURES = ["age", "gender", "height", "weight", "body_fat", "experience", "goal", "days", "activity"]

GOAL_MAP = {
    "fat loss": 0,
    "fat_loss": 0,
    "muscle gain": 1,
    "muscle_gain": 1,
    "maintenance": 2,
    "maintain fitness": 2,
    "maintain_fitness": 2,
    "recomposition": 2,
    "strength": 3,
    "athletic": 4,
    "endurance": 5,
    "powerlifting": 6,
}
ACTIVITY_MAP = {
    "low": 0,
    "light": 1,
    "moderate": 2,
    "high": 3,
    "very high": 4,
    "very_high": 4,
    "sedentary": 0,
    "heavy": 3,
    "athlete": 4,
}
EXPERIENCE_MAP = {
    "beginner": 0,
    "intermediate": 1,
    "advanced": 2,
}
GENDER_MAP = {"male": 1, "m": 1, "female": 0, "f": 0}
EXERCISE_GOAL_MAP = {
    "strength": "strength",
    "cardio": "fat_loss",
    "hiit": "fat_loss",
    "yoga": "recomposition",
    "pilates": "recomposition",
    "mobility": "recomposition",
    "crossfit": "strength",
    "boxing": "fat_loss",
}
WORKOUT_TYPE_TO_STRATEGY = {
    "strength": "lean_bulk",
    "cardio": "cut",
    "hiit": "cut",
    "yoga": "recomp",
    "pilates": "recomp",
    "mobility": "recomp",
    "crossfit": "lean_bulk",
    "boxing": "cut",
}


def goal_code(value: str | None) -> int:
    if value is None:
        return GOAL_MAP.get("recomposition", 2)
    key = str(value).strip().lower().replace(" ", "_")
    if key in GOAL_MAP:
        return GOAL_MAP[key]
    return GOAL_MAP.get("recomposition", 2)


def normalize_split(value: str | None) -> str:
    if value is None:
        return "ppl"
    text = str(value).strip().lower()

    if "upper" in text and "lower" in text:
        return "upper_lower"
    if "push" in text and "pull" in text and "legs" in text:
        return "ppl"
    if "body part" in text or "bodypart" in text or "split" in text:
        return "ppl"
    if "full" in text and "body" in text:
        return "full_body"
    if "beginner full body" in text:
        return "full_body"
    if "upper lower" in text:
        return "upper_lower"
    if "full body" in text:
        return "full_body"
    if "ppl" in text:
        return "ppl"
    if "lower" in text and "upper" in text:
        return "upper_lower"
    if "upper" in text:
        return "upper_lower"
    return "ppl"


def _coerce_numeric_series(series: pd.Series, default: float = 0.0) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(default)


def load_signup_dataset(path: str = DATA) -> pd.DataFrame:
    df = pd.read_csv(path)
    columns = {str(c).strip().lower(): c for c in df.columns}

    if any(k in columns for k in ["workout_type", "gender", "age", "weight (kg)", "height (m)", "fat_percentage"]) or any(
        str(c).lower() in {"workout_type", "age", "gender", "weight (kg)", "height (m)", "fat_percentage"} for c in df.columns
    ):
        df = df.copy()
        df["gender"] = df.get("Gender", df.get("gender", "male")).astype(str).str.strip().str.lower().map(GENDER_MAP).fillna(1)
        height_col = next((c for c in df.columns if str(c).strip().lower() in {"height (m)", "height_m", "height", "height_cm"}), None)
        weight_col = next((c for c in df.columns if str(c).strip().lower() in {"weight (kg)", "weight_kg", "weight", "weight_kg"}), None)
        fat_col = next((c for c in df.columns if str(c).strip().lower() in {"fat_percentage", "body_fat", "body_fat_percentage", "fat %"}), None)
        age_col = next((c for c in df.columns if str(c).strip().lower() in {"age", "age_years"}), None)
        days_col = next((c for c in df.columns if str(c).strip().lower() in {"workout_frequency (days/week)", "days_per_week", "workout_days", "days"}), None)
        exp_col = next((c for c in df.columns if str(c).strip().lower() in {"experience_level", "experience", "fitness_level"}), None)
        workout_col = next((c for c in df.columns if str(c).strip().lower() in {"workout_type", "preferred_workout"}), None)

        df["height"] = _coerce_numeric_series(df[height_col], 170.0) if height_col else 170.0
        if "height" in df.columns and df["height"].max() < 3:
            df["height"] = df["height"] * 100
        df["weight"] = _coerce_numeric_series(df[weight_col], 70.0) if weight_col else 70.0
        df["body_fat"] = _coerce_numeric_series(df[fat_col], 22.0) if fat_col else 22.0
        df["age"] = _coerce_numeric_series(df[age_col], 28.0) if age_col else 28.0
        df["days"] = _coerce_numeric_series(df[days_col], 4.0).astype(int) if days_col else 4
        df["experience"] = df.get(exp_col, "intermediate") if exp_col else "intermediate"
        if df["experience"].dtype.kind in {"f", "i"}:
            df["experience"] = pd.to_numeric(df["experience"], errors="coerce").fillna(1).round().astype(int)
            df["experience"] = df["experience"].map({0: 0, 1: 1, 2: 2, 3: 2}).fillna(1)
        else:
            df["experience"] = df["experience"].astype(str).str.strip().str.lower().map(EXPERIENCE_MAP).fillna(1)

        workout_type = df.get(workout_col, "Strength") if workout_col else "Strength"
        workout_key = workout_type.astype(str).str.strip().str.lower()
        df["goal"] = workout_key.map(EXERCISE_GOAL_MAP).str.strip().str.lower().map(GOAL_MAP).fillna(GOAL_MAP.get("recomposition", 2))
        df["strategy"] = workout_key.map(WORKOUT_TYPE_TO_STRATEGY).fillna("recomp")
        df["split"] = df["days"].apply(lambda d: "full_body" if d <= 3 else "upper_lower" if d <= 5 else "ppl")
        df["workout_split"] = df["split"].map({"full_body": "Full Body", "upper_lower": "Upper Lower", "ppl": "Push Pull Legs"})
        df["activity"] = df.get("Avg_BPM", 120).fillna(120).astype(float).apply(lambda bpm: 0 if bpm < 100 else 1 if bpm < 130 else 2 if bpm < 150 else 3 if bpm < 170 else 4)
        df["protein_g"] = (df["weight"] * (1.8 if df["strategy"].eq("lean_bulk").any() else 1.6)).clip(lower=80)
        df["protein"] = df["protein_g"]
        df["calories"] = df.get("Calories_Burned", 2200).fillna(2200).astype(float)
        df["fat_g"] = (df["calories"] * 0.25 / 9).round(1)
        df["fat"] = df["fat_g"]
        df["diet_preference"] = "balanced"
        return df

    rename_map = {
        "height_cm": "height",
        "height": "height",
        "weight_kg": "weight",
        "weight": "weight",
        "body_fat_percentage": "body_fat",
        "body_fat": "body_fat",
        "activity_level": "activity",
        "fitness_level": "experience",
        "experience": "experience",
        "fitness_goal": "goal",
        "goal": "goal",
        "workout_days": "days",
        "workout_days_per_week": "days",
        "days_per_week": "days",
        "diet_preference": "diet_preference",
        "diet_type": "diet_preference",
        "daily_calories": "calories",
        "calories": "calories",
        "fats_g": "fat_g",
        "fat_g": "fat_g",
    }
    df = df.rename(columns=rename_map)
    df["gender"] = df["gender"].astype(str).str.strip().str.lower().map(GENDER_MAP).fillna(1)
    df["height"] = pd.to_numeric(df["height"], errors="coerce").fillna(170.0)
    df["weight"] = pd.to_numeric(df["weight"], errors="coerce").fillna(70.0)
    df["body_fat"] = pd.to_numeric(df["body_fat"], errors="coerce").fillna(22.0)
    df["age"] = pd.to_numeric(df["age"], errors="coerce").fillna(28)
    df["days"] = pd.to_numeric(df.get("days", 4), errors="coerce").fillna(4).astype(int)
    df["experience"] = df["experience"].astype(str).str.strip().str.lower().map(EXPERIENCE_MAP).fillna(1)
    df["goal"] = df["goal"].astype(str).str.strip().str.lower().map(GOAL_MAP).fillna(GOAL_MAP.get("recomposition", 2))
    df["activity"] = df["activity"].astype(str).str.strip().str.lower().map(ACTIVITY_MAP).fillna(2)
    df["diet_preference"] = df.get("diet_preference", "vegetarian").fillna("vegetarian").astype(str).str.strip().str.lower()
    df["workout_split"] = df.get("workout_split", "Push Pull Legs").fillna("Push Pull Legs").astype(str)
    df["split"] = df["workout_split"].map(normalize_split).fillna("ppl")
    if "strategy" not in df.columns:
        df["strategy"] = df.apply(lambda row: (
            "cut" if int(row["goal"]) == 0 and row["body_fat"] >= 22 else
            "lean_bulk" if int(row["goal"]) == 1 and row["body_fat"] < 22 else
            "recomp"
        ), axis=1)
    if "protein_g" in df.columns and "protein" not in df.columns:
        df["protein"] = df["protein_g"]
    if "calories" in df.columns and "calories" not in df.columns:
        df["calories"] = df["calories"]
    if "fat_g" in df.columns and "fat" not in df.columns:
        df["fat"] = df["fat_g"]
    return df


def signup_feature_row(profile: dict) -> pd.DataFrame:
    gender = str(profile.get("gender", "male")).strip().lower()
    goal = str(profile.get("goal") or "recomposition").strip().lower()
    activity = str(profile.get("activityLevel") or profile.get("activity") or "moderate").strip().lower()
    experience = str(profile.get("experience") or "beginner").strip().lower()
    return pd.DataFrame([{
        "age": int(profile.get("age") or 28),
        "gender": GENDER_MAP.get(gender, 1),
        "height": float(profile.get("heightCm") or profile.get("height") or 170),
        "weight": float(profile.get("weightKg") or profile.get("weight") or 70),
        "body_fat": float(profile.get("bodyFatPercent") or profile.get("body_fat") or 22),
        "experience": EXPERIENCE_MAP.get(experience, 1),
        "goal": goal_code(goal),
        "days": int(profile.get("daysPerWeek") or profile.get("days") or 4),
        "activity": ACTIVITY_MAP.get(activity, 2),
    }], columns=FEATURES)


def train_classifier(df: pd.DataFrame, label: str, name: str):
    x = df[FEATURES]
    y = df[label]
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=220, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    acc = accuracy_score(y_test, pred)
    print(f"\n=== {name} accuracy: {acc:.3f} ===")
    print(classification_report(y_test, pred, zero_division=0))
    path = os.path.join(MODEL_DIR, f"{name}.joblib")
    joblib.dump(model, path)
    print("saved", path)
    return model


def train_regressor(df: pd.DataFrame, label: str, name: str):
    x = df[FEATURES]
    y = df[label]
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=220, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    mae = mean_absolute_error(y_test, pred)
    r2 = r2_score(y_test, pred)
    print(f"\n=== {name} MAE: {mae:.2f} | R2: {r2:.3f} ===")
    path = os.path.join(MODEL_DIR, f"{name}.joblib")
    joblib.dump(model, path)
    print("saved", path)
    return model


def load_coach_training_data(dataset_path: str = COACH_DATASET) -> pd.DataFrame:
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Coach dataset not found at {dataset_path}")

    with open(dataset_path, encoding="utf-8") as file:
        docs = json.load(file).get("docs", [])

    rows = [
        {"question": question.strip(), "intent": doc["intent"], "topic": doc.get("topic", doc["id"])}
        for doc in docs
        for question in doc.get("questions", [])
        if question.strip() and doc.get("intent")
    ]
    if not rows:
        raise ValueError("Coach dataset must contain question examples and intent labels.")
    return pd.DataFrame(rows)


def train_coach_intent_model(dataset_path: str = COACH_DATASET):
    df = load_coach_training_data(dataset_path)
    if df["intent"].nunique() < 2:
        print("Coach dataset needs at least two intent labels; skipping intent model training.")
        return None

    X_train, X_test, y_train, y_test = train_test_split(
        df["question"], df["intent"], test_size=0.25, random_state=42, stratify=df["intent"]
    )
    eval_vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    eval_model = LogisticRegression(max_iter=1000)
    eval_model.fit(eval_vectorizer.fit_transform(X_train), y_train)
    print(f"Coach intent holdout accuracy: {accuracy_score(y_test, eval_model.predict(eval_vectorizer.transform(X_test))):.3f}")

    X = df["question"]
    y = df["intent"]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    X_vec = vectorizer.fit_transform(X)
    model = LogisticRegression(max_iter=1000)
    model.fit(X_vec, y)

    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "coach_intent_vectorizer.joblib"))
    joblib.dump(model, os.path.join(MODEL_DIR, "coach_intent_model.joblib"))
    print(f"Saved coach intent model to {MODEL_DIR}")
    return model


def main():
    path = DATA if os.path.exists(DATA) else os.path.join(ROOT, "data", "training_data.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(f"No training dataset found at {path}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    df = load_signup_dataset(path)
    train_classifier(df, "strategy", "strategy_model")
    train_classifier(df, "split", "split_model")
    train_regressor(df, "protein_g", "protein_model")
    train_regressor(df, "calories", "calories_model")
    train_coach_intent_model()
    print("\nTraining complete using signup dataset:", path)


if __name__ == "__main__":
    main()
