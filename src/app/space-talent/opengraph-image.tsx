import { ImageResponse } from 'next/og';
import prisma from '@/lib/db';

// Prisma requires the Node.js runtime — this route cannot run on the edge.
export const runtime = 'nodejs';
// Regenerate at most once an hour so the count stays fresh without hitting
// the database on every social-card unfurl.
export const revalidate = 3600;

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SpaceNexus Space Talent — live job count';

/**
 * Rounds down to the nearest `step` and appends a '+' so the headline never
 * overstates the live count (e.g. 6,438 -> "6,400+").
 */
function roundDownPlus(n: number, step = 100): string {
  if (n < step) return `${Math.max(0, n)}`;
  return `${(Math.floor(n / step) * step).toLocaleString()}+`;
}

export default async function Image() {
  let activeJobs = 0;
  try {
    activeJobs = await prisma.spaceJobPosting.count({ where: { isActive: true } });
  } catch {
    // Fall through with 0 — image still renders with generic copy.
  }

  const headline =
    activeJobs > 0 ? `${roundDownPlus(activeJobs)} open space industry jobs` : 'Open space industry jobs';

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
        {/* Cyan accent bar */}
        <div style={{ display: 'flex', width: '100%', height: '6px', background: '#06b6d4' }} />

        {/* Top: branding */}
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
            SPACENEXUS
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
            SPACE TALENT
          </div>
        </div>

        {/* Center: headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxWidth: '1040px',
          }}
        >
          <div
            style={{
              fontSize: '68px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
            }}
          >
            {headline}
          </div>
          <div style={{ display: 'flex', fontSize: '28px', color: '#94a3b8', fontWeight: 500 }}>
            Updated daily from company career pages
          </div>
        </div>

        {/* Bottom: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#475569', fontSize: '20px', fontWeight: 600 }}>spacenexus.us/space-talent</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
