export interface FoodItem {
  name: string;
  category: 'protein' | 'carbs' | 'fat' | 'vegetable' | 'fruit' | 'dairy' | 'supplement';
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: ('breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout')[];
}

export const FOOD_DATABASE: FoodItem[] = [
  // Proteins
  { name: 'Chicken Breast (Cooked)', category: 'protein', servingSize: '100g', calories: 165, protein: 31, carbs: 0, fat: 3.6, mealType: ['lunch', 'dinner'] },
  { name: 'Salmon (Cooked)', category: 'protein', servingSize: '100g', calories: 206, protein: 22, carbs: 0, fat: 13, mealType: ['lunch', 'dinner'] },
  { name: 'Eggs (Whole)', category: 'protein', servingSize: '2 large (100g)', calories: 155, protein: 13, carbs: 1.1, fat: 11, mealType: ['breakfast', 'snack'] },
  { name: 'Paneer', category: 'protein', servingSize: '100g', calories: 265, protein: 18, carbs: 1.2, fat: 20, mealType: ['lunch', 'dinner'] },
  { name: 'Whey Protein', category: 'supplement', servingSize: '1 scoop (30g)', calories: 120, protein: 24, carbs: 3, fat: 1.5, mealType: ['breakfast', 'post_workout', 'snack'] },

  // Carbs
  { name: 'Oats (Dry)', category: 'carbs', servingSize: '50g', calories: 195, protein: 6.5, carbs: 33, fat: 3.5, mealType: ['breakfast', 'pre_workout'] },
  { name: 'White Rice (Cooked)', category: 'carbs', servingSize: '150g', calories: 195, protein: 4, carbs: 42, fat: 0.4, mealType: ['lunch', 'dinner', 'post_workout'] },
  { name: 'Sweet Potato (Baked)', category: 'carbs', servingSize: '150g', calories: 135, protein: 3, carbs: 31, fat: 0.2, mealType: ['lunch', 'dinner'] },
  { name: 'Chapati', category: 'carbs', servingSize: '1 medium (30g)', calories: 104, protein: 3, carbs: 22, fat: 0.4, mealType: ['lunch', 'dinner'] },
  { name: 'Banana', category: 'fruit', servingSize: '1 medium (118g)', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, mealType: ['breakfast', 'pre_workout', 'snack'] },

  // Fats
  { name: 'Almonds', category: 'fat', servingSize: '30g', calories: 164, protein: 6, carbs: 6, fat: 14, mealType: ['snack'] },
  { name: 'Peanut Butter', category: 'fat', servingSize: '2 tbsp (32g)', calories: 188, protein: 8, carbs: 6, fat: 16, mealType: ['breakfast', 'snack'] },
  { name: 'Olive Oil', category: 'fat', servingSize: '1 tbsp (15ml)', calories: 119, protein: 0, carbs: 0, fat: 13.5, mealType: ['lunch', 'dinner'] },

  // Veggies & Dairy
  { name: 'Broccoli (Steamed)', category: 'vegetable', servingSize: '100g', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, mealType: ['lunch', 'dinner'] },
  { name: 'Greek Yogurt', category: 'dairy', servingSize: '150g', calories: 89, protein: 15, carbs: 6, fat: 0, mealType: ['breakfast', 'snack', 'post_workout'] },
  { name: 'Milk (Whole)', category: 'dairy', servingSize: '1 cup (240ml)', calories: 150, protein: 8, carbs: 12, fat: 8, mealType: ['breakfast', 'snack'] }
];
