'use client';

// ─── Build Panel ────────────────────────────────────────────────────────────
// Extracted from space-tycoon/page.tsx (Wave 9 map-first overhaul) so the
// map command center's "Build here" action can reuse the exact same
// building-selection/construction logic instead of forking it. Behavior is
// unchanged from the original inline version; the only additions are
// `initialLocationId` (pre-target a location) and `lockLocation` (hide the
// location switcher when embedded in the map context panel, where the
// location is already implied by what the player selected on the map).
//
// Design-system migration (GAME_DESIGN_REVIEW_2026-09 §3): chrome moved to
// the shared kit — Console for every card, DataTable for the spec table,
// Telemetry for the live P&L preview, StatusPip wherever a colour carried
// state (queue/slot gate, cap, supply efficiency, damage, operating status),
// the five tokens instead of cyan/amber/red/emerald utilities and hex, the
// site's btn-* CTA classes, motion-safe: on every transition, and no raw
// emoji. Every handler, check and number is unchanged.

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
// Row 13 (docs/GAME_DESIGN_REVIEW_2026-09.md §2, location-aware inventory):
// build materials are paid from stock AT THE BUILD LOCATION once the
// logistics ratchet is on. The panel shows what is on site, what has to be
// hauled and from where, and offers the one-click hauler that closes the gap.
import {
  checkLocalMaterials, planShortfallHaul, getStockByLocation, isLocationEconomyActive,
  getLocationStock, isHomeLocation,
} from '@/lib/game/cargo-logistics';
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
import { computeBuildPreview, computeMarkUpgradePreview } from '@/lib/game/build-preview';
// D4 (docs/BALANCE.md "Mark-II tier"): in-place refits — the rung between
// "another copy at the 0.35 saturation floor" and the next catalog tier.
import { MARK_NAMES, MARK_REVENUE_MULT, MARK_MAINTENANCE_MULT, getMarkLevel, isMarkUpgradeInProgress } from '@/lib/game/mark-upgrades';
import { RESEARCH_MAP } from '@/lib/game/research-tree';
import { getEffectiveMaintenancePerMonth } from '@/lib/game/flagship-economics';
// Construction Purposes wave (docs/CONSTRUCTION_PURPOSES_2026-08.md): every
// capability is a real modifier into an existing formula (hazard mitigation,
// shock buffering, freight fuel, detection, training, away efficiency,
// expeditions, diplomacy, research, crew capacity, shipyard slots). The
// chips below surface them with a HoloTip explaining the exact mechanic.
import { getCapabilityChipsForDefinition, summarizeCapabilities } from '@/lib/game/building-capabilities';
import { resourceCategoryIcon, type IconName } from '@/lib/game/icons';
import Image from 'next/image';
import Console from '@/components/ui/Console';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusPip from '@/components/ui/StatusPip';
import Telemetry from '@/components/ui/Telemetry';
import GameIcon from './GameIcon';
import HoloTip, { Concept } from './HoloTip';

const OVERLINE = 'font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]';
const CHIP = 'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[var(--radius-badge)] border border-[var(--line)] bg-[var(--elev)]';

/** Compact "consumes → produces" chip row for a building recipe. Direction is
 *  carried by the word (in/out) and the arrow, never by colour alone. */
