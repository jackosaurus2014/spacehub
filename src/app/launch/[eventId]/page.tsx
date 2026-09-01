import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import LaunchDayDashboard from '@/components/launch/LaunchDayDashboard';
import RelatedModules from '@/components/ui/RelatedModules';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';
import LaunchCrossLinks from '@/components/launches/LaunchCrossLinks';
import MissionHeader from '@/components/launch/MissionHeader';
import LaunchWeatherOdds from '@/components/launch/LaunchWeatherOdds';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

interface LaunchPageProps {
  params: { eventId: string };
}

export async function generateMetadata({ params }: LaunchPageProps): Promise<Metadata> {
  const { eventId } = params;

  const event = await prisma.spaceEvent.findUnique({
    where: { id: eventId },
    select: { name: true, agency: true, rocket: true, launchDate: true, location: true, status: true, mission: true },
  });

  if (!event) {
    return { title: 'Launch Not Found | SpaceNexus' };
  }

  const when = event.launchDate ? event.launchDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC' : 'date TBD';
  const outcome = event.status === 'completed' ? 'Launched successfully' : event.status === 'failed' ? 'Launch failure' : event.status === 'in_progress' ? 'In flight' : `Launches ${when}`;
  const ogTitle = event.name.length > 70 ? event.name.slice(0, 67) + '…' : event.name;
  const ogSubtitle = [event.rocket, event.location, outcome].filter(Boolean).join(' · ');
  const description = `${event.name}${event.agency ? ` by ${event.agency}` : ''}${event.rocket ? ` on ${event.rocket}` : ''}${event.location ? ` from ${event.location}` : ''} — ${outcome}. Live countdown, stream, telemetry and the mission record.`;

  return {
    title: `${event.name} - Launch Day | SpaceNexus`,
    description,
    alternates: { canonical: `https://spacenexus.us/launch/${eventId}` },
    openGraph: {
      title: `${event.name} — ${outcome}`,
      description,
      type: 'article',
      siteName: 'SpaceNexus',
      images: [{ url: `/api/og?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(ogSubtitle)}&type=launch`, width: 1200, height: 630, alt: event.name }],
    },
    twitter: { card: 'summary_large_image', title: `${event.name} — ${outcome}`, description },
  };
}

export default async function LaunchPage({ params }: LaunchPageProps) {
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

  // Slip history (our own dataset) and the debrief, if this one flew.
  const [slips, debrief] = await Promise.all([
    prisma.launchDateChange.findMany({ where: { eventId: event.id }, orderBy: { observedAt: 'asc' }, select: { fromDate: true, toDate: true, observedAt: true } }).catch(() => []),
    prisma.missionDebrief.findFirst({ where: { eventId: event.id, publishedAt: { not: null } }, select: { slug: true } }).catch(() => null),
  ]);

  // Serialize dates to strings for the client component
  const serializedEvent = {
    ...event,
    launchDate: event.launchDate?.toISOString() ?? null,
    windowStart: event.windowStart?.toISOString() ?? null,
    windowEnd: event.windowEnd?.toISOString() ?? null,
  };

  return (
    <>
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
      <LaunchDayDashboard event={serializedEvent} />
      {event.launchDate && event.launchDate.getTime() > Date.now() && (
        <div id="alerts" className="max-w-[1400px] mx-auto px-4 pb-4 scroll-mt-24">
          <LaunchWatchForm eventId={event.id} label="this launch" source="launch-page" />
        </div>
      )}
      <div className="max-w-[1400px] mx-auto px-4 pb-6">
        <LaunchCrossLinks rocket={event.rocket} location={event.location} eventId={event.id} debriefSlug={debrief?.slug ?? null} upcoming={!!event.launchDate && event.launchDate.getTime() > Date.now()} hide={['mc']} />
      </div>
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        <RelatedModules modules={PAGE_RELATIONS['launch/[eventId]']} />
      </div>
    </>
  );
}
