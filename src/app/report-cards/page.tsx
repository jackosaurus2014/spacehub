/**
 * /report-cards — SERVER component (same rework as /news, /mission-control,
 * /company-profiles). The page used to be 'use client' end to end, and
 * because the interactive half called useSearchParams() the statically
 * prerendered HTML was the Suspense fallback — two skeleton bars — for every
 * crawler and every no-JS client. The first screen (h1, deck, grade summary,
 * provenance) is now real HTML rendered here; the card grid itself
 * server-renders through the client island (its data is the static
 * REPORT_CARDS array in ./shared.ts), and ?view=score is resolved from the
 * server-side searchParams instead of a client hook.
 *
 * force-dynamic per house pattern: searchParams makes the route request-time
 * dynamic anyway, and the Railway build container must never try to
 * prerender data pages.
 */

import { Suspense } from 'react';
import ExportPDFButton from '@/components/ui/ExportPDFButton';
import Provenance from '@/components/ui/Provenance';
import SpaceScorePanel from './SpaceScorePanel';
import GradeViewSwitch from './GradeViewSwitch';
import ReportCardsClient from './ReportCardsClient';
import { REPORT_CARDS, REPORT_CARDS_QUARTER_ASSESSED, computeSummaryStats } from './shared';

export const dynamic = 'force-dynamic';

export default function ReportCardsPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  // The Space Score leaderboard shares this URL (?view=score). The panel is a
  // client component that still reads searchParams itself for its tab state,
  // so it keeps a Suspense boundary.
  if (searchParams?.view === 'score') {
    return (
      <Suspense fallback={<div className="min-h-screen max-w-7xl mx-auto px-4 py-8"><div className="h-10 w-64 bg-white/[0.06] rounded animate-pulse mb-3" /><div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" /></div>}>
        <SpaceScorePanel />
      </Suspense>
    );
  }

  const stats = computeSummaryStats(REPORT_CARDS);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GradeViewSwitch active="cards" />

        {/* ── Header — server-rendered, crawlable ─────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <header className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Industry Report Cards</h1>
            <p className="text-lg text-white/70 max-w-3xl">
              Quarterly analyst-style assessments of major space companies. Grades reflect execution,
              financial health, competitive positioning, and strategic outlook.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              {REPORT_CARDS.length} companies graded for {REPORT_CARDS_QUARTER_ASSESSED} · average grade{' '}
              <span className="font-semibold text-white/90">{stats.averageGrade}</span> ·{' '}
              {stats.outlookCounts.bullish} bullish / {stats.outlookCounts.neutral} neutral /{' '}
              {stats.outlookCounts.bearish} bearish
            </p>
            <Provenance
              source="SpaceNexus editorial assessment of public filings, earnings, and mission records"
              asOf={REPORT_CARDS_QUARTER_ASSESSED}
              className="mt-2"
            />
          </header>
          <ExportPDFButton className="mt-2 flex-shrink-0" />
        </div>

        <ReportCardsClient />
      </div>
    </main>
  );
}
