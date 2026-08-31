'use client';

import { useState, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { SHIPS, SHIP_MAP, getTravelTime, generateShipName, SURVEY_DURATION, canMineAtLocation, MINING_LOCATIONS, getShipDerivedStats } from '@/lib/game/ships';
import type { ShipInstance } from '@/lib/game/ships';
import { LOCATIONS, LOCATION_MAP } from '@/lib/game/solar-system';
import { RESOURCE_MAP } from '@/lib/game/resources';
import { formatMoney, formatCountdown, formatDuration } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { getShipAsset } from '@/lib/game/assets';
import { getShipyardSlots, getActiveShipBuilds, canBuildShip, getShipyardBreakdown } from '@/lib/game/shipyard-slots';
import { calculateRushRepairCost } from '@/lib/game/hazards';
import { applyLaunchCostReduction } from '@/lib/game/mega-projects';
import { getShipTransitSpeedMultiplier } from '@/lib/game/modules';
import { getSpecializationBonuses } from '@/lib/game/specializations';
import { getWorkforceBonuses } from '@/lib/game/workforce';
// W14 (cargo logistics, audit C1): freight quotes + capacity for the
// transport flow — cargo selection, Δv-priced fuel readouts per destination.
import { getFreightFuelCost, getShipCargoCapacity, getCargoLoadUnits } from '@/lib/game/cargo-logistics';
import CargoLoader from './CargoLoader';
import Image from 'next/image';
import { ConsolePanel, StatReadout } from './chrome';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';

/** Ship role → registry icon. Ship definitions (ships.ts) carry their own
 *  decorative `icon` emoji (a data file — out of this wave's sweep scope per
 *  icons.tsx's header contract), so the panel-side chrome renders the role
 *  instead, which is both more semantically accurate and already registered. */
function shipRoleIcon(role: string): IconName {
  switch (role) {
    case 'mining': return 'ship-mining';
    case 'survey': return 'ship-survey';
    case 'tanker': return 'ship-tanker';
    default: return 'ship-transport';
  }
}

interface FleetPanelProps {
  state: GameState;
  onBuildShip: (shipDefId: string, locationId: string) => void;
  onStartMining: (shipInstanceId: string, resourceId: string) => void;
  onStopMining: (shipInstanceId: string) => void;
  onStartTransport: (shipInstanceId: string, toLocation: string, cargo: Record<string, number>) => void;
  onLaunchSurvey?: (shipInstanceId: string, targetLocation: string) => void;
  onScrapShip?: (shipInstanceId: string) => void;
  /** Instantly heals all current hull damage on a ship for
   *  calculateRushRepairCost(hullDamagePct, baseCost) money. Rush Repair
   *  button only renders when this is provided. */
  onRushRepairShip?: (shipInstanceId: string) => void;
}

export default function FleetPanel({ state, onBuildShip, onStartMining, onStopMining, onStartTransport, onLaunchSurvey, onScrapShip, onRushRepairShip }: FleetPanelProps) {
  const [selectedShipyard, setSelectedShipyard] = useState('earth_surface');
  const [selectedShip, setSelectedShip] = useState<string | null>(null);
  // W14: cargo manifest being loaded for the transport flow. Reset whenever
  // the selected ship changes (a manifest is origin+hull specific).
  const [cargoManifest, setCargoManifest] = useState<Record<string, number>>({});
  const selectShip = useCallback((id: string | null) => {
    setSelectedShip(id);
    setCargoManifest({});
  }, []);

  const ships = state.ships || [];
  const builtShips = ships.filter(s => s.isBuilt);
  const buildingShips = ships.filter(s => !s.isBuilt);
  const shipyardSlots = getShipyardSlots(state);
  const activeBuilds = getActiveShipBuilds(state);
  const canBuild = canBuildShip(state);
  const shipyardBreakdown = getShipyardBreakdown(state);

  // Available ships to build
  const availableShipDefs = SHIPS.filter(s =>
    s.requiredResearch.every(r => state.completedResearch.includes(r))
  );

  // Ship being viewed
  const selectedShipInstance = selectedShip ? ships.find(s => s.instanceId === selectedShip) : null;
  const selectedShipDef = selectedShipInstance ? SHIP_MAP.get(selectedShipInstance.definitionId) : null;

  return (
    <div className="space-y-4">
      {/* Fleet Overview */}
      <ConsolePanel title="Fleet" icon="fleet" subtitle="Every ship you operate, at a glance.">
        {/* Wave A1 (docs/VISUAL_AAA_2026-08.md §A1.2): centred number-over-
            caption tiles replaced by the shared label-first instrument
            readout — icon inline with the figure, unit split off small, and
            a sub-line that turns three bare counts into a fleet status. */}
        <div className="grid grid-cols-3 gap-3">
          {([
            { label: 'Active', icon: 'fleet' as const, glow: 'cyan' as const, value: builtShips.length, tint: 'text-cyan-400', border: 'border-cyan-500/20 bg-cyan-500/5', sub: 'ships operating' },
            { label: 'Mining', icon: 'ship-mining' as const, glow: 'amber' as const, value: builtShips.filter(s => s.status === 'mining').length, tint: 'text-amber-400', border: 'border-amber-500/20 bg-amber-500/5', sub: 'on station' },
            { label: 'In Transit', icon: 'ship-transport' as const, glow: 'green' as const, value: builtShips.filter(s => s.status === 'in_transit').length, tint: 'text-green-400', border: 'border-green-500/20 bg-green-500/5', sub: 'under way' },
          ]).map(tile => (
            <div key={tile.label} className={`holo-card rounded-xl border ${tile.border} p-3`}>
              <StatReadout
                label={tile.label}
                icon={tile.icon}
                iconGlow={tile.glow}
                value={`${tile.value}`}
                size="lg"
                valueClassName={tile.tint}
                sub={tile.sub}
              />
            </div>
          ))}
        </div>
      </ConsolePanel>

      {/* Active Ships */}
      {builtShips.length > 0 && (
        <ConsolePanel title="Your Fleet" icon="fleet">
          <div className="space-y-2">
            {builtShips.map(ship => {
              const def = SHIP_MAP.get(ship.definitionId);
              if (!def) return null;
              const loc = LOCATION_MAP.get(ship.currentLocation);
              const isSelected = selectedShip === ship.instanceId;
              const hasDamage = !!ship.hullDamagePct && ship.hullDamagePct > 0;
              const isSevere = !!ship.hullDamagePct && ship.hullDamagePct >= 0.5;
              const repairCost = calculateRushRepairCost(ship.hullDamagePct, def.baseCost);

              return (
                <div
                  key={ship.instanceId}
                  className={`rounded-lg transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border border-cyan-500/30'
                      : 'bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                <button
                  type="button"
                  onClick={() => { playSound('click'); selectShip(isSelected ? null : ship.instanceId); }}
                  className="w-full text-left p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="sprite-frame w-14 h-14 flex-shrink-0 flex items-center justify-center">
                        <Image
                          src={getShipAsset(def.id)}
                          alt={`${def.name} illustration`}
                          width={56}
                          height={56}
                          className="w-12 h-12 object-contain drop-shadow-[0_0_6px_rgba(34,211,238,0.35)]"
                        />
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium">{ship.name}</p>
                        <p className="text-slate-500 text-[10px]">{def.name} · {loc?.name || ship.currentLocation}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                        ship.status === 'mining' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        ship.status === 'in_transit' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        ship.status === 'idle' ? 'bg-white/[0.06] text-slate-400 border border-white/[0.06]' :
                        'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        <GameIcon name={ship.status === 'mining' ? 'ship-mining' : ship.status === 'in_transit' ? 'fleet' : ship.status === 'idle' ? 'idle' : 'activity'} size={11} />
                        {ship.status === 'mining' ? 'Mining' :
                         ship.status === 'in_transit' ? 'In Transit' :
                         ship.status === 'idle' ? 'Idle' :
                         ship.status}
                      </span>
                    </div>
                  </div>

                  {/* Hull damage badge — colorblind-safe: icon + numeric % always shown alongside color */}
                  {hasDamage && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                        isSevere
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        <GameIcon name="warning" size={10} /> Hull damage {Math.round((ship.hullDamagePct || 0) * 100)}%
                      </span>
                    </div>
                  )}

                  {/* Mining progress */}
                  {ship.status === 'mining' && ship.miningOperation && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-amber-400 text-[10px]">Mining {ship.miningOperation.resourceId.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-1 bg-amber-500 rounded-full construction-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                  )}

                  {/* Transit progress */}
                  {ship.status === 'in_transit' && ship.route && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-0.5">
                        <span className="text-slate-500">{LOCATION_MAP.get(ship.route.from)?.name} → {LOCATION_MAP.get(ship.route.to)?.name}</span>
                        <span className="text-green-400 font-mono">
                          {formatCountdown(Math.max(0, (ship.route.arrivalAtMs - Date.now()) / 1000))}
                        </span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-1 bg-green-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((Date.now() - ship.route.departedAtMs) / (ship.route.arrivalAtMs - ship.route.departedAtMs)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>

                {/* Rush Repair — instantly heals current hull damage for money */}
                {hasDamage && onRushRepairShip && (
                  <div className="px-3 pb-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); playSound('click'); onRushRepairShip(ship.instanceId); }}
                      className="w-full inline-flex items-center justify-center gap-1 min-h-[38px] px-2.5 py-1 text-[10px] font-medium bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors"
                    >
                      <GameIcon name="wrench" size={11} /> Rush Repair — {formatMoney(repairCost)}
                    </button>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </ConsolePanel>
      )}

      {/* Ship Actions (when a ship is selected and idle or mining) */}
      {selectedShipInstance && selectedShipDef && (selectedShipInstance.status === 'idle' || selectedShipInstance.status === 'mining') && (
        <ConsolePanel title={`${selectedShipInstance.name} — Commands`} icon={shipRoleIcon(selectedShipDef.role)} accent="cyan">

          {/* Mining action (for idle mining ships at valid mining locations) */}
          {selectedShipInstance.status === 'idle' && selectedShipDef.role === 'mining' && selectedShipDef.miningTargets && (() => {
            const currentLoc = selectedShipInstance.currentLocation;
            const canMineHere = canMineAtLocation(currentLoc);
            const locInfo = MINING_LOCATIONS[currentLoc];
            return (
              <div className="mb-3">
                {canMineHere ? (
                  <>
                    <p className="text-slate-400 text-xs mb-1">
                      Start Mining at {LOCATION_MAP.get(currentLoc)?.name || currentLoc}
                      {locInfo && <span className="text-amber-400 ml-1">({locInfo.multiplier}x output)</span>}
                    </p>
                    <p className="text-slate-500 text-[10px] mb-2">{locInfo?.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedShipDef.miningTargets.map(resId => (
                        <button
                          key={resId}
                          onClick={() => { playSound('build_start'); onStartMining(selectedShipInstance.instanceId, resId); selectShip(null); }}
                          className="inline-flex items-center justify-center gap-1 min-h-[38px] px-2.5 py-1 text-[10px] font-medium bg-amber-600/20 text-amber-400 border border-amber-600/30 rounded-lg hover:bg-amber-600/30 transition-colors"
                        >
                          <GameIcon name="ship-mining" size={11} /> Mine {resId.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-xs font-semibold mb-1">Cannot mine at {LOCATION_MAP.get(currentLoc)?.name || currentLoc}</p>
                    <p className="text-red-300/60 text-[10px] mb-2">Mining ships must be at a celestial body (Moon, Mars, asteroids, etc.). Send this ship to a mining location first.</p>
                    <p className="text-slate-500 text-[10px]">Valid locations: {Object.entries(MINING_LOCATIONS).map(([id, info]) => info.name).join(', ')}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Stop mining (for mining ships) */}
          {selectedShipInstance.status === 'mining' && (
            <button
              onClick={() => { onStopMining(selectedShipInstance.instanceId); selectShip(null); }}
              className="inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors mb-3"
            >
              Stop Mining
            </button>
          )}

          {/* Maintenance servicer status (damage-visibility wave 2026-08-31):
              a stationed servicer works passively — this block just tells the
              player it's working and what it will fix next month. */}
          {selectedShipInstance.status === 'idle' && selectedShipDef.role === 'maintenance' && (() => {
            const here = selectedShipInstance.currentLocation;
            const damagedHere = state.buildings.filter(b => b.isComplete && b.locationId === here && (b.damagePct || 0) > 0);
            return (
              <div className="mb-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-cyan-300 text-xs font-semibold mb-1">On-Orbit Servicing — active while stationed</p>
                {damagedHere.length > 0 ? (
                  <p className="text-cyan-300/70 text-[10px]">
                    {damagedHere.length} damaged structure{damagedHere.length !== 1 ? 's' : ''} at {LOCATION_MAP.get(here)?.name || here}. Each month this servicer repairs the most damaged one 2.5× faster than ground crews, paying in materials (a share of its construction resources) instead of cash.
                  </p>
                ) : selectedShipDef.autoRove ? (
                  <p className="text-cyan-300/70 text-[10px]">
                    Nothing to repair at {LOCATION_MAP.get(here)?.name || here}. This tender patrols autonomously — the moment any of your structures takes damage anywhere, it flies there and starts repairs (materials, not cash).
                  </p>
                ) : (
                  <p className="text-cyan-300/70 text-[10px]">
                    No damaged structures at {LOCATION_MAP.get(here)?.name || here} right now. Station it where your satellites live — when hazards hit, it repairs them automatically each month using materials instead of cash. (You can also dispatch it to any orbit from the map, or research Self-Healing Materials for the auto-roving Fleet Tender.)
                  </p>
                )}
              </div>
            );
          })()}

          {/* Survey action (for idle survey probes) */}
          {selectedShipInstance.status === 'idle' && selectedShipDef.role === 'survey' && onLaunchSurvey && (
            <div className="mb-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-purple-300 text-xs font-semibold mb-1">Launch Survey Expedition</p>
              <p className="text-purple-300/60 text-[10px] mb-2">Send this probe to any location to discover hidden resources, anomalies, and mining bonuses. The probe is consumed after the expedition.</p>
              <div className="flex flex-wrap gap-1.5">
                {state.unlockedLocations.map(locId => {
                  const loc = LOCATION_MAP.get(locId);
                  const duration = SURVEY_DURATION[locId] || 120;
                  return (
                    <button
                      key={locId}
                      onClick={() => { playSound('build_start'); onLaunchSurvey(selectedShipInstance.instanceId, locId); selectShip(null); }}
                      className="inline-flex items-center justify-center gap-1 min-h-[38px] px-2.5 py-1 text-[10px] font-medium bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-lg hover:bg-purple-600/30 transition-colors"
                    >
                      <GameIcon name="ship-survey" size={11} /> {loc?.name} ({formatDuration(duration)})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transport action (for idle ships) */}
          {selectedShipInstance.status === 'idle' && (() => {
            // Real effective transit speed — replicates the exact multiplier
            // the engine tick applies (see game-engine.ts), so the ETA shown
            // here matches when the ship actually arrives instead of the raw
            // unmodified travel time.
            const specBonuses = getSpecializationBonuses(state.specialization || { primary: null, secondary: null, respecCount: 0 });
            const wfBonuses = getWorkforceBonuses(state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 });
            const transitSpeedMult = Math.max(1,
              (1 + specBonuses.fleetSpeed)
              * (1 + wfBonuses.shipEfficiency)
              * getShipTransitSpeedMultiplier(state, selectedShipInstance.instanceId)
            );
            const isBoosted = transitSpeedMult > 1.001;

            // W14 (cargo logistics): manifest loading + Δv-priced fuel
            // quotes per destination. Effective capacity includes fitted
            // Extended Cargo Bays; validation is re-run by the dispatch
            // mutator, so these quotes are honest previews, not gates.
            const effectiveCapacity = getShipCargoCapacity(state, selectedShipInstance.instanceId);
            const loadUnits = getCargoLoadUnits(selectedShipDef.role, cargoManifest);
            const overCapacity = loadUnits > effectiveCapacity;

            return (
              <div className="space-y-3">
                {effectiveCapacity > 0 && (
                  <CargoLoader
                    state={state}
                    shipInstanceId={selectedShipInstance.instanceId}
                    cargo={cargoManifest}
                    onChange={setCargoManifest}
                  />
                )}
                <div>
                  <p className="text-slate-400 text-xs mb-2">
                    Send to location (loaded: {loadUnits}/{effectiveCapacity} units) — fuel priced by route Δv:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {state.unlockedLocations
                      .filter(locId => locId !== selectedShipInstance.currentLocation)
                      .map(locId => {
                        const loc = LOCATION_MAP.get(locId);
                        const rawTravelTime = getTravelTime(selectedShipInstance.currentLocation, locId);
                        const travelTime = rawTravelTime / transitSpeedMult;
                        const fuelCost = getFreightFuelCost(state, selectedShipInstance.instanceId, selectedShipInstance.currentLocation, locId, cargoManifest);
                        const canAffordFuel = state.money >= fuelCost;
                        const disabled = overCapacity || !canAffordFuel;
                        return (
                          <button
                            key={locId}
                            onClick={() => { playSound('build_start'); onStartTransport(selectedShipInstance.instanceId, locId, cargoManifest); selectShip(null); }}
                            disabled={disabled}
                            title={overCapacity ? 'Cargo exceeds capacity' : !canAffordFuel ? 'Insufficient funds for fuel' : undefined}
                            className={`inline-flex items-center justify-center min-h-[38px] px-2.5 py-1 text-[10px] font-medium rounded-lg transition-colors ${
                              disabled
                                ? 'bg-white/[0.04] text-slate-600 border border-white/[0.06] cursor-not-allowed'
                                : 'bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30'
                            }`}
                          >
                            <GameIcon name="fleet" size={11} className="mr-1" /> {loc?.name} ({formatDuration(travelTime)}{isBoosted && <span className="text-cyan-300 inline-flex items-center gap-0.5"> <GameIcon name="sparkle" size={10} /> boosted</span>}) · <GameIcon name="resource-hydrocarbon" size={11} className="mx-1" />{formatMoney(fuelCost)}
                          </button>
                        );
                      })}
                  </div>
                  {overCapacity && (
                    <p className="text-red-300 text-[10px] mt-1.5" role="alert">Cargo exceeds capacity — unload {Math.ceil(loadUnits - effectiveCapacity)} units to dispatch.</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Scrap ship (only idle ships) */}
          {selectedShipInstance.status === 'idle' && onScrapShip && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  const scrapValue = Math.round(selectedShipDef.baseCost * 0.3);
                  if (confirm(`Scrap ${selectedShipInstance.name} for ${formatMoney(scrapValue)}? (30% of build cost) This cannot be undone.`)) {
                    onScrapShip(selectedShipInstance.instanceId);
                    selectShip(null);
                  }
                }}
                className="w-full inline-flex items-center justify-center min-h-[44px] px-3 py-1.5 text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Scrap Ship (recover {formatMoney(Math.round(selectedShipDef.baseCost * 0.3))})
              </button>
            </div>
          )}
        </ConsolePanel>
      )}

      {/* Ships Under Construction */}
      {buildingShips.length > 0 && (
        <ConsolePanel title={`Under Construction (${buildingShips.length})`} icon="build" accent="amber">
          {buildingShips.map(ship => {
            const def = SHIP_MAP.get(ship.definitionId);
            const elapsed = ship.buildStartedAtMs ? (Date.now() - ship.buildStartedAtMs) / 1000 : 0;
            const remaining = (ship.buildDurationSeconds || 0) - elapsed;
            return (
              <div key={ship.instanceId} className="flex items-center justify-between text-xs mb-1">
                <span className="text-white flex items-center gap-1.5">
                  <GameIcon name={shipRoleIcon(def?.role || 'transport')} size={13} /> {ship.name}
                </span>
                <span className="text-amber-400 font-mono">{formatCountdown(Math.max(0, remaining))}</span>
              </div>
            );
          })}
        </ConsolePanel>
      )}

      {/* Shipyard Capacity */}
      <ConsolePanel
        title="Shipyard"
        icon="bld-launch-pad"
        right={
          <span className={`game-number text-xs ${canBuild ? 'text-cyan-400' : 'text-amber-400'}`}>
            {activeBuilds}/{shipyardSlots} slots
          </span>
        }
      >
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${canBuild ? 'bg-cyan-500' : 'bg-amber-500'}`} style={{ width: `${(activeBuilds / Math.max(1, shipyardSlots)) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {shipyardBreakdown.map(b => (
            <span key={b.label} className={`text-[10px] ${b.active ? 'text-cyan-400/70' : 'text-zinc-600'}`}>{b.label}</span>
          ))}
        </div>
      </ConsolePanel>

      {/* Build New Ships */}
      <ConsolePanel title="Build Ships" icon="build">
        {!canBuild && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 text-xs">Shipyard full — wait for a ship to finish before starting another.</p>
          </div>
        )}
        {availableShipDefs.length === 0 ? (
          <p className="text-slate-500 text-xs">Research new technologies to unlock ship construction.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {availableShipDefs.map(ship => {
              // E3.3: the Space Elevator's -15% launch-cost bonus is a real
              // discount on hull orders — price and affordability must show
              // the SAME number page.tsx will actually charge.
              const hullCost = applyLaunchCostReduction(ship.baseCost, state);
              const canAffordMoney = state.money >= hullCost;
              const hasResources = Object.entries(ship.resourceCost).every(
                ([resId, qty]) => (state.resources[resId] || 0) >= qty
              );
              const canBuildThis = canAffordMoney && hasResources && canBuild;

              return (
                <div key={ship.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] game-card">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="sprite-frame w-16 h-16 flex-shrink-0 flex items-center justify-center holo-sprite">
                      <Image
                        src={getShipAsset(ship.id)}
                        alt={`${ship.name} illustration`}
                        width={64}
                        height={64}
                        className="w-14 h-14 object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                      />
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-semibold">{ship.name}</h4>
                      <span className={`text-[10px] px-1 py-0.5 rounded ${
                        ship.role === 'mining' ? 'bg-amber-500/10 text-amber-400' :
                        ship.role === 'transport' ? 'bg-green-500/10 text-green-400' :
                        ship.role === 'tanker' ? 'bg-blue-500/10 text-blue-400' :
                        ship.role === 'maintenance' ? 'bg-cyan-500/10 text-cyan-400' :
                        'bg-purple-500/10 text-purple-400'
                      }`}>{ship.role}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[10px] mb-1">{ship.description}</p>

                  {/* Tooltip — expandable gameplay guidance */}
                  <details className="mb-2 group/tip">
                    <summary className="text-[10px] text-cyan-400/70 cursor-pointer hover:text-cyan-400 transition-colors select-none">
                      Why build this? ▾
                    </summary>
                    <div className="mt-1.5 p-2 rounded-md bg-cyan-500/5 border border-cyan-500/10 text-[10px] text-slate-300 leading-relaxed">
                      {ship.tooltip}
                    </div>
                  </details>

                  {/* Stats */}
                  <div className="flex gap-3 text-[10px] text-slate-400 mb-2 flex-wrap">
                    <span>Cargo: {ship.cargoCapacity}</span>
                    {ship.miningRate && <span>Mining: {ship.miningRate}/min</span>}
                    <span>Build: {formatDuration(ship.buildTimeSeconds)}</span>
                    {ship.maintenancePerMonth > 0 && <span>Maint: {formatMoney(ship.maintenancePerMonth)}/mo</span>}
                  </div>

                  {/* Deep stats — Phase I derived stats. Collapsed by default. */}
                  {(() => {
                    const s = getShipDerivedStats(ship);
                    return (
                      <details className="mb-2 group/deep">
                        <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none">
                          Detailed specs ▾
                        </summary>
                        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                          <span>Sublight: {s.sublightSpeed.toLocaleString()} m/s</span>
                          <span>Warp: {s.warpFactor.toFixed(1)}×</span>
                          <span>Fuel: {s.fuelCapacity} ({s.fuelBurnRate}/hr)</span>
                          <span>Δv: {s.deltaVBudget.toLocaleString()} m/s</span>
                          <span>Crew req: {s.crewRequired} (cap {s.crewCapacity})</span>
                          <span>Life sup: {s.lifeSupportDays}d</span>
                          <span>Hull: {s.hullIntegrity}</span>
                          <span>Shield: {Math.round(s.shieldingRating * 100)}%</span>
                          {s.surveyRange > 0 && <span>Survey: {s.surveyRange.toFixed(1)} AU ({Math.round(s.surveyAccuracy * 100)}%)</span>}
                          <span>Stealth sig: {s.stealthSignature.toFixed(2)}</span>
                          <span>MTBF: {s.mtbfHours.toLocaleString()}h</span>
                          <span>Modules: {s.moduleSlots} ({s.hardpointTypes.join('/')})</span>
                        </div>
                      </details>
                    );
                  })()}

                  {/* Resource costs */}
                  {Object.keys(ship.resourceCost).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Object.entries(ship.resourceCost).map(([resId, qty]) => {
                        const have = state.resources[resId] || 0;
                        return (
                          <span key={resId} className={`text-[10px] px-1 py-0.5 rounded border ${
                            have >= qty ? 'text-slate-400 border-white/[0.06]' : 'text-red-400 border-red-500/20'
                          }`}>{resId.replace(/_/g, ' ')} {have}/{qty}</span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${canAffordMoney ? 'text-green-400' : 'text-red-400'}`}>
                      {formatMoney(hullCost)}
                      {hullCost !== ship.baseCost && (
                        <span className="ml-1 text-[10px] text-cyan-300/80">(mega-project discount)</span>
                      )}
                    </span>
                    <button
                      onClick={() => { playSound('build_start'); onBuildShip(ship.id, selectedShipyard); }}
                      disabled={!canBuildThis}
                      title={!canBuild ? 'Shipyard full' : !canAffordMoney ? 'Insufficient funds' : !hasResources ? 'Missing resources' : undefined}
                      className={`inline-flex items-center justify-center min-h-[38px] px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                        canBuildThis
                          ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                          : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {!canBuild ? 'Yard Full' : 'Build'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ConsolePanel>
    </div>
  );
}
