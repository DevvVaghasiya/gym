import { UserProfile } from '../types/user';
import { ProgressEntry, PRRecord } from '../types/progress';
import { WorkoutPlan } from '../types/workout';
import { NutritionPlan } from '../types/nutrition';
import { KNOWLEDGE_BASE, type KnowledgeDoc } from '../data/knowledgeBase';

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

export interface CoachResult {
  answer: string;
  sources: string[];
  followUpQuestions: string[];
  references?: string[];
  docTitle?: string;
  intent?: string;
}

const TYPO_ALIASES: Record<string, string> = {
  proten: 'protein',
  proteen: 'protein',
  protien: 'protein',
  protean: 'protein',
  calroies: 'calories',
  caleries: 'calories',
  workuot: 'workout',
  workot: 'workout',
  creatin: 'creatine',
  recovry: 'recovery',
  hydrtion: 'hydration',
  muslce: 'muscle',
  sorenes: 'soreness',
  suplement: 'supplement',
  bicep: 'biceps',
  overlod: 'overload',
};

function normalize(text: string): string {
  let cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  for (const [typo, fixed] of Object.entries(TYPO_ALIASES)) {
    cleaned = cleaned.replace(new RegExp(`\\b${typo}\\b`, 'g'), fixed);
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter(Boolean);
}

const SAFETY_PATTERN = /chest pain|chest pressure|faint|passed out|shortness of breath|cannot breathe|starv|purge|laxative|anorex|bulimi|eating disorder|crash diet|under 800|severe pain|sharp pain|dizz/;

/**
 * Searches exclusively through knowledge_base.json documents
 */
export function findBestKnowledgeDoc(query: string): KnowledgeDoc {
  const normQuery = normalize(query);
  const tokens = tokenize(query);
  const tokenSet = new Set(tokens);

  // Immediate safety check using knowledge_base.json 'safety' doc
  if (SAFETY_PATTERN.test(normQuery)) {
    const safetyDoc = KNOWLEDGE_BASE.find(d => d.id === 'safety');
    if (safetyDoc) return safetyDoc;
  }

  const scored = KNOWLEDGE_BASE.map(doc => {
    let score = 0;
    const normTitle = normalize(doc.title);
    const normContent = normalize(doc.content);

    // 1. Direct question match in knowledge_base.json
    for (const q of doc.questions || []) {
      const normQ = normalize(q);
      if (normQ === normQuery) {
        score += 200;
        break;
      }
      if (normQ.includes(normQuery) || normQuery.includes(normQ)) {
        score += 100;
        break;
      }
      const qTokens = tokenize(q);
      const matchCount = qTokens.filter(t => tokenSet.has(t)).length;
      if (matchCount >= 2) {
        score += matchCount * 20;
      }
    }

    // 2. Tag matches in knowledge_base.json
    for (const tag of doc.tags || []) {
      const normTag = normalize(tag);
      if (tokenSet.has(normTag)) {
        score += 30;
      } else if (normQuery.includes(normTag)) {
        score += 25;
      }
    }

    // 3. Title / Topic match in knowledge_base.json
    if (normTitle.includes(normQuery)) {
      score += 50;
    } else {
      for (const t of tokens) {
        if (normTitle.includes(t)) score += 15;
      }
    }

    // 4. Content tokens
    for (const t of tokens) {
      if (normContent.includes(t)) score += 2;
    }

    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return highest scored document or fallback to first doc
  return scored[0]?.score > 0 ? scored[0].doc : KNOWLEDGE_BASE[0];
}

/**
 * Generates structured answer using knowledge_base.json exclusively
 */
export function getCoachAnswer(message: string, context: CoachContext): CoachResult {
  const doc = findBestKnowledgeDoc(message);

  let personalizedContext = '';
  if (context.profile) {
    const p = context.profile;
    if (doc.id === 'calories-tdee' && p.bmr && p.tdee) {
      personalizedContext = `Based on your profile, your estimated BMR is ${Math.round(p.bmr)} kcal and TDEE is ${Math.round(p.tdee)} kcal. `;
    } else if (doc.id === 'protein' && p.weightKg) {
      personalizedContext = `For your current weight of ${p.weightKg} kg, `;
    } else if (doc.id === 'water' && p.dailyWaterIntakeLiters) {
      personalizedContext = `Your daily baseline target is ${p.dailyWaterIntakeLiters.toFixed(1)} L. `;
    }
  }

  const answer = personalizedContext ? `${personalizedContext}${doc.content}` : doc.content;
  const sources = doc.source && doc.source.length > 0 ? doc.source : [doc.title];
  const followUpQuestions = doc.follow_up_questions || [];

  return {
    answer,
    sources,
    followUpQuestions,
    references: doc.source || [],
    docTitle: doc.title,
    intent: doc.intent,
  };
}

/**
 * Backward-compatible function returning raw answer string from knowledge_base.json
 */
export const generateCoachResponse = (
  message: string,
  context: CoachContext
): string => {
  return getCoachAnswer(message, context).answer;
};
