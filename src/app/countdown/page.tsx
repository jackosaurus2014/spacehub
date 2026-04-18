import Link from 'next/link';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mission Countdowns | SpaceNexus',
  description:
    'Browse community-created mission countdown timers and embed them on your own site.',
};

function formatCountdownPreview(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'Launched';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `T-${days}d ${hours}h`;
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  return `T-${hours}h ${mins}m`;
}

export default async function CountdownListPage() {
  const countdowns = await prisma.countdownWidget.findMany({
    orderBy: { targetTime: 'asc' },
    take: 60,
  });

  const upcoming = countdowns.filter((c) => c.targetTime.getTime() > Date.now());
  const past = countdowns.filter((c) => c.targetTime.getTime() <= Date.now());

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">
              Mission Countdowns
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold">Countdown to Liftoff</h1>
            <p className="text-white/60 mt-3 max-w-2xl">
              Public, embeddable countdown timers for real and fictional missions.
              Create your own and share a link or iframe anywhere.
            </p>
          </div>
          <Link
            href="/countdown/new"
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-colors"
          >
            Create your own
          </Link>
        </div>

        {upcoming.length === 0 && past.length === 0 && (
          <div className="border border-white/10 rounded-2xl p-12 text-center text-white/60">
            <p className="mb-4">No countdowns yet — be the first to create one.</p>
            <Link
              href="/countdown/new"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white text-black font-medium"
            >
              Create countdown
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
              Upcoming
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((c) => (
                <Link
                  key={c.id}
                  href={`/countdown/${c.slug}`}
                  className="block border border-white/10 rounded-xl p-5 hover:border-white/30 transition-colors bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-widest text-white/40">
                      {c.theme}
                    </span>
                    <span className="text-sm font-mono text-white/80">
                      {formatCountdownPreview(c.targetTime)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    {c.missionName}
                  </h3>
                  <p className="text-xs text-white/50">
                    {c.targetTime.toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-[11px] text-white/40">
                    <span>{c.views} views</span>
                    <span>{c.embedsCount} embeds</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
              Launched
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((c) => (
                <Link
                  key={c.id}
                  href={`/countdown/${c.slug}`}
                  className="block border border-white/10 rounded-xl p-5 hover:border-white/30 transition-colors bg-white/[0.02] opacity-70"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400">
                      Launched
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    {c.missionName}
                  </h3>
                  <p className="text-xs text-white/50">
                    {c.targetTime.toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
