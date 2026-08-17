import type { ExerciseLog, SetLog } from '../types/workout';
import type { Experience, Goal } from '../types/user';

export type OverloadAction = 'increase_weight' | 'increase_reps' | 'increase_sets' | 'maintain' | 'decrease_weight' | 'deload_week' | 'change_exercise';

export interface OverloadRecommendation {
  action: OverloadAction;
  message: string;
  suggestedWeight?: number;
  suggestedReps?: number;
  suggestedSets?: number;
  alternativeExerciseId?: string;
}

export function evaluateProgressiveOverload(
  exerciseId: string,
  exerciseName: string,
  targetSets: number,
  targetReps: number,
  recentLogs: ExerciseLog[],
  experience: Experience,
  goal: Goal,
  painLevel: number = 0,
  energyLevel: number = 5,
  recoveryScore: number = 80
): OverloadRecommendation {
  
  if (recentLogs.length === 0) {
    return {
      action: 'maintain',
      message: 'Initial session logged. Focus on standard movement tempo (3-0-1-0) and safety.'
    };
  }

  const lastSession = recentLogs[recentLogs.length - 1];
  const setsLogged = lastSession.sets;
  
  // Pain adaptation
  if (painLevel > 4) {
    return {
      action: 'change_exercise',
      message: `Pain level high (${painLevel}/10) logged. Swap to dumbbell or machine joint-friendly alternatives.`,
    };
  } else if (painLevel > 2) {
    // Reduce weight due to moderate pain
    const lastWeight = setsLogged[0]?.weight || 0;
    const reducedWeight = Math.max(0, Math.round((lastWeight * 0.8) / 2.5) * 2.5);
    return {
      action: 'decrease_weight',
      message: `Mild pain (${painLevel}/10) detected. Auto-reducing volume & intensity by 20% next week.`,
      suggestedWeight: reducedWeight
    };
  }

  // Recovery adaptation
  if (recoveryScore < 50) {
    return {
      action: 'maintain',
      message: `Poor recovery score (${recoveryScore}%). Maintain current weights, avoid overload, and prioritize rest.`,
    };
  }

  // Check if completed all sets and reps
  const totalSets = setsLogged.length;
  const completedSets = setsLogged.filter(s => s.completed).length;
  const avgReps = setsLogged.reduce((sum, s) => sum + s.reps, 0) / (totalSets || 1);
  const avgRPE = setsLogged.reduce((sum, s) => sum + (s.rpe || 8), 0) / (totalSets || 1);
  
  const lastWeight = setsLogged[0]?.weight || 0;

  // Deload check: if failing repeatedly or extremely low energy
  const consecutiveFailures = recentLogs.slice(-3).filter(log => {
    return log.sets.some(s => !s.completed);
  }).length;

  if (consecutiveFailures >= 3 || (energyLevel <= 1.5 && consecutiveFailures >= 2)) {
    const deloadWeight = Math.max(0, Math.round((lastWeight * 0.85) / 2.5) * 2.5);
    return {
      action: 'deload_week',
      message: `Accumulated fatigue detected. Triggering a 15% deload week to allow muscle resensitization.`,
      suggestedWeight: deloadWeight,
      suggestedReps: targetReps,
      suggestedSets: Math.max(2, targetSets - 1)
    };
  }

  // Progression Logic
  const allCompleted = completedSets === targetSets && setsLogged.every(s => s.reps >= targetReps);

  if (allCompleted) {
    // If it felt easy (avg RPE <= 7.5), increase weight
    if (avgRPE <= 8) {
      let increment = 2.5;
      if (experience === 'beginner') increment = 2.5;
      else if (experience === 'intermediate') increment = 2.5;
      else increment = 1.25; // advanced overload is slower

      // Large lifts (Squat, Deadlift) can scale faster
      if (exerciseName.toLowerCase().includes('squat') || exerciseName.toLowerCase().includes('deadlift')) {
        increment = experience === 'beginner' ? 5.0 : 2.5;
      }

      return {
        action: 'increase_weight',
        message: `RPE target hit successfully. Auto-increasing weight by +${increment} kg.`,
        suggestedWeight: lastWeight + increment,
        suggestedReps: targetReps
      };
    } else {
      // Completed but high effort (RPE >= 8.5) -> increase reps first or maintain to solidify weight
      if (goal === 'muscle_gain' && targetReps < 12) {
        return {
          action: 'increase_reps',
          message: 'Target sets completed. Increasing repetition range to stimulate hypertrophy.',
          suggestedWeight: lastWeight,
          suggestedReps: targetReps + 1
        };
      }
      return {
        action: 'maintain',
        message: 'Perfect intensity. Maintain current training volume to solidify adaptations.',
        suggestedWeight: lastWeight,
        suggestedReps: targetReps
      };
    }
  }

  // Under-performing: user failed to hit reps
  if (completedSets < targetSets || avgReps < targetReps) {
    const failedHard = setsLogged.some(s => s.reps < targetReps - 2);
    if (failedHard) {
      const reducedWeight = Math.max(0, Math.round((lastWeight * 0.9) / 2.5) * 2.5);
      return {
        action: 'decrease_weight',
        message: 'Missed target reps by significant margin. Reducing intensity by 10% next session.',
        suggestedWeight: reducedWeight,
        suggestedReps: targetReps
      };
    } else {
      return {
        action: 'maintain',
        message: 'Target reps missed slightly. Maintain weight and strive for completed volume next week.',
        suggestedWeight: lastWeight,
        suggestedReps: targetReps
      };
    }
  }

  return {
    action: 'maintain',
    message: 'Maintain variables. Focus on perfect eccentric tempo.',
    suggestedWeight: lastWeight,
    suggestedReps: targetReps
  };
}
