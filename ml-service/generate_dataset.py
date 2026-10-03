"""Generate a labeled dataset from the same expert heuristics used at inference.

Labels are rule-derived (ISSN/ACSM-inspired ranges), not claimed as clinician ground truth.
"""
from __future__ import annotations

import os
import random
import sys

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
    rows = [
        {"question": "How much caffeine can I take before a workout?", "intent": "caffeine", "response": "Use 3-6 mg/kg 30-90 minutes before training, and keep total intake under about 400 mg/day for most adults."},
        {"question": "I am sore after leg day, what should I do?", "intent": "soreness", "response": "Keep moving lightly, reduce the same muscle group's volume, and prioritize sleep, hydration, and protein."},
        {"question": "What should I eat before and after training?", "intent": "meal_timing", "response": "Use protein in every meal and keep most carbs around training. A pre or post workout meal with protein and carbs works best."},
        {"question": "Should I take creatine or whey?", "intent": "supplements", "response": "Creatine monohydrate is one of the best-supported supplements, and whey is useful if you struggle to hit protein goals."},
        {"question": "How much water should I drink daily?", "intent": "water", "response": "A simple rule is 30-35 mL per kg of bodyweight daily, plus more on hard training days or in heat."},
        {"question": "How do I choose a workout split?", "intent": "split", "response": "Beginners do well with full body or upper lower, while intermediate lifters often prefer push pull legs or upper lower."},
        {"question": "What is a good protein target for fat loss?", "intent": "protein", "response": "Aim roughly 1.8-2.2 g/kg bodyweight, and spread it across meals to preserve muscle while dieting."},
        {"question": "What should I eat for muscle gain?", "intent": "meal_timing", "response": "Use a calorie surplus, hit protein at every meal, and keep carbs around training for performance and recovery."},
        {"question": "I missed my leg workout, what do I do?", "intent": "missed_workout", "response": "Do not double the whole week. Shift the workout forward and keep recovery prioritized."},
        {"question": "Can I replace chicken with paneer?", "intent": "substitute_food", "response": "Yes, as long as you keep similar protein and total calories. Paneer, tofu, yogurt, dal, and soy are good protein swaps."},
        {"question": "What are good squat alternatives?", "intent": "substitute_exercise", "response": "Goblet squats, leg press, split squats, and hack squats are solid alternatives when technique or pain is an issue."},
        {"question": "How much cardio should I do?", "intent": "cardio", "response": "20-40 minutes of easy to moderate cardio 2-4 times per week is enough for most people, unless your goal is specifically aerobic performance."},
        {"question": "How do I recover faster from hard training?", "intent": "recovery", "response": "Get 7-9 hours of sleep, keep protein and water high, and use lighter sessions or deloads when stress is high."},
        {"question": "What calories should I eat?", "intent": "calories", "response": "Calories should start from maintenance and then adjust by 200-300 kcal for muscle gain or 300-500 for fat loss."},
        {"question": "Should I cut out caffeine while dieting?", "intent": "caffeine", "response": "No, not necessarily. Moderate caffeine can still support training and appetite control, but too much can disrupt sleep and recovery."},
        {"question": "I want to gain muscle but I am tired all the time, what should I do?", "intent": "recovery", "response": "Reduce extra volume, sleep more, and keep calories and protein consistent. Recovery is where growth happens."},
        {"question": "Can I train chest and shoulders on the same day?", "intent": "split", "response": "Yes, if you recover well. Many people do push days with chest, shoulders, and triceps while keeping total weekly volume in check."},
        {"question": "Should I do HIIT every day?", "intent": "cardio", "response": "No. HIIT is useful, but too much can reduce recovery and hurt strength training quality. Keep it limited and controlled."},
        {"question": "What is the best breakfast for fat loss?", "intent": "meal_timing", "response": "Eggs or Greek yogurt with fruit, oats, and protein is a strong option. The goal is a high-protein, filling breakfast you can repeat consistently."},
        {"question": "Should I replace whey with eggs?", "intent": "supplements", "response": "Yes, eggs and Greek yogurt can replace whey if they fit your protein target. Supplements are convenience, not necessity."},
        {"question": "Does more water help muscle growth?", "intent": "water", "response": "Hydration helps performance, concentration, and training quality. It is not magic, but being consistently hydrated supports recovery and effort."},
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
