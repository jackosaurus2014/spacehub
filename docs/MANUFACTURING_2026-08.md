# Manufactured Goods & NPC Industry — 2026-08-29

**Founder ruling (Jay, 2026-08-29):** componentry and hardware (structural beams,
satellite buses, life-support packs, electronics, propulsion, station modules,
fusion cores, habitat pods, and the refined intermediates) are **manufactured,
not mined**. They require fabrication facilities — on Earth, on other worlds,
or in orbit — and are made from resources. Players and NPC corporations can
manufacture them and offer them for sale; the market carries **no inventory of
them until someone lists what they built**. Supply and demand are real.

This document records what shipped, the invariants it enforces, and what is
deliberately left for later.

## What was wrong

- The market UI labelled every crafted good "⛏ Mined only — not for sale". The
  underlying list (`MINED_ONLY_RESOURCE_IDS`) had become "no NPC curve supply",
  which lumped exotic expedition finds together with smelted ingots.
- The NPC market maker still rested small out-of-nothing asks for components
  (`npc-volume-caps.ts`: 8 beams, 6 electronics… per day) — inventory nobody built.
- Selling crafted goods **to the curve** was allowed and unbounded — infinite
  NPC demand, the mirror problem. The crafting panel even credited the sale
  client-side when the server refused.
- Recipes were pinned to one specific building id (`fabrication_lunar` for
  most), so an orbital lab could not forge beams, and there was no Earth
  factory at all.

## What shipped

### Resource classes (`src/lib/game/economic-sinks.ts`)
| Constant | Members | Curve buy | Curve sell | NPC maker |
|---|---|---|---|---|
| `MINED_ONLY_RESOURCE_IDS` | `exotic_fuel`, `xenogenic_biomatter` | no | yes | none |
| `MANUFACTURED_RESOURCE_IDS` | all 14 crafted outputs (`CRAFTED_PRODUCT_IDS`, now incl. `life_support_pack`) | **no** | **no** | **none** |
| `NO_NPC_CURVE_RESOURCE_IDS` | union | — | — | — |

`/api/space-tycoon/market/trade` rejects both directions for manufactured goods
with `manufactured: true`; the UI routes the player to the order book instead
of the old offline fallback.

### Fabrication anywhere (`src/lib/game/production-chains.ts`, `buildings.ts`)
- `facilityTierFor(recipe)`: recipe tiers 1–2 → any T1+ fabrication facility;
  tier 3 → T2+ (orbital lab, lunar/Mars plant…); tier 4 → T3+ (Mars plant,
  asteroid refinery, Titan chemical plant).
- `canFabricate(recipe, buildings, BUILDING_MAP)` replaces the old
  `requiredBuilding` equality check in `CraftingPanel`. `requiredBuilding` stays
  as flavour text.
- New **Terrestrial Fabrication Works** (`fabrication_earth`, T1, Earth,
  $350M, no research) — the first factory. Inputs still have to be bought or
  hauled; Earth power is unlimited.
- New crafting recipe `make_life_support_pack` (T2) alongside the passive
  lunar `life_support_works`.

### Order book is the only market for hardware
- Market tab: manufactured rows show **🏭 Manufactured · Order book** (buy) and
  **List** (sell), both jumping to the book with the resource preselected.
- Crafting tab: "Finished Goods — List on the Order Book".
- The book header reports how much of the ask/bid side is NPC industry.

### NPC industrial corporations (`src/lib/game/npc-industry.ts`)
Five named corps (Stellar Industries, Helios Energy, Nova Aerospace, Frontier
Spacecraft, Deep Space Holdings — factions per LORE.md), persisted in
`NpcIndustrialCorp`, ticked hourly by `/api/space-tycoon/market/npc-industry`
(cron `15 * * * *`):

1. **Buy raw inputs on the curve** with the same price/supply math players get
   (`curveBuy`) — NPC manufacturing moves raw prices.
