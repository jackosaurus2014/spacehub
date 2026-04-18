import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Learning Zone | SpaceNexus',
  description:
    'Interactive courses and lessons on orbital mechanics, propulsion, space law, supply chain, communications, and more. Learn by doing with built-in calculators and quizzes.',
  alternates: { canonical: 'https://spacenexus.us/learn/zone' },
  openGraph: {
    title: 'SpaceNexus Learning Zone',
    description:
      'Interactive courses on orbital mechanics, propulsion, space law, and more.',
    type: 'website',
    url: 'https://spacenexus.us/learn/zone',
  },
};

interface TrackMeta {
  slug: string;
  title: string;
  description: string;
  accent: string;
}

const TRACKS: TrackMeta[] = [
  {
    slug: 'orbital-mechanics',
    title: 'Orbital Mechanics',
    description:
      "Kepler's laws, orbital elements, delta-v budgets, Hohmann transfers, rendezvous — the math and intuition behind every mission.",
    accent: 'from-sky-500/20 to-blue-600/10',
  },
  {
    slug: 'propulsion',
    title: 'Rocket Propulsion',
    description:
      'Rocket equation, specific impulse, chemical vs electric, staging, and cycle selection explained from first principles.',
    accent: 'from-orange-500/20 to-red-600/10',
  },
  {
    slug: 'space-law',
    title: 'Space Law',
    description:
      'Outer Space Treaty, ITU frequency coordination, FCC filings, export control (ITAR/EAR) for commercial operators.',
    accent: 'from-purple-500/20 to-indigo-600/10',
  },
  {
    slug: 'supply-chain',
    title: 'Supply Chain',
    description:
      'Space-qualified components, lead times, second sources, BOM risk, and sourcing strategies for flight hardware.',
    accent: 'from-emerald-500/20 to-teal-600/10',
  },
  {
    slug: 'communications',
    title: 'Space Communications',
    description:
      'Link budgets, modulation, antenna gain, ground station selection, and latency for LEO, MEO, GEO systems.',
    accent: 'from-cyan-500/20 to-sky-600/10',
  },
  {
    slug: 'kids',
    title: 'Space for Kids',
    description:
      'Friendly explainers for young learners. Rockets, planets, astronauts, and the magic of orbit.',
    accent: 'from-pink-500/20 to-rose-600/10',
  },
];

async function getData() {
  try {
    const [modules, latestLessons] = await Promise.all([
      prisma.courseModule.findMany({
        where: { published: true },
        orderBy: [{ track: 'asc' }, { orderIndex: 'asc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          track: true,
          level: true,
          estimatedMinutes: true,
          _count: { select: { lessons: true } },
        },
      }),
      prisma.lesson.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          slug: true,
          title: true,
          interactiveType: true,
          module: { select: { slug: true, track: true, title: true, published: true } },
        },
      }),
    ]);
    return {
      modules,
      latestLessons: latestLessons.filter((l) => l.module.published),
    };
  } catch (error) {
    logger.error('Failed to load learning zone data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { modules: [], latestLessons: [] };
  }
}

export default async function LearnZonePage() {
  const { modules, latestLessons } = await getData();

  const modulesByTrack = new Map<string, typeof modules>();
  for (const mod of modules) {
    if (!modulesByTrack.has(mod.track)) modulesByTrack.set(mod.track, []);
    modulesByTrack.get(mod.track)!.push(mod);
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-white/80 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-white/80 transition-colors">
            Learning Center
          </Link>
          <span>/</span>
          <span className="text-slate-400">Learning Zone</span>
        </nav>

        <header className="mb-12 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
            Learning Zone
          </h1>
          <p className="text-lg text-white/70 leading-relaxed">
            Six tracks. Courses, lessons, built-in calculators and quizzes. Learn the math and
            policy behind every mission — from Kepler to frequency coordination.
          </p>
        </header>

        <section className="mb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TRACKS.map((t) => {
              const trackModules = modulesByTrack.get(t.slug) || [];
              const lessonCount = trackModules.reduce(
                (sum, m) => sum + m._count.lessons,
                0,
              );
              return (
                <Link
                  key={t.slug}
                  href={`/learn/${t.slug}`}
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br ${t.accent} p-6 hover:border-white/20 transition-colors`}
                >
                  <h2 className="text-2xl font-bold text-white mb-2">{t.title}</h2>
                  <p className="text-sm text-white/70 leading-relaxed mb-4">{t.description}</p>
                  <div className="flex items-center gap-3 text-xs text-white/60">
                    <span>
                      {trackModules.length} module{trackModules.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-white/30">&bull;</span>
                    <span>
                      {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mt-4 text-sm font-medium text-white group-hover:underline">
                    Explore {t.title} &rarr;
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {latestLessons.length > 0 && (
          <section className="mb-14">
            <h2 className="text-2xl font-bold text-white mb-4">Latest lessons</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestLessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${lesson.module.track}/${lesson.module.slug}/${lesson.slug}`}
                  className="block rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 hover:bg-white/[0.06] hover:border-white/[0.18] transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
                    <span className="uppercase tracking-wide">{lesson.module.track}</span>
                    <span>&bull;</span>
                    <span>{lesson.module.title}</span>
                    {lesson.interactiveType && lesson.interactiveType !== 'none' && (
                      <>
                        <span>&bull;</span>
                        <span className="text-emerald-300">{lesson.interactiveType}</span>
                      </>
                    )}
                  </div>
                  <div className="text-base font-semibold text-white">{lesson.title}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8">
          <h2 className="text-xl font-bold text-white mb-2">Ready to build?</h2>
          <p className="text-white/70 mb-4 max-w-2xl">
            Try one of our DIY Build Guides — CanSats, high-altitude balloons, ISS pass
            receivers, weather stations and more.
          </p>
          <Link
            href="/build-guides"
            className="inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Browse Build Guides &rarr;
          </Link>
        </section>
      </div>
    </div>
  );
}
