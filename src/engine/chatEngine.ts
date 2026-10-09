import type { UserProfile } from '../types/user';
import type { WorkoutPlan } from '../types/workout';
import type { NutritionPlan } from '../types/nutrition';
import { KNOWLEDGE_BASE, type KnowledgeDoc } from '../data/knowledgeBase';

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
  followUpQuestions?: string[];
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

export function retrieveFromKnowledgeBase(query: string, k = 3): { doc: KnowledgeDoc; score: number }[] {
  const normQuery = normalize(query);
  const tokens = tokenize(query);
  const tokenSet = new Set(tokens);

  return [...KNOWLEDGE_BASE]
    .map(doc => {
      let score = 0;
      const normTitle = normalize(doc.title);
      const normContent = normalize(doc.content);

      // 1. Safety check
      if (doc.id === 'safety' && SAFETY_PATTERN.test(normQuery)) {
        score += 500;
      }

      // 2. High priority question matching
      for (const q of doc.questions || []) {
        const normQ = normalize(q);
        if (normQ === normQuery) {
          score += 150;
          break;
        }
        if (normQ.includes(normQuery) || normQuery.includes(normQ)) {
          score += 80;
          break;
        }
        const qTokens = tokenize(q);
        const matchCount = qTokens.filter(t => tokenSet.has(t)).length;
        if (matchCount >= 2) {
          score += matchCount * 15;
        }
      }

      // 3. Tag matching
      for (const tag of doc.tags || []) {
        const normTag = normalize(tag);
        if (tokenSet.has(normTag)) {
          score += 25;
        } else if (normQuery.includes(normTag)) {
          score += 20;
        }
      }

      // 4. Title / Topic matching
      if (normTitle.includes(normQuery)) {
        score += 40;
      } else {
        for (const t of tokens) {
          if (normTitle.includes(t)) score += 10;
        }
      }

      // 5. Content token presence
      for (const t of tokens) {
        if (normContent.includes(t)) score += 2;
      }

      return { doc, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function answerGymQuestion(question: string, ctx: ChatContext): ChatAnswer {
  const norm = normalize(question);

  // If safety
  if (SAFETY_PATTERN.test(norm)) {
    const safetyDoc = KNOWLEDGE_BASE.find(d => d.id === 'safety') || KNOWLEDGE_BASE[0];
    return {
      intent: 'safety',
      sources: safetyDoc.source || [safetyDoc.title],
      usedPlanData: false,
      answer: safetyDoc.content,
      followUpQuestions: safetyDoc.follow_up_questions || [],
    };
  }

  const matches = retrieveFromKnowledgeBase(question, 3);
  const best = matches[0]?.doc || KNOWLEDGE_BASE[0];

  const sources = best.source && best.source.length > 0 ? best.source : [best.title];
  const followUpQuestions = best.follow_up_questions || [];

  return {
    intent: best.intent || 'general',
    sources,
    usedPlanData: Boolean(ctx.profile),
    answer: best.content,
    followUpQuestions,
  };
}
