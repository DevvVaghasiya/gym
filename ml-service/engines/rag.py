from __future__ import annotations

import json
import os
import re
import unicodedata
from functools import lru_cache

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = os.path.dirname(os.path.dirname(__file__))
KB_PATH = os.path.join(ROOT, "data", "knowledge_base.json")

EMERGENCY = re.compile(
    r"chest pain|chest pressure|chest tightness|faint(?:ed|ing)?|passed out|"
    r"loss of consciousness|severe shortness of breath|can't breathe|cannot breathe|"
    r"sudden weakness|sudden confusion",
    re.I,
)
EATING_RISK = re.compile(r"starv|purge|laxative|anorex|bulimi|eating disorder|crash diet|under ?800|very low calorie|extreme calorie|rapid weight loss|lose weight (?:fast|quickly)|stop eating", re.I)
SELF_HARM_RISK = re.compile(r"self harm|self-harm|hurt myself|harm myself|suicid|kill myself|end my life", re.I)
MEDICAL_RISK = re.compile(r"sharp pain|severe pain|injur|fracture|dislocat|pregnan|surgery|medical condition|dizz(?:y|iness)|lightheaded|asthma|diabetes|hypertension|heart condition|kidney disease", re.I)
FOLLOW_UP = re.compile(r"what about tomorrow|what about that|how about that|can i replace that|replace it|what should i do next|and then|that one|those", re.I)
ALIASES = {
    "proten": "protein", "proteen": "protein", "protien": "protein", "protean": "protein",
    "calroies": "calories", "caleries": "calories", "workuot": "workout", "workot": "workout",
    "creatin": "creatine", "recovry": "recovery", "hydrtion": "hydration", "muslce": "muscle",
}


def normalize_query(query: str) -> str:
    text = unicodedata.normalize("NFKD", query).encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"\bwork\s+out\b", "workout", text)
    for misspelling, correction in ALIASES.items():
        text = re.sub(rf"\b{misspelling}\b", correction, text)
    return re.sub(r"[^a-z0-9\s]", " ", text).strip()


def is_safety_question(question: str) -> bool:
    return bool(EMERGENCY.search(question) or EATING_RISK.search(question) or MEDICAL_RISK.search(question))


@lru_cache(maxsize=1)
def _load():
    with open(KB_PATH, encoding="utf-8") as f:
        docs = json.load(f)["docs"]
        corpus = [
            f"{d['title']} {' '.join(d['tags'])} {' '.join(d.get('questions', []))} {d['content']} {d.get('portion_notes', '')}"
            for d in docs
        ]
    word_vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
    char_vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True)
    return docs, word_vectorizer, word_vectorizer.fit_transform(corpus), char_vectorizer, char_vectorizer.fit_transform(corpus)


def _question_match_boost(doc: dict, normalized_query: str) -> float:
    boost = 0.0
    query_terms = set(normalized_query.split())
    for question in doc.get("questions", []):
        normalized_question = normalize_query(question)
        if normalized_question == normalized_query:
            return 0.28
        if normalized_query in normalized_question or normalized_question in normalized_query:
            boost = max(boost, 0.2)
            continue
        if len(query_terms) >= 4:
            question_terms = set(normalized_question.split())
            overlap = len(query_terms & question_terms) / len(query_terms)
            if overlap >= 0.9:
                boost = max(boost, 0.16)
    return boost


def _rank_documents(query: str):
    docs, word_vectorizer, word_matrix, char_vectorizer, char_matrix = _load()
    normalized = normalize_query(query)
    if not normalized:
        return []
    word_scores = cosine_similarity(word_vectorizer.transform([normalized]), word_matrix)[0]
    char_scores = cosine_similarity(char_vectorizer.transform([normalized]), char_matrix)[0]
    scores = 0.72 * word_scores + 0.28 * char_scores
    detected_intent = detect_intent(normalized)
    query_terms = set(normalized.split())
    ranked = []
    for index, base_score in enumerate(scores):
        doc = docs[index]
        score = float(base_score)
        score += _question_match_boost(doc, normalized)
        if detected_intent != "general" and doc.get("intent") == detected_intent:
            score += 0.08
        topic_terms = set(re.split(r"[-_]", doc.get("topic", doc["id"])))
        if query_terms.intersection(topic_terms):
            score += 0.1
        ranked.append((index, score))
    ranked.sort(key=lambda item: item[1], reverse=True)
    return [(docs[index], float(score)) for index, score in ranked]


