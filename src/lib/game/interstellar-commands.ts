// ─── Space Tycoon: Interstellar Signal Lag ──────────────────────────────────
// docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 12 (founder-approved 2026-09-02).
//
// `PendingInterstellarCommand` has existed in interstellar.ts since Phase VIII
// with no consumer — the beyond-heliopause era executed every order the
// instant it was clicked, exactly like a Sol-side order. This module is the
// consumer: orders aimed at assets in ANOTHER star system are *transmitted*,
// not executed. They wait out their light lag in
// `state.pendingInterstellarCommands` and the engine tick applies them when
// they arrive.
//
// Why this is a real decision (CLAUDE.md "meaningful decisions", campaign
// loop per docs/SESSION_DESIGN.md):
//   • You commit capital days before it does anything. Founding a Sirius
//     colony is a ~4.3-day bet, not a click.
//   • The fee leaves at ISSUE time through the same money/totalSpent path the
//     immediate call used — the mission was bought when the order was sent.
//   • Cancelling before arrival is allowed and refunds NOTHING. Recalling a
//     transmission does not un-spend what it bought. That asymmetry is the
//     point: think before you transmit.
//   • Conditions can change in flight. If the order is no longer legal when
//     it lands (the colony already exists, population fell below the upgrade
//     threshold), it fails on arrival and the money is still gone — with an
//     event log line saying so.
//
// Lag rate and the constant live in interstellar.ts
// (SIGNAL_LAG_GAME_MONTHS_PER_LY = 2 game-months per light-year =
// LIGHT_LAG_PER_LY_MS = 12 real hours per ly). See docs/BALANCE.md
// "Signal lag".
//
// Determinism: every function here is pure and takes `nowMs` explicitly,
// mirroring expeditions.ts / cargo-logistics.ts.

import type { GameState, GameEvent } from './types';
import {
  INTERSTELLAR_SYSTEM_MAP,
  getSystemSignalLagMs,
  type PendingInterstellarCommand,
  type InterstellarCommandKind,
} from './interstellar';
import {
  establishColony,
  upgradeColony,
  establishTradeRoute,
  setTradeRouteStatus,
  getColonyUpgradeCost,
  COLONY_FOUNDING_COST,
  TRADE_ROUTE_SETUP_COST,
  COLONY_CAPABLE_SHIP_IDS,
} from './expeditions';
import { RESOURCE_MAP } from './resources';
import { generateId, formatMoney } from './formulas';
import { MAX_EVENT_LOG } from './constants';

// ─── Issue requests (what the UI hands us) ───────────────────────────────────

export type InterstellarCommandRequest =
  | { kind: 'found_colony'; expeditionId: string; name?: string }
  | { kind: 'upgrade_colony'; colonyId: string }
  | { kind: 'establish_trade_route'; colonyId: string; resourceId: string }
  | { kind: 'set_trade_route_status'; tradeRouteId: string; status: 'active' | 'suspended' }
  | { kind: 'recall_expedition'; expeditionId: string };

export interface IssueResult { ok: true; state: GameState; command: PendingInterstellarCommand }
export interface IssueError {
  ok: false;
  reason: 'unknown_target' | 'insufficient_funds' | 'already_queued' | 'invalid';
  detail?: string;
}

/** Human-readable one-liner shown on the queue chip and in the panel. */
function describe(kind: InterstellarCommandKind, systemName: string, extra?: string): string {
  switch (kind) {
    case 'found_colony': return `Found colony — ${systemName}`;
    case 'upgrade_colony': return `Expand colony — ${systemName}`;
    case 'establish_trade_route': return `Open trade route — ${systemName}${extra ? ` (${extra})` : ''}`;
    case 'set_trade_route_status': return `${extra === 'suspended' ? 'Suspend' : 'Resume'} trade route — ${systemName}`;
    case 'recall_expedition': return `Recall expedition — ${systemName}`;
    default: return `Order — ${systemName}`;
  }
}

