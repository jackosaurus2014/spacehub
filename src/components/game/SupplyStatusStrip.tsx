'use client';

// ─── Supply Status Strip (Economic PvP Wave E3) ─────────────────────────────
// docs/ECONOMY_PVP_2026-08.md §2.2/§E3 — the command-center readout for the
// consumption engine: per-resource monthly recipe burn vs total stock (home +
// remote), sorted worst-coverage first, with shortfall states never conveyed
// by color alone (coverage number + "SHORT" text; colorblind-safe). Pure lens
// over GameState (deriveSupplySummary) — renders nothing when no completed
// building has a recipe, so pre-E3 saves and fresh games see no new chrome
// until the mechanic touches them. Mobile-first: wrapping chips, 28px+
// targets, horizontal scroll never required.

import { useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { deriveSupplySummary } from '@/lib/game/consumption';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
import { resourceCategoryIcon } from '@/lib/game/icons';
import GameIcon from './GameIcon';
import HoloTip, { Concept } from './HoloTip';

export default function SupplyStatusStrip({ state }: { state: GameState }) {
  const lines = useMemo(() => deriveSupplySummary(state), [state]);
  if (lines.length === 0) return null;

  const anyShort = lines.some(l => l.short);

  return (
    <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <HoloTip
          content={{
            title: 'Supply Lines',
            icon: 'package',
            body: (
              <p>
                Your buildings consume real inputs every game month per their{' '}
                <Concept id="building-recipe">recipes</Concept>. Coverage = months of stock at the
                current burn across all locations. Shortfalls brown facilities out toward the 50%{' '}
                <Concept id="supply-efficiency">efficiency</Concept> floor — cover them with your own
                production, freight, or a <Concept id="standing-order">standing market order</Concept>.
              </p>
            ),
            source: 'consumption.ts · monthly world-month grid',
          }}
        >
          <span className="game-label text-[10px] uppercase tracking-wider text-slate-400 inline-flex items-center gap-1.5">
            <GameIcon name="package" size={12} glow={anyShort ? 'amber' : 'cyan'} /> Supply lines
          </span>
        </HoloTip>
        {anyShort && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            SHORTFALL
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {lines.map(line => {
          const def = RESOURCE_MAP.get(line.resourceId as ResourceId);
          const cover = line.coverageMonths;
          const coverText = !Number.isFinite(cover) ? '∞' : cover >= 99 ? '99+' : cover.toFixed(cover < 10 ? 1 : 0);
          const tone = line.short || cover < 1
            ? 'text-red-300 border-red-500/25 bg-red-500/[0.06]'
            : cover < 3
              ? 'text-amber-300 border-amber-500/25 bg-amber-500/[0.06]'
              : 'text-slate-300 border-white/[0.08] bg-white/[0.02]';
          return (
            <span
              key={line.resourceId}
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-1 rounded border min-h-[28px] ${tone}`}
              title={`${def?.name || line.resourceId}: burn ${line.perMonth}/mo · stock ${line.stock} · ${coverText} months coverage${line.short ? ' · currently SHORT' : ''}`}
            >
              <GameIcon name={resourceCategoryIcon(def?.category || 'generic')} size={10} />
              <span>{def?.name || line.resourceId.replace(/_/g, ' ')}</span>
              <span className="game-number opacity-90">{coverText}mo</span>
              {line.short && <span className="font-bold">SHORT</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
