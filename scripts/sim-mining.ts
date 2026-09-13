// ─── Space Tycoon: mining-specialist strategy sims (Phase A + B balance gates) ──
// Phase B (2026-09-13, docs/BALANCE.md Pass 12): scenarios 4-5 add claimed vs
// unclaimed rocks under shared-rock pressure (rock-pressure.ts) and the
// escort-vs-no-escort run against NPC shakedowns (npc-shakedown.ts). The
// Phase A gates (1-3) are re-run unchanged and must still pass.
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
import { claimStakeFee, claimUpkeepPerMonth, CLAIM_CAP_BY_TIER } from '../src/lib/game/asteroid-claims';
import { rockPressureShare } from '../src/lib/game/rock-pressure';
import { shakedownOdds, SHAKEDOWN_TAKE_SHARE, type EscortCover } from '../src/lib/game/npc-shakedown';
import { SHIP_MAP } from '../src/lib/game/ships';
import { RESOURCE_MAP, MINING_PRODUCTION, RESOURCE_ORIGINS } from '../src/lib/game/resources';
import { getFundamentalPrice, getSupplyPriceMultiplier } from '../src/lib/game/market-engine';
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
  /** Phase B: corporations (incl. this one) working the rock; the claim;
   *  escort cover on the lane home. Defaults = Phase A (alone, open, none). */
  sharedMiners?: number;
  claimed?: boolean;
  escortCover?: EscortCover;
  /** Balance Pass 14. 'base' = the pre-Pass-14 gate (ore always at
   *  baseMarketPrice). 'opening' = the ore market opens at its Pass-14
   *  scarcity level and this miner's own landed units push it back down —
   *  the first-mover windfall AND its decay in one run. */
  priceMode?: 'base' | 'opening';
}

interface MonthLine { month: number; trips: number; units: number; revenue: number; fuel: number; maintenance: number; probes: number; claim: number; net: number; cumulative: number; price: number }

/** Run one miner for MONTHS months: back-to-back orders, each quoted by the
 *  real planner. Cash-positive = monthly net (revenue − fuel − maintenance −
 *  probes) > 0; capex is reported separately. */
