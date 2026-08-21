# Visual AAA 2026-08 — Stellaris / Sins / Master of Orion 2 Interface Parity

**Founder directive (2026-08-21, verbatim intent):** "I would like the game to look and have
interfaces inline with games like Stellaris, Sins of a Solar Empire and Master of Orion 2."

**Relationship to the previous overhaul.** `docs/VISUAL_DEPTH_2026-08.md` (waves V1-V8, complete)
benchmarked Stellaris and closed the *structural* gaps: an icon registry, portal tooltips with
nested concepts, a persistent outliner and situation log, map-as-stage, chrome primitives, entity
art, a juice pass, and a type/density floor. **This spec builds on that, it does not redo it.**
Where V1-V8 asked "does the information architecture exist?", this spec asks "does the surface feel
like a piece of hardware, and does it tell you the *rate* of things, not just the *amount*?"

**Scope discipline (inherited from V1-V8, still binding):** visual/UX only, no gameplay changes,
mobile parity at 375px, reduced-motion / colourblind-safe / keyboard / screen-reader on every new
surface, 60Hz phone budget, no-combat visual canon.

**Parallel work:** a separate agent owns the MAP wave in this same push — `MapCommandCenter`,
`MapContextPanel`, `SolarMap3D`, `SolarSystemCanvas`, `SolarMapBloom`. Nothing in Wave A1 touches
those files. Map-side items appear in the backlog below marked *(map wave)* for completeness only.

---

## Part 1 — Benchmark table

Three different games, three different lessons. The table separates what each one is actually good
at from what we already have and what is still missing.

| Benchmark | What it does exceptionally | What we take from it | Have (as of V8) | Gap this spec addresses |
|---|---|---|---|---|
| **Master of Orion 2** — panel materiality | Every panel is a *physical object*: beveled housings, inset wells, machined corner hardware, riveted edges. You can tell a main console from a sub-readout at a glance without reading a word. | Layered frame construction; variant frames that encode meaning; hardware detailing that reads at a glance but never competes with content. | `.hud-frame` corner brackets, `.game-panel` glassmorphism, `ConsolePanel`/`HoloCard`/`DataChip` primitives — but all flat translucent tint, all one uniform treatment. | **A1.1 — shipped.** Bevel + inset well + corner plates + edge hardware, with four meaning-keyed variants. |
| **Master of Orion 2** — numeric legibility | Chunky high-contrast numerals, icons inline with values, everything tabular. The screen is a *ledger*, and it is instantly scannable. | tabular-nums everywhere; a fixed value+unit+icon composition; unambiguous label→value hierarchy. | V8 set a type floor and a density mode, and `.game-number` had tabular-nums — but composition was per-call-site: `<p>{value}</p><p>{label}</p>` with the icon exiled to a corner. | **A1.2 — shipped.** `Figure` / `FlowValue` / `StatReadout` primitives, retro-applied tabular alignment to the table classes. |
| **Stellaris** — resource bar with flow rates | The top bar shows stock **and** flow (+X/month) for every resource, and hovering itemizes exactly where that flow comes from. This is how a Stellaris player makes every economic decision. | Per-resource net flow beside the stock; a hover breakdown itemizing contributions; honest disclosure of what isn't counted. | Totals only. Money had `AnimatedMoney` + a sparkline + a net-income chip; resources had no bar at all. | **A1.3 — shipped.** Full stock+flow strip sourced from the engine's own code paths. |
| **Stellaris** — information architecture | Outliner, situation log, nested concept tooltips, map modes. | Persistent structural UI. | **Done in V3/V4/V2.** | — (no gap) |
| **Sins of a Solar Empire** — the HUD *is* the frame | The UI is a fixed bezel around a live theatre; panels dock into the chrome rather than floating over it. Empire tree on the left, fleet on the bottom, always present. | Map-as-persistent-stage; docked rails rather than modal takeover. | **Done in V4** (desktop panels overlay a frozen map) and **V3** (persistent outliner rail). | Partial: the bezel still reads as web chrome rather than a machined bezel. A1.1's housing treatment reaches the ResourceBar and the outliner rail; a full docked-bezel restage is backlogged (**A2.1**). |
| **Sins** — zoom-continuous detail | Seamless galaxy→planet zoom with information density changing continuously. | LOD-banded information. | **Done in V4** (three LOD bands off camera distance). | — *(map wave owns any further work)* |
| **Stellaris / MoO2** — planet & leader presentation | Planet detail with orbital rings and slot grids; leader portraits framed as dramatic moments. | Entity presentation as a designed moment, not a data card. | Portraits exist on disk (70), `sprite-frame` mounts exist. | Backlogged **A2.2 / A2.3**. |

