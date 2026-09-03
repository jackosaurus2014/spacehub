'use client';

// ─── Map Context Panel (Wave 9 — map-first command interface) ──────────────
// Slides in whenever the player selects a location (solar layer) or a star
// system (galactic layer) on the command map — via canvas click OR the
// wave-8 keyboard Location List. Desktop: fixed right-side panel. Mobile:
// bottom sheet. Every action here calls back into the SAME engine functions
// already wired up in space-tycoon/page.tsx — no forked business logic.

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { GameState, GameTab } from '@/lib/game/types';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { MINING_LOCATIONS, SHIP_MAP, getTravelTime } from '@/lib/game/ships';
import { LOCATION_ASSETS, SHIP_ASSETS } from '@/lib/game/assets';
import { formatMoney, formatDuration } from '@/lib/game/formulas';
import { getShipTransitSpeedMultiplier } from '@/lib/game/modules';
import { getSpecializationBonuses } from '@/lib/game/specializations';
import { getWorkforceBonuses } from '@/lib/game/workforce';
import { INTERSTELLAR_SYSTEM_MAP, getJumpPrerequisites } from '@/lib/game/interstellar';
import {
  planExpedition,
  getExpeditionCapableShips,
  getExpeditionLaunchReadiness,
  getExpeditionProgress,
  getTotalGameMonths,
  GAME_MONTHS_PER_LY,
  COLONY_CAPABLE_SHIP_IDS,
  type ExpeditionPlanRequest,
  type ExpeditionPlan,
  type ExpeditionPlanError,
} from '@/lib/game/expeditions';
import { LOCATION_TO_ZONE, ZONE_MAP } from '@/lib/game/zone-influence';
import { getActiveScienceMissions, getScienceMissionProgress, SCIENCE_PROGRAM_MAP } from '@/lib/game/science-missions';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
// W14 (cargo logistics, audit C1): local-stockpile readout + freight quotes
// for the map dispatch flow.
import {
  getLocationInventory,
  isHomeLocation,
  getShipCargoCapacity,
  getCargoLoadUnits,
  getFreightFuelCost,
  getRouteDeltaV,
} from '@/lib/game/cargo-logistics';
import CargoLoader from './CargoLoader';
import { Concept } from './HoloTip';
import { playSound } from '@/lib/game/sound-engine';
import { REGION_LABELS } from './SolarSystemCanvas';
import { SYSTEM_RISK_META, RISK_TONE_CLASS } from './GalacticMapView';
import BuildPanel from './BuildPanel';
// Wave A2.2 (docs/VISUAL_AAA_2026-08.md §A2.2) — the Sins-style location
// detail console: the body rendered at scale, ringed by its REAL orbital-slot
// occupancy, with engine-sourced vitals under it.
import LocationDetailConsole from './map/LocationDetailConsole';
import { useWorldState, getColonySlotCap, LOCATION_MILESTONE_MAP } from '@/hooks/useWorldState';

export type MapSelection = { kind: 'location'; id: string } | { kind: 'system'; id: string };

/** Sub-views this panel can open on. Wave A2: the radial command menu jumps
 *  straight to 'build' / 'dispatch' instead of making the player land on the
 *  overview and click again. */
export type MapContextView = 'overview' | 'build' | 'dispatch' | 'plan-expedition';

interface MapContextPanelProps {
  state: GameState;
  selection: MapSelection;
  /** Wave A2 — which sub-view to open on (default 'overview'). */
  initialView?: MapContextView;
  /** Monotonic nonce so re-requesting the SAME view for the SAME selection
   *  re-applies it (a plain value-equality prop would not — same pattern as
   *  MapCommandCenter's focusRequest token). */
  viewToken?: number;
  onClose: () => void;
  onUnlock: (locId: string) => void;
  onBuild: (buildingId: string, locationId: string) => void;
  onSellBuilding: (instanceId: string) => void;
  /** Wave M2 (docs/MEANINGFUL_2026-08.md §M2): mothball (pause) / reactivate
   *  a completed building from the map's Build sub-panel. */
  onMothballBuilding?: (instanceId: string) => void;
  onReactivateBuilding?: (instanceId: string) => void;
  /** Damage-visibility wave (2026-08-31): without this the Rush Repair
   *  button never rendered on the map route — the natural place to click a
   *  damaged satellite. */
  onRushRepairBuilding?: (instanceId: string) => void;
  /** D4: Mark-II/III refit from the map's Build sub-panel. */
  onMarkUpgradeBuilding?: (instanceId: string) => void;
  onDispatchShip: (shipInstanceId: string, toLocationId: string, cargo?: Record<string, number>) => void;
  onLaunchExpedition: (req: ExpeditionPlanRequest) => void;
  onNavigateTab: (tab: GameTab) => void;
}

// Friendly label + icon per building category — used to group "what you have
// here" without inventing new data (BuildingCategory already exists on
// every BuildingDefinition; this is presentation only).
const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  launch_pad: { label: 'Launch Pads', icon: '🚀' },
  rocket: { label: 'Rockets', icon: '🛸' },
  satellite: { label: 'Satellites', icon: '🛰️' },
  space_station: { label: 'Stations', icon: '🏗️' },
  fabrication_facility: { label: 'Fabrication', icon: '🏭' },
  datacenter: { label: 'Data Centers', icon: '💾' },
  mining_enterprise: { label: 'Mining', icon: '⛏️' },
  ground_station: { label: 'Ground Stations', icon: '📡' },
  solar_farm: { label: 'Solar Farms', icon: '☀️' },
};

