import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProgressEntry, PRRecord } from '../types/progress';

interface ProgressState {
  entries: ProgressEntry[];
  prs: PRRecord[];
  addEntry: (entry: ProgressEntry) => void;
  addPR: (pr: PRRecord) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      entries: [],
      prs: [],
      addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
      addPR: (pr) => set((state) => {
        // If a PR already exists for this exercise, only keep the best one, or keep history. 
        // For MVP, we just add it to the list.
        return { prs: [...state.prs, pr] };
      }),
    }),
    {
      name: 'gym-progress-storage',
    }
  )
);
