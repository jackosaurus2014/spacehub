// ─── Space Tycoon: Balance Pass 8 — dynamic competitive-tools campaign sim ──
// docs/BALANCE.md "Pass 8". Founder directive: "Run a simulated game where
// you test out the competitive tools and balance test them."
//
// Prior passes tested each offense lever in ISOLATION (one duel at a time,
// static postures — sim-pvp.ts S7-S11 analytic ledgers). This runner is the
// missing INTEGRATION test: one shared world where rule-based archetypes
// actively USE the tools against each other over time, with counterplay:
//
//   AGGRESSOR   — fires price campaigns when rational-per-its-model (expected
//                 rival damage ≥ its own all-in cost), poaches talent when
//                 the gain math favors it. Model documented at the policy.
//   DEFENDER    — counterplays per the documented counterplays: ride-out vs
//                 mothball vs spread for campaigns (run as scenario variants
//                 so each branch is measured); retention vs rehire for
//                 poaches (both branches priced at real constants).
//   OPPORTUNIST — exploits fights it's not in: buys campaign-crashed
//                 resources during the pin (NPC ask volume is untouched by a
//                 campaign — price-campaigns.ts header), resells after mean
//                 reversion heals the price.
//   BYSTANDERS  — economically-focused corps (one with collateral exposure
//                 to the campaigned resource, one without) + a fresh
//                 GRADUATE carrying the shipped Pass-6 graduation glide
//                 (newcomer-crush measurements read this player).
//
// Two eras: A = relaunch scale (everyone $200M-2B), B = mid-game
// ($10-50B). Both run 96 game-months (24 REAL days at 6h/game-month) —
// NOTE the era brief said 24 game-months, but 24 game-months is only 6 real
// days and the offense clocks are REAL-time: one campaign window alone is
// 7 real days = 28 game-months, cooldown 14 days = 56 game-months. A
// 24-game-month era cannot contain even ONE complete campaign cycle —
// itself a tempo finding, reported. Tables are cut at month 23 (the "first
// 24 months" view) and month 95 (full-cycle view).
//
// MEASUREMENT: every attack's ROI is measured by TWIN-SCENARIO DIFFERENCING
// — the same deterministic world run with and without the attack, per-player
// cumulative nets diffed. No counterfactual estimation, no RNG.
//
// All tool costs/effects import the REAL engine modules (price-campaigns,
// talent-poaching, labor-market, workforce, orbital-slot-auctions,
// cornering-intel, offense, espionage-system, mothball). Server-resolved
// pieces that cannot be client-modeled are marked out-of-coverage in the
// printed coverage table (§0) — never faked.
//
// Deterministic: no Date.now(), no Math.random(). Double-run diff-identical.
//   npx tsx scripts/sim-tools.ts

import {
  newPlayer, newWorld, stepMonth, fm, mdTable, bookNetWorth,
  GAME_MONTH_MS, INPUT_BUY_MULT, OUTPUT_SELL_MULT, npcAbsorptionPerMonth,
  type SimPlayer, type SimWorld, type SimWorldOpts,
} from './sim-harness';
import { BUILDING_MAP } from '../src/lib/game/buildings';
import { RESOURCE_MAP } from '../src/lib/game/resources';
import type { ResourceId } from '../src/lib/game/resources';
import {
  computeCampaignFee, PRICE_CAMPAIGN_DURATION_MS, PRICE_CAMPAIGN_COOLDOWN_MS,
  PRICE_CAMPAIGN_MIN_FEE, PRICE_CAMPAIGN_MAX_FEE, PRICE_CAMPAIGN_FEE_REFERENCE_UNITS,
  PRICE_CAMPAIGN_MIN_INVENTORY, PRICE_CAMPAIGN_MIN_NET_WORTH,
} from '../src/lib/game/price-campaigns';
import {
  computeSigningBonus, computeRetentionCost, maxPoachableCount,
  POACH_ACTION_FEE, POACH_TARGET_COOLDOWN_MS, POACH_MIN_NET_WORTH,
  POACH_WAGE_BUMP_PER_CREW,
} from '../src/lib/game/talent-poaching';
import {
  computeLaborAggregates, computeWageIndex, sumCrewQuarters,
  LABOR_SUPPLY_BASE, LABOR_SUPPLY_PER_QUARTERS, WAGE_INDEX_MIN, WAGE_INDEX_MAX,
  type LaborActivitySummary,
} from '../src/lib/game/labor-market';
import { DEFAULT_WORKFORCE, getWorkforceBonuses, getHireCost, WORKER_MAP } from '../src/lib/game/workforce';
import type { WorkerType, WorkforceState } from '../src/lib/game/workforce';
import { calculatePriceAfterTrade, MAX_TRADE_IMPACT, TRADE_IMPACT_K } from '../src/lib/game/market-engine';
import { getNpcVolumeCap } from '../src/lib/game/npc-volume-caps';
import { ORBITAL_SLOT_MAP, SATURATED_OCCUPANCY_PCT } from '../src/lib/game/spatial-strategy';
import { computeMinBid } from '../src/lib/game/orbital-slot-auctions';
import { STANDING_DEMAND_REPORT_FEE } from '../src/lib/game/cornering-intel';
import { FREIGHT_TOLL_MAX, FREIGHT_TOLL_CAP_PER_DISPATCH } from '../src/lib/game/offense';
import { getActionCost } from '../src/lib/game/espionage-system';
import { MOTHBALL_MAINTENANCE_FRACTION, REACTIVATION_FEE_FRACTION, REACTIVATION_SPINUP_MONTHS } from '../src/lib/game/mothball';
import { GRADUATION_GLIDE_MS } from '../src/lib/game/frontier';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = 96;                       // 24 real days
const CUT_EARLY = 23;                    // "first 24 game-months" view
const CAMPAIGN_RES = 'lunar_water';
const CAMPAIGN_WINDOW_MONTHS = PRICE_CAMPAIGN_DURATION_MS / GAME_MONTH_MS;   // 28
const CAMPAIGN_COOLDOWN_MONTHS = PRICE_CAMPAIGN_COOLDOWN_MS / GAME_MONTH_MS; // 56
const POACH_COOLDOWN_MONTHS = POACH_TARGET_COOLDOWN_MS / GAME_MONTH_MS;      // 120
const GLIDE_MONTHS = GRADUATION_GLIDE_MS / GAME_MONTH_MS;                    // 56
const POACH_HORIZON_MONTHS = 12;         // documented gain-model horizon
const FORCE_MONTH = 20;                  // forced-fire month: after era build-outs settle, so twin-diff knock-on noise (a fee delaying a build) stays small
const CRASH_RAMP_FACTOR = 0.8;           // avg pin depth over the window (price takes ~3 months to reach the floor)

// ─── Era rosters ────────────────────────────────────────────────────────────

type Step = { definitionId: string; locationId: string };

function orderedPlan(order: Step[]): SimPlayer['plan'] {
  return (p) => {
    const have = new Map<string, number>();
    for (const b of p.buildings) have.set(b.definitionId, (have.get(b.definitionId) || 0) + 1);
    const want: Step[] = [];
    const counted = new Map<string, number>();
    for (const step of order) {
      const c = (counted.get(step.definitionId) || 0) + 1;
      counted.set(step.definitionId, c);
      if ((have.get(step.definitionId) || 0) >= c) continue;
      want.push(step);
    }
    return want;
  };
}

interface RosterEntry {
  name: string;
  money: number;
  order: Step[];
  headcount: Partial<Record<WorkerType, number>>;
  maxBuilds: number;
  glide?: boolean;
}

const G = (id: string, loc: string): Step => ({ definitionId: id, locationId: loc });

