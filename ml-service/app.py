from __future__ import annotations

import os
import sys
from typing import Any

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engines.rag import answer as rag_answer
from engines.rules import full_recommendation

ROOT = os.path.dirname(__file__)
MODEL_DIR = os.path.join(ROOT, "models")
FEATURES = ["age", "gender", "height", "weight", "body_fat", "muscle_mass", "experience", "goal", "days", "duration", "activity", "sleep", "stress"]
GOALS = ["fat_loss", "muscle_gain", "recomposition", "strength", "athletic", "endurance", "powerlifting"]
EXPS = ["beginner", "intermediate", "advanced"]
ACT = ["sedentary", "light", "moderate", "heavy", "athlete"]
STRESS = ["low", "medium", "high"]

app = FastAPI(title="FitAI ML Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

strategy_model = None
split_model = None
try:
    strategy_model = joblib.load(os.path.join(MODEL_DIR, "strategy_model.joblib"))
    split_model = joblib.load(os.path.join(MODEL_DIR, "split_model.joblib"))
    print("Loaded RandomForest models")
except Exception as exc:
    print("Models not loaded, using rule engine:", exc)


class RecommendIn(BaseModel):
    model_config = {"extra": "allow"}


class ChatIn(BaseModel):
    message: str
    profile: dict[str, Any] | None = None
    workoutPlan: dict[str, Any] | None = None
    dietPlan: dict[str, Any] | None = None


def feature_row(p: dict) -> pd.DataFrame:
    gender = p.get("gender", "male")
    return pd.DataFrame([{
        "age": int(p.get("age") or 25),
        "gender": 1 if gender == "male" else 0,
        "height": float(p.get("heightCm") or 175),
        "weight": float(p.get("weightKg") or 70),
        "body_fat": float(p.get("bodyFatPercent") or 18),
        "muscle_mass": float(p.get("muscleMassPercent") or 40),
        "experience": EXPS.index(p.get("experience", "beginner")) if p.get("experience") in EXPS else 0,
        "goal": GOALS.index(p.get("goal", "recomposition")) if p.get("goal") in GOALS else 2,
        "days": int(p.get("daysPerWeek") or 4),
        "duration": int(p.get("workoutDuration") or 60),
        "activity": ACT.index(p.get("activityLevel", "moderate")) if p.get("activityLevel") in ACT else 2,
        "sleep": float(p.get("sleepHours") or 7),
        "stress": STRESS.index(p.get("stressLevel", "medium")) if p.get("stressLevel") in STRESS else 1,
    }])


@app.get("/health")
def health():
    return {"ok": True, "models": bool(strategy_model and split_model)}


@app.post("/recommend")
def recommend(payload: RecommendIn):
    data = payload.model_dump()
    rec = full_recommendation(data)
    if strategy_model is not None and split_model is not None:
        x = feature_row(data)
        rec["strategy"] = str(strategy_model.predict(x)[0])
        rec["split"] = str(split_model.predict(x)[0])
        rec["source"] = "ml"
        rec["strategyLabel"] = rec["strategy"].replace("_", " ").title()
        rec["confidence"] = min(96, rec["confidence"] + 3)
    return rec


@app.post("/chat")
def chat(payload: ChatIn):
    return rag_answer(payload.message, payload.profile, payload.dietPlan, payload.workoutPlan)
