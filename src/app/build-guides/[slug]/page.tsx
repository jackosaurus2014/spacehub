import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

interface Material {
  name: string;
  qty?: string | number;
  url?: string;
  notes?: string;
}

interface Step {
  title: string;
  body: string;
  imageUrl?: string;
}

const TRACK_LABELS: Record<string, string> = {
  'diy-satellite': 'DIY Satellite',
  cansat: 'CanSat',
  'high-altitude-balloon': 'High-Altitude Balloon',
  'weather-station': 'Weather Station',
  'amateur-radio': 'Amateur Radio',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const guide = await prisma.buildGuide.findUnique({
      where: { slug: params.slug },
      select: { title: true, description: true, published: true },
    });
    if (!guide || !guide.published) return { title: 'Build Guide Not Found' };
    return {
      title: `${guide.title} | SpaceNexus Build Guides`,
      description: guide.description.slice(0, 160),
      alternates: { canonical: `https://spacenexus.us/build-guides/${params.slug}` },
    };
  } catch {
    return { title: 'Build Guide' };
  }
}

export default async function BuildGuidePage({ params }: PageProps) {
  let guide: {
    id: string;
    slug: string;
    title: string;
    description: string;
    track: string;
    difficulty: string;
    estimatedHours: number | null;
    materialsList: unknown;
    steps: unknown;
    published: boolean;
    updatedAt: Date;
    authorUserId: string | null;
  } | null = null;
  let authorName: string | null = null;

  try {
    guide = await prisma.buildGuide.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        track: true,
        difficulty: true,
        estimatedHours: true,
        materialsList: true,
        steps: true,
        published: true,
        updatedAt: true,
        authorUserId: true,
      },
    });
    if (guide?.authorUserId) {
      const author = await prisma.user.findUnique({
        where: { id: guide.authorUserId },
        select: { name: true },
      });
      authorName = author?.name ?? null;
    }
  } catch (error) {
    logger.error('Failed to load build guide', {
      slug: params.slug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!guide || !guide.published) notFound();

  const materials: Material[] = Array.isArray(guide.materialsList)
    ? (guide.materialsList as Material[])
    : [];
  const steps: Step[] = Array.isArray(guide.steps) ? (guide.steps as Step[]) : [];

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-white/80">
            Home
          </Link>
          <span>/</span>
          <Link href="/build-guides" className="hover:text-white/80">
            Build Guides
          </Link>
          <span>/</span>
          <span className="text-slate-400">{guide.title}</span>
        </nav>

        <header className="mb-10">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
            <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-white/70">
              {TRACK_LABELS[guide.track] ?? guide.track}
            </span>
            <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-white/70">
              {guide.difficulty}
            </span>
            {guide.estimatedHours != null && (
              <span className="text-white/50 normal-case tracking-normal">
                ~{guide.estimatedHours}h estimated
              </span>
            )}
            {authorName && (
              <span className="text-white/50 normal-case tracking-normal">
                by {authorName}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{guide.title}</h1>
          <p className="text-white/70 leading-relaxed text-lg">{guide.description}</p>
        </header>

        {materials.length > 0 && (
          <section className="mb-12 rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-bold text-white mb-4">Materials</h2>
            <ul className="space-y-2">
              {materials.map((m, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <span className="shrink-0 mt-0.5 size-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/70">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {m.name}
                      {m.qty != null && (
                        <span className="text-white/50 font-normal ml-2">x{m.qty}</span>
                      )}
                    </div>
                    {m.notes && (
                      <div className="text-sm text-white/60 mt-0.5">{m.notes}</div>
                    )}
                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-sky-300 hover:underline"
                      >
                        Product link &rarr;
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold text-white mb-5">Step-by-Step</h2>
          <ol className="space-y-8">
            {steps.map((step, i) => (
              <li
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="shrink-0 size-8 rounded-full bg-sky-500 flex items-center justify-center text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-xl font-bold text-white">{step.title}</h3>
                </div>
                {step.imageUrl && (
                  <div className="relative mb-4 aspect-video overflow-hidden rounded-lg border border-white/10 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={step.imageUrl}
                      alt={step.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-sky-300 prose-strong:text-white prose-code:text-emerald-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.body}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Built this? Share it.</h2>
          <p className="text-sm text-white/70 mb-4">
            Send photos and results — we feature community builds.
          </p>
          <Link
            href="/contact"
            className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Share your build
          </Link>
        </div>
      </div>
    </div>
  );
}
