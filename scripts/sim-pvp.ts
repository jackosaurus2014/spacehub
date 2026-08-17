// ─── Space Tycoon: Player-vs-Player Balance Audit (Balance Pass 3) ──────────
// docs/BALANCE.md "Pass 3 — the player-vs-player economy". Runs N SimPlayers
// in ONE world through scripts/sim-harness.ts, which imports the REAL engine
// modules: demand-pools capacity-share splits, extraction-pressure shared
// deposits, labor-market computeLaborAggregates (opt-in laborMarket world),
// market-engine price impact + mean reversion (opt-in dynamicSpot world),
// contended NPC absorption budgets (opt-in contendedNpcCaps — order-book
// FIFO, matching matchOrders' price-time priority). Plus analytic offense-
// toolkit ROI tables computed straight from the shipped constants
// (price-campaigns.ts, talent-poaching.ts, orbital-slot-auctions.ts,
// cornering-intel.ts, offense.ts, share-registry.ts).
//
// Deterministic: no Date.now(), no Math.random() — same output every run.
//
//   npx tsx scripts/sim-pvp.ts

import {
  newPlayer, newWorld, runWorld, fm, mdTable, GAME_MONTH_MS,
  type SimPlayer,
} from './sim-harness';
import { RESOURCE_MAP, RESOURCES } from '../src/lib/game/resources';
import type { ResourceId } from '../src/lib/game/resources';
import { BUILDINGS, BUILDING_MAP, getBuildingDerivedStats } from '../src/lib/game/buildings';
import { scaledBuildingCost } from '../src/lib/game/formulas';
import {
  computeCampaignFee, PRICE_CAMPAIGN_DURATION_MS, PRICE_CAMPAIGN_COOLDOWN_MS,
  PRICE_CAMPAIGN_MIN_INVENTORY, PRICE_CAMPAIGN_MIN_NET_WORTH, CAMPAIGN_NPC_BID_VOLUME_FACTOR,
} from '../src/lib/game/price-campaigns';
import {
  computeSigningBonus, computeRetentionCost, maxPoachableCount,
  POACH_ACTION_FEE, POACH_TARGET_COOLDOWN_MS, POACH_MIN_TARGET_HEADCOUNT, POACH_MIN_NET_WORTH,
} from '../src/lib/game/talent-poaching';
import { WORKER_MAP, getWorkforceBonuses, getHireCost, DEFAULT_WORKFORCE } from '../src/lib/game/workforce';
import { computeWageIndex, laborSupply, computeLaborAggregates, LABOR_SUPPLY_PER_QUARTERS } from '../src/lib/game/labor-market';
import { computeMinBid, SLOT_IDLE_FEE_FRACTION, SLOT_IDLE_AUTO_RELEASE_MS, LEASE_TERM_MS } from '../src/lib/game/orbital-slot-auctions';
import { STANDING_DEMAND_REPORT_FEE } from '../src/lib/game/cornering-intel';
import { FREIGHT_TOLL_MAX, FREIGHT_TOLL_CAP_PER_DISPATCH } from '../src/lib/game/offense';
import {
  computeValuation, minTenderPricePerShare, arbitrationFee,
  CONTROL_SHARES, TOTAL_SHARES, TENDER_MIN_PREMIUM, RAISE_MIN_SHARES, RAISE_MAX_SHARES,
  DISTRESS_TRANCHE_SHARES, DISTRESS_DISCOUNT, TAKEOVER_MIN_ACTIVE_CORPS,
} from '../src/lib/game/share-registry';
import { FRONTIER_GRADUATION_NET_WORTH, FRONTIER_HARD_CAP_NET_WORTH } from '../src/lib/game/frontier';
import { calculatePriceAfterTrade, MAX_TRADE_IMPACT, TRADE_IMPACT_K } from '../src/lib/game/market-engine';
import { getNpcVolumeCap } from '../src/lib/game/npc-volume-caps';

