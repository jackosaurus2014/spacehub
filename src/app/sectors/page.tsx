import type { Metadata } from 'next';
import Link from 'next/link';
import { SECTORS } from '@/lib/sector-data';

export const metadata: Metadata = {
  title: 'Space Industry Sectors — Complete Market Directory',
  description: 'Explore every sector of the space industry: launch services, satellite communications, Earth observation, defense, space tourism, and more. Companies, market size, and trends per sector.',
  keywords: ['space industry sectors', 'space market segments', 'space company directory', 'satellite industry map', 'space economy sectors'],
  openGraph: {
    title: 'Space Industry Sectors | SpaceNexus',
    description: 'Complete directory of space industry market segments with companies, market sizing, and trends.',
    url: 'https://spacenexus.us/sectors',
  },
  alternates: { canonical: 'https://spacenexus.us/sectors' },
};

export default function SectorsDirectoryPage() {
  const tier1 = SECTORS.filter(s => s.tier === 1);
  const tier2 = SECTORS.filter(s => s.tier === 2);
  const tier3 = SECTORS.filter(s => s.tier === 3);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="mb-10">
        <div className="section-header">
          <div className="flex items-center">
            <div className="section-header__bar bg-gradient-to-b from-cyan-400 to-cyan-600" />
            <h1 className="section-header__title text-2xl">Space Industry Sectors</h1>
          </div>
          <span className="section-header__meta">{SECTORS.length} segments</span>
        </div>
        <p className="section-header__desc">
          Every major market segment in the space economy — companies, market sizing, growth rates, and key trends.
        </p>
      </div>

      {/* Tier 1: Major */}
      <SectorTier label="Major Segments" sublabel="$10B+ market size" sectors={tier1} />

      {/* Tier 2: Growing */}
      <SectorTier label="Growing Segments" sublabel="$1B–$10B market size" sectors={tier2} />

      {/* Tier 3: Emerging */}
      <SectorTier label="Emerging Segments" sublabel="Fast-growing, <$1B" sectors={tier3} />

      {/* CTA */}
      <div className="mt-12 rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Track companies across all sectors with SpaceNexus
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/company-profiles" className="btn-primary text-sm">Browse 200+ Companies</Link>
          <Link href="/compare/companies" className="btn-secondary text-sm">Compare Companies</Link>
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Space Industry Sectors',
            description: 'Complete directory of space industry market segments',
            numberOfItems: SECTORS.length,
            itemListElement: SECTORS.map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: s.name,
              url: `https://spacenexus.us/sectors/${s.slug}`,
            })),
          }).replace(/</g, '\\u003c'),
        }}
      />
    </div>
  );
}

function SectorTier({ label, sublabel, sectors }: { label: string; sublabel: string; sectors: typeof SECTORS }) {
  return (
    <div className="mb-10">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{label}</h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sublabel}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sectors.map(s => (
          <Link
            key={s.slug}
            href={`/sectors/${s.slug}`}
            className="card-interactive p-4 flex items-start gap-3"
          >
            <span className="text-2xl flex-shrink-0 mt-0.5">{s.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</h3>
                <span className="text-[10px] font-mono" style={{ color: 'var(--accent-secondary)' }}>{s.marketSize}</span>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{s.description}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <span>{s.companies.length} companies</span>
                <span style={{ color: '#56F000' }}>{s.growthRate}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
