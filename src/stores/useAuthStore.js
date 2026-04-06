/**
 * useAuthStore
 *
 * Manages JWT auth state. Persists token to localStorage so the session
 * survives page refreshes. The token is attached to every API request
 * via the axios instance in src/api/client.js.
 */

import { create } from "zustand";

const TOKEN_KEY = "cabinet_jwt";

export const useAuthStore = create((set) => ({
  // ── State ─────────────────────────────────────────────────────────────────
  token: localStorage.getItem(TOKEN_KEY) ?? null,
  user: null,
  isLoading: false,
  error: null,

  // ── Actions ───────────────────────────────────────────────────────────────
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, user, error: null });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },

  setUser: (user) => set({ user }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (error) => set({ error }),

  isAuthenticated: () => {
    const { token } = useAuthStore.getState();
    return Boolean(token);
  },
}));
