# Space Tycoon — Economic PvP & Supply-and-Demand Everywhere

**Spec date:** 2026-08-15. Companion to CLAUDE.md §Space Tycoon, [BALANCE.md](BALANCE.md),
[STATS_DESIGN.md](STATS_DESIGN.md), [NPC_BACKDROP.md](NPC_BACKDROP.md),
[SESSION_DESIGN.md](SESSION_DESIGN.md), [LORE.md](LORE.md),
[SIMULATION_INTEGRITY_TOOLING.md](SIMULATION_INTEGRITY_TOOLING.md).

**Founder directive (verbatim):** *"Take a deep dive analysis of the PVP economic aspect of our
game and make sure the game encourages and rewards economic competition. Embed supply and demand
into every aspect of the game to mimic real life markets and come up with various supply chains
and incomes/outflows for materials and products that make sense in a realistic space economy.
Build all of that into our research and building systems."*

This spec is grounded in a full read of the economy code as of commit `624b3e0a` (branch `dev`)
and read-only queries against the production database on 2026-08-15. Section 1 is the honest
audit of what exists; sections 2–5 are the design; section 6 is the implementation wave plan;
section 7 is migration and anti-exploit safety.

---

## 0. Production ground truth (queried 2026-08-15)

The server-shared economy is **structurally present and empirically unused**:

| Table | Rows | Meaning |
|---|---|---|
| `GameProfile` | 9 (2 synced in last 30d) | Player population is pre-launch scale |
| `MarketLimitOrder` | **0** | Nobody has ever placed an order-book order in prod |
| `MarketFill` | **0** | Zero player-to-player trades, ever |
| `MarketPriceCandle` | **0** | Candle writer has never fired |
| `GameLedgerEntry` | **0** | The one-wallet ledger has never recorded a delta |
| `ContractBid` / `BiddingContract` | 0 / 0 | Bidding system never exercised |
| `LeagueSeason` / `LeagueBracketEntry` | 0 / 0 | Leagues never seeded/cron never ran in prod |
| `ZoneInfluence` | 0 (33 `Zone` rows seeded) | Territory system live but empty |
| `MarketResource` | 19 | Includes 7 colony-era orphan slugs (`ammonia`, `sulfur`, `solar_concentrate`, `organic_compounds`, `deuterium`, `bio_samples`, `antimatter_precursors`) **and is missing** `exotic_fuel` + `xenogenic_biomatter` (added to `RESOURCE_MAP` after the last `/market/init` run) |
| `OrbitalSlot` | 8 | Vestigial; the game code never reads this table |

Legacy `MarketOrder` (spot-trade log): 0 rows. `MarketResource` supply/demand columns show
NPC-restock/mean-revert crons **are** running (iron at $3,983 vs $5,000 base, supply 12,617 vs
10,000 baseline — the backdrop breathes on an empty server, exactly as NPC_BACKDROP.md intends).

**Implication:** we are free to make breaking-scale changes to the *server* economy (re-seed
markets, new league metrics, new demand models) with essentially zero player disruption — the
constraint that bites is **client save compatibility** (V29 additive-migration chain in
`save-load.ts`), not server data. This window closes as the 10k-MAU push lands. Build it now.

---

## 1. Honest PvP audit — where do two corporations actually compete today?

Graded per mechanism. "REAL RIVALRY" = one player's action changes another's economic reality
through shared server state. "NPC-SIMULATED" = feels competitive, opponent is synthetic.
"PARALLEL SOLITAIRE" = per-save simulation; other players are wallpaper.

### 1a. The rivalry that exists

| Mechanism | File(s) | Verdict | Detail |
|---|---|---|---|
| Limit order book | `market-orderbook.ts` | **REAL RIVALRY** | Price-time FIFO matching across ALL profiles' orders; escrow (money 1.02×, resources in kind); 2% fee; self-trade blocked + audit-logged; NPC maker (`__NPC_MARKET_MAKER__`) is just another book participant. Best MMO system in the game. **Zero prod usage.** |
| Shared spot prices | `market/trade/route.ts`, `MarketResource` | **REAL RIVALRY (price only)** | One shared price row per commodity; your sell moves my price (`±min(0.25, qty×vol×0.02)`) and raises `totalSupply` (sqrt scarcity multiplier on the ask). But the route moves *prices*, not money — wallet mutation happens client-side in `MarketPanel.tsx`. |
| Contract bidding | `contract-bidding.ts`, `bidding/*` | **REAL RIVALRY** | Sealed first-price; `evaluateBids()` scores only real profiles (70% price / 15% rep / 15% delivery) — **no synthetic bids injected**. Collateral ledgered; reliability EMA; failure penalties. Underbidding is genuinely real. Thin only because population is thin. |
| Zone influence | `zone-influence.ts`, `zones/*` | **REAL RIVALRY** | Influence shares computed against the sum of all players in the zone (cap 60%, redistribution); governor tax is levied on *other players'* service revenue in the zone (`sync/route.ts` §6d). Weakness: `contractIp` is a fabricated estimate (`ceil(contractCount×0.2)`) — contracts don't tag zones. |
| Leagues | `league-system.ts` | **REAL RIVALRY** | Real 50-player brackets, promotion/demotion, weekly metric rotation, cash + boosts by rank. Weakness: metrics are proxies — `trade_volume` and `revenue` both read `totalEarned`; `mining` reads `netWorth`; `contracts` reads `buildingCount`. Nobody can win "trade" by trading. |
| Espionage | `espionage-system.ts` | **REAL RIVALRY (info only)** | Real targets in ±1 net-worth bracket; purchasable intel on stockpiles/research/services; by-design zero target-side harm. Two attacker perks (fee −10% 24h, hire −50% 72h). `market_spy` recent-orders feed is stubbed empty. |
| Alliance diplomacy | `alliance-diplomacy.ts` | **REAL RIVALRY (bonus only)** | Server-shared treaties; `tradeBonus` genuinely reduces the live broker fee. War objectives (`economic_dominance`, `zone_control`) have **no resolution code**. |
| Prediction exchange | `prediction-exchange.ts` | NPC-SIMULATED | Fixed 2× odds vs the house on real-world events. No player-vs-player pool. |

### 1b. The solitaire that pays the bills

