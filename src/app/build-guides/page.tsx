import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'DIY Space Build Guides | SpaceNexus',
  description:
    'Step-by-step DIY build guides: CanSats, high-altitude balloons, amateur radio ISS receivers, weather stations, and more. Materials lists, tools, and detailed instructions.',
  alternates: { canonical: 'https://spacenexus.us/build-guides' },
  openGraph: {
    title: 'DIY Space Build Guides',
    description:
      'Step-by-step DIY space build guides with full materials lists and detailed instructions.',
    type: 'website',
    url: 'https://spacenexus.us/build-guides',
  },
};

const TRACK_LABELS: Record<string, string> = {
  'diy-satellite': 'DIY Satellite',
  cansat: 'CanSat',
  'high-altitude-balloon': 'High-Altitude Balloon',
  'weather-station': 'Weather Station',
  'amateur-radio': 'Amateur Radio',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  intermediate: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  advanced: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default async function BuildGuidesPage() {
  let guides: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    track: string;
    difficulty: string;
    estimatedHours: number | null;
    updatedAt: Date;
  }> = [];

  try {
    guides = await prisma.buildGuide.findMany({
      where: { published: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        track: true,
        difficulty: true,
        estimatedHours: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    logger.error('Failed to load build guides', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-400">Build Guides</span>
        </nav>

        <header className="mb-10 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            DIY Build Guides
          </h1>
          <p className="text-lg text-white/70 leading-relaxed">
            Hands-on builds for aspiring space engineers. Full materials lists, step-by-step
            instructions, and tips from makers who have done it before.
          </p>
        </header>

        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-white/60">
            {guides.length} guide{guides.length === 1 ? '' : 's'} available
          </div>
          <Link
            href="/build-guides/new"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
          >
            + Contribute a guide
          </Link>
        </div>

        {guides.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            No build guides published yet. Be the first to contribute!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {guides.map((g) => (
              <Link
                key={g.id}
                href={`/build-guides/${g.slug}`}
                className="block rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:bg-white/[0.06] hover:border-white/[0.18] transition-colors"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
                  <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-white/70">
                    {TRACK_LABELS[g.track] ?? g.track}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 ${DIFFICULTY_COLORS[g.difficulty] || 'border-white/15 bg-white/[0.05] text-white/70'}`}
                  >
                    {g.difficulty}
                  </span>
                  {g.estimatedHours != null && (
                    <span className="text-white/50 normal-case tracking-normal">
                      ~{g.estimatedHours}h
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{g.title}</h2>
                <p className="text-sm text-white/70 leading-relaxed">{g.description}</p>
                <div className="mt-4 text-sm font-medium text-white/80">View guide &rarr;</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