/** Era A — relaunch scale. Everyone inside the $200M-2B band. */
const ERA_A: RosterEntry[] = [
  {
    name: 'aggressor', money: 2_000_000_000, maxBuilds: 3,
    order: [
      G('ground_station', 'earth_surface'), G('mission_control', 'earth_surface'),
      G('sat_telecom', 'leo'), G('sat_telecom', 'leo'), G('sat_telecom_geo', 'geo'),
      G('mining_lunar_basic', 'lunar_surface'), G('solar_farm_lunar', 'lunar_surface'),
      G('datacenter_orbital', 'leo'), G('solar_farm_orbital', 'leo'),
    ],
    headcount: { engineer: 10, miner: 4, scientist: 4 },
  },
  {
    name: 'defender', money: 2_000_000_000, maxBuilds: 2,
    order: [
      G('mining_lunar_basic', 'lunar_surface'), G('solar_farm_lunar', 'lunar_surface'),
      G('mining_lunar_ice', 'lunar_surface'), G('ground_station', 'earth_surface'),
    ],
    headcount: { engineer: 8, miner: 5 },
  },
  {
    name: 'opportunist', money: 1_000_000_000, maxBuilds: 3,
    order: [
      G('ground_station', 'earth_surface'), G('sat_telecom', 'leo'),
      G('datacenter_orbital', 'leo'), G('solar_farm_orbital', 'leo'), G('sat_sensor', 'leo'),
    ],
    headcount: { engineer: 6 },
  },
  {
    name: 'bystander-1', money: 1_500_000_000, maxBuilds: 3,
    order: [
      G('ground_station', 'earth_surface'), G('mission_control', 'earth_surface'),
      G('sat_telecom', 'leo'), G('sat_telecom_geo', 'geo'),
      G('datacenter_orbital', 'leo'), G('solar_farm_orbital', 'leo'), G('launch_pad_small', 'earth_surface'),
    ],
    headcount: { engineer: 10, scientist: 4 },
  },
  {
    name: 'bystander-2', money: 1_200_000_000, maxBuilds: 2,
    order: [
      G('ground_station', 'earth_surface'), G('mining_lunar_basic', 'lunar_surface'),
      G('solar_farm_lunar', 'lunar_surface'), G('sat_telecom', 'leo'),
    ],
    headcount: { engineer: 5, miner: 3 },
  },
  {
    name: 'graduate', money: 300_000_000, maxBuilds: 2, glide: true,
    order: [
      G('sat_telecom', 'leo'), G('ground_station', 'earth_surface'), G('sat_telecom', 'leo'),
      G('mining_lunar_basic', 'lunar_surface'), G('solar_farm_lunar', 'lunar_surface'),
    ],
    headcount: { engineer: 4 },
  },
];

/** Era B — established mid-game corps ($10-50B) + the same fresh graduate. */
const ERA_B: RosterEntry[] = [
  {
    name: 'aggressor', money: 50_000_000_000, maxBuilds: 6,
    order: [
      ...ERA_A[0].order,
      G('mining_lunar_ice', 'lunar_surface'), G('solar_farm_lunar', 'lunar_surface'),
      G('sat_telecom', 'leo'), G('datacenter_orbital', 'leo'), G('solar_farm_orbital', 'leo'),
      G('mining_mars', 'mars_surface'), G('solar_farm_mars', 'mars_surface'),
      G('mining_asteroid', 'asteroid_belt'), G('nuclear_reactor_asteroid', 'asteroid_belt'),
      G('space_station_small', 'leo'), G('fabrication_lunar', 'lunar_surface'),
    ],
    headcount: { engineer: 10, miner: 5, scientist: 4 },
  },
  {
    name: 'defender', money: 15_000_000_000, maxBuilds: 4,
    order: [
      G('mining_lunar_basic', 'lunar_surface'), G('mining_lunar_basic', 'lunar_surface'),
      G('solar_farm_lunar', 'lunar_surface'), G('solar_farm_lunar', 'lunar_surface'),
      G('mining_lunar_ice', 'lunar_surface'), G('mining_lunar_ice', 'lunar_surface'),
      G('fabrication_lunar', 'lunar_surface'), G('ground_station', 'earth_surface'),
    ],
    headcount: { engineer: 10, miner: 5 },
  },
  {
    name: 'opportunist', money: 20_000_000_000, maxBuilds: 4,
    order: [
      ...ERA_A[2].order,
      G('sat_telecom_geo', 'geo'), G('datacenter_orbital', 'leo'), G('solar_farm_orbital', 'leo'),
      G('space_station_small', 'leo'),
    ],
    headcount: { engineer: 10, scientist: 4 },
  },
  {
    name: 'bystander-1', money: 40_000_000_000, maxBuilds: 6,
    order: [
      ...ERA_A[3].order,
      G('mining_mars', 'mars_surface'), G('solar_farm_mars', 'mars_surface'),
      G('sat_telecom', 'leo'), G('datacenter_orbital', 'leo'), G('solar_farm_orbital', 'leo'),
      G('space_station_small', 'leo'), G('launch_pad_medium', 'earth_surface'),
    ],
    headcount: { engineer: 10, miner: 5, scientist: 4 },
  },
  {
    name: 'bystander-2', money: 10_000_000_000, maxBuilds: 3,
    order: [
      ...ERA_A[4].order,
      G('mining_lunar_ice', 'lunar_surface'), G('solar_farm_lunar', 'lunar_surface'),
      G('datacenter_orbital', 'leo'), G('solar_farm_orbital', 'leo'),
    ],
    headcount: { engineer: 8, miner: 5 },
  },
  { ...ERA_A[5] }, // the graduate is the same in any era — that is the point
];

/** Background population: relaunch expectation is dozens of active corps.
 *  Pop-corps carry rational-cap headcounts but no buildings — they exist so
 *  the shared LABOR market sees a realistic employed base (they do not touch
 *  demand pools, deposits, or the NPC book). Count chosen per era below. */
const POP_HEADCOUNT: Partial<Record<WorkerType, number>> = { engineer: 10, miner: 5, scientist: 4, operator: 3 };
const ERA_A_POP = 20;
const ERA_B_POP = 30;
const ERA_A_RESEARCH_MULT = 1.2;  // a few T1 techs done at relaunch scale
const ERA_B_RESEARCH_MULT = 2.0;  // engine cap (formulas.ts revenueMultiplier)

// ─── Scenario config ────────────────────────────────────────────────────────

interface OverrideConfig {
  /** H1 candidate: fee = clamp(max(feePctNW × attacker book NW,
   *  base × FEE_FLOOR_UNITS), $25M, $5B); depth purchased =
   *  0.7 × min(1, feePaid / computeCampaignFee(base)) — the campaign's pin
   *  floor is base × (1 − depth). Absent = shipped constants (full depth,
   *  resource-keyed fee). */
  campaignWealthFee?: { feePctNW: number; feeFloorUnits: number };
  /** H1 candidate: poach action fee × clamp(worldMedianMonthlyNet /
   *  $30M, 1, 50) — the Pass-5 "quarterly median-income factor". */
  poachFeeIncomeIndexed?: boolean;
  /** Pass-8 candidate (found in this pass — see §6b): fee =
   *  clamp(fraction × trailing-month world production value of the resource
   *  × the 28-game-month window, $25M, $5B), FULL depth retained. Keys the
   *  fee to the MARKET'S size instead of the attacker's wallet. */
  campaignMarketFee?: { fraction: number };
  /** Pass-8 proposed shield: extend the graduation glide to the mining spot
   *  floor for the glide-carrying graduate (harness glideSpotFloor opt). */
  gradSpotFloorGlide?: boolean;
  /** H2 candidate: LABOR_SUPPLY_BASE ÷ divisor (harness world switch). */
  laborSupplyDivisor?: number;
}

interface ScenarioConfig {
  era: 'A' | 'B';
  /** Aggressor campaign policy: 'policy' = fire when rational-per-model;
   *  a number = force-fire at that month (gates permitting); null = never. */
  campaign: 'policy' | number | null;
  /** Poach: same shape. */
  poach: 'policy' | number | null;
  /** Defender's campaign counterplay. */
  defenderPolicy: 'rideout' | 'mothball' | 'spread';
  /** Defender's poach response ('auto' = cheaper of retain/rehire). */
  defenderPoachResponse: 'retain' | 'rehire' | 'auto';
  /** Opportunist runs the crash-buy trade when a campaign is public. */
  opportunistTrades: boolean;
  /** Defender retaliates: counter-campaign + counter-poach when hit. */
  titForTat?: boolean;
  overrides?: OverrideConfig;
}

interface FiringLogRow {
  month: number;
  tool: string;
  eligible: boolean;
  ratio: number;      // expected damage (or gain) / cost per the policy model
  fired: boolean;
  note: string;
}

