import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkoutPlan, WorkoutLog } from '../types/workout';

interface WorkoutState {
  currentPlan: WorkoutPlan | null;
  logs: WorkoutLog[];
  setPlan: (plan: WorkoutPlan) => void;
  addLog: (log: WorkoutLog) => void;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      currentPlan: null,
      logs: [],
      setPlan: (plan) => set({ currentPlan: plan }),
      addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
    }),
    {
      name: 'gym-workout-storage',
    }
  )
);
