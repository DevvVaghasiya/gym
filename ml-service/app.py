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
from pydantic import BaseModel, Field

# Keep the default signup flow offline and fast. The full FitCoach model should only be
# loaded when the environment explicitly enables it.
allow_fitcoach = os.environ.get("FITCOACH_ENABLE", "false").strip().lower() in {"1", "true", "yes", "on"}

if allow_fitcoach:
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except Exception:  # pragma: no cover
        AutoModelForCausalLM = None
        AutoTokenizer = None
        torch = None
else:
    AutoModelForCausalLM = None
    AutoTokenizer = None
    torch = None

from engines.rag import answer as rag_answer
from engines.rules import full_recommendation

ROOT = os.path.dirname(__file__)
MODEL_DIR = os.path.join(ROOT, "models")
FEATURES = ["age", "gender", "height", "weight", "body_fat", "experience", "goal", "days", "activity"]
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
protein_model = None
calories_model = None
coach_intent_model = None
coach_intent_vectorizer = None
fitcoach_model = None
fitcoach_tokenizer = None

try:
    strategy_model = joblib.load(os.path.join(MODEL_DIR, "strategy_model.joblib"))
    split_model = joblib.load(os.path.join(MODEL_DIR, "split_model.joblib"))
    protein_model = joblib.load(os.path.join(MODEL_DIR, "protein_model.joblib"))
    calories_model = joblib.load(os.path.join(MODEL_DIR, "calories_model.joblib"))
    print("Loaded RandomForest models")
except Exception as exc:
    print("Models not loaded, using rule engine:", exc)

try:
    coach_intent_vectorizer = joblib.load(os.path.join(MODEL_DIR, "coach_intent_vectorizer.joblib"))
    coach_intent_model = joblib.load(os.path.join(MODEL_DIR, "coach_intent_model.joblib"))
    print("Loaded coach intent model")
except Exception as exc:
    print("Coach intent model not loaded yet:", exc)

if allow_fitcoach and AutoTokenizer is not None and AutoModelForCausalLM is not None and torch is not None:
    try:
        model_id = os.environ.get("FITCOACH_MODEL_ID", "Harsh-k-007/fitcoach-3b")
        fitcoach_tokenizer = AutoTokenizer.from_pretrained(model_id)
        try:
            fitcoach_tokenizer.pad_token = "<|finetune_right_pad_id|>"
        except Exception:
            if fitcoach_tokenizer.pad_token is None:
                fitcoach_tokenizer.pad_token = fitcoach_tokenizer.eos_token

        torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        fitcoach_model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=torch_dtype,
            device_map="auto" if torch.cuda.is_available() else None,
        )
        if not torch.cuda.is_available():
            fitcoach_model = fitcoach_model.to("cpu")
        fitcoach_model.eval()
        print(f"Loaded FitCoach model: {model_id}")
    except Exception as exc:
        print("FitCoach model not loaded:", exc)
        fitcoach_model = None
        fitcoach_tokenizer = None
else:
    print("FitCoach model disabled for default signup workflow; set FITCOACH_ENABLE=true to load it.")


class RecommendIn(BaseModel):
    model_config = {"extra": "allow"}


class ChatIn(BaseModel):
    message: str
    profile: dict[str, Any] | None = None
    workoutPlan: dict[str, Any] | None = None
    dietPlan: dict[str, Any] | None = None
    history: list[dict[str, Any]] = Field(default_factory=list)
    progressEntries: list[dict[str, Any]] = Field(default_factory=list)
    prs: list[dict[str, Any]] = Field(default_factory=list)
    todayWater: float | None = None


def feature_row(p: dict) -> pd.DataFrame:
    gender = str(p.get("gender", "male")).strip().lower()
    goal = str(p.get("goal") or "recomposition").strip().lower()
    experience = str(p.get("experience") or "beginner").strip().lower()
    activity = str(p.get("activityLevel") or p.get("activity") or "moderate").strip().lower()
    return pd.DataFrame([{
        "age": int(p.get("age") or 25),
        "gender": 1 if gender in {"male", "m"} else 0,
        "height": float(p.get("heightCm") or p.get("height") or 175),
        "weight": float(p.get("weightKg") or p.get("weight") or 70),
        "body_fat": float(p.get("bodyFatPercent") or p.get("body_fat") or 18),
        "experience": EXPS.index(experience) if experience in EXPS else 0,
        "goal": GOALS.index(goal) if goal in GOALS else 2,
        "days": int(p.get("daysPerWeek") or p.get("days") or 4),
        "activity": ACT.index(activity) if activity in ACT else 2,
    }], columns=FEATURES)


