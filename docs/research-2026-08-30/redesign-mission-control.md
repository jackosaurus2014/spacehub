# SpaceNexus redesign — Brief B: **Mission Control**

*Senior product design proposal, 2026-08-30. Evidence: live pages fetched and screenshotted at 1440×900 and 390×844 on 2026-08-29 (`$CLAUDE_JOB_DIR/tmp/*.png`), plus the repo at `dev` @ 407d1462. Builds on `docs/ROADMAP_2026-09.md` and `docs/research-2026-08-28/`; nothing from that Rejected list is re-proposed.*

---

## The one-paragraph argument

On 2026-08-29 the homepage copy was rewritten to lead with launches — "Every launch. Live, tracked, explained." — and that was correct. But **the copy changed and the pixels did not.** On `/mission-control` at 1440×900 the first *actual launch* renders at roughly y=1100: above it sit a blue trial banner (40px), a Google Play banner (45px), the nav (55px), a scrolling headline marquee (35px), a breadcrumb (35px), a second news ticker (30px), a 56px left icon rail, a dismissible alerts nudge, a freshness line, a filter bar, and four stat tiles. At 390×844 the same page spends its entire first screen on two banners, a nav, a marquee, a breadcrumb, a second ticker, an H1, a subhead — and then a cookie sheet. **A person who came to watch a rocket has to scroll twice to find one.** Meanwhile the eight commissioned region paintings in `public/game/region-*.webp` are referenced exactly once in the whole codebase (`src/components/game/InterstellarPanel.tsx:72`), and the site's own best-looking page — `/space-tycoon` — proves the house can do cinematic when it tries.

Mission Control is not a re-skin. It is a **budget**: the first 900 desktop pixels and the first 844 mobile pixels of every page belong to the thing that page is about, and everything else has to earn its way back in.

---

## 1. Design principles (5 lines)

1. **The fold belongs to the subject.** A launch page opens on a launch; a company page opens on the company's numbers. Chrome, promos, tickers and breadcrumbs are guests, not residents.
2. **Every number is telemetry.** Monospace, tabular, right-aligned, stamped with its source and its age — data you can quote in a meeting sits three feet from data you can watch on a Sunday night.
3. **Art carries information or it doesn't ship.** Region paintings are the ground the headline and the countdown *sit on*, never a decorative band above them.
4. **Warm on true black.** Ember is the site's only call-to-action colour; cyan means live, green means GO, violet means the game. Colour never carries state alone.
5. **Cinema is opt-out.** Reduced-motion and high-contrast are branches in the design, decided at the same time as the animation — not a `@media` block bolted on afterwards.

---

## 2. Design system

### 2.1 Palette

True black ground, warm neutral ink (the current `#ffffff` on `#000000` is 21:1 and rings — a warm off-white reads calmer at the same size and still clears AAA).

| Token | Hex | Role | Contrast on `--void` |
|---|---|---|---|
| `--void` | `#000000` | page ground | — |
| `--surface` | `#0B0B0C` | console body | — |
| `--elev` | `#141416` | console header, hover ground | — |
| `--hover` | `#1C1C1F` | row hover | — |
| `--line` | `#26262A` | keylines, dividers | non-text (3:1 not required for decorative rules) |
| `--line-2` | `#35353B` | input & button borders | **must** pair with a text label; UI-component contrast met by the label |
| `--line-hot` | `#5A5A63` | hover keyline | — |
| `--ink` | `#F5F3EF` | primary text | **19.0:1** — AAA |
| `--ink-2` | `#B4AFA6` | secondary text, descriptions | **10.4:1** — AAA |
| `--ink-3` | `#8B857B` | labels, timestamps, source lines | **5.7:1** — AA normal. **Floor. Nothing dimmer ships.** |
| `--ember` | `#FF7A18` | primary CTA, T-minus units, active nav | **8.1:1** as text; as a fill it takes `#0A0A0B` label at 8.1:1 |
| `--ember-deep` | `#B34A00` | chart fills, secondary bars | 3.1:1 — **graphics only, never text** |
| `--signal` | `#4FD8E8` | live telemetry values, derived data | **11.3:1** |
| `--go` | `#56F000` | GO / nominal / live pip | **14.2:1** |
| `--caution` | `#FFC53D` | HOLD / regulatory / watch | **12.6:1** |
| `--crit` | `#FF4D4D` | SCRUB / failure / alert | **5.4:1** — AA normal |
| `--violet` | `#9B7BFF` | Space Tycoon, and only Space Tycoon | **5.7:1** |

**Contrast and colourblind notes.** Every status carries a *word* and a *shape*, never colour alone: `GO` / `HOLD` / `SCRUB` / `T−` in JetBrains Mono uppercase, plus a pip (filled circle = live, hollow = scheduled, slash = scrubbed). Green-vs-amber is the classic deuteranopia collision, so GO and HOLD are never adjacent without their labels. `--ember-deep` exists solely so chart bars can sit next to `--ember` bars without a hue-only distinction — the pair also differs by ~2.6× in luminance. `@media (prefers-contrast: more)` lifts `--ink-2 → #DCD8D1`, `--ink-3 → #BCB6AC`, `--line → #3C3C42`; the existing `html.high-contrast` class keeps working by aliasing onto the same tokens.

