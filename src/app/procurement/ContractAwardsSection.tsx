'use client';

import { useState } from 'react';
import { ContractTicker, ContractsList } from '@/components/contracts';

/**
 * "Notable Contracts & Awards" — renders the curated GovernmentContract
 * dataset (26 hand-maintained NASA/USSF/ESA contracts, ticker + filterable
 * list) inside the Procurement opportunities tab. This is a distinct model
 * from ProcurementOpportunity (the live SAM.gov-sourced solicitations shown
 * above it on the page) and from GovernmentContractAward (the live
 * USASpending-style feed at /procurement/awards) — kept separate rather
 * than deduped since no title/agency/solicitation-number overlaps exist
 * between the curated set and the SAM.gov opportunities.
 */
export default function ContractAwardsSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🏛️</span> Notable Contracts & Awards
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          {expanded ? 'Hide full list' : 'View full curated list →'}
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        A curated set of major NASA, Space Force, and ESA contracts and awards — separate from the
        live SAM.gov feed above and from the real-time USASpending award feed at{' '}
        <a href="/procurement/awards" className="text-white/70 hover:underline">/procurement/awards</a>.
      </p>
      <ContractTicker />
      {expanded && (
        <div className="mt-6">
          <ContractsList />
        </div>
      )}
    </div>
  );
}
