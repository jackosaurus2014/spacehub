// ─── Space Tycoon: HQ relocation balance check (Balance Passes 11 + 13) ──────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2 / CC-2 + CC-3. Runs the shared
// harness (scripts/sim-harness.ts — the engine's structural stack) for 24
// game-months and reports the cash delta of relocating the headquarters at
// month N versus staying put, for one corporation type per rung:
//   - LAUNCH-HEAVY  → LEO deck    (+12% launch revenue, −10% satellite ops)
//   - MINING        → Lunar HQ    (fuel/Δv terms live on the Mining-Order
//                                  loop, which the building harness does not
//                                  model — measured separately at the end)
//   - MARS COLONY   → Mars HQ     (+12% colony-surface, +10% Mars-orbit)
//   - JOVIAN        → Jovian HQ   (+12% outer extraction, +10% science)
//   - SATURNIAN     → Saturn HQ   (+10% outer extraction, +12% science)
//   - KUIPER        → Deep space  (+15% outer extraction; its expedition
//                                  term is not on the service ledger)
//   - OUTER COLONY  → Interstellar(+15% colony-surface; its +15% expedition
//                                  term is measured separately at the end —
//                                  CC-4, now that the rung's gate is a real
//                                  completed-expedition record)
// Target (the founder's rule, "where is my business", never a free win): a
// corporation whose business MATCHES the seat and moves EARLY clears the
// move inside the 24-month window; a late move does not. Every stay/move
// pair differs only by the relocation — the fleet is pre-built, so no capex
// enters the window. Run: npx tsx scripts/sim-hq-relocation.ts
// Deterministic (no Date.now-dependent economics; Frontier off).

import { newWorld, newPlayer, runWorld, makeBuilding, fm, type SimPlayer } from './sim-harness';
import {
  HQ_RELOCATION, HQ_UPKEEP_MONTHLY, HQ_SEAT_COUNTS, getHqBonuses, hqExpeditionReturnMult,
  hqSeatIsAuctioned, type HqStageId,
} from '../src/lib/game/headquarters';
import {
  EXPLORE_DURATION_MONTHS, GAME_MONTHS_PER_LY, SURVEY_DATA_PAYOUT_PER_LY,
  rollExpeditionOutcome,
} from '../src/lib/game/expeditions';
import { INTERSTELLAR_SYSTEM_MAP } from '../src/lib/game/interstellar';
import { postedSeatPrice, quoteHqRelocation } from '../src/lib/game/hq-relocation';
import { quoteLeg } from '../src/lib/game/mining-orders';
import { SHIP_MAP } from '../src/lib/game/ships';
import { getAsteroidCatalog } from '../src/lib/game/asteroids';

const MONTHS = 24;

type Plan = SimPlayer['plan'];

/** Established corporations (the move is a tier-2-to-7 decision): the fleet
 *  is PRE-BUILT (no capex in the window — the requirement station is an
 *  asset both runs own identically), and no further building happens, so
 *  the only difference between the pair is the relocation itself: cost +
 *  seat, upkeep, and the seat's bonus terms. */
const LAUNCH_FLEET: Array<[string, string]> = [
  ['launch_pad_small', 'earth_surface'], ['launch_pad_small', 'earth_surface'],
  ['launch_pad_medium', 'earth_surface'], ['launch_pad_medium', 'earth_surface'],
  ['sat_telecom_leo', 'leo'], ['sat_telecom_leo', 'leo'], ['sat_telecom_leo', 'leo'],
  ['space_station_small', 'leo'],
];
const MINING_FLEET: Array<[string, string]> = [
  ['mining_lunar_basic', 'lunar_surface'], ['mining_lunar_basic', 'lunar_surface'], ['mining_lunar_basic', 'lunar_surface'],
  ['mining_lunar_basic', 'lunar_surface'], ['mining_lunar_basic', 'lunar_surface'], ['mining_lunar_basic', 'lunar_surface'],
  ['habitat_lunar', 'lunar_surface'],
];
/** Tier-4 Martian operator: surface industry plus the relay business above
 *  it — the two halves the Mars seat's two disjoint terms pay on. Every
 *  fleet below carries its own POWER: an unpowered location runs its
 *  services at a fraction of nameplate in the engine and in the harness, and
 *  an under-powered pair would understate both sides of the comparison. */
