# Visual Depth 2026-08 — Bringing Space Tycoon to Stellaris-Class Presentation

**Founder directive (verbatim):** "bring our space game up to the graphical quality and depth of
interfaces as a modern space strategy game like stellaris."

**Scope:** visual/UX only. No gameplay changes. Any interaction change must preserve mechanics
exactly (same handlers, same GameState mutations). Every wave states its phone behavior and honors
the accessibility invariants in CLAUDE.md (reduced-motion, colorblind-safe, keyboard, screen reader)
and a 60Hz phone perf budget.

**Companion docs:** `docs/4X_BASELINE_2026-08.md` (W1-W14), `docs/LIVE_SERVICE_2026-08.md` (LS1-LS9),
CLAUDE.md §GUI and Command Center (canon).

---

## Part 1 — Gap Audit vs Stellaris-Class Benchmarks

The honest headline: **the atmosphere layer is already strong; the information-architecture layer is
where we are furthest from Stellaris.** Several AAA passes have produced a real design system and a
real 3D map. What we lack is Stellaris's *persistent structural* UI — the outliner, the situation
log, the unified tooltip system, map modes — and a coherent iconography. Detail by area:

### 1a. Information Architecture — LARGEST GAP

What exists:
- 31 tabs in `TAB_CATALOG` (`src/app/space-tycoon/page.tsx:1691-1723`), tier-gated, split into 8
  primary + overflow "More" dropdown (`PRIMARY_TAB_IDS`, page.tsx:1746). Hub panels (ContractsHub,
  MarketHub, StandingsHub, AllianceHub) already consolidate sub-features — good.
- `pickInitialTab` (page.tsx:751) already lands veterans on **'map'** — the map-first mandate is
  half-implemented. `MapCommandCenter.tsx` is a genuine full-viewport command view with floating
  HUD (OrderQueueHUD top-left, layer toggle top-center, MapContextPanel right/bottom-sheet,
  Activity + Spatial popovers).
- `OrderQueueHUD.tsx` derives an in-progress-orders strip purely from GameState — this is 60% of an
  outliner already, but it **only renders on the map tab**.
- Reports tab, `GlobalActivityFeed`, `state.eventLog`, `state.recentHazards`, `MissionCalendarPanel`
  all exist as separate surfaces — the raw feeds for a situation log exist, un-unified.

Where Stellaris beats us:
1. **No persistent outliner.** Stellaris's right-rail entity tree (fleets, planets, construction,
   science ships, situations) is visible on *every* screen and is the primary navigation instrument.
   Our equivalent data is scattered across OrderQueueHUD (map only), FleetPanel, BuildPanel, and the
   Dashboard. Switching tabs means losing all situational awareness.
2. **No situation log.** Event log lives in Dashboard cards; hazards in HazardAlertLayer toasts;
   reports in a tab with an unread badge buried in the "More" dropdown (page.tsx:1837). Nothing
   persistent aggregates "things needing my attention."
3. **Tab-switch = context annihilation.** Every non-map tab replaces the entire viewport with a
   `max-w-5xl` scrolling card column (page.tsx:1931). Stellaris opens panels *over* the galaxy map;
   the map never leaves. Our map is home but every other surface evicts it.
4. **No map modes.** Stellaris has empire/sector/trade/hyperlane lenses. Our Spatial Strategy
   overlay (folded into the map per audit §B5) is a popover *panel*, not a map lens; territory,
   hazard-forecast, and economy data render as badges but can't be toggled as full-map recolorings.
5. **Tooltips are one-liners.** `.game-tooltip` is a CSS `attr(data-tooltip)` string (GameStyles.tsx:236),
   used in exactly **1** game component; everything else uses `title=` or nothing. Stellaris's
   nested concept tooltips (hover a term inside a tooltip to define it) are a signature depth feature
   we have zero of.

### 1b. Diegetic Polish — MODERATE GAP, mostly iconography + consistency

What exists (genuinely good):
- `GameStyles.tsx` (942 lines) is a real design system: `.game-panel` glassmorphism, `.hud-frame`
  corner brackets w/ `--hud-color` variants, `.hud-scanlines`, `.holo-sprite` scan sweep,
  `.sprite-frame` holo-mounts, `.intel-dossier` + `.dossier-stamp`, `.holo-table`, `.holo-row`,
  delta flashes, division badges, module sockets, season/phase track nodes — with reduced-motion
  guards throughout (Wave 7 sweep, GameStyles.tsx:920-939).
- Typography hierarchy exists: Orbitron via `--font-hud` (`.font-hud`, `.game-label`, `.game-number`,
  `.timer-hud`), gradient `.game-heading`, tabular numerics.
- `hud-frame` adoption is wide: 64 of 92 game components.

