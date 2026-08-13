'use client';

// ─── Build Panel ────────────────────────────────────────────────────────────
// Extracted from space-tycoon/page.tsx (Wave 9 map-first overhaul) so the
// map command center's "Build here" action can reuse the exact same
// building-selection/construction logic instead of forking it. Behavior is
// unchanged from the original inline version; the only additions are
// `initialLocationId` (pre-target a location) and `lockLocation` (hide the
// location switcher when embedded in the map context panel, where the
// location is already implied by what the player selected on the map).

import { useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney, formatDuration, scaledBuildingCost } from '@/lib/game/formulas';
import { BUILDINGS, BUILDING_MAP, scaledBuildTime, getBuildingDerivedStats } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { getBuildingAsset, LOCATION_ASSETS } from '@/lib/game/assets';
import { getConstructionSlots, getActiveConstructions, canStartConstruction } from '@/lib/game/construction-slots';
import Image from 'next/image';

interface BuildPanelProps {
  state: GameState;
  onBuild: (buildingId: string, locationId: string) => void;
  onSellBuilding?: (instanceId: string) => void;
  /** Pre-select this location instead of the first unlocked one. Used by the
   *  map command center's "Build here" action. */
  initialLocationId?: string;
  /** Hide the location switcher row — the location is already implied by the
   *  context the panel is embedded in (map context panel). */
  lockLocation?: boolean;
}