const MARS_FLEET: Array<[string, string]> = [
  ['mining_mars', 'mars_surface'], ['mining_mars', 'mars_surface'],
  ['habitat_mars', 'mars_surface'], ['fabrication_mars', 'mars_surface'],
  ['nuclear_reactor_mars_surface', 'mars_surface'],
  ['space_station_mars', 'mars_orbit'], ['datacenter_mars_orbit', 'mars_orbit'],
  ['sat_mars_relay', 'mars_orbit'], ['sat_mars_relay', 'mars_orbit'],
  ['nuclear_reactor_mars_orbit', 'mars_orbit'],
];
/** Tier-5 Jovian extractor. */
const JOVIAN_FLEET: Array<[string, string]> = [
  ['mining_europa', 'jupiter_system'], ['mining_europa', 'jupiter_system'], ['mining_europa', 'jupiter_system'],
  ['mining_europa', 'jupiter_system'], ['mining_europa', 'jupiter_system'], ['mining_europa', 'jupiter_system'],
  ['datacenter_jupiter', 'jupiter_system'], ['datacenter_jupiter', 'jupiter_system'],
  ['nuclear_reactor_jupiter', 'jupiter_system'], ['nuclear_reactor_jupiter', 'jupiter_system'],
  ['ocean_lab', 'europa_surface'], ['ocean_lab', 'europa_surface'],
  ['colony_europa', 'europa_surface'], ['mining_europa_deep', 'europa_surface'],
];
/** Tier-5 Saturnian science house: the same extraction base, but the weight
 *  is on sensing (the Saturn seat's +12% science against Jupiter's +12%
 *  extraction) — the choice between the two tier-5 seats made concrete. */
const SATURN_FLEET: Array<[string, string]> = [
  ['mining_titan', 'saturn_system'], ['mining_titan', 'saturn_system'],
  ['mining_titan', 'saturn_system'], ['mining_titan', 'saturn_system'],
  ['fabrication_titan', 'saturn_system'], ['fabrication_titan', 'saturn_system'],
  ['nuclear_reactor_saturn', 'saturn_system'], ['nuclear_reactor_saturn', 'saturn_system'],
  ['bio_lab_enceladus', 'enceladus_surface'], ['bio_lab_enceladus', 'enceladus_surface'],
  ['bio_lab_enceladus', 'enceladus_surface'], ['bio_lab_enceladus', 'enceladus_surface'],
  ['colony_enceladus', 'enceladus_surface'],
  ['ocean_lab', 'europa_surface'], ['ocean_lab', 'europa_surface'],
];
/** Tier-6 Kuiper operator — the biggest extraction line in the game. */
const KUIPER_FLEET: Array<[string, string]> = [
  ['mining_kuiper', 'outer_system'], ['mining_kuiper', 'outer_system'],
  ['mining_kuiper', 'outer_system'], ['mining_kuiper', 'outer_system'],
  ['deep_space_relay', 'outer_system'], ['deep_space_relay', 'outer_system'],
  ['mining_pluto', 'pluto_surface'], ['mining_triton', 'triton_surface'],
  ['mining_titan', 'saturn_system'], ['nuclear_reactor_saturn', 'saturn_system'],
];
/** Tier-7 outer-colony conglomerate: the interstellar seat pays on settled
 *  surfaces, so the fleet is colonies, not system-scale rigs. */
const COLONY_FLEET: Array<[string, string]> = [
  ['colony_pluto', 'pluto_surface'], ['mining_pluto', 'pluto_surface'], ['interstellar_beacon', 'pluto_surface'],
  ['colony_triton', 'triton_surface'], ['mining_triton', 'triton_surface'], ['nitrogen_plant', 'triton_surface'],
  ['colony_titan', 'titan_surface'], ['mining_titan_deep', 'titan_surface'], ['methane_refinery', 'titan_surface'],
  ['colony_ganymede', 'ganymede_surface'], ['mining_ganymede', 'ganymede_surface'], ['research_campus', 'ganymede_surface'],
  ['colony_callisto', 'callisto_surface'], ['mining_callisto', 'callisto_surface'], ['fuel_depot_callisto', 'callisto_surface'],
  ['colony_enceladus', 'enceladus_surface'], ['geyser_collector', 'enceladus_surface'], ['bio_lab_enceladus', 'enceladus_surface'],
  ['colony_europa', 'europa_surface'], ['mining_europa_deep', 'europa_surface'], ['ocean_lab', 'europa_surface'],
];

