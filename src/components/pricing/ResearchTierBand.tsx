'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Availability {
  available: boolean;
  plan: { name: string; priceYearly: number; interval: string; totalSeats: number };
  capabilities: { id: string; label: string; detail: string }[];
}

/**
 * The SpaceNexus Research band on /pricing.
 *
 * It renders NOTHING until the server says the tier is for sale. /pricing is a
 * client component, so the flag cannot be read here directly — asking
 * /api/research/availability keeps the server as the single authority and means
 * a flag left off genuinely removes the tier from the page rather than merely
 * hiding it in CSS.
 *
 * Every bullet comes from RESEARCH_CAPABILITIES on the server. There is no
 * hand-written feature copy in this file, which is the point: the pricing-truth
 * rule cannot be broken by editing JSX.
 */
export default function ResearchTierBand() {
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/research/availability')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const data = json.data ?? json;
        if (data?.available) setAvailability(data as Availability);
      })
      .catch(() => {
        /* A pricing page that cannot reach the API simply shows two plans. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!availability) return null;

  const { plan, capabilities } = availability;

  return (
    <section
      aria-labelledby="research-tier-heading"
      className="max-w-3xl mx-auto mt-10 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
        <h2 id="research-tier-heading" className="text-xl font-bold text-white">
          {plan.name}
        </h2>
        <p className="text-lg font-bold text-white">
          ${plan.priceYearly.toLocaleString()}
          <span className="text-sm font-normal text-slate-400"> / year</span>
        </p>
      </div>
      <p className="text-sm text-slate-300 mb-4">
        For investors, corporate strategy and BD teams. {plan.totalSeats} named
        seats on one annual invoice. Everything on the free and Professional plans
        is unchanged &mdash; Research adds depth, history and exports on top.
      </p>
      <ul className="space-y-2 mb-5">
        {capabilities.map((c) => (
          <li key={c.id} className="flex gap-2 text-sm text-slate-200">
            <span aria-hidden="true" className="text-cyan-400">
              &#10003;
            </span>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/research"
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-cyan-500 px-5 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        See what is in SpaceNexus Research
      </Link>
    </section>
  );
}