def retrieve(query: str, k: int = 3):
    return [doc for doc, score in _rank_documents(query)[:k] if score >= 0.075]


def detect_intent(question: str) -> str:
    s = normalize_query(question)
    if is_safety_question(s):
        return "safety"
    if re.search(r"miss(ed)?|skip|forgot|cram|make up|makeup", s) and re.search(
        r"workout|session|leg|gym|training day", s
    ):
        return "schedule_adjustment"
    if re.search(r"interval|hiit|cardio|running|treadmill|cycling|walk", s):
        return "exercise_advice"
    if re.search(r"replac|substitut|instead of|alternative|swap", s):
        return "substitution"
    if re.search(r"caffeine|coffee|energy drink|pre workout|supplement|creatine|whey|protein powder|vitamin", s):
        return "supplement_advice"
    if re.search(r"calorie|kcal|tdee|bmr|weight loss rate|lose weight", s):
        return "calculation"
    if re.search(r"protein", s) and re.search(r"how much|how many|target|grams|need|daily|per day|eat", s):
        return "calculation"
    if re.search(r"\b\d+\s*minute|short workout|little time|busy schedule|time efficient|quick workout|superset", s):
        return "planning"
    if re.search(r"split|ppl|upper.?lower|full body|routine|program|days per week", s):
        return "planning"
    if re.search(r"meal|food|breakfast|lunch|dinner|snack|eat before|eat after|diet|recipe", s):
        return "meal_planning"
    if re.search(r"water|hydrat", s):
        return "calculation"
    if re.search(r"sore|soreness|doms|muscle pain|stiff|tight|sleep|recover|rest day|deload", s):
        return "recovery_advice"
    if re.search(r"cardio|run|walk|bike|hiit|cycling|sets|reps|warm up|form|technique|progress", s):
        return "exercise_advice"
    return "general"


def _is_follow_up(question: str) -> bool:
    normalized = normalize_query(question)
    return bool(FOLLOW_UP.search(normalized) or (len(normalized.split()) <= 4 and re.search(r"\b(it|that|those|tomorrow)\b", normalized)))


def _previous_user_message(history: list[dict] | None) -> str | None:
    for message in reversed(history or []):
        if message.get("role") == "user" and str(message.get("content", "")).strip():
            return str(message["content"]).strip()
    return None


def _previous_assistant_message(history: list[dict] | None) -> str | None:
    for message in reversed(history or []):
        if message.get("role") == "assistant" and str(message.get("content", "")).strip():
            return str(message["content"]).strip()
    return None


def _conversation_profile(question: str, history: list[dict] | None, profile: dict | None) -> dict:
    context = dict(profile or {})
    previous_prompt = _previous_assistant_message(history) or ""
    if not context.get("weightKg"):
        match = re.search(r"\b(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|kilos?|kilograms?)\b", question, re.I)
        if not match and re.search(r"weight|kilograms?|\bkg\b", previous_prompt, re.I):
            match = re.fullmatch(r"\s*(\d{2,3}(?:[.,]\d+)?)\s*\.?\s*", question)
        if match:
            value = float(match.group(1).replace(",", "."))
            if 30 <= value <= 350:
                context["weightKg"] = value

    normalized = normalize_query(question)
    if not context.get("goal"):
        if re.search(r"muscle gain|build muscle|bulking|bulk", normalized):
            context["goal"] = "muscle_gain"
        elif re.search(r"fat loss|lose fat|weight loss|cutting|cut", normalized):
            context["goal"] = "fat_loss"
        elif re.search(r"maintain|maintenance", normalized):
            context["goal"] = "maintenance"
    if not context.get("foodPreference"):
        if "vegan" in normalized:
            context["foodPreference"] = "vegan"
        elif "vegetarian" in normalized or "veg" in normalized:
            context["foodPreference"] = "vegetarian"
        elif "eggetarian" in normalized:
            context["foodPreference"] = "eggetarian"
    return context


