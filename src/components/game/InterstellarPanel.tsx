'use client';

// ─── Interstellar Gateway — Mission Control (Wave 10, Phase 2) ─────────────
// Planning + launch happen on the Galactic Map (GalacticMapView +
// MapContextPanel — "issue orders from the map"); this panel is where you
// manage everything already in flight: expedition history + hazard logs,
// colonies, and trade routes. Per CLAUDE.md's campaign-loop end-game.

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { GameState, GameTab, ExpeditionState } from '@/lib/game/types';
import {
  INTERSTELLAR_SYSTEMS, INTERSTELLAR_SYSTEM_MAP,
  FIRST_CONTACT_EVENTS, JUMP_DRIVE_RESEARCH, EXOTIC_MATTER_REFINING_RESEARCH,
} from '@/lib/game/interstellar';
import {
  getExpeditionProgress, getExpeditionLaunchReadiness, getColonyUpgradeCost, getTotalGameMonths, GAME_MONTHS_PER_LY,
  COLONY_MAX_INFRASTRUCTURE, COLONY_FOUNDING_COST, COLONY_POP_CAP_PER_LEVEL,
  COLONY_UPGRADE_POP_THRESHOLD, COLONY_CAPABLE_SHIP_IDS, COLONY_OUTPUT_PER_LEVEL,
  TRADE_ROUTE_SETUP_COST, TRADE_MIN_SHIPMENT_UNITS,
} from '@/lib/game/expeditions';
import { FACTION_MAP, getFactionArtUrl, type FactionId } from '@/lib/game/factions';
// Row 12 (docs/GAME_DESIGN_REVIEW_2026-09.md §2): orders to another star
// system are transmitted, not executed — they cross at light speed (2
// game-months per light-year) and the tick applies them on arrival.
import { getInterstellarCommandProgress } from '@/lib/game/interstellar-commands';
import { formatMoney } from '@/lib/game/formulas';
import { PLANET_ASSETS, getRegionArt, getSystemVista, getArtVariant } from '@/lib/game/assets';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { SHIP_MAP } from '@/lib/game/ships';
import { SYSTEM_RISK_META, RISK_TONE_CLASS } from './GalacticMapView';
import { useModalA11y } from './useModalA11y';
import { ConsolePanel, HoloCard, DataChip } from './chrome';
import GameIcon from './GameIcon';
import { resolveIcon, resourceCategoryIcon, type IconName } from '@/lib/game/icons';

interface Props {
  state: GameState;
  onNavigateTab: (tab: GameTab) => void;
  onEstablishColony: (expeditionId: string, name?: string) => void;
  onUpgradeColony: (colonyId: string) => void;
  onEstablishTradeRoute: (colonyId: string, resourceId: string) => void;
  onSetTradeRouteStatus: (routeId: string, status: 'active' | 'suspended') => void;
  /** Row 12: abandon an order still crossing interstellar space. No refund —
   *  the fee bought a mission that has already left. */
  onCancelInterstellarCommand?: (commandId: string) => void;
  /** Row 12: order a surveying expedition home early. Transmitted like any
   *  other interstellar order, and the survey payout is prorated to the
   *  fraction actually completed — a trade, not a free win. */
  onRecallExpedition?: (expeditionId: string) => void;
}

/** Thematic biome art fallback per destination system — narrative-matched to each
 *  system's description (habitable zones, frozen worlds, anomalies, dangerous
 *  binaries). Used only when no Wave V6 system vista exists yet (getSystemVista). */
const SYSTEM_BIOME_FALLBACK: Record<string, string> = {
  proxima_centauri: PLANET_ASSETS.terrestrial,
  barnards_star: PLANET_ASSETS.ice,
  wolf_359: PLANET_ASSETS.anomaly,
  alpha_centauri: PLANET_ASSETS.terrestrial,
  sirius: PLANET_ASSETS.black_hole,
};

type SubTab = 'destinations' | 'expeditions' | 'colonies' | 'trade';

