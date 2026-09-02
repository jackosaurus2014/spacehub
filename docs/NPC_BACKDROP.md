# Space Tycoon — NPC Economic Backdrop

Complement to the "NPC economic backdrop as MMO insurance" principle in [CLAUDE.md](../CLAUDE.md).

## Purpose

An MMO economy cannot depend on player density. Without enough active players,
markets would starve, contracts would dry up, and the world would feel dead.
NPC companies provide a **floor** — steady-state economic activity that makes
the game feel alive at any player count, and gracefully recedes as players scale in.

Audit date: **2026-04-19**. System already implemented; this doc codifies design intent and audit findings.

## Design rules (from `src/lib/game/npc-engine.ts`)

The existing NPC engine enforces these invariants:

1. **Speed:** NPCs progress at ~1/10 player speed — research, building, revenue. Fast enough to matter, slow enough that players always outpace them.
2. **Territory:** NPCs NEVER claim rare/unique locations. No Pluto, Triton, Enceladus, etc. Only LEO/GEO/Lunar/Mars.
3. **Resources:** NPCs only mine COMMON resources (iron, aluminum, titanium, water, methane, ethane). No exotics, no rare earths, no platinum group.
4. **Market behavior:** NPCs buy and sell to gently nudge prices — never to crash them. Goal is liquidity, not pressure.
5. **Milestones:** NPCs NEVER claim competitive milestones. Player-first.
6. **Research pool:** 10 basic techs only (reusable_boosters, high_res_optical, ion_drives, etc.). No endgame research.
7. **Service pool:** 11 basic services only. No exotic mining services, no outer-system activities.

## Roster (`src/lib/game/npc-companies.ts`)

Ten NPC companies, each with a distinct personality:

| NPC | Strategy | Progression | Mining Focus | Narrative role |
|---|---|---|---|---|
| Orbital Dynamics Corp | aggressive | 0.35x | 0.6 | Small launch provider |
| Stellar Industries | balanced | 0.3x | 0.7 | Diversified miner / manufacturer |
| Nova Aerospace | aggressive | 0.4x | 0.5 | Scrappy startup |
| Titan Mining Collective | conservative | 0.25x | 0.95 | Pure mining ops — major supplier |
| Artemis Ventures | balanced | 0.3x | 0.6 | Lunar mining + tourism |
| Deep Space Holdings | conservative | 0.2x | 0.8 | Slow and steady long-term miner |
| Cislunar Partners | aggressive | 0.35x | 0.7 | Earth-Moon corridor ops |
| Helios Energy | balanced | 0.3x | 0.5 | Solar power provider |
| ... | | | | (10 total; see source for full list) |

## How this delivers "MMO insurance"

- **At low player count**, NPCs produce + consume enough to keep markets moving. A solo player logging into a quiet server still sees live prices, trade volume, and market activity.
- **At moderate player count**, NPCs provide 30-50% of economic activity — a supporting chorus, not the lead.
- **At high player count**, player activity dominates; NPCs recede to ~5-10% of volume. They remain visible but no longer carry the economy.

Because NPC speed is multiplied by `progressionSpeed` (0.2-0.45x), they scale proportionally to game-time rather than player-time. This gives them a predictable "baseline pressure" profile regardless of how many humans are online.

## NPC forecasting and visibility

Per the CLAUDE.md principle "NPC demand is visible and forecastable":

- **Existing:** Market prices move in response to NPC buy/sell actions via `npc-engine.ts:applyNPCMarketActions`. Prices are visible; player can infer NPC pressure.
- **Recommended (future):** Publish NPC procurement events ahead of time — "Titan Mining Collective will buy 500 iron at day 10" — so players can plan around scheduled demand.

## Audit observations

### ✅ Strong: Design invariants are enforced in code, not just hoped for
`NPC_ALLOWED_LOCATIONS`, `NPC_ALLOWED_RESOURCES`, and `NPC_RESEARCH_POOL` are real constants gating all NPC behavior. A developer adding new NPC content cannot accidentally violate the "no rare content" rule without editing those lists.

### ✅ Strong: 10 NPCs provide enough variety
Three strategies (aggressive / balanced / conservative) × varying mining focus × progression speeds creates a diverse backdrop. The economy has obvious buyers, sellers, and market makers.

### 🟡 Medium: No "faction-aligned" NPCs yet
The six canonical factions (Dominion, Syndicate, Void Corsairs, Hive Collective, Nebula Reavers, Echo Remnants) don't yet own NPC corporations. Connecting NPC corp behavior to factions would:
- Give faction flavor to market activity ("The Dominion is stockpiling titanium")
- Let players influence NPC behavior through faction reputation
- Tie into the Diplomacy system (accepted a Syndicate contract → watch Syndicate NPCs respond in the market)

**Suggested next step:** add `factionId?: FactionId` to `NPCSeedData`, assign each of the 10 NPCs to a faction, and use that alignment to bias their market behavior. This is a ~1 hour change.

### 🟡 Medium: No NPC dormancy / dynamic population scaling
All 10 NPCs are always active. For very quiet servers, 10 may be too few; for very busy ones, 10 may be too many. Consider a density governor that activates/dormants NPCs based on observed player activity, with a minimum floor of ~3.

### 🔴 Attention: NPC player-count scaling is assumed, not measured
We say "NPCs scale proportionally" and "recede at high player count," but there's no live telemetry confirming this ratio. Add the NPC share-of-market metric to the quarterly balance report (see POLICY.md → Simulation Integrity → Balance review cadence).

### ✅ Strong: NPCs never break the competitive promise
Every invariant that matters (no rare locations, no endgame content, no milestone claims) is enforced. Players are never robbed of an opportunity by an NPC.

