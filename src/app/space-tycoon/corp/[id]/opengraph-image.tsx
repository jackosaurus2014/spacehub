import { ImageResponse } from 'next/og';
import { getPublicCorp } from '@/lib/game/public-leaderboard';
import { getTierDef } from '@/lib/game/corporation-tiers';
import { formatMoney } from '@/lib/game/formulas';

// Prisma requires the Node.js runtime — this route cannot run on the edge.
export const runtime = 'nodejs';
// Matches the pattern used by /space-tycoon/leaderboard/opengraph-image.tsx —
// force-dynamic keeps this route from being swept into build-time prerender.
export const dynamic = 'force-dynamic';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let companyName = 'Space Tycoon Corporation';
  let netWorthLabel = '';
  let rankLabel = '';
  let tierLabel = '';
  let tierColor = '#06b6d4';

  try {
    const corp = await getPublicCorp(params.id);
    if (corp) {
      companyName = corp.companyName;
      netWorthLabel = formatMoney(corp.netWorth);
      rankLabel = `Rank #${corp.rank}`;
      const tierDef = getTierDef(corp.tier);
      tierLabel = `${tierDef.icon} ${tierDef.name}`;
      tierColor = tierDef.color;
    }
  } catch {
    // Fall through with defaults
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
          padding: '60px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: 'white',
                fontWeight: 700,
              }}
            >
              S
            </div>
            <span style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 600 }}>Space Tycoon</span>
          </div>
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.2)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              borderRadius: '20px',
              padding: '6px 16px',
              color: '#67e8f9',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            CORPORATION PROFILE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            style={{
              fontSize: companyName.length > 26 ? '42px' : '56px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              maxWidth: '1000px',
            }}
          >
            {companyName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {rankLabel && (
              <span style={{ fontSize: '32px', color: '#fbbf24', fontWeight: 700 }}>{rankLabel}</span>
            )}
            {netWorthLabel && (
              <>
                <span style={{ color: '#475569', fontSize: '28px' }}>|</span>
                <span style={{ fontSize: '32px', color: '#67e8f9', fontWeight: 700 }}>{netWorthLabel}</span>
              </>
            )}
          </div>
          {tierLabel && (
            <div
              style={{
                display: 'flex',
                width: 'fit-content',
                background: `${tierColor}22`,
                border: `1px solid ${tierColor}88`,
                borderRadius: '8px',
                padding: '8px 18px',
                color: tierColor,
                fontSize: '22px',
                fontWeight: 600,
              }}
            >
              {tierLabel}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#475569', fontSize: '20px', fontWeight: 600 }}>spacenexus.us/space-tycoon</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
