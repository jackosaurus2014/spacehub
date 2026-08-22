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
| 1 | **End-game design** — what carries a committed player from year 10 to year 50 | Design complete; **wave E3 (plumbing repair) implemented 2026-08-21** — see "E3 implementation" at the end of this document. E4 (Legacy Hall) and E1 (Accord Chair) still pending. |
| 2+ | (to be assigned — candidates: mid-game decision density; interface/screens; onboarding-to-mastery progression; the intelligence layer as gameplay) | Not started |

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
