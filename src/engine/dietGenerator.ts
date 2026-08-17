import type { NutritionPlan, Meal, Food, SupplementRecommendation } from '../types/nutrition';
import type { UserProfile, FoodPreference } from '../types/user';
import { selectFoods, type FoodItem } from '../data/foods';
import { buildRecommendation } from './recommendationEngine';

// Supplement database
const SUPPLEMENT_DATABASE: SupplementRecommendation[] = [
  {
    name: 'Whey Protein',
    dosage: '1 scoop (25-30g) post-workout or in morning',
    timing: 'Within 45 minutes after workout, or as a snack',
    benefits: 'Enhances muscle protein synthesis, accelerates tissue recovery, and helps hit daily protein targets conveniently.',
    safetyWarning: 'Safe for healthy individuals. If lactose intolerant, substitute with Whey Isolate or Pea/Soy Vegan protein.',
    scientificSupport: 'High (Level A Evidence). Extensively researched for hypertrophic adaptations.'
  },
  {
    name: 'Creatine Monohydrate',
    dosage: '3-5g daily',
    timing: 'Consistently at any time of day, preferably with carbs/protein for absorption',
    benefits: 'Increases intramuscular phosphocreatine stores, improving short-burst power, maximum strength output, and cellular hydration.',
    safetyWarning: 'Ensure high water intake (3L+ daily). No loading phase is strictly required.',
    scientificSupport: 'Highest (Level A Evidence). The most scientifically proven strength supplement in existence.'
  },
  {
    name: 'Omega-3 Fish Oil',
    dosage: '1000 - 2000mg daily (minimum 500mg EPA/DHA)',
    timing: 'With your largest fat-containing meal for optimal absorption',
    benefits: 'Reduces systemic inflammation, supports cardiovascular health, improves joint lubrication, and aids cognitive recovery.',
    safetyWarning: 'Choose high-quality molecularly distilled oils to avoid heavy metal contaminants.',
    scientificSupport: 'High. Supported by extensive clinical research for cellular and joint health.'
  },
  {
    name: 'Vitamin D3 & K2',
    dosage: '2000 - 5000 IU Vitamin D3, 100mcg K2',
    timing: 'In the morning with fats',
    benefits: 'Crucial for calcium absorption, bone density, testosterone production, immune regulation, and muscle contraction.',
    safetyWarning: 'If taking blood thinners, consult a physician due to Vitamin K interaction.',
    scientificSupport: 'High. Essential for individuals with limited daily sunlight exposure.'
  },
  {
    name: 'Magnesium Bisglycinate / Citrate',
    dosage: '300 - 400mg daily',
    timing: '30-60 minutes before bedtime',
    benefits: 'Supports muscle relaxation, regulates central nervous system activity, enhances sleep depth (Slow Wave sleep), and prevents cramping.',
    safetyWarning: 'Excessive dosage can cause mild gastrointestinal upset.',
    scientificSupport: 'High. Essential mineral co-factor in over 300 biochemical reactions.'
  },
  {
    name: 'Zinc Monomethionine',
    dosage: '15 - 30mg daily',
    timing: 'At night, on an empty stomach or with magnesium (ZMA)',
    benefits: 'Key mineral for hormone synthesis, cellular repair, immune response, and natural testosterone production.',
    safetyWarning: 'Do not exceed 40g daily long-term as it can deplete copper levels.',
    scientificSupport: 'Moderate-High. Well supported for immune function and endocrine homeostasis.'
  }
];

const MEAL_SLOTS: Array<'breakfast' | 'lunch' | 'snack' | 'dinner'> = ['breakfast', 'lunch', 'snack', 'dinner'];
const MEAL_TIMES = ['08:00', '13:00', '16:30', '20:30', '11:00', '18:00'];
const MEAL_NAMES = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Brunch', 'Evening Meal'];

