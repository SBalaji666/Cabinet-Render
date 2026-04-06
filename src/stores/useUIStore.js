/**
 * useUIStore
 *
 * Owns UI-only state that has no business logic attached:
 * active tab, theme, selected section chip, loading overlays.
 *
 * Replaces: themeKey, mainTab, selectedSection useState calls in App.jsx
 */

import { create } from "zustand";
import { THEMES } from "../data/themes.js";

export const useUIStore = create((set, get) => ({
  // ── State ─────────────────────────────────────────────────────────────────
  themeKey: "technical",
  mainTab: "3d-view",
  selectedSection: null,
  isSaving: false,
  saveError: null,

  // ── Derived ───────────────────────────────────────────────────────────────
  get theme() {
    return THEMES[get().themeKey];
  },
  get ui() {
    return THEMES[get().themeKey].ui;
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  setThemeKey: (key) => set({ themeKey: key }),
  setMainTab: (tab) => set({ mainTab: tab }),

  setSelectedSection: (section) => {
    set({ selectedSection: section });
    if (section) {
      // Scroll the config panel entry into view
      const el = document.getElementById(`section-${section.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  },

  clearSelectedSection: () => set({ selectedSection: null }),

  setSaving: (isSaving, saveError = null) => set({ isSaving, saveError }),
}));
