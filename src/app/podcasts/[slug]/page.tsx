import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import JsonLd from '@/components/seo/JsonLd';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import Console from '@/components/ui/Console';
import Provenance from '@/components/ui/Provenance';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import {
  episodeLabel,
  feedStatus,
  formatDurationSec,
  formatEpisodeDate,
  metaDescription,
  podcastCategoryClass,
  stripToText,
} from '@/lib/podcast-format';

// DB-backed detail route: the roster lives in Postgres and Railway's build
// container has no DB, so the slug list can't be enumerated at build time.
// A real HTTP 404 for unknown slugs comes from middleware's
// SLUG_EXISTENCE_CHECKS + /api/podcasts/[slug]/exists (see src/middleware.ts).
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://spacenexus.us';
const EPISODE_LIST_LIMIT = 50;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SHOW_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  feedUrl: true,
  websiteUrl: true,
  artworkUrl: true,
  author: true,
  category: true,
  language: true,
  episodeCount: true,
  lastFetchedAt: true,
} as const;

async function getShow(slug: string) {
  return prisma.podcast.findUnique({ where: { slug }, select: SHOW_SELECT });
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const show = await getShow(params.slug);
  if (!show) return { title: 'Podcast Not Found | SpaceNexus' };

  const title = `${show.name} — Space Podcast`;
  const description = metaDescription(
    show.description,
    `Episodes, show notes and listening links for ${show.name}${show.author ? ` by ${show.author}` : ''}, in the SpaceNexus space podcast directory.`,
  );
  const canonical = `${BASE_URL}/podcasts/${show.slug}`;
  const ogImage = `/api/og?title=${encodeURIComponent(show.name)}&subtitle=${encodeURIComponent(show.author ? `${show.author} · Space podcast` : 'Space podcast')}&type=learn`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: 'SpaceNexus',
      images: [{ url: ogImage, width: 1200, height: 630, alt: show.name }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PodcastShowPage(props: PageProps) {
  const params = await props.params;
  const show = await getShow(params.slug);
  if (!show) notFound();

  const episodes = await prisma.podcastEpisode.findMany({
    where: { podcastId: show.id },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    take: EPISODE_LIST_LIMIT,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      durationSec: true,
      publishedAt: true,
      episodeNumber: true,
      seasonNumber: true,
    },
  });

  const description = stripToText(show.description);
  const showUrl = `${BASE_URL}/podcasts/${show.slug}`;
  const latest = episodes[0];

  const seriesJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: show.name,
    url: showUrl,
    ...(description ? { description } : {}),
    ...(show.artworkUrl ? { image: show.artworkUrl } : {}),
    ...(show.author ? { author: { '@type': 'Organization', name: show.author } } : {}),
    ...(show.feedUrl ? { webFeed: show.feedUrl } : {}),
    ...(show.websiteUrl ? { sameAs: show.websiteUrl } : {}),
    ...(show.language ? { inLanguage: show.language } : {}),
  };

  return (
    <div className="min-h-screen pb-16">
      <JsonLd data={seriesJsonLd} />
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Podcasts', href: '/podcasts' }, { name: show.name }]} />

      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link><span aria-hidden="true">/</span>
          <Link href="/podcasts" className="hover:text-white/80">Podcasts</Link><span aria-hidden="true">/</span>
          <span className="text-slate-400 truncate">{show.name}</span>
        </nav>

        <header className="mb-8 flex flex-col sm:flex-row gap-6">
          {show.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={show.artworkUrl}
              alt={`${show.name} artwork`}
              width={176}
              height={176}
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl object-cover flex-shrink-0 border border-[var(--line)] bg-[var(--surface)]"
            />
          ) : (
            <div
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl flex items-center justify-center flex-shrink-0 border border-[var(--line)] bg-[var(--surface)]"
              aria-hidden="true"
            >
              <svg className="w-12 h-12 text-[var(--ink-3)]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 12a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.93V22h-2v-3.07A7 7 0 0 1 5 12h2z" />
              </svg>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {show.category && (
                <Link
                  href={`/podcasts?category=${encodeURIComponent(show.category)}`}
                  className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${podcastCategoryClass(show.category)}`}
                >
                  {show.category}
                </Link>
              )}
              <span className="text-xs text-slate-500">
                {show.episodeCount} {show.episodeCount === 1 ? 'episode' : 'episodes'} indexed
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-white leading-tight">
              {show.name}
            </h1>
            {show.author && <p className="text-slate-400 mt-1">{show.author}</p>}
            {description && (
              <p className="text-slate-300 leading-relaxed mt-4 max-w-3xl">{description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-5">
              {show.websiteUrl && (
                <a
                  href={show.websiteUrl}
                  target="_blank"
                  rel="noopener nofollow"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-white text-sm font-medium transition-colors"
                >
                  Show website
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {show.feedUrl && (
                <a
                  href={show.feedUrl}
                  target="_blank"
                  rel="noopener nofollow"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-white/20 text-slate-200 text-sm font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-[var(--ember)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.18 15.64a2.18 2.18 0 1 1 0 4.36 2.18 2.18 0 0 1 0-4.36zM4 10.1v2.83A7.07 7.07 0 0 1 11.07 20h2.83A9.9 9.9 0 0 0 4 10.1zM4 4v2.83A13.17 13.17 0 0 1 17.17 20H20A16 16 0 0 0 4 4z" />
                  </svg>
                  Subscribe via RSS
                </a>
              )}
              {latest && (
                <Link
                  href={`/podcasts/${show.slug}/${latest.slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--ember)]/40 text-[var(--ember)] hover:bg-[var(--ember)]/10 text-sm font-medium transition-colors"
                >
                  Latest episode
                </Link>
              )}
            </div>
          </div>
        </header>

        <Console
          title="Episodes"
          source="RSS"
          asOf={show.lastFetchedAt}
          status={feedStatus(show.lastFetchedAt)}
          padded={false}
          className="mb-4"
        >
          {episodes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-sm">
                No episodes indexed yet. The feed is checked every few hours; the show&apos;s own site has the full archive.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-[var(--line)]">
              {episodes.map((ep) => {
                const label = episodeLabel(ep.seasonNumber, ep.episodeNumber);
                const date = formatEpisodeDate(ep.publishedAt);
                const duration = formatDurationSec(ep.durationSec);
                const meta = [date, duration].filter(Boolean).join(' · ');
                return (
                  <li key={ep.id}>
                    <Link
                      href={`/podcasts/${show.slug}/${ep.slug}`}
                      className="flex items-start gap-4 px-4 py-3.5 hover:bg-[var(--hover)] transition-colors group"
                    >
                      <span className="w-14 flex-shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--ink-3)] pt-1">
                        {label ?? '—'}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-white group-hover:text-[var(--ember)] transition-colors leading-snug line-clamp-2">
                          {ep.title}
                        </span>
                        {ep.description && (
                          <span className="block text-sm text-slate-400 mt-0.5 line-clamp-1">
                            {stripToText(ep.description, 240)}
                          </span>
                        )}
                      </span>
                      {meta && (
                        <span className="hidden sm:block flex-shrink-0 font-mono text-[11px] text-[var(--ink-3)] pt-1 whitespace-nowrap">
                          {meta}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Console>

        <Provenance source="Episodes via the show's public RSS feed" asOf={show.lastFetchedAt} className="mb-10" />

        {show.episodeCount > episodes.length && show.websiteUrl && (
          <p className="text-sm text-slate-500 mb-10">
            Showing the {episodes.length} most recent episodes.{' '}
            <a href={show.websiteUrl} target="_blank" rel="noopener nofollow" className="text-[var(--signal)] hover:underline">
              Full archive on the show&apos;s site
            </a>
            .
          </p>
        )}

        <RelatedModules modules={PAGE_RELATIONS['podcasts']} />
      </div>
    </div>
  );
}
