// ─── Space Tycoon: Balance Pass 5 — the 50-year playtest ────────────────────
// docs/BALANCE.md "Pass 5 — 50-year playtest (pre-relaunch economy gate)".
// Founder directive: "Play test through the first 50 years of our game using
// NPC characters and try to identify potential issues with the competitive
// economy that need to be corrected before we do the server relaunch."
//
// Runs 600 game-months (50 game-years = 150 REAL days at 6h/game-month) with
// 8 scripted archetype players in ONE shared world with every realism switch
// on: npcSaleCaps + contendedNpcCaps (FIFO NPC absorption), laborMarket
// (real shared wage index), dynamicSpot (real price-impact + mean-reversion
// math), constructionMaterials, contractOutlet. All engine math is the REAL
// module code via scripts/sim-harness.ts.
//
// Deterministic: no Date.now / Math.random anywhere in the sim path.
//   npx tsx scripts/sim-50yr.ts
//
// ─── What is modeled vs. not (the honest coverage statement) ────────────────
// MODELED (real engine modules): service revenue stack (saturation × shared
//   demand pools × power × supply efficiency), price-linked mining + shared
//   extraction pressure, E3 consumption + storage integrity (boiloff/overflow
//   decay), crafting queue, NPC absorption caps (contended FIFO), delivery-
//   contract outlet, corporate overhead, bracketed exec comp on book NW,
//   shared labor market payroll at the real wage index, dynamic spot from
//   combined flows, price campaigns (fee burn + mean-revert skip + real
//   sell-impact), construction material settlement, decommission recovery
//   (real mothball.ts constants), serial research (real baseCostMoney /
//   realResearchSeconds / resourceCost, prereq-resolved beelines,
//   stall-until-affordable), research revenue multiplier (formulas.ts
//   revenueMultiplier, engine 2.0 cap) via the harness's opt-in revenueMult.
// APPROXIMATED (documented):
//   - Corp tier from totalEarned thresholds only (T6/7 also need legacy
//     power — not modeled; reported tier caps at 5).
//   - Contract outlet capPerDay fixed at 5 for everyone (real: 4 base, +1
//     research, +1 tier 5).
//   - Headcounts follow a deterministic per-fleet formula, so talent
//     POACHING is audited analytically (cost tables), not simulated
//     in-world (a raid's damage would be instantly "rehired" by formula).
//   - Doctrine locks / repeatable research ignored (≤7 techs of error).
//   - Commanders/legacy/tier bonuses folded into the capped ×2.0 research
//     revenue multiplier — real stacks can exceed this; levels shift, the
//     structural shapes (the audit target) do not.
// NOT MODELED AT ALL (out of harness scope — say so, don't fake it):
//   megastructures, interstellar expeditions/colonies, story chapters,
//   senate/factions, ships/logistics lanes/freighters, hazards & insurance,
//   espionage missions, hostile takeovers (dormant), seasonal/alliance
//   events, mentorship, Frontier shields (late joiners face the OPEN market
//   from day 1 — conservative worst case), player-to-player order-book
//   trades (all liquidity is the NPC maker + contracts).

import {
  newPlayer, newWorld, stepMonth, fm, mdTable, bookNetWorth, marginalCurve,
  extractionPressureReport, GAME_MONTH_MS, INPUT_BUY_MULT, LOCATION_POWER_PLAN,
  GRADUATION_GLIDE_GAME_MONTHS,
  type SimPlayer, type SimWorld,
} from './sim-harness';
import { RESEARCH, RESEARCH_MAP } from '../src/lib/game/research-tree';
import { revenueMultiplier } from '../src/lib/game/formulas';
import { CORPORATION_TIERS } from '../src/lib/game/corporation-tiers';
import { BUILDING_MAP } from '../src/lib/game/buildings';
import { RESOURCE_MAP, RESOURCES } from '../src/lib/game/resources';
import type { ResourceId } from '../src/lib/game/resources';
import { computeDecommissionRecovery } from '../src/lib/game/mothball';
import {
  computeCampaignFee, PRICE_CAMPAIGN_MIN_INVENTORY, PRICE_CAMPAIGN_MIN_NET_WORTH,
  PRICE_CAMPAIGN_MAX_FEE,
} from '../src/lib/game/price-campaigns';
import { POACH_ACTION_FEE, POACH_MIN_NET_WORTH, computeSigningBonus, maxPoachableCount } from '../src/lib/game/talent-poaching';
import { computeMinBid } from '../src/lib/game/orbital-slot-auctions';
import { FREIGHT_TOLL_CAP_PER_DISPATCH } from '../src/lib/game/offense';
import { STANDING_DEMAND_REPORT_FEE } from '../src/lib/game/cornering-intel';
import { FRONTIER_GRADUATION_NET_WORTH } from '../src/lib/game/frontier';
import { computeLaborAggregates, sumCrewQuarters, LABOR_SUPPLY_BASE, type LaborActivitySummary } from '../src/lib/game/labor-market';
import { DEFAULT_WORKFORCE, getWorkforceBonuses } from '../src/lib/game/workforce';
// AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md "Round 2"): 9b's crisis
// decision-supply probe imports the SHIPPED pure module - the calendar, the
// severity thresholds and the posture cost table are the real ones, never a
// re-implementation, so this probe cannot drift from what players face.
import {
  getCrisisWindow, crisisTierForIndex,
  CRISIS_CYCLE_WEEKS, CRISIS_STAGES, CRISIS_APPROACH_MAP, CRISIS_MAP,
} from '../src/lib/game/systemic-crises';

const MONTHS = 600;                 // 50 game-years
const DECADE = 120;                 // game-months per decade
const FOUNDER_MONEY = 2_000_000_000; // harness convention (mid-game snapshot)
const JOINER_MONEY = 200_000_000;    // S9 fresh-graduate scale
const JOIN_A = 120;                  // late joiner #1 (year 10, 2160 in lore-decades)
const JOIN_B = 360;                  // late joiner #2 (year 30)
const CONTRACT_CAP_PER_DAY = 5;      // mid-tier (4 base + space_logistics)

// ─── Research model: real tree, serial slot, money-gated ────────────────────
// Real charged cost is baseCostMoney (+ resourceCost drawn from stock,
// shortfall bought at base × INPUT_BUY_MULT); real duration is
// realResearchSeconds against the game-month's 21,600 real seconds. The
// queue is a prereq-resolved BEELINE for the archetype's build order first
// (what a real player does), then the remaining tree tier-ordered. If the
// player cannot afford the next tech, research STALLS (money gates the tree,
// not time — see the totals table the runner prints).

interface ResearchMeta {
  queue: string[];
  idx: number;
  secondsIn: number;
  paid: boolean;
  completed: number;
  moneySpent: number;
  done: Set<string>;
  /** stop after this many techs (turtle: T1+T2 only) */
  maxCount?: number;
}

function expandWithPrereqs(ids: string[], out: string[] = [], seen = new Set<string>()): string[] {
  for (const id of ids) {
    if (seen.has(id)) continue;
    const def = RESEARCH_MAP.get(id);
    if (!def) continue;
    seen.add(id);
    expandWithPrereqs(def.prerequisites || [], out, seen);
    out.push(id);
  }
  return out;
}

/** The 10 cheapest T1 techs — what any real player grabs first (they max the
 *  formulas.ts revenue multiplier at minimum cost). Prepended to every
 *  archetype's queue before its build-order beeline. */
const CHEAP_T1_FIRST = RESEARCH
  .filter(r => r.tier === 1)
  .sort((a, b) => a.baseCostMoney - b.baseCostMoney || a.id.localeCompare(b.id))
  .slice(0, 10)
  .map(r => r.id);

function makeResearchMeta(buildOrder: { definitionId: string }[], maxCount?: number): ResearchMeta {
  const beelineIds: string[] = [...CHEAP_T1_FIRST];
  for (const step of buildOrder) {
    for (const res of BUILDING_MAP.get(step.definitionId)?.requiredResearch || []) beelineIds.push(res);
  }
  const seen = new Set<string>();
  const queue = expandWithPrereqs(beelineIds, [], seen);
  const rest = RESEARCH
    .filter(r => !seen.has(r.id))
    .sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id))
    .map(r => r.id);
  return { queue: [...queue, ...rest], idx: 0, secondsIn: 0, paid: false, completed: 0, moneySpent: 0, done: new Set(), maxCount };
}

