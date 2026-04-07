// src/components/ErrorScreen.jsx
// Shown when fetching a design fails (DB error, network error, etc.)
// Ported from the Next.js project's designer/error.tsx.

import { useNavigate } from 'react-router-dom';

const FONT = "'IBM Plex Mono', 'Courier New', monospace";

export default function ErrorScreen({ error, onRetry }) {
  const navigate = useNavigate();

  const message = error?.message ?? String(error ?? 'An unexpected error occurred.');
  const isDbError =
    message.includes('MONGODB_URI') ||
    message.includes('buffering timed out') ||
    message.includes('MongoDB') ||
    message.includes('network');

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
      background: 'linear-gradient(135deg, #eef2f8 0%, #f5f7fb 100%)',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 480,
        background: '#fff',
        borderRadius: 14,
        padding: 32,
        border: '1px solid #fca5a5',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>

        <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 600, color: '#1c2b3a' }}>
          {isDbError ? 'Could not load design' : 'Something went wrong'}
        </h2>

        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7a99', lineHeight: 1.6 }}>
          {isDbError
            ? 'Could not connect to the backend. Make sure the API server is running and VITE_API_URL is set correctly in .env.local.'
            : message}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: '#2563eb', color: '#fff', fontFamily: FONT,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          )}
          <button
            onClick={() => navigate('/designer')}
            style={{
              padding: '10px 20px', borderRadius: 8,
              border: '1px solid #d1d9e6', background: 'transparent',
              color: '#6b7a99', fontFamily: FONT, fontSize: 12, cursor: 'pointer',
            }}
          >
            New design
          </button>
        </div>
      </div>
    </div>
  );
}
