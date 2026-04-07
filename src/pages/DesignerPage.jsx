// src/pages/DesignerPage.jsx
// Route: /designer
// Equivalent to the Next.js src/app/designer/page.tsx.
// Fetches the saved designs list on mount, then renders App with no preloaded config.

import { useState, useEffect } from 'react';
import App from '../App';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

function authHeaders() {
  const token = localStorage.getItem('cabinet_jwt');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DesignerPage() {
  const [savedDesigns, setSavedDesigns] = useState([]);

  useEffect(() => {
    fetch(`${API}/designs`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => setSavedDesigns(data.designs ?? []))
      .catch(() => setSavedDesigns([])); // silently degrade if not logged in
  }, []);

  return (
    <App
      savedDesigns={savedDesigns}
      preloadedConfig={null}
      preloadedDesignId={null}
      preloadedDesignName="Untitled design"
    />
  );
}
