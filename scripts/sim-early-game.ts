// ─── Space Tycoon: early-game pace probe (Balance Pass 10, 2026-09-12) ─────
// Answers the founder's question directly from the live engine: for each
// archetype, what is the monthly net income of a fresh corporation (the same
// computeEconomyReport figure the top bar shows), with and without the
// Frontier revenue doubling, and how many 6-hour game-months (real days) it
// takes on base income alone to afford the first $50M research and a GEO
// Telecom Satellite (sat + GEO unlock). Run: npx tsx scripts/sim-early-game.ts
// Deterministic — no Date.now-dependent economics beyond the Frontier flag.

import { getNewGameState } from '../src/lib/game/save-load';
import { applyArchetype, ARCHETYPES } from '../src/lib/game/archetypes';
import { computeEconomyReport } from '../src/lib/game/economy-report';
import { BUILDING_MAP } from '../src/lib/game/buildings';
import { RESEARCH } from '../src/lib/game/research-tree';
import { LOCATION_MAP } from '../src/lib/game/solar-system';
import type { GameState } from '../src/lib/game/types';

const fm = (n: number) => `$${(n / 1e6).toFixed(1)}M`;
const HOURS_PER_MONTH = 6;

const geoSat = BUILDING_MAP.get('sat_telecom_geo')!.baseCost;
const geoUnlock = (LOCATION_MAP.get('geo') as { unlockCost?: number } | undefined)?.unlockCost ?? 50_000_000;
const t1 = RESEARCH.filter(r => r.tier === 1).map(r => r.baseCostMoney).sort((a, b) => a - b);
const cheapestT1 = t1[0];
const medianT1 = t1[Math.floor(t1.length / 2)];
const reusable = RESEARCH.find(r => r.id === 'reusable_boosters')!.baseCostMoney;

console.log('# Early-game pace probe (scripts/sim-early-game.ts)\n');
console.log(`GEO Telecom Satellite ${fm(geoSat)} + GEO unlock ${fm(geoUnlock)} = ${fm(geoSat + geoUnlock)}; tier-1 research: cheapest ${fm(cheapestT1)}, median ${fm(medianT1)}, Reusable Boosters ${fm(reusable)}\n`);
console.log('| archetype | cash | net/mo (no Frontier) | net/mo (Frontier ×2.0) | months→$50M research (base / Frontier) | months→GEO sat+unlock (base / Frontier) |');
console.log('| --- | --- | --- | --- | --- | --- |');

for (const arch of ARCHETYPES) {
  const base = applyArchetype(getNewGameState(), arch.id);
  const now = Date.now();
  const on: GameState = { ...base, createdAt: now - 60_000, frontierStatus: 'active', frontierEnteredAtMs: now - 60_000 };
  const off: GameState = { ...base, frontierStatus: 'none' };
  const repOn = computeEconomyReport(on, now);
  const repOff = computeEconomyReport(off, now);
  const monthsTo = (target: number, net: number) => {
    const gap = target - base.money;
    if (gap <= 0) return '0 (cash on hand)';
    if (net <= 0) return 'never';
    const m = gap / net;
    return `${m.toFixed(1)} mo ≈ ${(m * HOURS_PER_MONTH / 24).toFixed(1)} d`;
  };
  console.log(`| ${arch.name} | ${fm(base.money)} | ${fm(repOff.monthlyNet)} | ${fm(repOn.monthlyNet)} | ${monthsTo(50_000_000, repOff.monthlyNet)} / ${monthsTo(50_000_000, repOn.monthlyNet)} | ${monthsTo(geoSat + geoUnlock, repOff.monthlyNet)} / ${monthsTo(geoSat + geoUnlock, repOn.monthlyNet)} |`);
}

console.log('\nPre-Pass-10 reference (founder measurement): Cape Heritage +$4.9M/mo; $100M tier-1 research ≈ 5 real days of income; $150M GEO sat ≈ 8 days.');
