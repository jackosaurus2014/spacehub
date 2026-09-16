'use client';

import { useEffect, useState } from 'react';

/**
 * What the SERVER says about SpaceNexus Research, for client surfaces.
 *
 * /pricing, the footer and the /tools directory are all client-rendered, so
 * none of them can read RESEARCH_TIER_ENABLED. They ask
 * /api/research/availability instead, which keeps the server as the single
 * authority: there is deliberately no NEXT_PUBLIC_ copy of the flag, because a
 * public mirror of it is a second source of truth that can drift.
 *
 * Until the answer arrives — and forever, if the tier is off or its Stripe
 * price is unset — this returns null and every Research surface renders
 * nothing. A page must never show a tier, a price or a buy button for
 * something checkout would refuse.
 *
 * The answer is cached at module scope, so a session costs one small request
 * no matter how many surfaces ask, and client-side navigations cost none.
 */
export interface ResearchAvailability {
  available: boolean;
  plan: { name: string; priceYearly: number; interval: string; totalSeats: number };
  capabilities: { id: string; label: string; detail: string }[];
}

let cached: ResearchAvailability | null = null;
let settled = false;
let inflight: Promise<ResearchAvailability | null> | null = null;

function loadAvailability(): Promise<ResearchAvailability | null> {
  if (settled) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/research/availability')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const data = (json?.data ?? json) as ResearchAvailability | null;
        cached = data?.available ? data : null;
        settled = true;
        return cached;
      })
      .catch(() => {
        // A page that cannot reach the API simply shows one fewer thing.
        cached = null;
        settled = true;
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useResearchAvailability(): ResearchAvailability | null {
  const [availability, setAvailability] = useState<ResearchAvailability | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAvailability().then((data) => {
      if (!cancelled) setAvailability(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return availability;
}
