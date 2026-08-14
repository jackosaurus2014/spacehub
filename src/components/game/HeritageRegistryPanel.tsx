'use client';

// ─── Space Tycoon: Heritage Registry ────────────────────────────────────────
// Site->game integration: real private space-industry unicorns tracked on
// SpaceNexus (CompanyProfile, valuation >= $1B) spawn lore-safe "Heritage
// Corporation" flavor NPCs. See docs/NPC_BACKDROP.md for the existing NPC
// economic backdrop this complements, and src/lib/game/heritage-npcs.ts for
// the deterministic derivation.
//
// This panel is DISPLAY-FIRST by design: Heritage Corporations are not wired
// into the tick-driven NPC engine (src/lib/game/npc-engine.ts) or the save
// state (state.npcCompanies) — they're a browsable registry fed by their own
// API route, same pattern as RivalsPanel/LeaguePanel (self-fetching, no
// GameState prop required). See the module header of the API route for the
// determinism contract.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface HeritageDossier {
  realCompanyName: string;
  realCompanyHref: string;
  blurb: string;
  charterAncestorLine: string;
}

interface HeritageNPC {
  id: string;
  name: string;
  tier: number;
  tierLabel: string;
  valuationBillions: number;
  sectorTraits: string[];
  dossier: HeritageDossier;
}

interface HeritageResponse {
  npcs: HeritageNPC[];
  count: number;
  source: string | null;
}

function tierBadgeColor(tier: number): string {
  if (tier >= 5) return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  if (tier >= 4) return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  if (tier >= 3) return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
  if (tier >= 2) return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
}

export default function HeritageRegistryPanel() {
  const [data, setData] = useState<HeritageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistry = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/space-tycoon/npc-recruits');
      if (!res.ok) throw new Error('Failed to load Heritage Registry');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Heritage Registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="sr-only">Loading Heritage Registry…</span>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="animate-pulse motion-reduce:animate-none space-y-4">
            <div className="h-6 bg-white/[0.06] rounded w-56" />
            <div className="h-4 bg-white/[0.04] rounded w-72" />
            <div className="h-24 bg-white/[0.04] rounded" />
            <div className="h-24 bg-white/[0.04] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center" role="alert" aria-live="polite">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchRegistry}
          className="mt-3 min-h-[44px] px-4 py-2 rounded-lg bg-red-500/10 text-red-300 text-xs hover:bg-red-500/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.npcs.length === 0) {
    return (
      <div className="hud-frame game-panel p-6 text-center">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <p className="text-slate-400 text-sm">
          No Heritage Corporations on record yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="hud-frame game-panel-glow p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <h2 className="game-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-cyan-300">
          Heritage Registry
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          {data.count} chartered descendant{data.count !== 1 ? 's' : ''} of real 21st-century space
          companies tracked by SpaceNexus — each one a private, real-world unicorn (valuation
          $1B+). Names and identities are invented 22nd-century flavor; the dossier below links to
          the real company.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.npcs.map((npc) => (
          <HeritageCard key={npc.id} npc={npc} />
        ))}
      </div>

      <p className="text-slate-600 text-[10px] text-center">
        Heritage Corporations are lore flavor derived from real SpaceNexus company data — they do
        not yet participate in the live market simulation. See their real-world charter ancestor
        via the dossier link.
      </p>
    </div>
  );
}

function HeritageCard({ npc }: { npc: HeritageNPC }) {
  return (
    <div className="hud-frame game-card rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden p-4">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{'◆'} {npc.name}</h3>
          <span
            className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full border ${tierBadgeColor(npc.tier)}`}
          >
            {npc.tierLabel}
          </span>
        </div>
        <span className="game-number text-xs text-slate-400 whitespace-nowrap">
          ${npc.valuationBillions.toFixed(1)}B
        </span>
      </div>

      {npc.sectorTraits.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {npc.sectorTraits.map((trait) => (
            <span
              key={trait}
              className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]"
            >
              {trait}
            </span>
          ))}
        </div>
      )}

      <p className="text-slate-400 text-xs mt-3 leading-relaxed">{npc.dossier.blurb}</p>

      <div className="mt-3 pt-3 border-t border-white/[0.04]">
        <p className="text-slate-500 text-[11px] italic">{npc.dossier.charterAncestorLine}</p>
        <Link
          href={npc.dossier.realCompanyHref}
          className="inline-flex items-center gap-1 mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View {npc.dossier.realCompanyName} on SpaceNexus {'→'}
        </Link>
      </div>
    </div>
  );
}
