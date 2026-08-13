'use client';

// ─── Interstellar Gateway — Mission Control (Wave 10, Phase 2) ─────────────
// Planning + launch happen on the Galactic Map (GalacticMapView +
// MapContextPanel — "issue orders from the map"); this panel is where you
// manage everything already in flight: expedition history + hazard logs,
// colonies, and trade routes. Per CLAUDE.md's campaign-loop end-game.

import { useState } from 'react';
import Image from 'next/image';
import type { GameState, GameTab, ExpeditionState } from '@/lib/game/types';
import {
  INTERSTELLAR_SYSTEMS, INTERSTELLAR_SYSTEM_MAP, getJumpPrerequisites,
  FIRST_CONTACT_EVENTS, JUMP_DRIVE_RESEARCH, EXOTIC_MATTER_REFINING_RESEARCH,
} from '@/lib/game/interstellar';
import {
  getExpeditionProgress, getColonyUpgradeCost, getTotalGameMonths, GAME_MONTHS_PER_LY,
  COLONY_MAX_INFRASTRUCTURE, COLONY_FOUNDING_COST, COLONY_POP_CAP_PER_LEVEL,
  COLONY_UPGRADE_POP_THRESHOLD, COLONY_CAPABLE_SHIP_IDS, COLONY_OUTPUT_PER_LEVEL,
  TRADE_ROUTE_SETUP_COST, TRADE_MIN_SHIPMENT_UNITS,
} from '@/lib/game/expeditions';
import { FACTION_MAP, getFactionArtUrl, type FactionId } from '@/lib/game/factions';
import { formatMoney } from '@/lib/game/formulas';
import { PLANET_ASSETS } from '@/lib/game/assets';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { SHIP_MAP } from '@/lib/game/ships';
import { SYSTEM_RISK_META, RISK_TONE_CLASS } from './GalacticMapView';
import { useModalA11y } from './useModalA11y';

interface Props {
  state: GameState;
  onNavigateTab: (tab: GameTab) => void;
  onEstablishColony: (expeditionId: string, name?: string) => void;
  onUpgradeColony: (colonyId: string) => void;
  onEstablishTradeRoute: (colonyId: string, resourceId: string) => void;
  onSetTradeRouteStatus: (routeId: string, status: 'active' | 'suspended') => void;
}

/** Thematic biome art per destination system — narrative-matched to each system's
 *  description (habitable zones, frozen worlds, anomalies, dangerous binaries). */
const SYSTEM_ART: Record<string, string> = {
  proxima_centauri: PLANET_ASSETS.terrestrial,
  barnards_star: PLANET_ASSETS.ice,
  wolf_359: PLANET_ASSETS.anomaly,
  alpha_centauri: PLANET_ASSETS.terrestrial,
  sirius: PLANET_ASSETS.black_hole,
};

type SubTab = 'destinations' | 'expeditions' | 'colonies' | 'trade';