export default function MapContextPanel({
  state, selection, initialView = 'overview', viewToken, onClose, onUnlock, onBuild, onSellBuilding, onMothballBuilding, onReactivateBuilding, onRushRepairBuilding, onMarkUpgradeBuilding, onDispatchShip, onLaunchExpedition, onNavigateTab,
}: MapContextPanelProps) {
  const [view, setView] = useState<MapContextView>(initialView);
  const [pickedShip, setPickedShip] = useState<string | null>(null);

  // Reset the sub-view whenever the selection itself changes, so switching
  // locations doesn't leave you stuck on a stale Build/Dispatch screen.
  // Wave A2: also re-applies an explicitly requested view (radial menu →
  // Build / Dispatch), keyed by the caller's monotonic token.
  useEffect(() => {
    setView(initialView);
    setPickedShip(null);
  }, [selection.kind, selection.id, initialView, viewToken]);

  const panelShell = (title: React.ReactNode, body: React.ReactNode) => (
    <div
      className="hud-frame absolute inset-x-0 bottom-0 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 z-30 sm:w-[380px] max-h-[78vh] sm:max-h-none rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-white/10 bg-[#050510]/97 backdrop-blur-md overflow-y-auto game-scroll animate-reveal-up"
      role="region"
      aria-label="Selected map target command panel"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06] bg-[#050510]/95 backdrop-blur-sm">
        <div className="min-w-0">{title}</div>
        <button
          type="button"
          onClick={() => { playSound('click'); onClose(); }}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>
      <div className="p-3">{body}</div>
    </div>
  );

  if (selection.kind === 'system') {
    if (view === 'plan-expedition') {
      const sys = INTERSTELLAR_SYSTEM_MAP.get(selection.id);
      return panelShell(
        <PanelTitle icon="🌠" title="Plan Expedition" subtitle={sys?.name || selection.id} onBack={() => setView('overview')} />,
        <ExpeditionPlanner
          state={state}
          systemId={selection.id}
          onLaunch={(req) => { onLaunchExpedition(req); setView('overview'); }}
          onNavigateTab={onNavigateTab}
        />
      );
    }
    return panelShell(<GalacticHeader systemId={selection.id} />, (
      <GalacticBody
        state={state}
        systemId={selection.id}
        onNavigateTab={onNavigateTab}
        onOpenPlan={() => setView('plan-expedition')}
      />
    ));
  }

  const locId = selection.id;
  const loc = LOCATION_MAP.get(locId);
  const unlocked = state.unlockedLocations.includes(locId);

  if (view === 'build') {
    return panelShell(
      <PanelTitle icon="🏗️" title="Build" subtitle={loc?.name || locId} onBack={() => setView('overview')} />,
      <BuildPanel state={state} onBuild={onBuild} onSellBuilding={onSellBuilding} onMothballBuilding={onMothballBuilding} onReactivateBuilding={onReactivateBuilding} onRushRepairBuilding={onRushRepairBuilding} onMarkUpgradeBuilding={onMarkUpgradeBuilding} onDispatchShip={onDispatchShip} initialLocationId={locId} lockLocation />
    );
  }

  if (view === 'dispatch') {
    return panelShell(
      <PanelTitle icon="🛰️" title="Dispatch Ship" subtitle={`Target: ${loc?.name || locId}`} onBack={() => setView('overview')} />,
      <DispatchBody
        state={state}
        targetLocationId={locId}
        pickedShip={pickedShip}
        onPick={setPickedShip}
        onDispatch={(shipId, cargo) => { onDispatchShip(shipId, locId, cargo); setView('overview'); }}
      />
    );
  }

  return panelShell(
    <LocationHeader locationId={locId} />,
    <LocationOverview
      state={state}
      locationId={locId}
      unlocked={unlocked}
      onUnlock={onUnlock}
      onOpenBuild={() => setView('build')}
      onOpenDispatch={() => setView('dispatch')}
      onNavigateTab={onNavigateTab}
    />
  );
}

function PanelTitle({ icon, title, subtitle, onBack }: { icon: string; title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label="Back to overview"
      >
        ←
      </button>
      <div className="min-w-0">
        <div className="text-xs font-bold text-white flex items-center gap-1.5"><span aria-hidden="true">{icon}</span> {title}</div>
        <div className="text-[10px] text-slate-500 truncate">{subtitle}</div>
      </div>
    </div>
  );
}

