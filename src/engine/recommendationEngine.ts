import type {
  UserProfile,
  FitnessStrategy,
  WorkoutSplit,
  Experience,
  Goal,
  Gender,
} from '../types/user';
import { calculateBMR, calculateTDEE, calculateMacros, calculateDailyCalories } from './bodyComposition';

export interface RecommendationResult {
  strategy: FitnessStrategy;
  strategyLabel: string;
  strategyReason: string;
  confidence: number;
  split: WorkoutSplit;
  splitLabel: string;
  splitReason: string;
  calories: number;
  protein: number;
  proteinMin: number;
  proteinMax: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
  weeklySets: Record<string, number>;
  priorityMuscles: string[];
  source: 'ml' | 'rules';
}

const STRATEGY_LABELS: Record<FitnessStrategy, string> = {
  lean_bulk: 'Lean Bulk',
  cut: 'Fat Loss',
  aggressive_cut: 'Aggressive Fat Loss',
  recomp: 'Body Recomposition',
  maintenance: 'Maintenance',
  strength: 'Strength Focus',
};

const SPLIT_LABELS: Record<WorkoutSplit, string> = {
  full_body: 'Full Body',
  upper_lower: 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
  ppl_ul: 'PPL + Upper / Lower',
  bro: 'Body-Part Split',
};

export function recommendStrategy(profile: UserProfile): { strategy: FitnessStrategy; reason: string; confidence: number } {
  const { goal, bodyFatPercent, experience, gender, sleepHours, stressLevel } = profile;
  const highBf = gender === 'male' ? bodyFatPercent >= 22 : bodyFatPercent >= 32;
  const moderateBf = gender === 'male' ? bodyFatPercent >= 16 : bodyFatPercent >= 26;
  const lean = gender === 'male' ? bodyFatPercent <= 12 : bodyFatPercent <= 20;

  let strategy: FitnessStrategy = 'maintenance';
  let reason = '';
  let confidence = 82;

  if (goal === 'fat_loss') {
    if (highBf && experience !== 'beginner') {
      strategy = 'aggressive_cut';
      reason = 'Body fat is high enough that a larger deficit is reasonable, with protein kept elevated to protect muscle.';
      confidence = 88;
    } else {
      strategy = 'cut';
      reason = 'A moderate calorie deficit supports fat loss while remaining sustainable for training quality.';
      confidence = 90;
    }
  } else if (goal === 'muscle_gain') {
    if (highBf) {
      strategy = 'recomp';
      reason = 'Body fat is relatively high for a surplus. Recomposition (maintenance calories, high protein, progressive training) is the safer first phase.';
      confidence = 86;
    } else if (lean || experience === 'beginner') {
      strategy = 'lean_bulk';
      reason = experience === 'beginner'
        ? 'Beginners can gain muscle on a small surplus without needing an aggressive bulk.'
        : 'A lean surplus of 200–300 kcal supports muscle gain while limiting excess fat.';
      confidence = 92;
    } else {
      strategy = 'lean_bulk';
      reason = 'A controlled surplus matches a muscle-gain goal without jumping to an aggressive bulk.';
      confidence = 88;
    }
  } else if (goal === 'recomposition') {
    strategy = 'recomp';
    reason = 'Maintenance calories plus high protein and progressive overload is the standard recomposition approach.';
    confidence = 90;
  } else if (goal === 'strength' || goal === 'powerlifting') {
    strategy = 'strength';
    reason = 'Strength goals need near-maintenance or a small surplus so neural and recovery demands are covered.';
    confidence = 87;
  } else if (goal === 'athletic' || goal === 'endurance') {
    strategy = moderateBf ? 'cut' : 'maintenance';
    reason = 'Performance goals are served best by stable energy availability, with a mild cut only if body fat is elevated.';
    confidence = 80;
  }

  if (sleepHours < 6 || stressLevel === 'high') {
    if (strategy === 'aggressive_cut') strategy = 'cut';
    confidence -= 8;
    reason += ' Recovery looks limited (sleep/stress), so the plan stays conservative.';
  }

  return { strategy, reason: reason.trim(), confidence: Math.max(55, Math.min(96, confidence)) };
}

export function recommendSplit(profile: UserProfile): { split: WorkoutSplit; reason: string } {
  const days = Math.min(6, Math.max(2, profile.daysPerWeek || 3));
  const exp = profile.experience;

  if (days <= 2) {
    return { split: 'full_body', reason: 'With only 2 training days, full-body sessions hit each muscle often enough to grow.' };
  }

  if (exp === 'beginner') {
    if (days <= 3) {
      return { split: 'full_body', reason: 'Beginners recover well from full-body work and learn compound patterns faster with higher frequency.' };
    }
    return { split: 'upper_lower', reason: 'Four or more days as a beginner is better as upper/lower than a body-part split — more practice, less junk volume.' };
  }

  if (exp === 'intermediate') {
    if (days === 3) return { split: 'ppl', reason: 'Three days maps cleanly to Push / Pull / Legs for an intermediate trainee.' };
    if (days === 4) return { split: 'upper_lower', reason: 'Four days is the classic upper/lower setup: each muscle twice per week.' };
    if (days >= 5) return { split: 'ppl_ul', reason: 'Five or six days allows PPL plus an extra upper/lower specialization day.' };
  }

  if (days <= 3) return { split: 'ppl', reason: 'Advanced trainees can use PPL even on 3 days, with higher intensity per session.' };
  if (days === 4) return { split: 'upper_lower', reason: 'Upper/lower still scales well for advanced volume if rest between sessions is protected.' };
  if (days === 5) return { split: 'ppl_ul', reason: 'Five days supports PPL plus specialization for lagging muscles.' };
  return { split: 'ppl', reason: 'Six days is a natural 2× PPL rotation for advanced hypertrophy.' };
}

