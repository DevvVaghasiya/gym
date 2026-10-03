export type Gender = 'male' | 'female';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'fat_loss' | 'muscle_gain' | 'strength' | 'recomposition' | 'athletic' | 'endurance' | 'powerlifting';
export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell' | 'resistance_band';
export type GymType = 'commercial' | 'home' | 'crossfit' | 'powerlifting';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'heavy' | 'athlete';
export type FoodPreference = 'vegetarian' | 'vegan' | 'jain' | 'eggetarian' | 'non_veg';
export type JobType = 'sitting' | 'standing' | 'physical';
export type CuisinePreference = 'indian' | 'gujarati' | 'punjabi' | 'south_indian' | 'north_indian' | 'continental';
export type FitnessStrategy = 'lean_bulk' | 'cut' | 'aggressive_cut' | 'recomp' | 'maintenance' | 'strength';
export type WorkoutSplit = 'full_body' | 'upper_lower' | 'ppl' | 'ppl_ul' | 'bro';

export interface MuscleRatings {
  chest: number;
  back: number;
  shoulders: number;
  arms: number;
  legs: number;
  core: number;
}

export interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  selectedWorkoutDays?: string[];
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  bodyFatPercent: number;
  muscleMassPercent: number;
  waterPercent: number;
  bmi: number;
  bmr: number;
  tdee: number;
  experience: Experience;
  goal: Goal;
  daysPerWeek: number;
  workoutDuration: number; // in minutes
  gymType: GymType;
  availableEquipment: Equipment[];
  injuries: string[];
  mobilityIssues: string[];
  previousSurgeries: string[];
  activityLevel: ActivityLevel;
  occupation: string;
  jobType?: JobType;
  dailySteps?: number;
  sleepHours: number;
  stressLevel: 'low' | 'medium' | 'high';
  dailyWaterIntakeLiters: number;
  muscleRatings?: MuscleRatings;
  cuisinePreference?: CuisinePreference;
  bench1RM?: number;
  squat1RM?: number;
  deadlift1RM?: number;
  recommendedStrategy?: FitnessStrategy;
  recommendedSplit?: WorkoutSplit;
  dailyCalories?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  smokingHabit: boolean;
  alcoholConsumption: 'none' | 'light' | 'moderate' | 'heavy';
  country: string;
  foodPreference: FoodPreference;
  dailyFoodBudget: number; // in local currency
  numberOfMeals: number;
  allergies: string[];
  favoriteFoods: string[];
  dislikedFoods: string[];
  workoutTime: string; // e.g. "07:00"
  wakeupTime: string; // e.g. "06:00"
  sleepTime: string; // e.g. "22:00"
  additionalHealthInfo?: string;
  avatar?: string;
  
  // Gamification metrics
  xp: number;
  level: number;
  badges: string[];
  streak: number;
}