## Related systems

- **Market:** NPC actions modify `priceHistory` via `applyNPCMarketActions`. Visible in Market Intelligence panel.
- **Diplomacy:** NPC delivery contracts (not yet implemented) would go here. Currently contracts are generic client-less ("Global Telecom Corp") rather than tied to any of the six factions or the 10 NPC corps.
- **Forecasts:** Not yet implemented; would surface NPC scheduled demand on the Analytics tab.

## Checklist for future NPC work

When touching NPC behavior, verify:

- [ ] Does this change risk NPCs beating players to milestones?
- [ ] Does this change risk NPCs claiming rare content?
- [ ] Does this change the NPC economic share-of-market by more than ±10%?
- [ ] Is the change predictable and forecastable to players, or invisible?
- [ ] Does it scale gracefully across 1-player and 10,000-player shards?

## NPC forecast (published, 2026-09-01)

The "recommended (future)" item above is built. `GET /api/space-tycoon/npc-forecast`
(`src/lib/game/npc-forecast.ts`, cached 10 minutes, free intel tier — the same
public gate as `/api/space-tycoon/demand-pools`) publishes, 72 hours ahead by
default (`?horizon=24..168`, `?resource=<slug>` to filter):

- **industry** — for each of the five NPC industrial corporations
  (`npc-industry.ts`): raw inputs it will buy off the curve to run recipes,
  the manufactured goods it will bid for (standing consumption = *scheduled*;
  recipe-input shortfalls = *projected*), and the units it will have listed,
  each with the bid or ask price it will use.
- **drive** — every open NPC procurement drive (`BiddingContract` rows with
  `issuerNpcId`) with its quantity, per-unit price cap (`maxBid / quantity`,
  never above spot × `NPC_DRIVE_PRICE_CAP_MULTIPLIER`), issuer, faction and
  bidding window. Always *scheduled*.
- **pool** — the next-24h NPC floor demand per authored (location, service
  category) market in dollars: `getNpcFloorDemand × getDemandPoolSeasonModifier
  × 24/730`. Always *scheduled*; excluded from `byResource` (dollars, not units).

**Formula-parity guarantee.** The forecast does not estimate the tick; it runs
the tick's own arithmetic. Every per-tick quantity and price decision in
`runNpcIndustryTick` was factored into exported pure helpers
(`npcConsumptionWantPerTick`, `npcProductionTarget`, `npcBatchesPerTick`,
`npcListCap`, `npcShortfallWant`, `npcBuyOrderQty`, `npcBuyPrice`,
`npcListPrice`) that BOTH the tick and `simulateNpcCorp` call, and the
population scale comes from the same 14-day `gameProfile` count. What the
forecast cannot know — whether the treasury cushion holds, whether the curve
can fill a raw buy, whether players buy the stock — is what the *projected*
label means. `src/lib/__tests__/npc-forecast.test.ts` runs the real tick
against an in-memory Prisma and asserts the forecast's quantities and prices
equal the orders the tick actually rests.

Surfaces: Markets → Analytics → **NPC Demand** (table with window, NPC,
resource, side, quantity, price cap, confidence-as-text; resource filter
follows the order book's selection) and the order-book header line
"NPC demand next 72h: buy X / sell Y" for the selected resource.

## NPC density governor (shipped 2026-09-02)

The "No NPC dormancy / dynamic population scaling" item above is built
(`docs/GAME_DESIGN_REVIEW_2026-09.md` §2 row 11). `src/lib/game/npc-companies.ts`
exports the governor as pure functions of the **30-day-active player count**
(the same count the demand-pool scaler uses):

| Backdrop | Rule | 0–3 players | 13 | 33 | 47+ |
|---|---|---:|---:|---:|---:|
| Market corps (10, per-save, `npc-engine.ts`) | `clamp(round(10 − 0.15·n), 3, 10)` | 10 | 8 | 5 | **3** (floor) |
| Industrial corps (5, server, `npc-industry.ts`) | `clamp(round(5 − 0.075·n), 2, 5)` | 5 | 4 | 3 (at 27) | **2** (floor, from 40) |

- **Which corps sleep:** the tail of the seed order, so every save and the
  server agree. A dormant per-save NPC is returned untouched by
  `processNPCTick` — no revenue, research, expansion, production or market
  nudges — and resumes seamlessly if population drops. A dormant industrial
  corp has both sides of its resting `MarketLimitOrder` book cancelled
  (nothing is escrowed for NPC corps) and neither produces nor procures;
  its tick result carries `skipped: ['dormant (population governor)']`.
- **Delivery:** the sync route counts 30-day actives and sends
  `npcGovernor` on the server-effects hop; `clampNpcGovernorSnapshot`
  re-derives the counts from the population number on apply (a bugged or
  hostile snapshot cannot silence the backdrop). Solo/offline saves with no
  snapshot tick every NPC — an unsynced world is a quiet one.
- **Published:** `GET /api/space-tycoon/npc-forecast` → `npcGovernor`
  `{ activePlayers30d, activeNpcCorps, activeIndustryCorps, floorNpcCorps,
  floorIndustryCorps, maxNpcCorps, maxIndustryCorps, dormantIndustryCorpIds }`;
  industry forecast items are emitted only for active corps. The
  Leaderboard shows dormant NPCs with the title "Dormant".
- **Invariants held:** no new locations/resources/research for NPCs; the
  governor only ever removes activity, never adds capability; the
  `populationScale` share-scaler is unchanged and still applies to the corps
  that remain active.

Tests: `src/lib/game/__tests__/npc-governor.test.ts`,
`src/lib/__tests__/npc-industry-governor.test.ts`.