**What this replaces.** `globals.css:69-71` indigo `#6366f1` / cyan `#22d3ee` become ember / signal. Indigo survives nowhere: it read as "SaaS dashboard", which is exactly the impression the founder's priorities say to shed. `--text-tertiary #949494` and `--text-muted #6b6b6b` collapse into the single `--ink-3` floor — `#6b6b6b` is 3.6:1 and is currently used for the hero trust line (`LandingHero.tsx:295`).

### 2.2 Type — three families, all Google-hosted

Today the site loads **DM Sans + JetBrains Mono + Orbitron from Google, plus five self-hosted Satoshi weights**, three of them `<link rel=preload>`-ed (`layout.tsx:274-276`). Four families, ~200 KB of local woff2, and Orbitron (`--font-hud`) is used on **nine lines, all inside `/space-tycoon`**.

| Role | Family | Spec |
|---|---|---|
| Display | **Space Grotesk** 600/700 | replaces Satoshi. Technical, slightly squared, free on Google Fonts. Kills the `localFont` import and three preloads. |
| Body / UI | **DM Sans** 400/500/700 | unchanged — already loaded, already right. |
| Data / clock | **JetBrains Mono** 400/500/700 | unchanged. `font-variant-numeric: tabular-nums` becomes mandatory on every number. |
| ~~HUD~~ | ~~Orbitron~~ | **cut.** Nine call sites move to Space Grotesk 600 + `0.12em` tracking. |

Scale (fluid, clamped 390→1440):

| Name | Size | Font |
|---|---|---|
| `clock` | `clamp(3.2rem, 7.4vw, 5.6rem)` / 0.92 / −0.03em | JetBrains Mono 700, tabular |
| `display-xl` | `clamp(2rem, 3.6vw, 3.1rem)` / 1.05 / −0.02em | Space Grotesk 700 |
| `display` | `clamp(1.75rem, 2.4vw, 2.25rem)` / 1.1 | Space Grotesk 700 |
| `h2` | `1.375rem` / 1.15 | Space Grotesk 600 |
| `h3` | `1.0625rem` / 1.3 | DM Sans 600 |
| `body` | `1rem` / 1.6, measure 68ch | DM Sans 400 |
| `body-sm` | `0.875rem` / 1.55 | DM Sans 400 |
| `data-lg` | `1.875rem` / 1.1 tabular | JetBrains Mono 700 |
| `data` | `0.9375rem` tabular | JetBrains Mono 400 |
| `overline` | **`0.6875rem` (11px)** / 0.14em / uppercase | DM Sans 500 |

**11px is the floor and it is enforced.** `LandingHero.tsx` currently ships `text-[10px]`, `text-[9px]`, `text-[8px]` and `text-[7px]` (the "SPACE DATA" badge at line 274 is *seven pixels*). Those are not small — they are unreadable, and they are the reason the hero's right column reads as decoration rather than data.

### 2.3 Spacing and grid

4px base. Steps: **4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128**. Nothing off-scale.

- Container `max-width: 1320px`, gutter 24px desktop / 16px at ≤860px.
- 12 columns, 24px gutters. Standard page: 8-col content + 4-col rail. Prose: 68ch, centred in the 8.
- Section rhythm: 64px vertical desktop / 40px mobile. Sections are separated by a **1px `--line` rule under the section header**, not by 96px of emptiness — density is the point, whitespace is the seasoning.
- Radius: 12px consoles, 8px buttons/inputs/tiles, 6px badges, 999px pills. (Today the site mixes `rounded`, `rounded-lg`, `rounded-xl`, `rounded-2xl` and `rounded-3xl` on one page.)

### 2.4 Component inventory

