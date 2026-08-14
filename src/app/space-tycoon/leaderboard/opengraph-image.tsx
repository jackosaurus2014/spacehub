import { ImageResponse } from 'next/og';
import { getPublicLeaderboard, getPublicCorporationCount } from '@/lib/game/public-leaderboard';

// Prisma requires the Node.js runtime — this route cannot run on the edge.
export const runtime = 'nodejs';
// Static-segment OG routes get prerendered at build, which trips a known
// @vercel/og 'Invalid URL' module-load bug — force-dynamic skips prerender.
export const dynamic = 'force-dynamic';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Space Tycoon Leaderboard — top corporations, live rankings';

export default async function Image() {
  let topThree: { companyName: string }[] = [];
  let totalCorporations = 0;

  try {
    const [entries, count] = await Promise.all([
      getPublicLeaderboard(3),
      getPublicCorporationCount(),
    ]);
    topThree = entries;
    totalCorporations = count;
  } catch {
    // Fall through with defaults — image still renders with generic copy.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: '#000000',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', width: '100%', height: '6px', background: '#06b6d4' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '36px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#000000',
              fontWeight: 700,
            }}
          >
            S
          </div>
          <span style={{ color: '#67e8f9', fontSize: '22px', fontWeight: 600, letterSpacing: '1px' }}>
            SPACE TYCOON
          </span>
          <div
            style={{
              display: 'flex',
              marginLeft: '16px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '20px',
              padding: '6px 16px',
              color: '#67e8f9',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            LEADERBOARD
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1060px' }}>
          <div style={{ fontSize: '52px', fontWeight: 800, color: '#ffffff', lineHeight: 1.25 }}>
            Top corporations in the galaxy
          </div>
          {topThree.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topThree.map((entry, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '28px', color: '#f59e0b', fontWeight: 700, width: '48px' }}>
                    #{i + 1}
                  </span>
                  <span style={{ fontSize: '30px', color: '#e2e8f0', fontWeight: 600 }}>{entry.companyName}</span>
                </div>
              ))}
            </div>
          )}
          {totalCorporations > 0 && (
            <div style={{ display: 'flex', fontSize: '26px', color: '#94a3b8', fontWeight: 500 }}>
              {totalCorporations.toLocaleString()} corporations competing
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#475569', fontSize: '20px', fontWeight: 600 }}>spacenexus.us/space-tycoon/leaderboard</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
