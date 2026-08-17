// ─── Space Tycoon: Resource-Generation Balance Audit (Balance Pass 1 + 2) ────
// docs/BALANCE.md "Pass 1 — Resource generation vs sinks" and "Pass 2 —
// asymptote verification, crafting/contract sinks". Hunts the
// material-post-scarcity failure mode: if mining + recipes generate resources
// far faster than consumption/construction/market absorption can drain them,
// stockpiles grow unboundedly and supply decisions stop mattering. Pass 2
// extends the horizon to 36 months, models the crafting queue and the
// delivery-contract outlet, and prints per-strategy asymptote-drift tables.
//
// Runs strategies through scripts/sim-harness.ts (real engine math) in the
// AUDIT world configuration: npcSaleCaps ON (leftover sales bounded by what
// the NPC maker's standing orders can actually absorb per game-month) and
// constructionMaterials ON (builds settle their real resourceCost). The
// legacy sim-strategies.ts tables are untouched — this is the resource lens.
//
//   npx tsx scripts/sim-resources.ts

import {
  newPlayer, newWorld, runWorld, fm, mdTable, sinkCoverage,
  extractionPressureReport, npcAbsorptionPerMonth, resourceBucket,
  CONTRACT_OUTLET_TYPICAL_QTY,
  type SimPlayer, type SimWorld,
} from './sim-harness';
import { RESOURCES, RESOURCE_MAP, MINING_PRODUCTION } from '../src/lib/game/resources';
import type { ResourceId } from '../src/lib/game/resources';
import { getNpcVolumeCap } from '../src/lib/game/npc-volume-caps';

// Balance Pass 2: 24 → 36 game-months — Pass 1 verified flattening by month
// 24; Pass 2 verifies a true asymptote (docs/BALANCE.md "Pass 2").
const MONTHS = 36;
const START_MONEY = 2_000_000_000;

// ─── Strategy plans ─────────────────────────────────────────────────────────

/** Diversified vertical integrator — same 24-building order as
 *  sim-strategies.ts (the doc's reference strategy). */
