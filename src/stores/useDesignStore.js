/**
 * useDesignStore
 *
 * Replaces the five useState calls in App.jsx (overall, materials, tolerances,
 * hardware, sections). Drop-in compatible — component props stay the same,
 * just call the store instead of passing props down.
 *
 * Install: npm install zustand
 * Usage:   import { useDesignStore } from '@/stores/useDesignStore'
 */

import { create } from "zustand";
import { DEFAULTS } from "../data/constants.js";

const DEFAULT_SECTION = (id, labelNum) => ({
  id,
  label: `S${labelNum}`,
  width: 350,
  type: "closed",
  shelves: 2,
  drawers: { count: 0, height: 120, placement: "bottom" },
  doorSwing: "right", // "right" | "left"
  showDivider: true, // whether the vertical divider before this section is shown
});

export const useDesignStore = create((set, get) => ({
  // ── State (mirrors App.jsx) ────────────────────────────────────────────────
  overall: { ...DEFAULTS.overall },
  materials: { ...DEFAULTS.materials },
  tolerances: { ...DEFAULTS.tolerances },
  hardware: {
    joinery: DEFAULTS.joinery,
    drawerSlide: DEFAULTS.drawerSlide,
    hinge: DEFAULTS.hinge,
    shelfSystem: DEFAULTS.shelfSystem,
    plinth: DEFAULTS.plinth,
    construction: DEFAULTS.construction,
    doorOverlay: DEFAULTS.doorOverlay,
    edgeBanding: DEFAULTS.edgeBanding,
  },
  sections: [],

  // Internal counter for section IDs — never resets, so React keys stay stable
  _nextSectionId: 1,

  // ── Selectors ─────────────────────────────────────────────────────────────
  /** Full config object, ready to send to the backend */
  getConfig: () => {
    const { overall, materials, tolerances, sections, hardware } = get();
    return { overall, materials, tolerances, sections, hardware };
  },

  // ── Overall ───────────────────────────────────────────────────────────────
  setOverall: (patch) => set((s) => ({ overall: { ...s.overall, ...patch } })),

  // ── Materials ─────────────────────────────────────────────────────────────
  setMaterials: (patch) =>
    set((s) => ({ materials: { ...s.materials, ...patch } })),

  // ── Tolerances ────────────────────────────────────────────────────────────
  setTolerances: (patch) =>
    set((s) => ({ tolerances: { ...s.tolerances, ...patch } })),

  // ── Hardware ──────────────────────────────────────────────────────────────
  setHardware: (patch) =>
    set((s) => ({ hardware: { ...s.hardware, ...patch } })),

  // ── Sections ──────────────────────────────────────────────────────────────
  addSection: () =>
    set((s) => {
      const id = s._nextSectionId;
      const highestN = s.sections.reduce((max, sec) => {
        const n = parseInt(sec.label.replace(/\D/g, ""), 10);
        return !isNaN(n) && n > max ? n : max;
      }, 0);
      return {
        _nextSectionId: id + 1,
        sections: [...s.sections, DEFAULT_SECTION(id, highestN + 1)],
      };
    }),

  removeSection: (id) =>
    set((s) => ({ sections: s.sections.filter((sec) => sec.id !== id) })),

  updateSection: (updated) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === updated.id ? updated : sec,
      ),
    })),

  generateEquidistantSections: (count) => {
    if (count < 1) return;
    const { overall, _nextSectionId } = get();
    const equalWidth = Math.floor(overall.length / count);
    const newSections = Array.from({ length: count }, (_, i) => ({
      ...DEFAULT_SECTION(_nextSectionId + i, i + 1),
      width: i === count - 1 ? overall.length - equalWidth * i : equalWidth,
    }));
    set({ sections: newSections, _nextSectionId: _nextSectionId + count });
  },

  // ── Bulk load (called after fetching a saved design from the API) ──────────
  loadDesign: (config) =>
    set({
      overall: config.overall,
      materials: config.materials,
      tolerances: config.tolerances,
      hardware: config.hardware,
      sections: config.sections,
      _nextSectionId: Math.max(...config.sections.map((s) => s.id), 0) + 1,
    }),

  // ── Reset to defaults ─────────────────────────────────────────────────────
  reset: () =>
    set({
      overall: { ...DEFAULTS.overall },
      materials: { ...DEFAULTS.materials },
      tolerances: { ...DEFAULTS.tolerances },
      hardware: {
        joinery: DEFAULTS.joinery,
        drawerSlide: DEFAULTS.drawerSlide,
        hinge: DEFAULTS.hinge,
        shelfSystem: DEFAULTS.shelfSystem,
        plinth: DEFAULTS.plinth,
        construction: DEFAULTS.construction,
        doorOverlay: DEFAULTS.doorOverlay,
        edgeBanding: DEFAULTS.edgeBanding,
      },
      sections: [],
      _nextSectionId: 1,
    }),
}));
