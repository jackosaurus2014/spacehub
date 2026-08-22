// ─── Situation Log derivation (Wave V3, docs/VISUAL_DEPTH_2026-08.md §V3) ──
// "A unified Situation Log replaces scattered alerts." Pure lens over
// GameState — zero new state, zero mechanics. Unifies:
//   - state.recentHazards / state.hazardWarnings (hazards.ts, already
//     rendered as toasts by HazardAlertLayer.tsx — this is the PERMANENT
//     record those toasts don't provide)
//   - state.activeDeliveries (delivery-contracts.ts) — contracts closing
//   - world-calendar.ts's getMissionCalendarEntries — senate votes closing,
//     story-chapter acts going live, alliance charter pledges due, etc.
//     (reused wholesale, NOT re-derived — "one calendar, many surfaces" is
//     already the house pattern; this module just re-labels the entries
//     that fall inside a short "closing soon" window as attention items)
//   - state.commandQueue emptiness (queue idle — wasted automation capacity)
//   - state.reports unread count (mail)
//
// Both SituationLog.tsx (the full filterable feed, promoted into the
// Reports tab) and Outliner.tsx's Attention section consume this — the
// Outliner shows the most urgent subset and deep-links into the full log.
//
// Deliberately OUT of scope this wave: "mentorship requests" (spec's own
// example list). That system lives entirely outside GameState (the
// /api/mentors/* routes, a separate DB-backed feature unrelated to Space
// Tycoon's save), so surfacing it here would mean either a new network
// fetch wired into this "pure GameState lens" module (breaking its
// DB-free/unit-testable contract — the same discipline world-calendar.ts's
// header documents for upcomingLaunches) or fabricating client state that
// doesn't exist. Deferred, documented, not silently dropped.

import type { GameState, GameTab } from './types';
import { BUILDING_MAP } from './buildings';
import { getMissionCalendarEntries, type CalendarCategory } from './world-calendar';
import { calendarCategoryIcon, type IconName } from './icons';
import type { OrderQueueTarget } from './order-queue';
// Wave E4 (Finite Demand Pools): market-share drop alerts — "competitor
// undercutting at X". Pure read of state.demandPools (prevPlayerShare is
// stamped by server-effects.mergeDemandPoolSnapshot when a new snapshot
// lands), keeping this module's DB-free contract intact.
import { CATEGORY_LABELS, getServiceCategory, demandPoolKey } from './demand-pools';
import { LOCATION_MAP } from './solar-system';
// Wave E5 (docs/ECONOMY_PVP_2026-08.md §E5): deposit extraction-pressure and
// labor wage-index alerts — same pure-GameState-lens posture as the demand
// pool alerts above.
import { getDepositGrade, EXTRACTION_PRESSURE_MIN } from './extraction-pressure';
import { GUILD_STRIKE_WAGE_THRESHOLD, WAGE_INDEX_MAX } from './labor-market';
import { WORKER_TYPES } from './workforce';
import { MINING_PRODUCTION } from './resources';
// Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5): surface a building's
// mothball/reactivation/decommission state in the Situation Log — the
// "reflect mothballed state" requirement. Pure GameState + world-clock lens,
// same posture as every other section in this file.
import { isBuildingMothballed, isBuildingReactivating, isBuildingDecommissioning, REACTIVATION_SPINUP_MONTHS } from './mothball';
import { getGlobalGameDate, REAL_SECONDS_PER_GAME_MONTH } from './server-time';
// Wave M5 (docs/MEANINGFUL_2026-08.md §M5): offense-snapshot alerts — the
// "you are under economic attack at X" surface. Pure read of state.offense
// (delivered via sync/server-effects), same DB-free posture as everything
// else here. LOCATION_TO_ZONE maps a building's location to its toll zone.
import { OFFENSE_SNAPSHOT_STALE_MS } from './offense';
import { LOCATION_TO_ZONE } from './zone-influence';
// PvP Discoverability pass (2026-08): the "these tools exist / right now is a
// moment to use one" surface. Pure lens like everything else here — see
// competitive-posture.ts's header for the honesty rule governing what is and
// is not derivable.
import { deriveCompetitiveSignals } from './competitive-posture';
// AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md): the systemic-crisis
// alert surface. getCrisisStatus is the same pure derivation the Emergency
// panel renders, so the Log and the panel can never describe one crisis two
// different ways.
import { getCrisisStatus, CRISIS_APPROACH_MAP } from './systemic-crises';

export type SituationSeverity = 'critical' | 'warning' | 'info';

