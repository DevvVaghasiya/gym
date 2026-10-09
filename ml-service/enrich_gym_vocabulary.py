"""Add gym-related tags and user-style questions to the RAG knowledge base."""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
KB_PATH = os.path.join(ROOT, "data", "knowledge_base.json")

# Extra retrieval hooks: equipment, muscle groups, gym slang, Hinglish (romanized).
ENRICHMENTS: dict[str, dict[str, list[str]]] = {
    "calories-tdee": {
        "tags": [
            "gym diet", "cutting", "bulking", "lean bulk", "maintenance", "kcal",
            "macro tracking", "MyFitnessPal", "calorie counting", "weight cut",
            "fat loss calories", "muscle gain calories", "energy balance",
        ],
        "questions": [
            "Gym ke baad kitni calories khana chahiye?",
            "Cutting ke liye daily calories kitni honi chahiye?",
            "Bulk kar raha hoon kitna surplus theek hai?",
            "TDEE kya hota hai gym diet mein?",
            "Weight loss ke liye kitna calorie deficit safe hai?",
            "Maintenance calories kaise nikalu bodybuilding ke liye?",
            "Gym jane wale ko din mein kitni calories chahiye?",
            "BMR aur TDEE mein kya difference hai?",
            "Plateau pe calories badhaun ya kam karun?",
        ],
    },
    "protein": {
        "tags": [
            "whey", "protein shake", "gainer", "muscle protein", "amino acids",
            "chicken breast", "egg whites", "soya", "gym nutrition", "macros",
            "lean mass", "cutting protein", "bulking protein", "1g per lb",
        ],
        "questions": [
            "Gym wale ko din mein kitna protein chahiye?",
            "Protein kitne gram per kg body weight?",
            "Vegetarian gym diet mein protein kaise poora karun?",
            "Whey protein zaroori hai kya?",
            "Muscle banane ke liye protein kitna?",
            "Cutting mein protein badhana chahiye?",
            "Post workout protein kitni der mein leni chahiye?",
            "Paneer dal se protein target kaise hit karun?",
            "Protein shake gym se pehle ya baad mein?",
        ],
    },
    "missed-workout": {
        "tags": [
            "leg day", "skip gym", "no show", "schedule", "training week",
            "push pull legs", "double session", "make up workout", "rest day swap",
            "travel", "busy week", "gym skip",
        ],
        "questions": [
            "Aaj gym nahi ja paya kya karun?",
            "Leg day miss ho gaya kal kar lun?",
            "Do din gym skip kiya ab kya schedule?",
            "Ek workout miss se muscle loss hoga?",
            "Kal double workout kar sakta hoon?",
            "Weekend pe missed workout cover karun?",
            "Sick tha gym miss kiya restart kaise?",
            "Travel pe gym miss ho gaya routine kaise?",
        ],
    },
    "exercise-subs-chest": {
        "tags": [
            "pecs", "pectorals", "incline bench", "decline", "dumbbell fly",
            "cable crossover", "smith machine", "flat bench", "push day",
            "chest day", "hypertrophy chest", "barbell", "dumbbell press",
        ],
        "questions": [
            "Bench press ki jagah kya exercise karun?",
            "Chest workout without barbell?",
            "Dumbbell se chest kaise train karun?",
            "Push ups se bench press replace ho sakta hai?",
            "Gym mein bench busy hai chest ke liye alternative?",
            "Flat bench nahi hai kya karun chest ke liye?",
            "Incline dumbbell press theek substitute hai?",
            "Chest day mein barbell nahi mila swap kya?",
        ],
    },
    "food-subs-veg": {
        "tags": [
            "soya chunks", "besan chilla", "chole", "rajma", "sprouts",
            "peanut butter", "milk", "curd", "greek yogurt", "vegan protein",
            "non veg swap", "chicken alternative", "fish substitute",
        ],
        "questions": [
            "Chicken ki jagah vegetarian protein kya lun?",
            "Paneer substitute high protein veg?",
            "Gym diet mein soya chunks kitne?",
            "Tofu vs paneer protein gym ke liye?",
            "Dal chawal se protein target hit hoga?",
            "Vegan gym diet protein sources?",
            "Egg khata nahi protein kaise?",
            "Non veg band kiya protein kaise maintain?",
        ],
    },
    "splits": {
        "tags": [
            "push pull legs", "PPL", "upper lower", "bro split", "full body",
            "3 day split", "4 day split", "5 day split", "6 day split",
            "workout plan", "routine", "schedule", "muscle group frequency",
        ],
        "questions": [
            "Beginner ke liye best gym split kya hai?",
            "Week mein 4 din gym ka routine?",
            "Push pull legs Hindi mein samjhao?",
            "Upper lower vs PPL kaun better?",
            "3 din gym full body ya split?",
            "Chest back legs kaise divide karun?",
            "Muscle gain ke liye kaun sa split?",
            "2 din week gym possible routine?",
        ],
    },
    "progressive-overload": {
        "tags": [
            "add weight", "strength gain", "plateau", "linear progression",
            "double progression", "rep PR", "weight PR", "gym progress",
            "increment", "micro plates", "stalled lift",
        ],
        "questions": [
            "Weight badhate kaise gym mein?",
            "Same weight pe atak gaya kya karun?",
            "Progressive overload kya hai simple?",
            "Har week weight badhana chahiye?",
            "Reps badhaun ya weight?",
            "Squat bench deadlift progress kaise?",
            "Gym mein strength kaise badhe?",
            "Form break ho rahi weight kam karun?",
        ],
    },
    "recovery": {
        "tags": [
            "overtraining", "fatigue", "CNS", "muscle repair", "sleep hygiene",
            "cortisol", "rest day", "active recovery", "foam roll", "massage",
            "burnout", "gym tired",
        ],
        "questions": [
            "Gym ke baad bahut thakawat normal hai?",
            "Kitne ghante sone chahiye bodybuilding?",
            "Recovery slow kyun ho rahi?",
            "Stress se muscle gain affect?",
            "Overtraining ke signs kya hain?",
            "Legs heavy feel ho rahi rest lun?",
            "Sleep kam hai gym performance?",
            "Rest day lena zaroori hai kya?",
        ],
    },
    "indian-diet": {
        "tags": [
            "roti", "rice", "idli", "dosa", "paratha", "khichdi", "biryani",
            "home food", "tiffin", "mess food", "hostel diet", "budget gym diet",
            "desi diet", "north indian", "south indian",
        ],
        "questions": [
            "Indian home food se gym diet kaise?",
            "Roti chawal ke saath muscle gain?",
            "Hostel mein gym diet kaise manage?",
            "Vegetarian Indian gym meal plan simple?",
            "Ghar ka khana cutting mein chalega?",
            "Mess food gym ke goals ke saath?",
            "Desi diet mein protein kaise badhaun?",
            "Budget gym diet India?",
        ],
    },
    "safety": {
        "tags": [
            "injury", "emergency", "doctor", "medical advice", "red flag",
            "chest pain gym", "dizziness", "sharp pain", "stop training",
            "disclaimer", "physician",
        ],
        "questions": [
            "Workout ke dauran chest pain?",
            "Gym mein chakkar aaye kya karun?",
            "Sharp knee pain squat mein?",
            "Breathing problem exercise ke baad?",
            "Injury ke baad gym kab wapas?",
            "Pregnant gym kar sakti hoon?",
            "Heart problem gym safe?",
            "Bahut kam khana aur gym dangerous?",
        ],
    },
    "supplements": {
        "tags": [
            "creatine monohydrate", "pre workout", "bcaa", "multivitamin",
            "omega 3", "fish oil", "mass gainer", "fat burner", "zinc",
            "vitamin d", "electrolytes", "stack",
        ],
        "questions": [
            "Gym ke liye kaun se supplements chahiye?",
            "Creatine safe hai kya beginners?",
            "Whey vs mass gainer difference?",
            "Pre workout lena chahiye?",
            "BCAA zaroori hai?",
            "Fat burner use karun cutting mein?",
            "Creatine kitni dose daily?",
            "Supplements bina gym possible?",
        ],
    },
    "water": {
        "tags": [
            "hydration", "electrolytes", "sweat", "water intake", "liters",
            "dehydration", "workout fluids", "cramps",
        ],
        "questions": [
            "Gym mein din mein kitna pani?",
            "Workout ke dauran kitna water?",
            "Dehydration se performance?",
            "2 liter pani enough gym ke liye?",
            "Summer mein gym hydration?",
            "Muscle cramps pani ki kami?",
        ],
    },
    "carbs-fat": {
        "tags": [
            "carbohydrates", "fats", "macros split", "low carb", "high carb",
            "essential fats", "rice oats", "peanut butter fats", "keto gym",
        ],
        "questions": [
            "Gym diet mein carbs kitne?",
            "Fat loss mein carbs kam karun?",
            "Bulking mein carbs badhaun?",
            "Macros ratio muscle gain?",
            "Low carb gym performance?",
            "Healthy fats gym diet?",
            "Carbs pre workout important?",
        ],
    },
    "caffeine": {
        "tags": [
            "coffee", "pre workout stim", "energy", "espresso", "green tea",
            "caffeine tolerance", "sleep caffeine", "black coffee gym",
        ],
        "questions": [
            "Gym se pehle coffee theek hai?",
            "Pre workout aur coffee saath?",
            "Kitni caffeine safe gym?",
            "Caffeine se sleep kharab gym?",
            "Without pre workout energy kaise?",
            "Chai gym se pehle chalegi?",
        ],
    },
    "cardio": {
        "tags": [
            "running", "treadmill", "cycling", "HIIT", "LISS", "fat loss cardio",
            "heart rate", "steps", "stairmaster", "rowing", "conditioning",
        ],
        "questions": [
            "Muscle gain ke saath kitna cardio?",
            "Fat loss ke liye cardio kitni der?",
            "Cardio weights se pehle ya baad?",
            "HIIT vs steady state gym?",
            "Daily walking enough with lifting?",
            "Cardio se muscle loss hoga?",
            "Treadmill cutting routine?",
        ],
    },
    "soreness": {
        "tags": [
            "DOMS", "muscle soreness", "delayed onset", "legs sore", "biceps sore",
            "stretch sore", "foam rolling soreness", "second day pain",
        ],
        "questions": [
            "Gym ke next day body dard normal?",
            "DOMS kya hota hai?",
            "Legs bahut sore train karun?",
            "Muscle pain vs injury difference?",
            "Soreness kam kaise kare?",
            "Har workout ke baad dard normal?",
        ],
    },
    "meal-timing": {
        "tags": [
            "pre workout meal", "post workout meal", "fasted training",
            "intermittent fasting gym", "breakfast lifter", "night meal",
            "nutrient timing", "anabolic window",
        ],
        "questions": [
            "Gym se pehle kya khana?",
            "Post workout meal kitni der mein?",
            "Empty stomach gym safe?",
            "Intermittent fasting aur weight training?",
            "Raat ko gym dinner timing?",
            "Pre workout banana chalega?",
        ],
    },
    "training-volume": {
        "tags": [
            "sets per week", "hard sets", "MEV MRV", "volume landmarks",
            "junk volume", "effective reps", "training load", "hypertrophy volume",
        ],
        "questions": [
            "Chest ke liye week mein kitne sets?",
            "Volume zyada ho gaya signs?",
            "Muscle grow nahi ho raha sets badhaun?",
            "Beginner kitne sets per muscle?",
            "16 sets chest enough?",
            "Training volume kya hai gym?",
        ],
    },
    "warmup": {
        "tags": [
            "dynamic stretch", "activation", "hip mobility", "shoulder warmup",
            "empty bar", "ramp up sets", "joint prep", "light cardio warmup",
        ],
        "questions": [
            "Squat se pehle warmup kya?",
            "Bench press warmup sets kitni?",
            "Stretching before lifting?",
            "5 minute warmup enough?",
            "Heavy deadlift warmup routine?",
            "Warmup skip kar sakta hoon?",
        ],
    },
    "rep-ranges": {
        "tags": [
            "5x5", "8-12 reps", "high reps low weight", "strength reps",
            "hypertrophy reps", "1RM", "RPE", "RIR", "failure reps",
        ],
        "questions": [
            "Muscle ke liye kitne reps?",
            "Strength ke liye rep range?",
            "12 reps vs 6 reps muscle?",
            "Beginner kitne reps start?",
            "Har set failure tak?",
            "Rep range change kab kare?",
        ],
    },
    "rest-between-sets": {
        "tags": [
            "rest timer", "90 seconds", "3 minutes rest", "superset rest",
            "compound rest", "isolation rest", "phone scrolling gym",
        ],
        "questions": [
            "Sets ke beech kitna rest?",
            "1 minute rest enough?",
            "Squat ke baad kitna wait?",
            "Short rest muscle gain?",
            "Rest timer use karun?",
            "Triceps isolation rest time?",
        ],
    },
    "exercise-order": {
        "tags": [
            "compound first", "isolation last", "superset order", "priority lift",
            "squat bench deadlift order", "accessory work",
        ],
        "questions": [
            "Pehle compound ya isolation?",
            "Chest day exercise order?",
            "Cardio start ya end?",
            "Weak muscle pehle train?",
            "Abs workout kab kare?",
            "Equipment busy order change?",
        ],
    },
    "training-technique": {
        "tags": [
            "form check", "ROM", "range of motion", "tempo", "eccentric",
            "mind muscle connection", "ego lifting", "spotter", "lifting cues",
        ],
        "questions": [
            "Squat form kaise sahi?",
            "Deadlift back round fix?",
            "Ego lifting se injury?",
            "Full ROM important muscle?",
            "Bench press shoulder pain form?",
            "Gym mein form kaise improve?",
        ],
    },
    "training-plateau": {
        "tags": [
            "stuck weight", "no progress", "stall", "break plateau",
            "deload week", "program change", "strength plateau",
        ],
        "questions": [
            "Gym progress ruk gaya kya karun?",
            "Plateau break kaise?",
            "Same weight mahine se?",
            "Muscle nahi badh raha reason?",
            "Program change kab kare?",
            "Deload se plateau fix?",
        ],
    },
    "deload": {
        "tags": [
            "deload week", "reduce volume", "taper", "recovery week",
            "lighter weights", "fatigue management",
        ],
        "questions": [
            "Deload week kya hoti hai?",
            "Kab deload lena chahiye?",
            "Deload mein kitna weight?",
            "Tired hoon deload karun?",
            "Har 4 week deload?",
            "Deload ke baad strength?",
        ],
    },
    "progress-tracking": {
        "tags": [
            "workout log", "training diary", "progress photos", "scale weight",
            "measurements", "strength log", "app tracking", "PR log",
        ],
        "questions": [
            "Gym progress track kaise?",
            "Weight log daily ya weekly?",
            "Progress photos kitni bar?",
            "Strength increase kaise measure?",
            "Notebook vs app gym log?",
            "Body measurements kaise?",
        ],
    },
    "weight-loss-rate": {
        "tags": [
            "fat loss speed", "weekly weight loss", "cut rate", "aggressive cut",
            "slow cut", "scale fluctuations", "whoosh effect",
        ],
        "questions": [
            "Week mein kitna weight loss safe?",
            "Cutting speed fast ya slow?",
            "0.5 kg per week realistic?",
            "Scale same but look leaner?",
            "Fat loss stall cutting?",
            "Muscle preserve slow cut?",
        ],
    },
    "body-recomposition": {
        "tags": [
            "recomp", "lose fat gain muscle", "same weight look better",
            "beginner recomp", "maintenance recomp",
        ],
        "questions": [
            "Recomposition kya hai?",
            "Fat loss aur muscle gain saath?",
            "Beginner recomp possible?",
            "Same weight better body?",
            "Recomp ke liye calories?",
            "Bulk cut ke bina body change?",
        ],
    },
    "rest-days": {
        "tags": [
            "off day", "active rest", "complete rest", "recovery day",
            "walk on rest day", "yoga rest day",
        ],
        "questions": [
            "Rest day pe kya kare?",
            "Kitne rest days week?",
            "Rest day walk chalegi?",
            "Muscle rest kitne din?",
            "Back to back gym days?",
            "Rest day mein yoga?",
        ],
    },
    "home-workouts": {
        "tags": [
            "home gym", "dumbbells only", "resistance bands", "bodyweight",
            "no equipment", "garage gym", "apartment workout",
        ],
        "questions": [
            "Ghar pe gym without equipment?",
            "Home workout muscle gain?",
            "Dumbbells only routine?",
            "Resistance band gym substitute?",
            "Hotel room workout?",
            "Gym band ho to home plan?",
        ],
    },
    "exercise-selection": {
        "tags": [
            "best exercises", "compound lifts", "isolation picks",
            "squat hinge push pull", "movement patterns", "exercise list",
        ],
        "questions": [
            "Best gym exercises beginner?",
            "Kaun se exercises must do?",
            "Compound movements list?",
            "Biceps ke liye best exercise?",
            "Leg day main lifts?",
            "Back thickness ke liye kya?",
        ],
    },
    "beginner-program": {
        "tags": [
            "new to gym", "first month gym", "starting strength",
            "novice lifter", "gym etiquette", "first workout",
        ],
        "questions": [
            "Gym shuru kiya kya routine?",
            "Beginner first week gym?",
            "Pehli bar gym mein kya kare?",
            "New lifter mistakes?",
            "3 month beginner program?",
            "Gym beginner full body?",
        ],
    },
    "mobility-stretching": {
        "tags": [
            "flexibility", "static stretch", "dynamic mobility", "hip flexor",
            "shoulder mobility", "ankle mobility", "warm down stretch",
        ],
        "questions": [
            "Gym ke baad stretching?",
            "Mobility daily karni chahiye?",
            "Tight hips squat fix?",
            "Shoulder mobility bench?",
            "Static vs dynamic stretch?",
            "Flexibility muscle gain?",
        ],
    },
    "time-efficient-workouts": {
        "tags": [
            "short workout", "30 minute gym", "superset", "giant set",
            "busy schedule", "quick session", "time crunch",
        ],
        "questions": [
            "45 minute mein full workout?",
            "Busy ho gym short routine?",
            "Superset time save?",
            "30 min enough muscle?",
            "Office ke baad quick gym?",
            "Minimum effective workout time?",
        ],
    },
    "training-consistency": {
        "tags": [
            "habit", "discipline", "show up", "motivation", "adherence",
            "long term progress", "skip less", "routine stick",
        ],
        "questions": [
            "Gym consistent kaise rahu?",
            "Motivation nahi aati kya karun?",
            "Missed weeks habit break?",
            "Discipline vs motivation gym?",
            "Long term fitness kaise?",
            "Har week gym jana mushkil?",
        ],
    },
    "core-training": {
        "tags": [
            "abs", "core stability", "plank", "crunches", "hanging leg raise",
            "anti extension", "six pack", "trunk strength",
        ],
        "questions": [
            "Abs ke liye daily gym?",
            "Core training kab kare?",
            "Plank kitni der?",
            "Six pack ke liye abs routine?",
            "Squat deadlift se core enough?",
            "Lower back core exercises?",
        ],
    },
}


