/**
 * Regression tests for docs/RESOURCE_CLAMP_FALSE_POSITIVE_AUDIT.md.
 *
 * Each test builds an HONEST post-inflow player state — a legitimate,
 * non-cheating resource gain via a real game mechanism (market purchase,
 * building decommission, freight arrival, contract reward, active
 * crafting, faction-license delivery, standing-directive auto-restock) —
 * and asserts what `computeResourceCeilings` / `clampResources` currently
 * do with it.
 *
 * A test marked `TODO_ENFORCE` documents a REAL false-positive gap: the
 * ceiling formula has no term that covers this inflow (see the audit doc's
 * "Root cause" sections), so `clampResources` would silently delete the
 * player's legitimate gain in `RESOURCE_CLAMP_MODE=enforce`. These tests
 * assert the CURRENT (wrong) behavior on purpose — do not "fix" them by
 * loosening the assertion. They should start failing, one by one, as each
 * gap in the audit doc's recommendation list is closed; when a test here
 * starts failing, delete its `TODO_ENFORCE` and flip the assertion to
 * "honest claims are no longer clamped."
 *
 * All scenarios use an EMPTY server-flow fixture (no buildings, no
 * services, no research) so `prodMax_r = 0` for every resource under test —
 * the worrying case the audit brief calls out: a resource the player has
 * never held/produced before, where the flat floor (`max(100, 0.25×prev)`)
 * is the ceiling's only term.
 */
import {
  computeResourceCeilings,
  clampResources,
  MAX_ELAPSED_MS,
} from '../resource-plausibility';

const EMPTY_FIXTURE = {
  prevBuildingsData: [],
  prevActiveServices: [],
  prevShipsData: [],
  prevResearch: [] as string[],
};

/** One real minute of wall clock — the steady-state client sync interval,
 *  where `flatFloorScale` has already saturated to 1×. */
const ONE_SYNC_INTERVAL_MS = 60_000;