export default function InterstellarPanel({
  state, onNavigateTab, onEstablishColony, onUpgradeColony, onEstablishTradeRoute, onSetTradeRouteStatus,
  onCancelInterstellarCommand, onRecallExpedition,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>('expeditions');
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const hasJumpDrive = state.completedResearch.includes('jump_drive');
  const hasExoticRefining = state.completedResearch.includes('exotic_matter_refining');
  const exoticFuel = state.resources?.exotic_fuel || 0;

  const expeditions = state.expeditions || [];
  const colonies = state.interstellarColonies || [];
  const tradeRoutes = state.interstellarTradeRoutes || [];

  const selectedSystem = selectedSystemId ? INTERSTELLAR_SYSTEMS.find(s => s.id === selectedSystemId) : null;
  const firstContact = selectedSystemId ? FIRST_CONTACT_EVENTS[selectedSystemId] : null;

  const interstellarRegionVista = getRegionArt('interstellar');
  const interstellarRegionArt = interstellarRegionVista ? getArtVariant(interstellarRegionVista, 512) : undefined;

  return (
    <div className="space-y-4">
      <ConsolePanel
        title="Interstellar Gateway — Mission Control"
        icon="interstellar"
        subtitle="Every active expedition, colony, and trade route beyond the heliopause. Planning and launch happen from the Galactic Map — select a system there to quote and launch a mission."
        accent="purple"
        art={interstellarRegionArt}
        right={
          <button
            type="button"
            onClick={() => onNavigateTab('map')}
            className="min-h-[44px] shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5"
          >
            <GameIcon name="map" size={14} /> Open Galactic Map →
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <PrereqChip
            label="Jump Drive research"
            met={hasJumpDrive}
            help={`T${JUMP_DRIVE_RESEARCH.tier} propulsion; requires fusion_drive + metallic_hydrogen first.`}
          />
          <PrereqChip
            label="Exotic Matter Refining"
            met={hasExoticRefining}
            help={`T${EXOTIC_MATTER_REFINING_RESEARCH.tier} materials; unlocks exotic_fuel production.`}
          />
          {/* E3.1: exotic fuel is NOT a prerequisite — it has no Sol-side
              source, so presenting it as one made the whole pillar look
              unreachable. It is a procurement line item on the launch bill:
              the planner buys any shortfall at a 25% broker premium, and
              only an interstellar colony can refine it more cheaply. */}
          <PrereqChip
            label={`Exotic fuel in stores: ${Math.floor(exoticFuel).toLocaleString()}`}
            met
            help="Not a prerequisite. Any shortfall is procured on the open market at a 25% broker premium and billed with the launch — see each destination's fuel line. Only interstellar colonies refine it, which is what makes later jumps cheaper."
          />
        </div>

        {/* Sub-tab navigation */}
        <div className="game-tab-bar flex flex-wrap gap-1.5 overflow-x-auto" role="tablist" aria-label="Interstellar view">
          {([
            { id: 'expeditions' as SubTab, label: 'Expeditions', icon: 'comet' as IconName, count: expeditions.length },
            { id: 'colonies' as SubTab, label: 'Colonies', icon: 'city' as IconName, count: colonies.length },
            { id: 'trade' as SubTab, label: 'Trade Routes', icon: 'cargo-truck' as IconName, count: tradeRoutes.length },
            { id: 'destinations' as SubTab, label: 'Destinations', icon: 'interstellar' as IconName, count: INTERSTELLAR_SYSTEMS.length },
          ]).map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={subTab === t.id}
              onClick={() => setSubTab(t.id)}
              className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                subTab === t.id
                  ? 'game-tab-active bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              <GameIcon name={t.icon} size={13} /> {t.label} <span className="text-slate-500">({t.count})</span>
            </button>
          ))}
        </div>
      </ConsolePanel>

      {/* Row 12: everything currently crossing the gulf as a radio signal.
          Sits above the sub-tabs because it applies to all of them — a
          colony order, a trade-route order and a recall all queue here. */}
      <SignalQueue state={state} onCancel={onCancelInterstellarCommand} />

      {subTab === 'expeditions' && (
        <ExpeditionsTab state={state} onNavigateTab={onNavigateTab} onRecallExpedition={onRecallExpedition} />
      )}

      {subTab === 'colonies' && (
        <ColoniesTab
          state={state}
          onEstablishColony={onEstablishColony}
          onUpgradeColony={onUpgradeColony}
          onNavigateTab={onNavigateTab}
        />
      )}

      {subTab === 'trade' && (
        <TradeRoutesTab
          state={state}
          onEstablishTradeRoute={onEstablishTradeRoute}
          onSetTradeRouteStatus={onSetTradeRouteStatus}
          onNavigateTab={onNavigateTab}
        />
      )}

      {subTab === 'destinations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {INTERSTELLAR_SYSTEMS.map(system => {
            // E3.1: readiness comes from the planner (getExpeditionLaunchReadiness),
            // not from an exotic-fuel inventory test. Nothing in Sol produces
            // exotic_fuel; planExpedition procures the shortfall at a 1.25x
            // premium. The card now shows the procurement bill instead of a
            // requirement no player could ever meet.
            const readiness = getExpeditionLaunchReadiness(state, system.id);
            const anyBlockers = !readiness?.canLaunch;
            const fc = FIRST_CONTACT_EVENTS[system.id];
            const faction = fc?.factionId ? FACTION_MAP.get(fc.factionId as FactionId) : null;
            const risk = SYSTEM_RISK_META[system.id] || { label: 'Unknown risk', glyph: '?', tone: 'moderate' as const };
            const vista = getSystemVista(system.id);
            const thumbSrc = faction
              ? getFactionArtUrl(fc!.factionId as FactionId)
              : vista ? getArtVariant(vista, 512) : (SYSTEM_BIOME_FALLBACK[system.id] || PLANET_ASSETS.nebula);

            return (
              <HoloCard
                key={system.id}
                accent={anyBlockers ? 'cyan' : 'purple'}
                className={`rounded-2xl overflow-hidden transition-all ${anyBlockers ? '' : 'shadow-lg shadow-indigo-500/20'}`}
              >
                <div className="relative h-16 overflow-hidden holo-sprite">
                  <Image
                    src={thumbSrc}
                    alt=""
                    fill
                    loading="lazy"
                    className="object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                  {faction && (
                    <div className="absolute inset-x-0 bottom-0 p-2">
                      <div className={`text-[10px] uppercase tracking-wider ${faction.theme.accent}`}>First contact: {faction.name}</div>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-hud text-white text-base font-bold">{system.name}</h3>
                      <div className="text-[10px] text-slate-500">
                        {system.distanceLy.toFixed(2)} ly · ~{Math.ceil(system.distanceLy * GAME_MONTHS_PER_LY)} months outbound
                      </div>
                    </div>
                    <div className={`text-[10px] uppercase tracking-wider font-bold ${anyBlockers ? 'text-red-300' : 'text-emerald-300'}`}>
                      {anyBlockers ? 'LOCKED' : 'READY'}
                    </div>
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed mb-2">{system.description}</p>

                  <div className={`text-[10px] font-semibold flex items-center gap-1.5 mb-2 ${RISK_TONE_CLASS[risk.tone]}`}>
                    <span aria-hidden="true">{risk.glyph}</span> {risk.label}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2">
                    <div className="rounded bg-white/[0.03] p-1.5">
                      <div className="game-label">Fuel needed</div>
                      <div className="game-number font-bold flex items-center gap-1 text-cyan-300">
                        {system.jumpFuelRequired.toLocaleString()}
                      </div>
                      {readiness && readiness.fuelUnitsPurchased > 0 && (
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          {Math.ceil(readiness.fuelUnitsPurchased).toLocaleString()} to procure · {formatMoney(readiness.fuelPurchaseCost)}
                        </div>
                      )}
                    </div>
                    <div className="rounded bg-white/[0.03] p-1.5">
                      <div className="game-label">Known resources</div>
                      <div className="text-slate-300 truncate" title={system.knownResources.join(', ')}>
                        {system.knownResources.length} types
                      </div>
                    </div>
                  </div>

                  {anyBlockers && (
                    <div className="rounded bg-red-500/5 border border-red-500/20 p-2 text-[10px] text-red-200 mb-2">
                      <div className="font-bold mb-0.5">Blocked by:</div>
                      <ul className="pl-4 space-y-0.5" style={{ listStyle: 'disc' }}>
                        {(readiness?.blockers || ['Unknown destination system']).map(b => <li key={b}>{b}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateTab('map')}
                      disabled={anyBlockers}
                      className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        anyBlockers ? 'bg-white/[0.04] text-slate-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      <GameIcon name="comet" size={13} /> Plan on Map
                    </button>
                    {fc && (
                      <button
                        type="button"
                        onClick={() => setSelectedSystemId(system.id)}
                        className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium text-indigo-300/80 hover:text-indigo-200 border border-white/[0.06] hover:border-indigo-500/30 transition-colors"
                      >
                        Preview first contact
                      </button>
                    )}
                  </div>
                </div>
              </HoloCard>
            );
          })}
        </div>
      )}

      {selectedSystem && firstContact && (
        <FirstContactModal
          system={selectedSystem}
          event={firstContact}
          onClose={() => setSelectedSystemId(null)}
        />
      )}
    </div>
  );
}