interface ScenarioResult {
  players: SimPlayer[];
  world: SimWorld;
  firingLog: FiringLogRow[];
  campaignLedger: {
    declaredMonth: number; feePaid: number; ammoCost: number; pinFloor: number;
    dumpMarginSacrifice: number;
  }[];
  poachLedger: {
    month: number; attacker: string; target: string; n: number; idx: number;
    bonus: number; fee: number; outcome: 'poached' | 'retained';
    retentionPaid: number; rehirePaid: number;
  }[];
  opportunistTradePnL: number;
  /** Held crash-trade inventory at end, marked to market (spot × 0.97). */
  opportunistMarkToMarket: number;
  mothballCosts: number;   // defender: 25% maint paid + reactivation fee
  spreadCapex: number;
  engineerIndexByMonth: number[];
  /** Out-of-band money events (runner-charged fees/bonuses/trades — these
   *  bypass the harness MonthRow.net, so twin-diffing nets alone would
   *  undercount attacker cost). amt < 0 = spend. */
  oobEvents: { month: number; name: string; amt: number }[];
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function wfOf(headcount: Partial<Record<WorkerType, number>>): WorkforceState {
  return {
    ...DEFAULT_WORKFORCE,
    engineers: headcount.engineer || 0,
    miners: headcount.miner || 0,
    scientists: headcount.scientist || 0,
    operators: headcount.operator || 0,
  };
}

function serviceRevBonus(headcount: Partial<Record<WorkerType, number>>): number {
  return getWorkforceBonuses(wfOf(headcount)).serviceRevenue; // real cap 0.5
}

/** The month's engineer wage index — same math the harness charges payroll
 *  with (real computeLaborAggregates; optional H2 divisor). */
function engineerIndex(players: SimPlayer[], divisor?: number): number {
  const summaries: LaborActivitySummary[] = players.map(p => ({
    id: p.name, headcount: p.headcount || {}, trainingLevel: p.trainingLevel,
    crewQuarters: sumCrewQuarters(p.buildings),
  }));
  const agg = computeLaborAggregates(summaries).get('engineer')!;
  if (!divisor || divisor === 1) return agg.index;
  const quarters = players.reduce((a, p) => a + sumCrewQuarters(p.buildings), 0);
  return computeWageIndex(agg.employedEffective, LABOR_SUPPLY_BASE.engineer / divisor + quarters * LABOR_SUPPLY_PER_QUARTERS);
}

/** Units needed to press spot from current price to `floor` via the real
 *  clamped sell-impact bursts (the S7 ammunition math). */
function crashAmmoUnits(res: string, fromPrice: number, floor: number): number {
  const def = RESOURCE_MAP.get(res as ResourceId)!;
  const vol = (def as { volatility?: number }).volatility ?? 0.05;
  const minP = (def as { minPrice?: number }).minPrice ?? 1;
  const maxP = (def as { maxPrice?: number }).maxPrice ?? def.baseMarketPrice * 10;
  const burstQty = Math.ceil(MAX_TRADE_IMPACT / (vol * TRADE_IMPACT_K));
  let price = fromPrice, units = 0, bursts = 0;
  while (price > floor && bursts < 40) {
    price = calculatePriceAfterTrade(price, def.baseMarketPrice, burstQty, false, vol, minP, maxP);
    units += burstQty; bursts++;
  }
  return units;
}

/** H1 override fee (see OverrideConfig doc). */
function overrideCampaignFee(cfg: OverrideConfig['campaignWealthFee'], attackerNW: number, base: number): number {
  const floor = Math.round(base * cfg!.feeFloorUnits);
  const raw = Math.max(Math.round(cfg!.feePctNW * attackerNW), floor);
  return Math.max(PRICE_CAMPAIGN_MIN_FEE, Math.min(5_000_000_000, raw));
}

/** Depth purchased by a fee: 0.7 at the resource's full-depth fee (the
 *  shipped computeCampaignFee), linearly less below it. */
function purchasedDepth(feePaid: number, base: number): number {
  return 0.7 * Math.min(1, feePaid / computeCampaignFee(base));
}

// ─── The scenario runner ────────────────────────────────────────────────────

function runScenario(cfg: ScenarioConfig): ScenarioResult {
  const roster = cfg.era === 'A' ? ERA_A : ERA_B;
  const researchMult = cfg.era === 'A' ? ERA_A_RESEARCH_MULT : ERA_B_RESEARCH_MULT;
  const popCount = cfg.era === 'A' ? ERA_A_POP : ERA_B_POP;
  const ov = cfg.overrides || {};

  const players: SimPlayer[] = roster.map(r => newPlayer(r.name, r.money, orderedPlan(r.order), {
    maxBuildsPerMonth: r.maxBuilds,
    headcount: { ...r.headcount },
    graduationGlide: r.glide ? { startMonth: 0, glideMonths: GLIDE_MONTHS } : undefined,
    glideSpotFloor: r.glide && ov.gradSpotFloorGlide ? true : undefined,
  }));
  for (let i = 0; i < popCount; i++) {
    players.push(newPlayer(`pop-${i + 1}`, 5_000_000_000, () => [], {
      maxBuildsPerMonth: 0, headcount: { ...POP_HEADCOUNT }, sellsLeftovers: false,
    }));
  }
  const byName = new Map(players.map(p => [p.name, p]));
  const aggressor = byName.get('aggressor')!;
  const defender = byName.get('defender')!;
  const opportunist = byName.get('opportunist')!;

  const opts: SimWorldOpts = {
    npcSaleCaps: true, contendedNpcCaps: true, constructionMaterials: true,
    laborMarket: true, dynamicSpot: true, contractOutlet: { capPerDay: 5 },
    campaignSlugs: [],
  };
  if (ov.laborSupplyDivisor) opts.laborSupplyDivisor = ov.laborSupplyDivisor;
  const world = newWorld(players, 0, null, opts);

  const result: ScenarioResult = {
    players, world, firingLog: [], campaignLedger: [], poachLedger: [],
    opportunistTradePnL: 0, opportunistMarkToMarket: 0, mothballCosts: 0, spreadCapex: 0,
    engineerIndexByMonth: [], oobEvents: [],
  };
  let monthNow = 0;
  const chargeOob = (p: SimPlayer, amt: number): void => {
    p.money -= amt; p.totalSpent += amt;
    result.oobEvents.push({ month: monthNow, name: p.name, amt: -amt });
  };
  const creditOob = (p: SimPlayer, amt: number): void => {
    p.money += amt; p.totalEarned += amt;
    result.oobEvents.push({ month: monthNow, name: p.name, amt });
  };

  // Campaign state (at most one per declarer at a time — real cap).
  interface CampaignState { by: string; res: string; endMonth: number; cooldownUntil: number; pinFloor: number }
  // Ref-object holder: mutated inside closures, so direct let-narrowing
  // would collapse to `never` under TS control-flow analysis.
  const campaignRef: { cur: CampaignState | null } = { cur: null };
  let aggressorCooldownUntil = -1;
  let defenderCooldownUntil = -1;
  const poachCooldownUntil = new Map<string, number>(); // attacker:target -> month
  let defenderWasHit = false;

  // Defender mothball stash (policy 'mothball').
  let mothballed: SimPlayer['buildings'] = [];
  let reactivateAtMonth = -1;

  // Opportunist crash-trade inventory.
  let oppHeld = 0;
  let oppCostBasis = 0;

  const base = RESOURCE_MAP.get(CAMPAIGN_RES as ResourceId)!.baseMarketPrice;

  const spotOf = (res: string): number => world.spotSnapshot?.prices?.[res] ?? RESOURCE_MAP.get(res as ResourceId)!.baseMarketPrice;

  /** Pass-8 market-keyed fee candidate: fraction × the market's window
   *  turnover (last-month world production of the resource × spot × the
   *  28-game-month window), clamped to the shipped min and a $5B cap. */
  function marketKeyedFee(fraction: number): number {
    const spot = spotOf(CAMPAIGN_RES);
    let worldUnits = 0;
    for (const p of world.players) {
      worldUnits += p.history[p.history.length - 1]?.flows?.mined?.[CAMPAIGN_RES] || 0;
    }
    const turnover = worldUnits * spot * CAMPAIGN_WINDOW_MONTHS;
    const raw = Math.round(fraction * turnover);
    return Math.max(PRICE_CAMPAIGN_MIN_FEE, Math.min(5_000_000_000, raw));
  }

  /** Aggressor's campaign fire decision (documented model — see header).
   *  Rival exposure is read from last month's mined flows: units mined are
   *  observable-grade intelligence (fleet counts are public; E6 trade
   *  telemetry is real), so the model uses what a scouting player can see. */
  function evaluateCampaign(who: SimPlayer, month: number, coolUntil: number): { fire: boolean; ratio: number; fee: number; note: string } {
    const nw = bookNetWorth(who);
    const spot = spotOf(CAMPAIGN_RES);
    const fee = ov.campaignMarketFee
      ? marketKeyedFee(ov.campaignMarketFee.fraction)
      : ov.campaignWealthFee
        ? overrideCampaignFee(ov.campaignWealthFee, nw, base)
        : computeCampaignFee(base);
    const depth = ov.campaignWealthFee ? purchasedDepth(fee, base) : 0.7;
    const pinFloor = Math.round(base * (1 - depth));
    let rivalUnits = 0, ownUnits = 0;
    for (const p of world.players) {
      const mined = p.history[p.history.length - 1]?.flows?.mined?.[CAMPAIGN_RES] || 0;
      if (p === who) ownUnits += mined; else rivalUnits += mined;
    }
    const perMonthDamage = (units: number) => units * spot * (depth * (spot > pinFloor ? 1 : 0));
    const expRivalDamage = perMonthDamage(rivalUnits) * CAMPAIGN_WINDOW_MONTHS * CRASH_RAMP_FACTOR;
    const selfDamage = perMonthDamage(ownUnits) * CAMPAIGN_WINDOW_MONTHS * CRASH_RAMP_FACTOR;
    // Dump-ammunition cost — empirically calibrated (Pass 8 §2 twin runs):
    // once mean reversion is skipped, the WORLD'S ongoing mined+sold flow
    // does the crashing by itself within ~3-4 months whenever half a
    // window's flow covers the burst-unit requirement; the declarer only
    // sacrifices margin on whatever remainder it must dump itself.
    const ammoUnits = crashAmmoUnits(CAMPAIGN_RES, spot, pinFloor);
    const worldFlowHalfWindow = (rivalUnits + ownUnits) * CAMPAIGN_WINDOW_MONTHS * 0.5;
    const selfDumpUnits = Math.max(0, ammoUnits - worldFlowHalfWindow);
    const marginSacrifice = selfDumpUnits * Math.max(0, spot - (spot + pinFloor) / 2);
    const minInv = PRICE_CAMPAIGN_MIN_INVENTORY;
    const ammoShortfall = Math.max(0, minInv - (who.resources[CAMPAIGN_RES] || 0));
    const ammoCost = ammoShortfall * spot * INPUT_BUY_MULT;
    const totalCost = fee + selfDamage + marginSacrifice + ammoCost;
    const ratio = totalCost > 0 ? expRivalDamage / totalCost : 0;
    const gates =
      nw >= PRICE_CAMPAIGN_MIN_NET_WORTH &&
      who.money >= fee + ammoCost &&
      month >= coolUntil &&
      (!campaignRef.cur || campaignRef.cur.by !== who.name);
    const note = `nw ${fm(nw)} fee ${fm(fee)} depth ${(depth * 100).toFixed(0)}% expRival ${fm(expRivalDamage)} self ${fm(selfDamage)} margin ${fm(marginSacrifice)}`;
    return { fire: gates && ratio >= 1, ratio, fee, note };
  }

  function declareCampaign(who: SimPlayer, month: number, fee: number): void {
    const spot = spotOf(CAMPAIGN_RES);
    const nw = bookNetWorth(who);
    const depth = ov.campaignWealthFee ? purchasedDepth(fee, base) : 0.7;
    const pinFloor = Math.round(base * (1 - depth));
    const ammoShortfall = Math.max(0, PRICE_CAMPAIGN_MIN_INVENTORY - (who.resources[CAMPAIGN_RES] || 0));
    const ammoCost = ammoShortfall * spot * INPUT_BUY_MULT;
    if (ammoShortfall > 0) {
      chargeOob(who, ammoCost);
      who.resources[CAMPAIGN_RES] = (who.resources[CAMPAIGN_RES] || 0) + ammoShortfall;
    }
    chargeOob(who, fee);
    const ammoUnits = crashAmmoUnits(CAMPAIGN_RES, spot, pinFloor);
    const marginSacrifice = ammoUnits * Math.max(0, spot - (spot + pinFloor) / 2);
    campaignRef.cur = { by: who.name, res: CAMPAIGN_RES, endMonth: month + CAMPAIGN_WINDOW_MONTHS, cooldownUntil: month + CAMPAIGN_WINDOW_MONTHS + CAMPAIGN_COOLDOWN_MONTHS, pinFloor };
    if (who === aggressor) aggressorCooldownUntil = campaignRef.cur.cooldownUntil;
    else defenderCooldownUntil = campaignRef.cur.cooldownUntil;
    result.campaignLedger.push({ declaredMonth: month, feePaid: fee, ammoCost, pinFloor, dumpMarginSacrifice: marginSacrifice });
    void nw;
  }

  /** Poach decision model (documented): value = attacker's own 12-game-month
   *  serviceRevenue delta from +n engineers PLUS the victim's mirrored loss
   *  (competitive-warfare value at full weight); cost = escrowed bonus +
   *  burned fee. If the rational defender would retain, the attacker's
   *  realized outcome is fee-for-retention-burn — evaluated separately. */
  function evaluatePoach(who: SimPlayer, target: SimPlayer, month: number, idx: number): { fire: boolean; ratio: number; note: string; n: number; bonus: number; fee: number } {
    const targetEng = target.headcount?.engineer || 0;
    const n = maxPoachableCount(targetEng);
    const fee = ov.poachFeeIncomeIndexed ? indexedPoachFee() : POACH_ACTION_FEE;
    if (n <= 0) return { fire: false, ratio: 0, note: `target below min headcount (${targetEng})`, n, bonus: 0, fee };
    const bonus = computeSigningBonus('engineer', n, idx);
    const myRev = who.history[who.history.length - 1]?.revenue || 0;
    const theirRev = target.history[target.history.length - 1]?.revenue || 0;
    const myHc = { ...(who.headcount || {}) };
    const myGainPct = serviceRevBonus({ ...myHc, engineer: (myHc.engineer || 0) + n }) - serviceRevBonus(myHc);
    const theirHc = { ...(target.headcount || {}) };
    const theirLossPct = serviceRevBonus(theirHc) - serviceRevBonus({ ...theirHc, engineer: (theirHc.engineer || 0) - n });
    // Revenue in history already includes the CURRENT workforce bonus — divide it back out for the base.
    const myBase = myRev / (1 + serviceRevBonus(myHc)) / researchMult;
    const theirBase = theirRev / (1 + serviceRevBonus(theirHc)) / researchMult;
    const gain = (myBase * researchMult * myGainPct + theirBase * researchMult * theirLossPct) * POACH_HORIZON_MONTHS;
    const cost = bonus + fee;
    const ratio = cost > 0 ? gain / cost : 0;
    const nw = bookNetWorth(who);
    const key = `${who.name}:${target.name}`;
    const gates = nw >= POACH_MIN_NET_WORTH && who.money >= cost && month >= (poachCooldownUntil.get(key) ?? -1);
    return { fire: gates && ratio >= 1, ratio, note: `n=${n} idx ${idx.toFixed(2)} bonus ${fm(bonus)} fee ${fm(fee)} gain12mo ${fm(gain)}`, n, bonus, fee };
  }

  function indexedPoachFee(): number {
    // Pass-5 H1 proposal: fees × the published world median-income factor.
    const nets = world.players
      .filter(p => !p.name.startsWith('pop-'))
      .map(p => p.history[p.history.length - 1]?.net || 0)
      .sort((a, b) => a - b);
    const median = nets.length ? nets[Math.floor(nets.length / 2)] : 0;
    const factor = Math.max(1, Math.min(50, median / 30_000_000));
    return Math.round(POACH_ACTION_FEE * factor);
  }

  function executePoach(who: SimPlayer, target: SimPlayer, month: number, n: number, bonus: number, fee: number, idx: number): void {
    const key = `${who.name}:${target.name}`;
    poachCooldownUntil.set(key, month + POACH_COOLDOWN_MONTHS);
    chargeOob(who, fee); // burned regardless
    const retention = computeRetentionCost(bonus);
    const rehire = n * Math.round(getHireCost('engineer') * idx); // Pass-4 wage-indexed hire price
    // Rehire also eats the post-poach +0.02/head global index bump on payroll
    // until the weekly cron resettles — priced here as one month of the
    // bump on the victim's full engineer payroll (conservative).
    const bumpCost = (target.headcount?.engineer || 0) * WORKER_MAP.get('engineer')!.salary
      * Math.min(WAGE_INDEX_MAX - idx, POACH_WAGE_BUMP_PER_CREW * n);
    const retainChosen = cfg.defenderPoachResponse === 'retain'
      || (cfg.defenderPoachResponse === 'auto' && retention < rehire + bumpCost);
    if (retainChosen) {
      chargeOob(target, retention);
      result.poachLedger.push({ month, attacker: who.name, target: target.name, n, idx, bonus, fee, outcome: 'retained', retentionPaid: retention, rehirePaid: 0 });
    } else {
      chargeOob(who, bonus); // escrow released to crew (burned)
      target.headcount = { ...(target.headcount || {}), engineer: (target.headcount?.engineer || 0) - n };
      who.headcount = { ...(who.headcount || {}), engineer: (who.headcount?.engineer || 0) + n };
      // Victim rehires at the wage-indexed price next month (keeps the fleet staffed).
      chargeOob(target, rehire + bumpCost);
      target.headcount.engineer = (target.headcount.engineer || 0) + n;
      who.headcount.engineer = (who.headcount.engineer || 0); // attacker keeps the poached heads
      result.poachLedger.push({ month, attacker: who.name, target: target.name, n, idx, bonus, fee, outcome: 'poached', retentionPaid: 0, rehirePaid: rehire + bumpCost });
    }
    if (target === defender) defenderWasHit = true;
  }

  // ── Month loop ─────────────────────────────────────────────────────────
  for (let month = 0; month < MONTHS; month++) {
    monthNow = month;
    const idx = engineerIndex(players, ov.laborSupplyDivisor);
    result.engineerIndexByMonth.push(idx);

    // Campaign expiry.
    if (campaignRef.cur && month >= campaignRef.cur.endMonth) campaignRef.cur = null;

    // Aggressor decisions.
    if (cfg.campaign !== null) {
      const ev = evaluateCampaign(aggressor, month, aggressorCooldownUntil);
      const force = typeof cfg.campaign === 'number' && cfg.campaign === month;
      const fired = (cfg.campaign === 'policy' && ev.fire) || (force && aggressor.money >= ev.fee);
      result.firingLog.push({ month, tool: 'price-campaign', eligible: ev.fire || force, ratio: ev.ratio, fired, note: ev.note });
      if (fired) declareCampaign(aggressor, month, ev.fee);
    }
    if (cfg.poach !== null) {
      const ev = evaluatePoach(aggressor, defender, month, idx);
      const force = typeof cfg.poach === 'number' && cfg.poach === month;
      const fired = (cfg.poach === 'policy' && ev.fire) || (force && ev.n > 0 && aggressor.money >= ev.bonus + ev.fee);
      result.firingLog.push({ month, tool: 'talent-poach', eligible: ev.fire || force, ratio: ev.ratio, fired, note: ev.note });
      if (fired) executePoach(aggressor, defender, month, ev.n, ev.bonus, ev.fee, idx);
    }

    // Defender retaliation (escalation scenario): counter-campaign +
    // counter-poach the month after being hit, gates permitting.
    if (cfg.titForTat && defenderWasHit) {
      const ev = evaluateCampaign(defender, month, defenderCooldownUntil);
      if (ev.fire || (defender.money >= ev.fee && bookNetWorth(defender) >= PRICE_CAMPAIGN_MIN_NET_WORTH && month >= defenderCooldownUntil && (!campaignRef.cur || campaignRef.cur.by !== defender.name))) {
        result.firingLog.push({ month, tool: 'counter-campaign', eligible: true, ratio: ev.ratio, fired: true, note: ev.note });
        declareCampaign(defender, month, ev.fee);
      }
      const pv = evaluatePoach(defender, aggressor, month, idx);
      if (pv.n > 0 && defender.money >= pv.bonus + pv.fee && bookNetWorth(defender) >= POACH_MIN_NET_WORTH && month >= (poachCooldownUntil.get('defender:aggressor') ?? -1)) {
        result.firingLog.push({ month, tool: 'counter-poach', eligible: true, ratio: pv.ratio, fired: true, note: pv.note });
        // Roles swap: aggressor auto-responds with the cheaper branch.
        const savedResp = cfg.defenderPoachResponse;
        cfg.defenderPoachResponse = 'auto';
        executePoach(defender, aggressor, month, pv.n, pv.bonus, pv.fee, idx);
        cfg.defenderPoachResponse = savedResp;
      }
      defenderWasHit = false;
    }

    // Defender campaign counterplay.
    const campaignOnDefRes = campaignRef.cur !== null && campaignRef.cur.by !== 'defender';
    if (cfg.defenderPolicy === 'mothball') {
      if (campaignOnDefRes && mothballed.length === 0) {
        // Pause the lunar mines: exit pools/deposits, pay 25% maintenance.
        mothballed = defender.buildings.filter(b => b.definitionId === 'mining_lunar_basic' || b.definitionId === 'mining_lunar_ice');
        defender.buildings = defender.buildings.filter(b => !mothballed.includes(b));
      }
      if (!campaignOnDefRes && mothballed.length > 0 && reactivateAtMonth < 0) {
        // Campaign over: pay reactivation fee, spin up for 1 game-month.
        let fees = 0;
        for (const b of mothballed) fees += Math.round(BUILDING_MAP.get(b.definitionId)!.baseCost * REACTIVATION_FEE_FRACTION);
        chargeOob(defender, fees);
        result.mothballCosts += fees;
        reactivateAtMonth = month + REACTIVATION_SPINUP_MONTHS;
      }
      if (reactivateAtMonth >= 0 && month >= reactivateAtMonth) {
        defender.buildings.push(...mothballed);
        mothballed = [];
        reactivateAtMonth = -1;
      }
      if (mothballed.length > 0) {
        let maint = 0;
        for (const b of mothballed) maint += BUILDING_MAP.get(b.definitionId)!.maintenanceCostPerMonth;
        const bill = Math.round(maint * MOTHBALL_MAINTENANCE_FRACTION);
        chargeOob(defender, bill);
        result.mothballCosts += bill;
      }
    } else if (cfg.defenderPolicy === 'spread' && campaignOnDefRes) {
      // One-time diversification into an uncrowded service on campaign start.
      if (!defender.buildings.some(b => b.definitionId === 'sat_telecom')) {
        const def = BUILDING_MAP.get('sat_telecom')!;
        if (defender.money >= def.baseCost) {
          chargeOob(defender, def.baseCost);
          defender.buildings.push({ instanceId: `spread_${month}`, definitionId: 'sat_telecom', locationId: 'leo', isComplete: true });
          result.spreadCapex += def.baseCost;
        }
      }
    }

    // Opportunist crash trade: buy at the crashed ask while a campaign is
    // public (campaigns are PUBLIC — no intel fee needed to see one; the
    // NPC maker's ASK volume is untouched by the campaign), sell after
    // reversion. Volume bounded by the real NPC per-day cap.
    if (cfg.opportunistTrades) {
      const spot = spotOf(CAMPAIGN_RES);
      const monthlyCapUnits = npcAbsorptionPerMonth(CAMPAIGN_RES, world.monthMs);
      if (campaignRef.cur && spot <= base * 0.85 && opportunist.money > 0) {
        const buy = Math.min(monthlyCapUnits, Math.floor(opportunist.money / (spot * INPUT_BUY_MULT)));
        if (buy > 0) {
          const cost = buy * spot * INPUT_BUY_MULT;
          chargeOob(opportunist, cost);
          oppHeld += buy; oppCostBasis += cost;
          result.opportunistTradePnL -= cost;
        }
      } else if (!campaignRef.cur && oppHeld > 0 && spot >= base * 0.90) {
        // Sell bar 0.90×base: ongoing world mining holds the healed
        // equilibrium slightly below base (the S6 finding) — a 0.95 bar
        // never triggers and the trade strands its inventory.
        const sell = Math.min(oppHeld, monthlyCapUnits);
        const proceeds = sell * spot * OUTPUT_SELL_MULT;
        creditOob(opportunist, proceeds);
        oppHeld -= sell;
        result.opportunistTradePnL += proceeds;
      }
    }

    // Per-player revenue multiplier: era research level × real workforce bonus.
    for (const p of players) {
      if (p.name.startsWith('pop-')) continue;
      p.revenueMult = researchMult * (1 + serviceRevBonus(p.headcount || {}));
    }

    world.opts.campaignSlugs = campaignRef.cur ? [campaignRef.cur.res] : [];
    stepMonth(world, month);

    // Depth-tier pin floor (override worlds): the purchased floor bounds the
    // crash — maker quotes + arbitrage hold the price at the fee-purchased
    // depth, not the full band floor.
    if (campaignRef.cur && world.spotSnapshot) {
      const cur = world.spotSnapshot.prices[campaignRef.cur.res];
      if (typeof cur === 'number' && cur < campaignRef.cur.pinFloor) {
        world.spotSnapshot.prices[campaignRef.cur.res] = campaignRef.cur.pinFloor;
      }
    }
  }

  result.opportunistMarkToMarket = oppHeld * spotOf(CAMPAIGN_RES) * OUTPUT_SELL_MULT;
  void oppCostBasis;
  return result;
}

// ─── Measurement helpers ────────────────────────────────────────────────────

function cumNet(p: SimPlayer, from: number, to: number): number {
  let acc = 0;
  for (const h of p.history) if (h.month >= from && h.month <= to) acc += h.net;
  return acc;
}

function playerRow(r: ScenarioResult, name: string) {
  const p = r.players.find(x => x.name === name)!;
  return p;
}

/** Out-of-band spend/credit for one player over a month window. */
function oobNet(r: ScenarioResult, name: string, from: number, to: number): number {
  let acc = 0;
  for (const e of r.oobEvents) if (e.name === name && e.month >= from && e.month <= to) acc += e.amt;
  return acc;
}

/** Twin-scenario diff with honest accounting: harness `net` misses the
 *  runner-charged fees/bonuses/trades (they move `money` directly), so the
 *  table shows the in-world P&L delta, the out-of-band delta, their sum,
 *  and the end-of-run book-NW delta as the cross-check that captures
 *  everything (fees, revenue, inventory, buildings at book). */
function diffTable(base: ScenarioResult, attack: ScenarioResult, from: number, to: number): (string | number)[][] {
  return ['aggressor', 'defender', 'opportunist', 'bystander-1', 'bystander-2', 'graduate'].map(name => {
    const inWorld = cumNet(playerRow(attack, name), from, to) - cumNet(playerRow(base, name), from, to);
    const oob = oobNet(attack, name, from, to) - oobNet(base, name, from, to);
    const nwDelta = (playerRow(attack, name).history[MONTHS - 1]?.netWorthEst ?? 0)
      - (playerRow(base, name).history[MONTHS - 1]?.netWorthEst ?? 0);
    return [name, fm(inWorld), fm(oob), fm(inWorld + oob), fm(nwDelta)];
  });
}
const DIFF_HEADERS = (label: string) => ['player', `in-world Δ (${label})`, 'out-of-band Δ', 'total Δ', `book NW Δ @ mo ${MONTHS - 1}`];

function medianNonPopNet(r: ScenarioResult, month: number): number {
  const nets = r.players
    .filter(p => !p.name.startsWith('pop-'))
    .map(p => p.history[month]?.net ?? 0)
    .sort((a, b) => a - b);
  return nets[Math.floor(nets.length / 2)] || 0;
}

// ════════════════════════════════════════════════════════════════════════════
console.log('# Balance Pass 8 — dynamic competitive-tools campaign (twin-scenario differencing, real engine constants)\n');
console.log(`World: ${MONTHS} game-months (${MONTHS / 4} real days), all realism switches on (npcSaleCaps+contended FIFO, laborMarket, dynamicSpot, constructionMaterials, contractOutlet 5/day). Campaign resource: ${CAMPAIGN_RES}. One campaign window = ${CAMPAIGN_WINDOW_MONTHS} game-months; cooldown ${CAMPAIGN_COOLDOWN_MONTHS}; poach per-target cooldown ${POACH_COOLDOWN_MONTHS}. Era A pop ${ERA_A_POP + ERA_A.length} corps; era B pop ${ERA_B_POP + ERA_B.length}.\n`);

// ─── §0 Coverage ────────────────────────────────────────────────────────────
console.log('## §0 Coverage (what is simmed via real modules vs approximated vs out of coverage)\n');
console.log(mdTable(['tool / mechanic', 'status', 'notes'], [
  ['price campaign: fee, gates, window/cooldown, mean-revert skip, band floor', 'REAL modules', 'price-campaigns.ts constants + market-engine impact + spot-price band clamp via harness dynamicSpot'],
  ['campaign crash dynamics (combined-flow price impact, NPC absorption)', 'REAL modules', 'calculatePriceAfterMining/Trade + npc-volume-caps through the harness'],
  ['campaign NPC bid-halving during the pin', 'APPROXIMATED', 'harness NPC caps not halved for the window — attacker-favorable, so measured attacker ROI is an UPPER bound'],
  ['talent poach: bonus/retention/fee/cooldowns/min-headcount', 'REAL modules', 'talent-poaching.ts + Pass-4 wage-indexed rehire (getHireCost × idx)'],
  ['poach wage bump (+0.02/head until weekly cron resettles)', 'APPROXIMATED', 'priced as one month of bumped payroll on the rehiring victim'],
  ['poach detection/reputation roll', 'OUT OF COVERAGE', 'RNG + reputation system — no deterministic client model; direction: extra attacker risk, so attacker ROI is again an upper bound'],
  ['labor market: shared wage index, payroll, hire cost', 'REAL modules', 'computeLaborAggregates each month over live headcounts incl. background population'],
  ['workforce revenue bonuses (poach damage transmission)', 'REAL modules', 'getWorkforceBonuses caps — headcounts are STATE (poach-mutable), not formula'],
  ['mothball / reactivation counterplay', 'REAL constants', 'mothball.ts 25%/5%/1-month constants, runner-driven building exit/re-entry (pools+deposits react)'],
  ['orbital slot auctions / denial', 'OUT OF (dynamic) COVERAGE', 'auction trigger needs ≥85% pool occupancy — structurally unreachable at both eras (analytic check §1d prints the occupancy)'],
  ['cornering intel / espionage products', 'ANALYTIC ONLY', 'info products: value = acting on non-public info; campaigns are PUBLIC so the modeled third-party trade needs no fee — fees compared to incomes analytically'],
  ['governor freight tolls', 'OUT OF COVERAGE', 'no ships/lanes in the harness; S11 analytic table re-anchored to era incomes in §1d'],
  ['takeovers', 'OUT OF COVERAGE', 'dormant behind the 25-active-corp gate (Pass 3 S10 desk check stands)'],
]));

interface EraSummary {
  era: 'A' | 'B';
  baseline: ScenarioResult;
  policyRun: ScenarioResult;
}

function runEra(era: 'A' | 'B'): EraSummary {
  const baseline = runScenario({ era, campaign: null, poach: null, defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: false });
  const policyRun = runScenario({ era, campaign: 'policy', poach: 'policy', defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: true });
  return { era, baseline, policyRun };
}

for (const era of ['A', 'B'] as const) {
  const { baseline, policyRun } = runEra(era);
  const label = era === 'A' ? 'ERA A — relaunch scale ($200M-2B)' : 'ERA B — mid-game ($10-50B)';
  console.log(`\n\n# ${label}\n`);

  // §1a World context.
  console.log('## §1a World context (baseline, no offense)\n');
  console.log(mdTable(['player', 'start $', `net/mo @ mo ${CUT_EARLY}`, `net/mo @ mo ${MONTHS - 1}`, `book NW @ mo ${MONTHS - 1}`],
    ['aggressor', 'defender', 'opportunist', 'bystander-1', 'bystander-2', 'graduate'].map(n => {
      const p = playerRow(baseline, n);
      return [n, fm((era === 'A' ? ERA_A : ERA_B).find(r => r.name === n)!.money),
        fm(p.history[CUT_EARLY]?.net ?? 0), fm(p.history[MONTHS - 1]?.net ?? 0), fm(p.history[MONTHS - 1]?.netWorthEst ?? 0)];
    })));
  const med23 = medianNonPopNet(baseline, CUT_EARLY);
  const med95 = medianNonPopNet(baseline, MONTHS - 1);
  console.log(`\nMedian monthly net (non-pop): ${fm(med23)} @ mo ${CUT_EARLY}, ${fm(med95)} @ mo ${MONTHS - 1}. Campaign fee (${CAMPAIGN_RES}) = ${fm(computeCampaignFee(RESOURCE_MAP.get(CAMPAIGN_RES as ResourceId)!.baseMarketPrice))} = ${(computeCampaignFee(50_000) / Math.max(1, med23)).toFixed(1)}× median monthly net at mo ${CUT_EARLY}. Poach fee ${fm(POACH_ACTION_FEE)} = ${(POACH_ACTION_FEE / Math.max(1, med23)).toFixed(1)}×.`);

  // §1b Firing rates under current constants.
  console.log('\n## §1b Firing rate under CURRENT constants (policy run: fire when rational-per-model)\n');
  for (const tool of ['price-campaign', 'talent-poach']) {
    const rows = policyRun.firingLog.filter(r => r.tool === tool);
    const early = rows.filter(r => r.month <= CUT_EARLY);
    const fired = rows.filter(r => r.fired);
    const maxRatio = rows.reduce((a, r) => Math.max(a, r.ratio), 0);
    const bestEarly = early.reduce((a, r) => Math.max(a, r.ratio), 0);
    console.log(`- **${tool}**: evaluated ${rows.length} months, fired ${fired.length}× (first 24 mo: ${early.filter(r => r.fired).length}×). Best damage/cost ratio seen: ${maxRatio.toFixed(2)} (first 24 mo: ${bestEarly.toFixed(2)}) — fires at ≥1.00.${fired.length ? ' Fired at months ' + fired.map(f => f.month).join(', ') + '.' : ''}`);
  }
  const sampleCampaign = policyRun.firingLog.find(r => r.tool === 'price-campaign' && r.month === FORCE_MONTH);
  if (sampleCampaign) console.log(`- month-${FORCE_MONTH} campaign model detail: ${sampleCampaign.note}`);
  const samplePoach = policyRun.firingLog.find(r => r.tool === 'talent-poach' && r.month === FORCE_MONTH);
  if (samplePoach) console.log(`- month-${FORCE_MONTH} poach model detail: ${samplePoach.note}`);

  // §1c Labor index.
  const idxMax = Math.max(...policyRun.engineerIndexByMonth);
  console.log(`\n## §1c Labor (H2 check): engineer wage index over ${MONTHS} months: min ${Math.min(...policyRun.engineerIndexByMonth).toFixed(3)}, max ${idxMax.toFixed(3)} (floor is ${WAGE_INDEX_MIN}) with ${policyRun.players.length} corps employing ${policyRun.players.reduce((a, p) => a + (p.headcount?.engineer || 0), 0)} engineers server-wide.`);

  // §1d Structurally-dead tools at this era.
  const geoPool = ORBITAL_SLOT_MAP.get('geo')!;
  const geoOcc = baseline.players.reduce((a, p) => a + p.buildings.filter(b => b.locationId === 'geo').length, 0);
  console.log(`\n## §1d Structural non-events at era ${era}\n`);
  console.log(`- slot auctions: world GEO occupancy at mo ${MONTHS - 1} = ${geoOcc}/${geoPool.totalSlots} slots (auction trigger ${SATURATED_OCCUPANCY_PCT}% = ${Math.ceil(geoPool.totalSlots * SATURATED_OCCUPANCY_PCT / 100)}). Min bid ${fm(computeMinBid('geo'))} — the tool cannot fire; population-gated, not price-gated.`);
  console.log(`- freight toll: cap ${fm(FREIGHT_TOLL_CAP_PER_DISPATCH)}/dispatch at ${(FREIGHT_TOLL_MAX * 100).toFixed(1)}% — ${(FREIGHT_TOLL_CAP_PER_DISPATCH / Math.max(1, med23) * 100).toFixed(1)}% of median monthly net; no governors exist at this population.`);
  console.log(`- cornering report ${fm(STANDING_DEMAND_REPORT_FEE)} = ${(STANDING_DEMAND_REPORT_FEE / Math.max(1, med23) * 100).toFixed(0)}% of median monthly net; espionage market_spy at this era's aggressor NW: ${fm(getActionCost('market_spy' as never, bookNetWorth(playerRow(baseline, 'aggressor'))))}.`);

  // §2 Forced-fire ROI (campaign at FORCE_MONTH, both cuts).
  console.log(`\n## §2 Campaign ROI — forced fire at month ${FORCE_MONTH}, twin-scenario diff (defender rides it out)\n`);
  const atkC = runScenario({ era, campaign: FORCE_MONTH, poach: null, defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: true });
  const led = atkC.campaignLedger[0];
  if (led) {
    console.log(mdTable(['ledger line', 'value'], [
      ['fee burned', fm(led.feePaid)],
      ['ammo shortfall bought', fm(led.ammoCost)],
      ['pin floor', `${fm(led.pinFloor)} (base ${fm(RESOURCE_MAP.get(CAMPAIGN_RES as ResourceId)!.baseMarketPrice)})`],
      ['analytic dump margin sacrifice (S7 burst math, upper bound)', fm(led.dumpMarginSacrifice)],
    ]));
  }
  const winEnd = Math.min(MONTHS - 1, FORCE_MONTH + CAMPAIGN_WINDOW_MONTHS - 1);
  console.log(`\nDeltas over the campaign window (mo ${FORCE_MONTH}-${winEnd}), attack world vs baseline:\n`);
  console.log(mdTable(DIFF_HEADERS(`mo ${FORCE_MONTH}-${winEnd}`), diffTable(baseline, atkC, FORCE_MONTH, winEnd)));
  console.log(`\nFull-run deltas (mo 0-${MONTHS - 1}) incl. post-campaign reversion:\n`);
  console.log(mdTable(DIFF_HEADERS(`mo 0-${MONTHS - 1}`), diffTable(baseline, atkC, 0, MONTHS - 1)));
  console.log(`\nOpportunist crash-trade P&L (buy the pin, sell the reversion, NPC-cap bounded): realized ${fm(atkC.opportunistTradePnL)} + inventory mark-to-market ${fm(atkC.opportunistMarkToMarket)}.`);

  // §3 Counterplay matrix.
  console.log(`\n## §3 Defender counterplay matrix (campaign forced at month ${FORCE_MONTH}; defender outcome per response)\n`);
  const rows: (string | number)[][] = [];
  for (const policy of ['rideout', 'mothball', 'spread'] as const) {
    const r = runScenario({ era, campaign: FORCE_MONTH, poach: null, defenderPolicy: policy, defenderPoachResponse: 'auto', opportunistTrades: false });
    rows.push([
      policy,
      fm(cumNet(playerRow(r, 'defender'), FORCE_MONTH, winEnd) + oobNet(r, 'defender', FORCE_MONTH, winEnd)),
      fm(cumNet(playerRow(r, 'defender'), 0, MONTHS - 1) + oobNet(r, 'defender', 0, MONTHS - 1)),
      fm(playerRow(r, 'defender').history[MONTHS - 1]?.netWorthEst ?? 0),
      policy === 'mothball' ? fm(r.mothballCosts) : policy === 'spread' ? fm(r.spreadCapex) : '—',
    ]);
  }
  rows.push(['(no attack)', fm(cumNet(playerRow(baseline, 'defender'), FORCE_MONTH, winEnd)), fm(cumNet(playerRow(baseline, 'defender'), 0, MONTHS - 1)), fm(playerRow(baseline, 'defender').history[MONTHS - 1]?.netWorthEst ?? 0), '—']);
  console.log(mdTable(['defender policy', `cum net+oob mo ${FORCE_MONTH}-${winEnd}`, `cum net+oob mo 0-${MONTHS - 1}`, `book NW @ mo ${MONTHS - 1}`, 'policy cost'], rows));

  // §4 Poach ROI (forced at FORCE_MONTH): both defender branches.
  console.log(`\n## §4 Poach ROI — forced at month ${FORCE_MONTH} (attacker → defender engineers; direct ledger is primary, world knock-on noted)\n`);
  for (const resp of ['retain', 'rehire'] as const) {
    const r = runScenario({ era, campaign: null, poach: FORCE_MONTH, defenderPolicy: 'rideout', defenderPoachResponse: resp, opportunistTrades: false });
    const pl = r.poachLedger[0];
    if (!pl) { console.log(`- ${resp}: poach did not execute (gates)`); continue; }
    const dAtk = cumNet(playerRow(r, 'aggressor'), FORCE_MONTH, MONTHS - 1) - cumNet(playerRow(baseline, 'aggressor'), FORCE_MONTH, MONTHS - 1);
    const dDef = cumNet(playerRow(r, 'defender'), FORCE_MONTH, MONTHS - 1) - cumNet(playerRow(baseline, 'defender'), FORCE_MONTH, MONTHS - 1);
    console.log(`- defender **${resp}s**: n=${pl.n} @ idx ${pl.idx.toFixed(2)} — attacker paid ${fm(pl.fee + (pl.outcome === 'poached' ? pl.bonus : 0))} (${pl.outcome === 'poached' ? 'fee+bonus burned' : 'fee burned, bonus refunded'}); defender paid ${fm(pl.retentionPaid + pl.rehirePaid)} (${pl.outcome === 'poached' ? 'wage-indexed rehire + index-bump payroll' : 'retention burn'}); in-world revenue knock-on: attacker ${fm(dAtk)}, defender ${fm(dDef)} over the remaining run.`);
  }

  // §5 Escalation.
  console.log(`\n## §5 Escalation — attack at month ${FORCE_MONTH}, defender retaliates (counter-campaign + counter-poach when gates allow)\n`);
  const esc = runScenario({ era, campaign: FORCE_MONTH, poach: FORCE_MONTH, defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: true, titForTat: true });
  const escFired = esc.firingLog.filter(r => r.fired);
  console.log(`Offense actions fired: ${escFired.map(r => `${r.tool}@mo${r.month}`).join(', ') || 'none'}.\n`);
  console.log(mdTable(DIFF_HEADERS(`mo 0-${MONTHS - 1}`), diffTable(baseline, esc, 0, MONTHS - 1)));

  if (era === 'A') {
    // §6 Override validation (era A only — the relaunch question).
    console.log('\n## §6 OVERRIDE VALIDATION (era A) — H1/H2 candidates as sim-only world switches (no engine changes)\n');

    // §6a H2 threshold sweep: analytic through the real aggregate math,
    // plus in-world index trajectories per divisor at this world's 26 corps.
    console.log('### §6a H2 — corp-count thresholds for the wage index (rational-cap corp = 10 eng, effective 8.5 after training mitigation; no quarters)\n');
    {
      const sweep: (string | number)[][] = [];
      for (const divisor of [1, 2, 3, 4, 5, 8]) {
        const idxAt = (corps: number) => {
          const summaries: LaborActivitySummary[] = Array.from({ length: corps }, (_, i) => ({
            id: `c${i}`, headcount: POP_HEADCOUNT, crewQuarters: 0,
          }));
          const agg = computeLaborAggregates(summaries).get('engineer')!;
          return computeWageIndex(agg.employedEffective, LABOR_SUPPLY_BASE.engineer / divisor);
        };
        let leaveFloor = -1, crossNeutral = -1, hitCap = -1;
        for (let c = 1; c <= 400; c++) {
          const v = idxAt(c);
          if (leaveFloor < 0 && v > WAGE_INDEX_MIN + 1e-9) leaveFloor = c;
          if (crossNeutral < 0 && v >= 1.0) crossNeutral = c;
          if (hitCap < 0 && v >= WAGE_INDEX_MAX - 1e-9) hitCap = c;
        }
        // In-world check at this world's population (26 corps).
        const world = runScenario({ era, campaign: null, poach: null, defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: false, overrides: divisor === 1 ? {} : { laborSupplyDivisor: divisor } });
        const inWorldMax = Math.max(...world.engineerIndexByMonth);
        sweep.push([`÷${divisor}`, LABOR_SUPPLY_BASE.engineer / divisor, leaveFloor, crossNeutral, hitCap < 0 ? '>400' : hitCap, inWorldMax.toFixed(3)]);
      }
      console.log(mdTable(['divisor', 'engineer supply base', 'corps to leave 0.80 floor', 'corps to reach 1.00', 'corps to pin 1.60', `in-world max idx (26 corps)`], sweep));
      console.log('\nCrew-quarters counterplay keeps FULL weight under every divisor (the divisor scales only the base): each quarters slot still adds ' + LABOR_SUPPLY_PER_QUARTERS + ' supply, so housing gets RELATIVELY stronger as the divisor rises.');
    }

    // §6b H1 sweep: three fee families, policy runs, crush ratios.
    console.log('\n### §6b H1 — campaign fee override sweep (policy runs, H2 ÷4 + income-indexed poach fee active in all rows)\n');
    console.log('Fee families: `wealth` = clamp(pct × attacker NW, $25M+, $5B) buying proportional DEPTH (Pass-5 shape); `market` = fraction × the resource\'s 28-game-month window turnover at FULL depth (Pass-8 candidate). Crush ratio = attacker all-in ÷ graduate window damage (best counterplay = ride-out per §3); requirement ≥ 1.5 : 1.\n');
    const h1rows: (string | number)[][] = [];
    const sweepCases: { label: string; ovr: OverrideConfig }[] = [
      { label: 'current constants (reference)', ovr: { poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 } },
      { label: 'wealth 5% NW + depth', ovr: { campaignWealthFee: { feePctNW: 0.05, feeFloorUnits: 500 }, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 } },
      { label: 'market 10%', ovr: { campaignMarketFee: { fraction: 0.10 }, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 } },
      { label: 'market 15%', ovr: { campaignMarketFee: { fraction: 0.15 }, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 } },
      { label: 'market 20%', ovr: { campaignMarketFee: { fraction: 0.20 }, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 } },
      { label: 'market 25%', ovr: { campaignMarketFee: { fraction: 0.25 }, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 } },
      { label: 'market 40%', ovr: { campaignMarketFee: { fraction: 0.40 }, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 } },
      { label: 'market 15% + graduate spot-floor glide', ovr: { campaignMarketFee: { fraction: 0.15 }, gradSpotFloorGlide: true, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 } },
    ];
    for (const { label, ovr } of sweepCases) {
      const oBase = runScenario({ era, campaign: null, poach: 'policy', defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: false, overrides: ovr });
      const oPol = runScenario({ era, campaign: 'policy', poach: 'policy', defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: true, overrides: ovr });
      const cFires = oPol.firingLog.filter(r => r.tool === 'price-campaign' && r.fired);
      const pFires = oPol.firingLog.filter(r => r.tool === 'talent-poach' && r.fired);
      const bestRatio = oPol.firingLog.filter(r => r.tool === 'price-campaign').reduce((a, r) => Math.max(a, r.ratio), 0);
      let crush = '—', gradDamage = 0, atkAllIn = 0, defDamage = 0;
      const l = oPol.campaignLedger[0];
      if (cFires.length > 0 && l) {
        const m0 = cFires[0].month;
        const end = Math.min(MONTHS - 1, m0 + CAMPAIGN_WINDOW_MONTHS - 1);
        const dmg = (name: string) =>
          (cumNet(playerRow(oBase, name), m0, end) + oobNet(oBase, name, m0, end))
          - (cumNet(playerRow(oPol, name), m0, end) + oobNet(oPol, name, m0, end));
        gradDamage = dmg('graduate');
        defDamage = dmg('defender');
        const atkInWorld = -(cumNet(playerRow(oPol, 'aggressor'), m0, end) - cumNet(playerRow(oBase, 'aggressor'), m0, end));
        atkAllIn = l.feePaid + l.ammoCost + Math.max(0, atkInWorld);
        crush = gradDamage > 500_000 ? (atkAllIn / gradDamage).toFixed(1) + ' : 1' : '∞ (graduate damage < $0.5M)';
      }
      h1rows.push([
        label,
        l ? fm(l.feePaid) : '—',
        l ? `${((1 - l.pinFloor / 50_000) * 100).toFixed(0)}%` : '—',
        `${cFires.length}${cFires.length ? ' @ mo ' + cFires.map(f => f.month).join(',') : ''}`,
        bestRatio.toFixed(2),
        pFires.length,
        atkAllIn ? fm(atkAllIn) : '—',
        fm(defDamage), fm(gradDamage), crush,
      ]);
    }
    console.log(mdTable(['fee schedule', 'fee paid', 'depth', 'campaigns fired', 'best model ratio', 'poaches', 'attacker all-in (measured)', 'defender window damage', 'graduate window damage', 'crush ratio (≥1.5 req)'], h1rows));

    // §6c Shields + newcomer posture under the recommended center.
    console.log('\n### §6c Shields under the recommended center (market 15% + grad spot-floor glide + H2 ÷4 + income-indexed poach fee)\n');
    const ovrC: OverrideConfig = { campaignMarketFee: { fraction: 0.15 }, gradSpotFloorGlide: true, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 };
    const shBase = runScenario({ era, campaign: null, poach: null, defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: false, overrides: ovrC });
    const gBase = playerRow(baseline, 'graduate');
    const gOvr = playerRow(shBase, 'graduate');
    console.log(`- graduate net/mo @ mo ${CUT_EARLY}: current world ${fm(gBase.history[CUT_EARLY]?.net ?? 0)} vs override world ${fm(gOvr.history[CUT_EARLY]?.net ?? 0)} — any delta is the H2 payroll term on a 4-engineer corp (the demand-pool glide itself is untouched by every override).`);
    console.log(`- graduate book NW @ mo ${MONTHS - 1}: ${fm(gBase.history[MONTHS - 1]?.netWorthEst ?? 0)} current vs ${fm(gOvr.history[MONTHS - 1]?.netWorthEst ?? 0)} override.`);
    console.log(`- poach reach: graduate holds 4 engineers → maxPoachable ${maxPoachableCount(4)} head/offer; Frontier corps remain unreachable by construction (isServerFrontierProtected gates both directions — all sim corps are post-Frontier, which is the honest relaunch case).`);
    const idxOv = Math.max(...shBase.engineerIndexByMonth);
    console.log(`- H2 in-world at ${shBase.players.length} corps with ÷4: engineer index max ${idxOv.toFixed(3)} vs floor ${WAGE_INDEX_MIN} — signal ${idxOv > WAGE_INDEX_MIN + 1e-9 ? 'ALIVE' : 'dead'}.`);
  }

  if (era === 'B') {
    // §7 The recommended era-A center re-validated at MID-GAME scale — a
    // market-keyed fee gets CHEAPER than the current $250M for a whale, so
    // the mid-game griefing check must hold too.
    console.log('\n## §7 Recommended center at era B (market 15% + grad spot-floor glide + ÷4 + income-indexed poach fee)\n');
    const ovrB: OverrideConfig = { campaignMarketFee: { fraction: 0.15 }, gradSpotFloorGlide: true, poachFeeIncomeIndexed: true, laborSupplyDivisor: 4 };
    const bBase = runScenario({ era, campaign: null, poach: 'policy', defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: false, overrides: ovrB });
    const bPol = runScenario({ era, campaign: 'policy', poach: 'policy', defenderPolicy: 'rideout', defenderPoachResponse: 'auto', opportunistTrades: true, overrides: ovrB });
    const cFires = bPol.firingLog.filter(r => r.tool === 'price-campaign' && r.fired);
    const pFires = bPol.firingLog.filter(r => r.tool === 'talent-poach' && r.fired);
    const bestRatio = bPol.firingLog.filter(r => r.tool === 'price-campaign').reduce((a, r) => Math.max(a, r.ratio), 0);
    const l = bPol.campaignLedger[0];
    if (cFires.length > 0 && l) {
      const m0 = cFires[0].month;
      const end = Math.min(MONTHS - 1, m0 + CAMPAIGN_WINDOW_MONTHS - 1);
      const dmg = (name: string) =>
        (cumNet(playerRow(bBase, name), m0, end) + oobNet(bBase, name, m0, end))
        - (cumNet(playerRow(bPol, name), m0, end) + oobNet(bPol, name, m0, end));
      const atkInWorld = -(cumNet(playerRow(bPol, 'aggressor'), m0, end) - cumNet(playerRow(bBase, 'aggressor'), m0, end));
      const allIn = l.feePaid + l.ammoCost + Math.max(0, atkInWorld);
      const gradDmg = dmg('graduate');
      console.log(`- campaigns fired ${cFires.length}× (mo ${cFires.map(f => f.month).join(',')}), fee ${fm(l.feePaid)}, best model ratio ${bestRatio.toFixed(2)}; poaches fired ${pFires.length}×.`);
      console.log(`- attacker all-in (measured) ${fm(allIn)}; defender window damage ${fm(dmg('defender'))}; graduate window damage ${fm(gradDmg)}; crush ratio ${gradDmg > 500_000 ? (allIn / gradDmg).toFixed(1) + ' : 1' : '∞ (graduate damage < $0.5M)'} (≥1.5 required).`);
    } else {
      console.log(`- campaigns fired 0× (best model ratio ${bestRatio.toFixed(2)}); poaches fired ${pFires.length}×. The schedule stays quiet at mid-game in THIS market — report the ratio so the band can be judged.`);
    }
  }
}

console.log('\ndone.');
