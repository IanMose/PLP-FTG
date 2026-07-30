import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SessionUser {
  userId: number;
  name: string;
  email: string;
  role: string;
  token: string;
}

export interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  setUser: (user: SessionUser) => void;
  clearUser: () => void;
}

// Persisted auth session — JWT token survives page refresh via localStorage.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "sentinel-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