const noBuild: Plan = () => [];

/** The cash a move costs up front: the relocation project plus the seat.
 *  At an AUCTION stage the seat is not bought at the posted price — the
 *  posted price is the reserve, and a contested seat clears above it. The
 *  sim charges the reserve (the floor) and reports it as such: every delta
 *  below is therefore the BEST case for the mover. */
function seatOutlay(stage: HqStageId): number {
  return HQ_SEAT_COUNTS[stage] > 0 ? postedSeatPrice(stage, 0) : 0;
}

/** Wrap a plan so that at `relocateAt` the player pays the relocation +
 *  seat and, `months` later, is seated at `stage` (the harness charges the
 *  stage's upkeep and applies its bonuses from that month on). */
function withRelocation(plan: Plan, stage: HqStageId, relocateAt: number, log: { movedAt: number | null }): Plan {
  const quote = quoteHqRelocation('earth_ops', stage);
  const seat = seatOutlay(stage);
  let arrivesAt = -1;
  return (p, month) => {
    if (month === relocateAt && arrivesAt < 0) {
      const total = quote.cost + seat;
      if (p.money >= total) {
        p.money -= total;
        p.totalSpent += total;
        arrivesAt = month + quote.months;
        log.movedAt = arrivesAt;
      }
    }
    if (arrivesAt >= 0 && month >= arrivesAt && p.hqStage !== stage) p.hqStage = stage;
    return plan(p, month);
  };
}

function seed(p: SimPlayer, fleet: Array<[string, string]>): SimPlayer {
  for (const [def, loc] of fleet) p.buildings.push(makeBuilding(def, loc));
  return p;
}

interface PairResult {
  label: string; relocateAt: number; movedAt: number | null; stage: HqStageId;
  stayCash: number; moveCash: number; delta: number; pct: number; netA: number; netB: number;
  outlay: number; gainPerMonth: number; paybackMonths: number;
}

function runPair(label: string, fleet: Array<[string, string]>, stage: HqStageId, relocateAt: number, startCash: number): PairResult {
  const log = { movedAt: null as number | null };
  const stay = seed(newPlayer(`${label} · stay`, startCash, noBuild), fleet);
  const move = seed(newPlayer(`${label} · move@${relocateAt}`, startCash, withRelocation(noBuild, stage, relocateAt, log)), fleet);
  runWorld(newWorld([stay]), MONTHS);
  runWorld(newWorld([move]), MONTHS);
  const a = stay.history[MONTHS - 1];
  const b = move.history[MONTHS - 1];
  const delta = b.money - a.money;
  const pct = a.money !== 0 ? (delta / Math.abs(a.money)) * 100 : 0;
  const outlay = quoteHqRelocation('earth_ops', stage).cost + seatOutlay(stage);
  // Monthly gain once seated = the difference in net income after arrival.
  const gainPerMonth = b.net - a.net;
  return {
    label, relocateAt, movedAt: log.movedAt, stage,
    stayCash: a.money, moveCash: b.money, delta, pct, netA: a.net, netB: b.net,
    outlay, gainPerMonth, paybackMonths: gainPerMonth > 0 ? outlay / gainPerMonth : Number.POSITIVE_INFINITY,
  };
}

function constantsLine(stage: HqStageId, name: string): string {
  const b = getHqBonuses(stage);
  const terms = Object.entries(b).filter(([, v]) => v !== 1).map(([k, v]) => `${k} ×${v}`).join(', ');
  return `${name.padEnd(12)} ${fm(HQ_RELOCATION[stage].cost)} + seat ${fm(seatOutlay(stage))}`
    + `${hqSeatIsAuctioned(stage) ? ' (reserve)' : ''} · ${HQ_RELOCATION[stage].months} mo · upkeep ${fm(HQ_UPKEEP_MONTHLY[stage])}/mo · ${terms}`;
}

