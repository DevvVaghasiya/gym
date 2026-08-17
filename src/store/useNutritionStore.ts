import type { NutritionPlan } from '../types/nutrition';

interface NutritionState {
  currentPlan: NutritionPlan | null;
  setPlan: (plan: NutritionPlan) => void;
  updatePlan: (plan: NutritionPlan) => void;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNutritionStore = create<NutritionState>()(
  persist(
    (set) => ({
      currentPlan: null,
      setPlan: (plan) => set({ currentPlan: plan }),
      updatePlan: (plan) => set({ currentPlan: plan }),
    }),
    { name: 'gym-nutrition-storage' }
  )
);