export type SituationCategory =
  | 'hazard_recent' | 'hazard_forecast' | 'contract' | 'senate' | 'charter'
  | 'story_chapter' | 'economic_cycle' | 'queue_idle' | 'mail'
  // Wave E3 (docs/ECONOMY_PVP_2026-08.md §E3): building recipe inputs ran
  // short — the facility is browned out toward the 0.5 efficiency floor.
  | 'supply_shortfall'
  // Wave E4 (docs/ECONOMY_PVP_2026-08.md §E4): this player's capacity share
  // of a demand market dropped since the previous snapshot — a competitor
  // is taking customers ("competitor undercutting at X").
  | 'demand_shift'
  // Wave E5 (docs/ECONOMY_PVP_2026-08.md §E5): a deposit this player mines
  // has thinned into the Thinning/Critical grade band.
  | 'deposit_depletion'
  // Wave E5 (docs/ECONOMY_PVP_2026-08.md §E5 §2.6 lore surface): a crew
  // type's server-wide wage index has climbed to a hiring-boom level.
  | 'wage_spike'
  // Outliner-only sources (deriveAttentionItems, outliner.ts) — included in
  // the shared union so both modules can emit/consume the same item shape.
  | 'building_damage' | 'ship_damage' | 'ship_idle' | 'queue_stalled'
  // Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7): orbital-slot auction closing
  // soon, NPC procurement drive bidding deadline approaching.
  | 'slot_auction' | 'procurement_drive'
  // Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5): a building is
  // paused (mothballed), spinning back up (reactivating), or mid-teardown
  // (decommissioning) — the exit-decision states.
  | 'building_status'
  // Wave M6 (docs/MEANINGFUL_2026-08.md §M6): equity events — a tender
  // offer targets your corporation, a distress-auction clock is running, or
  // a controller holds your float. Pure lens over state.equity.
  | 'equity'
  // Wave M5 (docs/MEANINGFUL_2026-08.md §M5 / §3.2 item 6 "visible-to-victim
  // telemetry"): the offense snapshot's alert surface — "you are under
  // economic attack at X". A price campaign on a resource this player mines
  // or holds; a cornering squeeze forming on an input their buildings
  // consume; a governor freight toll on a zone they operate in. Pure lens
  // over state.offense.
  | 'economic_attack'
  // Wave M5 (O4): a rival's signing-bonus raid on this player's crew —
  // counteroffer window closing (the [SAVE] V38 "counteroffer inbox").
  | 'poach_offer'
  | 'lane_toll'
  // PvP Discoverability pass (2026-08, competitive-posture.ts): the
  // "right now is a moment to use one of these tools" surface. Every entry
  // is derived from real synced state (demand pools, wage indexes, slot
  // occupancy, spot vs base) — see that module's honesty rule for what was
  // deliberately NOT derived. Always severity 'info' (an opportunity is not
  // an emergency) and hard-capped at MAX_COMPETITIVE_SIGNALS.
  | 'competitive_signal'
  // AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md): an Accord emergency
  // is forecast, an exposure bar is running against this corporation, or the
  // Stabilization Assessment is still short of its target. Pure lens over
  // state.systemicCrisis + state.crisisSituation.
  | 'systemic_crisis';

export interface SituationItem {
  id: string;
  category: SituationCategory;
  icon: IconName;
  label: string;
  /** One-line action/context text (spec: "one-line action link"). */
  detail: string;
  severity: SituationSeverity;
  /** When the thing happens/happened — undefined for evergreen items
   *  (e.g. "queue is empty" has no single instant). */
  atMs?: number;
  /** Tab to navigate to on click. Undefined = informational, no action. */
  tab?: GameTab;
  /** When tab === 'map', which location/system to focus (reuses the exact
   *  OrderQueueHUD/Outliner "Operations" target shape). */
  target?: OrderQueueTarget;
  /** PvP Discoverability pass: an optional `<tab>:<view>` token (sub-view.ts)
   *  so activating the row lands on the SUB-tab where the verb actually
   *  lives — Markets → Analytics, Map HUD → Spatial Strategy — instead of on
   *  the hub's default view. Renderers pass it to requestSubView() alongside
   *  the existing setTab call; ignoring it degrades to today's behaviour. */
  subView?: string;
}

const HAZARD_ICON: Record<string, IconName> = {
  solar_storm: 'hazard-solar-storm',
  micrometeorite: 'hazard-micrometeorite',
  pirate_raid: 'hazard-pirate-raid',
  equipment_failure: 'hazard-equipment-failure',
};

function hazardSeverity(sev: string | undefined): SituationSeverity {
  if (sev === 'severe') return 'critical';
  if (sev === 'major') return 'warning';
  return 'info';
}

function urgencySeverity(msRemaining: number): SituationSeverity {
  if (msRemaining <= 6 * 60 * 60 * 1000) return 'critical';
  if (msRemaining <= 24 * 60 * 60 * 1000) return 'warning';
  return 'info';
}

