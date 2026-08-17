import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RADAR_CATEGORY_LABELS, type RadarCategory } from '@/lib/regulatory-categorizer';
import { daysUntil, getRadarEntryById, type RadarEntry } from '@/lib/regulatory-radar';
import { SOURCE_LABELS } from '@/components/regulatory/RadarTimeline';
import { APP_URL } from '@/lib/constants';

// DB-backed detail page — the Railway build container has no database
// access, and share cards must always reflect the live row.
export const dynamic = 'force-dynamic';

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function categoryLabel(category: string): string {
  return RADAR_CATEGORY_LABELS[category as RadarCategory] || category;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const entry = await getRadarEntryById(params.id);
  if (!entry) return { title: 'Regulatory action not found | SpaceNexus' };

  const description = (entry.summary || `${categoryLabel(entry.category)} action by ${entry.agency || SOURCE_LABELS[entry.source] || entry.source}, ${fmtDate(entry.actionDate)}.`)
    .replace(/\s+/g, ' ')
    .slice(0, 160);
  const url = `${APP_URL}/regulatory-radar/action/${entry.id}`;

  return {
    title: `${entry.title.slice(0, 120)} | Regulatory Radar | SpaceNexus`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: entry.title.slice(0, 150),
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.title.slice(0, 150),
      description,
    },
  };
}

/**
 * Shareable per-action detail page — what happened, who did it, which dates
 * matter, and a link to the primary source. Exists so significant Radar
 * entries have a canonical URL with a share-ready OG card (the Radar
 * timeline itself is one long page).
 */
export default async function RegulatoryActionDetailPage({ params }: { params: { id: string } }) {
  const entry: RadarEntry | null = await getRadarEntryById(params.id);
  if (!entry) notFound();

  const now = new Date();
  const commentOpen = entry.commentCloseDate && entry.commentCloseDate.getTime() > now.getTime();
  const penalty = entry.summary?.match(/^Penalty: (.+?)\.(?:\s|$)/)?.[1] || null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pt-8 pb-12 max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span aria-hidden="true"> / </span>
          <Link href="/regulatory-radar" className="hover:text-slate-300 transition-colors">Regulatory Radar</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-slate-300">Action detail</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border text-cyan-300 bg-cyan-500/10 border-cyan-500/25 whitespace-nowrap">
            {SOURCE_LABELS[entry.source] || entry.source}
          </span>
          <span
            className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
              entry.category === 'enforcement'
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-white/[0.06] text-slate-300 border-white/[0.08]'
            }`}
          >
            {categoryLabel(entry.category)}
          </span>
          {entry.significant && (
            <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
              Significant
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold font-display text-white mb-3 leading-tight">{entry.title}</h1>

        <p className="text-sm text-slate-400 mb-6">
          {[entry.agency, entry.documentType, fmtDate(entry.actionDate)].filter(Boolean).join(' · ')}
        </p>

        {penalty && (
          <div className="card p-4 mb-6 border border-rose-500/25 bg-rose-500/[0.05]">
            <p className="text-sm font-semibold text-rose-300">Penalty: {penalty}</p>
            <p className="text-xs text-slate-500 mt-1">Amount as stated in the source document.</p>
          </div>
        )}

        {entry.summary && (
          <p className="text-sm text-slate-300 leading-relaxed mb-6">{entry.summary}</p>
        )}

        {entry.actionText && (
          <p className="text-xs text-slate-400 mb-6">
            <span className="font-semibold text-slate-300">Action: </span>
            {entry.actionText}
          </p>
        )}

        <div className="card p-5 mb-8 space-y-2">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Key dates</h2>
          <p className="text-sm text-slate-300">
            <span className="text-slate-500">Published / latest action: </span>
            <time dateTime={entry.actionDate.toISOString()}>{fmtDate(entry.actionDate)}</time>
          </p>
          {entry.commentCloseDate && (
            <p className="text-sm text-slate-300">
              <span className="text-slate-500">Public comments close: </span>
              <time dateTime={entry.commentCloseDate.toISOString()}>{fmtDate(entry.commentCloseDate)}</time>
              {commentOpen && (
                <span className="text-amber-300 font-semibold">
                  {' '}
                  — open now ({daysUntil(entry.commentCloseDate, now)} day
                  {daysUntil(entry.commentCloseDate, now) === 1 ? '' : 's'} left)
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-10">
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm py-2 px-4"
          >
            Read the source document
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          {commentOpen && entry.commentUrl && (
            <a
              href={entry.commentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm py-2 px-4"
            >
              Submit a public comment
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
          <Link href={`/regulatory-radar?category=${entry.category}`} className="btn-secondary text-sm py-2 px-4">
            More {categoryLabel(entry.category)} actions
          </Link>
        </div>

        <p className="text-xs text-slate-600">
          Regulatory information for awareness and research purposes only — not legal advice.
          Tracked from official government sources by the{' '}
          <Link href="/regulatory-radar" className="underline underline-offset-2 hover:text-slate-400">
            SpaceNexus Regulatory Radar
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
