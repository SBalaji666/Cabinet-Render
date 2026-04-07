// src/pages/DesignerWithDesign.jsx
// Route: /designer/:id
// Equivalent to the Next.js src/app/designer/[id]/page.tsx.
// Fetches the design (and the saved designs list) in parallel, then hands
// the preloaded config to App — no loading flicker after the initial fetch.

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import App from "../App";
import LoadingScreen from "../components/LoadingScreen";
import ErrorScreen from "../components/ErrorScreen";
import NotFoundScreen from "../components/NotFoundScreen";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

function authHeaders() {
  const token = localStorage.getItem("cabinet_jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchDesign(id) {
  const res = await fetch(`${API}/designs/${id}`, { headers: authHeaders() });
  if (res.status === 404)
    throw Object.assign(new Error("not_found"), { code: "not_found" });
  if (!res.ok) throw new Error(`Failed to load design (${res.status})`);
  return res.json();
}

async function fetchDesigns() {
  const res = await fetch(`${API}/designs`, { headers: authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.designs ?? [];
}

export default function DesignerWithDesign() {
  const { id } = useParams();

  const [status, setStatus] = useState("loading"); // 'loading' | 'ready' | 'not_found' | 'error'
  const [error, setError] = useState(null);
  const [props, setProps] = useState(null);

  const load = () => {
    setStatus("loading");
    setError(null);

    // Run both fetches in parallel — mirrors the Next.js Promise.all
    Promise.all([fetchDesign(id), fetchDesigns()])
      .then(([designData, savedDesigns]) => {
        const design = designData.design;

        // Reconstruct sections — restore id as the React key-stable id
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

        setProps({
          savedDesigns,
          preloadedDesignId: design._id,
          preloadedDesignName: design.name,
          preloadedDesignDescription: design.description,
          preloadedConfig: {
            overall: design.config.overall,
            materials: design.config.materials,
            tolerances: design.config.tolerances,
            hardware: design.config.hardware,
            sections,
            themeKey: design.themeKey ?? "technical",
          },
        });
        setStatus("ready");
      })
      .catch((err) => {
        if (err.code === "not_found") {
          setStatus("not_found");
        } else {
          setError(err);
          setStatus("error");
        }
      });
  };

  // Re-fetch whenever the route id changes
  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (!active) return;
      load();
    });

    return () => {
      active = false;
    };
  }, [id]);

  if (status === "loading") return <LoadingScreen />;
  if (status === "not_found") return <NotFoundScreen />;
  if (status === "error") return <ErrorScreen error={error} onRetry={load} />;

  return <App {...props} />;
}
