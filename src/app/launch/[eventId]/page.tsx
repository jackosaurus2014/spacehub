import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import LaunchDayDashboard from '@/components/launch/LaunchDayDashboard';
import RelatedModules from '@/components/ui/RelatedModules';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';
import LaunchCrossLinks from '@/components/launches/LaunchCrossLinks';
import DiscussThis from '@/components/community/DiscussThis';
import MissionHeader from '@/components/launch/MissionHeader';
import LaunchWeatherOdds from '@/components/launch/LaunchWeatherOdds';
import LaunchLiveMode from '@/components/launch/LaunchLiveMode';
import LaunchLiveBlog from '@/components/launch/LaunchLiveBlog';
import PadView from '@/components/launch/PadView';
import JsonLd from '@/components/seo/JsonLd';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { detectLiveStreams } from '@/lib/livestream-detector';
import { decideLiveMode, launchJsonLd, launchPageMetadata, type DetectedStreamLike, type LiveModeDecision } from '@/lib/launch-live-window';
import { serializeEntries } from '@/lib/launch-live-blog';
import { getPadView } from '@/lib/launch-pad-data';
import { PROVIDER_YOUTUBE_URLS } from '@/lib/launch-providers';

interface LaunchPageProps {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * QA-only override: `?qaLive=1` forces live mode so the layout can be
 * screenshotted without waiting for a real launch window. Non-production only,
 * and it never fabricates a stream — the page still shows "no stream yet".
 */
function qaForceLive(searchParams: Record<string, string | string[] | undefined> | undefined): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const v = searchParams?.qaLive;
  return v === '1' || v === 'true';
}

/** Streams the detector currently reports, never throwing into a page render. */
async function safeStreams(): Promise<DetectedStreamLike[]> {
  try {
    return (await detectLiveStreams()) as unknown as DetectedStreamLike[];
  } catch {
    return [];
  }
}

export async function generateMetadata(props: LaunchPageProps): Promise<Metadata> {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const { eventId } = params;

  const event = await prisma.spaceEvent.findUnique({
    where: { id: eventId },
    select: { name: true, agency: true, rocket: true, launchDate: true, location: true, status: true, mission: true, isLive: true },
  });

  if (!event) {
    return { title: 'Launch Not Found | SpaceNexus' };
  }

  const streams = await safeStreams();
  let decision = decideLiveMode({ id: eventId, ...event }, streams);
  if (qaForceLive(searchParams)) decision = { ...decision, live: true, reason: decision.reason ?? 'window' };
  const meta = launchPageMetadata(event, decision);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `https://spacenexus.us/launch/${eventId}` },
    // Live coverage must not be served from a cache that outlives the window.
    other: decision.live ? { 'cache-control': 'no-cache' } : {},
    openGraph: {
      title: `${meta.ogTitle}${meta.live ? '' : ` — ${meta.outcome}`}`,
      description: meta.description,
      type: 'article',
      siteName: 'SpaceNexus',
      images: [{ url: `/api/og?title=${encodeURIComponent(meta.ogTitle)}&subtitle=${encodeURIComponent(meta.ogSubtitle)}&type=launch`, width: 1200, height: 630, alt: event.name }],
    },
    twitter: { card: 'summary_large_image', title: `${meta.ogTitle}${meta.live ? '' : ` — ${meta.outcome}`}`, description: meta.description },
  };
}

