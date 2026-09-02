import { ImageResponse } from 'next/og';
import { getRadarEntryById } from '@/lib/regulatory-radar';
import { RADAR_CATEGORY_LABELS, type RadarCategory } from '@/lib/regulatory-categorizer';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SOURCE_LABELS: Record<string, string> = {
  congress: 'U.S. Congress',
  'federal-register': 'Federal Register',
  faa: 'FAA',
  fcc: 'FCC',
  itu: 'ITU',
  sec: 'SEC',
};

/**
 * Dynamic OG card for Regulatory Radar action detail pages. DB-backed and
 * fail-soft (falls through to a generic Radar card) — same pattern as
 * src/app/marketplace/listings/[slug]/opengraph-image.tsx.
 */
export default async function Image(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let title = 'Regulatory Radar';
  let category = '';
  let agency = '';
  let dateStr = '';
  let enforcement = false;

  try {
    const entry = await getRadarEntryById(params.id);
    if (entry) {
      title = entry.title;
      category = RADAR_CATEGORY_LABELS[entry.category as RadarCategory] || entry.category;
      agency = entry.agency || SOURCE_LABELS[entry.source] || '';
      dateStr = entry.actionDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      enforcement = entry.category === 'enforcement';
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
        {/* Top: Branding + Category */}
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
            <span style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 600 }}>
              SpaceNexus Regulatory Radar
            </span>
          </div>
          {category && (
            <div
              style={{
                background: enforcement ? 'rgba(244, 63, 94, 0.2)' : 'rgba(6, 182, 212, 0.15)',
                border: enforcement ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(6, 182, 212, 0.4)',
                borderRadius: '20px',
                padding: '6px 16px',
                color: enforcement ? '#fda4af' : '#67e8f9',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '1px',
              }}
            >
              {category.toUpperCase()}
            </div>
          )}
        </div>

        {/* Center: Title */}
        <div
          style={{
            fontSize: title.length > 120 ? '32px' : title.length > 60 ? '38px' : '46px',
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.25,
            maxWidth: '1020px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </div>

        {/* Bottom: Agency + Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {agency && <span style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 500 }}>{agency}</span>}
          {agency && dateStr && <span style={{ color: '#475569', fontSize: '18px' }}>|</span>}
          {dateStr && <span style={{ color: '#94a3b8', fontSize: '18px' }}>{dateStr}</span>}
        </div>
      </div>
    ),
    { ...size },
  );
}