/** Advance one game-month of serial research. Returns techs completed this month. */
function advanceResearch(p: SimPlayer, rs: ResearchMeta): number {
  let secs = GAME_MONTH_MS / 1000;
  let completedThisMonth = 0;
  while (secs > 0 && rs.idx < rs.queue.length && (rs.maxCount === undefined || rs.completed < rs.maxCount)) {
    const def = RESEARCH_MAP.get(rs.queue[rs.idx]);
    if (!def) { rs.idx++; continue; }
    if (!rs.paid) {
      let resMoney = 0;
      const draws: [string, number][] = [];
      for (const [res, qty] of Object.entries(def.resourceCost || {})) {
        const fromStock = Math.min(p.resources[res] || 0, qty);
        draws.push([res, fromStock]);
        const short = qty - fromStock;
        if (short > 0) resMoney += short * (RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0) * INPUT_BUY_MULT;
      }
      const cost = def.baseCostMoney + resMoney;
      // Cash-reserve rule: never spend more than half your cash on one tech
      // (the first modeling attempt let archetypes research themselves into
      // a death spiral — no real player does that). For mega-techs (>$2B)
      // the reserve is a flat $2B — a whale saving for fusion_drive ($100B)
      // buys it at $102B cash, not $200B.
      if (p.money < Math.min(cost * 2, cost + 2_000_000_000)) break;
      for (const [res, q] of draws) if (q > 0) p.resources[res] = (p.resources[res] || 0) - q;
      p.money -= cost;
      p.totalSpent += cost;
      rs.moneySpent += cost;
      rs.paid = true;
    }
    const needed = def.realResearchSeconds - rs.secondsIn;
    if (needed > secs) { rs.secondsIn += secs; secs = 0; }
    else {
      secs -= needed;
      rs.secondsIn = 0;
      rs.paid = false;
      rs.done.add(def.id);
      rs.idx++;
      rs.completed++;
      completedThisMonth++;
    }
  }
  return completedThisMonth;
}

// ─── Corp tier (totalEarned thresholds only; T6/7 legacy-gated → cap at 5) ──
function corpTierOf(totalEarned: number): number {
  let t = 1;
  for (const tierDef of CORPORATION_TIERS) {
    const req = tierDef.requirements.totalEarned;
    if (req !== undefined && totalEarned >= req) t = tierDef.tier;
  }
  return Math.min(t, 5);
}

// ─── Build plans (research-gated via the REAL building requiredResearch) ────

type Step = { definitionId: string; locationId: string };

function orderedPlanGated(order: Step[], rs: () => ResearchMeta): SimPlayer['plan'] {
  return (p) => {
    const done = rs().done;
    const have = new Map<string, number>();
    for (const b of p.buildings) have.set(b.definitionId, (have.get(b.definitionId) || 0) + 1);
    const want: Step[] = [];
    const counted = new Map<string, number>();
    for (const step of order) {
      const def = BUILDING_MAP.get(step.definitionId);
      if (!def) continue;
      const c = (counted.get(step.definitionId) || 0) + 1;
      counted.set(step.definitionId, c);
      if ((have.get(step.definitionId) || 0) >= c) continue;
      const gated = (def.requiredResearch || []).some(id => !done.has(id));
      if (gated) continue; // skip — a real player can't start this yet
      want.push(step);
    }
    return want;
  };
}

// Diversified integrator, extended to the full 50-year ladder (the Pass-2
// 24-building reference order, then Jovian/Saturnian/outer phases as the
// requiredResearch gates open and money allows).
const INTEGRATOR_ORDER: Step[] = [
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
  // decade 2+: second copies of the profitable singles + Mars depth
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'datacenter_orbital', locationId: 'leo' },
  { definitionId: 'solar_farm_orbital', locationId: 'leo' },
  { definitionId: 'habitat_mars', locationId: 'mars_surface' },
  { definitionId: 'fabrication_mars', locationId: 'mars_surface' },
  { definitionId: 'sat_mars_relay', locationId: 'mars_orbit' },
  { definitionId: 'agri_dome', locationId: 'mars_surface' },
  // Jovian phase (T4 research gates)
  { definitionId: 'nuclear_reactor_jupiter', locationId: 'jupiter_system' },
  { definitionId: 'datacenter_jupiter', locationId: 'jupiter_system' },
  { definitionId: 'mining_europa', locationId: 'jupiter_system' },
  // Saturnian phase
  { definitionId: 'nuclear_reactor_saturn', locationId: 'saturn_system' },
  { definitionId: 'mining_titan', locationId: 'saturn_system' },
  { definitionId: 'fabrication_titan', locationId: 'saturn_system' },
  // Outer-system flagships (T5 research gates — fusion_drive et al.)
  { definitionId: 'deep_space_relay', locationId: 'outer_system' },
  { definitionId: 'mining_kuiper', locationId: 'outer_system' },
  { definitionId: 'outpost_outer', locationId: 'outer_system' },
];

// Aggressive mono-expander: LEO telecom forever, GEO from year 2. Reactive
// decommission rule (real recovery constants) when bleeding ≥6 months.
const monoPlan: SimPlayer['plan'] = (p, month) => {
  const want: Step[] = [
    { definitionId: 'sat_telecom', locationId: 'leo' },
    { definitionId: 'sat_telecom', locationId: 'leo' },
    { definitionId: 'sat_telecom', locationId: 'leo' },
  ];
  if (month >= 24) want.push({ definitionId: 'sat_telecom_geo', locationId: 'geo' });
  return want;
};

