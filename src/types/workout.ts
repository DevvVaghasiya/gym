import type { Equipment, Experience } from './user';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'forearms' | 'traps';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  type: 'compound' | 'isolation';
  difficulty: Experience[];
  instructions?: string[];
  coachingTips?: string[];
  commonMistakes?: string[];
  tempo?: string;
  estimatedCaloriesBurnedPerMin?: number;
  alternatives?: {
    machine?: string;
    dumbbell?: string;
    barbell?: string;
    cable?: string;
    bodyweight?: string;
  };
  image?: string;
  animation3D?: string;
  videoUrl?: string;
}

export interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  recommendedWeight: { min: number; max: number };
  restSeconds: number;
  targetRPE?: number;
  tempo?: string;
  estimatedCaloriesBurned?: number;
}

export interface WorkoutDay {
  day: string;
  name: string;
  focus: string;
  exercises: WorkoutExercise[];
  isRestDay: boolean;
}

export interface WorkoutPlan {
  id: string;
  weekNumber: number;
  goalWeightKg?: number;
  days: WorkoutDay[];
  createdAt: string;
}

export interface WorkoutLog {
  id: string;
  date: string;
  dayName: string;
  exercises: ExerciseLog[];
  duration: number; // in minutes
  caloriesBurned: number;
  mood?: string;
  soreness?: string;
  painLevel?: number; // 0-10
  energyLevel?: number; // 1-5
  completionPercentage: number;
  notes: string;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

export interface SetLog {
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
}