export function laggingMuscles(profile: UserProfile): string[] {
  const ratings = profile.muscleRatings || { chest: 5, back: 5, shoulders: 5, arms: 5, legs: 5, core: 5 };
  return Object.entries(ratings)
    .filter(([, score]) => score <= 4)
    .sort((a, b) => a[1] - b[1])
    .map(([muscle]) => muscle);
}

export function weeklySetTargets(profile: UserProfile, strategy: FitnessStrategy): Record<string, number> {
  const exp = profile.experience;
  let base = exp === 'beginner' ? 10 : exp === 'intermediate' ? 14 : 16;
  if (strategy === 'cut' || strategy === 'aggressive_cut') base = Math.max(8, base - 2);
  if (profile.workoutDuration <= 45) base = Math.max(8, base - 2);
  if (profile.workoutDuration >= 90) base += 2;

  const groups = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
  const ratings = profile.muscleRatings || { chest: 5, back: 5, shoulders: 5, arms: 5, legs: 5, core: 5 };
  const targets: Record<string, number> = {};

  for (const g of groups) {
    const rating = ratings[g as keyof typeof ratings] ?? 5;
    let sets = base;
    if (rating <= 3) sets += 6;
    else if (rating <= 4) sets += 4;
    else if (rating >= 8) sets -= 4;
    else if (rating >= 7) sets -= 2;
    if (g === 'core') sets = Math.min(sets, 10);
    targets[g] = Math.max(6, Math.min(20, sets));
  }
  return targets;
}

export function calorieTargetForStrategy(tdee: number, strategy: FitnessStrategy, gender: Gender): number {
  let calories = tdee;
  switch (strategy) {
    case 'lean_bulk': calories = tdee + 250; break;
    case 'cut': calories = tdee - 400; break;
    case 'aggressive_cut': calories = tdee - 550; break;
    case 'recomp':
    case 'maintenance': calories = tdee; break;
    case 'strength': calories = tdee + 150; break;
  }
  const floor = gender === 'female' ? 1400 : 1600;
  return Math.max(floor, Math.round(calories));
}

export function proteinTarget(weightKg: number, strategy: FitnessStrategy): { target: number; min: number; max: number } {
  let min = 1.6;
  let max = 2.2;
  if (strategy === 'cut' || strategy === 'aggressive_cut') {
    min = 2.0;
    max = 2.4;
  } else if (strategy === 'lean_bulk') {
    min = 1.6;
    max = 2.2;
  } else if (strategy === 'strength') {
    min = 1.8;
    max = 2.4;
  } else {
    min = 1.6;
    max = 2.2;
  }
  const mid = (min + max) / 2;
  return {
    target: Math.round(weightKg * mid),
    min: Math.round(weightKg * min),
    max: Math.round(weightKg * max),
  };
}

export function buildRecommendation(profile: UserProfile, source: 'ml' | 'rules' = 'rules'): RecommendationResult {
  const { strategy, reason, confidence } = recommendStrategy(profile);
  const split = recommendSplit(profile);
  const bmr = calculateBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel, profile.jobType, profile.dailySteps);
  const calories = calorieTargetForStrategy(tdee, strategy, profile.gender);
  const protein = proteinTarget(profile.weightKg, strategy);
  const macros = calculateMacros(calories, profile.weightKg, profile.goal);

  return {
    strategy,
    strategyLabel: STRATEGY_LABELS[strategy],
    strategyReason: reason,
    confidence,
    split: split.split,
    splitLabel: SPLIT_LABELS[split.split],
    splitReason: split.reason,
    calories,
    protein: protein.target,
    proteinMin: protein.min,
    proteinMax: protein.max,
    carbs: macros.carbs,
    fat: macros.fat,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    weeklySets: weeklySetTargets(profile, strategy),
    priorityMuscles: laggingMuscles(profile),
    source,
  };
}

export function encodeExperience(exp: Experience): number {
  return exp === 'beginner' ? 0 : exp === 'intermediate' ? 1 : 2;
}

export function encodeGoal(goal: Goal): number {
  const map: Record<Goal, number> = {
    fat_loss: 0,
    muscle_gain: 1,
    recomposition: 2,
    strength: 3,
    athletic: 4,
    endurance: 5,
    powerlifting: 6,
  };
  return map[goal] ?? 2;
}

export { STRATEGY_LABELS, SPLIT_LABELS };
export { calculateDailyCalories };
