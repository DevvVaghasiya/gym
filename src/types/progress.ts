export interface ProgressEntry {
  id?: string;
  userEmail?: string;
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  muscleMassPercent?: number;
  notes?: string;
}

export interface PRRecord {
  id?: string;
  userEmail?: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  estimated1RM: number;
}

export interface WeeklyAIReport {
  weekEndDate: string;
  strengthImprovementPercent: number;
  muscleGrowthPercent: number;
  fatLossPercent: number;
  workoutConsistencyPercent: number;
  averageRecoveryScore: number;
  averageSleepHours: number;
  averageProteinGrams: number;
  averageCalorieIntake: number;
  averageHydrationScore: number;
  totalTrainingVolumeKg: number;
  missedWorkoutsCount: number;
  weightChangeKg: number;
  bestPerformingMuscleGroup: string;
  weakestMuscleGroup: string;
  insights: string[];
  recommendations: string[];
}

export interface AIProjections {
  futureWeights: { date: string; weightKg: number; confidenceScore: number }[];
  futurePRs: { exerciseId: string; exerciseName: string; projected1RM: number; date: string }[];
  timelineGoalWeeks: number;
  estimatedGoalCompletionDate: string;
}