console.log('# HQ relocation — 24-month cash delta vs staying put (scripts/sim-hq-relocation.ts)\n');
console.log('Constants:');
for (const [stage, name] of [
  ['orbital_deck', 'LEO deck'], ['lunar_hq', 'Luna'], ['mars_hq', 'Mars'],
  ['jovian_hq', 'Jupiter'], ['saturnian_hq', 'Saturn'], ['deep_space_hq', 'Deep space'],
  ['interstellar_hq', 'Interstellar'],
] as Array<[HqStageId, string]>) {
  console.log('  ' + constantsLine(stage, name));
}
console.log(`\n${MONTHS} months, Frontier off, private multipliers 1.0, fleets pre-built (no capex in the window).\n`);
console.log('| corp | move at | seated from | stage | cash stay | cash move | Δ cash | Δ % | net/mo stay | net/mo move | outlay | payback |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');

const SCENARIOS: Array<{ label: string; fleet: Array<[string, string]>; stage: HqStageId; cash: number; at: number[] }> = [
  { label: 'launch-heavy (4 pads, 3 LEO sats, outpost)', fleet: LAUNCH_FLEET, stage: 'orbital_deck', cash: 500_000_000, at: [1, 6, 12] },
  { label: 'lunar mining (6 rigs, habitat)', fleet: MINING_FLEET, stage: 'lunar_hq', cash: 500_000_000, at: [1, 6] },
  { label: 'Mars operator (surface industry + orbital relays)', fleet: MARS_FLEET, stage: 'mars_hq', cash: 3_000_000_000, at: [1, 6, 12] },
  { label: 'Jovian extractor (6 Europa rigs + relays + labs)', fleet: JOVIAN_FLEET, stage: 'jovian_hq', cash: 20_000_000_000, at: [1, 6, 12] },
  { label: 'Saturnian science house (4 Titan rigs + 6 sensor labs)', fleet: SATURN_FLEET, stage: 'saturnian_hq', cash: 20_000_000_000, at: [1, 6, 12] },
  { label: 'Kuiper operator (4 Kuiper rigs + 2 relays + outer rigs)', fleet: KUIPER_FLEET, stage: 'deep_space_hq', cash: 25_000_000_000, at: [1, 6, 12] },
  { label: 'outer-colony conglomerate (7 settled surfaces)', fleet: COLONY_FLEET, stage: 'interstellar_hq', cash: 30_000_000_000, at: [1, 6, 12] },
];

const rows: PairResult[] = [];
for (const sc of SCENARIOS) for (const at of sc.at) rows.push(runPair(sc.label, sc.fleet, sc.stage, at, sc.cash));
for (const r of rows) {
  console.log(`| ${r.label} | ${r.relocateAt} | ${r.movedAt ?? 'never (cash)'} | ${r.stage} | ${fm(r.stayCash)} | ${fm(r.moveCash)} | ${fm(r.delta)} | ${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(1)}% | ${fm(r.netA)} | ${fm(r.netB)} | ${fm(r.outlay)} | ${Number.isFinite(r.paybackMonths) ? r.paybackMonths.toFixed(0) + ' mo' : 'never'} |`);
}