| New component | What it is | Maps to / replaces |
|---|---|---|
| **Console** | The one card. 1px `--line`, radius 12, `--surface` body, optional `--elev` header strip carrying an overline label left + status/meta right. | Collapses `.card`, `.card-elevated`, `.card-data`, `.card-content`, `.card-terminal`, `.card-nebula/-cyan/-amber/-emerald` (`globals.css:463-760`) and `ui/GlassCard.tsx` + `ui/TerminalPanel.tsx`. **The macOS traffic-light dots go** (`.card-terminal__dot--red/amber/green`, `globals.css:585-587`): three fake window buttons are a Mac, not a console. |
| **Button** — Ember / Line / Bare | Ember `#FF7A18` fill + `#0A0A0B` label; Line 1px `--line-2`; Bare text + ember underline on hover. 44px min target. | `.btn-primary` / `.btn-secondary` / `.btn-ghost` (`globals.css:410-460`) — recolour + one padding change, no API change. |
| **DataTable** | Sticky header, `--line` row rules, numeric columns right-aligned + tabular, whole row is the link, hover `--hover`. | Keeps `ui/MobileTableView.tsx` and the `.table-cards` breakpoint (`globals.css:1119`) as the ≤640px behaviour. |
| **ChartFrame** | Title + one-line "what this shows" + the SVG from `/api/chart/[slug]` + a footer strip: as-of, source, permalink, PNG. | Wraps existing `src/lib/charts/`; composes `ui/DataAsOf.tsx`, `ui/SourceCitation.tsx`, `ui/ExportButton.tsx`. Retires the four near-duplicate freshness components (`DataFreshness`, `DataFreshnessBadge`, `DataFreshnessIndicator`, `LastUpdated`) down to `DataAsOf`. |
| **Nav** | One 60px row: 5 menus + game pill + search + bell + account. | `src/components/Navigation.tsx` (989 lines) — see §3. |
| **RegionBand** *(new)* | Full-bleed region art + bottom-up scrim + overlaid headline, telemetry rail and CTA. The art is *behind* the content, always. | **Replaces `ui/HeroArt.tsx`**, which renders a 3:1 decorative band *above* the H1 with `alt=""` — on `/rockets` and `/guide/space-launch-cost-comparison` it is 375px of near-black that carries nothing and pushes the answer off screen. |
| **Telemetry** *(new)* | `overline` label / mono value / optional unit + delta. | Absorbs the ad-hoc `DataCard` inside `LandingHero.tsx:39-58` and the four `.card-data__*` classes. |
| **StatusPip** *(new)* | Word + shape + colour: `GO`, `HOLD`, `SCRUB`, `LIVE`, `T−`. | Unifies `.badge-live`, `.live-badge`, and the hand-rolled `animate-ping` dots scattered through `page.tsx:341` and `LandingHero.tsx:227`. |
| **Countdown** *(new)* | The clock. `aria-label` in words, `aria-live="off"` (a per-second live region is a screen-reader denial of service), ember unit suffixes. | New; the countdown logic already exists in `LandingHero.tsx:97-108`. |

Kept as-is: `ui/Skeleton.tsx`, `ui/EmptyState.tsx`, `ui/Toast.tsx`, `ui/Modal.tsx`, `ui/Tooltip.tsx`, `ui/AutoBreadcrumb.tsx`, `ui/MobileTableView.tsx`, `ui/DataAsOf.tsx`, `ui/SourceCitation.tsx`.
Retired: `GlassCard`, `TerminalPanel`, `HeroArt`, `AnimatedPageHeader`, `StarField` (decorative CSS starfield on top of real photography is noise), `IndustryTicker`, `DensityToggle` (the density is the design), and the three surplus freshness components.

---

## 3. Navigation model

### Today
Nine top-level controls — Live · Launches▾ · News▾ · Markets▾ · Business▾ · Learn▾ · Jobs · Space Tycoon · Pricing — plus Upgrade, Search, Bell, Sign In, Get Started. At 1440px this **wraps onto two lines**: "Space Tycoon" and "Sign In" both break mid-phrase (visible in every desktop screenshot). Below it sits a marquee ticker, and beside it a 56px left rail of ~20 unlabelled emoji icons (`QuickAccessSidebar`) — a third navigation nobody asked for. On module pages a *fourth* appears: the "19 of 42 modules · Previous / Next" carousel, which still renders at the very top of `/company-profiles` because `useModuleNavigation.ts:57` never got the exclusion the roadmap asked for.

### Proposed — one row, six destinations, three utilities

```
[● SpaceNexus LIVE]  Launches  News  Markets  Business  Learn        (Space Tycoon)  [⌕ Search ⌘K] [🔔] [Sign in]
```

**Removed from the bar**
- **Live** → the green pip beside the wordmark. It lights when something is streaming and links to `/live`. A permanent "Live" link that is usually not live is a lie told 23 hours a day.
- **Pricing** → footer + account menu. Monetization is on hold until November; a paywall link is the second-most-prominent word on an enthusiast site's masthead.
- **Upgrade** button → deleted from global chrome. Upgrade prompts live on `/pricing` and inside the Pro-gated tools themselves.
- **Jobs** → into **Business**, first row. It stays one click away and keeps its 6,500 listings; it does not need masthead real estate that the launch board doesn't have.
- **TrialBanner** (`layout.tsx:297`) and the Play Store **AnnouncementBanner** (`:298`) → gone from every page. Together they are 85px of the top of every screen at 1440 and ~190px at 390. The Play-Store ask belongs in the footer and in one dismissible-forever card on `/about`.
- **IndustryTicker** (`layout.tsx:301`) → gone. A horizontally scrolling marquee under the nav on **every page** is motion with no destination and is the single worst reduced-motion offender on the site.
- **QuickAccessSidebar** (`layout.tsx:302`) → gone. Its function is `⌘K`.
- **ModuleNavBar / SwipeModuleNavigation** (`layout.tsx:304`) → gone. Browsing "3 of 42 modules" is site-map navigation, not user navigation; `/tools` does this better.

**Merged / demoted inside the menus.** Each menu drops from 7–8 rows to **5 + "Everything in X →"** (which is already the pattern, `Navigation.tsx:41-46` — this just tightens `nav: true` in `src/lib/site-directory.ts`):

