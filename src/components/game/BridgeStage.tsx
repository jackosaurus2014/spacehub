'use client';

// ─── The Bridge stage (CC-1) ─────────────────────────────────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §1 — the Command hub's Dashboard
// is the Bridge: this component is the window band at the top of the stage
// (BridgeWindow drawing the headquarters' stage from its manifest, driven
// by useBridgeEvents), plus the "HQ · Earth Operations Center" chip whose
// HoloTip explains the relocation ladder. The Dashboard's cards dock
// beneath it as consoles (space-tycoon/page.tsx, `.hq-console-dock`).
// Heights: GameStyles.tsx `.hq-stage` — normal, taller in bridge mode (F),
// a 96 px banner on phones.

import { useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { getHeadquarters, getHqStage, HQ_STAGES, type HqStageId } from '@/lib/game/headquarters';
import { getHqManifest } from '@/lib/game/hq-manifest';
import { useBridgeEvents } from '@/lib/game/bridge-events';
import { usePrefersReducedMotion } from '@/hooks/useWorldState';
import { checkCorporationTier, getTierDef } from '@/lib/game/corporation-tiers';
import BridgeWindow, { localHour, pickVariant } from '@/components/game/BridgeWindow';
import HoloTip, { type HoloTipContent } from '@/components/game/HoloTip';
import GameIcon from '@/components/game/GameIcon';

const VARIANT_WORDS: Record<string, string> = {
  day: 'in daylight', dusk: 'at dusk', night: 'at night', sunrise: 'at sunrise',
};

export default function BridgeStage({ state }: { state: GameState }) {
  const hq = getHeadquarters(state);
  const stage = getHqStage(hq.stage as HqStageId);
  const manifest = getHqManifest(stage.id);
  const events = useBridgeEvents(state);
  const reducedMotion = usePrefersReducedMotion();
  const tier = checkCorporationTier(state);

  const chipTip = useMemo<HoloTipContent>(() => ({
    title: 'Headquarters',
    icon: 'dashboard',
    body: (
      <span>
        Your corporation is seated at the <strong>{stage.label}</strong>. {stage.lore} As the corporation
        climbs the tiers the headquarters can move outward — the window on the Bridge is the view from
        wherever it sits. Relocation arrives in a later update.
      </span>
    ),
    rows: HQ_STAGES.map(s => {
      const t = getTierDef(s.tier);
      const here = s.id === stage.id;
      return {
        label: `${s.label}${here ? ' (current)' : ''}`,
        value: s.comingSoon ? `Tier ${s.tier} ${t.name} · coming soon` : `Tier ${s.tier} ${t.name}`,
      };
    }),
    source: `Corporation tier ${tier} ${getTierDef(tier).name} · headquarters.ts ladder`,
  }), [stage, tier]);

  if (!manifest) return null;

  const variantForCopy = pickVariant(Object.keys(manifest.variants), localHour(Date.now(), stage.clockOffsetHours));
  const description = `Headquarters window: ${stage.label} ${VARIANT_WORDS[variantForCopy ?? ''] ?? ''}. `
    + (events.weatherActive ? 'Weather over the complex. ' : '')
    + (events.vehicleOnPad ? 'A vehicle stands on the launch pad.' : 'The launch pad is clear.');

  return (
    <div className="hq-stage" data-testid="bridge-stage">
      <BridgeWindow
        manifest={manifest}
        clockOffsetHours={stage.clockOffsetHours}
        firedAt={events.firedAt}
        weatherActive={events.weatherActive}
        vehicleOnPad={events.vehicleOnPad}
        reducedMotion={reducedMotion}
        description={description}
      >
        <div className="hq-chip">
          <HoloTip content={chipTip} underline={false} as="div">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-black/55 backdrop-blur-sm px-2.5 py-1 font-hud text-[11px] font-semibold tracking-wide text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.18)]">
              <GameIcon name="dashboard" size={12} />
              <span className="uppercase text-[10px] text-cyan-400/80">HQ</span>
              <span aria-hidden="true" className="text-cyan-400/50">·</span>
              <span className="hidden sm:inline">{stage.label}</span>
              <span className="sm:hidden">{stage.shortLabel}</span>
            </span>
          </HoloTip>
        </div>
      </BridgeWindow>
    </div>
  );
}
