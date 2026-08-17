"""Evidence-inspired labeling rules. These are heuristics, not clinical ground truth."""

from __future__ import annotations


def bmr_mifflin(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if gender == "male" else base - 161


ACTIVITY = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "heavy": 1.725,
    "athlete": 1.9,
}


def tdee(bmr: float, activity: str) -> float:
    return bmr * ACTIVITY.get(activity, 1.55)


def recommend_strategy(row: dict) -> tuple[str, str, int]:
    goal = row["goal"]
    bf = float(row["body_fat"])
    gender = row["gender"]
    exp = row["experience"]
    sleep = float(row.get("sleep_hours", 7))
    stress = row.get("stress", "medium")

    high_bf = bf >= (22 if gender == "male" else 32)
    lean = bf <= (12 if gender == "male" else 20)
    strategy = "maintenance"
    reason = ""
    confidence = 82

    if goal == "fat_loss":
        if high_bf and exp != "beginner":
            strategy, reason, confidence = "aggressive_cut", "Higher body fat allows a larger but still bounded deficit.", 88
        else:
            strategy, reason, confidence = "cut", "Moderate deficit preserves training quality.", 90
    elif goal == "muscle_gain":
        if high_bf:
            strategy, reason, confidence = "recomp", "Body fat is high for a surplus; recomp first.", 86
        else:
            strategy, reason, confidence = "lean_bulk", "Small surplus for muscle gain.", 92 if (lean or exp == "beginner") else 88
    elif goal == "recomposition":
        strategy, reason, confidence = "recomp", "Maintenance calories plus high protein.", 90
    elif goal in ("strength", "powerlifting"):
        strategy, reason, confidence = "strength", "Near-maintenance or small surplus for strength.", 87
    else:
        strategy, reason, confidence = ("cut" if high_bf else "maintenance"), "Performance goals need stable energy.", 80

    if sleep < 6 or stress == "high":
        if strategy == "aggressive_cut":
            strategy = "cut"
        confidence -= 8
        reason += " Recovery constraints keep the plan conservative."

    return strategy, reason.strip(), max(55, min(96, confidence))


def recommend_split(experience: str, days: int) -> tuple[str, str]:
    days = min(6, max(2, int(days)))
    if days <= 2:
        return "full_body", "Two days requires full-body frequency."
    if experience == "beginner":
        if days <= 3:
            return "full_body", "Beginners learn faster on full-body frequency."
        return "upper_lower", "Beginner 4+ days maps to upper/lower, not a bro split."
    if experience == "intermediate":
        if days == 3:
            return "ppl", "Three days maps to Push/Pull/Legs."
        if days == 4:
            return "upper_lower", "Four days is classic upper/lower."
        return "ppl_ul", "Five-plus days allows PPL plus specialization."
    if days <= 3:
        return "ppl", "Advanced 3-day PPL."
    if days == 4:
        return "upper_lower", "Advanced upper/lower."
    if days == 5:
        return "ppl_ul", "PPL plus extra upper/lower day."
    return "ppl", "Six days as 2x PPL."


def calorie_target(tdee_val: float, strategy: str, gender: str) -> int:
    mapping = {
        "lean_bulk": tdee_val + 250,
        "cut": tdee_val - 400,
        "aggressive_cut": tdee_val - 550,
        "recomp": tdee_val,
        "maintenance": tdee_val,
        "strength": tdee_val + 150,
    }
    floor = 1400 if gender == "female" else 1600
    return max(floor, round(mapping.get(strategy, tdee_val)))


def protein_target(weight_kg: float, strategy: str) -> dict:
    ranges = {
        "cut": (2.0, 2.4),
        "aggressive_cut": (2.0, 2.4),
        "lean_bulk": (1.6, 2.2),
        "strength": (1.8, 2.4),
    }
    lo, hi = ranges.get(strategy, (1.6, 2.2))
    mid = (lo + hi) / 2
    return {"target": round(weight_kg * mid), "min": round(weight_kg * lo), "max": round(weight_kg * hi)}


def weekly_sets(experience: str, strategy: str, duration: int, ratings: dict | None) -> dict:
    base = 10 if experience == "beginner" else 14 if experience == "intermediate" else 16
    if strategy in ("cut", "aggressive_cut"):
        base = max(8, base - 2)
    if duration <= 45:
        base = max(8, base - 2)
    if duration >= 90:
        base += 2
    ratings = ratings or {}
    out = {}
    for g in ("chest", "back", "shoulders", "arms", "legs", "core"):
        rating = int(ratings.get(g, 5))
        sets = base
        if rating <= 3:
            sets += 6
        elif rating <= 4:
            sets += 4
        elif rating >= 8:
            sets -= 4
        elif rating >= 7:
            sets -= 2
        if g == "core":
            sets = min(sets, 10)
        out[g] = max(6, min(20, sets))
    return out


def lagging(ratings: dict | None) -> list[str]:
    ratings = ratings or {}
    items = [(m, int(ratings.get(m, 5))) for m in ("chest", "back", "shoulders", "arms", "legs", "core")]
    return [m for m, s in sorted(items, key=lambda x: x[1]) if s <= 4]


def macros(calories: int, protein_g: int) -> dict:
    fat = round((calories * 0.25) / 9)
    carbs = max(0, round((calories - protein_g * 4 - fat * 9) / 4))
    return {"protein": protein_g, "carbs": carbs, "fat": fat}


def full_recommendation(payload: dict) -> dict:
    gender = payload.get("gender", "male")
    weight = float(payload.get("weightKg") or payload.get("weight_kg") or 70)
    height = float(payload.get("heightCm") or payload.get("height_cm") or 175)
    age = int(payload.get("age") or 25)
    activity = payload.get("activityLevel") or payload.get("activity") or "moderate"
    bmr = bmr_mifflin(weight, height, age, gender)
    tdee_val = tdee(bmr, activity)
    row = {
        "goal": payload.get("goal", "recomposition"),
        "body_fat": payload.get("bodyFatPercent") or payload.get("body_fat") or 18,
        "gender": gender,
        "experience": payload.get("experience", "beginner"),
        "sleep_hours": payload.get("sleepHours") or 7,
        "stress": payload.get("stressLevel") or "medium",
    }
    strategy, reason, confidence = recommend_strategy(row)
    split, split_reason = recommend_split(row["experience"], int(payload.get("daysPerWeek") or 4))
    calories = calorie_target(tdee_val, strategy, gender)
    protein = protein_target(weight, strategy)
    mac = macros(calories, protein["target"])
    ratings = payload.get("muscleRatings") or {}
    return {
        "strategy": strategy,
        "strategyLabel": strategy.replace("_", " ").title(),
        "strategyReason": reason,
        "confidence": confidence,
        "split": split,
        "splitLabel": split.replace("_", " ").upper() if split == "ppl" else split.replace("_", " / ").title(),
        "splitReason": split_reason,
        "calories": calories,
        "protein": protein["target"],
        "proteinMin": protein["min"],
        "proteinMax": protein["max"],
        "carbs": mac["carbs"],
        "fat": mac["fat"],
        "bmr": round(bmr),
        "tdee": round(tdee_val),
        "weeklySets": weekly_sets(row["experience"], strategy, int(payload.get("workoutDuration") or 60), ratings),
        "priorityMuscles": lagging(ratings),
        "source": "rules",
    }
