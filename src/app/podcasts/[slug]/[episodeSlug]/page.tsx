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
  isoDuration,
  metaDescription,
  podcastCategoryClass,
  sanitizeEpisodeDescription,
  stripToText,
  transcriptParagraphs,
} from '@/lib/podcast-format';

// DB-backed detail route (see the note in ../page.tsx). A real HTTP 404 for
// unknown episodes comes from middleware's SLUG_EXISTENCE_CHECKS +
// /api/podcasts/[slug]/[episodeSlug]/exists.
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://spacenexus.us';

interface PageProps {
  params: { slug: string; episodeSlug: string };
}

async function getEpisode(slug: string, episodeSlug: string) {
  const show = await prisma.podcast.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      author: true,
      category: true,
      artworkUrl: true,
      websiteUrl: true,
      feedUrl: true,
      language: true,
      lastFetchedAt: true,
    },
  });
  if (!show) return null;

  const episode = await prisma.podcastEpisode.findUnique({
    where: { podcastId_slug: { podcastId: show.id, slug: episodeSlug } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      audioUrl: true,
      durationSec: true,
      publishedAt: true,
      episodeNumber: true,
      seasonNumber: true,
      transcript: { select: { body: true, language: true, generatedBy: true, updatedAt: true } },
    },
  });
  if (!episode) return null;

  return { show, episode };
}

const NEIGHBOUR_SELECT = { slug: true, title: true, publishedAt: true } as const;

