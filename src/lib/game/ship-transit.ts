// ─── Ship transit — the shared contract + the client's adoption ─────────────
// Ship traffic Phase 2 (2026-09-14). When the traffic layer shipped
// (9004b9a6) ships were not server rows: every other corporation's position
// was derived from `GameProfile.shipsData`, the blob the client last synced.
// The ShipTransit model (prisma/schema.prisma) closes that gap, and this
// file is its renderer-neutral, DB-free half — the wire block both the sync
// and the dispatch route speak, plus `adoptServerTransits`, the client-side
// mirror of `adoptServerMining` / `adoptServerExpeditions`.
//
// The contract in one line: the CLIENT keeps animating between ticks; the
// SERVER's departure and arrival instants win on every disagreement, and a
// leg the server has landed can never be held open locally.
//
// Why adoption clamps rather than clears. The manifest a freighter carries
// lives on `ship.route.cargo` and is credited exactly once, by the engine's
// transit-arrival branch, when `now >= route.arrivalAtMs` (cargo-logistics.ts
// dispatchShipWithCargo debits it at departure — the matching credit has no
// other path). So adoption never deletes a route: it pulls `arrivalAtMs`
// down to the server's instant and lets the engine land the ship itself on
// its next tick. Clearing the route here would destroy the goods.
//
// Time loop: TACTICAL (docs/SESSION_DESIGN.md) — a dispatch is a
// seconds-to-minutes decision; the cron that closes a leg runs every 5.

import type { ShipInstance } from './ships';
import type { GameState } from './types';

// ─── Statuses ────────────────────────────────────────────────────────────────

export const TRANSIT_IN_FLIGHT = 'in_transit';
/** Terminal: the server's clock says the hull is at its destination. */
export const TRANSIT_ARRIVED = 'arrived';
/** Terminal: the leg was superseded (a new dispatch for the same hull). */
export const TRANSIT_CANCELLED = 'cancelled';

export const TRANSIT_LIVE_STATUSES: readonly string[] = [TRANSIT_IN_FLIGHT];

// ─── Wire contract ───────────────────────────────────────────────────────────

/** One server transit row as the owner sees it. Returned by the dispatch
 *  route and rolled into the sync response; never exposed to anyone else
 *  (the anonymised view other corporations get is ship-traffic.ts
 *  TrafficContact, which carries no ids and no manifest). */
export interface ServerTransitBlock {
  id: string;
  shipInstanceId: string;
  shipDefinitionId: string;
  originId: string;
  destinationId: string;
  departedAtMs: number;
  arrivesAtMs: number;
  arrivedAtMs: number | null;
  status: string;
  /** The manifest the server recorded at departure — used only to restore a
   *  route the local save lost (a second device, a cleared browser). */
  cargo: Record<string, number> | null;
}

// ─── Travel-time floor (the anti-forgery clamp) ─────────────────────────────

/** The server never accepts an arrival sooner than this fraction of the
 *  catalogue travel time for the leg. Research, modules, workforce and
 *  commander traits legitimately shorten a journey (game-engine.ts
 *  transitSpeedMult is capped well inside this), so the floor is generous —
 *  it exists to refuse "arrives in one second", not to re-derive the
 *  client's bonus stack. */
export const MIN_TRAVEL_FRACTION = 0.25;
/** And never an arrival further out than this multiple, so a hull cannot be
 *  parked mid-lane forever to fake a presence on a contested route. */
export const MAX_TRAVEL_FRACTION = 4;

/** Clamp a claimed journey duration (ms) against the catalogue time for the
 *  leg (seconds). Pure — shared by the dispatch route and the sync's
 *  back-fill so both refuse the same forgeries. */
export function clampTravelMs(claimedMs: number, catalogueSeconds: number): number {
  const base = Math.max(1, catalogueSeconds) * 1000;
  const lo = Math.round(base * MIN_TRAVEL_FRACTION);
  const hi = Math.round(base * MAX_TRAVEL_FRACTION);
  if (!Number.isFinite(claimedMs) || claimedMs <= 0) return base;
  return Math.max(lo, Math.min(hi, Math.round(claimedMs)));
}

// ─── Client adoption ─────────────────────────────────────────────────────────

function sameLeg(route: NonNullable<ShipInstance['route']>, row: ServerTransitBlock): boolean {
  return route.from === row.originId && route.to === row.destinationId;
}