function formatHoursOrDays(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** world-calendar.ts CalendarCategory -> the GameTab that shows/manages it,
 *  for the subset this module surfaces as "closing soon" items. Categories
 *  omitted here (league, season, appointment_event, real_launch,
 *  realignment, npc_program, expedition, queue) either have no single owning
 *  tab, are already covered by their own dedicated banners/panels, or are
 *  covered by a different section of this module (queue -> queue_idle). */
const CALENDAR_CATEGORY_TAB: Partial<Record<CalendarCategory, GameTab>> = {
  senate: 'factions',
  alliance_charter: 'alliance',
  corporate_era: 'alliance',
  story_chapter: 'dashboard',
  economic_cycle: 'market',
  program: 'workforce',
  leader_retirement: 'commanders',
  // Wave E7: auction closing -> Map (Spatial Strategy tab lives there);
  // drive deadline -> Contracts (where NPC procurement drives are bid on,
  // same bidding UI as player-issued contracts).
  slot_auction: 'map',
  procurement_drive: 'contracts',
  // Wave M6: tender contests live with board politics on the Governance tab.
  tender_offer: 'governance',
  // AAA Round 2: the Emergency view lives in the Reports hub, alongside the
  // Situation Log itself.
  systemic_crisis: 'reports',
};

const CALENDAR_CATEGORY_TO_SITUATION: Partial<Record<CalendarCategory, SituationCategory>> = {
  senate: 'senate',
  alliance_charter: 'charter',
  corporate_era: 'charter',
  story_chapter: 'story_chapter',
  economic_cycle: 'economic_cycle',
  slot_auction: 'slot_auction',
  procurement_drive: 'procurement_drive',
  // NOTE: 'systemic_crisis' is deliberately ABSENT for the same reason
  // 'tender_offer' is — the crisis section below emits richer, exposure-aware
  // items across the whole cycle (forecast, running bar, assessment), not
  // only inside the 48h closing-soon window this calendar pass covers, so
  // mapping it here would double-report every crisis appointment.
  // NOTE: 'tender_offer' is deliberately ABSENT — the equity section below
  // emits its own richer items for the full 7-day tender window (a tender
  // on your corporation warrants attention immediately, not only inside
  // the 48h closing-soon window this calendar pass covers), so mapping it
  // here would double-report the same offer.
};

export interface SituationLogOptions {
  nowMs?: number;
  /** How soon a calendar/contract deadline must be to count as "closing
   *  soon" and surface here. Default 48h (spec: hazards/contracts/senate
   *  "expiring"/"closing"/"due" — a two-day actionable window). */
  closingSoonMs?: number;
  /** How far back a resolved hazard still counts as "recent". Default 24h. */
  recentHazardMs?: number;
  /** E7: open orbital-slot auctions / NPC procurement drives, forwarded
   *  straight into getMissionCalendarEntries — see world-calendar.ts's
   *  MissionCalendarOptions for the source routes. Optional; omitted means
   *  those two categories simply don't surface here (same as the existing
   *  upcomingLaunches/myAllianceCharter omission below). */
  openSlotAuctions?: import('./world-calendar').CalendarSlotAuctionLite[];
  openNpcDrives?: import('./world-calendar').CalendarNpcDriveLite[];
}

const DEFAULT_CLOSING_SOON_MS = 48 * 60 * 60 * 1000;
const DEFAULT_RECENT_HAZARD_MS = 24 * 60 * 60 * 1000;

/**
 * All Situation Log items for a save — pure, deterministic, sorted by
 * severity (critical first) then soonest atMs. Safe to call every render
 * (memoize at the call site, same discipline as world-calendar.ts).
 */
export function deriveSituationLog(state: GameState, opts: SituationLogOptions = {}): SituationItem[] {
  const nowMs = opts.nowMs ?? Date.now();
  const closingSoonMs = opts.closingSoonMs ?? DEFAULT_CLOSING_SOON_MS;
  const recentHazardMs = opts.recentHazardMs ?? DEFAULT_RECENT_HAZARD_MS;
  const items: SituationItem[] = [];

  // ── Hazard warnings (forecast) ──────────────────────────────────────────
  for (const w of state.hazardWarnings || []) {
    items.push({
      id: `sit-hazard-forecast-${w.id}`,
      category: 'hazard_forecast',
      icon: HAZARD_ICON[w.type] || 'hazard-generic',
      label: `${w.type.replace(/_/g, ' ')} forecast`,
      detail: w.summary,
      severity: hazardSeverity(w.severity),
      tab: 'map',
      target: { kind: 'location', id: w.locationId },
    });
  }

  // ── Recent hazards (already struck) ─────────────────────────────────────
  for (const h of state.recentHazards || []) {
    if (nowMs - h.occurredAtMs > recentHazardMs) continue;
    items.push({
      id: `sit-hazard-recent-${h.id}`,
      category: 'hazard_recent',
      icon: HAZARD_ICON[h.type] || 'hazard-generic',
      label: h.targetName ? `${h.targetName} struck` : `${h.type.replace(/_/g, ' ')} struck`,
      detail: h.summary,
      severity: hazardSeverity(h.severity),
      atMs: h.occurredAtMs,
      tab: 'map',
      target: { kind: 'location', id: h.locationId },
    });
  }

  // ── Building status (Wave M2 — mothballed / reactivating / decommissioning) ─
  {
    const worldMonth = getGlobalGameDate(nowMs).totalMonths;
    for (const b of state.buildings) {
      if (!b.isComplete) continue;
      const def = BUILDING_MAP.get(b.definitionId);
      const name = def?.name || 'Facility';
      if (isBuildingMothballed(b)) {
        items.push({
          id: `sit-bld-mothball-${b.instanceId}`,
          category: 'building_status',
          icon: 'idle',
          label: `${name} mothballed`,
          detail: 'Paused: zero revenue, zero consumption, 25% maintenance. Reactivate from the Build tab any time.',
          severity: 'info',
          tab: 'build',
        });
      } else if (isBuildingReactivating(b) && b.reactivationStartMonth !== undefined) {
        const monthsRemaining = Math.max(0, (b.reactivationStartMonth + REACTIVATION_SPINUP_MONTHS) - worldMonth);
        items.push({
          id: `sit-bld-reactivating-${b.instanceId}`,
          category: 'building_status',
          icon: 'idle',
          label: `${name} spinning up`,
          detail: monthsRemaining > 0
            ? `Back online in ~${formatHoursOrDays(monthsRemaining * REAL_SECONDS_PER_GAME_MONTH * 1000)}.`
            : 'Back online this cycle.',
          severity: 'info',
          atMs: nowMs + monthsRemaining * REAL_SECONDS_PER_GAME_MONTH * 1000,
          tab: 'build',
        });
      } else if (isBuildingDecommissioning(b) && b.decommissionCompletesAtMonth !== undefined) {
        const monthsRemaining = Math.max(0, b.decommissionCompletesAtMonth - worldMonth);
        items.push({
          id: `sit-bld-decommissioning-${b.instanceId}`,
          category: 'building_status',
          icon: 'wrench',
          label: `${name} decommissioning`,
          detail: monthsRemaining > 0
            ? `Teardown completes in ~${formatHoursOrDays(monthsRemaining * REAL_SECONDS_PER_GAME_MONTH * 1000)} — recovery credits automatically.`
            : 'Teardown completes this cycle — recovery credits automatically.',
          severity: 'warning',
          atMs: nowMs + monthsRemaining * REAL_SECONDS_PER_GAME_MONTH * 1000,
          tab: 'build',
        });
      }
    }
  }

  // ── Contracts closing (delivery-contracts.ts — real wall-clock deadlines,
  //    unlike the legacy CONTRACT_POOL system which only tracks game-date
  //    deadlines with no per-instance persisted state) ─────────────────────
  for (const d of state.activeDeliveries || []) {
    if (d.status !== 'accepted') continue;
    const remaining = d.deadlineAtMs - nowMs;
    if (remaining < 0 || remaining > closingSoonMs) continue;
    items.push({
      id: `sit-contract-${d.id}`,
      category: 'contract',
      icon: 'contracts',
      label: `${d.title} due`,
      detail: `${formatHoursOrDays(remaining)} remaining · ${d.quantity} ${d.resourceId.replace(/_/g, ' ')}`,
      severity: urgencySeverity(remaining),
      atMs: d.deadlineAtMs,
      tab: 'contracts',
    });
  }

  // ── World-shared/personal calendar entries closing soon — reuses
  //    world-calendar.ts wholesale rather than re-deriving senate/charter/
  //    chapter timing (spec: "reuse world-calendar/eventLog sources rather
  //    than new state"). ──────────────────────────────────────────────────
  const calendarEntries = getMissionCalendarEntries(state, {
    nowMs,
    horizonDays: Math.max(1, Math.ceil(closingSoonMs / (24 * 60 * 60 * 1000))),
    openSlotAuctions: opts.openSlotAuctions,
    openNpcDrives: opts.openNpcDrives,
  });
  for (const entry of calendarEntries) {
    const situationCategory = CALENDAR_CATEGORY_TO_SITUATION[entry.category];
    if (!situationCategory) continue;
    const remaining = entry.atMs - nowMs;
    items.push({
      id: `sit-cal-${entry.id}`,
      category: situationCategory,
      icon: calendarCategoryIcon(entry.category),
      label: entry.title,
      detail: entry.detail,
      severity: urgencySeverity(remaining),
      atMs: entry.atMs,
      tab: CALENDAR_CATEGORY_TAB[entry.category],
    });
  }

  // ── Supply shortfalls (Wave E3 consumption engine — consumption.ts) ─────
  // "supply shortfall at X": every building whose last monthly consumption
  // pass came up short gets a persistent item; at (or near) the 0.5 floor it
  // escalates to critical. State is a pure read of consumptionState — no new
  // derivation logic here.
  const shortfalls = state.consumptionState?.shortfallResources || {};
  const effMap = state.consumptionState?.efficiency || {};
  for (const [instanceId, missing] of Object.entries(shortfalls)) {
    if (!missing || missing.length === 0) continue;
    const bld = state.buildings.find(b => b.instanceId === instanceId);
    if (!bld) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    const eff = effMap[instanceId] ?? 1;
    items.push({
      id: `sit-supply-${instanceId}`,
      category: 'supply_shortfall',
      icon: 'package',
      label: `Supply shortfall at ${def?.name || bld.definitionId}`,
      detail: `Running at ${Math.round(eff * 100)}% efficiency — short on ${missing.map(r => r.replace(/_/g, ' ')).join(', ')}. Stock the site, freight supplies, or enable standing market buys.`,
      severity: eff <= 0.55 ? 'critical' : 'warning',
      tab: 'build',
    });
  }

  // ── Demand-pool share drops (Wave E4 — demand-pools.ts) ─────────────────
  // "Competitor undercutting at X": the player's capacity share of a market
  // they actually supply fell ≥ 5 points between the last two server
  // snapshots. Recency-gated on the snapshot timestamp (48h) so a stale
  // save doesn't nag forever; severity escalates when the market is also
  // saturated (multiplier below ~0.75 — rivals are visibly eating revenue).
  const demandSnapshot = state.demandPools;
  if (demandSnapshot?.pools && typeof demandSnapshot.asOf === 'number' && nowMs - demandSnapshot.asOf <= 48 * 60 * 60 * 1000) {
    const suppliedKeys = new Set<string>();
    for (const svc of state.activeServices || []) {
      const cat = getServiceCategory(svc.definitionId);
      if (cat) suppliedKeys.add(demandPoolKey(svc.locationId, cat));
    }
    for (const [key, entry] of Object.entries(demandSnapshot.pools)) {
      if (!suppliedKeys.has(key)) continue;
      const prev = entry.prevPlayerShare;
      if (typeof prev !== 'number' || prev <= 0) continue;
      const drop = prev - entry.playerShare;
      if (drop < 0.05) continue;
      const locName = LOCATION_MAP.get(entry.locationId)?.name || entry.locationId;
      const catLabel = CATEGORY_LABELS[entry.category] || entry.category;
      items.push({
        id: `sit-demand-${key}`,
        category: 'demand_shift',
        icon: 'market',
        label: `Competitor undercutting at ${locName}`,
        detail: `Your ${catLabel.toLowerCase()} market share fell ${Math.round(prev * 100)}% → ${Math.round(entry.playerShare * 100)}% (${entry.supplierCount} suppliers, pool pays ${Math.round(entry.mult * 100)}%). Expand capacity, or redeploy to an underserved market.`,
        severity: entry.mult <= 0.75 ? 'warning' : 'info',
        atMs: demandSnapshot.asOf,
        tab: 'market',
      });
    }
  }

  // ── Deposit depletion (Wave E5 — extraction-pressure.ts) ────────────────
  // "Deposit depleting": a (location, resource) THIS player actually mines
  // has thinned into the Thinning/Critical grade band. Only surfaces for
  // deposits the player has a mining service on — a rival's depleted rock
  // elsewhere isn't this player's problem.
  const extractionSnapshot = state.extractionPressure;
  if (extractionSnapshot?.entries) {
    const minedHere = new Set<string>(); // `${locationId}:${resourceId}`
    for (const svc of state.activeServices || []) {
      const production = MINING_PRODUCTION[svc.definitionId];
      if (!production) continue;
      for (const { resource } of production) minedHere.add(`${svc.locationId}:${resource}`);
    }
    for (const entry of Object.values(extractionSnapshot.entries)) {
      if (!minedHere.has(`${entry.locationId}:${entry.resourceId}`)) continue;
      const grade = getDepositGrade(entry.pressure);
      if (grade.tier !== 'thinning' && grade.tier !== 'critical') continue;
      const locName = LOCATION_MAP.get(entry.locationId)?.name || entry.locationId;
      items.push({
        id: `sit-deposit-${entry.locationId}-${entry.resourceId}`,
        category: 'deposit_depletion',
        icon: 'ship-mining',
        label: `${entry.resourceId.replace(/_/g, ' ')} deposit ${grade.label.toLowerCase()} at ${locName}`,
        detail: `Output down to ${Math.round(entry.pressure * 100)}% of an untouched deposit (floor ${Math.round(EXTRACTION_PRESSURE_MIN * 100)}%) — everyone mining this seam thins it. Recovers over time; expand to a fresh site to spread the pressure.`,
        severity: grade.tier === 'critical' ? 'warning' : 'info',
        atMs: extractionSnapshot.asOf,
        tab: 'map',
        target: { kind: 'location', id: entry.locationId },
      });
    }
  }

  // ── Wage spike (Wave E5 — labor-market.ts) ───────────────────────────────
  // "Wage spike": a crew type this player employs has hit a server-wide
  // hiring-boom wage index. Only surfaces for types the player actually has
  // on payroll.
  const laborSnapshot = state.laborMarket;
  if (laborSnapshot?.index) {
    const workforce = state.workforce;
    for (const wDef of WORKER_TYPES) {
      const count = workforce ? (workforce[`${wDef.type}s` as keyof typeof workforce] as number | undefined) || 0 : 0;
      if (count <= 0) continue;
      const index = laborSnapshot.index[wDef.type];
      if (typeof index !== 'number' || index < 1.4) continue;
      const pinned = index >= GUILD_STRIKE_WAGE_THRESHOLD;
      items.push({
        id: `sit-wage-${wDef.type}`,
        category: 'wage_spike',
        icon: 'workforce',
        label: `${wDef.name} wages ${pinned ? 'pinned at boom levels' : 'climbing'}`,
        detail: pinned
          ? `Server-wide ${wDef.name.toLowerCase()} demand has pinned the wage index at ${index.toFixed(2)}× (cap ${WAGE_INDEX_MAX.toFixed(1)}×)${wDef.type === 'miner' ? ' — the Belt Miners’ Guild is watching' : ''}. Payroll is expensive right now; training reduces headcount pressure.`
          : `Server-wide hiring has pushed the ${wDef.name.toLowerCase()} wage index to ${index.toFixed(2)}×. Expect payroll to keep climbing while the boom lasts.`,
        severity: pinned ? 'warning' : 'info',
        atMs: laborSnapshot.asOf,
        tab: 'workforce',
      });
    }
  }

  // ── Systemic crisis (AAA Round 2 — systemic-crises.ts) ──────────────────
  // Three items at most, and every one of them is actionable:
  //   1. an exposure bar running against this corporation (the decision),
  //   2. the assessment still short with the window closing (the
  //      cooperation decision),
  //   3. the forecast, so the crisis is never a surprise.
  // Nothing surfaces for a Frontier / mid-FTUE / pre-Round-2 save: the
  // status object reports `eligibility.eligible === false` and the forecast
  // item is suppressed for exactly those two protected cases.
  {
    const cs = getCrisisStatus(state, nowMs);
    const protectedNewcomer = cs.eligibility.reason === 'frontier' || cs.eligibility.reason === 'onboarding';
    const sit = cs.situation;
    if (sit && !sit.outcome) {
      const pct = Math.round(sit.progress * 100);
      const projected = Math.round(cs.projectedProgress * 100);
      items.push({
        id: `sit-crisis-situation-${sit.cycleIndex}`,
        category: 'systemic_crisis',
        icon: 'cal-systemic-crisis',
        label: `${cs.def.name}: exposure ${pct}%`,
        detail: cs.projectedProgress >= 1
          ? `On your current posture (${CRISIS_APPROACH_MAP.get(sit.approachId)?.name ?? sit.approachId}) the bar reaches 100% before the window closes and the loss is realized. Change posture or pledge to the Accord assessment.`
          : `On your current posture (${CRISIS_APPROACH_MAP.get(sit.approachId)?.name ?? sit.approachId}) the bar peaks at ${projected}% and the emergency is contained.`,
        severity: cs.projectedProgress >= 1 ? 'critical' : pct >= 60 ? 'warning' : 'info',
        atMs: cs.window.activeEndMs,
        tab: 'reports',
        subView: 'reports:emergency',
      });
    }
    if (cs.enabled && cs.window.phase === 'active' && !protectedNewcomer && cs.containment < 1
      && (cs.snapshot?.assessmentTargetUsd ?? 0) > 0) {
      const remaining = cs.window.activeEndMs - nowMs;
      items.push({
        id: `sit-crisis-assessment-${cs.window.cycleIndex}`,
        category: 'systemic_crisis',
        icon: 'cal-systemic-crisis',
        label: `Accord assessment ${Math.round(cs.containment * 100)}% subscribed`,
        detail: `$${Math.round((cs.snapshot!.pledgedUsd) / 1e6).toLocaleString()}M of a $${Math.round(cs.snapshot!.assessmentTargetUsd / 1e6).toLocaleString()}M target, from ${cs.snapshot!.pledgeCount} corporation${cs.snapshot!.pledgeCount === 1 ? '' : 's'} — closes in ${formatHoursOrDays(remaining)}. If the target is missed every corporation the emergency reached carries the shortfall, pledger or not.`,
        severity: remaining <= 48 * 60 * 60 * 1000 ? 'warning' : 'info',
        atMs: cs.window.activeEndMs,
        tab: 'reports',
        subView: 'reports:emergency',
      });
    }
    if (cs.window.phase === 'forecast' && !protectedNewcomer) {
      items.push({
        id: `sit-crisis-forecast-${cs.window.cycleIndex}`,
        category: 'systemic_crisis',
        icon: 'cal-systemic-crisis',
        label: `Forecast: ${cs.def.name}`,
        detail: `${cs.def.tagline} Opens in ${formatHoursOrDays(cs.window.activeStartMs - nowMs)}. Your measured exposure: ${cs.exposure.detail}`,
        severity: 'info',
        atMs: cs.window.activeStartMs,
        tab: 'reports',
        subView: 'reports:emergency',
      });
    }
  }

  // ── Equity: tenders, distress, control (Wave M6 — share-registry.ts) ────
  // Pure lens over state.equity (the sync-delivered snapshot). Null (gate
  // closed / never synced) surfaces nothing — the equity system simply
  // doesn't exist for this save yet.
  const equity = state.equity;
  if (equity?.enabled) {
    for (const t of equity.tendersOnMe || []) {
      const remaining = t.closesAtMs - nowMs;
      if (remaining <= 0) continue;
      items.push({
        id: `sit-equity-tender-${t.id}`,
        category: 'equity',
        icon: 'reports',
        label: t.kind === 'white_knight'
          ? `White knight bid from ${t.initiatorName}`
          : `Tender offer for your corporation`,
        detail: `${t.initiatorName} bids $${Math.round(t.pricePerShare).toLocaleString()}/share for ${t.sharesSought} shares — closes in ${formatHoursOrDays(remaining)}. Counter with a buyback, solicit a white knight, or let holders decide.`,
        severity: remaining <= 24 * 60 * 60 * 1000 ? 'critical' : 'warning',
        atMs: t.closesAtMs,
        tab: 'governance',
      });
    }
    const reg = equity.registry;
    if (reg && reg.distressMonths > 0) {
      items.push({
        id: 'sit-equity-distress',
        category: 'equity',
        icon: 'reports',
        label: `Cash-negative: ${reg.distressMonths} of ${3} months toward a distress auction`,
        detail: 'Three consecutive cash-negative game-months auto-auction a 10-share tranche of your corporation at a discount. Restore positive cash to reset the clock.',
        severity: reg.distressMonths >= 2 ? 'critical' : 'warning',
        tab: 'governance',
      });
    }
    if (reg?.controllerName) {
      items.push({
        id: 'sit-equity-controlled',
        category: 'equity',
        icon: 'reports',
        label: `${reg.controllerName} holds a controlling stake`,
        detail: reg.integrationMalusPct > 0
          ? `Your corporation operates as a subsidiary of ${reg.controllerName}. Integration drag: −${Math.round(reg.integrationMalusPct * 100)}% service revenue while systems merge.`
          : `Your corporation operates as a subsidiary of ${reg.controllerName}.`,
        severity: 'info',
        tab: 'governance',
      });
    }
  }

  // ── Economic offense (Wave M5 — offense.ts) ─────────────────────────────
  // "You are under economic attack at X" — pure lens over state.offense
  // (the sync-delivered snapshot). Null/stale surfaces nothing.
  const offense = state.offense;
  if (offense && typeof offense.asOf === 'number' && nowMs - offense.asOf <= OFFENSE_SNAPSHOT_STALE_MS) {
    // Incoming poach offers — the counteroffer inbox. Always critical while
    // the 48h window runs: doing nothing IS a decision (the crew walk).
    for (const p of offense.poachIncoming || []) {
      const remaining = p.respondByMs - nowMs;
      if (remaining <= 0) continue;
      const crewName = WORKER_TYPES.find(w => w.type === p.crewType)?.name || p.crewType;
      items.push({
        id: `sit-poach-${p.id}`,
        category: 'poach_offer',
        icon: 'workforce',
        label: `${p.attackerName || 'A rival corporation'} is poaching ${p.count} of your ${crewName.toLowerCase()}${p.count === 1 ? '' : 's'}`,
        detail: `Counteroffer window closes in ${formatHoursOrDays(remaining)}. Match 75% of the signing bonus ($${(p.retentionCost / 1_000_000).toFixed(1)}M, burned) to retain${p.freeRetentionAvailable ? ' — or use your free guild-arbitration retention' : ''}, or let them walk and keep the cash.`,
        severity: 'critical',
        atMs: p.respondByMs,
        tab: 'workforce',
      });
    }

    // Price campaigns on resources this player mines or holds ("dumping").
    {
      const myResources = new Set<string>();
      for (const [resId, qty] of Object.entries(state.resources || {})) {
        if (typeof qty === 'number' && qty > 0) myResources.add(resId);
      }
      for (const svc of state.activeServices || []) {
        const production = MINING_PRODUCTION[svc.definitionId];
        if (!production) continue;
        for (const { resource } of production) myResources.add(resource);
      }
      for (const c of offense.campaigns || []) {
        if (c.endsAtMs <= nowMs) continue;
        const resName = c.resourceSlug.replace(/_/g, ' ');
        if (c.own) {
          items.push({
            id: `sit-campaign-own-${c.resourceSlug}`,
            category: 'economic_attack',
            icon: 'market',
            label: `Your price campaign on ${resName} is live`,
            detail: `Ends in ${formatHoursOrDays(c.endsAtMs - nowMs)}. Mean reversion is suspended and the NPC maker won't absorb your dump — sell real volume below spot to push the price toward the band floor.`,
            severity: 'info',
            atMs: c.endsAtMs,
            tab: 'market',
          });
        } else if (myResources.has(c.resourceSlug)) {
          items.push({
            id: `sit-campaign-${c.resourceSlug}`,
            category: 'economic_attack',
            icon: 'trending-down',
            label: `Price war declared on ${resName}`,
            detail: `${c.byCompanyName} is dumping ${resName} — spot won't mean-revert until ${formatHoursOrDays(Math.max(0, c.endsAtMs - nowMs))} from now, and price-linked mining income follows spot. Counterplay: buy the dumped goods cheap, spread into other markets, or out-wait the campaign clock — riding it out usually beats mothballing for smaller corporations (the pause suits larger, diversified operations).`,
            severity: 'warning',
            atMs: c.endsAtMs,
            tab: 'market',
          });
        }
      }
    }

    // Cornering squeezes forming on inputs this player's buildings consume.
    {
      const myInputs = new Set<string>();
      for (const b of state.buildings || []) {
        if (!b.isComplete) continue;
        const def = BUILDING_MAP.get(b.definitionId);
        for (const resId of Object.keys(def?.consumesPerMonth || {})) myInputs.add(resId);
      }
      for (const a of offense.corneringAlerts || []) {
        if (!myInputs.has(a.resourceSlug)) continue;
        items.push({
          id: `sit-corner-${a.resourceSlug}`,
          category: 'economic_attack',
          icon: 'market',
          label: `Supply squeeze forming on ${a.resourceSlug.replace(/_/g, ' ')}`,
          detail: `A single buyer's open bids equal ${Math.round(a.topBuyerShare * 100)}% of the last 7 days' traded volume — your buildings consume this input. Counterplay: switch supply policy to local production, stockpile now, or buy through Earth import (premium, but never denial).`,
          severity: 'warning',
          atMs: offense.asOf,
          tab: 'market',
        });
      }
    }

    // Governor freight tolls on zones this player operates in.
    {
      const myZones = new Set<string>();
      for (const b of state.buildings || []) {
        const z = LOCATION_TO_ZONE.get(b.locationId);
        if (z) myZones.add(z);
      }
      const governorOf = new Set((state.zoneStandings || []).filter(z => z.isGovernor).map(z => z.zoneSlug));
      for (const t of offense.laneTolls || []) {
        if (!myZones.has(t.zoneSlug) || governorOf.has(t.zoneSlug)) continue;
        items.push({
          id: `sit-toll-${t.zoneSlug}`,
          category: 'lane_toll',
          icon: 'fleet',
          label: `Freight toll levied in ${t.zoneSlug.replace(/^zone_/, '').replace(/_/g, ' ').toUpperCase()}`,
          detail: `${t.governorName || 'The zone governor'} charges ${(t.tollPct * 100).toFixed(1)}% of cargo value on dispatches crossing this zone (capped). Counterplay: route around it (real Δv), sign a trade treaty, or contest the governorship.`,
          severity: 'info',
          atMs: offense.asOf,
          tab: 'map',
        });
      }
    }
  }

  // ── Competitive opportunity signals (PvP Discoverability pass) ──────────
  // "Right now is a moment to use one of these tools." Delegated wholesale
  // to competitive-posture.ts so the honesty rules, the eligibility gates
  // (never mid-FTUE, never inside the Protected Frontier) and the cap live
  // in exactly one place. All 'info' severity: they sort below every real
  // deadline in this log and can never outrank a hazard or a poach window.
  for (const sig of deriveCompetitiveSignals(state, { nowMs })) {
    items.push({
      id: `sit-${sig.id}`,
      category: 'competitive_signal',
      icon: sig.icon,
      label: sig.label,
      detail: sig.detail,
      severity: 'info',
      tab: sig.tab,
      subView: sig.subView,
    });
  }

  // ── Queue idle warning (wasted automation capacity) ─────────────────────
  if ((state.commandQueue || []).length === 0) {
    items.push({
      id: 'sit-queue-idle',
      category: 'queue_idle',
      icon: 'idle',
      label: 'Command queue is empty',
      detail: 'Queue research or construction orders so away-time keeps working for you.',
      severity: 'info',
      tab: 'research',
    });
  }

  // ── Unread mail ──────────────────────────────────────────────────────────
  const unread = (state.reports || []).filter(r => !r.read).length;
  if (unread > 0) {
    items.push({
      id: 'sit-mail-unread',
      category: 'mail',
      icon: 'reports',
      label: `${unread} unread report${unread === 1 ? '' : 's'}`,
      detail: 'Discovery reports and dispatches waiting in the mailbox.',
      severity: 'info',
      tab: 'reports',
    });
  }

  const severityRank: Record<SituationSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return items.sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return (a.atMs ?? Infinity) - (b.atMs ?? Infinity);
  });
}
