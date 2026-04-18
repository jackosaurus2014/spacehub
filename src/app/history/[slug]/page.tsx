import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

const CATEGORY_COLORS: Record<string, string> = {
  launch: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  landing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  mission: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  discovery: 'text-green-400 bg-green-500/10 border-green-500/20',
  policy: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  milestone: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

function formatFullDate(d: Date | string): string {
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(d);
  }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

async function fetchEvent(slug: string) {
  try {
    const event = await prisma.spaceHistoryEvent.findUnique({ where: { slug } });
    if (!event) return null;

    const [sameDay, sameCategory] = await Promise.all([
      prisma.spaceHistoryEvent.findMany({
        where: { monthDay: event.monthDay, NOT: { id: event.id } },
        orderBy: { year: 'asc' },
        take: 6,
      }),
      prisma.spaceHistoryEvent.findMany({
        where: { category: event.category, NOT: { id: event.id } },
        orderBy: { eventDate: 'desc' },
        take: 6,
      }),
    ]);

    let relatedCompanies: Array<{
      id: string;
      slug: string;
      name: string;
      logoUrl: string | null;
    }> = [];
    if (event.relatedCompanyIds.length > 0) {
      try {
        relatedCompanies = await prisma.companyProfile.findMany({
          where: { id: { in: event.relatedCompanyIds } },
          select: { id: true, slug: true, name: true, logoUrl: true },
        });
      } catch (err) {
        logger.warn('Related company lookup failed', {
          slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { event, sameDay, sameCategory, relatedCompanies };
  } catch (error) {
    logger.error('Failed to load history event detail', {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchEvent(params.slug);
  if (!data) {
    return {
      title: 'Event not found | SpaceNexus',
      description: 'The requested space history event was not found.',
    };
  }
  const { event } = data;
  return {
    title: `${event.title} (${event.year}) | Space History`,
    description: event.description.slice(0, 160),
    alternates: { canonical: `https://spacenexus.us/history/${event.slug}` },
    openGraph: {
      title: `${event.title} (${event.year})`,
      description: event.description.slice(0, 200),
      images: event.imageUrl ? [{ url: event.imageUrl }] : undefined,
    },
  };
}

export default async function HistoryEventPage({ params }: PageProps) {
  const data = await fetchEvent(params.slug);
  if (!data) notFound();

  const { event, sameDay, sameCategory, relatedCompanies } = data;
  const categoryStyle =
    CATEGORY_COLORS[event.category] || 'text-slate-400 bg-white/5 border-white/10';

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title={event.title}
          subtitle={`${formatFullDate(event.eventDate)} · ${event.category}`}
          icon="📜"
          accentColor="purple"
          breadcrumb="Space History"
        >
          <Link href="/history" className="btn-secondary text-sm py-2 px-4">
            Back to Timeline
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto">
          <article className="card p-6 border border-white/[0.06]">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-cyan-400 font-mono text-lg">{event.year}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryStyle}`}
              >
                {event.category}
              </span>
              {event.featured && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
                  featured
                </span>
              )}
              <span className="text-xs text-slate-500 ml-auto">
                monthDay {event.monthDay}
              </span>
            </div>

            {event.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full rounded-lg border border-white/[0.06] mb-5 max-h-[420px] object-cover"
              />
            )}

            <p className="text-slate-200 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>

            {event.sourceUrls && event.sourceUrls.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Sources
                </h3>
                <ul className="space-y-1.5">
                  {event.sourceUrls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                      >
                        {safeHostname(url)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {relatedCompanies.length > 0 && (
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Related Companies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {relatedCompanies.map((c) => (
                    <Link
                      key={c.id}
                      href={`/company-profiles/${c.slug}`}
                      className="inline-flex items-center gap-2 text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <section className="card p-5 border border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white mb-3">
                Also on {event.monthDay}
              </h3>
              {sameDay.length === 0 ? (
                <p className="text-slate-500 text-xs">No other events recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {sameDay.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/history/${e.slug}`}
                        className="flex items-start gap-2 text-sm text-slate-300 hover:text-cyan-300 transition-colors"
                      >
                        <span className="font-mono text-xs text-cyan-400 w-10 shrink-0">
                          {e.year}
                        </span>
                        <span className="line-clamp-2">{e.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-5 border border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white mb-3">
                More {event.category} events
              </h3>
              {sameCategory.length === 0 ? (
                <p className="text-slate-500 text-xs">No other events recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {sameCategory.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/history/${e.slug}`}
                        className="flex items-start gap-2 text-sm text-slate-300 hover:text-cyan-300 transition-colors"
                      >
                        <span className="font-mono text-xs text-cyan-400 w-10 shrink-0">
                          {e.year}
                        </span>
                        <span className="line-clamp-2">{e.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
