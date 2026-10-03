from __future__ import annotations

import json
import os
import re
from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = os.path.dirname(os.path.dirname(__file__))
KB_PATH = os.path.join(ROOT, "data", "knowledge_base.json")

SAFETY = re.compile(
    r"starv|purge|laxative|anorex|bulimi|crash diet|under ?800|"
    r"sharp pain|chest pain|severe pain|injur|fracture|dislocat|"
    r"pregnan|surgery|medical condition|doctor|self harm|suicid",
    re.I,
)


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
    if re.search(r"caffeine|coffee|energy drink|pre[- ]?workout", s):
        return "caffeine"
    if re.search(r"supplement|creatine|whey|protein powder|vitamin d|multivitamin", s):
        return "supplements"
    if re.search(r"sore|soreness|doms|muscle pain|stiff|tight", s):
        return "soreness"
    if re.search(r"meal timing|breakfast|lunch|dinner|snack|combo meal|whole day|full day|post[- ]?workout|pre[- ]?workout|what should i eat|what to eat|eat before|eat after|before and after training|food names|name some food|meal ideas|diet", s):
        return "meal_timing"
    if re.search(r"cardio|run|walk|bike|hiit|cycling", s):
        return "cardio"
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
            "answer": "Stop the activity if you have sharp, severe, chest, or injury-related pain, and seek urgent medical care for emergency symptoms. For medical conditions, pregnancy, surgery recovery, eating-disorder symptoms, or extreme dieting, use a qualified clinician rather than an app. I can still help with safe training and nutrition habits once you have appropriate medical guidance.",
            "intent": "safety",
            "sources": ["Safety and medical limits"],
            "usedPlanData": False,
        }

    docs = retrieve(question)
    preferred_ids = {
        "calories": "calories-tdee",
        "protein": "protein",
        "missed_workout": "missed-workout",
        "substitute_food": "food-subs-veg",
        "split": "splits",
        "recovery": "recovery",
        "water": "water",
        "supplements": "supplements",
    }
    all_docs, _, _ = _load()
    preferred = next((doc for doc in all_docs if doc["id"] == preferred_ids.get(intent)), None)
    knowledge = preferred["content"] if preferred else (docs[0]["content"] if intent != "general" and docs else "")
    if preferred:
        docs = [preferred] + [doc for doc in docs if doc["id"] != preferred["id"]]
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
            f"Your protein target is {p:.0f} g/day at {w:.1f} kg ({p / w:.1f} g/kg). "
            f"Spread it across your meals. {knowledge}"
        )
        return {"answer": text, "intent": intent, "sources": sources, "usedPlanData": True}

    if intent == "caffeine":
        text = "Caffeine is useful for training performance if you keep it moderate: ~3–6 mg/kg, about 30–90 minutes before training, and usually under 400 mg/day for most adults. Avoid taking it late in the evening if sleep matters for recovery."
        return {"answer": text, "intent": intent, "sources": ["Supplements"], "usedPlanData": used}

    if intent == "supplements":
        text = "Food first. Creatine monohydrate (3–5 g/day) is one of the best-supported choices, whey is helpful if you struggle to reach protein, and vitamin D is sensible only if you are deficient. Supplements do not replace a solid meal plan."
        return {"answer": text, "intent": intent, "sources": ["Supplements"], "usedPlanData": used}

    if intent == "soreness":
        text = "For soreness, keep the movement light, reduce volume on the same muscle group, and prioritize sleep, hydration, and protein. Severe soreness is a signal to back off, not push through."
        return {"answer": text, "intent": intent, "sources": ["Recovery, sleep and stress"], "usedPlanData": used}

    if intent == "recovery":
        goal = str((profile or {}).get("goal", "recomposition")).replace("_", " ")
        protein_target = diet.get("protein") if diet else "your protein target"
        text = (
            f"For recovery during your {goal} phase, build meals around protein, carbohydrates, fluids, and micronutrients. "
            f"Good options are eggs or Greek yogurt with oats and fruit, chicken/tofu/paneer with rice and vegetables, "
            f"and curd with banana after training. Aim for {protein_target} g protein daily, 7–9 hours of sleep, and enough food to support training."
        )
        return {"answer": text, "intent": intent, "sources": ["Recovery, sleep and stress", "Indian gym diet patterns"], "usedPlanData": used}

    if intent == "water":
        weight = float((profile or {}).get("weightKg") or 70)
        low = round(weight * 0.03, 1)
        high = round(weight * 0.035, 1)
        logged = (profile or {}).get("todayWater")
        progress = f" You have logged {logged:.1f} L today." if isinstance(logged, (int, float)) else ""
        text = f"Start around {low}–{high} L/day for your {weight:.0f} kg bodyweight, then add fluids during heat or hard training.{progress} Pale-straw urine is a useful check; do not force excessive water quickly."
        return {"answer": text, "intent": intent, "sources": ["Hydration"], "usedPlanData": used}

    if intent == "meal_timing":
        target = ""
        if diet:
            target = f"For your current {str((profile or {}).get('goal', 'fitness')).replace('_', ' ')} plan, start near {diet.get('dailyCalories')} kcal and {diet.get('protein')} g protein per day. "
        goal = str((profile or {}).get("goal", "recomposition"))
        if "whole day" in question.lower() or "full day" in question.lower() or "combo" in question.lower():
            text = target + "A complete day could be: breakfast of oats, eggs, and fruit; lunch of rice or roti with chicken, paneer, tofu, or dal plus vegetables; a snack of Greek yogurt or curd with fruit; and dinner of fish, paneer, tofu, or chicken with potatoes or rice and vegetables. Adjust portions to your calorie target."
        elif "breakfast" in question.lower():
            text = target + "For breakfast, choose one protein anchor such as eggs, Greek yogurt, paneer, tofu, or whey, then add oats or whole-grain toast and fruit. This keeps the meal filling and supports training without requiring a complicated recipe."
        elif "lunch" in question.lower():
            text = target + "For lunch, build a plate with a protein anchor such as chicken, fish, paneer, tofu, or dal, one portion of rice or roti, and two portions of vegetables. Add curd if you need more protein or volume."
        elif "dinner" in question.lower():
            text = target + "For dinner, use a lean protein such as fish, chicken, tofu, paneer, or dal with vegetables and a portion of rice, roti, or potatoes. Keep the portion that fits your remaining calories rather than skipping carbohydrates automatically."
        else:
            text = target + "Useful food choices for your goal are eggs, yogurt, paneer, tofu, dal, chicken or fish, rice, oats, fruit, and vegetables. Keep protein in every meal and place most carbs around training. The exact clock matters less than total calories, protein, and consistency."
        return {"answer": text, "intent": intent, "sources": ["Protein targets", "Indian gym diet patterns"], "usedPlanData": used}

    if intent == "cardio":
        text = "Use cardio to support recovery and body composition, not to destroy performance. 20–40 minutes of easy-to-moderate cardio 2–4 times per week often works well. Keep heavy lifting quality high and do not force long HIIT if your recovery is poor."
        return {"answer": text, "intent": intent, "sources": ["Weekly training volume"], "usedPlanData": used}

    if intent == "missed_workout":
        extra = ""
        if profile:
            extra = f" You currently train {profile.get('daysPerWeek')} days/week."
        text = (
            "Don't try to double the entire workout tomorrow. Shift the remaining week and keep recovery."
            + extra
            + ""
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

    fallback = knowledge or "Ask about calories, protein, splits, substitutions, missed workouts, recovery, caffeine, or cardio."
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