function RecipeChips({ consumes, produces }: { consumes?: Record<string, number>; produces?: Record<string, number> }) {
  if (!consumes && !produces) return null;
  const chip = (resourceId: string, perMonth: number, kind: 'in' | 'out') => {
    const def = RESOURCE_MAP.get(resourceId as ResourceId);
    const qty = perMonth < 1 ? perMonth.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') : String(perMonth);
    return (
      <span
        key={`${kind}-${resourceId}`}
        className={CHIP}
        style={{ color: kind === 'in' ? 'var(--caution)' : 'var(--go)' }}
        title={`${def?.name || resourceId}: ${qty}/mo ${kind === 'in' ? 'consumed' : 'produced'}`}
      >
        <GameIcon name={resourceCategoryIcon(def?.category || 'generic')} size={10} />
        <span className="sr-only">{kind === 'in' ? 'consumes' : 'produces'} </span>
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
        <span className={OVERLINE}>Recipe/mo</span>
      </HoloTip>
      {describeRecipeLine(consumes).map(r => chip(r.resourceId, r.perMonth, 'in'))}
      {produces && Object.keys(produces).length > 0 && <span className="text-[var(--ink-3)] text-[10px]" aria-hidden="true">→</span>}
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
      <span className={OVERLINE}>Purpose</span>
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
          <span className={`${CHIP} cursor-help`} style={{ color: 'var(--violet)' }}>
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

interface SpecRow { id: string; stat: string; value: string }
/** Row 13 (docs/GAME_DESIGN_REVIEW_2026-09.md §2): the hauling gap on a
 *  build card. Says exactly how many units are missing and which stockpile
 *  holds them, then offers the single freight run that closes it — priced by
 *  the same planFreight quote dispatch charges (Δv fuel + any zone toll), so
 *  the button never lies about the bill. Renders nothing when the site can
 *  pay locally, which includes every home-cluster build and every save with
 *  the logistics ratchet still off. */
function HaulShortfallNotice({
  state, locationId, cost, onDispatchShip,
}: {
  state: GameState;
  locationId: string;
  cost?: Record<string, number>;
  onDispatchShip?: (shipInstanceId: string, toLocation: string, cargo?: Record<string, number>) => void;
}) {
  const check = checkLocalMaterials(state, locationId, cost);
  if (check.ok || check.usesHomePool) return null;
  const siteName = LOCATION_MAP.get(locationId)?.name || locationId;
  const haul = planShortfallHaul(state, locationId, cost);
  return (
    <div className="mb-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-2 text-[10px] leading-relaxed text-[var(--ink-2)]" role="status">
      <div className="flex items-start gap-1.5">
        <StatusPip state="hold" label="HAUL REQUIRED" />
        <div className="flex-1">
          {check.shortfalls.map(sf => {
            const name = RESOURCE_MAP.get(sf.resourceId as ResourceId)?.name || sf.resourceId.replace(/_/g, ' ');
            const source = sf.sources[0];
            const sourceName = source ? (LOCATION_MAP.get(source.locationId)?.name || source.locationId) : null;
            return (
              <div key={sf.resourceId}>
                <span className="font-mono tabular-nums text-[var(--ink)]">{Math.ceil(sf.short)}</span>{' '}
                {name} must be hauled to {siteName}
                {sourceName ? <> from <span className="text-[var(--ink)]">{sourceName}</span></> : ' — nowhere in the corporation holds it'}.
              </div>
            );
          })}
          {haul.ok ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span>
                {haul.shipName} · {haul.loadUnits}/{haul.capacity} load-units · fuel {formatMoney(haul.fuelCost)}
                {haul.tollCost > 0 ? ` + toll ${formatMoney(haul.tollCost)}` : ''} · {formatDuration(haul.travelSeconds)}
                {haul.partial ? ' · one run does not cover the whole shortfall' : ''}
              </span>
              {onDispatchShip && (
                <button
                  type="button"
                  className="btn-secondary min-h-[44px] px-2.5 py-1 text-[10px]"
                  onClick={() => onDispatchShip(haul.shipInstanceId, haul.to, haul.cargo)}
                >
                  Dispatch hauler
                </button>
              )}
            </div>
          ) : (
            <div className="mt-1.5 text-[var(--ink-3)]">{haul.detail}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Row 13: where the corporation's goods physically are. Compact enough to
 *  live in the Build panel's location header, which is exactly where the
 *  question "can I build this here?" gets asked. */
interface StockRow { id: string; location: string; units: number; lines: number; holdings: string }
const STOCK_COLUMNS: DataTableColumn<StockRow>[] = [
  { key: 'location', header: 'Pool', sortable: false },
  { key: 'units', header: 'Units', align: 'right', numeric: true, sortable: false, render: r => <span className="font-mono tabular-nums text-[var(--ink)]">{Math.round(r.units).toLocaleString()}</span> },
  { key: 'holdings', header: 'Largest holdings', sortable: false, render: r => <span className="text-[var(--ink-2)]">{r.holdings}</span> },
];

const SPEC_COLUMNS: DataTableColumn<SpecRow>[] = [
  { key: 'stat', header: 'Stat', sortable: false },
  { key: 'value', header: 'Value', align: 'right', sortable: false, render: r => <span className="font-mono tabular-nums text-[var(--ink)]">{r.value}</span> },
];

/** Resource-acquisition hint for a missing build input (unchanged copy). */
function ResourceHint({ resId }: { resId: string }) {
  const name = resId.replace(/_/g, ' ');
  return (
    <span className="invisible group-hover:visible group-focus-within:visible absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2.5 rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--elev)] shadow-lg shadow-black/50 text-[10px] leading-relaxed text-left pointer-events-none">
      <span className="block text-[var(--signal)] font-semibold mb-1">How to get {name}:</span>
      {(resId === 'iron' || resId === 'aluminum' || resId === 'titanium') ? (
        <span className="block text-[var(--ink-2)]">Build a <span className="text-[var(--caution)]">Mining Outpost</span> on the Lunar Surface and activate the <span className="text-[var(--caution)]">Lunar Mining</span> service. Resources will accumulate over time. Once you have resources, the <span className="text-[var(--signal)]">Market tab</span> will unlock for buying &amp; selling.</span>
      ) : (resId === 'lunar_water' || resId === 'mars_water') ? (
        <span className="block text-[var(--ink-2)]">Water is mined from the <span className="text-[var(--caution)]">Lunar Surface</span> or <span className="text-[var(--caution)]">Mars Surface</span>. Build mining infrastructure and activate mining services at those locations.</span>
      ) : (resId === 'rare_earth' || resId === 'platinum_group' || resId === 'gold') ? (
        <span className="block text-[var(--ink-2)]">Rare materials require <span className="text-[var(--caution)]">Asteroid Belt</span> mining operations. Unlock the Asteroid Belt location, build mining facilities, and activate the asteroid mining service.</span>
      ) : (
        <span className="block text-[var(--ink-2)]">This resource is produced by <span className="text-[var(--caution)]">mining services</span>. Build mining facilities at the appropriate location, then activate the mining service. Check the <span className="text-[var(--signal)]">Map tab</span> to see which locations yield this resource.</span>
      )}
    </span>
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
  /** D4: start a Mark-II/III refit (mark-upgrades.ts). The Refit button and
   *  its cost/benefit preview only render when provided. */
  onMarkUpgradeBuilding?: (instanceId: string) => void;
  /** Row 13: send a freighter loaded with the materials a remote build is
   *  short of. Same handler the Fleet tab and the map command centre use
   *  (dispatchShipWithCargo). The "Dispatch hauler" button only renders when
   *  provided — without it the panel still explains the shortfall. */
  onDispatchShip?: (shipInstanceId: string, toLocation: string, cargo?: Record<string, number>) => void;
}

export default function BuildPanel({ state, onBuild, onSellBuilding, initialLocationId, lockLocation, onRushRepairBuilding, onSetSupplyPolicy, onMothballBuilding, onReactivateBuilding, onMarkUpgradeBuilding, onDispatchShip }: BuildPanelProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocationId || state.unlockedLocations[0] || 'earth_surface');
  const totalSlots = getConstructionSlots(state);
  const activeBuilds = getActiveConstructions(state);
  const slotsAvailable = canStartConstruction(state);
  // Balance Pass 4 (docs/BALANCE.md "Pass 4"): orbital-slot gate — a
  // saturated pool (E7 requiresLeaseAuction) blocks NEW builds at this
  // location unless the player holds a slot lease (or the Frontier
  // first-building exemption applies). Mirrors handleBuild's check exactly.
  const slotGate = checkOrbitalSlotGate(state, selectedLocation);
  // Row 13: is the per-location economy live, and does THIS site have its own
  // stockpile? (Home cluster shares the global pool — it *is* their local
  // inventory, so nothing changes there.)
  const locationEconomy = isLocationEconomyActive(state);
  const siteHasOwnPool = locationEconomy && !isHomeLocation(selectedLocation);
  const stockRows = locationEconomy ? getStockByLocation(state) : [];

  const availableBuildings = BUILDINGS.filter(b => {
    if (b.requiredLocation !== selectedLocation) return false;
    if (!b.requiredResearch.every(r => state.completedResearch.includes(r))) return false;
    return true;
  });

  const countAtLocation = (defId: string) => state.buildings.filter(b => b.definitionId === defId && b.locationId === selectedLocation).length;

  return (
    <div className="space-y-4">
      <Console
        title="Construction"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: totalSlots }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-2 rounded-sm motion-safe:transition-colors"
                  style={{ background: i < activeBuilds ? 'var(--signal)' : 'var(--line-2)' }}
                  title={i < activeBuilds ? 'Active build' : 'Open slot'}
                />
              ))}
            </div>
            <span className="font-mono text-[11px] tabular-nums text-[var(--ink-2)]">
              {activeBuilds}/{totalSlots} slots
            </span>
            <StatusPip state={slotsAvailable ? 'go' : 'hold'} label={slotsAvailable ? 'SLOTS OPEN' : 'QUEUE FULL'} />
          </div>
        }
      >
        <p className="font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-2)]">
          Queue new buildings, monitor active construction slots and pick a location.
          {!slotsAvailable && ' Queue full — wait for a build to finish.'}
          {totalSlots < 5 && slotsAvailable && ' Research to unlock more slots.'}
        </p>

        {/* Location Selector — shows building count per location. Hidden when
            lockLocation is set (the map context panel already told us where). */}
        {!lockLocation && (
          <div className="mt-3">
            <p className={`${OVERLINE} mb-1.5`}>Select a location to see available buildings</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Build location">
              {state.unlockedLocations.map(locId => {
                const loc = LOCATION_MAP.get(locId);
                const buildableCount = BUILDINGS.filter(b =>
                  b.requiredLocation === locId &&
                  b.requiredResearch.every(r => state.completedResearch.includes(r))
                ).length;
                const selected = selectedLocation === locId;
                return (
                  <button
                    key={locId}
                    type="button"
                    onClick={() => setSelectedLocation(locId)}
                    aria-pressed={selected}
                    className={`relative min-h-[44px] px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-medium motion-safe:transition-colors overflow-hidden border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)] ${
                      selected
                        ? 'border-[var(--ember)] bg-[var(--hover)] text-[var(--ink)]'
                        : 'border-[var(--line)] bg-[var(--elev)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:border-[var(--line-hot)]'
                    }`}
                  >
                    {LOCATION_ASSETS[locId] && (
                      <Image src={LOCATION_ASSETS[locId]} alt="" width={80} height={40} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" loading="lazy" />
                    )}
                    <span className="relative">{loc?.name || locId}</span>
                    {buildableCount > 0 && (
                      <span className="relative ml-1.5 px-1 py-0.5 rounded-[var(--radius-badge)] text-[10px] font-mono tabular-nums bg-[var(--surface)] text-[var(--signal)]">{buildableCount}</span>
                    )}
                    {selected && <span className="sr-only"> (selected)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 13 (location-aware inventory): stock by location. Only shown
            once the logistics ratchet is on — before that there is one pool
            and the table would say nothing. */}
        {locationEconomy && stockRows.length > 0 && (
          <div className="mt-3">
            <p className={`${OVERLINE} mb-1.5`}>Stock by location</p>
            <DataTable<StockRow>
              caption="Resource stock by location"
              columns={STOCK_COLUMNS}
              rows={stockRows.map(r => ({
                id: r.id,
                location: r.name,
                units: r.units,
                lines: r.lines,
                holdings: r.top.slice(0, 3)
                  .map(h => `${Math.round(h.quantity).toLocaleString()} ${RESOURCE_MAP.get(h.resourceId as ResourceId)?.name || h.resourceId.replace(/_/g, ' ')}`)
                  .join(' · ') || 'empty',
              }))}
            />
            <p className="mt-1 text-[10px] text-[var(--ink-3)]">
              Builds and fabrication draw the pool they stand in; the market and delivery contracts clear only at the home cluster.
            </p>
          </div>
        )}
      </Console>

      {/* Balance Pass 4: slot-gate notice — the whole location is
          lease-gated, so say it once above the cards (each card's button
          also carries the reason). */}
      {!slotGate.allowed && availableBuildings.length > 0 && (
        <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[11px] leading-relaxed text-[var(--ink-2)]" role="status">
          <StatusPip state="hold" label="SLOTS SATURATED" />
          <span>{slotGate.reason}</span>
        </div>
      )}
      {slotGate.allowed && slotGate.viaLease && (
        <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-2 text-[10px] text-[var(--ink-2)]" role="status">
          <StatusPip state="go" label="LEASE ACTIVE" />
          <span>Slot lease active at this location — new builds permitted while it holds.</span>
        </div>
      )}
      {slotGate.allowed && slotGate.viaFrontierExemption && (
        <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-2 text-[10px] text-[var(--ink-2)]" role="status">
          <StatusPip state="tminus" label="FRONTIER EXEMPTION" />
          <span>This pool is saturated, but your FIRST building here is guaranteed a slot. Further builds will need a lease auction.</span>
        </div>
      )}

      {/* Building Cards */}
      {availableBuildings.length === 0 ? (
        <Console>
          <p className="text-[var(--ink-2)] text-sm text-center">No buildings available at this location yet.</p>
          <p className="text-[var(--ink-3)] text-xs mt-1 text-center">Research new technologies or try a different location above.</p>
        </Console>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {availableBuildings.map(bld => {
            const count = countAtLocation(bld.id);
            const cost = scaledBuildingCost(bld.baseCost, count);
            const canAffordMoney = state.money >= cost;
            // Row 13: affordability is a LOCAL question now — materials have
            // to be at this site (home cluster / ratchet off = the global
            // pool, unchanged). Mirrors page.tsx handleBuild exactly.
            const materials = checkLocalMaterials(state, selectedLocation, bld.resourceCost as Record<string, number> | undefined);
            const hasResources = materials.ok;
            // Early-fab wave: per-corporation cap (fabrication_earth max 1).
            const capCheck = checkBuildingCap(state.buildings, bld);
            const canAfford = canAffordMoney && hasResources && slotsAvailable && slotGate.allowed && capCheck.allowed;
            const preview = computeBuildPreview(state, bld, selectedLocation);
            const positive = preview.projectedNetMonthly > 0;
            const capSummary = summarizeCapabilities(bld.id);
            const derived = getBuildingDerivedStats(bld);
            const specRows: SpecRow[] = [];
            if (derived.customerCapacity > 0)          specRows.push({ id: 'cap', stat: 'Customer cap', value: derived.customerCapacity.toLocaleString() });
            if (derived.uplinkBandwidth > 0)           specRows.push({ id: 'uplink', stat: 'Uplink', value: `${derived.uplinkBandwidth.toLocaleString()} Gbps` });
            if (derived.manufacturingThroughput > 0)   specRows.push({ id: 'mfg', stat: 'Mfg tput', value: `${derived.manufacturingThroughput}/mo` });
            if (derived.refiningThroughput > 0)        specRows.push({ id: 'refine', stat: 'Refining', value: `${derived.refiningThroughput}/mo` });
            if (derived.storageCapacity > 0)           specRows.push({ id: 'storage', stat: 'Storage', value: `${derived.storageCapacity.toLocaleString()} m³` });
            if (derived.dockingCapacity > 0)           specRows.push({ id: 'dock', stat: 'Docking', value: `${derived.dockingCapacity} ships` });
            if (derived.crewQuarters > 0)              specRows.push({ id: 'crew', stat: 'Crew qtrs', value: derived.crewQuarters.toString() });
            specRows.push({ id: 'structure', stat: 'Structure', value: derived.structuralIntegrity.toLocaleString() });
            if (derived.shieldingRating > 0)           specRows.push({ id: 'shield', stat: 'Shield', value: `${Math.round(derived.shieldingRating * 100)}%` });
            specRows.push({ id: 'maxup', stat: 'Max upgrade', value: `L${derived.maxUpgradeLevel}` });
            if (derived.synergyTags.length > 0)        specRows.push({ id: 'synergy', stat: 'Synergy', value: `${derived.synergyTags.join(', ')} (${derived.synergyRange})` });

            return (
              <Console key={bld.id} padded={false} className={canAfford ? 'border-[var(--line-2)]' : ''}>
                {/* Building art — with hologram scanline for AAA feel */}
                <div className="relative h-24 sm:h-28 overflow-hidden holo-sprite bg-[var(--void)]">
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
                      <h3 className="text-[var(--ink)] text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{bld.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold backdrop-blur-sm shrink-0 game-badge-t${Math.min(5, Math.max(1, bld.tier))}`}>Tier {bld.tier}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                <p className="text-[var(--ink-2)] text-[11px] mb-2 leading-relaxed">{bld.description}</p>
                {/* M1/F9: live P&L preview — computed from the same
                    formulas the tick uses (pool multiplier, saturation,
                    power, recipe cost, marginal overhead), NOT the static
                    authored tooltip prose below. Always visible (not
                    collapsed) since this is the number that matters. */}
                <div className="mb-2 p-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--elev)]">
                  <div className="flex items-start justify-between gap-2">
                    <Telemetry
                      label="Projected net"
                      value={formatMoney(preview.projectedNetMonthly)}
                      unit="/mo"
                      tone={positive ? 'signal' : 'ink'}
                      sub={
                        <>
                          {preview.poolMultiplier !== null && (
                            <>pool {preview.poolMultiplier < 1 ? 'saturated' : preview.poolMultiplier > 1 ? 'undersupplied' : 'balanced'} ({preview.poolMultiplier.toFixed(2)}x) · </>
                          )}
                          at current pools, before research/commander bonuses — recomputed live, not a fixed promise.
                        </>
                      }
                    />
                    <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                      <StatusPip state={positive ? 'go' : 'scrub'} label={positive ? 'PROFITABLE' : 'LOSS-MAKING'} />
                      <span className="font-mono text-[10px] tabular-nums text-[var(--ink-2)]">
                        {preview.paybackMonths === null ? 'payback: never' : `payback: ~${preview.paybackMonths}mo`}
                      </span>
                    </div>
                  </div>
                  {/* Construction Purposes wave: the projection is P&L-only —
                      name the non-revenue value qualitatively so a thin
                      payback doesn't read as "worthless building". */}
                  {capSummary && (
                    <div className="mt-1 text-[10px]" style={{ color: 'var(--violet)' }}>
                      beyond P&amp;L: {capSummary}
                    </div>
                  )}
                </div>
                {!capCheck.allowed && (
                  <p className="mb-2 flex items-start gap-2 text-[10px] text-[var(--ink-2)] rounded-[var(--radius-badge)] border border-[var(--line)] bg-[var(--elev)] px-2 py-1" role="status">
                    <StatusPip state="scrub" label="CAPPED" />
                    <span>{capCheck.reason} — expand off-world instead.</span>
                  </p>
                )}
                <PurposeChips definitionId={bld.id} />
                {/* Strategy tooltip — flavor/context only; economics claims in
                    the prose above (if any) predate E3/E4 and are NOT
                    authoritative. The live preview above is the honest number. */}
                {bld.tooltip && (
                  <details className="mb-2 group/tip">
                    <summary className="min-h-[44px] flex items-center text-[10px] text-[var(--ember)] cursor-pointer hover:underline motion-safe:transition-colors select-none">
                      Why build this? <GameIcon name="chevron-down" size={11} className="ml-1" />
                    </summary>
                    <div className="mt-1 p-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--elev)] text-[10px] text-[var(--ink-2)] leading-relaxed">
                      {bld.tooltip}
                    </div>
                  </details>
                )}

                {/* Deep stats — Phase I derived stats */}
                <details className="mb-2 group/deep">
                  <summary className="min-h-[44px] flex items-center text-[10px] text-[var(--ink-3)] cursor-pointer hover:text-[var(--ink)] motion-safe:transition-colors select-none">
                    Detailed specs <GameIcon name="chevron-down" size={11} className="ml-1" />
                  </summary>
                  <div className="mt-1 rounded-[var(--radius-control)] border border-[var(--line)] overflow-hidden">
                    <DataTable<SpecRow> caption={`${bld.name} specifications`} columns={SPEC_COLUMNS} rows={specRows} />
                  </div>
                </details>
                {/* Revenue preview */}
                {bld.enabledServices.length > 0 && (() => {
                  const svc = SERVICE_MAP.get(bld.enabledServices[0]);
                  if (!svc) return null;
                  const net = svc.revenuePerMonth - svc.operatingCostPerMonth - getEffectiveMaintenancePerMonth(bld); // D5 flagship floor
                  return (
                    <div className="flex items-center gap-1 mb-2 text-[10px] font-mono tabular-nums">
                      <span className="text-[var(--ink-2)]">Earns {formatMoney(svc.revenuePerMonth)}/mo</span>
                      <span className="text-[var(--ink-3)]" aria-hidden="true">→</span>
                      <span style={{ color: net >= 0 ? 'var(--go)' : 'var(--crit)' }}>
                        <span aria-hidden="true">{net >= 0 ? '▲' : '▼'}</span> Net {formatMoney(net)}/mo
                      </span>
                    </div>
                  );
                })()}
                {bld.enabledServices.length === 0 && !bld.producesPerMonth && (
                  <p className="text-[var(--ink-3)] text-[10px] mb-2">Support building — no direct revenue</p>
                )}
                {/* Wave E3: recipe (consumes → produces) chips */}
                <RecipeChips consumes={bld.consumesPerMonth} produces={bld.producesPerMonth} />
                {bld.producesPerMonth && bld.enabledServices.length === 0 && (
                  <p className="text-[10px] mb-2" style={{ color: 'var(--go)' }}>Producer building — passive monthly output, no service revenue</p>
                )}
                {/* Resource costs */}
                {bld.resourceCost && Object.keys(bld.resourceCost).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries(bld.resourceCost).map(([resId, qty]) => {
                      const have = siteHasOwnPool ? getLocationStock(state, selectedLocation, resId) : (state.resources[resId] || 0);
                      const enough = have >= qty;
                      return (
                        <span
                          key={resId}
                          tabIndex={enough ? undefined : 0}
                          className={`group relative ${CHIP} cursor-help ${enough ? 'text-[var(--ink-2)]' : 'text-[var(--crit)]'}`}
                        >
                          {resId.replace(/_/g, ' ')} <span className="font-mono tabular-nums">{have}/{qty}</span>
                          {!enough && <StatusPip state="scrub" label="SHORT" />}
                          {/* Resource acquisition tooltip */}
                          {!enough && <ResourceHint resId={resId} />}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Row 13: what has to be hauled in, from where, and the one
                    click that does it. Renders only for a remote site with a
                    real shortfall. */}
                <HaulShortfallNotice
                  state={state}
                  locationId={selectedLocation}
                  cost={bld.resourceCost as Record<string, number> | undefined}
                  onDispatchShip={onDispatchShip}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono tabular-nums">
                    <span style={{ color: canAffordMoney ? 'var(--go)' : 'var(--crit)' }}>{formatMoney(cost)}</span>
                    {!canAffordMoney && <span className="sr-only"> (cannot afford)</span>}
                    <span className="text-[var(--ink-3)] ml-2">{formatDuration(scaledBuildTime(bld.realBuildSeconds, count))}</span>
                  </div>
                  {!slotGate.allowed ? (
                    /* Balance Pass 4: saturated pool — the Build button is
                       replaced by the gate reason (win a lease auction). */
                    <span title={slotGate.reason}>
                      <StatusPip state="hold" label="LEASE REQUIRED" />
                    </span>
                  ) : !slotsAvailable && canAffordMoney && hasResources ? (
                    <StatusPip state="hold" label="QUEUE FULL" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBuild(bld.id, selectedLocation)}
                      disabled={!canAfford}
                      className="btn-primary !min-h-[40px] !py-1.5 !px-4 text-[13px] motion-safe:active:scale-95"
                    >
                      Build
                    </button>
                  )}
                </div>
                {count > 0 && <p className="text-[var(--ink-3)] text-[10px] mt-1">Built: {count}</p>}
                </div>
              </Console>
            );
          })}
        </div>
      )}

      {/* Built structures at this location — with sell option */}
      {(() => {
        const builtHere = state.buildings.filter(b => b.isComplete && b.locationId === selectedLocation);
        if (builtHere.length === 0) return null;
        return (
          <Console title={`Built at ${LOCATION_MAP.get(selectedLocation)?.name || selectedLocation}`} className="mt-4">
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
                  <div key={bld.instanceId} className="py-1.5 px-2 rounded-[var(--radius-control)] hover:bg-[var(--hover)] motion-safe:transition-colors">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[var(--ink)] text-xs inline-flex items-center gap-1.5">
                        {def.name}
                        {getMarkLevel(bld) > 1 && (
                          <span className="text-[9px] font-bold tracking-wider font-mono text-[var(--signal)] border border-[var(--line-2)] rounded-[var(--radius-badge)] px-1 py-px align-middle" aria-label={MARK_NAMES[getMarkLevel(bld)]}>
                            MK {getMarkLevel(bld) === 3 ? 'III' : 'II'}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
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
                            <span className="inline-flex items-center gap-1 cursor-help">
                              <GameIcon name="package" size={10} />
                              <StatusPip
                                state={isShort ? (supplyEff <= 0.55 ? 'scrub' : 'hold') : 'go'}
                                label={`${Math.round(supplyEff * 100)}%${isShort ? ' SHORT' : ' SUPPLY'}`}
                              />
                            </span>
                          </HoloTip>
                        )}
                        {hasDamage && (
                          <HoloTip
                            underline={false}
                            content={{
                              title: 'Structural Damage',
                              icon: 'warning',
                              body: (
                                <p>
                                  <Concept id="hazard-damage">Hazard damage</Concept> is cutting this building&apos;s
                                  service revenue by ~{Math.round(Math.min(0.75, 0.75 * (bld.damagePct || 0)) * 100)}%
                                  while it still pays full maintenance. Crews auto-repair 10 pts/month at cost;
                                  Rush Repair (below) clears it instantly, or station an Orbital Servicer here to
                                  fix it faster with materials instead of cash.
                                </p>
                              ),
                            }}
                          >
                            <span className="inline-flex items-center gap-1 cursor-help">
                              <GameIcon name="warning" size={10} />
                              <StatusPip
                                state={isSevere ? 'scrub' : 'hold'}
                                label={`${Math.round((bld.damagePct || 0) * 100)}% DMG · REV −${Math.round(Math.min(0.75, 0.75 * (bld.damagePct || 0)) * 100)}%`}
                              />
                            </span>
                          </HoloTip>
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
                            <span className="inline-flex items-center gap-1 cursor-help">
                              <GameIcon name={mothballed || reactivating ? 'idle' : 'wrench'} size={10} />
                              <StatusPip
                                state={mothballed ? 'hold' : reactivating ? 'tminus' : 'scrub'}
                                label={mothballed ? 'MOTHBALLED' : reactivating ? 'REACTIVATING' : 'DECOMMISSIONING'}
                              />
                            </span>
                          </HoloTip>
                        )}
                        {onSellBuilding && !decommissioning && (
                          <button
                            type="button"
                            onClick={() => {
                              const confirmMsg = isTeardown
                                ? `Decommission ${def.name}? Teardown takes ${DECOMMISSION_TEARDOWN_MONTHS} game month, paused meanwhile. Recovers ${formatMoney(recovery.money)} (${Math.round(DECOMMISSION_MONEY_RECOVERY_FRACTION * 100)}% of build cost) + ${resourceRecoveryText} (${Math.round(DECOMMISSION_RESOURCE_RECOVERY_FRACTION * 100)}% of materials) on completion.`
                                : `Scrap ${def.name}? Recovers ${formatMoney(recovery.money)} (${Math.round(DECOMMISSION_MONEY_RECOVERY_FRACTION * 100)}% of build cost) + ${resourceRecoveryText} (${Math.round(DECOMMISSION_RESOURCE_RECOVERY_FRACTION * 100)}% of materials) instantly.`;
                              if (confirm(confirmMsg)) onSellBuilding(bld.instanceId);
                            }}
                            className="btn-ghost !min-h-[36px] !py-1 !px-2 text-[11px] !text-[var(--crit)]"
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
                              type="button"
                              onClick={() => onReactivateBuilding(bld.instanceId)}
                              disabled={state.money < reactivationFee}
                              className="btn-secondary w-full !min-h-[40px] !py-1 text-[11px]"
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
                              type="button"
                              onClick={() => onMothballBuilding(bld.instanceId)}
                              className="btn-secondary w-full !min-h-[40px] !py-1 text-[11px]"
                            >
                              <GameIcon name="idle" size={11} /> Mothball — {Math.round(MOTHBALL_MAINTENANCE_FRACTION * 100)}% maintenance, zero revenue
                            </button>
                          </HoloTip>
                        ) : null}
                      </div>
                    )}
                    {/* D4: Mark-II/III refit — the in-place rung. Cost/benefit
                        preview from build-preview.ts (Δ revenue, Δ maintenance,
                        payback at the current run-rate); a money-losing refit
                        still renders, labelled "never pays back". */}
                    {onMarkUpgradeBuilding && operational && (() => {
                      const mk = computeMarkUpgradePreview(state, bld.instanceId);
                      if (!mk) return null;
                      if (isMarkUpgradeInProgress(bld)) {
                        const remaining = Math.max(0, (bld.markUpgradeDurationSeconds || 0) - (Date.now() - (bld.markUpgradeStartedAtMs || 0)) / 1000);
                        return (
                          <div className="mt-1 text-[10px] text-[var(--ink-2)] flex items-center gap-1.5" role="status">
                            <StatusPip state="tminus" label="REFITTING" />
                            <GameIcon name="wrench" size={10} /> to {MARK_NAMES[(bld.markUpgradeTarget === 3 ? 3 : 2)]} — {formatDuration(Math.round(remaining))} remaining
                          </div>
                        );
                      }
                      if (!mk.target) return null; // Mark III already; nothing to offer
                      if (!mk.check.allowed) {
                        // Definition-level exclusions stay silent (nothing to decide);
                        // instance-level blockers (research gate, damage) are shown.
                        if (mk.check.reason && (mk.check.missingResearch || (bld.damagePct || 0) > 0)) {
                          const gateName = mk.check.missingResearch ? RESEARCH_MAP.get(mk.check.missingResearch)?.name || mk.check.missingResearch : null;
                          return (
                            <div className="mt-1 text-[10px] text-[var(--ink-3)] inline-flex items-center gap-1.5">
                              <GameIcon name="lock" size={10} />
                              {MARK_NAMES[mk.target]} refit locked — {gateName ? <>research <span className="text-[var(--ink-2)]">{gateName}</span></> : mk.check.reason}
                            </div>
                          );
                        }
                        return null;
                      }
                      const short = Object.entries(mk.resourceCost).filter(([r, q]) => (state.resources[r] || 0) < q);
                      const cantAfford = state.money < mk.cost || short.length > 0;
                      const materialsText = Object.entries(mk.resourceCost)
                        .map(([r, q]) => `${q} ${(RESOURCE_MAP.get(r as ResourceId)?.name || r.replace(/_/g, ' '))}`)
                        .join(', ');
                      return (
                        <div className="mt-1">
                          <HoloTip
                            content={{
                              title: `Refit to ${MARK_NAMES[mk.target]}`,
                              icon: 'wrench',
                              body: (
                                <div className="space-y-1">
                                  <p>
                                    Upgrade this building in place: revenue ×{MARK_REVENUE_MULT[mk.target]}, maintenance ×{MARK_MAINTENANCE_MULT[mk.target]}.
                                    It still counts as one unit for market saturation — the whole point versus building another copy.
                                    Operates at its current mark during the {formatDuration(mk.seconds)} refit.
                                  </p>
                                  <p>
                                    Revenue {formatMoney(mk.currentRevenueMonthly)} → {formatMoney(mk.nextRevenueMonthly)}/mo (+{formatMoney(mk.deltaRevenueMonthly)}); maintenance {formatMoney(mk.currentMaintenanceMonthly)} → {formatMoney(mk.nextMaintenanceMonthly)}/mo (+{formatMoney(mk.deltaMaintenanceMonthly)}).
                                    Net {mk.deltaNetMonthly >= 0 ? '+' : ''}{formatMoney(mk.deltaNetMonthly)}/mo → {mk.paybackMonths ? `pays back in ~${mk.paybackMonths} game-months` : 'never pays back at the current run-rate'}.
                                    Materials: {materialsText}. At current pools, before research/commander bonuses.
                                  </p>
                                </div>
                              ),
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => onMarkUpgradeBuilding(bld.instanceId)}
                              disabled={cantAfford}
                              aria-label={`Refit ${def.name} to ${MARK_NAMES[mk.target]} for ${formatMoney(mk.cost)}`}
                              className="btn-secondary w-full !min-h-[40px] !py-1 text-[11px]"
                            >
                              <GameIcon name="wrench" size={11} /> Refit → {MARK_NAMES[mk.target]} — {formatMoney(mk.cost)}
                              <StatusPip state={mk.deltaNetMonthly > 0 ? 'go' : 'hold'} label={`${mk.deltaNetMonthly >= 0 ? '+' : ''}${formatMoney(mk.deltaNetMonthly)}/mo`} />
                              <span className="text-[var(--ink-3)]">{mk.paybackMonths ? `${mk.paybackMonths} mo payback` : 'never pays back'}</span>
                            </button>
                          </HoloTip>
                          {short.length > 0 && (
                            <div className="text-[10px] text-[var(--ink-3)] mt-0.5">Short on: {short.map(([r]) => (RESOURCE_MAP.get(r as ResourceId)?.name || r.replace(/_/g, ' '))).join(', ')}</div>
                          )}
                        </div>
                      );
                    })()}
                    {hasDamage && onRushRepairBuilding && (
                      <button
                        type="button"
                        onClick={() => onRushRepairBuilding(bld.instanceId)}
                        className="btn-secondary mt-1 w-full !min-h-[40px] !py-1 text-[11px] !text-[var(--crit)]"
                      >
                        <GameIcon name="wrench" size={11} /> Rush Repair — {formatMoney(repairCost)}
                      </button>
                    )}
                    {/* Wave E3: sourcing policy — the vertical-integration-vs-market choice */}
                    {recipeActive && operational && onSetSupplyPolicy && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
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
                          <span className={OVERLINE}>Sourcing</span>
                        </HoloTip>
                        <div className="flex rounded-[var(--radius-control)] overflow-hidden border border-[var(--line-2)]" role="group" aria-label={`${def.name} input sourcing`}>
                          <button
                            type="button"
                            onClick={() => policy !== 'local' && onSetSupplyPolicy(bld.instanceId, 'local')}
                            aria-pressed={policy === 'local'}
                            className={`min-h-[36px] px-2 py-0.5 text-[10px] motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)] ${
                              policy === 'local' ? 'bg-[var(--ember)] text-[#0A0A0B] font-semibold' : 'bg-[var(--elev)] text-[var(--ink-2)] hover:text-[var(--ink)]'
                            }`}
                          >
                            Supply locally
                          </button>
                          <button
                            type="button"
                            onClick={() => policy !== 'market' && onSetSupplyPolicy(bld.instanceId, 'market')}
                            aria-pressed={policy === 'market'}
                            className={`min-h-[36px] px-2 py-0.5 text-[10px] motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)] ${
                              policy === 'market' ? 'bg-[var(--ember)] text-[#0A0A0B] font-semibold' : 'bg-[var(--elev)] text-[var(--ink-2)] hover:text-[var(--ink)]'
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
          </Console>
        );
      })()}
    </div>
  );
}
