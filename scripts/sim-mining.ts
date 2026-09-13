// ─── Space Tycoon: mining-specialist strategy sims (Phase A balance gate) ──
// docs/SPACE_MINING_DESIGN_2026-09-12.md §8: "the sim harness run with a
// mining-specialist strategy, checking that a solo barge is cash-positive by
// month 3 in the Frontier, that a three-ship cycle beats two parked miners
// only when the haul is refined near the field, and that nothing beats the
// existing building-based mining by more than the ~1.5× the location
// multipliers already grant."
//
// Deterministic; imports the REAL modules (mining-orders.ts planMiningOrder
// is the exact quote the server makes; cargo-logistics.ts prices the
// hauler's freight; resources.ts prices the ore). Month = 6 real hours
// (sim-harness.ts GAME_MONTH_MS); ore sells at OUTPUT_SELL_MULT × base.
//
//   npx tsx scripts/sim-mining.ts

import { GAME_MONTH_MS, OUTPUT_SELL_MULT, fm, mdTable } from './sim-harness';
import { ASTEROID_FIELD_MAP, generateFieldRocks, rollAsteroidIntel, oreForRock, type AsteroidRock, LOCAL_INTEL_SALT, SURVEY_PROBE_COST } from '../src/lib/game/asteroids';
import { planMiningOrder, MINING_SALE_BROKER_FEE } from '../src/lib/game/mining-orders';
import { SHIP_MAP } from '../src/lib/game/ships';
import { RESOURCE_MAP, MINING_PRODUCTION } from '../src/lib/game/resources';
import { BUILDING_MAP } from '../src/lib/game/buildings';
import { getRouteDeltaV, FREIGHT_HULL_FUEL_RATE, FREIGHT_CARGO_FUEL_RATE, FREIGHT_MIN_FUEL_COST } from '../src/lib/game/cargo-logistics';
import { ORE_LOAD_WEIGHT } from '../src/lib/game/asteroids';

const MONTHS = 6;

interface MinerSim {
  name: string;
  defId: string;
  fieldId: string;
  rock: AsteroidRock;
  surveyed: boolean;
  thenAction: 'return_sell' | 'return_store' | 'hold';
  originId: string;
}

interface MonthLine { month: number; trips: number; units: number; revenue: number; fuel: number; maintenance: number; probes: number; net: number; cumulative: number }

/** Run one miner for MONTHS months: back-to-back orders, each quoted by the
 *  real planner. Cash-positive = monthly net (revenue − fuel − maintenance −
 *  probes) > 0; capex is reported separately. */
function simulateMiner(m: MinerSim, months: number = MONTHS): { lines: MonthLine[]; capex: number } {
  const def = SHIP_MAP.get(m.defId)!;
  const intel = m.surveyed ? rollAsteroidIntel(m.rock, LOCAL_INTEL_SALT) : null;
  const price = RESOURCE_MAP.get(oreForRock(m.rock))?.baseMarketPrice ?? 0;
  // Back-to-back orders on a continuous clock; each trip is booked in the
  // month it COMPLETES (fuel is paid at departure, booked with the trip).
  const trips: { completesAt: number; units: number; fuel: number; revenue: number }[] = [];
  let clock = 0;
  let reserve = intel?.reserve ?? Number.MAX_SAFE_INTEGER;
  let origin = m.originId;
  const horizon = months * GAME_MONTH_MS;
  while (clock < horizon && reserve > 0) {
    const plan = planMiningOrder({ def, cargoCapacity: def.cargoCapacity, mode: 'mine', rock: m.rock, intel: intel ? { ...intel, reserve } : null, thenAction: m.thenAction, originId: origin, nowMs: clock });
    if (!plan.ok) break;
    const o = plan.order;
    const revenue = Math.round(o.fillUnits * price * (m.thenAction === 'return_sell' ? (1 - MINING_SALE_BROKER_FEE) : OUTPUT_SELL_MULT));
    trips.push({ completesAt: o.completesAtMs, units: o.fillUnits, fuel: o.fuelCost, revenue });
    reserve -= o.fillUnits;
    clock = o.completesAtMs;
    origin = o.destinationId; // hold: stays at the field (no outbound next time)
  }
  const lines: MonthLine[] = [];
  let cumulative = 0;
  for (let month = 1; month <= months; month++) {
    const inMonth = trips.filter(t => t.completesAt > (month - 1) * GAME_MONTH_MS && t.completesAt <= month * GAME_MONTH_MS);
    const probes = month === 1 && m.surveyed ? SURVEY_PROBE_COST : 0;
    const revenue = inMonth.reduce((s, t) => s + t.revenue, 0);
    const fuel = inMonth.reduce((s, t) => s + t.fuel, 0);
    const units = inMonth.reduce((s, t) => s + t.units, 0);
    const maintenance = def.maintenancePerMonth;
    const net = revenue - fuel - maintenance - probes;
    cumulative += net;
    lines.push({ month, trips: inMonth.length, units, revenue, fuel, maintenance, probes, net, cumulative });
  }
  return { lines, capex: def.baseCost };
}

