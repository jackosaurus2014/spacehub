'use client';

// ─── The Bridge stage (CC-1 / CC-2) ─────────────────────────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §1 — the Command hub's Dashboard
// is the Bridge: this component is the window band at the top of the stage
// (BridgeWindow drawing the headquarters' stage from its manifest, driven
// by useBridgeEvents), plus the "HQ · Earth Operations Center" chip whose
// HoloTip explains the relocation ladder. The Dashboard's cards dock
// beneath it as consoles (space-tycoon/page.tsx, `.hq-console-dock`).
// Heights: GameStyles.tsx `.hq-stage` — normal, taller in bridge mode (F),
// a 96 px banner on phones.
//
// CC-2: the chip's HoloTip is the live ladder — per stage the tier and
// station requirement met / unmet from client state, the relocation cost
// and time, the seat count, and the project in flight. A reachable stage
// whose window plates have not landed draws the Earth plate with an
// "Mars Orbital HQ — window plates coming" overlay (hq-manifest.ts
// resolveHqManifest) rather than a blank band.
//
// CC-3: a stage whose plates are published AFTER this build (the outer
// rungs, still rendering) is picked up at runtime — the effect below asks
// once for /game/hq/<stage>/manifest.json and redraws if it is there. So
// the fallback label is only ever shown for a stage that genuinely has no
// art yet, and it clears itself the moment the art deploys.

import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { getHeadquarters, getHqStage, HQ_SEAT_COUNTS, hqSeatLabel, type HqStageId } from '@/lib/game/headquarters';
import {
  getRuntimeHqManifest, hasTriedRuntimeHqManifest, loadHqManifestAtRuntime, resolveHqManifest,
  type HqManifest,
} from '@/lib/game/hq-manifest';
import { buildHqLadder, hqProjectProgress, hqRequirementLines } from '@/lib/game/hq-relocation';
import { useBridgeEvents } from '@/lib/game/bridge-events';
import { usePrefersReducedMotion } from '@/hooks/useWorldState';
import { checkCorporationTier, getTierDef } from '@/lib/game/corporation-tiers';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';
import BridgeWindow, { localHour, pickVariant } from '@/components/game/BridgeWindow';
import HoloTip, { type HoloTipContent } from '@/components/game/HoloTip';
import GameIcon from '@/components/game/GameIcon';

const VARIANT_WORDS: Record<string, string> = {
  day: 'in daylight', dusk: 'at dusk', night: 'at night', sunrise: 'at sunrise',
};

export default function BridgeStage({ state }: { state: GameState }) {
  const hq = getHeadquarters(state);
  const stage = getHqStage(hq.stage as HqStageId);
  // CC-3: plates published after this build are fetched once per stage.
  const [runtimeManifest, setRuntimeManifest] = useState<HqManifest | null>(() => getRuntimeHqManifest(stage.id));
  useEffect(() => {
    let alive = true;
    const known = getRuntimeHqManifest(stage.id);
    setRuntimeManifest(known);
    if (known || hasTriedRuntimeHqManifest(stage.id)) return;
    void loadHqManifestAtRuntime(stage.id).then(m => { if (alive && m) setRuntimeManifest(m); });
    return () => { alive = false; };
  }, [stage.id]);
  const resolved = resolveHqManifest(stage.id, runtimeManifest);
  const events = useBridgeEvents(state);
  const reducedMotion = usePrefersReducedMotion();
  const tier = checkCorporationTier(state);
  const seat = hqSeatLabel(stage.id, hq.seatIndex);
  const project = hq.project;
  const projectTarget = project ? getHqStage(project.targetStage as HqStageId) : null;
  const projectEta = project ? formatCountdown(hqProjectProgress(project, Date.now()).etaSeconds) : null;

  const chipTip = useMemo<HoloTipContent>(() => {
    const ladder = buildHqLadder(state);
    return {
      title: 'Headquarters',
      icon: 'dashboard',
      body: (
        <span>
          Your corporation is seated at the <strong>{stage.label}</strong>{seat ? <> ({seat})</> : null}. {stage.lore}{' '}
          {projectTarget
            ? <>A relocation to the <strong>{projectTarget.label}</strong> is under way — {projectEta} to go.</>
            : <>Relocation is a campaign-loop decision: money, a station at the destination, a finite seat, and weeks of real time. Open the <strong>Headquarters</strong> console on the Bridge to move.</>}
        </span>
      ),
      rows: ladder.map(row => {
        const s = row.stage;
        const t = getTierDef(s.tier);
        const seats = HQ_SEAT_COUNTS[s.id];
        let value: string;
        if (row.current) value = 'current seat';
        else if (row.inbound) value = `relocating · ${projectEta} to go`;
        else if (s.comingSoon) value = `Tier ${s.tier} ${t.name} · coming soon`;
        else {
          // CC-3: every named gate on the row, not just the station — the
          // outer rungs add a research and a hull gate.
          const needs: string[] = hqRequirementLines(row.check).map(line =>
            line.label.startsWith('tier ') && !line.met
              ? `${line.label} ✗ (you are ${row.check.tier.have})`
              : `${line.label} ${line.met ? '✓' : '✗'}`);
          if (seats > 0) needs.push(row.check.seatAuctioned ? `${seats} seats, at auction` : `${seats} seats`);
          if (row.quote) needs.push(`${formatMoney(row.quote.cost)} · ${row.quote.months} mo${row.quote.isReturn ? ' (return)' : ''}`);
          value = needs.join(' · ');
        }
        return { label: `${s.label}${row.current ? ' (current)' : ''}`, value };
      }),
      source: `Corporation tier ${tier} ${getTierDef(tier).name} · headquarters.ts ladder · ✓ met, ✗ unmet`,
    };
  }, [state, stage, tier, seat, projectTarget, projectEta]);

  if (!resolved) return null;
  const { manifest, fallback } = resolved;

  const variantForCopy = pickVariant(Object.keys(manifest.variants), localHour(Date.now(), stage.clockOffsetHours));
  const description = `Headquarters window: ${stage.label} ${VARIANT_WORDS[variantForCopy ?? ''] ?? ''}. `
    + (fallback ? `Window plates for this stage are still being rendered; the Earth plate stands in. ` : '')
    + (events.weatherActive ? 'Weather over the complex. ' : '')
    + (events.vehicleOnPad ? 'A vehicle stands on the launch pad.' : 'The launch pad is clear.');

  return (
    <div className="hq-stage" data-testid="bridge-stage" data-hq-stage={stage.id} data-hq-fallback={fallback ? 'true' : 'false'}>
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
              <span className="hidden sm:inline">{stage.label}{seat ? <span className="text-cyan-400/70"> · {seat}</span> : null}</span>
              <span className="sm:hidden">{stage.shortLabel}</span>
              {projectTarget && (
                <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200" title={`Relocating to the ${projectTarget.label}`}>
                  <span aria-hidden="true">→</span> {projectTarget.shortLabel} · {projectEta}
                </span>
              )}
            </span>
          </HoloTip>
        </div>
        {fallback && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center" aria-hidden="true">
            <span className="rounded-full border border-cyan-400/20 bg-black/60 px-3 py-1 font-hud text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 backdrop-blur-sm">
              {stage.label} — window plates coming
            </span>
          </div>
        )}
      </BridgeWindow>
    </div>
  );
}
