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
  // Outliner-only sources (deriveAttentionItems, outliner.ts) — included in
  // the shared union so both modules can emit/consume the same item shape.
  | 'building_damage' | 'ship_damage' | 'ship_idle' | 'queue_stalled';

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
};

const CALENDAR_CATEGORY_TO_SITUATION: Partial<Record<CalendarCategory, SituationCategory>> = {
  senate: 'senate',
  alliance_charter: 'charter',
  corporate_era: 'charter',
  story_chapter: 'story_chapter',
  economic_cycle: 'economic_cycle',
};

export interface SituationLogOptions {
  nowMs?: number;
  /** How soon a calendar/contract deadline must be to count as "closing
   *  soon" and surface here. Default 48h (spec: hazards/contracts/senate
   *  "expiring"/"closing"/"due" — a two-day actionable window). */
  closingSoonMs?: number;
  /** How far back a resolved hazard still counts as "recent". Default 24h. */
  recentHazardMs?: number;
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