/** Which system an order is aimed at (and the fee it costs to send). */
function resolveTarget(state: GameState, req: InterstellarCommandRequest): { systemId: string; fee: number; extra?: string } | IssueError {
  switch (req.kind) {
    case 'found_colony': {
      const exp = (state.expeditions || []).find(e => e.id === req.expeditionId);
      if (!exp) return { ok: false, reason: 'unknown_target', detail: 'Expedition not found.' };
      return { systemId: exp.targetSystemId, fee: COLONY_FOUNDING_COST };
    }
    case 'upgrade_colony': {
      const colony = (state.interstellarColonies || []).find(c => c.id === req.colonyId);
      if (!colony) return { ok: false, reason: 'unknown_target', detail: 'Colony not found.' };
      return { systemId: colony.systemId, fee: getColonyUpgradeCost(colony.infrastructureLevel) };
    }
    case 'establish_trade_route': {
      const colony = (state.interstellarColonies || []).find(c => c.id === req.colonyId);
      if (!colony) return { ok: false, reason: 'unknown_target', detail: 'Colony not found.' };
      return {
        systemId: colony.systemId,
        fee: TRADE_ROUTE_SETUP_COST,
        extra: RESOURCE_MAP.get(req.resourceId as never)?.name || req.resourceId,
      };
    }
    case 'set_trade_route_status': {
      const route = (state.interstellarTradeRoutes || []).find(r => r.id === req.tradeRouteId);
      if (!route) return { ok: false, reason: 'unknown_target', detail: 'Trade route not found.' };
      return { systemId: route.systemId, fee: 0, extra: req.status };
    }
    case 'recall_expedition': {
      const exp = (state.expeditions || []).find(e => e.id === req.expeditionId);
      if (!exp) return { ok: false, reason: 'unknown_target', detail: 'Expedition not found.' };
      if (exp.phase !== 'exploring') {
        return { ok: false, reason: 'invalid', detail: 'Only an expedition surveying on station can be recalled.' };
      }
      if ((COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(exp.shipDefinitionId)) {
        return { ok: false, reason: 'invalid', detail: 'A colony ark holds station permanently — it has no return leg to bring forward.' };
      }
      return { systemId: exp.targetSystemId, fee: 0 };
    }
    default:
      return { ok: false, reason: 'invalid' };
  }
}

/** Identity key so the same order cannot be transmitted twice while one is
 *  already in flight (the second copy would just fail on arrival). */
function requestKey(req: InterstellarCommandRequest): string {
  switch (req.kind) {
    case 'found_colony': return `found_colony:${req.expeditionId}`;
    case 'upgrade_colony': return `upgrade_colony:${req.colonyId}`;
    case 'establish_trade_route': return `establish_trade_route:${req.colonyId}:${req.resourceId}`;
    case 'set_trade_route_status': return `set_trade_route_status:${req.tradeRouteId}`;
    case 'recall_expedition': return `recall_expedition:${req.expeditionId}`;
    default: return 'invalid';
  }
}

function commandKey(cmd: PendingInterstellarCommand): string {
  switch (cmd.kind) {
    case 'found_colony': return `found_colony:${cmd.expeditionId}`;
    case 'upgrade_colony': return `upgrade_colony:${cmd.colonyId}`;
    case 'establish_trade_route': return `establish_trade_route:${cmd.colonyId}:${cmd.resourceId}`;
    case 'set_trade_route_status': return `set_trade_route_status:${cmd.tradeRouteId}`;
    case 'recall_expedition': return `recall_expedition:${cmd.expeditionId}`;
    default: return 'invalid';
  }
}

/**
 * Transmit an order. Debits its fee immediately (the same money/totalSpent
 * path the direct call used) and queues it for arrival at
 * `now + distanceLy × LIGHT_LAG_PER_LY_MS`.
 */
export function issueInterstellarCommand(
  state: GameState,
  req: InterstellarCommandRequest,
  nowMs: number = Date.now(),
): IssueResult | IssueError {
  const target = resolveTarget(state, req);
  if ('ok' in target) return target;

  const queue = state.pendingInterstellarCommands || [];
  const key = requestKey(req);
  if (queue.some(c => commandKey(c) === key)) {
    return { ok: false, reason: 'already_queued', detail: 'That order is already in transit.' };
  }
  if (target.fee > 0 && state.money < target.fee) {
    return { ok: false, reason: 'insufficient_funds', detail: `Transmitting this order costs ${formatMoney(target.fee)} up front.` };
  }

  const system = INTERSTELLAR_SYSTEM_MAP.get(target.systemId);
  const distanceLy = system?.distanceLy ?? 0;
  const lagMs = getSystemSignalLagMs(target.systemId);
  const command: PendingInterstellarCommand = {
    id: generateId(),
    kind: req.kind,
    targetSystemId: target.systemId,
    distanceLy,
    feePaid: target.fee,
    sentAtMs: nowMs,
    executeAtMs: nowMs + lagMs,
    label: describe(req.kind, system?.name || target.systemId, target.extra),
    ...(req.kind === 'found_colony' ? { expeditionId: req.expeditionId, colonyName: req.name } : {}),
    ...(req.kind === 'recall_expedition' ? { expeditionId: req.expeditionId } : {}),
    ...(req.kind === 'upgrade_colony' ? { colonyId: req.colonyId } : {}),
    ...(req.kind === 'establish_trade_route' ? { colonyId: req.colonyId, resourceId: req.resourceId } : {}),
    ...(req.kind === 'set_trade_route_status' ? { tradeRouteId: req.tradeRouteId, routeStatus: req.status } : {}),
  };

  const hours = Math.round(lagMs / 3_600_000);
  const event: GameEvent = {
    id: generateId(),
    date: state.gameDate,
    type: 'milestone',
    title: `📡 Order transmitted — ${system?.name || target.systemId}`,
    description: `${command.label}. Signal crosses ${distanceLy.toFixed(2)} ly; the order arrives in ~${hours}h.${target.fee > 0 ? ` ${formatMoney(target.fee)} committed on transmission — cancelling the order does not refund it.` : ''}`,
  };

  return {
    ok: true,
    command,
    state: {
      ...state,
      money: state.money - target.fee,
      totalSpent: state.totalSpent + target.fee,
      pendingInterstellarCommands: [...queue, command],
      eventLog: [event, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
    },
  };
}

/**
 * Cancel an order still in flight. NO REFUND — the fee bought a mission that
 * has already left. Returns the same state reference when the id is unknown.
 */
export function cancelInterstellarCommand(
  state: GameState,
  commandId: string,
): GameState {
  const queue = state.pendingInterstellarCommands || [];
  const cmd = queue.find(c => c.id === commandId);
  if (!cmd) return state;
  return {
    ...state,
    pendingInterstellarCommands: queue.filter(c => c.id !== commandId),
    eventLog: [{
      id: generateId(),
      date: state.gameDate,
      type: 'random_event' as const,
      title: '🛑 Order recalled mid-transmission',
      description: `${cmd.label} cancelled before arrival.${cmd.feePaid > 0 ? ` The ${formatMoney(cmd.feePaid)} committed on transmission is not refunded.` : ''}`,
    }, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
  };
}

// ─── Arrival (the engine tick) ───────────────────────────────────────────────

/** Apply ONE arrived command. Prepaid: the fee left at issue time, so the
 *  executors run with `prepaid: true` and never charge again. */
function applyCommand(state: GameState, cmd: PendingInterstellarCommand, nowMs: number): { state: GameState; ok: boolean; detail?: string } {
  switch (cmd.kind) {
    case 'found_colony': {
      if (!cmd.expeditionId) return { state, ok: false, detail: 'malformed order' };
      const res = establishColony(state, cmd.expeditionId, cmd.colonyName, nowMs, { prepaid: true });
      return res.ok ? { state: res.state, ok: true } : { state, ok: false, detail: res.reason };
    }
    case 'upgrade_colony': {
      if (!cmd.colonyId) return { state, ok: false, detail: 'malformed order' };
      const res = upgradeColony(state, cmd.colonyId, { prepaid: true });
      return res.ok ? { state: res.state, ok: true } : { state, ok: false, detail: res.reason };
    }
    case 'establish_trade_route': {
      if (!cmd.colonyId || !cmd.resourceId) return { state, ok: false, detail: 'malformed order' };
      const res = establishTradeRoute(state, cmd.colonyId, cmd.resourceId, nowMs, { prepaid: true });
      return res.ok ? { state: res.state, ok: true } : { state, ok: false, detail: res.reason };
    }
    case 'set_trade_route_status': {
      if (!cmd.tradeRouteId || !cmd.routeStatus) return { state, ok: false, detail: 'malformed order' };
      const next = setTradeRouteStatus(state, cmd.tradeRouteId, cmd.routeStatus);
      return { state: next, ok: next !== state, detail: next === state ? 'route already in that state' : undefined };
    }
    case 'recall_expedition': {
      // Cut the survey window short: the explorer starts its return leg at
      // the month the order arrives. The data payout is scaled by the
      // fraction of the survey actually completed, so an early recall trades
      // survey revenue for a hull and crew back sooner — never a free win.
      const expeditions = state.expeditions || [];
      const exp = expeditions.find(e => e.id === cmd.expeditionId);
      if (!exp || exp.phase !== 'exploring') return { state, ok: false, detail: 'expedition is no longer on station' };
      const surveyed = Math.max(0, exp.monthsElapsed - exp.outboundMonths);
      const fraction = exp.exploreMonths > 0 ? Math.min(1, surveyed / exp.exploreMonths) : 1;
      if (surveyed >= exp.exploreMonths) return { state, ok: false, detail: 'survey already complete' };
      return {
        ok: true,
        state: {
          ...state,
          expeditions: expeditions.map(e => e.id !== exp.id ? e : {
            ...e,
            exploreMonths: surveyed,
            outcome: e.outcome
              ? { ...e.outcome, surveyDataPayout: Math.round(e.outcome.surveyDataPayout * fraction) }
              : e.outcome,
          }),
        },
      };
    }
    default:
      return { state, ok: false, detail: 'unknown order' };
  }
}

/**
 * Execute every command whose signal has arrived. Wired into
 * game-engine.processFullTick next to the expedition tick. Returns the SAME
 * state reference when nothing is due (the engine can skip the copy).
 */
export function processInterstellarCommandTick(
  state: GameState,
  nowMs: number = Date.now(),
): GameState {
  const queue = state.pendingInterstellarCommands || [];
  if (queue.length === 0) return state;
  const due = queue.filter(c => c.executeAtMs <= nowMs);
  if (due.length === 0) return state;

  let working: GameState = { ...state, pendingInterstellarCommands: queue.filter(c => c.executeAtMs > nowMs) };
  const events: GameEvent[] = [];
  // Oldest transmission first — arrival order is send order at a fixed lag.
  for (const cmd of due.slice().sort((a, b) => a.executeAtMs - b.executeAtMs)) {
    const result = applyCommand(working, cmd, nowMs);
    working = result.state;
    if (!result.ok) {
      events.push({
        id: generateId(),
        date: working.gameDate,
        type: 'random_event',
        title: '📡 Order arrived — could not be carried out',
        description: `${cmd.label}: conditions changed in the ${cmd.distanceLy.toFixed(2)}-light-year crossing (${result.detail || 'no longer valid'}).${cmd.feePaid > 0 ? ` The ${formatMoney(cmd.feePaid)} committed on transmission is not refunded.` : ''}`,
      });
    }
  }

  return events.length > 0
    ? { ...working, eventLog: [...events, ...(working.eventLog || [])].slice(0, MAX_EVENT_LOG) }
    : working;
}

// ─── UI lens ────────────────────────────────────────────────────────────────

export interface InterstellarCommandProgress {
  command: PendingInterstellarCommand;
  /** 0..1 of the signal's crossing completed. */
  progress: number;
  msRemaining: number;
  /** "arrives in 34h" / "arrives in 12m" — reduced-motion-safe plain text. */
  etaLabel: string;
}

export function formatSignalEta(msRemaining: number): string {
  if (msRemaining <= 0) return 'arriving';
  const hours = msRemaining / 3_600_000;
  if (hours >= 1) return `arrives in ${Math.round(hours)}h`;
  return `arrives in ${Math.max(1, Math.round(msRemaining / 60_000))}m`;
}

export function getInterstellarCommandProgress(
  state: GameState,
  nowMs: number = Date.now(),
): InterstellarCommandProgress[] {
  return (state.pendingInterstellarCommands || [])
    .slice()
    .sort((a, b) => a.executeAtMs - b.executeAtMs)
    .map(command => {
      const total = Math.max(1, command.executeAtMs - command.sentAtMs);
      const elapsed = Math.max(0, nowMs - command.sentAtMs);
      const msRemaining = Math.max(0, command.executeAtMs - nowMs);
      return {
        command,
        progress: Math.max(0, Math.min(1, elapsed / total)),
        msRemaining,
        etaLabel: formatSignalEta(msRemaining),
      };
    });
}
