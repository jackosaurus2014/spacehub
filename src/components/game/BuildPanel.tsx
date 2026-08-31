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
import { BUILDINGS, BUILDING_MAP, scaledBuildTime, getBuildingDerivedStats, checkBuildingCap } from '@/lib/game/buildings';
import { SERVICE_MAP } from '@/lib/game/services';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { getBuildingAsset, LOCATION_ASSETS } from '@/lib/game/assets';
import { getConstructionSlots, getActiveConstructions, canStartConstruction } from '@/lib/game/construction-slots';
// Balance Pass 4 (docs/BALANCE.md "Pass 4"): saturated orbital-slot pools
// block new builds without a lease — the build cards surface the reason.
import { checkOrbitalSlotGate } from '@/lib/game/spatial-strategy';
import { calculateRushRepairCost } from '@/lib/game/hazards';
// Wave E3 (docs/ECONOMY_PVP_2026-08.md §E3): recipe display + per-building
// supply efficiency + the vertical-integration-vs-market sourcing toggle.
import { describeRecipeLine, getBuildingConsumptionEfficiency, hasRecipe } from '@/lib/game/consumption';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
// Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5, "the exit
// decision"): mothball (pause, reversible) and decommission (scrap for
// partial recovery, irreversible) previews + status.
import {
  computeDecommissionRecovery,
  isBuildingMothballed,
  isBuildingReactivating,
  isBuildingDecommissioning,
  isBuildingOperational,
  MOTHBALL_MAINTENANCE_FRACTION,
  DECOMMISSION_MONEY_RECOVERY_FRACTION,
  DECOMMISSION_RESOURCE_RECOVERY_FRACTION,
  DECOMMISSION_TEARDOWN_MIN_TIER,
  DECOMMISSION_TEARDOWN_MONTHS,
  REACTIVATION_SPINUP_MONTHS,
  REACTIVATION_FEE_FRACTION,
} from '@/lib/game/mothball';
// M1 (docs/MEANINGFUL_2026-08.md §5 M1.4, finding F9): the authored tooltip
// payback claims below predate demand pools (E4) and input consumption (E3)
// and drifted far from reality (Heavy Launch Pad's tooltip claimed "~23
// months" while the real pre-M1 number was 2,979 months). computeBuildPreview
// replaces reliance on that static prose with a live number derived from the
// SAME formulas the tick uses — the spec's preferred fix ("replaced by a live
// P&L preview — better").
import { computeBuildPreview } from '@/lib/game/build-preview';
// Construction Purposes wave (docs/CONSTRUCTION_PURPOSES_2026-08.md): every
// capability is a real modifier into an existing formula (hazard mitigation,
// shock buffering, freight fuel, detection, training, away efficiency,
// expeditions, diplomacy, research, crew capacity, shipyard slots). The
// chips below surface them with a HoloTip explaining the exact mechanic.
import { getCapabilityChipsForDefinition, summarizeCapabilities } from '@/lib/game/building-capabilities';
import { resourceCategoryIcon, type IconName } from '@/lib/game/icons';
import Image from 'next/image';
import { ConsolePanel } from './chrome';
import GameIcon from './GameIcon';
import HoloTip, { Concept } from './HoloTip';

