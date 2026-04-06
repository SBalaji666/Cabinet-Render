/**
 * React Query hooks for all server interactions.
 *
 * Install: npm install @tanstack/react-query axios zustand
 *
 * Wrap your app root with:
 *   import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
 *   const queryClient = new QueryClient()
 *   <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client.js";
import { useDesignStore } from "../stores/useDesignStore.js";
import { useUIStore } from "../stores/useUIStore.js";

// ── Designs ───────────────────────────────────────────────────────────────────

/** Fetch the user's design list (dashboard). */
export function useDesignList() {
  return useQuery({
    queryKey: ["designs"],
    queryFn: async () => {
      const { data } = await apiClient.get("/designs");
      return data.designs;
    },
    staleTime: 30_000,
  });
}

/** Fetch a single design by id and hydrate the store. */
export function useDesign(id) {
  const loadDesign = useDesignStore((s) => s.loadDesign);
  return useQuery({
    queryKey: ["designs", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/designs/${id}`);
      loadDesign(data.design.config);
      return data.design;
    },
    enabled: Boolean(id),
  });
}

/** Save current config to the backend (create or update). */
export function useSaveDesign() {
  const qc = useQueryClient();
  const getConfig = useDesignStore((s) => s.getConfig);
  const { setSaving } = useUIStore.getState();

  return useMutation({
    mutationFn: async ({ id, name, snapshotLabel = "" }) => {
      const config = getConfig();
      if (id) {
        const { data } = await apiClient.put(`/designs/${id}`, {
          name,
          config,
          snapshotLabel,
        });
        return data.design;
      }
      const { data } = await apiClient.post("/designs", { name, config });
      return data.design;
    },
    onMutate: () => setSaving(true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["designs"] });
      setSaving(false);
    },
    onError: (err) => {
      setSaving(false, err.response?.data?.error ?? "Save failed");
    },
  });
}

/** Delete a design. */
export function useDeleteDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`/designs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designs"] }),
  });
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export function useSnapshots(designId) {
  return useQuery({
    queryKey: ["snapshots", designId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/designs/${designId}/snapshots`);
      return data.snapshots;
    },
    enabled: Boolean(designId),
  });
}

export function useRestoreSnapshot() {
  const qc = useQueryClient();
  const loadDesign = useDesignStore((s) => s.loadDesign);
  return useMutation({
    mutationFn: async ({ designId, version }) => {
      const { data } = await apiClient.post(
        `/designs/${designId}/restore/${version}`,
      );
      return data.design;
    },
    onSuccess: (design) => {
      loadDesign(design.config);
      qc.invalidateQueries({ queryKey: ["designs", design._id] });
    },
  });
}

// ── Compute (server-side cut list) ───────────────────────────────────────────

/**
 * Fetches the cut list from the backend.
 * In offline mode (no API URL configured) falls back to client-side computation.
 */
export function useServerCutList() {
  const getConfig = useDesignStore((s) => s.getConfig);
  const config = getConfig();

  return useQuery({
    queryKey: ["cutlist", config],
    queryFn: async () => {
      const { data } = await apiClient.post("/compute/cutlist", { config });
      return data; // { cutList, hardwareSchedule, warnings, stats }
    },
    // Only refetch when config actually changes (deep equality via query key)
    staleTime: 5_000,
    retry: 1,
  });
}

// ── Export ────────────────────────────────────────────────────────────────────

/** Download a CSV from the server and trigger a browser download. */
export function useExportCSV() {
  const getConfig = useDesignStore((s) => s.getConfig);
  return useMutation({
    mutationFn: async ({ filter = "All", searchTerm = "" } = {}) => {
      const config = getConfig();
      const { overall } = config;
      const res = await apiClient.post(
        "/export/csv",
        { config, filter, searchTerm },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cutlist_${overall.length}x${overall.height}x${overall.depth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function useLogin() {
  const setAuth = (token, user) => {
    const { useAuthStore } = require("../stores/useAuthStore.js");
    useAuthStore.getState().setAuth(token, user);
  };

  return useMutation({
    mutationFn: async ({ email, password }) => {
      const { data } = await apiClient.post("/auth/login", { email, password });
      return data;
    },
    onSuccess: ({ token, user }) => {
      // Dynamic import avoids a circular dep at module init time
      import("../stores/useAuthStore.js").then(({ useAuthStore }) => {
        useAuthStore.getState().setAuth(token, user);
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async ({ name, email, password }) => {
      const { data } = await apiClient.post("/auth/register", {
        name,
        email,
        password,
      });
      return data;
    },
    onSuccess: ({ token, user }) => {
      import("../stores/useAuthStore.js").then(({ useAuthStore }) => {
        useAuthStore.getState().setAuth(token, user);
      });
    },
  });
}
