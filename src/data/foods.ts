import type { FoodPreference, CuisinePreference } from '../types/user';
import type { Food } from '../types/nutrition';

export interface FoodItem extends Food {
  cuisine: CuisinePreference | 'all';
  preference: FoodPreference[];
  mealType: Array<'breakfast' | 'lunch' | 'snack' | 'dinner'>;
  budgetTier: 'low' | 'medium' | 'high';
}

export const FOOD_ITEMS: FoodItem[] = [
  { name: 'Oats with milk and banana', amount: '60g oats', calories: 340, protein: 12, carbs: 58, fat: 7, fiber: 7, cuisine: 'all', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['breakfast'], budgetTier: 'low' },
  { name: 'Masala oats with vegetables', amount: '1 bowl', calories: 280, protein: 9, carbs: 48, fat: 5, fiber: 8, cuisine: 'indian', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['breakfast'], budgetTier: 'low' },
  { name: 'Idli with sambar', amount: '3 idli + sambar', calories: 320, protein: 12, carbs: 58, fat: 4, fiber: 6, cuisine: 'south_indian', preference: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'], mealType: ['breakfast', 'dinner'], budgetTier: 'low' },
  { name: 'Dosa with sambar and chutney', amount: '2 dosa', calories: 390, protein: 10, carbs: 64, fat: 10, fiber: 4, cuisine: 'south_indian', preference: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'], mealType: ['breakfast'], budgetTier: 'low' },
  { name: 'Poha with peanuts', amount: '1 plate', calories: 310, protein: 8, carbs: 52, fat: 8, fiber: 4, cuisine: 'indian', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['breakfast'], budgetTier: 'low' },
  { name: 'Thepla with curd', amount: '3 thepla', calories: 360, protein: 12, carbs: 48, fat: 12, fiber: 5, cuisine: 'gujarati', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['breakfast', 'snack'], budgetTier: 'low' },
  { name: 'Dhokla with green chutney', amount: '4 pieces', calories: 220, protein: 9, carbs: 36, fat: 4, fiber: 3, cuisine: 'gujarati', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['breakfast', 'snack'], budgetTier: 'low' },
  { name: 'Moong dal chilla', amount: '2 chilla', calories: 290, protein: 16, carbs: 40, fat: 6, fiber: 8, cuisine: 'north_indian', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['breakfast'], budgetTier: 'low' },
  { name: 'Egg bhurji with toast', amount: '3 eggs', calories: 380, protein: 24, carbs: 22, fat: 20, fiber: 2, cuisine: 'indian', preference: ['eggetarian', 'non_veg'], mealType: ['breakfast'], budgetTier: 'low' },
  { name: 'Greek yogurt with honey and walnuts', amount: '200g', calories: 260, protein: 18, carbs: 22, fat: 10, fiber: 1, cuisine: 'continental', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['breakfast', 'snack'], budgetTier: 'medium' },
  { name: 'Curd rice', amount: '1 bowl', calories: 280, protein: 9, carbs: 48, fat: 6, fiber: 1, cuisine: 'south_indian', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'low' },
  { name: 'Brown rice, dal tadka and sabzi', amount: '1 plate', calories: 470, protein: 18, carbs: 78, fat: 9, fiber: 11, cuisine: 'indian', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'low' },
  { name: 'Roti, dal and mixed vegetables', amount: '3 roti + dal', calories: 440, protein: 18, carbs: 68, fat: 10, fiber: 12, cuisine: 'north_indian', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'low' },
  { name: 'Paneer bhurji with roti', amount: '120g paneer, 2 roti', calories: 520, protein: 28, carbs: 42, fat: 24, fiber: 6, cuisine: 'north_indian', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'medium' },
  { name: 'Palak paneer with roti', amount: '1 plate', calories: 480, protein: 24, carbs: 38, fat: 24, fiber: 7, cuisine: 'punjabi', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'medium' },
  { name: 'Chole with brown rice', amount: '1 plate', calories: 450, protein: 18, carbs: 72, fat: 8, fiber: 14, cuisine: 'punjabi', preference: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'], mealType: ['lunch'], budgetTier: 'low' },
  { name: 'Rajma chawal', amount: '1 plate', calories: 460, protein: 16, carbs: 78, fat: 8, fiber: 13, cuisine: 'north_indian', preference: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'], mealType: ['lunch'], budgetTier: 'low' },
  { name: 'Kadhi khichdi', amount: '1 plate', calories: 390, protein: 14, carbs: 62, fat: 9, fiber: 6, cuisine: 'gujarati', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'low' },
  { name: 'Undhiyu with bajra roti', amount: '1 plate', calories: 420, protein: 12, carbs: 58, fat: 14, fiber: 10, cuisine: 'gujarati', preference: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'], mealType: ['lunch'], budgetTier: 'medium' },
  { name: 'Sambar rice with vegetables', amount: '1 plate', calories: 400, protein: 14, carbs: 70, fat: 6, fiber: 9, cuisine: 'south_indian', preference: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'low' },
  { name: 'Tofu stir-fry with quinoa', amount: '150g tofu', calories: 430, protein: 24, carbs: 42, fat: 16, fiber: 7, cuisine: 'continental', preference: ['vegetarian', 'vegan', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'high' },
  { name: 'Soya chunks curry with roti', amount: '80g dry soya', calories: 410, protein: 32, carbs: 44, fat: 8, fiber: 8, cuisine: 'indian', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'low' },
  { name: 'Grilled chicken, rice and salad', amount: '150g chicken', calories: 480, protein: 42, carbs: 48, fat: 10, fiber: 4, cuisine: 'continental', preference: ['non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'medium' },
  { name: 'Chicken curry with roti', amount: '1 plate', calories: 510, protein: 36, carbs: 40, fat: 20, fiber: 5, cuisine: 'north_indian', preference: ['non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'medium' },
  { name: 'Egg curry with rice', amount: '2 eggs + rice', calories: 470, protein: 22, carbs: 62, fat: 14, fiber: 3, cuisine: 'indian', preference: ['eggetarian', 'non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'low' },
  { name: 'Fish curry with rice', amount: '1 plate', calories: 490, protein: 32, carbs: 52, fat: 14, fiber: 3, cuisine: 'south_indian', preference: ['non_veg'], mealType: ['lunch', 'dinner'], budgetTier: 'medium' },
  { name: 'Curd with fruit', amount: '200g curd', calories: 180, protein: 12, carbs: 24, fat: 4, fiber: 2, cuisine: 'indian', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['snack'], budgetTier: 'low' },
  { name: 'Buttermilk and roasted chana', amount: '1 glass + 30g', calories: 190, protein: 10, carbs: 22, fat: 5, fiber: 5, cuisine: 'indian', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['snack'], budgetTier: 'low' },
  { name: 'Whey shake with banana', amount: '1 scoop', calories: 250, protein: 26, carbs: 28, fat: 3, fiber: 2, cuisine: 'all', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['snack'], budgetTier: 'medium' },
  { name: 'Soya milk and mixed nuts', amount: '250ml + 15g', calories: 230, protein: 12, carbs: 16, fat: 12, fiber: 3, cuisine: 'all', preference: ['vegan', 'jain'], mealType: ['snack'], budgetTier: 'medium' },
  { name: 'Peanut chikki and milk', amount: '1 piece + 200ml', calories: 280, protein: 12, carbs: 30, fat: 12, fiber: 2, cuisine: 'gujarati', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['snack'], budgetTier: 'low' },
  { name: 'Tofu bhurji with salad', amount: '150g tofu', calories: 300, protein: 22, carbs: 10, fat: 18, fiber: 3, cuisine: 'indian', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['dinner'], budgetTier: 'medium' },
  { name: 'Grilled paneer tikka salad', amount: '120g paneer', calories: 340, protein: 22, carbs: 12, fat: 22, fiber: 4, cuisine: 'punjabi', preference: ['vegetarian', 'eggetarian', 'non_veg'], mealType: ['dinner', 'snack'], budgetTier: 'medium' },
  { name: 'Mixed dal soup and sauteed vegetables', amount: '1 bowl', calories: 260, protein: 16, carbs: 32, fat: 6, fiber: 9, cuisine: 'indian', preference: ['vegetarian', 'vegan', 'jain', 'eggetarian', 'non_veg'], mealType: ['dinner'], budgetTier: 'low' },
  { name: 'Turkey or chicken wrap', amount: '1 wrap', calories: 360, protein: 28, carbs: 34, fat: 10, fiber: 4, cuisine: 'continental', preference: ['non_veg'], mealType: ['lunch', 'snack'], budgetTier: 'medium' },
];

export function selectFoods(opts: {
  preference: FoodPreference;
  cuisine: CuisinePreference;
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  budget: number;
  allergies: string[];
  disliked: string[];
}): FoodItem[] {
  const budgetTier: FoodItem['budgetTier'] = opts.budget < 180 ? 'low' : opts.budget > 400 ? 'high' : 'medium';
  const allergy = opts.allergies.map(a => a.toLowerCase());
  const disliked = opts.disliked.map(d => d.toLowerCase());

  const matchesAllergy = (name: string) =>
    allergy.some(a => a && name.toLowerCase().includes(a));
  const matchesDislike = (name: string) =>
    disliked.some(d => d && name.toLowerCase().includes(d));

  const filtered = FOOD_ITEMS.filter(f => {
    if (!f.preference.includes(opts.preference)) return false;
    if (!f.mealType.includes(opts.mealType)) return false;
    if (matchesAllergy(f.name) || matchesDislike(f.name)) return false;
    if (budgetTier === 'low' && f.budgetTier === 'high') return false;
    return true;
  });

  const cuisineBoost = (f: FoodItem) =>
    f.cuisine === opts.cuisine || f.cuisine === 'all' || f.cuisine === 'indian' ? 1 : 0;

  return filtered.sort((a, b) => cuisineBoost(b) - cuisineBoost(a));
}
