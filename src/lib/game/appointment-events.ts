// ─── Space Tycoon: Live-Service Wave LS3 — Appointment World Events ─────────
// docs/LIVE_SERVICE_2026-08.md §LS3 "Appointment world events (new content,
// 2/month)". Fixed-UTC-window events that fire on the SAME schedule for
// every player — world-shared, deterministic, seeded off the ISO week
// index. No DB, no cron required: like real-world-feed.ts and
// seasonal-events.ts's getSeasonSchedule, "what's happening this week" is a
// pure function of wall-clock time, so it can be computed identically on the
// client, the server, and in tests, and is trivially cacheable.
//
// Cadence: an appointment event fires on every EVEN ISO week (weekIndex % 2
// === 0), which averages ~2.17 events/month — the closest clean, always-even
// cadence to the spec's "2/month". Which catalog entry fires, and exactly
// when inside that week, is chosen by a seeded RNG keyed to the week index
// (mulberry32(hashStringToSeed('world_apt_' + weekIndex)) — the same
// convention accord-senate.ts / hazards.ts / expeditions.ts use for "no
// Math.random anywhere" world-shared rolls).
//
// Mechanical effect: each event contributes a modest, capped bonus through
// the EXISTING WorldEventBonusSnapshot pipe (contractPayoutBonus /
// researchSpeedBonus — see server-effects.ts / real-world-feed.ts), the
// same already-wired, already-capped (WORLD_EVENT_*_BONUS_CAP = 0.10)
// channels the Sol Events real-launch bonus uses. This is a deliberate scope
// decision for this wave: the full bespoke-effect catalog sketched in the
// design doc (belt-specific mining bonus, hazard-class bump, compliance
// waiver, launch-dependent build-cost surcharge) would require new
// multiplier hooks across mining/build-cost/hazard formulas in
// game-engine.ts. Reusing the proven, capped pipe ships a REAL, working,
// world-shared, calendar-visible economic effect now without that risk;
// bespoke per-event effect types are a natural follow-up once this wave's
// calendar/scheduling foundation is in place.

import { mulberry32, hashStringToSeed } from './formulas';

export const APPOINTMENT_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Fires on every Nth ISO week — 2 = ~2.17 events/month. */
const APPOINTMENT_CADENCE_STRIDE = 2;

export type AppointmentBonusChannel = 'contractPayoutBonus' | 'researchSpeedBonus';

export interface AppointmentWorldEventDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  durationHours: number;
  bonusChannel: AppointmentBonusChannel;
  /** Fraction, e.g. 0.08 = +8%. Kept under the existing WORLD_EVENT_*_CAP
   *  (0.10) so even two appointment-style bonuses stacking with the Sol
   *  Events feed can never exceed the already-audited safety clamp. */
  bonusAmount: number;
}

export const APPOINTMENT_EVENT_CATALOG: AppointmentWorldEventDef[] = [
  {
    id: 'belt_rush_weekend',
    name: 'Belt Rush Weekend',
    icon: '⛏️',
    description: 'The Accord waives belt transit fees for 48 hours — extraction contracts pay out richer while the rush is on. Risk priced in: bidders who overcommit crowd out margin the moment the window closes.',
    durationHours: 48,
    bonusChannel: 'contractPayoutBonus',
    bonusAmount: 0.08,
  },
  {
    id: 'accord_audit_day',
    name: 'Accord Audit Day',
    icon: '📜',
    description: 'Quarterly compliance review sweeps the Accord bureaucracy into overdrive for 12 hours — research programs under review move faster while auditors are already in the building.',
    durationHours: 12,
    bonusChannel: 'researchSpeedBonus',
    bonusAmount: 0.06,
  },
  {
    id: 'launch_congestion_window',
    name: 'Launch Congestion Window',
    icon: '🚀',
    description: 'A dense stretch of real-world launch traffic backs up the range for 72 hours — launch-adjacent contracts pay a congestion premium while everyone competes for the same windows.',
    durationHours: 72,
    bonusChannel: 'contractPayoutBonus',
    bonusAmount: 0.08,
  },
];

export const APPOINTMENT_EVENT_MAP = new Map(APPOINTMENT_EVENT_CATALOG.map(e => [e.id, e]));

