"""Generate a labeled dataset from the same expert heuristics used at inference.

Labels are rule-derived (ISSN/ACSM-inspired ranges), not claimed as clinician ground truth.
"""
from __future__ import annotations

import os
import random
import sys
import json

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import pandas as pd

from engines.rules import recommend_split, recommend_strategy

ROOT = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(ROOT)
OUT = os.path.join(ROOT, "data", "training_data.csv")
COACH_OUT = os.path.join(ROOT, "data", "coach_questions.csv")
USER_DATA_OUT = os.path.join(PROJECT_ROOT, "gym_user_dataset_5000.csv")

GOALS = ["fat_loss", "muscle_gain", "recomposition", "strength", "athletic", "endurance", "powerlifting"]
EXPS = ["beginner", "intermediate", "advanced"]
ACT = ["sedentary", "light", "moderate", "heavy", "athlete"]
STRESS = ["low", "medium", "high"]
DIETS = ["Vegetarian", "Non-Vegetarian", "Vegan"]
SPLITS = [
    "Push Pull Legs",
    "Upper Lower",
    "Full Body",
    "Push Pull Legs + Accessories",
    "Upper Lower + Full Body",
]


def generate_signup_dataset(n: int = 5000, out_path: str = USER_DATA_OUT):
    random.seed(42)
    rows = []
    for _ in range(n):
        gender = random.choice(["Male", "Female"])
        age = random.randint(18, 55)
        height_cm = random.randint(150, 195)
        weight_kg = round(random.uniform(45, 110), 1)
        body_fat_percentage = round(random.uniform(8, 45), 1)
        activity_level = random.choice(["Low", "Light", "Moderate", "High", "Very High"])
        experience = random.choice(EXPS)
        goal = random.choice(["Muscle Gain", "Fat Loss", "Maintenance", "Recomposition"])
        workout_days = random.choice([3, 4, 5, 6])
        diet_preference = random.choice(DIETS)

        # Keep numerics consistent with common gym-user patterns
        if goal == "Fat Loss":
            calories = random.randint(1300, 2600)
            protein = random.randint(90, 180)
        elif goal == "Muscle Gain":
            calories = random.randint(2000, 4200)
            protein = random.randint(100, 210)
        elif goal == "Maintenance":
            calories = random.randint(1700, 3400)
            protein = random.randint(90, 170)
        else:
            calories = random.randint(1600, 3200)
            protein = random.randint(90, 180)

        carbs = random.randint(120, 650)
        fat = random.randint(35, 100)
        workout_split = random.choice(SPLITS)

        rows.append({
            "age": age,
            "gender": gender,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "body_fat_percentage": body_fat_percentage,
            "activity_level": activity_level,
            "experience": experience,
            "goal": goal,
            "workout_days": workout_days,
            "diet_preference": diet_preference,
            "calories": calories,
            "protein_g": protein,
            "carbs_g": carbs,
            "fat_g": fat,
            "workout_split": workout_split,
        })

    df = pd.DataFrame(rows)
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows to {out_path}")
    return df


def generate_coach_question_dataset(out_path: str = COACH_OUT):
    knowledge_path = os.path.join(ROOT, "data", "knowledge_base.json")
    with open(knowledge_path, encoding="utf-8") as file:
        docs = json.load(file)["docs"]

    rows = [
        {
            "question": question,
            "intent": doc["intent"],
            "topic": doc.get("topic", doc["id"]),
            "category": doc.get("category", "general"),
            "answer_type": doc.get("answer_type", "general_advice"),
            "safety_level": doc.get("safety_level", "routine"),
            "response": doc["content"],
        }
        for doc in docs
        for question in doc.get("questions", [])
    ]

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pd.DataFrame(rows).to_csv(out_path, index=False)
    print(f"Wrote {len(rows)} training rows to {out_path}")
    return rows


def main(n: int = 5000):
    generate_coach_question_dataset()
    generate_signup_dataset(n=n)

    random.seed(42)
    rows = []
    for _ in range(n):
        gender = random.choice(["male", "female"])
        age = random.randint(16, 55)
        height = random.randint(150, 195)
        weight = random.randint(45, 120)
        bf = round(random.uniform(8, 38), 1)
        muscle = round(random.uniform(25, 50), 1)
        exp = random.choice(EXPS)
        goal = random.choice(GOALS)
        days = random.choice([2, 3, 4, 5, 6])
        duration = random.choice([30, 45, 60, 90])
        activity = random.choice(ACT)
        sleep = round(random.uniform(5, 9), 1)
        stress = random.choice(STRESS)
        row = {
            "age": age,
            "gender": 1 if gender == "male" else 0,
            "height": height,
            "weight": weight,
            "body_fat": bf,
            "muscle_mass": muscle,
            "experience": EXPS.index(exp),
            "goal": GOALS.index(goal),
            "days": days,
            "duration": duration,
            "activity": ACT.index(activity),
            "sleep": sleep,
            "stress": STRESS.index(stress),
        }
        strategy, _, _ = recommend_strategy(
            {"goal": goal, "body_fat": bf, "gender": gender, "experience": exp, "sleep_hours": sleep, "stress": stress}
        )
        split, _ = recommend_split(exp, days)
        row["strategy"] = strategy
        row["split"] = split
        rows.append(row)

    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    pd.DataFrame(rows).to_csv(OUT, index=False)
    print(f"Wrote {len(rows)} rows to {OUT}")


if __name__ == "__main__":
    main()
