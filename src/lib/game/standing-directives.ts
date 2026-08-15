// ─── Space Tycoon: Standing Directives (Live-Service Wave LS1 "Night Shift") ─
// docs/LIVE_SERVICE_2026-08.md §LS1 item 2. Persistent automation policies —
// auto-sell, auto-restock, auto-renew delivery contracts, and a maintenance
// reserve floor. Every active directive adds to a superlinear monthly ops-fee
// sink (getDirectiveOpsFee) so automation is a priced economic trade-off, not
// a free default (CLAUDE.md "meaningful decisions" + docs/BALANCE.md sinks).
//
// Evaluated on the SAME deterministic per-game-month grid expeditions.ts /
// colonies use (processDirectivesForMonth is called once per elapsed
// game-month, both from game-engine.ts's live isMonthEnd hook and from
// away-operations.ts's catch-up loop) — the two paths share this one
// function, so behavior can never drift between "online" and "away".
//
// Deviation from the spec's data-model list: 'ship_loop' (route-repeating
// hauler automation priced through cargo-logistics.ts Δv/fuel) is NOT
// implemented this wave — see the LS1 report for reasoning. StandingDirective
// Type therefore only has the four directives below; charging an ops fee for
// a directive that doesn't actually automate anything would be dishonest.
//
// Pricing simplification: auto_sell / auto_restock transact at
// RESOURCE_MAP baseMarketPrice (the same "spot price" shortcut
// expeditions.ts already uses for exotic-fuel procurement) rather than
// routing through the live server order book / supply-adjusted price engine
// (market-engine.ts). Full order-book integration is a real scope item for a
// later wave — documented here as a deliberate, bounded simplification.

import type { GameState, GameEvent, StandingDirective, StandingDirectiveType } from './types';
import { RESOURCE_MAP, type ResourceId } from './resources';
import { acceptDelivery, deliverContract } from './delivery-contracts';
import { generateId, formatMoney } from './formulas';
import { DIRECTIVE_OPS_FEE_BASE, DIRECTIVE_OPS_FEE_EXPONENT, MAX_EVENT_LOG } from './constants';

// ─── CRUD (UI-facing) ────────────────────────────────────────────────────────

export const MAX_STANDING_DIRECTIVES = 8;

export function getActiveDirectives(state: GameState): StandingDirective[] {
  return (state.standingDirectives || []).filter(d => d.active);
}

export interface AddDirectiveResult { ok: boolean; state: GameState; reason?: 'limit_reached' | 'invalid' }

export function addDirective(
  state: GameState,
  input: Omit<StandingDirective, 'id' | 'createdAtMs' | 'active'>,
): AddDirectiveResult {
  const existing = state.standingDirectives || [];
  if (existing.length >= MAX_STANDING_DIRECTIVES) return { ok: false, state, reason: 'limit_reached' };
  if (input.type === 'maintenance_reserve' && !(input.reserveAmount && input.reserveAmount > 0)) {
    return { ok: false, state, reason: 'invalid' };
  }
  if ((input.type === 'auto_sell' || input.type === 'auto_restock') && !input.resourceId) {
    return { ok: false, state, reason: 'invalid' };
  }
  const directive: StandingDirective = { ...input, id: generateId(), createdAtMs: Date.now(), active: true };
  return { ok: true, state: { ...state, standingDirectives: [...existing, directive] } };
}

export function removeDirective(state: GameState, directiveId: string): GameState {
  const existing = state.standingDirectives || [];
  if (!existing.some(d => d.id === directiveId)) return state;
  return { ...state, standingDirectives: existing.filter(d => d.id !== directiveId) };
}

export function setDirectiveActive(state: GameState, directiveId: string, active: boolean): GameState {
  const existing = state.standingDirectives || [];
  if (!existing.some(d => d.id === directiveId)) return state;
  return {
    ...state,
    standingDirectives: existing.map(d => (d.id === directiveId ? { ...d, active } : d)),
  };
}

// ─── Ops fee (superlinear — docs/BALANCE.md sink pattern) ──────────────────

/** $250K x activeDirectiveCount^1.3 per game-month — every additional
 *  active directive raises the cost of running ALL of them. */
export function getDirectiveOpsFee(activeDirectiveCount: number): number {
  if (activeDirectiveCount <= 0) return 0;
  return Math.round(DIRECTIVE_OPS_FEE_BASE * Math.pow(activeDirectiveCount, DIRECTIVE_OPS_FEE_EXPONENT));
}

function getMaintenanceReserveFloor(directives: StandingDirective[]): number {
  let floor = 0;
  for (const d of directives) {
    if (d.type === 'maintenance_reserve' && d.active) floor = Math.max(floor, d.reserveAmount || 0);
  }
  return floor;
}

// ─── Monthly evaluation (shared by live tick + away catch-up) ──────────────

export interface DirectiveMonthResult {
  state: GameState;
  events: GameEvent[];
  feeCharged: number;
  actions: string[];
}

