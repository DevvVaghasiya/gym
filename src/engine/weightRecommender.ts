import type { Exercise } from '../types/workout';
import type { UserProfile } from '../types/user';

export function computeGoalWeight(profile: UserProfile): number {
  const { weightKg, goal, bodyFatPercent, muscleMassPercent } = profile;
  let adjustment = 0;

  if (goal === 'fat_loss') {
    // reduce 5-10% depending on body fat
    const extra = Math.min(0.08, Math.max(0.03, (bodyFatPercent - 15) / 100));
    adjustment = -0.06 - extra; // ~ -6% +/-
  } else if (goal === 'muscle_gain') {
    // gain 2-6% based on low muscle mass
    const extra = Math.min(0.04, Math.max(0, (20 - muscleMassPercent) / 200));
    adjustment = 0.03 + extra;
  } else if (goal === 'strength') {
    adjustment = 0.02; // slight gain
  } else {
    adjustment = 0; // recomposition keep roughly same
  }

  return Math.round((weightKg * (1 + adjustment)) * 10) / 10;
}

export function recommendWeight(exercise: Exercise, profile: UserProfile): { min: number; max: number } {
  // Use a simple strength index that factors weight, muscle mass and body fat
  const bw = profile.weightKg;
  const exp = profile.experience;
  const gen = profile.gender;
  const muscle = profile.muscleMassPercent || 0;
  const fat = profile.bodyFatPercent || 0;

  // Higher muscle mass increases effective strength, higher body fat slightly reduces relative strength
  const strengthIndex = bw * (1 + muscle / 100) * (1 - fat / 300);

  let baseMultiplier = 0.35; // default compound multiplier

  if (exercise.type === 'compound') {
    if (exercise.id === 'bench_press') baseMultiplier = 0.5;
    else if (exercise.id === 'squat') baseMultiplier = 0.8;
    else if (exercise.id === 'romanian_deadlift') baseMultiplier = 0.85;
    else if (exercise.id === 'deadlift') baseMultiplier = 1.0;
    else baseMultiplier = 0.45;

    // adjust by experience
    const expFactor = exp === 'beginner' ? 0.8 : exp === 'intermediate' ? 1.0 : 1.2;

    const target = strengthIndex * baseMultiplier * expFactor;
    const rounded = Math.round(target / 2.5) * 2.5;
    const min = Math.max(0, rounded - 5);
    const max = rounded + 5;
    return { min, max };
  } else {
    // Isolation exercises scale lower and depend on experience/gender
    let base = 8;
    if (exercise.id === 'db_curl' || exercise.id === 'hammer_curl') base = gen === 'male' ? 12 : 6;
    if (exercise.id === 'tricep_pushdown') base = gen === 'male' ? 20 : 10;

    // tweak by experience
    const expAdj = exp === 'beginner' ? 0.8 : exp === 'intermediate' ? 1.0 : 1.25;
    const min = Math.max(0, Math.round(base * expAdj));
    return { min, max: min + 6 };
  }
}

export function adjustWeightByRPE(currentWeight: number, rpe: number, targetRPE: number = 8): { newMin: number; newMax: number; feedback: string } {
  if (rpe < targetRPE - 1) {
    return { newMin: currentWeight + 2.5, newMax: currentWeight + 5, feedback: "Felt easy. Increase weight next time." };
  } else if (rpe > targetRPE + 1) {
    return { newMin: Math.max(0, currentWeight - 5), newMax: Math.max(0, currentWeight - 2.5), feedback: "Too hard. Decrease weight to maintain form." };
  } else {
    return { newMin: currentWeight, newMax: currentWeight + 2.5, feedback: "Perfect effort. Maintain weight or slightly increase if confident." };
  }
}

export function getWarmupSets(workingWeight: number): { weight: number, reps: number }[] {
  return [
    { weight: Math.max(20, Math.round(workingWeight * 0.3 / 2.5) * 2.5), reps: 15 },
    { weight: Math.round(workingWeight * 0.6 / 2.5) * 2.5, reps: 10 },
    { weight: Math.round(workingWeight * 0.8 / 2.5) * 2.5, reps: 5 }
  ];
}
