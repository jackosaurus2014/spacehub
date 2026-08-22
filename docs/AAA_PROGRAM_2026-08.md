# AAA Program 2026-08 — playability, progression, and end-game

**Founder mandate (verbatim intent, 2026-08):** *"Do another several passes on ways to improve
playability, interfaces/graphics/screens, and progression, as well as end-game design. Each time do
a detailed research and analysis on how to make the game hold its current realism feel but also have
a AAA gamification quality similar to Sins of a Solar Empire, Stellaris and Master of Orion 2."*

This document is the **running log** of that sustained program. It is append-only: each round adds a
new `## Round N` section and adds a line to the round index. Earlier rounds are never rewritten —
if a later round supersedes an earlier finding, it says so explicitly in its own section.

---

## Part 0 — Program charter

### 0.1 The tension this program exists to hold

Space Tycoon is a **hard-science economic simulation**. Real Δv budgets (`solar-system.ts`), real
supply and demand with a FIFO order book and escrow, real extraction pressure, real cryogenic
boiloff, real administrative diseconomies of scale. That realism *is* the product identity and is
not tradeable.

What the three benchmark games have that we do not is **gamification quality**: the loops,
legibility, spectacle and payoff that make a session compulsive. The program's job is to add that
*on top of* the simulation, never in place of it.

The operating rule for every proposal in every round:

> **A mechanic earns its place only if a 22nd-century corporate simulation would plausibly contain
> it.** Stellaris's endgame crisis becomes a systemic economic emergency, not an extradimensional
> invasion. MoO2's Galactic Council becomes the Accord Senate we already have. Sins' Titan becomes a
> capstone infrastructure asset that grants new *verbs*, not a super-weapon.

### 0.2 The standing bar (every round, every proposal)

- **Honest data.** No fabricated numbers, no placeholder telemetry presented as measurement. Every
  claim cites a file, a function, or a named sim run. Where a number is an estimate, it says so.
- **Sim-validated economy changes.** Anything that moves revenue, cost, price, or payout math must
  be run through `scripts/sim-harness.ts` and the relevant runner (`sim-strategies`, `sim-resources`,
  `sim-pvp`, `sim-tools`, `sim-50yr`) with defaults-off invariance diffed, *before* it ships. This is
  the bar Passes 1–9 of `BALANCE.md` established and it is not negotiable.
- **No-combat canon.** No PvP combat, ever. Destruction is hazard-, disaster-, or NPC-driven, and
  forecast-visible (`hazards.ts::forecastSevereHazards`).
- **No pay-to-win.** Per `POLICY.md`. Cosmetic and convenience only.
- **Accessibility.** Keyboard reachable, screen-reader labelled, colourblind-safe (never colour
  alone), reduced-motion respecting.
- **375px mobile parity** at 60Hz.
- **No 29th tab.** The tab count is capped at 28 by standing convention (`LIVE_SERVICE_2026-08.md`
  §LS1). New surfaces live inside existing tabs/hubs.
- **Extend, don't greenfield.** If scaffolding exists, extend it. The engine has ~140 modules in
  `src/lib/game/`; almost every "new" idea already has a home.

### 0.3 Relationship to sibling programs

| Document | Owns | Status |
|---|---|---|
| `docs/VISUAL_AAA_2026-08.md` | Interface *materiality* against the same three benchmarks (panel chrome, numeric legibility, flow rates, docked bezel) | Active, parallel — **do not duplicate** |
| `docs/VISUAL_DEPTH_2026-08.md` | Information architecture (icons, tooltips, outliner, situation log, map-as-stage) | Complete (V1–V8) |
| `docs/4X_BASELINE_2026-08.md` | Content-density parity vs Stellaris/MoO2 (techs, chains, leaders, missions) | Complete (W1–W14) |
| `docs/LIVE_SERVICE_2026-08.md` | Retention architecture (queues, calendar, eras, charters, chapters, seasons, realignment) | Complete (LS1–LS9) |
| `docs/BALANCE.md` | Economic truth. Passes 1–9. **Pass 7 is founder-ruled canon.** | Living |
| **This document** | **Playability, progression, and end-game design** | Round 1 open |

### 0.4 Round log format

Each round is: **(a) Audit** — what exists, verified against code, classified LIVE / DORMANT /
VESTIGIAL / BROKEN, plus where the genuine holes are. **(b) Reference analysis** — the mechanism each
benchmark uses and its realistic analogue. **(c) Proposals** — each with player fantasy, time loop,
realism preservation, existing systems it extends, economic consequence, accessibility/mobile
implication, and size (S/M/L). **(d) Prioritized recommendation** for that round's implementation
wave. Plus a shared **rejected ideas** register at the end of the document.

### 0.5 Round index