/**
 * Row 12 (docs/GAME_DESIGN_REVIEW_2026-09.md §2) — orders in transit.
 *
 * Nothing you send beyond the heliopause happens now. The order crosses at
 * light speed (2 game-months per light-year: Proxima ~2 days, Sirius ~4) and
 * the engine tick applies it on arrival. The money left when the order did,
 * so cancelling refunds nothing — that asymmetry is the decision.
 *
 * Accessibility: progress is a real ARIA progressbar with the percentage and
 * ETA in text, and the bar has no animation of its own (only a motion-safe:
 * width transition), so reduced-motion users lose nothing but the slide.
 */
function SignalQueue({
  state, onCancel,
}: {
  state: GameState;
  onCancel?: (commandId: string) => void;
}) {
  // Refresh the ETA on a slow beat — signal lag is measured in hours, so a
  // 15-second tick is plenty and costs nothing.
  const [, setBeat] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBeat(n => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const pending = getInterstellarCommandProgress(state);
  if (pending.length === 0) return null;

  return (
    <ConsolePanel
      title="Orders in transit"
      icon="interstellar"
      subtitle="Commands sent to another star system travel at light speed — two game-months per light-year. They execute on arrival. Cancelling before then is allowed and refunds nothing."
      accent="cyan"
    >
      <ul className="space-y-2">
        {pending.map(p => {
          const pct = Math.round(p.progress * 100);
          return (
            <li key={p.command.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{p.command.label}</p>
                  <p className="text-[10px] text-slate-400">
                    {p.command.distanceLy.toFixed(2)} ly · {p.etaLabel} · {pct}% of the crossing
                    {p.command.feePaid > 0 && <> · {formatMoney(p.command.feePaid)} committed</>}
                  </p>
                </div>
                {onCancel && (
                  <button
                    type="button"
                    onClick={() => onCancel(p.command.id)}
                    className="shrink-0 min-h-[44px] px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-white/[0.12] text-slate-300 hover:text-white hover:border-white/[0.25] transition-colors"
                    title="Cancel this order. The fee is not refunded."
                  >
                    Cancel (no refund)
                  </button>
                )}
              </div>
              <div
                className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={`${p.command.label} — ${p.etaLabel}`}
              >
                <div
                  className="h-full rounded-full bg-cyan-400/70 motion-safe:transition-[width] motion-safe:duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </ConsolePanel>
  );
}

function PrereqChip({ label, met, help }: { label: string; met: boolean; help: string }) {
  return (
    <div
      className={`rounded-lg p-2 border ${met ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}
      title={help}
    >
      <div className="flex items-center gap-1.5">
        <span className={met ? 'text-emerald-300' : 'text-slate-500'}>
          <GameIcon name={met ? 'check' : 'lock'} size={12} />
        </span>
        <span className={`text-[11px] font-medium ${met ? 'text-emerald-200' : 'text-slate-400'}`}>{label}</span>
      </div>
    </div>
  );
}

// ─── Expeditions tab ─────────────────────────────────────────────────────────

function ExpeditionsTab({ state, onNavigateTab, onRecallExpedition }: {
  state: GameState;
  onNavigateTab: (tab: GameTab) => void;
  onRecallExpedition?: (expeditionId: string) => void;
}) {
  const expeditions = state.expeditions || [];
  const active = expeditions.filter(e => e.phase === 'outbound' || e.phase === 'exploring' || e.phase === 'returning');
  const history = expeditions
    .filter(e => e.phase === 'completed' || e.phase === 'lost' || e.phase === 'colonizing')
    .sort((a, b) => (b.completedAtMs || 0) - (a.completedAtMs || 0));

  if (expeditions.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <p className="mb-3 flex justify-center"><GameIcon name="comet" size={40} glow="purple" /></p>
        <p className="text-white font-semibold text-lg">No expeditions launched yet</p>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Build a Starfarer Explorer or Colony Ark (Fleet tab), then select a ready system on the Galactic Map to
          plan and launch your first jump.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <button type="button" onClick={() => onNavigateTab('fleet')} className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1]">Fleet / Shipyard →</button>
          <button type="button" onClick={() => onNavigateTab('map')} className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500">Galactic Map →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">In Flight</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {active.map(exp => <ActiveExpeditionCard key={exp.id} state={state} exp={exp} onRecallExpedition={onRecallExpedition} />)}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">History</div>
          <div className="space-y-3">
            {history.map(exp => <ExpeditionHistoryCard key={exp.id} state={state} exp={exp} onNavigateTab={onNavigateTab} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveExpeditionCard({ state, exp, onRecallExpedition }: {
  state: GameState;
  exp: ExpeditionState;
  onRecallExpedition?: (expeditionId: string) => void;
}) {
  const progress = getExpeditionProgress(state, exp.id);
  const shipDef = SHIP_MAP.get(exp.shipDefinitionId);
  if (!progress) return null;
  // Row 12: a recall is only meaningful for an explorer still on station —
  // colony arks hold station permanently and have no return leg. The order
  // itself takes a light-lag crossing to reach the ship.
  const canRecall = !!onRecallExpedition
    && exp.phase === 'exploring'
    && !(COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(exp.shipDefinitionId)
    && !(state.pendingInterstellarCommands || []).some(c => c.kind === 'recall_expedition' && c.expeditionId === exp.id);

  return (
    <div className="hud-frame relative rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] p-3">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-white font-semibold text-sm flex items-center gap-1.5">
          <GameIcon name={resolveIcon(shipDef?.icon, 'comet')} size={14} /> {progress.systemName}
        </span>
        <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-300">{progress.phaseLabel}</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/[0.06] mb-1.5">
        <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${Math.round(progress.progressPct * 100)}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{shipDef?.name || 'Expedition ship'} · {exp.crew} crew</span>
        <span className="font-mono">{Math.max(0, Math.round(progress.monthsRemaining))} months left</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <DataChip icon={exp.insured ? 'check' : 'warning'} tone={exp.insured ? 'good' : 'bad'}>
          {exp.insured ? 'Insured' : 'Uninsured'}
        </DataChip>
        {exp.extraShielding && <DataChip icon="check" tone="info">Hardened shielding</DataChip>}
        <DataChip tone="neutral">Hull {(exp.hullIntegrity * 100).toFixed(0)}%</DataChip>
      </div>
      {canRecall && (
        <button
          type="button"
          onClick={() => onRecallExpedition?.(exp.id)}
          className="mt-2 w-full min-h-[44px] px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-white/[0.12] text-slate-300 hover:text-white hover:border-white/[0.25] transition-colors"
          title="Cut the survey short and start the return leg. The order takes a light-lag crossing to arrive; survey data is paid pro rata for the months actually worked."
        >
          Recall — end survey early
        </button>
      )}
    </div>
  );
}

function ExpeditionHistoryCard({ state, exp, onNavigateTab }: { state: GameState; exp: ExpeditionState; onNavigateTab: (tab: GameTab) => void }) {
  const system = INTERSTELLAR_SYSTEM_MAP.get(exp.targetSystemId);
  const shipDef = SHIP_MAP.get(exp.shipDefinitionId);
  const contactFactionId = exp.outcome?.firstContactFactionId;
  const faction = contactFactionId ? FACTION_MAP.get(contactFactionId as FactionId) : null;
  const fcEvent = system ? FIRST_CONTACT_EVENTS[system.id] : null;
  const isLost = exp.phase === 'lost';
  const isColonizing = exp.phase === 'colonizing';
  const systemVista = !faction && system ? getSystemVista(system.id) : null;

  return (
    <div className="intel-dossier relative rounded-xl border border-white/[0.08] overflow-hidden">
      <span className={`dossier-stamp ${isLost ? '' : 'hidden'}`}>Lost</span>
      {faction && (
        <div className="relative h-16 overflow-hidden holo-sprite">
          <Image src={getFactionArtUrl(contactFactionId as FactionId)} alt="" fill loading="lazy" className="object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-2">
            <div className={`text-[10px] uppercase tracking-wider font-bold ${faction.theme.accent}`}>First Contact: {faction.name}</div>
          </div>
        </div>
      )}
      {!faction && systemVista && (
        <div className="relative h-16 overflow-hidden holo-sprite">
          <Image src={getArtVariant(systemVista, 512)} alt="" fill loading="lazy" className="object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <GameIcon name={resolveIcon(shipDef?.icon, 'comet')} size={14} />
            <span className="text-white font-semibold text-sm">{system?.name || exp.targetSystemId}</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 ${
            isLost ? 'text-red-300' : isColonizing ? 'text-purple-300' : 'text-emerald-300'
          }`}>
            <GameIcon name={isLost ? 'hazard-micrometeorite' : isColonizing ? 'city' : 'check'} size={12} />
            {isLost ? 'Lost with all hands' : isColonizing ? 'Colony founded' : 'Returned'}
          </span>
        </div>

        {faction && fcEvent && (
          <p className="text-slate-300 text-[11px] leading-relaxed mb-2 italic">
            &ldquo;{fcEvent.description}&rdquo;
          </p>
        )}

        {exp.outcome && !isLost && (
          <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2">
            <div className="rounded bg-white/[0.03] p-1.5">
              <div className="game-label">Survey data sold</div>
              <div className="text-emerald-300 font-mono font-bold">{formatMoney(exp.outcome.surveyDataPayout)}</div>
            </div>
            <div className="rounded bg-white/[0.03] p-1.5">
              <div className="game-label">Colony suitability</div>
              <div className="text-white font-mono">{(exp.outcome.colonySuitability * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {exp.outcome && Object.keys(exp.outcome.resourceSamples).length > 0 && !isLost && (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(exp.outcome.resourceSamples).map(([id, qty]) => {
              const res = RESOURCE_MAP.get(id as ResourceId);
              return (
                <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 inline-flex items-center gap-1">
                  <GameIcon name={res ? resourceCategoryIcon(res.category) : 'resource-generic'} size={11} />
                  {qty} {res?.name || id}
                </span>
              );
            })}
          </div>
        )}

        {isColonizing && (
          <button
            type="button"
            onClick={() => onNavigateTab('interstellar')}
            className="text-[10px] text-purple-300 hover:text-purple-200 underline"
          >
            View colony →
          </button>
        )}

        {exp.hazardLog.length > 0 && (
          <details className="mt-1">
            <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">
              Hazard log ({exp.hazardLog.length} event{exp.hazardLog.length === 1 ? '' : 's'})
            </summary>
            <ul className="mt-1 space-y-0.5 pl-3 text-[10px] text-slate-400" style={{ listStyle: 'disc' }}>
              {exp.hazardLog.map((h, i) => (
                <li key={i}>Month {h.monthIndex}: {h.summary}</li>
              ))}
            </ul>
          </details>
        )}

        {isLost && (
          <p className="text-[10px] text-red-300/80">
            {exp.crew} crew lost. {exp.insured ? `Insurance paid ${formatMoney(Math.round(exp.totalCost * 0.70))}.` : 'No insurance coverage — total loss.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Colonies tab ────────────────────────────────────────────────────────────

function ColoniesTab({
  state, onEstablishColony, onUpgradeColony, onNavigateTab,
}: {
  state: GameState;
  onEstablishColony: (expeditionId: string, name?: string) => void;
  onUpgradeColony: (colonyId: string) => void;
  onNavigateTab: (tab: GameTab) => void;
}) {
  const colonies = state.interstellarColonies || [];
  const colonizedSystems = new Set(colonies.map(c => c.systemId));
  const holdingArks = (state.expeditions || []).filter(
    e => e.phase === 'exploring'
      && (COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(e.shipDefinitionId)
      && !colonizedSystems.has(e.targetSystemId),
  );

  if (colonies.length === 0 && holdingArks.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <p className="mb-3 flex justify-center"><GameIcon name="city" size={40} glow="purple" /></p>
        <p className="text-white font-semibold text-lg">No colonies yet</p>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Launch a Colony Ark to a system with the <span className="text-white">interstellar_colonization</span> research
          complete. Once it arrives and finishes surveying, you can found a permanent colony.
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <button type="button" onClick={() => onNavigateTab('research')} className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1]">Research →</button>
          <button type="button" onClick={() => onNavigateTab('fleet')} className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1]">Build Colony Ark →</button>
          <button type="button" onClick={() => onNavigateTab('map')} className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500">Galactic Map →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {holdingArks.map(exp => <EstablishColonyCard key={exp.id} state={state} exp={exp} onEstablishColony={onEstablishColony} />)}
      {colonies.map(colony => (
        <ColonyCard key={colony.id} state={state} colony={colony} onUpgradeColony={onUpgradeColony} />
      ))}
    </div>
  );
}

function EstablishColonyCard({
  state, exp, onEstablishColony,
}: {
  state: GameState;
  exp: ExpeditionState;
  onEstablishColony: (expeditionId: string, name?: string) => void;
}) {
  const system = INTERSTELLAR_SYSTEM_MAP.get(exp.targetSystemId);
  const [name, setName] = useState(system ? `${system.name} Colony` : '');
  const canAfford = state.money >= COLONY_FOUNDING_COST;
  const vista = system ? getSystemVista(system.id) : null;

  return (
    <div className="hud-frame hud-frame-purple relative rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
        {vista && (
          <span className="sprite-frame w-8 h-8 shrink-0 overflow-hidden rounded">
            <Image src={getArtVariant(vista, 128)} alt="" width={32} height={32} loading="lazy" className="w-8 h-8 object-cover" />
          </span>
        )}
        <GameIcon name="fleet" size={14} /> Colony Ark holding at {system?.name || exp.targetSystemId}
      </div>
      <p className="text-slate-400 text-[11px] mb-3">
        Suitability {((exp.outcome?.colonySuitability ?? 0.6) * 100).toFixed(0)}%. Founding costs {formatMoney(COLONY_FOUNDING_COST)}
        and permanently commits the ark and its {exp.crew} crew — they become the colony's founding cadre and will not return.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Colony name"
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-white/[0.08] text-white text-sm focus:border-purple-500/50 focus:outline-none min-h-[44px]"
        />
        <button
          type="button"
          disabled={!canAfford}
          onClick={() => onEstablishColony(exp.id, name.trim() || undefined)}
          className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            canAfford ? 'bg-purple-600 text-white hover:bg-purple-500' : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
          }`}
        >
          {canAfford ? 'Establish Colony' : `Need ${formatMoney(COLONY_FOUNDING_COST)}`}
        </button>
      </div>
    </div>
  );
}

function ColonyCard({
  state, colony, onUpgradeColony,
}: {
  state: GameState;
  colony: NonNullable<GameState['interstellarColonies']>[number];
  onUpgradeColony: (colonyId: string) => void;
}) {
  const system = INTERSTELLAR_SYSTEM_MAP.get(colony.systemId);
  const popCap = colony.infrastructureLevel * COLONY_POP_CAP_PER_LEVEL;
  const popPct = Math.min(100, (colony.population / popCap) * 100);
  const atMaxLevel = colony.infrastructureLevel >= COLONY_MAX_INFRASTRUCTURE;
  const upgradeCost = atMaxLevel ? null : getColonyUpgradeCost(colony.infrastructureLevel);
  const popThreshold = popCap * COLONY_UPGRADE_POP_THRESHOLD;
  const popReady = colony.population >= popThreshold;
  const canAffordUpgrade = upgradeCost !== null && state.money >= upgradeCost;
  const vista = system ? getSystemVista(system.id) : null;

  return (
    <div className="hud-frame relative rounded-xl border border-purple-500/20 bg-white/[0.02] p-4">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          {vista && (
            <span className="sprite-frame w-8 h-8 shrink-0 overflow-hidden rounded">
              <Image src={getArtVariant(vista, 128)} alt="" width={32} height={32} loading="lazy" className="w-8 h-8 object-cover" />
            </span>
          )}
          <div>
            <div className="text-white font-bold text-sm flex items-center gap-1.5"><GameIcon name="city" size={14} /> {colony.name}</div>
            <div className="text-[10px] text-slate-500">{system?.name || colony.systemId} · founded month {colony.foundedGameMonth}</div>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold">
          Infrastructure L{colony.infrastructureLevel}/{COLONY_MAX_INFRASTRUCTURE}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] mb-3">
        <div className="rounded bg-white/[0.03] p-2">
          <div className="game-label">Population</div>
          <div className="text-white font-mono">{Math.floor(colony.population).toLocaleString()}</div>
        </div>
        <div className="rounded bg-white/[0.03] p-2">
          <div className="game-label">Pop. cap</div>
          <div className="text-white font-mono">{popCap.toLocaleString()}</div>
        </div>
        <div className="rounded bg-white/[0.03] p-2">
          <div className="game-label">Suitability</div>
          <div className="text-white font-mono">{(colony.suitability * 100).toFixed(0)}%</div>
        </div>
        <div className="rounded bg-white/[0.03] p-2">
          <div className="game-label">Stockpile lots</div>
          <div className="text-white font-mono">{Object.keys(colony.stockpile).length}</div>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/[0.06] mb-3">
        <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${popPct}%` }} />
      </div>

      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Local Production &amp; Stockpile</div>
        <div className="space-y-1">
          {colony.localResources.map(resId => {
            const base = COLONY_OUTPUT_PER_LEVEL[resId] || 0;
            const estMonthly = Math.round(base * colony.infrastructureLevel * colony.suitability * 10) / 10;
            const stock = colony.stockpile[resId] || 0;
            const res = RESOURCE_MAP.get(resId as ResourceId);
            return (
              <div key={resId} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-white/[0.02]">
                <span className="text-slate-300 inline-flex items-center gap-1">
                  <GameIcon name={res ? resourceCategoryIcon(res.category) : 'resource-generic'} size={12} /> {res?.name || resId}
                </span>
                <span className="text-slate-400 font-mono">
                  ~{estMonthly}/mo · stock <span className="text-white">{Math.floor(stock).toLocaleString()}</span>
                </span>
              </div>
            );
          })}
          {colony.localResources.length === 0 && <p className="text-slate-600 text-[10px]">No producible resources identified at this site.</p>}
        </div>
      </div>

      {colony.upgradeInProgress ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 text-[11px]">
          <div className="phase-track-node phase-track-node-current text-amber-300 font-semibold mb-1 flex items-center gap-1.5">
            <GameIcon name="build" size={13} /> Expanding to Level {colony.upgradeInProgress.targetLevel}
          </div>
          <p className="text-slate-400 text-[10px]">Completes at game-month {colony.upgradeInProgress.completesAtGameMonth}.</p>
        </div>
      ) : atMaxLevel ? (
        <p className="text-[10px] text-purple-300 font-medium">Maximum infrastructure level reached.</p>
      ) : (
        <button
          type="button"
          disabled={!popReady || !canAffordUpgrade}
          onClick={() => onUpgradeColony(colony.id)}
          title={!popReady ? `Needs ${Math.ceil(popThreshold)} colonists (has ${Math.floor(colony.population)})` : undefined}
          className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            popReady && canAffordUpgrade ? 'bg-purple-600 text-white hover:bg-purple-500' : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
          }`}
        >
          {!popReady
            ? `Needs ${Math.ceil(popThreshold)} colonists to expand`
            : `Upgrade to L${colony.infrastructureLevel + 1} — ${formatMoney(upgradeCost || 0)}`}
        </button>
      )}
    </div>
  );
}

// ─── Trade routes tab ────────────────────────────────────────────────────────

function TradeRoutesTab({
  state, onEstablishTradeRoute, onSetTradeRouteStatus, onNavigateTab,
}: {
  state: GameState;
  onEstablishTradeRoute: (colonyId: string, resourceId: string) => void;
  onSetTradeRouteStatus: (routeId: string, status: 'active' | 'suspended') => void;
  onNavigateTab: (tab: GameTab) => void;
}) {
  const colonies = state.interstellarColonies || [];
  const routes = state.interstellarTradeRoutes || [];

  if (colonies.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <p className="mb-3 flex justify-center"><GameIcon name="cargo-truck" size={40} glow="purple" /></p>
        <p className="text-white font-semibold text-lg">No colonies to route from</p>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Trade routes ship a colony's local production back to Sol on a recurring schedule. Found a colony first.
        </p>
        <button type="button" onClick={() => onNavigateTab('interstellar')} className="mt-4 min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500">
          View Colonies →
        </button>
      </div>
    );
  }

  const routedPairs = new Set(routes.map(r => `${r.colonyId}:${r.resourceId}`));

  return (
    <div className="space-y-4">
      {routes.length > 0 && (
        <div className="hud-frame relative rounded-xl border border-white/[0.06] overflow-hidden">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="overflow-x-auto">
            <table className="holo-table mat-table w-full text-xs">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="text-left text-slate-500 font-medium py-2 px-3">Route</th>
                  <th className="text-left text-slate-500 font-medium py-2 px-3">Status</th>
                  <th className="text-right text-slate-500 font-medium py-2 px-3">Logistics fee</th>
                  <th className="text-right text-slate-500 font-medium py-2 px-3 hidden sm:table-cell">Delivered total</th>
                  <th className="text-right text-slate-500 font-medium py-2 px-3">Next departure</th>
                  <th className="text-right text-slate-500 font-medium py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(route => {
                  const colony = colonies.find(c => c.id === route.colonyId);
                  const res = RESOURCE_MAP.get(route.resourceId as ResourceId);
                  const monthsToNext = Math.max(0, route.nextDepartureGameMonth - getTotalGameMonths(state.gameDate));
                  const nextShipmentQty = colony ? Math.floor(colony.stockpile[route.resourceId] || 0) : 0;
                  return (
                    <tr key={route.id} className="holo-row border-t border-white/[0.04]">
                      <td className="py-2 px-3">
                        <span className="text-white inline-flex items-center gap-1">
                          <GameIcon name={res ? resourceCategoryIcon(res.category) : 'resource-generic'} size={12} /> {res?.name || route.resourceId}
                        </span>
                        <div className="text-[10px] text-slate-500">{colony?.name || route.colonyId} · {route.transitMonths}mo transit · {route.cycleMonths}mo cycle</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          route.status === 'active' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5' : 'border-amber-500/30 text-amber-300 bg-amber-500/5'
                        }`}>
                          <GameIcon name={route.status === 'active' ? 'check' : 'idle'} size={10} /> {route.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300">{formatMoney(route.logisticsFeePerShipment)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-300 hidden sm:table-cell">{Math.floor(route.totalDelivered).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">
                        {route.status === 'active' ? `${monthsToNext}mo (${nextShipmentQty} on hand${nextShipmentQty < TRADE_MIN_SHIPMENT_UNITS ? ' — below min' : ''})` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSetTradeRouteStatus(route.id, route.status === 'active' ? 'suspended' : 'active')}
                          className="min-h-[36px] px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1] transition-colors"
                        >
                          {route.status === 'active' ? 'Suspend' : 'Resume'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Establish a New Route</div>
        <div className="space-y-2">
          {colonies.map(colony => {
            const available = colony.localResources.filter(r => !routedPairs.has(`${colony.id}:${r}`));
            if (available.length === 0) return null;
            return (
              <div key={colony.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-white text-xs font-semibold mb-2">{colony.name}</div>
                <div className="flex flex-wrap gap-2">
                  {available.map(resId => {
                    const res = RESOURCE_MAP.get(resId as ResourceId);
                    const canAfford = state.money >= TRADE_ROUTE_SETUP_COST;
                    return (
                      <button
                        key={resId}
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onEstablishTradeRoute(colony.id, resId)}
                        className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                          canAfford ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-200 hover:bg-indigo-500/15' : 'border-white/[0.06] text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <GameIcon name={res ? resourceCategoryIcon(res.category) : 'resource-generic'} size={12} /> Route {res?.name || resId} — {formatMoney(TRADE_ROUTE_SETUP_COST)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {colonies.every(c => c.localResources.filter(r => !routedPairs.has(`${c.id}:${r}`)).length === 0) && (
            <p className="text-slate-600 text-xs">Every producible resource across your colonies already has a route.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── First contact preview modal (pre-launch narrative flavor) ─────────────

function FirstContactModal({
  system, event, onClose,
}: {
  system: typeof INTERSTELLAR_SYSTEMS[number];
  event: typeof FIRST_CONTACT_EVENTS[string];
  onClose: () => void;
}) {
  const modalRef = useModalA11y<HTMLDivElement>(onClose);
  const faction = event.factionId ? FACTION_MAP.get(event.factionId as FactionId) : null;
  const vista = !faction ? getSystemVista(system.id) : null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fc-title"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md game-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl overflow-hidden border border-indigo-500/40 game-modal-card"
        style={{ background: '#0a0a1a' }}
      >
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" aria-hidden="true" />

        {faction && (
          <div className="relative aspect-[3/1] overflow-hidden">
            <Image src={getFactionArtUrl(event.factionId as FactionId)} alt="" fill loading="lazy" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className={`text-[10px] uppercase tracking-wider font-bold ${faction.theme.accent}`}>First Contact: {faction.name}</div>
              <h3 id="fc-title" className="text-white text-2xl font-bold mt-1">{event.title}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{system.name} · {system.distanceLy.toFixed(2)} ly</p>
            </div>
          </div>
        )}

        {!faction && vista && (
          <div className="relative aspect-[3/1] overflow-hidden">
            <Image src={getArtVariant(vista, 512)} alt="" fill loading="lazy" className="object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 id="fc-title" className="text-white text-2xl font-bold">{event.title}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{system.name} · {system.distanceLy.toFixed(2)} ly</p>
            </div>
          </div>
        )}

        <div className="p-5">
          {!faction && !vista && (
            <div className="mb-3">
              <h3 id="fc-title" className="text-white text-2xl font-bold">{event.title}</h3>
              <p className="text-slate-400 text-xs">{system.name} · {system.distanceLy.toFixed(2)} ly</p>
            </div>
          )}

          <p className="text-slate-300 text-sm leading-relaxed mb-4">{event.description}</p>

          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Narrative flavor</div>
          <div className="space-y-2">
            {event.choices.map((choice, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="text-white text-sm font-bold mb-0.5">{choice.label}</div>
                <div className="text-[11px] text-slate-400 leading-relaxed">{choice.summary}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-[10px] text-slate-500 italic text-center">
            The actual first-contact outcome is resolved automatically on arrival — check the Expeditions tab's
            history for the report your commander files.
          </div>

          <button
            onClick={onClose}
            className="mt-3 w-full min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            Close briefing
          </button>
        </div>
      </div>
    </div>
  );
}
