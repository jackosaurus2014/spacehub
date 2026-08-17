import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ClosingSoonCallout,
  RadarTimelineList,
  type RadarTimelineEntry,
} from '@/components/regulatory/RadarTimeline';
import { RADAR_CATEGORIES, RADAR_CATEGORY_LABELS, type RadarCategory } from '@/lib/regulatory-categorizer';
import { getClosingCommentWindows, getRadarTimeline, type RadarEntry } from '@/lib/regulatory-radar';

// DB-backed page — the Railway build container has no database access, and
// the radar must always show the latest actions.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Regulatory Radar — Space Industry Regulatory Actions | SpaceNexus',
  description:
    'Live timeline of space industry regulatory actions: congressional bills, Federal Register rules and proposed rules, ITAR/EAR export-control changes, FAA launch licensing, FCC spectrum actions, and open public comment windows.',
  alternates: { canonical: '/regulatory-radar' },
};

function serialize(entry: RadarEntry): RadarTimelineEntry {
  return {
    id: entry.id,
    source: entry.source,
    category: entry.category,
    title: entry.title,
    summary: entry.summary,
    actionDate: entry.actionDate.toISOString(),
    url: entry.url,
    agency: entry.agency,
    documentType: entry.documentType,
    actionText: entry.actionText,
    commentUrl: entry.commentUrl,
    commentCloseDate: entry.commentCloseDate ? entry.commentCloseDate.toISOString() : null,
    significant: entry.significant,
  };
}

/**
 * Public Regulatory Radar — server-rendered (SEO) unified timeline of
 * congressional actions, Federal Register documents, and agency actions
 * affecting the space industry. Free for everyone; the full Compliance Hub
 * (wizards, case law, risk scoring) is the Pro upsell.
 *
 * Category filtering is link-based (?category=...) so it works without
 * JavaScript and every filtered view is crawlable.
 */
export default async function RegulatoryRadarPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const categoryParam = (RADAR_CATEGORIES as readonly string[]).includes(searchParams.category || '')
    ? (searchParams.category as RadarCategory)
    : undefined;

  // Fail-soft: both helpers return [] if the table is missing or empty.
  const [entries, closingSoon] = await Promise.all([
    getRadarTimeline({ limit: 60, category: categoryParam }),
    getClosingCommentWindows(30),
  ]);

  const serializedEntries = entries.map(serialize);
  const serializedClosing = closingSoon.map(serialize);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pt-8 pb-12 max-w-4xl">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href="/compliance" className="hover:text-slate-300 transition-colors">
            Compliance
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-slate-300">Regulatory Radar</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-bold font-display text-white mb-2">Regulatory Radar</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            The latest congressional actions, Federal Register publications, and government agency
            actions affecting the space industry — export controls (ITAR/EAR), launch licensing,
            spectrum, remote sensing, procurement, and space traffic — in one reverse-chronological
            timeline. Updated daily from official government sources.
          </p>
        </header>

        <ClosingSoonCallout entries={serializedClosing} />

        {/* Link-based category filter — crawlable, keyboard-native */}
        <nav aria-label="Filter by category" className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/regulatory-radar"
            aria-current={!categoryParam ? 'page' : undefined}
            className={`px-3 py-2 min-h-[44px] inline-flex items-center rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              !categoryParam
                ? 'bg-white text-slate-900'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.1]'
            }`}
          >
            All Categories
          </Link>
          {RADAR_CATEGORIES.filter((c) => c !== 'other').map((cat) => (
            <Link
              key={cat}
              href={`/regulatory-radar?category=${cat}`}
              aria-current={categoryParam === cat ? 'page' : undefined}
              className={`px-3 py-2 min-h-[44px] inline-flex items-center rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                categoryParam === cat
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.1]'
              }`}
            >
              {RADAR_CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </nav>

        <RadarTimelineList entries={serializedEntries} />

        <section className="mt-10 card p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Never miss a regulatory shift</h2>
          <p className="text-sm text-slate-400 mb-4">
            Significant export-control actions ship automatically in the SpaceNexus newsletter
            digest, and the weekly Regulatory Radar brief lands every Monday in the{' '}
            <Link href="/intelligence-brief" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Intelligence Brief hub
            </Link>
            . For compliance wizards, case law, export-control reference, and risk scoring, head to
            the full{' '}
            <Link href="/compliance" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Compliance &amp; Regulatory Hub
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/newsletter" className="btn-primary text-sm py-2 px-4">
              Get the newsletter
            </Link>
            <Link href="/compliance?tab=radar" className="btn-secondary text-sm py-2 px-4">
              Open in Compliance Hub
            </Link>
          </div>
        </section>

        <p className="text-xs text-slate-600 mt-6">
          Regulatory information for awareness and research purposes only — not legal advice. Sources:
          congress.gov, federalregister.gov, and agency public records.
        </p>
      </div>
    </div>
  );
}