def _merge_unique(existing: list[str], extra: list[str]) -> list[str]:
    seen = {s.strip().lower() for s in existing if s and s.strip()}
    out = list(existing)
    for item in extra:
        key = item.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item.strip())
    return out


def enrich_kb(path: str = KB_PATH) -> tuple[int, int]:
    with open(path, encoding="utf-8") as f:
        payload = json.load(f)

    tag_added = 0
    question_added = 0
    for doc in payload["docs"]:
        doc_id = doc["id"]
        block = ENRICHMENTS.get(doc_id)
        if not block:
            continue
        before_tags = len(doc.get("tags", []))
        before_q = len(doc.get("questions", []))
        doc["tags"] = _merge_unique(doc.get("tags", []), block.get("tags", []))
        doc["questions"] = _merge_unique(doc.get("questions", []), block.get("questions", []))
        tag_added += len(doc["tags"]) - before_tags
        question_added += len(doc["questions"]) - before_q

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return tag_added, question_added


def main() -> None:
    tags, questions = enrich_kb()
    print(f"Added {tags} tags and {questions} questions to {KB_PATH}")

    if ROOT not in sys.path:
        sys.path.insert(0, ROOT)
    from generate_dataset import generate_coach_question_dataset

    generate_coach_question_dataset()
    print("Regenerated coach_questions.csv")


if __name__ == "__main__":
    main()