| Menu | Keeps (5) | Demoted to `/tools` |
|---|---|---|
| **Launches** | Mission Control · Rockets · Launches by Site · Starship · Satellite Tracker | Artemis, What's Overhead, Predictions *(all three keep their cross-links from launch pages — that is where they convert)* |
| **News** | News Feed · Blog · AI Insights · M/Th Digest · Charts | Podcasts, Space Defense |
| **Markets** | Space Stocks · Company Profiles · Startups & Pre-IPO · Funding & M&A · Compare | Investors |
| **Business** | **Jobs** · Contracts & Opportunities · Regulatory Radar · Compliance Hub · Service Providers | Hire Talent *(it is a seller-side page; it belongs next to Jobs on `/jobs`, not in the menu)* |
| **Learn** | Learning Zone · Guides · Cost to launch · Build Guides · Glossary | Compare *(duplicated from Markets — one entry, one home)*, Space History |

**`/tools` is unchanged and becomes the only long-tail surface.** 129 entries, 8 groups, searchable — it already works. It gains one job: it is now linked from the footer of every page and from the last row of every menu, and it is the *only* place the Engineering & Operations (31) and Reference & Data (13) groups appear. That is the deal that lets the menus stay at five.

Net: **9 top-level controls → 6 + 3 utilities**, four navigation systems → two (menus + `⌘K`), and ~240px of pre-content chrome → 60px.

---

## 4. Page templates

