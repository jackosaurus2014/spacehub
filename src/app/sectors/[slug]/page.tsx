import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SECTORS, SECTOR_MAP, getRelatedSectors } from '@/lib/sector-data';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SECTORS.map(s => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sector = SECTOR_MAP.get(slug);
  if (!sector) return { title: 'Sector Not Found' };

  return {
    title: `${sector.name} Companies & Market Data — Space Industry`,
    description: `${sector.description} Market size: ${sector.marketSize}, growing at ${sector.growthRate}. ${sector.companies.length} companies tracked on SpaceNexus.`,
    keywords: sector.keywords,
    openGraph: {
      title: `${sector.name} | Space Industry Sectors | SpaceNexus`,
      description: `${sector.description} Market size: ${sector.marketSize}.`,
      url: `https://spacenexus.us/sectors/${slug}`,
      type: 'article',
    },
    alternates: { canonical: `https://spacenexus.us/sectors/${slug}` },
  };
}

export default async function SectorPage({ params }: Props) {
  const { slug } = await params;
  const sector = SECTOR_MAP.get(slug);
  if (!sector) notFound();

  const related = getRelatedSectors(slug);
  const leaders = sector.companies.filter(c => c.tier === 'leader');
  const challengers = sector.companies.filter(c => c.tier === 'challenger');
  const emerging = sector.companies.filter(c => c.tier === 'emerging');

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/sectors" className="hover:text-white transition-colors">Sectors</Link>
        <span className="mx-2">/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{sector.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{sector.icon}</span>
          <div>
            <h1 className="text-display text-2xl md:text-3xl">{sector.name}</h1>
            <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>
              Tier {sector.tier} · {sector.marketSize} · {sector.growthRate}
            </p>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)' }} className="text-base leading-relaxed max-w-3xl">
          {sector.longDescription}
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card-data">
          <div className="card-data__label">Market Size</div>
          <div className="card-data__value text-lg">{sector.marketSize}</div>
        </div>
        <div className="card-data">
          <div className="card-data__label">Growth Rate</div>
          <div className="card-data__value text-lg" style={{ color: '#56F000' }}>{sector.growthRate}</div>
        </div>
        <div className="card-data">
          <div className="card-data__label">Key Metric</div>
          <div className="card-data__sub" style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '4px' }}>{sector.keyMetric}</div>
        </div>
      </div>

      {/* Companies — grouped by tier */}
      <div className="mb-8">
        <div className="section-header mb-4">
          <div className="flex items-center">
            <div className="section-header__bar bg-gradient-to-b from-indigo-400 to-indigo-600" />
            <h2 className="section-header__title text-lg">Companies in This Sector</h2>
          </div>
          <span className="section-header__meta">{sector.companies.length} tracked</span>
        </div>

        <div className="card-terminal">
          <div className="card-terminal__header">
            <div className="flex items-center gap-2">
              <div className="card-terminal__dots">
                <div className="card-terminal__dot card-terminal__dot--red" />
                <div className="card-terminal__dot card-terminal__dot--amber" />
                <div className="card-terminal__dot card-terminal__dot--green" />
              </div>
              <span className="card-terminal__path">spacenexus:~/sectors/{slug}</span>
            </div>
          </div>

          {/* Leaders */}
          {leaders.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold" style={{ background: 'var(--bg-void)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                Market Leaders
              </div>
              {leaders.map(c => (
                <CompanyRow key={c.name} company={c} />
              ))}
            </div>
          )}
          {challengers.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold" style={{ background: 'var(--bg-void)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                Challengers
              </div>
              {challengers.map(c => (
                <CompanyRow key={c.name} company={c} />
              ))}
            </div>
          )}
          {emerging.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold" style={{ background: 'var(--bg-void)', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                Emerging
              </div>
              {emerging.map(c => (
                <CompanyRow key={c.name} company={c} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trends */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Key Trends</h2>
        <ul className="space-y-2">
          {sector.trends.map((trend, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="text-xs mt-0.5" style={{ color: 'var(--accent-secondary)' }}>→</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{trend}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Related Sectors */}
      {related.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-tertiary)' }}>Related Sectors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {related.slice(0, 3).map(r => (
              <Link
                key={r.slug}
                href={`/sectors/${r.slug}`}
                className="card-interactive p-3 flex items-center gap-2"
              >
                <span className="text-lg">{r.icon}</span>
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                  <span className="block text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.marketSize}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Get detailed intelligence on {sector.name.toLowerCase()} companies
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/company-profiles" className="btn-primary text-sm">Browse Company Profiles</Link>
          <Link href="/sectors" className="btn-secondary text-sm">All Sectors</Link>
        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `${sector.name} — Space Industry Sector Analysis`,
            description: sector.description,
            author: { '@type': 'Organization', name: 'SpaceNexus' },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
            datePublished: '2026-03-23',
            url: `https://spacenexus.us/sectors/${slug}`,
          }).replace(/</g, '\\u003c'),
        }}
      />
    </div>
  );
}

function CompanyRow({ company }: { company: { name: string; slug?: string; description: string; tier: string } }) {
  const inner = (
    <div className="flex items-center justify-between px-4 py-3 transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <span className="text-sm font-medium" style={{ color: company.slug ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{company.name}</span>
        <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>{company.description}</span>
      </div>
      {company.slug && (
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>View Profile →</span>
      )}
    </div>
  );

  if (company.slug) {
    return <Link href={`/company-profiles/${company.slug}`} className="block hover:bg-[var(--bg-hover)]">{inner}</Link>;
  }
  return <div>{inner}</div>;
}
