// Archetype balance simulator.
//
// For each of the three starting archetypes, runs N simulated games over M
// ticks with NO player decisions (idle coast). Reports net-worth /
// cash / infrastructure at configured checkpoints so we can compare relative
// strength of the archetypes.
//
// Run: npx tsx scripts/balance-archetypes.ts

import { getNewGameState } from '../src/lib/game/save-load';
import { processTick } from '../src/lib/game/game-engine';
import { applyArchetype, ARCHETYPES, type StartingArchetype } from '../src/lib/game/archetypes';
import { TICKS_PER_GAME_MONTH } from '../src/lib/game/constants';
import type { GameState } from '../src/lib/game/types';

const GAMES_PER_ARCHETYPE = 100;
const CHECKPOINTS_MONTHS = [3, 6, 12, 24];   // game-months to record
const TOTAL_TICKS = CHECKPOINTS_MONTHS[CHECKPOINTS_MONTHS.length - 1] * TICKS_PER_GAME_MONTH;

interface Snapshot {
  monthsElapsed: number;
  cash: number;
  netWorth: number;
  infrastructureValue: number;  // sum of completed building baseCost
  completedBuildings: number;
  activeServices: number;
  hiredCommanders: number;
  factionRepTotal: number;
}

function takeSnapshot(state: GameState, monthsElapsed: number): Snapshot {
  // Infrastructure value = sum of completed buildings' base costs (rough proxy)
  // We don't have BUILDING_MAP here without importing — use a tracked sum
  let infra = 0;
  const completedBuildings = state.buildings.filter(b => b.isComplete).length;
  // Rough fallback: $10M × completed buildings (accurate enough for comparison)
  // Actually let's import BUILDING_MAP for real values.
  // (deferred — using completedBuildings as the key metric since it's a
  // well-defined count; cash + completedBuildings tells the whole story)
  infra = 0;
  return {
    monthsElapsed,
    cash: state.money,
    netWorth: state.money + state.totalEarned - state.totalSpent,
    infrastructureValue: infra,
    completedBuildings,
    activeServices: state.activeServices.length,
    hiredCommanders: state.hiredCommanders?.length || 0,
    factionRepTotal: Object.values(state.factionReputation || {}).reduce((a, b) => a + b, 0),
  };
}

function simulateGame(archetypeId: StartingArchetype): Snapshot[] {
  const base = getNewGameState();
  let state = applyArchetype(base, archetypeId);

  const snapshots: Snapshot[] = [];
  const checkpointTicks = CHECKPOINTS_MONTHS.map(m => m * TICKS_PER_GAME_MONTH);
  let nextCheckpointIdx = 0;

  for (let t = 1; t <= TOTAL_TICKS; t++) {
    state = processTick(state);
    if (nextCheckpointIdx < checkpointTicks.length && t >= checkpointTicks[nextCheckpointIdx]) {
      snapshots.push(takeSnapshot(state, CHECKPOINTS_MONTHS[nextCheckpointIdx]));
      nextCheckpointIdx++;
    }
  }

  return snapshots;
}

