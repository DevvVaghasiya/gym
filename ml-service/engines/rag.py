from __future__ import annotations

import json
import os
import re
from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = os.path.dirname(os.path.dirname(__file__))
KB_PATH = os.path.join(ROOT, "data", "knowledge_base.json")

SAFETY = re.compile(r"starv|purge|laxative|anorex|bulimi|crash diet|under ?800", re.I)


@lru_cache(maxsize=1)
def _load():
    with open(KB_PATH, encoding="utf-8") as f:
        docs = json.load(f)["docs"]
    corpus = [f"{d['title']} {' '.join(d['tags'])} {d['content']}" for d in docs]
    vec = TfidfVectorizer(stop_words="english")
    matrix = vec.fit_transform(corpus)
    return docs, vec, matrix


def retrieve(query: str, k: int = 3):
    docs, vec, matrix = _load()
    q = vec.transform([query])
    scores = cosine_similarity(q, matrix)[0]
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    return [docs[i] for i, s in ranked[:k] if s > 0]


def detect_intent(q: str) -> str:
    s = q.lower()
    if SAFETY.search(s):
        return "safety"
    if re.search(r"miss(ed)?|skip|forgot", s) and re.search(r"workout|session|leg|gym", s):
        return "missed_workout"
    if re.search(r"replac|substitut|alternative", s) and re.search(r"paneer|dal|food|meal|chicken", s):
        return "substitute_food"
    if re.search(r"replac|substitut|alternative", s):
        return "substitute_exercise"
    if re.search(r"calorie|kcal|tdee|how much should i eat", s):
        return "calories"
    if "protein" in s:
        return "protein"
    if re.search(r"split|ppl|upper.?lower|full body", s):
        return "split"
    if re.search(r"water|hydrat", s):
        return "water"
    if re.search(r"sleep|recover|rest day", s):
        return "recovery"
    return "general"


def answer(question: str, profile: dict | None, diet: dict | None, workout: dict | None) -> dict:
    intent = detect_intent(question)
    if intent == "safety":
        return {
            "answer": "I cannot help with crash dieting, starvation, purging, or eating-disorder behaviours. FitAI is educational, not a clinician. Please speak with a qualified professional.",
            "intent": "safety",
            "sources": ["Safety and medical limits"],
            "usedPlanData": False,
        }

    docs = retrieve(question)
    knowledge = " ".join(d["content"] for d in docs)
    sources = [d["title"] for d in docs]
    used = bool(profile)

    if intent == "calories" and profile and diet:
        text = (
            f"Based on your current plan, your target is approximately {diet.get('dailyCalories')} kcal/day. "
            f"BMR is {round(profile.get('bmr') or 0)} kcal and TDEE is {round(profile.get('tdee') or 0)} kcal, "
            f"adjusted for your {str(profile.get('goal', '')).replace('_', ' ')} goal. {knowledge} "
            "Treat this as a starting estimate to monitor, not a guarantee."
        )
        return {"answer": text, "intent": intent, "sources": sources, "usedPlanData": True}

    if intent == "protein" and profile and diet:
        w = float(profile.get("weightKg") or 70)
        p = float(diet.get("protein") or 0)
        text = (
            f"Your protein target is {p} g/day at {w} kg ({p / w:.1f} g/kg). "
            f"Spread it across your meals. {knowledge}"
        )
        return {"answer": text, "intent": intent, "sources": sources, "usedPlanData": True}

    if intent == "missed_workout":
        extra = ""
        if profile:
            extra = f" You currently train {profile.get('daysPerWeek')} days/week."
        text = (
            "Don't try to double the entire workout tomorrow. Shift the remaining week and keep recovery."
            + extra
            + " "
            + knowledge
        )
        return {"answer": text, "intent": intent, "sources": sources or ["Missed workouts"], "usedPlanData": used}

    if intent == "substitute_exercise":
        text = (
            "Yes. Depending on equipment you can use a dumbbell, machine, cable, or bodyweight variation "
            "while keeping similar weekly sets and effort. " + knowledge
        )
        return {"answer": text, "intent": intent, "sources": sources, "usedPlanData": used}

    if intent == "substitute_food" and diet:
        text = (
            f"Yes. Keep your daily protein target of {diet.get('protein')} g in mind and swap for a similar protein source. "
            + knowledge
        )
        return {"answer": text, "intent": intent, "sources": sources, "usedPlanData": True}

    fallback = knowledge or "Ask about calories, protein, splits, substitutions, missed workouts, or recovery."
    plan = ""
    if profile:
        plan = (
            f"Profile: {profile.get('weightKg')} kg, goal {profile.get('goal')}, "
            f"strategy {profile.get('recommendedStrategy')}. "
        )
    return {
        "answer": f"{plan}{fallback} Educational guidance, not medical advice.",
        "intent": intent,
        "sources": sources,
        "usedPlanData": used,
    }
