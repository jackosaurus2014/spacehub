// ─── Space Tycoon: Strategy Simulations (docs/MEANINGFUL_2026-08.md Part 1) ──
// Runs the five founder-directive strategies + shared-pool rivalry scenarios
// through scripts/sim-harness.ts (which imports the REAL engine modules).
// Deterministic. Prints markdown tables for the spec.
//
//   npx tsx scripts/sim-strategies.ts

import {
  newPlayer, newWorld, runWorld, marginalCurve, fm, mdTable, buildMenuFirstCopySweep,
  type SimPlayer,
} from './sim-harness';

const START_MONEY = 2_000_000_000; // mid-game snapshot, post-Frontier (documented)
const MONTHS = 24;

// ─── Strategy plans ─────────────────────────────────────────────────────────

/** (a) Satellite spammer: nothing but LEO telecom sats, forever. */
const satSpammerPlan: SimPlayer['plan'] = () => [
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
];

/** (b) Datacenter spammer: orbital datacenters + minimum solar farms for power. */
const dcSpammerPlan: SimPlayer['plan'] = (p) => {
  const dcs = p.buildings.filter(b => b.definitionId === 'datacenter_orbital').length;
  const farms = p.buildings.filter(b => b.definitionId === 'solar_farm_orbital').length;
  // 10 power per DC, 20 per farm → 1 farm per 2 DCs, farm first when needed
  if (farms * 20 < (dcs + 1) * 10) {
    return [
      { definitionId: 'solar_farm_orbital', locationId: 'leo' },
      { definitionId: 'datacenter_orbital', locationId: 'leo' },
    ];
  }
  return [
    { definitionId: 'datacenter_orbital', locationId: 'leo' },
    { definitionId: 'datacenter_orbital', locationId: 'leo' },
  ];
};

/** (c) Diversified vertical integrator: spread across locations/categories,
 *  own the propellant chain that feeds the launch pads. */
