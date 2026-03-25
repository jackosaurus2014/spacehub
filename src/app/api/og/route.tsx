import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  guide: { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.4)', text: '#a5b4fc' },
  compare: { bg: 'rgba(6, 182, 212, 0.2)', border: 'rgba(6, 182, 212, 0.4)', text: '#67e8f9' },
  learn: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.4)', text: '#86efac' },
  tools: { bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.4)', text: '#fdba74' },
  pricing: { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.4)', text: '#c4b5fd' },
  marketplace: { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.4)', text: '#f9a8d4' },
  data: { bg: 'rgba(14, 165, 233, 0.2)', border: 'rgba(14, 165, 233, 0.4)', text: '#7dd3fc' },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Space Industry Intelligence';
  const subtitle = searchParams.get('subtitle') || 'Real-time data, market analytics, and business tools for the space economy';
  const type = searchParams.get('type') || '';

  const typeStyle = TYPE_COLORS[type] || null;

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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f172a 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Star field dots */}
        {[
          { top: 40, left: 200, size: 2, opacity: 0.6 },
          { top: 80, left: 600, size: 3, opacity: 0.8 },
          { top: 150, left: 900, size: 2, opacity: 0.5 },
          { top: 200, left: 150, size: 1.5, opacity: 0.7 },
          { top: 350, left: 1050, size: 2.5, opacity: 0.6 },
          { top: 420, left: 350, size: 2, opacity: 0.4 },
          { top: 100, left: 450, size: 1.5, opacity: 0.5 },
          { top: 500, left: 800, size: 2, opacity: 0.7 },
          { top: 300, left: 50, size: 2, opacity: 0.5 },
          { top: 550, left: 550, size: 1.5, opacity: 0.4 },
          { top: 60, left: 1100, size: 2, opacity: 0.6 },
          { top: 480, left: 100, size: 1.5, opacity: 0.5 },
          { top: 250, left: 750, size: 1, opacity: 0.3 },
          { top: 380, left: 500, size: 2, opacity: 0.5 },
          { top: 160, left: 350, size: 1.5, opacity: 0.6 },
          { top: 450, left: 950, size: 2, opacity: 0.4 },
        ].map((star, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              background: `rgba(255, 255, 255, ${star.opacity})`,
            }}
          />
        ))}

        {/* Gradient accent glow */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
          }}
        />

        {/* Top: Branding + type badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: 'white',
                fontWeight: 700,
              }}
            >
              S
            </div>
            <span style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              SpaceNexus
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {typeStyle && (
              <div
                style={{
                  background: typeStyle.bg,
                  border: `1px solid ${typeStyle.border}`,
                  borderRadius: '20px',
                  padding: '6px 18px',
                  color: typeStyle.text,
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {type}
              </div>
            )}
            <div
              style={{
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '20px',
                padding: '6px 18px',
                color: '#67e8f9',
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '1px',
              }}
            >
              spacenexus.us
            </div>
          </div>
        </div>

        {/* Center: Title + Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: title.length > 60 ? '38px' : title.length > 40 ? '44px' : '52px',
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.15,
              maxWidth: '1000px',
              letterSpacing: '-0.5px',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: '20px',
                color: '#94a3b8',
                lineHeight: 1.4,
                maxWidth: '800px',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Bottom: Tagline with gradient line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '60px',
              height: '3px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
            }}
          />
          <span style={{ color: '#64748b', fontSize: '16px', fontWeight: 500 }}>
            The Bloomberg Terminal of the Space Economy
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