const START_MONEY = 2_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Real days per game-month (6h game month → 0.25 real days). A 7-real-day
 *  offense window (campaign/tender) therefore spans 28 GAME-months. */
const GAME_MONTHS_PER_REAL_DAY = DAY_MS / GAME_MONTH_MS;

// ─── Shared plan helpers ────────────────────────────────────────────────────

const buildN = (definitionId: string, locationId: string, n: number): SimPlayer['plan'] =>
  (p) => p.buildings.filter(b => b.definitionId === definitionId).length >= n
    ? []
    : Array(Math.min(4, n - p.buildings.filter(b => b.definitionId === definitionId).length)).fill({ definitionId, locationId });

function last(p: SimPlayer) { return p.history[p.history.length - 1]; }

// ════════════════════════════════════════════════════════════════════════════
console.log('# Balance Pass 3 — PvP economy audit (multi-player shared world, real engine modules)\n');

// ─── S1. Crowding: N identical players piling into one pool ─────────────────
console.log('## S1 — Crowding: N identical players, 6 GEO telecom sats each (18 months, shared geo:telecom pool)\n');
{
  const rows: (string | number)[][] = [];
  for (const n of [1, 2, 3, 5]) {
    const players = Array.from({ length: n }, (_, i) =>
      newPlayer(`corp-${i + 1}`, START_MONEY, buildN('sat_telecom_geo', 'geo', 6), { maxBuildsPerMonth: 6 }));
    runWorld(newWorld(players), 18);
    const h = last(players[0]);
    rows.push([
      n,
      h.poolMults['geo:telecom']?.toFixed(3) ?? '—',
      fm(h.revenue),
      fm(h.net),
      fm(h.net * 12),
    ]);
  }
  console.log(mdTable(['players in pool', 'geo:telecom mult', 'each: svc rev/mo', 'each: net/mo', 'each: net/yr'], rows));
}

// ─── S2. Whale vs efficient small player in the SAME pool ───────────────────
console.log('\n## S2 — Whale (12 LEO telecom sats) vs small efficient player (3 sats), same leo:telecom pool (18 mo)\n');
{
  const whale = newPlayer('whale', START_MONEY * 10, buildN('sat_telecom', 'leo', 12), { maxBuildsPerMonth: 4 });
  const small = newPlayer('small', START_MONEY, buildN('sat_telecom', 'leo', 3), { maxBuildsPerMonth: 3 });
  runWorld(newWorld([whale, small]), 18);
  // Baselines: each alone in the pool.
  const whaleSolo = newPlayer('whale-solo', START_MONEY * 10, buildN('sat_telecom', 'leo', 12), { maxBuildsPerMonth: 4 });
  runWorld(newWorld([whaleSolo]), 18);
  const smallSolo = newPlayer('small-solo', START_MONEY, buildN('sat_telecom', 'leo', 3), { maxBuildsPerMonth: 3 });
  runWorld(newWorld([smallSolo]), 18);
  const rows = [
    ['whale (12 sats), contested', fm(last(whale).revenue), fm(last(whale).net), fm(last(whale).revenue / 12) + '/sat'],
    ['whale (12 sats), alone', fm(last(whaleSolo).revenue), fm(last(whaleSolo).net), fm(last(whaleSolo).revenue / 12) + '/sat'],
    ['small (3 sats), vs whale', fm(last(small).revenue), fm(last(small).net), fm(last(small).revenue / 3) + '/sat'],
    ['small (3 sats), alone', fm(last(smallSolo).revenue), fm(last(smallSolo).net), fm(last(smallSolo).revenue / 3) + '/sat'],
  ];
  console.log(mdTable(['player', 'svc rev/mo (mo 17)', 'net/mo', 'rev per sat'], rows));
  console.log(`\npool mult contested: ${last(whale).poolMults['leo:telecom']?.toFixed(3)}; whale alone: ${last(whaleSolo).poolMults['leo:telecom']?.toFixed(3)}; small alone: ${last(smallSolo).poolMults['leo:telecom']?.toFixed(3)}`);
}