const integratorBuildOrder: { definitionId: string; locationId: string }[] = [
  { definitionId: 'ground_station', locationId: 'earth_surface' },
  { definitionId: 'mission_control', locationId: 'earth_surface' },
  { definitionId: 'launch_pad_small', locationId: 'earth_surface' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom_geo', locationId: 'geo' },
  { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
  { definitionId: 'launch_pad_medium', locationId: 'earth_surface' },
  { definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' }, // makes rocket_fuel from own lunar_water
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
const integratorPlan: SimPlayer['plan'] = (p) => {
  const have = new Map<string, number>();
  for (const b of p.buildings) have.set(b.definitionId, (have.get(b.definitionId) || 0) + 1);
  const want: { definitionId: string; locationId: string }[] = [];
  const counted = new Map<string, number>();
  for (const step of integratorBuildOrder) {
    const c = (counted.get(step.definitionId) || 0) + 1;
    counted.set(step.definitionId, c);
    if ((have.get(step.definitionId) || 0) < c) want.push(step);
  }
  return want;
};

/** (e) Passive idler: 3 starter buildings in month 0, then nothing. */
const idlerPlan: SimPlayer['plan'] = (p, month) =>
  month === 0
    ? [
        { definitionId: 'ground_station', locationId: 'earth_surface' },
        { definitionId: 'mission_control', locationId: 'earth_surface' },
        { definitionId: 'launch_pad_small', locationId: 'earth_surface' },
      ]
    : [];

// ─── Run: five strategies in separate solo worlds ───────────────────────────

function runSolo(name: string, plan: SimPlayer['plan'], maxBuilds = 2): SimPlayer {
  const p = newPlayer(name, START_MONEY, plan, { maxBuildsPerMonth: maxBuilds });
  const world = newWorld([p]);
  runWorld(world, MONTHS);
  return p;
}

const satSpammer = runSolo('sat-spammer', satSpammerPlan, 4);
const dcSpammer = runSolo('dc-spammer', dcSpammerPlan, 2);
const integrator = runSolo('integrator', integratorPlan, 2);
const idler = runSolo('idler', idlerPlan, 3);

function historyTable(p: SimPlayer, every = 3): string {
  const rows = p.history
    .filter((_, i) => i % every === 0 || i === p.history.length - 1)
    .map(h => [
      h.month, h.buildingCount, fm(h.revenue), fm(h.operating + h.maintenance),
      fm(h.overhead), fm(h.execComp), fm(h.inputCost), fm(h.resourceSales),
      fm(h.net), h.avgEfficiency, fm(h.money), fm(h.netWorthEst),
    ]);
  return mdTable(
    ['mo', 'bldgs', 'svc rev', 'op+maint', 'overhead', 'exec', 'inputs', 'res sales', 'net/mo', 'eff', 'cash', 'NW est'],
    rows,
  );
}

console.log('\n## (a) Satellite spammer — sat_telecom @ LEO only, up to 4/mo\n');
console.log(historyTable(satSpammer));
console.log('\n## (b) Datacenter spammer — datacenter_orbital @ LEO (+solar for power), up to 2/mo\n');
console.log(historyTable(dcSpammer));
console.log('\n## (c) Diversified vertical integrator — 24-building multi-location plan\n');
console.log(historyTable(integrator));
console.log('\n## (e) Passive idler — 3 starter buildings, then nothing\n');
console.log(historyTable(idler));

// ─── Marginal-ROI curves (the founder's core question) ──────────────────────

console.log('\n## Marginal ROI — Nth LEO telecom satellite (solo, shared-pool math, season-neutral)\n');
const satCurve = marginalCurve('sat_telecom', 'leo', 40);
console.log(mdTable(
  ['N', 'unit cost', 'pool mult', 'fleet net/mo', 'marginal net/mo', 'marginal ROI %/mo', 'payback (mo)'],
  satCurve.filter(r => [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40].includes(r.n))
    .map(r => [r.n, fm(r.unitCost), r.poolMult, fm(r.fleetNet), fm(r.marginalNet), r.marginalROIpctPerMonth, r.paybackMonths === Infinity ? 'never' : r.paybackMonths]),
));

console.log('\n## Marginal ROI — Nth orbital datacenter (incl. 1 solar farm per 2 DCs)\n');
const dcCurve = marginalCurve('datacenter_orbital', 'leo', 20, { powerPlanDefId: 'solar_farm_orbital', powerPlanEvery: 2 });
console.log(mdTable(
  ['N', 'unit cost', 'pool mult', 'fleet net/mo', 'marginal net/mo', 'marginal ROI %/mo', 'payback (mo)'],
  dcCurve.filter(r => [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].includes(r.n))
    .map(r => [r.n, fm(r.unitCost), r.poolMult, fm(r.fleetNet), fm(r.marginalNet), r.marginalROIpctPerMonth, r.paybackMonths === Infinity ? 'never' : r.paybackMonths]),
));

console.log('\n## Marginal ROI — Nth GEO telecom satellite\n');
const geoCurve = marginalCurve('sat_telecom_geo', 'geo', 25);
console.log(mdTable(
  ['N', 'unit cost', 'pool mult', 'fleet net/mo', 'marginal net/mo', 'marginal ROI %/mo', 'payback (mo)'],
  geoCurve.filter(r => [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25].includes(r.n))
    .map(r => [r.n, fm(r.unitCost), r.poolMult, fm(r.fleetNet), fm(r.marginalNet), r.marginalROIpctPerMonth, r.paybackMonths === Infinity ? 'never' : r.paybackMonths]),
));

console.log('\n## Marginal ROI — Nth LEO telecom satellite WITH a maxed private multiplier stack (×2.0 revenue)\n');
const satCurve2x = marginalCurve('sat_telecom', 'leo', 40, { revenueMult: 2.0 });
console.log(mdTable(
  ['N', 'unit cost', 'pool mult', 'fleet net/mo', 'marginal net/mo', 'marginal ROI %/mo', 'payback (mo)'],
  satCurve2x.filter(r => [1, 3, 5, 6, 8, 10, 12, 15, 20, 30, 40].includes(r.n))
    .map(r => [r.n, fm(r.unitCost), r.poolMult, fm(r.fleetNet), fm(r.marginalNet), r.marginalROIpctPerMonth, r.paybackMonths === Infinity ? 'never' : r.paybackMonths]),
));

console.log('\n## Marginal ROI — Nth asteroid mining rig (+1 belt reactor per 2 rigs; mining: NO demand pool, shared-deposit steady-state pressure)\n');
const mineCurve = marginalCurve('mining_asteroid', 'asteroid_belt', 15, { powerPlanDefId: 'nuclear_reactor_asteroid', powerPlanEvery: 2 });
console.log(mdTable(
  ['N', 'unit cost', 'pool mult', 'fleet net/mo', 'marginal net/mo', 'marginal ROI %/mo', 'payback (mo)'],
  mineCurve.filter(r => [1, 2, 3, 4, 5, 6, 8, 10, 15].includes(r.n))
    .map(r => [r.n, fm(r.unitCost), r.poolMult, fm(r.fleetNet), fm(r.marginalNet), r.marginalROIpctPerMonth, r.paybackMonths === Infinity ? 'never' : r.paybackMonths]),
));

console.log('\n## Marginal ROI — Nth Heavy Launch Pad (earth, launch pool)\n');
const heavyCurve = marginalCurve('launch_pad_heavy', 'earth_surface', 12);
console.log(mdTable(
  ['N', 'unit cost', 'pool mult', 'fleet net/mo', 'marginal net/mo', 'marginal ROI %/mo', 'payback (mo)'],
  heavyCurve.filter(r => [1, 2, 3, 4, 5, 6, 8, 10, 12].includes(r.n))
    .map(r => [r.n, fm(r.unitCost), r.poolMult, fm(r.fleetNet), fm(r.marginalNet), r.marginalROIpctPerMonth, r.paybackMonths === Infinity ? 'never' : r.paybackMonths]),
));

// ─── Rivalry: shared pools with 2-3 competitors ─────────────────────────────

console.log('\n## Rivalry A — three identical sat spammers sharing the LEO telecom pool\n');
{
  const players = [
    newPlayer('rival-1', START_MONEY, satSpammerPlan, { maxBuildsPerMonth: 4 }),
    newPlayer('rival-2', START_MONEY, satSpammerPlan, { maxBuildsPerMonth: 4 }),
    newPlayer('rival-3', START_MONEY, satSpammerPlan, { maxBuildsPerMonth: 4 }),
  ];
  const world = newWorld(players);
  runWorld(world, MONTHS);
  const soloLast = satSpammer.history[MONTHS - 1];
  const r1Last = players[0].history[MONTHS - 1];
  console.log(mdTable(
    ['scenario', 'bldgs', 'month-24 net/mo', 'month-24 NW est', 'LEO telecom pool mult'],
    [
      ['solo spammer', soloLast.buildingCount, fm(soloLast.net), fm(soloLast.netWorthEst), soloLast.poolMults['leo:telecom']?.toFixed(3) ?? '—'],
      ['spammer with 2 rivals', r1Last.buildingCount, fm(r1Last.net), fm(r1Last.netWorthEst), r1Last.poolMults['leo:telecom']?.toFixed(3) ?? '—'],
    ],
  ));
}

console.log('\n## Rivalry B — incumbent (6 GEO sats) vs entrant arriving month 8\n');
{
  const incumbentPlan: SimPlayer['plan'] = (p, month) =>
    month === 0 && p.buildings.length < 6
      ? Array(6).fill({ definitionId: 'sat_telecom_geo', locationId: 'geo' })
      : [];
  const entrantPlan: SimPlayer['plan'] = (p, month) =>
    month >= 8 && p.buildings.length < 6
      ? Array(2).fill({ definitionId: 'sat_telecom_geo', locationId: 'geo' })
      : [];
  const inc = newPlayer('incumbent', START_MONEY, incumbentPlan, { maxBuildsPerMonth: 6 });
  const ent = newPlayer('entrant', START_MONEY, entrantPlan, { maxBuildsPerMonth: 2 });
  const world = newWorld([inc, ent]);
  runWorld(world, MONTHS);
  const rows = inc.history
    .filter(h => [0, 4, 7, 8, 9, 10, 12, 16, 23].includes(h.month))
    .map(h => [
      h.month,
      fm(h.revenue),
      h.poolMults['geo:telecom']?.toFixed(3) ?? '—',
      ent.history[h.month].buildingCount,
    ]);
  console.log(mdTable(['mo', 'incumbent svc rev/mo', 'geo:telecom pool mult', 'entrant sats'], rows));
}

console.log('\n## Rivalry C — three asteroid miners on one deposit (shared extraction pressure)\n');
{
  const minerPlan: SimPlayer['plan'] = (p, month) =>
    month === 0 ? [
      { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
      { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
    ] : [];
  const solo = newPlayer('solo-miner', START_MONEY * 5, minerPlan, { maxBuildsPerMonth: 2 });
  runWorld(newWorld([solo]), MONTHS);
  const trio = [
    newPlayer('miner-1', START_MONEY * 5, minerPlan, { maxBuildsPerMonth: 2 }),
    newPlayer('miner-2', START_MONEY * 5, minerPlan, { maxBuildsPerMonth: 2 }),
    newPlayer('miner-3', START_MONEY * 5, minerPlan, { maxBuildsPerMonth: 2 }),
  ];
  runWorld(newWorld(trio), MONTHS);
  const pick = (p: SimPlayer, m: number) => p.history[m];
  const rows = [1, 3, 6, 12, 23].map(m => [
    m,
    fm(pick(solo, m).resourceSales),
    fm(pick(trio[0], m).resourceSales),
    `${Math.round((pick(trio[0], m).resourceSales / Math.max(1, pick(solo, m).resourceSales)) * 100)}%`,
  ]);
  console.log(mdTable(['mo', 'solo miner res sales/mo', 'each-of-3 res sales/mo', 'vs solo'], rows));
}

// ─── (d) Pure market trader — analytic bound from real constants ────────────

console.log('\n## (d) Pure market trader — analytic bound (real fee/spread/cap constants)\n');
{
  // Round-trip through the NPC maker: buy at ask (spot × (1+0.06)) + 2% fee,
  // sell at bid (spot × (1−0.06)) − 2% fee ⇒ ~16.2% round-trip cost.
  // A trade is only profitable catching a price MOVE > 16.2%: market events
  // (×1.3–×2.0, deterministic schedule) and super-cycle swings qualify.
  // Per-event profit bound: NPC daily volume cap × duration × (move − costs).
  const examples = [
    { res: 'helium3', price: 5_000_000, cap: 10, move: 1.0, evName: 'Fusion Breakthrough ×2.0 (2h)' },
    { res: 'titanium', price: 25_000, cap: 50, move: 0.5, evName: 'Shortage ×1.5 (4h)' },
    { res: 'iron', price: 5_000, cap: 200, move: 0.4, evName: 'Belt Glut ×0.6 (6h, short via pre-sell)' },
  ];
  const rows = examples.map(e => {
    const grossPct = e.move - 0.162;
    const profit = e.cap * e.price * grossPct;
    return [e.res, e.evName, `${e.cap}/day cap`, fm(e.price), `${Math.round(grossPct * 100)}%`, fm(profit)];
  });
  console.log(mdTable(['resource', 'event', 'NPC cap', 'spot', 'net edge', 'max profit/event'], rows));
  const perMonth = 30 * (10 * 5_000_000 * (1.0 - 0.162) * 0.1 + 50 * 25_000 * (0.5 - 0.162) * 0.2);
  console.log(`\nOptimistic monthly bound (events ~2-3/day server-wide, trader catches a fraction): ~${fm(perMonth)} /mo — vs integrator month-24 net ${fm(integrator.history[MONTHS - 1].net)}.`);
}

// ─── Build-menu efficiency frontier (Part 2 dominance audit) ────────────────
// First-copy (N=1) marginal ROI for EVERY revenue building at its required
// location, solo player, base multipliers — the "which building is strictly
// better per dollar" table.

console.log('\n## Build menu — first-copy ROI for every revenue building (solo, base multipliers)\n');
{
  const rows: (string | number)[][] = buildMenuFirstCopySweep().map(({ def, loc, row: r1 }) =>
    [def.id, `T${def.tier}`, loc, fm(def.baseCost), r1.poolMult, fm(r1.fleetNet), r1.marginalROIpctPerMonth, r1.paybackMonths === Infinity ? 'never' : r1.paybackMonths],
  );
  rows.sort((a, b) => (b[6] as number) - (a[6] as number));
  console.log(mdTable(['building', 'tier', 'location', 'base cost', 'pool mult', 'net/mo (N=1)', 'ROI %/mo', 'payback (mo)'], rows));
}

// ─── Wage index illustration (E5 labor market, real formula) ────────────────

console.log('\n## Labor market — engineer wage index vs server-wide hiring (computeWageIndex, real constants)\n');
{
  const { computeWageIndex, laborSupply } = require('../src/lib/game/labor-market') as typeof import('../src/lib/game/labor-market');
  const scenarios = [
    { corps: 5, each: 20, quarters: 0 },
    { corps: 20, each: 30, quarters: 0 },
    { corps: 50, each: 30, quarters: 200 },
    { corps: 100, each: 40, quarters: 500 },
    { corps: 300, each: 40, quarters: 2000 },
  ];
  const rows = scenarios.map(s => {
    const employed = s.corps * s.each;
    const supply = laborSupply('engineer', s.quarters);
    const idx = computeWageIndex(employed, supply);
    return [`${s.corps} corps × ${s.each} engineers`, s.quarters, employed, supply, idx.toFixed(2), fm(500_000 * idx) + '/mo'];
  });
  console.log(mdTable(['scenario', 'crew quarters built', 'employed', 'labor supply', 'wage index', 'engineer salary'], rows));
}

// ─── Price-campaign duel (Wave M5, §3.2 O2 / §6 candidate scenario) ─────────
// The same lunar miner run twice: once at neutral spot, once against a
// fully-pressed price campaign that has pinned its output commodities at the
// anti-cornering band floor (base × 0.3 — the deepest a dump can legally
// push). With M3's price-linked mining, the crash lands directly on the
// victim's cash revenue — this is the number a defender weighs against
// mothballing (M2) or buying the dump. The attacker's own cost (fee burn +
// selling below basis) is not modeled here; this is the VICTIM's damage
// bound.

console.log('\n## Price-campaign duel — lunar miner at neutral spot vs campaign-crashed spot (band floor 0.3×)\n');
{
  const { RESOURCE_MAP: RM } = require('../src/lib/game/resources') as typeof import('../src/lib/game/resources');
  const minerPlan: SimPlayer['plan'] = (p) => {
    if (p.buildings.length >= 4) return [];
    return [
      { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
      { definitionId: 'mining_lunar_ice', locationId: 'lunar_surface' },
      { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
    ];
  };

  const neutral = newPlayer('miner-neutral', START_MONEY, minerPlan, { maxBuildsPerMonth: 2 });
  runWorld(newWorld([neutral], 0), 12);

  // Crash EVERY resource to the band floor — the upper bound of a
  // multi-market campaign barrage (a single campaign only pins ONE market;
  // per-resource rows below show the one-market case too).
  const crashedPrices: Record<string, number> = {};
  const { RESOURCES: ALL_RES } = require('../src/lib/game/resources') as typeof import('../src/lib/game/resources');
  for (const r of ALL_RES) crashedPrices[r.id] = Math.round(r.baseMarketPrice * 0.3);
  const crashed = newPlayer('miner-crashed', START_MONEY, minerPlan, { maxBuildsPerMonth: 2 });
  runWorld(newWorld([crashed], 0, { prices: crashedPrices, asOf: Date.now() }), 12);

  const rows: (string | number)[][] = [];
  for (const mo of [3, 6, 11]) {
    const n = neutral.history[mo];
    const c = crashed.history[mo];
    rows.push([
      mo,
      fm(n.revenue + n.resourceSales),
      fm(c.revenue + c.resourceSales),
      `${Math.round(((c.revenue + c.resourceSales) / Math.max(1, n.revenue + n.resourceSales)) * 100)}%`,
      fm(n.net),
      fm(c.net),
    ]);
  }
  console.log(mdTable(
    ['mo', 'gross/mo (neutral)', 'gross/mo (crashed)', 'vs neutral', 'net/mo (neutral)', 'net/mo (crashed)'],
    rows,
  ));
  const waterBase = RM.get('lunar_water')!.baseMarketPrice;
  console.log(`\nSingle-market case: one campaign pins ONE commodity (e.g. lunar_water ${fm(waterBase)} → ${fm(Math.round(waterBase * 0.3))}) for 7 days, then mean reversion resumes (~6.6h half-life). Counterplay: mothball (25% maintenance), buy the dump, or out-wait the clock — the attacker pays the burned fee plus below-basis margin the whole time.`);
}

console.log('\ndone.');
