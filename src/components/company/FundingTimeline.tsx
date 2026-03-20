'use client';

import { formatCompact } from '@/lib/format-number';

interface FundingRound {
  id: string;
  date: string;
  amount: number | null;
  seriesLabel: string | null;
  roundType: string | null;
  leadInvestor: string | null;
  postValuation?: number | null;
}

interface FundingTimelineProps {
  rounds: FundingRound[];
}

const ROUND_COLORS: Record<string, string> = {
  'Seed': 'bg-green-400',
  'Series A': 'bg-cyan-400',
  'Series B': 'bg-blue-400',
  'Series C': 'bg-purple-400',
  'Series D': 'bg-violet-400',
  'Series E': 'bg-pink-400',
  'IPO': 'bg-amber-400',
  'SPAC': 'bg-amber-400',
  'Grant': 'bg-emerald-400',
  'Debt': 'bg-slate-400',
};

function getDotColor(round: FundingRound): string {
  if (round.seriesLabel && ROUND_COLORS[round.seriesLabel]) return ROUND_COLORS[round.seriesLabel];
  if (round.roundType && ROUND_COLORS[round.roundType]) return ROUND_COLORS[round.roundType];
  return 'bg-slate-400';
}

/**
 * Visual funding timeline for company profiles.
 * Shows each funding round as a dot on a vertical timeline.
 */
export default function FundingTimeline({ rounds }: FundingTimelineProps) {
  if (!rounds || rounds.length === 0) return null;

  const sorted = [...rounds].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Funding History</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/30 via-purple-500/20 to-transparent" />

        <div className="space-y-4">
          {sorted.map((round, i) => {
            const dotColor = getDotColor(round);
            const year = new Date(round.date).getFullYear();
            const month = new Date(round.date).toLocaleDateString('en-US', { month: 'short' });

            return (
              <div key={round.id || i} className="flex items-start gap-3 relative">
                {/* Dot */}
                <div className={`w-6 h-6 rounded-full ${dotColor} flex items-center justify-center shrink-0 z-10 ring-2 ring-black/50`}>
                  <div className="w-2 h-2 rounded-full bg-white/80" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-white text-sm font-medium truncate">
                        {round.seriesLabel || round.roundType || 'Funding Round'}
                      </span>
                      {round.amount && (
                        <span className="text-cyan-400 text-xs font-mono font-bold">
                          ${formatCompact(round.amount)}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 text-[10px] shrink-0">{month} {year}</span>
                  </div>
                  {round.leadInvestor && (
                    <p className="text-slate-500 text-[10px] mt-0.5">Lead: {round.leadInvestor}</p>
                  )}
                  {round.postValuation && (
                    <p className="text-slate-600 text-[9px]">Post-money: ${formatCompact(round.postValuation)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
