'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BusinessOpportunityRow {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  sourceType: string; // 'news_analysis' | 'sam_gov'
  sourceUrl: string | null;
  sourceName: string | null;
  agency: string | null;
  estimatedValue: string | null;
  timeframe: string | null;
  difficulty: string | null;
  aiConfidence: number | null;
}

const TIMEFRAME_LABELS: Record<string, string> = {
  immediate: 'Immediate',
  short_term: 'Short-term (1-2y)',
  medium_term: 'Medium-term (2-5y)',
  long_term: 'Long-term (5y+)',
};

function SignalCard({ opp }: { opp: BusinessOpportunityRow }) {
  const isSolicitation = opp.sourceType === 'sam_gov';
  return (
    <div className="card p-4 mb-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            isSolicitation ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
          }`}
        >
          {isSolicitation ? 'SAM.gov Signal' : 'Market Analysis'}
        </span>
        {opp.agency && (
          <span className="text-xs bg-slate-700 text-white/70 px-2 py-0.5 rounded">{opp.agency}</span>
        )}
        {opp.timeframe && TIMEFRAME_LABELS[opp.timeframe] && (
          <span className="text-xs bg-white/[0.06] text-slate-300 px-2 py-0.5 rounded">
            {TIMEFRAME_LABELS[opp.timeframe]}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-white text-sm md:text-base mb-1">{opp.title}</h3>
      <p className="text-slate-400 text-xs leading-relaxed mb-2">{opp.description}</p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {opp.estimatedValue && <span className="text-green-400 font-semibold">{opp.estimatedValue}</span>}
        {opp.sourceName && <span>Source: {opp.sourceName}</span>}
        {opp.sourceUrl && (
          <a href={opp.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:underline">
            View source →
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * "Market Signals" — folds the remaining honest BusinessOpportunity rows
 * (news_analysis editorial analysis + sam_gov solicitation signals; the
 * speculative ai_generated rows are retired at the API layer) into the
 * Procurement opportunities tab. Fetches the full set (7 rows as of
 * 2026-08) and groups by sourceType client-side since the API doesn't
 * expose a sourceType filter param.
 */
export default function MarketSignalsSection() {
  const [opportunities, setOpportunities] = useState<BusinessOpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/opportunities?limit=50')
      .then((res) => res.json())
      .then((data) => {
        if (data.opportunities) setOpportunities(data.opportunities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || opportunities.length === 0) return null;

  const solicitationSignals = opportunities.filter((o) => o.sourceType === 'sam_gov');
  const analysisSignals = opportunities.filter((o) => o.sourceType !== 'sam_gov');

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>📡</span> Market Signals
        </h2>
        <Link href="/market-intel" className="text-sm text-white/70 hover:text-white transition-colors">
          View related companies →
        </Link>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Editorial market analysis and SAM.gov-sourced signals for space industry entrepreneurs and
        investors — not AI speculation. Confidence in the underlying opportunity varies; always
        conduct your own due diligence.
      </p>
      {solicitationSignals.map((opp) => (
        <SignalCard key={opp.id} opp={opp} />
      ))}
      {analysisSignals.map((opp) => (
        <SignalCard key={opp.id} opp={opp} />
      ))}
    </div>
  );
}