// ─── S3. Spread out vs contest the whale's pool ─────────────────────────────
console.log('\n## S3 — Same capex, two postures vs an entrenched whale (6 GEO sats): contest their pool vs spread out (18 mo)\n');
{
  const mkWhale = () => newPlayer('whale', START_MONEY * 10, buildN('sat_telecom_geo', 'geo', 6), { maxBuildsPerMonth: 6 });
  const contester = newPlayer('contester', START_MONEY, buildN('sat_telecom_geo', 'geo', 3), { maxBuildsPerMonth: 3 });
  runWorld(newWorld([mkWhale(), contester]), 18);
  const spreadPlan: SimPlayer['plan'] = (p) => {
    const want: { definitionId: string; locationId: string }[] = [];
    if (!p.buildings.some(b => b.definitionId === 'sat_telecom_geo')) want.push({ definitionId: 'sat_telecom_geo', locationId: 'geo' });
    if (!p.buildings.some(b => b.definitionId === 'sat_telecom')) want.push({ definitionId: 'sat_telecom', locationId: 'leo' });
    if (!p.buildings.some(b => b.definitionId === 'sat_sensor')) want.push({ definitionId: 'sat_sensor', locationId: 'leo' });
    return want;
  };
  const spreader = newPlayer('spreader', START_MONEY, spreadPlan, { maxBuildsPerMonth: 3 });
  runWorld(newWorld([mkWhale(), spreader]), 18);
  console.log(mdTable(
    ['posture', 'svc rev/mo (mo 17)', 'net/mo', 'geo:telecom mult seen'],
    [
      ['contest: 3 GEO sats into the whale\'s pool', fm(last(contester).revenue), fm(last(contester).net), last(contester).poolMults['geo:telecom']?.toFixed(3) ?? '—'],
      ['spread: 1 GEO + 1 LEO telecom + 1 LEO sensor', fm(last(spreader).revenue), fm(last(spreader).net), last(spreader).poolMults['geo:telecom']?.toFixed(3) ?? '—'],
    ],
  ));
}