function pickTwo(list: FoodItem[], offset: number): [FoodItem, FoodItem] {
  if (list.length === 0) {
    const fallback: FoodItem = {
      name: 'Dal, rice and vegetables',
      amount: '1 plate',
      calories: 420,
      protein: 16,
      carbs: 70,
      fat: 8,
      fiber: 8,
      cuisine: 'indian',
      preference: ['vegetarian'],
      mealType: ['lunch'],
      budgetTier: 'low',
    };
    return [fallback, fallback];
  }
  const a = list[offset % list.length];
  const b = list[(offset + 1) % list.length] || a;
  return [a, b];
}

const scaleFood = (f: Food, factor: number): Food => ({
  name: f.name,
  amount: f.amount.includes('g')
    ? `${Math.max(20, Math.round(parseInt(f.amount, 10) * factor) || Math.round(60 * factor))}g`
    : `${Math.round(factor * 10) / 10}× ${f.amount}`,
  calories: Math.round(f.calories * factor),
  protein: Math.round(f.protein * factor),
  carbs: Math.round(f.carbs * factor),
  fat: Math.round(f.fat * factor),
  fiber: f.fiber ? Math.round(f.fiber * factor) : 0,
  sugar: f.sugar ? Math.round(f.sugar * factor) : 0,
});

export function generateAIDietPlan(profile: UserProfile): NutritionPlan {
  const rec = buildRecommendation(profile);
  const targetCalories = rec.calories;
  const protein = rec.protein;
  const fat = rec.fat;
  const carbs = rec.carbs;
  const fiber = Math.round((targetCalories / 1000) * 14);
  const sugar = Math.round((targetCalories * 0.08) / 4);

  const mealCount = Math.min(6, Math.max(3, profile.numberOfMeals || 4));
  const preference = profile.foodPreference || 'vegetarian';
  const cuisine = profile.cuisinePreference || 'indian';

  const meals: Meal[] = [];

  for (let i = 0; i < mealCount; i++) {
    const slot = MEAL_SLOTS[i] || (i === mealCount - 1 ? 'dinner' : 'snack');
    const name = MEAL_NAMES[i] || `Meal ${i + 1}`;
    const time = MEAL_TIMES[i] || '19:00';
    const candidates = selectFoods({
      preference,
      cuisine,
      mealType: slot,
      budget: profile.dailyFoodBudget || 300,
      allergies: profile.allergies || [],
      disliked: profile.dislikedFoods || [],
    });
    const [item1, item2] = pickTwo(candidates, i * 2);
    const targetMealCal = targetCalories / mealCount;
    const sumCal = item1.calories + item2.calories;
    const scale = targetMealCal / (sumCal || 1);
    const foodItems: Food[] = [scaleFood(item1, scale * 0.6), scaleFood(item2, scale * 0.4)];

    const totalCals = foodItems.reduce((s, f) => s + f.calories, 0);
    const totalP = foodItems.reduce((s, f) => s + f.protein, 0);
    const totalC = foodItems.reduce((s, f) => s + f.carbs, 0);
    const totalF = foodItems.reduce((s, f) => s + f.fat, 0);

    meals.push({
      id: `meal_${i}_${Date.now()}`,
      name,
      time,
      foods: foodItems,
      totalCalories: totalCals,
      totalProtein: totalP,
      totalCarbs: totalC,
      totalFat: totalF,
      logged: false,
      skipped: false
    });
  }

  // Filter supplements - e.g. if muscle gain, recommend creatine & whey. If vegan, suggest zinc/magnesium.
  const supplements = [...SUPPLEMENT_DATABASE].slice(0, profile.goal === 'muscle_gain' || profile.goal === 'strength' ? 4 : 3);

  return {
    dailyCalories: targetCalories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    waterLiters: profile.dailyWaterIntakeLiters || 3.0,
    meals,
    supplements,
    micronutrients: {
      vitaminD: '2000 IU',
      magnesium: '350 mg',
      zinc: '20 mg',
      omega3: '1000 mg'
    }
  };
}

