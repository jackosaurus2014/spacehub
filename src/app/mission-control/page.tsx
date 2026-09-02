import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import NewsTicker from '@/components/NewsTicker';
import Console from '@/components/ui/Console';
import Countdown from '@/components/ui/Countdown';
import Deck from '@/components/ui/Deck';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import Telemetry from '@/components/ui/Telemetry';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import JsonLd from '@/components/seo/JsonLd';
import { getNextLaunch } from '@/lib/next-launch';
import { missionOf } from '@/lib/next-launch';
import { getNextLaunches } from '@/lib/launch-sites';
import { getMissionControlEvents } from '@/lib/space-events';
import { getLatestGalleryItems, type GalleryItem } from '@/lib/gallery';
import GalleryImage from '@/components/gallery/GalleryImage';
import { logger } from '@/lib/logger';
import type { SpaceEvent } from '@/types';
import MissionControlClient from './MissionControlClient';

// Mission Control is a server component (SYNTHESIS.md item 14). It used to be
// 'use client' end to end, and because the interactive half calls
// useSearchParams() the statically prerendered HTML was the Suspense
// fallback — a spinner — for every crawler and every slow phone. The first
// screen (h1, deck, next launch, the next two dozen launches) is now real
// HTML; the client island below it keeps every tab, filter and stream.
//
// force-dynamic, never ISR: the Railway build container has no database, so a
// revalidate would prerender against nothing. Every read is independently
// try/caught — a missing value renders as "unavailable", never as a guess
// (stale-data doctrine, SYNTHESIS.md graft A2).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'Track upcoming space missions, rocket launches, crewed expeditions, and satellite deployments. Explore 5 years of planned space events from agencies worldwide.',
  keywords: [
    'space missions',
    'rocket launches',
    'SpaceX launches',
    'NASA missions',
    'satellite deployments',
    'crewed missions',
    'moon missions',
    'mars missions',
    'space station',
    'launch schedule',
  ],
  openGraph: {
    title: 'Mission Control | SpaceNexus',
    description: 'Track upcoming space missions, rocket launches, crewed expeditions, and satellite deployments from agencies worldwide.',
    url: 'https://spacenexus.us/mission-control',
    images: [
      {
        url: '/og-mission-control.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Mission Control - Track Space Launches',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mission Control | SpaceNexus',
    description: 'Track upcoming space missions, rocket launches, and satellite deployments.',
    images: ['/og-mission-control.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/mission-control',
  },
};

const SERVER_LIST_SIZE = 24;

/**
 * Coarse T-minus for server-rendered rows. Deliberately not second-resolution:
 * this string is baked into HTML, and only the hero clock ticks.
 */
function tminus(date: Date | string | null, now: Date): string {
  if (!date) return 'TBD';
  const ms = new Date(date).getTime() - now.getTime();
  if (!Number.isFinite(ms)) return 'TBD';
  if (ms <= 0) return 'LIVE';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `T−${days}d ${String(hours).padStart(2, '0')}h`;
  return `T−${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

/** LL2 status → the pip's word + shape. Never colour alone (SYNTHESIS.md §2.1). */
function pipFor(status: string | null | undefined): PipState {
  switch ((status ?? '').toLowerCase()) {
    case 'go':
      return 'go';
    case 'scrubbed':
    case 'failed':
      return 'scrub';
    case 'completed':
      return 'flew';
    case 'tbd':
    case 'tbc':
      return 'hold';
    default:
      return 'tminus';
  }
}

/** "Falcon 9 · Cape Canaveral" from the row's vehicle and pad. */
function vehicleAndSite(rocket: string | null, location: string | null): string {
  return [rocket?.replace(/ Block 5$/, ''), location?.split(',')[0]].filter(Boolean).join(' · ');
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.warn(`mission-control: ${label} failed`, { error: error instanceof Error ? error.message : String(error) });
    return fallback;
  }
}

export default async function MissionControlPage() {
  const now = new Date();

  const [next, upcomingRows, initialEvents, galleryStrip] = await Promise.all([
    safe('next-launch', () => getNextLaunch(), null),
    safe('upcoming', () => getNextLaunches(SERVER_LIST_SIZE + 1, now), [] as Awaited<ReturnType<typeof getNextLaunches>>),
    safe('events-window', () => getMissionControlEvents(now), undefined as SpaceEvent[] | undefined),
    safe('gallery-strip', () => getLatestGalleryItems(6), [] as GalleryItem[]),
  ]);

  // The hero already carries the next launch; the board starts at the one after.
  const board = upcomingRows.filter((r) => r.id !== next?.id).slice(0, SERVER_LIST_SIZE);
  const next48 = upcomingRows.filter(
    (r) => r.launchDate && r.launchDate.getTime() - now.getTime() < 48 * 3600000,
  ).length;
  const liftoffUtc = next?.launchDate
    ? `${new Date(next.launchDate).toISOString().slice(11, 16)}Z`
    : null;
  const netDate = next?.launchDate
    ? new Date(next.launchDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    : null;

  return (
    <div className="min-h-screen">
      {/* Live News Ticker */}
      <NewsTicker />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/art/hero-mission-control.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>

        <div className="container mx-auto px-4 pt-6 pb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--ink)]">
            Mission Control
          </h1>
          <div className="mt-2 h-0.5 w-16 rounded-full bg-gradient-to-r from-[var(--ember)] to-transparent" aria-hidden="true" />
          <Deck className="mt-3">
            Every launch, live stream and mission &mdash; before, during, and after &mdash; plus how to
            watch from the ground.
          </Deck>

          {/* Next launch, compact. Server-rendered so the promise of the page
              is in the HTML; only the clock is hydrated. */}
          {next ? (
            <section
              aria-label="Next launch"
              className="mt-6 rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPip state={pipFor(next.status)} />
                    <span className="font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]">
                      Next launch
                    </span>
                  </div>
                  <h2 className="mt-2 text-[1.375rem] font-bold leading-[1.15] text-[var(--ink)]">
                    <Link
                      href={`/launch/${next.id}`}
                      className="inline-flex min-h-[44px] items-center hover:text-[var(--ember)]"
                    >
                      {missionOf(next.name)}
                    </Link>
                  </h2>
                  <p className="font-body text-[0.875rem] leading-[1.55] text-[var(--ink-2)]">
                    {vehicleAndSite(next.rocket, next.location) || 'Vehicle and pad to be confirmed'}
                    {next.agency ? ` · ${next.agency}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
                  <Countdown to={next.launchDate} size="lg" />
                  {liftoffUtc && <Telemetry label="Liftoff" value={liftoffUtc} sub="scheduled, UTC" />}
                  {netDate && <Telemetry label="NET" value={netDate} tone="ink" sub="no earlier than" />}
                  <Telemetry
                    label="Next 48 h"
                    value={next48}
                    tone="ember"
                    sub={next48 === 1 ? 'launch on the board' : 'launches on the board'}
                  />
                </div>
              </div>
            </section>
          ) : (
            <p className="mt-6 font-body text-[0.875rem] leading-[1.55] text-[var(--ink-3)]">
              The next-launch feed did not answer this request, so nothing is shown here rather than a
              guess. The{' '}
              <Link href="/launch" className="text-[var(--ember)] underline underline-offset-2">
                full launch schedule
              </Link>{' '}
              is still available.
            </p>
          )}
        </div>
      </div>

      {/* The crawlable board. The client island below re-renders the same
          events as an interactive, filterable timeline. */}
      <div className="container mx-auto px-4 pb-8">
        {/* The board is global by design; the per-site schedule pages are the
            answer for "just show me Cape Canaveral" (a real reader request). */}
        <p className="mb-3 font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-3)]">
          Watching one spaceport? Month-by-month schedules for{' '}
          <Link href="/launches/cape-canaveral" className="text-[var(--ember)] underline underline-offset-2 hover:text-[var(--ink)]">
            Cape Canaveral &amp; KSC
          </Link>
          ,{' '}
          <Link href="/launches/vandenberg" className="text-[var(--ember)] underline underline-offset-2 hover:text-[var(--ink)]">
            Vandenberg
          </Link>
          ,{' '}
          <Link href="/launches/starbase" className="text-[var(--ember)] underline underline-offset-2 hover:text-[var(--ink)]">
            Starbase
          </Link>{' '}
          and{' '}
          <Link href="/launches" className="text-[var(--ember)] underline underline-offset-2 hover:text-[var(--ink)]">
            every other launch site
          </Link>
          .
        </p>
        <Console
          title={`Next ${SERVER_LIST_SIZE} launches`}
          source="Launch Library 2"
          asOf={now}
          status={board.length > 0 ? 'live' : 'delayed'}
          padded={false}
        >
          {board.length === 0 ? (
            <p className="p-4 font-body text-[0.875rem] leading-[1.55] text-[var(--ink-3)]">
              The launch board is empty because the schedule feed did not answer, not because nothing is
              flying. It refreshes every few minutes &mdash; the interactive timeline below will fill in as
              soon as it does.
            </p>
          ) : (
            <ul>
              {board.map((row) => (
                <li key={row.id} className="border-b border-[var(--line)] last:border-0">
                  <Link
                    href={`/launch/${row.id}`}
                    className="flex min-h-[44px] flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)]"
                  >
                    <span className="w-[92px] flex-shrink-0 font-mono text-[12.5px] tabular-nums text-[var(--ember)]">
                      {tminus(row.launchDate, now)}
                    </span>
                    <span className="min-w-[180px] flex-1 font-body text-[0.875rem] leading-[1.55] text-[var(--ink)]">
                      {missionOf(row.name)}
                    </span>
                    <span className="font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-3)]">
                      {vehicleAndSite(row.rocket, row.location) || 'Vehicle TBA'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Console>

        {/* Launch imagery strip (2026-09-02): the six newest launch images
            from the LL2 manifest, server-rendered. Absent, not a guess, when
            the gallery read fails. */}
        {galleryStrip.length > 0 && (
          <section aria-labelledby="mc-gallery-heading" className="mt-6">
            <div className="flex items-baseline justify-between gap-4 mb-2">
              <h2 id="mc-gallery-heading" className="font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]">
                Launch imagery
              </h2>
              <Link href="/gallery" className="inline-flex min-h-[44px] items-center font-body text-[0.8125rem] text-[var(--ember)] underline underline-offset-2 hover:text-[var(--ink)]">
                Full gallery &rarr;
              </Link>
            </div>
            <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {galleryStrip.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.detailHref ?? '/gallery'}
                    className="block relative aspect-[4/3] rounded-lg overflow-hidden border border-[var(--line)] bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember)]"
                    aria-label={item.alt}
                  >
                    <GalleryImage src={item.imageUrl} alt="" fill sizes="(min-width: 640px) 16vw, 33vw" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <MissionControlClient initialEvents={initialEvents} />

      {/* Structured data — server-rendered so crawlers see it without hydration. */}
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Mission Control' }]} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Mission Control',
          description: 'Track upcoming space missions, rocket launches, crewed expeditions, and satellite deployments — live countdowns, streams and every upcoming mission.',
          url: 'https://spacenexus.us/mission-control',
          isPartOf: { '@type': 'WebSite', name: 'SpaceNexus', url: 'https://spacenexus.us' },
          about: { '@type': 'Thing', name: 'Rocket launches and space missions' },
          dateModified: now.toISOString(),
          publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        }}
      />
    </div>
  );
}
