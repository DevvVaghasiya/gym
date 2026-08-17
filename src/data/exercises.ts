import type { Exercise } from '../types/workout';

export const EXERCISE_DATABASE: Exercise[] = [
  // CHEST
  { id: 'bench_press', name: 'Barbell Bench Press', muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['barbell'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'], alternatives: { dumbbell: 'Dumbbell Bench Press', machine: 'Machine Chest Press', bodyweight: 'Weighted Push-ups', cable: 'Cable Chest Press' } },
  { id: 'incline_db_press', name: 'Incline Dumbbell Press', muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['dumbbell'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'chest_fly', name: 'Dumbbell Chest Fly', muscleGroup: 'chest', secondaryMuscles: [], equipment: ['dumbbell'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'cable_fly', name: 'Cable Fly', muscleGroup: 'chest', secondaryMuscles: [], equipment: ['cable'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'push_ups', name: 'Push-ups', muscleGroup: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['bodyweight'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },
  
  // BACK
  { id: 'barbell_row', name: 'Barbell Row', muscleGroup: 'back', secondaryMuscles: ['biceps', 'forearms'], equipment: ['barbell'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'pull_up', name: 'Pull-up', muscleGroup: 'back', secondaryMuscles: ['biceps', 'forearms'], equipment: ['bodyweight'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'back', secondaryMuscles: ['biceps'], equipment: ['machine', 'cable'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'seated_cable_row', name: 'Seated Cable Row', muscleGroup: 'back', secondaryMuscles: ['biceps'], equipment: ['cable'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },
  
  // SHOULDERS
  { id: 'overhead_press', name: 'Overhead Press', muscleGroup: 'shoulders', secondaryMuscles: ['triceps', 'core'], equipment: ['barbell'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'lateral_raise', name: 'Lateral Raise', muscleGroup: 'shoulders', secondaryMuscles: [], equipment: ['dumbbell'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'face_pull', name: 'Face Pull', muscleGroup: 'shoulders', secondaryMuscles: ['back', 'traps'], equipment: ['cable'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },

  // BICEPS
  { id: 'barbell_curl', name: 'Barbell Curl', muscleGroup: 'biceps', secondaryMuscles: ['forearms'], equipment: ['barbell'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'db_curl', name: 'Dumbbell Curl', muscleGroup: 'biceps', secondaryMuscles: ['forearms'], equipment: ['dumbbell'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'hammer_curl', name: 'Hammer Curl', muscleGroup: 'biceps', secondaryMuscles: ['forearms'], equipment: ['dumbbell'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },

  // TRICEPS
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'triceps', secondaryMuscles: [], equipment: ['cable'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'skull_crusher', name: 'Skull Crusher', muscleGroup: 'triceps', secondaryMuscles: [], equipment: ['barbell'], type: 'isolation', difficulty: ['intermediate', 'advanced'] },
  { id: 'dips', name: 'Dips', muscleGroup: 'triceps', secondaryMuscles: ['chest', 'shoulders'], equipment: ['bodyweight'], type: 'compound', difficulty: ['intermediate', 'advanced'] },

  // QUADS
  { id: 'squat', name: 'Barbell Squat', muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings', 'core'], equipment: ['barbell'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'], alternatives: { dumbbell: 'Goblet Squat', machine: 'Leg Press / Hack Squat', bodyweight: 'Bulgarian Split Squat' } },
  { id: 'leg_press', name: 'Leg Press', muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: ['machine'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'leg_extension', name: 'Leg Extension', muscleGroup: 'quads', secondaryMuscles: [], equipment: ['machine'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'lunges', name: 'Lunges', muscleGroup: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: ['dumbbell', 'bodyweight'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },

  // HAMSTRINGS & GLUTES
  { id: 'romanian_deadlift', name: 'Romanian Deadlift', muscleGroup: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: ['barbell'], type: 'compound', difficulty: ['intermediate', 'advanced'] },
  { id: 'leg_curl', name: 'Leg Curl', muscleGroup: 'hamstrings', secondaryMuscles: [], equipment: ['machine'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'hip_thrust', name: 'Hip Thrust', muscleGroup: 'glutes', secondaryMuscles: ['hamstrings'], equipment: ['barbell'], type: 'compound', difficulty: ['beginner', 'intermediate', 'advanced'] },

  // CALVES
  { id: 'calf_raise_standing', name: 'Standing Calf Raise', muscleGroup: 'calves', secondaryMuscles: [], equipment: ['machine', 'dumbbell', 'bodyweight'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },

  // CORE
  { id: 'plank', name: 'Plank', muscleGroup: 'core', secondaryMuscles: ['shoulders'], equipment: ['bodyweight'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] },
  { id: 'cable_crunch', name: 'Cable Crunch', muscleGroup: 'core', secondaryMuscles: [], equipment: ['cable'], type: 'isolation', difficulty: ['beginner', 'intermediate', 'advanced'] }
];