def answer(
    question: str,
    profile: dict | None,
    diet: dict | None,
    workout: dict | None,
    history: list[dict] | None = None,
    progress_entries: list[dict] | None = None,
    prs: list[dict] | None = None,
    today_water: float | None = None,
) -> dict:
    profile = _conversation_profile(question, history, profile)
    asked_intent = detect_intent(question)
    previous_assistant = _previous_assistant_message(history) or ""
    awaiting_profile_details = bool(re.search(r"current weight|main goal|food preference|days per week|available equipment", previous_assistant, re.I))
    history_question = _previous_user_message(history) if _is_follow_up(question) or awaiting_profile_details else None
    prior_docs = retrieve(history_question, k=1) if history_question else []
    search_question = f"{history_question} {question}" if history_question else question
    if asked_intent == "safety" or is_safety_question(search_question) or SELF_HARM_RISK.search(search_question):
        if EMERGENCY.search(search_question):
            text = "Stop exercising now. Chest pain or pressure, fainting, severe breathing trouble, or sudden confusion can be an emergency. Call your local emergency number or seek urgent medical care; do not continue the workout."
        elif SELF_HARM_RISK.search(search_question):
            text = "I'm sorry you're facing this. I can't help with self-harm, but your safety matters. If you might act on these thoughts now, call your local emergency number or go to an emergency department; if possible, stay with someone you trust. Contact a local crisis line or qualified mental-health professional for immediate support."
        elif EATING_RISK.search(search_question):
            text = "I can't help with starvation, purging, laxatives, or extreme restriction. You deserve support from a qualified healthcare professional or eating-disorder specialist. If you are in immediate danger, contact local emergency services or a crisis service now."
        else:
            text = "Stop the movement that causes sharp or severe pain. Dizziness means stop, sit or lie somewhere safe, and do not resume if it persists or returns. Please get medical advice for ongoing pain, dizziness, known conditions, pregnancy, or post-surgery exercise before continuing."
        safety_doc = next((doc for doc in _load()[0] if doc.get("topic") == "safety"), None)
        return {
            "answer": text,
            "intent": "safety",
            "topic": "safety",
            "category": "safety",
            "answerType": "safety_response",
            "safetyLevel": "high",
            "sources": [safety_doc["title"]] if safety_doc else ["Safety and medical limits"],
            "references": safety_doc.get("source", []) if safety_doc else [],
            "relatedTopics": safety_doc.get("related_topics", []) if safety_doc else [],
            "followUpQuestions": [],
            "usedPlanData": False,
        }

    ranked = _rank_documents(search_question)
    docs = [doc for doc, score in ranked if score >= 0.075][:4]
    if prior_docs and history_question:
        previous_doc = prior_docs[0]
        if not docs or previous_doc["id"] not in {doc["id"] for doc in docs}:
            docs.insert(0, previous_doc)
    if not docs:
        missing = ["Are you asking about training, nutrition, recovery, or a health concern?"]
        return {
            "answer": "I don't have a reliable match for that yet. I can help with training plans, exercise substitutions, nutrition targets, meals, recovery, and hydration. What goal or situation should I focus on?",
            "intent": "general_advice",
            "topic": None,
            "category": "general",
            "answerType": "clarification",
            "safetyLevel": "routine",
            "sources": [],
            "references": [],
            "relatedTopics": [],
            "followUpQuestions": missing,
            "usedPlanData": False,
        }

    all_docs = _load()[0]
    doc_by_id = {doc["id"]: doc for doc in all_docs}
    primary = prior_docs[0] if history_question and prior_docs else docs[0]
    topic = primary.get("topic", primary["id"])
    intent = asked_intent if asked_intent != "general" else primary.get("intent", "general_advice")
    related_ids = primary.get("related_topics", [])
    primary_score = next((score for doc, score in ranked if doc["id"] == primary["id"]), 1.0)
    scores_by_id = {doc["id"]: score for doc, score in ranked}
    related_docs = [
        doc_by_id[item]
        for item in related_ids
        if item in doc_by_id and scores_by_id.get(item, 0.0) >= max(0.1, primary_score * 0.55)
    ][:2]
    knowledge = " ".join([primary["content"]] + [doc["content"] for doc in related_docs])
    source_docs = [primary] + related_docs
    sources = list(dict.fromkeys(doc["title"] for doc in source_docs))
    references = list(dict.fromkeys(source for doc in source_docs for source in doc.get("source", [])))
    followups: list[str] = []
    used = bool(profile or diet or workout or progress_entries or prs or today_water is not None)
    weight = float((profile or {}).get("weightKg") or 0)
    goal = str((profile or {}).get("goal") or "").replace("_", " ")
    experience = str((profile or {}).get("experience") or "").replace("_", " ")
    training_days = (profile or {}).get("selectedWorkoutDays") or []
    days_per_week = (profile or {}).get("daysPerWeek")
    schedule = ", ".join(training_days) if training_days else (f"{days_per_week} days per week" if days_per_week else "your preferred schedule")

    if topic == "protein":
        if not weight:
            followups = ["What is your current weight?", "Is your main goal muscle gain, fat loss, or maintenance?", "What food preference should I use?"]
            text = "I can estimate a useful protein range from your body weight and goal. What is your current weight, and are you aiming to gain muscle, lose fat, or maintain?"
        else:
            target = float((diet or {}).get("protein") or (profile or {}).get("proteinTarget") or 0)
            low, high = round(weight * 1.6), round(weight * 2.2)
            target_text = f"Your saved plan sets {target:.0f} g/day" if target else f"A practical starting range for your {weight:g} kg body weight is about {low}-{high} g/day"
            preference = str((profile or {}).get("foodPreference") or "").lower()
            if preference in {"vegan", "jain"}:
                foods = "Affordable options include dal/beans, soya chunks, tofu, and other preferred plant proteins."
            elif preference in {"vegetarian", "eggetarian"}:
                foods = "Affordable options include dal, soya chunks, curd, tofu, paneer, and eggs if you eat them."
            else:
                foods = "Affordable options include eggs, dal, soya chunks, curd, and chicken; choose the foods that fit your preference and budget."
            portions = primary.get("portion_notes", "")
            related_guidance = " ".join(doc["content"] for doc in related_docs)
            text = f"{target_text}. That is a guide, not a mandatory number; your goal is {goal or 'not set'}. Spread protein over meals if convenient. {foods} {portions} {related_guidance}"
            if profile and not profile.get("goal"):
                followups = ["What is your main goal: muscle gain, fat loss, or maintenance?"]
    elif topic in {"calories-tdee", "weight-loss-rate", "body-recomposition"}:
        tdee = float((profile or {}).get("tdee") or 0)
        saved_calories = float((diet or {}).get("dailyCalories") or (profile or {}).get("dailyCalories") or 0)
        if saved_calories:
            text = f"Your saved plan is about {saved_calories:.0f} kcal/day. Treat it as a starting estimate and compare weekly weight trends, energy, and training over several weeks. {knowledge}"
        elif tdee and goal:
            if goal == "fat loss":
                estimate = round(tdee - 400)
                adjustment = "a modest deficit from estimated maintenance"
            elif goal == "muscle gain":
                estimate = round(tdee + 200)
                adjustment = "a modest surplus over estimated maintenance"
            else:
                estimate = round(tdee)
                adjustment = "near estimated maintenance"
            text = f"With your {goal} goal and estimated TDEE of {tdee:.0f} kcal, a reasonable starting estimate is about {estimate} kcal/day ({adjustment}). Monitor several weeks of trends and adjust gradually; this is not a medical prescription. {knowledge}"
        else:
            followups = ["What are your age, height, and current weight?", "What is your main goal and usual activity level?"]
            text = "I can estimate a starting calorie target, but I need your age, height, weight, activity level, and goal first. Estimates vary and are best checked against several weeks of progress."
    elif topic == "water":
        logged = today_water if today_water is not None else (profile or {}).get("todayWater")
        progress = f" You have logged {float(logged):.1f} L today." if isinstance(logged, (int, float)) else ""
        if weight:
            text = f"For your {weight:g} kg weight, body-weight formulas give only a rough starting estimate; thirst, heat, sweat, activity, and medical advice matter too.{progress} Avoid forcing large amounts quickly. {knowledge}"
        else:
            followups = ["What is your approximate weight and how hot or active is your day?"]
    elif topic == "missed-workout":
        if "tomorrow" in normalize_query(question) or (history_question and "tomorrow" in normalize_query(question)):
            text = f"If tomorrow is one of your planned training days ({schedule}), do the scheduled session and move the missed workout to your next open day if recovery allows. Don't stack two hard sessions or sacrifice rest. {knowledge}"
        else:
            text = f"Since your schedule is {schedule}, move the missed session to your next open day if you can recover, or skip the least important accessory work. Don't double the next workout. {knowledge}"
    elif topic in {"splits", "beginner-program", "time-efficient-workouts"}:
        current = (workout or {}).get("split") or (profile or {}).get("recommendedSplit")
        plan = f"Your saved split is {str(current).replace('_', ' ')}; you train {schedule}. " if current or days_per_week else ""
        background = f"Given your {experience} experience, " if experience else ""
        text = f"{plan}{background}{knowledge}"
        if not days_per_week and not (workout or {}).get("days"):
            followups = ["How many days each week can you train?", "What is your lifting experience and available equipment?"]
    elif topic in {"meal-timing", "indian-diet"}:
        target = ""
        if diet:
            target = f"Your saved daily plan targets about {diet.get('dailyCalories')} kcal and {diet.get('protein')} g protein. "
        elif not profile:
            followups = ["What food preference and cuisine do you prefer?", "Are you looking for one meal or a full day of meals?"]
        text = f"{target}{knowledge} Portion sizes and calories vary by recipe and oil; use your saved plan as a guide rather than treating these examples as exact prescriptions."
    elif topic in {"food-subs-veg"}:
        target = f"Your saved plan targets {diet.get('protein')} g protein/day. " if diet and diet.get("protein") else ""
        text = f"{target}{knowledge}"
        if not re.search(r"paneer|tofu|chicken|fish|egg|dal|soya|food|meal", normalize_query(question)):
            followups = ["Which food or ingredient do you want to replace?", "Should I keep the swap vegetarian, vegan, or non-vegetarian?"]
    elif topic in {"caffeine", "supplements"}:
        text = knowledge
        if re.search(r"medication|medicine|kidney|pregnan|heart condition", normalize_query(question)):
            text += " Because you mentioned a medication or health condition, check with a clinician or pharmacist before using supplements or stimulants."
            followups = ["What product and medication or condition are you asking about? A pharmacist can check for interactions."]
    elif topic == "cardio":
        plan = f"With your {experience} experience and {schedule}, adjust cardio volume to your recovery and lifting performance. " if profile else ""
        text = plan + knowledge
    elif topic in {"recovery", "deload", "rest-days", "soreness", "mobility-stretching", "training-consistency"}:
        text = knowledge
        if profile and diet and diet.get("protein"):
            text += f" Your current plan targets {diet.get('protein')} g protein/day; prioritize that alongside sleep and recoverable training."
    elif topic in {"progressive-overload", "training-plateau", "progress-tracking", "training-volume", "warmup", "rep-ranges", "rest-between-sets", "exercise-order", "training-technique", "core-training"}:
        context = f"For your {experience} experience and {schedule}, " if profile else ""
        text = context + knowledge
        latest_pr = (prs or [])[-1] if prs else None
        if topic == "progress-tracking" and latest_pr:
            text += f" Your latest logged PR is {latest_pr.get('exerciseName', 'an exercise')} at {latest_pr.get('weight')} kg for {latest_pr.get('reps')} reps."
    elif topic in {"exercise-subs-chest", "exercise-subs-squat", "exercise-subs-deadlift", "home-workouts", "exercise-selection"}:
        equipment = (profile or {}).get("availableEquipment") or []
        equipment_text = f" Your available equipment includes {', '.join(equipment)}." if equipment else ""
        text = f"{knowledge}{equipment_text}"
        if _is_follow_up(question) and history_question and not re.search(r"bench|squat|deadlift|exercise|machine|dumbbell|barbell", normalize_query(history_question)):
            followups = ["Which exercise do you want to replace?", "What equipment do you have available?"]
    else:
        summary = ""
        if profile:
            summary = f"For your {goal or 'fitness'} goal at {weight:g} kg, with {experience or 'unspecified'} experience and {schedule}: "
        text = summary + knowledge
        followups = primary.get("follow_up_questions", [])[:2]

    if not text.strip():
        text = knowledge or "Could you add a little more detail about the training or nutrition question?"
    return {
        "answer": text.strip(),
        "intent": intent,
        "topic": topic,
        "category": primary.get("category", "general"),
        "answerType": primary.get("answer_type", "general_advice"),
        "safetyLevel": primary.get("safety_level", "routine"),
        "sources": sources,
        "references": references,
        "relatedTopics": related_ids,
        "followUpQuestions": followups,
        "usedPlanData": used,
    }