export default async function LaunchPage(props: LaunchPageProps) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const { eventId } = params;

  const event = await prisma.spaceEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      status: true,
      launchDate: true,
      windowStart: true,
      windowEnd: true,
      location: true,
      country: true,
      agency: true,
      rocket: true,
      mission: true,
      imageUrl: true,
      infoUrl: true,
      videoUrl: true,
      streamUrl: true,
      missionPhase: true,
      isLive: true,
      padLatitude: true,
      padLongitude: true,
    },
  });

  if (!event) {
    redirect('/mission-control');
  }

  const now = new Date();
  const streams = await safeStreams();
  let decision: LiveModeDecision = decideLiveMode(
    { id: event.id, name: event.name, status: event.status, launchDate: event.launchDate, isLive: event.isLive, rocket: event.rocket, mission: event.mission, agency: event.agency },
    streams,
    now,
  );
  if (qaForceLive(searchParams)) decision = { ...decision, live: true, reason: decision.reason ?? 'window' };

  // Slip history (our own dataset), the debrief if this one flew, and the
  // live blog. The blog is server-rendered so the record is in the HTML.
  const [slips, debrief, liveEntries] = await Promise.all([
    prisma.launchDateChange.findMany({ where: { eventId: event.id }, orderBy: { observedAt: 'asc' }, select: { fromDate: true, toDate: true, observedAt: true } }).catch(() => []),
    prisma.missionDebrief.findFirst({ where: { eventId: event.id, publishedAt: { not: null } }, select: { slug: true } }).catch(() => null),
    prisma.launchLiveEntry
      .findMany({ where: { eventId: event.id }, orderBy: { createdAt: 'desc' }, take: 60, select: { id: true, body: true, linkUrl: true, linkLabel: true, imageUrl: true, kind: true, createdAt: true } })
      .catch(() => []),
  ]);

  const entries = serializeEntries(liveEntries);
  const padView = decision.live ? await getPadView(streams).catch(() => null) : null;

  // Serialize dates to strings for the client component
  const serializedEvent = {
    ...event,
    launchDate: event.launchDate?.toISOString() ?? null,
    windowStart: event.windowStart?.toISOString() ?? null,
    windowEnd: event.windowEnd?.toISOString() ?? null,
  };

  const streamUrlForSchema = decision.stream?.watchUrl ?? event.streamUrl ?? event.videoUrl ?? null;
  const agencyChannelUrl = (event.agency && PROVIDER_YOUTUBE_URLS[event.agency]) || null;

  return (
    <>
      <JsonLd data={launchJsonLd({ id: event.id, name: event.name, description: event.description, location: event.location, agency: event.agency, launchDate: event.launchDate, imageUrl: event.imageUrl }, decision, streamUrlForSchema)} />
      <div className="max-w-[1400px] mx-auto px-4 pt-4">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/mission-control" className="hover:text-slate-300 transition-colors">Launch Schedule</Link>
          <span>/</span>
          <span className="text-slate-400 truncate">{event.name}</span>
        </nav>
      </div>
      <MissionHeader event={{ id: event.id, name: event.name, status: event.status, launchDate: event.launchDate, rocket: event.rocket, agency: event.agency, location: event.location, isLive: !!event.isLive }} slips={slips} debriefSlug={debrief?.slug ?? null} />
      <LaunchWeatherOdds event={{ id: event.id, status: event.status, launchDate: event.launchDate, location: event.location, padLatitude: event.padLatitude, padLongitude: event.padLongitude }} />

      {decision.live ? (
        <>
          <LaunchLiveMode
            event={{ id: event.id, name: event.name, launchDate: serializedEvent.launchDate, rocket: event.rocket, agency: event.agency, location: event.location, mission: event.mission }}
            stream={decision.stream ? { title: decision.stream.title, channelName: decision.stream.channelName, watchUrl: decision.stream.watchUrl, embedUrl: decision.stream.embedUrl, platform: decision.stream.platform, viewerCount: decision.stream.viewerCount } : null}
            streamIsLive={decision.streamIsLive}
            fallbackStreamUrl={event.streamUrl || event.videoUrl || null}
            agencyChannelUrl={agencyChannelUrl}
            initialNow={now.toISOString()}
            windowOpensAt={decision.opensAt?.toISOString() ?? null}
            windowClosesAt={decision.closesAt?.toISOString() ?? null}
            initialEntries={entries}
          />
          {padView && (
            <div className="max-w-[1400px] mx-auto px-4 pb-6">
              <PadView view={padView} compact />
            </div>
          )}
        </>
      ) : (
        <>
          <LaunchDayDashboard event={serializedEvent} />
          {entries.length > 0 && (
            <div className="max-w-[1400px] mx-auto px-4 pb-6">
              <LaunchLiveBlog eventId={event.id} initialEntries={entries} />
            </div>
          )}
        </>
      )}

      {event.launchDate && event.launchDate.getTime() > Date.now() && (
        <div id="alerts" className="max-w-[1400px] mx-auto px-4 pb-4 scroll-mt-24">
          <LaunchWatchForm eventId={event.id} label="this launch" source="launch-page" />
        </div>
      )}
      {/* Forum discussion for this launch (2026-09-14 forum revival).
          The anchor cron opens a thread for every launch inside the horizon,
          so this usually links straight into an existing one — the launch
          page and the T-24 alert email are where the forum gets its readers
          from, rather than waiting for people to find /community. */}
      <div id="discussion" className="max-w-[1400px] mx-auto px-4 pb-6 scroll-mt-24">
        <DiscussThis anchorType="launch" anchorKey={event.id} subjectLabel={event.name} />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 pb-6">
        <LaunchCrossLinks rocket={event.rocket} location={event.location} eventId={event.id} debriefSlug={debrief?.slug ?? null} upcoming={!!event.launchDate && event.launchDate.getTime() > Date.now()} hide={['mc']} />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        <RelatedModules modules={PAGE_RELATIONS['launch/[eventId]']} />
      </div>
    </>
  );
}
