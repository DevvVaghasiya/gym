import type { UserProfile } from '../types/user';
import type { WorkoutPlan } from '../types/workout';
import type { NutritionPlan } from '../types/nutrition';
import { KNOWLEDGE_BASE, type KnowledgeDoc } from '../data/knowledgeBase';
import { EXERCISE_DATABASE } from '../data/exercises';

export interface ChatContext {
  profile: UserProfile | null;
  workoutPlan: WorkoutPlan | null;
  dietPlan: NutritionPlan | null;
}

export interface ChatAnswer {
  answer: string;
  intent: string;
  sources: string[];
  usedPlanData: boolean;
}

const SAFETY_PATTERNS = [
  /starv/i,
  /purge/i,
  /laxative/i,
  /make me throw up/i,
  /anorex/i,
  /bulimi/i,
  /under ?800/i,
  /crash diet/i,
];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function scoreDoc(queryTokens: string[], doc: KnowledgeDoc): number {
  const hay = `${doc.title} ${doc.tags.join(' ')} ${doc.content}`.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (doc.tags.some(tag => tag.includes(t) || t.includes(tag))) score += 3;
    if (hay.includes(t)) score += 1;
  }
  return score;
}

function retrieve(query: string, k = 3): KnowledgeDoc[] {
  const tokens = tokenize(query);
  return [...KNOWLEDGE_BASE]
    .map(doc => ({ doc, score: scoreDoc(tokens, doc) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(x => x.doc);
}

function detectIntent(q: string): string {
  const s = q.toLowerCase();
  if (SAFETY_PATTERNS.some(r => r.test(s))) return 'safety';
  if (/miss(ed)?|skip|forgot/.test(s) && /workout|session|leg|push|pull|gym/.test(s)) return 'missed_workout';
  if (/replac|substitut|instead of|alternative/.test(s) && /paneer|dal|rice|chicken|food|meal/.test(s)) return 'substitute_food';
  if (/replac|substitut|instead of|alternative/.test(s)) return 'substitute_exercise';
  if (/calorie|kcal|tdee|how much should i eat/.test(s)) return 'calories';
  if (/protein/.test(s)) return 'protein';
  if (/split|ppl|upper.?lower|full body/.test(s)) return 'split';
  if (/water|hydrat/.test(s)) return 'water';
  if (/sleep|recover|sore|rest day/.test(s)) return 'recovery';
  if (/supplement|creatine|whey/.test(s)) return 'supplements';
  return 'general';
}

function planBlock(ctx: ChatContext): string {
  const p = ctx.profile;
  if (!p) return '';
  const lines = [
    `Your logged profile: ${p.weightKg} kg, ${p.heightCm} cm, ${p.bodyFatPercent}% body fat, ${p.experience}, goal ${p.goal.replace('_', ' ')}.`,
    `Engine targets: BMR ${Math.round(p.bmr)} kcal, TDEE ${Math.round(p.tdee)} kcal.`,
  ];
  if (p.recommendedStrategy) lines.push(`Recommended strategy: ${p.recommendedStrategy.replace('_', ' ')}.`);
  if (p.recommendedSplit) lines.push(`Recommended split: ${p.recommendedSplit.replace('_', ' ')}.`);
  if (ctx.dietPlan) {
    lines.push(`Current diet target: ${ctx.dietPlan.dailyCalories} kcal, ${ctx.dietPlan.protein} g protein, ${ctx.dietPlan.carbs} g carbs, ${ctx.dietPlan.fat} g fat. Preference: ${p.foodPreference}.`);
  }
  if (ctx.workoutPlan) {
    const training = ctx.workoutPlan.days.filter(d => !d.isRestDay).map(d => `${d.day} ${d.name}`).join(', ');
    lines.push(`Current training days: ${training || 'not generated yet'}.`);
  }
  return lines.join(' ');
}

function findExercise(name: string) {
  const q = name.toLowerCase();
  return EXERCISE_DATABASE.find(e => e.name.toLowerCase().includes(q) || e.id.includes(q.replace(/\s+/g, '_')));
}

function safetyAnswer(): ChatAnswer {
  return {
    intent: 'safety',
    sources: ['Safety and medical limits'],
    usedPlanData: false,
    answer:
      'I cannot help with crash dieting, starvation, purging, or anything that looks like an eating-disorder behaviour. FitAI is an educational fitness tool, not a clinician. If you are struggling with food or body image, please talk to a qualified doctor or mental-health professional. For training, we only use moderate, recoverable calorie and volume ranges.',
  };
}

export function answerGymQuestion(question: string, ctx: ChatContext): ChatAnswer {
  const intent = detectIntent(question);
  if (intent === 'safety') return safetyAnswer();

  const docs = retrieve(question);
  const sources = docs.map(d => d.title);
  const knowledge = docs.map(d => d.content).join(' ');
  const plan = planBlock(ctx);
  const p = ctx.profile;
  const usedPlanData = Boolean(p);

  if (intent === 'calories' && p && ctx.dietPlan) {
    return {
      intent,
      sources: sources.length ? sources : ['Calories, BMR and TDEE'],
      usedPlanData: true,
      answer: `Based on your current plan, your target is approximately ${ctx.dietPlan.dailyCalories} kcal/day. That comes from a BMR of ${Math.round(p.bmr)} kcal and a TDEE of ${Math.round(p.tdee)} kcal, then adjusted for your ${p.goal.replace('_', ' ')} goal. ${knowledge} This is an estimate to monitor over weeks — not a guaranteed number.`,
    };
  }

  if (intent === 'protein' && p && ctx.dietPlan) {
    return {
      intent,
      sources: sources.length ? sources : ['Protein targets'],
      usedPlanData: true,
      answer: `Your protein target is ${ctx.dietPlan.protein} g/day at ${p.weightKg} kg (${(ctx.dietPlan.protein / p.weightKg).toFixed(1)} g/kg), which fits a ${p.goal.replace('_', ' ')} phase. Spread it across your ${p.numberOfMeals || 4} meals. ${knowledge}`,
    };
  }

  if (intent === 'missed_workout') {
    return {
      intent,
      sources: sources.length ? sources : ['Missed workouts'],
      usedPlanData: usedPlanData,
      answer: `Don't try to double the entire workout tomorrow. We can slide the remaining sessions one day forward and keep rest intact so recovery is preserved.${p ? ` You currently train ${p.daysPerWeek} days/week for ${p.workoutDuration} minutes.` : ''} ${knowledge}`,
    };
  }

  if (intent === 'substitute_exercise') {
    const bench = /bench/.test(question.toLowerCase());
    const ex = bench ? findExercise('bench') : findExercise(question);
    const alt = ex?.alternatives
      ? `Closest options: ${Object.entries(ex.alternatives).map(([k, v]) => `${k} — ${v}`).join('; ')}.`
      : '';
    return {
      intent,
      sources: sources.length ? sources : ['Chest exercise substitutions'],
      usedPlanData,
      answer: `Yes, you can substitute. ${knowledge} ${alt} Keep the same weekly set target for that muscle and similar effort (about RPE 7–9).`.trim(),
    };
  }

  if (intent === 'substitute_food' && ctx.dietPlan) {
    return {
      intent,
      sources: sources.length ? sources : ['Vegetarian protein swaps'],
      usedPlanData: true,
      answer: `Yes. Based on your ${p?.foodPreference || 'current'} plan targeting ${ctx.dietPlan.protein} g protein, swap the food for another item with similar protein rather than similar calories only. ${knowledge}`,
    };
  }

  if (intent === 'split' && p) {
    return {
      intent,
      sources: sources.length ? sources : ['Choosing a training split'],
      usedPlanData: true,
      answer: `Your recommended split is ${p.recommendedSplit?.replace('_', ' ') || 'based on days and experience'} because you are ${p.experience} and train ${p.daysPerWeek} days/week. ${knowledge}`,
    };
  }

  const fallback = knowledge ||
    'I can help with calories, protein, workout splits, exercise swaps, missed sessions, recovery, and Indian meal substitutions. Ask about your current plan for a specific answer.';

  return {
    intent,
    sources,
    usedPlanData,
    answer: `${plan ? plan + ' ' : ''}${fallback} This is educational guidance, not medical advice.`,
  };
}