function LocationHeader({ locationId }: { locationId: string }) {
  const loc = LOCATION_MAP.get(locationId);
  const art = LOCATION_ASSETS[locationId];
  return (
    <div className="flex items-center gap-2 min-w-0">
      {art && (
        <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10">
          <Image src={art} alt="" fill className="object-cover" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs font-bold text-white truncate">{loc?.name || locationId}</div>
        <div className="text-[10px] text-slate-500 truncate">{loc ? (REGION_LABELS[loc.type] || loc.type) : ''}</div>
      </div>
    </div>
  );
}

function GalacticHeader({ systemId }: { systemId: string }) {
  const sys = INTERSTELLAR_SYSTEM_MAP.get(systemId);
  return (
    <div className="min-w-0">
      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5"><span aria-hidden="true">✴</span> {sys?.name || systemId}</div>
      <div className="text-[10px] text-slate-500 truncate">{sys ? `${sys.distanceLy.toFixed(2)} ly · Galactic Layer` : ''}</div>
    </div>
  );
}

function LocationOverview({
  state, locationId, unlocked, onUnlock, onOpenBuild, onOpenDispatch, onNavigateTab,
}: {
  state: GameState;
  locationId: string;
  unlocked: boolean;
  onUnlock: (locId: string) => void;
  onOpenBuild: () => void;
  onOpenDispatch: () => void;
  onNavigateTab: (tab: GameTab) => void;
}) {
  const loc = LOCATION_MAP.get(locationId);
  if (!loc) return <p className="text-slate-500 text-xs">Unknown location.</p>;

  const canUnlock = !unlocked && loc.requiredResearch.every(r => state.completedResearch.includes(r)) && state.money >= loc.unlockCost;
  const buildingsHere = state.buildings.filter(b => b.locationId === locationId);
  const shipsHere = (state.ships || []).filter(s => s.isBuilt && s.currentLocation === locationId && s.status !== 'in_transit');
  const npcCount = (state.npcCompanies || []).filter(n => n.unlockedLocations.includes(locationId)).length;
  const miningInfo = MINING_LOCATIONS[locationId];

  // Group buildings by category
  const byCategory = new Map<string, { complete: number; building: number }>();
  for (const b of buildingsHere) {
    const def = BUILDING_MAP.get(b.definitionId);
    const cat = def?.category || 'other';
    const entry = byCategory.get(cat) || { complete: 0, building: 0 };
    if (b.isComplete) entry.complete++; else entry.building++;
    byCategory.set(cat, entry);
  }

  // Wave F UI surfacing (b): hazard forecast chips for this location.
  const warningsHere = (state.hazardWarnings || []).filter(w => w.locationId === locationId);

  // W9: zone standing for the zone this location belongs to (matches the
  // map's ♛/◆ label glyph + tint) — glyph + text, never color alone.
  const zoneSlug = LOCATION_TO_ZONE.get(locationId);
  const standingHere = zoneSlug
    ? (state.zoneStandings || []).find(z => z.zoneSlug === zoneSlug && (z.isGovernor || z.sharePct >= 1))
    : undefined;
  const zoneName = zoneSlug ? ZONE_MAP.get(zoneSlug)?.name || zoneSlug : '';

  // W9: active flagship science missions targeting this body (matches the
  // map's 🔬 instrument glyph marker).
  const missionsHere = getActiveScienceMissions(state).filter(
    m => SCIENCE_PROGRAM_MAP.get(m.programId)?.locationId === locationId,
  );

  return (
    <div className="space-y-3">
      {/* Wave A2.2 — the body itself, its orbital-slot ring, and the vitals.
          This is the panel's hero; the prose and the action rail follow it. */}
      <LocationDetailConsole
        state={state}
        locationId={locationId}
        onNavigate={target => onNavigateTab(target as GameTab)}
      />

      <p className="text-slate-400 text-[11px] leading-relaxed">{loc.description}</p>

      <WorldPresenceBlock locationId={locationId} />

      {standingHere && (
        <div
          className={`flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-lg border ${
            standingHere.isGovernor
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
          }`}
        >
          <span aria-hidden="true">{standingHere.isGovernor ? '♛' : '◆'}</span>
          <span>
            {standingHere.isGovernor ? 'Governor' : 'Stakeholder'} — {zoneName} · {standingHere.sharePct.toFixed(1)}% influence
          </span>
        </div>
      )}

      {missionsHere.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Science Missions Here</div>
          {missionsHere.map(m => {
            const progress = getScienceMissionProgress(state, m.id);
            const program = SCIENCE_PROGRAM_MAP.get(m.programId);
            if (!progress || !program) return null;
            return (
              <div key={m.id} className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg border border-cyan-500/15 bg-cyan-500/5">
                <span className="text-slate-200 truncate flex items-center gap-1.5">
                  <span aria-hidden="true">🔬</span> {program.name}
                </span>
                <span className="text-cyan-300/90 text-[10px] shrink-0">
                  {progress.phaseLabel}
                  {progress.monthsToNextPhase !== null && progress.monthsToNextPhase > 0 && ` · ${Math.ceil(progress.monthsToNextPhase)} mo`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {warningsHere.length > 0 && (
        <div className="space-y-1" role="status" aria-live="polite">
          {warningsHere.map(w => (
            <div
              key={w.id}
              className={`flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded-lg border ${
                w.severity === 'severe' ? 'bg-red-500/10 border-red-500/25 text-red-300'
                  : w.severity === 'major' ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
              }`}
            >
              <span aria-hidden="true">⚠️</span>
              <span>{w.summary}</span>
            </div>
          ))}
        </div>
      )}

      {!unlocked ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold mb-1.5">Locked</div>
          <ul className="space-y-0.5 text-slate-400 text-[11px] pl-4 mb-2" style={{ listStyle: 'disc' }}>
            <li>Pay <span className="text-white font-mono">{formatMoney(loc.unlockCost)}</span></li>
            {loc.requiredResearch.length > 0 && (
              <li>Research: {loc.requiredResearch.map(r => r.replace(/_/g, ' ')).join(', ')}</li>
            )}
          </ul>
          <button
            type="button"
            disabled={!canUnlock}
            onClick={() => { playSound('location_unlock'); onUnlock(locationId); }}
            className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              canUnlock ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
            }`}
          >
            {canUnlock ? `Unlock — ${formatMoney(loc.unlockCost)}` : 'Requirements not met'}
          </button>
        </div>
      ) : (
        <>
          {/* What you have here */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Your Assets</div>
            {byCategory.size === 0 && shipsHere.length === 0 ? (
              <p className="text-slate-600 text-[11px]">Nothing built or stationed here yet.</p>
            ) : (
              <div className="space-y-1">
                {Array.from(byCategory.entries()).map(([cat, counts]) => {
                  const meta = CATEGORY_META[cat] || { label: cat.replace(/_/g, ' '), icon: '🏢' };
                  return (
                    <div key={cat} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-white/[0.02]">
                      <span className="text-slate-300 flex items-center gap-1.5"><span aria-hidden="true">{meta.icon}</span> {meta.label}</span>
                      <span className="font-mono">
                        {counts.complete > 0 && <span className="text-cyan-300">{counts.complete}</span>}
                        {counts.building > 0 && <span className="text-amber-400 ml-1">+{counts.building} building</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {shipsHere.length > 0 && (
              <div className="mt-2 space-y-1">
                {shipsHere.map(s => {
                  const def = SHIP_MAP.get(s.definitionId);
                  return (
                    <div key={s.instanceId} className="flex items-center gap-2 text-[11px] px-2 py-1 rounded bg-white/[0.02]">
                      {def && SHIP_ASSETS[def.id] && (
                        <div className="relative w-6 h-6 shrink-0">
                          <Image src={SHIP_ASSETS[def.id]} alt="" fill className="object-contain" />
                        </div>
                      )}
                      <span className="text-slate-300 truncate flex-1">{s.name}</span>
                      <span className="text-slate-500 text-[10px] capitalize">{s.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resources / colony info */}
          {miningInfo && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Mining Yield</div>
              <p className="text-[11px] text-slate-400">{miningInfo.description}</p>
              <p className="text-[10px] text-cyan-300 mt-0.5">Output multiplier: {miningInfo.multiplier}x</p>
            </div>
          )}

          {/* W14 (cargo logistics): what's physically stored HERE. Home
              cluster shows the shared Earth pool (the market inventory);
              remote locations show their local stockpile, which freight
              ships must haul home before it can be sold. */}
          <LocalStockpileBlock state={state} locationId={locationId} />

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded bg-white/[0.02] p-2">
              <div className="text-slate-500">Tier</div>
              <div className="text-white font-mono">T{loc.tier}</div>
            </div>
            <div className="rounded bg-white/[0.02] p-2">
              <div className="text-slate-500">Distance</div>
              <div className="text-white font-mono">{loc.distanceFromEarthAU} AU</div>
            </div>
          </div>
          {npcCount > 0 && (
            <p className="text-[10px] text-slate-500 italic">🤖 {npcCount} NPC {npcCount === 1 ? 'competitor operates' : 'competitors operate'} here — informational only.</p>
          )}

          {/* Actions */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              type="button"
              onClick={() => { playSound('click'); onOpenBuild(); }}
              className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
            >
              🏗️ Build here
            </button>
            <button
              type="button"
              onClick={() => { playSound('click'); onOpenDispatch(); }}
              className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1] transition-colors"
            >
              🛰️ Dispatch ship here
            </button>
            <button
              type="button"
              onClick={() => { playSound('click'); onNavigateTab('build'); }}
              className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium text-cyan-300/80 hover:text-cyan-300 border border-white/[0.06] hover:border-cyan-500/30 transition-colors"
            >
              Details — open full Build tab →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** W14 (cargo logistics): the location's physical inventory. Home cluster →
 *  the shared Earth pool (also the NPC market inventory); anywhere else →
 *  the location's local stockpile (goods must be freighted home to sell). */
function LocalStockpileBlock({ state, locationId }: { state: GameState; locationId: string }) {
  const home = isHomeLocation(locationId);
  const inventory = getLocationInventory(state, locationId);
  const entries = Object.entries(inventory)
    .filter(([resId, qty]) => qty > 0 && RESOURCE_MAP.has(resId as ResourceId))
    .sort((a, b) => b[1] - a[1]);

  // Pre-ratchet saves have nothing local anywhere and no logistics yet —
  // don't add noise until the mechanic is live for this player.
  if (entries.length === 0 && !state.logisticsUnlocked) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-1">
        <span aria-hidden="true">📦</span> {home ? 'Earth Pool (market inventory)' : 'Local Stockpile'}
      </div>
      {entries.length === 0 ? (
        <p className="text-[11px] text-slate-600">
          Empty{home ? '' : ' — production here accrues locally; dispatch cargo ships to stock or collect'}.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {entries.slice(0, 8).map(([resId, qty]) => {
              const res = RESOURCE_MAP.get(resId as ResourceId);
              return (
                <span key={resId} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300">
                  <span aria-hidden="true">{res?.icon}</span> {res?.name || resId.replace(/_/g, ' ')} <span className="font-mono text-cyan-300">{Math.floor(qty).toLocaleString()}</span>
                </span>
              );
            })}
            {entries.length > 8 && (
              <span className="text-[10px] px-1.5 py-0.5 text-slate-500">+{entries.length - 8} more</span>
            )}
          </div>
          {!home && (
            <p className="text-[11px] text-slate-500 mt-1">Goods must be freighted to Earth before they can be sold on the market.</p>
          )}
        </>
      )}
    </div>
  );
}

/** Live-world scarcity + milestone-race readout for a single location (audit
 *  Change #3 / D1 + top-10 item #3). Renders whether the location is locked
 *  or not — knowing 3 other corporations already operate here (or that a
 *  colony-slot cap is nearly full) is exactly the kind of intelligence a
 *  player should have BEFORE spending money to unlock it. */
function WorldPresenceBlock({ locationId }: { locationId: string }) {
  const { world, available } = useWorldState();

  if (!available) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-[10px] text-slate-500 italic">
        🌐 Sign in to see the live world — other corporations&rsquo; presence here.
      </div>
    );
  }

  const names = world?.world.colonies[locationId] || [];
  const count = world?.world.colonyCounts[locationId] || names.length;
  const cap = getColonySlotCap(locationId);
  const milestone = LOCATION_MILESTONE_MAP[locationId];
  const milestoneClaimedBy = milestone ? world?.milestones[milestone.id] : undefined;

  if (count === 0 && !cap && !milestone) return null;

  return (
    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-2.5 space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-purple-300 font-semibold flex items-center gap-1">
        <span aria-hidden="true">🌐</span> Live World
      </div>
      {count > 0 ? (
        <p className="text-[11px] text-slate-300">
          <span className="text-white font-mono">{count}</span> corporation{count === 1 ? '' : 's'} operating here
          {names[0] && <> — first mover: <span className="text-purple-200">{names[0]}</span></>}
        </p>
      ) : (
        <p className="text-[11px] text-slate-500">No corporation has claimed this location yet.</p>
      )}
      {cap != null && (
        <p className="text-[10px] text-slate-500">
          Colony slots: <span className={count >= cap ? 'text-red-300 font-semibold' : 'text-slate-300'}>{count}/{cap}</span>{count >= cap ? ' — FULL' : ''}
        </p>
      )}
      {milestone && (
        <p className="text-[10px]">
          {milestoneClaimedBy ? (
            <span className="text-amber-300">🏆 {milestone.label}: claimed by {milestoneClaimedBy}</span>
          ) : (
            <span className="text-emerald-300">🏁 {milestone.label}: OPEN — first to unlock wins it</span>
          )}
        </p>
      )}
    </div>
  );
}

function DispatchBody({
  state, targetLocationId, pickedShip, onPick, onDispatch,
}: {
  state: GameState;
  targetLocationId: string;
  pickedShip: string | null;
  onPick: (id: string | null) => void;
  onDispatch: (shipInstanceId: string, cargo: Record<string, number>) => void;
}) {
  // W14: cargo manifest for the freight leg. Reset when the picked ship
  // changes (manifest is origin-inventory specific).
  const [cargoManifest, setCargoManifest] = useState<Record<string, number>>({});
  useEffect(() => { setCargoManifest({}); }, [pickedShip]);
  const eligibleShips = (state.ships || []).filter(s => s.isBuilt && s.status === 'idle' && s.currentLocation !== targetLocationId);
  const busyShips = (state.ships || []).filter(s => s.isBuilt && s.status !== 'idle' && s.status !== 'in_transit');

  if (eligibleShips.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-slate-500 text-xs">No idle ships available to dispatch.</p>
        {busyShips.length > 0 && (
          <p className="text-slate-600 text-[10px] mt-1">{busyShips.length} ship{busyShips.length === 1 ? ' is' : 's are'} mining, surveying, or already en route — stop that operation first (Fleet tab) to redirect.</p>
        )}
      </div>
    );
  }

  const ship = pickedShip ? eligibleShips.find(s => s.instanceId === pickedShip) : null;
  // Real effective transit speed — replicates the exact multiplier the
  // engine tick applies (see game-engine.ts), so the ETA shown here matches
  // when the ship actually arrives instead of the raw unmodified travel time.
  const specBonuses = getSpecializationBonuses(state.specialization || { primary: null, secondary: null, respecCount: 0 });
  const wfBonuses = getWorkforceBonuses(state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 });
  const transitSpeedMult = ship
    ? Math.max(1, (1 + specBonuses.fleetSpeed) * (1 + wfBonuses.shipEfficiency) * getShipTransitSpeedMultiplier(state, ship.instanceId))
    : 1;
  const isBoosted = transitSpeedMult > 1.001;
  const rawEta = ship ? getTravelTime(ship.currentLocation, targetLocationId) : 0;
  const eta = rawEta / transitSpeedMult;

  return (
    <div className="space-y-2">
      <p className="text-slate-500 text-[10px] mb-1">Pick a ship to send to {LOCATION_MAP.get(targetLocationId)?.name || targetLocationId}:</p>
      <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
        {eligibleShips.map(s => {
          const def = SHIP_MAP.get(s.definitionId);
          const fromLoc = LOCATION_MAP.get(s.currentLocation);
          const isPicked = pickedShip === s.instanceId;
          return (
            <button
              key={s.instanceId}
              type="button"
              onClick={() => onPick(isPicked ? null : s.instanceId)}
              aria-pressed={isPicked}
              className={`w-full min-h-[44px] flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                isPicked ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
              }`}
            >
              {def && SHIP_ASSETS[def.id] && (
                <div className="relative w-7 h-7 shrink-0">
                  <Image src={SHIP_ASSETS[def.id]} alt="" fill className="object-contain" />
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-white text-[11px] truncate">{s.name}</span>
                <span className="block text-slate-500 text-[10px] truncate">{def?.name} · at {fromLoc?.name || s.currentLocation}</span>
              </span>
              {isPicked && <span className="text-cyan-300 text-[10px] shrink-0">✓ selected</span>}
            </button>
          );
        })}
      </div>

      {ship && (() => {
        // W14 freight quote: capacity (hull + cargo modules), load, and the
        // Δv-priced fuel bill (fuelEfficiency research already applied).
        const shipDef = SHIP_MAP.get(ship.definitionId);
        const capacity = getShipCargoCapacity(state, ship.instanceId);
        const loadUnits = getCargoLoadUnits(shipDef?.role, cargoManifest);
        const overCapacity = loadUnits > capacity;
        const fuelCost = getFreightFuelCost(state, ship.instanceId, ship.currentLocation, targetLocationId, cargoManifest);
        const canAffordFuel = state.money >= fuelCost;
        const deltaV = getRouteDeltaV(ship.currentLocation, targetLocationId);
        return (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 mt-2 space-y-2">
            {capacity > 0 && (
              <CargoLoader
                state={state}
                shipInstanceId={ship.instanceId}
                cargo={cargoManifest}
                onChange={setCargoManifest}
              />
            )}
            <div className="text-[11px] text-slate-300">
              ETA: <span className="text-cyan-300 font-mono">{formatDuration(eta)}</span>
              {isBoosted && <span className="text-cyan-300 ml-1" aria-label="speed boosted by modules, specialization, or workforce">⚡ boosted</span>}
              <span className="text-slate-500"> · <Concept id="delta-v">Δv {deltaV.toLocaleString()} m/s</Concept></span>
            </div>
            <div className="text-[11px] text-slate-300">
              <Concept id="freight-cost">Fuel bill</Concept>: <span className={`font-mono ${canAffordFuel ? 'text-amber-300' : 'text-red-300'}`}>{formatMoney(fuelCost)}</span>
              <span className="text-slate-600"> — logistics cost money; fuel scales with route Δv and load.</span>
            </div>
            {overCapacity && (
              <p className="text-red-300 text-[10px]" role="alert">Cargo exceeds capacity ({loadUnits}/{capacity}) — unload to dispatch.</p>
            )}
            <button
              type="button"
              disabled={overCapacity || !canAffordFuel}
              onClick={() => onDispatch(ship.instanceId, cargoManifest)}
              className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                overCapacity || !canAffordFuel
                  ? 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                  : 'bg-cyan-600 text-white hover:bg-cyan-500'
              }`}
            >
              {Object.keys(cargoManifest).length > 0 ? `Dispatch with ${loadUnits} units` : 'Dispatch (no cargo)'} — {formatMoney(fuelCost)} fuel
            </button>
          </div>
        );
      })()}
    </div>
  );
}

function GalacticBody({
  state, systemId, onNavigateTab, onOpenPlan,
}: {
  state: GameState;
  systemId: string;
  onNavigateTab: (tab: GameTab) => void;
  onOpenPlan: () => void;
}) {
  const sys = INTERSTELLAR_SYSTEM_MAP.get(systemId);
  if (!sys) return <p className="text-slate-500 text-xs">Unknown system.</p>;

  const missing = getJumpPrerequisites(systemId, state.completedResearch);
  const exoticFuel = state.resources?.exotic_fuel || 0;
  // E3.1: readiness now comes from the planner itself. Exotic fuel is NOT an
  // inventory prerequisite — planExpedition procures any shortfall at a 1.25x
  // broker premium — and it never could be, because nothing in Sol produces
  // exotic_fuel. See expeditions.ts::getExpeditionLaunchReadiness.
  const readiness = getExpeditionLaunchReadiness(state, systemId);
  const ready = !!readiness?.canLaunch;
  const risk = SYSTEM_RISK_META[systemId] || { label: 'Unknown risk', glyph: '?', tone: 'moderate' as const };
  const outboundMonths = Math.ceil(sys.distanceLy * GAME_MONTHS_PER_LY);

  const localExpeditions = (state.expeditions || []).filter(e => e.targetSystemId === systemId && e.phase !== 'completed' && e.phase !== 'lost');
  const colony = (state.interstellarColonies || []).find(c => c.systemId === systemId);
  const eligibleShips = getExpeditionCapableShips(state);
  // W9: trade routes shipping from this system's colony back to Sol.
  const routesHere = (state.interstellarTradeRoutes || []).filter(r => r.systemId === systemId);
  const currentMonth = getTotalGameMonths(state.gameDate);

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-[11px] leading-relaxed">{sys.description}</p>

      {/* System dossier */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded bg-white/[0.02] p-2">
          <div className="text-slate-500">Distance</div>
          <div className="text-white font-mono">{sys.distanceLy.toFixed(2)} ly</div>
        </div>
        <div className="rounded bg-white/[0.02] p-2">
          <div className="text-slate-500">Fuel required / jump</div>
          <div className="font-mono text-cyan-300">{sys.jumpFuelRequired.toLocaleString()}</div>
        </div>
        <div className="rounded bg-white/[0.02] p-2">
          <div className="text-slate-500">Outbound transit</div>
          <div className="text-white font-mono">~{outboundMonths} months</div>
        </div>
        <div className="rounded bg-white/[0.02] p-2">
          <div className="text-slate-500">Round trip (survey)</div>
          <div className="text-white font-mono">~{outboundMonths * 2 + 12} months</div>
        </div>
      </div>
      <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${RISK_TONE_CLASS[risk.tone]}`}>
        <span aria-hidden="true">{risk.glyph}</span> {risk.label}
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Known Resources</div>
        <div className="flex flex-wrap gap-1">
          {sys.knownResources.map(r => (
            <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300">{RESOURCE_MAP.get(r as ResourceId)?.name || r.replace(/_/g, ' ')}</span>
          ))}
        </div>
      </div>

      <div className={`rounded-lg border p-2.5 ${ready ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
        <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${ready ? 'text-emerald-300' : 'text-red-300'}`}>
          {ready ? 'Jump ready' : 'Blocked by'}
        </div>
        {!ready && (
          <ul className="text-[11px] text-red-200 pl-4 space-y-0.5" style={{ listStyle: 'disc' }}>
            {(readiness?.blockers || ['Unknown destination system']).map(b => <li key={b}>{b}</li>)}
          </ul>
        )}
        {/* E3.1: the real fuel line — inventory covers what it covers, the
            rest is procured on the open market at a 25% broker premium. */}
        {readiness && (
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            Fuel plan: {readiness.fuelUnitsRequired.toLocaleString()} units needed
            {readiness.fuelFromInventory > 0 && <> · {Math.floor(readiness.fuelFromInventory).toLocaleString()} from stores</>}
            {readiness.fuelUnitsPurchased > 0 && <> · {Math.ceil(readiness.fuelUnitsPurchased).toLocaleString()} procured for {formatMoney(readiness.fuelPurchaseCost)} (25% broker premium)</>}
            {readiness.cheapestPlanCost > 0 && <> · cheapest uninsured plan {formatMoney(readiness.cheapestPlanCost)}</>}
          </p>
        )}
        <p className="text-[10px] text-slate-500 mt-1">
          You hold {Math.floor(exoticFuel).toLocaleString()} units of exotic-matter fuel. Only interstellar colonies refine it — until you found one, every jump buys fuel at a premium.
        </p>
      </div>

      {/* Active expeditions targeting this system */}
      {localExpeditions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Expeditions here</div>
          {localExpeditions.map(exp => {
            const progress = getExpeditionProgress(state, exp.id);
            if (!progress) return null;
            return (
              <div key={exp.id} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-200 font-medium">{progress.phaseLabel}</span>
                  <span className="text-slate-400 font-mono">{Math.max(0, Math.round(progress.monthsRemaining))} mo left</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Colony summary — W9: production glyphs match the map's colony chip */}
      {colony && (
        <div className="rounded-lg border border-purple-500/25 bg-purple-500/5 p-2.5 text-[11px]">
          <div className="text-purple-300 font-semibold mb-1">🏙️ {colony.name}</div>
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
            <span>Population: <span className="text-white font-mono">{Math.floor(colony.population).toLocaleString()}</span></span>
            <span>Infrastructure: <span className="text-white font-mono">L{colony.infrastructureLevel}</span></span>
          </div>
          {colony.localResources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Produces</span>
              {colony.localResources.map(r => {
                const res = RESOURCE_MAP.get(r as ResourceId);
                return (
                  <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300">
                    <span aria-hidden="true">{res?.icon}</span> {res?.name || r.replace(/_/g, ' ')}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* W9: trade routes — shipment progress detail behind the map's amber
          flow lines (colony → Sol). */}
      {routesHere.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Trade Routes → Sol</div>
          {routesHere.map(r => {
            const res = RESOURCE_MAP.get(r.resourceId as ResourceId);
            const inbound = r.inTransit.length;
            const nextDep = Math.max(0, r.nextDepartureGameMonth - currentMonth);
            return (
              <div key={r.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] flex items-center justify-between gap-2">
                <span className="text-amber-200 truncate">
                  <span aria-hidden="true">{res?.icon}</span> {res?.name || r.resourceId.replace(/_/g, ' ')}
                </span>
                <span className="text-slate-400 text-[10px] font-mono shrink-0">
                  {r.status === 'suspended'
                    ? 'SUSPENDED'
                    : `${inbound} in transit · next dep. ${nextDep} mo`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 pt-1">
        <button
          type="button"
          disabled={!ready || eligibleShips.length === 0}
          onClick={() => { playSound('click'); onOpenPlan(); }}
          className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            ready && eligibleShips.length > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-500'
              : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
          }`}
        >
          🌠 Plan Expedition
        </button>
        {ready && eligibleShips.length === 0 && (
          <p className="text-[10px] text-amber-300/90 text-center">
            No expedition-capable ship idle. Build a Starfarer Explorer or Colony Ark in{' '}
            <button type="button" className="underline hover:text-amber-200" onClick={() => { playSound('click'); onNavigateTab('fleet'); }}>Fleet</button>.
          </p>
        )}
        <button
          type="button"
          onClick={() => { playSound('click'); onNavigateTab('interstellar'); }}
          className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-medium text-indigo-300/80 hover:text-indigo-200 border border-white/[0.06] hover:border-indigo-500/30 transition-colors"
        >
          Mission Control — Interstellar Gateway →
        </button>
      </div>
    </div>
  );
}

// ─── Expedition Planner (Wave 10) ───────────────────────────────────────────
// Ship picker + insurance/shielding toggles with a live cost/risk quote from
// planExpedition (pure — no mutation). Launch calls back into page.tsx's
// engine-wired handler; plan errors are surfaced inline right here.

const PLAN_ERROR_TEXT: Record<ExpeditionPlanError['reason'], string> = {
  unknown_system: 'Unknown destination system.',
  missing_prerequisites: 'Research prerequisites not met.',
  ship_not_found: 'Select a ship to continue.',
  ship_not_built: 'That ship is still under construction.',
  ship_busy: 'That ship is not idle.',
  ship_not_expedition_capable: 'Only Starfarer Explorers and Colony Arks can fly expeditions.',
  insufficient_crew: 'Not enough workforce to crew this ship.',
  insufficient_funds: 'Not enough cash to cover the launch cost.',
};

function ExpeditionPlanner({
  state, systemId, onLaunch, onNavigateTab,
}: {
  state: GameState;
  systemId: string;
  onLaunch: (req: ExpeditionPlanRequest) => void;
  onNavigateTab: (tab: GameTab) => void;
}) {
  const [shipInstanceId, setShipInstanceId] = useState<string | null>(null);
  const [insured, setInsured] = useState(true);
  const [extraShielding, setExtraShielding] = useState(false);

  const eligibleShips = getExpeditionCapableShips(state);
  const sys = INTERSTELLAR_SYSTEM_MAP.get(systemId);

  if (eligibleShips.length === 0) {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-slate-500 text-xs">No idle expedition-capable ship in the fleet.</p>
        <p className="text-slate-600 text-[10px]">A Starfarer-Class Explorer or Colony Ark must be built and idle before launch.</p>
        <button
          type="button"
          onClick={() => { playSound('click'); onNavigateTab('fleet'); }}
          className="min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          Open Fleet / Shipyard →
        </button>
      </div>
    );
  }

  const req: ExpeditionPlanRequest | null = shipInstanceId
    ? { targetSystemId: systemId, shipInstanceId, insured, extraShielding }
    : null;
  const plan: ExpeditionPlan | ExpeditionPlanError | null = req ? planExpedition(state, req) : null;

  return (
    <div className="space-y-3">
      <p className="text-slate-500 text-[10px]">Pick a ship for the {sys?.name || systemId} expedition:</p>
      <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
        {eligibleShips.map(s => {
          const def = SHIP_MAP.get(s.definitionId);
          const isColonyShip = (COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(s.definitionId);
          const isPicked = shipInstanceId === s.instanceId;
          return (
            <button
              key={s.instanceId}
              type="button"
              onClick={() => { playSound('click'); setShipInstanceId(isPicked ? null : s.instanceId); }}
              aria-pressed={isPicked}
              className={`w-full min-h-[44px] flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                isPicked ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
              }`}
            >
              {def && SHIP_ASSETS[def.id] && (
                <div className="relative w-7 h-7 shrink-0">
                  <Image src={SHIP_ASSETS[def.id]} alt="" fill className="object-contain" />
                </div>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-white text-[11px] truncate">{s.name}</span>
                <span className="block text-slate-500 text-[10px] truncate">{def?.name} · {isColonyShip ? 'one-way colony hold' : 'round-trip survey'}</span>
              </span>
              {isPicked && <span className="text-indigo-300 text-[10px] shrink-0">✓ selected</span>}
            </button>
          );
        })}
      </div>

      {shipInstanceId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <label htmlFor="expedition-insured" className="text-[11px] text-slate-300">
              Insure the mission (8% premium, 70% payout on total loss)
            </label>
            <input
              id="expedition-insured"
              type="checkbox"
              checked={insured}
              onChange={e => setInsured(e.target.checked)}
              className="w-5 h-5 accent-cyan-500 shrink-0"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <label htmlFor="expedition-shielding" className="text-[11px] text-slate-300">
              Extra hardened shielding (+10% hull cost, −hazard damage)
            </label>
            <input
              id="expedition-shielding"
              type="checkbox"
              checked={extraShielding}
              onChange={e => setExtraShielding(e.target.checked)}
              className="w-5 h-5 accent-cyan-500 shrink-0"
            />
          </div>

          {plan && plan.ok && (
            <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/5 p-3 space-y-1.5 text-[11px]">
              <div className="text-indigo-200 font-semibold text-[10px] uppercase tracking-wider mb-1">Cost &amp; Mission Breakdown</div>
              <Row label="Fuel (from inventory)" value={`${plan.costs.fuelFromInventory.toLocaleString()} units`} />
              {plan.costs.fuelUnitsPurchased > 0 && (
                <Row label="Fuel purchased" value={`${plan.costs.fuelUnitsPurchased.toLocaleString()} units — ${formatMoney(plan.costs.fuelPurchaseCost)}`} />
              )}
              <Row label="Supplies" value={formatMoney(plan.costs.suppliesCost)} />
              {plan.costs.shieldingCost > 0 && <Row label="Shielding" value={formatMoney(plan.costs.shieldingCost)} />}
              {plan.costs.insurancePremium > 0 && <Row label="Insurance premium" value={formatMoney(plan.costs.insurancePremium)} />}
              <div className="h-px bg-white/[0.08] my-1" />
              <Row label="Total launch cost" value={formatMoney(plan.costs.totalMoneyCost)} strong />
              <div className="h-px bg-white/[0.08] my-1" />
              <Row label="Outbound transit" value={`${plan.outboundMonths} months`} />
              {plan.isColonyShip ? (
                <Row label="Holds station" value="Indefinitely (maintenance keeps ticking)" />
              ) : (
                <>
                  <Row label="Survey window" value={`${plan.exploreMonths} months`} />
                  <Row label="Return transit" value={`${plan.outboundMonths} months`} />
                  <Row label="Total mission" value={`${plan.totalPlannedMonths} months`} />
                </>
              )}
              <p className="text-[10px] text-slate-500 pt-1">
                {plan.isColonyShip
                  ? 'Colony Arks are a one-way commitment — on arrival you may found a permanent colony that holds station and keeps producing indefinitely.'
                  : 'Starfarer Explorers survey and automatically return with data + resource samples; they never colonize.'}
              </p>
            </div>
          )}

          {plan && !plan.ok && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-3 text-[11px] text-red-200" role="alert">
              <div className="font-semibold mb-1">{PLAN_ERROR_TEXT[plan.reason]}</div>
              {plan.detail && <div className="text-red-300/80">{plan.detail}</div>}
              {plan.missingPrerequisites && plan.missingPrerequisites.length > 0 && (
                <ul className="pl-4 mt-1 space-y-0.5" style={{ listStyle: 'disc' }}>
                  {plan.missingPrerequisites.map(r => <li key={r}>Research: {r.replace(/_/g, ' ')}</li>)}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!plan || !plan.ok}
            onClick={() => { if (req && plan?.ok) { onLaunch(req); } }}
            className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              plan && plan.ok
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400'
                : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
            }`}
          >
            🚀 Launch Expedition
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono ${strong ? 'text-white font-bold' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