interface AggregateRow {
  months: number;
  n: number;
  meanCash: number;
  medianCash: number;
  meanNetWorth: number;
  medianNetWorth: number;
  meanBuildings: number;
  meanServices: number;
  p10NetWorth: number;
  p90NetWorth: number;
  stdDevNetWorth: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function aggregate(allSnapshots: Snapshot[][]): AggregateRow[] {
  // allSnapshots[gameIdx][checkpointIdx]
  const rows: AggregateRow[] = [];
  for (let cp = 0; cp < CHECKPOINTS_MONTHS.length; cp++) {
    const pointSnapshots = allSnapshots.map(g => g[cp]).filter(Boolean);
    const cashes = pointSnapshots.map(s => s.cash).sort((a, b) => a - b);
    const nets   = pointSnapshots.map(s => s.netWorth).sort((a, b) => a - b);
    const builds = pointSnapshots.map(s => s.completedBuildings);
    const svcs   = pointSnapshots.map(s => s.activeServices);
    rows.push({
      months: CHECKPOINTS_MONTHS[cp],
      n: pointSnapshots.length,
      meanCash: cashes.reduce((a, b) => a + b, 0) / cashes.length,
      medianCash: percentile(cashes, 50),
      meanNetWorth: nets.reduce((a, b) => a + b, 0) / nets.length,
      medianNetWorth: percentile(nets, 50),
      meanBuildings: builds.reduce((a, b) => a + b, 0) / builds.length,
      meanServices:  svcs.reduce((a, b) => a + b, 0) / svcs.length,
      p10NetWorth: percentile(nets, 10),
      p90NetWorth: percentile(nets, 90),
      stdDevNetWorth: stdDev(nets),
    });
  }
  return rows;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3)  return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function runAll() {
  const results: Record<string, AggregateRow[]> = {};
  for (const archetype of ARCHETYPES) {
    console.log(`\nSimulating ${GAMES_PER_ARCHETYPE} games for archetype: ${archetype.name} (${archetype.id})`);
    const allSnapshots: Snapshot[][] = [];
    for (let g = 0; g < GAMES_PER_ARCHETYPE; g++) {
      allSnapshots.push(simulateGame(archetype.id));
      if ((g + 1) % 25 === 0) process.stdout.write(`  ${g + 1}/${GAMES_PER_ARCHETYPE}\r`);
    }
    process.stdout.write(`  ${GAMES_PER_ARCHETYPE}/${GAMES_PER_ARCHETYPE}\n`);
    results[archetype.id] = aggregate(allSnapshots);
  }

  // ─── Report ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(110));
  console.log('ARCHETYPE BALANCE REPORT — 100 games × 3 archetypes × 24 game-months idle (no player decisions)');
  console.log('═'.repeat(110));

  for (const cp of CHECKPOINTS_MONTHS) {
    console.log(`\n── Month ${cp} `.padEnd(100, '─'));
    console.log('Archetype                  |     Median NW   |      Mean NW    |   p10 NW    |   p90 NW    | Blds | Svcs');
    console.log('-'.repeat(110));
    for (const archetype of ARCHETYPES) {
      const row = results[archetype.id].find(r => r.months === cp);
      if (!row) continue;
      const name = archetype.name.padEnd(26);
      const median = fmt(row.medianNetWorth).padStart(14);
      const mean = fmt(row.meanNetWorth).padStart(14);
      const p10 = fmt(row.p10NetWorth).padStart(11);
      const p90 = fmt(row.p90NetWorth).padStart(11);
      const blds = row.meanBuildings.toFixed(1).padStart(4);
      const svcs = row.meanServices.toFixed(1).padStart(4);
      console.log(`${name} | ${median}   | ${mean}   | ${p10} | ${p90} | ${blds} | ${svcs}`);
    }
  }

  // ─── Head-to-head at the final checkpoint ────────────────────────────
  console.log('\n' + '═'.repeat(110));
  console.log('HEAD-TO-HEAD at the final checkpoint (month ' + CHECKPOINTS_MONTHS[CHECKPOINTS_MONTHS.length - 1] + ')');
  console.log('═'.repeat(110));
  const baseline = results[ARCHETYPES[0].id][CHECKPOINTS_MONTHS.length - 1].medianNetWorth;
  for (const archetype of ARCHETYPES) {
    const row = results[archetype.id][CHECKPOINTS_MONTHS.length - 1];
    const delta = row.medianNetWorth - baseline;
    const pct = ((delta / Math.max(1, Math.abs(baseline))) * 100);
    const marker = Math.abs(pct) < 5 ? '≈' : pct > 0 ? '▲' : '▼';
    console.log(`  ${marker} ${archetype.name.padEnd(26)} median net worth: ${fmt(row.medianNetWorth).padStart(14)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs ${ARCHETYPES[0].name})`);
  }

  // ─── Balance verdict ─────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(110));
  const finalNetWorths = ARCHETYPES.map(a => results[a.id][CHECKPOINTS_MONTHS.length - 1].medianNetWorth);
  const maxNW = Math.max(...finalNetWorths);
  const minNW = Math.min(...finalNetWorths);
  const spread = maxNW === 0 ? 0 : (maxNW - minNW) / Math.abs(maxNW) * 100;
  console.log(`Spread between best and worst archetype at month ${CHECKPOINTS_MONTHS[CHECKPOINTS_MONTHS.length - 1]}: ${spread.toFixed(1)}%`);
  if (spread < 15) {
    console.log('VERDICT: Archetypes are well-balanced (spread < 15%).');
  } else if (spread < 30) {
    console.log('VERDICT: Moderate imbalance (spread 15-30%) — acceptable but worth noting.');
  } else {
    console.log('VERDICT: Significant imbalance (spread > 30%) — rebalance recommended.');
  }
  console.log('═'.repeat(110));
}

runAll();