/**
 * Fold the server's transit rows into the save. Mirrors
 * asteroid-claims.ts `adoptServerMining` and expeditions.ts
 * `adoptServerExpeditions`: same state reference back when nothing changed,
 * never invents a ship the save does not have, and only ever moves the
 * client's picture TOWARD the server's.
 *
 *   live row, same leg      → adopt the server's departure and arrival
 *                             instants verbatim (the client's are advisory);
 *   live row, no/other leg  → restore the leg from the row, manifest and all
 *                             (the save lost it — another device, a reset);
 *   arrived row             → pull `arrivalAtMs` down to the server's
 *                             instant, never up, so the engine's own
 *                             arrival branch credits the manifest on the
 *                             next tick. A client cannot hold a landed ship
 *                             in flight, and cannot land one early either.
 *
 * A forged local position therefore gains nothing: the only figures anyone
 * else can see come from the row (ship-traffic-server.ts), and the only
 * figures this save is allowed to keep are the row's too.
 */
export function adoptServerTransits(
  state: GameState,
  rows: readonly ServerTransitBlock[] | null | undefined,
  nowMs: number = Date.now(),
): GameState {
  if (!rows || rows.length === 0 || !state.ships?.length) return state;
  const byShip = new Map<string, ServerTransitBlock>();
  for (const r of rows) {
    if (!r || typeof r.shipInstanceId !== 'string') continue;
    if (!Number.isFinite(r.departedAtMs) || !Number.isFinite(r.arrivesAtMs)) continue;
    const prev = byShip.get(r.shipInstanceId);
    // Latest departure wins: a hull only ever flies one leg at a time.
    if (!prev || r.departedAtMs >= prev.departedAtMs) byShip.set(r.shipInstanceId, r);
  }
  if (byShip.size === 0) return state;

  let changed = false;
  const ships = state.ships.map(ship => {
    const row = byShip.get(ship.instanceId);
    if (!row) return ship;
    const live = row.status === TRANSIT_IN_FLIGHT && nowMs < row.arrivesAtMs;

    if (live) {
      const route = ship.route;
      if (route && sameLeg(route, row)) {
        if (route.departedAtMs === row.departedAtMs && route.arrivalAtMs === row.arrivesAtMs && ship.status === 'in_transit') return ship;
        changed = true;
        return {
          ...ship,
          status: 'in_transit' as const,
          miningOperation: undefined,
          route: { ...route, departedAtMs: row.departedAtMs, arrivalAtMs: row.arrivesAtMs },
        };
      }
      // The save has no idea this hull is flying. Restore the leg from the
      // row rather than leaving a ship the server is moving sitting idle.
      changed = true;
      return {
        ...ship,
        status: 'in_transit' as const,
        miningOperation: undefined,
        currentLocation: row.originId,
        route: {
          from: row.originId,
          to: row.destinationId,
          departedAtMs: row.departedAtMs,
          arrivalAtMs: row.arrivesAtMs,
          cargo: row.cargo ?? route?.cargo ?? {},
        },
      };
    }

    // Terminal (or past its arrival): the leg is over on the server. Pull a
    // matching local route's arrival down so the engine lands it; never push
    // it out, never clear it — the manifest credit rides that branch.
    if (row.status === TRANSIT_CANCELLED) return ship;
    const route = ship.route;
    if (!route || !sameLeg(route, row)) return ship;
    if (route.arrivalAtMs <= row.arrivesAtMs) return ship;
    changed = true;
    return { ...ship, route: { ...route, arrivalAtMs: row.arrivesAtMs } };
  });

  return changed ? { ...state, ships } : state;
}

// ─── The traffic feed's view of a row ───────────────────────────────────────

/** A transit row flattened for the anonymised traffic pool
 *  (ship-traffic-server.ts). Declared here, in the DB-free half, so the feed
 *  builder stays prisma-free and unit-testable; the loader that produces it
 *  is server-ship-transit.ts `loadTrafficTransits`.
 *
 *  It carries the owner's profile id and the manifest because the feed's
 *  publish step needs both to decide what a requester has EARNED — and
 *  strips both from anything that leaves the module (publishContact). */
export interface TrafficTransitRow {
  profileId: string;
  shipInstanceId: string;
  shipDefinitionId: string;
  originId: string;
  destinationId: string;
  departedAtMs: number;
  arrivesAtMs: number;
  status: string;
  cargo: Record<string, number> | null;
}
