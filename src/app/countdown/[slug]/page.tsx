import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import Countdown, { type CountdownTheme } from '@/components/countdown/Countdown';
import ShareControls from './ShareControls';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const countdown = await prisma.countdownWidget.findUnique({
    where: { slug: params.slug },
    select: { missionName: true, targetTime: true },
  });
  if (!countdown) return { title: 'Countdown not found | SpaceNexus' };
  return {
    title: `${countdown.missionName} countdown | SpaceNexus`,
    description: `Live countdown to ${countdown.missionName} — ${countdown.targetTime.toISOString()}`,
  };
}

export default async function CountdownDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const countdown = await prisma.countdownWidget.findUnique({
    where: { slug: params.slug },
  });

  if (!countdown) {
    notFound();
  }

  const theme = (countdown.theme as CountdownTheme) || 'dark';
  const bg =
    theme === 'light'
      ? 'bg-slate-50 text-slate-900'
      : theme === 'minimal'
        ? 'bg-white text-slate-900'
        : theme === 'retro'
          ? 'bg-gradient-to-br from-indigo-950 via-purple-950 to-black text-white'
          : 'bg-black text-white';

  return (
    <main className={`min-h-screen ${bg} px-4 sm:px-8 py-12`}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/countdown"
            className="text-xs uppercase tracking-[0.2em] opacity-70 hover:opacity-100"
          >
            &larr; All Countdowns
          </Link>
          <div className="text-xs opacity-60">
            {countdown.views} views &middot; {countdown.embedsCount} embeds
          </div>
        </div>

        <Countdown
          targetTime={countdown.targetTime.toISOString()}
          missionName={countdown.missionName}
          theme={theme}
        />

        <ShareControls slug={countdown.slug} />
      </div>
    </main>
  );
}
