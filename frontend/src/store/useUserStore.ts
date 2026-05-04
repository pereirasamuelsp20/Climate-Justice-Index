import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface UserPreferences {
  currentRegion: string | null;
  recentCountries: string[];
}

interface UserState {
  user: User | null;
  session: Session | null;
  isLoadingAuth: boolean;
  hasSeenOnboarding: boolean;
  preferences: UserPreferences;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoadingAuth: (loading: boolean) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  addRecentCountry: (country: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoadingAuth: true,
      hasSeenOnboarding: false,
      preferences: {
        currentRegion: null,
        recentCountries: [],
      },
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoadingAuth: (loading) => set({ isLoadingAuth: loading }),
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
      addRecentCountry: (country) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            recentCountries: [
              country,
              ...state.preferences.recentCountries.filter((c) => c !== country),
            ].slice(0, 5),
          },
        })),
    }),
    {
      name: 'climate-justice-user-store',
    }
  )
);