// The Lunar HQ's real upside: the Mining-Order fuel bill (mining-orders.ts
// quoteLeg) for one round trip to an Inner Belt rock, tier-2 mining hull,
// full hold, with and without the Luna terms.
const hull = [...SHIP_MAP.values()].find(s => (s.oreExtractionPerHour || 0) > 0 && s.tier >= 2) ?? [...SHIP_MAP.values()].find(s => (s.oreExtractionPerHour || 0) > 0);
const rock = getAsteroidCatalog().find(r => r.fieldId === 'field_inner_belt');
if (hull && rock) {
  const luna = getHqBonuses('lunar_hq');
  const out = quoteLeg('lunar_surface', 'asteroid_belt', rock.deltaVExtra, hull.tier, 0, 1);
  const back = quoteLeg('asteroid_belt', 'lunar_surface', rock.deltaVExtra, hull.tier, hull.cargoCapacity, 1);
  const outL = quoteLeg('lunar_surface', 'asteroid_belt', rock.deltaVExtra, hull.tier, 0, 1, { fuelMult: luna.miningFuelMult, deltaVMult: luna.beltDeltaVMult });
  const backL = quoteLeg('asteroid_belt', 'lunar_surface', rock.deltaVExtra, hull.tier, hull.cargoCapacity, 1, { fuelMult: luna.miningFuelMult, deltaVMult: luna.beltDeltaVMult });
  const earthBill = out.fuel + back.fuel;
  const lunaBill = outL.fuel + backL.fuel;
  console.log(`\nLunar HQ on the Mining-Order loop (not in the table above): ${hull.name} → ${rock.name} (Inner Belt, +${rock.deltaVExtra} m/s) round trip from Luna: fuel ${fm(earthBill)} on Earth terms vs ${fm(lunaBill)} seated on Luna (−${((1 - lunaBill / earthBill) * 100).toFixed(1)}%). Upkeep ${fm(HQ_UPKEEP_MONTHLY.lunar_hq)}/mo pays back at ≈ ${(HQ_UPKEEP_MONTHLY.lunar_hq / Math.max(1, earthBill - lunaBill)).toFixed(1)} belt round trips a month.`);
}

// ─── CC-4: the interstellar rung's OTHER half ────────────────────────────────
// The table above measures the interstellar seat on the service ledger alone
// (+15% colony-surface revenue). That was all CC-3 could measure, because
// the seat's second term — +15% on the survey data an expedition brings home
// — had no server record behind it and no real gate in front of it. CC-4
// gave expeditions both (prisma Expedition + server-expeditions.ts), so the
// rung can finally be priced whole: a tier-7 corporation that qualifies for
// the seat is BY DEFINITION one that has completed an interstellar
// expedition, and a corporation that has done it once does it again.
//
// The expedition loop is a CAMPAIGN loop, not a monthly one: a Proxima round
// trip is 4.24 ly x 30 game-months/ly x 2 + 12 = ~266 game-months, so a
// 24-month window sees at most a fraction of one return. What follows is
// therefore reported as a RATE (per game-month of mission) alongside the
// per-return figure, which is the honest way to compare a campaign payout
// against a monthly seat rent.
{
  const seats: HqStageId[] = ['deep_space_hq', 'interstellar_hq'];
  console.log('\n## CC-4 — the expedition-return term (not on the service ledger)\n');
  console.log('| seat | system | round trip | survey (seed roll) | seat adds | per game-month | rent/mo | months of rent per return |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const stage of seats) {
    const mult = hqExpeditionReturnMult(getHqBonuses(stage));
    for (const systemId of ['proxima_centauri', 'sirius']) {
      const system = INTERSTELLAR_SYSTEM_MAP.get(systemId);
      if (!system) continue;
      const outbound = Math.ceil(system.distanceLy * GAME_MONTHS_PER_LY);
      const roundTrip = outbound * 2 + EXPLORE_DURATION_MONTHS;
      // A deterministic mid-seed roll rather than the band's midpoint, so the
      // figure is one the game can actually produce.
      const survey = rollExpeditionOutcome(0x5eed_c0de, system).surveyDataPayout;
      const adds = survey * (mult - 1);
      const rent = HQ_UPKEEP_MONTHLY[stage];
      console.log(`| ${stage} | ${system.name} | ${roundTrip} mo | ${fm(survey)} | ${fm(adds)} | ${fm(adds / roundTrip)} | ${fm(rent)} | ${(adds / rent).toFixed(1)} |`);
    }
  }
  const mid = SURVEY_DATA_PAYOUT_PER_LY * 4.24;
  console.log(`\nBand check: survey data is ${fm(SURVEY_DATA_PAYOUT_PER_LY)}/ly x 0.75-1.25, so Proxima pays ${fm(mid * 0.75)}-${fm(mid * 1.25)} before the science cap (+30%) and the seat term.`);
  console.log('The SERVER credits exactly survey x 1.30 x the seat term as one-shot money-ceiling headroom');
  console.log('(server-expeditions.ts creditDueExpeditionReturns) — the same helper the client tick multiplies by,');
  console.log('so a return can never be rejected as implausible income.');
}