2. **Run recipes** up to their facility tier, lower tiers first, toward small
   inventory targets driven by player demand (open non-NPC bids + 3-day run
   rate of player buys), capped per tier (40/12/3/1) and per tick (4/2/1/1
   batches).
3. **List what they built** as sell orders at unit cost × (1 + margin 20–40%),
   never below cost ×1.05, aging −5 %/day unsold. They never undercut below
   cost; a player who fabricates cheaper wins the sale.
4. **Bid for inputs they are short of.** A recipe blocked on a manufactured
   input (Nova short of electronics) turns into a standing buy order for it —
   cross-corp and player-fillable demand. First live tick showed exactly this
   starvation, so this is load-bearing.
5. **Ask floor.** Cost-plus but never a fire sale: asks floor at 75 % of the
   good's base value (aging to 60 %), because spot follows the last fill and
   spot pays contracts.
6. **Buy what they consume** (e.g. Nova wants 8 beams/week) with buy orders at
   95 % of reference, only while the treasury has a 3× cushion.
7. **Finite money.** Seed treasuries $1.5–6B, a $25M/tick stipend (scaled),
   capped at $8B. Fills settle against the corp row in
   `market-orderbook.ts` (`isNpcCorpId` branches) — no GameProfile.
8. **Recede with population** (`populationScale`): full weight ≤10 active
   corporations, linear down to 25 % at 260+.

`GET /api/space-tycoon/market/npc-industry` publishes each corp's stock, open
orders, what it makes and what it consumes — NPC demand is visible and
forecastable (CLAUDE.md).

## Invariants (tests)
- `manufactured-goods.test.ts`: class membership, every manufactured good has a
  recipe or producing building, maker caps are zero, no curve supply, facility
  tier gating, every recipe runnable somewhere.
- `npc-industry.test.ts`: roster consistency (makes only what it can run,
  consumes only manufactured goods, cross-corp demand exists), population
  scaling, NPC identity on the book.
- `goods-on-the-book.test.ts` updated: crafted goods are MANUFACTURED, not
  MINED_ONLY.

## Deliberately not done
- ~~**Location-aware inventory / hauling.**~~ **DONE 2026-09-02** — design-review
  row 13 (docs/GAME_DESIGN_REVIEW_2026-09.md §2, founder-approved). Building
  materials, crafting inputs/outputs, servicer repairs, survey finds and scrap
  recovery all resolve at the pool that physically holds the goods once the
  `logisticsUnlocked` ratchet is on; BuildPanel names the shortfall and offers a
  one-click hauler. Market sells and delivery contracts still clear only at the
  home cluster, and expedition supplies still stage from Earth — both by design.
  Saves with the ratchet off are byte-identical to before. Full write-up:
  docs/BALANCE.md "Location-aware hauling (2026-09-02)".
  **Server note:** the sync's `serverResources` remains a single global map —
  server truth is location-agnostic and this slice is a client-economy change.
  A spend debits the same TOTAL units server-side; the attestation/ledger paths
  (`inventory-attestations.ts`, the `/assets/*` routes) are unchanged. Deferred
  within the row: Mark-II/III refits and ship hulls still draw the global pool
  (import-cycle and shipyard-siting reasons respectively).
- **Per-save NPC rivals** (`npc-engine.ts`) still only mine common resources;
  they are a client-side flavour system, not the shared market.
- **Delivery contracts** remain a second outlet for crafted goods; their
  pricing is unchanged.

## Balance notes
- BALANCE.md previously called the tiny component maker caps "load-bearing"
  because crafting was output-bound and components exited via contracts. The
  NPC corps' *buy* orders replace that outlet with demand that is finite and
  visible; watch `unitsSold` per corp and the ask/bid depth on beams and
  electronics during the first two weeks of Epoch 2.
- Raw-input purchases by NPC corps are modest (a few recipes per hour) but do
  hit the curve; iron/aluminum should drift up slightly on a quiet server.