/** Compact "consumes → produces" chip row for a building recipe. */
function RecipeChips({ consumes, produces }: { consumes?: Record<string, number>; produces?: Record<string, number> }) {
  if (!consumes && !produces) return null;
  const chip = (resourceId: string, perMonth: number, kind: 'in' | 'out') => {
    const def = RESOURCE_MAP.get(resourceId as ResourceId);
    const qty = perMonth < 1 ? perMonth.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : String(perMonth);
    return (
      <span
        key={`${kind}-${resourceId}`}
        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
          kind === 'in'
            ? 'text-amber-300/90 border-amber-500/20 bg-amber-500/5'
            : 'text-emerald-300/90 border-emerald-500/20 bg-emerald-500/5'
        }`}
        title={`${def?.name || resourceId}: ${qty}/mo ${kind === 'in' ? 'consumed' : 'produced'}`}
      >
        <GameIcon name={resourceCategoryIcon(def?.category || 'generic')} size={10} />
        {qty} {def?.name || resourceId.replace(/_/g, ' ')}
      </span>
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-1 mb-2">
      <HoloTip
        content={{
          title: 'Building Recipe',
          icon: 'package',
          body: (
            <p>
              Drawn from this building&apos;s location inventory every game month. Shortfall lowers{' '}
              <Concept id="supply-efficiency">supply efficiency</Concept> toward the 50% floor — cover it
              locally or with a <Concept id="standing-order">standing market order</Concept>.
            </p>
          ),
        }}
      >
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Recipe/mo</span>
      </HoloTip>
      {describeRecipeLine(consumes).map(r => chip(r.resourceId, r.perMonth, 'in'))}
      {produces && Object.keys(produces).length > 0 && <span className="text-slate-600 text-[10px]">→</span>}
      {describeRecipeLine(produces).map(r => chip(r.resourceId, r.perMonth, 'out'))}
    </div>
  );
}

/** Construction Purposes wave: purpose chips — the building's non-revenue
 *  roles, each backed by a real formula (HoloTip explains which + the cap). */
function PurposeChips({ definitionId }: { definitionId: string }) {
  const chips = getCapabilityChipsForDefinition(definitionId);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 mb-2">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">Purpose</span>
      {chips.map(chip => (
        <HoloTip
          key={chip.key}
          underline={false}
          content={{
            title: chip.label,
            icon: chip.icon as IconName,
            body: <p>{chip.describe(chip.value)}</p>,
            source: chip.source,
          }}
        >
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border text-violet-300/90 border-violet-500/20 bg-violet-500/5 cursor-help">
            <GameIcon name={chip.icon as IconName} size={10} />
            {chip.key === 'crewQuarters' || chip.key === 'shipyardSlots'
              ? `${chip.label} +${Math.round(chip.value)}`
              : `${chip.label} +${Math.round(chip.value * 100)}%`}
          </span>
        </HoloTip>
      ))}
    </div>
  );
}

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
  /** Instantly heals all current hazard damage on a built structure for
   *  calculateRushRepairCost(damagePct, baseCost) money. Rush Repair button
   *  only renders when this is provided. */
  onRushRepairBuilding?: (instanceId: string) => void;
  /** Wave E3: set a built structure's input-sourcing policy ('local' =
   *  vertical integration, run degraded when short; 'market' = standing buy
   *  orders on the shared book). Toggle only renders when provided. */
  onSetSupplyPolicy?: (instanceId: string, policy: 'local' | 'market') => void;
  /** Wave M2: pause a completed, fully-active building (zero revenue, zero
   *  consumption, 25% maintenance). Mothball toggle only renders when
   *  provided. */
  onMothballBuilding?: (instanceId: string) => void;
  /** Wave M2: begin spinning a mothballed building back up (charges a small
   *  fee, 1-game-month delay). Reactivate button only renders when provided. */
  onReactivateBuilding?: (instanceId: string) => void;
}

export default function BuildPanel({ state, onBuild, onSellBuilding, initialLocationId, lockLocation, onRushRepairBuilding, onSetSupplyPolicy, onMothballBuilding, onReactivateBuilding }: BuildPanelProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocationId || state.unlockedLocations[0] || 'earth_surface');
  const totalSlots = getConstructionSlots(state);
  const activeBuilds = getActiveConstructions(state);
  const slotsAvailable = canStartConstruction(state);
  // Balance Pass 4 (docs/BALANCE.md "Pass 4"): orbital-slot gate — a
  // saturated pool (E7 requiresLeaseAuction) blocks NEW builds at this
  // location unless the player holds a slot lease (or the Frontier
  // first-building exemption applies). Mirrors handleBuild's check exactly.
  const slotGate = checkOrbitalSlotGate(state, selectedLocation);

  const availableBuildings = BUILDINGS.filter(b => {
    if (b.requiredLocation !== selectedLocation) return false;
    if (!b.requiredResearch.every(r => state.completedResearch.includes(r))) return false;
    return true;
  });

  const countAtLocation = (defId: string) => state.buildings.filter(b => b.definitionId === defId && b.locationId === selectedLocation).length;

  return (
    <div className="space-y-4">
      <ConsolePanel
        title="Construction"
        icon="build"
        subtitle="Queue new buildings, monitor active construction slots and pick a location."
        right={
          <div className="flex items-center gap-2">
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: totalSlots }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-2 rounded-sm transition-colors"
                  style={{ background: i < activeBuilds ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
                  title={i < activeBuilds ? 'Active build' : 'Open slot'}
                />
              ))}
            </div>
            <span className="game-number text-[11px]" style={{ color: activeBuilds >= totalSlots ? '#FFB302' : 'var(--text-tertiary)' }}>
              {activeBuilds}/{totalSlots} slots
            </span>
          </div>
        }
      >
        {!slotsAvailable && (
          <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(255,179,2,0.1)', color: '#FFB302', border: '1px solid rgba(255,179,2,0.2)' }}>
            QUEUE FULL — wait for a build to finish
          </span>
        )}
        {totalSlots < 5 && slotsAvailable && (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Research to unlock more slots
          </span>
        )}

        {/* Location Selector — shows building count per location. Hidden when
            lockLocation is set (the map context panel already told us where). */}
        {!lockLocation && (
          <div className="mt-3">
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
                      <Image src={LOCATION_ASSETS[locId]} alt="" width={80} height={40} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" loading="lazy" />
                    )}
                    <span className="relative">{loc?.name || locId}</span>
                    {buildableCount > 0 && (
                      <span className={`relative ml-1.5 px-1 py-0.5 rounded text-[10px] ${
                        selectedLocation === locId ? 'bg-white/20' : 'bg-cyan-500/20 text-cyan-400'
                      }`}>{buildableCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </ConsolePanel>

      {/* Balance Pass 4: slot-gate notice — the whole location is
          lease-gated, so say it once above the cards (each card's button
          also carries the reason). */}
      {!slotGate.allowed && availableBuildings.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-2.5 text-[11px] text-amber-300 leading-relaxed">
          <span className="font-bold uppercase tracking-wide">Slots saturated</span>
          <span className="text-amber-200/80"> — {slotGate.reason}</span>
        </div>
      )}
      {slotGate.allowed && slotGate.viaLease && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] p-2 text-[10px] text-emerald-300">
          Slot lease active at this location — new builds permitted while it holds.
        </div>
      )}
      {slotGate.allowed && slotGate.viaFrontierExemption && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] p-2 text-[10px] text-cyan-300">
          Frontier exemption: this pool is saturated, but your FIRST building here is guaranteed a slot. Further builds will need a lease auction.
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
            // Early-fab wave: per-corporation cap (fabrication_earth max 1).
            const capCheck = checkBuildingCap(state.buildings, bld);
            const canAfford = canAffordMoney && hasResources && slotsAvailable && slotGate.allowed && capCheck.allowed;

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
                {/* M1/F9: live P&L preview — computed from the same
                    formulas the tick uses (pool multiplier, saturation,
                    power, recipe cost, marginal overhead), NOT the static
                    authored tooltip prose below. Always visible (not
                    collapsed) since this is the number that matters. */}
                {(() => {
                  const preview = computeBuildPreview(state, bld, selectedLocation);
                  const positive = preview.projectedNetMonthly > 0;
                  return (
                    <div className={`mb-2 p-2 rounded-md border text-[10px] leading-relaxed ${
                      positive ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-red-500/5 border-red-500/15'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-semibold ${positive ? 'text-emerald-300' : 'text-red-300'}`}>
                          Projected {formatMoney(preview.projectedNetMonthly)}/mo net
                        </span>
                        <span className="text-slate-400">
                          {preview.paybackMonths === null ? 'payback: never' : `payback: ~${preview.paybackMonths}mo`}
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-500">
                        {preview.poolMultiplier !== null && (
                          <>pool {preview.poolMultiplier < 1 ? 'saturated' : preview.poolMultiplier > 1 ? 'undersupplied' : 'balanced'} ({preview.poolMultiplier.toFixed(2)}x) · </>
                        )}
                        at current pools, before research/commander bonuses — recomputed live, not a fixed promise.
                      </div>
                      {/* Construction Purposes wave: the projection is P&L-only —
                          name the non-revenue value qualitatively so a thin
                          payback doesn't read as "worthless building". */}
                      {(() => {
                        const capSummary = summarizeCapabilities(bld.id);
                        return capSummary ? (
                          <div className="mt-0.5 text-violet-300/70">
                            beyond P&amp;L: {capSummary}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  );
                })()}
                {!capCheck.allowed && (
                  <p className="mb-2 text-[10px] text-amber-400/90 bg-amber-500/5 border border-amber-500/15 rounded px-2 py-1">
                    ⛔ {capCheck.reason} — expand off-world instead.
                  </p>
                )}
                <PurposeChips definitionId={bld.id} />
                {/* Strategy tooltip — flavor/context only; economics claims in
                    the prose above (if any) predate E3/E4 and are NOT
                    authoritative. The live preview above is the honest number. */}
                {bld.tooltip && (
                  <details className="mb-2 group/tip">
                    <summary className="text-[10px] text-cyan-400/70 cursor-pointer hover:text-cyan-400 transition-colors select-none">
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
                      <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none">
                        Detailed specs ▾
                      </summary>
                      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
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
                {bld.enabledServices.length === 0 && !bld.producesPerMonth && (
                  <p className="text-slate-600 text-[10px] mb-2">Support building — no direct revenue</p>
                )}
                {/* Wave E3: recipe (consumes → produces) chips */}
                <RecipeChips consumes={bld.consumesPerMonth} produces={bld.producesPerMonth} />
                {bld.producesPerMonth && bld.enabledServices.length === 0 && (
                  <p className="text-emerald-400/70 text-[10px] mb-2">Producer building — passive monthly output, no service revenue</p>
                )}
                {/* Resource costs */}
                {bld.resourceCost && Object.keys(bld.resourceCost).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(bld.resourceCost).map(([resId, qty]) => {
                      const have = state.resources[resId] || 0;
                      const enough = have >= qty;
                      return (
                        <span key={resId} className={`group relative text-[10px] px-1.5 py-0.5 rounded border cursor-help ${
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
                  {!slotGate.allowed ? (
                    /* Balance Pass 4: saturated pool — the Build button is
                       replaced by the gate reason (win a lease auction). */
                    <span
                      className="px-3 py-1 rounded text-[10px] font-medium"
                      style={{ background: 'rgba(255,179,2,0.1)', color: '#FFB302', border: '1px solid rgba(255,179,2,0.2)' }}
                      title={slotGate.reason}
                    >
                      Slots Saturated — Lease Required
                    </span>
                  ) : !slotsAvailable && canAffordMoney && hasResources ? (
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
                const hasDamage = !!bld.damagePct && bld.damagePct > 0;
                const isSevere = !!bld.damagePct && bld.damagePct >= 0.5;
                const repairCost = calculateRushRepairCost(bld.damagePct, def.baseCost);
                // Wave E3: supply efficiency + sourcing policy for recipe buildings
                const recipeActive = hasRecipe(def) && !!def.consumesPerMonth;
                const supplyEff = getBuildingConsumptionEfficiency(state, bld.instanceId);
                const isShort = (state.consumptionState?.shortfallResources?.[bld.instanceId] || []).length > 0;
                const policy = bld.supplyPolicy || 'local';
                // Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5): the
                // exit decision — mothball (reversible pause) vs decommission
                // (irreversible scrap for partial recovery).
                const operational = isBuildingOperational(bld);
                const mothballed = isBuildingMothballed(bld);
                const reactivating = isBuildingReactivating(bld);
                const decommissioning = isBuildingDecommissioning(bld);
                const recovery = computeDecommissionRecovery(def);
                const resourceRecoveryText = Object.entries(recovery.resources)
                  .map(([resId, qty]) => `${qty} ${(RESOURCE_MAP.get(resId as ResourceId)?.name || resId.replace(/_/g, ' '))}`)
                  .join(', ') || 'no materials';
                const isTeardown = def.tier >= DECOMMISSION_TEARDOWN_MIN_TIER;
                const reactivationFee = Math.round(def.baseCost * REACTIVATION_FEE_FRACTION);
                return (
                  <div key={bld.instanceId} className="py-1 px-2 rounded hover:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs">{def.name}</span>
                      <div className="flex items-center gap-1.5">
                        {recipeActive && operational && (
                          <HoloTip
                            underline={false}
                            content={{
                              title: 'Supply Efficiency',
                              icon: 'activity',
                              body: (
                                <p>
                                  Last month this facility ran at {Math.round(supplyEff * 100)}% —{' '}
                                  <Concept id="supply-efficiency">supply efficiency</Concept> scales revenue and
                                  output down to a 50% floor when recipe inputs run short.
                                  {isShort && (
                                    <> Short on: {(state.consumptionState?.shortfallResources?.[bld.instanceId] || []).map(r => r.replace(/_/g, ' ')).join(', ')}.</>
                                  )}
                                </p>
                              ),
                            }}
                          >
                            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold cursor-help ${
                              isShort
                                ? (supplyEff <= 0.55 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30')
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}>
                              <GameIcon name="package" size={10} /> {Math.round(supplyEff * 100)}%{isShort ? ' SHORT' : ''}
                            </span>
                          </HoloTip>
                        )}
                        {hasDamage && (
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${
                            isSevere
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            <GameIcon name="warning" size={10} /> {Math.round((bld.damagePct || 0) * 100)}% dmg
                          </span>
                        )}
                        {/* Wave M2: operating-status badge — mothballed / spinning up / tearing down */}
                        {!operational && (
                          <HoloTip
                            underline={false}
                            content={{
                              title: mothballed ? 'Mothballed' : reactivating ? 'Reactivating' : 'Decommissioning',
                              icon: mothballed || reactivating ? 'idle' : 'wrench',
                              body: mothballed ? (
                                <p>
                                  Paused: zero revenue, zero recipe consumption, maintenance cut to {Math.round(MOTHBALL_MAINTENANCE_FRACTION * 100)}%.
                                  Reactivate any time — a <Concept id="mothball">{REACTIVATION_SPINUP_MONTHS}-game-month spin-up</Concept> applies.
                                </p>
                              ) : reactivating ? (
                                <p>Spinning back up — back to full revenue and consumption in {REACTIVATION_SPINUP_MONTHS} game month{REACTIVATION_SPINUP_MONTHS === 1 ? '' : 's'}.</p>
                              ) : (
                                <p>
                                  <Concept id="decommission">Teardown</Concept> underway ({DECOMMISSION_TEARDOWN_MONTHS} game month) — paused
                                  meanwhile. Recovery credits automatically on completion.
                                </p>
                              ),
                            }}
                          >
                            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-semibold cursor-help ${
                              mothballed
                                ? 'bg-slate-500/10 text-slate-300 border-slate-500/30'
                                : reactivating
                                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                  : 'bg-orange-500/10 text-orange-300 border-orange-500/30'
                            }`}>
                              <GameIcon name={mothballed || reactivating ? 'idle' : 'wrench'} size={10} />
                              {mothballed ? 'MOTHBALLED' : reactivating ? 'REACTIVATING' : 'DECOMMISSIONING'}
                            </span>
                          </HoloTip>
                        )}
                        {onSellBuilding && !decommissioning && (
                          <button
                            onClick={() => {
                              const confirmMsg = isTeardown
                                ? `Decommission ${def.name}? Teardown takes ${DECOMMISSION_TEARDOWN_MONTHS} game month, paused meanwhile. Recovers ${formatMoney(recovery.money)} (${Math.round(DECOMMISSION_MONEY_RECOVERY_FRACTION * 100)}% of build cost) + ${resourceRecoveryText} (${Math.round(DECOMMISSION_RESOURCE_RECOVERY_FRACTION * 100)}% of materials) on completion.`
                                : `Scrap ${def.name}? Recovers ${formatMoney(recovery.money)} (${Math.round(DECOMMISSION_MONEY_RECOVERY_FRACTION * 100)}% of build cost) + ${resourceRecoveryText} (${Math.round(DECOMMISSION_RESOURCE_RECOVERY_FRACTION * 100)}% of materials) instantly.`;
                              if (confirm(confirmMsg)) onSellBuilding(bld.instanceId);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                          >
                            {isTeardown ? 'Decommission' : 'Scrap'} ({formatMoney(recovery.money)})
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Wave M2: mothball toggle — reversible pause, distinct from
                        the irreversible Scrap/Decommission action above. */}
                    {(onMothballBuilding || onReactivateBuilding) && (mothballed || operational) && (
                      <div className="mt-1">
                        {mothballed && onReactivateBuilding ? (
                          <HoloTip
                            content={{
                              title: 'Reactivate',
                              icon: 'idle',
                              body: (
                                <p>
                                  Pay a one-time spin-up fee ({formatMoney(reactivationFee)}, {Math.round(REACTIVATION_FEE_FRACTION * 100)}% of build cost)
                                  to start bringing this facility back online. Full revenue and consumption resume
                                  after a <Concept id="mothball">{REACTIVATION_SPINUP_MONTHS}-game-month</Concept> spin-up.
                                </p>
                              ),
                            }}
                          >
                            <button
                              onClick={() => onReactivateBuilding(bld.instanceId)}
                              disabled={state.money < reactivationFee}
                              className={`w-full min-h-[28px] text-[10px] px-2 py-1 rounded border transition-colors flex items-center justify-center gap-1 ${
                                state.money < reactivationFee
                                  ? 'bg-white/[0.02] text-slate-600 border-white/[0.06] cursor-not-allowed'
                                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20'
                              }`}
                            >
                              <GameIcon name="idle" size={11} /> Reactivate — {formatMoney(reactivationFee)} + {REACTIVATION_SPINUP_MONTHS}mo spin-up
                            </button>
                          </HoloTip>
                        ) : operational && onMothballBuilding ? (
                          <HoloTip
                            content={{
                              title: 'Mothball',
                              icon: 'idle',
                              body: (
                                <p>
                                  Pause this facility instead of scrapping it: zero revenue, zero recipe
                                  consumption, maintenance cut to {Math.round(MOTHBALL_MAINTENANCE_FRACTION * 100)}%.
                                  <Concept id="mothball">Reversible</Concept> — reactivate any time for a small fee
                                  and a {REACTIVATION_SPINUP_MONTHS}-game-month spin-up. The tool for riding out a
                                  market crash instead of eating full maintenance forever.
                                </p>
                              ),
                            }}
                          >
                            <button
                              onClick={() => onMothballBuilding(bld.instanceId)}
                              className="w-full min-h-[28px] text-[10px] px-2 py-1 rounded bg-slate-500/10 text-slate-300 border border-slate-500/20 hover:bg-slate-500/20 transition-colors flex items-center justify-center gap-1"
                            >
                              <GameIcon name="idle" size={11} /> Mothball — {Math.round(MOTHBALL_MAINTENANCE_FRACTION * 100)}% maintenance, zero revenue
                            </button>
                          </HoloTip>
                        ) : null}
                      </div>
                    )}
                    {hasDamage && onRushRepairBuilding && (
                      <button
                        onClick={() => onRushRepairBuilding(bld.instanceId)}
                        className="mt-1 w-full min-h-[28px] text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1"
                      >
                        <GameIcon name="wrench" size={11} /> Rush Repair — {formatMoney(repairCost)}
                      </button>
                    )}
                    {/* Wave E3: sourcing policy — the vertical-integration-vs-market choice */}
                    {recipeActive && operational && onSetSupplyPolicy && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <HoloTip
                          content={{
                            title: 'Input Sourcing',
                            icon: 'market',
                            body: (
                              <p>
                                <strong>Supply locally</strong>: draw only your own stock — zero cash cost, full
                                logistics burden, runs degraded when short. <strong>Standing market order</strong>:
                                shortfalls become real buy orders on the shared book at live spot (+2% fee) —{' '}
                                <Concept id="standing-order">visible demand</Concept> rivals can supply or front-run.
                              </p>
                            ),
                          }}
                        >
                          <span className="text-[10px] text-slate-500">Sourcing</span>
                        </HoloTip>
                        <div className="flex rounded overflow-hidden border border-white/[0.08]" role="group" aria-label={`${def.name} input sourcing`}>
                          <button
                            onClick={() => policy !== 'local' && onSetSupplyPolicy(bld.instanceId, 'local')}
                            aria-pressed={policy === 'local'}
                            className={`min-h-[28px] px-2 py-0.5 text-[10px] transition-colors ${
                              policy === 'local' ? 'bg-cyan-600 text-white' : 'bg-white/[0.03] text-slate-400 hover:text-white'
                            }`}
                          >
                            Supply locally
                          </button>
                          <button
                            onClick={() => policy !== 'market' && onSetSupplyPolicy(bld.instanceId, 'market')}
                            aria-pressed={policy === 'market'}
                            className={`min-h-[28px] px-2 py-0.5 text-[10px] transition-colors ${
                              policy === 'market' ? 'bg-amber-600 text-white' : 'bg-white/[0.03] text-slate-400 hover:text-white'
                            }`}
                          >
                            Standing market order
                          </button>
                        </div>
                      </div>
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