| Mechanism | File(s) | Verdict | Detail |
|---|---|---|---|
| **Service revenue (the dominant income)** | `game-engine.ts:287-371` | **PARALLEL SOLITAIRE** | `revenuePerMonth` is a flat constant × ~20 private multipliers. Money is minted ex nihilo; **demand is infinite and non-local**. The *only* cross-player term is `supplyMult` from `service-pricing.ts`: `max(0.50, 1 − log10(globalCount)×decay)` — 10,000 rival instances of a tier-1 service cost you just −24%, floored at −50%. NPCs aren't even counted. No market price appears anywhere in the revenue path. |
| Mining | `game-engine.ts:611-647` | PARALLEL SOLITAIRE | No deposit depletion (`getScarcityMultiplier` exists in `economic-systems.ts`; its only consumer is a display panel). Mined flows depress the shared price only via sync at 1/3 trade impact — 500 iron ≈ −0.07%. Un-synced players have zero market footprint. |
| Crafting / production chains | `production-chains.ts` | PARALLEL SOLITAIRE (dead end) | 13 recipes, 4 tiers — and the outputs are **untradeable** (not in `RESOURCE_MAP`), **unconsumed** (no building/service/contract takes them), `marketValue` has zero readers. Bonus bug: `page.tsx:2243-2256` credits output instantly AND `game-engine.ts:1489-1501` credits again on timer completion — **every craft yields 2×**. |
| Building outputs/inputs | `buildings.ts` | PARALLEL SOLITAIRE | ~48 buildings; **none consumes any resource per tick** (no input field exists). One-time `resourceCost` at build uses raw ores only. Only couplings: power ratio, +15% station bonus, crafting speed. |
| Workforce wages | `workforce.ts` | PARALLEL SOLITAIRE | Salaries are hardcoded constants ($400–600K/mo). No labor pool, no wage pressure, no scarcity beyond a per-save crew-slot cap. |
| Orbital slots / chokepoints | `spatial-strategy.ts` | PARALLEL SOLITAIRE | `ORBITAL_SLOT_POOLS` look finite (GEO 180, lunar polar 24) but `computeOrbitalSlotReport(state)` counts only **your** buildings and hardcodes occupancy `'low'` with a literal `// TODO: replace with server-aggregated count`. No player can ever crowd another out. |
| Contested locations / shared facilities | `competitive-engine.ts` | DEAD CODE | `ContestableLocation`, `calculateContestOutcome()`, `maxPlayersPerLocation` — no Prisma model, no callers. |
| Quarterly reports | `quarterly-reports.ts` | PARALLEL SOLITAIRE | Generated into the save; never published. Canon requires them public. |
| Construction/shipyard slots | `construction-slots.ts`, `shipyard-slots.ts` | Per-player by design (fine — these are personal capacity, not contested inventory). |
| Insurance | `economic-sinks.ts` | PARALLEL SOLITAIRE | Flat formula (0.5% insured value + 0.2%/hazardous location). No shared risk pool, no underwriting market. |
| Freight | `cargo-logistics.ts` | PARALLEL SOLITAIRE | Physically excellent (Δv over real lanes, per-location inventories, home-market-only clearing) but fuel is an abstract $ cost, not propellant consumed — freight creates no demand for anything. |

### 1c. The three price surfaces that never meet (the deepest structural defect)

1. **Service revenue** keys off global *instance counts* — never prices.
2. **The shared market** (`MarketResource` + order book) moves on trades and background flows —
   but nothing in the tick reads it: `game-engine.ts` contains zero references to `currentPrice`.
3. **Static `baseMarketPrice` constants** are what NPC companies self-settle at ($5,000 iron
   forever), what delivery contracts pay on, and what mega-project/alliance-project
   contributions are valued at.

Consequences: crash the iron market and Dominion contracts still pay $5,000/unit (risk-free
arbitrage, already flagged in GAME_SYSTEMS_AUDIT §5); a `precious_rally` super-cycle never
raises what anyone actually *earns* from gold; cornering a market is pointless because nothing
downstream cares about the price. **Supply and demand only exists where players voluntarily
visit the Market tab.** Per the founder directive, it must exist everywhere money moves.

### 1d. Additional wiring gaps found (each one is a cheap fix that buys real texture)

- `tariffStanceMultiplier` (LS9 realignment posture) is computed every epoch and **consumed by
  nothing** ("informational this wave").
- `STANDING_BROKER_MODIFIER` (faction standing ±15%/−25% broker fee) is never passed by the live
  trade route — faction standing has zero effect on trade costs.
- Mega-project `permanentBonus` rewards (−15% launch cost, +25% mining…) are **display strings
  only**; never applied in the tick.
- NPC companies and the NPC order-book market maker are two unrelated systems; the 10 companies
  never touch the book, and their `npcMarketPressure` accumulator is write-only.
- Hazards destroy buildings and ships but **never inventory** and never create a supply shock —
  a pirate raid in the belt can't steal one unit of ore, and a solar storm never moves a price.
- League `trade_volume` metric: no real trade volume is measured despite `MarketFill` carrying
  buyer/seller/quantity/value — the exact raw material.
- **No market-share telemetry of any kind exists** (zero grep hits), despite NPC_BACKDROP.md
  explicitly recommending it.

### 1e. Exploits confirmed during this audit (fix in Wave E1, disclose per POLICY.md)

1. **`competitive-contracts/route.ts` POST pays out with no requirement verification.** It checks
   only timing/duplication/slots then `money: { increment: reward }` — a logged-in user can curl
   `{contractId:'cc_pluto_expedition'}` for **$50B**. `checkContractFulfillment()` exists and is
   never called.
2. **`market/mining-pressure/route.ts` is unauthenticated** — moves shared `currentPrice` and
   `totalSupply` from a raw request body. Same class of hole `market/trade` was hardened against.
3. **Crafting double-credit** (§1b above) — every craft yields 2× output.
4. **Delivery-contract static-price arbitrage** (§1c) — buy below base on a crashed market,
   deliver at base.
5. **Client money is the reconciliation base**: `reconcileBalance` = client-claimed money +
   server ledger deltas. The ledger corrects *deltas*, not the base — an edited save is believed.
   (Full fix is the server-authoritative wallet program in SIMULATION_INTEGRITY_TOOLING.md;
   Wave E1 adds plausibility clamps as a stopgap.)

---

## 2. Design: supply and demand on every economic surface

**Architecture invariant (all waves):** the client sim stays deterministic. Every cross-player
quantity is computed **server-side** and delivered to the tick as a bounded snapshot through the
existing pipes — `sync/route.ts` → `servicePriceMultipliers` / `server-effects.ts`
(`ServerEffectsSnapshot`) → `applyServerEffectsToState()`. The tick then runs deterministically
against the snapshot. Offline players tick against their last snapshot (staleness-capped, below).
This is exactly how `supplyMult`, zone standings, and league boosts already flow — we widen the
pipe, we do not move the boundary.

New sync-down payload (Wave E1+, additive): `marketSnapshot: { prices: Record<slug, number>,
demandPools: …, wageIndex: …, extractionPressure: …, asOf: timestamp }`. Snapshot values are
clamped server-side to price bands / documented ranges before send, so a hostile client can't be
fed (or forge) absurd inputs — and a forged snapshot only mis-renders *that client's* private
revenue, which the plausibility clamps (§7) then bound.

Surface-by-surface — what exists (per §1) and the mechanism that makes it real:

### 2.1 Service revenue → finite, local, contestable demand pools

**Today:** infinite demand; weak global log-decay. **Design:**

- Every service belongs to a demand market keyed `(locationId, serviceCategory)` — categories:
  `launch`, `telecom`, `sensor`, `compute`, `power`, `tourism`, `logistics`(depot/debris/nav),
  `mining_output` (handled by §2.4 instead), `insurance`.