@app.get("/health")
def health():
    return {"ok": True, "models": bool(strategy_model and split_model)}


@app.post("/recommend")
def recommend(payload: RecommendIn):
    data = payload.model_dump()
    rec = full_recommendation(data)
    if strategy_model is not None and split_model is not None:
        x = feature_row(data)
        strategy_pred = str(strategy_model.predict(x)[0])
        split_pred = str(split_model.predict(x)[0])
        rec["strategy"] = strategy_pred
        rec["split"] = split_pred
        rec["source"] = "ml"
        rec["strategyLabel"] = rec["strategy"].replace("_", " ").title()
        rec["confidence"] = min(96, rec["confidence"] + 3)

        if protein_model is not None:
            protein_pred = float(protein_model.predict(x)[0])
            rec["protein"] = max(70, int(round(protein_pred)))
            rec["proteinMin"] = max(60, int(round(protein_pred * 0.9)))
            rec["proteinMax"] = max(rec["protein"], int(round(protein_pred * 1.15)))

        if calories_model is not None:
            calories_pred = float(calories_model.predict(x)[0])
            rec["calories"] = max(1400, int(round(calories_pred)))
            fat = max(30, round((rec["calories"] * 0.25) / 9))
            carbs = max(0, round((rec["calories"] - rec["protein"] * 4 - fat * 9) / 4))
            rec["fat"] = fat
            rec["carbs"] = carbs

    rec["workoutPlan"] = build_workout_plan_from_profile(data, rec.get("strategy", "lean_bulk"), rec.get("split", "upper_lower"))
    rec["dietPlan"] = build_diet_plan_from_profile(
        data,
        int(rec.get("calories") or 2200),
        int(rec.get("protein") or 120),
        int(rec.get("carbs") or 250),
        int(rec.get("fat") or 60),
    )
    return rec


def build_workout_plan_from_profile(profile: dict, strategy: str, split: str) -> dict:
    days = int(profile.get("daysPerWeek") or profile.get("days") or 4)
    workout_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][:days]
    exercises = [
        {"name": "Barbell Squat", "group": "legs", "sets": 4, "reps": 8},
        {"name": "Bench Press", "group": "chest", "sets": 4, "reps": 8},
        {"name": "Pull-Up", "group": "back", "sets": 4, "reps": 8},
        {"name": "Shoulder Press", "group": "shoulders", "sets": 3, "reps": 10},
        {"name": "Romanian Deadlift", "group": "hamstrings", "sets": 3, "reps": 8},
    ]
    return {
        "strategy": strategy,
        "split": split,
        "days": workout_days,
        "sessions": [
            {"day": day, "focus": f"{split.replace('_', ' ').title()} {strategy.replace('_', ' ').title()} session", "exercises": exercises}
            for day in workout_days
        ],
    }


def build_diet_plan_from_profile(profile: dict, calories: int, protein: int, carbs: int, fat: int) -> dict:
    meals = [
        {"time": "Breakfast", "name": "Oats + Eggs + Fruit", "protein": 30, "carbs": 50, "fat": 15},
        {"time": "Lunch", "name": "Chicken Rice Veg Bowl", "protein": 38, "carbs": 55, "fat": 18},
        {"time": "Snack", "name": "Greek Yogurt + Nuts", "protein": 25, "carbs": 20, "fat": 10},
        {"time": "Dinner", "name": "Paneer + Rice + Vegetables", "protein": 35, "carbs": 50, "fat": 17},
    ]
    return {
        "dailyCalories": calories,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "waterLiters": 2.5,
        "meals": meals,
        "supplements": [
            {"name": "Whey Protein", "dosage": "1 scoop", "timing": "post workout"},
            {"name": "Creatine", "dosage": "3-5g", "timing": "daily"},
        ],
    }


