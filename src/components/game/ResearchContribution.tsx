'use client';

// ─── Row 8 (docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 8) ────────────────────
// "The Research panel shows per-tech 'current contribution → after purchase'
// from the classifier so nobody buys +0.00%."
//
// Before this, the panel showed a tech's MECHANICAL effect ("+9.9% service
// revenue") with no way to know that your service-revenue bucket was already
// sitting on its cap, so the tech was worth exactly nothing to you. This
// component runs the REAL getResearchBonuses twice (research-tree.ts
// getResearchContribution) and prints what the aggregate is now and what it
// becomes — so the shown number is the number the engine will pay.

import { getResearchContribution, GATE_ONLY_LABEL } from '@/lib/game/research-tree';
import type { ResearchDefinition } from '@/lib/game/types';

interface Props {
  def: ResearchDefinition;
  completedResearch: string[];
  repeatableResearchLevels?: Record<string, number>;
  corporationTier?: number;
  className?: string;
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function ResearchContribution({
  def,
  completedResearch,
  repeatableResearchLevels,
  corporationTier = 1,
  className = '',
}: Props) {
  if (def.gateOnly) {
    return (
      <p className={`text-[10px] font-mono text-slate-400 ${className}`} data-testid="research-gate-only">
        {GATE_ONLY_LABEL}
        {def.unlocks && def.unlocks.length > 0 ? ' · gates ' + def.unlocks.length + ' unlock' + (def.unlocks.length === 1 ? '' : 's') : ''}
      </p>
    );
  }

  const lines = getResearchContribution(def, completedResearch, repeatableResearchLevels, corporationTier);
  if (lines.length === 0) return null;

  const allZero = lines.every(l => l.delta <= 0);

  return (
    <div className={`text-[10px] font-mono leading-relaxed ${className}`} data-testid="research-contribution">
      {lines.map(l => {
        const dead = l.delta <= 0;
        return (
          <p key={l.bucket} className={dead ? 'text-amber-400/80' : 'text-cyan-300/80'}>
            {l.label}: {pct(l.current)} → {pct(l.after)}{' '}
            <span className={dead ? 'text-amber-400' : 'text-green-400/90'}>
              ({dead ? '+0.0%' : `+${pct(l.delta)}`})
            </span>
            {dead && <span className="text-slate-500"> · capped at {pct(l.cap)}</span>}
          </p>
        );
      })}
      {allZero && (
        <p className="text-amber-400 mt-0.5">
          Adds nothing at your current corporation tier — the cap rises +15% per tier.
        </p>
      )}
    </div>
  );
}