export function regenerateMealInPlan(
  plan: NutritionPlan, 
  mealId: string, 
  preference: FoodPreference
): NutritionPlan {
  const updatedMeals = plan.meals.map(meal => {
    if (meal.id !== mealId) return meal;

    const candidates = selectFoods({
      preference,
      cuisine: 'indian',
      mealType: meal.name.toLowerCase().includes('break')
        ? 'breakfast'
        : meal.name.toLowerCase().includes('lunch')
          ? 'lunch'
          : meal.name.toLowerCase().includes('dinner')
            ? 'dinner'
            : 'snack',
      budget: 300,
      allergies: [],
      disliked: [],
    });
    const [item1, item2] = pickTwo(candidates, Math.floor(Math.random() * 20));

    // Scale to match original meal calorie target
    const targetMealCal = meal.totalCalories;
    const sumCal = item1.calories + item2.calories;
    const scale = targetMealCal / (sumCal || 1);

    const scaleFood = (f: Food, factor: number): Food => ({
      name: f.name,
      amount: f.amount.includes('g') 
        ? `${Math.round(parseInt(f.amount) * factor)}g` 
        : `${Math.round(factor * 10) / 10}x ${f.amount}`,
      calories: Math.round(f.calories * factor),
      protein: Math.round(f.protein * factor),
      carbs: Math.round(f.carbs * factor),
      fat: Math.round(f.fat * factor),
      fiber: f.fiber ? Math.round(f.fiber * factor) : 0,
      sugar: f.sugar ? Math.round(f.sugar * factor) : 0
    });

    const newFoods = [
      scaleFood(item1, scale * 0.6),
      scaleFood(item2, scale * 0.4)
    ];

    return {
      ...meal,
      foods: newFoods,
      totalProtein: newFoods.reduce((s, f) => s + f.protein, 0),
      totalCarbs: newFoods.reduce((s, f) => s + f.carbs, 0),
      totalFat: newFoods.reduce((s, f) => s + f.fat, 0)
    };
  });

  return {
    ...plan,
    meals: updatedMeals
  };
}

export function recalculateSkippedMealMacros(
  plan: NutritionPlan, 
  skippedMealId: string
): NutritionPlan {
  const targetMeal = plan.meals.find(m => m.id === skippedMealId);
  if (!targetMeal || targetMeal.skipped) return plan;

  const remainingMeals = plan.meals.filter(m => m.id !== skippedMealId && !m.skipped && !m.logged);
  if (remainingMeals.length === 0) {
    // If no remaining unlogged meals exist, just mark it skipped
    return {
      ...plan,
      meals: plan.meals.map(m => m.id === skippedMealId ? { ...m, skipped: true } : m)
    };
  }

  // Distribute skipped macros to remaining unlogged meals
  const dCalories = targetMeal.totalCalories / remainingMeals.length;
  const dProtein = targetMeal.totalProtein / remainingMeals.length;
  const dCarbs = targetMeal.totalCarbs / remainingMeals.length;
  const dFat = targetMeal.totalFat / remainingMeals.length;

  const updatedMeals = plan.meals.map(meal => {
    if (meal.id === skippedMealId) {
      return { ...meal, skipped: true };
    }
    
    const isUnloggedRemaining = remainingMeals.some(rm => rm.id === meal.id);
    if (!isUnloggedRemaining) return meal;

    // Scale each food in the meal slightly to accommodate distributed macros
    const mealScale = (meal.totalCalories + dCalories) / meal.totalCalories;
    const updatedFoods = meal.foods.map(f => ({
      ...f,
      amount: f.amount.includes('g') 
        ? `${Math.round(parseInt(f.amount) * mealScale)}g` 
        : `${Math.round(mealScale * 10) / 10}x ${f.amount}`,
      calories: Math.round(f.calories * mealScale),
      protein: Math.round(f.protein * mealScale),
      carbs: Math.round(f.carbs * mealScale),
      fat: Math.round(f.fat * mealScale)
    }));

    return {
      ...meal,
      foods: updatedFoods,
      totalCalories: Math.round(meal.totalCalories + dCalories),
      totalProtein: Math.round(meal.totalProtein + dProtein),
      totalCarbs: Math.round(meal.totalCarbs + dCarbs),
      totalFat: Math.round(meal.totalFat + dFat)
    };
  });

  return {
    ...plan,
    meals: updatedMeals
  };
}