| Round | Topic | Status |
|---|---|---|
| 1 | **End-game design** — what carries a committed player from year 10 to year 50 | Design complete; **wave E3 (plumbing repair) implemented 2026-08-21** — see "E3 implementation" at the end of this document. **Wave E4 (the Legacy Hall) implemented 2026-08-22** — see "E4 implementation". **Wave E1 (the Accord Chair) implemented 2026-08-22** — see "E1 implementation". All three Round-1 waves shipped. |
| 2 | **Escalating pressure and progression pacing** — R1-E2 (Systemic Crises + the Situation mechanic), deferred by Round 1 to headline this round | **Designed and implemented 2026-08-22** — see "Round 2" at the end of this document. Ships the Accord Emergency Register: five telemetry-scaled emergencies on an 8-week cycle, the per-corporation exposure bar with three costed postures, the Accord Stabilization Assessment (forced cooperation, free-riding visible), a second Chair verb, and a permanent public register. **`prisma db push` required.** |
| 3+ | (to be assigned — **strongest candidate: R1-E6 mid-band construction rungs**, which Round 2's §9b independently re-measured as the remaining answer for small portfolios. Other candidates: R1-E5 capstone verbs; interface/screens; the intelligence layer as gameplay) | Not started |

---

# Round 1 — End-game design

**Round question.** `BALANCE.md` Pass 7 ruled that deep-tier research taking >50 in-game years is
*intentional generational-legacy content*. That ruling is canon. But it leaves the real question
unanswered: **if the tech tree is deliberately not the end-game, what is?** Pass 5's 50-year
playtest found "dead decades" after year ~10 where the economic core's decision cadence collapses.
Something has to carry those decades.

**Method.** Every claim below was verified against the code in this repository on 2026-08-21 by
reading the modules and grepping for consumers (tick engine `game-engine.ts`, UI components
`src/components/game/**`, API routes `src/app/api/space-tycoon/**`, cron registry
`src/lib/cron-scheduler.ts`). Where a document contradicts the code, **the code is treated as truth**
and the drift is reported in §1.6.

---

## 1a. Audit — what end-game scaffolding actually exists

### 1a.1 Classification legend

- **LIVE** — computed by the tick or a cron, *and* reachable by a player through the UI.
- **DORMANT** — fully implemented but gated behind a threshold/flag that is not currently met.
- **VESTIGIAL** — exported/authored but has no consumer; spending on it buys nothing.
- **BROKEN** — wired, but a defect prevents it from producing its designed outcome.

### 1a.2 The end-game inventory

| System | Module | Verdict | Detail |
|---|---|---|---|
| **Victory conditions** | `victory-conditions.ts` (433 L) | **LIVE** (with a caveat) | 11 conditions (file header still says 7 — stale). Bonuses real: `getVictoryBonuses` read every tick at `game-engine.ts:251`, applied at `:479` (revenue), `:652` (build), `:715`/`:744` (research), `:366` (mining). **Caveat:** the *check* is a React effect (`page.tsx:1343-1374`) keyed on coarse `.length` deps, not a tick step — the four megastructure victories fire only incidentally (money changes most ticks). Victory `title` strings ("Galactic Mogul", "Ascendant") are interpolated into one event-log line at `page.tsx:1368` and **never applied to the player anywhere** — cosmetically vestigial. |
| **Legacy / permanent progression** | `legacy-system.ts` (628 L) | **LIVE bonuses, INVISIBLE content, partly BROKEN** | 48 milestones (header says 40) + 7 infinite stretches. Soft-capped per category (`CATEGORY_CAPS`, revenue 5.0 / build 2.0 / research 2.0 / mining 3.0 / cost 0.6, crew 30 hard) via `cap × (1 − e^(−raw/cap))`. Awarded on **1 game-month in 5** (`game-engine.ts:2230`). **There is no Legacy panel** — grep for `LEGACY_MILESTONES` / `getLegacyDisplayTier` across `src/components` and `src/app` returns zero hits. Legacy Power is visible only inside the tier-6-gated `SpeedRunPanel`. |
| **Corporate Eras** | `corporate-eras.ts` (548 L) + registry + public chronicle | **LIVE, 3 of 8 charters BROKEN** | 90 **real** days per era (`ERA_DURATION_MS`), 8 charters each a bonus/malus pair with a goal metric, bracket-scaled 1.0–4.5×. Completed unconditionally each tick at `game-engine.ts:2311`. Public chronicle at `/space-tycoon/chronicle` and `/space-tycoon/corp/[id]`. **Broken:** `getEraStatSnapshot` (`:223-235`) sources `buildingsCompleted`, `resourcesMined`, `shipsBuilt` from `legacy.trackers`, which never increments (see §1a.5) — so `expansion_era`, `belt_century`, `logistics_empire` always score 0 and always file a `filed` (worst) medal. |
| **Accord Senate** | `accord-senate.ts` (461 L) | **LIVE, but small and mis-cadenced** | 12 measures, `DOCKET_SIZE = 3`, deterministic per in-game quarter. Effects are real — `resolveMeasure` calls `applyChainConsequence` (`narrative-events.ts:222`), which mutates money, `activeEffects` revenue/cost/research multipliers, hazard mitigation, faction rep. **But** magnitudes are ±1–4% for 3–8 game-months, and an in-game quarter is 3 game-months ≈ **18 real hours**. The only decision is lobbying *your own* pass odds (≤$375M + ≤20 standing for ±20pp). **There is no vote between players, no election, no chair, no shared tally.** |
| **The Realignment / Epochs** | `realignment.ts` (406 L) | **LIVE** | Real UTC calendar quarters (~90 real days). Faction postures derived purely from senate + season aggregates; bands 0.8–1.2 (NPC bias 0.85–1.15). Real bite: `delivery-contracts.ts:185,364` applies a ±20% posture premium; `game-engine.ts:1733` feeds `npcBias` into the NPC tick. **Player decision: none.** It is a world modifier plus a published lore address. |
| **Story Chapters** | `chapters.ts` (795 L) | **LIVE, content-thin** | 6-real-week cycle: acts at weeks 0–3 (Thu 00:00 UTC), finale window Sat 18:00 → Sun 23:00 UTC of week 4, epilogue week 5. Finale roll genuinely weighted by server-wide participation (`prisma.chapterContribution.count`). **Only 3 chapters authored**; `getChapterForCycle` is `CHAPTER_DEFINITIONS[cycleIndex % 3]` — **the entire narrative catalogue repeats every 18 real weeks (~4.1 months)**. The module header admits this at `:22-25`. |
| **Seasons (competitive)** | `seasonal-events.ts` (748 L) | **LIVE** | 5 season types on a 31-day cycle (28d + 3d cooldown), 50 pass tiers, 5 brackets, cron `0 6 * * *`. Types rotate on a **155-day loop**. Opt-in fresh-start sandbox — parallel to, not part of, the main economy. |
| **Economic super-cycles** | `economic-seasons.ts` (242 L) | **LIVE, real bite** | 6 themes, ±25% hard-clamped bias, announced 7 days ahead. `getSeasonalMeanRevertTarget` is consumed by the hourly `market/mean-revert` cron — it moves the *equilibrium* price, not just a display. This is the single best-designed forecastable world signal in the game. |
| **Season Chronicle** | `season-chronicle.ts` + `public-season-chronicle.ts` | **LIVE** | Sealed once per season by the 06:00 cron; top-10 placements + prestige titles; public SSR page `/space-tycoon/seasons/[n]`. |
| **Corporate Doctrine** | `corporate-doctrine.ts` (536 L) | **LIVE** | 6 policies in 3 mutually-exclusive pairs, 6-month switch cooldown + payroll-scaled reorg cost. Real cross-module bite: low constituency approval *spawns* the `board_politics_demand` narrative chain (`narrative-events.ts:53,847`); morale feeds `workforce.ts:247`. This is the closest thing the game has to an ascension path — and it is reversible and shallow. |
| **Narrative chains** | `narrative-events.ts` (1,104 L) | **LIVE — the shared spine** | 13 chains, 45 stages, **25 of them real choices**. `applyChainConsequence` is the universal effect dispatcher that senate *and* chapters both delegate to. 1 tactical / 1 quarterly / 11 campaign cadence. |
| **Factions** | `factions.ts` (303 L) | **LIVE; licences VESTIGIAL** | Standing has real server-authoritative bite: `STANDING_BROKER_MODIFIER` (allied +0.15 → hostile −0.25) feeds `getEffectiveBrokerFeeRate` on **every trade** (`market/trade/route.ts:20,53`). Envoys escalate $50M → $2B. **But** the 6 authored `FACTION_LICENSES` have `grants` flags (`priority_routing`, `blackmarket_access`, `safe_passage`, `biomaterial_supply`, `route_charts`, `precious_access`) that **nothing reads**. `FactionPanel.tsx:114` renders an "owned" badge. They are pure money sinks with a cosmetic badge — the module admits this at `:217-222`. |
| **Zone influence / governorship** | `zone-influence.ts` | **LIVE** | Daily cron `0 1 * * *`. Governor benefits *are* wired now (`game-engine.ts:916-928`, `:475`, `economy-report.ts:410`) — the older `GAME_SYSTEMS_AUDIT_2026-08.md` §1b finding that they were "never called anywhere" is **stale**. 72h challenge windows. This is the one contested-territory surface that can actually fire at current population. |
| **Personal megastructures** | `personal-megastructures.ts` (979 L) | **LIVE — fully wired** | 12 structures, $160B (Solar Power Array) → **$3.6T** (Terraforming Engine); ~$12.6T for all 12; ~844 real build-hours serialized because only **one phase may build at a time across all structures**. All 7 bonus channels have tick consumers. **No dead bonuses.** But every reward is a *multiplier* or passive cash — none grants a new action. |
| **Cooperative mega-projects** | `mega-projects.ts` (593 L) | **DORMANT + BROKEN** | Server-wide, one global active row. 4 definitions ($225B → $5.75T). Library code is live end-to-end (sync payload → `server-effects.ts` → tick). **But the only creator of a `MegaProject` row is `scripts/seed-mega-project.ts`, which is not registered in `package.json` and hardcodes `space_elevator`** — 3 of 4 definitions can never be instantiated. And `space_elevator`'s sole reward, `launch_cost_reduction`, is **the one dead bonus** — self-documented at `mega-projects.ts:502-505` ("has no tick-level consumer yet"). Completing the only seedable global project currently grants nothing. |
| **Expeditions / interstellar** | `expeditions.ts` (1,186 L) | **LIVE engine, BLOCKED by UI** | The engine is genuinely complete: per-game-month hazard rolls in transit, real total loss (`phase: 'lost'`, ship deleted, insurance at 0.70), arrival outcomes, colony founding, 5 infrastructure levels, pop growth, colony crises, and interstellar trade routes that deposit goods into the same inventory the market trades. 30 game-months per light-year. Proxima explorer round trip = 268 game-months (~4.5 real hours); Sirius = 528. Colony L1→L5 = 336 game-months, $375B. **See §1a.5 defect #1 — the first jump is unreachable through the UI.** |
| **Interstellar data spec** | `interstellar.ts` (207 L) | **LIVE as a catalogue; signal-lag VESTIGIAL** | 5 systems. `PendingInterstellarCommand` and `signalRoundTripMinutes` have **zero references repo-wide** — the signal-lag mechanic described in the file header is types and comments only. `JUMP_DRIVE_RESEARCH` / `EXOTIC_FUEL_RESOURCE` are re-typed by hand in `research-tree.ts:212` and `resources.ts:163` rather than imported: two sources of truth. |
| **Colonizable bodies** | `colonies.ts` (633 L) | **PARTLY VESTIGIAL + BROKEN** | 12 bodies merged into `ALL_LOCATIONS` (11 base + 12 = 23). Unlock $8B (Ceres) → **$750B (Pluto)**. **But every building/service id those locations name (`colony_pluto`, `mining_mercury`, `svc_europa_deep_mining`, …) exists only inside `colonies.ts`** — none is in `BUILDING_MAP`. A player can pay $750B to unlock Pluto and then build nothing there. Separately, `venus_orbit` requires research id `aerostat_tech`, which does not exist (the tree has `aerostat_technology`) — Venus is permanently unreachable. 5 of 7 export blocks have zero importers. |
| **Speed runs** | `speed-runs.ts` (638 L) | **DORMANT + rewards BROKEN** | 15 timed milestones, 4 composites, weekly deterministic rotation, brackets keyed to Legacy Power, anti-cheat suspicion scoring, 4 API routes. **Gate: corporation Tier 6** — $5T `totalEarned`, 60 buildings, 300 Legacy Power. **Rewards:** `check/route.ts:239` returns a `rewards` object that `SpeedRunPanel.tsx:213-215` discards entirely; `legacyPoints` is not even a field on `LegacyState`. A completed speed run yields a leaderboard row and nothing else. |
| **Hostile takeovers** | `share-registry.ts` (575 L) | **DORMANT (honestly)** | Complete rule-set, Prisma schema, 2h cron, Frontier shield. Gate `TAKEOVER_MIN_ACTIVE_CORPS = 25` (`:47`), currently unmet. Env override `TYCOON_TAKEOVERS_FORCE='true'` exists but is **not set in any `.env` file**. `ShareRegistryPanel.tsx:150` renders an honest "awaiting market depth" state rather than pretending. Waiting on population, not code. |
| **Prestige / reset loop** | — | **DOES NOT EXIST (by design)** | `prestige.ts` was deleted. `state.prestige` survives only for one-time migration into `LegacyState` (`save-load.ts:312-381`). No component or route resets a run. Starting a speed run does **not** reset the save. |

### 1a.3 The reachability wall — the single most important number in this audit

Pass 5's 50-year shared-world playtest measured the **best** archetype's *lifetime* cumulative gross
(`totalEarned`) across 50 game-years (150 real days) at **~$611B** (`BALANCE.md` Pass 5, C2).
Against that measured ceiling:

| End-game gate | Requirement | Multiple of the best measured 50-year gross |
|---|---:|---:|
| Corporation Tier 5 (unlocks Megaprojects, Megastructures, **Victory**) | $500B `totalEarned` + 40 buildings + 25 research + 9 locations + 6 ships + 15 services + 10 contracts | **0.8×** — reachable at the very edge |
| Cheapest personal megastructure (Solar Power Array) | $160B capex | 0.26× |
| Median personal megastructure (Orbital Ring) | $450B capex | 0.74× |
| Corporation Tier 6 (unlocks **Speed Runs**, Espionage, Territory, Seasons) | $5T `totalEarned` + 60 buildings + 300 Legacy Power | **8×** |
| `jump_drive` research alone | $500B, 72 base-months, prereqs `fusion_drive` + `metallic_hydrogen` | 0.8× (on top of the prereq chain) |
| `economic_dominion` victory | $1T cash **held** + $5T `totalEarned` | **8×** |
| Corporation Tier 7 (unlocks the **Interstellar** tab) | $50T `totalEarned` + 100 buildings + 600 Legacy Power + 1 completed megastructure | **82×** |
| Full research tree | $5.62T (Pass 5) | **9×** |

**Read plainly: with the exception of Tier 5 and one or two megastructures, essentially every
declared end-game surface sits one to two orders of magnitude beyond what 50 in-game years of
best-in-class play actually earns.** They are not *content*; they are a *horizon*.

This is **not** a re-litigation of Pass 7. Pass 7 ruled on **research pacing** — deep-tier techs
taking >50 in-game years is canon. It did not rule on corporation-tier thresholds, victory
thresholds, or the megastructure→Tier-7→Interstellar chain, and it explicitly left open a residual
WATCH item ("flagship self-paybacks ... violates 'every decision meaningful' *whenever it becomes
reachable*"). The wall above is the **reachability** question, which is adjacent to and distinct
from the pacing question. Round 1 does not propose repricing it. Round 1 proposes making the years
*before* it worth playing, and making the horizon legible instead of silent.

### 1a.4 The dead-decades evidence (verbatim from measurement)

Pass 5 §"Findings — HIGH", H3, run by `scripts/sim-50yr.ts` §9. Decision cadence = months per
decade containing a real decision, where "real decision" is defined in the runner
(`sim-50yr.ts:484,673,697,706`) as **build capex, research completion, decommission, or price
campaign**:

| archetype | y1–10 | y11–20 | y21–30 | y31–40 | y41–50 |
|---|---:|---:|---:|---:|---:|
| mono-expander | 13 | 1 | 0 | 3 | 2 |
| vertical industrialist | 7 | 2 | 1 | 1 | 2 |
| resource hoarder | 3 | 3 | 0 | 2 | 2 |
| late joiners | ~2 | 0 | 0 | 0 | 0 |
| **diversified integrator (best case)** | **25** | **8** | **9** | **3** | **3** |

Measured causes, per Pass 5: (i) demand-pool floors make copy N+1 worthless; (ii) the build catalogue
jumps from ~$2B straight to $8–80B with nothing between; (iii) the research wall.

**The honest scope of this measurement matters.** The sim explicitly does **not** model
megastructures, interstellar expeditions, story chapters, senate/factions, hazards+insurance,
espionage, takeovers, seasonal events, or mentorship (`BALANCE.md` Pass 5, Coverage table). So the
table above measures the **economic core's** cadence, not total engagement. Pass 5 says so directly:
*"The non-economic loops (chapters, seasons, expeditions, megaprojects — not modeled) must carry
those decades; the economic core alone goes static by year ~12."*

**Round 1's finding is that those loops cannot currently carry it**, for reasons the audit above
enumerates: chapters repeat every 18 weeks; mega-projects can't be instantiated and their only
seedable reward is dead; interstellar is UI-blocked; speed runs are Tier-6-gated at 8× the measured
ceiling; era medals are broken for 3 of 8 charters; and permanent progression has no panel at all.

### 1a.5 Defect ledger — bugs that actively suppress the end-game

Each was verified directly, not inferred.

1. **BLOCKER — the first interstellar jump is unreachable through the UI.**
   `expeditions.ts:342-347` (`planExpedition`) permits launching with **zero** `exotic_fuel`: it
   buys the shortfall at `baseMarketPrice × FUEL_PROCUREMENT_PREMIUM (1.25)` as a money cost, and
   the module's own tests launch from a fuel-less state. But **every UI entry point requires
   inventory fuel**: `MapContextPanel.tsx:723-724` (`const fuelMissing = exoticFuel <
   sys.jumpFuelRequired`) disables the plan button at `:853`; `map-radial.ts:283-311` disables the
   radial action; `galactic-map.ts:232` shows the system as `locked`. `exotic_fuel` has **no
   Sol-side source** — `resources.ts:163` sets `startingSupply: 0, npcRestockPerHour: 0`; it is in
   `MINED_ONLY_RESOURCE_IDS` so the NPC market won't sell it; `npc-volume-caps.ts:47` caps it at 0;
   no building produces it (the Exotic-Matter Refinery is "to be added in the interstellar-industry
   wave" per `interstellar.ts:122` and does not exist). Its **only** producer is an interstellar
   colony. *You need a colony to get fuel, and (per the UI) fuel to launch the expedition that
   founds the colony.* `map-radial.ts:275-277` claims the gate "mirrors the planner exactly" — it is
   the inverse error.

2. **HIGH — `legacy.trackers` never increments.** The only writer in the repo is the save migration
   (`save-load.ts:357-362` and `:373-378`, both inside `if (!state.legacy)`). Verified by grepping
   `totalResourcesMined` / `totalBuildingsCompleted` / `totalShipsBuilt` across `src/`. Consequences:
   `legacy_first_mine` is permanently unreachable on a fresh save; `stretch_mining` (uses `|| 0`, no
   live fallback) is permanently level 0; and three of eight corporate-era charters
   (`expansion_era`, `belt_century`, `logistics_empire`) can never score above `filed`, which in turn
   suppresses the four medal-gated legacy milestones.

3. **HIGH — the only instantiable cooperative mega-project grants nothing.**
   `scripts/seed-mega-project.ts:35` hardcodes `space_elevator`; the script is not in `package.json`
   and no cron or admin route creates a row. `space_elevator`'s sole reward is
   `launch_cost_reduction`, which `mega-projects.ts:502-505` documents as having no tick consumer.

4. **HIGH — 12 colonizable bodies have no buildable content.** Every building/service id in
   `colonies.ts` `availableBuildings` resolves to nothing in `BUILDING_MAP`. A $750B Pluto unlock
   buys an empty location. `venus_orbit` additionally requires a research id (`aerostat_tech`) that
   does not exist.

5. **MEDIUM — speed-run rewards are computed and discarded.** `speed-runs/check/route.ts:210-239`
   returns `{cash, legacyPoints, title, badge}`; `SpeedRunPanel.tsx:213-215` does
   `if (res.ok) { await fetchData(); }` and ignores the body. `legacyPoints` is not a field on
   `LegacyState`. Titles/badges have no redemption path anywhere.

6. **MEDIUM — victory titles are never applied.** `VictoryDefinition.title` reaches only one
   event-log string (`page.tsx:1368`). Nothing writes it to player state or renders it on a profile,
   corp page, or leaderboard.

7. **MEDIUM — 6 faction licences are inert.** `purchaseFactionLicense` (`factions.ts:288`) spends
   real money and writes `state.factionLicenses`; the six `grants` flags are read by nothing except
   an "owned" badge.

8. **LOW — the victory check is a React effect, not a tick step** (`page.tsx:1343-1374`), keyed on
   `.length` deps that a completing megastructure does not change.

9. **LOW — `ClaimStake.expiresAtMs` is set and never checked** (`exploration.ts:311,342`) — claims
   never expire despite the documented 1-year lifetime. `gravitational_lens`'s promised "unique
   science boost" (`KIND_TITLES:178`) returns money only (`:209`); `hazard_zone` has no consumer.

### 1a.6 Where the genuine holes are (synthesis)

Setting aside defects, four **structural** holes remain:

- **H1 — There is no escalating external pressure.** Nothing in the game gets harder as you get
  bigger, and nothing threatens the whole server at once. Hazards scale per-building; market events
  are 4-hour windows; seasonal events are an opt-in parallel sandbox; chapters are narrative with a
  single binary choice each. There is no analogue of the mechanism that Stellaris uses to keep a
  dominant empire engaged.
- **H2 — There is no political contest with a prize.** The Accord Senate has lobbying but no
  election, no shared tally, no chair, and no way to *win* the politics. LORE already supplies the
  office (Secretary-General **Anatole Priest**) and the precedent for refusing the result (the
  **Treaty Fracture of 2143**). This is the most canon-ready hole in the game.
- **H3 — Capstones grant percentages, not verbs.** All 12 megastructures and all 11 victories reward
  multipliers and passive cash. Nothing you build at the top of the game gives you a *new action*.
  Sins' Titan and MoO2's Orion prize both change what you can *do*.
- **H4 — Long-horizon progression is invisible.** 48 legacy milestones, 7 infinite stretches, 5
  display tiers (Pioneer → Legend), 11 victory titles, 8 era medals, season prestige titles — and no
  surface anywhere that shows a player their own history. The trophies exist; the trophy room does
  not.

### 1a.7 Doc-vs-code drift found (report, do not fix in this round)

`docs/SESSION_DESIGN.md` is stamped **"Last audit: 2026-04-19"** and predates the 4X (W1–W14),
Live-Service (LS1–LS9), Economy-PvP (E1–E7), Meaningful-Decisions (M1–M6) waves and `BALANCE.md`
Passes 1–9. Verified drift:

| SESSION_DESIGN claim | Code truth |
|---|---|
| "Interstellar expansion *(end-game, not yet implemented)*" | `expeditions.ts` implements the full loop (transit hazards, loss, colonies L1–L5, trade routes); `interstellar.ts` + `InterstellarPanel` + `GalacticMapView` exist. Blocked by defect #1, not unbuilt. |
| "Corporate eras *(planned)*" | LIVE since LS4 (`corporate-eras.ts`, 90 real days, public chronicle). |
| "Faction realignment *(planned)*" | LIVE since LS9 (`realignment.ts`, real 90-day quarters, real ±20% contract posture). |
| "Corporate quarterly reports *(planned — Phase D roadmap)*" | LIVE (`quarterly-reports.ts`, `PublishedCorpReport` model, server-computed). |
| "Prestige / Legacy system — permanent bonuses **across resets**" | There are **no resets**. `prestige.ts` is deleted; `legacy-system.ts`'s thesis is explicitly "permanent progression without resets." |
| "🔴 No Campaign-scale milestones pre-interstellar" | Partially closed by corporate eras + chronicle + chapters + season chronicle. |
| Senate mapped to the "Quarterly" loop | The senate quarter is 3 **game**-months ≈ **18 real hours** — it lives on the daily loop, not the quarterly one. `realignment.ts` is the only true real-quarterly system. |

`docs/GAME_SYSTEMS_AUDIT_2026-08.md` §1b's finding that `getGovernorBenefits` / `getStakeholderServiceBonus`
are "never called anywhere" is **stale** — both are wired (`game-engine.ts:475,916-928`,
`economy-report.ts:410`). Treat that document as a historical snapshot, not current state.

**Recommendation:** re-audit `SESSION_DESIGN.md` as part of Round 1's implementation wave (it is the
canonical loop map and CLAUDE.md points every new feature at it).

---

## 1b. Reference analysis — the three benchmarks

For each: the mechanism, what it actually solves, and the economically-realistic analogue for a
22nd-century corporate simulation with no combat.

### 1b.1 Stellaris — *escalating external pressure plus a political meta-game*

| Mechanism | What it solves | Realistic analogue for us | Where it would live |
|---|---|---|---|
| **Endgame crises** (Prethoryn / Unbidden / Contingency) — spawn on a published year, scale to galaxy strength, threaten everyone at once | The "I've won, now it's maintenance" state. Forces a dominant player to *re-tool* rather than coast | **Systemic economic emergencies**: a Kessler cascade closing LEO slots; an Accord solvency crisis hardening insurance and credit; a precursor tech shock obsoleting a building class; a Hive trade dormancy freezing xenogenic markets. All hazard/NPC/regulatory-driven, all forecastable, all scaling to *server* wealth | `chapters.ts` world-staging + `ChapterContribution` + `narrative-events.ts` dispatcher + `market-events.ts` + `hazards.ts` + `economic-sinks.ts` insurance premium |
| **Situations** — a progress bar that ticks toward a bad outcome, with "approach" choices that trade money for time | Turns a problem into a *managed* problem with ongoing decisions instead of one modal | **Slow-burn corporate situations**: reserve shortfall, crew-health syndrome, regulatory inquiry, debris-liability escalation. Specced in `4X_BASELINE_2026-08.md` Part 2c and **never shipped** — `situation-log.ts` is a derived *alert list*, not this mechanic | New progress-bar state on `narrative-events.ts` chains; surfaced in the existing `SituationLog` |
| **Ascension paths** — few, irreversible, identity-defining late picks | Gives the late game an identity instead of a bigger number | **Charter class**: an irreversible corporate charter taken at Tier 5 that changes *which verbs you have*, not your multipliers | `corporate-doctrine.ts` (which is reversible and shallow today) + `specializations.ts` |
| **Galactic Community / Council** — resolutions with real mechanical bite, votes weighted by power | Makes politics a real arena | **The Accord Senate** — already built | `accord-senate.ts` |
| **The mid-game / late-game year sliders** — the game *tells you* when pressure ramps | Anticipation. Players plan around a published escalation | **A published epoch escalation schedule** on the existing epoch page and Mission Calendar | `realignment.ts`, `world-calendar.ts`, `/space-tycoon/epoch` |

### 1b.2 Sins of a Solar Empire — *capstone power plus contested territory*

| Mechanism | What it solves | Realistic analogue | Where it would live |
|---|---|---|---|
| **Titans** — one capstone unit per faction, enormous investment, visible arrival, own upgrade tree | The "we have arrived" moment. A single object that is unmistakably the top of the game | **Capstone infrastructure that grants verbs**: an Orbital Ring makes you the *landlord* of Earth-orbit slots (you can sublease occupancy to other corps); a Lunar Mass Driver lets you *set a launch tariff* on the lane you own; a Helios Station lets you *license* research output. New actions, not new percentages | `personal-megastructures.ts` completion bonuses + `orbital-slot-auctions.ts` + `trade-lanes.ts` + `spatial-strategy.ts` |
| **Pact / diplomacy trees** — pay into a faction relationship, unlock reciprocal mechanical benefits | Makes diplomacy a build order, not a slider | **Faction licences** — *already authored*, six of them, with `grants` flags that nothing reads (defect #7). This is a Sins pact tree sitting inert in the codebase | `factions.ts` `FACTION_LICENSES` |
| **Persistent map-control tug-of-war** — gravity wells change hands, control is continuously visible | Keeps the map itself competitive across a whole session | **Zone governorship** — live and wired, with 72h challenge windows and real governor tax + lane tolls | `zone-influence.ts`, `TerritoryPanel` |
| **Trade-port chaining** — route income compounds along the length of a connected chain | Rewards *network* building over unit spam | **Lane network effects**: lane investment currently caps at +15% per lane (`LANE_BONUS_CAP`) and decays. Compounding across a *connected* chain of owned lanes is unbuilt and is the natural next rung | `trade-lanes.ts`, `cargo-logistics.ts` |

### 1b.3 Master of Orion 2 — *periodic existential events plus an election meta-game*

| Mechanism | What it solves | Realistic analogue | Where it would live |
|---|---|---|---|
| **Antaran raids** — periodic, escalating with turn count, hit anyone, genuinely dangerous | Keeps risk real for a leader. The threat *grows with you* | **NPC pressure seasons**: Void Corsair raiding seasons whose intensity scales with the server's aggregate insured value; Dominion enforcement sweeps; insurance-market hardening. Forecastable, hazard-class losses only, never player-driven | `hazards.ts` + `factions.ts` postures + `economic-sinks.ts` insurance + `realignment.ts` epoch escalation |
| **The Guardian at Orion** — one brutally hard obstacle guarding the best prize in the galaxy | A *destination*. Something everyone knows exists and almost nobody has | **An economic guardian**: a unique, finite, high-value claim (Psyche-16's core grade; a Triton Archive concession; the Great Nest interface berth) whose barrier is a coalition-scale capital commitment plus real hazard exposure, not a fleet. Ownership is finite and transferable | `mega-projects.ts` (server-wide contribution rails already exist, `MegaProjectContribution`) + `orbital-slot-auctions.ts` (finite, tradeable, leaseable) |
| **The Galactic Council election** — fixed calendar, votes weighted by population, 2/3 wins the game, and you may *refuse* the result and fight everyone | Forces every player to engage with the political meta on a schedule they can't ignore. The refusal option makes it a real decision | **The Accord Chair**: a fixed real-calendar election; votes weighted by *published* quarterly-report metrics (server-computed, already exist); the winner sets the next docket; losers may **Fracture** — withdraw from Accord oversight, losing SCC contract enforcement and Dominion access, gaining Syndicate/Corsair premiums. This is verbatim the LORE (`Treaty Fracture of 2143`, Secretary-General Anatole Priest, SCC binding authority) | `accord-senate.ts` + `realignment.ts` + `factions.ts` + `quarterly-reports.ts` + `PublishedCorpReport` |
| **Custom races / leaders** | Replayability and per-run identity | `archetypes.ts` + `corporate-doctrine.ts` + commander roster (already deep) | — |
| **Colony micro** (sliders, buildings) keeps small decisions alive every turn | Prevents the empty-turn problem | **Mid-band construction rungs** — Pass 5 H3's own prescription: $2–8B capex tied to *new geography*, not more copies | `buildings.ts`, `solar-system.ts`, `colonies.ts` |

### 1b.4 What the three agree on

All three solve the post-tech-tree problem the same way: **the world starts acting on you.** Whether
it's a crisis fleet, a contested gravity well, or an Antaran raid, the player stops being the only
source of change. Space Tycoon today is almost entirely player-driven — the world's only autonomous
actors are NPC market makers and a per-player hazard roll. **That is the deepest structural finding
of Round 1.**

---

## 1c. Design proposals

Eight proposals. Each names the loop it lives on per CLAUDE.md, and every one extends a live system.

---

### R1-E1 — The Accord Chair (a real election, with a real refusal)

**Player fantasy:** *"My corporation is powerful enough that the Accord itself has to reckon with
me. This quarter I'm running for the Chair — and if I lose to the Dominion bloc, I may take my
charter outside the Accord entirely."*

**Time loop:** **Monthly** (campaign texture). The election opens on a fixed real-world UTC date each
month and closes at a published time; the term runs one real month. This deliberately fills
`SESSION_DESIGN.md`'s most under-served loop — nothing currently matures on a ~30-real-day cadence
(`LIVE_SERVICE_2026-08.md` §1.3 says exactly this), while the senate's *in-game* quarter is only ~18
real hours.

**How it preserves realism:** it is the Accord of Geneva doing what the LORE says it does. Votes
weighted by published economic scale is how real industry bodies (IATA, ICAO advisory panels,
standard-setting consortia) actually work. The Fracture option is already canon — three of the six
factions did it in 2143.

**Plugs into (no new systems):**
- `accord-senate.ts` — the Chair sets one of the three docket slots for the coming term (or adds a
  fourth measure from the existing 12-measure `MEASURE_CATALOG`). No new measures needed for v1.
- `quarterly-reports.ts` + the `PublishedCorpReport` Prisma model — voting weight comes from a corp's
  **published** report. Publishing is already opt-in, which makes vote weight a genuine
  information-disclosure trade-off (publish to vote heavier, and your rivals read your numbers).
- `factions.ts` — Fractured status flips `STANDING_BROKER_MODIFIER` treatment and locks Dominion
  contract access.
- `realignment.ts` — Chair identity and Fracture roster become inputs to the epoch aggregate
  (currently senate + seasons only).
- `world-calendar.ts` / `MissionCalendarPanel` — the election is an appointment with a countdown.
- `public-registry.ts` / chronicle — the Chair roll is public history.

**Economic consequence:** real but bounded. Agenda-setting is worth what the docket is worth (today,
±1–4% for 3–8 game-months — small; see the note below). Fracture is the sharp trade: lose SCC
contract enforcement (escrow protection on player-to-player contracts) and Dominion's 1.0× official
contracts, gain Syndicate 1.3× / Echo 1.4× premiums and freedom from Accord compliance costs. That
is a genuine strategic fork with a computable EV.

**Balance note (must be handled in implementation):** the senate's current effect magnitudes are too
small to make an election worth contesting. Either (a) the Chair's chosen measure resolves at a
larger magnitude, or (b) the Chair gains a small standing agenda power (e.g. one tariff/licence
parameter within a published band). **Either is an economy-math change and requires sim-harness
validation** — a band-bounded posture change is the safest shape, mirroring `realignment.ts`'s
existing 0.8–1.2 posture band.

**Accessibility / mobile:** a ballot is a list of radio choices plus a submit — the friendliest
possible shape for keyboard and screen readers. Vote tallies must be text + bar, never colour-coded
bloc alone. Fits 375px trivially. Countdown is text.

**Size: M.** Election state is server-side (small Prisma model or an extension of the existing
seasons/epoch rows); the UI is a sub-tab of the existing `AccordSenatePanel`.

---

### R1-E2 — Systemic Crises + the Situation mechanic

**Player fantasy:** *"The Kessler cascade is nine days out. Every corporation on the board is moving
inventory out of LEO and bidding up shielding. I can either hedge and survive, or take the risk and
be the one still selling launch services when it hits."*

**Time loop:** **Campaign** (announced ≥2 weeks ahead, runs 4–6 weeks, epilogue for a month). One
crisis per epoch (~90 real days), so it is the game's slowest and largest beat.

**How it preserves realism:** every crisis is drawn from real systemic-risk categories, and the LORE
already contains the precedents — the Ring Fire (2137, 1,800 dead, modern safety regs), the Great
Silence (2103), the Mars Dust Pandemic (2097), the Treaty Fracture (2143), Outer Rim Insurance
Mutual's risk models. Losses are hazard/NPC/regulatory-driven and **forecast-visible**, exactly per
the no-combat canon and the "forecastable risk" invariant (`hazards.ts::forecastSevereHazards`).

**The two halves:**
1. **The crisis** — a world-shared, calendar-dated, *scaling* emergency. Severity is keyed to the
   server's aggregate economic scale (telemetry exists: `TradeStatDaily`, published quarterlies,
   `LocationExtraction`, `MegaProjectContribution`), so it stays meaningful as the world grows — the
   Stellaris scaling trick, applied to an economy instead of a fleet.
2. **The situation** — the missing Stellaris mechanic. A progress bar that ticks toward a bad
   outcome, with **approach choices** that trade money, capacity, or reputation for time. Specced in
   `4X_BASELINE_2026-08.md` Part 2c, never built. `situation-log.ts` is a derived alert list, not
   this.

**Plugs into (no new systems):**
- `chapters.ts` — world-staged act/finale/epilogue scheduling, deterministic week-index staging,
  finale windows at fixed UTC, and **server-wide aggregate participation already weighting the
  outcome roll** (`prisma.chapterContribution.count`). A crisis is a chapter with teeth. This also
  directly addresses the 3-chapter/18-week repeat problem.
- `narrative-events.ts` — `applyChainConsequence` is the universal effect dispatcher; the progress
  bar is new state on the existing `ChainProgressState`.
- `market-events.ts` — `getGlobalActiveMarketEvents` + the existing 48h forecast horizon give the
  price-shock channel, already world-shared and already published.
- `hazards.ts` — severity-class escalation on existing hazard types; no new damage model.
- `economic-sinks.ts` — insurance-premium hardening during a crisis is a one-multiplier change on a
  live opt-in sink (`getMonthlyInsurancePremium`).
- `world-calendar.ts` / `MissionCalendarPanel` — the announcement and countdown.
- `season-chronicle.ts` / era chronicle — the aftermath becomes permanent public history.

**Economic consequence:** substantial and deliberate — input shortages, band-bounded price shocks,
raised insurance premiums, temporary capacity loss. **This is the heaviest sim-validation item in
Round 1.** Required: `sim-50yr.ts` re-run with a crisis schedule, checking that (a) sink coverage
stays ≥90% per decade, (b) no archetype is driven insolvent by a single crisis, (c) newcomers are
shielded — Frontier and the Pass-6 graduation glide must both hold, and (d) crises *raise* decision
cadence in the dead decades (the whole point).

**Accessibility / mobile:** progress bars need a text percentage and an ARIA `progressbar` role;
severity must never be colour-only (use the existing `GameIcon` glyph + label pattern from the
storage-cap UI). Approach choices are a radio list. Countdowns are text. Reduced motion disables the
crisis cinematic but keeps the digest.

**Size: L.** The single largest proposal in Round 1.

---

### R1-E3 — Repair the dead end-game plumbing

**Player fantasy:** *"The things the game told me I earned are actually mine."*

**Time loop:** none of its own — it makes the **campaign** loop work as designed.

**How it preserves realism:** it is bug repair. No new mechanics, no new numbers.

**Contents** (all from §1a.5, each independently shippable):
1. Increment `legacy.trackers` in the tick (defect #2) — unblocks `legacy_first_mine`,
   `stretch_mining`, and **three of eight corporate-era charters**.
2. Align the expedition launch gate with `planExpedition` (defect #1) — the UI should show the
   procurement cost, not block the launch. This alone turns "interstellar exists" into "interstellar
   is reachable." *(Verify the intended design first: if inventory fuel is meant to be mandatory,
   the fix is instead a Sol-side exotic-fuel source. The current state — engine permits, UI forbids,
   no source exists — is unambiguously wrong either way.)*
3. Credit speed-run rewards (defect #5) or remove the reward payload; add `legacyPoints` to
   `LegacyState` or drop it from the API contract.
4. Apply victory titles to player state and surface them (defect #6) — feeds R1-E4.
5. Wire the six faction-licence `grants` flags (defect #7) — this is the Sins pact tree, already
   authored, one wiring pass from being real.
6. Register and generalize the mega-project seed (defect #3): make the seeder cron-driven and
   able to instantiate all four definitions, and either give `launch_cost_reduction` a tick consumer
   or reassign `space_elevator`'s reward to a live bonus channel.
7. Either author real buildings for the 12 colonizable bodies or gate their unlock behind a
   "content pending" notice (defect #4). **Do not leave a $750B purchase that buys an empty
   location.** Fix the `aerostat_tech` → `aerostat_technology` id.
8. Move the victory check into the tick (defect #8).

**Economic consequence:** items 1, 4, 5, 6, 7 change what players receive. Items 1 and 5 credit
things that were *supposed* to be credited (low risk, but re-run `sim-strategies` for
defaults invariance). Items 5, 6, 7 need a sim pass because they add real value to the economy.
Item 2 unlocks a spend channel that is currently net-negative (see the expedition ledger note in
§1c-E5) — low inflation risk.

**Accessibility / mobile:** unchanged surfaces, except item 4's title display (text chip, no colour
dependence).

**Size: M** as a bundle; each item is S.

---

### R1-E4 — The Legacy Hall (the trophy room)

**Player fantasy:** *"Three months in, I can open one screen and read my corporation's history — the
milestones, the era medals, the titles, the seasons I placed in — and so can anyone who visits my
public corp page."*

**Time loop:** **Campaign** (display surface for the slowest loop). Also a daily hook: milestone
progress bars give returning players a visible "next thing."

**How it preserves realism:** none of it is a new mechanic; it is a ledger. A 22nd-century
corporation with >$1B extraterrestrial assets is *required by the Accord* to report publicly
(LORE, Accord of Geneva 2089) — this is the corporate history that reporting produces.

**Plugs into (all live, all currently invisible):**
- `legacy-system.ts` — 48 milestones (with progress), 7 infinite stretches, `getLegacyDisplayTier`
  (Pioneer → Colonist → Admiral → Architect → Legend), `getLegacyPower`, and the six soft-capped
  bonus categories with their *current* effective values (the caps are a genuinely interesting
  strategic readout that no player can see today).
- `victory-conditions.ts` — 11 conditions with `getVictoryProgress` percentages (already exists),
  plus earned titles from R1-E3 item 4.
- `corporate-eras.ts` + `CorpEraRecord` — past era medals and charters.
- `season-chronicle.ts::derivePrestigeTitles` — cross-season placements.
- `public-registry.ts` / `/space-tycoon/corp/[id]` — the same content, public, for rivalry and SEO.
- `milestones.ts` — the 10 server-wide first-claim races.

**Economic consequence:** **none.** This proposal changes zero economy math and therefore needs no
sim run. That is precisely why it belongs in Round 1.

**Accessibility / mobile:** a list of grouped, labelled progress rows — the easiest accessible
shape there is. Progress must carry a text percentage. Medal tiers need glyph + label, never colour
alone (reuse the `ERA_MEDAL_ICON`/`ERA_MEDAL_LABEL` pair that already exists in
`corp-era-registry.ts`). At 375px it is one column of rows.

**Size: M.** One panel (inside an existing hub — Governance or Reports; **no 29th tab**) plus a
section on the public corp page.

---

### R1-E5 — Capstone verbs: make megastructures grant actions, not percentages

**Player fantasy:** *"I finished the Orbital Ring. I am now the landlord of Earth orbit — rivals
lease slots from me, and I set the terms."*

**Time loop:** **Campaign** (build) feeding **weekly/tactical** (the new verbs are used continuously).

**How it preserves realism:** infrastructure ownership conferring commercial rights is exactly how
real orbital and port infrastructure works — landing slots, port concessions, pipeline tariffs,
spectrum licences. It is *more* realistic than a flat "+15% revenue."

**Plugs into:**
- `personal-megastructures.ts` — extend `completionBonus` with a `grants` channel (same shape as the
  faction-licence `grants` flags, which R1-E3 item 5 is already wiring — one pattern, two consumers).
- `orbital-slot-auctions.ts` + `spatial-strategy.ts` (`ORBITAL_SLOT_POOLS`, finite, leaseable,
  `OrbitalSlotLease` model exists) — the Orbital Ring's verb.
- `trade-lanes.ts` + the existing governor lane-toll mechanic (E7) — the Lunar Mass Driver's verb.
- `zone-influence.ts` governor benefits — already wired, a natural sibling.

**Worked examples (illustrative, to be priced in implementation):**
| Structure | Today's reward | Proposed added verb |
|---|---|---|
| Orbital Ring ($450B) | build ×1.30, maint ×0.85, rev ×1.15, +$100M/mo | Sublease LEO/GEO slot occupancy to other corps at a rate you set within a published band |
| Lunar Mass Driver ($350B) | build ×1.30, maint ×0.75 | Set a cislunar launch tariff on the Earth↔Luna lane; rivals pay or route around |
| Helios Station ($280B) | research ×1.50, +$120M/mo | License research output — sell a completed tech's effect to another corp for a term |
| Asteroid Foundry ($360B) | mining ×2.0, iron 1500/mo | Offer toll refining: convert another corp's raw stock for a fee |

**Economic consequence:** significant — it creates new player-to-player value flows. Every verb must
be **fee-bounded, published, and counterplayable** (route around, refuse, build your own), per the
Pass 8 finding that offense tools must never produce a dominant strategy. **Requires sim-harness
validation via `sim-pvp.ts`/`sim-tools.ts`** with the twin-scenario differencing methodology Pass 8
established. Note the population caveat: Pass 8 measured GEO occupancy at 2–3 of 180 slots against a
153 trigger — slot-scarcity verbs are **population-gated** and will be inert until the world is
busier. Prefer verbs that work at low population (toll refining, research licensing) for v1.

**Accessibility / mobile:** each verb is a form (rate + term + submit). Published rates must be a
table with text values. 375px-friendly.

**Size: L** (M if scoped to two verbs).

---

### R1-E6 — Mid-band construction rungs tied to new geography

**Player fantasy:** *"Year 14. I'm not rich enough for a flagship, but Enceladus just became worth
opening — and nobody else is there yet."*

**Time loop:** **Monthly** (each rung is a multi-week capex decision), directly attacking the dead
decades.

**How it preserves realism:** this is the most realistic proposal in the round — real industrial
expansion goes to *new places*, not to a 21st copy of the same facility at the same place.

**Plugs into:** `buildings.ts`, `solar-system.ts`, `colonies.ts` (the 12 merged bodies — which
R1-E3 item 7 must make buildable first; **E6 depends on E3.7**), `demand-pools.ts` (new locations
mean uncrowded pools), `extraction-pressure.ts` (fresh deposits).

**The measured gap it fills** (Pass 5 H3, still open, founder-ranked HIGH): *"the catalog jumps from
~$2B buildings straight to $8–80B with nothing between"* and *"pool floors make copy N+1
worthless."* Pass 5's own prescription is verbatim: *"a mid-band construction rung ($2–8B capex, real
ROI, new locations/deposits rather than more copies)."* Pass 6 shipped the other two Pass-5 fixes
(C1 graduation glide, H4 duty-cycle opex) but **not this one**, and Pass 7 explicitly preserved it:
*"H3's rung-gap component ($2B → $8–80B catalog jump) stands."*

**Economic consequence:** direct and large. **Mandatory sim-harness validation**: `sim-50yr.ts`
(does decision cadence in decades 2–5 actually rise?), `sim-strategies.ts` (does the M1 "every
first-copy is profitable" CI guard hold?), `sim-resources.ts` (do the Pass-1/2 storage asymptotes
survive new supply?). Sinks-first discipline applies: a new revenue rung needs a matching cost
structure.

**Accessibility / mobile:** existing build-card surfaces; the `build-preview.ts` live tooltip
already exists and must cover the new rungs.

**Size: M** (content-heavy, engine-light) — **L** if the 12 colony bodies are populated properly.

---

### R1-E7 — Escalating NPC pressure seasons (the Antaran analogue)

**Player fantasy:** *"Corsair season opens in three weeks and my outer-system convoys are exposed.
Do I pay tribute, buy escorts, re-route, or eat the losses?"*

**Time loop:** **Weekly** within a **quarterly** escalation ramp — a recurring pulse between R1-E2's
episodic crises.

**How it preserves realism:** the LORE already has Void Corsairs who *"raid convoys, demand tribute,
sell passage rights"* and whose respect can be earned by honouring tribute agreements. Outer Rim
Insurance Mutual already *"influences where corporations will operate."* This is a scheduled,
forecastable, purely NPC-driven risk season — canon-perfect, and zero PvP.

**Plugs into:** `hazards.ts` (`pirate_raid` is an existing `HazardType` with a full mitigation and
insurance model), `factions.ts` (Corsair standing already changes their behaviour toward you),
`realignment.ts` (epoch posture is the natural escalation dial), `economic-sinks.ts` (insurance
premium), `world-calendar.ts` (the appointment), `trade-lanes.ts` (route-around counterplay).

**The scaling rule (this is what makes it Antaran rather than flavour):** raid pressure keys to the
server's aggregate insured asset value, not to a fixed constant — so it stays meaningful as the world
grows, and it never crushes a small corp. Frontier and graduation-glide shields hold absolutely.

**Economic consequence:** a real recurring risk cost with four distinct counterplays (tribute via
faction standing / escort investment / re-routing via lanes / insurance). **Requires sim
validation** — a risk season must not be a flat tax; the counterplays must each be +EV in some
regime, per the Pass 8 Q3 methodology that proved mothball/spread/ride-out are era-dependent.

**Accessibility / mobile:** forecast is a calendar entry with a text severity label; the response is
a choice list. Reuse the existing `HazardAlertLayer` patterns.

**Size: M.**

---

### R1-E8 — The Concession (an economic Guardian at Orion)

**Player fantasy:** *"The Psyche-16 core concession comes up for tender once a year. Three
corporations have ever held it. This year we're going to be the fourth."*

**Time loop:** **Campaign** — one tender per epoch or per year; the holding term is long.

**How it preserves realism:** a finite, exclusive, tradeable resource concession awarded by tender
is exactly how deepwater blocks, spectrum, and port concessions work — and the Accord of Geneva
explicitly makes *"resource extraction rights tradable property"* (LORE). No combat, no guardian
fleet: the barrier is a coalition-scale capital commitment plus genuine hazard exposure.

**Plugs into:** `mega-projects.ts` (server-wide contribution rails and `MegaProjectContribution`
already exist and are currently near-dormant — R1-E3 item 6 revives them), `orbital-slot-auctions.ts`
(sealed-bid tender + lease + expiry machinery already exists and is population-gated inert),
`alliance-charters.ts` / `alliance-treasury.ts` (coalition funding rails exist),
`hazards.ts` (the concession site carries elevated hazard class — the "guardian"),
`public-registry.ts` (the holder roll is public history).

**Candidate concessions (all canon):** the Psyche-16 core (Belt Rush founding site), a Triton
Archive research concession (Echo Remnants), a Great Nest interface berth (Hive Collective).

**Economic consequence:** large and *deliberately concentrating* — this is a prize, and Pass 5
measured Gini at 0.79–0.82 already. Mitigations that must be designed in: a term limit (the
concession expires and re-tenders), coalition bidding so alliances can compete with whales, and a
public reserve price. **Requires sim validation for concentration effects** — re-run `sim-50yr.ts`
Gini and top-1-share.

**Accessibility / mobile:** sealed-bid form + a public tender board (table with text values). Reuse
the existing `OrbitalSlotAuction` UI patterns.

**Size: L.** Strong candidate for a later round, not Round 1.

---

## 1d. Prioritized recommendation for the Round 1 implementation wave

**Implement, in this order: R1-E3 → R1-E4 → R1-E1.**

### Why R1-E3 (repair the plumbing) first

Nothing else is worth building on top of a broken foundation, and the audit found more breakage than
absence. Three of eight corporate-era charters — the flagship *campaign-loop* system LS4 shipped —
can never earn a medal. The interstellar end-game is implemented and blocked by a UI predicate. The
only instantiable cooperative mega-project grants a bonus with no consumer. Six authored faction
licences are money sinks with a badge. Speed-run rewards are computed and thrown away. **Every one of
these is a shipped promise the game is currently failing to keep**, and each is small. This is the
highest value-to-effort work in the entire round. It also unblocks E4 (titles), E5 (the `grants`
pattern), and E6 (buildable colony bodies).

### Why R1-E4 (the Legacy Hall) second

The single widest gap versus Stellaris and MoO2 at the *end*-game is not mechanics — it is
**legibility of long-term progression**. Both benchmarks make your history unmissable. We have 48
milestones, 7 infinite stretches, 5 display tiers, 11 victory titles, 8 era medals and a season
prestige archive, and a player can see **none of it**. E4 changes zero economy math, needs no sim
run, ships as one panel plus a public-page section, and it is what makes E3's repairs *visible* —
fixing `legacy.trackers` is invisible without a panel that shows the milestones it unblocks. It is
also the strongest emotional payoff per engineering hour available anywhere in this document.

### Why R1-E1 (the Accord Chair) third

It is the best *new* loop on offer: it fills the genuinely under-served monthly cadence, extends a
live system rather than inventing one, gives the end-game the thing it most lacks — **a contest with
a prize** — and it is the most canon-ready idea in the round (the office, the electorate, and the
refusal are all already written into LORE). It is also the natural sink for the published quarterly
reports that E6 of the Economy-PvP wave built and nothing currently consumes competitively.

### Deferred to Round 2 and beyond, with reasons

- **R1-E2 (Systemic Crises)** — the biggest idea in the round and the most faithful answer to
  "escalating external pressure," but it is **L**, it carries the heaviest sim-validation burden, and
  its aftermath should write into the Legacy Hall and Chronicle that E3+E4 make real. Build the
  ledger first, then give it something worth recording. **Strong candidate to headline Round 2.**
- **R1-E6 (mid-band rungs)** — high value and founder-ranked HIGH since Pass 5, but it depends on
  E3.7 (buildable colony bodies) and it is the round's most economy-invasive change. It deserves its
  own wave with a full `sim-50yr` acceptance run, not a slot inside a mixed wave.
- **R1-E5 (capstone verbs)** — partially population-gated (slot-scarcity verbs cannot fire at
  today's occupancy, per Pass 8's structural finding). Ship the low-population verbs later, once
  E3.5's `grants` pattern is proven on faction licences.
- **R1-E7, R1-E8** — sound, but both are pressure/prize systems that read better once E2 has
  established the "the world acts on you" vocabulary.

### Sim-validation flags for the recommended wave

| Item | Economy math touched? | Required |
|---|---|---|
| E3.1 legacy trackers | Yes (unblocks bonuses that were meant to exist) | `sim-strategies.ts` defaults-off diff; hold the M1 first-copy-ROI CI guard green |
| E3.2 expedition fuel gate | Opens a spend channel | Re-check the expedition ledger; explorer round trips are currently ~$23B cost vs ~$6.4–10.6B return (structurally net-negative) — confirm that is intended before unblocking |
| E3.5 faction licence grants | **Yes** | Full harness pass; the six `grants` are real advantages |
| E3.6 mega-project revival | **Yes** | `sim-strategies` + sink-coverage check; `launch_cost_reduction` needs a real consumer or a reassignment |
| E3.7 colony body content | **Yes, heavily** | Full `sim-50yr` + `sim-resources` — new locations change demand pools and extraction pressure |
| E4 Legacy Hall | **No** | None (display only) |
| E1 Accord Chair — election mechanics | No | None |
| E1 Accord Chair — agenda power + Fracture | **Yes** | `sim-50yr` posture-band run; keep the change inside a published band like `realignment.ts`'s 0.8–1.2 |

**Standing reminder:** per the Pass 5→Pass 6 lesson (the graduation glide's worked estimate of 6
days was measurably insufficient; the sim found 14), **do not ship a designed constant without
simulating it.**

---

## Part 2 — Ideas explicitly rejected

Recorded so later rounds do not re-propose them. Each entry names why.

| Idea | Why rejected |
|---|---|
| **Prestige / reset / New Game+ loop** | Designed out deliberately. `prestige.ts` was deleted; `state.prestige` survives only for one-time migration (`save-load.ts:312-381`); `legacy-system.ts`'s stated thesis is "permanent progression without resets"; `ALTERNATIVE-ENDGAME-DESIGN.md` §7 chose legacy over prestige explicitly. A reset loop would also invalidate the corporate chronicle and public registry, which are load-bearing for the game's history-as-content pillar. |
| **Repricing tier-4/tier-5 research to make the tree reachable** | `BALANCE.md` Pass 7 — founder ruling, canon. *"Deep-tier research taking more than 50 years of in-game time seems reasonable."* Do not re-flag. (§1a.3's reachability table is about **tier/victory/interstellar gates**, which Pass 7 did not rule on, and Round 1 does not propose changing them either.) |
| **Any end-game that involves players destroying each other's assets** — crisis-triggered raids on rivals, "last stand" modes, contested destruction | No-combat canon, non-negotiable (CLAUDE.md, LORE's Accord of Geneva Article 4). All destruction stays hazard/disaster/NPC-driven and forecast-visible. |
| **Paid crisis mitigation, paid queue slots during events, purchasable concession bids** | Pay-to-win (`POLICY.md`). Even "convenience" purchases become competitive advantage inside a timed world event. |
| **Reviving orbital-slot auctions by repricing them** | Pass 8 measured GEO occupancy at 2–3 of 180 slots after 96 months against a 153-slot trigger and concluded verbatim: *"population-gated, not price-gated ... No pricing change can revive them."* |
| **Wealth-indexed campaign fees that buy proportional crash depth** | Pass 8 refuted this with data: when the fee buys depth, the damage/cost ratio is fee-invariant (~0.2 at relaunch scale). The market-keyed fee family is the shipped answer (Pass 9). |
| **Fee-scaled campaign depth** | Same refutation. Depth stays full at the band floor. |
| **Recommending mothball as the default counterplay to a price campaign** | Pass 8 Q3 measured it as a **trap** at relaunch scale (−19% net worth vs riding out) and only neutral at mid-game. "Spread" is best at both eras. Any copy we write must say so. |
| **A score-based "game over" victory at a fixed end date** (Stellaris's weakest victory) | The game is a persistent world with a public chronicle and a corporate registry. It does not end, and the 11 existing victories correctly grant permanent bonuses without terminating. |
| **Titan-style unique super-*units*** | No combat. The capstone must be infrastructure (R1-E5), not a ship. |
| **An "assault the Antaran homeworld" instant-win** | No combat, and no instant wins. R1-E8 keeps the *prize* and drops the assault. |
| **A 29th tab for any of this** | Standing convention (`LIVE_SERVICE_2026-08.md` §LS1: "28 is enough"). Every Round-1 surface lands inside an existing tab or hub. |
| **A new bespoke "crisis engine" module** | `chapters.ts` already does world-staged, calendar-dated, participation-weighted arcs with deterministic catch-up, and `narrative-events.ts` already owns effect application. Building a parallel engine would fork the effect dispatcher — the exact mistake §1a's vestigial-export findings keep documenting. |
| **Deleting `colonies.ts`'s 12 bodies because they're empty** | They are already merged into `ALL_LOCATIONS` and purchasable. Removing them is a rollback problem for anyone who bought one. Populate them (R1-E6) or gate them behind an honest notice (R1-E3.7). |

---

## Appendix — Round 1 source ledger

Every claim in Round 1 traces to one of:

- **Code, read 2026-08-21:** `src/lib/game/{victory-conditions,legacy-system,speed-runs,corporate-eras,corp-era-registry,public-era-chronicle,accord-senate,realignment,chapters,seasonal-events,economic-seasons,season-chronicle,share-registry,corporate-doctrine,narrative-events,factions,zone-influence,trade-lanes,spatial-strategy,interstellar,expeditions,mega-projects,personal-megastructures,galactic-map,exploration,colonies,corporation-tiers,research-tree,resources,hazards,economic-sinks,frontier,market-events,world-calendar}.ts`, `src/lib/game/game-engine.ts`, `src/lib/cron-scheduler.ts`, `src/app/space-tycoon/page.tsx`, `src/components/game/**`, `src/app/api/space-tycoon/**`, `prisma/schema.prisma`, `scripts/sim-50yr.ts`.
- **Docs:** `CLAUDE.md`; `docs/{BALANCE,SESSION_DESIGN,LORE,STATS_DESIGN,NPC_BACKDROP,POLICY,LIVE_SERVICE_2026-08,4X_BASELINE_2026-08,VISUAL_AAA_2026-08,ALTERNATIVE-ENDGAME-DESIGN,GAME_SYSTEMS_AUDIT_2026-08}.md`.
- **Measurement:** `BALANCE.md` Passes 5, 6, 7, 8 (runners `sim-50yr.ts`, `sim-tools.ts`, `sim-resources.ts`, `sim-pvp.ts`, `sim-strategies.ts`).

Where a document and the code disagreed, the code was taken as truth and the drift is recorded in
§1a.7.

---

# E3 implementation — the repair wave (shipped 2026-08-21)

Round 1 recommended **R1-E3 → R1-E4 → R1-E1**. This section records **R1-E3**, the
plumbing-repair wave, as built. Six of the nine defects in §1a.5 are now closed; the remaining
three are recorded below with reasons.

The wave's governing rule, restated because it decided several calls: **Pass 7 ruled on research
*pacing*, not on tier / victory / interstellar *reachability*.** Repairing broken plumbing was in
scope. Repricing the research tree was not, and nothing here touches it.

## E3 scorecard

| Defect (§1a.5) | Status | Where |
|---|---|---|
| #1 first interstellar jump unreachable (BLOCKER) | **FIXED** | `expeditions.ts`, `map-radial.ts`, `galactic-map.ts`, `MapContextPanel.tsx`, `InterstellarPanel.tsx` |
| #2 `legacy.trackers` never increments (HIGH) | **FIXED** | `legacy-system.ts`, `game-engine.ts`, `away-operations.ts` |
| #3 only instantiable mega-project grants nothing (HIGH) | **FIXED** | `mega-projects.ts`, `expeditions.ts`, `page.tsx`, `FleetPanel.tsx`, `scripts/seed-mega-project.ts` |
| #4 12 colonizable bodies have no content (HIGH) | **FIXED** | `buildings.ts`, `services.ts`, `resources.ts`, `demand-pools.ts`, `colonies.ts` |
| #5 speed-run rewards computed and discarded (MEDIUM) | **FIXED** | `speed-runs/check/route.ts`, `speed-runs.ts`, `SpeedRunPanel.tsx`, `server-ledger.ts` |
| #6 victory titles never applied (MEDIUM) | **FIXED (client side)** | `page.tsx`, `LeaderboardPanel.tsx` — server sync deferred, see below |
| #7 six faction licences inert (MEDIUM) | **FIXED** | `factions.ts`, `cargo-logistics.ts`, `hazards.ts`, `market-engine.ts`, `game-engine.ts`, `away-operations.ts`, sync + trade routes, `FactionPanel.tsx` |
| #8 victory check is a React effect, not a tick step (LOW) | **DEFERRED** | see §E3.9 |
| #9 `ClaimStake.expiresAtMs` never checked (LOW) | **DEFERRED** | see §E3.9 |

Regression coverage: `src/lib/game/__tests__/aaa-e3-repairs.test.ts` (31 tests), plus rewritten
assertions in `map-radial.test.ts` and `galactic-map.test.ts`. Suite **221 suites / 4,944 tests**,
all green. `npx tsc --noEmit` clean.

---

## E3.1 — the first interstellar jump (BLOCKER)

**Root cause.** Three UI gates and one panel each re-implemented the launch predicate as
`state.resources.exotic_fuel >= sys.jumpFuelRequired`. `planExpedition`
(`expeditions.ts:342-347`) has never had that rule: it buys the shortfall at
`baseMarketPrice × FUEL_PROCUREMENT_PREMIUM (1.25)` and charges it as money. Because `exotic_fuel`
has *no Sol-side source whatsoever* — `startingSupply: 0`, `npcRestockPerHour: 0`, listed in
`MINED_ONLY_RESOURCE_IDS`, `npc-volume-caps.ts` caps it at 0, and no building produces it — the
gates were requiring something the game cannot supply. `map-radial.ts:275-277` claimed the gate
"mirrors the planner exactly"; it was the exact inverse.

**Fix.** One shared function, `getExpeditionLaunchReadiness(state, systemId)`
(`expeditions.ts`), which does not re-implement anything: it **runs `planExpedition` itself** over
the player's idle expedition-capable hulls (uninsured, unshielded — the floor) and reports the
cheapest plan the planner would accept, the fuel it would procure, and honest blockers. All four
surfaces now consult it. `galactic-map.ts`'s `fuelShort` was re-defined from "inventory is empty"
to "cannot pay the procurement bill", and its blocker text changed accordingly.

**Was the premium purchase economically sane at first contact?** Yes, and this was checked before
aligning rather than after:

| First jump | Fuel units | Fuel bill @1.25× | Supplies | Uninsured total | Against |
|---|---:|---:|---:|---:|---|
| Proxima, **Colony Ark** (1 jump) | 500 | $3.13B | $7.0B (140 mo) | **~$10.1B** | an $80B ark hull already paid for + $20B founding |
| Proxima, **Starfarer Explorer** (2 jumps) | 1,000 | $6.25B | $13.4B (268 mo) | **~$19.7B** | ~$8.5B survey payout |

The fuel line is ~4% of the ark programme — a rounding error on a decision the player has already
committed to, not a loophole. The explorer round trip stays structurally net-negative on cash and
is sold as reconnaissance, exactly as §1c-E5 noted; unblocking the gate opens **no income exploit**,
only a spend channel. Colonies then refine `exotic_fuel` at 20 units/level/month, so later jumps
skip the premium — the compounding "it gets cheaper once you're out there" loop the module was
designed around, which the inventory gate had made unreachable.

**Why align the gates rather than add a Sol-side exotic-fuel source** (the alternative the brief
allowed if argued with numbers): a refinery would have to be priced, balanced, art-ed and
sim-validated, and it would *delete* the compounding loop above by making the premium avoidable
without ever leaving Sol. Aligning is one function and four call sites, and it restores the design
that `expeditions.ts` already documents in its own header.

**UI honesty.** The dossier, the destination cards and the Interstellar readiness strip now state
the real requirement and the real cost: units needed, units drawn from stores, units procured, the
procurement bill, and the cheapest uninsured plan total. The "Exotic fuel reserve" prerequisite
chip — which was `met={exoticFuel >= 500}`, i.e. permanently unmet — now reads as a stores
readout with an explanation that it is not a prerequisite.

**Verified by.** `aaa-e3-repairs.test.ts` §E3.1 (4 tests), including one that asserts
`getExpeditionLaunchReadiness` and `planExpedition` return the *same* cost figures (so they can
never drift again) and one that asserts `exotic_fuel` still has no Sol-side producer — the premise
the repair rests on. The two pre-existing tests that *encoded the defect*
(`map-radial.test.ts` expected `/exotic fuel/i` as the blocker; `galactic-map.test.ts` expected
`fuelShort` to be true for a solvent researched player) were rewritten into guards that fail if the
inventory requirement ever returns.

## E3.2 — `legacy.trackers`

**Root cause.** Four readers, zero writers. The only writer in the repo was the save migration
(`save-load.ts`, both branches inside `if (!state.legacy)`), which seeds the counters once and never
touches them again. Consequences, all silent: `legacy_first_mine` unreachable on a fresh save,
`stretch_mining` pinned at level 0, and `expansion_era` / `belt_century` / `logistics_empire` —
three of eight corporate-era charters — scoring 0 forever and always filing the worst medal.

**Fix.** `accrueLegacyTrackers(legacy, deltas)` in `legacy-system.ts`: additive, ignores negative
deltas (these are lifetime counters — a re-derived snapshot would go *backwards* when a building is
decommissioned or ore is sold, silently un-earning a milestone), and returns the **same reference**
when every delta is zero so a quiet tick allocates nothing. Wired at the real occurrence sites,
never in UI:

| Occurrence | Site | Source |
|---|---|---|
| service mining | `processTick`, `out.legacy` | `minedFlowsThisTick` — the same real production figure that feeds market supply pressure, **not** an inventory diff (which would also count market buys and contract rewards) |
| building completions | `processTick`, `out.legacy` | the completion diff already computed for `dm.buildings_built` |
| ship mining, hull builds, contracts | `processFullTick` §6e | real diffs against the tick's *input* state |
| mining while offline | `away-operations.ts` | `resourcesEarned`, efficiency-weighted |

Away parity is not decoration here: without it a player who plays in long sessions would out-score
an identical player who plays in short ones on `belt_century`.

**Verified by.** Six tests, including a **structural** one that asserts both engine sites and the
away site still call `accrueLegacyTrackers` — the defect was precisely "the readers are fine, the
writer is missing", so a value-only test would not have caught it and would not catch its return.

## E3.3 — the dead mega-project reward

**Root cause.** `space_elevator` — the *only* project any live server can instantiate, because
`scripts/seed-mega-project.ts` hardcoded it and was not registered in `package.json` — rewards
`launch_cost_reduction`, which `getMegaProjectBonuses` itself documented as having no tick consumer.
The value was aggregated, typed, clamped at 0.30, threaded through `server-effects.ts` into state,
and destructured into the tick's zero-default. Every step existed except a reader. Completing the
game's flagship cooperative project granted **nothing**.

**Fix — wire it, don't reassign it.** E7 was right that no *tick* multiplier site exists; it drew
the wrong conclusion. Launch spending is not a per-tick flow, it is a **per-order transaction**. So
the consumer is transactional: `getLaunchCostMultiplier(state)` / `applyLaunchCostReduction(cost,
state)` in `mega-projects.ts`, applied where the game charges for putting mass into space —

- ship hull orders (`page.tsx::onBuildShip`, with `FleetPanel.tsx` showing the *same* discounted
  number it will be charged, so price and affordability cannot disagree), and
- interstellar expedition launch bills (`planExpedition`'s `totalMoneyCost`, the line whose own
  error message already reads "Launch requires …").

Deliberately **not** applied to building construction: buildings already carry a research-driven
`buildCostReduction` channel, and stacking a server-wide discount onto the core build economy is a
balance change this wave has no mandate for.

**Structural hardening.** `permanentBonus.type` was a bare `string` — which is *how* a reward
shipped with no reader in the first place. It is now the closed union `MegaProjectBonusKind`, and
every member must appear in the exported `MEGA_PROJECT_BONUS_CONSUMERS` registry naming the module
and symbol that reads it. The regression test loads each named module from disk and asserts the
symbol is present. That test is the one that would have failed on the original defect.

**Seeder.** Generalized to take a project type (`npm run seed:mega-project -- dyson_sphere`,
`--list` to enumerate) and registered in `package.json`. All four definitions are now
instantiable. Creating a live world row remains a deliberate operator action, not a cron — seeding
a server-wide project is a world-state decision, not an engineering default.

**Blast radius.** `state.megaProjectBonuses` is `null` on every save until a server row reaches
`completed`, so `getLaunchCostMultiplier` returns exactly `1` today. This cannot fire without a
cooperative achievement that does not exist on any shard, which is why it needs no repricing pass —
and the sims confirm it (below).

## E3.4 — the 12 colonizable bodies

**Root cause.** All 50 building ids the bodies advertise resolved to nothing in `BUILDING_MAP`.
Nothing crashed, because `BuildPanel` filters *forward* (`BUILDINGS → requiredLocation`) rather
than resolving the location's list — so a $750B Pluto unlock bought a map pin and the sentence
"No buildings available at this location yet." Separately, `venus_orbit` gated on research id
`aerostat_tech`, which exists nowhere in the tree (`aerostat_technology` does), making Venus the one
body that could never be unlocked at all.

**Fix.** 36 real building definitions (3 per body: habitat, extraction rig, site specialist), 36
services, 12 `MINING_PRODUCTION` entries, and 12 `NPC_DEMAND_FLOOR` markets. Ids match what the
bodies already named; `colonies.ts`'s `availableBuildings` lists were trimmed to exactly the
authored set so every entry resolves. The `aerostat_tech` → `aerostat_technology` typo is fixed.

`colonies.ts`'s `COLONY_BUILDINGS` / `COLONY_SERVICES` / `COLONY_RESEARCH` /
`COLONY_MINING_PRODUCTION` were **not** used as the source and remain unimported sketches: they are
untyped literals using `category: 'habitat'` (not a member of `BuildingCategory`) and omitting
required fields. They are kept, not deleted, per Part 2's standing rejection of deleting authored
colony content.

**Economics — derived, not guessed.** Ratios are taken verbatim from the deepest existing rig in
the catalogue, `mining_titan` ($40B capex, $160M/mo, $55M opex, $25M maint → ~500-month payback):

```
capex = 250 × monthly revenue      opex = 0.34 × revenue      maint = capex / 1600
```

Non-mining frontier services are sized against existing frontier markets ($14M/$18M/$22M/$26M by
tier — compare `jupiter_system` compute $30M, `outer_system` sensor $25M), *not* against the body's
unlock price. The unlock cost buys the **territory** (a scarcity/geography decision); the buildings
on it are ordinary industrial assets. Pricing a Pluto habitat off $750B would have created a new
flagship tier, which is R1-E6's job, not this wave's. Mining rigs — which are demand-pool *exempt*
and priced by extraction pressure × spot — carry the value instead, and every rig's flat
`revenuePerMonth` baseline is set to the **exact spot value of its monthly mix**, so the
pre-phase-in figure and the price-linked revenue the engine actually pays agree instead of drifting.

**The M1 guard did real work here.** The first authoring pass used a `capex/100` revenue rule and
**failed the M1 first-copy-ROI guard on 23 of 36 buildings**, because the new locations fell through
to `DEFAULT_FLOOR_BY_CATEGORY` and the services saturated their own demand pools at N=1. The
`NPC_DEMAND_FLOOR` entries were then derived *from that failure* at exactly 3.0× flagship — inside
the 2.5–3.5× band `demand-pools.ts` specifies, and frontier-scaled ($42M–$78M; nobody is buying
$800M/month of compute at Pluto). This is recorded because it is the honest provenance of those
numbers: they were produced by the guard, not merely rubber-stamped by it.

**Result (`sim-strategies` build-menu sweep).** The colony catalogue lands in a clean band between
the lunar/Mars tier and the deep-tier flagships, monotone, with no dominant entry:

| | ROI | payback (mo) |
|---|---:|---:|
| `space_station_lunar` (existing) | 0.31 | 322 |
| **colony habitats (12)** | **0.25** | **399–403** |
| `habitat_mars` (existing) | 0.24 | 413 |
| **colony specialists (12)** | **0.23** | **429–431** |
| **colony rigs (12)** | **0.20** | **497–500** |
| `mining_titan` (existing) | 0.16 | 618 |

## E3.5 — speed-run rewards and victory titles

**Speed runs.** `check/route.ts` computed `{cash, legacyPoints, title, badge}` and returned it;
`SpeedRunPanel` did `if (res.ok) { await fetchData(); }` and dropped the body. The route now
credits the cash through the **same server-authoritative path league payouts use** —
`gameProfile.update` inside a transaction plus a `recordLedger` row under a new
`speed_run_reward` reason, which the client reconciles on its next sync — and writes the title to
`GameProfile.title`, which the leaderboard already renders. `getRecordReward()`, authored with zero
callers, is now called: a new bracket record pays its bonus and grants "Record Holder". Unverified
runs (`suspicionScore >= 100`) are recorded but never paid. The panel reads the response and tells
the player what landed.

`legacyPoints` was **removed** rather than faked. There is no such currency: Legacy Power is a pure
derivation of completed milestones and stretch levels (`getLegacyPower`), and `LegacyState` has no
additive pool — by the deliberate decision that replaced prestige with "permanent progression
without resets". Inventing a pool so that a Tier-6-gated leaderboard could feed the very stat that
sets its own brackets would have been a balance change smuggled in as a bug fix. The panel's
advertised "+100 LP" reward legend, which promised it to players, was rewritten to what is actually
paid.

**Victory titles.** `VictoryDefinition.title` reached one event-log string and nothing else — 11
authored titles no player could wear. A won victory now writes `playerTitle` (the same field
achievements already write in the tick; victories take precedence as the rarer honour), and
`LeaderboardPanel`'s player row — which hardcoded `title: null`, so the pill rendered for NPCs and
rivals but never for you — shows it.

## E3.6 — the six faction licences

**Root cause.** `grants` was a free-form `string` read by nothing anywhere in the repo, while the
licence descriptions made concrete mechanical promises ("Enforcement-escorted shipping lanes",
"Corsair raids redirect to rivals", "short-cut shipping lanes"). Six money sinks, $180M–$500M each,
that bought an OWNED badge. `purchaseFactionLicense`'s own docstring said it granted the flag; it
stored the licence id.

**Fix.** `grants` is now the closed union `FactionLicenseGrant`; a per-grant effect table (the
compiler enforces completeness, so a future licence cannot ship inert) feeds
`getFactionLicenseBonuses(state | ids)`, which returns four capped numeric channels plus a one-shot
unlock table:

| Licence | Effect | Consumer |
|---|---|---|
| Dominion Priority Routing | −8% freight fuel, +5pp pirate mitigation | `cargo-logistics.ts`, `hazards.ts` |
| Reaver Route Charts | −5% freight fuel | `cargo-logistics.ts` |
| Corsair Safe-Passage Tribute | +20pp pirate-raid mitigation | `hazards.ts` |
| Syndicate Gray-Market Access | −20% market broker fee | `market-engine.ts` via the server trade route |
| Hive Biomaterial Supply | 2 units `xenogenic_biomatter`/month | `game-engine.ts` §6b-bis + away parity |
| Echo Precursor Access | unlocks the rare tech `precursor_studies` | `factions.ts` at purchase, via `unlockedRareTechIds` |

Three deliberate design calls:

- **Safe passage is a mitigation term, not a probability edit.** Hazard occurrence rolls are
  identical for every player by design (shared-world weather, `rollHazardOccurrence`); only the
  per-player mitigation channel may legitimately vary. `getChainHazardMitigationBonus` is the
  precedent, and the existing `MITIGATION_CAP` (0.90) still binds.
- **The broker discount is server-authoritative.** `market/trade` cannot trust the client, so owned
  licence ids ride the same `workforceData` stash `_factionRep` already uses (`_factionLicenses`,
  type-filtered and capped), and the discount is re-derived from definitions server-side and
  clamped inside `getEffectiveBrokerFeeRate`'s existing 0.85 total-cut ceiling.
- **Biomaterial supply is a delivery, not extraction.** It credits the global pool like
  megastructure `passiveResources` and deliberately does *not* enter `minedFlowsThisTick` or
  extraction pressure. It is also the only source of `xenogenic_biomatter` that does not require an
  interstellar colony.

Every magnitude sits inside a cap that existed before this wave. The `FactionPanel` card now shows
an **Effect** line generated from the same table that drives the math (`LICENSE_EFFECT_SUMMARY`),
so the copy cannot drift from the numbers, and the standing requirement shows its actual rep
threshold (all six previously rendered "Friendly+", hiding the 10/20/25 distinction).

---

## Sim validation

Baseline captured by running each runner in a detached `git worktree` at `HEAD` (54063624) with the
repo's `node_modules` junctioned in — a true before/after byte diff, not a recollection.

| Runner | Result |
|---|---|
| `sim-50yr.ts` | **BYTE-IDENTICAL** |
| `sim-pvp.ts` | **BYTE-IDENTICAL** |
| `sim-tools.ts` | **BYTE-IDENTICAL** |
| `sim-strategies.ts` | Identical on every pre-existing row. Movement = **36 new build-menu sweep rows** (the colony catalogue), attributable entirely to E3.4. |
| `sim-resources.ts` | Identical except **6 new minable resources** (`ammonia`, `antimatter_precursors`, `bio_samples`, `deuterium`, `organic_compounds`, `sulfur`) and the theoretical saturation ceiling **$42.2M → $130.9M/real-day**. |

**The M1 first-copy-ROI CI guard is green** (`tier-ladder-first-copy-roi.test.ts`), as is the F2
floor-authoring guard (`demand-pools.test.ts`) — both after the corrections E3.4 describes.

**On the one number that moved materially.** `sim-resources`'s total is the *theoretical* ceiling
if a single player saturated every minable market cap at the price floor, 24/7 — not an achieved
rate. It tripled because 12 new extraction services exist; three exotics (`antimatter_precursors`,
`bio_samples`, `deuterium`) contribute $84M of the $88.7M increase. That is the intended
consequence of making $8B–$750B territories produce something, it is gated behind those unlocks
plus $6–27B rigs at 1–8 units/month, and the *achieved*-rate runner (`sim-50yr`) is byte-identical.
Recorded as a watch-item for R1-E6, which will touch the same catalogue.

**Coverage caveat, stated plainly.** Neither `sim-harness.ts` nor `sim-50yr.ts` calls
`processTick`/`processFullTick` — they re-derive the economy from the shared formula modules. So
E3.2 (legacy trackers) is genuinely *outside* sim coverage, consistent with `BALANCE.md` Pass 5's
coverage table. It is covered by Jest instead, including the structural writer guard. E3.3 and E3.6
are byte-identity in the sims for the correct reason: both are `null`/empty by default, so they
cannot move a simulation that never buys a licence or completes a server-wide project.

---

## What the Round-1 research missed

Found while implementing; all verified against code.

1. **The sixth grant flag is `precursor_access`, not `precious_access`** (§1a.2 and §1a.5 #7 both
   name the latter). Minor, but it means the Echo Remnants licence maps onto the *rare-tech*
   channel, not a market-access one — which turned out to be the cheapest and most faithful of the
   six to wire, because `unlockedRareTechIds` already exists and is already written by
   `narrative-events.ts` and `exploration.ts`.
2. **`launchCostReduction` is dead in a second place.** `alliance-projects.ts:24,94` declares
   `bonuses.launchCostReduction: 0.50` on an alliance project, read only by display strings in
   `AllianceProjectsPanel.tsx`. Alliance project bonuses never reach `GameState` at all, so this is
   a *different* defect with a different cause. Not fixed here; logged in §E3.9.
3. **The colony bodies' dangling ids were worse than "resolve to nothing in `BUILDING_MAP`".** Of
   the 50 ids, only 14 are even sketched in `colonies.ts`; **36 exist nowhere in the repo**. And the
   14 that do exist would not typecheck as `BuildingDefinition` (invalid category, missing required
   fields) — so "author real buildings" was never a matter of promoting existing literals.
4. **`colonies.ts` has a second source-of-truth problem the audit did not reach.**
   `maxColonySlots` is duplicated by hand in `src/app/api/space-tycoon/colonies/route.ts:94-100`
   rather than imported. The two agree today. Logged, not fixed.
5. **`scripts/audit-research.ts` was laundering techs.** It classifies a research as "used" if any
   colony body gates on it (`usedAsColonyGateBy`), so the 12 empty bodies were marking techs as
   live content. That is now true rather than nominally true, but the audit script's leniency is
   worth knowing about.
6. **The `aerostat_tech` id appears three times in `colonies.ts`**, not once — the location gate
   (`:107`), the dead `COLONY_RESEARCH` definition (`:380`) and a dead `COLONY_BUILDINGS` gate
   (`:416`). Only the live one is fixed; the other two sit in unimported sketches and fixing them
   would imply those arrays are live, which they are not.
7. **The demand-pool default floor is a trap for any new location.** `DEFAULT_FLOOR_BY_CATEGORY`
   is sized for a *small* market, so any future location added without an `NPC_DEMAND_FLOOR` entry
   will silently saturate at N=1 and produce loss-making first copies. The M1 guard catches it, but
   only if the new location has buildings. Worth a note in whatever wave adds the next location.

---

## E3.9 — deliberately deferred, with reasons

- **Defect #8 — move the victory check into the tick.** The check is a React effect keyed on coarse
  `.length` deps, so the four megastructure victories fire only incidentally. Deferred: moving it is
  straightforward, but victory bonuses are read *every tick* at `game-engine.ts:251` and applied at
  five sites, so relocating the *award* changes when those multipliers switch on for real players.
  That is economy timing, three days before the 2026-08-24 world restart, with no sim coverage of
  victories at all. It belongs with R1-E4 (the Legacy Hall), which is the surface that makes victory
  progress visible anyway.
- **Defect #9 — `ClaimStake.expiresAtMs` never checked; `gravitational_lens` pays money instead of
  its promised science boost; `hazard_zone` has no consumer.** Untouched. Expiring claims
  retroactively would remove assets players currently hold, which needs a migration story and a
  player-notice decision, not a quiet code change before a restart.
- **Client → server sync of `playerTitle`.** Victory titles now show on the player's own leaderboard
  row but do not reach `GameProfile.title`, so they do not yet appear on *public* leaderboards or
  corp pages. The sync route has no title field, and adding one risks the client overwriting a
  league- or speed-run-awarded title. Wants a precedence rule (victory > record > league?) that is a
  design decision, not a repair. Belongs with R1-E4.
- **The second dead `launchCostReduction`** (`alliance-projects.ts`, finding #2 above). Its cause is
  that alliance project bonuses never reach `GameState`; fixing it means building that hop, which is
  a feature, not a repair.
- **R1-E6 (mid-band construction rungs)** is untouched and unblocked, as instructed. E3.4 was
  deliberately built *not* to pre-empt it: colony capex sits on the existing tier ladder ($3.5B–$27B)
  rather than filling the measured $2B→$8–80B gap, so E6 still has its whole design space, now with
  12 populated destinations to hang rungs on.
- **`docs/SESSION_DESIGN.md` re-audit** (§1a.7's recommendation) not done — it is a documentation
  pass, not a repair, and it should record E3+E4+E1 together rather than be rewritten twice.

---

# E4 implementation — the Legacy Hall (shipped 2026-08-22)

Round 1 recommended **R1-E3 → R1-E4 → R1-E1**. This section records **R1-E4**, the surface wave,
as built. It closes structural hole **H4** ("long-horizon progression is invisible") and it is
deliberately the cheapest large win in the round: **zero economy math, therefore no sim-harness
run** (`sim-50yr`, `sim-strategies`, `sim-pvp`, `sim-tools`, `sim-resources` are untouched by
construction — nothing in this wave reads or writes a price, a payout, a cost or a multiplier).

Suite: **222 suites / 4,997 tests** (from 221 / 4,944 — one new suite, +53 tests).
`npx tsc --noEmit` clean. `next build` passes. **No save migration; no new `GameState` field**,
optional or otherwise — the Hall is pure derivation over state that already exists.

## E4 scorecard

| Round-1 promise (§1c-E4) | Status |
|---|---|
| 48 milestones with **real progress**, not locked/unlocked | **SHIPPED** — one authored progress term per milestone, drift-guarded |
| 7 infinite stretches with the real next rung | **SHIPPED** — "Dynasties" |
| `getLegacyDisplayTier` (Pioneer → Legend) made legible | **SHIPPED** — the ladder, with live counts per rung |
| `getLegacyPower` | **SHIPPED** — headline readout with its own scoring rule spelled out |
| "The six soft-capped bonus categories with their *current* effective values … a genuinely interesting strategic readout that no player can see today" | **SHIPPED** — raw vs applied vs ceiling vs absorbed-by-the-cap |
| Victory titles (E3.5 applied them; nowhere showed them) | **SHIPPED** — the title roll, with worn-title precedence |
| `corporate-eras.ts` medals and charters | **SHIPPED** — the medal case + live era |
| Retired leaders (LS6) | **SHIPPED** — the bench |
| Quarterly reports "published but under-surfaced" | **SHIPPED as a cross-reference**, not a duplicate — see §E4.6 |
| `milestones.ts` server-wide first-claim races | **NOT INCLUDED** — see §E4.8 |
| A section on the public corp page | **DEFERRED** — see §E4.8 |

---

## E4.1 — where it lives, and why not the three obvious alternatives

**The Legacy Hall is a fourth sub-view of the Reports hub** (`Reports → Legacy Hall`), alongside
Situation Log / Mail / Quarterly. One canonical home; no 29th tab.

Three alternatives were considered and rejected on evidence, not taste:

- **A new tab.** Rejected by standing convention (`LIVE_SERVICE_2026-08.md` §LS1) and by Round 1's
  own rejected-ideas register.
- **Inside the Victory tab.** This is the intuitive answer and it is *wrong*: `victory` unlocks at
  **corporation Tier 5** (`corporation-tiers.ts:131`), i.e. $500B `totalEarned` — which §1a.3
  measured at 0.8x the best 50-year gross. Putting a system whose **first ten milestones fire in
  the first hour** behind the game's second-deepest tier gate would reproduce exactly the defect
  E4 exists to fix (Legacy Power is currently visible *only* inside the Tier-6-gated
  `SpeedRunPanel`). The Hall lands at Tier 2 instead, which is where `reports` unlocks — roughly
  where the FTUE chain ends, so it arrives as a staged unlock rather than as noise during
  onboarding.
- **Inside Governance.** Round 1 offered "Governance or Reports". Governance is Tier 4, and it is
  the *management* surface — charter an era, switch doctrine, face the board. The Hall is a
  read-only ledger. Splitting them keeps `CorporateEraPanel` (chartering) and the medal case
  (record) doing different jobs instead of two panels showing the same eras.

**Reports is the right identity for a second reason.** Round 1's realism note for E4 is that the
Hall "is not a new mechanic; it is a ledger… a 22nd-century corporation with >$1B extraterrestrial
assets is *required by the Accord* to report publicly (LORE, Accord of Geneva 2089) — this is the
corporate history that reporting produces." The tab that holds the automatic quarterly filings is
literally the tab that produces it.

**Reachability.** One inbound home, several outbound links. The Hall deep-links to Governance
("Charter an era"), the Victory board, the Commanders roster, and its own sibling Quarterly view —
and each of those links is rendered **only if the player's corporation tier has actually unlocked
the target** (`getTierUnlockedTabs`), because a link into a locked tab is a render hole, not a
teaser (the standing E3 follow-up). Inbound, `VictoryPanel` names the Hall in text rather than
linking: `VictoryPanel` has no navigation handler, and threading one through `page.tsx` for a
Tier-5-only surface buys less than it risks while a parallel wave is editing that file.

## E4.2 — the shape, and why that shape

Master of Orion 2 and Stellaris both make long-horizon achievement read as a **record of a
civilisation**, not a checklist: a standing, the standing's ceiling, the deeds behind it, the names
attached to them. So the Hall is one continuous scroll in that order, and it never sorts a player's
own history into a to-do list:

| # | Section | What it answers |
|---|---|---|
| 1 | **Standing** | Who you are now (Pioneer → Legend), what the next rung literally requires, with live counts. Legacy Power and its scoring rule. |
| 2 | **Standing bonuses** | What the record is *worth* — six channels, raw vs applied vs ceiling vs absorbed by the cap. |
| 3 | **Deeds** | All 48 milestones, grouped by tier, filterable All / Earned / Outstanding. |
| 4 | **Dynasties** | The 7 infinite stretches and the real next rung of each. |
| 5 | **The Record** | Titles worn and won · era medal case · the retired bench · filings on record. |

A single scroll rather than a second row of sub-tabs: this is a *browse-y* surface (the brief's own
word), and a trophy room that makes you click four times to see your trophies is a filing cabinet.
The one filter that does exist is on Deeds, where 48 rows genuinely need one.

Chrome is Wave A's, not new: `ConsolePanel` (with `variant="secondary"` for the recessed data wells
— sections 2, 4, 5 are read-only readouts stamped into the console face, sections 1 and 3 are
primary housings), `HoloCard`, `DataChip`, `StatReadout`, `Figure`, `GameIcon`, `HoloTip`/`Concept`.
No new CSS, no new animation — which is also how the wave inherits the global reduced-motion guard
in `GameStyles.tsx` for free.

## E4.3 — the honesty contract (this is the load-bearing part)

`LegacyMilestone.check` is an **opaque `(state) => boolean`**. `legacy-system.ts` declares no
progress metric anywhere. So a generic "percentage complete" **cannot be derived** from a milestone
definition, and any panel that produced one would be fabricating telemetry.

`src/lib/game/legacy-hall.ts` therefore authors **one progress term per milestone**, mirroring that
milestone's own check, and two structural rules keep it honest:

1. **A term whose target is 1 is BINARY by construction.** A bar sweeping 0 → 1 asserts a gradient
   that does not exist — "do you hold GEO?" has no 43%. Binary rows render a state word
   (`Achieved` / `Not yet`) and carry `fraction: null`. **`null` is not `0`**, and there is a test
   that says so, because a fabricated 0% is indistinguishable from a real one on a metered row.
   17 of the 48 milestones are binary under this rule: the six location unlocks, the four
   era-medal predicates, the first-facility deeds, and the first-retirement deed.
2. **A drift guard, not a value test.** `legacy-hall.test.ts` runs **every** milestone's `check()`
   against **every** authored term over a battery of 8 hand-built states, and fails on any
   disagreement. The battery is itself guarded: a further test asserts every milestone is satisfied
   by at least one state *and* unsatisfied by at least one other, so the guard can never pass by
   only ever seeing `false`. A completeness test fails if a new milestone ships without a term, and
   an orphan test fails if a term outlives its milestone. This is the same discipline E3.3
   introduced for mega-project bonus consumers, and it is the only reason a hand-authored mirror of
   48 predicates is acceptable at all.

**`achieved` is read from `legacy.completedMilestones`, never recomputed from `check`.** A
milestone is permanent: decommission the buildings that earned `legacy_ten_buildings` and the deed
stays yours. Recomputing would silently un-earn it — the exact failure mode `accrueLegacyTrackers`
was written to avoid on the write side (E3.2). Both directions are tested.

Where an *earned* deed's live counter has since regressed, the row shows **Achieved** and the term
reports the true current value rather than a shaming percentage.

### What turned out to be underivable, and how it is presented instead

| Thing | Why no honest percentage exists | Presented as |
|---|---|---|
| Location unlocks (`geo`, `mars_surface`, `jupiter_system`, `saturn_system`, `outer_system`) | A boolean membership test; there is no partial GEO | Binary state |
| Era medals (`legacy_era_silver` / `_gold` / `_platinum`) | "Best medal so far" is ordinal, not fractional | Binary state |
| First-of-a-kind deeds (first LEO facility, first belt facility, first charter, first retirement) | Target of one | Binary state |
| **Achievement titles** | `Achievement.check` is an opaque boolean with no declared metric, and unlike victories there is no `progress()` function to borrow | Only **earned** achievement titles are listed at all; `fraction: null` |
| Speed-run records and season prestige titles | Server-side only; not present in `GameState` and not on the sync payload | **Omitted entirely** rather than shown empty — see §E4.8 |

## E4.4 — reachability honesty

§1a.3 measured the best archetype's lifetime cumulative gross over 50 game-years at **~$611B**
(`BALANCE.md` Pass 5, C2). Several legacy targets sit one to two orders of magnitude past it. Per
the founder's Pass 7 ruling those horizons are intentional generational content, so the Hall
**labels** them rather than hiding them or dressing them as almost-there. Only two bases are used,
and both are arithmetic:

- **Money targets**, against the $611B measurement. `legacy_trillion` ($1T) and `legacy_ten_trillion`
  ($10T) are flagged; `legacy_hundred_billion` and below are not. `stretch_revenue` flags its next
  rung once the requirement crosses the line (level 3 = $1.25T).
- **Wall-clock targets**, against `corporate-eras.ts`'s real `ERA_DURATION_MS` (90 real days).
  `legacy_era_decade` = 10 x 90 = 900 real days ≈ 2.5 real years → generational.
  `legacy_era_veteran` = 270 days → **not** flagged.

**A count target with no published measurement gets no label at all.** There is no measured
"buildings at 50 years" figure, so calling `legacy_hundred_buildings` generational *or* reachable
would be invention in either direction. The chip is a `HoloTip` whose `source` line always cites
the measurement it derives from, so the claim is auditable from inside the game.

## E4.5 — what was added to `legacy-system.ts`, and why it cannot move the economy

Two additive exports, no behaviour change:

- `LEGACY_CATEGORY_CAPS` — the previously-private `CATEGORY_CAPS`, exported so the Hall can show
  the ceiling. `CATEGORY_CAPS` is now an alias, so every existing reference is untouched.
- `getLegacyBonusBreakdown(legacy)` — per-category `{ raw, effective, cap, hardCap, capUsed,
  lostToCap }`.

To build it, `getCategoryBonus` was split into `getCategoryRaw` (the un-capped sum) plus the
identical soft-cap expression. **`getLegacyBonuses` — read by the tick every game-month and applied
at five sites — is a pure re-shuffle**, and two tests pin it: one locks the zero case to its exact
prior output, and one asserts the breakdown's `effective` values reproduce `getLegacyBonuses`'s
multipliers to 12 decimal places. The breakdown re-derives nothing; it reports what the engine
already computes.

The soft-cap readout is the one genuinely *strategic* thing in the Hall: `cap x (1 - e^(-raw/cap))`
means the tenth revenue milestone pays a fraction of the first, and until now no player could see
that, or see how much of their earned bonus the cap was absorbing. Both numbers are now on screen.

## E4.6 — victory titles and quarterly reports (the "also in scope" items)

**Victory titles fit, and are in.** E3.5 made `playerTitle` real but left it visible only on the
player's own leaderboard row. The Hall's title roll shows: the title **currently worn**, every
title **held** (victory + achievement), and every **unclaimed victory title** with its real
`getVictoryProgress` percentage. The worn-slot rule is display-only and mirrors what `page.tsx`
already does when it writes the field — **victory outranks achievement**, the rarer honour wins —
so the Hall explains the precedence rather than inventing one. Nothing is written back to state.
Note that all 11 victory titles are listed even though the Victory *board* is Tier-5 gated: for a
Tier 2–4 player this is the only place those titles exist at all.

**Quarterly reports fit as a cross-reference, not as a duplicate.** They are already the sibling
sub-view in the same hub, so re-rendering the report cards inside the Hall would be two surfaces
drifting apart. Instead the Hall carries a **Filings on record** block — quarters on file, latest
quarter, latest net worth, growth, and lifetime profit summed across stored filings (real
arithmetic over real rows, never an extrapolation) — plus a button that switches the hub to the
Quarterly view. That is the Hall doing its ledger job: telling you the filings exist, what they add
up to, and where to read them.

## E4.7 — accessibility and 375px

- **Meters.** Every bar is a real `role="progressbar"` with `aria-valuenow/min/max` and a label
  that repeats the same numbers the bar draws ("Infrastructure Titan: Buildings standing 27 of 50,
  54 percent"). The numeric readout sits beside every bar in visible text, so no meter is the sole
  carrier of its own value.
- **Never colour alone.** Milestone state is `medal` vs `medal-outline` (shape-distinct, the V1
  convention `corp-era-registry.ts` already established) plus the words *Achieved* / *Not yet*;
  medal tiers carry `ERA_MEDAL_LABEL` text; the generational horizon is a labelled chip with a
  clock glyph; ladder rungs read *Current* / *Passed* / *Ahead* in text.
- **Keyboard.** The Deeds filter is a labelled `role="group"` of `aria-pressed` buttons at the 44px
  target; every deep-link is a real `<button>`; `HoloTip` triggers are already keyboard-openable
  and Escape-closable by design.
- **Headings.** h2 (the Hall) → h3 (each section, via `ConsolePanel asH3`) → h4 (tier groups,
  each `aria-labelledby`-bound to its `<section>`). No level is skipped.
- **Reduced motion.** No bespoke animation is introduced; the only transitions are the existing
  chrome's, which the global `prefers-reduced-motion` block already disables.
- **Type floor.** 10px minimum throughout (V8 canon); figures 11px+.
- **375px.** Authored phone-first: every grid starts `grid-cols-1` and widens at `sm`/`lg`/`xl`,
  every row is `flex-wrap` with `min-w` guards, and the deed row's progress column drops to full
  width below `sm` so the meter never competes with the description. The bench avatars are text
  monograms, so the phone layout costs no image bytes.

## E4.8 — deliberately not included, with reasons

- **Speed-run records.** Round 1 listed them as Hall content. They live entirely server-side
  (`speed-runs.ts` + four API routes) and are **not on `GameState` or the sync payload**, so
  surfacing them means a network fetch inside a panel that is otherwise a pure lens over state.
  Rendering an empty section, or an always-spinning one, would be worse than omitting it. It is a
  clean follow-up once the Hall proves out: one `GET` and a section.
- **Season prestige titles** (`season-chronicle.ts::derivePrestigeTitles`). Same reason — server
  data, and additionally scoped to the opt-in seasonal sandbox rather than to the main economy.
- **`milestones.ts`' 10 progression milestones.** These are *time-boxed onboarding* rewards
  (deadlines in real days from account creation, cash payouts), not permanent legacy. Putting a
  deadline clock inside the permanent record would confuse two different things.
- **The public corp-page section** (`/space-tycoon/corp/[id]`). `legacy` is not synced to the
  server at all, so a public Legacy section would need a publish path with its own sanitisation and
  opt-in trust boundary — exactly the shape `corp-era-registry.ts` and `corp-report-registry.ts`
  already have, and exactly the amount of work that makes it a wave of its own rather than a
  footnote on this one. The Chronicle and the published quarterlies already give the public page a
  history spine.
- **Defect #8 (move the victory check into the tick).** E3.9 parked this "with R1-E4". It stays
  parked, and E4 is the reason it should: relocating the *award* changes when victory multipliers
  switch on for real players, which is **economy timing with no sim coverage**, and this wave's
  entire licence to skip the sim harness is that it contains zero economy math. Doing it here would
  forfeit that. It belongs in a wave that runs `sim-50yr`.
- **Client → server sync of `playerTitle`.** Also parked by E3.9 pending a precedence rule. E4
  supplies the *display* precedence (victory > achievement) and documents it, which is the design
  half; the sync route change is still a server wave.

## E4.9 — what E4 found while building

1. **`victory-conditions.ts`'s file header still says "7 victory conditions"** — there are 11. Same
   class of drift as `legacy-system.ts`'s "40 fixed milestones" header (there are 48) and
   `corporate-eras.ts`'s counts. Not fixed here (header-only, and parallel waves are editing
   neighbouring files); worth a sweep.
2. **`TAB_CATALOG` holds 31 entries, not 28.** `LIVE_SERVICE_2026-08.md` §LS1's "28 is enough" and
   §0.2's "no 29th tab" rule are both quoted against a number the code passed some waves ago
   (`victory`, `governance` and `predictions` are all in the catalogue). The *spirit* — don't add
   tabs, fold into hubs — is what E4 followed. The literal count should be re-stated somewhere
   before the next wave quotes it again.
3. **`getLegacyDisplayTier`'s Legend rung is unreachable through Architect-tier milestones alone.**
   It needs `t4Count >= 10` and there are exactly 10 Tier-4 milestones — so Legend requires *every*
   Architect deed plus 50 total dynasty levels. That is intentional-looking, but it means the
   Architect → Legend step is an all-or-nothing wall rather than a ladder rung. The Hall now makes
   this visible for the first time; whether it should be repriced is a design question for a later
   round, not a bug.
4. **`stretch_revenue`'s `getRequirement(0)` is $10B, a curve constant rather than a cleared bar.**
   Using it as the level-0 floor would render a negative (clamped-to-zero) fraction on every new
   save until $10B. The Hall measures level 0 from zero and only uses `getRequirement(level)` as
   the floor from level 1 up. Tested.
5. **`legacy.trackers` now has a *reader with a face*.** E3.2 gave the four counters a writer;
   until E4 nothing showed them to a player. `legacy_first_mine` and `stretch_mining` are the two
   deeds whose progress bars are only meaningful because of that repair — the Hall is where E3's
   plumbing fix becomes visible work.

---

# E1 implementation — the Accord Chair (shipped 2026-08-22)

Round 1 recommended **R1-E3 → R1-E4 → R1-E1**. This section records **R1-E1**, the political
contest, as built. It closes the third of the four structural end-game holes §1a named: *no
political contest with a prize.*

The Accord Senate was already live — a docket, real lobbying, a vote history. What it did not have
was **a chair, an election, or a shared tally**. There was nothing to win. MoO2's Galactic Council
is the reference: a scheduled political event that forces engagement between players who would
otherwise never touch each other, with a refusal option that makes the result a decision rather
than an announcement.

## E1 scorecard

| Requirement (wave brief) | Where |
|---|---|
| Vote weight derives from **published quarterly reports**, not cash | `accord-chair.ts::computeChairVoteWeight`, fed by `server-chair.ts::buildChairVoterRecord` over `PublishedCorpReport` |
| Winning grants a **verb**, not a percentage | `accord-chair.ts::applyChairWritToDocket` -> `accord-senate.ts::applyDocketWrits`, exercised via `POST /api/space-tycoon/chair {action:'issue_writ'}` |
| Losers get a **real refusal** | Fracture: `AccordFracture`, `factions.ts::FRACTURE_REP_SHIFTS`, the measure exemption in `accord-senate.ts::resolveMeasure` |
| **Population gate** with env override | `accord-chair.ts::getChairGateStatus`, `CHAIR_MIN_ELECTORATE = 16` |
| **NPC participation** is coherent, not RNG | `accord-chair.ts::decideNpcBloc` / `scoreCandidatesForNpc` / `factionMeasureInterest` |
| Sim validation | Four runners, **all byte-identical** — see below |

Regression coverage: `src/lib/game/__tests__/accord-chair.test.ts` (70 tests). Suite **224 suites /
5,082 tests**, all green (that count includes the parallel E4 wave's suites). `npx tsc --noEmit`
clean; `next build` passes with both new routes registered dynamic.

## SCHEMA CHANGE — `prisma db push` REQUIRED

**Five new tables** at the end of `prisma/schema.prisma`. **Nothing in this wave works until they
are pushed**, and everything degrades honestly until then: `server-chair.ts::isChairSchemaAvailable`
probes once per 5 minutes (the `server-equity.ts` / `server-ledger.ts` pattern), the sync route's
`chair` field stays `null`, the panel renders nothing at all, and both engine consumers
(`accord-senate`'s writ lookup and its fracture exemption) already treat null as "no Chair system".

| Table | Purpose |
|---|---|
| `AccordChairTerm` | One row per monthly term. `termIndex` is the primary key; `status` is `open` / `certified` / `vacant`; `tallyJson` holds the full public count |
| `AccordChairCandidacy` | A corporation standing in a term, with its pledged writ and patron faction. `@@unique([termIndex, profileId])` |
| `AccordChairBallot` | One ballot per corporation per term. Weight is recomputed server-side at cast time and stored with its itemised derivation so the count stays auditable. `@@unique([termIndex, voterProfileId])` |
| `AccordChairWrit` | An exercised agenda writ. `@@unique([termIndex, quarterIndex])` — a writ can never be double-spent on one session |
| `AccordFracture` | Articles of Fracture; `reaccededAt` closes the row. One per profile |

Profile ids are stored **without relations or cascades**, matching `PublishedCorpReport` and
`CorpEraRecord`: the Chair roll is permanent public history and must survive a profile deletion
rather than silently vanish from the record.

Optional Railway env, only when a shard wants the office open early: `TYCOON_CHAIR_FORCE=true`.
`TYCOON_CHAIR_ENABLED=false` is the kill switch and wins over the force flag.

## E1.1 — the calendar: why monthly, and why not the senate's quarter

`SESSION_DESIGN.md`'s most under-served loop is the ~30-real-day cadence, and
`LIVE_SERVICE_2026-08.md` §1.3 says so explicitly. The senate's own "quarter" is **~18 real hours**
(3 game-months at 6 real hours each) — a term on that cadence would be over before a player noticed
it had started, and `SESSION_DESIGN.md` misfiling it as *quarterly* is precisely the drift §1a.7
recorded.

So a **Chair term is one real UTC calendar month**, and the cycle is:

```
day 1 .............................. term begins; the ballot for it closed at 00:00 UTC
       (recess — the seated Chair spends writs)
last 7 days ........................ nominations AND ballot open
last 3 days ........................ nominations closed; ballot still open
00:00 UTC on the 1st ............... certification
```

Two deliberate asymmetries. **Ballots are open for the whole 7-day window**, not just the final 72
hours, because a corporation that logs in once a week must not be structurally disenfranchised.
**Nominations close 3 days early** so every platform is public and scrutinised before the count —
late filing cannot dodge the NPC bloc's published reasoning or a rival's counter-campaign.

Certification is done by `POST /api/space-tycoon/chair/resolve`, a 2-hourly idempotent settler
(`cron-scheduler.ts` label `tycoon-chair-resolve`, offset to `:50` so it never contends with the
equity settler at `:30`). It certifies every closed-but-open term oldest-first, bounded at 24, so a
shard that was down for weeks fills its Chair roll in order with no holes. It is registered in
`middleware.ts`'s `cronPaths` — the CSRF-for-new-cron gotcha every prior wave has flagged.

## E1.2 — vote weight: exactly how it derives from quarterlies

The franchise reads **four fields of a published report and nothing else**:

```
weight = charter(1)
       + scale        floor(log10(netWorth / $100M) x 4),        cap 16
       + record       consecutive published quarters,            cap  6
       + performance  growth-rate band from the same report,     cap  4
                                                          raw maximum 27
```

then a **chamber concentration cap**: no corporation may cast more than `CHAIR_MAX_VOTE_SHARE`
(25%) of the total player vote, floor 1.

Five choices worth defending:

- **Cash on hand is not an input, and structurally cannot become one.** `ChairVoterRecord` has
  exactly four fields (a test asserts the key set), all read out of `reportJson`. `money` is
  liquid, un-published, and the single most manipulable number in a save; weighting by it would
  make the franchise a wallet. **Book net worth** — the M1/F4 asset-aware figure already used for
  Frontier graduation, exec comp, leagues and takeover valuation — is the scale input, and it only
  counts **if the corporation chose to publish it where rivals can read it.** That is the
  information-disclosure trade the mechanic exists to create: publish to vote heavier, and your
  competitors get your numbers on the public registry.
- **Scale is log-scaled, deliberately.** Pass 5 measured Gini at 0.79–0.82. A linear
  wealth-weighted franchise would hand the office to the top of that curve every single month and
  the election would stop being a contest. $1B is worth 4 scale votes; $1T is worth 16 — a
  thousand-fold wealth advantage buys a four-fold vote advantage, and the 25% chamber cap bounds
  even that.
- **A charter seat for every publisher.** One vote, unconditional, for anyone who files. A small
  corporation is not voiceless; it is simply outnumbered, which is the honest version.
- **The record term rewards *consecutive* filing.** Publish, skip two quarters, publish again, and
  the counter starts over. The mechanic pays for standing disclosure, not for one opportunistic
  filing the week before a ballot.
- **The concentration cap is applied in ONE pass.** An iterative re-normalisation converges on an
  equal-weight chamber whenever a whale is present, which would erase exactly the "demonstrated
  standing" signal being measured. One pass clips the outlier without flattening everyone else, and
  it is trivially deterministic — the number the panel shows a voter before they commit is computed
  by the same function the tally uses.

A stale record (last filing older than the 90-day lookback) loses the franchise **entirely**, not
partially. Publishing is the price of admission, and it is a recurring price.

## E1.3 — the verb: agenda writs

Round 1's audit found that this game's capstones grant percentage bonuses and never actions — the
measured gap versus Sins and MoO2. So the Chair's prize is an **action on the shared world**:

> **A writ substitutes one measure into — or out of — one upcoming Senate docket, for every
> corporation in the game.**

`CHAIR_WRITS_PER_TERM = 4`. Two modes: `seat` (put this measure on the next docket) and `table`
(take it off). The Chair therefore decides **what the Accord debates**, which is real power over a
shared world, non-destructive, and structurally incapable of being PvP combat.

### Why this needed no repricing, and the bound it sits inside

Three invariants, all test-asserted:

1. **The docket length never changes.** A `seat` writ *substitutes* into the last slot; it does not
   add a fourth measure. More measures resolving per quarter would be a real economy delta; this is
   not.
2. **A `table` writ draws its replacement from the same deterministic shuffle** the docket was
   already sliced from (`accord-senate.ts::shuffleMeasurePool`, extracted for exactly this).
   Therefore **every amended docket is one the un-amended game could already have produced** — the
   set of reachable economic states is unchanged. The writ moves probability mass between existing
   states; it does not create new ones.
3. **Nothing about published odds, effect magnitudes, or lobbying caps is touched.** The Chair
   cannot pass a measure, cannot improve its odds, and cannot change what it is worth.

And the *frequency* bound: a real month holds about 40 accord quarters, so four writs shape ~10% of
a term's dockets — roughly **3% of all measure resolutions**, one slot at a time. Small enough that
a Chair cannot park a favourable measure on every session and re-price the world; large enough that
spending a writ is a genuine tactical decision (before a super-cycle, ahead of a chapter beat,
against a rival's build order). It also lands the verb on the *tactical* loop inside a *monthly*
prize, which is the tempo layering CLAUDE.md asks for.

One more property worth stating: the docket is **world-shared**, so a Chair's writ benefits or costs
*everyone* equally. The Chair's edge is not that they get the subsidy — it is that they choose
*which* risk or subsidy the whole board faces, and they can choose the one that differentially suits
their own portfolio. That is competitive advantage expressed entirely through public goods, which is
about as far from pay-to-win as a capstone can get.

### How it reaches the client without breaking determinism

A writ names the **quarter index** it amends, not a wall-clock instant. `advanceAccordSenate` reads
`state.accordChair?.activeWrits` (the sync snapshot) when publishing a docket and applies any writ
whose `quarterIndex` matches. Every player reaching quarter Q therefore gets the identical docket
*whenever* they get there, and the docket stays a pure function of (quarter index, writ set). A
player behind the world clock encounters a past Chair's amendment when they reach that session —
the honest reading of "the Council's record for that session", and the same rule for everybody.

**The one honest bound on that claim**, stated rather than hidden: the snapshot carries
`WRIT_SNAPSHOT_TERMS = 3` terms of writs (the seated term plus the two before it, ≈120 accord
quarters of coverage), not the whole history. A save more than three real months behind the world
clock publishes those long-past dockets unamended. Widening the window is a one-line change; the
alternative — shipping the entire writ history on every sync — is unbounded growth on the hot path
for a case nobody is in. Only the seated term's writs count against the Chair's budget of four.

`pickDocketMeasures(quarterIndex, count, writs?)` takes the writ list as an **optional, structural**
parameter — declared inline rather than importing `ChairWrit`, because `accord-chair.ts` imports
`MEASURE_MAP` from `accord-senate.ts` and the reciprocal import would be a cycle. **Omitting it
reproduces the pre-E1 behaviour byte-for-byte.** That is what keeps `realignment.ts`'s
`getSenateAggregateScore` — which calls it bare across ~120 quarters per epoch — completely unmoved,
and it is asserted directly by a test.

## E1.4 — Fracture: the refusal, and what it costs

LORE.md's Treaty Fracture of 2143 is canon: three of the six factions walked out of Accord oversight
and the SCC "has no writ over non-signatory faction space." A corporation may do the same.

**What it buys**

- **Exemption from every Senate measure.** `resolveMeasure` still records the vote in the player's
  history — the Council's record is public — but does not apply the consequence. Deliberately
  **two-sided**: you escape the tariffs *and* forfeit the subsidies. With the current catalogue that
  is close to a wash in expectation, which is what makes Fracture a computable bet rather than a
  free pass.
- **Standing with the three factions that already left**: Syndicate +25, Void Corsairs +25, Hive
  Collective +15.
- No Accord compliance to lobby over: lobbying spend stops entirely.

**What it costs**

- **No vote, no candidacy, no lobbying.** Live candidacies are withdrawn and live ballots deleted at
  the moment of filing.
- **Standing collapse with the signatories**: Dominion -40, Echo Remnants -25, Nebula Reavers -15.
- **Re-accession** costs a burned bond (1% of published book net worth, banded $100M–$5B), is barred
  until the term *after* the one it was filed in, and carries one further term of probation before
  the corporation may stand for the Chair again.

### The design decision that matters here

**Fracture introduces no new economic channel.** Every consequence is a *derived modifier over
faction standing*, so it flows through machinery that already exists and has already been balanced:
`STANDING_BROKER_MODIFIER`, `isEmbargoed`, `FACTION_LICENSES.minStanding`, `getEnvoyCost`, and
`delivery-contracts`' faction flavour. There is no `fractureRevenueMultiplier` anywhere, and there
never will be.

Mechanically it is one chokepoint. `factions.ts::getFactionRep` — which had exactly six call sites —
now returns `applyFractureRepModifier(raw, id, fractured)`, and `getRawFactionRep` was added for the
two places that legitimately need the stored value. Consequences of doing it this way:

- **No save migration and no mutation.** A snapshot arriving twice cannot double-apply, and
  re-accession reverses the modifier exactly. (A one-time -40 rep shift would have needed an
  idempotency key and a rollback story.)
- **Client and server cannot disagree.** `market/trade` re-derives the broker fee server-side; it now
  calls the *same pure function* against the server-owned `AccordFracture` row
  (`server-chair.ts::isProfileFractured`) — never a client claim.
- The magnitudes are legible in tier terms: a fractured corporation sitting at neutral drops two
  tiers to *Unfriendly* with the Dominion; one already cool with the enforcer lands *Hostile* and is
  embargoed out of Dominion licences entirely. Meanwhile a merely-Friendly Syndicate relationship is
  carried all the way to *Allied*.

## E1.5 — the dormancy gate: 16, and why not 25

`share-registry.ts` set the precedent with `TAKEOVER_MIN_ACTIVE_CORPS = 25`. E1 ships the same shape
— `CHAIR_MIN_ELECTORATE = 16`, `TYCOON_CHAIR_ENABLED='false'` to force-disable,
`TYCOON_CHAIR_FORCE='true'` to force-enable, kill switch wins — but a **different number measured
over a different population**, and both differences are deliberate.

- **Different number.** The two gates protect against different failure modes. A takeover market
  needs *counterparties*: every participant must be able to find a target, so its threshold scales
  with pair-finding. An election needs a *chamber*: the failure mode is one corporation deciding the
  office by itself. The 25% concentration cap means a winner needs at least three independent
  backers on the player side; at ~16 electors that cap actually **binds** (below about 12 it is
  usually slack, because raw weights are small and similar), so 16 is the smallest chamber where the
  anti-whale rule does real work and a plurality means something.
- **Different population.** The gate counts the **electorate** — distinct corporations with a
  quarterly published inside the 90-day lookback — not active profiles. A shard with 5,000 players
  where nobody files a report has no legitimate electorate, and seating a Chair elected by four
  people would be exactly the "fake contest on day one" the brief rules out. Today that count is
  effectively zero, so the system is genuinely dormant: real code waiting for a real population.

While the gate is closed: every mutation answers **409 `awaiting_electorate`** with the live count,
the panel renders an `inert`-variant console stating the requirement and the current number, and the
certifier marks closing terms **vacant with the gate's own reason** rather than seating a cheap
Chair. Ballots already cast are *not* deleted — if the electorate recovers before the next close
they still count.

## E1.6 — NPC participation: coherent, canon, and capped

Per `docs/NPC_BACKDROP.md`. Three rules, no randomness anywhere.

**1. Only Accord signatories hold seats.** LORE.md's own "Accord relation" lines decide the roster:
the Dominion ("signatory and principal enforcer"), Nebula Reavers ("signatory in name") and Echo
Remnants ("signatory") sit; the Syndicate ("non-signatory"), Void Corsairs ("treated as pirates")
and Hive Collective ("observer status. Has not signed") do not. A Syndicate NPC voting in a body the
Syndicate walked out of would be a lore contradiction. It also gives the chamber a *political shape*:
the standing NPC vote leans Dominion, so an insurgent candidate must out-organise the establishment
rather than out-spend it — the MoO2 council feeling, arrived at from canon rather than invented.

**2. Seats come from authored data.** `seats = max(1, round(progressionSpeed x 20))`, using each
NPC's own published `progressionSpeed` from `NPC_SEEDS` — the one number that already expresses "how
big is this NPC's economy". Fixed, published, identical for every observer on every shard.

**3. Votes come from authored data too.** An NPC scores each candidate on two terms:

```
interest = (measure.onPass.factionRep[myFaction] ?? 0) - (measure.onFail.factionRep[myFaction] ?? 0)
           x (+1 if the platform SEATS the measure, -1 if it TABLES it)
patron   = +6 if the candidate runs under my faction's banner
           -6 if the candidate runs under my faction's declared rivalId
```

Both inputs are things a designer already wrote: a measure's own `factionRep` deltas say which
factions want it passed, and `factions.ts`'s `rivalId` says whom they will not back. **If no
candidate scores above zero the seat ABSTAINS** — it never picks at random, and the abstention is
reported in the tally with a written rationale. Ties break on the lower candidacy id. The whole bloc
decision is reproducible byte-for-byte, and the panel publishes each seat's reasoning *before* a
player files, so the bloc is intelligence to be read rather than a dice roll to be survived.

**The bloc is a floor, never a ceiling.** `scaleNpcBloc` caps NPC seats at `NPC_BLOC_MAX_SHARE` (40%)
of the whole chamber by largest-remainder apportionment. On an empty shard the bloc stands at full
strength so the chamber feels alive; as player weight grows its share falls monotonically and
automatically. NPCs can never elect a Chair once players show up in numbers — and **only a player
corporation can hold the office**. If nobody stands, the seat is certified **vacant**. There is no
fabricated winner and no fabricated participant anywhere in this wave.

## Sim validation

Baseline captured by running each runner in a detached `git worktree` at `HEAD` (7b06bd6f) with the
repo's `node_modules` junctioned in — a true before/after byte diff, per the E3 precedent.

| Runner | Result |
|---|---|
| `sim-strategies.ts` | **BYTE-IDENTICAL** |
| `sim-resources.ts` | **BYTE-IDENTICAL** |
| `sim-tools.ts` | **BYTE-IDENTICAL** |
| `sim-50yr.ts` | **BYTE-IDENTICAL** |

The **M1 first-copy-ROI CI guard** (`tier-ladder-first-copy-roi.test.ts`) and the F2 floor-authoring
guard (`demand-pools.test.ts`) are green.

**Why byte-identity was the expected result, stated so the runs are a check and not a hope.** Two
independent reasons:

1. **Coverage.** No sim runner imports `accord-senate`, `accord-chair`, `factions`, `realignment`,
   `world-calendar` or `server-effects`. Their import graph is `sim-harness` -> `{buildings,
   consumption, demand-pools, extraction-pressure, formulas, frontier, labor-market, market-engine,
   mining-pricing, npc-volume-caps, production-chains, resources, service-pricing, services,
   spot-price, types, workforce}` plus a handful of tool modules. The senate is **outside sim
   coverage entirely** — the same honest caveat `BALANCE.md` Pass 5's coverage table records and
   E3.2 restated. So these four runs prove *no unintended spill*, which is what they are for; they
   cannot and do not validate the senate itself. That is Jest's job here (70 tests), and it is why
   the writ invariants are asserted structurally rather than statistically.
2. **Substance.** Every change this wave makes to a module the sims *can* reach is provably inert by
   default: `pickDocketMeasures` without writs returns the identical shuffle slice (tested);
   `getFactionRep` with `accordChair` absent returns `clamp(raw, -100, 100)` where raw was already
   clamped on every write path; `state.accordChair` is `undefined` on every save until a server sync
   delivers it, and no sim syncs.

**On the agenda power specifically**, which §1d flagged as requiring a harness run: it is **not
economically inert in the abstract** — it changes which measures resolve — but the change is bounded
by construction rather than by tuning, and the bound is the argument. The reachable set of dockets is
unchanged (invariant 2 above), docket size is unchanged (invariant 1), magnitudes and odds are
unchanged (invariant 3), and the frequency is ~3% of measure resolutions per term. There is no
constant here that a sim could have priced, because the wave introduces no new magnitude — only a
re-selection among magnitudes that Pass 7 and W11 already balanced. The `realignment.ts` posture band
(0.8–1.2) that §1d suggested mirroring is untouched for the same reason: folding Chair identity or
the Fracture roster into the epoch aggregate would make `realignment.ts` depend on server state and
destroy the pure/DB-free property `world-calendar.ts` and `delivery-contracts.ts` rely on. That is
recorded as deferred below, not done quietly.

## Accessibility

- **The ballot is a real radiogroup** — `<fieldset>` + `role="radiogroup"` + native
  `<input type="radio">`, so arrow-key navigation, a single tab stop and screen-reader announcement
  all come for free. Every action in the panel (file, withdraw, vote, writ, fracture, re-accede) is a
  button or a select; keyboard-only play works end to end.
- **No state is carried by colour.** Vote counts are text figures with an explicit percentage; the
  bar is `aria-hidden` decoration layered on top. The front-runner is marked with the word
  *"Leading"*, your own ballot with *"Your vote"*, your own candidacy with *"You"*. Faction identity
  is always the faction's **name**; its accent hex appears only as a 2px keyline.
- **The Chair roll is a real `<table>`** with an sr-only `<caption>`, scoped headers, and a
  horizontal-scroll container — the wide-content rule.
- **Fracture is a two-step confirm.** It is consequential and semi-permanent; a single mis-tap must
  not file it.
- **Honest inert state.** Below the gate the panel uses the `inert` frame variant, whose bevel
  geometry (not just colour) says "no power", and states the real requirement and the real count.
- **375px.** Every row stacks; the writ form and candidacy form are single-column on narrow
  viewports and the ballot never needs horizontal scroll. Touch targets are >= 38px.
- **Chrome.** `ConsolePanel` / `HoloCard` / `DataChip` / `StatReadout`, `GameIcon` (a new
  `cal-chair-election` glyph — a gavel over the Council colonnade, distinct in *silhouette* from
  `cal-senate`, which is the colonnade alone), and two new `HoloTip` glossary concepts
  (`accord-chair`, `accord-fracture`). `LeaderPortraitFrame` carries the Council's own voice:
  Secretary-General **Anatole Priest**, who has no portrait in the art roster and therefore renders
  the frame's monogram plate — inventing a portrait would be fabricating content.

## Files touched

**New**

- `src/lib/game/accord-chair.ts` — the pure rule-set (term calendar, gate, vote weight, candidacy,
  NPC bloc, resolution, writs, fracture, snapshot clamp).
- `src/lib/game/server-chair.ts` — Prisma glue (schema probe, electorate count, voter record from
  `PublishedCorpReport`, fracture status/roster, writs, snapshot assembly).
- `src/app/api/space-tycoon/chair/route.ts` — GET + six POST actions.
- `src/app/api/space-tycoon/chair/resolve/route.ts` — the certifier cron.
- `src/components/game/AccordChairPanel.tsx` — the surface.
- `src/lib/game/__tests__/accord-chair.test.ts` — 70 tests.

**Modified**

- `prisma/schema.prisma` — five tables (**db push required**).
- `src/lib/game/accord-senate.ts` — `shuffleMeasurePool` extracted; `pickDocketMeasures` gains an
  optional structural writ list; `applyDocketWrits`; fracture exemption in `resolveMeasure`; fracture
  lock in `commitLobbying`; writ lookup + Chair note at docket publication.
- `src/lib/game/factions.ts` — `FRACTURE_REP_SHIFTS`, `applyFractureRepModifier`,
  `getRawFactionRep`; `getFactionRep` now returns effective standing.
- `src/lib/game/types.ts` — **one optional field**, `accordChair?: ChairSnapshot | null`.
- `src/lib/game/server-effects.ts`, `src/hooks/useGameSync.ts`,
  `src/app/api/space-tycoon/sync/route.ts` — the snapshot hop.
- `src/app/api/space-tycoon/market/trade/route.ts` — server-side fracture parity on the broker fee.
- `src/lib/game/server-ledger.ts` — two burned reasons (`chair_filing_fee_burn`,
  `accord_reaccession_bond_burn`).
- `src/lib/game/world-calendar.ts` + `src/components/game/MissionCalendarPanel.tsx` — the
  `chair_election` category and its three appointments.
- `src/lib/game/icons.tsx`, `src/lib/game/concepts.ts` — one glyph, two glossary entries.
- `src/lib/cron-scheduler.ts`, `src/middleware.ts` — the certifier cron + its CSRF allowlist entry.
- `src/app/space-tycoon/page.tsx` — the panel, inside the existing **Factions** tab. **No 29th tab**
  (standing convention).

## Save-format note (flagged prominently, as instructed)

**No save migration. One optional `GameState` field.** `accordChair` is server-authoritative,
read-only and null-until-sync — the `equity` (M6) and `demandPools` (E4) pattern exactly.
`save-load.ts` is untouched: a pre-E1 save has `undefined` there, every reader treats
null/undefined as "no Chair system", and the client never writes to it. `GameState.version` is
unchanged.

## Deliberately deferred, with reasons

- **Chair identity and the Fracture roster as inputs to `realignment.ts`'s epoch aggregate** (§1c-E1
  listed this). Not done: `realignment.ts` is pure and DB-free by design, and `world-calendar.ts`,
  `delivery-contracts.ts` and the market/trade route all depend on being able to call it server-side
  and client-side with no plumbing. Feeding it server-owned election state would destroy that
  property *and* make every posture non-deterministic per observer. It wants a cached
  epoch-aggregate row, which is a feature, not a wiring change.
- **The public Chair roll on `/space-tycoon/registry` and `/space-tycoon/chronicle`.** The roll and
  the fracture roster are public *in-game* (both are in the snapshot and rendered in the panel), but
  no chronicle or public page was touched — a parallel agent owns the Legacy Hall wave and the brief
  ruled those surfaces out of scope. `AccordChairTerm.tallyJson` already stores everything such a
  page would render, so this is a read-only page section whenever the surface is free.
- **`GameProfile.title` for the seated Chair.** E3.9 left the title-precedence question open
  (victory > record > league > ?); adding a fourth claimant without resolving it would make the
  collision worse. The Chair is displayed from the snapshot instead.
- **Lobbying weighted by Chair standing, and a Chair stipend.** Both considered and dropped: the
  first would let the office buy odds (a magnitude change, and uncomfortably close to purchased
  advantage); the second is a percentage, which is the exact anti-pattern this wave exists to avoid.
- **Coalition / preference voting.** Plurality is the right v1: auditable, explicable in one
  sentence, and a transferable-vote count would make the live tally impossible to publish
  continuously — and the continuous public tally is what makes the campaign a *game*.
- **`docs/SESSION_DESIGN.md` re-audit.** Still not done (E3 deferred it too), but E1 sharpens the
  case: the senate's "quarterly" entry is an ~18-hour loop misfiled as quarterly, and the monthly row
  it should have had is now genuinely occupied by the Chair.

## What implementing this found

1. **The senate's docket generator and `realignment.ts` were one refactor away from a cycle.**
   `realignment.ts` calls `pickDocketMeasures` bare across ~120 quarters per epoch to build its
   posture aggregate. Any writ parameter typed by importing from `accord-chair.ts` would have created
   `accord-senate -> accord-chair -> accord-senate`. The structural inline type is not a style
   choice; it is the only shape that works.
2. **`getFactionRep` was never clamped.** It returned `state.factionReputation?.[id] ?? 0` raw. It
   happens to be safe because every writer clamps, but the derived-modifier rewrite now clamps on
   read as well, which is where it belongs.
3. **`PublishedCorpReport.quarter` is the right key for a *consecutive* count and the wrong one for a
   recency check.** `quarterKey()` encodes the player's own game clock, which advances at different
   real rates for different players; `publishedAt` is wall-clock. The franchise uses `quarter` for the
   consecutive-filing run and `publishedAt` for the 90-day window — mixing them up would have let a
   fast-ticking corporation manufacture a filing record in an afternoon.
4. **`recordLedger` takes a transaction client first.** Non-transactional charges want
   `recordLedgerStandalone`; the signature difference is easy to miss and shows up only as an arity
   error. Noted for the next wave that burns a fee.
5. **Prisma 5.22 rejects `/** ... *` doc comments in the schema** — `//` and `///` only. Worth a line
   in the codebase map; it cost a validation cycle.

---

# Round 2 — Escalating pressure and progression pacing

**Round question.** `BALANCE.md` Pass 5 §H3 measured the economic core's decision cadence collapsing
to **0–3 months per decade** after year ~10 for every archetype except the deepest ladder-climber, and
concluded verbatim: *"the economic core alone goes static by year ~12."* Round 1 named the structural
cause — **H1, there is no escalating external pressure** — and deferred `R1-E2` (Systemic Crises) to
headline this round as *"the biggest idea in the round and the best answer to 'escalating external
pressure'."* Round 2 designs and ships it.

**The framing that decided every call in this round:** the pacing failure is **decision starvation,
not difficulty**. A crisis that is merely *hard* makes a static decade unpleasant instead of empty. A
crisis that is a **decision generator** — recurring, costed, counterplayable, and on a loop the game
under-serves — is the actual fix. Every element below is measured against "how many real decisions
does this put in front of a player in the decades where the economy has stopped producing any."

**Method.** Code read against this repository on 2026-08-22; every constant that changes economy math
was run through the harness *before* shipping, per the standing bar. Where a document and the code
disagreed, the code was treated as truth. The one designed constant this round shipped with was
**changed by the simulation** before it went out (§2f) — the Pass-5→Pass-6 lesson applied verbatim.

---

## 2a. Reference analysis — what the three benchmarks actually do, and the realistic analogue

### Stellaris — the endgame crisis, and the mechanic nobody here has ever shipped

Two separate devices, routinely conflated:

| Stellaris device | What it actually solves | The realistic analogue |
|---|---|---|
| **Endgame crisis** (Prethoryn / Unbidden / Contingency) — spawns on a published year, **scales to galaxy strength**, threatens everyone at once, and forces rivals into temporary alignment | The "I have won, now it is maintenance" state. A dominant empire must *re-tool*, and the crisis is the only content that reliably makes enemies cooperate | A **systemic economic emergency** whose severity is keyed to *measured* server scale — a Kessler cascade, an insurance-mutual failure, a deposit-exhaustion shock, a clearing failure, a post-disaster regulatory order |
| **Situations** — a progress bar ticking toward a bad outcome, with "approach" choices that trade money or capacity for time | Turns a *problem* into a *managed problem*: instead of one modal with one choice, it produces a decision every time the bar advances a stage | Exactly the same mechanic, unchanged. `4X_BASELINE_2026-08.md` Part 2c specced it and **it was never built**; `situation-log.ts` is a derived alert list, not this |
| **Mid/late-game year sliders** — the game *tells you* when pressure ramps | Anticipation. Players plan around a published escalation | A **published forecast phase** and a **published world index**, so the emergency is a plan, not an ambush |

The critical detail Round 1 recorded but did not resolve: Stellaris scales its crisis **to player
power**. Reproducing that naively — "the peril you are biggest in is the peril you get" — turns the
mechanic into a punishment for succeeding. §2c resolves this.

### Master of Orion 2 — Antaran raids

Periodic, on a timer the player can partly influence, escalating with turn count, genuinely
dangerous, and — the part that matters — **they punctuate an otherwise flat mid-game**. A MoO2 raid
is not primarily a difficulty spike; it is an *event* that makes turn 180 different from turn 179.
The analogue is a **scheduled emergency window** on a cadence slow enough to be a beat and fast
enough that a player who logs in weekly meets one.

### Sins of a Solar Empire — the persistent tug-of-war

Sins never lets territory go uncontested: a gravity well is always in the process of changing hands.
The economic analogue is **a pooled obligation that is always either subscribed or short** — a
scoreboard the whole server can see moving, where the interesting state is the *contested* one. That
is the Accord Stabilization Assessment (§2d).

### What the three agree on, restated for this round

Round 1's deepest finding was that all three solve the post-tech-tree problem the same way: **the
world starts acting on you.** Round 2's addition: in all three, *the world acting on you produces
DECISIONS at a steady rate*. The Antaran raid is not one decision, it is a re-tooling. A Stellaris
situation is not one modal, it is a bar with five stage boundaries. That rate is the thing to copy.

---

## 2b. Design — the Accord Emergency Register

One new pure module (`src/lib/game/systemic-crises.ts`), one server module, one API route pair, one
panel inside an existing hub. Five authored emergencies on an eight-week cycle.

### The cycle (pure function of the wall clock)

```
week 0-1   FORECAST     published; ZERO mechanical effect
week 2-5   ACTIVE       situations tick; the assessment is open; the insurance market hardens
week 6     AFTERMATH    the relief allocation lands; the cycle is sealed into the register
week 7     RECESS
```

Eight weeks against `chapters.ts`'s six, deliberately: the two beat against each other on a 24-week
LCM instead of colliding every cycle, and a crisis stage boundary (a Thursday, epoch-week-aligned)
can never land on a chapter finale weekend (fixed Saturday 18:00 UTC). Five definitions × eight weeks
= **40 weeks before the catalogue repeats**, against chapters' 18.

### The loops each element lives on (CLAUDE.md's naming requirement)

| Element | Loop | Why there |
|---|---|---|
| The emergency itself (forecast → active → aftermath) | **Campaign** | Two real weeks of anticipation, four live, one of consequence. The slowest, largest beat the game has outside the epoch. |
| **Posture stages** — five per emergency, one every ~5.6 real days | **Weekly** | `SESSION_DESIGN.md` maps *nothing corporate* to the weekly loop except seasons, leagues and alliance rotations. Pass 8 independently found the offense toolkit's own clocks are weekly ("one campaign window is 7 real days"). This is the loop with room. |
| **The Assessment pledge** | **Weekly**, resolving on a **campaign** deadline | One decision per emergency, but its *value* moves continuously as the pool fills — the Sins tug-of-war shape. |
| **The Chair's relief directive** | **Monthly** (the Chair's own term) acting on a **campaign** outcome | Reuses R1-E1's office. One directive per emergency. |
| **Price dislocations** | **Tactical** | Two authored market events per emergency, on the existing published 48h forecast. Trading them is a session-scale decision inside a campaign-scale event — the tempo layering CLAUDE.md asks for. |

### The five emergencies, and the realism test

The bar Round 1 set: *would a financial historian or an orbital-mechanics engineer recognise this as
a thing that could actually happen?* Each is drawn from a real systemic-risk category **and** a LORE
precedent:

| Emergency | Real-world class | LORE precedent | Telemetry channel |
|---|---|---|---|
| **The Cascade** | Kessler syndrome; the 2007 FengYun ASAT test; the 2009 Iridium–Cosmos collision | Accord Article 4 makes debris the one universally-recognised orbital hazard | orbital objects on the shared registry |
| **The Mutual's Reserves** | A reinsurance hard market / mutual insolvency — Lloyd's LMX spiral 1988–92, Florida property carriers | Outer Rim Insurance Mutual, *"its risk models influence where corporations will operate"* | published corporate net worth in the filing window |
| **The Thin Seam** | Ore-grade exhaustion and cut-off-grade resets; the 2010 rare-earth supply shock | the Belt Rush of 2112–2128; Psyche-16 | accumulated extraction pressure |
| **The Clearing Failure** | Counterparty contagion through novation chains — Herstatt, LTCM, 2008 | the Kepler Merger Wave of 2128 left the clearing arrangements behind | largest single supplier share across demand pools |
| **The Retrofit Order** | Post-disaster mandatory retrofit regimes — Piper Alpha, Challenger, Deepwater Horizon | the Ring Fire of 2137 produced the modern safety regime | installed facilities across recently-synced corporations |

Every loss is hazard-, regulatory- or counterparty-driven, forecast-visible, and never PvP. No
mechanic in this round lets one player damage another.

---

## 2c. The load-bearing design decision: identity is PURE, severity is MEASURED

This is the split the whole round rests on, and it resolves two problems at once.

**Which emergency runs is a pure function of the wall clock** — `CRISIS_DEFINITIONS[cycleIndex % 5]`.
No database, no snapshot, no per-observer variance. That is the same boundary `market-events.ts`
documents at its head (*"every client and the server must agree on which event is live without a DB
round trip"*), and it is **the only reason the crisis price channel is safe**: if severity reached the
price, a player holding a stale snapshot would be shown a different price from the one the server
charges, which is a direct violation of §2.5 "one price truth" (`ECONOMY_PVP_2026-08.md`).

**How hard it bites is measured**, from two independent real sources:

```
worldIndex     = clamp(measured server telemetry / anchor, 0, 2)   -- published at forecast, frozen for the cycle
exposureIndex  = clamp(this corporation's own measure / anchor, 0, 2)
severity       = tier( max(worldIndex, exposureIndex) )
```

Four tiers: **Advisory** (< 0.35 — a published forecast and *nothing else*), **Elevated** (0.35),
**Severe** (0.80), **Systemic** (1.40).

Three consequences worth defending:

- **`max`, not the world alone.** A whale on a quiet shard still faces a real emergency, because the
  exposure is genuinely theirs: a corporation with forty platforms in a crossing orbit is exposed to
  a debris cascade whether or not anybody else has any. This is the honest version of Stellaris's
  scale-to-player-power, and it arrives through physics rather than through a difficulty slider.
- **A rotating catalogue, not a targeted one.** A catalogue that only ever fires the peril you are
  biggest in is a punishment mechanic. A rotating catalogue whose *bite* is priced off your exposure
  to it is a risk model — and it is what insurers actually do. They do not choose which peril occurs;
  they price your exposure to it.
- **Advisory is genuinely inert, and that is the shipped state today.** On a shard with no orbital
  registry, no published filings and no extraction rows, every world index reads ~0 and the emergency
  publishes a forecast and applies nothing at all. That is an honest measured dormancy rather than a
  hidden feature flag — a strictly better version of the `TAKEOVER_MIN_ACTIVE_CORPS` boolean gate,
  because it recovers continuously as the world grows instead of flipping.

**The world index is measured once, at forecast time, and frozen on the cycle row.** Everyone plans
against the same number for the whole cycle, and it cannot move under a corporation mid-emergency.

### Where each number actually comes from

`server-crises.ts::measureWorldIndex` — five real aggregates over rows the game already maintains for
other reasons. A failed query returns 0, which reads as Advisory: **a telemetry outage can never
manufacture an emergency.**

| Channel | Query | Anchor | Provenance |
|---|---|---:|---|
| `orbital_density` | `OrbitalSlotOccupancy.count()` | 60 | ESTIMATE. Pass 8 measured GEO occupancy at 2–3 of 180 after 96 sim-months against a 153 congestion trigger; 60 sits well below it, so density severity climbs long before the slot machinery would fire |
| `insured_capital` | Σ latest `PublishedCorpReport.netWorth` inside the 90-day window | $50B | ESTIMATE. Pass 5 C2 measured the best archetype's 50-year gross at ~$611B; $50B of *disclosed* net worth is roughly where one insurer failure becomes a market event |
| `extraction_pressure` | Σ decayed `LocationExtraction.accumulated` (mirrors the module's own 10%/day lazy decay) | 40 | ESTIMATE. ~66 deposits worked to the 0.4 floor |
| `market_concentration` | mean top-supplier share × contested pools ÷ 20, over `LocationDemandPool` rows with >1 supplier | 1.0 | ESTIMATE. 20 genuinely contested markets each fully dominated reads 1.0 |
| `built_capacity` | Σ `GameProfile.buildingCount` for profiles synced in 30 days | 400 | ESTIMATE. §9b measured the eight 50-year archetypes at 119 installations between them; 400 ≈ 20 mature corporations |

Anchors are estimates and **say so in the game**, on the panel, beside the measured numerator. The
numerator is never an estimate.

---

## 2d. Forced cooperation without combat — the Accord Stabilization Assessment

The round brief calls this the prize: *the most interesting pressure makes rivals cooperate
temporarily without any combat.* Three mechanisms make it real rather than rhetorical.

**1. The arithmetic requires it at the top tier, and only at the top tier.** Progress accrued over a
full four-week window at exposure index 2.0 (factor 1.5); 1.0 realizes the loss:

| Posture | Elevated | Severe | Systemic |
|---|---:|---:|---:|
| Absorb (free) | **1.58** ✗ | 2.40 ✗ | 3.60 ✗ |
| Harden (recurring) | 0.63 ✓ | 0.96 ✓ | **1.44 ✗** |
| Harden **+ pledge** | 0.32 ✓ | 0.48 ✓ | **0.72 ✓** |
| Reposition (one-off + revenue drag) | 0.24 ✓ | 0.36 ✓ | 0.54 ✓ |

(Test-asserted in `systemic-crises.test.ts` §"the posture ladder is arithmetic, not scripted".)

Read the third row: **at Systemic, a heavily-exposed corporation cannot defend its way out alone.**
It must either pull capacity out of the exposed lane — giving up revenue — or pay into the collective
fund. The cooperation pressure is arithmetic, not a scripted "you must cooperate" beat, and it
appears exactly where a systemic emergency should force collective action.

**2. Free-riding works, and is visible.** Whether the pooled target is met changes the aftermath for
*every corporation the emergency reached*, pledger or not. So the individually optimal move is
usually to let someone else fund it — right up until enough corporations reason the same way. The
pledge roll is public (top pledgers, count, share of pool), so reputation is legible: this is
CLAUDE.md's "public diplomacy feed" principle applied to a commons problem. It is also exactly how
real industry mutuals, the 1907 Morgan syndicate and the LTCM consortium behaved.

**3. The seated Accord Chair gets a second verb.** R1-E1 gave the Chair agenda writs — power over
*what the Accord debates*. Round 2 gives it power over *what the Accord's emergency money buys*: one
**relief directive** per emergency, choosing among three published allocations, each a different
authored consequence for the whole board in the aftermath week. It is committed **once**, before the
pool fills — a Chair cannot watch the subscription and then re-allocate, because the corporations
deciding whether to pledge are entitled to know what they are funding. Same shape as the writ: an
action on a shared public good, non-destructive, structurally incapable of being PvP.

**Anti-pay-to-win, stated precisely.** A pledge buys (a) a bounded 20pp mitigation on the pledger's
*own* exposure bar, capped with everything else at the pre-existing 0.90 ceiling, and (b) a share of
a public good every reached corporation receives anyway. It buys no resources, no multiplier, and no
advantage over another corporation. The **qualifying pledge scales to the pledging corporation**
(0.25% of its own capital at risk, floored at $1M), so a small corporation buys the identical
protection proportionally — money cannot buy a bigger shield, only an earlier one. The money is
**burned** (`crisis_assessment_burn`), not escrowed: there is nothing to withdraw and nothing to
exploit by pledging and un-pledging.

---

## 2e. Newcomer safety — the exact rules, and why the glide is not a suppression

`isCrisisEligible` is one function with four gates, each test-asserted:

1. **Protected Frontier → exempt outright.** No situation ever opens, at any severity, at any
   exposure. Asserted with a maximum-severity snapshot and a 40-building portfolio.
2. **Still inside the FTUE chain → exempt outright** (`isOnboardingComplete`). Same assertion.
3. **Outside the active window → nothing opens.**
4. **Advisory tier → nothing opens.**

Both protected cases also pay **exactly the pre-Round-2 insurance premium** — the crisis multiplier
returns literal `1`, asserted against `calculateInsurancePremium` directly.

**The graduation glide is deliberately a taper, not a fifth gate.** A fresh graduate's exposure bar
advances at `(1 − glideFraction)` of the normal rate, decaying linearly to full over the same 14 real
days Pass 6 measured for the demand-pool glide. Suppressing crises outright until day 15 would
manufacture a cliff on day 15 — which is precisely the defect Pass 5 C1 found and Pass 6 fixed. The
rate is asserted monotone in the glide fraction with no discontinuity anywhere.

**And the loss is bounded twice, so no archetype can be driven insolvent by a single emergency** —
Round 1's own acceptance requirement (b):

```
loss = min( LOSS_PCT[tier] x capital held AT ONSET , 0.25 x cash on hand )
```

The onset basis means nothing a player does during the emergency can inflate it. The cash ceiling
means solvency is guaranteed — asserted at $10M, $500M and $20B cash against a $500B notional
portfolio, and at zero cash (where the loss is zero rather than negative).

---

## 2f. Sim validation

Baseline captured by running each runner in a detached `git worktree` at `HEAD` (`5325b208`) — a true
before/after byte diff, per the E3/E1 precedent.

| Runner | Result |
|---|---|
| `sim-strategies.ts` | **BYTE-IDENTICAL** (0 lines added, 0 removed) |
| `sim-resources.ts` | **BYTE-IDENTICAL** |
| `sim-tools.ts` | **BYTE-IDENTICAL** |
| `sim-50yr.ts` | **Zero lines removed.** Movement = **43 new lines**, entirely the new §9b probe |

**M1 first-copy-ROI CI guard** (`tier-ladder-first-copy-roi.test.ts`) and the **F2/F6 demand-pool
floor guard** (`demand-pools-population-scaling.test.ts`) are green. Suite **225 suites / 5,160
tests**, all passing (from 224 / 5,082). `npx tsc --noEmit` clean. `next build` passes with both new
routes registered dynamic.

**Why byte-identity was the expected result, stated so the runs are a check and not a hope.** No sim
runner imports `systemic-crises`, `economic-sinks`, `hazards`, `chapters` or `market-events` — the
50-year runner's own header lists *"hazards & insurance"* among the systems it explicitly does not
model. And every reachable change is provably inert by default: `state.systemicCrisis` is `null` on
every save until a server sync delivers one, and no sim syncs; `getCrisisInsurancePremiumMultiplier`
returns literal `1` in that case; and `advanceSystemicCrisis` returns *the same GameState object it
was given* when no crisis exists (an identity assertion, not a value one — see §2h finding 1).

### §9b — the acceptance measurement this round actually needed

Byte-identity proves no unintended spill. It cannot answer the round question. So `sim-50yr.ts` gains
a new **§9b**, which imports the shipped module's own pure functions (calendar, tier thresholds,
posture cost table — never a re-implementation, so the probe cannot drift from what players face) and
lays the real crisis calendar over the existing 600-month shared world.

**Coverage, stated plainly:** §9b is a *calendar + exposure* probe, not an in-world simulation of the
crisis. The harness does not tick `systemic-crises.ts`. What it measures honestly is the **decision
supply**, whether each archetype's own measured portfolio clears the Advisory threshold, and what the
containing posture **costs** as a share of that decade's net income.

Measured decision supply: a crisis cycle is 8 real weeks = **224 game-months**; onset + 5 stage
boundaries + the assessment deadline = **7 decision points per cycle**; **3 emergencies open inside
the 600-month run** (2–5 crisis decision-months per decade).

**Result — decision cadence, economic core → economic core + crisis layer:**

| archetype | y0–10 | y10–20 | y20–30 | y30–40 | y40–50 |
|---|---|---|---|---|---|
| mono-expander | 13 → 16 | **1 → 4** | **1 → 5** | 3 → 5 | **1 → 6** |
| integrator | 25 → 27 | 8 → 11 | 9 → 13 | 3 → 5 | 3 → 8 |
| industrialist | 7 → 10 | **2 → 5** | **1 → 5** | **1 → 3** | 2 → 6 |
| aggressor | 24 → 27 | 9 → 11 | 12 → 15 | 7 → 8 | 6 → 11 |
| turtle | 31 → 33 | 17 → 20 | 17 → 21 | 14 → 15 | 10 → 15 |
| hoarder | 4 → 4 | 2 → 2 | 1 → 1 | 2 → 2 | 1 → 1 |
| joiner-y10 | — | 7 → 7 | 8 → 11 | 23 → 25 | 11 → 15 |
| joiner-y30 | — | — | — | 5 → 5 | **0 → 0** |

> **Dead decades (y10–50, 30 archetype-decades): mean cadence 6.23 → 8.70 months/decade (×1.40).**
> **STARVED decades only (baseline ≤ 3 decisions, n = 15): mean 1.60 → 3.87 (×2.42).**

The mean is the weaker number and is reported anyway, because it is diluted by archetypes whose
*scripted* build order keeps their cadence high (turtle 31, aggressor 24) — those decades were never
starved. The starved-decade figure is the one that answers Pass 5 H3, and **it is a 2.4×**.

**Cost weight, so the added cadence is not free clicks.** The containing posture costs 0.0%–2.7% of
the decade's net income for every archetype-decade except one: mono-expander's y20–30, at **12.5%**,
which is an archetype whose income had already collapsed to ~$17M across the whole decade. In
absolute terms the posture is $2.16M against a $5.4M expected loss — the intended ~40% ratio, holding
even where the corporation is nearly dead.

### The constant the simulation changed

The first authoring pass set the Retrofit Order's exposure anchor at **30 installations**. §9b
measured the consequence immediately: **five of the eight archetypes** — industrialist (9 buildings),
turtle (8), aggressor (7), hoarder (6), joiner-y30 (4) — sat permanently at index 0.23–0.30, i.e.
*below* the 0.35 Advisory threshold, and therefore saw **no measure in force across fifty game-years**.
Those are exactly the archetypes whose dead decades Pass 5 ranked worst. The anchor was re-derived
from Pass 5's own measured distribution (50-year plateaus of 2–37 installations) to **20** — the top
of the observed range rather than above it. That single change moved the starved-decade lift from
×1.18 to ×2.42 and put the industrialist from *permanently Advisory* to *Elevated*, while still
leaving a genuinely tiny 6-building corporation exempt.

This is recorded because it is the honest provenance of that number: **it was produced by the
simulation, not merely rubber-stamped by it** — the same discipline E3.4 recorded for the colony
demand floors, and the direct application of Pass 5's standing warning that *"Pass 5's worked
recommendation (6 days) was measurably insufficient; this is exactly why the pass bar says sim
first."*

### The honest gap §9b exposed and did not close

**5 of the 15 starved decades remain unserved**, and one archetype-decade (joiner-y30, y40–50) stays
at literally zero. Those are corporations with 4–6 installations. A systemic emergency *should not*
reach them — a 4-building corporation is not systemically exposed, and manufacturing a crisis for it
would be exactly the fabrication this program forbids. **Pressure is not the answer for a tiny
portfolio; a reason to build is.** That is `R1-E6` (mid-band construction rungs, $2–8B capex tied to
new geography), which Pass 5 prescribed, Pass 7 explicitly preserved, and Round 1 deferred. Round 2's
measurement is now a second, independent argument for it, and it is the strongest candidate to
headline Round 3.

---

## 2g. What shipped

### SCHEMA CHANGE — `prisma db push` REQUIRED

**Two new tables** at the end of `prisma/schema.prisma`. **Nothing in this wave works until they are
pushed**, and everything degrades honestly until then: `server-crises.ts::isCrisisSchemaAvailable`
probes once per 5 minutes (the `server-chair.ts` / `server-equity.ts` pattern), the sync route's
`crisis` field stays `null`, the panel renders an honest inert state, no situation ever opens, and the
insurance premium multiplier is literal `1`.

| Table | Purpose |
|---|---|
| `SystemicCrisisCycle` | One row per 8-week cycle. `cycleIndex` is the primary key. Holds the **measured, frozen** world index (value, raw numerator, anchor, channel), the assessment target, the Chair's relief directive, and the sealed containment fraction |
| `SystemicCrisisPledge` | One pledge per corporation per cycle. `@@unique([cycleIndex, profileId])` |

Profile ids are stored **without relations or cascades**, matching `PublishedCorpReport`,
`CorpEraRecord` and the `AccordChair*` family: the emergency register is permanent public history and
must survive a profile deletion rather than vanish from the record.

### Save-format note (flagged prominently, as instructed)

**No save migration. No `GameState.version` bump. Three optional fields.**

- `systemicCrisis?: CrisisSnapshot | null` — **server-authoritative, read-only**, null-until-sync.
  Exactly the `accordChair` (E1) / `equity` (M6) / `demandPools` (E4) pattern. The client never
  writes it.
- `crisisSituation?: CorporateSituation | null` and `crisisHistory?: CrisisRecord[]` — client-owned
  save state with the same shape and lifecycle `storyChapters` has. `save-load.ts` is **untouched**;
  `advanceSystemicCrisis` creates both lazily on the first tick that needs them, and a pre-Round-2
  save simply has `undefined` in all three.

### Files

**New**

- `src/lib/game/systemic-crises.ts` — the pure rule-set (calendar, catalogue, exposure, severity,
  situation advance, postures, assessment math, aftermath, snapshot clamp).
- `src/lib/game/server-crises.ts` — Prisma glue (schema probe, the five telemetry measurements, cycle
  rows, pledges, the relief directive, sealing, snapshot assembly).
- `src/app/api/space-tycoon/crisis/route.ts` — GET + two POST actions (`pledge`, `set_relief`).
- `src/app/api/space-tycoon/crisis/resolve/route.ts` — the sealer cron.
- `src/components/game/SystemicCrisisPanel.tsx` — the surface.
- `src/lib/game/__tests__/systemic-crises.test.ts` — 78 tests.

**Modified**

- `prisma/schema.prisma` — two tables (**db push required**).
- `src/lib/game/types.ts` — three optional fields (above).
- `src/lib/game/economic-sinks.ts` — the crisis premium loading inside `getMonthlyInsurancePremium`.
- `src/lib/game/market-events.ts` — crisis dislocations on the existing active + forecast schedules.
- `src/lib/game/game-engine.ts` — step 1d, `advanceSystemicCrisis` in `processFullTick`.
- `src/lib/game/server-effects.ts`, `src/hooks/useGameSync.ts`,
  `src/app/api/space-tycoon/sync/route.ts` — the snapshot hop.
- `src/lib/game/server-ledger.ts` — one burned reason (`crisis_assessment_burn`).
- `src/lib/game/world-calendar.ts` — the `systemic_crisis` category and four appointment kinds.
- `src/lib/game/situation-log.ts` — three crisis items + a `reports:emergency` deep-link.
- `src/components/game/ReportsPanel.tsx` — the fifth sub-view + the deep-link consumer.
- `src/components/game/LegacyHallPanel.tsx` — the **Emergencies weathered** ledger.
- `src/components/game/SituationLog.tsx` — category label + frame.
- `src/lib/game/icons.tsx`, `src/lib/game/concepts.ts` — one glyph, three glossary entries.
- `src/lib/cron-scheduler.ts`, `src/middleware.ts` — the sealer cron + its CSRF allowlist entry.
- `src/app/space-tycoon/page.tsx` — the posture-commit hop.
- `scripts/sim-50yr.ts` — the §9b probe plus three inert per-decade accumulators.

### Folded in: the tab-navigation guard (standing FTUE follow-up, coordinator-requested)

Carried in this wave because Round 2 already owned `space-tycoon/page.tsx`. **The defect:** navigation
ran through a raw `useState` setter with **23 call sites**, exactly **one** of which checked whether
the destination was corporation-tier unlocked. Every other path could render a panel with no matching
entry in the tab bar — a render hole outside the staged-unlock design, with no lit tab to leave by.
Recent waves had only added routing surfaces (the sub-view request bus, map radial verbs, Legacy Hall
deep-links, and Round 2's own crisis rows), so the call-site count was growing.

**The fix is structural, in three parts, so a future caller cannot reintroduce it:**

1. **`src/lib/game/tab-access.ts`** (new) holds the decision as pure functions — `getUnlockedTabIds`,
   `isTabUnlocked`, `resolveTabNavigation` — so it is unit-testable without mounting the page, which
   is precisely what made the previous ad-hoc guard un-regressible.
2. **Legacy-alias resolution moved in with the lock check.** `LEGACY_TAB_MAP` / `resolveLegacyTab`
   were in `page.tsx`, one line away from the guard, which is the order-of-operations trap: resolve
   the alias, forget to re-check, sail through. `resolveTabNavigation` now resolves *inside* the
   check, and a test asserts a legacy alias whose target is locked is still refused.
3. **The raw setter is renamed `setTabUnsafe` and called exactly once**, inside `navigateToTab`. Any
   future caller writing `setTab(...)` now gets a **compile error**; writing `setTabUnsafe(...)` is a
   deliberate, greppable act. All 23 call sites route through the guard, the 12 redundant outer
   `resolveLegacyTab(...)` wrappers are gone, and the single ad-hoc guard in the tutorial deck was
   deleted rather than duplicated.

**Refusal is a no-op, not a redirect.** A deep-link into a surface this corporation has not unlocked
quietly does nothing rather than yanking the player out of what they were reading — the same
behaviour the ad-hoc guard had, so no shipped path changes meaning. And an *empty* unlock set (state
not loaded yet) reads as "no gating information" and does not gate, so the boot path — which
navigates to the initial tab before the first render that could compute the set — is untouched.

**Regression coverage:** `src/lib/game/__tests__/tab-access.test.ts`, 17 tests. The headline block
asserts a tier-locked tab is refused for five deep gates; two further tests are *structural* — they
read `page.tsx` from disk and fail if `setTab(` ever reappears or if `setTabUnsafe` is called more
than once. A value-only test would not have caught the original defect (the guard was *missing*, not
wrong), which is the same reasoning E3.2 used for the `accrueLegacyTrackers` writer guard.

### Where it lives, and why not the obvious alternatives

**Reports → Emergency**, a fifth sub-view alongside Situation Log / Mail / Quarterly / Legacy Hall.
**No 29th tab** (standing convention; and E4 already recorded that `TAB_CATALOG` holds 31 entries, so
the *spirit* — fold into hubs — is what is being followed).

- **A new tab** — rejected by standing convention and by Round 1's own rejected-ideas register.
- **Governance (Tier 4)** — too deep. The insurance loading and the price dislocations reach a
  corporation well before Tier 4, and a surface that explains a cost you are already paying must not
  be gated behind a tier you have not reached.
- **Dashboard (Tier 1)** — too shallow in the other direction: a Tier-1 corporation is inside the
  Frontier or the FTUE chain and is *exempt by design*, so the panel would render its inert state as
  a newcomer's first impression.
- **Reports (Tier 2)** is where the Situation Log already lives — the hub whose stated job is
  "everything that needs a decision" — and Tier 2 is roughly where the FTUE chain ends.

### Permanence — the aftermath is written down

Round 1's requirement: *a crisis the world forgets is a cutscene; one that writes into the permanent
record is history.* Three ledgers:

1. **`GameState.crisisHistory`** — a bounded per-corporation record (emergency, severity, posture,
   outcome, pledge, world containment), written once per cycle in the aftermath week.
2. **The Legacy Hall's "Emergencies weathered" block** — emergencies on record, contained vs
   realized, total pledged, and the full table. Deliberately a **pure display lens over
   `crisisHistory`**, so E4's licence to ship the Hall without a sim run (zero economy math anywhere
   in the Hall) is preserved intact.
3. **`SystemicCrisisCycle`** — the sealed public register: the measured world index, the containment
   fraction, the directed relief, the pledge count. Surfaced in-game on the panel's "The register"
   table.

### Accessibility

- **Meters** are real `role="progressbar"` elements with `aria-valuenow/min/max` and a label that
  repeats the same numbers, and **every bar's value is also printed in visible text beside it** — no
  meter is the sole carrier of its own value.
- **Never colour alone.** Severity is always the *word* (Advisory/Elevated/Severe/Systemic); the
  ladder chips carry `medal` vs `medal-outline` (shape-distinct, the V1 convention); posture state
  reads "Current"; subscription reads a percentage and "met"/"short"; the crisis Situation Log frame
  is category identity only, with urgency carried by the row's severity tone and its ordering.
- **Keyboard.** Every action is a real `<button>` or a labelled `<input>`; the posture group is a
  labelled `role="group"`; targets are ≥38px.
- **Tables** (the pledge roll, the register, the Hall ledger) are real `<table>`s with `sr-only`
  captions, scoped headers and an `overflow-x-auto` container — the wide-content rule.
- **Reduced motion.** No bespoke animation is introduced; the only transitions are the existing
  chrome's, already covered by the global `prefers-reduced-motion` block.
- **375px.** Every grid starts `grid-cols-1`; every row is `flex-wrap`; the register and pledge roll
  scroll inside themselves rather than pushing the page wide.
- **Chrome.** `ConsolePanel` / `HoloCard` / `DataChip` / `StatReadout` / `Figure` / `GameIcon` /
  `HoloTip`, one new `cal-systemic-crisis` glyph (a hazard triangle over a progress bar —
  silhouette-distinct from every other calendar glyph), three new glossary concepts, and
  `LeaderPortraitFrame` carrying Secretary-General **Anatole Priest**, who has no portrait in the art
  roster and therefore renders the monogram plate. Inventing a portrait would be fabricating content.

---

## 2h. What implementing this found (all verified against code)

1. **`advanceSystemicCrisis`'s first identity check was wrong, and the test caught it.** Comparing
   `history !== (state.crisisHistory ?? [])` allocates a fresh array on the right-hand side every
   call, so a quiet tick reported a change and handed the engine a new `GameState` for nothing. The
   fix compares against the original reference. Worth knowing generally: **`?? []` is not a safe
   identity sentinel**, and the same shape is easy to write in any tick-path module.
2. **`isInFrontier` is wealth-capped, so a "Frontier" test fixture must be poor.** The first
   newcomer-safety fixture carried the suite's default $5B and `isInFrontier` correctly returned
   `false` (the $500M `FRONTIER_HARD_CAP_NET_WORTH`), which made the shield test pass vacuously in
   the wrong direction. Both fixtures now assert `isInFrontier(...) === true` before testing the
   exemption. Any future wave writing a Frontier test needs the same guard.
3. **`economic-sinks.ts` and any crisis module are one import away from a cycle.** `economic-sinks`
   must import the premium multiplier; `systemic-crises` therefore cannot import
   `computeInsuredAssetValue`. It recomputes the identical arithmetic as `crisisOperationalCapital`,
   and a **drift test asserts the two agree on arbitrary states** — the same discipline E3.3
   introduced for mega-project bonus consumers, and the only thing that makes the duplication
   acceptable.
4. **`BuildingCategory` has no `'mining'` or `'extraction'` member** — the mining category is
   `mining_enterprise`. TypeScript caught it, but a string-keyed lookup would not have.
5. **`concepts.test.ts` enforces a ≤5-sentence ceiling on every glossary body.** Three entries had to
   be tightened. Worth knowing before writing glossary copy.
6. **`AccordChairTerm`'s winner column is `chairProfileId`, not `winnerProfileId`.** The Chair check
   in the crisis route reads it directly from the table rather than trusting a client claim.
7. **The Situation Log's `subView` token needs a consumer on the target hub.** `ReportsPanel` had
   none; it now consumes `reports:emergency` with the same one-shot pattern `MarketHubPanel` and
   `WorkforcePanel` use. Any earlier `tab: 'reports'` row that wanted a sub-view was silently landing
   on the hub default.
8. **The relief consequence reaches only corporations the emergency *reached*.** A corporation that
   is Frontier-protected, mid-FTUE, or at Advisory severity has no situation, and therefore takes
   neither the aftermath's upside nor its shortfall. That is the correct and safest reading — a
   world-shared *malus* landing on a Protected Frontier corporation would violate the newcomer bar —
   and every copy string in the game was corrected from "everyone on the board" to "every corporation
   the emergency reached" once the code made the distinction explicit.

---

## 2i. Designed, not built — with reasons (so Round 3 does not re-propose them)

- **Crisis legacy milestones.** The natural next step ("weathered N emergencies", "top-decile
  pledger", "contained a Systemic emergency uninsured") and deliberately *not* shipped: legacy
  milestones feed `getLegacyBonuses`, which the tick reads every game-month and applies at five
  sites. Adding them is an economy-math change requiring its own harness pass, and doing it inside
  this wave would have forfeited the Legacy Hall's standing licence to be display-only. The
  `crisisHistory` record they would read is already shipped and shaped for them.
- **Hazard severity escalation during a crisis.** Considered and dropped. `rollHazardOccurrence` is
  shared-world weather — a pure function of `(monthIndex, locationId, type)` by explicit design, so
  only the per-player *mitigation* channel may legitimately vary (the rule E3.6 established for
  faction licences). Making severity crisis-dependent would either break that or require a server
  snapshot on the hazard roll. It is also entirely outside sim coverage.
- **A crisis that closes orbital slots.** The physically obvious Cascade consequence, and
  population-gated dead on arrival: Pass 8 measured GEO occupancy at 2–3 of 180 slots against a 153
  trigger and concluded *"population-gated, not price-gated… No pricing change can revive them."*
- **Crisis severity reaching the price channel.** Explicitly rejected in §2c: it would let a stale
  snapshot show a different price from the one the server charges. The crisis price channel carries
  crisis *identity* only, which is pure.
- **A public chronicle page for the emergency register.** `SystemicCrisisCycle` already stores
  everything such a page would render and the in-game register is public, but no chronicle or public
  page was touched this wave. It is a read-only page section whenever that surface is free.
- **Feeding crisis outcomes into `realignment.ts`'s epoch aggregate.** Same reason E1 deferred the
  Chair: `realignment.ts` is pure and DB-free by design, and `world-calendar.ts`,
  `delivery-contracts.ts` and the market/trade route all depend on being able to call it from either
  side with no plumbing. It wants a cached epoch-aggregate row, which is a feature.
- **Shortening the cycle or adding stages to raise cadence further.** Measured and rejected: five
  stages over four weeks lands the posture decision on the *weekly* loop, which is the loop
  `SESSION_DESIGN.md` leaves thinnest. More stages would push it toward daily, which CLAUDE.md
  explicitly warns against ("don't collapse the tempo"), and §9b shows the remaining gap is not a
  cadence problem at all — it is small portfolios that a systemic emergency correctly cannot reach.
- **`docs/SESSION_DESIGN.md` re-audit.** Deferred for the third consecutive wave (E3 and E1 both
  parked it). Round 2 adds a third piece of evidence for it: the weekly corporate loop it describes
  as served by "seasons, leagues and alliance rotations" is now also occupied by the crisis posture
  stage, and the senate's "quarterly" entry remains an ~18-hour loop misfiled as quarterly. It should
  be rewritten once, recording E3 + E4 + E1 + Round 2 together.

---

## 2j. Round 2's addition to the rejected-ideas register (Part 2)

| Idea | Why rejected |
|---|---|
| **A crisis that targets the peril you are biggest in** (the naive reading of Stellaris's scale-to-player-power) | Turns success into punishment. The shipped split — rotating *identity*, measured *bite* — is the risk-model version and is more realistic besides: insurers do not choose the peril, they price your exposure to it. |
| **Making crisis severity a secret** | The same reasoning M4 applied to market events: secrecy just hands the edge to whoever reads the source. The world index is published at forecast, frozen for the cycle, and shown beside its raw numerator and anchor so a player can audit the scaling from inside the game. |
| **Paid crisis mitigation of any kind** | Pay-to-win (`POLICY.md`). Already in the register from Round 1; Round 2 restates it because a pooled emergency fund is precisely where a "just let them buy protection" proposal will surface. A pledge buys a bounded mitigation on your *own* bar that a proportionally-scaled small pledge buys identically. |
| **Escrowing the assessment pool instead of burning it** | An escrow that can be withdrawn turns a commons problem into a free option, and a refundable pledge that still grants mitigation is a pure exploit. The pool is a money sink, which is also what `BALANCE.md`'s sinks-first discipline wants. |
| **Letting the Chair re-allocate the relief after watching the pool fill** | The directive is the Chair's *commitment*; corporations decide whether to pledge on the strength of it. Revisable direction makes the pledge decision uninformed. One directive, committed early, public. |
| **Suppressing crises entirely for fresh graduates** | Would manufacture a day-15 cliff — the exact defect Pass 5 C1 found and Pass 6 fixed with a 14-day linear glide. The crisis rate uses the same glide instead. |