### 4.1 Homepage — the next launch *is* the homepage

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ●SpaceNexus LIVE  Launches News Markets Business Learn  (Tycoon) ⌕ 🔔 ▸  │ 60px, sticky
├───────────────────────────────────────────────────────────────────────────┤
│░░ region art: inner_system.webp, full-bleed, scrim bottom→top ░░░░░░░░░░░░│
│                                                                           │
│  ┌ GO ┐ Weather 80% favourable · window opens 04:12 UTC                   │ ① StatusPip: word+shape+colour
│  Falcon Heavy · LC-39A                                                    │ ② vehicle + pad, ink-2
│  ██ Nancy Grace Roman Space Telescope ██                                  │ ③ display-xl, the MISSION not a slogan
│  NASA's next great observatory. Sunday 31 Aug, 00:12 EDT from KSC.        │
│                                                                           │
│  ████ T−13h 04m 22s ████     PAYLOAD    ORBIT       BOOSTER    SLIPPED    │ ④ clock 5.6rem mono + 4 Telemetry
│                              4,166 kg   Sun–Earth   B1096·f4   2× since   │    (SLIPPED is our proprietary data,
│                                         L2                     Jun        │     on the front page from day one)
│  [ Watch live → ]  [ Remind me at T−1h ]  No account needed. One email    │ ⑤ ember + line. The alert ask is
│                                            at T−24h, one at T−1h, one     │    the conversion event, not signup.
│                                            if it scrubs.                  │
├───────────────────────────────────────────────────────────────────────────┤
│ T−1d 08h │ T−3d 01h │ T−1d 11h │ T−6d 04h │ 100 events                    │ ⑥ next-five rail, welded to the
│ Starlink │ Long Mar │ RFA One  │ Mir      │ Every upcoming launch →       │    hero. Horizontal scroll on mobile.
├───────────────────────────────────────────────────────────────────────────┤
│ On the pad now ──────────────────────────────── All live streams →        │
│ ┌─ LIVE  27 watching ─┐ ┌─ NEXT 48 HOURS  4 ─┐ ┌─ SLIPS PER WEEK ──────┐ │ ⑦ three Consoles.
│ │ [ 16:9 stream     ] │ │ T−13h Roman        │ │  ▁▄▂█▅█▃▆              │ │    Left = the thing to watch.
│ │ Starbase Live Rover │ │ T−27h Starlink 11-9│ │  8 wks ago    this wk  │ │    Right = the thing only we have.
│ └─────────────────────┘ └────────────────────┘ └───────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────┤
│ The industry today ─────────── Everything on SpaceNexus — 129 tools →     │ ⑧ the business half. One row of
│ [16,412 sats ] [318 companies] [$199.2B 12mo] [Space weather: Quiet]      │    Telemetry tiles, each a link.
│ [ Firefly: launch  ] [ The ITAR change     ] [ Roman could map the      ] │ ⑨ 3 news Consoles, category chip
│ [ vehicle shortage ] [ nobody read         ] [ entire sky              ] │    carries colour + word.
├───────────────────────────────────────────────────────────────────────────┤
│░░ region art: asteroid_belt.webp ░ SPACE TYCOON — violet ░░░ [Play free] ░│ ⑩ the game, once, in its own colour
├───────────────────────────────────────────────────────────────────────────┤
│ The M/Th Digest ······················· [ you@company.com ] [Subscribe]   │ ⑪ one line, no modal
└───────────────────────────────────────────────────────────────────────────┘
```

**Deleted from `src/app/page.tsx`:** `KPIStrip`, `BentoFeatures`, `DemoShowcase`, `HowItWorks`, `SocialProof`, `PersonaPicker`, `PersonaAwareSpaceTycoon`, `FloatingCTA`, `ModuleContainer` ("Your Dashboard" — a personalisation carousel shown to logged-out strangers), `SpacePhotoOfDay` (it moves to `/news`), `AdSlot`, and `HomeScrollManager` (a component whose job is to auto-scroll the page away from the hero we just spent this whole document defending). That is **twelve of fourteen sections**. What survives is the hero, the launch board, live, one row of industry telemetry, three stories, the game, the digest.

### 4.2 Launch page — `/launch/[eventId]`

```
┌─ nav ─────────────────────────────────────────────────────────────────────┐
│░░ region art keyed to destination (LEO→inner_system, Moon→lunar, …) ░░░░░░│
│  ┌ GO ┐ · T−13h 04m 22s ····························· [Watch] [Remind]   │ ① same hero grammar as home.
│  Nancy Grace Roman Space Telescope · Falcon Heavy · LC-39A               │    Recognition beats novelty.
├───────────────────────────────────────────────────────────────────────────┤
│ ┌─ THE MISSION ───────────────────────┐ ┌─ SCHEDULE HISTORY ───────────┐ │ ② left 8 cols: what/why, 68ch prose
│ │ 4,166 kg to Sun–Earth L2. Roman's   │ │ 12 Jun → 04 Aug   +53d       │ │ ③ right 4: the slip table. This is
│ │ field of view is 100× Hubble's…     │ │ 04 Aug → 31 Aug   +27d       │ │    LaunchDateChange, live, and it is
│ │                                     │ │ observed by SpaceNexus       │ │    the reason to bookmark us.
│ ├─ WATCH IT ──────────────────────────┤ ├─ WEATHER ────────────────────┤ │
│ │ [ stream embed ] + viewing guide:   │ │ 80% favourable · cumulus     │ │
│ │ Cape Canaveral, Orlando, Titusville │ │ rule is the constraint       │ │
│ ├─ THE VEHICLE ───────────────────────┤ ├─ SET AN ALERT ───────────────┤ │ ④ the no-account capture, sticky
│ │ Falcon Heavy · $97M · 63.8t LEO ·   │ │ [ email             ] [Go]   │ │    on desktop, inline on mobile
│ │ 11 flights · 100% success  → /rockets│ └──────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────────┤
│ NEXT → Predict this launch · Track after liftoff · Every Falcon Heavy     │ ⑤ RelatedModules rail (roadmap #12)
└───────────────────────────────────────────────────────────────────────────┘
```
After liftoff the same page flips: StatusPip → `FLEW` / `SCRUB`, the clock → `T+3h 12m`, and the mission block gains the debrief. **One URL, three states** — which is also what makes the OG card worth sharing in a group chat.

### 4.3 Company page — `/company-profiles/[slug]`

```
┌─ nav ─────────────────────────────────────────────────────────────────────┐
│ ROCKET LAB USA · RKLB                          [ ★ Watch ] [ Compare → ]  │ ① no region art here. A company
│ Long Beach, CA · founded 2006 · public (Nasdaq)                           │    page opens on numbers, not sky.
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┐                 │ ② Telemetry row, mono, tabular,
│ │ $12.4B   │ 71       │ 94.5%    │ $436M    │ 2,100    │                 │    each with source+as-of on hover
│ │ MKT CAP  │ LAUNCHES │ SUCCESS  │ REV TTM  │ STAFF    │                 │
│ └──────────┴──────────┴──────────┴──────────┴──────────┘                 │
│  as of 29 Aug 2026 · Yahoo Finance, SpaceNexus launch tracker             │ ③ provenance is a first-class line
├─────────────────────────────────────────┬─────────────────────────────────┤
│ ┌─ LAUNCH CADENCE ────────────────────┐ │ ┌─ OPEN ROLES ── 34 ─────────┐  │ ④ ChartFrame, our own data
│ │  ▁▂▄▃▅▇▆█    24 mo, attempts/quarter│ │ │ Avionics Eng · Long Beach  │  │ ⑤ the jobs machine, on the page
│ │  [permalink] [PNG] source: SpaceNexus│ │ │ …            → all 34 →    │  │    where a jobseeker actually is
│ ├─ VEHICLES ──────────────────────────┤ │ ├─ FUNDING & M&A ────────────┤  │
│ │ Electron  $7.5M   300 kg   94.5%    │ │ │ 2021 SPAC $777M            │  │ ⑥ DataTable: right-aligned nums,
│ │ Neutron   $50M    13,000kg  —       │ │ │ 2024 acq. SolAero $80M     │  │    whole row links to /rockets/…
│ ├─ CONTRACTS ─────────────────────────┤ │ ├─ IN THE NEWS ──────────────┤  │
│ │ NSSL Phase 3 Lane 1 · USSF · $5.6B  │ │ │ 3 stories, 30d             │  │
│ └─────────────────────────────────────┘ │ └────────────────────────────┘  │
└─────────────────────────────────────────┴─────────────────────────────────┘
```
Note what is **not** here: the module carousel that currently occupies the top 180px of `/company-profiles`, and the "61% Avg Completeness" tile — an internal data-quality metric shown to visitors as if it were industry intelligence.

### 4.4 Guide — `/guide/[slug]`

```
┌─ nav ─────────────────────────────────────────────────────────────────────┐
│ Home / Guides / Launch cost comparison                    ← ONE breadcrumb │ ① today this page renders TWO —
├───────────────────────────────────────────────────────────────────────────┤    global AutoBreadcrumb (layout:305)
│ ██ What does it cost to launch a kilogram to orbit in 2026? ██            │    + a hand-rolled nav at :150
│                                                                           │ ② question-shaped H1
│ ┌─ THE ANSWER ────────────────────────────────────────────────────────┐   │ ③ THE ANSWER IS ABOVE THE FOLD.
│ │  $1,520 /kg to LEO   ·  Falcon 9 rideshare, list price, Aug 2026    │   │    Today: art band + centred H1,
│ │  Cheapest: Transporter $6,500/kg for a 50kg slot                    │   │    zero information in 900px, on
│ │  Range across 14 operational vehicles: $1,520 – $54,500 /kg         │   │    the site's top-traffic page.
│ └─ source: SpaceNexus launch-vehicle DB · updated 29 Aug 2026 ────────┘   │
│                                                                           │
│  ┌─ ChartFrame: $/kg by vehicle ──────────┐  ┌─ ON THIS PAGE ─────────┐   │ ④ chart before prose
│  │ ▇▇▇▇▇▇▇ Starship (projected)          │  │ · The answer            │   │ ⑤ TOC sticky ≥1024px only
│  │ ▇▇▇▇    Falcon 9                      │  │ · How we price it       │   │
│  └───────────────────────────────────────┘  │ · Every vehicle         │   │
│                                             └────────────────────────┘   │
│  Prose, 68ch measure, DataTable for the 14 vehicles ──────────────────    │
│  ┌─ region art: inner_system, 16:9, WITH a caption that says something ─┐ │ ⑥ art appears mid-article as a
│  └──────────────────────────────────────────────────────────────────────┘ │    breather, never before the answer
│  NEXT → Cost to launch a CubeSat · Cost per seat · Next Falcon 9 launch   │ ⑦ RelatedModules
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Game landing — `/space-tycoon`

The current page is the best-looking thing on the site and needs the least work. Two changes:

```
┌─ nav (game chrome: violet pip, no site menus once you're in a session) ───┐
│░░ full-bleed region art, rotates by the player's furthest region ░░░░░░░░░│
│  EPOCH 2 · DAY 5 · 1,204 corporations                                     │ ① live state, not a slogan
│  ██ Space Tycoon ██                                                       │
│  An economic space MMO with no combat.                                    │
│  [ Play free in your browser → ]   [ How it plays ]                       │ ② one primary CTA. Today "New
│                                                                           │    Game" fires straight into a
│  240+ tech · 39 buildings · 8 regions · No pay-to-win, ever               │    save with no idea what it is.
├───────────────────────────────────────────────────────────────────────────┤
│ ┌ inner_system ┐┌ asteroid_belt ┐┌ lunar ┐┌ martian ┐┌ jovian ┐ … 8 tiles │ ③ THE EIGHT REGIONS AS A GRID.
│ │ [art]        ││ [art]         ││ [art] ││ [art]   ││ [art]  │           │    This grid is also the visual
│ │ LEO/GEO      ││ Ceres · PGMs  ││ ice   ││ ISRU    ││ He-3   │           │    key the rest of the site borrows.
│ └──────────────┘└───────────────┘└───────┘└─────────┘└────────┘           │
├───────────────────────────────────────────────────────────────────────────┤
│ TOP CORPORATIONS RIGHT NOW  #1 … #5           Full leaderboard →          │ ④ proof it's alive at 450 MAU
└───────────────────────────────────────────────────────────────────────────┘
```

**The eight-region grid is the site's visual Rosetta stone.** Once a visitor has seen it here, `region-lunar.webp` behind an Artemis launch, `region-martian.webp` behind the Mars planner, and `region-asteroid_belt.webp` behind space-mining all read as one world rather than as stock imagery. Mapping: inner_system → LEO/GEO/Earth-launch surfaces; lunar → Artemis, cislunar, `/whats-overhead`; martian → Mars planner, Starship-to-Mars; asteroid_belt → space mining, ISRU, asteroid watch; jovian/saturnian → outer-planet missions; outer_system → deep space, New Horizons-class; interstellar → the game's end-game and `/solar-exploration`.

---

## 5. Motion and states

**Motion budget.** Three things move on a page. That's the budget.

| Element | Motion | Reduced-motion |
|---|---|---|
| Live pip / LIVE tag | 2.4s opacity blink 1 → 0.35 | static, full opacity, still labelled `LIVE` |
| Countdown | seconds tick (text change only, no transform) | unchanged — a clock that stops is a broken clock |
| Hover | 120ms `border-color` + `background` | colour transitions are vestibular-safe; kept |
| Page entry | none | none |
| ~~Staggered reveal~~ | **cut.** `LandingHero.tsx` fires nine `Reveal` components on delays from 0.15s to 0.95s — the hero assembles itself for a full second while a visitor waits to see a countdown. | — |
| ~~Marquee ticker~~ | **cut** (`IndustryTicker`) | — |
| ~~Star drift~~ | **cut** (`StarField`, three parallax layers) | — |
| ~~Count-up numbers~~ | **cut.** `AnimatedCounter` and `KPIStrip` animate via `requestAnimationFrame` and have **no `prefers-reduced-motion` guard at all** — the CSS clamp at `globals.css:318` only reaches CSS animations, so these keep animating for users who asked them not to. | — |

`@media (prefers-reduced-motion: reduce)` sets `animation: none` and `transition: none` globally, and **every JS-driven animation reads `matchMedia('(prefers-reduced-motion: reduce)')` and renders its final value immediately.** That check goes in one hook, `useReducedMotion()`, and lands in `Countdown`, `StatusPip`, and anything that survives from `landing/`.

**Loading.** Skeletons match the final layout's box, keyline and radius exactly — never a grey slab where a console will be (compare `page.tsx:15`, whose loading state is a 3xl rounded blob for a component that isn't 3xl-rounded). The countdown renders `T−--h --m --s` in the final type size, so the hero never reflows. Skeleton shimmer already respects reduced-motion (`globals.css:1113`).

