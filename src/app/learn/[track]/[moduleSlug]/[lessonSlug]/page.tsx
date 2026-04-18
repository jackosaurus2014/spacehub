import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import prisma from '@/lib/db';
import { LEARNING_TRACKS } from '@/lib/validations';
import { logger } from '@/lib/logger';
import LessonInteractive from '@/components/learn/LessonInteractive';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { track: string; moduleSlug: string; lessonSlug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const lesson = await prisma.lesson.findFirst({
      where: { slug: params.lessonSlug, module: { slug: params.moduleSlug } },
      select: {
        title: true,
        bodyMd: true,
        module: { select: { track: true, slug: true } },
      },
    });
    if (!lesson || lesson.module.track !== params.track) {
      return { title: 'Lesson Not Found' };
    }
    return {
      title: `${lesson.title} | SpaceNexus Learning Zone`,
      description: lesson.bodyMd.slice(0, 160).replace(/\s+/g, ' ').trim(),
      alternates: {
        canonical: `https://spacenexus.us/learn/${params.track}/${params.moduleSlug}/${params.lessonSlug}`,
      },
    };
  } catch {
    return { title: 'Lesson' };
  }
}

export default async function LessonPage({ params }: PageProps) {
  const { track, moduleSlug, lessonSlug } = params;
  if (!(LEARNING_TRACKS as readonly string[]).includes(track)) {
    notFound();
  }

  let lesson: {
    id: string;
    slug: string;
    title: string;
    bodyMd: string;
    videoUrl: string | null;
    interactiveType: string | null;
    interactiveConfig: unknown;
    orderIndex: number;
    module: {
      id: string;
      slug: string;
      title: string;
      track: string;
      published: boolean;
    };
  } | null = null;

  let siblings: Array<{ slug: string; title: string; orderIndex: number }> = [];

  try {
    lesson = await prisma.lesson.findFirst({
      where: { slug: lessonSlug, module: { slug: moduleSlug } },
      select: {
        id: true,
        slug: true,
        title: true,
        bodyMd: true,
        videoUrl: true,
        interactiveType: true,
        interactiveConfig: true,
        orderIndex: true,
        module: {
          select: { id: true, slug: true, title: true, track: true, published: true },
        },
      },
    });

    if (lesson) {
      siblings = await prisma.lesson.findMany({
        where: { moduleId: lesson.module.id },
        orderBy: { orderIndex: 'asc' },
        select: { slug: true, title: true, orderIndex: true },
      });
    }
  } catch (error) {
    logger.error('Failed to load lesson', {
      lessonSlug,
      moduleSlug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!lesson || lesson.module.track !== track || !lesson.module.published) {
    notFound();
  }
  const nonNullLesson = lesson!;

  const currentIdx = siblings.findIndex((s) => s.slug === nonNullLesson.slug);
  const prev = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-white/80">
            Learn
          </Link>
          <span>/</span>
          <Link href={`/learn/${track}`} className="hover:text-white/80 capitalize">
            {track.replace(/-/g, ' ')}
          </Link>
          <span>/</span>
          <Link href={`/learn/${track}/${moduleSlug}`} className="hover:text-white/80">
            {nonNullLesson.module.title}
          </Link>
          <span>/</span>
          <span className="text-slate-400">{nonNullLesson.title}</span>
        </nav>

        <header className="mb-8">
          <div className="text-xs text-white/50 uppercase tracking-wide mb-2">
            Lesson {currentIdx + 1} of {siblings.length}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{nonNullLesson.title}</h1>
        </header>

        {nonNullLesson.videoUrl && (
          <div className="mb-8 aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
            <iframe
              src={nonNullLesson.videoUrl}
              title={nonNullLesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <article className="prose prose-invert prose-slate max-w-none mb-10 prose-headings:text-white prose-a:text-sky-300 prose-strong:text-white prose-code:text-emerald-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{nonNullLesson.bodyMd}</ReactMarkdown>
        </article>

        {nonNullLesson.interactiveType && nonNullLesson.interactiveType !== 'none' && (
          <section className="mb-10">
            <LessonInteractive
              type={nonNullLesson.interactiveType}
              config={nonNullLesson.interactiveConfig}
            />
          </section>
        )}

        <nav className="mt-10 flex items-center justify-between gap-3 border-t border-white/10 pt-6">
          {prev ? (
            <Link
              href={`/learn/${track}/${moduleSlug}/${prev.slug}`}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors"
            >
              <div className="text-xs text-white/50">&larr; Previous</div>
              <div className="text-sm font-medium text-white">{prev.title}</div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/learn/${track}/${moduleSlug}/${next.slug}`}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-right hover:bg-white/[0.06] transition-colors"
            >
              <div className="text-xs text-white/50">Next &rarr;</div>
              <div className="text-sm font-medium text-white">{next.title}</div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      </div>
    </div>
  );
}