export default function InterstellarPanel({
  state, onNavigateTab, onEstablishColony, onUpgradeColony, onEstablishTradeRoute, onSetTradeRouteStatus,
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

  return (
    <div className="space-y-4">
      <div className="hud-frame hud-frame-purple relative rounded-2xl border border-indigo-500/20 overflow-hidden" style={{ background: '#0a0a1a' }}>
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="relative h-20 sm:h-24 overflow-hidden holo-sprite">
          <Image src={PLANET_ASSETS.nebula} alt="" fill className="object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/40 to-transparent" />
        </div>
        <div className="p-4 -mt-6 relative">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h2 className="font-hud text-white text-base font-bold flex items-center gap-2">
                <span className="text-indigo-400">✴</span> Interstellar Gateway — Mission Control
              </h2>
              <p className="text-slate-400 text-xs mt-0.5 max-w-2xl">
                Every active expedition, colony, and trade route beyond the heliopause. Planning and launch happen
                from the Galactic Map — select a system there to quote and launch a mission.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('map')}
              className="min-h-[44px] shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              🗺️ Open Galactic Map →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
            <PrereqChip
              label={`Exotic fuel reserve (have ${Math.floor(exoticFuel)})`}
              met={exoticFuel >= 500}
              help="Exotic-matter fuel units. Minimum 500 for the nearest system (Proxima)."
            />
          </div>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="game-tab-bar flex flex-wrap gap-1.5 overflow-x-auto">
        {([
          { id: 'expeditions' as SubTab, label: 'Expeditions', icon: '🌠', count: expeditions.length },
          { id: 'colonies' as SubTab, label: 'Colonies', icon: '🏙️', count: colonies.length },
          { id: 'trade' as SubTab, label: 'Trade Routes', icon: '🛰️', count: tradeRoutes.length },
          { id: 'destinations' as SubTab, label: 'Destinations', icon: '✴', count: INTERSTELLAR_SYSTEMS.length },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            aria-pressed={subTab === t.id}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === t.id
                ? 'game-tab-active bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {t.icon} {t.label} <span className="text-slate-500">({t.count})</span>
          </button>
        ))}
      </div>

      {subTab === 'expeditions' && (
        <ExpeditionsTab state={state} onNavigateTab={onNavigateTab} />
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
            const missing = getJumpPrerequisites(system.id, state.completedResearch);
            const fuelMissing = exoticFuel < system.jumpFuelRequired;
            const anyBlockers = missing.length > 0 || fuelMissing;
            const fc = FIRST_CONTACT_EVENTS[system.id];
            const faction = fc?.factionId ? FACTION_MAP.get(fc.factionId as FactionId) : null;
            const risk = SYSTEM_RISK_META[system.id] || { label: 'Unknown risk', glyph: '?', tone: 'moderate' as const };

            return (
              <div
                key={system.id}
                className={`hud-frame relative rounded-2xl border overflow-hidden transition-all ${
                  anyBlockers ? 'border-white/[0.06]' : 'hud-frame-purple border-indigo-500/40 shadow-lg shadow-indigo-500/20'
                }`}
                style={{ background: '#0a0a1a' }}
              >
                <span className="hud-corner-bl" aria-hidden="true" />
                <span className="hud-corner-br" aria-hidden="true" />
                <div className="relative h-16 overflow-hidden holo-sprite">
                  <Image
                    src={faction ? getFactionArtUrl(fc!.factionId as FactionId) : (SYSTEM_ART[system.id] || PLANET_ASSETS.nebula)}
                    alt=""
                    fill
                    className="object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                  {faction && (
                    <div className="absolute inset-x-0 bottom-0 p-2">
                      <div className={`text-[9px] uppercase tracking-wider ${faction.theme.accent}`}>First contact: {faction.name}</div>
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
                      <div className={`game-number font-bold ${fuelMissing ? 'text-red-300' : 'text-cyan-300'}`}>
                        {fuelMissing && <span aria-hidden="true">⚠ </span>}
                        {system.jumpFuelRequired.toLocaleString()}
                      </div>
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
                        {missing.map(r => <li key={r}>Research: {r.replace(/_/g, ' ')}</li>)}
                        {fuelMissing && <li>Exotic fuel: need {system.jumpFuelRequired} (have {Math.floor(exoticFuel)})</li>}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateTab('map')}
                      disabled={anyBlockers}
                      className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        anyBlockers ? 'bg-white/[0.04] text-slate-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }`}
                    >
                      🌠 Plan on Map
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
              </div>
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

function PrereqChip({ label, met, help }: { label: string; met: boolean; help: string }) {
  return (
    <div
      className={`rounded-lg p-2 border ${met ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}
      title={help}
    >
      <div className="flex items-center gap-1.5">
        <span className={met ? 'text-emerald-300' : 'text-slate-500'} aria-hidden="true">{met ? '✓' : '○'}</span>
        <span className={`text-[11px] font-medium ${met ? 'text-emerald-200' : 'text-slate-400'}`}>{label}</span>
      </div>
    </div>
  );
}

// ─── Expeditions tab ─────────────────────────────────────────────────────────

function ExpeditionsTab({ state, onNavigateTab }: { state: GameState; onNavigateTab: (tab: GameTab) => void }) {
  const expeditions = state.expeditions || [];
  const active = expeditions.filter(e => e.phase === 'outbound' || e.phase === 'exploring' || e.phase === 'returning');
  const history = expeditions
    .filter(e => e.phase === 'completed' || e.phase === 'lost' || e.phase === 'colonizing')
    .sort((a, b) => (b.completedAtMs || 0) - (a.completedAtMs || 0));

  if (expeditions.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <p className="text-4xl mb-3">🌠</p>
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
            {active.map(exp => <ActiveExpeditionCard key={exp.id} state={state} exp={exp} />)}
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

function ActiveExpeditionCard({ state, exp }: { state: GameState; exp: ExpeditionState }) {
  const progress = getExpeditionProgress(state, exp.id);
  const shipDef = SHIP_MAP.get(exp.shipDefinitionId);
  if (!progress) return null;

  return (
    <div className="hud-frame relative rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] p-3">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-white font-semibold text-sm flex items-center gap-1.5">
          <span aria-hidden="true">{shipDef?.icon || '🌠'}</span> {progress.systemName}
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
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${exp.insured ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5' : 'border-red-500/30 text-red-300 bg-red-500/5'}`}>
          {exp.insured ? '✓ Insured' : '⚠ Uninsured'}
        </span>
        {exp.extraShielding && <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-cyan-500/30 text-cyan-300 bg-cyan-500/5">✓ Hardened shielding</span>}
        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-white/10 text-slate-400">Hull {(exp.hullIntegrity * 100).toFixed(0)}%</span>
      </div>
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

  return (
    <div className="intel-dossier relative rounded-xl border border-white/[0.08] overflow-hidden">
      <span className={`dossier-stamp ${isLost ? '' : 'hidden'}`}>Lost</span>
      {faction && (
        <div className="relative h-16 overflow-hidden holo-sprite">
          <Image src={getFactionArtUrl(contactFactionId as FactionId)} alt="" fill className="object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-2">
            <div className={`text-[9px] uppercase tracking-wider font-bold ${faction.theme.accent}`}>First Contact: {faction.name}</div>
          </div>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true">{shipDef?.icon || '🌠'}</span>
            <span className="text-white font-semibold text-sm">{system?.name || exp.targetSystemId}</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-bold ${
            isLost ? 'text-red-300' : isColonizing ? 'text-purple-300' : 'text-emerald-300'
          }`}>
            {isLost ? '☄ Lost with all hands' : isColonizing ? '🏙 Colony founded' : '🏠 Returned'}
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
            {Object.entries(exp.outcome.resourceSamples).map(([id, qty]) => (
              <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300">
                {RESOURCE_MAP.get(id as ResourceId)?.icon} {qty} {RESOURCE_MAP.get(id as ResourceId)?.name || id}
              </span>
            ))}
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
        <p className="text-4xl mb-3">🏙️</p>
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

  return (
    <div className="hud-frame hud-frame-purple relative rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="text-purple-300 font-semibold text-sm mb-1">🛸 Colony Ark holding at {system?.name || exp.targetSystemId}</div>
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

  return (
    <div className="hud-frame relative rounded-xl border border-purple-500/20 bg-white/[0.02] p-4">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
        <div>
          <div className="text-white font-bold text-sm flex items-center gap-1.5">🏙️ {colony.name}</div>
          <div className="text-[10px] text-slate-500">{system?.name || colony.systemId} · founded month {colony.foundedGameMonth}</div>
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
                <span className="text-slate-300">{res?.icon} {res?.name || resId}</span>
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
          <div className="phase-track-node phase-track-node-current text-amber-300 font-semibold mb-1">
            🏗️ Expanding to Level {colony.upgradeInProgress.targetLevel}
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
        <p className="text-4xl mb-3">🛰️</p>
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
            <table className="holo-table w-full text-xs">
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
                        <span className="text-white">{res?.icon} {res?.name || route.resourceId}</span>
                        <div className="text-[10px] text-slate-500">{colony?.name || route.colonyId} · {route.transitMonths}mo transit · {route.cycleMonths}mo cycle</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                          route.status === 'active' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5' : 'border-amber-500/30 text-amber-300 bg-amber-500/5'
                        }`}>
                          {route.status === 'active' ? '● Active' : '⏸ Suspended'}
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
                        className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          canAfford ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-200 hover:bg-indigo-500/15' : 'border-white/[0.06] text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        {res?.icon} Route {res?.name || resId} — {formatMoney(TRADE_ROUTE_SETUP_COST)}
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
            <Image src={getFactionArtUrl(event.factionId as FactionId)} alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className={`text-[10px] uppercase tracking-wider font-bold ${faction.theme.accent}`}>First Contact: {faction.name}</div>
              <h3 id="fc-title" className="text-white text-2xl font-bold mt-1">{event.title}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{system.name} · {system.distanceLy.toFixed(2)} ly</p>
            </div>
          </div>
        )}

        <div className="p-5">
          {!faction && (
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
