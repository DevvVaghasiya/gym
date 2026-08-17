import type { UserProfile } from '../types/user';
import type { ProgressEntry } from '../types/progress';
import { calorieTargetForStrategy, recommendStrategy } from './recommendationEngine';

export interface AdaptiveAdvice {
  status: 'insufficient_data' | 'on_track' | 'too_slow' | 'too_fast' | 'hold';
  title: string;
  detail: string;
  calorieDelta: number;
  nextCalories: number;
}

export function analyzeProgress(
  profile: UserProfile,
  entries: ProgressEntry[],
  currentCalories: number
): AdaptiveAdvice {
  if (entries.length < 2) {
    return {
      status: 'insufficient_data',
      title: 'Need more check-ins',
      detail: 'Log weight at least twice (ideally weekly) before the engine adjusts calories. Week-to-week noise is normal.',
      calorieDelta: 0,
      nextCalories: currentCalories,
    };
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000);
  const weeks = days / 7;
  const deltaKg = last.weightKg - first.weightKg;
  const perWeek = deltaKg / Math.max(weeks, 0.5);
  const strategy = profile.recommendedStrategy || recommendStrategy(profile).strategy;
  const floor = profile.gender === 'female' ? 1400 : 1600;

  const clamp = (kcal: number) => Math.max(floor, kcal);

  if (strategy === 'lean_bulk' || strategy === 'strength') {
    if (perWeek < 0.1) {
      return {
        status: 'too_slow',
        title: 'Muscle-gain pace is slow',
        detail: `Weight changed about ${perWeek.toFixed(2)} kg/week. A lean bulk often moves +0.2 to +0.5 kg/week. A small surplus increase is reasonable if sleep and protein are already solid.`,
        calorieDelta: 150,
        nextCalories: clamp(currentCalories + 150),
      };
    }
    if (perWeek > 0.7) {
      return {
        status: 'too_fast',
        title: 'Weight is rising quickly',
        detail: `About ${perWeek.toFixed(2)} kg/week is faster than a typical lean bulk and may include extra fat. Trim the surplus slightly and keep protein high.`,
        calorieDelta: -150,
        nextCalories: clamp(currentCalories - 150),
      };
    }
    return {
      status: 'on_track',
      title: 'Lean-bulk trend looks reasonable',
      detail: `About ${perWeek.toFixed(2)} kg/week. Keep training progressive and reassess in another 2 weeks.`,
      calorieDelta: 0,
      nextCalories: currentCalories,
    };
  }

  if (strategy === 'cut' || strategy === 'aggressive_cut') {
    if (perWeek > -0.15) {
      return {
        status: 'too_slow',
        title: 'Fat-loss pace is slow',
        detail: `Weight changed about ${perWeek.toFixed(2)} kg/week. If adherence is good, a slightly larger deficit can be tried — never below ${floor} kcal in this app.`,
        calorieDelta: -150,
        nextCalories: clamp(currentCalories - 150),
      };
    }
    if (perWeek < -1.0) {
      return {
        status: 'too_fast',
        title: 'Loss is too aggressive',
        detail: `About ${Math.abs(perWeek).toFixed(2)} kg/week is faster than a sustainable cut and raises muscle-loss risk. Increase calories and watch energy in the gym.`,
        calorieDelta: 150,
        nextCalories: clamp(currentCalories + 150),
      };
    }
    return {
      status: 'on_track',
      title: 'Fat-loss trend looks reasonable',
      detail: `About ${perWeek.toFixed(2)} kg/week. Keep protein high and avoid adding extra cardio as a first lever.`,
      calorieDelta: 0,
      nextCalories: currentCalories,
    };
  }

  return {
    status: 'hold',
    title: 'Recomp / maintenance — watch body fat and strength',
    detail: `Weight changed ${perWeek.toFixed(2)} kg/week. For recomposition, strength going up and waist/body fat drifting down matters more than scale weight.`,
    calorieDelta: 0,
    nextCalories: calorieTargetForStrategy(profile.tdee, strategy, profile.gender),
  };
}
