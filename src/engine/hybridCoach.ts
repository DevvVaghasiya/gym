import { UserProfile } from '../types/user';
import { ProgressEntry, PRRecord } from '../types/progress';
import { WorkoutPlan } from '../types/workout';
import { NutritionPlan } from '../types/nutrition';
import { KNOWLEDGE_BASE } from '../data/knowledgeBase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
}

export interface CoachContext {
  profile: UserProfile | null;
  workoutPlan: WorkoutPlan | null;
  dietPlan?: NutritionPlan | null;
  progressEntries: ProgressEntry[];
  prs: PRRecord[];
  todayWater: number;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const normalize = (value: string) => value.toLowerCase()
  .replace(/\b(proten|proteen|protien|protean)\b/g, 'protein')
  .replace(/\b(calroies|caleries)\b/g, 'calories')
  .replace(/\b(workuot|workot)\b/g, 'workout')
  .replace(/\bcreatin\b/g, 'creatine')
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const pickRelevantKnowledge = (message: string) => {
  const lower = normalize(message);

  const docs = KNOWLEDGE_BASE
    .map(doc => {
      const keywords = [...doc.tags, doc.title, ...doc.questions, ...doc.content.split(' ')].map(normalize).filter(Boolean);
      const score = keywords.reduce((total, keyword) => {
        if (!keyword) return total;
        return total + (lower.includes(keyword) ? 2 : 0);
      }, 0);

      return { doc, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return docs[0]?.doc ?? null;
};

const goalLabel = (goal: string) => goal.replace(/_/g, ' ');

const buildSpecificAnswer = (message: string, profile: UserProfile) => {
  const lower = normalize(message);

  if (/(caffeine|coffee|energy drink|pre[- ]?workout)/.test(lower)) {
    return 'Caffeine can help performance if you use it sensibly: aim for about 3–6 mg/kg, usually 30–90 minutes before training, and keep your total under ~400 mg/day for most adults. Avoid it late in the day if sleep is poor, because sleep drives recovery more than the extra coffee does.';
  }

  if (/(meal timing|pre workout|post workout|breakfast|lunch|dinner|what should i eat|when should i eat)/.test(lower)) {
    if (profile.goal === 'fat_loss') {
      return 'For fat loss, keep protein in every meal, place most carbs around workouts, and do not skip breakfast if it helps adherence. A simple pattern is breakfast with protein, lunch with lean protein + vegetables, snack, and dinner with protein + carbs + greens. The real key is consistency, not perfect timing.';
    }
    if (profile.goal === 'muscle_gain') {
      return 'For muscle gain, aim for 3–5 meals with protein and carbs, with a protein + carb meal before or after training. A good pattern is breakfast, lunch, pre-workout snack, dinner, and recovery shake if needed. Carbs around training are the priority, then total calorie intake.';
    }
    return 'Use 3–5 protein-rich meals per day and keep carbs around your hardest sessions. This makes your nutrition more effective than chasing a perfect meal split.';
  }

  if (/(sore|soreness|doms|muscle pain|tight|stiff)/.test(lower)) {
    return 'If you are sore, keep moving gently, reduce the loading on the same muscle group, and prioritize sleep, hydration, and protein. If soreness is severe, drop volume and use light mobility or easy cardio rather than forcing a hard workout.';
  }

  if (/(supplement|whey|creatine|protein powder|vitamin d|multivitamin)/.test(lower)) {
    return 'Supplements are optional tools, not the foundation. Whey is useful for protein convenience, creatine monohydrate is one of the best-supported performance supplements at 3–5 g/day, and vitamin D only matters if you are deficient. Food first, then supplement the gaps.';
  }

  if (/(cardio|hiit|run|bike|walking)/.test(lower)) {
    return 'Add cardio based on your goal and recovery. Fat loss often benefits from 2–4 easy-to-moderate sessions of 20–40 minutes, while heavy lifting days should keep cardio low-impact and not kill recovery. Long HIIT is not mandatory for most people.';
  }

  if (/(should i take|how much water|hydration|water)/.test(lower)) {
    return 'A simple hydration target is about 30–35 mL per kg of bodyweight daily, plus more in heat or on hard training days. Pale straw urine is a practical visual check. Caffeine doesn’t replace water, but it also doesn’t automatically dehydrate you if your intake is reasonable.';
  }

  return null;
};

const getExerciseSuggestion = (message: string) => {
  const lower = normalize(message);

  if (lower.includes('back')) {
    return 'Try 3–4 sets of lat pulldowns, one-arm dumbbell rows, and seated cable rows. Keep 1–2 reps in reserve and focus on a strong squeeze at the top.';
  }

  if (lower.includes('bicep') || lower.includes('arms') || lower.includes('curl')) {
    return 'Try barbell curls, incline dumbbell curls, and hammer curls. Aim for 3 sets of 8–12 reps, with controlled tempo and no swinging.';
  }

  if (lower.includes('chest') || lower.includes('bench')) {
    return 'Try bench press, incline dumbbell press, and cable flyes. Keep the reps controlled and stop with 1–2 reps left in the tank.';
  }

  if (lower.includes('shoulder') || lower.includes('delts')) {
    return 'Try overhead press, lateral raises, and rear-delt flyes. Use moderate weights and keep shoulder blades stable.';
  }

  if (lower.includes('leg') || lower.includes('squat') || lower.includes('quads') || lower.includes('hamstring')) {
    return 'Try goblet squats, leg press, Romanian deadlifts, and walking lunges. Prioritize depth and control before adding load.';
  }

  if (lower.includes('pull') || lower.includes('rear delt')) {
    return 'Try chest-supported rows, single-arm rows, and face pulls. Focus on scapular control and full range of motion.';
  }

  return 'Try a compound lift, one accessory push pattern, and one pull pattern. Keep the session balanced and stop when your form starts to break down.';
};

const buildMultiIntentAnswer = (message: string, profile: UserProfile, workoutPlan: WorkoutPlan | null, prs: PRRecord[], recoveryScore: number, sleep: number) => {
  const lower = normalize(message);
  const parts = lower
    .split(/[!?.,;]+|\band\b/)
    .map(part => part.trim())
    .filter(Boolean);

  const answers: string[] = [];
  const seen = new Set<string>();

  const addAnswer = (key: string, text: string) => {
    if (!seen.has(key)) {
      seen.add(key);
      answers.push(text);
    }
  };

  for (const part of parts) {
    if (!part) continue;

    if (part.includes('meal') || part.includes('eat') || part.includes('food') || part.includes('diet') || part.includes('protein')) {
      if (profile.goal === 'fat_loss') {
        addAnswer('meal', `For fat loss, use 3–4 protein-focused meals: eggs or Greek yogurt, chicken or tofu + rice + veg, a protein snack, and salmon or paneer + potatoes at dinner. Keep carbs around training and stay near your calorie target.`);
      } else if (profile.goal === 'muscle_gain') {
        addAnswer('meal', `For muscle gain, aim for 4 meals with protein + carbs: oats and whey, chicken + rice + vegetables, yogurt + fruit, and fish/paneer + potatoes + greens. Keep a small calorie surplus and protein high.`);
      } else {
        addAnswer('meal', `Keep nutrition simple: hit protein in every meal, carbs around training, and vegetables in each meal. A repeatable meal pattern works better than a perfect one.`);
      }
    }

    if (part.includes('recover') || part.includes('recovery') || part.includes('rest') || part.includes('sleep') || part.includes('fatigue') || part.includes('tired')) {
      addAnswer('recovery', `Recovery first: aim for 7–9 hours of sleep, reduce extra volume, and keep hydration and protein consistent. If you are feeling drained, use a lighter day and prioritize sleep over extra work.`);
    }

    if (part.includes('workout') || part.includes('exercise') || part.includes('routine') || part.includes('plan') || part.includes('back') || part.includes('bicep') || part.includes('bench') || part.includes('squat') || part.includes('leg') || part.includes('pull')) {
      const exerciseText = getExerciseSuggestion(part);
      addAnswer('workout', `For your training, start with compounds and keep 1–2 reps in reserve. ${exerciseText}`);
    }
  }

  if (answers.length) {
    return answers.join('\n\n');
  }

  return `That is a good question, and your current profile suggests a goal of ${goalLabel(profile.goal)}. Based on your recovery, sleep, and training data, I’d keep the plan consistent and prioritize recovery before aggressive overload.`;
};

/**
 * HYBRID COACH ARCHITECTURE
 * 1. Safety and recovery rules
 * 2. Retrieval from knowledge base
 * 3. Personalized context from user profile
 * 4. Natural-language coaching response
 */

export const generateCoachResponse = (
  message: string,
  context: CoachContext
): string => {
  const currentMessage = normalize(message);
  const previousUserMessage = [...(context.conversationHistory ?? [])].reverse().find(item => item.role === 'user')?.content;
  const isFollowUp = /\b(what about tomorrow|what about that|can i replace that|replace it|and then|those)\b/.test(currentMessage);
  const lowerMsg = normalize(isFollowUp && previousUserMessage ? `${previousUserMessage} ${message}` : message);
  const { profile, workoutPlan, prs } = context;

  if (/chest pain|chest pressure|faint|passed out|severe shortness of breath|cannot breathe|sudden confusion/.test(currentMessage)) {
    return 'Stop exercising now. Chest pain or pressure, fainting, severe breathing trouble, or sudden confusion can be an emergency. Call your local emergency number or seek urgent medical care; do not continue the workout.';
  }
  if (/starv|purge|laxative|anorex|bulimi|eating disorder|crash diet|under 800|very low calorie/.test(currentMessage)) {
    return 'I cannot help with starvation, purging, laxatives, or extreme restriction. You deserve support from a qualified healthcare professional or eating-disorder specialist. If you are in immediate danger, contact local emergency services or a crisis service now.';
  }
  if (/sharp pain|severe pain|injur|fracture|dislocat|pregnan|surgery|medical condition|dizz|lightheaded/.test(currentMessage)) {
    return 'Stop the movement that causes sharp or severe pain. Dizziness means stop and sit or lie somewhere safe; do not resume if it persists or returns. Please get medical advice for ongoing symptoms, known conditions, pregnancy, or post-surgery exercise.';
  }

  const sleep = profile?.sleepHours || 8;
  const recoveryScore = sleep >= 8 ? 88 : sleep >= 7 ? 74 : 52;
  const isFatigued = recoveryScore < 60 || lowerMsg.includes('tired') || lowerMsg.includes('sore') || lowerMsg.includes('fatigue') || lowerMsg.includes('exhausted');
  const goalText = profile ? goalLabel(profile.goal) : 'not set';
  const relevantDoc = pickRelevantKnowledge(lowerMsg);

  if (/protein/.test(lowerMsg) && /(how much|how many|target|grams|need|per day|eat)/.test(lowerMsg)) {
    if (!profile?.weightKg) {
      return 'I can estimate a useful protein range. What is your current weight, and is your main goal muscle gain, fat loss, or maintenance?';
    }
    const planTarget = context.dietPlan?.protein ?? profile.proteinTarget;
    const low = Math.round(profile.weightKg * 1.6);
    const high = Math.round(profile.weightKg * 2.2);
    const target = planTarget ? `Your saved plan targets ${planTarget} g/day. ` : `For your ${profile.weightKg} kg body weight, a practical muscle-building range is about ${low}-${high} g/day; it is a guide, not a requirement. `;
    const foodOptions = profile.foodPreference === 'vegan'
      ? 'Budget-friendly choices include lentils, soya chunks, tofu, and beans.'
      : 'Affordable options include dal, soya chunks, curd, tofu, paneer, and eggs if you eat them.';
    return `${target}${foodOptions} Approximate portions vary by recipe; 1 cup cooked dal provides about 15-18 g protein and 50 g dry soya chunks about 25 g.`;
  }

  if (!profile) {
    if (relevantDoc?.topic === 'protein') {
      return 'I can estimate a practical daily protein range from your body weight and goal. What is your current weight, and are you aiming to gain muscle, lose fat, or maintain?';
    }
    if (relevantDoc) return `${relevantDoc.content} Share your goal and schedule if you want me to tailor this to you.`;
    return 'I can help with training, nutrition, and recovery. Tell me your question; if you want a personalized estimate, include your weight and goal.';
  }

  const asksAboutRecovery = /(workout|train|recover|recovery|sore|fatigue|tired|exhausted|rest|sleep)/.test(lowerMsg);
  if (isFatigued && asksAboutRecovery) {
    return `You seem under-recovered right now. Based on your sleep (${sleep}h), recovery is around ${recoveryScore}%. I would reduce volume, keep the session lighter, and prioritize sleep, hydration, and protein. Save the hard push for a day when your recovery is better.`;
  }

  const directAnswer = buildSpecificAnswer(message, profile);
  if (directAnswer) {
    return directAnswer;
  }

  if (lowerMsg.includes(',') || lowerMsg.includes('?') || lowerMsg.includes('and')) {
    const multiResponse = buildMultiIntentAnswer(message, profile, workoutPlan, prs, recoveryScore, sleep);
    if (multiResponse) {
      return multiResponse;
    }
  }

  if (lowerMsg.includes('food name') || lowerMsg.includes('meal name') || lowerMsg.includes('names of food') || lowerMsg.includes('proper food')) {
    if (profile.goal === 'fat_loss') {
      return `For fat loss, great food names are: grilled chicken, egg white omelet, Greek yogurt, tofu, paneer, salmon, lentils, broccoli, sweet potato, berries, and oats. Keep protein high and avoid liquid calories unless they fit your macros.`;
    }
    if (profile.goal === 'muscle_gain') {
      return `For muscle gain, easy high-quality options are: chicken breast, rice, oats, paneer, eggs, Greek yogurt, tofu, salmon, potatoes, bananas, and peanut butter. Build meals around protein + carbs + a little healthy fat.`;
    }
    return `Good food choices are chicken, eggs, Greek yogurt, paneer, tofu, lentils, rice, potatoes, oats, fruit, and leafy vegetables. Use a mix of protein, carbs, and healthy fats for performance and recovery.`;
  }

  if (lowerMsg.includes('what should i eat') || lowerMsg.includes('what should i eat today') || lowerMsg.includes('diet') || lowerMsg.includes('meal') || lowerMsg.includes('food plan') || lowerMsg.includes('what to eat')) {
    if (profile.goal === 'fat_loss') {
      return `For fat loss, eat 3–4 high-protein meals: eggs or Greek yogurt for breakfast, chicken + rice + vegetables for lunch, a protein snack, and salmon or tofu + potatoes for dinner. Keep carbs around training and stay consistent with your calorie target.`;
    }
    if (profile.goal === 'muscle_gain') {
      return `For muscle gain, structure your day around 4 meals: oats + whey or eggs, chicken + rice + vegetables, Greek yogurt + fruit, and fish or paneer + potatoes + greens. Keep protein high and energy surplus moderate.`;
    }
    return `A strong meal plan is: protein at every meal, carbs around training, vegetables in each meal, and a consistent calorie target. Keep it simple and repeatable.`;
  }

  if (lowerMsg.includes('protein') || lowerMsg.includes('macro') || lowerMsg.includes('carb') || lowerMsg.includes('fat')) {
    if (profile.goal === 'fat_loss') {
      return `For fat loss, keep protein high and hit around 1.8–2.2 g/kg body weight, then fill the rest with controlled carbs and fats. The easiest approach is to keep protein and veggies high, carbs around training, and fats moderate.`;
    }
    if (profile.goal === 'muscle_gain') {
      return `For muscle gain, prioritize protein first, then carbs around training, and keep fats moderate. A typical pattern is 25–35 g protein per meal, plus carbs to support performance and growth.`;
    }
    return `Use protein as the foundation, then distribute carbs around workouts and fats for hormone support. This keeps the plan sustainable and performance-focused.`;
  }

  if (lowerMsg.includes('give me') && (lowerMsg.includes('exercise') || lowerMsg.includes('workout') || lowerMsg.includes('routine') || lowerMsg.includes('plan'))) {
    return `Here is a strong, simple option: ${getExerciseSuggestion(message)} Keep it to 3–4 working sets per movement and rest 60–90 seconds between sets. If a movement hurts your joints, swap it for a safer variation rather than forcing the rep.`;
  }

  if (lowerMsg.includes('exercise') || lowerMsg.includes('workout') || lowerMsg.includes('train') || lowerMsg.includes('bench') || lowerMsg.includes('squat') || lowerMsg.includes('deadlift') || lowerMsg.includes('biceps') || lowerMsg.includes('back')) {
    if (lowerMsg.includes('bench') || lowerMsg.includes('chest')) {
      return `For chest work, barbell bench can be replaced with dumbbell bench, machine chest press, or weighted push-ups. Dumbbells are usually the closest hypertrophy substitute. Keep the same RPE and volume if your shoulder or wrist is limiting you.`;
    }

    if (lowerMsg.includes('squat') || lowerMsg.includes('leg')) {
      return `If squat variation is not ideal, goblet squat, leg press, or Bulgarian split squat are good substitutes. Pick the one that keeps the movement controlled and does not irritate your knees or low back.`;
    }

    if (lowerMsg.includes('deadlift') || lowerMsg.includes('back')) {
      return `For back or hinge work, Romanian deadlifts, trap-bar deadlifts, or cable pull-throughs are solid alternatives. RDLs are great for hamstrings and lower-back-friendly loading. Keep the same effort and technique quality.`;
    }

    if (lowerMsg.includes('bicep') || lowerMsg.includes('curl') || lowerMsg.includes('arm')) {
      return `For biceps, use barbell curls, incline dumbbell curls, or hammer curls. Keep the movement strict and controlled, and avoid using momentum. 3 sets of 8–12 reps is a strong target for growth.`;
    }

    if (prs.length > 0) {
      const bestPR = prs[prs.length - 1];
      return `Based on your recent performance, your last PR was ${bestPR.weight}kg on ${bestPR.exerciseName}. A smart progression would be to add a small load or one rep while keeping form clean. Your goal is ${goalText}, so keep the increase steady rather than chasing large jumps.`;
    }

    if (workoutPlan && workoutPlan.days.length > 0) {
      const today = workoutPlan.days[0].exercises.map(e => e.exercise.name).slice(0, 3).join(', ');
      return `Your plan for today is centered on ${today}. Start with the hardest compound lifts first, keep 1–2 reps in reserve, and stay close to your prescribed sets. For a goal like ${goalText}, quality reps beat maximal ego lifts.`;
    }

    return `For most gym goals, start with compound lifts like squat, bench, row, and deadlift, then add one or two accessories. Keep your volume manageable, and use progressive overload by adding reps or a small load when form stays solid.`;
  }

  if (lowerMsg.includes('goal') || lowerMsg.includes('progress') || lowerMsg.includes('what should my target be') || lowerMsg.includes('am i on track')) {
    return `Your current goal is ${goalText}. For that goal, consistency matters more than perfection. Hit your calorie target, stay close to your protein target, train with controlled effort, and log weekly progress so the plan can adapt.`;
  }

  if (lowerMsg.includes('sleep') || lowerMsg.includes('recovery') || lowerMsg.includes('rest') || lowerMsg.includes('stress')) {
    return `Sleep is a training variable. Aim for 7–9 hours, reduce extra fatigue when stress is high, and use deload or lighter sessions when recovery is low. Muscle is built in recovery, not while you are already exhausted.`;
  }

  if (lowerMsg.includes('hydration') || lowerMsg.includes('water') || lowerMsg.includes('drink')) {
    return `A practical starting point is around 30–35 ml per kg of bodyweight, plus more on hard training days and in hot weather. Pale straw urine is a good visual check. If you use creatine, a little extra water helps.`;
  }

  if (relevantDoc) {
    const docText = relevantDoc.content;
    return `This matches your goal and training context: ${docText} \n\nFor your current plan, keep the principle simple: stay consistent, keep effort honest, and prioritize recovery and protein. If you want, I can turn this into a more specific recommendation for your workout or meal plan.`;
  }

  return `That is a good question, and your current profile suggests a goal of ${goalText}. Based on your recovery, sleep, and training data, I’d keep your plan consistent, use controlled progression, and prioritize recovery before chasing aggressive overload. If you want, ask about a specific exercise, diet, recovery issue, or goal and I’ll give you a more precise answer.`;
};
