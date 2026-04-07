// src/components/LoadingScreen.jsx
// Skeleton screen shown while a saved design is being fetched.
// Ported from the Next.js project's designer/loading.tsx.

const FONT = "'IBM Plex Mono', 'Courier New', monospace";

function Skeleton({ width = '100%', height, radius = 6 }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background: '#e8edf5',
      animation: 'shimmer 1.4s ease-in-out infinite',
    }} />
  );
}

export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eef2f8 0%, #f5f7fb 100%)',
      padding: 20,
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <style>{`
        @keyframes shimmer {
          0%   { opacity: 0.6; }
          50%  { opacity: 1;   }
          100% { opacity: 0.6; }
        }
      `}</style>

      {/* Header skeleton */}
      <div style={{
        maxWidth: 1400, margin: '0 auto', width: '100%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <Skeleton width={220} height={28} />
          <div style={{ marginTop: 8 }}><Skeleton width={160} height={14} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton width={90} height={36} radius={8} />
          <Skeleton width={120} height={36} radius={8} />
        </div>
      </div>

      {/* Main grid skeleton */}
      <div style={{
        maxWidth: 1400, margin: '0 auto', width: '100%',
        display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14,
      }}>
        {/* Left panel */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 16,
          border: '1px solid #d1d9e6', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {[100, 180, 240, 300].map((h, i) => (
            <Skeleton key={i} height={h} radius={10} />
          ))}
        </div>

        {/* Right panel */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 16,
          border: '1px solid #d1d9e6', minHeight: 680,
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[80, 80, 70, 80, 90].map((w, i) => (
              <Skeleton key={i} width={w} height={36} radius={8} />
            ))}
          </div>
          <div style={{
            background: '#e8edf5', borderRadius: 10, height: 580,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'shimmer 1.4s ease-in-out infinite',
          }}>
            <span style={{ fontSize: 48 }}>🏗️</span>
          </div>
        </div>
      </div>
    </div>
  );
}