### Honest self-assessment after A1

The interface language gap is now mostly closed; the remaining distance to the benchmarks is
**entity presentation** (planets, leaders, factions) and **art fill**, not chrome or data density.

---

## Part 2 — What Wave A1 shipped

### A1.1 — Panel materiality

**Before.** Every panel was a flat translucent tint: `.game-panel`'s `rgba(10,10,20,0.85)` +
`backdrop-filter: blur(20px)` + a 1px `rgba(255,255,255,0.06)` border, decorated with `.hud-frame`'s
four 12×12px hairline corner brackets (1.5px borders, no fill). There was no light source, no
edge, no depth cue — content floated *on* a wash. All ~102 panels looked identical, so a top-level
command surface, a nested read-only table, and a locked/empty panel were visually indistinguishable.

**After.** Panels read as machined housings, built in three layers:

1. **Outer bevel** — a lit top edge (`inset 0 1px 0`) and shaded bottom edge (`inset 0 -1px 0`) plus
   asymmetric side catches, so the housing takes light from above like a moulded console shell.
2. **Inset well** — an inner vignette (`inset 0 0 22px`) that pushes content *into* the housing.
3. **Hardware** — the corner brackets promoted from hairlines to milled plates (13px, 2px edges,
   with a small filled diagonal nub painted by a background gradient), plus an opt-in `.mat-hardware`
   layer carrying four screw dots and a ticked ruler down each side edge.

**Four variants keyed to meaning** (not decoration), selectable on `ConsolePanel`/`HoloCard` via a
`variant` prop and available to raw `.hud-frame` consumers as plain classes:

| Variant | Means | Treatment |
|---|---|---|
| `primary` (default) | a top-level command surface | lit raised housing, full hardware |
| `secondary` | a data well recessed *into* a console | bevel inverted (dark lip on top), no outer drop, deeper vignette, no hardware |
| `alert` | needs a decision / degraded state | amber caution ring + amber corner plates. **Non-combat canon:** a caution rail, never damage or impact language |
| `inert` | locked, mothballed, empty, unavailable | desaturated, minimal light — reads as "no power" |

**Why it propagates for free.** The housing is defined on `.hud-frame` itself, which 77 of the game's
panel files already carry. Zero call-site edits were needed for the depth upgrade to reach them.
`ConsolePanel`'s `variant` defaults to `primary` and `HoloCard`'s to `secondary`, both of which
render byte-identically to their pre-A1 markup, so every existing call site is unaffected.

**Two implementation decisions worth recording:**

- *box-shadow, not background-image.* 15 existing `.hud-frame` call sites also apply Tailwind
  `bg-gradient-to-*`, which **is** `background-image` — painting the bevel with gradients would have
  silently erased their tints. The cost of using box-shadow is that the five glow classes
  (`.game-panel-glow`, `.game-glow-cyan|purple|green|amber`) had to be explicitly re-composed via
  higher-specificity `.hud-frame.game-glow-*` rules that *append* the glow to the housing rather than
  replacing it. Known residual: an element running an animated glow-pulse keyframe loses the housing
  for the pulse duration (the animation owns `box-shadow`) — those are small track pips, not panels.