**Empty.** Every empty state answers *why* and offers *where next*. "No launches in the next 48 hours" → "The next one is Roman, in 13 hours. [Every upcoming launch →]". `ui/EmptyState.tsx` already supports `suggestions` — it should be mandatory, and the astronaut illustration should be reserved for genuinely empty *user* collections (watchlists, alerts), not for data outages.

**Error.** Distinguish *we are broken* from *the source is stale*. A failed fetch renders the console with a `--caution` header strip, the last known value greyed with its timestamp, and one retry button — never an empty card and never a silent fallback to a made-up number (`LandingHero.tsx:183` currently falls back to a hardcoded `$2.1B` labelled "(est.)" when the funding API fails, and `:191` to `$2.1B` "Q1 (est.)" — two different fabricated figures for the same tile).

**Focus.** `:focus-visible` = 2px ember, 2px offset, on everything including whole-row table links. Keyboard order follows visual order; the hero's Watch/Remind pair is the second and third tab stop after Skip.

---

## 6. Mobile — what changes at 390px

The current mobile Mission Control spends **300px on two promo banners before the nav even starts**, and its first screen contains no launch. Fixed by §3 alone. Beyond that:

- **Nav collapses to wordmark + pip + bell + burger.** Search moves into the sheet (a 13px "Search ⌘K" affordance on a phone is theatre). No pill, no menus, no utilities.
- **Hero re-flows, does not shrink.** Clock drops to 3.4rem and stays the largest thing on screen. Telemetry goes 4-across → 2×2. Both CTAs go full-width, stacked, ember first, 48px tall. Verified in the mockup: status, mission, date, clock, all four telemetry pairs, both CTAs *and* the first two entries of the next-five rail fit in 844px.
- **The next-five rail scrolls horizontally** with 168px cards and a visible partial fifth card as the affordance. Momentum scroll, no JS carousel.
- **Every grid → one column** except telemetry tiles, which go 2×2 (a 390px single-column stack of four numbers is 400px of scrolling for four facts).
- **Tables → `MobileTableView`** cards, already built. Numbers stay mono and tabular so columns still align inside the card.
- **`MobileTabBar` survives** — Home / Launches / News / Tycoon / More. It replaces "Events" with "Launches" to match the new menu, and "Dashboard" with "Tycoon" (the game is the only surface averaging 5+ views/user).
- **Cookie banner becomes a bottom sheet of ~120px**, not the 260px block currently covering the entire lower third of every first screen.
- Touch targets ≥44px; the 8–10px text in the current hero simply cannot exist at the 11px floor.