function simulateMiner(m: MinerSim, months: number = MONTHS): { lines: MonthLine[]; capex: number } {
  const def = SHIP_MAP.get(m.defId)!;
  const intel = m.surveyed ? rollAsteroidIntel(m.rock, LOCAL_INTEL_SALT) : null;
  const oreDef = RESOURCE_MAP.get(oreForRock(m.rock))!;
  const basePrice = oreDef.baseMarketPrice;
  // Pass 14: the market's live supply for this ore. In 'opening' mode it
  // starts at the world's opening stock and every landed unit adds to it,
  // so the price this miner receives falls trip by trip — the windfall
  // decaying on its own output, which is the gate this scenario exists for.
  let marketSupply = m.priceMode === 'opening' ? oreDef.startingSupply : oreDef.baselineSupply;
  const priceNow = () => m.priceMode === 'opening'
    ? getFundamentalPrice(basePrice, marketSupply, oreDef.baselineSupply, oreDef.minPrice, oreDef.maxPrice)
    : basePrice;
  // Back-to-back orders on a continuous clock; each trip is booked in the
  // month it COMPLETES (fuel is paid at departure, booked with the trip).
  const trips: { completesAt: number; units: number; fuel: number; revenue: number; price: number }[] = [];
  let clock = 0;
  let reserve = intel?.reserve ?? Number.MAX_SAFE_INTEGER;
  let origin = m.originId;
  const horizon = months * GAME_MONTH_MS;
  const claimFee = m.claimed && intel ? claimStakeFee(m.rock, intel) : 0;
  const upkeep = m.claimed ? claimUpkeepPerMonth(claimFee) : 0;
  while (clock < horizon && reserve > 0) {
    const plan = planMiningOrder({
      def, cargoCapacity: def.cargoCapacity, mode: 'mine', rock: m.rock, intel: intel ? { ...intel, reserve } : null, thenAction: m.thenAction, originId: origin, nowMs: clock,
      claimed: !!m.claimed, sharedMiners: m.sharedMiners ?? 1, escortCover: m.escortCover ?? 'none', frontier: false,
    });
    if (!plan.ok) break;
    const o = plan.order;
    // Phase B: the EXPECTED units landed (pressure share, then the expected
    // shakedown toll) price the trip; the rock loses what was extracted.
    const extracted = Math.max(1, Math.round(o.fillUnits * plan.pressureShare));
    const price = priceNow();
    const revenue = Math.round(plan.expectedUnits * price * (m.thenAction === 'return_sell' ? (1 - MINING_SALE_BROKER_FEE) : OUTPUT_SELL_MULT));
    trips.push({ completesAt: o.completesAtMs, units: plan.expectedUnits, fuel: o.fuelCost, revenue, price });
    marketSupply += plan.expectedUnits;
    reserve -= extracted;
    clock = o.completesAtMs;
    origin = o.destinationId; // hold: stays at the field (no outbound next time)
  }
  const lines: MonthLine[] = [];
  let cumulative = 0;
  for (let month = 1; month <= months; month++) {
    const inMonth = trips.filter(t => t.completesAt > (month - 1) * GAME_MONTH_MS && t.completesAt <= month * GAME_MONTH_MS);
    const probes = month === 1 && m.surveyed ? SURVEY_PROBE_COST : 0;
    const claim = (month === 1 ? claimFee : 0) + upkeep;
    const revenue = inMonth.reduce((s, t) => s + t.revenue, 0);
    const fuel = inMonth.reduce((s, t) => s + t.fuel, 0);
    const units = inMonth.reduce((s, t) => s + t.units, 0);
    const maintenance = def.maintenancePerMonth;
    const net = revenue - fuel - maintenance - probes - claim;
    cumulative += net;
    const price = inMonth.length > 0 ? Math.round(inMonth.reduce((s, t) => s + t.price, 0) / inMonth.length) : 0;
    lines.push({ month, trips: inMonth.length, units, revenue, fuel, maintenance, probes, claim, net, cumulative, price });
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

  // ── Scenario 4 (Phase B): claimed vs unclaimed rock under shared-rock pressure ──
  console.log('## 4. Phase B — claimed vs unclaimed rock (Prospector Barge, Inner Belt M rock, Ceres storage, 6 months)\n');
  const fee = claimStakeFee(rockM, intelM);
  console.log(`Stake fee for ${rockM.name} (grade ${intelM.grade}, reserve ${intelM.reserve}, M-ore ${fm(orePrice)}): ${fm(fee)}; upkeep ${fm(claimUpkeepPerMonth(fee))}/month. Claim caps by tier: ${Object.entries(CLAIM_CAP_BY_TIER).map(([t, c]) => `T${t}:${c}`).join(' ')}.\n`);
  const s4 = [
    ['Open · alone', simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface' })],
    ['Open · 2 corporations', simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface', sharedMiners: 2 })],
    ['Open · 3 corporations', simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface', sharedMiners: 3 })],
    ['Open · 4 corporations', simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface', sharedMiners: 4 })],
    ['Claimed (fee + upkeep, exclusive)', simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface', claimed: true })],
  ] as const;
  console.log(mdTable(['Scenario', 'Share', 'Units/6mo', 'Revenue/6mo', 'Claim cost/6mo', 'Net/6mo', 'Net month 3'],
    s4.map(([name, r], i) => [name, i === 4 ? '1.00' : rockPressureShare(i + 1).toFixed(2), r.lines.reduce((s, l) => s + l.units, 0), fm(r.lines.reduce((s, l) => s + l.revenue, 0)), fm(r.lines.reduce((s, l) => s + l.claim, 0)), fm(r.lines[5].cumulative), fm(r.lines[2].net)])));
  const openAlone = s4[0][1].lines[5].cumulative;
  const open2 = s4[1][1].lines[5].cumulative;
  const claimed = s4[4][1].lines[5].cumulative;
  console.log(`\nGATE: a claim costs ${fm(openAlone - claimed)} over 6 months against an uncontested rock (${((1 - claimed / openAlone) * 100).toFixed(1)}% of net) and is worth ${fm(claimed - open2)} once ONE rival shares the rock → ${claimed > open2 && claimed < openAlone ? 'claims pay only when contested ✓' : 'CHECK ✗'}\n`);

  // ── Scenario 5 (Phase B): escort vs no escort on a belt run ──
  console.log('## 5. Phase B — Escort Cutter vs no escort (Asteroid Mining Ship, Inner Belt M rock, return & sell at Ceres, 6 months)\n');
  const cutter = SHIP_MAP.get('escort_cutter')!;
  const s5 = [
    ['No cover', 'none' as EscortCover],
    ['Stationed cutter at the field', 'stationed' as EscortCover],
    ['Assigned cutter (flies the run)', 'assigned' as EscortCover],
  ] as const;
  const rows5: (string | number)[][] = [];
  const nets5: number[] = [];
  for (const [name, cover] of s5) {
    const r = simulateMiner({ name: 'a', defId: 'asteroid_miner', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface', escortCover: cover });
    const odds = shakedownOdds('asteroid_belt', cover, false);
    const escortCost = cover === 'none' ? 0 : MONTHS * cutter.maintenancePerMonth;
    const net = r.lines[5].cumulative - escortCost;
    nets5.push(net);
    rows5.push([name, `${(odds * 100).toFixed(1)}%`, r.lines.reduce((s, l) => s + l.units, 0), fm(r.lines.reduce((s, l) => s + l.revenue, 0)), fm(escortCost), fm(net)]);
  }
  console.log(mdTable(['Cover', 'Odds/leg', 'Units landed/6mo', 'Revenue/6mo', 'Cutter upkeep/6mo', 'Net/6mo (excl. cutter capex)'], rows5));
  const tollPerTrip = SHIP_MAP.get('asteroid_miner')!.cargoCapacity * shakedownOdds('asteroid_belt', 'none', false) * SHAKEDOWN_TAKE_SHARE * orePrice;
  console.log(`\nExpected toll per unescorted belt trip: ${fm(tollPerTrip)} (${(shakedownOdds('asteroid_belt', 'none', false) * 100).toFixed(0)}% × ${SHAKEDOWN_TAKE_SHARE * 100}% of a 200-unit hold). Cutter capex ${fm(cutter.baseCost)}, upkeep ${fm(cutter.maintenancePerMonth)}/mo.`);
  console.log(`GATE: with ONE miner an assigned cutter ${nets5[2] > nets5[0] ? 'BEATS' : 'does NOT beat'} no cover on 6-month net before capex (${fm(nets5[2] - nets5[0])}); it pays for its hull only across a fleet or a longer horizon → ${nets5[2] - nets5[0] < cutter.baseCost ? 'a fleet-scale decision, not a solo auto-buy ✓' : 'CHECK ✗'}\n`);

  // ── Scenario 6 (Pass 14): the first-mover windfall and how fast it decays ──
  console.log('## 6. Pass 14 — opening scarcity: first-mover return and its decay\n');
  console.log(mdTable(['Ore', 'Origin', 'Baseline', 'Opening stock', 'Opening mult', 'Base', 'Opening spot (band-capped)'],
    (['ore_carbonaceous', 'ore_silicate', 'ore_metallic', 'ore_exotic'] as const).map((id) => {
      const d = RESOURCE_MAP.get(id)!;
      const spot = getFundamentalPrice(d.baseMarketPrice, d.startingSupply, d.baselineSupply, d.minPrice, d.maxPrice);
      return [d.name, RESOURCE_ORIGINS[d.origin].label, d.baselineSupply, d.startingSupply,
        `${getSupplyPriceMultiplier(d.startingSupply, d.baselineSupply).toFixed(2)}x`, fm(d.baseMarketPrice),
        `${fm(spot)} (${(spot / d.baseMarketPrice).toFixed(2)}x)`];
    })));
  const mature6 = simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_near_earth', rock: rockC, surveyed: true, thenAction: 'return_sell', originId: 'leo', priceMode: 'base' });
  const opening6 = simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_near_earth', rock: rockC, surveyed: true, thenAction: 'return_sell', originId: 'leo', priceMode: 'opening' });
  console.log(mdTable(['Month', 'Trips', 'Units', 'Mature $/unit', 'Mature net', 'Opening $/unit', 'Opening net', 'Opening cum'],
    mature6.lines.map((l, i) => [l.month, l.trips, l.units, fm(l.price), fm(l.net), fm(opening6.lines[i].price), fm(opening6.lines[i].net), fm(opening6.lines[i].cumulative)])));
  const openCum = opening6.lines[5].cumulative, matureCum = mature6.lines[5].cumulative;
  const firstPrice = opening6.lines[0].price, lastPrice = opening6.lines[5].price;
  console.log(`\nFirst-mover premium: 6-month cumulative ${fm(openCum)} vs ${fm(matureCum)} in a mature market (+${fm(openCum - matureCum)}).`);
  console.log(`Realised ore price falls ${fm(firstPrice)} -> ${fm(lastPrice)} per unit (${(lastPrice / firstPrice * 100).toFixed(0)}% of the opening price) on this ONE barge's own landed cargo -> ${lastPrice < firstPrice ? 'the windfall decays OK' : 'CHECK'}`);
  console.log(`GATE month 3 net at opening prices ${fm(opening6.lines[2].net)} -> ${opening6.lines[2].net > 0 ? 'CASH-POSITIVE ok' : 'NEGATIVE fail'}\n`);

  // The building benchmark priced the SAME way (its lunar water and helium-3
  // open scarce too) — otherwise the gate would flatter ship mining by
  // comparing opening-price ships against base-price buildings.
  const openingBenchmark = (defId: string, svcId: string) => {
    const b = BUILDING_MAP.get(defId)!;
    const gross = (MINING_PRODUCTION[svcId] || []).reduce((sum, pr) => {
      const d = RESOURCE_MAP.get(pr.resource)!;
      return sum + pr.amountPerMonth * getFundamentalPrice(d.baseMarketPrice, d.startingSupply, d.baselineSupply, d.minPrice, d.maxPrice);
    }, 0);
    return gross / b.baseCost;
  };
  const bestBldOpen = Math.max(openingBenchmark('mining_lunar_basic', 'svc_mining_lunar_basic'), openingBenchmark('mining_asteroid', 'svc_mining_asteroid'));

  // Capital-efficiency gate re-run at OPENING prices — the windfall must not
  // hand ship-mining a permanent edge over building-based mining.
  const openAvg = (r: { lines: MonthLine[] }) => r.lines.slice(1).reduce((s, l) => s + l.revenue, 0) / (r.lines.length - 1);
  const openBest = Math.max(
    openAvg(opening6) / opening6.capex,
    openAvg(simulateMiner({ name: 'b', defId: 'prospector_barge', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface', priceMode: 'opening' })) / SHIP_MAP.get('prospector_barge')!.baseCost,
    openAvg(simulateMiner({ name: 'a', defId: 'asteroid_miner', fieldId: 'field_inner_belt', rock: rockM, surveyed: true, thenAction: 'return_sell', originId: 'ceres_surface', priceMode: 'opening' })) / SHIP_MAP.get('asteroid_miner')!.baseCost,
  );
  console.log(`GATE (opening prices, avg months 2-6): best ship gross/capex is ${(openBest / bestBld).toFixed(2)}x the BASE-priced building benchmark and ${(openBest / bestBldOpen).toFixed(2)}x the same benchmark priced at opening scarcity (limit ~1.5x) -> ${openBest / bestBld <= 1.5 && openBest / bestBldOpen <= 1.5 ? 'OK' : 'OVER'}\n`);

}

main();
