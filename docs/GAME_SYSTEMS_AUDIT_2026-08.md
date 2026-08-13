# Space Tycoon — Game Systems Audit & Redesign Spec

**Date:** 2026-08-13 · **Auditor:** lead game design review (full engine + API + UI trace)
**Question from the founder:** *Do all of the playable systems wire together? Does every part of the game contribute or have a purpose? Does everything flow well? Redesign so it plays like a modern MMO space strategy game.*

**Scope read:** `src/lib/game/*.ts` (~27k lines, 70 modules), `game-engine.ts` processTick/processFullTick, all 27 route trees under `src/app/api/space-tycoon/`, `src/app/space-tycoon/page.tsx` (36 tabs), `src/components/game/` (70 panels), `prisma/schema.prisma`, CLAUDE.md principles, SESSION_DESIGN.md, BALANCE.md, NPC_BACKDROP.md, STATS_DESIGN.md.

**Concurrent work noted (do not collide):** `src/lib/game/expeditions.ts` (49KB, untracked) plus mods to `game-engine.ts`/`types.ts`/`ships.ts`/`resources.ts`/`save-load.ts` landed mid-audit — the interstellar expedition engine (Wave 10). Its engine half is wired into `processFullTick` and writes back into the solar resource pool; **no UI imports it yet**. This spec treats it as in-progress and only specifies its integration points (§D-6), not its design.

---

## Executive verdict

Space Tycoon is **two games occupying one codebase**:

1. **A healthy solo idle-tycoon core.** `processTick` cleanly integrates ~20 modules — services, buildings, research, workforce payroll, commanders, legacy, corp tiers, reputation, megastructures, delivery contracts, frontier, timed/random events. The balance waves (saturation, overhead, exec comp, broker fee, commander caps) are real and tested. This loop works.

2. **A large, mostly-disconnected shell of MMO-strategy systems.** Roughly **half the game's surface area produces outputs nothing consumes**: espionage intel grants dead rewards, territory governorship confers zero benefit, victory/specialization bonuses are display-only, leagues pay a fraction of their defined rewards, seasons and alliance events can never contain content, hazards can mathematically never destroy anything, ships transport nothing, colonies produce nothing, subsidiaries are a $66B purchase of a fake readout, and the entire alliance bonus pipeline is severed one hop before the player's tick.

3. **The multiplayer economy is nullified by client-authoritative sync.** The server has a genuinely good MMO skeleton — a FIFO order book with escrow, contested zones, competitive bidding with collateral, leagues with promotion/demotion, espionage against real player profiles. But `sync/route.ts` overwrites server-side `GameProfile.money` with the raw client value every 60 seconds, so **every server-side debit and credit (order escrow, bid collateral, mega-project contributions, alliance treasury deposits, bounty payouts) is erased within a minute**. There are two disjoint economies and the multiplayer one is write-only.

The redesign is therefore **not** "build new systems." It is: **pick one wallet, wire the ~25 dead outputs that already exist, cut the true corpses, and surface the multiplayer world that the server already simulates.** Value-to-effort here is extraordinary — most of the top-10 changes below are S/M efforts because the hard half already exists.

---

## 1. WIRING AUDIT — dependency matrix

Legend: 🟢 ticked by `game-engine.ts` · 🟡 ticked by `page.tsx` useEffect · 🔵 server route/cron only · 🔴 never executed / UI-click only.

### 1a. The healthy core (consumes and produces, both sides wired)

| System | Consumes | Produces → consumed at | Tick |
|---|---|---|---|
| Services/buildings | buildings, research, power, saturation | revenue/costs → `game-engine.ts:148-227` | 🟢 |
| Research tree | completedResearch | 4 of 6 effect types applied (`:154,:223,:259,:340`) | 🟢 |
| Workforce | workforce counts | 5 of 9 bonus keys applied; payroll `:102` | 🟢 |
| Commanders | hiredCommanders, tier hire cap | 4 of 5 bonus keys applied (`:160,:237,:259,:340`) | 🟢 |
| Legacy system | buildings/research/contracts/ships trackers | **all 6 bonus keys live** — healthiest progression system | 🟢 |
| Corp tiers | 7-dimension progress check | maintenance/revenue/mining bonuses, slots, **tab gating** (`page.tsx:72`) | 🟢 |
| Reputation | building/research/contract/megastructure completions | 5 of 6 bonus keys applied | 🟢 |
| Personal megastructures | money, resources, research | bonuses + passive income, fully wired | 🟢 |
| Delivery contracts | faction rep (pool weighting), frontier (1.25×) | money, faction rep deltas | 🟢 |
| Random events | state | money/resources/multipliers + choice modal | 🟢 |
| Timed events | state progress fns | cash reward paid `:1096` (boostReward dead, see 1c) | 🟢 |
| Frontier | net worth, age | hazard shield (`:536`), auto-graduation (`:548`), delivery bonus | 🟢 |
| Speed boosts | activeBoosts | build/research speed | 🟢 |
| Milestones (global) | state vs claimedMilestones | cash + first-claim race (server `milestones` route, unique index) | 🟢 |
| Order book (server) | MarketLimitOrder rows | FIFO matching, escrow, price candles, **moves shared spot price** | 🔵 |
| Bidding (server) | BiddingContract, econ phase, reputation | 70/15/15 price/rep/speed scoring, collateral, graduated penalties | 🔵 |
| Zones (server) | synced buildings/services per zone | influence shares, governor flag, challenges | 🔵 |
| Alliances (server) | membership, treasury, XP, research | shared treasury, alliance research/perks/projects/diplomacy/wars | 🔵 |

### 1b. Wired on the consume side, DEAD on the produce side (the "fake shop" ring)

These systems take real player money/time and return nothing mechanical:

| System | The player pays… | The promised output | Where it dies |
|---|---|---|---|
| **Subsidiaries** | up to ~$66B (`subsidiaries.ts:259,311` — money IS deducted) | "$X/month income" + synergy service bonus | `getTotalSubsidiaryIncome`/`getSubsidiaryServiceBonus` read only by `SubsidiaryPanel.tsx:107,233` — never by engine. Income is fictional. |
| **Specializations** | tier purchase costs + respec fee (`specializations.ts:388`) | 10 bonus keys (`launchRevenue`…`allRevenue`) | `getSpecializationBonuses` has exactly one consumer: `SpecializationPanel.tsx:217` (display). Engine never imports it. |
| **Modules** | module purchase (`modules.ts:204`) | +30% mining laser, cargo bays, shielding | `getEffectiveShipStats` called only by `ModulesPanel.tsx:233`. Engine reads raw `shipDef.miningRate` (`game-engine.ts:756`); hazards read base stats. File admits it at `modules.ts:91-93`. |
| **Espionage** | $5M–$100M per action (`espionage-system.ts:299`, charged server-side) | intel + `reward`/`bonusType` perks (fee discounts, hire discounts, counter-intel) | `EspionageMission.reward` persisted (`execute/route.ts:318`) and never consumed. `ESPIONAGE_REPUTATION_EVENTS` zero consumers. Espionage is a paid read-only telescope. |
| **Victory conditions** | months of play toward 11 endgame victories | `getVictoryBonuses` (4 multiplier keys) | Consumed only at `VictoryPanel.tsx:176` for display. Engine never imports the module. |
| **Territory/zones** | build-out to win governorship | `getGovernorBenefits` (tax up to $200M/mo), `getStakeholderServiceBonus`, `getChallengerBonus` | All three defined in `zone-influence.ts:431-463`, **never called anywhere**. `TerritoryPanel.tsx:600` renders "Governor Benefits (Active)" for benefits that don't exist. |
| **Leagues** | weekly competition | cash + title + **rank boosts** | Cash/title paid (`process-week/route.ts:154-169`) but `boostType/boostMultiplier/boostDurationSeconds` (`league-system.ts:244-264`) never create an ActiveBoost. |
| **Seasons** | season grind | tier rewards, `eventTokens`, cosmetics | `SeasonalEvent` rows are **never created** (no cron/seed/admin route) → permanently empty. `eventTokens` written once, spendable on nothing. `seasons/progress` has zero callers. |
| **Alliance events** | daily tasks | alliance event brackets | `AllianceEvent` rows never created; `/contribute` has zero callers. Only the daily-task half works. |
| **Rivals** | attention | rivalry score/streak vs real players | No reward path of any kind (`grep reward|money|boost api/space-tycoon/rivals` → zero). Pure leaderboard text. |
| **Archetypes** | one-time choice | divergent start (real) + identity | `startingArchetype` written (`archetypes.ts:157`), read by nothing — no conditional content ever references your origin. |

### 1c. Dead outputs on otherwise-live systems (each is a one-place wiring fix)

