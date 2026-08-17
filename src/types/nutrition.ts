export interface NutritionPlan {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  waterLiters: number;
  micronutrients?: {
    vitaminD?: string;
    magnesium?: string;
    zinc?: string;
    omega3?: string;
    calcium?: string;
    iron?: string;
  };
  meals: Meal[];
  supplements: SupplementRecommendation[];
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  foods: Food[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  logged?: boolean;
  skipped?: boolean;
}

export interface Food {
  name: string;
  amount: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export interface SupplementRecommendation {
  name: string;
  dosage: string;
  timing: string;
  benefits: string;
  safetyWarning: string;
  scientificSupport: string;
}

