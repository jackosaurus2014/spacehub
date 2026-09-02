import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import JsonLd from '@/components/seo/JsonLd';
import GalleryCard from '@/components/gallery/GalleryCard';
import { getGalleryPage, galleryHref, IMAGE_CREDIT, GALLERY_UPCOMING_WINDOW_DAYS, type GalleryFacet, type GalleryFilters } from '@/lib/gallery';

// Reads Postgres per request; the lib caches the row set for 10 minutes.
// force-dynamic because the Railway build container has no database.
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://spacenexus.us';
const CHIP_LIMIT = 12;

interface GalleryPageProps {
  searchParams: Promise<{ provider?: string; rocket?: string; year?: string; page?: string }>;
}

function parseFilters(sp: { provider?: string; rocket?: string; year?: string; page?: string }) {
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : null;
  const page = sp.page && /^\d+$/.test(sp.page) ? Number(sp.page) : 1;
  return {
    provider: sp.provider?.trim() || null,
    rocket: sp.rocket?.trim() || null,
    year,
    page,
  };
}

function describeFilters(f: { provider: string | null; rocket: string | null; year: number | null }): string {
  const parts = [f.rocket, f.provider, f.year ? String(f.year) : null].filter(Boolean);
  return parts.join(' · ');
}

export async function generateMetadata(props: GalleryPageProps): Promise<Metadata> {
  const f = parseFilters(await props.searchParams);
  const scope = describeFilters(f);
  const title = scope ? `${scope} launch photos` : 'Launch Photo Gallery: Rocket Launch Imagery from Every Provider';
  const description = scope
    ? `Launch imagery for ${scope} — mission photos and infographics from the live manifest, each linked to its launch record, rocket and site.`
    : 'Every rocket launch with a photo: mission imagery, infographics and patches from the live launch manifest, filterable by provider, rocket and year.';
  const canonical = `${BASE_URL}${galleryHref({ provider: f.provider, rocket: f.rocket, year: f.year, page: f.page })}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', siteName: 'SpaceNexus' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function Chips({
  label,
  facets,
  active,
  filters,
  keyName,
}: {
  label: string;
  facets: GalleryFacet[];
  active: string | null;
  filters: GalleryFilters;
  keyName: 'provider' | 'rocket' | 'year';
}) {
  if (facets.length === 0) return null;
  const shown = facets.slice(0, CHIP_LIMIT);
  const activeMissing = active && !shown.some((f) => f.value === active);
  const linkFor = (value: string | null) => {
    const next = { ...filters, [keyName]: value === null ? null : keyName === 'year' ? Number(value) : value } as GalleryFilters;
    return galleryHref(next);
  };
  return (
    <nav aria-label={`Filter by ${label.toLowerCase()}`} className="mb-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{label}</div>
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href={linkFor(null)}
            aria-current={active === null ? 'true' : undefined}
            className={`inline-flex items-center min-h-[44px] px-3 rounded-full border text-sm motion-safe:transition-colors ${active === null ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-white'}`}
          >
            All
          </Link>
        </li>
        {activeMissing && (
          <li>
            <Link href={linkFor(active)} aria-current="true" className="inline-flex items-center min-h-[44px] px-3 rounded-full border border-cyan-400 bg-cyan-500/15 text-cyan-200 text-sm">
              {active}
            </Link>
          </li>
        )}
        {shown.map((f) => {
          const isActive = f.value === active;
          return (
            <li key={f.value}>
              <Link
                href={linkFor(f.value)}
                aria-current={isActive ? 'true' : undefined}
                className={`inline-flex items-center min-h-[44px] px-3 rounded-full border text-sm motion-safe:transition-colors ${isActive ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-white/10 text-slate-300 hover:border-cyan-500/40 hover:text-white'}`}
              >
                {f.value}
                <span className="ml-1.5 text-[11px] text-slate-500 tabular-nums" aria-label={`${f.count} images`}>
                  {f.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default async function GalleryPage(props: GalleryPageProps) {
  const f = parseFilters(await props.searchParams);
  const data = await getGalleryPage(f);
  const scope = describeFilters(data.filters);
  const filtered = Boolean(scope);
  const pageHref = (page: number) => galleryHref({ ...data.filters, page });

  const imageObjects = data.items.slice(0, 48).map((item) => ({
    '@type': 'ImageObject',
    contentUrl: item.imageUrl,
    name: item.title,
    description: item.alt,
    ...(item.launchDate ? { datePublished: item.launchDate } : {}),
    creditText: item.credit.replace(/^Image:\s*/, ''),
    ...(item.detailHref ? { url: `${BASE_URL}${item.detailHref}` } : {}),
  }));

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-7xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/launches" className="hover:text-white/80">Launches</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400">Gallery</span>
        </nav>

        <header className="mb-8 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {filtered ? `${scope} launch photos` : 'Launch imagery'}
          </h1>
          <p className="text-lg text-white/70 leading-relaxed">
            {filtered
              ? `Mission photos and infographics for ${scope}, from the same live manifest that powers Mission Control. Each image links to its launch record.`
              : `Every launch with a photo — flown missions and the next ${GALLERY_UPCOMING_WINDOW_DAYS} days of the manifest. Provider stock images that several missions share are grouped under one card.`}
          </p>
          <p className="text-xs text-slate-500 mt-3">
            {data.total.toLocaleString()} image{data.total === 1 ? '' : 's'}
            {filtered ? '' : ' · '}
            {filtered ? (
              <>
                {' · '}
                <Link href="/gallery" className="text-cyan-400 hover:text-cyan-300">Clear filters</Link>
              </>
            ) : (
              IMAGE_CREDIT
            )}
          </p>
        </header>

        <section aria-label="Filters" className="mb-8">
          <Chips label="Provider" facets={data.facets.providers} active={data.filters.provider} filters={data.filters} keyName="provider" />
          <Chips label="Rocket" facets={data.facets.rockets} active={data.filters.rocket} filters={data.filters} keyName="rocket" />
          <Chips label="Year" facets={data.facets.years} active={data.filters.year === null ? null : String(data.filters.year)} filters={data.filters} keyName="year" />
        </section>

        {data.items.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            <p>No launch imagery matches these filters yet.</p>
            <p className="text-sm mt-2">
              <Link href="/gallery" className="text-cyan-400 hover:text-cyan-300">Show everything</Link>
              {' · '}
              <Link href="/mission-control" className="text-cyan-400 hover:text-cyan-300">Mission Control</Link>
            </p>
          </div>
        ) : (
          <section aria-label="Launch images" className="columns-2 sm:columns-3 xl:columns-4 gap-3">
            {data.items.map((item, i) => (
              <GalleryCard key={item.id} item={item} priority={i < 4} />
            ))}
          </section>
        )}

        {data.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-4 mt-8 text-sm">
            {data.hasPrev ? (
              <Link rel="prev" href={pageHref(data.page - 1)} className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-white/10 text-slate-200 hover:border-cyan-500/40">
                &larr; Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-slate-500 tabular-nums">
              Page {data.page} of {data.totalPages}
            </span>
            {data.hasNext ? (
              <Link rel="next" href={pageHref(data.page + 1)} className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-white/10 text-slate-200 hover:border-cyan-500/40">
                Older &rarr;
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <p className="text-xs text-slate-500 mt-10 max-w-3xl leading-relaxed">
          {IMAGE_CREDIT}. Images are provider and agency media as distributed through the Launch Library 2 manifest; rights remain with their owners.
          Missions sharing one provider image appear once, listing every flight that used it.{' '}
          <Link href="/launches" className="text-cyan-400 hover:text-cyan-300">Launches by site</Link>
          {' · '}
          <Link href="/rockets" className="text-cyan-400 hover:text-cyan-300">Rockets</Link>
          {' · '}
          <Link href="/mission-control" className="text-cyan-400 hover:text-cyan-300">Mission Control</Link>
        </p>

        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Launches', href: '/launches' }, { name: 'Gallery' }]} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ImageGallery',
            name: filtered ? `${scope} launch photos` : 'Launch imagery',
            description: filtered
              ? `Launch imagery for ${scope} from the live launch manifest.`
              : 'Rocket launch photos and infographics from the live launch manifest, grouped by image and linked to each launch record.',
            url: `${BASE_URL}${pageHref(data.page)}`,
            isPartOf: { '@type': 'WebSite', name: 'SpaceNexus', url: BASE_URL },
            dateModified: data.generatedAt,
            numberOfItems: data.total,
            associatedMedia: imageObjects,
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: BASE_URL },
          }}
        />
      </div>
    </div>
  );
}