const integratorBuildOrder: { definitionId: string; locationId: string }[] = [
  { definitionId: 'ground_station', locationId: 'earth_surface' },
  { definitionId: 'mission_control', locationId: 'earth_surface' },
  { definitionId: 'launch_pad_small', locationId: 'earth_surface' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom_geo', locationId: 'geo' },
  { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
  { definitionId: 'launch_pad_medium', locationId: 'earth_surface' },
  { definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' },
  { definitionId: 'solar_farm_orbital', locationId: 'leo' },
  { definitionId: 'datacenter_orbital', locationId: 'leo' },
  { definitionId: 'space_station_small', locationId: 'leo' },
  { definitionId: 'mining_lunar_ice', locationId: 'lunar_surface' },
  { definitionId: 'sat_sensor_geo', locationId: 'geo' },
  { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  { definitionId: 'fabrication_lunar', locationId: 'lunar_surface' },
  { definitionId: 'launch_pad_heavy', locationId: 'earth_surface' },
  { definitionId: 'habitat_lunar', locationId: 'lunar_surface' },
  { definitionId: 'mining_mars', locationId: 'mars_surface' },
  { definitionId: 'solar_farm_mars', locationId: 'mars_surface' },
  { definitionId: 'datacenter_mars_orbit', locationId: 'mars_orbit' },
  { definitionId: 'space_station_mars', locationId: 'mars_orbit' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'fabrication_asteroid', locationId: 'asteroid_belt' },
];
const orderedPlan = (order: { definitionId: string; locationId: string }[]): SimPlayer['plan'] => (p) => {
  const have = new Map<string, number>();
  for (const b of p.buildings) have.set(b.definitionId, (have.get(b.definitionId) || 0) + 1);
  const want: { definitionId: string; locationId: string }[] = [];
  const counted = new Map<string, number>();
  for (const step of order) {
    const c = (counted.get(step.definitionId) || 0) + 1;
    counted.set(step.definitionId, c);
    if ((have.get(step.definitionId) || 0) < c) want.push(step);
  }
  return want;
};

/** Belt baron — mining-heavy mid-game specialist: 6 asteroid rigs + support,
 *  sells everything the market will take. The "one deposit, one export" case. */
const beltBaronOrder: { definitionId: string; locationId: string }[] = [
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'orbital_refinery', locationId: 'asteroid_belt' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'fabrication_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
];

/** Resource hoarder — the worst case the founder directive asks about:
 *  max mining + max production everywhere, sells NOTHING, buys any inputs it
 *  needs. If sinks can't keep up with THIS player, stockpiles are unbounded. */
const hoarderCore: { definitionId: string; locationId: string }[] = [
  { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
  { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  { definitionId: 'mining_lunar_ice', locationId: 'lunar_surface' },
  { definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' },
  { definitionId: 'fabrication_lunar', locationId: 'lunar_surface' },
  { definitionId: 'life_support_works', locationId: 'lunar_surface' },
  { definitionId: 'mining_mars', locationId: 'mars_surface' },
  { definitionId: 'solar_farm_mars', locationId: 'mars_surface' },
  { definitionId: 'propellant_plant_mars', locationId: 'mars_surface' },
  { definitionId: 'agri_dome', locationId: 'mars_surface' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'orbital_refinery', locationId: 'asteroid_belt' },
  { definitionId: 'mining_europa', locationId: 'jupiter_system' },
  { definitionId: 'nuclear_reactor_jupiter', locationId: 'jupiter_system' },
  { definitionId: 'mining_titan', locationId: 'saturn_system' },
  { definitionId: 'nuclear_reactor_saturn', locationId: 'saturn_system' },
  { definitionId: 'fabrication_titan', locationId: 'saturn_system' },
  { definitionId: 'mining_kuiper', locationId: 'outer_system' },
];
const hoarderPlan: SimPlayer['plan'] = (p) => {
  const core = orderedPlan(hoarderCore)(p, 0);
  if (core.length > 0) return core;
  // Expansion firehose: keep adding belt rigs (2 rigs : 1 reactor) forever.
  const rigs = p.buildings.filter(b => b.definitionId === 'mining_asteroid').length;
  const reactors = p.buildings.filter(b => b.definitionId === 'nuclear_reactor_asteroid').length;
  if (rigs > reactors * 2) return [{ definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' }];
  return [{ definitionId: 'mining_asteroid', locationId: 'asteroid_belt' }];
};

/** Balance Pass 2 — "belt industrialist": the belt baron who ALSO invests in
 *  fabrication (Orbital Fab Lab + Lunar Manufacturing Plant) and runs the
 *  crafting queue continuously as a surplus sink. The Pass-1 audit could not
 *  see this player at all — steel/refined coverage was understated by
 *  exactly this channel. Craft priority: sink components first (beams,
 *  electronics), then the tier-1 refiners that convert raw surplus. */
// NOTE: the fab investments are inserted right after the refinery, BEFORE
// the 4th+ asteroid rigs — the harness's purchase loop stops at the first
// unaffordable item (scaledBuildingCost makes late same-location rigs very
// expensive), so trailing entries would never be reached.
const beltIndustrialistOrder: { definitionId: string; locationId: string }[] = [
  ...beltBaronOrder.slice(0, 6), // 3 rigs, 2 reactors, orbital_refinery
  { definitionId: 'fabrication_orbital', locationId: 'leo' },
  { definitionId: 'solar_farm_orbital', locationId: 'leo' },
  { definitionId: 'fabrication_lunar', locationId: 'lunar_surface' },
  { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  ...beltBaronOrder.slice(6),
];
const beltIndustrialistCraftPlan = [
  'forge_structural_beams',   // steel_ingots 5 + aluminum_alloy 3 → 4 beams
  'make_electronics',         // refined_rare_earth 3 + gold 1 → 2 electronics
  'refine_rare_earth',        // rare_earth 10 → 5 refined_rare_earth
  'smelt_steel',              // iron 20 → 10 steel_ingots
];

// ─── Runners ────────────────────────────────────────────────────────────────

interface RunResult { player: SimPlayer; world: SimWorld }

function runAudit(name: string, plan: SimPlayer['plan'], opts: {
  money?: number; maxBuilds?: number; sellsLeftovers?: boolean;
  floorSpot?: boolean; npcSaleCaps?: boolean;
  craftPlan?: string[]; contractCapPerDay?: number; months?: number;
} = {}): RunResult {
  const p = newPlayer(name, opts.money ?? START_MONEY, plan, {
    maxBuildsPerMonth: opts.maxBuilds ?? 2,
    sellsLeftovers: opts.sellsLeftovers ?? true,
    craftPlan: opts.craftPlan,
  });
  let spot = null;
  if (opts.floorSpot) {
    const prices: Record<string, number> = {};
    for (const r of RESOURCES) prices[r.id] = Math.round(r.baseMarketPrice * 0.3);
    spot = { prices, asOf: 0 };
  }
  const world = newWorld([p], 0, spot, {
    npcSaleCaps: opts.npcSaleCaps ?? true,
    constructionMaterials: true,
    contractOutlet: opts.contractCapPerDay ? { capPerDay: opts.contractCapPerDay } : undefined,
  });
  runWorld(world, opts.months ?? MONTHS);
  return { player: p, world };
}

function summaryTable(p: SimPlayer): string {
  const rows = [2, 5, 11, 17, 23, 29, 35].filter(m => m < p.history.length).map(m => {
    const h = p.history[m];
    const b = h.stockByBucket!;
    const unsold = Object.values(h.flows?.unsold || {}).reduce((a, x) => a + x, 0);
    return [
      m, h.buildingCount,
      Math.round(b.raw), Math.round(b.refined), Math.round(b.component), Math.round(b.product),
      fm(h.stockValue || 0), fm(h.resourceSales), fm(h.contractSales || 0), Math.round(unsold), fm(h.net), fm(h.money),
    ];
  });
  return mdTable(
    ['mo', 'bldgs', 'raw stk', 'ref stk', 'comp stk', 'prod stk', 'stock $', 'res sales/mo', 'contract $/mo', 'unsold u/mo', 'net/mo', 'cash'],
    rows,
  );
}

/** Asymptote check (Pass 2): total-stock trajectory + month-over-month drift
 *  at the tail. A true asymptote shows drift → ~0, not merely "flatter". */
function asymptoteTable(p: SimPlayer): string {
  const months = [11, 17, 23, 29, 35].filter(m => m < p.history.length);
  const total = (m: number) => {
    const b = p.history[m].stockByBucket!;
    return b.raw + b.refined + b.component + b.product;
  };
  const rows = months.map((m, i) => {
    const t = total(m);
    const prev = i > 0 ? total(months[i - 1]) : null;
    const drift = prev === null ? '—' : ((t - prev) / (m - months[i - 1])).toFixed(1);
    return [m, Math.round(t), drift];
  });
  return mdTable(['mo', 'total stock (u)', 'drift u/mo since prev row'], rows);
}

function coverageTable(p: SimPlayer, month: number): string {
  const rows = sinkCoverage(p.history[month])
    .filter(r => r.generated >= 0.05 || r.drained >= 0.05)
    .map(r => [
      r.resource, r.generated, r.drained,
      Number.isFinite(r.ratio) ? r.ratio : '∞',
      r.stock,
      Math.round(npcAbsorptionPerMonth(r.resource) * 100) / 100,
    ]);
  return mdTable(['resource', 'gen u/mo', 'drain u/mo', 'coverage', 'stock (u)', 'NPC absorb u/mo'], rows);
}

function topStocks(p: SimPlayer, month: number, n = 10): string {
  const h = p.history[month];
  const rows = Object.entries(h.stock || {})
    .map(([res, qty]) => ({ res, qty, value: qty * (RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
    .map(e => [e.res, Math.round(e.qty), fm(e.value), resourceBucket(e.res)]);
  return mdTable(['resource', 'units', 'book value', 'bucket'], rows);
}

// ─── 1. The strategies, audit world (36 game-months, Pass 2) ────────────────

console.log('# Balance Pass 2 — resource generation vs sinks re-audit (audit world: NPC sale caps ON, construction materials ON, 36 months)\n');

const integrator = runAudit('integrator', orderedPlan(integratorBuildOrder), { maxBuilds: 2 });
const beltBaron = runAudit('belt-baron', orderedPlan(beltBaronOrder), { money: 60_000_000_000, maxBuilds: 2 });
const hoarder = runAudit('hoarder', hoarderPlan, { money: 500_000_000_000, maxBuilds: 4, sellsLeftovers: false });
// Pass 2: the crafting-queue sink modeled — belt baron + fabrication + a
// continuous craft rotation. No contract outlet here so the crafting effect
// is isolated.
const industrialist = runAudit('belt-industrialist', orderedPlan(beltIndustrialistOrder), {
  money: 60_000_000_000, maxBuilds: 2, craftPlan: beltIndustrialistCraftPlan,
});

for (const { title, run } of [
  { title: '## Integrator (diversified 24-building reference)', run: integrator },
  { title: '## Belt baron (6 asteroid rigs + refinery, sells max)', run: beltBaron },
  { title: '## Resource hoarder (max mining+production, sells NOTHING)', run: hoarder },
  { title: '## Belt industrialist (belt baron + fabrication, continuous crafting queue — Pass 2)', run: industrialist },
]) {
  console.log(`${title}\n`);
  console.log(summaryTable(run.player));
  console.log('\n### Sink coverage — month 12\n');
  console.log(coverageTable(run.player, 11));
  console.log('\n### Sink coverage — month 24\n');
  console.log(coverageTable(run.player, 23));
  console.log('\n### Sink coverage — month 36\n');
  console.log(coverageTable(run.player, 35));
  console.log('\n### Asymptote check — total stock trajectory\n');
  console.log(asymptoteTable(run.player));
  console.log('\n### Top stockpiles by book value — month 36\n');
  console.log(topStocks(run.player, 35));
  console.log('');
}

// ─── 2. Extraction pressure — does the brake bind? ──────────────────────────

console.log('## Extraction pressure at month 24 (hoarder world — the firehose case)\n');
console.log(mdTable(
  ['deposit (location:resource)', 'pressure mult'],
  extractionPressureReport(hoarder.world, MONTHS).map(r => [r.key, r.pressure]),
));

// ─── 3. Floor-dumping income — quantified ───────────────────────────────────
// Worst case: spot pinned at the anti-cornering band floor (base × 0.3) for
// EVERYTHING; belt baron keeps selling. NPC-capped (real) vs uncapped (the
// old harness fiction).

const floorCapped = runAudit('baron-floor-capped', orderedPlan(beltBaronOrder), {
  money: 60_000_000_000, maxBuilds: 2, floorSpot: true, npcSaleCaps: true,
});
const floorUncapped = runAudit('baron-floor-uncapped', orderedPlan(beltBaronOrder), {
  money: 60_000_000_000, maxBuilds: 2, floorSpot: true, npcSaleCaps: false,
});

console.log('\n## Floor-dumping (all spot pinned at base × 0.3) — belt baron\n');
const fdRows = [5, 11, 23].map(m => {
  const n = beltBaron.player.history[m];
  const c = floorCapped.player.history[m];
  const u = floorUncapped.player.history[m];
  return [
    m,
    fm(n.resourceSales), fm(c.resourceSales), fm(u.resourceSales),
    fm(c.revenue), fm(c.net),
  ];
});
console.log(mdTable(
  ['mo', 'res sales/mo (neutral, capped)', 'res sales/mo (floor, NPC-capped)', 'res sales/mo (floor, UNCAPPED fiction)', 'svc rev/mo (floor)', 'net/mo (floor)'],
  fdRows,
));

// Analytic ceiling: a 24/7 seller saturating every minable resource's NPC cap
// at the band floor.
console.log('\n### Analytic ceiling — saturate every minable NPC cap at the band floor\n');
{
  const minable = new Set<string>();
  for (const prods of Object.values(MINING_PRODUCTION)) {
    for (const { resource } of prods) minable.add(resource);
  }
  let totalPerDay = 0;
  const rows: (string | number)[][] = [];
  for (const res of Array.from(minable).sort()) {
    const def = RESOURCE_MAP.get(res as ResourceId);
    if (!def) continue;
    const cap = getNpcVolumeCap(res);
    const floorPrice = def.baseMarketPrice * 0.3 * 0.97;
    const perDay = cap * floorPrice;
    totalPerDay += perDay;
    rows.push([res, cap, fm(Math.round(floorPrice)), fm(Math.round(perDay))]);
  }
  console.log(mdTable(['resource', 'NPC cap/real-day', 'floor sale price', 'max $/real-day'], rows));
  console.log(`\nTotal: ~${fm(Math.round(totalPerDay))}/real-day (${fm(Math.round(totalPerDay / 4))}/game-month) if a player saturates EVERY minable cap at the floor, 24/7.`);
}

// ─── 4. Contract outlet — belt-baron viability (Pass 2, task 4) ─────────────
// The Pass-1 audit world showed the pure mining specialist cash-negative
// with NPC absorption honored — but the real game has the delivery-contract
// channel (4-6 completions per rolling 24h, no fee, spot-priced). Model it
// and re-check viability at mid-tier (cap/day 5 = base 4 + space_logistics).

const baronContracts = runAudit('baron-contracts', orderedPlan(beltBaronOrder), {
  money: 60_000_000_000, maxBuilds: 2, contractCapPerDay: 5,
});
const industrialistContracts = runAudit('industrialist-contracts', orderedPlan(beltIndustrialistOrder), {
  money: 60_000_000_000, maxBuilds: 2, craftPlan: beltIndustrialistCraftPlan, contractCapPerDay: 5,
});

console.log('\n## Contract outlet (cap 5/day, typical qty ' + CONTRACT_OUTLET_TYPICAL_QTY + ' u, spot ×1.0) — specialist viability\n');
const coRows = [5, 11, 17, 23, 29, 35].map(m => {
  const none = beltBaron.player.history[m];
  const c = baronContracts.player.history[m];
  const ic = industrialistContracts.player.history[m];
  return [
    m,
    fm(none.net), fm(c.net), fm(c.contractSales || 0),
    fm(ic.net), fm(ic.contractSales || 0),
  ];
});
console.log(mdTable(
  ['mo', 'baron net/mo (no outlet)', 'baron net/mo (outlet)', 'baron contract $/mo', 'industrialist net/mo (outlet)', 'industrialist contract $/mo'],
  coRows,
));
console.log('\n### Belt baron w/ outlet — coverage month 36\n');
console.log(coverageTable(baronContracts.player, 35));

// ─── 5. Distributed miner — H4 duty-cycle opex acceptance (Balance Pass 6) ──
// docs/BALANCE.md Pass 2 "extraction duty-cycle opex scaling" (implemented in
// Pass 6): the GEOGRAPHICALLY diversified pure-mining specialist — six
// deposits from the Moon out to Titan, one rig each, plus required power —
// is the player the lever exists for. Acceptance: distributed miner becomes
// viable (Pass-2 worked estimate ≈ +$13–18M/mo at steady state), while the
// single-deposit belt baron above stays punished and the integrator's gain
// stays < +$4M/mo.

const distributedMinerOrder: { definitionId: string; locationId: string }[] = [
  { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
  { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  { definitionId: 'mining_lunar_ice', locationId: 'lunar_surface' },
  { definitionId: 'mining_mars', locationId: 'mars_surface' },
  { definitionId: 'solar_farm_mars', locationId: 'mars_surface' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'mining_europa', locationId: 'jupiter_system' },
  { definitionId: 'nuclear_reactor_jupiter', locationId: 'jupiter_system' },
  { definitionId: 'mining_titan', locationId: 'saturn_system' },
  { definitionId: 'nuclear_reactor_saturn', locationId: 'saturn_system' },
];

const distributedMiner = runAudit('distributed-miner', orderedPlan(distributedMinerOrder), {
  money: 60_000_000_000, maxBuilds: 2,
});
const distributedMinerContracts = runAudit('distributed-miner-contracts', orderedPlan(distributedMinerOrder), {
  money: 60_000_000_000, maxBuilds: 2, contractCapPerDay: 5,
});

console.log('\n## Distributed miner (6 deposits, lunar→Titan) — H4 duty-cycle opex acceptance (Pass 6)\n');
const dmRows = [5, 11, 17, 23, 29, 35].map(m => {
  const d = distributedMiner.player.history[m];
  const dc = distributedMinerContracts.player.history[m];
  return [
    m, d.buildingCount,
    fm(d.revenue), fm(d.operating), fm(d.net),
    fm(dc.net), fm(dc.contractSales || 0),
  ];
});
console.log(mdTable(
  ['mo', 'bldgs', 'svc+mining rev/mo', 'operating/mo', 'net/mo (no outlet)', 'net/mo (outlet 5/day)', 'contract $/mo'],
  dmRows,
));
console.log('\nDeposit pressures at month 36 (distributed world):');
console.log(mdTable(
  ['deposit (location:resource)', 'pressure mult'],
  extractionPressureReport(distributedMiner.world, MONTHS).map(r => [r.key, r.pressure]),
));

console.log('\ndone.');