- *`HoloCard` is not `.hud-frame`.* Corner plates on every list row would be noise, and `.hud-frame`'s
  bottom two plates need markup spans, so a bracketed card would render asymmetrically. `HoloCard`
  gets the same `--mat-*` token vocabulary one notch shallower, with its baseline being the recessed
  well (the inverse of `ConsolePanel`'s raised housing).

**Density and contrast.** The inset-well spread is `calc(22px * var(--density-scale))` and the corner
plates are `calc(13px * var(--density-scale))`, so compact mode gets a proportionally tighter housing
rather than a cavernous one. High-contrast mode strengthens the bevel lips (0.075→0.30 highlight,
0.55→0.85 shade) — the depth cue survives — and drops the decorative hardware layer entirely, which
is legitimate because it carries no information by contract.

**Mobile.** Edge tick rulers are suppressed under 640px where they would crowd a phone's content
column. Everything else is inset or absolutely positioned with `pointer-events: none` and
`border-radius: inherit`, so nothing can clip or overflow. No new animation was introduced at all,
so there is nothing for reduced-motion to disable.

### A1.2 — Typography and icon-first data density

Three primitives in `chrome.tsx`, so dense surfaces compose the same way instead of hand-rolling
`<span className="font-mono text-sm text-white">`:

- **`<Figure>`** — one tabular figure with an optional unit suffix rendered at `0.72em` and one
  contrast notch down. `$1.2` reads as the number, `M/mo` reads as the unit.
- **`<FlowValue>`** — a signed rate carrying direction **three redundant ways**: an arrow glyph
  (`▲`/`▼`/`■`), an explicit `+`/`−` inside the visible text, and a visually-hidden direction word.
- **`<StatReadout>`** — label *above*, then icon inline **with the value** on the same baseline row,
  plus an optional sub-line and trend token. The label is always real text; an icon never stands in
  for it.

Applied to: `DashboardPanel` Key Metrics (four tiles, inverted from value-over-label to label-first,
each gaining a sub-line — margin %, payroll, under-construction count, technologies unlocked);
`FleetPanel` fleet overview (three centred count tiles → instrument readouts); `MarketPanel` price
ledger (bid/ask/spot moved into a fixed-min-width tabular column so figures line up decimal-for-
decimal down the whole list, and the change indicator converted to `FlowValue`); `ResourceBar`
(net-income chip now uses the identical `FlowValue` composition as every resource cell below it).

Retro-applied for free: `tabular-nums` on `.holo-table td/th` and `.holo-row .game-number`, so every
existing table inherits column alignment with no edit. `.mat-table` adds hairline row rules (the MoO2
ledger look) and was applied to the five `.holo-table` instances.

V8's type floor holds throughout — labels 10px, figures 11px+, nothing below the established minimum.

### A1.3 — Resource bar with flow rates

**Before.** The resource bar showed cash, a sparkline, a net-income chip, the game date, and the
audio/density settings cluster. **Resources had no representation at all** — no stock, no rate.
Players could only find inventory by opening the Market tab.

**After.** A horizontally scrollable strip of resource cells below the main bar. Each cell shows the
category icon, an animated stock figure, and the net flow (`▲ +12.4/mo`), with a `HoloTip` on
hover/focus itemizing every contribution and the resulting net. Cells whose stock depletes within
three months, or whose facilities report a shortfall, get an amber frame. The strip is sorted by
depletion urgency, so the resources needing a decision are always in front, and hides entirely for a
brand-new corporation that holds and moves nothing.

**Data sources — and the drift rule.** The brief was explicit that these numbers must come from the
real engine and never from a parallel estimate that could disagree with the tick. `resource-flow.ts`
honours that in three tiers:

| Contribution | Source | Tier |
|---|---|---|
| Industry demand | `deriveSupplySummary` (consumption.ts) — the engine's own lens | reuse |
| Industry output | `getBuildingConsumptionEfficiency` × the recipe — the exact `output = base × phaseIn × eff` line the monthly pass runs | reuse |
| Boil-off & over-capacity spoilage | `projectStorageIntegrityLosses` — **extracted in this wave** from consumption.ts's private `runStorageIntegrity`, which is now literally "project, then apply". The projection and the charge are the same function. | reuse (via extraction) |
| Spoilage / decay | `applyResourceDecay` (economic-sinks.ts), run per pool and diffed — mirroring the engine's pool split, because its per-resource `max(1, …)` floor means decaying a summed total would understate it | reuse |
| Building extraction | `buildingMiningMultiplier` + `freighterLogisticsBonus` + `surveyProbeMiningBonus` — **moved out of game-engine.ts**, which now imports them. Single definition site. | shared formula |
| Fleet mining | `shipMiningMultiplier` — same move. Kept deliberately separate from the building chain because the engine's ship pass genuinely runs a shorter chain (no era/reputation/commander/megastructure terms); this lens reproduces the engine as it *is*, not as it arguably should be. | shared formula |
| Megastructure passive output | `getMegastructureBonuses().passiveResources` | reuse |

**Omitted rather than guessed** — and stated verbatim in the tooltip, not silently dropped:

- contract deliveries, freight transfers and market orders — one-off transfers, not monthly rates;
- refining and crafting jobs — driven by a real-time timer on one active job;
- survey discoveries and hazard losses — random, resolved when they happen;
- interstellar trade-route shipments — they arrive on a multi-month cycle.

**A landmine found while wiring this up, recorded for whoever touches it next.** The codebase carries
**three non-interchangeable month counters**, and they are all called `monthIndex` at some call site:

1. **World month** — `globalDate.totalMonths`, mirrored on `consumptionState.lastProcessedMonth`.
   Drives consumption phase-in and the storage-decay ramp.
2. **Absolute game month** — `gameDate.year * 12 + gameDate.month`. The tick compares survey-probe
   `expiresAtMonth` against *this*.
3. **Campaign-relative month** — `gameDateToMonthIndex()`, offset from `GAME_START_YEAR`. Used by the
   demand pools.

The first draft of the flow lens passed (3) where the engine expects (2), which made **every** survey
probe bonus read as expired — a silent, plausible-looking undercount of extraction. `resource-flow.ts`
now derives each counter explicitly at its own use site, the header carries a warning, and a
regression test asserts the two counters really are far apart so the guard has teeth.

One further nuance: industry demand is reported as effective **required** demand
(phase-in and research reduction applied), not the realized draw. A starved building actually draws
less; the gap is exactly the shortfall the cell's amber state reports. Showing required demand is the
right call for a decision-support readout — a player needs to see the demand they are failing to
meet, not the reduced amount they managed to buy.

**Money treatment extended, not duplicated.** The old money-only `AnimatedMoney` RAF roll-up was
generalized into `AnimatedValue({value, format, minDelta})`; `AnimatedMoney` is now that with
`formatMoney` bound, and resource stocks use the same component with a unit formatter. It also gained
a reduced-motion guard it previously lacked (a rolling counter is decorative motion, and the final
value is identical either way, so it snaps). As a side effect of adding flow derivation to the bar,
the ResourceBar's P&L block — which was bare statements in the component body, recomputing on
**every render** — is now memoized on `state`.

### Accessibility handling (A1 as a whole)

- **Colourblind-safe.** Every rate carries direction three redundant ways (glyph + explicit sign +
  hidden word). The `alert`/`inert` frame variants change bevel *geometry*, not just hue, so they
  survive greyscale. Amber shortfall cells are paired with the shortfall wording in their tooltip.
- **Reduced motion.** A1.1 introduces no animation at all. A1.3's only motion — the stock roll-up —
  snaps under `prefers-reduced-motion`.
- **Keyboard.** Every resource cell is a `HoloTip` trigger: focusable, Enter/Space-activatable,
  Escape-dismissable, with `aria-describedby` wiring the breakdown to the trigger.
- **Screen readers.** The strip is a labelled `<ul>`; each cell's icon carries the resource **name**
  as visually-hidden text, so no cell is ever icon-only. `StatReadout` labels are always real text.
  Decorative hardware is unconditionally `aria-hidden`.
- **High contrast.** Bevel lips strengthen; low-alpha decorative detail is dropped as noise; trend
  colours and unit/label greys step up.
- **375px.** The strip scrolls horizontally rather than wrapping the bar above it. Edge hardware is
  suppressed. All existing 44px touch targets are preserved.

### Files touched

| File | Change |
|---|---|
| `src/components/game/GameStyles.tsx` | +~330 lines: A1 materiality section (housing tokens, four variants, corner plates, `.mat-hardware`, `.mat-rail`, HoloCard wells, high-contrast overrides) and A1 numeric-readout section (`.mat-figure`, `.mat-unit`, `.mat-stat*`, `.mat-trend*`, `.mat-table`) |
| `src/components/game/chrome.tsx` | `FrameVariant` + pure `resolveFrame()`; `variant`/`hardware` props on `ConsolePanel`; `variant` on `HoloCard`; new `Figure` / `FlowValue` / `StatReadout` primitives |
| `src/lib/game/resource-flow.ts` | **new** — shared mining formulas (now the definition site) + `computeResourceFlows()` + formatting helpers + `OMITTED_CONTRIBUTIONS` |
| `src/lib/game/game-engine.ts` | imports the four relocated mining formulas instead of holding its own copies (math unchanged) |
| `src/lib/game/consumption.ts` | `projectStorageIntegrityLosses()` extracted from private `runStorageIntegrity`, which now projects-then-applies |
| `src/components/game/ResourceBar.tsx` | `AnimatedValue` generalization + reduced-motion guard; memoized P&L; `ResourceFlowCell`; the stock+flow strip; net-income chip on `FlowValue` |
| `src/components/game/DashboardPanel.tsx` | Key Metrics tiles → `StatReadout` |
| `src/components/game/FleetPanel.tsx` | fleet overview tiles → `StatReadout` |
| `src/components/game/MarketPanel.tsx` | price ledger → `ConsolePanel` housing + tabular price column + `FlowValue` change indicator |
| `src/components/game/FuturesPanel.tsx`, `InterstellarPanel.tsx`, `MegaProjectPanel.tsx` | `.mat-table` on the five `.holo-table` instances |
| `src/lib/game/__tests__/resource-flow.test.ts` | **new** — 22 tests |
| `src/components/game/__tests__/chrome.test.tsx` | +14 tests (variant selection, hardware layer, numeric primitives) |

---

## Part 3 — Prioritized backlog for follow-on waves

Ordered by leverage-per-effort. Each item names its benchmark, the loop it serves, and its
dependencies.

### A2 — Entity presentation (highest remaining leverage)

**A2.1 — Docked command bezel** *(Sins of a Solar Empire)* — **Effort: M.**
Sins's UI is a fixed machined bezel around a live theatre; ours is still a web header above a content
column. Now that A1.1 gives us a housing vocabulary, extend it to the *shell*: the ResourceBar
becomes the top bezel plate, the V3 outliner rail becomes the right bezel plate, and the tab strip
becomes a machined selector rather than a row of text buttons. Purely CSS + shell markup; no new data.
*Depends:* A1.1. *Coordinate with:* the map wave (the bezel frames the map).

**A2.2 — Planet / location detail with orbital rings** *(MoO2 + Stellaris)* — **Effort: M-L.**
The single biggest "this is a strategy game" moment we don't have. A location detail view rendering
the body with concentric orbital rings for its infrastructure tiers, building slots as sockets around
the rim (`.module-socket` already exists), hazard exposure as an outer band, and standing as a rim
tint. Pure lens over existing state — buildings, slots, hazards and standing are all already on
GameState. *Depends:* A1.1 for the socket/housing treatment. *Loop:* tactical + strategic.

**A2.3 — Portrait-framed leader moments** *(MoO2 / Stellaris)* — **Effort: M.**
70 commander portraits sit on disk and are currently rendered as small thumbnails. Promote hiring,
retirement, era transitions, and first contact to full portrait-framed moments using the existing
`CinematicOverlay` queue — portrait in a `sprite-frame` mount, name plate, faction insignia, one line
of character voice. *Depends:* A3 art fill for the 20 leaders with no portrait. *Loop:* monthly /
campaign — this is a *pacing* feature, not a per-session one.

### A3 — Art fill (parallelizable, no code contention)

Carried forward unchanged from `VISUAL_DEPTH_2026-08.md` §V6, which enumerated these and shipped
41 of them. The remaining, enumerated holes:

**A3.1 — 20 missing leader portraits** — **Effort: S** (wall-clock + curation).
The W8 scientist/engineer leaders (`commanders.ts` W8 block) have no portraits and every UI falls
back. Blocks A2.3.

**A3.2 — ~32 missing event illustrations** — **Effort: M.**
W4 added 44 events across 12 chains; only the 12 original chains have art. The newer chains fall
back to biome art (a documented, intentional partial map in `assets.ts`).

**A3.3 — 6 faction leader portraits** — **Effort: S.**
`docs/LORE.md` names them; only faction emblems exist. Needed before faction diplomacy surfaces can
feel inhabited.

All three via the existing `scripts/generate-art.ts --batch` pipeline, emitting 1536/512/128 sizes
from day one per the V6 contract, with every consumer's documented null-fallback preserved.

### A4 — Motion and depth

**A4.1 — Galactic-layer parallax restage** — **Effort: S-M.**
Specced in `VISUAL_DEPTH_2026-08.md` §V4.5 and still open (a standing watch-item): layered parallax
starfields on `transform: translate3d`, per-system vista thumbnails behind node buttons, CSS nebula
radial washes per system colour. Static under reduced motion. *Note:* `GalacticMapView` is DOM and is
**not** owned by the map wave, so this is safe to pick up here.

**A4.2 — Outliner money-flash hook** — **Effort: S.**
Carried over from V7/V3: the row-id convention and the `onMapPing` bus are both already in place; the
outliner row simply never subscribes. Small, closes a documented loop.

**A4.3 — `.holo-row` density scaling** — **Effort: S.**
Carried over from V8: `.holo-row` heights don't respond to `--density-scale`, so compact mode tightens
panels but not list rows.

### A5 — Deferred / explicitly not now

- **Full WebGL galactic layer** — long-standing watch-item; A4.1 is the cheap 80%.
- **Legacy art resize backlog** (377 images to 1536/512/128) — deferred since V6; new art already
  emits multiple sizes, so this only affects older assets.
- **Unifying the four divergent P&L implementations** (`economy-report.ts` is canonical;
  `DashboardPanel`, `ResourceBar` and `away-operations` each hold their own copy). A1 memoized the
  ResourceBar copy but did not merge it — that is an economy-correctness task, not a visual one, and
  it deserves its own wave with the sim harness as its gate.

---

## Part 4 — Constraints every implementing agent must hold

Unchanged from `VISUAL_DEPTH_2026-08.md` Part 3, restated because they are load-bearing:

1. **No gameplay changes.** Consume GameState read-only or re-route existing handlers. A1's one
   engine edit (relocating the mining formulas) is a pure move with byte-identical math, gated by the
   full suite.
2. **Mobile parity.** 375px is the floor, not an afterthought. Frame detailing degrades; it never clips.
3. **60Hz budget.** No new persistent rAF loops. A1 adds no animation and one memoized derivation.
4. **Reduced-motion / colourblind / keyboard / screen-reader** on every new surface. No colour-only
   signals — a shape or text twin is mandatory.
5. **No-combat visual canon.** The `alert` variant is a caution rail. No weapon, explosion, or impact
   language anywhere, ever.
6. **Build discipline.** `npx tsc --noEmit`, full `npx jest`, then
   `NODE_OPTIONS=--max-old-space-size=4096 npx next build` before push. New pure logic gets tests.
