export type KnowledgeDoc = {
  id: string;
  title: string;
  tags: string[];
  content: string;
};

export const KNOWLEDGE_BASE: KnowledgeDoc[] = [
  {
    id: 'calories-tdee',
    title: 'Calories, BMR and TDEE',
    tags: ['calories', 'tdee', 'bmr', 'deficit', 'surplus', 'eat'],
    content:
      'Daily calorie targets should start from BMR (Mifflin-St Jeor) then TDEE = BMR × activity factor. Muscle gain usually uses TDEE + 200–300 kcal. Fat loss usually uses TDEE − 300–500 kcal. Maintenance stays near TDEE. Extreme deficits harm training, hormones, and adherence. Floor calories: about 1600 kcal for most men and 1400 kcal for most women unless a clinician directs otherwise.',
  },
  {
    id: 'protein',
    title: 'Protein targets',
    tags: ['protein', 'macros', 'muscle', 'grams'],
    content:
      'A practical evidence-based range is 1.6–2.2 g of protein per kg of body weight for muscle gain, and 2.0–2.4 g/kg during a fat-loss phase to protect lean mass. Spread protein across 3–5 meals. Vegetarian sources include paneer, dal, Greek yogurt/curd, tofu, soya, whey, and eggs if eggetarian.',
  },
  {
    id: 'carbs-fat',
    title: 'Carbs and fat',
    tags: ['carbs', 'fat', 'macros', 'energy'],
    content:
      'After protein is set, remaining calories are split between carbs and fat. Fat often starts near 20–30% of calories. Carbs fuel training; keep them higher around workout days. Do not cut fat extremely low — hormones and vitamin absorption need dietary fat.',
  },
  {
    id: 'missed-workout',
    title: 'Missed workouts',
    tags: ['missed', 'skip', 'miss', 'reschedule', 'forgot'],
    content:
      'Do not double tomorrow’s session after a missed workout. Shift the remaining week forward by one day or skip the least important accessory day. Protect rest. One missed session does not erase progress; stacking fatigue does.',
  },
  {
    id: 'exercise-subs-chest',
    title: 'Chest exercise substitutions',
    tags: ['replace', 'substitute', 'bench', 'chest', 'press'],
    content:
      'Barbell bench press can be replaced with dumbbell bench press, machine chest press, or weighted push-ups. Dumbbells are usually the closest hypertrophy substitute. Use machines if a shoulder or wrist injury is present. Keep similar sets and a nearby RPE.',
  },
  {
    id: 'exercise-subs-squat',
    title: 'Squat substitutions',
    tags: ['squat', 'legs', 'quads', 'replace', 'knee'],
    content:
      'Barbell squat alternatives include goblet squat, leg press, Bulgarian split squat, and hack squat. Choose leg press or goblet squats if low-back or technical skill is the limiter. Keep a full controllable range of motion.',
  },
  {
    id: 'exercise-subs-deadlift',
    title: 'Deadlift substitutions',
    tags: ['deadlift', 'back', 'hinge', 'replace'],
    content:
      'Conventional deadlift can be replaced with Romanian deadlift, trap-bar deadlift, or cable pull-throughs. RDLs are excellent for hamstrings and lower-back-friendly hinge volume. Trap-bar is often easier to learn.',
  },
  {
    id: 'food-subs-veg',
    title: 'Vegetarian protein swaps',
    tags: ['paneer', 'replace', 'vegetarian', 'protein', 'tofu', 'dal', 'curd'],
    content:
      'Paneer can be swapped for tofu, Greek yogurt/curd, soya chunks, or extra dal plus a protein shake while watching daily protein. Cottage cheese and mixed dal + rice also work. Match protein grams, not just food volume.',
  },
  {
    id: 'splits',
    title: 'Choosing a training split',
    tags: ['split', 'ppl', 'upper', 'lower', 'full body', 'days'],
    content:
      'Beginners on 2–3 days should use full body. Four days is usually upper/lower. Intermediate 3-day is Push/Pull/Legs. Five days can be PPL plus an extra upper or lower specialization day. Do not pick PPL only because the goal is muscle gain — days, recovery, and experience matter more.',
  },
  {
    id: 'volume',
    title: 'Weekly training volume',
    tags: ['sets', 'volume', 'hypertrophy', 'frequency'],
    content:
      'Most muscles grow well on roughly 10–20 hard sets per week, split over 2+ sessions. Beginners stay nearer 8–12. Lagging muscles get extra isolation sets. Sleep, stress, and a calorie deficit all reduce how much volume you can recover from.',
  },
  {
    id: 'progressive-overload',
    title: 'Progressive overload',
    tags: ['overload', 'progress', 'weight', 'reps', 'stronger'],
    content:
      'Add load or reps when you hit the top of the rep range with good form and 1–2 reps in reserve. Example: 40 kg × 8 → 40 kg × 10 → 42.5 kg × 8. If form breaks down or joints hurt, hold the weight or deload rather than forcing jumps.',
  },
  {
    id: 'recovery',
    title: 'Recovery, sleep and stress',
    tags: ['recovery', 'sleep', 'rest', 'stress', 'soreness'],
    content:
      'Muscle is built between sessions. Aim for 7–9 hours of sleep. High stress and poor sleep are reasons to keep calories closer to maintenance and reduce extra isolation volume. Rest days are training — they are not optional filler.',
  },
  {
    id: 'water',
    title: 'Hydration',
    tags: ['water', 'hydration', 'drink'],
    content:
      'A simple starting point is about 30–35 ml of water per kg of body weight, plus extra on training days and in heat. Creatine users should drink a bit more. Urine that is pale straw is a practical check.',
  },
  {
    id: 'indian-diet',
    title: 'Indian gym diet patterns',
    tags: ['indian', 'gujarati', 'punjabi', 'south', 'roti', 'dal', 'rice', 'idli'],
    content:
      'A high-protein Indian template: breakfast oats or idli/dosa + sambar or eggs/curd; lunch rice or roti + dal + sabzi + paneer/tofu/chicken; snack curd, fruit, or whey; dinner roti + protein + vegetables. Dal, curd, paneer, tofu, soya, eggs, and chicken are the usual protein anchors. Watch oil in tadka and creamy gravies if fat loss is the goal.',
  },
  {
    id: 'supplements',
    title: 'Supplements',
    tags: ['supplement', 'whey', 'creatine', 'vitamin'],
    content:
      'Food first. The best-supported supplements for gym goals are creatine monohydrate (3–5 g daily) and protein powder if you struggle to hit protein from food. Vitamin D if deficient. Supplements do not replace a calorie and protein plan. This is not medical advice.',
  },
  {
    id: 'beginner',
    title: 'Beginner training principles',
    tags: ['beginner', 'new', 'start', 'form'],
    content:
      'Learn squat, hinge, press, row, and carry patterns with moderate weight. Full-body 3 days/week is enough. Leave 2–3 reps in reserve. Consistency for 8–12 weeks beats a complicated split. Cardio can be 2–3 easy walks or light sessions.',
  },
  {
    id: 'safety',
    title: 'Safety and medical limits',
    tags: ['injury', 'pain', 'medical', 'disorder', 'starvation'],
    content:
      'Sharp joint pain is a stop signal, not a cue to push through. Extreme calorie targets, purging, or crash dieting are not valid fitness strategies. Eating-disorder symptoms, pregnancy, and diagnosed medical conditions need a qualified clinician, not an app optimizer.',
  },
];
