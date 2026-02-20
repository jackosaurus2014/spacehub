import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import LaunchDayDashboard from '@/components/launch/LaunchDayDashboard';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

interface LaunchPageProps {
  params: { eventId: string };
}

export async function generateMetadata({ params }: LaunchPageProps): Promise<Metadata> {
  const { eventId } = params;

  const event = await prisma.spaceEvent.findUnique({
    where: { id: eventId },
    select: { name: true, agency: true, rocket: true },
  });

  if (!event) {
    return { title: 'Launch Not Found | SpaceNexus' };
  }

  return {
    title: `${event.name} - Launch Day | SpaceNexus`,
    description: `Live coverage of ${event.name}${event.agency ? ` by ${event.agency}` : ''}${event.rocket ? ` on ${event.rocket}` : ''}. Real-time telemetry, mission timeline, and live chat.`,
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
    },
  });

  if (!event) {
    redirect('/mission-control');
  }

  // Serialize dates to strings for the client component
  const serializedEvent = {
    ...event,
    launchDate: event.launchDate?.toISOString() ?? null,
    windowStart: event.windowStart?.toISOString() ?? null,
    windowEnd: event.windowEnd?.toISOString() ?? null,
  };

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Launch Schedule', href: '/mission-control' },
        { name: event.name },
      ]} />
      <div className="max-w-[1400px] mx-auto px-4 pt-4">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/mission-control" className="hover:text-slate-300 transition-colors">Launch Schedule</Link>
          <span>/</span>
          <span className="text-slate-400 truncate">{event.name}</span>
        </nav>
      </div>
      <LaunchDayDashboard event={serializedEvent} />
    </>
  );
}
