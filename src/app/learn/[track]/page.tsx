import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { LEARNING_TRACKS } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const TRACK_NAMES: Record<string, { title: string; description: string }> = {
  'orbital-mechanics': {
    title: 'Orbital Mechanics',
    description:
      "Kepler's laws, orbital elements, delta-v budgets, Hohmann transfers, rendezvous.",
  },
  propulsion: {
    title: 'Rocket Propulsion',
    description:
      'Rocket equation, specific impulse, chemical vs electric, staging, engine cycles.',
  },
  'space-law': {
    title: 'Space Law',
    description:
      'Outer Space Treaty, ITU frequency coordination, FCC filings, export control.',
  },
  'supply-chain': {
    title: 'Supply Chain',
    description:
      'Space-qualified components, lead times, second sources, BOM risk, sourcing strategies.',
  },
  communications: {
    title: 'Space Communications',
    description:
      'Link budgets, modulation, antenna gain, ground stations, latency for LEO/MEO/GEO.',
  },
  kids: {
    title: 'Space for Kids',
    description: 'Friendly explainers for young learners. Rockets, planets, astronauts.',
  },
};

interface PageProps {
  params: { track: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const meta = TRACK_NAMES[params.track];
  if (!meta) return { title: 'Track Not Found' };
  return {
    title: `${meta.title} | SpaceNexus Learning Zone`,
    description: meta.description,
    alternates: { canonical: `https://spacenexus.us/learn/${params.track}` },
  };
}

export default async function TrackPage({ params }: PageProps) {
  const { track } = params;
  if (!(LEARNING_TRACKS as readonly string[]).includes(track)) {
    notFound();
  }
  const meta = TRACK_NAMES[track]!;

  let modules: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    level: string;
    estimatedMinutes: number | null;
    _count: { lessons: number };
  }> = [];

  try {
    modules = await prisma.courseModule.findMany({
      where: { track, published: true },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        level: true,
        estimatedMinutes: true,
        _count: { select: { lessons: true } },
      },
    });
  } catch (error) {
    logger.error('Failed to load track modules', {
      track,
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
          <Link href="/learn" className="hover:text-white/80">
            Learning Zone
          </Link>
          <span>/</span>
          <span className="text-slate-400">{meta.title}</span>
        </nav>

        <header className="mb-10 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{meta.title}</h1>
          <p className="text-white/70 leading-relaxed">{meta.description}</p>
        </header>

        {modules.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            No published modules yet in this track. Check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((mod) => (
              <Link
                key={mod.id}
                href={`/learn/${track}/${mod.slug}`}
                className="block rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:bg-white/[0.06] hover:border-white/[0.18] transition-colors"
              >
                <div className="flex items-center gap-2 text-xs text-white/50 mb-2 uppercase tracking-wide">
                  <span>{mod.level}</span>
                  {mod.estimatedMinutes != null && (
                    <>
                      <span>&bull;</span>
                      <span>{mod.estimatedMinutes} min</span>
                    </>
                  )}
                  <span>&bull;</span>
                  <span>
                    {mod._count.lessons} lesson{mod._count.lessons === 1 ? '' : 's'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{mod.title}</h2>
                <p className="text-sm text-white/70 leading-relaxed">{mod.description}</p>
                <div className="mt-3 text-sm font-medium text-white/80">Start module &rarr;</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