- Each market has a **demand pool `D` in $/month**, computed server-side hourly:
  `D = D_npc(loc, cat) + D_derived(loc, cat) + D_mod`, where
  - `D_npc` — the NPC backdrop floor: authored base per location tier (LEO telecom huge, Titan
    telecom tiny) × NPC-population scaler that **recedes as active-player count grows**
    (NPC_BACKDROP: floor, not ceiling; see §2.9).
  - `D_derived` — demand generated by real economic activity at that location, aggregated from
    synced profiles + NPC companies: crew headcount there (telecom/tourism/life-support demand),
    buildings there (power/compute demand), launches and freight dispatches touching it
    (launch/logistics demand), colonies (everything). Rivals *building* at a location grow its
    demand even as they compete to serve it — agglomeration, like real ports.
  - `D_mod` — super-cycle (`economic-seasons.ts` bias, finally touching revenue), era, seasonal
    events, realignment postures, hazards (a solar storm spikes repair/insurance demand).
- **Payout:** each supplier's effective capacity `C_i` = Σ over their services in that market of
  `revenuePerMonth × quality multipliers × saturation` (the existing private multiplier stack
  becomes a *capacity* stack). Total `C = Σ C_i` including NPC companies. Revenue share:
  `rev_i = D × C_i / C` when `C > D` (saturated — rivals literally take your customers), and
  `rev_i = C_i × min(1.25, 1 + 0.5 × (D−C)/D)` when undersupplied (scarcity premium — first
  mover at an underserved location earns up to +25%). Smooth with a 7-day EMA so pools shift on
  the **daily loop**, not tick-to-tick (SESSION_DESIGN: don't collapse tempo).
- Delivered to the tick as `demandMultiplier(locationId, category)` in the snapshot, replacing
  `servicePriceMultipliers`' log-decay (which is retired; its sync plumbing is reused verbatim).
  Bounds: [0.35, 1.25] — same floor as today's per-location saturation curve, so no save's
  revenue falls off a cliff on migration.
- **Sublinearity preserved** (BALANCE.md): total extraction from a market is capped at `D` no
  matter how much capacity is stacked — strictly stronger than the old saturation curve, which
  it subsumes at the market level (per-instance `serviceSaturationMultiplier` stays as the
  within-player curve so the 40th duplicate is still individually worse).
- **Intelligence layer:** demand pools, current saturation `C/D`, and top-3 supplier shares per
  market are visible in the Market Intelligence panel (paid intel tier shows all suppliers) —
  "data access is gameplay."

### 2.2 Building outputs and inputs → recipes with derived demand

**Today:** buildings consume nothing; produce nothing directly. **Design:** add two optional
fields to `BuildingDefinition` (additive — absent = today's behavior):

```ts
consumesPerMonth?: Record<ResourceId, number>;  // ongoing inputs
producesPerMonth?: Record<ResourceId, number>;  // direct outputs (refineries, agri, ISRU)
```

- **Consumption engine (tick §2b, new):** each game-month, each completed building draws its
  `consumesPerMonth` from the **location inventory** (falling back to the home pool at home
  locations, per `cargo-logistics.ts` rules). Fully supplied → 100% efficiency. Short →
  efficiency scales down linearly to a **floor of 0.5** on that building's services/production
  (soft failure — the station browns out, it doesn't die; consistent with the powerRatio
  precedent). Life-support shortfall additionally hits morale (existing morale system).
- **Auto-procurement (vertical integration vs. the market — the player choice the founder
  asked for):** a per-building toggle: *Supply locally* (consume own production/freighted stock;
  zero cash cost, full logistics burden) or *Standing market order* (server places bounded
  order-book bids at ≤ band prices for the shortfall each cycle; costs live market price + 2%
  fee + Earth-import premium if applicable). Both viable; the market route exposes you to rival
  price pressure and cornering attempts; the vertical route ties up ships, mines, and Δv.
  Standing orders are real `MarketLimitOrder` rows → they are *visible demand* other players can
  see, front-run, and supply. This is the single biggest PvP-surface unlock in the spec.
- **Representative recipes** (full table shipped with Wave E3; numbers tuned so total input cost
  ≈ 15–30% of the building's service gross at base prices — a real margin squeeze when markets
  move, not a rounding error):

| Building | consumesPerMonth | producesPerMonth |
|---|---|---|
| `launch_pad_*` | `rocket_fuel` 20/60/150 (per launch tier) | — |
| `datacenter_*` | `electronics_package` 1–3 (spares) | — |
| `space_station_*`, `habitat_*`, `colony_*` | `life_support_pack` 1 per 25 crew | — |
| `sat_telecom*`, `sat_sensor*` | `satellite_bus` 0.1 (constellation attrition) | — |
| `fabrication_*` | (recipe inputs via crafting, unchanged) | — |
| `nuclear_reactor_*` | `helium3` 0.2 + `deuterium` 0.5 (T4+ fusion units) | — |
| `mining_*` | `rocket_fuel` 5 (haulers) | (yields via §2.4, unchanged) |
| **new** `propellant_plant_lunar/mars` | `lunar_water`/`mars_water` 30 | `rocket_fuel` 20 |
| **new** `agri_dome` (Luna/Mars/colonies) | `mars_water` 10, `ammonia` 5 | `organic_compounds` 12 |
| **new** `life_support_works` | `lunar_water` 10, `ammonia` 4, `organic_compounds` 6 | `life_support_pack` 8 |
| **new** `orbital_refinery` (belt/L-points) | raw ores | refined outputs (moves T1 recipes off the fab queue into passive thruput per STATS_DESIGN `refiningThroughput`) |

- **Aggregate demand telemetry:** the sync route aggregates each profile's monthly consumption
  and posts it as background *buy* flows (`calculatePriceAfterBackgroundFlow`, the existing
  mining-pressure pipe, sign-flipped) and into `MarketResource.totalDemand` — so widespread
  datacenter construction genuinely raises electronics prices for everyone. Derived demand is
  what makes supply chains PvP: your factory's inputs are my mine's customers.

### 2.3 Contracts → live prices, real competition, forecastable NPC demand

**Today:** delivery contracts pay static base price (arbitrage §1e-4); bidding is real but
starved; NPC procurement invisible. **Design:**

- Delivery contract payment = **live spot at acceptance** × faction × posture multipliers,
  snapshotted onto the contract (so it's a genuine forward: lock today's price, deliver in 72h —
  hedging gameplay for free). Contracts become the no-fee channel exactly as BALANCE.md intends,
  without being an arbitrage against the spot market.
- **NPC procurement drives** (NPC_BACKDROP's "visible and forecastable" requirement): each NPC
  company publishes 1–2 upcoming buys per week ("Titan Mining Collective buys 500 iron in 3
  days, paying spot+8%") on the world feed and Analytics tab. Implemented as real
  `BiddingContract` rows (reverse auctions) so **players underbid each other** to fill NPC
  demand — the bidding system finally gets a heartbeat at any population, and faction-aligned
  NPCs (NPC_BACKDROP's 1-hour `factionId` change) bias what they buy per LORE.md motivations
  (Dominion stockpiles titanium; Hive pays exotic premiums for `bio_samples`).
- Zone-tagged contracts: contracts carry the `zoneSlug` they execute in, replacing the
  fabricated `contractIp` estimate with real influence from real work.

### 2.4 Mining yields → depletion and shared extraction pressure

**Today:** infinite deposits; negligible price feedback. **Design:**

- **Wire the existing scarcity engine:** `getScarcityMultiplier` (economic-systems.ts, currently
  display-only) applies per `(locationId, resourceId)` in the mining tick, driven by a
  **server-aggregated extraction pressure index**: sync already receives `minedThisTick`
  per resource; extend it with per-location attribution (the data exists —
  `routeProductionCredit` knows the producing location), accumulate into a new
  `LocationExtraction` server table, decay it 10%/day (deposits "recharge" via new surveys), and
  deliver `extractionPressure(loc, res) ∈ [0.4, 1.0]` in the snapshot. Everyone strip-mining
  lunar water thins the seam **for everyone** — the belt corridor scramble canon asks for.
- Price side already exists (mined flows depress spot); raise `MINING_IMPACT` from 1/3 to 1/2 of
  trade impact once depletion lands, since depletion now provides the physical brake.
- NPC floor: NPC extraction counts toward pressure but is throttled to never push the index
  below 0.8 on its own (players always outpace NPCs; NPC_BACKDROP invariant).
- Hazard coupling (fixes §1d): belt pirate raids and solar storms now destroy location inventory
  (bounded %, insurance-coverable) and post a supply-shock flow to the market — disasters move
  prices, per canon "prices should feel alive."

### 2.5 Market prices → one price truth

**Today:** three disconnected price surfaces (§1c). **Design:** live spot becomes the *only*
valuation everywhere money meets a resource:

- Delivery contracts (§2.3), NPC company self-settlement (they trade *through the shared
  market* at spot — see §2.9), mega-project/alliance-project contribution valuation (currently
  static — this also finally makes "contribute during a glut" a real strategy), crafting sell
  path, salvage values, espionage stockpile valuations.
- The NPC market maker quotes around **live spot** (`currentPrice`), not `basePrice`, with
  spread widening as its inventory depletes (currently a fixed ±10% around base — meaning after
  any real price move the maker is free money in one direction). Inventory-aware: the maker's
  daily volume caps already exist (`NPC_VOLUME_CAPS`); add a spread schedule
  `±(0.06 + 0.10 × capUsedFraction)`.
- `baseMarketPrice` survives only as: band anchor (`price-band.ts`), mean-reversion target
  (seasonally biased, unchanged), and UI reference line.

### 2.6 Workforce wages → a labor market

**Today:** constants. **Design:** server-computed **wage index per crew type** (weekly loop):
`wageIndex(type) = clamp(0.8, 1.6, f(total employed across synced profiles + NPC employment vs.
labor supply curve))`, where labor supply grows with total habitat `crewQuarters` built
server-wide (building housing literally grows the labor force — a cooperative-competitive
infrastructure play). Salary = base × wageIndex; hiring cost scales likewise. Everyone
mass-hiring engineers raises engineer pay for everyone — expansion booms have real wage
pressure. Lore surface: **Belt Miners' Guild** (LORE.md) issues demands/strike events when the
miner wage index pins at 1.6 (event-system fodder, weekly loop). Mitigations (BALANCE.md
requires counterplay): crew `trainingLevel` reduces effective headcount needed; `crew` research
category techs get wage-related effects (§4).

### 2.7 Insurance → shared risk pool

**Today:** flat private formula. **Design (Wave E8, optional):** premium = actuarial base ×
**server loss-ratio index** (trailing 90-day hazard payouts vs premiums collected across all
profiles — a bad storm season hardens the market for everyone, per the Outer Rim Insurance
Mutual lore). Later: player underwriting per STATS_DESIGN §8 (high-resilience corps sell
coverage — a real risk-transfer PvP market). Until then the index alone already makes insurance
a shared economic surface.

### 2.8 Freight → propellant is cargo

**Today:** Δv priced in abstract dollars. **Design:** freight fuel cost converts to
`rocket_fuel` units consumed from the origin inventory (`fuel = Δv × rate` in units, same
Dijkstra lanes), purchasable via standing orders like any input. Propellant becomes the
economy's blood: every dispatch, launch, and expedition burns it; lunar/Mars ISRU plants and
`crack_water_fuel` produce it; its local price at Ceres vs LEO *is* the logistics market.
Depots (`svc_propellant_depot`) finally mean something: they sell locally-stocked propellant
into the location's demand pool. Lane-usage investment (canon "shipping lanes are investments"):
per-lane server counter of dispatches; heavily-used lanes get −Δv% (beacons/infrastructure,
cap −15%), decaying when abandoned. Cheap (one server table), big canon payoff.

### 2.9 NPC backdrop unification (floor, not ceiling)

**Today:** three disconnected NPC systems (companies, order-book maker, restock cron); fixed
population of 10; settle at fake prices. **Design:**

- NPC companies trade **through the shared order book** at spot (their existing
  `NPCMarketAction` volumes, hard caps unchanged) — one economy, not two.
- **Dynamic scaling** (NPC_BACKDROP recommendation): active NPC count and `D_npc` demand-pool
  share scale down as 30-day-active player count rises (full backdrop < 50 actives; ~40% at 500;
  ~10% at 5,000; floor of 3 NPCs always). Published in the quarterly balance report as the
  **NPC share-of-market metric** NPC_BACKDROP flags as unmeasured.
- Faction alignment (`factionId` on `NPCSeedData`) drives procurement drives (§2.3) and market
  bias, hooking the LS9 `npcFactionBias` that already exists.
- Invariants preserved and CI-tested: NPCs never buy exotics, never claim rare locations, never
  outbid players above spot+10%, never push extraction pressure below 0.8 alone.

---

## 3. Supply chains — the production graph of a realistic space economy

Mapped onto **existing** resources (`resources.ts`), existing crafted products
(`production-chains.ts`), and the colony `uniqueResources` already seeded in the prod
`MarketResource` table. New resource IDs are limited to **one**: `life_support_pack`.
Everything else is adoption/promotion of IDs that already exist somewhere in the codebase.

### 3.0 Resource roster after adoption (all tradeable on the shared book)

- **Raw — mined/extracted:** `iron`, `aluminum`, `titanium`, `platinum_group`, `gold`,
  `rare_earth`, `lunar_water`, `mars_water`, `methane`, `ethane`, `helium3`,
  `exotic_materials`, `xenogenic_biomatter` (existing) + **adopted from colonies/prod DB:**
  `ammonia` (Ceres), `sulfur` (Io), `organic_compounds` (Ceres/Titan), `solar_concentrate`
  (Mercury), `deuterium` (Uranian moons), `bio_samples` (Enceladus/Hive),
  `antimatter_precursors` (Triton — interstellar era).
- **Refined (tier 1):** `steel_ingots`, `aluminum_alloy`, `rocket_fuel`, `refined_rare_earth`.
- **Components (tier 2):** `structural_beams`, `electronics_package`, `solar_panel_array`,
  `propulsion_unit`, **new** `life_support_pack`.
- **Products (tier 3–4):** `station_module`, `satellite_bus`, `ai_compute_cluster`,
  `fusion_core`, `habitat_pod`, `exotic_fuel` (already a `MINED_ONLY` resource — becomes the
  *crafted* interstellar propellant, see chain F).

### 3.1 The six chains

Each chain lists: sources → transformations → sinks; who produces / who consumes; disruptors.
Δv/location scarcity applies throughout via `cargo-logistics.ts` (remote production must be
freighted to clear on the home market; local consumption clears locally — regional price
divergence is Wave E5's location-price layer, until then the Earth import premium below is the
spatial price signal).

**A. Propellant & volatiles** (the economy's blood)
`lunar_water`/`mars_water` (ISRU mining — Luna/Mars) + `methane`/`ethane` (Titan, Mars
Sabatier) → `rocket_fuel` (`crack_water_fuel` recipe; new `propellant_plant_*` buildings;
`sabatier_process` tech makes the methane route) → **sinks:** every launch (`launch_pad_*`
consumption), every freight dispatch and ship route (§2.8), mining haulers, expedition/science
mission provisioning, satellite stationkeeping (small), depot stocking.
*Producers:* lunar/Mars ISRU players, Titan colonists, importers. *Consumers:* everyone who
moves anything — launch-service corps are the biggest.
*Disruptors:* solar storms (halt ISRU + destroy stocks §2.4), `volatiles_boom` super-cycle,
Corsair lane raids, realignment postures tariffing volatile routes (§5), water-deposit
extraction pressure.

**B. Structural metals** (construction backbone)
`iron`/`aluminum`/`titanium` (belt, Luna, Mercury `mercury_iron` flavor) → `steel_ingots`,
`aluminum_alloy` → `structural_beams` → `station_module` → `habitat_pod` → **sinks:** T3+
building construction consumes components (not just raw ore); station/habitat maintenance
consumes trickle spares; mega-project phases consume `structural_beams`/`station_module` at
live prices; hazard repairs consume beams (repair bills become part-material, part-cash).
*Producers:* belt miners (Titan Mining Collective NPC anchors the floor), orbital refineries.
*Consumers:* every expanding corp; the Dominion's infrastructure procurement drives.
*Disruptors:* `metals_squeeze`/`belt_glut` super-cycles, micrometeorite storms in the belt,
Orbital Engineers' Union strikes (wage index event, §2.6), Kepler-style merger events.

**C. Electronics & compute**
`rare_earth` + `gold` + `sulfur` (semiconductor process flavor) → `refined_rare_earth` →
`electronics_package` → `ai_compute_cluster` / `satellite_bus` → **sinks:** datacenter spares
consumption, satellite constellation attrition (0.1 bus/mo per sat — debris hazard raises it),
new satellite construction, ship avionics in shipyard builds, science-mission instruments.
*Producers:* rare-earth miners (scarce: 500 baseline supply), lunar fabs.
*Consumers:* compute/telecom corps — the service categories with the richest demand pools.
*Disruptors:* `rare_earth_crunch` super-cycle, debris-cascade events (spike attrition),
Echo Remnant artifact-tech events (temporary yield breakthroughs).

**D. Energy**
`solar_concentrate` (Mercury) + `helium3` (Luna/regolith, Saturn later) + `deuterium`
(Uranus) → `fusion_core` → **sinks:** T4+ reactors consume He-3/deuterium per month (fuel
cycle), power buildings consume cores at construction, `exotic_fuel` synthesis (chain F).
Power itself stays location-local (existing powerRatio) — energy PvP is fought in the fuel
markets, not a power grid.
*Producers:* lunar He-3 corps (Helios Energy NPC), Mercury solar colonists, Uranian frontier.
*Consumers:* reactor operators, interstellar programs.
*Disruptors:* solar storms (solar output), `exotic_frontier_surge`, Accord regulation events
on nuclear materials (Senate votes — LS7/W11 hook).

**E. Life support & agriculture** (the payroll of matter)
`lunar_water`/`mars_water` + `ammonia` (Ceres) + `organic_compounds` (Ceres/Titan agri) →
`life_support_pack` (new `life_support_works`, `agri_dome` buildings) → **sinks:** 1 pack / 25
crew / month at every crewed building and colony; morale penalty when short; epidemics/Mars
Dust Pandemic-class events spike consumption ×2.
*Producers:* Ceres logistics corps (canon: Ceres is the belt's hub), agri colonists.
*Consumers:* every crewed operation — demand scales with total server population growth, the
most organic demand curve in the game.
*Disruptors:* epidemics, crop failures, Ceres route piracy, `belt_glut` (cheap ammonia).

**F. Exotics & interstellar (end-game)**
`exotic_materials` (Europa) + `helium3` + `deuterium` + `antimatter_precursors` (Triton) +
`xenogenic_biomatter`/`bio_samples` (Enceladus, Hive trade) → `exotic_fuel` (metric-engine
propellant; recipe unlocked by `jump_drive`'s existing `exotic_matter_refining` building) →
**sinks:** interstellar expeditions (already consume per `expeditions.ts`), Alcubierre
program mega-project phases, Echo Remnant premium contracts for precursor-adjacent finds.
*Producers:* outer-system frontier corps only — location scarcity is the moat; Δv cost to
market is enormous (freight strategy: refine in situ, ship the dense product).
*Consumers:* interstellar-era players, Hive Collective procurement (pays in exotics the other
direction — the pattern-trade of LORE.md).
*Disruptors:* Hive Great-Silence-style dormancy events (their demand vanishes), Triton Archive
politics, `exotic_frontier_surge`, realignment (three factions are outside Accord law here).

### 3.2 Earth import channel (price ceiling + on-ramp)

Any raw or tier-1/2 good can be imported at `earth_surface`: price = `max(spot, base) ×
importPremium`, default ×2.5, reduced by server-wide launch-service capacity (cheap launch is
everyone's deflation) and by the buyer's `reusable_boosters`-line research, floor ×1.4.
Purpose: (a) realism — Earth is the infinite-but-expensive supplier of last resort; (b)
**anti-cornering bound** — no corner can push a price above the import parity for long; (c)
new-player ramp — you can always buy your inputs, expensively, before you own the chain.
Import volume is published in flow telemetry (it's the signal a local supply business is viable).

### 3.3 Disruption matrix (what makes chains *stories*)

Hazards (destroy stock + supply shock §2.4) · super-cycles (demand/mean-revert bias, already
7-day-forecast) · realignment postures (tariffs §5.3, contract generosity — wired) · faction
events (strikes, embargoes, Hive dormancy) · Senate votes (W11 — regulation shocks) · league
seasons (demand-pool modifiers for themed weeks). Every disruptor already has an engine
(hazards, seasons, realignment, senate, events) — this spec only connects their outputs to
prices, pools, and stocks.

---

## 4. Research & building integration

### 4.1 Effect-system extension (additive)

`ResearchEffect` gains optional targeting: `{ kind, magnitude, target?: { resourceId? |
recipeId? | serviceCategory? | chain? } }` and three new kinds: `recipeYield`,
`recipeUnlock`, `consumptionReduction`, plus `marketAccess` (fee/intel/limits) and
`wageResistance`. Untargeted effects behave exactly as today (12-key flat bucket); caps per
BALANCE.md stay (`PER_EFFECT_CAP` 0.30, aggregate caps unchanged; new kinds get caps:
recipeYield 0.50/chain, consumptionReduction 0.40, marketAccess fee floor per existing 85%
broker-cut cap).

### 4.2 Existing techs that map cleanly (re-author `EFFECTS_BY_ID` entries — no new IDs)

The audit found whole tech families whose flavor already promises supply-chain effects but
whose authored effects are generic scalars. Re-map (~30 techs):

- **ISRU/refining family** → recipe unlocks/yields: `isru_water` (unlock `propellant_plant_*`),
  `isru_oxygen` + `closed_loop_recycling`-style crew techs (consumptionReduction on
  `life_support_pack`), `isru_metals`, `zero_g_refining`, `plasma_processing`,
  `electrochemical_mining`, `magnetic_separation`, `bioleaching` (recipeYield on T1 refining,
  +10–15% each, capped).
- **Logistics family** → freight: `space_logistics`, `cargo_optimization`, `modular_cargo`,
  `heavy_hauler_design`, `tug_design`, `fleet_coordination` (freight fuel −%, capacity +%,
  lane-investment rate +%). `fuelEfficiencyBonus` already reaches cargo-logistics — precedent.
- **Manufacturing family** → `ship_manufacturing`, `space_manufacturing`, `3d_printing_space`
  (recipeYield on components; fab throughput +%).
- **Economy family (14 techs) finally does economics:** `market_analytics` (order-book depth +
  flow telemetry access), `futures_trading` (unlock futures at live spot), `automated_trading`
  (standing-order slippage −20%, +5 open-order cap), `supply_chain_opt` (auto-procurement fee
  −50%), `monopoly_economics` (+revenue in markets where your share > 40% — leaning into
  dominance), `insurance_modeling` (premium −25% — exists), `venture_capital`/`brand_management`
  (demand-pool attraction +% — your capacity weighs heavier in share math), `tax_optimization`
  (governor-tax resistance), `currency_system` (Earth-import premium −10%),
  `merger_acquisition`/`tech_licensing` (unchanged), doctrine pair unchanged.
- **Crew family** → `wageResistance` (wage-index exposure −%, cap 0.30) on 3–4 existing crew
  techs.
- **Sabatier/mass-driver promises kept:** `mass_driver` (lunar export freight −50% — its "$0
  marginal launch cost" flavor, finally), plus **new tech** `sabatier_process` below.

### 4.3 New techs (≤ 10, filling genuine holes)

`sabatier_process` (T2, mining — unlock methane→rocket_fuel recipe on Mars/Titan) ·
`orbital_refining_complex` (T3, infrastructure — unlock `orbital_refinery`) ·
`hydroponic_agriculture` (T2, terraforming — unlock `agri_dome`) · `closed_loop_life_support`
(T3, crew — consumptionReduction 0.30 life_support) · `fusion_fuel_cycle` (T4, propulsion —
reactor He-3/deuterium consumption −30%) · `commodity_clearinghouse` (T3, economy — futures +
escrowed forwards unlock) · `market_microstructure` (T4, economy — see rivals' aggregate
standing-order demand in intel panel) · `deep_prospecting` (T3, mining — extraction-pressure
recovery +50% at surveyed locations) · `guild_arbitration` (T3, crew — strike-event immunity
once/season) · `antimatter_catalysis` (T5, propulsion — `exotic_fuel` recipeYield +25%).

### 4.4 Buildings

Recipes per §2.2; five new buildings (`propellant_plant_lunar`, `propellant_plant_mars`,
`agri_dome`, `life_support_works`, `orbital_refinery`) — all mid-cost T2-T3, all with
`consumesPerMonth`/`producesPerMonth` and location requirements matching their chain sources.
T3+ **new** building definitions move part of `resourceCost` from raw ores to components
(`structural_beams`, `station_module`, `electronics_package`) — construction becomes the
economy's largest component sink. **Existing building definitions keep their current
`resourceCost` untouched** (grandfathering, §7). Colony buildings adopt component costs on the
same schedule (they're end-game; their builders can carry it).

### 4.5 The integration invariant

Every recipe input must be: producible by players (chain), floored by NPC supply (backdrop),
importable from Earth (ceiling), and visible in flow telemetry (intelligence). A recipe failing
any leg is misdesigned — this is the checklist for future recipe additions.

---

## 5. Competition rewards — making out-competing pay and show

1. **Market-share telemetry** (NPC_BACKDROP's explicit rec): from `MarketFill` (buyer/seller/
   qty/value already recorded) + delivery-contract completions + freight ledger: per-resource
   **share of traded volume**, exporter/importer rankings per location, 30-day flow maps.
   Free tier: top-5 leaderboards per resource. Earned tier (espionage `market_spy` finally gets
   its real feed / `market_microstructure` tech / paid intel reports): full share tables and
   rival standing-order demand. Never free, never perfect — per canon.
2. **League metrics get real** (fixes §1d): `trade_volume` = Σ MarketFill value as
   buyer+seller; `contracts` = bidding wins + deliveries completed (server counters, ledgered);
   `mining` = extraction-pressure-weighted output synced monthly; new rotation entries
   `market_share_delta` and `freight_volume`. Serpentine brackets/rewards unchanged.
3. **Trade-dominance recognition:** quarterly (real 30-day) server-side **public corporate
   reports** (replaces client-local `quarterly-reports.ts` output for the public copy):
   revenue, growth, market shares per category, notable fills — published to the public
   registry/chronicle like era medals; "fuel for rivalry and narrative" per canon.
4. **Contract underbidding rewards:** NPC procurement drives (§2.3) give the bidding system
   volume; win-rate and average-margin stats on the public profile; `bidReliability` already
   exists as the reputation stake.
5. **Chokepoint/slot control:** finish the `computeOrbitalSlotReport` TODO — server-aggregated
   occupancy per `ORBITAL_SLOT_POOLS` (GEO 180, lunar polar 24, L-points…); when a pool
   crosses 85%, new builds there require winning a **slot lease auction** (order-book-style,
   proceeds burned as a money sink per BALANCE.md); leases are transferable at market price —
   "orbital slots are finite… ownership transfers at market-clearing prices" (canon, currently
   false, becomes true).
6. **Alliance/era goals keyed to market share:** new charter type `market_share` (hold X% of a
   resource's traded volume for the season) alongside the existing three; era charters gain
   `trade_volume` and `market_share` goal metrics; alliance war objective `economic_dominance`
   finally resolves (compare share deltas over the war window — economic warfare, no combat).
7. **Realignment postures bite (fixes §1d):** `tariffStanceMultiplier` applies as a fee/premium
   on trades and freight crossing that faction's space (lane metadata exists in
   `spatial-strategy.ts`); `STANDING_BROKER_MODIFIER` gets passed by the live trade route
   (one-line fix). Faction standing becomes trade strategy.

---

## 6. Implementation waves

Boundary rule for every wave: cross-player state lives in Prisma and reaches the deterministic
client tick only via bounded sync snapshots (existing `servicePriceMultipliers` /
`ServerEffectsSnapshot` pipes). Per-wave invariant check = **[P2W]** no real-money advantage,
**[BOUND]** deterministic-client/shared-server boundary respected, **[NPC]** NPC floor
preserved & invariants CI-tested, **[MOB]** mobile-usable UI, **[SAVE]** additive save
migration, **[BAL]** BALANCE.md sink/sublinearity checklist.

### E1 — Price Truth & Integrity (S, ships standalone, no schema)
Fix the five §1e exploits: competitive-contract claims verified via `checkContractFulfillment`
against synced profile data; auth + CSRF on `mining-pressure`; crafting double-credit (remove
the instant credit in `page.tsx`, keep the engine completion credit); delivery contracts price
at spot-at-acceptance (spot delivered in sync `marketSnapshot`, band-clamped); plausibility
clamp on sync money base (reject client money > last reconciled + max plausible tick income ×
elapsed + ledger credits; flag to `MarketAuditLog`). NPC maker quotes around live spot with
inventory-aware spread. Re-run market init additively (adds `exotic_fuel`,
`xenogenic_biomatter`; re-links 7 orphan slugs). Public post-mortem for the competitive-contract
hole per POLICY.md. *Files:* `competitive-contracts` route, `mining-pressure` route,
`page.tsx`, `game-engine.ts`, `delivery-contracts.ts`, `market-orderbook.ts`, `sync/route.ts`,
`middleware.ts`. Invariants: all pass; [SAVE] none needed.

### E2 — Goods on the Book (M, dep: E1)
All crafted products + adopted colony resources become first-class `RESOURCE_MAP` entries
(category `refined`/`component`/`product`) with bands, volatility, NPC maker caps (tight for
components, zero for T4 products — player-only markets at the top of the chain, per the
MINED_ONLY precedent), candles. Crafting sells at live spot (−3% broker). New T3+ building
defs (incl. the five new buildings, §4.4) cost components. New techs `sabatier_process`,
`orbital_refining_complex`, `hydroponic_agriculture` land here with their buildings.
*Files:* `resources.ts`, `production-chains.ts`, `buildings.ts`, `research-tree.ts`,
`market/init`, `market-orderbook.ts` caps. *Schema:* none (MarketResource rows). [SAVE] V30:
`craftedProducts` merge into `resources`/`locationInventories` (one-time move, additive field
kept as alias). [BAL] top-of-chain goods have no NPC buyer → no printer.

### E3 — The Consumption Engine (L, dep: E2) — *the founder directive's heart*
`consumesPerMonth`/`producesPerMonth` on buildings; tick §2b consumption with 0.5 efficiency
floor; life-support/morale coupling; auto-procurement standing orders (server-side bounded
order placement + `supply locally` toggle); consumption aggregated to `totalDemand` +
background buy flows; launch/freight propellant conversion (§2.8) including propellant-unit
freight. Research re-mapping (§4.2) and remaining new techs. *Files:* `buildings.ts`,
`game-engine.ts`, `cargo-logistics.ts`, `sync/route.ts`, `market-orderbook.ts` (standing
orders), `research-tree.ts`, new `consumption.ts`. *Schema:* `StandingOrder` table (or reuse
`MarketLimitOrder` with `source:'standing'` column — preferred). [SAVE] V31: grandfather
grace — existing saves get a 6-game-month input stockpile credited per affected building, and
recipes phase in at 25%→100% over 3 game-months. [BAL] adds the recurring *material* sink the
game lacks; input cost 15–30% of gross.

### E4 — Finite Demand Pools (L, dep: E3 for derived demand; can ship with D_npc-only pools after E1)
Per-(location, category) demand pools per §2.1; hourly server job; snapshot delivery; retire
log-decay `service-pricing.ts` (keep file as the pool-share calculator); Market Intelligence
demand map (mobile-first table + heat view, colorblind-safe, no color-only state).
*Files:* `service-pricing.ts` (rewrite), new `demand-pools.ts`, `sync/route.ts`,
`MarketIntelligencePanel`, cron. *Schema:* `LocationDemandPool` (locationId, category, dNpc,
dDerived, cSupply, updatedAt). [BAL] pool cap strictly stronger than saturation; floor 0.35
protects migrating saves. [NPC] `D_npc` floor + dynamic scaling (§2.9) in same wave.

### E5 — Depletion, Labor & Lanes (M, dep: E3)
Extraction-pressure index + `LocationExtraction` table + scarcity wiring; hazard inventory
destruction + supply shocks; wage index + `LaborMarket` weekly job + strike events; lane-usage
investment counter. *Files:* `game-engine.ts` mining §, `economic-systems.ts` (wire),
`hazards.ts`, `workforce.ts`, `sync/route.ts`, `spatial-strategy.ts`. *Schema:*
`LocationExtraction`, `LaborIndex`, `LaneUsage`. [SAVE] V32 additive. [BAL] wage index is a
scaling recurring sink keyed to expansion — exactly the class BALANCE.md says the game needs.

### E6 — Market Share, Leagues & Public Reports (M, dep: E1; parallel-safe with E3-E5)
Share telemetry from `MarketFill` + contract + freight ledgers; real league metrics; server
public quarterly reports; espionage `market_spy` real feed; profile trade stats.
*Files:* new `market-share.ts`, `league-system.ts` + `sync` metric plumbing,
`quarterly-reports.ts` server variant, `espionage-system.ts`, public registry pages.
*Schema:* `TradeStatDaily` rollup (profileId, resourceSlug, buyVol, sellVol, day). [MOB]
rankings are list-first UI.

### E7 — Chokepoints, Tariffs & NPC Drives (M, dep: E6 for telemetry surfaces)
Server-aggregated orbital-slot occupancy + lease auctions (proceeds burned); zone-tagged
contracts (real `contractIp`); `tariffStanceMultiplier` + faction broker modifier wired; NPC
procurement drives as public reverse auctions, faction-aligned NPCs; alliance
`economic_dominance` war resolution; charter/era market-share goals; mega-project
`permanentBonus` actually applied (audit §1d) and contributions valued at spot.
*Files:* `spatial-strategy.ts`, `zones`, `delivery-contracts.ts`, `contract-bidding.ts`,
`npc-engine.ts`, `npc-companies.ts`, `realignment.ts` consumers, `market/trade` route,
`alliance-charters.ts`, `corporate-eras.ts`, `mega-projects.ts`. *Schema:* `OrbitalSlotLease`;
`BiddingContract.issuerNpcId` column. [NPC] drive prices capped spot+10%.

### E8 — Derivatives & Risk Market (M, optional, dep: E4)
Futures re-based on live spot with `validatePriceBand` (closes the old strike exploit class
for good), escrowed forwards between players (binding-contract canon), insurance loss-ratio
index; later player underwriting. *Files:* `market-depth.ts`, `economic-sinks.ts`, new
`forwards.ts`. *Schema:* `ForwardContract`.

Dependency order: E1 → E2 → E3 → {E4, E5} → E6 → E7 → E8; E6 can start any time after E1.
Rough effort: E1=S (days), E2/E5/E6/E7=M (~1wk each), E3/E4=L (~2wk each).

---

## 7. Migration & balance safety

**Saves (V29 → V30+, all additive per the established `save-load.ts` pattern):** new fields
only (`standingOrders`, `consumptionState`, `marketSnapshot` cache, `lanes`); absent recipe
fields = no consumption (old defs untouched); grandfathered buildings get default recipes only
via the E3 grace program (stockpile credit + 3-month phase-in); `craftedProducts` alias kept
after the V30 merge so old saves load. No field is ever removed or re-typed.

**Server data:** market re-seed is additive (`upsert` by slug — never reset `currentPrice` on
existing rows). Prod's zero orders/fills/ledger rows mean no live positions can be stranded.

**BALANCE.md compliance:** demand pools cap category income server-side (strictly sublinear —
stronger than saturation); consumption is the missing *recurring material* sink; wage index and
tariffs are wealth-scaling sinks with research mitigation paths (checklist: mitigation ✔,
transparent ✔ — pools/wages/tariffs all shown in the P&L panel with their inputs); slot-lease
proceeds are burned; the five money-sink waves are untouched. Existing caps respected: waveB
2.0 revenue cap, effect caps, broker-fee floor 85% cut.

**Anti-exploit / cornering bounds:** price bands (`[0.3×, 3×]` of reference) unchanged; Earth
import parity caps any corner's upside (§3.2); NPC maker is an infinite counterparty inside
its caps; per-profile **position guard** — when one profile exceeds 40% of a resource's
trailing-7-day fill volume, `MarketAuditLog` `volume_anomaly` fires and the maker's spread
widens against further accumulation (cornering stays *possible* — it's legitimate strategy —
but expensive, visible in telemetry, and bounded by import parity); standing orders are
band-limited and cancel-on-insolvency; escrow already covers both legs of book trades; all new
server mutations write `GameLedgerEntry` rows (the reconcile/rollback surface
SIMULATION_INTEGRITY_TOOLING.md builds on). Exploit disclosures per POLICY.md playbook —
starting with E1's competitive-contract hole.

**Session-design fit (SESSION_DESIGN.md):** standing orders/underbidding = tactical; demand
pools + NPC drives = daily; wage index, league trade metrics, slot auctions = weekly;
super-cycle chain shifts + public quarterlies = monthly; extraction depletion, lane
investment, interstellar chain F = campaign. No new feature lands on the oversubscribed daily
loop except the drives, which replace dead contract volume.

**Accessibility & mobile:** demand maps and share tables are semantic tables first (screen-
reader order), heat views use the colorblind-safe ramp with numeric labels, all new panels
keyboard-reachable, reduced-motion honors existing toggle. Phone: pools/share/flows are
list-first; no hover-only intel.

---

## Flows — the commodity flow map (2026-09-02)

**Founder-approved:** GAME_DESIGN_REVIEW_2026-09.md §2 row 3 — "commodity flow map + exporter/
importer rankings from `MarketFill` and lane usage counters; the missing third of the
intelligence pillar." CLAUDE.md: *"Flows are visible. Commodity supply maps, route-level volume,
and exporter/importer rankings let players identify arbitrage, chokepoints, and rival
concentration."* Price history (§E1 candles) and order-book depth already existed; per-corp
share existed (§E6, `market-share.ts`). Nothing rendered flows as a map. Now:

- **Library:** `src/lib/game/flow-map.ts` — `getFlowMap({ windowDays, resource })`, 10-minute
  `unstable_cache`, ISO strings throughout. Pure aggregation helpers are unit-tested in
  `__tests__/flow-map.test.ts`.
- **Route:** `GET /api/space-tycoon/market/flows?resource=&days=` — session required (any
  player), per-profile throttle 20/min (`route-throttle.ts`), `private, max-age=600`.
- **UI:** Markets → Analytics → **Flow Map** (`FlowMapPanel.tsx`): resource selector synced to
  the order-book selection, 7/30/90-day window, ranked bars (no new chart dependency),
  exporter/importer tables, chokepoint callouts, and an **"Aim a lever"** row linking to the
  price-campaign console (order book) and the poach inbox (Workforce) — links, not reimplementation.
- **Map overlay:** MapCommandCenter's **Volume** toggle (beside *Labels*) thickens/recolours
  the busiest lanes on both solar renderers and names the top lanes in text in the HUD legend.
  Static; reduced-motion safe.

### Sources — every figure comes from a persisted row

| Section | Row | What it is (and is not) |
|---|---|---|
| `production[]` | `LocationExtraction` (locationId, resourceId, accumulated, updatedAt) | The §2.4 depletion accumulator, read through its ×0.9/day decay, rows touched inside the window. **Pressure-weighted units — not a per-day mined ledger.** |
| `lanes[]` | `LaneUsage` (laneKey, usage, updatedAt) | §2.8 dispatch counter, ×0.97/day decay. Dispatches only. |
| `tollsByZone[]` | `GameLedgerEntry` reason `lane_toll_income`, refId `zone:payer` | Real governor income, keyed by **zone**. Lane rows list their `zoneSlugs` so the UI shows the zone's toll next to the lane. |
| `exporters[]` / `importers[]` | `MarketFill` (buyer, seller, quantity, totalValue, resourceSlug) | Top 10 corps per resource by units sold / bought. Names for all ten; **exact figures for ranks 1–3, coarse ranges below** (free tier — scouting is legitimate, precision is earned via `market_spy`). NPC market maker and NPC industrial corps are ranked as ordinary participants and labelled `npc`. |
| `chokepoints[]` | derived from `lanes[]` | Lanes with dispatches ≥ P80 of all active lanes (`volume_p80`). |
| `npcShare[]` | derived from `MarketFill` | NPC participation per fill side (player↔NPC fill = 50 %). |
| `consumption.world[]` | `MarketResource.totalDemand` | Cumulative recipe demand, world-level, all-time — **not windowed**. |

### Not yet persisted — returned as `null` + `reason`, listed in `missing[]`

| Flow | Why it is null | Attestation that would light it up |
|---|---|---|
| `lanes[].cargoByResource` | `laneDispatchesThisTick` carries dispatch counts only. | Extend the sync payload with `{ laneKey: { resourceId: units } }` and a `LaneCargo` daily rollup (or add JSON `cargo` to `LaneUsage`). |
| `lanes[].tollPaid` | Tolls are ledgered per zone; no lane key on the ledger row. | Put `laneKey` in the `lane_toll_income` refId (`zone:payer:laneKey`) — no schema change. |
| `consumption.perLocation` | `consumedThisTick` is world-keyed by resource and only increments `totalDemand`. | Key the payload by location (the client already knows which building consumed) and add a `LocationConsumption` accumulator mirroring `LocationExtraction`. |
| `chokepoints` (`carrier_concentration`, single corp ≥ 50 % of a lane's cargo) | Per-lane per-corp cargo is not persisted. | Falls out of the `LaneCargo` rollup above if it records `profileId`. The rule is implemented (`detectChokepoints(lanes, carrierShares)`) and tested; it just has no input yet. |
| `production` as windowed units | `LocationExtraction` is a decaying pressure score. | A `LocationExtractionDaily (locationId, resourceId, day, units)` rollup written by the same sync branch. |

No DDL was needed for this pass — everything shown derives from existing rows.