/** Evaluate every active directive for ONE elapsed game-month. Deterministic
 *  given state (no randomness — prices are read from RESOURCE_MAP, not
 *  rolled). Called once per game-month crossed, both live (game-engine.ts
 *  isMonthEnd hook) and during away catch-up (away-operations.ts's
 *  per-month loop, mirroring expeditions.ts's pattern). */
export function processDirectivesForMonth(
  state: GameState,
  monthIndex: number,
  now: number = Date.now(),
): DirectiveMonthResult {
  const active = getActiveDirectives(state);
  if (active.length === 0) return { state, events: [], feeCharged: 0, actions: [] };

  const events: GameEvent[] = [];
  const actions: string[] = [];
  const fee = getDirectiveOpsFee(active.length);

  let working: GameState = fee > 0
    ? { ...state, money: state.money - fee, totalSpent: state.totalSpent + fee }
    : state;

  for (const d of active) {
    if (d.type === 'auto_sell' && d.resourceId) {
      const price = RESOURCE_MAP.get(d.resourceId as ResourceId)?.baseMarketPrice || 0;
      const minPrice = d.minPrice ?? 0;
      if (price >= minPrice && price > 0) {
        const have = working.resources[d.resourceId] || 0;
        const cap = d.maxUnitsPerMonth != null ? Math.min(have, d.maxUnitsPerMonth) : have;
        const sellQty = Math.max(0, Math.floor(cap));
        if (sellQty > 0) {
          const proceeds = Math.round(sellQty * price);
          working = {
            ...working,
            money: working.money + proceeds,
            totalEarned: working.totalEarned + proceeds,
            resources: { ...working.resources, [d.resourceId]: have - sellQty },
          };
          actions.push(`Auto-sell: -${sellQty} ${d.resourceId.replace(/_/g, ' ')} (+${formatMoney(proceeds)})`);
        }
      }
    } else if (d.type === 'auto_restock' && d.resourceId) {
      const price = RESOURCE_MAP.get(d.resourceId as ResourceId)?.baseMarketPrice || 0;
      const maxPrice = d.maxPrice ?? Infinity;
      if (price > 0 && price <= maxPrice) {
        const have = working.resources[d.resourceId] || 0;
        const target = d.targetStock ?? 0;
        const need = Math.max(0, target - have);
        const capped = d.maxUnitsPerMonth != null ? Math.min(need, d.maxUnitsPerMonth) : need;
        const reserve = getMaintenanceReserveFloor(active);
        const spendable = Math.max(0, working.money - reserve);
        const affordableQty = Math.floor(spendable / price);
        const buyQty = Math.max(0, Math.min(capped, affordableQty));
        if (buyQty > 0) {
          const cost = Math.round(buyQty * price);
          working = {
            ...working,
            money: working.money - cost,
            totalSpent: working.totalSpent + cost,
            resources: { ...working.resources, [d.resourceId]: have + buyQty },
          };
          actions.push(`Auto-restock: +${buyQty} ${d.resourceId.replace(/_/g, ' ')} (-${formatMoney(cost)})`);
        }
      }
    } else if (d.type === 'auto_renew_contract') {
      const pool = working.availableDeliveries || [];
      const whitelist = d.resourceWhitelist && d.resourceWhitelist.length > 0 ? new Set(d.resourceWhitelist) : null;
      const cap = d.maxContractsPerMonth ?? 3;
      let filled = 0;
      for (const c of pool) {
        if (filled >= cap) break;
        if (c.status !== 'open') continue;
        if (whitelist && !whitelist.has(c.resourceId)) continue;
        if ((working.resources[c.resourceId] || 0) < c.quantity) continue;
        working = acceptDelivery(working, c.id, now);
        working = deliverContract(working, c.id, now);
        filled++;
      }
      if (filled > 0) actions.push(`Auto-renew: fulfilled ${filled} delivery contract${filled === 1 ? '' : 's'}`);
    }
    // maintenance_reserve has no direct action of its own — it only gates
    // auto_restock spend above.
  }

  if (fee > 0) {
    events.push({
      id: generateId(),
      date: state.gameDate,
      type: 'random_event',
      title: '🤖 Standing directives — ops overhead',
      description: `${active.length} active director${active.length === 1 ? 'y' : 'ies'} charged ${formatMoney(fee)} in automation overhead this month.`,
    });
  }

  return {
    state: {
      ...working,
      eventLog: events.length > 0 ? [...events, ...working.eventLog].slice(0, MAX_EVENT_LOG) : working.eventLog,
    },
    events,
    feeCharged: fee,
    actions,
  };
}

export function getDirectiveTypeLabel(type: StandingDirectiveType): string {
  switch (type) {
    case 'auto_sell': return 'Auto-Sell';
    case 'auto_restock': return 'Auto-Restock';
    case 'auto_renew_contract': return 'Auto-Renew Contracts';
    case 'maintenance_reserve': return 'Maintenance Reserve';
    default: return type;
  }
}
