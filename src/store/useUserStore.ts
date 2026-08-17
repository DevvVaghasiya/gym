import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types/user';

interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      updateProfile: (updates) => set((state) => ({ 
        profile: state.profile ? { ...state.profile, ...updates } : null 
      })),
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: 'gym-user-storage',
    }
  )
);