// ─── S4. Shared-deposit crowding: 1/2/3/5 miners on one belt deposit ────────
console.log('\n## S4 — Shared deposit: N miners on the same belt rock (mining_asteroid + reactor each, 24 mo)\n');
{
  const minerPlan: SimPlayer['plan'] = (p, month) =>
    month === 0 ? [
      { definitionId: 'mining_asteroid', locationId: 'asteroid_belt' },
      { definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' },
    ] : [];
  const rows: (string | number)[][] = [];
  let soloSales = 0;
  for (const n of [1, 2, 3, 5]) {
    const players = Array.from({ length: n }, (_, i) =>
      newPlayer(`miner-${i + 1}`, START_MONEY * 5, minerPlan, { maxBuildsPerMonth: 2 }));
    runWorld(newWorld(players), 24);
    const h = last(players[0]);
    const combined = h.revenue + h.resourceSales;
    if (n === 1) soloSales = combined;
    rows.push([n, fm(h.revenue), fm(h.resourceSales), `${Math.round((combined / Math.max(1, soloSales)) * 100)}%`]);
  }
  console.log(mdTable(['miners on deposit', 'each: mining rev/mo (mo 23)', 'each: leftover sales/mo', 'vs solo'], rows));
}

// ─── S5. Labor market: whale hiring spree taxes everyone ────────────────────
console.log('\n## S5 — Labor: 5 modest corps (25 eng / 10 miners each) ± a whale hiring 900 eng / 600 miners (laborMarket world)\n');
{
  const WHALE_HEADS = { engineer: 900, miner: 600 } as const;
  const mkSmall = (i: number) => newPlayer(`corp-${i}`, START_MONEY, () => [], {
    headcount: { engineer: 25, miner: 10 },
  });
  const before = Array.from({ length: 5 }, (_, i) => mkSmall(i));
  runWorld(newWorld(before, 0, null, { laborMarket: true }), 1);
  const whaleWorldPlayers = [
    ...Array.from({ length: 5 }, (_, i) => mkSmall(i)),
    newPlayer('whale', START_MONEY * 50, () => [], { headcount: { ...WHALE_HEADS } }),
  ];
  runWorld(newWorld(whaleWorldPlayers, 0, null, { laborMarket: true }), 1);
  const aggBefore = computeLaborAggregates(before.map(p => ({ id: p.name, headcount: p.headcount || {}, crewQuarters: 0 })));
  const aggAfter = computeLaborAggregates(whaleWorldPlayers.map(p => ({ id: p.name, headcount: p.headcount || {}, crewQuarters: 0 })));
  const rows = (['engineer', 'miner'] as const).map(t => [
    t,
    aggBefore.get(t)!.index.toFixed(2),
    aggAfter.get(t)!.index.toFixed(2),
  ]);
  console.log(mdTable(['crew type', 'index (no whale)', 'index (whale hiring)'], rows));
  console.log(`\nSmall corp payroll/mo (25 eng + 10 miners): ${fm(before[0].history[0].payroll || 0)} before, ${fm(whaleWorldPlayers[0].history[0].payroll || 0)} with the whale hiring — the whale's own payroll: ${fm(whaleWorldPlayers[5].history[0].payroll || 0)}/mo (it pays the index it created, on ${WHALE_HEADS.engineer + WHALE_HEADS.miner} heads).`);
  // Counterplay pricing: crew quarters needed to bring the engineer index back.
  const employedEff = aggAfter.get('engineer')!.employedEffective;
  const targetIdx = aggBefore.get('engineer')!.index;
  const supplyNeeded = employedEff / Math.max(0.8, targetIdx);
  const quartersNeeded = Math.max(0, Math.ceil((supplyNeeded - laborSupply('engineer', 0)) / LABOR_SUPPLY_PER_QUARTERS));
  const qBuildings = BUILDINGS
    .map(def => ({ def, q: getBuildingDerivedStats(def).crewQuarters || 0 }))
    .filter(e => e.q > 0)
    .map(e => ({ id: e.def.id, q: e.q, costPerQ: e.def.baseCost / e.q, maintPerQ: e.def.maintenanceCostPerMonth / e.q }))
    .sort((a, b) => a.costPerQ - b.costPerQ)
    .slice(0, 3);
  console.log(`\nCounterplay: restoring the pre-whale engineer index needs ~${quartersNeeded} crew-quarters server-wide (${LABOR_SUPPLY_PER_QUARTERS} supply slots each). Cheapest quarters:\n`);
  console.log(mdTable(['building', 'crewQuarters', 'capex per quarters slot', 'maint/mo per slot'],
    qBuildings.map(b => [b.id, b.q, fm(Math.round(b.costPerQ)), fm(Math.round(b.maintPerQ))])));
}

// ─── S6. Combined sales move the shared spot (dynamicSpot world) ────────────
console.log('\n## S6 — One shared price: 1 vs 3 lunar miners, spot evolved from COMBINED flows (dynamicSpot, real market-engine impact + mean reversion; 12 mo)\n');
{
  const minerPlan: SimPlayer['plan'] = (p) => p.buildings.length >= 3 ? [] : [
    { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
    { definitionId: 'mining_lunar_ice', locationId: 'lunar_surface' },
    { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  ];
  const solo = newPlayer('solo', START_MONEY, minerPlan, { maxBuildsPerMonth: 3 });
  const soloWorld = newWorld([solo], 0, null, { dynamicSpot: true, npcSaleCaps: true });
  runWorld(soloWorld, 12);
  const trio = Array.from({ length: 3 }, (_, i) => newPlayer(`m-${i + 1}`, START_MONEY, minerPlan, { maxBuildsPerMonth: 3 }));
  const trioWorld = newWorld(trio, 0, null, { dynamicSpot: true, npcSaleCaps: true, contendedNpcCaps: true });
  runWorld(trioWorld, 12);
  const base = RESOURCE_MAP.get('lunar_water' as ResourceId)!.baseMarketPrice;
  const rows = [3, 6, 11].map(m => [
    m,
    fm(solo.history[m].revenue + solo.history[m].resourceSales),
    fm(trio[0].history[m].revenue + trio[0].history[m].resourceSales),
    fm(trio[2].history[m].revenue + trio[2].history[m].resourceSales),
  ]);
  console.log(mdTable(['mo', 'solo miner gross/mo', 'trio: 1st in book order', 'trio: 3rd (eats leftover NPC budget)'], rows));
  console.log(`\nlunar_water spot after 12 mo: solo world ${fm(soloWorld.spotSnapshot!.prices['lunar_water'])} vs trio world ${fm(trioWorld.spotSnapshot!.prices['lunar_water'])} (base ${fm(base)}); NPC absorption is contended FIFO in the trio world — matching the order book's price-time priority.`);
}

// ─── S7. Price-campaign duel — BOTH sides of the ledger ─────────────────────
console.log('\n## S7 — Price campaign on lunar_water: victim damage AND attacker all-in cost\n');
{
  // Victim: the doc's lunar miner (2 mines + solar), campaign pins ONLY
  // lunar_water at the band floor; everything else stays at base.
  const minerPlan: SimPlayer['plan'] = (p) => p.buildings.length >= 3 ? [] : [
    { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
    { definitionId: 'mining_lunar_ice', locationId: 'lunar_surface' },
    { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
  ];
  const neutral = newPlayer('neutral', START_MONEY, minerPlan, { maxBuildsPerMonth: 3 });
  runWorld(newWorld([neutral]), 12);
  const crashedPrices: Record<string, number> = {};
  for (const r of RESOURCES) crashedPrices[r.id] = r.id === 'lunar_water' ? Math.round(r.baseMarketPrice * 0.3) : r.baseMarketPrice;
  const crashed = newPlayer('crashed', START_MONEY, minerPlan, { maxBuildsPerMonth: 3 });
  runWorld(newWorld([crashed], 0, { prices: crashedPrices, asOf: 0 }), 12);
  const nH = neutral.history[11], cH = crashed.history[11];
  const victimDeltaPerGameMonth = (nH.revenue + nH.resourceSales) - (cH.revenue + cH.resourceSales);
  const campaignGameMonths = PRICE_CAMPAIGN_DURATION_MS / GAME_MONTH_MS;
  const victimDamagePerCampaign = victimDeltaPerGameMonth * campaignGameMonths;
  // Mothball counterplay bound: both mines paused = no revenue, 25% of their
  // maintenance — worth it only if crashed net is BELOW that.
  const mineMaint = (BUILDING_MAP.get('mining_lunar_basic')!.maintenanceCostPerMonth
    + BUILDING_MAP.get('mining_lunar_ice')!.maintenanceCostPerMonth);
  const mothballNetBound = -(0.25 * mineMaint);

  // Attacker: burned fee + price-impact ammunition + margin sacrifice.
  const lw = RESOURCE_MAP.get('lunar_water' as ResourceId)!;
  const vol = (lw as { volatility?: number }).volatility ?? 0.05;
  const fee = computeCampaignFee(lw.baseMarketPrice);
  // Units to push base -> 0.3x via repeated sell impact (real formula, 25%/call clamp):
  let price = lw.baseMarketPrice, units = 0, bursts = 0;
  const floor = Math.round(lw.baseMarketPrice * 0.3);
  const burstQty = Math.ceil(MAX_TRADE_IMPACT / (vol * TRADE_IMPACT_K)); // qty saturating one clamped call
  while (price > floor && bursts < 40) {
    price = calculatePriceAfterTrade(price, lw.baseMarketPrice, burstQty, false,
      vol, (lw as { minPrice?: number }).minPrice ?? 1, (lw as { maxPrice?: number }).maxPrice ?? lw.baseMarketPrice * 10);
    units += burstQty; bursts++;
  }
  // Margin sacrifice: dump `units` at an average of ~(base+floor)/2 vs neutral basis ~base.
  const avgDump = (lw.baseMarketPrice + floor) / 2;
  const marginSacrifice = units * (lw.baseMarketPrice - avgDump);
  const npcBidPerDay = getNpcVolumeCap('lunar_water') * CAMPAIGN_NPC_BID_VOLUME_FACTOR;
  console.log(mdTable(['ledger line', 'value'], [
    ['victim net/mo at neutral spot', fm(nH.net)],
    ['victim net/mo under the crash', fm(cH.net)],
    ['victim (2 lunar mines): gross delta per GAME-month', fm(-victimDeltaPerGameMonth)],
    [`victim damage over one 7-real-day campaign (${campaignGameMonths} game-months)`, fm(-victimDamagePerCampaign)],
    ['victim mothball bound (mines paused: 0 revenue, 25% maint)', `${fm(mothballNetBound)}/mo — mothball only pays if crashed net is below this`],
    ['attacker: burned declaration fee', fm(-fee)],
    [`attacker: crash ammunition (real impact math: ${units} u in ${bursts} clamped bursts)`, `${units} u lunar_water`],
    ['attacker: margin sacrifice on the dump (avg dump px vs base)', fm(-marginSacrifice)],
    ['attacker: min inventory to declare', `${PRICE_CAMPAIGN_MIN_INVENTORY} u`],
    ['NPC maker bid absorption during campaign (halved)', `${npcBidPerDay} u/real-day`],
    ['re-declare cooldown on this market', `${PRICE_CAMPAIGN_COOLDOWN_MS / DAY_MS} days`],
    ['attacker net-worth gate', fm(PRICE_CAMPAIGN_MIN_NET_WORTH)],
  ]));
  console.log(`\nNOTE: damage is market-wide — EVERY lunar_water producer (attacker's own mines included, Frontier miners excluded post-Pass-3 shield) takes the same per-game-month hit; the campaign cannot be aimed at one corporation.`);
}

// ─── S8. Talent poaching ROI (analytic, real constants) ─────────────────────
console.log('\n## S8 — Talent poaching: attacker cost vs victim loss (engineers; real constants)\n');
{
  const eng = WORKER_MAP.get('engineer')!;
  const rows: (string | number)[][] = [];
  for (const { targetHeads, idx } of [{ targetHeads: 40, idx: 1.0 }, { targetHeads: 40, idx: 1.6 }, { targetHeads: 250, idx: 1.6 }]) {
    const n = maxPoachableCount(targetHeads);
    const bonus = computeSigningBonus('engineer', n, idx);
    const retention = computeRetentionCost(bonus);
    const rehire = n * getHireCost('engineer');
    // Victim revenue value of n engineers: serviceRevenue 0.05/head at default
    // training (bonusScale 1.0), on a $60M/mo gross service book.
    const wf = { ...DEFAULT_WORKFORCE, engineers: n };
    const revShare = getWorkforceBonuses(wf).serviceRevenue;
    const victimRevLoss = 60_000_000 * revShare;
    rows.push([
      `${targetHeads} eng @ idx ${idx}`,
      n,
      fm(bonus + POACH_ACTION_FEE),
      fm(POACH_ACTION_FEE),
      fm(retention),
      fm(rehire),
      `${fm(victimRevLoss)}/mo`,
    ]);
  }
  console.log(mdTable(
    ['target', 'max heads/offer', 'attacker all-in (bonus+fee)', 'attacker sunk if countered', 'defender: retention (burn)', 'defender: just REHIRE (base salary ×6, wage-index-free)', 'victim rev value of raided heads'],
    rows,
  ));
  console.log(`\nfloors/cooldowns: min target headcount ${POACH_MIN_TARGET_HEADCOUNT}, per-target cooldown ${POACH_TARGET_COOLDOWN_MS / DAY_MS}d, attacker net-worth gate ${fm(POACH_MIN_NET_WORTH)}. KEY ASYMMETRY: open-market hiring (getHireCost) charges 6 months' BASE salary with NO wage index — rehiring replacement crew is almost always cheaper than retention, and always cheaper than what the attacker paid.`);
}

// ─── S9. Whale vs fresh graduate (newcomer-crush check) ─────────────────────
console.log('\n## S9 — Newcomer crush: tier-5 whale enters a fresh graduate\'s GEO market (12 mo)\n');
{
  const gradPlan: SimPlayer['plan'] = (p) => p.buildings.length >= 3 ? [] : [
    { definitionId: 'ground_station', locationId: 'earth_surface' },
    { definitionId: 'sat_telecom_geo', locationId: 'geo' },
    { definitionId: 'sat_telecom_geo', locationId: 'geo' },
  ];
  const whaleEnterPlan: SimPlayer['plan'] = (p, month) =>
    month >= 2 && p.buildings.length < 6
      ? Array(3).fill({ definitionId: 'sat_telecom_geo', locationId: 'geo' })
      : [];
  // Graduate alone (baseline).
  const gradAlone = newPlayer('grad-alone', 200_000_000, gradPlan, { maxBuildsPerMonth: 3 });
  runWorld(newWorld([gradAlone]), 12);
  // Graduate + whale crushing the pool.
  const grad = newPlayer('grad', 200_000_000, gradPlan, { maxBuildsPerMonth: 3 });
  const whale = newPlayer('whale', START_MONEY * 50, whaleEnterPlan, { maxBuildsPerMonth: 3 });
  runWorld(newWorld([grad, whale]), 12);
  // Whale baselines: (a) same 6 sats in an empty GEO market; (b) doing
  // NOTHING (hold cash — isolates exec comp from the entry's own bleed).
  const whaleAlone = newPlayer('whale-alone', START_MONEY * 50, whaleEnterPlan, { maxBuildsPerMonth: 3 });
  runWorld(newWorld([whaleAlone]), 12);
  const whaleIdle = newPlayer('whale-idle', START_MONEY * 50, () => [], { maxBuildsPerMonth: 0 });
  runWorld(newWorld([whaleIdle]), 12);
  const gA = last(gradAlone), g = last(grad), w = last(whale), wA = last(whaleAlone), wI = last(whaleIdle);
  const suppression = gA.net - g.net;
  const entryBleed = wI.net - w.net; // what camping the graduate's pool costs vs holding cash
  const capex = [0, 1, 2, 3, 4, 5].reduce((s, i) => s + scaledBuildingCost(BUILDING_MAP.get('sat_telecom_geo')!.baseCost, i), 0);
  console.log(mdTable(['row', 'value'], [
    ['graduate book NW at month 0', fm(grad.history[0].netWorthEst)],
    ['graduate net/mo alone', fm(gA.net)],
    ['graduate net/mo with whale in pool', fm(g.net)],
    ['income suppressed', `${fm(suppression)}/game-month`],
    ['whale net/mo (contested entry)', fm(w.net)],
    ['whale net/mo (same sats, empty market)', fm(wA.net)],
    ['whale net/mo (holding cash, no entry)', fm(wI.net)],
    ['whale running cost of the camp vs holding cash', `${fm(entryBleed)}/game-month`],
    ['cost : damage ratio (whale bleed per $1 of graduate income suppressed)', (entryBleed / Math.max(1, suppression)).toFixed(1) + ' : 1'],
    ['whale capex to enter (6 GEO sats, scaled)', fm(capex)],
    ['Frontier graduation NW / hard cap', `${fm(FRONTIER_GRADUATION_NET_WORTH)} / ${fm(FRONTIER_HARD_CAP_NET_WORTH)}`],
  ]));
  console.log(`\nOffense-lever reach vs a fresh graduate: poach — blocked below ${POACH_MIN_TARGET_HEADCOUNT} heads/type and most graduates hold fewer; campaign — market-wide only, fee ${fm(computeCampaignFee(RESOURCE_MAP.get('lunar_water' as ResourceId)!.baseMarketPrice))}+ vs a graduate's small mining book; tolls — capped ${fm(FREIGHT_TOLL_CAP_PER_DISPATCH)}/dispatch at ${(FREIGHT_TOLL_MAX * 100).toFixed(1)}% max; tenders — impossible (Frontier shield + zero float). Pool undercutting (above) is the ONLY aimable channel.`);
}

// ─── S10. Hostile-takeover desk check (dormant system; report only) ─────────
console.log('\n## S10 — Takeover desk check (share-registry.ts, DORMANT behind ' + TAKEOVER_MIN_ACTIVE_CORPS + '-corp gate)\n');
{
  const rows: (string | number)[][] = [];
  for (const { label, book, growth } of [
    { label: 'fresh graduate', book: 150_000_000, growth: null as number | null },
    { label: 'mid corp, published +30%/q', book: 5_000_000_000, growth: 30 },
    { label: 'late corp, published +10%/q', book: 100_000_000_000, growth: 10 },
  ]) {
    const v = computeValuation(book, growth);
    const controlCost = CONTROL_SHARES * minTenderPricePerShare(v.fairSharePrice);
    rows.push([
      label, fm(book), v.marketPremium.toFixed(2), fm(v.valuation), fm(v.fairSharePrice),
      fm(minTenderPricePerShare(v.fairSharePrice)),
      fm(controlCost),
      fm(arbitrationFee(minTenderPricePerShare(v.fairSharePrice), CONTROL_SHARES)),
      `${Math.round((controlCost / book) * 100)}%`,
    ]);
  }
  console.log(mdTable(
    ['target', 'book NW', 'premium', 'valuation', 'fair/share', 'min tender/share (×' + TENDER_MIN_PREMIUM + ')', 'cash for ' + CONTROL_SHARES + '/' + TOTAL_SHARES + ' control', 'arb fee (burned)', 'control cost vs target book'],
    rows,
  ));
  console.log(`\nStructural guards: float exists ONLY via voluntary raises (${RAISE_MIN_SHARES}-${RAISE_MAX_SHARES} shares), distress auctions (${DISTRESS_TRANCHE_SHARES}-share tranches at ${Math.round((1 - DISTRESS_DISCOUNT) * 100)}% discount after 3 cash-negative game-months), or accepted tenders — a healthy corporation that never raises capital is mathematically untakeable. Frontier corps cannot be tendered.`);
}

// ─── S11. Remaining offense levers — cost/counterplay quick table ───────────
console.log('\n## S11 — Other offense levers (constants as shipped)\n');
{
  console.log(mdTable(['lever', 'attacker cost', 'victim damage bound', 'counterplay'], [
    ['slot-lease denial (GEO)', `${fm(computeMinBid('geo'))}+ bid (burned) + ${SLOT_IDLE_FEE_FRACTION * 100}%/30d idle fee; auto-release ${SLOT_IDLE_AUTO_RELEASE_MS / DAY_MS}d; lease term ${LEASE_TERM_MS / DAY_MS}d`, 'one denied build slot at a saturated pool', 'buy the lease on the transfer market; build elsewhere; wait out auto-release'],
    ['governor freight toll', 'zone-influence investment to win governorship', `${(FREIGHT_TOLL_MAX * 100).toFixed(1)}% of cargo value, capped ${fm(FREIGHT_TOLL_CAP_PER_DISPATCH)}/dispatch, ${fm(10_000_000)}/sync server credit cap`, 'alternate routes; vote the governor out; alliance trade treaty (-50%)'],
    ['cornering intel report', `${fm(STANDING_DEMAND_REPORT_FEE)}/pull + market_microstructure tech`, 'info only — aims a corner', 'cornering alert fires at 40% of 7d volume; switch supply policy local; Earth import ×2.5'],
    ['espionage products', '$5-100M base + net-worth-bracket scaling (espionage-system.ts)', 'info only (POLICY.md: zero target-side harm)', 'security levels 1-10 ($0.5M-1B/mo) raise detection'],
  ]));
}

console.log('\ndone.');