export default function BuildPanel({ state, onBuild, onSellBuilding, initialLocationId, lockLocation }: BuildPanelProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocationId || state.unlockedLocations[0] || 'earth_surface');
  const totalSlots = getConstructionSlots(state);
  const activeBuilds = getActiveConstructions(state);
  const slotsAvailable = canStartConstruction(state);

  const availableBuildings = BUILDINGS.filter(b => {
    if (b.requiredLocation !== selectedLocation) return false;
    if (!b.requiredResearch.every(r => state.completedResearch.includes(r))) return false;
    return true;
  });

  const countAtLocation = (defId: string) => state.buildings.filter(b => b.definitionId === defId && b.locationId === selectedLocation).length;

  return (
    <div className="space-y-4">
      {/* Construction Slots indicator */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Construction Queues</span>
          <div className="flex gap-1">
            {Array.from({ length: totalSlots }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-2 rounded-sm transition-colors"
                style={{ background: i < activeBuilds ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
                title={i < activeBuilds ? 'Active build' : 'Open slot'}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono" style={{ color: activeBuilds >= totalSlots ? '#FFB302' : 'var(--text-tertiary)' }}>
            {activeBuilds}/{totalSlots}
          </span>
        </div>
        {!slotsAvailable && (
          <span className="text-[9px] font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(255,179,2,0.1)', color: '#FFB302', border: '1px solid rgba(255,179,2,0.2)' }}>
            QUEUE FULL — wait for a build to finish
          </span>
        )}
        {totalSlots < 5 && slotsAvailable && (
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            Research to unlock more slots
          </span>
        )}
      </div>

      {/* Location Selector — shows building count per location. Hidden when
          lockLocation is set (the map context panel already told us where). */}
      {!lockLocation && (
        <div>
          <p className="text-slate-500 text-[10px] mb-1.5">Select a location to see available buildings:</p>
          <div className="flex flex-wrap gap-2">
            {state.unlockedLocations.map(locId => {
              const loc = LOCATION_MAP.get(locId);
              const buildableCount = BUILDINGS.filter(b =>
                b.requiredLocation === locId &&
                b.requiredResearch.every(r => state.completedResearch.includes(r))
              ).length;
              return (
                <button
                  key={locId}
                  onClick={() => setSelectedLocation(locId)}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors overflow-hidden ${
                    selectedLocation === locId
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                >
                  {LOCATION_ASSETS[locId] && (
                    <Image src={LOCATION_ASSETS[locId]} alt="" width={80} height={40} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
                  )}
                  <span className="relative">{loc?.name || locId}</span>
                  {buildableCount > 0 && (
                    <span className={`relative ml-1.5 px-1 py-0.5 rounded text-[9px] ${
                      selectedLocation === locId ? 'bg-white/20' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>{buildableCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Building Cards */}
      {availableBuildings.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-slate-500 text-sm">No buildings available at this location yet.</p>
          <p className="text-slate-600 text-xs mt-1">Research new technologies or try a different location above.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {availableBuildings.map(bld => {
            const count = countAtLocation(bld.id);
            const cost = scaledBuildingCost(bld.baseCost, count);
            const canAffordMoney = state.money >= cost;
            const hasResources = !bld.resourceCost || Object.entries(bld.resourceCost).every(
              ([resId, qty]) => (state.resources[resId] || 0) >= qty
            );
            const canAfford = canAffordMoney && hasResources && slotsAvailable;

            return (
              <div key={bld.id} className={`rounded-xl border overflow-hidden transition-all game-card ${
                canAfford ? 'border-cyan-500/20 hover:border-cyan-500/40' : 'border-white/[0.06]'
              }`}>
                {/* Building art — brighter, with hologram scanline for AAA feel */}
                <div className="relative h-24 sm:h-28 bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden holo-sprite">
                  <Image
                    src={getBuildingAsset(bld.id, bld.category, bld.tier)}
                    alt={bld.name}
                    width={320}
                    height={112}
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <div className="flex justify-between items-end gap-2">
                      <h4 className="text-white text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{bld.name}</h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold backdrop-blur-sm shrink-0 game-badge-t${Math.min(5, Math.max(1, bld.tier))}`}>T{bld.tier}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                <p className="text-slate-400 text-[11px] mb-1 leading-relaxed">{bld.description}</p>
                {/* Strategy tooltip */}
                {bld.tooltip && (
                  <details className="mb-2 group/tip">
                    <summary className="text-[9px] text-cyan-400/70 cursor-pointer hover:text-cyan-400 transition-colors select-none">
                      Why build this? ▾
                    </summary>
                    <div className="mt-1 p-2 rounded-md bg-cyan-500/5 border border-cyan-500/10 text-[10px] text-slate-300 leading-relaxed">
                      {bld.tooltip}
                    </div>
                  </details>
                )}

                {/* Deep stats — Phase I derived stats */}
                {(() => {
                  const s = getBuildingDerivedStats(bld);
                  const rows: Array<[string, string]> = [];
                  if (s.customerCapacity > 0)          rows.push(['Customer cap', s.customerCapacity.toLocaleString()]);
                  if (s.uplinkBandwidth > 0)           rows.push(['Uplink', `${s.uplinkBandwidth.toLocaleString()} Gbps`]);
                  if (s.manufacturingThroughput > 0)   rows.push(['Mfg tput', `${s.manufacturingThroughput}/mo`]);
                  if (s.refiningThroughput > 0)        rows.push(['Refining', `${s.refiningThroughput}/mo`]);
                  if (s.storageCapacity > 0)           rows.push(['Storage', `${s.storageCapacity.toLocaleString()} m³`]);
                  if (s.dockingCapacity > 0)           rows.push(['Docking', `${s.dockingCapacity} ships`]);
                  if (s.crewQuarters > 0)              rows.push(['Crew qtrs', s.crewQuarters.toString()]);
                  rows.push(['Structure', s.structuralIntegrity.toLocaleString()]);
                  if (s.shieldingRating > 0)           rows.push(['Shield', `${Math.round(s.shieldingRating * 100)}%`]);
                  rows.push(['Max upgrade', `L${s.maxUpgradeLevel}`]);
                  if (s.synergyTags.length > 0)        rows.push(['Synergy', `${s.synergyTags.join(', ')} (${s.synergyRange})`]);
                  return (
                    <details className="mb-2 group/deep">
                      <summary className="text-[9px] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none">
                        Detailed specs ▾
                      </summary>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] text-slate-400">
                        {rows.map(([k, v]) => <span key={k}>{k}: <span className="text-slate-300">{v}</span></span>)}
                      </div>
                    </details>
                  );
                })()}
                {/* Revenue preview */}
                {bld.enabledServices.length > 0 && (() => {
                  const svc = SERVICE_MAP.get(bld.enabledServices[0]);
                  if (!svc) return null;
                  const net = svc.revenuePerMonth - svc.operatingCostPerMonth - bld.maintenanceCostPerMonth;
                  return (
                    <div className="flex items-center gap-1 mb-2 text-[10px]">
                      <span className="text-green-400/70">Earns {formatMoney(svc.revenuePerMonth)}/mo</span>
                      <span className="text-slate-600">→</span>
                      <span className={net >= 0 ? 'text-green-400' : 'text-red-400'}>
                        Net {formatMoney(net)}/mo
                      </span>
                    </div>
                  );
                })()}
                {bld.enabledServices.length === 0 && (
                  <p className="text-slate-600 text-[10px] mb-2">Support building — no direct revenue</p>
                )}
                {/* Resource costs */}
                {bld.resourceCost && Object.keys(bld.resourceCost).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(bld.resourceCost).map(([resId, qty]) => {
                      const have = state.resources[resId] || 0;
                      const enough = have >= qty;
                      return (
                        <span key={resId} className={`group relative text-[9px] px-1.5 py-0.5 rounded border cursor-help ${
                          enough ? 'text-slate-400 border-white/[0.06] bg-white/[0.02]' : 'text-red-400 border-red-500/20 bg-red-500/5'
                        }`}>
                          {resId.replace(/_/g, ' ')} {have}/{qty}
                          {/* Resource acquisition tooltip */}
                          {!enough && (
                            <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2.5 rounded-lg bg-[#0a0a14]/95 border border-cyan-500/20 shadow-lg shadow-black/50 text-[10px] leading-relaxed text-left pointer-events-none">
                              <span className="block text-cyan-400 font-semibold mb-1">How to get {resId.replace(/_/g, ' ')}:</span>
                              {(resId === 'iron' || resId === 'aluminum' || resId === 'titanium') ? (
                                <span className="block text-slate-300">Build a <span className="text-amber-300">Mining Outpost</span> on the Lunar Surface and activate the <span className="text-amber-300">Lunar Mining</span> service. Resources will accumulate over time. Once you have resources, the <span className="text-cyan-300">Market tab</span> will unlock for buying &amp; selling.</span>
                              ) : (resId === 'lunar_water' || resId === 'mars_water') ? (
                                <span className="block text-slate-300">Water is mined from the <span className="text-amber-300">Lunar Surface</span> or <span className="text-amber-300">Mars Surface</span>. Build mining infrastructure and activate mining services at those locations.</span>
                              ) : (resId === 'rare_earth' || resId === 'platinum_group' || resId === 'gold') ? (
                                <span className="block text-slate-300">Rare materials require <span className="text-amber-300">Asteroid Belt</span> mining operations. Unlock the Asteroid Belt location, build mining facilities, and activate the asteroid mining service.</span>
                              ) : (
                                <span className="block text-slate-300">This resource is produced by <span className="text-amber-300">mining services</span>. Build mining facilities at the appropriate location, then activate the mining service. Check the <span className="text-cyan-300">Map tab</span> to see which locations yield this resource.</span>
                              )}
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0a0a14]/95 border-b border-r border-cyan-500/20 rotate-45"></span>
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className={canAffordMoney ? 'text-green-400' : 'text-red-400'}>{formatMoney(cost)}</span>
                    <span className="text-slate-500 ml-2">{formatDuration(scaledBuildTime(bld.realBuildSeconds, count))}</span>
                  </div>
                  {!slotsAvailable && canAffordMoney && hasResources ? (
                    <span className="px-3 py-1 rounded text-[10px] font-medium" style={{ background: 'rgba(255,179,2,0.1)', color: '#FFB302', border: '1px solid rgba(255,179,2,0.2)' }}>
                      Queue Full
                    </span>
                  ) : (
                    <button
                      onClick={() => onBuild(bld.id, selectedLocation)}
                      disabled={!canAfford}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        canAfford
                          ? 'bg-cyan-600 text-white hover:bg-cyan-500 active:scale-95'
                          : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Build
                    </button>
                  )}
                </div>
                {count > 0 && <p className="text-slate-500 text-[10px] mt-1">Built: {count}</p>}
                </div>{/* close relative wrapper */}
              </div>
            );
          })}
        </div>
      )}

      {/* Built structures at this location — with sell option */}
      {(() => {
        const builtHere = state.buildings.filter(b => b.isComplete && b.locationId === selectedLocation);
        if (builtHere.length === 0) return null;
        return (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Built at {LOCATION_MAP.get(selectedLocation)?.name || selectedLocation}</h4>
            <div className="space-y-1">
              {builtHere.map(bld => {
                const def = BUILDING_MAP.get(bld.definitionId);
                if (!def) return null;
                const sellPrice = Math.round(def.baseCost * 0.4);
                return (
                  <div key={bld.instanceId} className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/[0.02]">
                    <span className="text-white text-xs">{def.name}</span>
                    {onSellBuilding && (
                      <button
                        onClick={() => { if (confirm(`Sell ${def.name} for ${formatMoney(sellPrice)}? (40% of build cost)`)) onSellBuilding(bld.instanceId); }}
                        className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                      >
                        Sell ({formatMoney(sellPrice)})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
