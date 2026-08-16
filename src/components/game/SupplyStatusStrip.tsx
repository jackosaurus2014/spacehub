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

import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { playSound } from '@/lib/game/sound-engine';
import { deriveSupplySummary } from '@/lib/game/consumption';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
import { resourceCategoryIcon } from '@/lib/game/icons';
import GameIcon from './GameIcon';
import HoloTip, { Concept } from './HoloTip';

// FTUE beat (simulated-newcomer audit 8/16): the FIRST time a shortfall ever
// appears, expand a one-time plain-language explainer under the strip — the
// chips + HoloTip alone assume the player already knows the consumption
// mechanic. Dismiss persists in localStorage (presentation-only).
const SUPPLY_INTRO_KEY = 'spacetycoon_supply_intro_seen';

function FirstShortfallExplainer({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  if (!visible) return null;
  return (
    <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-slate-300">
          <span className="font-bold text-amber-300">Your first supply shortfall. </span>
          Completed buildings consume real inputs every game month per their{' '}
          <Concept id="building-recipe">recipes</Concept> — a facility that can&rsquo;t draw them
          runs at reduced <Concept id="supply-efficiency">efficiency</Concept> (never below 50%),
          cutting its revenue until supply recovers. Three fixes: <strong>buy</strong> the input on
          the Market, <strong>produce</strong> it yourself (propellant plants, agri domes,
          refineries), or set the building to a{' '}
          <Concept id="standing-order">standing market order</Concept> from its card on the Build
          tab so it restocks itself automatically.
        </p>
        <button
          onClick={onDismiss}
          className="shrink-0 min-h-[36px] px-2 text-[10px] uppercase tracking-wider text-slate-500 hover:text-white transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function SupplyStatusStrip({ state }: { state: GameState }) {
  const lines = useMemo(() => deriveSupplySummary(state), [state]);

  const anyShort = lines.some(l => l.short);

  // One-time explainer trigger — armed only when a shortfall actually exists.
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    if (!anyShort) return;
    try {
      if (localStorage.getItem(SUPPLY_INTRO_KEY) !== 'true') setShowIntro(true);
    } catch {}
  }, [anyShort]);

  if (lines.length === 0) return null;

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
      <FirstShortfallExplainer
        visible={showIntro && anyShort}
        onDismiss={() => {
          playSound('click');
          try { localStorage.setItem(SUPPLY_INTRO_KEY, 'true'); } catch {}
          setShowIntro(false);
        }}
      />
    </div>
  );
}
