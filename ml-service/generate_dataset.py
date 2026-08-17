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
OUT = os.path.join(ROOT, "data", "training_data.csv")

GOALS = ["fat_loss", "muscle_gain", "recomposition", "strength", "athletic", "endurance", "powerlifting"]
EXPS = ["beginner", "intermediate", "advanced"]
ACT = ["sedentary", "light", "moderate", "heavy", "athlete"]
STRESS = ["low", "medium", "high"]


def main(n: int = 2500):
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