Where we fall short:
1. **Iconography is 100% ad-hoc emoji.** 184+ emoji literals across game components; all 31 tab
   icons are emoji (page.tsx TAB_CATALOG); category icons, track icons, calendar icons — emoji.
   Only 9 game components contain any `<svg>`. Emoji render differently per OS, can't be tinted,
   can't glow, break the holographic fiction, and are the single most "not-a-real-game" tell in
   screenshots. Stellaris's icon language (resources, jobs, concepts) is the backbone of its
   readability. `public/game/` has exactly **one** UI icon (`icon-sun.webp`).
2. **Micro-type below accessibility floor.** LS surfaces lean on `text-[8px]`/`text-[9px]`/`text-[10px]`
   (CorporateEraPanel.tsx uses 8px for goal labels). Stellaris never goes below readable; we do,
   often, and it also reads as "cramped web widget" rather than "console."
3. **Panel chrome inconsistency.** Three coexisting generations: full console chrome (hud-frame +
   game-label + holo treatments — Dashboard, Fleet, Espionage), plain bordered cards (the six
   hub/aggregate panels — BuildPanel, ContractsHubPanel, FleetPanel wrapper, MarketHubPanel,
   StandingsHubPanel, MarketIntelligencePanel contain **zero** hud-frame), and chip-stacks (LS
   surfaces — see 1f).

### 1c. Map Presence — MODERATE GAP (foundation excellent, presence incomplete)

What exists:
- `SolarMap3D.tsx` (1,269 lines, R3F): real orbital elements + log-scaled distances
  (`orbital-elements.ts`), NASA CC-BY textures (26 bodies in `public/textures/`), instanced belt,
  canvas-sprite labels (no DOM/font fetch), transit arcs with ETA chips, hazard rings + amber
  forecast telegraphs, zone-standing tints with ♛/◆ glyph redundancy, science-mission glyphs,
  DPR≤2, frameloop pause when hidden. 2D `SolarSystemCanvas` remains the mobile/reduced-motion/
  no-WebGL2 fallback with full parity (`use3DCapable`, MapCommandCenter.tsx:59-75).
- `GalacticMapView.tsx` is deliberately DOM (`<button>` nodes = a11y by construction) with
  expedition progress arcs, colony production glyphs, trade-route flow dots.

Where Stellaris beats us:
1. **The map is a tab, not the theater.** Even though sessions open on it, opening Research/Market/
   Fleet unmounts the map entirely. Stellaris's galaxy is the persistent stage; panels are overlays.
2. **Scene atmosphere is thin vs. Stellaris's galaxy.** drei `<Stars>` + solid black. No skybox
   nebula, no bloom/post-processing on the sun or engine trails, no sun lens glare, no selection
   reticle animation (selection is a color change), no ambient particulate. The 8 `EFFECT_ASSETS`
   (engine-trail, warp-jump, mining-laser…) sit **unused** in the scene.
3. **No zoom-level information layering.** All labels/badges render at all zoom levels; Stellaris
   swaps galaxy→sector→system information density as you zoom. We have the camera distance available
   and use it for nothing.
4. **Galactic layer is visually flat** — hand-placed nodes on a static starfield image; no parallax,
   no depth, no per-system identity art (memory watch-item: "WebGL galactic layer (currently DOM)").

### 1d. Entity Art — SMALL-TO-MODERATE GAP (best-covered area, with known holes)

Inventory (`public/game/`, 354 files; maps in `src/lib/game/assets.ts`):
- **Buildings: 123** — incl. tier variants (-s2…-s5) for 8 categories. Excellent.
- **Commanders: 70** (incl. 10 legendary fullbody) — but the **20 W8 scientist/engineer leaders
  have NO portraits** (documented gap, commanders.ts:454-465: UI must fall back).
- **Ships: 19** mapped for 11 hull ids. Good coverage, single angle each.
- **Event illustrations: 12** of 12 original chains — but W4 added 44 events/12 chains; the newer
  chains fall back to biome art (assets.ts:108-116 documents the intentional partial map).
- **Mission patches: 12/12** flagship programs. **Achievements: 40. Resources: 12. Factions: 6**
  (emblems only — no faction leader portraits despite named NPCs in LORE.md). **Planets/locations:
  22. Seasonal: 20. Effects: 8 (unused).**
- Gemini pipeline works: `scripts/generate-art.ts` (single + `--batch batch.json`, 2s rate limit,
  house style prefix baked in at line 21).

Gaps to fill (see Wave V6): leader portraits (20), missing event art (~32), faction leader portraits
(6), region hero banners for the 8 canonical regions, interstellar system vistas (5), UI texture
variants. Deferred-but-noted: the 1536/512/128 resize pipeline for the full art backlog (memory
watch-item) — this spec's waves should emit multiple sizes for new art from day one.

### 1e. Feedback Juice — SMALL GAP (strongest area)