export function getAppointmentWeekIndex(nowMs: number): number {
  return Math.floor(nowMs / APPOINTMENT_WEEK_MS);
}

export function isAppointmentEventWeek(weekIndex: number): boolean {
  return ((weekIndex % APPOINTMENT_CADENCE_STRIDE) + APPOINTMENT_CADENCE_STRIDE) % APPOINTMENT_CADENCE_STRIDE === 0;
}

export interface AppointmentEventInstance {
  def: AppointmentWorldEventDef;
  weekIndex: number;
  startsAtMs: number;
  endsAtMs: number;
}

/** Deterministic: same weekIndex always yields the same event, start time,
 *  and duration for every player and every call site (client, server,
 *  tests). Returns null on off-cadence weeks. */
export function getAppointmentEventForWeek(weekIndex: number): AppointmentEventInstance | null {
  if (!isAppointmentEventWeek(weekIndex)) return null;
  const rng = mulberry32(hashStringToSeed(`world_apt_${weekIndex}`));
  const def = APPOINTMENT_EVENT_CATALOG[Math.floor(rng() * APPOINTMENT_EVENT_CATALOG.length)];
  const weekStartMs = weekIndex * APPOINTMENT_WEEK_MS;
  const dayOffset = Math.floor(rng() * 7);
  const hourOffset = Math.floor(rng() * 24);
  const startsAtMs = weekStartMs + dayOffset * DAY_MS + hourOffset * HOUR_MS;
  const endsAtMs = startsAtMs + def.durationHours * HOUR_MS;
  return { def, weekIndex, startsAtMs, endsAtMs };
}

/** Every appointment event whose window overlaps [now, now + horizonDays] —
 *  i.e. either still running or starting within the horizon. Sorted
 *  ascending by start time. Pure function of (nowMs, horizonDays). */
export function getUpcomingAppointmentEvents(
  nowMs: number = Date.now(),
  horizonDays: number = 14,
): AppointmentEventInstance[] {
  const horizonMs = horizonDays * DAY_MS;
  const startWeek = getAppointmentWeekIndex(nowMs) - 1; // catch an event still running from last week
  const endWeek = getAppointmentWeekIndex(nowMs + horizonMs) + 1;
  const out: AppointmentEventInstance[] = [];
  for (let w = startWeek; w <= endWeek; w++) {
    const inst = getAppointmentEventForWeek(w);
    if (!inst) continue;
    if (inst.endsAtMs < nowMs) continue;
    if (inst.startsAtMs > nowMs + horizonMs) continue;
    out.push(inst);
  }
  return out.sort((a, b) => a.startsAtMs - b.startsAtMs);
}

/** Appointment events active RIGHT NOW (startsAtMs <= now < endsAtMs). */
export function getActiveAppointmentEvents(nowMs: number = Date.now()): AppointmentEventInstance[] {
  return getUpcomingAppointmentEvents(nowMs, 8).filter(e => e.startsAtMs <= nowMs && e.endsAtMs > nowMs);
}

export interface AppointmentEventBonuses {
  contractPayoutBonus: number;
  researchSpeedBonus: number;
  expiresAtMs: number;
}

/** Pure transform: sum every currently-active appointment event's
 *  contribution into the flat bonus shape WorldEventBonusSnapshot already
 *  uses (see server-effects.ts clampWorldEventBonuses — the downstream
 *  clamp is the final safety net regardless of how many sources feed it). */
export function deriveAppointmentEventBonuses(nowMs: number = Date.now()): AppointmentEventBonuses | null {
  const active = getActiveAppointmentEvents(nowMs);
  if (active.length === 0) return null;

  let contractPayoutBonus = 0;
  let researchSpeedBonus = 0;
  let expiresAtMs = 0;
  for (const a of active) {
    if (a.def.bonusChannel === 'contractPayoutBonus') contractPayoutBonus += a.def.bonusAmount;
    else researchSpeedBonus += a.def.bonusAmount;
    expiresAtMs = Math.max(expiresAtMs, a.endsAtMs);
  }
  return { contractPayoutBonus, researchSpeedBonus, expiresAtMs };
}
