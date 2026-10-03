import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProgressEntry, PRRecord } from '../types/progress';

interface ProgressState {
  entries: ProgressEntry[];
  prs: PRRecord[];
  setEntries: (entries: ProgressEntry[]) => void;
  addEntry: (entry: ProgressEntry) => void;
  removeEntry: (entryDateOrId: string, userEmail?: string) => void;
  addPR: (pr: PRRecord) => void;
  removePR: (prDateOrId: string) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      entries: [],
      prs: [],
      setEntries: (entries) => set({ entries }),
      addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
      removeEntry: (entryDateOrId, userEmail) => set((state) => ({
        entries: state.entries.filter(e => {
          const isTargetUser = !userEmail || !e.userEmail || e.userEmail === userEmail;
          const isMatchingEntry = e.id === entryDateOrId || e.date === entryDateOrId || e.date.startsWith(entryDateOrId);
          return !(isTargetUser && isMatchingEntry);
        })
      })),
      addPR: (pr) => set((state) => ({ prs: [...state.prs, pr] })),
      removePR: (prId) => set((state) => ({
        prs: state.prs.filter(p => p.id !== prId && p.exerciseId !== prId)
      })),
    }),
    {
      name: 'gym-progress-storage',
    }
  )
);
