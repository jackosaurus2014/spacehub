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
import { INTERSTELLAR_SYSTEM_MAP, getJumpPrerequisites } from '@/lib/game/interstellar';
import { playSound } from '@/lib/game/sound-engine';
import { REGION_LABELS } from './SolarSystemCanvas';
import BuildPanel from './BuildPanel';

export type MapSelection = { kind: 'location'; id: string } | { kind: 'system'; id: string };

interface MapContextPanelProps {
  state: GameState;
  selection: MapSelection;
  onClose: () => void;
  onUnlock: (locId: string) => void;
  onBuild: (buildingId: string, locationId: string) => void;
  onSellBuilding: (instanceId: string) => void;
  onDispatchShip: (shipInstanceId: string, toLocationId: string) => void;
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
  state, selection, onClose, onUnlock, onBuild, onSellBuilding, onDispatchShip, onNavigateTab,
}: MapContextPanelProps) {
  const [view, setView] = useState<'overview' | 'build' | 'dispatch'>('overview');
  const [pickedShip, setPickedShip] = useState<string | null>(null);

  // Reset the sub-view whenever the selection itself changes, so switching
  // locations doesn't leave you stuck on a stale Build/Dispatch screen.
  useEffect(() => {
    setView('overview');
    setPickedShip(null);
  }, [selection.kind, selection.id]);

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
    return panelShell(<GalacticHeader systemId={selection.id} />, (
      <GalacticBody state={state} systemId={selection.id} onNavigateTab={onNavigateTab} />
    ));
  }

  const locId = selection.id;
  const loc = LOCATION_MAP.get(locId);
  const unlocked = state.unlockedLocations.includes(locId);

  if (view === 'build') {
    return panelShell(
      <PanelTitle icon="🏗️" title="Build" subtitle={loc?.name || locId} onBack={() => setView('overview')} />,
      <BuildPanel state={state} onBuild={onBuild} onSellBuilding={onSellBuilding} initialLocationId={locId} lockLocation />
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
        onDispatch={(shipId) => { onDispatchShip(shipId, locId); setView('overview'); }}
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

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-[11px] leading-relaxed">{loc.description}</p>

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

function DispatchBody({
  state, targetLocationId, pickedShip, onPick, onDispatch,
}: {
  state: GameState;
  targetLocationId: string;
  pickedShip: string | null;
  onPick: (id: string | null) => void;
  onDispatch: (shipInstanceId: string) => void;
}) {
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
  const eta = ship ? getTravelTime(ship.currentLocation, targetLocationId) : 0;

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

      {ship && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 mt-2">
          <div className="text-[11px] text-slate-300 mb-2">
            ETA: <span className="text-cyan-300 font-mono">{formatDuration(eta)}</span>
            <span className="text-slate-600"> — travel-time system is real; ship snaps to route immediately, position interpolates on the map.</span>
          </div>
          <button
            type="button"
            onClick={() => onDispatch(ship.instanceId)}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
          >
            Confirm Dispatch
          </button>
        </div>
      )}
    </div>
  );
}

function GalacticBody({ state, systemId, onNavigateTab }: { state: GameState; systemId: string; onNavigateTab: (tab: GameTab) => void }) {
  const sys = INTERSTELLAR_SYSTEM_MAP.get(systemId);
  if (!sys) return <p className="text-slate-500 text-xs">Unknown system.</p>;

  const missing = getJumpPrerequisites(systemId, state.completedResearch);
  const exoticFuel = state.resources?.exotic_fuel || 0;
  const fuelMissing = exoticFuel < sys.jumpFuelRequired;
  const ready = missing.length === 0 && !fuelMissing;

  return (
    <div className="space-y-3">
      <p className="text-slate-400 text-[11px] leading-relaxed">{sys.description}</p>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded bg-white/[0.02] p-2">
          <div className="text-slate-500">Distance</div>
          <div className="text-white font-mono">{sys.distanceLy.toFixed(2)} ly</div>
        </div>
        <div className="rounded bg-white/[0.02] p-2">
          <div className="text-slate-500">Fuel required</div>
          <div className={`font-mono ${fuelMissing ? 'text-red-300' : 'text-cyan-300'}`}>{sys.jumpFuelRequired.toLocaleString()}</div>
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Known Resources</div>
        <div className="flex flex-wrap gap-1">
          {sys.knownResources.map(r => (
            <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300">{r.replace(/_/g, ' ')}</span>
          ))}
        </div>
      </div>
      <div className={`rounded-lg border p-2.5 ${ready ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
        <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${ready ? 'text-emerald-300' : 'text-red-300'}`}>
          {ready ? 'Jump ready' : 'Blocked by'}
        </div>
        {!ready && (
          <ul className="text-[11px] text-red-200 pl-4 space-y-0.5" style={{ listStyle: 'disc' }}>
            {missing.map(r => <li key={r}>Research: {r.replace(/_/g, ' ')}</li>)}
            {fuelMissing && <li>Exotic fuel: need {sys.jumpFuelRequired.toLocaleString()} (have {Math.floor(exoticFuel).toLocaleString()})</li>}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={() => { playSound('click'); onNavigateTab('interstellar'); }}
        className="w-full min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
      >
        View first-contact briefing →
      </button>
      <p className="text-[10px] text-slate-500 italic text-center">
        Engine gap: jump/expedition execution isn&apos;t implemented yet — the Interstellar Gateway tab shows the full prerequisite check and narrative preview.
      </p>
    </div>
  );
}
