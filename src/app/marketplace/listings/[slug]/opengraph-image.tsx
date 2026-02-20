import { ImageResponse } from 'next/og';
import prisma from '@/lib/db';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CATEGORY_LABELS: Record<string, string> = {
  launch: 'Launch Services',
  satellite: 'Satellite Systems',
  in_space: 'In-Space Services',
  ground: 'Ground Segment',
  manufacturing: 'Manufacturing',
  engineering: 'Engineering',
  environment: 'Environment',
  rnd: 'R&D',
  human: 'Human Spaceflight',
  power: 'Space Power',
};

const PRICING_LABELS: Record<string, string> = {
  fixed: 'Fixed Price',
  hourly: 'Hourly Rate',
  per_unit: 'Per Unit',
  subscription: 'Subscription',
  rfq_only: 'Request Quote',
};

export default async function Image({ params }: { params: { slug: string } }) {
  let name = 'Service Listing';
  let category = '';
  let pricingType = '';
  let companyName = '';

  try {
    const listing = await prisma.serviceListing.findUnique({
      where: { slug: params.slug },
      select: {
        name: true,
        category: true,
        pricingType: true,
        company: { select: { name: true } },
      },
    });

    if (listing) {
      name = listing.name;
      category = CATEGORY_LABELS[listing.category] || listing.category;
      pricingType = PRICING_LABELS[listing.pricingType] || listing.pricingType;
      companyName = listing.company.name;
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
            <span style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 600 }}>SpaceNexus Marketplace</span>
          </div>
          {category && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '20px',
                padding: '6px 16px',
                color: '#6ee7b7',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {category}
            </div>
          )}
        </div>

        {/* Center: Listing Name */}
        <div
          style={{
            fontSize: name.length > 50 ? '36px' : '48px',
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.2,
            maxWidth: '1000px',
          }}
        >
          {name}
        </div>

        {/* Bottom: Provider + Pricing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {companyName && (
            <span style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 500 }}>
              by {companyName}
            </span>
          )}
          {pricingType && (
            <>
              <span style={{ color: '#475569', fontSize: '18px' }}>|</span>
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
                {pricingType}
              </div>
            </>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