Exists: sound engine w/ region ambients, generative music with mood steering (`updateMusicMood`
takes activeTab + mapLayer hints), `AnimatedMoney` RAF roll-ups + delta flashes (ResourceBar),
money-flash/resource-gain/achievement-pop keyframes, MilestoneVignette, CinematicOverlay queue
(W5) with Ken Burns art, HazardAlertLayer screen flash, FeatureUnlockToast, tutorial pulse.

Missing vs. Stellaris/AAA:
1. **No order acknowledgment on the map.** Dispatching a ship or starting a build plays a sound but
   paints nothing at the target — no expanding ring/ping at the destination, no route flash.
2. **No completion moment in the world.** Build-complete happens in the event log; the map location
   doesn't beacon.
3. **EFFECT_ASSETS unused** — engine trails and warp-jump art exist and render nowhere.
4. **No haptics** on mobile (dispatch/complete/hazard are natural `navigator.vibrate` moments).
5. Panel-open transitions exist (`animate-reveal-up`, modal-scale-in) but tab switches have no
   shared-element continuity; everything just re-reveals.

### 1f. New LS Surfaces — spreadsheet vs. command console

Audited individually:
- `MissionCalendarPanel.tsx` — **console-adjacent**: hud-frame, game-label, category color frames
  w/ 44px targets. But: emoji icons, text-only rows, no timeline visualization (an agenda list, not
  a mission clock). Verdict: 70% there; needs icon system + a horizon-strip visualization.
- `OperationsDebriefModal.tsx` — **half console**: cinematic band exists for 3d+ absences but uses
  the generic starfield (`BG_ASSETS.starfield`) rather than contextual art; body is stacked text
  chips; the economy figure deserves the AnimatedMoney roll-up + a sparkline, and hazards deserve
  their event art thumbnails. Verdict: structure right, dressing plain.
- `CorporateEraPanel.tsx` / era-chronicle — **chip-stack**: hud-frame shell but 8-9px text
  everywhere, emoji medals (`ERA_MEDAL_ICON`), charter picker is a text-button grid with no art.
  Eras are the game's *legacy* system — they should feel like engraved plaques, not form controls.
- `ProgramsPanel.tsx` (LS6 training queues) — **spreadsheet**: emoji track icons, text rows; EVE's
  training queue (its visual ancestor) shows portrait + skill bar + time-channel viz. We have 70
  commander portraits already on disk and don't render them here.
- `AllianceCharterPanel.tsx` — minimal chrome (2 hud-frame hits), text-first.
- `StandingOrdersPanel`, `OrderQueueHUD` — functional HUD strips, fine as-is pending icon swap.

### Audit conclusion → wave priorities

1. Iconography is the highest leverage-per-effort fix (touches every screenshot).
2. Outliner + situation log is the deepest structural fix (the "Stellaris feel" is mostly this).
3. Map-as-stage: **argued and warranted** — but as *persistent chrome + overlay panels on desktop*,
   not a rebuild; mobile keeps full-screen panels (a phone has no room for map-behind-panel).
4. LS surfaces need promotion to the existing AAA chrome standard, not a new standard.
5. Art generation fills known, enumerated holes.
6. Juice pass closes the acknowledgment/completion loop on the map.

---

## Part 2 — Wave Specification

Dependency graph:

```
V1 Icons ──► V2 Tooltips ──► V3 Outliner/Situation Log ──► V4 Map-as-Stage
   │                                                          │
   └────────► V5 Panel Materiality (LS promotion) ◄───────────┘ (V5 independent after V1)
V6 Entity Art ── parallel with everything (art-only)
V7 Juice ── after V4 (map pings need the stage) ── V6 supplies effect art
V8 Density & Type ── after V5 (rides the same panel sweep)
```

Recommended execution order: **V1 → V2 → V5 → V3 → V4 → V7 → V8**, with **V6 running in parallel**
from day one (pure asset generation, no code contention until final mapping PRs).

---

### Wave V1 — Signal Iconography System

**Player-visible outcome:** every tab, category, resource chip, and HUD strip uses a crisp, tintable,
glowing holographic line-icon instead of an OS emoji. Screenshots stop looking like a web dashboard.

**Build:**
- New `src/components/game/GameIcon.tsx` + `src/lib/game/icons.tsx`: a single-file SVG sprite
  (inline `<symbol>` defs, stroke-based, `currentColor`, 24×24 grid, 1.5px stroke to match the
  hud-frame bracket weight). ~90 glyphs covering: the 31 tab ids, 12 resources, ship roles (4),
  building categories (~12), calendar categories (14, MissionCalendarPanel.tsx:28-43), program
  tracks (3), hazard types, medal tiers, factions (6 — derived from existing faction emblem art),
  misc HUD (save, tutorial, achievements, mute, layers).