/** Older (prev) and newer (next) episodes by publish date; null when unknown. */
async function getNeighbours(podcastId: string, publishedAt: Date | null) {
  if (!publishedAt) return { prev: null, next: null };
  const [prev, next] = await Promise.all([
    prisma.podcastEpisode.findFirst({
      where: { podcastId, publishedAt: { lt: publishedAt } },
      orderBy: { publishedAt: 'desc' },
      select: NEIGHBOUR_SELECT,
    }),
    prisma.podcastEpisode.findFirst({
      where: { podcastId, publishedAt: { gt: publishedAt } },
      orderBy: { publishedAt: 'asc' },
      select: NEIGHBOUR_SELECT,
    }),
  ]);
  return { prev, next };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getEpisode(params.slug, params.episodeSlug);
  if (!data) return { title: 'Episode Not Found | SpaceNexus' };
  const { show, episode } = data;

  const title = `${episode.title} — ${show.name}`;
  const description = metaDescription(
    episode.description,
    `${episode.title}, an episode of ${show.name}${show.author ? ` by ${show.author}` : ''}. Listen and read the show notes on SpaceNexus.`,
  );
  const canonical = `${BASE_URL}/podcasts/${show.slug}/${episode.slug}`;
  const ogTitle = episode.title.length > 90 ? `${episode.title.slice(0, 87)}…` : episode.title;
  const ogImage = `/api/og?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(`${show.name} · Space podcast`)}&type=learn`;

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
      ...(episode.publishedAt ? { publishedTime: episode.publishedAt.toISOString() } : {}),
      images: [{ url: ogImage, width: 1200, height: 630, alt: episode.title }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PodcastEpisodePage({ params }: PageProps) {
  const data = await getEpisode(params.slug, params.episodeSlug);
  if (!data) notFound();
  const { show, episode } = data;
  const { prev, next } = await getNeighbours(show.id, episode.publishedAt);

  const showUrl = `${BASE_URL}/podcasts/${show.slug}`;
  const episodeUrl = `${showUrl}/${episode.slug}`;
  const descriptionHtml = sanitizeEpisodeDescription(episode.description);
  const descriptionText = stripToText(episode.description);
  const label = episodeLabel(episode.seasonNumber, episode.episodeNumber);
  const date = formatEpisodeDate(episode.publishedAt, { year: true });
  const duration = formatDurationSec(episode.durationSec);
  const transcript = episode.transcript?.body?.trim() ? episode.transcript : null;
  const transcriptParas = transcript ? transcriptParagraphs(transcript.body) : [];

  const episodeJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: episode.title,
    url: episodeUrl,
    ...(descriptionText ? { description: descriptionText } : {}),
    ...(episode.publishedAt ? { datePublished: episode.publishedAt.toISOString() } : {}),
    ...(isoDuration(episode.durationSec) ? { timeRequired: isoDuration(episode.durationSec) } : {}),
    ...(episode.episodeNumber != null ? { episodeNumber: episode.episodeNumber } : {}),
    ...(show.language ? { inLanguage: show.language } : {}),
    partOfSeries: {
      '@type': 'PodcastSeries',
      name: show.name,
      url: showUrl,
      ...(show.artworkUrl ? { image: show.artworkUrl } : {}),
      ...(show.feedUrl ? { webFeed: show.feedUrl } : {}),
    },
    ...(episode.audioUrl
      ? {
          associatedMedia: {
            '@type': 'AudioObject',
            contentUrl: episode.audioUrl,
            ...(isoDuration(episode.durationSec) ? { duration: isoDuration(episode.durationSec) } : {}),
          },
        }
      : {}),
    ...(transcript ? { transcript: transcriptParas.join('\n\n').slice(0, 5000) } : {}),
  };

  return (
    <div className="min-h-screen pb-16">
      <JsonLd data={episodeJsonLd} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Podcasts', href: '/podcasts' },
          { name: show.name, href: `/podcasts/${show.slug}` },
          { name: episode.title },
        ]}
      />

      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 min-w-0" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link><span aria-hidden="true">/</span>
          <Link href="/podcasts" className="hover:text-white/80">Podcasts</Link><span aria-hidden="true">/</span>
          <Link href={`/podcasts/${show.slug}`} className="hover:text-white/80 truncate">{show.name}</Link><span aria-hidden="true">/</span>
          <span className="text-slate-400 truncate">{episode.title}</span>
        </nav>

        <header className="mb-8">
          <Link href={`/podcasts/${show.slug}`} className="inline-flex items-center gap-3 group mb-4">
            {show.artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={show.artworkUrl}
                alt=""
                width={48}
                height={48}
                className="w-12 h-12 rounded-lg object-cover border border-[var(--line)] bg-[var(--surface)]"
              />
            ) : null}
            <span className="min-w-0">
              <span className="block font-semibold text-white group-hover:text-[var(--ember)] transition-colors leading-tight">
                {show.name}
              </span>
              {show.author && <span className="block text-xs text-slate-500">{show.author}</span>}
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            {label && (
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--ink-3)]">{label}</span>
            )}
            {show.category && (
              <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded border ${podcastCategoryClass(show.category)}`}>
                {show.category}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-white leading-tight">
            {episode.title}
          </h1>
          <p className="font-mono text-[11px] text-[var(--ink-3)] mt-2">
            {episode.publishedAt ? (
              <time dateTime={episode.publishedAt.toISOString()}>{date}</time>
            ) : (
              'Date unknown'
            )}
            {duration ? ` · ${duration}` : ''}
          </p>
        </header>

        {episode.audioUrl && (
          <Console title="Listen" source="RSS" asOf={show.lastFetchedAt} status={feedStatus(show.lastFetchedAt)} className="mb-6">
            <audio controls preload="none" src={episode.audioUrl} className="w-full" aria-label={`Play ${episode.title}`}>
              Your browser does not support the audio element.{' '}
              <a href={episode.audioUrl} rel="noopener nofollow">Download the episode</a>.
            </audio>
            <p className="text-xs text-slate-500 mt-2">
              Audio streams directly from the publisher.{' '}
              <a href={episode.audioUrl} target="_blank" rel="noopener nofollow" className="text-[var(--signal)] hover:underline">
                Open the file
              </a>
              {show.websiteUrl && (
                <>
                  {' · '}
                  <a href={show.websiteUrl} target="_blank" rel="noopener nofollow" className="text-[var(--signal)] hover:underline">
                    Show website
                  </a>
                </>
              )}
            </p>
          </Console>
        )}

        {descriptionHtml && (
          <section className="mb-8">
            <h2 className="font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-2)] mb-3">
              Show notes
            </h2>
            <div
              className="text-slate-300 leading-relaxed space-y-3 [&_a]:text-[var(--signal)] [&_a]:underline [&_a]:decoration-[var(--line-hot)] hover:[&_a]:decoration-[var(--signal)] [&_p]:m-0"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </section>
        )}

        {transcript && transcriptParas.length > 0 && (
          <section className="mb-8">
            <Console title="Transcript" padded>
              <p className="font-mono text-[11px] text-[var(--ink-3)] mb-4">
                {transcript.generatedBy === 'manual' || transcript.generatedBy === 'host'
                  ? 'Transcript provided by the show'
                  : transcript.generatedBy
                    ? `Transcript generated automatically (${transcript.generatedBy}); expect occasional errors`
                    : 'Transcript'}
                {transcript.language && transcript.language !== 'en' ? ` · ${transcript.language}` : ''}
              </p>
              <div className="text-slate-300 leading-relaxed space-y-3 max-h-[40rem] overflow-y-auto pr-2">
                {transcriptParas.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </Console>
          </section>
        )}

        <Provenance source="Episodes via the show's public RSS feed" asOf={show.lastFetchedAt} className="mb-8" />

        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10" aria-label="Episode navigation">
          {prev ? (
            <Link
              href={`/podcasts/${show.slug}/${prev.slug}`}
              className="card p-4 hover:border-white/20 transition-colors group block"
              rel="prev"
            >
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Previous episode</span>
              <span className="block text-sm text-white group-hover:text-[var(--ember)] transition-colors line-clamp-2">{prev.title}</span>
              {formatEpisodeDate(prev.publishedAt) && (
                <span className="block font-mono text-[11px] text-[var(--ink-3)] mt-1">{formatEpisodeDate(prev.publishedAt)}</span>
              )}
            </Link>
          ) : (
            <span className="card p-4 opacity-50 block" aria-hidden="true">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Previous episode</span>
              <span className="block text-sm text-slate-500">None indexed</span>
            </span>
          )}
          {next ? (
            <Link
              href={`/podcasts/${show.slug}/${next.slug}`}
              className="card p-4 hover:border-white/20 transition-colors group block sm:text-right"
              rel="next"
            >
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Next episode</span>
              <span className="block text-sm text-white group-hover:text-[var(--ember)] transition-colors line-clamp-2">{next.title}</span>
              {formatEpisodeDate(next.publishedAt) && (
                <span className="block font-mono text-[11px] text-[var(--ink-3)] mt-1">{formatEpisodeDate(next.publishedAt)}</span>
              )}
            </Link>
          ) : (
            <span className="card p-4 opacity-50 block sm:text-right" aria-hidden="true">
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Next episode</span>
              <span className="block text-sm text-slate-500">This is the latest</span>
            </span>
          )}
        </nav>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href={`/podcasts/${show.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-white text-sm font-medium transition-colors"
          >
            All episodes of {show.name}
          </Link>
          {show.feedUrl && (
            <a
              href={show.feedUrl}
              target="_blank"
              rel="noopener nofollow"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:border-white/20 text-slate-200 text-sm font-medium transition-colors"
            >
              Subscribe via RSS
            </a>
          )}
        </div>

        <RelatedModules modules={PAGE_RELATIONS['podcasts']} />
      </div>
    </div>
  );
}
