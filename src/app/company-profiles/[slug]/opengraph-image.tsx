import { ImageResponse } from 'next/og';
import prisma from '@/lib/db';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SECTOR_LABELS: Record<string, string> = {
  launch: 'Launch Provider',
  satellite: 'Satellite',
  'ground-segment': 'Ground Segment',
  infrastructure: 'Infrastructure',
  defense: 'Defense',
  analytics: 'Analytics',
  manufacturing: 'Manufacturing',
  agency: 'Space Agency',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Major Player',
  2: 'High Growth',
  3: 'Emerging',
};

export default async function Image({ params }: { params: { slug: string } }) {
  let name = 'Company Profile';
  let sector = '';
  let headquarters = '';
  let employeeRange = '';
  let tierLabel = '';

  try {
    const company = await prisma.companyProfile.findUnique({
      where: { slug: params.slug },
      select: { name: true, headquarters: true, sector: true, tier: true, employeeRange: true },
    });

    if (company) {
      name = company.name;
      sector = company.sector ? (SECTOR_LABELS[company.sector] || company.sector) : '';
      headquarters = company.headquarters || '';
      employeeRange = company.employeeRange ? `${company.employeeRange} employees` : '';
      tierLabel = TIER_LABELS[company.tier] || '';
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
        {/* Top: Branding */}
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
            <span style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 600 }}>SpaceNexus</span>
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
            COMPANY PROFILE
          </div>
        </div>

        {/* Center: Company Name + Initial */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '2px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              color: '#a5b4fc',
              fontWeight: 700,
            }}
          >
            {name.charAt(0)}
          </div>
          <div
            style={{
              fontSize: name.length > 30 ? '40px' : '52px',
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.2,
              maxWidth: '900px',
            }}
          >
            {name}
          </div>
        </div>

        {/* Bottom: Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {sector && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '6px',
                padding: '4px 12px',
                color: '#a5b4fc',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              {sector}
            </div>
          )}
          {headquarters && (
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>{headquarters}</span>
          )}
          {employeeRange && (
            <>
              <span style={{ color: '#475569', fontSize: '16px' }}>|</span>
              <span style={{ color: '#94a3b8', fontSize: '16px' }}>{employeeRange}</span>
            </>
          )}
          {tierLabel && (
            <>
              <span style={{ color: '#475569', fontSize: '16px' }}>|</span>
              <span style={{ color: '#67e8f9', fontSize: '16px', fontWeight: 500 }}>{tierLabel}</span>
            </>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