- API: `<GameIcon name="research" size={14} glow="cyan" aria-hidden />` — glow via CSS
  `filter: drop-shadow` class reusing the existing `.game-glow-*` colors. A `label` prop renders
  a visually-hidden text node when the icon is not decorative.
- Migration: `TAB_CATALOG.icon` becomes an icon id (string) resolved by GameIcon; sweep the 184
  emoji call sites in `src/components/game/` (mechanical, per-component). Emoji stays only inside
  player-facing *content* strings (event flavor text) — never as UI signal.
- Hand-author the SVGs (icons are geometry, not art — do NOT Gemini-generate raster icons; raster
  icons at 12-16px are mush). Where a glyph benefits from the house style, trace over the existing
  webp (faction emblems).
- Colorblind safety: icons are shape-first; color is reinforcement (already the codebase invariant —
  see SolarMap3D ♛/◆ precedent). Document per-icon meaning in `icons.tsx` header.

**Files:** new `GameIcon.tsx`, `icons.tsx`; sweep edits in page.tsx TAB_CATALOG + ~40 components.
**Art-gen:** none (vector, hand-authored).
**Phone:** identical markup; icons render sharper than emoji at 12-16px; no perf cost (one inlined
sprite, no network fetch).
**Accessibility:** every decorative icon `aria-hidden`; semantic icons get labels; no color-only
meaning. **Effort: M.** No dependencies.

---

### Wave V2 — HoloTip: Unified Tooltip + Nested Concept Layer

**Player-visible outcome:** hovering (desktop) or long-pressing (mobile) anything — a resource
number, a bonus chip, a doctrine name, Δv figure, standing glyph — opens a rich holo-tooltip with
title, body, live values, and underlined *concept terms* that expand in place. The Stellaris
"learn the game through tooltips" loop.

**Build:**
- New `src/components/game/HoloTip.tsx`: portal-rendered, hud-frame-styled panel (reuse
  `.game-tooltip` visual language but as a real element, not `::before` — enables rich content).
  Triggers: hover (300ms), keyboard focus (immediate), touch long-press (450ms) → renders as an
  anchored popover on desktop and a **bottom sheet** on <640px (matching MapContextPanel's
  bottom-sheet pattern). Dismiss: blur/escape/tap-out. Focus is NOT trapped (tooltip, not modal);
  content is reachable via `aria-describedby` for screen readers with the interactive expansion
  duplicated as an inline "?" disclosure for keyboard users.
- New `src/lib/game/concepts.ts`: registry of ~60 concept entries `{ id, name, short, body,
  related[] }` — Δv, doctrine, era medal, zone standing, insurance, frontier, lane decay, order
  book depth, away efficiency, etc. Text sourced from existing FAQ/tutorial copy and STATS_DESIGN.md
  (no new mechanics described — document what exists).
- `<Concept id="delta-v">Δv</Concept>` inline component: dotted-underline term; activating it pushes
  a breadcrumbed page *inside the open HoloTip* (max depth 2, back button). This is the signature
  Stellaris interaction.
- Adopt in highest-value spots first: ResourceBar figures (income breakdown already computed there),
  research cards (effects + prereq chain), market rows (spread/volatility), commander bonuses,
  era charter bonus/malus chips, map context panel stats.
- Delete/deprecate `.game-tooltip` attr usage (1 site) and raw `title=` on game surfaces.

**Files:** new HoloTip.tsx, concepts.ts; adoption edits in ResourceBar, ResearchPanel (in page.tsx),
MarketPanel/MarketOrderBook, CommanderPanel, CorporateEraPanel, MapContextPanel.
**Art-gen:** none.
**Phone:** long-press → bottom sheet, 44px close target; never obscures the pressed element's row.
**Perf:** one portal, content lazy-rendered on open.
**Accessibility:** `role="tooltip"` + `aria-describedby`; Escape closes; reduced-motion drops the
scale-in (reuse `.game-modal-*` guard pattern). **Effort: M-L.** Depends: V1 (icons inside tips).

---### Wave V3 — Outliner + Situation Log

**Player-visible outcome:** a persistent, collapsible right-rail "Corporate Outliner" on desktop —
your empire as a living tree (regions → locations → buildings/ships; queues with ETAs; attention
items on top) visible on *every* tab, one click from anything to its home surface. A unified
Situation Log replaces scattered alerts. This is the single biggest "feels like Stellaris" change.

