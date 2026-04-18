import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import Countdown, { type CountdownTheme } from '@/components/countdown/Countdown';
import EmbedViewTracker from './EmbedViewTracker';

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function EmbedCountdownPage({
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
      ? 'bg-slate-50'
      : theme === 'minimal'
        ? 'bg-white'
        : theme === 'retro'
          ? 'bg-gradient-to-br from-indigo-950 via-purple-950 to-black'
          : 'bg-black';

  return (
    <div className={`${bg} min-h-screen w-full flex items-center justify-center p-3`}>
      <Countdown
        targetTime={countdown.targetTime.toISOString()}
        missionName={countdown.missionName}
        theme={theme}
        compact
      />
      <EmbedViewTracker slug={countdown.slug} />
    </div>
  );
}
