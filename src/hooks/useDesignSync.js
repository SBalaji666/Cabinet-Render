// src/hooks/useDesignSync.js
// Handles all design persistence: save, update, delete, load by id, list.
// Talks to the Express backend API (not Next.js server actions).
// Drop this hook into App.jsx — it replaces the manual fetch calls.

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

function authHeaders() {
  const token = localStorage.getItem("cabinet_jwt");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  // 204 No Content has no body
  if (res.status === 204) return null;
  return res.json();
}

export function useDesignSync() {
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── List all saved designs ────────────────────────────────────────────────
  const listDesigns = useCallback(async () => {
    const data = await apiFetch("/designs");
    return data.designs; // [{ _id, name, updatedAt, config.overall }]
  }, []);

  // ── Load a single design by id ────────────────────────────────────────────
  const loadDesign = useCallback(async (id) => {
    const data = await apiFetch(`/designs/${id}`);
    const design = data.design;

    // Restore clientId as the React key-stable id (mirrors Next.js [id]/page.tsx logic)
    const sections = design.config.sections.map((s, i) => ({
      id: s.id ?? i + 1,
      label: s.label,
      width: s.width,
      type: s.type,
      shelves: s.shelves,
      drawers: {
        count: s.drawers?.count ?? 0,
        height: s.drawers?.height ?? 120,
        placement: s.drawers?.placement ?? "bottom",
      },
    }));

    return {
      designId: design._id,
      name: design.name,
      description: design.description ?? "",
      themeKey: design.themeKey ?? "technical",
      overall: design.config.overall,
      materials: design.config.materials,
      tolerances: design.config.tolerances,
      hardware: design.config.hardware,
      sections,
    };
  }, []);

  // ── Save (create) or update a design ─────────────────────────────────────
  const saveDesign = useCallback(
    async ({
      designId, // null → create, string → update
      name,
      description = "",
      overall,
      materials,
      tolerances,
      hardware,
      sections,
      themeKey,
    }) => {
      setSaveError(null);
      setIsPending(true);

      try {
        const payload = {
          name,
          description,
          config: { overall, materials, tolerances, hardware, sections },
          themeKey,
        };

        if (designId) {
          // Update existing — auto-snapshots the previous version server-side
          await apiFetch(`/designs/${designId}`, {
            method: "PUT",
            body: JSON.stringify({ ...payload, snapshotLabel: "description" }),
          });
          return { success: true, designId };
        } else {
          // Create new
          const data = await apiFetch("/designs", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const newId = data.design._id;
          // Navigate to the design's own URL so the address bar reflects the saved state
          navigate(`/designer/${newId}`, { replace: true });
          return { success: true, designId: newId };
        }
      } catch (err) {
        setSaveError(err.message);
        return { success: false, error: err.message };
      } finally {
        setIsPending(false);
      }
    },
    [navigate],
  );

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteDesign = useCallback(
    async (designId) => {
      if (!designId) return;
      if (!window.confirm("Delete this design permanently?")) return;

      setIsPending(true);
      try {
        await apiFetch(`/designs/${designId}`, { method: "DELETE" });
        navigate("/designer", { replace: true });
      } catch (err) {
        setSaveError(err.message);
      } finally {
        setIsPending(false);
      }
    },
    [navigate],
  );

  return {
    listDesigns,
    loadDesign,
    saveDesign,
    deleteDesign,
    isPending,
    saveError,
    setSaveError,
  };
}