- `commanders.ts:40` `marketPriceMultiplier` (Magnate class) — never cuts the broker fee; 3 of 6 commander classes are mechanically identical.
- `workforce.ts` `buildSpeed` (engineers' headline bonus!), `contractPayBonus`, `hazardMitigation`, `crewSurvival`, `shipEfficiency` — 4 of 8 worker types are payroll-only.
- `research-tree.ts:501-502` `buildCostReduction` + `buildSpeedBonus` — the **largest keyword bucket** in effect inference (all "cost"/"speed"/"build time" research + categories rocketry/propulsion/infrastructure/crew/ships) produces nothing. Also `research_queue_2` unlock (`:105`) gates nothing.
- `reputation.ts:61` `contractRewardMultiplier` (up to +60%) — applied to no contract payout. `REPUTATION_POINTS.milestone_claimed`/`.achievement_earned` never passed to `addReputation`.
- `timed-events.ts:30` `boostReward` — copied into state, never granted on completion (`game-engine.ts:1048-1061` pays cash only).
- `mini-activities.ts` bonus types `mining_boost`/`research_speed` silently dropped (`page.tsx:1108` branches only on `resource_find`, and hardcodes iron regardless of flavor).
- `speed-runs.ts` rewards grant `legacyPoints` — **a field that does not exist on the live LegacyState** (only on deprecated PrestigeState). `.title`/`.badge` have no redemption path.
- `factions.ts:29` `alignedClass` — the commander↔faction link is self-documented "future".
- `quarterly-reports` — generated on cadence (`page.tsx:1057`), read by nothing downstream (no tier/rep/league/NPC input).
- `alliance-projects.ts:186` `splitProjectRevenue` — zero callers; completed alliance projects never pay out.
- `economy-report.ts` `computeEconomyReport` — the canonical P&L implementation, used only by quarterly reports + weekly blog cron. **DashboardPanel recomputes its own parallel `financials`** that can silently drift.

### 1d. Structurally unreachable code (bugs, not just gaps)

1. **Hazards can never destroy anything.** `destroyed = finalDamage >= 0.95` (`hazards.ts:126,151`) but `BASE_DAMAGE_RANGE` maxes at **0.50** (pirate_raid) *before* mitigation subtracts. → destruction branch (`:212-230`) unreachable → **insurance never pays**, no asset ever takes damage, and every shielding/pointDefense/stability stat modifies a number with no effect. Hazards are a decorative notification system, violating CLAUDE.md "no combat — but real risk."
2. **Workforce morale is an orphan input pinned at a hidden −20% tax.** `morale`/`fatigue`/`trainingLevel`/`trainingBudgetPerCrew` are read (`workforce.ts:132-136`) and rendered (`WorkforcePanel.tsx:24-26`) but **no writer exists**. `moraleMultiplier` is permanently 0.8 at `game-engine.ts:164` — an undiscoverable, unfixable revenue penalty.
3. **Tier 7 requires the deprecated prestige path.** `corporation-tiers.ts:157,:277` requires `prestige.level ≥ 1`, but prestige is deprecated (`types.ts:380`), migrated away (`save-load.ts:163`), and only writable via a save-wiping modal. The end-game gate (and the only T7 unlock, `interstellar`) hangs off a system the game has abandoned. Speed-run brackets have the same dependency.
4. **NPC market pressure is a write-only accumulator.** `applyNPCMarketActions` writes `state.npcMarketPressure` every tick (`game-engine.ts:630`); zero readers. The entire NPC buy/sell tuning ("gentle nudges, not crashes") is inert — contradicting NPC_BACKDROP.md's claim that NPC actions move prices.
5. **Mining never moves prices.** `sync/route.ts:122-141` applies `minedThisTick` pressure but `useGameSync.ts:48-79` never sends it; `market/mining-pressure` route has no caller. "Mass extraction depresses prices" (CLAUDE.md) is entirely inert.
6. **Market events are flavor text.** `getMarketEventMultiplier`/`isMarketEventExpired` (`market-events.ts:97,92`) have zero callers. "Helium-3 ×2.0" never touches a price.
7. **Milestone NPC-claim branch unreachable** — `checkMilestones` only returns `isPlayer: true`; the "an NPC beat you" event (`game-engine.ts:657-662`) can never fire.

### 1e. Entirely dead files (zero importers, verified by grep)

| File | Lines | Content |
|---|---|---|
| `economic-sinks.ts` | ~305 | Empire overhead scaling, **insurance premiums, resource decay, economic disasters, resource-gated T6 construction, reserve requirements** — the designed anti-inflation economy |
| `catchup-mechanics.ts` | — | Pioneer bonus, newcomer multiplier, research discounts — the entire late-joiner design |
| `refining.ts` | — | Duplicate of the wired `production-chains.ts` |
| `research-generator.ts` | ~23KB | Parallel research tree superseded by `research-tree.ts` |
| `modular-construction.ts` | 625 | Station hulls/modules; name-collides with `modules.ts` on `ModuleDefinition` |
| `corporate-governance.ts` | — | Treasury, dividends, roles, acquisitions. `state.corporateTreasury`/`dividendHistory` written by nothing, read by nothing |
| `cosmetic-shop.ts` | 179 | Skins/themes/badges/emotes — no shop UI. (Keep: this is the no-P2W monetization surface. See D-5.) |
| `subscriber-perks.ts` | — | Pro-subscriber perks never enforced — free and Pro players are mechanically identical |

Also dead within live files: `market-engine.ts` `calculateIdleDecay`/`getSupplyAdjustedPrice`/`getAvailableForPurchase`; `colonies.ts` `COLONY_BUILDINGS`/`COLONY_SERVICES`/`COLONY_MINING_PRODUCTION`/`SUPPLY_CHAIN_DEPENDENCIES` (colony building/service IDs verified absent from `BUILDING_MAP`/`SERVICE_MAP` — **unlocking Mercury/Venus/Ceres spends money and produces nothing**); `economic-systems.ts` `SUPPLY_CHAIN_NODES`/`CHOKEPOINT_LOCATIONS`/tech-licensing/`GOVERNMENT_CONTRACTS` (no bidding mutator, admitted in `EconomyPanel.tsx:292`); `interstellar.ts` everything beyond map display (header admits "engine integration deferred" — now being closed by the in-flight expeditions.ts).

---

## 2. PURPOSE AUDIT — what decision does each tab own?

36 tabs (all reachable; `GameTab` ↔ `TAB_CATALOG` ↔ render branches all consistent). Classification:

**Decision-owning and real (13):** build, research, map (unlock/build/sell/dispatch), contracts, market, fleet, crafting, workforce (hire), commanders, factions (envoys), diplomacy (delivery accept/deliver), megastructures, futures (real but exploitable, §5).

**Decision-owning but the decision is fake (4):** subsidiaries, specialization, modules (pay real money, get display-only output — worse than read-only because it *punishes* engagement), discoveries (stake-claim is real but the discovery source is a dev button — `rollAnomalyDiscovery` is never called by the survey pipeline, which uses `ships.ts:rollSurveyDiscovery` instead).

**Read-only displays (17):** dashboard, services, reports, spatial, economy, intelligence, bounties¹, rivals, leagues, bidding¹, megaproject¹, victory, espionage¹, territory, speedruns, seasons, interstellar, leaderboard. (¹ these four POST to the server, but the two-wallet split (§4) makes the outcomes invisible/erased.) Three panels (`MarketIntelligencePanel`, `RivalsPanel`, `LeaguePanel`) receive no props at all.

**Redundancy — multiple tabs owning the same decision:**
- **Four contract systems:** `contracts` (static 17-entry pool, no rep/faction/market inputs), `diplomacy` (faction delivery contracts — responsive, good), `bidding` (competitive server contracts — responsive, good), and unwired `competitive-contracts` (server route with zero client callers). Two of these own the decision well; two are noise.
- **Three standings tabs:** leaderboard, rivals, leagues all answer "how do I compare?" — only leagues has stakes.
- **Three market-intel tabs:** intelligence, economy, futures + the market tab's own charts.
- **Two research trees** (research-tree.ts live, research-generator.ts dead), **two refining systems** (production-chains live, refining dead), **two module systems** (modules.ts semi-live, modular-construction dead), **two prestige systems** (legacy live, prestige deprecated-but-load-bearing).
- **Spatial vs territory vs map:** spatial is advisory charts about geography the engine ignores (orbital slot pools gate nothing — `page.tsx:765` never consults `ORBITAL_SLOT_MAP`; lane delta-v unused by travel).

**Tier gating observations:** the T5–T6 unlock band (leagues, bidding, victory, espionage, territory, speedruns, seasons) is **entirely read-only or broken** — the tiers that should unlock the corporate-PVP endgame unlock spectator screens. `interstellar` is T7-only ($50T + deprecated prestige) yet the galactic map layer is browsable at T1 and `onNavigateTab('interstellar')` bypasses the gate (no validation in `setTab`). `megastructures` listed in both T5 and T7 (dedupe no-op).

---

## 3. FLOW / TEMPO AUDIT

**First 10 minutes (good):** archetype pick (real divergence) → tutorial → build pad → first research → first service auto-activates → contracts. Tactical loop is dense and honest. Frontier shields hazards. Verdict: the on-ramp works; the SESSION_DESIGN concern about tier-3 gating the market backbone behind 2–4 hours stands but is a tuning knob.

**Day 7 (the cracks):** player hits T4–T5. New tabs unlock at ~1/session — but they unlock *spectator screens* (see §2). The daily loop is over-served (contracts refresh, daily bonus, mini-activities, timed events every 2h, commander pool 8h) while the weekly loop is hollow: league rewards pay a rounding-error cash amount and drop their boosts, seasons are empty, weekly challenges (`WEEKLY_CHALLENGES`) have no scoring or payout. A player's week has no arc.

**Day 30 (the wall):** money loses meaning (§5) — the only recurring sinks scale sublinearly against a ~14-multiplier compounding revenue product. Hazards can't hurt you, so insurance/redundancy decisions don't exist. Subsidiaries/specializations/modules turn out to be fake. Quarterly report #1 generates… a screen. Interstellar is behind an unreachable gate. The monthly and campaign loops that CLAUDE.md demands are display-only. **The player runs out of meaningful decisions at roughly the moment the game's fiction says they're becoming a megacorp.**

**Loop coverage vs CLAUDE.md:** tactical ✅ over-served · daily ✅ over-served · weekly 🔴 (stakes-free) · monthly 🔴 (quarterly reports display-only) · campaign 🟡 (legacy works; interstellar in-flight; victory/megastructure bonuses dead).

**Map-first interface:** `MapCommandCenter` owns 3 real decisions (unlock, build-in-place via embedded BuildPanel — genuinely good, sell) + dispatch (which transports nothing; the map's dispatch signature has **no cargo parameter**, `MapCommandCenter.tsx:27`). The Order Queue HUD is a passive view — no cancel/rush/reprioritize, and misses in-progress upgrades. The galactic layer has no jump button (honest "engine gap" disclaimer at `MapContextPanel.tsx:452` — expeditions.ts will need this). Mining/survey/scrap remain Fleet-tab-only even though the map knows `shipsHere`. Map selection state resets on every tab switch (component unmounts). Verdict: **the map routes to ~40% of the decisions that matter.** For a map-first game it must own dispatch-with-cargo, mining/survey start-stop, expedition launch, and hazard/anomaly/rival-presence overlays.

---

## 4. MMO-NESS AUDIT

### What is genuinely multiplayer (server-backed, cross-player)

| System | Cross-player mechanism | Status |
|---|---|---|
| Limit order book | Your order fills against another player's; escrow; shared candles; fills move global spot | **Best MMO system in the game** — nullified by the wallet bug |
| Market spot prices | One shared `MarketResource` row per commodity; trades move it for everyone | Live (but `market/trade` is unauthenticated — anyone can `curl` prices up/down, no session check, `trade/route.ts:21`) |
| Service price multipliers | Global instance counts across all profiles → revenue multiplier | Live, wired end-to-end (`sync/route.ts:355-373` → `game-engine.ts:133`) — but very weak (10,000 global instances = ×0.80) |
| Zones/territory | Influence shares vs other players, governor challenges | Live server-side; benefits never applied (§1b) |
| Bidding | One winner per contract vs other players' composite scores | Live; collateral/payout erased by wallet bug |
| Leagues | Real brackets, promotion/demotion, weekly cron | Live; boosts dead |
| Alliances | Shared treasury/research/projects/diplomacy/wars, cron | Live server-side; **bonuses never reach the client tick** — `sync` aggregates `allianceBonuses` (`route.ts:250-300`) but `useGameSync.ts:100-105` only pipes `servicePriceMultipliers` + `globalMilestones` through |
| Espionage | Targets are real GameProfiles in ±1 net-worth bracket | Live; read-only by design; target never notified; rewards dead |
| Rivals | Real profiles synced in last 14d | Observational only; degrades below 5 active profiles |
| Global milestones | First-claim race, DB unique index | Live; but client fire-and-forgets the POST and ignores `claimedBy` (`page.tsx:884`, `.catch(() => {})`) |
| Colonies (server) | Finite slots per location, first-come | POST fire-and-forget; **GET never called** — "location full (50/50)" never reaches the player; client unlocks regardless |
| Mega-projects | Global goal, all players fund | Wrong wallet; no cron advances phases; needs manual seed script |
| Speed-runs | Bracketed leaderboards, suspicion scoring | Live |
| Chat | — | **Module-level array** (`chat/route.ts:18`) — per-lambda, wiped on deploy; two players can be on different instances and never see each other |

### The two-economies problem (the single deepest defect)

`GameState` lives in localStorage (client-authoritative; `exportSave` is plain `btoa(JSON)` — trivially editable). `GameProfile` (Prisma) stores a flattened projection. `sync/route.ts:98-110` does `update: { money: <client value>, ... }` every 60s. Meanwhile **eight server routes debit/credit `GameProfile.money`** (order escrow/fills, bid collateral/payouts, mega-project and alliance-project contributions, treasury deposits, espionage costs, bounty payouts) and **no client panel deducts locally** (they receive `state` without a setter). Net effect:

- Placing a limit order, locking bid collateral, funding a mega-project, or depositing to the alliance treasury **costs nothing** — the money reappears at next sync.
- Winning a bid, getting an order filled, or receiving a bounty payout **pays nothing** the player can see.
- Bounty fills additionally never debit the poster at all (payout returned in JSON, nobody credited/debited).

Until one wallet wins, every multiplayer mechanic is theater. This is also the anti-cheat surface: client-authoritative money + editable saves + unauthenticated `market/trade` violates every POLICY.md simulation-integrity commitment.

### Where a player currently FEELS other players
Order book fills, shared spot price movements, league brackets, zone influence bars, bidding losses. That's it — and three of those are invisible/erased by the wallet bug. Meanwhile the server already produces everything needed to feel inhabited and **the client never renders it**: `game-state` route (world map: who colonized what, top-50 players + locations) has **zero callers**; `activity` route (global feed, actively written by 6 routes) has **zero callers**; `competitive-contracts` (limited-winner races) has **zero callers**; colonies GET never called. The world is simulated and unshown.

---

## 5. ECONOMY INTEGRITY AUDIT

### Does supply/demand actually move prices?
**Yes for explicit trades; no for everything else.** The math is real (no RNG in the price path): trade impact `newPrice = p × (1 ± qty × vol²)` (`market-engine.ts:23`, note the in-file "Balance Reference" comment doesn't match the actual algebra) plus scarcity multiplier `clamp(√(baseline/supply), 0.3, 10)` (`:106`), both wired through `market/trade` and the order book. But: mining doesn't move prices (§1d-5), NPC activity doesn't (§1d-4), market events don't (§1d-6), and **there is no idle mean-reversion** — `calculateIdleDecay` has zero callers and no cron touches `currentPrice` (hourly restock touches supply only). A dumped price stays dumped forever. High-volatility commodities are absurdly twitchy (100 units of helium-3 = 144% move → instant floor).

### Money sources vs sinks
**Sources:** service revenue (dominant — base × ~14 stacking multipliers, `game-engine.ts:148-166`), contracts (static pool $50M–$2B; deliveries `basePrice×qty×factionMult`; bidding), market/order sales, milestones, timed events (2h cadence), daily login ($10M→$200M, cycles forever, localStorage-only), offline income (floor at 0 — can never be negative), survey/anomaly rewards, mega/passive income, league cash, building/ship salvage.

**Recurring sinks (all wired):** payroll, operating costs (~30-40% of gross), maintenance (charged per tick — verified), corporate overhead `100K×n^1.4`, exec comp `0.03%/mo` above $100M, fleet maintenance. **Player-action sinks:** construction (1.15^count scaling), ships, unlocks, hires, severance, market buys, commanders, modules, subsidiaries, respecs, envoys, espionage, futures margin, order escrow.

### Inflation verdict: **yes, unbounded.**
Revenue compounds multiplicatively across legacy × tier × megastructures × reputation × commanders × research × workforce × upgrades × station bonus; the only two *scaling* recurring sinks are sublinear against it (overhead at 100 buildings ≈ $63M/mo vs $5–15B/mo revenue; exec comp = 0.36%/yr — outrun by any empire earning >0.36% on net worth). Late-game spend is one-time only (megastructure phases $30–200B, mega-project phases $50–500B) — once bought, nothing left. The three systems designed to fix this (`economic-sinks.ts`: insurance premiums, resource decay, disasters, reserve requirements, resource-gated T6 construction with `canBuyOnMarket:false`) are **all orphaned**. Losses are floored (`money` clamped at −$50M; offline income at 0), gains are not capped.

### Active money-printer exploits
1. **Futures strike is player-typed and unvalidated** (`FuturesPanel.tsx:157` checks `strike ≥ 1` only; `market-depth.ts:99/:137`). Short iron at strike $50M vs $5K spot: post $5B margin → guaranteed **$55B** at settlement, every 6h, entirely client-side. `validatePriceBand` exists in `market-orderbook.ts:35` and is simply not reused.
2. **Daily bonus** is localStorage-only, resettable, cycles to $200M/week floor forever.
3. **Ship cargo asymmetry**: dispatch never deducts cargo at origin; arrival adds `route.cargo` to the pool (`game-engine.ts:773-777`). Currently unreachable (both call sites pass `{}`) but is a dup-exploit landmine the moment cargo UI ships.
4. **Delivery contracts price off static `baseMarketPrice`, not spot** — crash the market, buy cheap, fill contracts at base rates.
5. **Client-authoritative sync + btoa saves** — the meta-exploit over everything.

---

# REDESIGN SPEC

Principles applied: CLAUDE.md (meaningful decisions, realistic economics, corporate PVP core, real risk, time-loop tempo, NPC backdrop, intelligence-as-gameplay, no-P2W) + the audit above. Each item: **what / why / effort (S ≤½day, M 1-3d, L 1-2wk) / files**.

## (a) REWIRE existing systems — highest value-to-effort

**A1. One wallet: server ledger reconciliation.** Stop `sync` overwriting `money` with the raw client value. Server keeps a per-profile `LedgerEntry` table (or delta fields) for every server-side debit/credit (orders, bids, mega-projects, treasury, bounties, espionage); sync response returns unapplied deltas; client applies them into `GameState.money` and acks; sync request sends *earned/spent deltas since last sync* rather than absolute money (server clamps against plausibility). This makes every existing multiplayer mechanic real without rewriting the client-authoritative tick. **Why:** §4 — nothing multiplayer matters until this lands; also the POLICY.md integrity floor. **Effort: M.** Files: `sync/route.ts`, `useGameSync.ts`, `page.tsx:685`, `prisma/schema.prisma`, the 8 debiting routes (no change to debit logic — they already do it right).

**A2. Alliance bonus pipe-through (3-line class of fix).** `useGameSync.ts:100-105` already receives `allianceBonuses` from sync — pipe it into `onServerData`, store on state (like `servicePriceMultipliers`), multiply into the tick next to tier bonuses. Include `alliance-diplomacy.getDiplomacyBonuses` in the sync aggregate. **Why:** the entire alliance progression (research, perks, projects, tiers) currently buys nothing — the corporate core loop of the game. **Effort: S.** Files: `useGameSync.ts`, `page.tsx`, `game-engine.ts`, `sync/route.ts`, `types.ts`.

**A3. Wire the dead-multiplier pack into `processTick`.** One engine pass adding: `getSpecializationBonuses`, `getVictoryBonuses`, `getSubsidiaryIncome` (credited as revenue line) + `getSubsidiaryServiceBonus`, workforce `buildSpeed` into `:237`, research `buildCostReduction` into `page.tsx:765` and `buildSpeedBonus` into `:237`, reputation `contractRewardMultiplier` into contract/delivery payouts, commander `marketPriceMultiplier` as broker-fee reduction in `market/trade` + orderbook, timed-event `boostReward` grant, league `boostType` → ActiveBoost in `process-week`, mini-activity `mining_boost`/`research_speed` branches. Cap the combined product (BALANCE.md invariants). **Why:** converts 5 fake-shop tabs and 6 half-dead systems into honest decisions with code that already exists; ~90% of the work is multiplication. **Effort: M.** Files: `game-engine.ts`, `page.tsx`, `market/trade/route.ts`, `market-orderbook.ts`, `leagues/process-week/route.ts`, `delivery-contracts.ts`, `contracts.ts`.

**A4. Hazards that hurt + insurance that pays.** Rescale: destruction threshold 0.95 → tiered (destroy at ≥0.7 for tier-1 assets, escalating protection by tier), or raise damage ranges; make non-destroyed hits apply real effects (building revenue penalty until repaired — a repair-cost money sink; ship mining-rate penalty). Wire `economic-sinks.calculateInsurancePremium` as an opt-in recurring sink with payouts from `stats.insuredValue`; wire workforce `hazardMitigation`/security crew and module shielding (`getEffectiveShipStats`) into mitigation. **Why:** CLAUDE.md "real risk" is currently zero; insurance/redundancy/shielding decisions all reactivate at once; adds the missing recurring sink class. **Effort: M.** Files: `hazards.ts`, `economic-sinks.ts`, `game-engine.ts`, `modules.ts`, `workforce.ts`.

**A5. Extraction, NPCs, and events move markets.** (i) send `minedThisTick` in the sync payload (one line in `useGameSync.ts:48` — server code already applies it); (ii) hourly cron applies `calculateIdleDecay` mean-reversion to `MarketResource.currentPrice`; (iii) apply `getMarketEventMultiplier` to effective prices in `market/route.ts` + trade; (iv) retire the dead local `npcMarketPressure` accumulator and instead have a server cron post NPC buy/sell volume into the shared `MarketResource` rows (NPC trades become visible order-book entries with attribution — see D-2); (v) tame volatility: impact `qty×vol²` → `qty×vol×k` with per-trade clamp. **Why:** "supply and demand drive all prices" is the game's first economics principle and currently only button-clicks count. **Effort: M.** Files: `useGameSync.ts`, `cron-scheduler.ts` + new cron route, `market-engine.ts`, `market/route.ts`, `npc-engine.ts`.

**A6. Close the exploit hotlist.** Futures: reuse `validatePriceBand` against spot, margin scaled to band, server-side settlement (post-A1 it can live on the profile). Auth on `market/trade`. Daily bonus into GameState + server claim check. Delivery contracts price off live spot (or blend 50/50 base/spot). Remove the cargo add-on-arrival until deduction-at-departure exists (see C-1). **Why:** §5 exploits; POLICY.md. **Effort: S–M.** Files: `FuturesPanel.tsx`, `market-depth.ts`, `market/trade/route.ts`, `daily-bonus.ts`, `delivery-contracts.ts`, `game-engine.ts`.

**A7. Territory pays.** Governor benefits + stakeholder bonuses already computed server-side conceptually (`zone-influence.ts:431-463`) — return per-player zone standing in sync, apply `serviceBonusPct` to services in governed/staked zones in the tick, credit governor tax (capped per zone) as a revenue line, wire `getChallengerBonus` into challenge resolution. **Why:** contested territory is the flagship corporate-PVP loop; it currently confers nothing. **Effort: M.** Files: `zones/*`, `sync/route.ts`, `game-engine.ts`, `TerritoryPanel.tsx`.

**A8. Espionage produces usable output; targets feel it.** Consume `EspionageMission.reward`: `trade_route_intel` → temporary broker-fee discount (state field read by market routes), `employee_headhunt` → next-hire discount arg on `getHireCost`, `counter_intelligence` → detection buff read by `calculateSuccessRate`. On detected missions, write an `activity`/report row for the **target** ("counter-intel flagged a probe of your logistics") — felt presence with zero harm, consistent with no-PvP-combat. Enforce `canBeTargetedByEspionage` (frontier) in the targets query. **Why:** intelligence is supposed to be how skill expresses itself; today it's a paid screenshot. **Effort: M.** Files: `espionage-system.ts`, `espionage/*` routes, `workforce.ts`, `market/trade`, `frontier.ts` callers.

**A9. Fix the deprecated-prestige dependency.** Replace `prestige.level` requirements in `corporation-tiers.ts` (T7) and `speed-runs` brackets with legacy equivalents (`legacyPower` / `displayTier`); convert speed-run `legacyPoints` rewards into legacy stretch-progress credits; then delete `prestige.ts` (D-item). **Why:** the endgame gate currently requires a save-wiping deprecated flow; interstellar (in-flight) needs a reachable gate. **Effort: S.** Files: `corporation-tiers.ts`, `speed-runs.ts`, `legacy-system.ts`, `page.tsx` (remove PrestigeModal), `save-load.ts`.

**A10. Morale/fatigue get writers; engineers get their bonus.** Training budget slider (existing field) raises `trainingLevel`; sustained high utilization raises `fatigue`; events/perks/medics move `morale`. Baseline morale defaults to 1.0 (not the current hidden 0.8 tax) with band 0.8–1.15 so it's a managed stat, not a stealth penalty. **Why:** orphan-input fix; makes WorkforcePanel's existing bars real; medics/security get purposes via this + A4. **Effort: S–M.** Files: `workforce.ts`, `game-engine.ts`, `WorkforcePanel.tsx`.

**A11. One P&L truth.** DashboardPanel consumes `computeEconomyReport` instead of its parallel `financials` recomputation; EconomyPanel too. Quarterly reports gain consequences: league seeding, reputation award for profitable quarters, NPC/faction reactions in the feed. **Why:** "profit and loss must be tracked and visible" — currently two drifting implementations; quarterly loop gets stakes (fills the SESSION_DESIGN red-flag monthly gap). **Effort: S–M.** Files: `DashboardPanel.tsx`, `EconomyPanel.tsx`, `quarterly-reports.ts`, `leagues/*`, `reputation.ts`.

## (b) CUT / MERGE

**B1. Delete outright:** `refining.ts`, `research-generator.ts`, `modular-construction.ts`, `prestige.ts` (after A9), `catchup-mechanics.ts` (fold pioneer-bonus idea into frontier instead — frontier already owns the on-ramp), plus known dead assets (astraeus-*, combat hulls). ~1,500 lines of ambiguity gone. **Effort: S.**

**B2. Merge the four contract systems into two.** Keep: **Deliveries** (faction PVE, responsive) and **Bidding** (competitive PVP). Fold the static `contracts.ts` pool into deliveries as low-tier faction work (its rewards become faction-flavored, market-priced); wire or delete `competitive-contracts` (recommend: fold its limited-winner races into bidding as a contract class). Tabs: `contracts` + `diplomacy` + `bidding` → one **Contracts** hub with PVE/PVP subtabs. **Effort: M.** Files: `contracts.ts`, `delivery-contracts.ts`, `competitive-contracts.ts`, `page.tsx`, panels.

**B3. Merge the three standings tabs.** `leaderboard` + `rivals` + `leagues` → one **Standings** hub (league bracket as the spine; rivals as a "tracked competitors" widget with wagered stakes later; leaderboard as a subtab). Rivals alone adds no decision. **Effort: S–M.**

**B4. Merge market intel.** `intelligence` + `economy` + `futures` → subtabs of **Markets** alongside spot/orders. One place answers "what should I trade?" **Effort: S.**

**B5. Fold `spatial` into the map.** Lane traffic, orbital-slot occupancy, chokepoints become map overlays (they're geography — they belong on the map, per the map-first mandate). Delete SpatialStrategyPanel as a tab. Orbital-slot *enforcement* is C-2. **Effort: M.** Net tab count: 36 → ~24, with the survivors all decision-owning.

**B6. Colonies content: register or cut.** Either register `COLONY_BUILDINGS`/`COLONY_SERVICES`/`COLONY_MINING_PRODUCTION` into the real maps (making Mercury/Venus/Ceres unlocks produce — M effort, good mid-game content) or strip the unlockable-but-empty locations to map flavor. Do not leave paid unlocks that produce nothing. **Effort: M (register) / S (cut).**

## (c) NEW mechanics — only where a hole exists

**C1. Real cargo logistics.** Dispatch deducts cargo at origin, enforces `cargoCapacity`, charges fuel scaled by `deltaVFromLEO` (finally consuming `solar-system.ts` physics + ship `fuelCapacity`); arrival credits destination-local stockpiles. Requires per-location inventory (STATS_DESIGN Phase notion) — start simple: global pool but fuel cost + capacity + time = the "logistics cost money" principle. Map dispatch gains the cargo parameter (`MapCommandCenter.tsx:27`). **Why:** ships currently transport nothing; freight is the heart of a space trading MMO. **Effort: L.** Files: `ships.ts`, `game-engine.ts`, `page.tsx:1270`, `FleetPanel.tsx`, `MapContextPanel.tsx`.

**C2. Orbital-slot scarcity enforcement.** `canStartConstruction`/`canBuildShip` and `ORBITAL_SLOT_MAP` become hard gates in `handleBuild`/`onBuildShip` (currently advisory-only); premium slots become finite server-side inventory (colonies route already models per-location caps — surface it, C3). **Why:** CLAUDE.md "orbital slots are finite" is currently a chart. **Effort: M.** Files: `page.tsx`, `construction-slots.ts`, `shipyard-slots.ts`, `spatial-strategy.ts`, `colonies` route.

**C3. Surface the existing scarcity races.** Client renders `colonies` GET (who claimed what, slots remaining) and handles claim failure (location genuinely full → unlock blocked with counterplay: buy out, wait, or go elsewhere); milestone POST response (`claimedBy`) shown ("Nova Aerospace beat you to First Mars Base"). **Why:** the server already enforces scarcity; the client hides it — this is free contested-world feel. **Effort: S–M.** Files: `page.tsx:869-891`, `MapContextPanel.tsx`, colonies/milestones routes.

**C4. Season/alliance-event content generator.** A cron that instantiates `SeasonalEvent` (28-day cadence, from `seasonal-events.ts` templates) and weekly `AllianceEvent` rows; client calls `seasons/progress`; `eventTokens` become spendable in the cosmetic shop (D-5). **Why:** two flagship weekly/monthly systems are permanently empty shells; this is content plumbing, not new design. **Effort: M.** Files: new cron route, `cron-scheduler.ts`, `SeasonPanel.tsx`, `AllianceEventsPanel.tsx`, `seasons/*`.

**C5. Late-game recurring sinks (activate `economic-sinks.ts`).** Insurance premiums (with A4), resource decay on volatiles, economic disasters (choice-modal driven), reserve requirements for T5+ (efficiency penalty below 3-month runway), and **resource-gated T6+ construction** (`canBuyOnMarket:false` enforcement — mined-only inputs make late-game mining matter again). Escalate exec comp: 0.03%/mo → progressive brackets reaching ~0.15%/mo above $1T. **Why:** §5 inflation verdict; the code exists, orphaned. **Effort: M.** Files: `economic-sinks.ts`, `game-engine.ts`, `formulas.ts`, `page.tsx` build path.

## (d) MMO-FEEL changes

**D1. Render the inhabited world.** Wire the orphaned `game-state` endpoint into the map: other players' claimed colonies as markers (name + corp), top-50 presence by location; wire the orphaned `activity` feed into a dashboard/map ticker (it's already written to by 6 routes). **Why:** the single highest feel-per-effort change in the codebase — the server simulates a world nobody sees. **Effort: S–M.** Files: `MapCommandCenter.tsx`, `SolarSystemCanvas.tsx`, `DashboardPanel.tsx`, `game-state` + `activity` routes.

**D2. Market attribution + NPC forecastability.** Order book and trade ticker show counterparty names (player corps and NPC corps from A5's server-side NPC trading); publish scheduled NPC procurement drives ("Titan Mining Collective buys 500 iron on the 10th") as feed events players can position against — NPC_BACKDROP.md's own recommendation. **Effort: M.** Files: `market-orderbook.ts`, `npc-engine.ts` (server port), `MarketOrderBook.tsx`, feed.

**D3. Persist chat; add channels.** `ChatMessage` to Prisma (global + alliance channels), retention window. **Effort: S.** Files: `chat/route.ts`, `schema.prisma`, `GameChat.tsx`.

**D4. Diplomacy feed + P2P contracts (CLAUDE.md commitment).** Phase 1 (S): render alliance treaties/wars + bounty fills + bid wins into the public `activity` feed — the "public diplomacy timeline" exists as data. Phase 2 (L, post-A1): extend bounties into escrowed player-to-player delivery contracts with penalty enforcement — bounties already have the create/fill shape; add escrow + deadline + default handling server-side. **Files:** `activity` route, `bounties/*`, new `p2p-contracts` route, `DiplomacyPanel`.

**D5. Cosmetic shop + subscriber perks go live (no-P2W monetization).** Wire `cosmetic-shop.ts` (skins/titles/trails purchasable with `eventTokens` from C4 and real money) and `subscriber-perks.ts` — but **strip the P2W entries first**: `buildSpeedMultiplier` 1.15×, `researchSpeedMultiplier`, `startingMoney` violate CLAUDE.md economy-integrity; keep offline-income hours, save slots, queue slots, cosmetics. **Effort: M.** Files: `cosmetic-shop.ts`, `subscriber-perks.ts`, new shop panel, `page.tsx`.

**D6. Expeditions integration points (for the in-flight Wave 10 — UI only, engine exists).** The galactic map's "jump ready" panel (`MapContextPanel.tsx:403-452`) gets the launch button calling `planExpedition`/`launchExpedition`; InterstellarPanel gains colony/trade-route management; Order Queue HUD includes expedition phases; T7 gate fixed via A9 and lowered — $50T totalEarned is unreachable in any human timeframe; recommend gating on legacy displayTier + a megastructure instead. **Effort: M (UI).** Files: `MapContextPanel.tsx`, `InterstellarPanel.tsx`, `OrderQueueHUD.tsx`, `corporation-tiers.ts`.

**D7. Map owns the remaining decisions.** Add to `MapContextPanel`: start/stop mining, launch survey, launch expedition (D6), cargo-dispatch (C1); Order Queue gains cancel/rush and shows upgrades; persist map selection across tab switches (lift state to page). **Effort: M.** Files: `MapCommandCenter.tsx`, `MapContextPanel.tsx`, `OrderQueueHUD.tsx`, `page.tsx`.

---

## TOP 10 — ranked by "makes it play like a modern MMO space strategy game"

| # | Change | Effort | Why it's ranked here |
|---|---|---|---|
| 1 | **A1 One wallet (server ledger reconciliation)** | M | Nothing multiplayer is real until money is. Unlocks the already-built order book, bidding, mega-projects, treasury, bounties in one stroke. |
| 2 | **A3 Dead-multiplier pack** | M | Converts subsidiaries/specializations/modules/victory + 6 half-dead systems from fraud to gameplay. Biggest single restoration of "every part contributes." |
| 3 | **D1 Render the inhabited world** (game-state + activity feed) | S–M | Cheapest possible transformation from "solo game with leaderboards" to "world with other people in it." |
| 4 | **A4 Hazards hurt, insurance pays** | M | Restores the entire risk half of the design (CLAUDE.md "no combat — but real risk"), activates insurance/shielding/redundancy decisions, adds recurring sinks. |
| 5 | **A5 + A6 Markets move for real + exploit hotlist** | M | Supply/demand becomes true (mining, NPCs, events, mean-reversion) and the money printers close. Economy credibility. |
| 6 | **A2 Alliance bonus pipe-through** | S | The corporate core loop starts paying. Three-line class of fix, enormous return. |
| 7 | **A7 Territory pays** | M | Contested zones become the flagship corporate-PVP loop they were built to be. |
| 8 | **C3 + C2 Surface & enforce scarcity** (colony slots, milestone races, orbital slots) | M | "Scarcity is real" stops being a hidden DB constraint and becomes felt, contested geography. |
| 9 | **C5 Late-game sinks + C4 season content** | M | Fixes the day-30 wall: money means something again, weekly/monthly loops get stakes and content. |
| 10 | **C1 Real cargo logistics + D7 map-owned decisions** | L | The map-first mandate completed: freight, fuel, delta-v, and every core order issued from the command map. |

Sequencing note: A1 and A9 are prerequisites-of-record (A1 for everything server-money; A9 before deleting prestige and before D6's gate fix). A2/A3/A5(i)/A10/B1/D3 are safe immediate wins that don't depend on anything.

### What this restores against CLAUDE.md, explicitly
- *Meaningful decisions:* fake-shop tabs become real (A3); scarcity enforced (C2/C3); risk decisions exist (A4).
- *Realistic economics:* extraction/NPC/events move prices (A5); one P&L (A11); inflation controlled (C5).
- *Corporate PVP core:* alliances pay (A2), territory pays (A7), bidding/order book real (A1), espionage usable (A8).
- *Time-loop tempo:* weekly gets stakes (leagues boosts, seasons content), monthly gets consequences (quarterly reports feed rep/leagues), campaign gets a reachable gate (A9/D6).
- *NPC backdrop:* NPCs trade in the shared market with attribution and forecastable demand (A5/D2).
- *No-P2W:* subscriber perk cleanup (D5), exploit closure (A6), server-authoritative money (A1).

---

## Appendix — integrity/security hotlist (fix regardless of redesign)
1. `market/trade` unauthenticated — global price manipulation via curl (`trade/route.ts:21`).
2. Futures strike unvalidated — infinite money (`FuturesPanel.tsx:157`, `market-depth.ts:99/137`).
3. Client-authoritative sync money overwrite (`sync/route.ts:98-110`) + btoa save export.
4. Bounty fills: payout never debits poster nor credits filler (`bounties` route + `BountyPanel.tsx`).
5. Ship-cargo arrival credit without departure debit (`game-engine.ts:773-777`) — landmine.
6. Colony/milestone POSTs fire-and-forget with `.catch(() => {})` (`page.tsx:877-891`) — server scarcity silently bypassed client-side.
7. Chat in module memory (`chat/route.ts:18`) — data loss + cross-instance invisibility.
8. Hidden −20% morale tax (`workforce.ts:132`, `game-engine.ts:164`) — player-hostile until A10.
