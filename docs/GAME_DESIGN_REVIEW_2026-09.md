# Space Tycoon — Design Review, September 2026

*Editor: Claude (Fable 5.1), 2026-09-02. Inputs: six review lanes run against the live code and the Epoch 2 production world (systems inventory, command-center UI audit, graphics inventory, adversarial cheat audit, economy viability pass, and a revenue-curve trace of the top live profile). Every Critical/High claim quoted here was re-verified in source before ranking. Companion docs: BALANCE.md, SESSION_DESIGN.md, NPC_BACKDROP.md, STATS_DESIGN.md, SECURITY_AUDIT_2026-09.md.*

## The read

Three facts dominate everything else.

1. **The game runs on two clocks.** The engine credits one-thirtieth of a building's monthly revenue every 2-second tick — one game-month of income every 60 seconds — while the same tick takes its date from the server calendar, which advances one game-month every 6 hours (`server-time.ts:33`). Revenue accrues 360× faster than the world it is denominated in. Every balance playtest in BALANCE.md was run at 6 hours per month, so every number in those tables is what the designers *intended* and none of them is what players *experience*. The live proof: your own corporation has earned $250B from 11 starter-tier buildings in nine wall-clock days, with $129B in cash and nothing worth buying. The player who joined yesterday earned $482M from four buildings. This is a unit bug, not a tuning gap, and it is the first thing to fix.

2. **After the clock is fixed, the economy stalls rather than runs away.** The 50-year playtests show sink coverage of 95–103% every decade (no runaway) but decision cadence collapsing from 25 build/research months per decade to 3 by year 30, with the industrialist archetype flat at $47M/month for forty years. The catalog jumps from $2B rungs to $8–80B rungs with nothing between, roughly 200 of 294 techs are numerically inert past the aggregate caps, T4/T5 flagships are money-losing assets, and the interstellar era is built but unreachable ($680B research chain against a best-case 50-year gross of $611B).

3. **Every PvP lever is built, priced, and at zero all-time usage.** Price campaigns, poaching, cornering, espionage, takeovers, slot auctions: 0. Alliances in production: 1. Two of the six are population-gated at thresholds the world will not reach for months. The rest is a surfacing problem the 9/1 discoverability pass only began to address. Meanwhile the one commitment that would make "economic warfare" have an agreement half — binding corp-to-corp contracts with escrow and penalties — has no implementation at all.

Underneath those three: the cheat audit found five critical exploits (a $10M-per-request money ratchet, an unclamped first sync, a lease transfer that debits any player without consent, contract payouts verified against client-written columns, and non-finite net worth poisoning every ranking). Those are bugs, not design questions, and a fix batch is already in progress; they are listed in §5 for the record.

---

## 1. Decisions for the founder

These change what players see and need your call. My recommendation is first in each.

**D1 — Which clock is canon?**
- **(A) Re-base revenue to the 6-hour month (recommended).** Change `fraction` in `game-engine.ts:196` to elapsed-time over `REAL_SECONDS_PER_GAME_MONTH`; delete the two shadow constants; fix away-operations to the same clock; add corporate overhead and executive compensation to the offline cost path; re-derive the money plausibility ceiling (currently 33,000× looser than its own comment). Effect: your $134B corp becomes roughly $373M — exactly where the playtest puts a week-old 11-building corp — and the 50-year deep-tier horizon you ruled canon on 8/17 becomes real (50 game-years ≈ 150 real days). Every BALANCE.md number starts to mean something.
- (B) Re-base the calendar to the 60-second month. Breaks the 50-year horizon (50 years = 10 hours), invalidates every playtest, and makes leagues, quarters, seasons, and chapters race past players.
- (C) A middle clock (for example 1 hour per month) with a full retune. Most work, least evidence.

**D2 — What to do with existing saves when D1 lands.** Epoch 2 has two profiles: yours and one nine-day-old newcomer. Options: (A) divide all money and totals by 360 on migration and keep everything else (honest, one SQL statement, tell both players); (B) leave balances as they are (your $129B cash becomes a permanent distortion for the whole epoch); (C) Epoch 3 reset. I recommend A now, while the world has two players and never again.

**D3 — Retire the dormant pay-to-win file.** `subscriber-perks.ts` grants +$75M starting cash and 1.15× research and build speed to subscribers. It has zero importers today, so nothing is live, but it directly contradicts CLAUDE.md and POLICY.md. Recommend deleting the money and speed fields and keeping queue slots and notifications only.