**Build (pure lens over GameState — zero new game state, zero mechanics):**
- New `src/components/game/Outliner.tsx`, mounted in the page shell (page.tsx) *outside* the tab
  branch so it survives tab switches. Desktop ≥1280px: docked right rail (~300px, collapsible to a
  44px glyph rail, persisted in localStorage). 1024-1279px: overlay drawer toggled from a rail
  button. Sections (each collapsible, count-badged):
  1. **Attention** — derived: damaged buildings (damagePct), idle ships, stalled queue orders
    (queueSkipped logic from debrief.ts), expiring contracts, senate docket closing <24h, unread
    reports. Each row: icon, label, ETA/severity chip, click → `setTab` + focus target (reuse the
    OrderQueueTarget pattern, OrderQueueHUD.tsx:24).
  2. **Operations** — reuse/extract `buildOrderQueue()` from OrderQueueHUD.tsx into
    `src/lib/game/order-queue.ts` so both surfaces share it (OrderQueueHUD keeps its map-overlay
    rendering; Outliner renders the same items as tree rows).
  3. **Holdings** — locations grouped by region (LOCATIONS_BY_REGION already exported from
    SolarSystemCanvas.tsx:46) with building counts, power status, ship counts; click → map tab +
    `selectLocation`.
  4. **Calendar** — next 3 entries from `getMissionCalendarEntries` (world-calendar.ts, already
    derived-only).