---

## 7. Migration plan

### Phase 1 — Give the fold back (4 days, no new design system)
Pure deletion and re-ordering. Ships alone, measurable alone, and reversible in one revert.

| Change | Files |
|---|---|
| Remove `TrialBanner`, `AnnouncementBanner`, `IndustryTicker`, `QuickAccessSidebar`, `ModuleNavBar`, `SwipeModuleNavigation` from global chrome | `src/app/layout.tsx:297-304` |
| Add `/company-profiles`, `/guide`, `/blog`, `/news` to the carousel exclusions (roadmap #6, never finished) | `src/hooks/useModuleNavigation.ts:57` |
| Fix duplicate breadcrumbs: pages hand-roll a second `<nav aria-label="Breadcrumb">` while `AutoBreadcrumb` is already global at `layout.tsx:305` | `src/app/rockets/page.tsx:45-47`, `src/app/guide/space-launch-cost-comparison/page.tsx:150`, `src/app/guide/how-satellite-tracking-works/page.tsx:158`, `src/app/guide/commercial-space-economy/page.tsx:141` — grep `aria-label="Breadcrumb"` |
| Fix the mobile headline: `Every launch.Live, tracked,explained.` — the `<br className="hidden sm:block">` leaves no space at <640px, so the site's most important line is broken at 390px today | `src/components/LandingHero.tsx:226-230` |
| Delete `KPIStrip`, `BentoFeatures`, `DemoShowcase`, `HowItWorks`, `SocialProof`, `PersonaPicker`, `PersonaAwareSpaceTycoon`, `FloatingCTA`, `ModuleContainer`, `AdSlot`, `HomeScrollManager` from the homepage | `src/app/page.tsx` (494 → ~180 lines) |
| Nav to one row; Live→pip, Pricing/Upgrade→footer, Jobs→Business | `src/components/Navigation.tsx`, `src/lib/site-directory.ts` (`nav: true` trim) |
| `useReducedMotion()` hook; wire into `AnimatedCounter`, `ScrollReveal` | `src/hooks/useReducedMotion.ts` (new), `src/components/ui/*` |
| Cookie banner → bottom sheet | `src/components/ui/CookieConsent.tsx` |

**Effort: 4 days.** Expected effect: ~240px of desktop chrome and ~300px of mobile chrome returned to content on every page on the site.

### Phase 2 — The system and three templates (7 days)

| Change | Files |
|---|---|
| Token swap: ember/signal/ink palette, 11px floor, radius set | `src/app/globals.css:37-115`, `tailwind.config.ts` |
| Fonts: Space Grotesk in, Satoshi + Orbitron out, preloads removed | `src/app/layout.tsx:2,75-90,273-276`, `globals.css:117-150`, 9 `font-hud` call sites |
| `Console`, `Button`, `Telemetry`, `StatusPip`, `Countdown`, `RegionBand`, `ChartFrame` | `src/components/ui/` (new); delete `GlassCard`, `TerminalPanel`, `HeroArt`, `StarField` |
| Card-class collapse (`.card-*` → `.console`) with a codemod-able alias layer so the ~120 existing call sites keep rendering while they migrate | `globals.css:463-760` |
| Homepage template per §4.1 | `src/app/page.tsx`, `src/components/LandingHero.tsx` → `src/components/home/NextLaunchHero.tsx` |
| Launch page template per §4.2, incl. slip-history panel on `LaunchDateChange` | `src/app/launch/[eventId]/*` |
| Guide template: answer-block above the fold, art moved below | `src/app/guide/[slug]/*`, `src/lib/guide-*` |

**Effort: 7 days.**

### Phase 3 — Region language and the long tail (5 days)

| Change | Files |
|---|---|
| `regionForRoute()` map + `RegionBand` on the ~30 top surfaces | `src/lib/game/assets.ts` (extend `REGION_ART` export out of `game/`), new `src/lib/region-art.ts` |
| Company + markets templates per §4.3; retire the "Avg Completeness" tile | `src/app/company-profiles/*`, `src/app/space-stocks/*`, `src/app/startups/*` |
| Game landing: 8-region grid, live epoch state, "How it plays" secondary CTA | `src/app/space-tycoon/page.tsx`, `/about` |
| Freshness component consolidation (4 → `DataAsOf`) | `src/components/ui/DataFreshness*.tsx`, `LastUpdated.tsx` |
| A11y sweep: focus-visible audit, keyboard path through hero/nav/tables, `aria-label` on countdown and slip charts, colourblind pass on every StatusPip | across |
| Full-page visual regression at 390/768/1440 on 12 templates | `scripts/` + Puppeteer |

**Effort: 5 days. Total: 16 days.**

---

## 8. Risks, and what I would cut first

**Risks**

1. **Deleting eleven homepage sections deletes the funnel someone built on purpose.** `HowItWorks`, `SocialProof` and `DemoShowcase` are conversion furniture for a 14-day trial that is on hold until November. If a Pro signup number falls, this is why. Mitigation: keep them, moved intact, on `/pricing` — where a person who has decided to evaluate the product actually is.
2. **SEO regression on the guide pages.** They carry 54k impressions/28d. Moving the H1 up and the art down changes the rendered text order. Mitigation: the answer block *adds* an answer-shaped paragraph above the fold, which is what featured snippets want; ship it on one guide first and hold two weeks of Search Console before the other fifteen.
3. **Ember-on-black at 8:1 is aggressive over photography.** Region art is bright in places (`region-jovian.webp` is the brightest). Mitigation: the scrim is a hard requirement in `RegionBand`, tested per-image, and the CTA never sits on unscrimmed art.
4. **`.card-*` collapse touches ~120 call sites.** Mitigation: the alias layer in Phase 2 means nothing breaks on the day of the swap; migration is opportunistic afterwards.
5. **Killing the module carousel removes the only crawl path some of the 129 surfaces have.** Mitigation: `/tools` is already in the sitemap and already links all 129; verify before, not after.
6. **The founder likes the terminal chrome.** The mac dots and `spacenexus:~/dashboard` paths are a deliberate motif. I am arguing they read as *developer tool* when the goal is *mission control*. If that call goes the other way, the Console header strip can carry the path label — it just cannot carry three fake window buttons.

**What I cut first, in order**

1. **Phase 3 entirely.** Region art everywhere is the most beautiful part of this proposal and the least load-bearing. Phases 1–2 fix what is broken; Phase 3 makes it feel like one world.
2. **The font change.** Satoshi is not the problem. Keeping it saves a day and removes risk 3's cousin (a reflow across every page). Space Grotesk is a preference; the 11px floor and the tabular numbers are not.
3. **The company and guide templates.** Fold their two ideas — the answer above the fold, the provenance line under the numbers — into the existing layouts and skip the rebuild.
4. **The palette swap.** Indigo→ember is the loudest change and the smallest functional one. The contrast floor (`--ink-3`, 11px) can ship against the existing indigo.

**What I would not cut under any circumstances:** Phase 1. It is four days, it is deletion, and it is the entire argument. Every finding in this document is downstream of the fact that a visitor who came to watch a rocket has to scroll past a trial banner, an app-store banner, a marquee, an icon rail and a module carousel to find one.