**D4 — Mark-II upgrade tier (the open #30 item).** Fill the $2B → $8B catalog void with an in-place upgrade that improves an existing building (revenue ×1.6, maintenance ×2.2) instead of adding copy N+1 into a 0.35-floored saturation pool. This is content, not repricing, which matches your 8/17 delegation.

**D5 — Flagship economics.** T4/T5 flagships self-pay in 618–3,393 game-months. Pair a flagship maintenance sink (0.3–0.5%/month of asset value) with a T5 research reprice (÷10) and a flagship income raise so payback lands in 120–240 months. Both halves or neither, because research spend is ~30% of all money destroyed and removing it alone breaks the money supply.

**D6 — Lower the PvP population gates, or seed them.** Takeovers at 10 active corps instead of 25; slot auctions on relative occupancy percentile instead of an absolute 85%; divide `LABOR_SUPPLY_BASE` by ~5 so the wage index leaves its 0.80 floor at 15 corps. Without this the top half of the design cannot be experienced before the userbase is large, and the userbase will not grow on a game whose competitive half is invisible.

---

## 2. Ranked proposals

Each names its loop and the CLAUDE.md invariant it serves. Effort: S (hours), M (days), L (a week or more).

| # | Proposal | Loop | Invariant | Effort |
|---|---|---|---|---|
| 1 | **Unify the game clock** (D1-A) + away-ops parity + plausibility ceiling re-derived from the real clock | all | P&L, long-horizon | M |
| 2 | **Binding corp-to-corp supply contracts**: `issuerProfileId` on contracts, server-ledger escrow, milestones, auto-penalty on default, public feed entry | weekly / monthly | corporate scale, meaningful decision | L |
| 3 | **Commodity flow map + exporter/importer rankings** from MarketFill and lane usage counters; the missing third of the intelligence pillar and the likeliest cure for zero PvP usage | daily | market intelligence | M |
| 4 | **Mark-II in-place upgrades** (D4) | weekly | meaningful decision | M |
| 5 | **Flagship sink + T5 research reprice** (D5) | campaign | P&L, interstellar extension | M |
| 6 | **Per-building crew requirements** (STATS_DESIGN already specifies them) so labor demand scales with fleet size; this is what makes poaching, wage wars, and the fee index live simultaneously | daily | meaningful decision | M |
| 7 | **Lower or seed the PvP population gates** (D6) | weekly | corporate scale | S |
| 8 | **Retire inert techs**: convert the ~200 capped "+30% X" nodes into repeatable programs that feed below the cap, or label them honestly as gates with no bonus | monthly | meaningful decision | M |
| 9 | **Index the daily bonus and static contract ladder to tier** (or retire the daily bonus above T3); a flat $508M/week is dominant at a $100M start and noise at $136B | daily | P&L, no P2W | S |
| 10 | **Corp-to-corp pacts + arbitration + signed-agreements timeline**: extend alliance diplomacy to corp pairs, enforce no-poach clauses against the poaching route, faction-mediated arbitration fee as a new sink, all routed into the activity feed | monthly | corporate scale, no combat | L |
| 11 | **NPC density governor** (floor of 3, scale the 10-corp roster with population) and publish the quarterly balance report with Gini and NPC share (POLICY.md commitment; the data already exists) | monthly | NPC backdrop, simulation integrity | S |
| 12 | **Signal-lag execution for interstellar commands** (`PendingInterstellarCommand` is a type with no consumer) so the beyond-heliopause era has its own texture | campaign | interstellar extension | M |
| 13 | **Location-aware inventory and hauling** (already scaffolded: `locationInventories`, `cargo-logistics.ts`); route build, craft, and sell consumption through per-location stock with the `logisticsUnlocked` ratchet | daily | logistics cost money | L |
| 14 | **Rivals reward path**: today Rivals is a leaderboard with no consequence; tie a rival's relative performance to a small weekly stake (reputation or a league metric) so tracking one is a decision | weekly | meaningful decision | S |
| 15 | **Delete `refining.ts`** (dead duplicate of production-chains) and the orphaned competitive-contracts client gap: either wire a UI or fold it into bidding | — | hygiene | S |

---

## 3. UI and interface

Findings from the code-level audit, ranked by player impact. Numbers are counts in `src/components/game`.

- **30 top-level tabs, 9 visible, 21 behind "More".** Eight tabs were merged into hubs once already and the count regrew. Rivals is three taps deep and gated; P&L is two taps deep and not in the primary row. Proposal: a second consolidation into 6 hubs (Command, Build & Fleet, Markets, Contracts & Diplomacy, Corporation, Records), with Rivals and P&L promoted into the primary row.
- **The design system is absent from the game.** The shared kit (Console, DataTable, StatusPip, Deck) has zero adoption in game panels; 296 raw hex literals and 912 cyan / 694 amber / 620 red Tailwind utilities versus the five documented tokens. The "warm near-black + ember" redesign stops at the game's door. Proposal: a panel-by-panel migration starting with Dashboard, Market, and Build, using Console and DataTable; StatusPip everywhere a color currently carries state (the colorblind commitment).
- **Touch targets and mobile.** The primary tab bar is 36px; the game has no mobile bottom nav; 57 `md:` breakpoints across 50,000 lines. Proposal: 44px tabs, a five-slot game bottom nav on phones, and responsive treatment of the eight most-used panels.
- **Overlay stacking.** Ten overlay components mount at shell level with independent focus traps and no arbitration. Proposal: one overlay manager with a priority queue (cinematic > modal > toast) so two never render at once.
- **Performance.** Zero `React.memo`, 68 `setInterval` sites (four independent 1-second tickers), seven alliance panels each polling the server on their own timers, and a 3,018-line shell holding all top-level state. Proposal: a shared polling layer with one clock, memoised list panels, and splitting the shell by hub.
- **Icons.** 47 files still use raw emoji next to 310 GameIcon usages. Finish the migration.

## 4. Graphics and identity

- **Live rendering bug:** every mine and fabrication plant (32 of 96 building definitions) shows habitat art because `assets.ts` keys on the legacy category names `mining`/`fabrication` while `buildings.ts` uses `mining_enterprise`/`fabrication_facility`. The correct tiered art exists on disk and is unreachable. One-line fix; included in the exploit batch's hygiene tail.
- **Two ship hulls render the wrong image** (servicer tug and fleet tender show the cargo shuttle).
- **Region identity is thin at the edges.** Seven outer bodies share one ice-planet image; two share one lava image. Proposal: an art batch of seven distinct outer-body vistas plus the 23 resources with no art (34% coverage today), using the existing Gemini pipeline and the "no letters, numbers, glyphs" prompt lesson.
- **Dead bytes.** ~111 generated size variants are never loaded; 14 achievement badges and 4 legacy JPEG textures are orphaned; 37 building images exceed 300KB. A cleanup and compression pass.
- **What is good:** the 3D map is well engineered (instanced belt, sprite labels, bloom as a lazy chunk, 2D fallback, reduced-motion respected), commanders and factions are 100% covered, sound is fully synthesised, and no asset path in the map layer is broken.

## 5. Security and abuse (fix batch in progress)

Critical, verified in code, being fixed now: first sync of a new profile accepts money/resources/buildings verbatim; the money plausibility ceiling grants at least $10M per request regardless of elapsed time; orbital-slot lease transfer debits any named player at an attacker-chosen price with a balance oracle; $50B competitive contracts verify against client-written columns; non-finite resource values produce Infinity/NaN net worth that sorts first in every ranking. High: forged buildings inflate book net worth, zone governorship, milestone claims, season ceilings; wash trades between alts mark the world price and the NPC market maker pays for it; the legacy `market/trade` route moves world prices with no holdings check; no per-profile rate limits on economic routes; no alt/device linkage anywhere.

What is already solid and should not be redone: the money ledger and reconciliation, escrow-backed paths gating on server truth (phase 2), the server-derived company names and milestone rewards, espionage never harming targets economically, treasury permissions, colony fees, bounty escrow, prediction stake uniqueness.

**The structural fix** for the remaining class (contracts, book value, zones, season ceilings all reading buildings/ships/research) is phase 3: a server-side construction and research ledger where an asset row exists only because a paid, ledgered server transaction created it, with server timestamps for completion. Estimate: two to three weeks. Everything else in §5 is fixable in days and is being fixed.

## 6. Suggested order of work

1. Exploit batch (in progress) → deploy → flip `RESOURCE_CLAMP_MODE=enforce` after the shadow week.
2. D1 clock unification + D2 migration + D3 perks file, as one deploy with a player notice.
3. Proposals 7, 9, 11, 14, 15 (all S) in one batch.
4. Proposal 3 (flow map) and 4 (Mark-II): the two that most directly convert intelligence into decisions.
5. UI consolidation into six hubs with the design-system migration of the three busiest panels.
6. Proposals 2 and 10 (contracts, pacts, arbitration): the diplomacy half of economic warfare.
7. Phase 3 server-side asset ledger.
8. Proposals 5, 6, 8, 12, 13 as the endgame block.
