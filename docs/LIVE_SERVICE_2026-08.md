# Space Tycoon — Live-Service Retention Plan (Months-Scale Play)

**Date:** 2026-08-14 · **Author:** lead game design
**Founder mandate:** *"make a few more passes at making our game more in-depth and with a lengthy play time over months for users of our site, much like a live service MMO space strategy game."*

**Scope of this document:** (1) a retention-gap audit against live-service space-strategy benchmarks (EVE Online, OGame/Ikariam-class browser MMOs, Stellaris multiplayer campaigns), scored per return-horizon: tomorrow / next week / next month / in 3 months; (2) an honest assessment of what the simulation does while a player is away, and the mechanic that fixes it; (3) nine implementation waves (LS1–LS9), ordered so months-scale commitment and weekly appointment cadence land first. No code was changed for this document.

**Ground truth used:** CLAUDE.md Space Tycoon principles (time loops, economic PvP, no combat, no P2W, NPC backdrop, interstellar end-game); `docs/SESSION_DESIGN.md` (loop map, audit rules); `docs/4X_BASELINE_2026-08.md` (all 14 waves landed — this doc is its sequel and follows its format); `docs/{STATS_DESIGN,NPC_BACKDROP,BALANCE,LORE}.md`; engine inventory of `src/lib/game/` (95 modules incl. post-4X `accord-senate.ts`, `science-missions.ts`, `narrative-events.ts`, `cargo-logistics.ts`, `corporate-doctrine.ts`); `src/components/game/` (80 components, 28 tabs); tycoon crons in `src/lib/cron-scheduler.ts:167-190`; `src/app/api/space-tycoon/` (30 route groups incl. `sync`, `game-state`, server ledger).

---

# PART 1 — RETENTION GAP AUDIT

## 1.0 Framing — what the benchmarks actually do

| Benchmark | The retention trick, distilled |
|---|---|
| **EVE Online** | The **skill queue**: progression continues 24/7 whether you log in or not, and you must return periodically to *re-point* it. Corp projects create social obligation ("the corp needs 40M tritanium by Sunday"). Economic seasons (patch cycles, resource redistributions) reshuffle the meta on a months cadence. |
| **OGame / Ikariam class** | **Long real-time build timers** (hours → days → weeks at high tiers) that the player sets in motion and returns to. The queue *is* the game. Fleet-save and overnight-return timing create appointment behavior at real-world times. |
| **Stellaris MP campaigns** | **Scheduled sessions**: the campaign advances only at appointed times; between sessions players plan. Mid-game and end-game crises are calendar events everyone anticipates together. |
| **Common pillars** | Long-horizon commitments · appointment mechanics at real-world times · seasonal/episodic arcs with beginnings and ends · legacy/prestige persisting across seasons · social obligations (people depending on you) · catch-up for returners · a **visible content calendar**. |

Space Tycoon post-4X is content-dense (272 techs, 44 events/12 chains, 12 science missions, senate, expeditions, 11 victories) but its retention architecture is **session-dense, not calendar-dense**: almost everything is *available whenever you show up* rather than *happening at a time you plan around*, and almost nothing the player sets in motion takes longer than ~24 hours of real time to mature (Tier-5 research ≈ 24 h; expedition/science-mission phases are the only true multi-day/week commitments).

## 1.1 Horizon (a) — why come back TOMORROW?

**Serving it today:** daily contract refresh (`GameState.lastContractRefresh`), daily bonus (`daily-bonus.ts` + modal), 8-hour commander pool (`commanders.ts`), daily challenges inside seasons, tier-2/3 builds and research completing overnight, daily crons (zone influence 01:00, seasons 06:00, market restock hourly). **Grade: B.** The daily loop is the game's best-served loop (SESSION_DESIGN agrees).

**Failing it:**
- **The overnight cap punishes sleep + work.** `offline-income.ts` caps away-earnings at **8 hours** (`MAX_OFFLINE_HOURS = 8`). A player who checks in at 8am and returns at 10pm lost 6 hours of yield with no counterplay. EVE never stops your skill queue; OGame never stops your mines. There is **no way to invest in better away-time performance** — no automation infrastructure, no standing directives, no economic decision attached to absence.
- **Nothing to *set in motion* at session end.** One active research (two with `parallel_research`), builds run in parallel slots (`construction-slots.ts`) but there is **no pending queue** — when a build or research finishes at 2am, the slot idles until the player returns. No chained orders, no "then do this next."
- **No morning debrief.** Returning players get one toast ("You were away 9h, earned $X") — hazards rolled, senate measures resolved, market moves, and alliance progress that happened overnight are scattered across panels, not digested.

**Missing mechanics:** order queues (build/research/ship chains), standing directives, away-yield the player can invest in, an operations debrief.

## 1.2 Horizon (b) — why come back NEXT WEEK?

**Serving it today:** league week processing (cron Mon 00:05), alliance sprint events (5-day, `alliance-events.ts`), weekly rotating challenges (`weekly-events.ts`), season-pass weekly arc within 28-day seasons, prediction exchange generate/resolve crons, Accord senate lobbying windows.

