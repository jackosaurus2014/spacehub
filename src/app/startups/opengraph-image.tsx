import { ImageResponse } from 'next/og';
import prisma from '@/lib/db';

// Prisma requires the Node.js runtime — this route cannot run on the edge.
export const runtime = 'nodejs';
// Regenerate at most once an hour so the counts stay fresh without hitting
// the database on every social-card unfurl.
export const revalidate = 3600;

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SpaceNexus Startup & Pre-IPO Hub — live counts';

/**
 * Rounds down to the nearest `step` and appends a '+' so the headline never
 * overstates the live count (e.g. 3,742 -> "3,700+").
 */
function roundDownPlus(n: number, step = 100): string {
  if (n < step) return `${Math.max(0, n)}`;
  return `${(Math.floor(n / step) * step).toLocaleString()}+`;
}

export default async function Image() {
  let privateCompanies = 0;
  let openRolesAtPrivate = 0;
  let roundsLast18mo = 0;

  try {
    const eighteenMonthsAgo = new Date();
    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);

    const [companyCount, roleCount, roundCount] = await Promise.all([
      prisma.companyProfile.count({ where: { isPublic: false } }),
      prisma.spaceJobPosting.count({
        where: { isActive: true, companyProfile: { isPublic: false } },
      }),
      prisma.fundingRound.count({ where: { date: { gte: eighteenMonthsAgo } } }),
    ]);
    privateCompanies = companyCount;
    openRolesAtPrivate = roleCount;
    roundsLast18mo = roundCount;
  } catch {
    // Fall through with zeros — image still renders with generic copy.
  }

  const companiesLabel =
    privateCompanies > 0 ? `${roundDownPlus(privateCompanies)} private companies tracked` : 'Private companies tracked';
  const rolesLabel =
    openRolesAtPrivate > 0 ? `${roundDownPlus(openRolesAtPrivate)} open roles` : 'Open roles';

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
            STARTUP &amp; PRE-IPO HUB
          </div>
        </div>

        {/* Center: headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1060px' }}>
          <div style={{ fontSize: '54px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {companiesLabel}
          </div>
          <div style={{ fontSize: '54px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {rolesLabel} at private space companies
          </div>
          {roundsLast18mo > 0 && (
            <div style={{ display: 'flex', fontSize: '26px', color: '#94a3b8', fontWeight: 500 }}>
              {roundsLast18mo.toLocaleString()} funding rounds tracked in the last 18 months
            </div>
          )}
        </div>

        {/* Bottom: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#475569', fontSize: '20px', fontWeight: 600 }}>spacenexus.us/startups</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