/** The existing building-based benchmark: gross ore-equivalent value of a
 *  mining building's MINING_PRODUCTION per month per $ of capex. */
function buildingBenchmark(defId: string, svcId: string): { capex: number; grossPerMonth: number; maint: number } {
  const b = BUILDING_MAP.get(defId)!;
  const prod = MINING_PRODUCTION[svcId] || [];
  const gross = prod.reduce((s, p) => s + p.amountPerMonth * (RESOURCE_MAP.get(p.resource)?.baseMarketPrice || 0), 0);
  return { capex: b.baseCost, grossPerMonth: gross, maint: b.maintenanceCostPerMonth };
}

function pickRock(fieldId: string, cls: 'C' | 'S' | 'M', nth: number = 0): AsteroidRock {
  const field = ASTEROID_FIELD_MAP.get(fieldId)!;
  const rocks = generateFieldRocks(field, 2).filter(r => r.class === cls).sort((a, b) => a.deltaVExtra - b.deltaVExtra);
  return rocks[Math.min(nth, rocks.length - 1)];
}

function main() {
  console.log('# Mining Phase A — balance gate (scripts/sim-mining.ts)\n');

  // ── Scenario 1: solo Prospector Barge, Near-Earth Cluster, C-type, from LEO ──
  const rockC = pickRock('field_near_earth', 'C', 2); // not the easiest rock — a median pick
  const intelC = rollAsteroidIntel(rockC, LOCAL_INTEL_SALT);
  console.log(`## 1. Solo Prospector Barge — ${rockC.name} (C-type, +${rockC.deltaVExtra} m/s, grade ${intelC.grade}, reserve ${intelC.reserve})\n`);
  for (const surveyed of [true, false]) {
    const r = simulateMiner({ name: 'barge', defId: 'prospector_barge', fieldId: 'field_near_earth', rock: rockC, surveyed, thenAction: 'return_sell', originId: 'leo' });
    console.log(`### ${surveyed ? 'Surveyed (1 probe)' : 'Blind (unsurveyed ×0.15)'} — capex ${fm(r.capex)}\n`);
    console.log(mdTable(['Month', 'Trips', 'Units', 'Revenue', 'Fuel', 'Maint', 'Probes', 'Net', 'Cumulative'],
      r.lines.map(l => [l.month, l.trips, l.units, fm(l.revenue), fm(l.fuel), fm(l.maintenance), fm(l.probes), fm(l.net), fm(l.cumulative)])));
    const m3 = r.lines[2];
    const payback = m3.net > 0 ? Math.round(r.capex / m3.net) : Infinity;
    console.log(`\nGATE month 3 net ${fm(m3.net)} → ${m3.net > 0 ? 'CASH-POSITIVE ✓' : 'NEGATIVE ✗'}; steady-state payback ≈ ${payback} months; return on capex ≈ ${((m3.net / r.capex) * 100).toFixed(2)}%/month\n`);
  }

  // ── Scenario 2: three-ship cycle (2 barges HOLD at the Inner Belt + a Hauler cycles) vs 2 barges returning to sell ──
  const rockM = pickRock('field_inner_belt', 'M', 0);
  const intelM = rollAsteroidIntel(rockM, LOCAL_INTEL_SALT);
  console.log(`## 2. Three-ship cycle vs two parked miners — Inner Belt ${rockM.name} (M-type, grade ${intelM.grade}), from Ceres storage\n`);
  const parked = [0, 1].map(() => simulateMiner({ name: 'barge', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface' }));
  const holders = [0, 1].map(() => simulateMiner({ name: 'barge', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'hold', originId: 'ceres_surface' }));
  // Hauler: belt → LEO (the market clears at Earth), 800 units of M-ore per
  // trip at the freight formula with ore at ORE_LOAD_WEIGHT. Phase C's
  // refinery-near-the-field is NOT modelled (it does not exist yet).
  const hauler = SHIP_MAP.get('hauler')!;
  const dv = getRouteDeltaV('asteroid_belt', 'leo');
  const haulFuelPerTrip = Math.max(FREIGHT_MIN_FUEL_COST, Math.round(dv * (FREIGHT_HULL_FUEL_RATE * hauler.tier + FREIGHT_CARGO_FUEL_RATE * ORE_LOAD_WEIGHT * hauler.cargoCapacity)))
    + Math.max(FREIGHT_MIN_FUEL_COST, Math.round(dv * FREIGHT_HULL_FUEL_RATE * hauler.tier)); // loaded in, empty back
  const orePrice = RESOURCE_MAP.get('ore_metallic')!.baseMarketPrice;
  const rows: (string | number)[][] = [];
  let parkedCum = 0, cycleCum = 0;
  for (let i = 0; i < MONTHS; i++) {
    const parkedNet = parked[0].lines[i].net + parked[1].lines[i].net;
    const held = holders[0].lines[i].units + holders[1].lines[i].units;
    const haulTrips = Math.ceil(held / hauler.cargoCapacity);
    const haulRevenue = Math.round(held * orePrice * OUTPUT_SELL_MULT);
    const haulFuel = haulTrips * haulFuelPerTrip;
    const cycleNet = holders[0].lines[i].net + holders[1].lines[i].net + haulRevenue - haulFuel - hauler.maintenancePerMonth;
    parkedCum += parkedNet; cycleCum += cycleNet;
    rows.push([i + 1, fm(parkedNet), fm(parkedCum), held, haulTrips, fm(haulFuel), fm(cycleNet), fm(cycleCum)]);
  }
  console.log(mdTable(['Month', '2× return&sell net', 'cum', 'Held units', 'Haul trips', 'Haul fuel', '3-ship net', 'cum'], rows));
  console.log(`\nHauler fuel per belt→LEO round trip: ${fm(haulFuelPerTrip)} for ${hauler.cargoCapacity} units (${fm(hauler.cargoCapacity * orePrice)} of M-ore at base). Capex: 2 barges ${fm(2 * SHIP_MAP.get('prospector_barge')!.baseCost)} vs +hauler ${fm(hauler.baseCost)}.`);
  console.log(`GATE: three-ship cycle ${cycleCum > parkedCum ? 'BEATS' : 'does NOT beat'} two returning miners over ${MONTHS} months (doc: it should only win once the haul is refined near the field — Phase C).\n`);

  // ── Scenario 3: nothing beats building-based mining by > ~1.5× ──
  console.log('## 3. Capital efficiency vs building-based mining (gross ore/resource value per month ÷ capex)\n');
  const bench = [
    ['Basic Lunar Extractor', buildingBenchmark('mining_lunar_basic', 'svc_mining_lunar_basic')],
    ['Asteroid Mining Rig', buildingBenchmark('mining_asteroid', 'svc_mining_asteroid')],
  ] as const;
  const shipRows: (string | number)[][] = [];
  for (const [name, b] of bench) shipRows.push([name, fm(b.capex), fm(b.grossPerMonth), fm(b.grossPerMonth - b.maint), `${((b.grossPerMonth / b.capex) * 100).toFixed(2)}%`]);
  const bargeNE = simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_near_earth', rock: rockC, surveyed: true, thenAction: 'return_sell', originId: 'leo' });
  const bargeIB = simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface' });
  const minerIB = simulateMiner({ name: 'a', defId: 'asteroid_miner', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface' });
  const avg = (r: { lines: MonthLine[] }, k: 'revenue' | 'net') => r.lines.slice(1).reduce((s, l) => s + l[k], 0) / (r.lines.length - 1);
  for (const [name, r] of [['Prospector Barge · Near-Earth C', bargeNE], ['Prospector Barge · Inner Belt M', bargeIB], ['Asteroid Mining Ship · Inner Belt M', minerIB]] as const) {
    shipRows.push([name, fm(r.capex), fm(avg(r, 'revenue')), fm(avg(r, 'net')), `${((avg(r, 'revenue') / r.capex) * 100).toFixed(2)}%`]);
  }
  console.log(mdTable(['Asset', 'Capex', 'Gross / month (avg m2-6)', 'Net / month', 'Gross ÷ capex'], shipRows));
  const bestShip = Math.max(avg(bargeNE, 'revenue') / bargeNE.capex, avg(bargeIB, 'revenue') / bargeIB.capex, avg(minerIB, 'revenue') / minerIB.capex);
  const bestBld = Math.max(...bench.map(([, b]) => b.grossPerMonth / b.capex));
  console.log(`\nGATE: best ship-mining gross÷capex is ${(bestShip / bestBld).toFixed(2)}× the best building benchmark (limit ~1.5×) → ${bestShip / bestBld <= 1.5 ? 'OK ✓' : 'OVER ✗'}\n`);
}

main();