// Vertical industrialist: an ungated income bootstrap first (a real vertical
// player funds the belt program with satellite/service cash — without this
// the archetype death-spirals waiting to afford asteroid_capture research),
// then belt rigs + refinery + fabs + continuous crafting, extending to
// Titan/Europa/Kuiper as gates open.
const INDUSTRIALIST_ORDER: Step[] = [
  { definitionId: 'ground_station', locationId: 'earth_surface' },
  { definitionId: 'mission_control', locationId: 'earth_surface' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom_geo', locationId: 'geo' },
  { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
  { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'orbital_refinery', locationId: 'asteroid_belt' },
  { definitionId: 'fabrication_orbital', locationId: 'leo' },
  { definitionId: 'solar_farm_orbital', locationId: 'leo' },
  { definitionId: 'fabrication_lunar', locationId: 'lunar_surface' },
  { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'fabrication_asteroid', locationId: 'asteroid_belt' },
  { definitionId: 'nuclear_reactor_jupiter', locationId: 'jupiter_system' },
  { definitionId: 'mining_europa', locationId: 'jupiter_system' },
  { definitionId: 'nuclear_reactor_saturn', locationId: 'saturn_system' },
  { definitionId: 'mining_titan', locationId: 'saturn_system' },
  { definitionId: 'fabrication_titan', locationId: 'saturn_system' },
  { definitionId: 'mining_kuiper', locationId: 'outer_system' },
];
const INDUSTRIALIST_CRAFT = [
  'forge_structural_beams',
  'make_electronics',
  'refine_rare_earth',
  'smelt_steel',
];

// Market-warfare aggressor: mid-size diversified base (incl. its own lunar
// water production — campaign ammunition), then price campaigns on schedule.
const AGGRESSOR_ORDER: Step[] = [
  { definitionId: 'ground_station', locationId: 'earth_surface' },
  { definitionId: 'mission_control', locationId: 'earth_surface' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom_geo', locationId: 'geo' },
  { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
  { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  { definitionId: 'mining_lunar_ice', locationId: 'lunar_surface' },
  { definitionId: 'propellant_plant_lunar', locationId: 'lunar_surface' },
  { definitionId: 'solar_farm_orbital', locationId: 'leo' },
  { definitionId: 'datacenter_orbital', locationId: 'leo' },
  { definitionId: 'launch_pad_small', locationId: 'earth_surface' },
  { definitionId: 'launch_pad_medium', locationId: 'earth_surface' },
  { definitionId: 'fabrication_lunar', locationId: 'lunar_surface' },
  { definitionId: 'datacenter_orbital', locationId: 'leo' },
  { definitionId: 'solar_farm_orbital', locationId: 'leo' },
];

// Passive turtle: 8 first-copy buildings across markets, then market plays
// only (sells leftovers, no expansion). Research stops after T1+T2.
const TURTLE_ORDER: Step[] = [
  { definitionId: 'ground_station', locationId: 'earth_surface' },
  { definitionId: 'mission_control', locationId: 'earth_surface' },
  { definitionId: 'launch_pad_small', locationId: 'earth_surface' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'sat_telecom_geo', locationId: 'geo' },
  { definitionId: 'solar_farm_orbital', locationId: 'leo' },
  { definitionId: 'datacenter_orbital', locationId: 'leo' },
  { definitionId: 'sat_sensor', locationId: 'leo' },
];

// Late joiner: value-first order (revenue-dense cheap buildings before
// prestige ground infrastructure — the first sim iteration showed a rigid
// integrator order strands a $200M start on a $50M launch pad while the
// $15M satellite goes unbuilt), then the standard integrator ladder.
const JOINER_ORDER: Step[] = [
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'ground_station', locationId: 'earth_surface' },
  { definitionId: 'sat_telecom', locationId: 'leo' },
  { definitionId: 'mission_control', locationId: 'earth_surface' },
  { definitionId: 'sat_telecom_geo', locationId: 'geo' },
  { definitionId: 'solar_farm_orbital', locationId: 'leo' },
  { definitionId: 'datacenter_orbital', locationId: 'leo' },
  { definitionId: 'launch_pad_small', locationId: 'earth_surface' },
  ...INTEGRATOR_ORDER.filter(s => !['ground_station', 'mission_control', 'launch_pad_small'].includes(s.definitionId)),
];

// Hoarder: the Pass-1/2 max-extraction core + belt-rig firehose; sells NOTHING.
const HOARDER_CORE: Step[] = [
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

// ─── Archetype registry ─────────────────────────────────────────────────────

interface Archetype {
  name: string;
  joinMonth: number;
  money: number;
  maxBuilds: number;
  sellsLeftovers: boolean;
  craftPlan?: string[];
  researchMax?: number; // turtle: T1(39) + T2(78) = 117
  makePlan: (rs: () => ResearchMeta) => SimPlayer['plan'];
  decommissionRule?: boolean;
}

const T1_T2_COUNT = RESEARCH.filter(r => r.tier <= 2).length;

const ARCHETYPES: Archetype[] = [
  { name: 'mono-expander', joinMonth: 0, money: FOUNDER_MONEY, maxBuilds: 4, sellsLeftovers: true, makePlan: () => monoPlan, decommissionRule: true },
  { name: 'integrator', joinMonth: 0, money: FOUNDER_MONEY, maxBuilds: 2, sellsLeftovers: true, makePlan: rs => orderedPlanGated(INTEGRATOR_ORDER, rs) },
  { name: 'industrialist', joinMonth: 0, money: FOUNDER_MONEY, maxBuilds: 2, sellsLeftovers: true, craftPlan: INDUSTRIALIST_CRAFT, makePlan: rs => orderedPlanGated(INDUSTRIALIST_ORDER, rs) },
  { name: 'aggressor', joinMonth: 0, money: FOUNDER_MONEY, maxBuilds: 2, sellsLeftovers: true, makePlan: rs => orderedPlanGated(AGGRESSOR_ORDER, rs) },
  { name: 'turtle', joinMonth: 0, money: FOUNDER_MONEY, maxBuilds: 2, sellsLeftovers: true, researchMax: T1_T2_COUNT, makePlan: rs => orderedPlanGated(TURTLE_ORDER, rs) },
  { name: 'hoarder', joinMonth: 0, money: FOUNDER_MONEY, maxBuilds: 2, sellsLeftovers: false, makePlan: rs => {
    const core = orderedPlanGated(HOARDER_CORE, rs);
    return (p, month) => {
      const want = core(p, month);
      if (want.length > 0) return want;
      const rigs = p.buildings.filter(b => b.definitionId === 'mining_asteroid').length;
      const reactors = p.buildings.filter(b => b.definitionId === 'nuclear_reactor_asteroid').length;
      if (!rs().done.has('asteroid_capture') || !rs().done.has('fission_surface_power')) return [];
      if (rigs > reactors * 2) return [{ definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' }];
      return [{ definitionId: 'mining_asteroid', locationId: 'asteroid_belt' }];
    };
  } },
  { name: 'joiner-y10', joinMonth: JOIN_A, money: JOINER_MONEY, maxBuilds: 2, sellsLeftovers: true, makePlan: rs => orderedPlanGated(JOINER_ORDER, rs) },
  { name: 'joiner-y30', joinMonth: JOIN_B, money: JOINER_MONEY, maxBuilds: 2, sellsLeftovers: true, makePlan: rs => orderedPlanGated(JOINER_ORDER, rs) },
];

// ─── Deterministic headcount rule (rational, cap-aware) ─────────────────────
// getWorkforceBonuses caps serviceRevenue at +50% (= 10 engineers at the
// default 0.5 trainingLevel), miningOutput at +100% (= 5 miners),
// researchSpeed at +50% (~4 scientists). A rational corporation therefore
// hires ~10-19 heads TOTAL no matter how big its fleet is — itself a Pass-5
// finding (see report §5: per-corp labor demand is bounded by the bonus
// caps, so the wage index can only move with POPULATION, never fleet size).
// The workforce serviceRevenue bonus is folded into revenueMult each month
// (payroll without its benefit side would be a phantom tax).
function setHeadcount(p: SimPlayer, researching: boolean): void {
  const b = p.buildings.length;
  if (b < 3) { p.headcount = {}; return; }
  const mining = p.buildings.filter(x => BUILDING_MAP.get(x.definitionId)?.category === 'mining_enterprise').length;
  p.headcount = {
    engineer: Math.min(10, b),               // ramp with fleet up to the cap
    miner: Math.min(5, 2 * mining),
    scientist: researching ? Math.min(4, Math.max(0, b - 2)) : 0,
  };
}

function applyPrivateMultipliers(p: SimPlayer, rs: ResearchMeta): void {
  const hc = p.headcount || {};
  const wf = {
    ...DEFAULT_WORKFORCE,
    engineers: hc.engineer || 0,
    miners: hc.miner || 0,
    scientists: hc.scientist || 0,
    operators: hc.operator || 0,
  };
  const wfServiceBonus = getWorkforceBonuses(wf).serviceRevenue; // real cap 0.5
  // Research multiplier (engine cap 2.0) × workforce service bonus (cap 1.5).
  // Mining OUTPUT bonus (physical units) deliberately NOT applied —
  // conservative; it would inflate flows and price impact.
  p.revenueMult = revenueMultiplier(rs.completed) * (1 + wfServiceBonus);
}

// ─── Campaign schedule (aggressor, lunar_water) ─────────────────────────────
// Real cadence: 7-real-day campaign = 28 game-months active; 14-day cooldown
// = 56 game-months → one declaration every 84 game-months once eligible.
const CAMPAIGN_RESOURCE = 'lunar_water';
const CAMPAIGN_DECLARE_MONTHS = [96, 180, 264, 348, 432, 516];
const CAMPAIGN_ACTIVE_GAME_MONTHS = 28;

// ─── World setup ────────────────────────────────────────────────────────────

interface Meta {
  arch: Archetype;
  player: SimPlayer;
  rs: ResearchMeta;
  joined: boolean;
  negStreak: number;
  decommissioned: number;
  decomRecovered: number;
  decisionMonths: Set<number>; // months with a real decision (build/research/decommission/campaign)
  firstProfitMonth: number | null; // months SINCE JOIN of first net>0
  tier3Month: number | null;       // months since join reaching totalEarned >= $5B
  // AAA Round 2 (docs/AAA_PROGRAM_2026-08.md): inert per-decade snapshots
  // read ONLY by §9b. Recording them prints nothing and changes no existing
  // table — every legacy section of this runner stays byte-identical.
  buildingsAtDecadeEnd: number[];
  capitalAtDecadeEnd: number[];
  netByDecade: number[];
}

interface DecadeLedger {
  created: number;    // NPC-paid revenue + resource/contract sales + decommission recovery
  destroyed: number;  // opex+maint+overhead+exec+payroll+inputs+capex+research+fees
  researchSpend: number;
  campaignFees: number;
  decomRecovered: number;
}

function rowOf(m: Meta, worldMonth: number) {
  const idx = worldMonth - m.arch.joinMonth;
  return idx >= 0 && idx < m.player.history.length ? m.player.history[idx] : null;
}

function avgNet(m: Meta, worldMonth: number, span = 12): number {
  const rows: number[] = [];
  for (let k = Math.max(0, worldMonth - span + 1); k <= worldMonth; k++) {
    const r = rowOf(m, k);
    if (r) rows.push(r.net);
  }
  return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : 0;
}

/** Gini over book NW with negatives clamped to 0 (insolvent = zero wealth);
 *  every present player counts, so "one solvent player among eight" reads
 *  as extreme concentration rather than 0. */
function gini(values: number[]): number {
  const v = values.map(x => Math.max(0, x)).sort((a, b) => a - b);
  if (v.length === 0) return 0;
  const n = v.length;
  const sum = v.reduce((a, b) => a + b, 0);
  if (sum <= 0) return 0;
  let acc = 0;
  v.forEach((x, i) => { acc += (2 * (i + 1) - n - 1) * x; });
  return acc / (n * sum);
}

/** Guarded percent-of-median: '—' when the denominator is non-positive. */
function pctOf(value: number, denom: number): string {
  return denom > 0 ? `${((value / denom) * 100).toFixed(1)}%` : '—';
}

// ─── Scenario runner (Balance Pass 6: reusable for the glide-length sweep) ──
// Constructs the full 8-archetype shared world and runs it `months`
// game-months. `joinerGlideMonths` models the C1 post-graduation demand-pool
// glide for the two late joiners (they enter at $200M — i.e. at the moment
// of Frontier graduation, so their glide starts at their join month):
// null = pre-Pass-6 world (the Pass-5 baseline), a number = the glide window
// in game-months (real engine blend via the harness's graduationGlide opt).
// Founders get NO glide — they graduated at world start with the world
// empty; a glide there would be a no-op anyway (pools start neutral) but we
// keep the modeling honest.

interface ScenarioResult {
  metas: Meta[];
  world: SimWorld;
  ledgers: DecadeLedger[];
  spotSnapshots: { month: number; prices: Record<string, number> }[];
  laborSnapshots: { month: number; indices: Record<string, number> }[];
  pressureSnapshots: { month: number; rows: { key: string; pressure: number }[] }[];
  campaignLog: string[];
  totalResearchSpend: number;
}

function runScenario(months: number, joinerGlideMonths: number | null): ScenarioResult {
  const metas: Meta[] = ARCHETYPES.map(arch => {
    const rs = makeResearchMeta(
      arch.name === 'mono-expander'
        ? [{ definitionId: 'sat_telecom' }, { definitionId: 'sat_telecom_geo' }]
        : arch.name === 'hoarder' ? HOARDER_CORE
        : arch.name === 'integrator' ? INTEGRATOR_ORDER
        : arch.name.startsWith('joiner') ? JOINER_ORDER
        : arch.name === 'industrialist' ? INDUSTRIALIST_ORDER
        : arch.name === 'aggressor' ? AGGRESSOR_ORDER
        : TURTLE_ORDER,
      arch.researchMax,
    );
    const player = newPlayer(arch.name, arch.money, arch.makePlan(() => rs), {
      maxBuildsPerMonth: arch.maxBuilds,
      sellsLeftovers: arch.sellsLeftovers,
      craftPlan: arch.craftPlan,
      graduationGlide: joinerGlideMonths !== null && arch.joinMonth > 0
        ? { startMonth: arch.joinMonth, glideMonths: joinerGlideMonths }
        : undefined,
    });
    return {
      arch, player, rs, joined: arch.joinMonth === 0,
      negStreak: 0, decommissioned: 0, decomRecovered: 0,
      decisionMonths: new Set<number>(), firstProfitMonth: null, tier3Month: null,
      buildingsAtDecadeEnd: [], capitalAtDecadeEnd: [], netByDecade: [],
    };
  });

  const world: SimWorld = newWorld(
    metas.filter(m => m.joined).map(m => m.player),
    0, null,
    {
      npcSaleCaps: true,
      contendedNpcCaps: true,
      constructionMaterials: true,
      laborMarket: true,
      dynamicSpot: true,
      contractOutlet: { capPerDay: CONTRACT_CAP_PER_DAY },
    },
  );

  const ledgers: DecadeLedger[] = Array.from({ length: Math.ceil(months / DECADE) }, () => ({
    created: 0, destroyed: 0, researchSpend: 0, campaignFees: 0, decomRecovered: 0,
  }));

  const spotSnapshots: { month: number; prices: Record<string, number> }[] = [];
  const laborSnapshots: { month: number; indices: Record<string, number> }[] = [];
  const pressureSnapshots: { month: number; rows: { key: string; pressure: number }[] }[] = [];
  const campaignLog: string[] = [];

  let campaignActiveUntil = -1;
  const aggressorMeta = metas.find(m => m.arch.name === 'aggressor')!;

  for (let month = 0; month < months; month++) {
  // Late joiners enter the world (appended LAST in player order — the
  // order-book FIFO means incumbents are ahead of them on the NPC book,
  // which is the real price-time-priority reality for a newcomer).
  for (const m of metas) {
    if (!m.joined && m.arch.joinMonth === month) {
      m.joined = true;
      world.players.push(m.player);
    }
  }

  // Aggressor price-campaign schedule (real constants; fee burned).
  if (CAMPAIGN_DECLARE_MONTHS.includes(month) && aggressorMeta.joined) {
    const p = aggressorMeta.player;
    const nw = bookNetWorth(p);
    // Ammunition: the 50-unit inventory floor is trivially met by BUYING the
    // shortfall at spot ×1.08 (~$2.7M at lunar_water's base — a rounding
    // error next to the $250M fee; itself a Pass-5 finding on the "real
    // shells" requirement).
    const base = RESOURCE_MAP.get(CAMPAIGN_RESOURCE as ResourceId)!.baseMarketPrice;
    const spotNow = world.spotSnapshot?.prices?.[CAMPAIGN_RESOURCE] ?? base;
    const fee = computeCampaignFee(base);
    const shortfall = Math.max(0, PRICE_CAMPAIGN_MIN_INVENTORY - (p.resources[CAMPAIGN_RESOURCE] || 0));
    const ammoCost = shortfall * spotNow * INPUT_BUY_MULT;
    if (nw >= PRICE_CAMPAIGN_MIN_NET_WORTH && p.money >= fee + ammoCost) {
      if (shortfall > 0) {
        p.money -= ammoCost;
        p.totalSpent += ammoCost;
        p.resources[CAMPAIGN_RESOURCE] = (p.resources[CAMPAIGN_RESOURCE] || 0) + shortfall;
      }
      p.money -= fee;
      p.totalSpent += fee;
      campaignActiveUntil = month + CAMPAIGN_ACTIVE_GAME_MONTHS;
      ledgers[Math.floor(month / DECADE)].campaignFees += fee;
      ledgers[Math.floor(month / DECADE)].destroyed += fee;
      aggressorMeta.decisionMonths.add(month);
      campaignLog.push(`mo ${month}: DECLARED on ${CAMPAIGN_RESOURCE} — fee ${fm(fee)} burned, ammo shortfall bought ${shortfall} u for ${fm(ammoCost)}, spot at declaration ${fm(spotNow)}, aggressor NW ${fm(nw)}`);
    } else {
      campaignLog.push(`mo ${month}: declaration SKIPPED (NW ${fm(nw)} vs floor ${fm(PRICE_CAMPAIGN_MIN_NET_WORTH)}, cash ${fm(p.money)} vs fee+ammo ${fm(fee + ammoCost)})`);
    }
  }
  world.opts.campaignSlugs = month < campaignActiveUntil ? [CAMPAIGN_RESOURCE] : [];

  // Deterministic rational headcounts + private multiplier stack for the month.
  for (const m of metas) {
    if (!m.joined) continue;
    const stillResearching = m.rs.idx < m.rs.queue.length
      && (m.rs.maxCount === undefined || m.rs.completed < m.rs.maxCount);
    setHeadcount(m.player, stillResearching);
    applyPrivateMultipliers(m.player, m.rs);
  }

  stepMonth(world, month);

  if (campaignActiveUntil > 0 && month === campaignActiveUntil - 1) {
    const base = RESOURCE_MAP.get(CAMPAIGN_RESOURCE as ResourceId)!.baseMarketPrice;
    campaignLog.push(`mo ${month}: campaign window ended — ${CAMPAIGN_RESOURCE} spot ${fm(world.spotSnapshot?.prices?.[CAMPAIGN_RESOURCE] ?? base)} vs base ${fm(base)}`);
  }

  // Post-month per-player bookkeeping.
  const decadeIdx = Math.floor(month / DECADE);
  for (const m of metas) {
    if (!m.joined) continue;
    const row = rowOf(m, month)!;
    // Money supply ledger (NPC-paid in vs destroyed out).
    ledgers[decadeIdx].created += row.revenue + row.resourceSales + (row.contractSales || 0);
    ledgers[decadeIdx].destroyed += row.operating + row.maintenance + row.overhead + row.execComp
      + (row.payroll || 0) + row.inputCost + row.capex;
    // Decision cadence: building capex counts.
    if (row.capex > 0) m.decisionMonths.add(month);
    // AAA Round 2 §9b (inert accumulator — printed only by §9b).
    m.netByDecade[decadeIdx] = (m.netByDecade[decadeIdx] || 0) + row.net;
    // First-profit / tier-3 milestones (months since join).
    if (m.firstProfitMonth === null && row.net > 0) m.firstProfitMonth = month - m.arch.joinMonth;
    if (m.tier3Month === null && m.player.totalEarned >= 5_000_000_000) m.tier3Month = month - m.arch.joinMonth;
    // Mono-expander reactive decommission (real recovery constants).
    if (m.arch.decommissionRule) {
      m.negStreak = row.net < 0 ? m.negStreak + 1 : 0;
      if (m.negStreak >= 6 && m.player.buildings.length > 12) {
        for (let k = 0; k < 2; k++) {
          const idx = m.player.buildings.map(b => b.definitionId).lastIndexOf('sat_telecom');
          if (idx < 0) break;
          const def = BUILDING_MAP.get('sat_telecom')!;
          const rec = computeDecommissionRecovery(def);
          m.player.buildings.splice(idx, 1);
          m.player.money += rec.money;
          for (const [res, q] of Object.entries(rec.resources)) {
            m.player.resources[res] = (m.player.resources[res] || 0) + q;
          }
          m.decommissioned++;
          m.decomRecovered += rec.money;
          ledgers[decadeIdx].decomRecovered += rec.money;
          ledgers[decadeIdx].created += rec.money;
        }
        m.decisionMonths.add(month);
      }
    }
    // Serial research (money-gated). Spend delta lands in the decade ledger.
    const spendBefore = m.rs.moneySpent;
    const completed = advanceResearch(m.player, m.rs);
    const spendDelta = m.rs.moneySpent - spendBefore;
    ledgers[decadeIdx].researchSpend += spendDelta;
    ledgers[decadeIdx].destroyed += spendDelta;
    if (completed > 0) m.decisionMonths.add(month);
  }
  // Campaign fees are burned money — count them destroyed too.
  // (Added at declaration time below via the ledger's campaignFees line.)

  // AAA Round 2 §9b: inert per-decade portfolio snapshot. Reads the SAME
  // building list and the SAME catalogue prices the rest of the runner uses,
  // so the exposure figures in §9b are measurements, not estimates.
  if ((month + 1) % DECADE === 0 || month === months - 1) {
    const dIdx = Math.floor(month / DECADE);
    for (const m of metas) {
      let capital = 0;
      for (const b of m.player.buildings) {
        const def = BUILDING_MAP.get(b.definitionId);
        if (def) capital += def.baseCost;
      }
      m.buildingsAtDecadeEnd[dIdx] = m.player.buildings.length;
      m.capitalAtDecadeEnd[dIdx] = capital;
    }
  }

  // Decade-end snapshots.
  if ((month + 1) % DECADE === 0 || month === months - 1) {
    if (world.spotSnapshot) spotSnapshots.push({ month, prices: { ...world.spotSnapshot.prices } });
    const summaries: LaborActivitySummary[] = world.players.map(p => ({
      id: p.name,
      headcount: p.headcount || {},
      trainingLevel: p.trainingLevel,
      crewQuarters: sumCrewQuarters(p.buildings),
    }));
    const agg = computeLaborAggregates(summaries);
    const indices: Record<string, number> = {};
    agg.forEach((a, type) => { indices[type] = a.index; });
    laborSnapshots.push({ month, indices });
    pressureSnapshots.push({ month, rows: extractionPressureReport(world, month + 1).slice(0, 8) });
  }
}

  return {
    metas, world, ledgers, spotSnapshots, laborSnapshots, pressureSnapshots,
    campaignLog,
    totalResearchSpend: metas.reduce((a, m) => a + m.rs.moneySpent, 0),
  };
}

// ─── Main run (Balance Pass 6: joiners carry the SHIPPED glide constant) ────
// GRADUATION_GLIDE_GAME_MONTHS derives from frontier.ts GRADUATION_GLIDE_MS
// (14 real days = 56 game-months) — the headline tables below therefore
// describe the post-Pass-6 world. The §6c sweep further down re-runs shorter
// worlds at the Pass-5 candidates {4, 6, 8, 12 real days} plus day-granular
// boundary probes to show why this length was chosen.
const {
  metas, world, ledgers, spotSnapshots, laborSnapshots, pressureSnapshots,
  campaignLog, totalResearchSpend,
} = runScenario(MONTHS, GRADUATION_GLIDE_GAME_MONTHS);

// ════════════════════════════════════════════════════════════════════════════
// Report
// ════════════════════════════════════════════════════════════════════════════

console.log('# Balance Pass 5 — 50-year shared-world playtest (8 archetypes, all realism switches on)\n');
console.log(`World: ${MONTHS} game-months (${MONTHS / 12} game-years = ${MONTHS / 4} real days), npcSaleCaps+contendedNpcCaps, laborMarket, dynamicSpot, constructionMaterials, contractOutlet cap ${CONTRACT_CAP_PER_DAY}/day. Founders start ${fm(FOUNDER_MONEY)}; late joiners ${fm(JOINER_MONEY)} at months ${JOIN_A} and ${JOIN_B}.\n`);

// ─── 1. Research/tier schedule actually achieved ────────────────────────────
console.log('## 1. Research & corp-tier schedule achieved (money-gated serial research, real tree costs)\n');
{
  const tierCost: Record<number, { n: number; cost: number }> = {};
  for (const r of RESEARCH) {
    tierCost[r.tier] = tierCost[r.tier] || { n: 0, cost: 0 };
    tierCost[r.tier].n++;
    tierCost[r.tier].cost += r.baseCostMoney;
  }
  console.log(mdTable(['research tier', 'techs', 'total money cost', 'serial real-time'],
    Object.entries(tierCost).map(([t, v]) => [
      `T${t}`, v.n, fm(v.cost),
      `${Math.round(RESEARCH.filter(r => r.tier === Number(t)).reduce((a, r) => a + r.realResearchSeconds, 0) / 3600)} h`,
    ])));
  console.log('\nFull-tree money cost: ' + fm(RESEARCH.reduce((a, r) => a + r.baseCostMoney, 0)) + ' — money, not time, gates the tree (see findings).\n');
  console.log(mdTable(
    ['player', 'techs done (of ' + RESEARCH.length + ')', 'research $ spent', 'corp tier (totalEarned)', 'stalled on'],
    metas.map(m => {
      const stalled = m.rs.idx < m.rs.queue.length ? RESEARCH_MAP.get(m.rs.queue[m.rs.idx]) : null;
      return [
        m.arch.name, m.rs.completed, fm(m.rs.moneySpent),
        `T${corpTierOf(m.player.totalEarned)} (${fm(m.player.totalEarned)} earned)`,
        stalled ? `${stalled.id} (T${stalled.tier}, ${fm(stalled.baseCostMoney)})` : 'tree complete',
      ];
    }),
  ));
}

// ─── 2. Per-decade net worth / income curves ────────────────────────────────
console.log('\n## 2. Net worth and income by decade (book NW; net/mo = trailing-12-game-month avg)\n');
for (const m of metas) {
  // Cumulative earned through a world month (prefix over history grossIn —
  // exactly what totalEarned accumulates).
  const cumEarnedAt = (worldMonth: number): number => {
    let acc = 0;
    for (const h of m.player.history) {
      if (h.month > worldMonth) break;
      acc += h.revenue + h.resourceSales + (h.contractSales || 0);
    }
    return acc;
  };
  const rows: (string | number)[][] = [];
  for (let d = 0; d < MONTHS / DECADE; d++) {
    const end = (d + 1) * DECADE - 1;
    const row = rowOf(m, end);
    if (!row) { rows.push([`y${(d + 1) * 10}`, '—', '—', '—', '—', '—', '—']); continue; }
    rows.push([
      `y${(d + 1) * 10}`,
      fm(row.netWorthEst), fm(row.money), fm(avgNet(m, end)),
      row.buildingCount, `T${corpTierOf(cumEarnedAt(end))}`,
      (m.player.revenueMult ?? 1).toFixed(2),
    ]);
  }
  console.log(`### ${m.arch.name}${m.arch.joinMonth > 0 ? ` (joins mo ${m.arch.joinMonth})` : ''}\n`);
  console.log(mdTable(['decade end', 'book NW', 'cash', 'net/mo (12-mo avg)', 'bldgs', 'tier@end', 'rev mult'], rows));
  console.log('');
}

// ─── 3. Inequality by decade ────────────────────────────────────────────────
console.log('## 3. Wealth concentration by decade (present players only)\n');
{
  const rows: (string | number)[][] = [];
  for (let d = 0; d < MONTHS / DECADE; d++) {
    const end = (d + 1) * DECADE - 1;
    const present = metas.filter(m => m.arch.joinMonth <= end);
    const nws = present.map(m => rowOf(m, end)?.netWorthEst ?? 0);
    const sorted = [...nws].sort((a, b) => b - a);
    const clampedTotal = nws.reduce((a, b) => a + Math.max(0, b), 0);
    const solvent = nws.filter(x => x > 0).length;
    rows.push([
      `y${(d + 1) * 10}`, present.length, solvent, gini(nws).toFixed(3),
      fm(sorted[0] || 0), fm(sorted[sorted.length - 1] || 0),
      clampedTotal > 0 ? `${Math.round((Math.max(0, sorted[0] || 0) / clampedTotal) * 100)}%` : '—',
    ]);
  }
  console.log(mdTable(['decade end', 'players', 'solvent (NW>0)', 'Gini (clamped book NW)', 'top NW', 'bottom NW', 'top-1 share of positive NW'], rows));
}

// ─── 4. Money supply by decade ──────────────────────────────────────────────
console.log('\n## 4. Money supply by decade (world totals; created = NPC-paid revenue+sales+decom recovery, destroyed = all sinks incl. capex)\n');
{
  const rows: (string | number)[][] = [];
  let cumNet = 0;
  for (let d = 0; d < MONTHS / DECADE; d++) {
    const l = ledgers[d];
    const net = l.created - l.destroyed;
    cumNet += net;
    rows.push([
      `y${d * 10}-${(d + 1) * 10}`, fm(l.created), fm(l.destroyed), fm(net),
      `${(l.destroyed / Math.max(1, l.created) * 100).toFixed(0)}%`,
      fm(cumNet), fm(l.campaignFees),
    ]);
  }
  console.log(mdTable(['decade', 'created', 'destroyed', 'net minted', 'sink coverage', 'cum. net minted', 'campaign fees burned'], rows));
  console.log(`\nCumulative research spend (in "destroyed", world total): ${fm(totalResearchSpend)}. World cash at y50: ${fm(world.players.reduce((a, p) => a + p.money, 0))}; world book NW: ${fm(world.players.reduce((a, p) => a + bookNetWorth(p), 0))}. Starting cash injected: ${fm(metas.reduce((a, m) => a + m.arch.money, 0))}.`);
}

// ─── 5. Price integrity at scale ────────────────────────────────────────────
console.log('\n## 5. Spot-price integrity by decade (dynamicSpot world — real impact + mean-reversion math)\n');
{
  const rows: (string | number)[][] = [];
  for (const snap of spotSnapshots) {
    const ratios = RESOURCES.map(r => ({ id: r.id, ratio: (snap.prices[r.id] ?? r.baseMarketPrice) / r.baseMarketPrice }));
    const low = ratios.filter(x => x.ratio <= 0.35).length;
    const below = ratios.filter(x => x.ratio < 0.8).length;
    const above = ratios.filter(x => x.ratio > 1.2).length;
    const worst = [...ratios].sort((a, b) => a.ratio - b.ratio).slice(0, 5)
      .map(x => `${x.id} ${(x.ratio * 100).toFixed(0)}%`).join(', ');
    rows.push([`mo ${snap.month}`, low, below, above, worst]);
  }
  console.log(mdTable(['snapshot', '≤35% of base (pinned)', '<80% of base', '>120% of base', 'five most depressed'], rows));
}

console.log('\n### Labor index by decade (real computeLaborAggregates over live headcounts + crew quarters)\n');
console.log(mdTable(
  ['snapshot', 'engineer', 'miner', 'operator', 'scientist'],
  laborSnapshots.map(s => [`mo ${s.month}`,
    (s.indices['engineer'] ?? 1).toFixed(2), (s.indices['miner'] ?? 1).toFixed(2),
    (s.indices['operator'] ?? 1).toFixed(2), (s.indices['scientist'] ?? 1).toFixed(2)]),
));

console.log('\n### Extraction pressure at decade ends (8 most depleted deposits)\n');
for (const snap of pressureSnapshots.filter((_, i) => i === 0 || i === 2 || i === pressureSnapshots.length - 1)) {
  console.log(`mo ${snap.month}: ` + snap.rows.map(r => `${r.key}=${r.pressure}`).join('; '));
}

// ─── 6. Late-joiner viability ───────────────────────────────────────────────
console.log('\n\n## 6. Late-joiner viability (THE relaunch question)\n');
{
  const founderMedianNW = (worldMonth: number): number => {
    const nws = metas.filter(m => m.arch.joinMonth === 0).map(m => rowOf(m, worldMonth)?.netWorthEst ?? 0).sort((a, b) => a - b);
    return nws[Math.floor(nws.length / 2)] || 0;
  };
  const rows: (string | number)[][] = [];
  for (const m of metas.filter(x => x.arch.joinMonth > 0)) {
    const j = m.arch.joinMonth;
    for (const at of [12, 24, 60, 120, 240]) {
      const wm = j + at - 1;
      if (wm >= MONTHS) continue;
      const row = rowOf(m, wm);
      if (!row) continue;
      rows.push([
        m.arch.name, `+${at} mo`, fm(row.netWorthEst), fm(avgNet(m, wm)),
        row.buildingCount, fm(founderMedianNW(wm)),
        pctOf(row.netWorthEst, founderMedianNW(wm)),
      ]);
    }
  }
  console.log(mdTable(['joiner', 'age', 'book NW', 'net/mo', 'bldgs', 'founder median NW', 'joiner vs median'], rows));
  console.log('\n' + mdTable(
    ['joiner', 'first net>0 month (since join)', 'profitable months in first 60', 'months to $5B totalEarned (tier 3)', 'NW at y50', 'vs founder median y50'],
    metas.filter(x => x.arch.joinMonth > 0).map(m => {
      const end = rowOf(m, MONTHS - 1);
      let profitable60 = 0;
      for (let k = 0; k < 60 && k < m.player.history.length; k++) {
        if (m.player.history[k].net > 0) profitable60++;
      }
      return [
        m.arch.name,
        m.firstProfitMonth ?? 'never',
        `${profitable60}/60`,
        m.tier3Month ?? 'not reached',
        fm(end?.netWorthEst ?? 0),
        pctOf(end?.netWorthEst ?? 0, founderMedianNW(MONTHS - 1)),
      ];
    }),
  ));
  const founderFP = metas.filter(m => m.arch.joinMonth === 0).map(m => `${m.arch.name}: ${m.firstProfitMonth ?? 'never'}`).join(', ');
  console.log(`\nFounders' first net>0 month for comparison: ${founderFP}.`);

  // 6b. The graduation-cliff counterfactual: the SAME joiner portfolio and
  // budget in an EMPTY world (all pools at their NPC-demand floor mult, no
  // incumbent capacity) — i.e. what a Frontier-style pool shield would pay.
  console.log('\n### 6b. Counterfactual — the same joiner ($200M, value-first order) alone in an empty world (60 months)\n');
  {
    const soloRs = makeResearchMeta(JOINER_ORDER);
    const solo = newPlayer('joiner-solo', JOINER_MONEY, orderedPlanGated(JOINER_ORDER, () => soloRs), { maxBuildsPerMonth: 2 });
    const soloWorld = newWorld([solo], 0, null, {
      npcSaleCaps: true, constructionMaterials: true, laborMarket: true,
      dynamicSpot: true, contractOutlet: { capPerDay: CONTRACT_CAP_PER_DAY },
    });
    for (let mm = 0; mm < 60; mm++) {
      const stillResearching = soloRs.idx < soloRs.queue.length;
      setHeadcount(solo, stillResearching);
      applyPrivateMultipliers(solo, soloRs);
      stepMonth(soloWorld, mm);
      advanceResearch(solo, soloRs);
    }
    const shared = metas.find(x => x.arch.name === 'joiner-y10')!;
    const rows = [11, 23, 59].map(mm => [
      `+${mm + 1} mo`,
      fm(solo.history[mm].net), solo.history[mm].buildingCount,
      fm(rowOf(shared, JOIN_A + mm)?.net ?? 0), rowOf(shared, JOIN_A + mm)?.buildingCount ?? '—',
      solo.history[mm].poolMults['leo:telecom']?.toFixed(3) ?? '—',
      rowOf(shared, JOIN_A + mm)?.poolMults['leo:telecom']?.toFixed(3) ?? '—',
    ]);
    console.log(mdTable(
      ['age', 'net/mo EMPTY world', 'bldgs', 'net/mo YEAR-10 world', 'bldgs', 'leo:telecom mult empty', 'mult year-10'],
      rows,
    ));
    console.log(`\njoiner-solo NW at +60 mo: ${fm(solo.history[59].netWorthEst)} (vs shared-world joiner-y10 ${fm(rowOf(shared, JOIN_A + 59)?.netWorthEst ?? 0)}). The delta is ENTIRELY pool crowding + FIFO NPC-book position — same portfolio, same prices, same math.`);
  }

  // 6c. Balance Pass 6 (C1): glide-length selection sweep. Re-runs the full
  // shared world to month 300 (joiner-y10 ages 0–179) at each candidate
  // glide length {4, 6, 8, 12 real days} plus the no-glide Pass-5 baseline.
  // Selection rule (docs/BALANCE.md Pass 6): the SHORTEST glide where the
  // month-120 joiner (a) turns its first profitable month INSIDE the glide
  // window, and (b) holds a durable positive trajectory long after the glide
  // ends (ages 156–179 — i.e. the subsidy let it BUILD into position, not
  // just collect a check).
  console.log('\n### 6c. Glide-length selection sweep (Pass 6 — full shared world re-run per candidate, joiner-y10 shown)\n');
  {
    const SWEEP_MONTHS = 300;
    const variants: { label: string; glide: number | null }[] = [
      { label: 'no glide (Pass-5 baseline)', glide: null },
      { label: '4 real days (16 game-mo)', glide: 16 },
      { label: '6 real days (24 game-mo)', glide: 24 },
      { label: '8 real days (32 game-mo)', glide: 32 },
      { label: '12 real days (48 game-mo)', glide: 48 },
      // Boundary refinement: none of the four Pass-5 candidates clears the
      // durable-trajectory bar (12d ends at breakeven), while longer glides
      // cross a phase transition — the graduate banks enough to un-stall
      // its research ladder and build OUT of the floored starter pools.
      // The day-granular probes below locate the threshold: 13d fails,
      // 14d is the shortest durable length (the shipped constant), 15-16d
      // strengthen it.
      { label: '13 real days (52 game-mo) — probe', glide: 52 },
      { label: '14 real days (56 game-mo) — CHOSEN', glide: 56 },
      { label: '15 real days (60 game-mo) — probe', glide: 60 },
      { label: '16 real days (64 game-mo) — probe', glide: 64 },
    ];
    const rows: (string | number)[][] = [];
    for (const v of variants) {
      const res = runScenario(SWEEP_MONTHS, v.glide);
      const j = res.metas.find(m => m.arch.name === 'joiner-y10')!;
      const hist = j.player.history;
      const avgAges = (lo: number, hi: number): number => {
        const vals: number[] = [];
        for (let a = lo; a <= hi && a < hist.length; a++) vals.push(hist[a].net);
        return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0;
      };
      let firstProfit: number | 'never' = 'never';
      for (let a = 0; a < hist.length; a++) if (hist[a].net > 0) { firstProfit = a; break; }
      const g = v.glide ?? 0;
      let profitableInGlide = 0;
      for (let a = 0; a < g && a < hist.length; a++) if (hist[a].net > 0) profitableInGlide++;
      const last = hist[Math.min(179, hist.length - 1)];
      // Diagnosis columns: what is actually blocking "build into position"?
      const stalled = j.rs.idx < j.rs.queue.length ? RESEARCH_MAP.get(j.rs.queue[j.rs.idx]) : null;
      rows.push([
        v.label,
        firstProfit,
        v.glide === null ? '—' : `${profitableInGlide}/${g}`,
        fm(avgAges(0, 23)),
        v.glide === null ? '—' : fm(avgAges(g, g + 11)),
        fm(avgAges(156, 179)),
        last?.buildingCount ?? '—',
        fm(last?.money ?? 0),
        fm(last?.netWorthEst ?? 0),
        `${j.rs.completed} done${stalled ? `, stalled ${stalled.id} (${fm(stalled.baseCostMoney)})` : ''}`,
      ]);
    }
    console.log(mdTable(
      ['variant', 'first net>0 (age mo)', 'profitable in glide', 'avg net ages 0-23', 'avg net 12mo post-glide', 'avg net ages 156-179', 'bldgs @179', 'cash @179', 'NW @179', 'research @179'],
      rows,
    ));
    console.log('\nSelection rule: shortest glide with first net>0 inside the glide AND a durable positive ages-156-179 trajectory (built into position, not glide-dependent). All four Pass-5 candidates fail the second criterion; the day-granular probes locate the phase transition at 14 real days. The shipped constant is GRADUATION_GLIDE_MS (frontier.ts) = ' + GRADUATION_GLIDE_GAME_MONTHS + ' game-months.');
  }
}

// ─── 7. Offense levers across eras ──────────────────────────────────────────
console.log('\n## 7. Offense-lever relevance across eras (fixed constants vs decade income/wealth scales)\n');
{
  console.log('### Campaign log (real schedule: 28 game-months active, 56 cooldown)\n');
  for (const line of campaignLog) console.log('- ' + line);
  const decades = [0, 2, 4];
  const rows: (string | number)[][] = [];
  const constants: { label: string; value: number; kind: 'income' | 'wealth' }[] = [
    { label: `campaign fee cap (${fm(PRICE_CAMPAIGN_MAX_FEE)}, burned)`, value: PRICE_CAMPAIGN_MAX_FEE, kind: 'income' },
    { label: `poach action fee (${fm(POACH_ACTION_FEE)})`, value: POACH_ACTION_FEE, kind: 'income' },
    { label: `poach all-in vs 100-eng target @ idx 1.6 (${fm(POACH_ACTION_FEE + computeSigningBonus('engineer', maxPoachableCount(100), 1.6))})`, value: POACH_ACTION_FEE + computeSigningBonus('engineer', maxPoachableCount(100), 1.6), kind: 'income' },
    { label: `GEO slot min bid (${fm(computeMinBid('geo'))}, burned)`, value: computeMinBid('geo'), kind: 'income' },
    { label: `freight toll cap/dispatch (${fm(FREIGHT_TOLL_CAP_PER_DISPATCH)})`, value: FREIGHT_TOLL_CAP_PER_DISPATCH, kind: 'income' },
    { label: `cornering intel report (${fm(STANDING_DEMAND_REPORT_FEE)})`, value: STANDING_DEMAND_REPORT_FEE, kind: 'income' },
    { label: `campaign/poach NW floor (${fm(PRICE_CAMPAIGN_MIN_NET_WORTH)} / ${fm(POACH_MIN_NET_WORTH)})`, value: PRICE_CAMPAIGN_MIN_NET_WORTH, kind: 'wealth' },
    { label: `Frontier graduation NW (${fm(FRONTIER_GRADUATION_NET_WORTH)})`, value: FRONTIER_GRADUATION_NET_WORTH, kind: 'wealth' },
  ];
  for (const c of constants) {
    const cells: (string | number)[] = [c.label];
    for (const d of decades) {
      const end = (d + 1) * DECADE - 1;
      const present = metas.filter(m => m.arch.joinMonth <= end);
      const incomes = present.map(m => avgNet(m, end)).sort((a, b) => a - b);
      const nws = present.map(m => rowOf(m, end)?.netWorthEst ?? 0).sort((a, b) => a - b);
      const medianIncome = incomes[Math.floor(incomes.length / 2)] || 0;
      const medianNW = nws[Math.floor(nws.length / 2)] || 0;
      const base = c.kind === 'income' ? Math.abs(medianIncome) : medianNW;
      cells.push(base > 0 ? `${(c.value / base).toFixed(2)}x ${c.kind === 'income' ? 'median net/mo' : 'median NW'}` : '—');
    }
    rows.push(cells);
  }
  console.log('\n' + mdTable(['constant', 'y10 scale', 'y30 scale', 'y50 scale'], rows));
}

// ─── 8. Stockpiles at year-50 fleet sizes (Pass-1/2 cap check) ──────────────
console.log('\n## 8. Stockpiles at 50-year scale (do the Pass-1 storage caps still bound?)\n');
{
  const rows: (string | number)[][] = [];
  for (const m of metas) {
    for (const d of [0, 2, 4]) {
      const end = (d + 1) * DECADE - 1;
      const row = rowOf(m, end);
      if (!row || !row.stockByBucket) continue;
      const b = row.stockByBucket;
      rows.push([
        m.arch.name, `y${(d + 1) * 10}`,
        Math.round(b.raw), Math.round(b.refined), Math.round(b.component), Math.round(b.product),
        fm(row.stockValue || 0),
      ]);
    }
  }
  console.log(mdTable(['player', 'decade end', 'raw u', 'refined u', 'comp u', 'prod u', 'stock book $'], rows));
}

// ─── 9. Decision cadence (dead-decade hunt) ─────────────────────────────────
console.log('\n## 9. Decision cadence by decade (months with a real decision: build capex, research completion, decommission, campaign)\n');
{
  const rows: (string | number)[][] = [];
  for (const m of metas) {
    const cells: (string | number)[] = [m.arch.name];
    for (let d = 0; d < MONTHS / DECADE; d++) {
      const lo = d * DECADE, hi = (d + 1) * DECADE;
      if (m.arch.joinMonth >= hi) { cells.push('—'); continue; }
      let n = 0;
      m.decisionMonths.forEach(mm => { if (mm >= lo && mm < hi) n++; });
      cells.push(`${n}/${Math.min(hi, MONTHS) - Math.max(lo, m.arch.joinMonth)}`);
    }
    rows.push(cells);
  }
  console.log(mdTable(['player', 'y0-10', 'y10-20', 'y20-30', 'y30-40', 'y40-50'], rows));
  const mono = metas[0];
  console.log(`\nmono-expander decommissions: ${mono.decommissioned} sats, ${fm(mono.decomRecovered)} recovered (real 40%-of-unscaled-base constants).`);
}


// ─── 9b. AAA Round 2: does the systemic-crisis layer attack the dead decades?
// docs/AAA_PROGRAM_2026-08.md "Round 2". §9 above measures the ECONOMIC
// CORE's decision cadence and finds it collapsing to 0-3 months per decade
// after year ~10 (BALANCE.md Pass 5, H3). Round 2's thesis is that the
// failure is decision STARVATION, not difficulty, and that a scheduled
// world-shared emergency is a decision GENERATOR.
//
// This probe imports the shipped module's pure functions and lays its real
// calendar over this run's 600-month timeline. It measures three things and
// invents none of them:
//
//   (a) how many months per decade the crisis layer puts a costed decision
//       in front of a corporation (onset, each of the five stage
//       boundaries, and the assessment deadline);
//   (b) whether each archetype's OWN measured portfolio clears the Advisory
//       threshold — i.e. whether the layer is live for it at all — using the
//       real exposure term of the Retrofit Order (the one crisis whose
//       exposure is a pure function of the building list this runner
//       already tracks);
//   (c) what those decisions COST, as a share of the decade's net income, so
//       the added cadence is shown to be real economic weight rather than
//       free clicks.
//
// COVERAGE, stated plainly: this is a CALENDAR + EXPOSURE probe, not an
// in-world simulation of the crisis. The harness does not model hazards,
// insurance, chapters or the senate (see this file's header), and it does
// not tick systemic-crises.ts. What it CAN measure honestly is the decision
// supply and its price against a portfolio this run actually produced — and
// that is exactly the question Round 2 has to answer. Nothing in §1-§10 is
// affected: this section reads inert snapshots and prints.
console.log('\n## 9b. AAA Round 2 - crisis decision supply vs the dead decades\n');
{
  // Game-month -> wall clock. Anchored at 0 so the probe is deterministic
  // (no Date.now anywhere in the sim path — this file's own header rule).
  const tOf = (month: number) => month * GAME_MONTH_MS;
  const CRISIS_DEF = CRISIS_MAP.get('regulatory_upheaval')!;
  const emptyState = { buildings: [], ships: [] } as unknown as Parameters<typeof CRISIS_DEF.exposure>[0];
  const RETROFIT_ANCHOR = CRISIS_DEF.exposure(emptyState).anchor;
  const ADVISORY_BUILDINGS = Math.ceil(0.35 * RETROFIT_ANCHOR);

  // (a) Calendar-derived decision months, archetype-independent.
  const crisisDecisionMonths = new Set<number>();
  const onsets: number[] = [];
  for (let month = 0; month < MONTHS; month++) {
    const a = getCrisisWindow(tOf(month));
    const b = getCrisisWindow(tOf(month + 1));
    // Onset: this game-month contains the moment the window opened.
    if (a.phase !== 'active' && b.phase === 'active') { crisisDecisionMonths.add(month); onsets.push(month); }
    // Stage boundary: the posture is re-charged and can be re-chosen.
    if (a.phase === 'active' && b.phase === 'active' && b.stage > a.stage) crisisDecisionMonths.add(month);
    // Assessment deadline: the pledge decision.
    if (a.phase === 'active' && b.phase !== 'active') crisisDecisionMonths.add(month);
  }

  const decades = MONTHS / DECADE;
  const supplyRow: (string | number)[] = ['crisis decision-months'];
  for (let d = 0; d < decades; d++) {
    let n = 0;
    crisisDecisionMonths.forEach(mm => { if (mm >= d * DECADE && mm < (d + 1) * DECADE) n++; });
    supplyRow.push(n);
  }
  const cycleMonths = (CRISIS_CYCLE_WEEKS * 7 * 24 * 3600_000) / GAME_MONTH_MS;
  console.log(
    'Crisis cycle = ' + CRISIS_CYCLE_WEEKS + ' real weeks = ' + cycleMonths.toFixed(0) + ' game-months; '
    + CRISIS_STAGES + ' stages + onset + assessment close = ' + (CRISIS_STAGES + 2)
    + ' decision points per cycle. ' + onsets.length + ' emergencies open inside the '
    + MONTHS + '-month run.\n',
  );
  console.log(mdTable(['supply', 'y0-10', 'y10-20', 'y20-30', 'y30-40', 'y40-50'], [supplyRow]));

  // (b) + (c) Per archetype: is the layer live, and what does it cost?
  const rows: (string | number)[][] = [];
  const combinedRows: (string | number)[][] = [];
  for (const m of metas) {
    const cells: (string | number)[] = [m.arch.name];
    const comb: (string | number)[] = [m.arch.name];
    for (let d = 0; d < decades; d++) {
      const lo = d * DECADE, hi = (d + 1) * DECADE;
      if (m.arch.joinMonth >= hi) { cells.push('-'); comb.push('-'); continue; }
      const buildings = m.buildingsAtDecadeEnd[d] ?? 0;
      const capital = m.capitalAtDecadeEnd[d] ?? 0;
      // The Retrofit Order's REAL exposure term over this runner's own
      // building list, against the SHIPPED anchor (read from the definition,
      // never re-typed here, so the probe cannot drift from the constant a
      // player actually faces). Its hazardous-site double-weighting is
      // omitted because this runner's location mix is dominated by
      // leo/lunar, so the figure below is a conservative floor, never an
      // inflation.
      const exposureIndex = Math.min(2, buildings / RETROFIT_ANCHOR);
      const tier = crisisTierForIndex(exposureIndex);
      // Cost of the defensive posture that CONTAINS at this tier, over one
      // emergency: the recurring per-stage charge times every stage.
      const harden = CRISIS_APPROACH_MAP.get('harden')!;
      const perStagePct = harden.perStageCostPct[tier] ?? 0;
      const hardenCost = capital * perStagePct * CRISIS_STAGES;
      const decadeNet = m.netByDecade[d] ?? 0;
      const share = decadeNet > 0 ? (hardenCost / decadeNet) * 100 : NaN;
      cells.push(
        buildings + 'b ' + fm(capital) + ' / ' + exposureIndex.toFixed(2) + ' / ' + tier
        + ' ~ solv ' + Math.min(2, capital / 20e9).toFixed(2),
      );

      let baseline = 0;
      m.decisionMonths.forEach(mm => { if (mm >= lo && mm < hi) baseline++; });
      let crisisN = 0;
      if (tier !== 'advisory') {
        crisisDecisionMonths.forEach(mm => {
          if (mm >= lo && mm < hi && mm >= m.arch.joinMonth && !m.decisionMonths.has(mm)) crisisN++;
        });
      }
      comb.push(
        baseline + ' -> ' + (baseline + crisisN)
        + (crisisN > 0 && Number.isFinite(share) ? ' (' + share.toFixed(1) + '% net)' : ''),
      );
    }
    rows.push(cells);
    combinedRows.push(comb);
  }

  console.log('\n### Measured exposure at each decade end (buildings, capital / Retrofit index / severity | Mutual-solvency index)\n');
  console.log(mdTable(['player', 'y10', 'y20', 'y30', 'y40', 'y50'], rows));

  console.log('\n### Decision cadence: economic core -> economic core + crisis layer\n');
  console.log('(months per decade with a real decision; the percentage is the containing posture cost as a share of that decade net income)\n');
  console.log(mdTable(['player', 'y0-10', 'y10-20', 'y20-30', 'y30-40', 'y40-50'], combinedRows));

  // Headline: the dead decades specifically (Pass 5 H3 measured decades 2-5).
  let deadBefore = 0, deadAfter = 0, deadCells = 0, zeroBefore = 0, zeroAfter = 0;
  for (const m of metas) {
    for (let d = 1; d < decades; d++) {
      const lo = d * DECADE, hi = (d + 1) * DECADE;
      if (m.arch.joinMonth >= hi) continue;
      let baseline = 0;
      m.decisionMonths.forEach(mm => { if (mm >= lo && mm < hi) baseline++; });
      const tier = crisisTierForIndex(Math.min(2, (m.buildingsAtDecadeEnd[d] ?? 0) / RETROFIT_ANCHOR));
      let crisisN = 0;
      if (tier !== 'advisory') {
        crisisDecisionMonths.forEach(mm => {
          if (mm >= lo && mm < hi && mm >= m.arch.joinMonth && !m.decisionMonths.has(mm)) crisisN++;
        });
      }
      deadBefore += baseline; deadAfter += baseline + crisisN; deadCells++;
      if (baseline === 0) zeroBefore++;
      if (baseline + crisisN === 0) zeroAfter++;
    }
  }
  console.log(
    '\nDead decades (y10-50, ' + deadCells + ' archetype-decades): mean cadence '
    + (deadBefore / deadCells).toFixed(2) + ' -> ' + (deadAfter / deadCells).toFixed(2)
    + ' months/decade (x' + (deadAfter / Math.max(1, deadBefore)).toFixed(2) + ').',
  );
  console.log(
    'Archetype-decades with ZERO decisions: ' + zeroBefore + ' -> ' + zeroAfter + '.',
  );

  // The sharper measure. The mean above is diluted by archetypes whose
  // SCRIPTED build order keeps their cadence high (turtle 31, aggressor 24)
  // — those decades were never starved. Pass 5 H3's finding is specifically
  // about decades that collapse to 0-3 decisions, so measure THOSE.
  {
    let n = 0, before = 0, after = 0, worst = 0;
    for (const m of metas) {
      for (let d = 1; d < decades; d++) {
        const lo = d * DECADE, hi = (d + 1) * DECADE;
        if (m.arch.joinMonth >= hi) continue;
        let baseline = 0;
        m.decisionMonths.forEach(mm => { if (mm >= lo && mm < hi) baseline++; });
        if (baseline > 3) continue; // not a starved decade
        const tier = crisisTierForIndex(Math.min(2, (m.buildingsAtDecadeEnd[d] ?? 0) / RETROFIT_ANCHOR));
        let crisisN = 0;
        if (tier !== 'advisory') {
          crisisDecisionMonths.forEach(mm => {
            if (mm >= lo && mm < hi && mm >= m.arch.joinMonth && !m.decisionMonths.has(mm)) crisisN++;
          });
        }
        n++; before += baseline; after += baseline + crisisN;
        if (crisisN === 0) worst++;
      }
    }
    console.log(
      '\nSTARVED decades only (baseline <= 3 decisions, n=' + n + '): mean '
      + (before / n).toFixed(2) + ' -> ' + (after / n).toFixed(2)
      + ' months/decade (x' + (after / Math.max(1, before)).toFixed(2) + '). '
      + worst + ' of ' + n + ' are still unserved because the corporation sits below the '
      + 'Advisory threshold — those are portfolios too small for a systemic emergency to '
      + 'reach, and the answer for them is R1-E6 mid-band construction rungs, not pressure.',
    );
  }
  console.log(
    '\nSeverity note: an archetype below the Advisory threshold (index < 0.35, i.e. fewer than '
    + ADVISORY_BUILDINGS + ' installations) gets a published forecast and NO measures in force. '
    + 'That is the designed floor, not a gap - see ' + CRISIS_DEF.name + ' exposure term.',
  );
}

// ─── 10. Deep-tier ladder at 50-year income scales ──────────────────────────
console.log('\n## 10. Deep-tier flagship economics (first-copy marginalCurve, real engine math) vs achieved incomes\n');
{
  const flagships: { id: string; loc: string }[] = [
    { id: 'mining_europa', loc: 'jupiter_system' },
    { id: 'datacenter_jupiter', loc: 'jupiter_system' },
    { id: 'mining_titan', loc: 'saturn_system' },
    { id: 'fabrication_titan', loc: 'saturn_system' },
    { id: 'deep_space_relay', loc: 'outer_system' },
    { id: 'mining_kuiper', loc: 'outer_system' },
  ];
  const end = MONTHS - 1;
  const incomes = metas.map(m => avgNet(m, end)).sort((a, b) => a - b);
  const medianIncome = incomes[Math.floor(incomes.length / 2)] || 0;
  const bestIncome = incomes[incomes.length - 1] || 0;
  const rows: (string | number)[][] = [];
  for (const f of flagships) {
    const def = BUILDING_MAP.get(f.id)!;
    const powerOpts = def.powerRequired ? (LOCATION_POWER_PLAN[f.loc] || {}) : {};
    const [r1] = marginalCurve(f.id, f.loc, 1, powerOpts);
    const built = metas.filter(m => m.player.buildings.some(b => b.definitionId === f.id)).map(m => m.arch.name);
    rows.push([
      f.id, `T${def.tier}`, fm(def.baseCost), fm(r1.fleetNet),
      r1.paybackMonths === Infinity ? 'never' : `${r1.paybackMonths} mo (${(r1.paybackMonths / 12).toFixed(0)} y)`,
      medianIncome > 0 ? `${(def.baseCost / medianIncome).toFixed(0)} mo` : '—',
      bestIncome > 0 ? `${(def.baseCost / bestIncome).toFixed(0)} mo` : '—',
      built.length ? built.join(',') : 'NOBODY in 50 years',
    ]);
  }
  console.log(mdTable(
    ['flagship', 'tier', 'capex', 'first-copy net/mo', 'self-payback', 'capex in median-income months', 'in best-income months', 'built by (y50)'],
    rows,
  ));
}

console.log('\ndone.');
