// ─── Space Tycoon: HQ relocation balance check (Balance Pass 11, 2026-09-13)
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2 / CC-2. Runs the shared
// harness (scripts/sim-harness.ts — the engine's structural stack) for 24
// game-months and reports the cash delta of relocating the headquarters at
// month N versus staying on Earth, for:
//   - a LAUNCH-HEAVY corporation (Earth launch pads; the LEO deck's +12%
//     launch revenue / −10% satellite ops is its whole upside);
//   - a MINING corporation (lunar rigs; the Lunar HQ's terms live on the
//     Mining-Order loop — fuel per leg, belt Δv — which the building-based
//     harness does not model, so its 24-month cash delta is pure cost).
// Target (task brief): +5–15% cash at month 24 for the launch corp,
// ≤ 0 for the mining corp. Run: npx tsx scripts/sim-hq-relocation.ts
// Deterministic (no Date.now-dependent economics; Frontier off).

import { newWorld, newPlayer, runWorld, makeBuilding, fm, type SimPlayer } from './sim-harness';
import { HQ_RELOCATION, HQ_UPKEEP_MONTHLY, HQ_SEAT_COUNTS, getHqBonuses, type HqStageId } from '../src/lib/game/headquarters';
import { postedSeatPrice, quoteHqRelocation } from '../src/lib/game/hq-relocation';
import { quoteLeg } from '../src/lib/game/mining-orders';
import { SHIP_MAP } from '../src/lib/game/ships';
import { getAsteroidCatalog } from '../src/lib/game/asteroids';

const MONTHS = 24;

type Plan = SimPlayer['plan'];

/** Established corporations (the move is a tier-2/3 decision): the fleet
 *  is PRE-BUILT (no capex in the window — the requirement station is a
 *  tier-3-scale asset that both runs own identically), and no further
 *  building happens, so the only difference between the pair is the
 *  relocation itself: cost + seat, upkeep, and the seat's bonus terms. */
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
const START_CASH = 500_000_000;
const noBuild: Plan = () => [];

/** Wrap a plan so that at `relocateAt` the player pays the relocation +
 *  seat and, `months` later, is seated at `stage` (the harness charges the
 *  stage's upkeep and applies its bonuses from that month on). */
function withRelocation(plan: Plan, stage: HqStageId, relocateAt: number, log: { movedAt: number | null }): Plan {
  const quote = quoteHqRelocation('earth_ops', stage);
  const seat = HQ_SEAT_COUNTS[stage] > 0 ? postedSeatPrice(stage, 0) : 0;
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

function runPair(label: string, fleet: Array<[string, string]>, stage: HqStageId, relocateAt: number) {
  const log = { movedAt: null as number | null };
  const stay = seed(newPlayer(`${label} · stay`, START_CASH, noBuild), fleet);
  const move = seed(newPlayer(`${label} · move@${relocateAt}`, START_CASH, withRelocation(noBuild, stage, relocateAt, log)), fleet);
  runWorld(newWorld([stay]), MONTHS);
  runWorld(newWorld([move]), MONTHS);
  const a = stay.history[MONTHS - 1];
  const b = move.history[MONTHS - 1];
  const delta = b.money - a.money;
  const pct = a.money !== 0 ? (delta / Math.abs(a.money)) * 100 : 0;
  return { label, relocateAt, movedAt: log.movedAt, stage, stayCash: a.money, moveCash: b.money, delta, pct, netA: a.net, netB: b.net };
}

console.log('# HQ relocation — 24-month cash delta vs staying on Earth (scripts/sim-hq-relocation.ts)\n');
console.log(`Constants: LEO ${fm(HQ_RELOCATION.orbital_deck.cost)} + seat ${fm(postedSeatPrice('orbital_deck', 0))} (empty pool) · ${HQ_RELOCATION.orbital_deck.months} mo · upkeep ${fm(HQ_UPKEEP_MONTHLY.orbital_deck)}/mo · launch revenue ×${getHqBonuses('orbital_deck').launchRevenueMult} · sat ops ×${getHqBonuses('orbital_deck').satelliteOpsCostMult}`);
console.log(`           Luna ${fm(HQ_RELOCATION.lunar_hq.cost)} + seat ${fm(postedSeatPrice('lunar_hq', 0))} · ${HQ_RELOCATION.lunar_hq.months} mo · upkeep ${fm(HQ_UPKEEP_MONTHLY.lunar_hq)}/mo · mining fuel ×${getHqBonuses('lunar_hq').miningFuelMult} · belt Δv ×${getHqBonuses('lunar_hq').beltDeltaVMult}`);
console.log(`Start cash ${fm(START_CASH)}, ${MONTHS} months, Frontier off, private multipliers 1.0.\n`);
console.log('| corp | move at | seated from | stage | cash stay | cash move | Δ cash | Δ % | net/mo stay | net/mo move |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');

const rows = [
  runPair('launch-heavy (2 small + 2 medium pads, 3 LEO sats, outpost)', LAUNCH_FLEET, 'orbital_deck', 1),
  runPair('launch-heavy (2 small + 2 medium pads, 3 LEO sats, outpost)', LAUNCH_FLEET, 'orbital_deck', 6),
  runPair('launch-heavy (2 small + 2 medium pads, 3 LEO sats, outpost)', LAUNCH_FLEET, 'orbital_deck', 12),
  runPair('mining (6 lunar rigs, habitat)', MINING_FLEET, 'lunar_hq', 1),
  runPair('mining (6 lunar rigs, habitat)', MINING_FLEET, 'lunar_hq', 6),
];
for (const r of rows) {
  console.log(`| ${r.label} | ${r.relocateAt} | ${r.movedAt ?? 'never (cash)'} | ${r.stage} | ${fm(r.stayCash)} | ${fm(r.moveCash)} | ${fm(r.delta)} | ${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(1)}% | ${fm(r.netA)} | ${fm(r.netB)} |`);
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
