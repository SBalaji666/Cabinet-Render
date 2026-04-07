// src/components/NotFoundScreen.jsx
// Ported from the Next.js project's designer/not-found.tsx.

import { useNavigate } from 'react-router-dom';

const FONT = "'IBM Plex Mono', 'Courier New', monospace";

export default function NotFoundScreen() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
      background: 'linear-gradient(135deg, #eef2f8 0%, #f5f7fb 100%)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏗️</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, color: '#1c2b3a', fontWeight: 600 }}>
          Design not found
        </h1>
        <p style={{ margin: '0 0 24px', color: '#6b7a99', fontSize: 13 }}>
          This design may have been deleted or the link is invalid.
        </p>
        <button
          onClick={() => navigate('/designer')}
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 8,
            border: 'none',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: FONT,
            cursor: 'pointer',
          }}
        >
          New design
        </button>
      </div>
    </div>
  );
}
