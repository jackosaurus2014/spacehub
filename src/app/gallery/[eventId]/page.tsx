import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import JsonLd from '@/components/seo/JsonLd';
import GalleryImage from '@/components/gallery/GalleryImage';
import { getGalleryItem, galleryHref, formatGalleryDate } from '@/lib/gallery';

// DB-backed; the row set is cached 10 min in the lib. Unknown ids get a real
// HTTP 404 through middleware's SLUG_EXISTENCE_CHECKS + the exists route at
// src/app/api/gallery/[eventId]/exists/route.ts (notFound() alone can't set
// the status — see src/lib/__tests__/route-404-status.test.ts).
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://spacenexus.us';

interface GalleryItemPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata(props: GalleryItemPageProps): Promise<Metadata> {
  const { eventId } = await props.params;
  const item = await getGalleryItem(eventId);
  if (!item) return { title: 'Image Not Found | SpaceNexus' };
  const title = `${item.title} — launch photo${item.rocket ? ` (${item.rocket})` : ''}`;
  const description = `${item.alt}. ${item.outcome}.${item.agency ? ` Provider: ${item.agency}.` : ''} Linked to the full launch record, rocket profile and launch site.`;
  const canonical = `${BASE_URL}/gallery/${item.id}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'SpaceNexus',
      images: [{ url: item.imageUrl, alt: item.alt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [item.imageUrl] },
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-sm text-white mt-0.5">{children}</dd>
    </div>
  );
}

export default async function GalleryItemPage(props: GalleryItemPageProps) {
  const { eventId } = await props.params;
  const item = await getGalleryItem(eventId);
  if (!item) notFound();

  const siteName = item.location?.split(',')[0] ?? null;
  const dateUtc = formatGalleryDate(item.launchDate, true);

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/launches" className="hover:text-white/80">Launches</Link>
          <span aria-hidden="true">/</span>
          <Link href="/gallery" className="hover:text-white/80">Gallery</Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-400 truncate max-w-[60vw]">{item.title}</span>
        </nav>

        <figure className="card overflow-hidden mb-6">
          <div className="relative bg-black">
            <GalleryImage
              src={item.imageUrl}
              alt={item.alt}
              width={1600}
              height={1000}
              sizes="(min-width: 1152px) 1152px, 100vw"
              priority
              className="max-h-[80vh] object-contain mx-auto"
            />
          </div>
          <figcaption className="px-4 py-3 text-xs text-slate-500 border-t border-white/[0.06]">
            {item.credit}
            {item.creditUrl && (
              <>
                {' · '}
                <a href={item.creditUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">Source</a>
              </>
            )}
          </figcaption>
        </figure>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{item.title}</h1>
            <p className="text-sm text-slate-400 mb-5">
              {[item.rocket, item.agency, siteName].filter(Boolean).join(' · ')}
            </p>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <Fact label="Launch (UTC)">{dateUtc}</Fact>
              <Fact label="Outcome">{item.outcome}</Fact>
              {item.rocket && (
                <Fact label="Rocket">
                  {item.rocketSlug ? (
                    <Link href={`/rockets/${item.rocketSlug}`} className="text-cyan-400 hover:text-cyan-300">{item.rocket}</Link>
                  ) : (
                    item.rocket
                  )}
                </Fact>
              )}
              {item.agency && (
                <Fact label="Provider">
                  <Link href={galleryHref({ provider: item.agency })} className="text-cyan-400 hover:text-cyan-300">{item.agency}</Link>
                </Fact>
              )}
              {item.location && <Fact label="Site">{item.location}</Fact>}
              {item.mission && item.mission !== item.title && <Fact label="Mission">{item.mission}</Fact>}
            </dl>
            {item.description && <p className="text-sm text-white/70 leading-relaxed mb-6 max-w-2xl">{item.description}</p>}
            <div className="flex flex-wrap gap-2">
              {item.launchHref && (
                <Link href={item.launchHref} className="inline-flex items-center min-h-[44px] px-4 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 text-sm hover:bg-cyan-500/25">
                  Launch record &rarr;
                </Link>
              )}
              {item.rocketSlug && (
                <Link href={`/rockets/${item.rocketSlug}`} className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-white/10 text-slate-200 text-sm hover:border-cyan-500/40">
                  Rocket profile
                </Link>
              )}
              {item.rocket && (
                <Link href={galleryHref({ rocket: item.rocket })} className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-white/10 text-slate-200 text-sm hover:border-cyan-500/40">
                  More {item.rocket} images
                </Link>
              )}
              {item.infoUrl && (
                <a href={item.infoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-[44px] px-4 rounded-lg border border-white/10 text-slate-200 text-sm hover:border-cyan-500/40">
                  Mission info
                </a>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            {(item.missionPatchUrl || item.rocketImageUrl) && (
              <div className="card p-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Mission assets</h2>
                <div className="flex gap-4">
                  {item.missionPatchUrl && (
                    <div className="w-24">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-white/[0.04]">
                        <GalleryImage src={item.missionPatchUrl} alt={`${item.title} mission patch`} fill sizes="96px" />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 text-center">Patch</div>
                    </div>
                  )}
                  {item.rocketImageUrl && item.rocketImageUrl !== item.imageUrl && (
                    <div className="w-24">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-white/[0.04]">
                        <GalleryImage src={item.rocketImageUrl} alt={`${item.rocket ?? 'Rocket'} vehicle image`} fill sizes="96px" />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 text-center">Vehicle</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {item.sharedWith.length > 0 && (
              <div className="card p-4">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Same image, {item.sharedWith.length} other mission{item.sharedWith.length === 1 ? '' : 's'}
                </h2>
                <p className="text-[11px] text-slate-500 mb-2">Provider stock imagery reused across flights.</p>
                <ul className="space-y-1">
                  {item.sharedWith.slice(0, 12).map((m) => (
                    <li key={m.id} className="text-sm">
                      <Link href={`/gallery/${m.id}`} className="text-slate-300 hover:text-cyan-300">{m.name}</Link>
                      <span className="text-slate-500 text-xs"> · {formatGalleryDate(m.launchDate)}</span>
                    </li>
                  ))}
                  {item.sharedWith.length > 12 && <li className="text-xs text-slate-500">and {item.sharedWith.length - 12} more</li>}
                </ul>
              </div>
            )}
          </aside>
        </div>

        <nav aria-label="Adjacent launches" className="flex items-stretch justify-between gap-4 text-sm">
          {item.prev ? (
            <Link rel="prev" href={`/gallery/${item.prev.id}`} className="flex-1 card p-4 hover:border-cyan-500/30 min-h-[44px]">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">&larr; Earlier</div>
              <div className="text-white truncate">{item.prev.name}</div>
              <div className="text-xs text-slate-500">{formatGalleryDate(item.prev.launchDate)}</div>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
          {item.next ? (
            <Link rel="next" href={`/gallery/${item.next.id}`} className="flex-1 card p-4 text-right hover:border-cyan-500/30 min-h-[44px]">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">Later &rarr;</div>
              <div className="text-white truncate">{item.next.name}</div>
              <div className="text-xs text-slate-500">{formatGalleryDate(item.next.launchDate)}</div>
            </Link>
          ) : (
            <span className="flex-1" />
          )}
        </nav>

        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Launches', href: '/launches' }, { name: 'Gallery', href: '/gallery' }, { name: item.title }]} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ImageObject',
            contentUrl: item.imageUrl,
            url: `${BASE_URL}/gallery/${item.id}`,
            name: item.title,
            description: item.alt,
            caption: item.alt,
            creditText: item.credit.replace(/^Image:\s*/, ''),
            ...(item.launchDate ? { datePublished: item.launchDate } : {}),
            representativeOfPage: true,
            about: {
              '@type': 'Event',
              name: item.name,
              ...(item.launchDate ? { startDate: item.launchDate } : {}),
              ...(item.location ? { location: { '@type': 'Place', name: item.location } } : {}),
              ...(item.agency ? { organizer: { '@type': 'Organization', name: item.agency } } : {}),
              url: `${BASE_URL}/launch/${item.id}`,
            },
            isPartOf: { '@type': 'ImageGallery', name: 'Launch imagery', url: `${BASE_URL}/gallery` },
            publisher: { '@type': 'Organization', name: 'SpaceNexus', url: BASE_URL },
          }}
        />
      </div>
    </div>
  );
}
