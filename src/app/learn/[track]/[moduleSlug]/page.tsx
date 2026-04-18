import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { LEARNING_TRACKS } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { track: string; moduleSlug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const mod = await prisma.courseModule.findUnique({
      where: { slug: params.moduleSlug },
      select: { title: true, description: true, track: true },
    });
    if (!mod || mod.track !== params.track) return { title: 'Module Not Found' };
    return {
      title: `${mod.title} | SpaceNexus Learning Zone`,
      description: mod.description.slice(0, 160),
      alternates: {
        canonical: `https://spacenexus.us/learn/${params.track}/${params.moduleSlug}`,
      },
    };
  } catch {
    return { title: 'Module' };
  }
}

export default async function ModulePage({ params }: PageProps) {
  const { track, moduleSlug } = params;
  if (!(LEARNING_TRACKS as readonly string[]).includes(track)) {
    notFound();
  }

  let mod: {
    id: string;
    slug: string;
    title: string;
    description: string;
    track: string;
    level: string;
    estimatedMinutes: number | null;
    published: boolean;
    lessons: Array<{
      id: string;
      slug: string;
      title: string;
      orderIndex: number;
      interactiveType: string | null;
    }>;
  } | null = null;

  try {
    mod = await prisma.courseModule.findUnique({
      where: { slug: moduleSlug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        track: true,
        level: true,
        estimatedMinutes: true,
        published: true,
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            orderIndex: true,
            interactiveType: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Failed to load module', {
      moduleSlug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!mod || mod.track !== track || !mod.published) {
    notFound();
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-white/80">
            Learning Zone
          </Link>
          <span>/</span>
          <Link href={`/learn/${track}`} className="hover:text-white/80 capitalize">
            {track.replace(/-/g, ' ')}
          </Link>
          <span>/</span>
          <span className="text-slate-400">{mod.title}</span>
        </nav>

        <header className="mb-10">
          <div className="flex items-center gap-2 text-xs text-white/50 mb-2 uppercase tracking-wide">
            <span>{mod.level}</span>
            {mod.estimatedMinutes != null && (
              <>
                <span>&bull;</span>
                <span>{mod.estimatedMinutes} min</span>
              </>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{mod.title}</h1>
          <p className="text-white/70 leading-relaxed">{mod.description}</p>
        </header>

        <h2 className="text-lg font-semibold text-white mb-3">
          Lessons ({mod.lessons.length})
        </h2>

        {mod.lessons.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-white/60 text-center">
            No lessons yet in this module.
          </div>
        ) : (
          <ol className="space-y-3">
            {mod.lessons.map((lesson, idx) => (
              <li key={lesson.id}>
                <Link
                  href={`/learn/${track}/${moduleSlug}/${lesson.slug}`}
                  className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 hover:bg-white/[0.06] hover:border-white/[0.18] transition-colors"
                >
                  <div className="shrink-0 size-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold text-white">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{lesson.title}</div>
                    {lesson.interactiveType && lesson.interactiveType !== 'none' && (
                      <div className="mt-1 text-xs text-emerald-300 uppercase tracking-wide">
                        Interactive: {lesson.interactiveType}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-sm text-white/60">&rarr;</div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