**Failing it:**
- **No appointment mechanics.** Nothing in the game happens at a *published real-world time* the player circles on a calendar. League resolution happens silently in a cron; there is no "standings lock Sunday 20:00 UTC — final pushes now." The real-world Sol Events feed (`real-world-feed.ts`) already surfaces genuinely scheduled real launches/storms but grants only ambient flavor multipliers — the one authentic appointment asset the game owns is under-leveraged.
- **Weak social obligation.** Alliances share treasury/research/projects, but no member ever *owes* the alliance anything by a deadline. Nobody notices if you skip a week. EVE corp projects and WoW raid nights work because absence is visible.
- **No visible calendar.** The player cannot see "what's happening this week / next week" anywhere. Seasons, senate dockets, alliance events, NPC co-fund windows, and real launches each live in their own panel with no unified forward view.

**Missing mechanics:** a content calendar surface; fixed-time weekly world events with countdowns; alliance pledges (commitments with deadlines that members can see each other meet or miss).

## 1.3 Horizon (c) — why come back NEXT MONTH?

**Serving it today:** quarterly corporate reports (`quarterly-reports.ts` — 3 game-months ≈ 18 real hours per quarter at the 6h/game-month clock, so effectively sub-weekly; mis-labeled "monthly loop"), Accord senate quarterly docket, science-mission ops phases (weeks), megaprojects/megastructures, corporation tier climb, 28-day season pass.

**Failing it:**
- **No episodic content arc.** Seasons are *modes* (fresh-start sandboxes with brackets), not *stories*. Nothing has a beginning, middle, finale, and aftermath that the whole server experiences together on the calendar. The 44-event narrative layer triggers per-player off their own state, so no two players are ever "in the same chapter."
- **Multi-week commitments exist but are passive.** Expeditions and science missions are the only true weeks-long arcs, and both resolve via deterministic catch-up — good — but the player makes zero decisions mid-arc unless logged in for a phase gate. There is no mid-commitment check-in the player *wants* to make.
- **Two clocks blur the monthly loop.** World-shared systems key off `server-time.ts` (global calendar, 1 game month = 6 real hours) while quarterly reports and per-player periodics key off `state.gameDate` (advances only while ticking). A lapsed player's "quarter" stretches to months of real time; an active player's quarter is 18 hours. **Nothing in the game currently matures on a ~30-real-day cadence** — the loop CLAUDE.md calls "the strategic horizon" is served by neither clock.

**Missing mechanics:** calendar-dated episodic arcs; real-30-day maturation cycles; mid-commitment decision points.

## 1.4 Horizon (d) — why come back IN 3 MONTHS?

**Serving it today:** legacy system (40 milestones + 6 stretch, permanent, no resets), victory conditions, interstellar expeditions (longest arcs in the game), heritage NPC registry, public leaderboard/corp pages.

**Failing it:**
- **No prestige that cycles.** Legacy accumulates monotonically — there is nothing seasonal to *place* in, archive, and start fresh on. Seasonal-event brackets exist but grant no permanent, displayable, cross-season record ("Season 3 Titan-bracket champion" appears nowhere in month 4).
- **No corporate eras.** SESSION_DESIGN flags this exact gap ("no campaign-scale milestones pre-interstellar"); the 4X pass added board politics but not generational beats. A 3-month veteran's corporation has no *chapters* — no named eras, no chronicle a new player can read (CLAUDE.md: "player corporations write their own chapter").
- **No faction realignment.** Planned quarterly in SESSION_DESIGN's table, never built. The world's political landscape in month 4 is identical to month 1 — a returning veteran finds nothing *changed*.
- **Returning-lapsed-player flow doesn't exist.** `catchup-mechanics.ts` targets **new** late joiners (pioneer bonus, knowledge diffusion, newcomer shield); a *veteran returning after 6 weeks* gets an 8-hour income toast and 28 tabs of unexplained changes. The mentorship system in that same file is **dead code** — exported functions, zero call sites in the game.
- **No content roadmap.** Live-service players stay subscribed to games whose futures they can see. We ship waves constantly and tell players nothing.

**Missing mechanics:** seasonal prestige archive; corporate eras; quarterly world realignment; lapsed-veteran re-onboarding; public roadmap/changelog surface.

## 1.5 Pillar scorecard

| Live-service pillar | State | Evidence |
|---|---|---|
| Long-horizon commitments set in motion | 🟡 PARTIAL | Expeditions/science missions yes; build/research capped ~24 h, no queues |
| Appointment mechanics (real-world times) | 🔴 ABSENT | Crons resolve silently; Sol Events feed is flavor-only |
| Seasonal/episodic arcs with start & finale | 🔴 ABSENT | Seasons are brackets/modes, not stories |
| Legacy/prestige across seasons | 🟡 PARTIAL | Legacy permanent but never cycles; no season archive |
| Social obligations (corp mates depend on you) | 🟡 PARTIAL | Shared alliance resources, zero member commitments |
| Catch-up for returning/new players | 🟡 PARTIAL | New-joiner suite strong; lapsed-veteran flow absent; mentorship dead code |
| Visible content calendar | 🔴 ABSENT | No unified forward view anywhere in the UI |
| Progression while away | 🔴 WEAK | See Part 2 |

---

# PART 2 — OFFLINE-PROGRESSION HONESTY

## 2.1 What actually happens during a week away (today)

The sim is a **client-authoritative solo tick** (2 s/tick at 1× — `offline-income.ts:19`) with server authority only for multiplayer surfaces (order book, ledger, milestones, alliances, senate-adjacent world seeds). When a player closes the tab for 7 days:

| System | Away behavior | Verdict |
|---|---|---|
| Service revenue / mining | `calculateOfflineIncome()` — **capped at 8 h** of ticks, net-clamped ≥ 0 (`Math.max(0, netPerTick)` — you cannot *lose* money away, also dishonest in the other direction) | 🔴 Freezes after 8 h |
| Building / research in progress | Wall-clock timestamps (`startedAtMs + durationSeconds`) — **complete correctly** on return, then slots idle | 🟡 Finishes, never chains |
| Expeditions / science missions | Deterministic per-month catch-up rolls, 20,000-month safety valve (`expeditions.ts:210`), seeded hazards — **fully honest** | 🟢 The model to generalize |
| Per-player game clock (`state.gameDate`) | Frozen — no ticks, no months advance, no quarterly reports, no per-player periodic events | 🔴 Frozen |
| World clock / world-shared systems | Advance on wall clock (senate dockets, market mean-reversion cron, NPC programs, league weeks) — the world moves on **without** the player | 🟢 by design |
| Contracts / daily challenges / season points | Expire / missed / unearned | 🟡 acceptable (they're the *reason* to return) — but currently invisible on return |
| Market resting orders (server order book) | Can fill server-side | 🟢 |
| Ships | Arrive per wall-clock ETA, then idle; cargo sits | 🟡 |

**Net:** away-time is ~honest for the world and ~frozen for the player's own economy after hour 8. A week-long absence costs ~95% of potential yield with no counterplay, and the return moment — the single highest-leverage retention beat in any live-service game — is a one-line toast.

## 2.2 The specified mechanic — "Night Shift" (standing operations)

Design goal: away-time becomes **a planning decision, not a penalty**, without idle-game money printing (BALANCE.md: revenue sublinear, sinks everywhere).

1. **Command queues (the OGame/EVE core).** `GameState.commandQueue`: an ordered list of typed orders — `research` (next N techs), `build` (building + location), `ship_dispatch` (route or repeating loop), `craft`, `service_activate`. On tick *and* on return catch-up, when a slot frees, the engine pops the next affordable order and starts it at its normal cost/duration. Queue depth: **4 free**, +2 from `parallel_research`-style ops techs, +2 at corp Tier 5 (CLAUDE.md explicitly allows paid queue slots "beyond a reasonable free cap" as convenience-monetization *later*; out of scope now — everything free).
2. **Standing directives** (`GameState.standingDirectives`): persistent policies evaluated during catch-up on the same deterministic per-game-month grid expeditions use — `auto_renew_contract` (re-accept matching delivery contracts if resources on hand), `auto_sell` (sell commodity X above price Y via resting server orders — already server-honest), `auto_restock` (buy below Y up to cap), `ship_loop` (mine→haul→repeat with Δv-priced fuel via `cargo-logistics.ts`), `maintenance_reserve` (hold $N liquid). Each directive has an **ops overhead cost** (flat monthly fee per active directive, scaling with directive count — a real sink) so full automation is a priced choice, not a default.
3. **Away yield restructured: uncapped time, capped *rate*.** Replace the 8-hour wall with an **efficiency curve**: hours 0–12 at 100%, 12–48 at 70%, 48 h–7 d at 40%, beyond 7 d at 15% floor (numbers to be balance-tested; keep net-clamp ≥ 0 removed — maintenance/payroll accrue truthfully, but hazard *destruction* never fires while away without a queued forecast the player saw — hazards remain forecastable-risk, CLAUDE.md). The curve's tiers are **raised by investment**: automation techs (`ops_automation` repeatables already exist post-W10), `predictive_maintenance`/`digital_twin` research, operators workforce share, and a new `autonomous_ops_center` building. Meaningful economic decision: spend to make absence cheaper. Sublinear, capped at 85% steady-state — being present is always better (MMO invariant: never make logging in pointless).
4. **Per-player clock advances during catch-up.** Catch-up processes elapsed wall time through the normal monthly grid (bounded by the expedition safety-valve pattern), so `state.gameDate`, quarterly reports, board directives, and narrative situations advance for returners instead of freezing. This single change re-anchors the monthly loop to real time for everyone.
5. **The Operations Debrief** (return moment, LS2): full-screen cinematic digest replacing the toast — earnings curve, completed queue items, directives executed, hazards weathered, senate results, alliance/league deltas, what's on the calendar next. The debrief is the retention beat: it must end with **three one-tap recommended actions**.

Honesty rule: all catch-up math uses the deterministic seeded-month convention (`mulberry32(hashStringToSeed(...))` per `expeditions.ts`/`hazards.ts`/`science-missions.ts`) — replayable, exploit-resistant, and identical whether processed live or on return. No new `Math.random` anywhere.

---

# PART 3 — EXECUTION WAVES

Each wave = one agent-sized workstream, 4X-baseline format. Risk classes: **ENGINE** (tick/catch-up/save), **CONTENT** (data/defs), **UI**, **SERVER** (Prisma/crons/routes). All waves: local `npx next build` gate; save migrations additive (next slot V24+); **new cron routes need the CSRF middleware exemption** (known gotcha — mutations without Origin headers get blocked; see `src/middleware.ts` allowlist pattern used by existing tycoon crons).

## Wave table (dependency order)

| # | Wave | Loop served | Class | Effort | Depends | Player-facing outcome |
|---|---|---|---|---|---|---|
| **LS1** | **Night Shift — command queues, standing directives, honest away yield** | Daily (enables all) | ENGINE | **L** | — | "I plan my empire's night before I log off; it worked while I slept" |
| **LS2** | **Operations Debrief + lapsed-veteran re-onboarding + live mentorship** | Daily / Campaign | ENGINE+UI | **M** | LS1 | Returning after a night — or 2 months — opens with a cinematic debrief and a guided path back in |
| **LS3** | **Mission Calendar — unified schedule + real-time appointment events** | **Weekly (appointment)** | SERVER+UI | **M** | — (LS1 synergy) | One calendar tab shows everything coming: league lock Sunday 20:00 UTC, senate docket close, alliance event start, co-fund windows, real SpaceX launch windows with in-game bonuses |
| **LS4** | **Corporate Eras — 90-day chartered epochs + era chronicle** | **Campaign (months)** | ENGINE+CONTENT | **M–L** | LS1 (clock fix) | Your corporation lives in named eras with chosen mandates; finished eras become permanent public history |
| **LS5** | **Alliance Charters — pledges, shared season goals, NPC co-funding via ledger** | Weekly (social) | SERVER | **L** | LS3 | Your alliance signs a season charter; your pledged share is visible to corp-mates; alliances co-fund NPC flagship programs through the real ledger |
| **LS6** | **Programs Queue — crew training & leader development (the EVE skill queue)** | Campaign | ENGINE+CONTENT | **M** | LS1 | Months-long training programs tick on the wall clock; you return to re-point them |
| **LS7** | **Season Chronicle — economic seasons, prestige archive, cross-season titles** | Monthly | ENGINE+SERVER | **M** | LS3 | Every 28-day season ends with placements archived forever; announced commodity super-cycles reshape each season's economy |
| **LS8** | **Story Chapters — calendar-dated episodic narrative arcs with finales** | Monthly/Campaign | CONTENT+ENGINE(S) | **M** | LS3, LS4 | 6-week world-shared story arcs (Act I → finale weekend) built from the W4 chain engine |
| **LS9** | **The Realignment — quarterly faction/world epoch shifts + public roadmap** | Quarterly | ENGINE+CONTENT | **M** | LS5, LS7 | Every ~90 real days the political-economic map visibly changes; players see the next epoch coming |

Impact-ranked if forced to serialize: **LS1 → LS3 → LS4 → LS5 → LS2 → LS7 → LS6 → LS8 → LS9.** LS1+LS3 are the two structural fixes (away-time honesty + appointment cadence); LS4+LS5 create the months-scale and social commitments; everything after is compounding cadence content.

---

## LS1 — Night Shift (command queues, standing directives, honest away yield)

**Player outcome:** the end-of-session ritual becomes "set the night shift": queue the next three researches, chain two builds, put a hauler on a loop, set a sell threshold — then leave, knowing the empire runs (at a priced, sublinear efficiency) until you return.

**Loop:** Daily primary; unlocks Campaign texture everywhere (all later waves assume the clock fix).

**Mechanics:** exactly §2.2 items 1–4. Additional specifics:
- Queue orders validate *at execution time* (affordability, prerequisites, slot free); blocked orders skip with a debrief line, never silently vanish.
- Ship loops price every leg through `cargo-logistics.ts` Δv/fuel — automation never dodges logistics cost (CLAUDE.md: logistics cost money).
- Directive ops-fee: `250K × activeDirectiveCount^1.3`/game-month (BALANCE-style superlinear; mitigated by ops research and operator workforce — every sink needs counterplay).
- Away-efficiency curve constants in `constants.ts`, unit-tested against the live-tick path (the two must agree per `offline-income.ts:55`'s existing warning).
- Hazards during catch-up: only *forecast-visible* hazards (the `forecastSevereHazards` horizon the player could see at logout) may damage while away; unforecast rolls defer to first live tick. Away destruction without warning would violate "forecastable risk."

**Systems touched:** `src/lib/game/types.ts` (`commandQueue`, `standingDirectives`, `awayLedger`), `game-engine.ts` (catch-up path generalizing the `expeditions.ts` monthly-grid pattern; queue-pop on slot-free), `offline-income.ts` (replaced by `away-operations.ts`; keep file as deprecated shim or delete with call-site sweep), `constants.ts`, `construction-slots.ts` (pending-queue awareness), `save-load.ts` (migration V24), UI: extend `OrderQueueHUD.tsx` (exists) + queue controls in `BuildPanel.tsx`/research panel/`FleetPanel.tsx`, new `StandingOrdersPanel` under the Operations/Fleet tab (29th tab NOT added — lives inside existing tabs; 28 is enough).

**Schema:** none server-side (queues are client-state, save-persisted; auto-sell uses existing server resting orders). Tests: queue execution order, catch-up parity live-vs-return, efficiency-curve boundaries, directive fees.

**Effort:** L. **Invariants:** economic decision ✓ (automation is priced); sinks ✓ (ops fees, fuel); no P2W ✓ (all slots free-earnable); corporate-scale ✓ (queues matter more at scale); interstellar ✓ (queues feed expedition prep); mobile ✓ (queue = list UI, tap-reorder); a11y ✓ (list semantics, no color-only state).

## LS2 — Operations Debrief + lapsed-veteran re-onboarding + live mentorship

**Player outcome:** every return opens with a debrief worth reading; a veteran returning after 6 weeks gets a guided "state of the world" re-onboarding (what changed in the game, what changed in *their* corp, 3 recommended actions) instead of 28 unexplained tabs; mentorship finally exists in the live game.

**Loop:** Daily (debrief) + Campaign (re-onboarding, mentorship).

**Mechanics:**
- Debrief generated from LS1's `awayLedger` + world deltas (senate results since logout via docket index, league/alliance deltas via existing APIs, market movers from price history). Tiered: >30 min away = compact; >3 days = full cinematic (reuse `CinematicOverlay.tsx`/`MilestoneVignette` pattern per 4X W5).
- Lapsed threshold ≥ 14 days: debrief adds a **Returning Commander** track — 7-day re-engagement objectives (one per loop: run a queue, join the current alliance event, lobby one senate measure...) paying a modest catch-up stipend + a temporary earnings boost reusing `getNewcomerMultiplier`'s shape (1.3× decaying over 14 days; sim-validate like the newcomer values were).
- **Mentorship goes live** (CLAUDE.md commitment; currently dead code): wire `calculateMentorshipRewards` from `catchup-mechanics.ts` through a server pairing (mentor opt-in registry, mentee = new or lapsed-returning player; bonuses applied via `server-effects.ts` snapshot queue like alliance bonuses). Mentor reward +≤5% revenue while active; mentee +≤20% — values already authored, never shipped.

**Systems touched:** new `src/lib/game/debrief.ts`; `away-operations.ts` (LS1); `catchup-mechanics.ts` (mentorship functions get call sites; pioneer-bonus fold-in housekeeping — 4X defect #7); UI: new `OperationsDebriefModal.tsx`, `ReturningTrack` widget on Dashboard; SERVER: `mentorship` Prisma model (pairId, mentorProfileId, menteeProfileId, startedAt, status) + `/api/space-tycoon/mentorship` routes + inclusion in `server-effects` payload.

**Effort:** M. **Invariants:** no P2W ✓; catch-up bounded so returning ≠ better than staying ✓; mobile ✓ (debrief is a scroll page); social fabric ✓.

## LS3 — Mission Calendar (unified schedule + real-time appointment events)

**Player outcome:** a Calendar surface (subtab of Dashboard + compact HUD strip) showing the next ~4 weeks: league week locks **Sunday 20:00 UTC** (with final-hour countdown), senate docket close date, alliance event start/end, seasonal-event phase transitions, NPC program co-fund windows (already deterministic and forecastable in `science-missions.ts:777+`), megaproject phase ETAs, *and the real-world Sol Events schedule* (upcoming launches from the `SpaceEvent` table — the same data `real-world-feed.ts` reads). Players plan their week around the game because the game finally publishes its week.

**Loop:** Weekly appointment — the audit's biggest structural absence.

**Mechanics:**
- **Everything dated derives deterministically** from the world clock and existing seeds (senate docket from quarter index, alliance rotation from week index, NPC windows from cycle math) — the calendar is a pure *view*, no new scheduling state, no drift risk.
- **Appointment world events (new content, 2/month):** fixed-UTC-window events announced ≥ 5 days ahead on the calendar — e.g. *Belt Rush Weekend* (48 h: +40% belt mining, belt hazard class +1 — risk priced in), *Accord Audit Day* (12 h: compliance costs waived, senate lobbying 2× effective), *Launch Congestion Window* tied to a real dense launch week from Sol Events (launch-dependent build costs +15%, launch services revenue +25%). World-shared, seeded off week index (`hashStringToSeed('world_apt_' + weekIndex)` convention). Participation is optional and economic — never a raid gate.
- **Real-launch bonus hours:** when a tracked real launch goes live (existing `livestream-detector.ts` signals), the in-game event grants a 3-hour world-shared launch-ops buff — watching real spaceflight and playing the game become the same appointment (site synergy: cross-link to the /live portal).
- League/senate/season resolution moments get **countdown states** in the calendar + a final-day HUD chip.

**Systems touched:** new `src/lib/game/world-calendar.ts` (pure derivation + appointment-event defs); `real-world-feed.ts` (export upcoming-launch schedule, not just active events); `server-effects.ts` or world-feed route (deliver appointment multipliers world-shared); UI: `MissionCalendarPanel.tsx`, HUD strip in `ResourceBar.tsx` area, countdown chips. SERVER: extend `/api/space-tycoon/world-feed` payload; no new cron (derivation) except optional notification dispatch.

**Schema:** none required (derivational). Optional: `WorldAppointmentLog` for post-hoc analytics.

**Effort:** M. **Invariants:** meaningful decisions ✓ (position inventory/ships before windows — the calendar makes *markets* move ahead of events, which is intelligence-layer gameplay); no P2W ✓; forecastable NPC/world behavior ✓ (this wave IS that principle); mobile ✓ (calendar list view); reduced-motion ✓ (countdowns are text).

## LS4 — Corporate Eras (90-day chartered epochs + era chronicle)

**Player outcome:** at Tier 3+, your corporation declares an **Era** — a named ~90-real-day epoch with a chosen **charter** (one of ~8 mandates: Expansion Era / Research Renaissance / Consolidation / Belt Century / Science Age / Logistics Empire / Civic Era (senate+factions) / Interstellar Prelude). The charter sets era-long scoring criteria + a mild focus bonus/malus pair (e.g. Research Renaissance: +10% research speed, +10% overhead — priced focus, not free wins). At era end: a **cinematic era report**, a permanent **era medal** (graded by charter-goal completion), a legacy-power grant, and an entry in the corporation's public **Chronicle** (heritage registry + public corp page) that any player can read as history. Then you charter the next era.

**Loop:** Campaign — the direct answer to "lengthy play time over months." Three eras ≈ 9 months of named, recorded corporate life.

**Mechanics:**
- Era duration fixed at 90 real days (wall clock — decoupled from tick speed via LS1's clock fix; lapsed players' eras still end, and the debrief covers it).
- Charter goals are **absolute and bracket-scaled** (net-worth bracket at era start, reusing league brackets) so era grades are fair at every scale — newcomer-bracket invariant.
- Era medals feed `legacy-system.ts` as a new milestone family (additive; stays inside legacy bonus caps). No stacking of era focus bonuses across eras — one era, one focus.
- The Chronicle: append-only public record (era name, charter, grade, headline stats, notable events from the narrative log) on `public-registry.ts`/corp pages — CLAUDE.md's "permanent ledger new players read as history," now real. OG-card share per completed era (existing dynamic-OG pattern) = organic acquisition surface.

**Systems touched:** new `src/lib/game/corporate-eras.ts`; `game-engine.ts` (era tick check beside quarterly reports); `legacy-system.ts` (era milestone family); `quarterly-reports.ts` (reports reference current era); UI: era header on Dashboard + `GovernancePanel.tsx` (charter choice lives with board politics — W13 synergy: board approval of charter uses existing directive machinery), Chronicle section on public corp pages (`src/app/space-tycoon/corp/`). SERVER: `CorpEraRecord` Prisma model for public chronicle (profileId, eraIndex, charterId, grade, startedAt, endedAt, summaryJson).

**Effort:** M–L. **Invariants:** meaningful economic decision ✓ (charter = opportunity cost); corporate-scale ✓ (this IS corporate scale); interstellar ✓ (Interstellar Prelude charter feeds expeditions); no P2W ✓; time loop named ✓ (Campaign); accessible ✓.

## LS5 — Alliance Charters (pledges, shared season goals, NPC co-funding via ledger)

**Player outcome:** each 28-day season, your alliance ratifies a **Season Charter**: a shared objective (e.g. "deliver 2M units to Syndicate contracts," "complete 3 alliance science co-funds," "top-3 finish in two alliance events") with **member pledge slots** — each member commits a weekly quota (resources, treasury deposit, event points). A pledge board shows who's met their week; met pledges pay alliance XP + a personal stipend from the charter escrow; the charter completing pays an alliance-wide seasonal bonus. Separately, alliances (and solo players) can now **co-fund NPC flagship science programs through the real server ledger** — the known deferred watch-item — pooling stakes for shared discovery payouts.

**Loop:** Weekly (the social-obligation gap) inside a Monthly arc.

**Mechanics:**
- Pledges are **opt-in per member and forgiving**: missing a week costs only the week's stipend and shows a neutral "—" (not a shame marker) — social visibility without toxicity; officers may adjust quotas mid-season. No punitive mechanics (community-health guardrail).
- Charter escrow is funded from alliance treasury (existing `alliance-treasury.ts` rails) — a real sink with a conditional partial refund on completion.
- **NPC co-funding via ledger:** replace the client-deterministic solo stake in `science-missions.ts` with server escrow: stake via `server-ledger.ts` (same one-wallet reconciliation queue as trades), stakes recorded per profile/alliance, settlement on the deterministic world-month the cycle already defines, payout split pro-rata with the existing small-contributor bonus shape from `mega-projects.ts`. World-shared program outcomes stay seeded — the ledger adds *whose money* and *who gets paid*, not new randomness.
- Alliance charter progress and co-fund books are public (activity feed) — diplomacy-feed principle.

**Systems touched:** SERVER-heavy: Prisma models `AllianceCharter`, `AlliancePledge` (allianceId, profileId, weekIndex, quotaJson, metAt), `NpcProgramStake` (programId, cycleIndex, profileId/allianceId, amount, settledAt, payout); routes under `/api/space-tycoon/alliances/charter` + `/api/space-tycoon/science/co-fund`; `alliance-cron` extension (weekly pledge close — Mon, aligned with league cron; CSRF exemption); lib: `alliance-events.ts` (charter defs), `science-missions.ts` (server-stake mode behind the existing deterministic cycle math), `server-ledger.ts` (two new entry types). UI: pledge board in `AllianceHubPanel.tsx`, co-fund card in `ScienceMissionsPanel.tsx` (calendar chips via LS3).

**Effort:** L (highest server risk — money moves; escrow tests mandatory, ledger-reconcile round-trip tests like existing `ledger-reconcile.ts` suite). **Invariants:** economic decision ✓ (pledge sizing, stake vs solo spend); sinks ✓; no P2W ✓; corporate-scale ✓ (this IS the corp loop); NPC backdrop ✓ (co-funding makes NPC economy load-bearing); social ✓; mobile ✓.

## LS6 — Programs Queue (crew training & leader development — the EVE skill queue)

**Player outcome:** a **Programs** board where long-running human-capital programs tick on the wall clock regardless of login: workforce certification cohorts (e.g. "EVA Certification — 200 miners, 21 days, +5% belt mining on completion"), leader development postings (send a commander to a 30-day program: +XP, chance of a second trait slot), and R&D residencies (assign a scientist leader to a category for compounding weekly bonuses). Queue up to 3 programs ahead per track. The EVE trick lands: progression continues while away, and re-pointing the queue is a recurring reason to return on a multi-week rhythm.

**Loop:** Campaign (weeks–months per program) with weekly check-in texture.

**Mechanics:**
- Programs cost money up front (sink) + occupy the workforce/leader (opportunity cost — trained crew are off-shift at reduced output during the program; the meaningful decision).
- Completion bonuses are small, additive, and live **inside** existing caps (workforce bonuses, commander stacking 0.88^n, BALANCE 50% research aggregate) — fills toward caps, never past (the 4X W8/W10 rule).
- Leader mortality/retirement (4X W8's deferred optional) ships here: leaders retire after ~2 real months of *assigned* service with a legacy grant — generational texture; retirement is forecast on the calendar (LS3).
- Catch-up: pure wall-clock timestamps + LS1 queue-pop; deterministic trait rolls seeded per (leaderId, programId).

**Systems touched:** new `src/lib/game/programs.ts`; `workforce.ts` (cohort states), `commanders.ts` (program posts beside W8 assignment posts, retirement), `legacy-system.ts` (retirement grants); UI: Programs board inside Workforce/Commander tabs; save migration. No server schema (client-state).

**Effort:** M. **Invariants:** economic decision ✓; sublinear/capped ✓; no P2W ✓; interstellar ✓ (expedition-crew certifications); mobile ✓ (list UI).

## LS7 — Season Chronicle (economic seasons, prestige archive, cross-season titles)

**Player outcome:** seasons stop being disposable. Each 28-day season now has: (1) an **announced economic theme** — a commodity super-cycle published one week ahead on the calendar ("S9: Volatiles Boom — water/methane demand +X%, He-3 glut") implemented through the existing demand/mean-reversion machinery so *markets* differ season to season; (2) a **season finale** at a fixed UTC time (LS3 countdown); (3) a permanent **Season Chronicle archive** — final bracket placements, alliance charter results (LS5), event winners — displayed as titles/banners on profiles, corp pages, and the public leaderboard forever. A month-4 veteran wears month-2's title; a returning player sees three seasons of world history they can read.

**Loop:** Monthly, with the archive serving Campaign.

**Mechanics:**
- Super-cycle = seeded seasonal bias applied via `market-pressure.ts`/mean-revert targets (world-shared, published, bounded ±25% so no season invalidates a build). Positioning inventory *before* the announced cycle is the intelligence-layer play.
- Titles are cosmetic + tiny legacy-power grants (prestige without power creep — no P2W-shaped ladder).
- Archive is server truth: extend seasons DB rows with a sealed results JSON at TALLYING; public read route + `/space-tycoon/seasons/[n]` archive page (SEO + acquisition like the public leaderboard).

**Systems touched:** `seasonal-events.ts` (theme field, finale time, seal step in the existing 9-phase lifecycle — the cron already runs daily 06:00), `market-pressure.ts`/mean-revert route (seasonal bias term), SERVER: seasons table results column + archive route, UI: `SeasonPanel.tsx` theme banner, profile/corp title chips, archive page.

**Effort:** M. **Invariants:** supply/demand plug-in ✓ (literally); forecastable ✓; no P2W ✓ (titles cosmetic); newcomer brackets already exist ✓; mobile ✓.

## LS8 — Story Chapters (calendar-dated episodic arcs with finales)

**Player outcome:** 2–3 times per quarter, a **Chapter** runs world-shared on the calendar: a 5–6 week narrative arc with dated acts — e.g. *"The Second Silence"* (Hive interface stations dim → xenogenic markets freeze (existing market-event rails) → alliances race a co-funded listening campaign (LS5 stakes) → finale weekend: world-shared resolution roll weighted by aggregate participation, epilogue effects for a month). Chapters are built from the shipped W3r/W4 chain engine (`narrative-events.ts` chainId/stages/`applyChainConsequence`) — the new part is **calendar-dated, world-synchronized staging** instead of per-player triggering, so the whole server is in the same act and talks about it (forums/GameChat synergy).

**Loop:** Monthly/Campaign; the "seasonal content arcs with beginnings and ends" pillar.

**Mechanics:** act transitions keyed to world week index (deterministic); per-player choices within each act stay personal (no PvP interference); aggregate-participation thresholds read from server counters (milestone-race style) so community effort visibly matters; chapter epilogue writes to Chronicle surfaces (LS4/LS7) and LORE.md gets each chapter appended post-run (canon grows). Content: author 3 chapters up front from LORE arcs (Great Silence recurrence #41, Triton Archive #42, Ring Fire anniversary #44 — already sketched in 4X 2c, upgraded to world-synchronized chapters).

**Systems touched:** `narrative-events.ts` (world-staged chain mode), new chapter defs in a `chapters.ts` content module, server counter route for aggregate progress, `world-calendar.ts` entries (LS3), UI: chapter banner + act tracker on Dashboard, finale uses `CinematicOverlay`.

**Effort:** M (engine S — staging mode; content M). **Invariants:** every act choice moves money/risk/reputation ✓ (W4 rule); no P2W ✓; hazard/NPC-driven losses only ✓; interstellar-extensible ✓ (chapter arcs can point at expedition space); a11y/mobile ✓ (modal patterns exist).

## LS9 — The Realignment (quarterly world epoch + public roadmap)

**Player outcome:** every ~90 real days the world visibly *changes*: a **Realignment** event — faction postures shift (one faction ascendant, one retreating; derived deterministically from the quarter's aggregate senate outcomes, chapter results (LS8), and season telemetry), moving delivery-contract multipliers within published bands (BALANCE table becomes dynamic ±0.2), rotating embargo/license availability (`factions.ts` bite), re-seeding NPC company faction biases (NPC_BACKDROP's faction-alignment recommendation, finally), and opening one new *epoch feature flag* (content the team ships that quarter — the visible roadmap made mechanical). An **Epoch Address** cinematic + a public "State of the System" page double as the game's changelog/roadmap surface — players can always see what epoch is live and what's announced next.

**Loop:** Quarterly/Campaign — SESSION_DESIGN's planned "faction realignment events," built.

**Systems touched:** new `src/lib/game/realignment.ts` (deterministic derivation off quarter index + server aggregates), `factions.ts` (posture state consumed by `delivery-contracts.ts` multipliers within bands), `npc-companies.ts` (faction bias field — the 1-hour NPC_BACKDROP change), SERVER: quarter-close cron (reuses senate quarter boundary; CSRF exemption), `/space-tycoon/epoch` public page, UI: Epoch banner, `FactionPanel.tsx` posture indicators (colorblind-safe icons, not color-only). LORE.md appendix per epoch.

**Effort:** M. **Invariants:** forecastable ✓ (posture trends visible during the quarter); bands bounded ✓ (no build invalidation); NPC invariants preserved ✓ (no rare content, no milestone claims — NPC_BACKDROP checklist applied); no P2W ✓; interstellar ✓ (later epochs are the interstellar-era ramp).

---

# PART 4 — EXPLICITLY OUT OF SCOPE

- **Pay-to-win anything.** No purchasable queue slots, boosts, stakes, or era/charter advantages in these waves. (CLAUDE.md permits convenience queue-slot monetization beyond a free cap *in principle*; per the founder's monetization hold, nothing here is gated on money. If ever revisited, only LS1 queue depth beyond the free+earnable cap qualifies, and only per POLICY.md.)
- **PvP combat** in any form. All competition remains economic; all destruction remains hazard/NPC-driven and forecast-visible.
- **Real-money mechanics** (RMT, paid seasons, paid chapters, lockboxes). Season Chronicle titles are earned-only.
- **Server-authoritative full simulation rewrite.** LS1 keeps the client-tick + server-ledger split; only money-moving surfaces (LS5 stakes/escrow) go through the server, per the existing one-wallet architecture.

---

# APPENDIX — defects & tensions found during this audit (fix in passing, cited)

1. `offline-income.ts:98` — `Math.max(0, netPerTick)` means costs can never exceed revenue while away; combined with the 8 h cap, away-time is dishonest in both directions (LS1 replaces the module).
2. **Two-clock drift:** `quarterly-reports.ts` keys quarters off frozen-while-away `state.gameDate`; `accord-senate.ts`/world systems key off `server-time.ts`. A lapsed player's quarterly cadence detaches from the world's. LS1 item 4 re-anchors it; audit every `state.gameDate` periodic consumer during LS1.
3. `catchup-mechanics.ts` mentorship functions (`calculateMentorshipRewards` etc.) have **zero call sites** in the game — a CLAUDE.md on-ramp commitment existing only as dead code (LS2 wires it; also fold pioneer-bonus into `frontier.ts` — 4X defect #7 still open).
4. `catchup-mechanics.ts:159` `getCurrentSeasonNumber()` uses a hardcoded `2025-01-01` epoch, disagreeing with `SERVER_EPOCH_MS` (2026-03-22) and the 28-day season system — three season definitions coexist (this file's 90-day, seasonal-events' 28-day, server-time's `getCurrentSeason()`). Consolidate in LS7.
5. `GLOBAL_ALLIANCE_EVENT_BRACKET` single-pool (known watch-item) — LS5 charters make alliance events more load-bearing; bracket matchmaking should ride LS5 or immediately after.
6. Season-pass pacing flagged in SESSION_DESIGN ("max a season in under a week") remains untuned — LS7's finale/archive makes pacing visible; retune SP curve there.
7. Alliance-event reward XP distribution (deferred 4X watch-item) — LS5 touches the same payout path; close it there.
8. No notification surface for appointment mechanics: the PWA service worker exists (`public/`, layout registration) but no push pipeline. LS3's calendar is the natural producer; "faster off-session notifications" is explicitly sanctioned convenience per CLAUDE.md. Scope a notification S-wave alongside LS3 if push infrastructure is approved (email fallback via existing cron mailer is fine).
9. `SAVE_VERSION = 1` in `constants.ts` while migrations track V12→V23 elsewhere — naming drift worth a comment fix during the LS1 migration (V24) so future agents don't mis-key.
