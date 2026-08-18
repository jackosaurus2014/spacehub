// ─── Space Tycoon: Offense Fee Index — server computation (Balance Pass 9) ──
// DB-backed counterpart to the pure fee-index.ts (mirrors the
// offense.ts / offense-server.ts split). Computes the world median monthly
// net from server profile telemetry and caches it per real-world UTC
// calendar quarter (the LS9 Realignment boundary — "recomputed quarterly").
//
// THE STAT: for every profile synced in the last 30 days and at least
// 7 real days old (younger lifetime averages are pure noise), monthly net =
// (totalEarned − totalSpent) ÷ elapsed game-months (6h game-months since
// createdAt). totalEarned/totalSpent are server-reconciled One-Wallet
// columns — server truth, never client re-derivation. The median of those
// per-profile figures feeds computeFeeIndexFactor.
//
// CACHE: module-level, keyed by quarter — the factor is intentionally a
// step function that only moves at quarter boundaries (per-instance; a
// multi-instance deploy may compute the quarter's value at slightly
// different wall-clock moments, which is acceptable slack for a stat whose
// job is order-of-magnitude era scaling). Every failure path degrades to
// factor 1 — fees are never inflated by a broken read.

import prisma from '@/lib/db';
import {
  computeFeeIndexFactor, type FeeIndexSnapshot,
} from './fee-index';

/** One game-month = 6 real hours (server-time.ts REAL_SECONDS_PER_GAME_MONTH). */
const GAME_MONTH_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC calendar-quarter key, e.g. "2026Q3". */
export function feeIndexQuarterKey(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  return `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

let cached: { quarter: string; snapshot: FeeIndexSnapshot } | null = null;

/** Pure core — median monthly net over per-profile lifetime figures.
 *  Exported for tests. */
export function computeMedianMonthlyNet(
  profiles: { totalEarned: number; totalSpent: number; createdAtMs: number }[],
  nowMs: number,
): number {
  const nets: number[] = [];
  for (const p of profiles) {
    const months = Math.max(1, (nowMs - p.createdAtMs) / GAME_MONTH_MS);
    const net = (p.totalEarned - p.totalSpent) / months;
    if (Number.isFinite(net)) nets.push(net);
  }
  if (nets.length === 0) return 0;
  nets.sort((a, b) => a - b);
  return nets[Math.floor(nets.length / 2)];
}

/**
 * The server's fee-index snapshot for the current quarter. Cached per
 * quarter per instance; fail-soft to factor 1 on any error.
 */
export async function getServerFeeIndexSnapshot(nowMs: number = Date.now()): Promise<FeeIndexSnapshot> {
  const quarter = feeIndexQuarterKey(nowMs);
  if (cached && cached.quarter === quarter) return cached.snapshot;
  let snapshot: FeeIndexSnapshot = { factor: 1, medianMonthlyNet: 0, asOf: nowMs };
  try {
    const rows = await prisma.gameProfile.findMany({
      where: {
        lastSyncAt: { gt: new Date(nowMs - 30 * DAY_MS) },
        createdAt: { lt: new Date(nowMs - 7 * DAY_MS) },
      },
      select: { totalEarned: true, totalSpent: true, createdAt: true },
      take: 5000,
    });
    const median = computeMedianMonthlyNet(
      rows.map(r => ({ totalEarned: r.totalEarned, totalSpent: r.totalSpent, createdAtMs: r.createdAt.getTime() })),
      nowMs,
    );
    snapshot = { factor: computeFeeIndexFactor(median), medianMonthlyNet: Math.round(median), asOf: nowMs };
  } catch { /* fail-soft factor 1 */ }
  cached = { quarter, snapshot };
  return snapshot;
}

/** Convenience: just the factor (charge sites). */
export async function getServerFeeIndexFactor(nowMs: number = Date.now()): Promise<number> {
  return (await getServerFeeIndexSnapshot(nowMs)).factor;
}

/** Test helper — clears the per-quarter cache. */
export function __clearFeeIndexCache(): void {
  cached = null;
}