def generate_fitcoach_reply(
    message: str,
    profile: dict | None,
    diet_plan: dict | None,
    workout_plan: dict | None,
    history: list[dict] | None = None,
    progress_entries: list[dict] | None = None,
    prs: list[dict] | None = None,
    today_water: float | None = None,
):
    grounded = rag_answer(message, profile, diet_plan, workout_plan, history, progress_entries, prs, today_water)
    if grounded.get("intent") == "safety" or fitcoach_model is None or fitcoach_tokenizer is None:
        return grounded

    try:
        profile_summary = ""
        if profile:
            profile_summary = (
                f"User profile: {profile.get('goal', 'fitness')} goal, "
                f"{profile.get('weightKg', 0)} kg, "
                f"{profile.get('heightCm', 0)} cm, sleep {profile.get('sleepHours', 7)} hrs. "
            )

        diet_summary = ""
        if diet_plan:
            diet_summary = (
                f"Diet target: {diet_plan.get('dailyCalories')} kcal, "
                f"{diet_plan.get('protein')}g protein, {diet_plan.get('carbs')}g carbs, {diet_plan.get('fat')}g fat. "
            )

        workout_summary = ""
        if workout_plan:
            workout_summary = f"Workout split: {workout_plan.get('split', 'general')} . "

        progress_summary = ""
        if progress_entries:
            latest = progress_entries[-1]
            progress_summary = f"Latest logged weight: {latest.get('weightKg')} kg. "
        if prs:
            latest_pr = prs[-1]
            progress_summary += f"Recent PR: {latest_pr.get('exerciseName')} at {latest_pr.get('weight')} kg for {latest_pr.get('reps')} reps. "

        messages = [
            {"role": "system", "content": "You are FitCoach, a friendly fitness coach. Use the retrieved evidence and supplied user context; do not invent medical claims, numeric targets, or citations. Follow safety instructions and ask for missing details instead of guessing."},
            {"role": "system", "content": f"Grounded answer context: {grounded.get('answer')} References: {', '.join(grounded.get('references', []))}"},
        ]
        messages.extend(
            {"role": item.get("role"), "content": str(item.get("content", ""))[:1200]}
            for item in (history or [])[-6:]
            if item.get("role") in {"user", "assistant"} and item.get("content")
        )
        messages.append({"role": "user", "content": f"{profile_summary}{diet_summary}{workout_summary}{progress_summary}Question: {message}"})

        encoded = fitcoach_tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            return_tensors="pt",
        )
        input_ids = encoded["input_ids"] if isinstance(encoded, dict) else encoded
        input_ids = input_ids.to(fitcoach_model.device if hasattr(fitcoach_model, "device") else "cpu")

        output = fitcoach_model.generate(
            input_ids=input_ids,
            max_new_tokens=512,
            do_sample=True,
            temperature=0.3,
            top_p=0.9,
            pad_token_id=getattr(fitcoach_tokenizer, "pad_token_id", fitcoach_tokenizer.eos_token_id),
        )
        generated = fitcoach_tokenizer.decode(output[0][input_ids.shape[-1]:], skip_special_tokens=True).strip()
        if not generated:
            return grounded

        return {
            **grounded,
            "answer": generated,
            "usedPlanData": bool(profile or diet_plan or workout_plan or progress_entries or prs),
        }
    except Exception as exc:
        print("FitCoach generation failed:", exc)
        return grounded


@app.post("/chat")
def chat(payload: ChatIn):
    result = generate_fitcoach_reply(
        payload.message,
        payload.profile,
        payload.dietPlan,
        payload.workoutPlan,
        payload.history,
        payload.progressEntries,
        payload.prs,
        payload.todayWater,
    )

    if result.get("intent") == "general" and coach_intent_vectorizer is not None and coach_intent_model is not None:
        try:
            prediction = coach_intent_model.predict(coach_intent_vectorizer.transform([payload.message]))[0]
            result["intent"] = prediction
        except Exception:
            pass

    return result