describe('resource clamp false positives — class D (NOT covered by prodMax or ledgerDelta)', () => {
  // ── D1: market purchase (Root cause 1 — market_trade_buy_goods is a real,
  // money-paid, server-ledgered inflow, but its ledger reason is in
  // CLIENT_APPLIED_LEDGER_REASONS, which is excluded from the pendingRows
  // query that builds `ledgerDeltas` for the ceiling (ledger-reconcile.ts:61-103,
  // sync/route.ts:343-344,498). The clamp never sees the ledger row at all,
  // so a resource the player just BOUGHT with real money is judged only by
  // the flat floor. ──
  it('TODO_ENFORCE (audit D1): buying 30,000 titanium on the open market exceeds the ceiling — a paid-for purchase would be deleted in enforce', () => {
    const report = computeResourceCeilings({
      prevResources: { titanium: 0 },
      ...EMPTY_FIXTURE,
      // market_trade_buy_goods is excluded from pendingRows, so the sync
      // route's ledgerDeltas never contains this leg — modeled here as null,
      // exactly like what the route actually passes.
      ledgerDeltas: null,
      elapsedMs: ONE_SYNC_INTERVAL_MS,
    });
    const ceiling = report.ceilings.titanium;
    const honestClaim = 30_000; // well under the route's own 100,000-unit cap (market/trade/route.ts:214)
    expect(honestClaim).toBeGreaterThan(ceiling); // the gap: a routine purchase already overshoots

    const { clamped, rejected } = clampResources({ titanium: honestClaim }, report.ceilings, report.elapsedMonths);
    // Current (wrong) behavior: the legitimate purchase is silently deleted
    // down to the ceiling, and reported as an "implausible" claim.
    expect(clamped.titanium).toBe(Math.floor(ceiling));
    expect(clamped.titanium).toBeLessThan(honestClaim);
    expect(rejected).toEqual([{ resource: 'titanium', client: honestClaim, ceiling }]);
  });

  // ── D2: building decommission recovery (Root cause 1 variant —
  // building_decommission_recovery is also in CLIENT_APPLIED_LEDGER_REASONS,
  // so a server-computed, server-ledgered 50%-of-cost materials recovery is
  // equally invisible to the ceiling.) ──
  it('TODO_ENFORCE (audit D2): decommissioning a T5 facility recovers 350 titanium (50% of a 700-titanium build cost) — exceeds the ceiling', () => {
    const report = computeResourceCeilings({
      prevResources: { titanium: 0 },
      ...EMPTY_FIXTURE,
      ledgerDeltas: null, // building_decommission_recovery excluded, same as D1
      elapsedMs: ONE_SYNC_INTERVAL_MS,
    });
    const ceiling = report.ceilings.titanium;
    const honestClaim = 350; // DECOMMISSION_RESOURCE_RECOVERY_FRACTION (50%) of a 700-titanium T5 colony facility
    expect(honestClaim).toBeGreaterThan(ceiling);

    const { clamped } = clampResources({ titanium: honestClaim }, report.ceilings, report.elapsedMonths);
    expect(clamped.titanium).toBe(Math.floor(ceiling));
    expect(clamped.titanium).toBeLessThan(honestClaim);
  });

  // ── D3: freight/cargo arrival (Root cause 2 — cargo-logistics.ts's
  // creditArrivalCargo is pure client simulation, never ledgered, and
  // freight is explicitly in resource-flow.ts's OMITTED_CONTRIBUTIONS, so
  // prodMax has zero coverage for it — especially once the producing
  // service (a depleted deposit) is gone.) ──
  it('TODO_ENFORCE (audit D3): a 4-ship Heavy Transport convoy delivers 2,000 units of freight in one tick — exceeds the ceiling once the source mine is decommissioned', () => {
    const report = computeResourceCeilings({
      prevResources: { rare_earth: 0 },
      ...EMPTY_FIXTURE, // no active mining service left — the deposit is exhausted, matching the audit's worked scenario
      ledgerDeltas: null,
      elapsedMs: ONE_SYNC_INTERVAL_MS,
    });
    const ceiling = report.ceilings.rare_earth;
    const honestClaim = 4 * 500; // 4x Heavy Transport, cargoCapacity 500 each (ships.ts:238)
    expect(honestClaim).toBeGreaterThan(ceiling);

    const { clamped } = clampResources({ rare_earth: honestClaim }, report.ceilings, report.elapsedMonths);
    expect(clamped.rare_earth).toBe(Math.floor(ceiling));
    expect(clamped.rare_earth).toBeLessThan(honestClaim);
  });

  // ── D5: static contract reward paid in goods (Root cause 2 — contracts.ts's
  // applyContractReward is pure client simulation, never ledgered; contract
  // deliveries are explicitly in OMITTED_CONTRIBUTIONS.) ──
  it('TODO_ENFORCE (audit D5): completing a contract that rewards 200 iron exceeds the ceiling', () => {
    const report = computeResourceCeilings({
      prevResources: { iron: 0 },
      ...EMPTY_FIXTURE,
      ledgerDeltas: null,
      elapsedMs: ONE_SYNC_INTERVAL_MS,
    });
    const ceiling = report.ceilings.iron;
    const honestClaim = 200; // contracts.ts:144 reward table entry: { iron: 200, aluminum: 100 }
    expect(honestClaim).toBeGreaterThan(ceiling);

    const { clamped } = clampResources({ iron: honestClaim }, report.ceilings, report.elapsedMonths);
    expect(clamped.iron).toBe(Math.floor(ceiling));
    expect(clamped.iron).toBeLessThan(honestClaim);
  });

  // ── D6: real-time crafting/refining output (Root cause 1 variant —
  // client_craft_output IS ledgered, but CLIENT_ATTESTED_LEDGER_REASONS is
  // also excluded from pendingRows by design, so the ceiling never sees it;
  // resource-flow.ts's OMITTED_CONTRIBUTIONS explicitly excludes "refining
  // and crafting jobs" from prodMax too. Phase 2 already has the right
  // allowance (computeCraftAttestationCaps / craft_r) but phase 1 doesn't
  // reuse it — see the audit doc's recommendation #2.) ──
  it('TODO_ENFORCE (audit D6): an extended sync gap during sustained active crafting (13 completions x10 rocket_fuel) exceeds the ceiling', () => {
    const delayedSyncMs = 15 * 60_000; // a 15-minute sync gap (network hiccup / backpressure), tick loop keeps crafting locally throughout
    const report = computeResourceCeilings({
      prevResources: { rocket_fuel: 0 },
      ...EMPTY_FIXTURE, // no fabrication buildings in the SERVER-KNOWN row — prodMax has no "production" term for rocket_fuel either
      ledgerDeltas: null, // client_craft_output excluded from pendingRows (ledger-reconcile.ts CLIENT_ATTESTED_LEDGER_REASONS)
      elapsedMs: delayedSyncMs,
    });
    const ceiling = report.ceilings.rocket_fuel;
    const honestClaim = 130; // 13 completions (floor(900s / 69.2s effective) with 3 fab buildings) x 10 units/batch
    expect(honestClaim).toBeGreaterThan(ceiling);

    const { clamped } = clampResources({ rocket_fuel: honestClaim }, report.ceilings, report.elapsedMonths);
    expect(clamped.rocket_fuel).toBe(Math.floor(ceiling));
    expect(clamped.rocket_fuel).toBeLessThan(honestClaim);
  });

  // ── D7: faction-license recurring delivery (Root cause 2 variant — this
  // one is a genuine per-month RATE, unlike the others, but xenogenic_biomatter's
  // license delivery lives entirely outside resource-flow.ts's four FlowKinds,
  // so it never reaches prodMax at all, even though it accrues continuously
  // like mining does.) ──
  it('TODO_ENFORCE (audit D7): a 30-day-offline Hive biomaterial license delivery (~205 units at max automation) exceeds the ceiling', () => {
    const report = computeResourceCeilings({
      prevResources: { xenogenic_biomatter: 0 },
      ...EMPTY_FIXTURE, // the licence itself is client-only state (not in prevActiveServices/prevBuildingsData), so prodMax sees nothing
      ledgerDeltas: null,
      elapsedMs: MAX_ELAPSED_MS, // the plausibility clamp's own 30-day cap — a returning player after the longest legitimate absence
    });
    const ceiling = report.ceilings.xenogenic_biomatter;
    const honestClaim = 205; // away-ops weighted-tier delivery at max automation investment, biomaterialPerMonth capped at 4 (factions.ts:474)
    expect(honestClaim).toBeGreaterThan(ceiling);

    const { clamped } = clampResources({ xenogenic_biomatter: honestClaim }, report.ceilings, report.elapsedMonths);
    expect(clamped.xenogenic_biomatter).toBe(Math.floor(ceiling));
    expect(clamped.xenogenic_biomatter).toBeLessThan(honestClaim);
  });

  // ── D9: standing-directive auto-restock (Root cause 3 — unlike D1-D8, the
  // server never even LEARNS this happened: state.standingDirectives is not
  // synced at all (absent from prisma/schema.prisma, sync-validation.ts, and
  // the sync route body), so there is no ledger row to exclude and no
  // content table to derive an allowance from. standing-directives.ts's
  // auto_restock branch (:144-162) is a pure client reducer, called from
  // BOTH the live monthly tick (game-engine.ts:1520, fires every 6 real
  // hours the tab is open — no offline/away trick needed) and away
  // catch-up (away-operations.ts:449).) ──
  it('TODO_ENFORCE (audit D9): a fully-paid $500M auto-restock order (100,000 iron, 2 months to fill via the live tick alone) exceeds the ceiling by ~1000x', () => {
    const report = computeResourceCeilings({
      prevResources: { iron: 0 },
      ...EMPTY_FIXTURE, // no iron-producing service — prodMax has no term for it, same as the standing directive's own target resource
      ledgerDeltas: null, // no server route is ever called — nothing to ledger, unlike D1/D2/D6
      elapsedMs: ONE_SYNC_INTERVAL_MS,
    });
    const ceiling = report.ceilings.iron;
    const honestClaim = 100_000; // targetStock 100_000, maxUnitsPerMonth 50_000, filled over 2 live monthly ticks, $500M spent
    expect(honestClaim).toBeGreaterThan(ceiling);

    const { clamped, rejected } = clampResources({ iron: honestClaim }, report.ceilings, report.elapsedMonths);
    expect(clamped.iron).toBe(Math.floor(ceiling));
    expect(ceiling).toBeLessThan(200); // the ceiling is a small flat-floor figure, nowhere near 100,000
    expect(rejected).toEqual([{ resource: 'iron', client: honestClaim, ceiling }]);
  });

  it('TODO_ENFORCE (audit D9): even a single month of the same directive (50,000 iron) already dwarfs the ceiling on its own', () => {
    const report = computeResourceCeilings({
      prevResources: { iron: 0 },
      ...EMPTY_FIXTURE,
      ledgerDeltas: null,
      elapsedMs: ONE_SYNC_INTERVAL_MS,
    });
    const { rejected } = clampResources({ iron: 50_000 }, report.ceilings, report.elapsedMonths);
    expect(rejected.length).toBe(1);
    expect(rejected[0].ceiling).toBe(report.ceilings.iron);
  });

  // ── D10: guaranteed survey-discovery reward (Root cause 2 — this is a
  // DIFFERENT table from the anomaly claim-stake system: rollDiscovery()
  // (exploration.ts:285-301) returns { survey, anomaly } from two
  // independent rolls. Only `anomaly` (buildRewards()) never populates
  // `.resources` and is genuinely dead. `survey` (SURVEY_DISCOVERIES,
  // e.g. "Iron Oxide Megadeposit" -> { iron: 500 }) IS applied,
  // unconditionally, on every completed survey, via routeProductionCredit
  // at game-engine.ts:2404-2413 — no claim-staking required, no ledger,
  // and explicitly named in resource-flow.ts's OMITTED_CONTRIBUTIONS
  // ("Survey discoveries ... — random, resolved when they happen"). ──
  it('TODO_ENFORCE (audit D10): the guaranteed "Iron Oxide Megadeposit" survey reward (500 iron, 100% hit rate on that roll) exceeds the ceiling', () => {
    const report = computeResourceCeilings({
      prevResources: { iron: 0 },
      ...EMPTY_FIXTURE, // no iron mining elsewhere — prodMax has no term for it
      ledgerDeltas: null, // routeProductionCredit is a pure client-tick mutation, never ledgered
      elapsedMs: ONE_SYNC_INTERVAL_MS,
    });
    const ceiling = report.ceilings.iron;
    const honestClaim = 500; // SURVEY_DISCOVERIES.mars_surface, "Iron Oxide Megadeposit" (exploration.ts:89): { iron: 500 }
    expect(honestClaim).toBeGreaterThan(ceiling);

    const { clamped, rejected } = clampResources({ iron: honestClaim }, report.ceilings, report.elapsedMonths);
    expect(clamped.iron).toBe(Math.floor(ceiling));
    expect(clamped.iron).toBeLessThan(honestClaim);
    expect(rejected).toEqual([{ resource: 'iron', client: honestClaim, ceiling }]);
  });
});

describe('resource clamp — sanity: class A/B inflows are NOT false positives (control group)', () => {
  it('an order-book buy fill (class B) is fully covered because it is NOT in the excluded-reasons set', () => {
    // order_resource_credit is not in CLIENT_ATTESTED_LEDGER_REASONS or
    // CLIENT_APPLIED_LEDGER_REASONS, so it flows through ledgerDeltas
    // untouched, exactly like the fixture in resource-plausibility.test.ts.
    const report = computeResourceCeilings({
      prevResources: { helium3: 0 },
      ...EMPTY_FIXTURE,
      ledgerDeltas: { helium3: 5_000 }, // a large resting-order fill, credited via order_resource_credit
      elapsedMs: ONE_SYNC_INTERVAL_MS,
    });
    const { clamped, rejected } = clampResources({ helium3: 5_000 }, report.ceilings, report.elapsedMonths);
    expect(clamped.helium3).toBe(5_000);
    expect(rejected).toEqual([]);
  });
});