- New `SituationLog.tsx`: full feed surface unifying `state.eventLog`, `state.recentHazards`,
  reports summaries, and world events with category filters (icons from V1) and per-category color
  frames (reuse MissionCalendarPanel's CATEGORY_FRAME approach). Lives as the promoted content of
  the Reports tab (Reports remains the tab id — no IA change for mechanics), plus the Attention
  section deep-links into it.
- HazardAlertLayer/FeatureUnlockToast continue as transient toasts; the log is the permanent record.

**Files:** new Outliner.tsx, SituationLog.tsx, lib/game/order-queue.ts (extraction); page.tsx shell
mount + a `focusTarget` piece of *UI* state threaded to MapCommandCenter (extends the existing
`onNavigateTab` pattern); ReportsPanel.tsx absorbs SituationLog.
**Art-gen:** none.
**Phone (<1024px):** no persistent rail (screen budget). Instead: a bottom-edge status strip (28px)
showing Attention count + next ETA; tap → full-screen Outliner sheet (swipe-down to dismiss). Same
component, `variant="sheet"`.
**Perf:** derivations memoized on the same dependency keys the source components already use;
rail renders ≤50 rows (virtualize Holdings with existing `ui/VirtualList.tsx` if needed).
**Accessibility:** `<nav aria-label="Corporate outliner">`, tree rows are real buttons, full
keyboard traversal (arrow keys within sections), collapse state announced. **Effort: L.**
Depends: V1, V2 (rows get HoloTips).

---

### Wave V4 — Map as Persistent Stage + Map Modes + Scene Atmosphere

**The argument for map-as-home, and its correct scope.** The map already *is* home
(`pickInitialTab` → 'map'; MapCommandCenter is full-viewport). The remaining Stellaris delta is that
opening any other tab evicts the map. Full "every panel floats over the live 3D map" is NOT
warranted on phones (no pixels to spare, and a live WebGL scene under a scrolled panel busts the
60Hz budget on mid-tier devices) and is risky for the eight dense hub panels. The warranted scope:

1. **Desktop ≥1280px: panels become overlays over a paused map.** When `tab !== 'map'`, keep
   MapCommandCenter mounted but **frozen** (SolarMap3D already has an `active` prop that halts the
   frameloop — SolarMap3D.tsx:74; extend the same to SolarSystemCanvas) and dimmed (55% black +
   blur-sm), with the tab's panel rendered in the existing `max-w-5xl` column *over* it. Cost of a
   frozen canvas is one retained framebuffer — no per-frame work. Escape / clicking the dimmed
   margin returns to the map. The map stops being "a tab you leave" and becomes the room the
   panels hang in. Mobile + reduced-viewport: current behavior unchanged (full-screen panels,
   map unmounts — identical to today).
2. **Map modes (Stellaris lenses).** Extend the top-center layer toggle (MapCommandCenter.tsx:208)
   with a mode strip: **Standard / Economy / Hazard / Territory / Logistics**. Each mode recolors
   and re-badges existing data — no new data: Economy tints locations by net P&L (dashboard already
   computes per-location figures), Hazard shows forecast telegraphs + risk tint (state.hazardWarnings,
   already rendered), Territory shows zone standing tints at full opacity (W9 tints exist at low
   opacity), Logistics highlights lanes/slots (SpatialStrategyPanel data — the popover stays for
   detail, the lens paints it on the world). Implement as a `mapMode` prop consumed by both
   renderers; the 2D canvas gets the same modes (parity requirement, it's the a11y renderer).
   Modes are keyboard-cyclable (`M` key) and each mode's legend chip states meaning in text.
3. **Scene atmosphere (3D renderer only, capability-gated):** selective bloom on sun + emissive
   pips via `@react-three/postprocessing` (single EffectComposer, ON only when `use3D && dpr>1 &&
   !reducedMotion`, with a quality toggle in the renderer button group); equirect nebula skybox
   (Gemini-generated, V6 asset) at 2k; animated selection reticle (rotating dashed ring shader on
   the selected body — replaces color-only selection); engine-trail sprites on in-transit ships
   using the existing unused `EFFECT_ASSETS.engineTrail`.
4. **Zoom-level information layering:** three LOD bands off camera distance (already tracked for
   sprite scaling): far = region labels only; mid = location names + standing glyphs; near =
   full badge rows + building counts. Sprite labels already exist; this is a visibility gate,
   ~30 lines in the label billboard component.
5. **Galactic layer restage (DOM, kept):** layered parallax starfields (3 divs, `transform:
   translate3d` on pointer/scroll, reduced-motion: static), per-system vista thumbnails behind
   node buttons (V6 art), CSS nebula radial washes per system's canonical color. Defer the WebGL
   galactic rebuild (existing watch-item) — not this spec.

**Files:** MapCommandCenter.tsx (mode strip, freeze/dim shell), page.tsx (overlay branch),
SolarMap3D.tsx (modes, bloom, reticle, LOD, trails), SolarSystemCanvas.tsx (modes), 
GalacticMapView.tsx (parallax + vistas). New dep: `@react-three/postprocessing` (lazy chunk with
the existing dynamic SolarMap3D import — mobile never downloads it).
**Art-gen (via V6):** 1 nebula skybox equirect, 5 interstellar system vistas.
**Phone:** panels full-screen exactly as today; map modes fully available on the 2D canvas with
44px mode buttons in a horizontally scrollable strip; no bloom/parallax under reduced-motion or
<768px. 60Hz preserved: 2D canvas mode recoloring is a per-draw color lookup, no extra passes.
**Accessibility:** modes never color-only (each mode adds/changes text glyphs or badge counts);
mode strip is a radiogroup; frozen-map overlay keeps focus in the panel (map is `inert` while
dimmed). **Effort: L.** Depends: V1; pairs with V3 (outliner deep-links focus the stage).

---

### Wave V5 — Panel Materiality Unification (promote LS + hub surfaces to AAA chrome)

**Player-visible outcome:** no surface looks like it shipped from a different game. Calendar reads
as a mission clock, eras as engraved plaques, training as crew dossiers, debriefs as mission
cinematics, hubs as consoles.

**Build:**
- **Codify the panel taxonomy** in a GameStyles.tsx header comment + 3 wrapper components in a new
  `src/components/game/chrome.tsx`: `<ConsolePanel>` (hud-frame + corner spans + header band w/
  game-label + optional art keyline), `<HoloCard>` (game-panel + hover states), `<DataChip>`.
  New surfaces compose these instead of re-deriving Tailwind stacks (root cause of drift).
- **Promote the six chrome-less hubs** (BuildPanel, ContractsHubPanel, FleetPanel shell,
  MarketHubPanel, StandingsHubPanel, MarketIntelligencePanel): wrap sections in ConsolePanel,
  sub-tab strips get the `.game-tab-active` treatment, headers get the HUD face.
- **MissionCalendarPanel:** add a 14-day horizon strip above the agenda — a horizontal time ruler
  with category-colored event pips (pure CSS/SVG, positioned by `atMs`); pips get HoloTips; agenda
  list stays (it's the accessible representation). Category emoji → V1 icons.
- **CorporateEraPanel:** charter picker cards get faction-plaque treatment (sprite-frame + medal
  iconography from V1 + the era's charter icon rendered as engraved watermark); era history rows
  become `.holo-row` plaques with medal glow (`.rank-medal-*` classes already exist); text floor
  raised per V8.
- **ProgramsPanel:** each queue row renders the enrolled commander's existing portrait
  (`getCommanderPortrait`, commanders.ts:465) in a `.sprite-frame` mount + a channel progress bar
  with `.game-progress-shimmer`; track headers get V1 icons; queue reorder buttons get 44px targets
  (verify — they exist as buttons today).
- **OperationsDebriefModal:** cinematic band picks contextual art — biggest hazard's `EVENT_ART`,
  else region art of the biggest earner, else starfield (extend the `pickNarrativeArt` fallback
  pattern from cinematic-moments.ts); money delta uses AnimatedMoney + a 12-point sparkline of
  away earnings (data already in AwayLedger); hazard rows get 48px event-art thumbnails.
- **AllianceCharterPanel + era/chronicle pages** (`/space-tycoon/chronicle`, `corp/[id]`): same
  ConsolePanel sweep so the public-facing pages match (they're marketing surfaces).

**Files:** new chrome.tsx; edits to the 6 hubs + 5 LS surfaces + chronicle/corp pages; GameStyles.tsx
additions only (no breaking class changes).
**Art-gen:** none new (reuses existing portraits/event art; V6 fills the missing event art it
would display).
**Phone:** ConsolePanel collapses header bands to single-line; horizon strip scrolls horizontally
with snap; portraits cap at 40px; all existing 44px targets preserved.
**Accessibility:** horizon strip is `aria-hidden` (agenda list is the accessible form); plaques
keep text labels for medals (never icon-only). **Effort: M.** Depends: V1 (icons); independent of
V3/V4.

---

### Wave V6 — Entity Art Completion (Gemini batch — runs in parallel)

**Player-visible outcome:** every leader has a face, every event chain has a scene, every faction
has a leader portrait, every region and star system has an identity image. No fallback art on any
surface a player sees weekly.

**Batches** (all via `npx tsx scripts/generate-art.ts --batch <file>.json`; the house-style prefix
is baked into the script — prompts below are the per-item remainder; keep GEMINI_API_KEY from .env;
2s rate limit means ~75 images ≈ 3 min/batch):

| Batch | Count | Output pattern | Prompt style |
|---|---|---|---|
| B1 leader portraits | 20 | `public/game/commander-{id}.webp` | "Portrait bust of a 22nd-century {role} — {name}, {2-line personality from commanders.ts description}, futuristic uniform with subtle {class-color} accents, holographic console light, dark background, painterly sci-fi character art, head-and-shoulders, facing slightly left" — ids/descriptions from commanders.ts W8 block (the 20 listed at :422+) |
| B2 event illustrations | ~32 | `public/game/event-{chainId}.webp` | "16:9 cinematic mission illustration: {one-line scene from the chain-head event text in narrative-events.ts}, wide establishing shot, no characters' faces prominent, volumetric light" — enumerate chain ids missing from `EVENT_ART` (assets.ts:116) |
| B3 faction leaders | 6 | `public/game/faction-leader-{factionId}.webp` | "Portrait of {named leader from docs/LORE.md} of the {faction}, {faction motivation cue}, faction emblem as shoulder insignia, {faction palette}" |
| B4 region banners | 8 | `public/game/region-{regionId}.webp` | "Ultra-wide 21:9 vista of {region: inner system / asteroid belt / lunar / martian / jovian / saturnian / outer system / interstellar}, industrial space infrastructure in middle distance, {region palette from RegionBackdrop.tsx}" — used by V5 ConsolePanel keylines + V4 galactic vistas |
| B5 system vistas | 5 | `public/game/system-{systemId}.webp` | per INTERSTELLAR_SYSTEMS in interstellar.ts — "distant exoplanet system vista of {name}, {known-property flavor}" |
| B6 skybox | 1 | `public/game/skybox-nebula-equirect.webp` (2048×1024) | "Seamless equirectangular 2:1 deep-space panorama, faint cyan and violet nebula wisps on near-black, dim star clusters, VERY low brightness (background element), no bright focal object" |

- After generation: extend `assets.ts` maps (`EVENT_ART`, new `FACTION_LEADER_ASSETS`,
  `REGION_ART`, `SYSTEM_ART`, `SKYBOX`), keeping every consumer's documented null-fallback
  contract. Emit 1536/512/128 sizes for NEW assets via a small sharp script
  (`scripts/resize-art.ts`, mirroring `generate-icons.ts`) — do not block on the 377-image legacy
  backlog (existing deferred watch-item).
- QA gate: eyeball every batch at 100%; regenerate off-style items (Gemini drift is real); webp
  convert + `-q 80` to keep public/game growth < ~15MB total.

**Files:** assets.ts, new resize-art.ts, batch JSONs in `scripts/art-batches/`.
**Phone:** all new art served via next/image with correct `sizes`; portraits ≤128px variant on
mobile surfaces. **Accessibility:** decorative art `alt=""`; portraits get `alt={name}`.
**Effort: M** (mostly wall-clock + curation). Depends: nothing; V4/V5 consume its outputs but
degrade gracefully without them (fallback contracts already exist).

---

### Wave V7 — Order Acknowledgment & World Feedback (juice pass)

**Player-visible outcome:** the world answers you. Dispatch a ship → cyan pulse ring at origin,
route flashes once, engine trail follows it. Build completes → the location beacons on the map and
the outliner row celebrates. Hazard forecast → the region breathes amber. Phone buzzes softly on
completions.

**Build (all cosmetic, all reduced-motion-gated, zero mechanics):**
- **Acknowledgment pings:** a `mapPing(target, kind)` event bus (module-level emitter, same pattern
  as toast.ts) that both renderers subscribe to. Emit from the existing handlers in page.tsx
  (handleBuild, handleDispatchShip, handleLaunchExpedition — call sites only, no logic change).
  3D: expanding ring shader reusing the hazard-ring mesh with cyan/green palette; 2D: canvas arc
  pulse. Auto-expires 1.2s.
- **Completion beacons:** when a building flips `isComplete` or a ship arrives (detectable in the
  existing tick diffing that feeds FeatureUnlockToast/eventLog), ping green at the location +
  `.money-flash` the outliner row (V3) + `playSound('build_complete')` (sound exists).
- **Engine trails:** sprite-trail on in-transit ship markers using `EFFECT_ASSETS.engineTrail`
  (3D: 6-particle sprite ribbon; 2D: fading polyline). Warp-jump flash on expedition departure
  using `EFFECT_ASSETS.warpJump` in GalacticMapView.
- **Haptics:** `navigator.vibrate(10)` on order ack, `[10,40,10]` on completion/hazard — behind a
  new "Haptics" toggle next to the existing mute/music toggles in ResourceBar; default ON only for
  coarse pointers; hard-off under reduced-motion.
- **Tab transition continuity:** replace the blanket `animate-reveal-up` remount with a 120ms
  cross-fade + 8px slide keyed by tab index direction (CSS only). Panels stop "popping."
- **Sound hooks for LS surfaces:** calendar final-hour tick, era medal change sting, program
  completion chime — sounds routed through the existing sound-engine ids where present; add ≤3 new
  synth ids in sound-engine.ts (it's generative — no audio files).

**Files:** new lib/game/map-ping.ts; SolarMap3D.tsx, SolarSystemCanvas.tsx, GalacticMapView.tsx,
page.tsx (emit call sites), ResourceBar.tsx (haptics toggle), sound-engine.ts, GameStyles.tsx
(transition classes).
**Phone:** pings render on the 2D canvas identically; haptics is the mobile-native channel; trails
capped at 3 concurrent on <768px. 60Hz: all effects are fire-and-forget with fixed lifetimes; no
persistent per-frame allocations.
**Accessibility:** every ping has a non-visual twin (sound + outliner/situation-log entry — already
the case since all events log); reduced-motion: pings become a single 200ms opacity blink, trails
off. **Effort: M.** Depends: V4 (stage), V3 (outliner rows), V6 (effect art optional).

---

### Wave V8 — Type Scale, Density Modes & Contrast Floor

**Player-visible outcome:** veterans get denser consoles; novices get calmer ones; nobody squints
at 8px text.

**Build:**
- **Type floor:** sweep `text-[8px]`/`text-[9px]` → 10px minimum for load-bearing text, 11px for
  body (grep-driven; CorporateEraPanel, ProgramsPanel, MapCommandCenter chips are the main
  offenders). Decorative micro-labels may stay 9px only if duplicated by a HoloTip.
- **Density toggle:** `data-density="comfortable|compact"` on the game root, persisted; compact
  tightens ConsolePanel padding + row heights ~20% and reveals extra columns (e.g., market rows
  show volatility inline); comfortable is default and the phone-forced value. Site precedent:
  `src/components/ui/DensityToggle.tsx`. Expose in the ResourceBar settings cluster. Information
  density scaling novice→veteran is a CLAUDE.md canon requirement this finally implements.
- **Contrast audit:** the `text-slate-500`-on-`#050510` pattern (~4.4:1) passes AA at 11px+ but
  fails at current 9px usage — the type floor fixes most; re-check the amber/cyan on-glass chips
  with the existing high-contrast mode and add `[data-contrast="high"]` overrides in GameStyles.tsx
  for the low-opacity chip borders (0.03 washes → 0.12).
- Document the final scale in GameStyles.tsx header: display 18/HUD 12/body 11/label 10/micro 9
  (tooltip-backed only).

**Files:** GameStyles.tsx, chrome.tsx (V5), sweep across game components, ResourceBar.tsx.
**Art-gen:** none. **Phone:** compact mode unavailable <640px (forced comfortable); floor
especially matters here. **Accessibility:** this wave IS the accessibility pass; verify with the
existing high-contrast mode. **Effort: S-M.** Depends: V5 (rides the ConsolePanel sweep).

---

## Part 3 — Constraints Recap (every implementing agent must hold these)

1. **No gameplay changes.** Every wave consumes GameState read-only or re-routes existing handlers.
   If a change would alter a formula, a cost, a timer, or an unlock — it is out of scope.
2. **Mobile parity** per wave as specified; the 2D canvas remains the full-parity renderer and every
   map feature (modes, pings) ships on it, not just the 3D one.
3. **60Hz phone budget:** no new persistent rAF loops outside the existing map renderers; effects
   are fixed-lifetime; postprocessing is desktop-only lazy chunk; frozen-map overlay does zero
   per-frame work.
4. **Reduced-motion / colorblind / keyboard / screen-reader:** every new animation extends the
   GameStyles.tsx guard blocks; no color-only signals (shape/text twin mandatory); every new
   surface keyboard-reachable with real buttons (GalacticMapView is the house pattern).
5. **Build discipline:** local `npx next build` before push (NODE_OPTIONS=--max-old-space-size=4096);
   jest suite must stay green; new components get smoke tests where logic exists (order-queue.ts
   extraction, concepts registry, calendar horizon math).
