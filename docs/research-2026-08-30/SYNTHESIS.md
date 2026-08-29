# SpaceNexus redesign — synthesis and decision

*Design lead's call, 2026-08-29. Inputs: three redesign briefs (`redesign-terminal.md`, `redesign-mission-control.md`, `redesign-editorial.md`), 51 verified audit findings (`audit-findings.json`), three judge lenses (`judge-scores.json`). Builds on `docs/ROADMAP_2026-09.md` and `docs/research-2026-08-28/`; nothing on the roadmap's Rejected list is re-proposed.*

---

## 1. The direction: **Mission Control**, with two named grafts

**Winner: Brief B — Mission Control.** Enthusiast lens 9, feasibility lens 8, industry lens 7. It lost the industry lens to Terminal and won the other two.

### Why

The site's diagnosis is not contested by anyone. All three briefs, all three judges and the audit agree on the same facts, and I re-verified the load-bearing ones:

- The homepage is **11,045px on desktop and 15,667px on mobile**. A visitor who came to watch a rocket scrolls past a trial banner, a Play-Store banner, a marquee, an icon rail and a module carousel before finding one.
- `src/app/mission-control/page.tsx:1` and `src/app/company-profiles/page.tsx:1` are both `'use client'`. The two most valuable pages on the site ship an empty shell to crawlers and slow phones.
- `src/components/LandingHero.tsx:171-172` and `:177-179` **fabricate a `$2.1B` funding figure on API failure**, under two different labels, in the same tile format as the real numbers.
- `src/components/Navigation.tsx:461` and `:693` point the persistent "Jobs" link at `/space-talent`, which defaults to the Talent tab. The ~6,500-listing board the 06:30 cron fills is two clicks behind a workforce chart.

Given that shared diagnosis, the decision is about **prescription cost and audience order**, and Mission Control wins on both:

1. **It stays on a dark ground.** Of 1,497 `.tsx` files, **929 hardcode `text-white`, 903 hardcode `bg-white/[…]`, 765 hardcode `text-slate-400`, and only 58 read `var(--text-*)`.** Editorial's paper ground needs a Tailwind-utility override layer across that estate — the brief itself calls it "debt with a named owner" and pre-authorises abandoning it. When a proposal names its own escape hatch, the escape hatch is the plan. We take the escape hatch directly: **warm ink, dark, one ground.**
2. **Its Phase 1 is four days of pure deletion in two files**, ships alone, is measurable alone, reverts in one commit, and requires none of its own design system. Nothing else in the set has that property at that price for one founder plus an AI.
3. **It is enthusiast-first, which is the founder's stated order.** Terminal is the better instrument and the better return-visit page, and I am taking a lot of it — but a 13px monochrome trading desk on launch day inverts the priority the project is built on. Terminal's own risk #1 concedes this.
4. **It found the credibility bug nobody else did** (`$2.1B`), and it kills the "61% Avg Completeness" tile — an internal data-quality metric shown to visitors as industry intelligence. Same instinct, twice.
5. **It is the only brief that noticed our one proprietary dataset.** `LaunchDateChange` is live (roadmap Tier 1 #7). "SLIPPED 2× since Jun" as a first-class hero telemetry field, captioned "nobody else records this", is the strongest reason-to-return argument in any of the three documents.

### Graft from Terminal (Brief A)

| # | Graft | Why it patches Mission Control |
|---|---|---|
| **A1** | **`DataTable` primitive.** Sortable, sticky header, `tabular-nums`, right-aligned numerics, whole-row link, keyboard `↑↓`/`Enter`/`/`. Wraps `ui/VirtualList.tsx` past 100 rows and `ui/MobileTableView.tsx` under 640px. | 149 files hand-roll `<table>` and no shared primitive exists. Mission Control's mockup contains **zero** tables despite specifying one; this is the density Brief B asserts and never demonstrates. Highest-leverage new engineering in the whole set. |
| **A2** | **The stale-data doctrine.** Every panel header carries `LABEL · source · updated HH:MMZ`. On fetch failure, keep the last good value, dim it, badge it `◆ STALE · last good 13:58Z · retrying`. A full-panel error is reserved for data we have *never* had. | This is the structural fix for the `$2.1B` fabrication and for `/space-stocks` silently rendering "0 public space companies". Never blank, never invent. |
| **A3** | **`StatusBadge` consolidation.** `ConfidenceBadge` + `DataFreshness` + `DataFreshnessBadge` + `DataFreshnessIndicator` + `DataAsOf` + `LastUpdated` → one `<StatusBadge kind asOf source />`. `EmptyState` gains a **required `reason` prop**. | Six components for one job. Empty states that don't say *why* are how `/space-stocks` looked healthy while broken. |
| **A4** | **Space Tycoon landing = live leaderboard + live commodity spot prices.** | The single most persuasive game pitch anyone proposed: proof the economy is running before you register. Brief B's game treatment (a violet band with a Play button) is the weakest of the three. Note: `getPublicLeaderboard` already exists and is called at `page.tsx:69`; **`src/lib/game/spot-price.ts` is server-side only and there is nothing under `src/app/api/game/`** — this needs one small public route, so it is cheap but not free. |
| **A5** | **`⌘K` as real navigation**, upgrading the existing 960-line `SearchCommandPalette.tsx`. | 129 surfaces; search *is* the IA. Deferred to October — the five menus work today. |

### Graft from Editorial (Brief C)

| # | Graft | Why it patches Mission Control |
|---|---|---|
| **C1** | **The `LiveRail`.** One server-rendered line in the root layout, above the nav, on every page: `● T−04:12:07 · Falcon 9 · Starlink 12-8 · Cape SLC-40 · Watch →`. One cached (60s) Prisma query. Fails to a static `Next launch →` link — **never to `—`**. | Best cost/value item in all three documents, and layout-independent. `LandingHero.tsx:78-133` initialises `nextLaunch`, `weatherSummary` and `fundingValue` to `—` and fetches in a `useEffect`, so the site's own promise ships as em-dashes to every crawler and every first paint. Brief B puts the launch on the homepage; C puts it on `/rockets`, on a guide, on `/news` — everywhere the daily visitor already is. |
| **C2** | **`ChartFrame` to publication standard.** `figure`/`figcaption`: title, one-line deck, real axes and legend, then a footer naming **source · record count · as-of timestamp · permalink · PNG · data table**. | `src/lib/charts/{registry,render,data}.ts` and `/chart` already server-render SVG + PNG + table + permalink and the front page never links to it. Terminal's chart is grey bars with no axis; this is the version an analyst will paste into a memo. |
| **C3** | **The `deck`** (italic standfirst under a headline) as a component, and **one authored sentence per company profile**. | Near-zero engineering cost; the difference between a scraped directory and a publication. ~300 sentences is a weekend. |
| **C4** | **Warm near-black, not `#000000`.** | Pure black on `#ffffff` at 21:1 rings. Warm ink reads calmer at the same size and still clears AAA, and it is the half of Editorial that survives dropping the paper ground. |

---

## 2. The design system — one decision, ready to implement

Target files: `src/app/globals.css` (tokens, type scale, radius, motion), `tailwind.config.ts` (font + size wiring), `src/components/ui/*` (component set).

### 2.1 Palette — warm ink ground, ember accent

Replaces `globals.css:47-115` (`--bg-void: #000000`, `--text-primary: #ffffff`, `--accent-primary: #6366f1` indigo, `--accent-secondary: #22d3ee` cyan). Indigo survives nowhere: it reads "generic SaaS dashboard", which is the impression the founder's priorities say to shed.

```css
:root {
  /* ground — warm near-black (Editorial C4 grafted onto Mission Control's structure) */
  --void:        #0B0A09;  /* page */
  --surface:     #131110;  /* console body */
  --elev:        #1B1815;  /* console header, hover ground */
  --hover:       #221E1A;  /* row hover */
  --line:        #2E2924;  /* keylines, dividers (decorative) */
  --line-2:      #3C362F;  /* input/button borders — always paired with a text label */
  --line-hot:    #5A544B;  /* hover keyline */

  /* ink */
  --ink:         #F5F3EF;  /* primary text        ~18:1 */
  --ink-2:       #B4AFA6;  /* secondary, descriptions ~10:1 */
  --ink-3:       #8B857B;  /* labels, timestamps, source lines ~5.5:1 — FLOOR */

  /* accent + signal — colour NEVER carries state alone */
  --ember:       #FF7A18;  /* primary CTA, T-minus units, active nav */
  --ember-deep:  #B34A00;  /* chart fills only — never text */
  --signal:      #4FD8E8;  /* live telemetry values, derived data */
  --go:          #56F000;  /* GO / nominal / live pip */
  --caution:     #FFC53D;  /* HOLD / watch / stale */
  --crit:        #FF4D4D;  /* SCRUB / failure / alert */
  --violet:      #9B7BFF;  /* Space Tycoon, and only Space Tycoon */

  /* chart series — fixed order, direct end-of-line labels mandatory */
  --series-1: #7FB2E5;  --series-2: #FF4D5E;  --series-3: #E8A33D;
  --series-4: #56C4A7;  --series-5: #B695DC;
}
```

**Rules that ship with the tokens, not after:**
- `--ink-3` is the **floor**. Nothing dimmer ships as text. Today `--text-tertiary #949494` and `--text-muted #6b6b6b` (3.1:1) are used on real labels including the hero trust line at `LandingHero.tsx:295`; both collapse into `--ink-3`.
- **Every status carries a word and a shape, never colour alone**: `GO` / `HOLD` / `SCRUB` / `LIVE` / `T−` in mono uppercase, plus a pip (filled = live, hollow = scheduled, slash = scrubbed) and `▲ / ▼ / ─` on every delta. Green-vs-amber is the deuteranopia collision; GO and HOLD are never adjacent without labels.
- `@media (prefers-contrast: more)` lifts `--ink-2 → #DCD8D1`, `--ink-3 → #BCB6AC`, `--line → #3C3C42`. The existing `html.high-contrast` class aliases onto the same tokens.
- **Recompute every ratio in the token PR against `--void: #0B0A09`** and put the measured value in a comment beside each token. The approximations above are from the briefs' measurements against `#000000`; the warm ground moves them by a hair and the file should carry the truth.
- **Contract for the migration**: the palette lives in Tailwind utilities today — `indigo-*` in 114 files, `cyan-*` in 246, `purple-*` in 286, `amber-*` in 308, against 13 files reading `--accent-primary`. Re-valuing tokens changes almost nothing on its own. New surfaces read tokens; the utility estate is migrated opportunistically per template, never as a big-bang.

### 2.2 Type — three families, **delete two**, swap none

The site currently loads DM Sans + JetBrains Mono + Orbitron from Google **plus five self-hosted Satoshi weights**, three of them `<link rel=preload>`-ed (`layout.tsx:274-276`).

| Role | Family | Decision |
|---|---|---|
| Display | **DM Sans 700**, `-0.02em` | **Keep.** Satoshi is deleted, not replaced. |
| Body / UI | **DM Sans 400/500** | **Keep.** Already loaded, already right. |
| Data / clock | **JetBrains Mono 400/500/700** | **Keep.** `font-variant-numeric: tabular-nums` becomes **mandatory** on every number. |
| Deck / standfirst | **DM Sans 400 italic**, 1.25rem/1.5, `--ink-2` | New use of an existing family (Editorial graft C3 without a fourth font). |
| ~~Satoshi~~ | — | **Cut.** 5 local `.woff2`, 3 preloads, one `localFont` call off the critical path. |
| ~~Orbitron~~ (`--font-hud`) | — | **Cut.** Nine call sites, all inside `/space-tycoon`; they move to DM Sans 700 + `0.12em` tracking. |

**Explicitly rejected: Space Grotesk (Brief B), IBM Plex Sans (Brief A) and Fraunces (Brief C).** All three are preferences with a reflow across every page and no functional gain. Both judges who priced them put them in their own cut lists. Revisit as an October A/B if the deletion lands clean.

**Scale** (fluid, clamped 390→1440). **11px is the hard floor and it is enforced** — `LandingHero.tsx` currently ships `text-[10px]`, `text-[9px]`, `text-[8px]` and `text-[7px]` (the "SPACE DATA" badge at `:274` is *seven pixels*).

| Name | Size / line-height / tracking | Font |
|---|---|---|
| `clock` | `clamp(3.2rem, 7.4vw, 5.6rem)` / 0.92 / −0.03em | JetBrains Mono 700, tabular |
| `display-xl` | `clamp(2rem, 3.6vw, 3.1rem)` / 1.05 / −0.02em | DM Sans 700 |
| `display` | `clamp(1.75rem, 2.4vw, 2.25rem)` / 1.1 | DM Sans 700 |
| `h2` | `1.375rem` / 1.15 | DM Sans 700 |
| `h3` | `1.0625rem` / 1.3 | DM Sans 600 |
| `deck` | `1.25rem` / 1.5, italic | DM Sans 400 |
| `body` | `1rem` / 1.6, measure 68ch | DM Sans 400 |
| `body-sm` | `0.875rem` / 1.55 | DM Sans 400 |
| `data-lg` | `1.875rem` / 1.1, tabular | JetBrains Mono 700 |
| `data` | `0.9375rem`, tabular | JetBrains Mono 400 |
| `overline` | **`0.6875rem` (11px)** / 0.14em / uppercase | DM Sans 500 |

Prose keeps 16px. Density serves data, not paragraphs — that is Terminal's own carve-out and it is right.

### 2.3 Grid, spacing, radius

- **4px base.** Steps: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. Nothing off-scale.
- **Three named widths** (Editorial's discipline, Mission Control's numbers):
  `--col-read: 68ch` (~720px, prose/decks) · `--col-wide: 1080px` (charts, tables, card rows) · `--col-page: 1320px` (container) · full-bleed for region bands.
- 12 columns, 24px gutters. Standard page = 8-col content + 4-col rail. Gutter 24px desktop / 16px ≤860px.
- **Section rhythm 64px desktop / 40px mobile**, separated by a 1px `--line` rule under the section header — not by 96px of emptiness. Density is the point; whitespace is the seasoning.
- **Radius: 12px consoles · 8px buttons/inputs/tiles · 6px badges · 999px pills.** Today one page mixes `rounded`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`. (Terminal's 3px is rejected — it reads instrument at the cost of reading hostile.)
- **Whitespace budget: no more than three modules per 900px screenful.**

### 2.4 Component set — `src/components/ui/`

**New / promoted**

| Component | What it is | Replaces |
|---|---|---|
| `Console` | The one card. 1px `--line`, radius 12, `--surface` body, optional `--elev` header strip: `OVERLINE LABEL` left, `source · updated HH:MMZ` + status right (graft A2). | `.card`, `.card-elevated`, `.card-data`, `.card-content`, `.card-terminal`, `.card-nebula/-cyan/-amber/-emerald` (`globals.css:463-760`), `ui/GlassCard.tsx`, `ui/TerminalPanel.tsx`. **The three macOS traffic-light dots go.** |
| `DataTable` **(A1)** | Sortable, sticky header, tabular numerics right-aligned, gridlines not zebra, whole-row link, keyboard `↑↓`/`Enter`/`/`. Wraps `VirtualList` >100 rows, `MobileTableView` <640px. | The 149 hand-rolled `<table>`s; the `/rockets` card grid. |
| `LiveRail` **(C1)** | Server component in `layout.tsx`, 32px, cached 60s, one Prisma query. Static `Next launch →` on failure. | `LandingHero.tsx:41-63` `DataCard`s and the `useEffect` `—` chain at `:78-133`. |
| `ChartFrame` **(C2)** | `figure`/`figcaption` around `src/lib/charts/` SVG: title, deck, axes, legend, footer with source · record count · as-of · permalink · PNG · table. | `/chart` internals, `ui/StockMiniChart.tsx` (becomes `Sparkline`). |
| `Telemetry` | `overline` label / mono value / unit + delta. | ad-hoc `DataCard` in `LandingHero.tsx:39-58`, the four `.card-data__*` classes. |
| `StatusPip` | Mission state: word + shape + colour — `GO` `HOLD` `SCRUB` `LIVE` `T−`. | `.badge-live`, `.live-badge`, hand-rolled `animate-ping` dots at `page.tsx:341`, `LandingHero.tsx:227`. |
| `StatusBadge` **(A3)** | Data provenance: `<StatusBadge kind="live\|stale\|delayed\|verified" asOf source />`. | `ConfidenceBadge`, `DataFreshness`, `DataFreshnessBadge`, `DataFreshnessIndicator`, `DataAsOf`, `LastUpdated` — six → one. |
| `Countdown` | The clock. `aria-label` in words, **`aria-live="off"`** (a per-second live region is a screen-reader denial of service), ember unit suffixes. | Logic already exists in `LandingHero.tsx:97-108`. |
| `Deck` **(C3)** | Italic standfirst paragraph under a headline. | Does not exist today. |
| `Button` | `Ember` (fill `#FF7A18`, `#0A0A0B` label) / `Line` (1px `--line-2`) / `Bare` (text + ember underline). 44px min target. | Recolour of `.btn-primary/.btn-secondary/.btn-ghost` (`globals.css:410-460`) — no API change. Every landing CTA routes through it. |
| `RegionBand` | Full-bleed region art **behind** content + bottom-up scrim + headline/telemetry/CTA. Per-image scrim is a hard requirement. | `ui/HeroArt.tsx`, which renders a decorative 3:1 band *above* the H1 with `alt=""` — on `/rockets` and the cost guide it is 375px of near-black that pushes the answer off screen. |
| `RowSkeleton` | Renders at the **exact** final row height/keyline/radius so nothing reflows. | `Skeleton` + `CardSkeleton` + `GridSkeleton`. |

**Kept**: `Skeleton` (base), `Toast`, `Modal`, `Tooltip`, `AutoBreadcrumb`, `MobileTableView`, `VirtualList`, `SourceCitation`, `EmptyState` (**gains a required `reason` prop**), `SearchCommandPalette`.

**Retired**: `GlassCard`, `TerminalPanel`, `HeroArt`, `AnimatedPageHeader`, `StarField`, `AnimatedCounter`, `DensityToggle` (the density is the design), `TrialBanner` (duplicate of `TrialCountdownBanner`, and the one without the 44px tap fix), and the five surplus freshness components.

**Two deliberate non-deletions, against Brief A:**
- **`ScrollReveal` stays as a file.** It has **182 call sites**; deleting it is an unpriced 182-file edit. Instead it reads `useReducedMotion()` and renders its final state immediately. Fix the component, not the callers. No new call sites.
- **`IndustryTicker` stays as a component but leaves global chrome.** A scrolling marquee under the nav on *every* page is the site's worst reduced-motion offender; but at 36px it is the highest information-per-pixel object on a phone. It is re-mounted on `/space-stocks` and the markets surfaces only, restyled to mono + signal glyphs, static under `prefers-reduced-motion`.

### 2.5 Motion, loading, error, focus

- **Motion budget: three moving things per page.** Live pip (2.4s opacity blink), countdown (text change only, no transform), hover (120ms border/background). Cut: staggered hero reveals (nine `Reveal`s on 0.15–0.95s delays), marquee in global chrome, star drift, count-up numbers, parallax.
- **One `useReducedMotion()` hook.** `AnimatedCounter`, `KPIStrip` and `ScrollReveal` animate via `requestAnimationFrame`; the CSS clamp at `globals.css:318` **never reaches JS**. Every JS animation reads `matchMedia` and renders its final value immediately.
- **Loading**: skeletons match the final box exactly; the countdown renders `T−--h --m --s` at final type size so the hero never reflows.
- **Empty**: every empty state answers *what is missing, why, and when it changes*. `reason` is a required prop.
- **Error**: stale beats blank; blank beats invented (graft A2). Never a silent fallback to a made-up number.
- **Focus**: `:focus-visible` = 2px `--ember`, 2px offset, on everything including whole-row table links. Keyboard order follows visual order.

---

## 3. Navigation and IA

### The bar — one 60px row

```
[● SpaceNexus]  Launches  News  Markets  Business  Learn  Jobs   │  Space Tycoon   ⌕ ⌘K   🔔   Account
```

Above it, and only it: the **`LiveRail`** (32px, server-rendered). Nothing else.

**Out of global chrome** (`src/app/layout.tsx:297-304`): `TrialBanner`, `AnnouncementBanner` (Play-Store internal test → footer + one dismissible card on `/about`), `IndustryTicker` (→ markets surfaces), `QuickAccessSidebar` (~15 unlabelled emoji glyphs down the viewport edge; its function is `⌘K`), `ModuleNavBar` + `SwipeModuleNavigation` ("3 of 42 modules" is site-map navigation, not user navigation). Net: **~240px desktop / ~300px mobile of pre-content chrome returned to content on all 129 surfaces.**

**Out of the bar**: **Home** (the wordmark is home), **Live** (→ the green pip + the LiveRail; a permanent "Live" link is a lie 23 hours a day), **Pricing** and the **Upgrade** button (→ footer + account menu; monetization is on hold to ~November).

**Jobs stays in the bar — and gets fixed today.** Both B and C demote it to Business. I am overruling both, for now: it is `hot`, it is ~6,500 synced listings, and it is the industry persona's only masthead entry. But `Navigation.tsx:461` and `:693` must point at **`/jobs`**, not `/space-talent` — one hour, and the single highest-value nav fix on the page. Re-evaluate the slot in October **with data**: if `/space-talent` traffic holds after the repoint, demote to Business.

### The long tail: `/tools` becomes **The Index**, and gets a permanent link

**No sixth dropdown.** The `ops` group (31 engineering pages, including two `hot` proven winners — Launch Cost Calculator and Mission Simulator) and `reference` (13) cannot produce a menu because `Navigation.tsx`'s `CategoryKey` type only lists five groups. The fix is not a sixth menu; it is:

1. **A persistent `Index` link** in the bar's utility cluster **and** in the footer of every page — today no standalone `/tools` link exists anywhere outside the five "Everything in X →" anchors. **URL stays `/tools`** (it ranks; `next.config.js` already carries 100+ redirects and does not need another). Label only.
2. **Promote the two `hot` ops entries into Learn** with `nav: true` (Launch Cost Calculator, Mission Simulator).
3. `/tools` becomes the *only* home for the ops and reference long tail, and gains the `hot` flag rendering that `Navigation.tsx`'s `DropdownItem` type currently drops.

### Menu hygiene (all in `src/lib/site-directory.ts` + `Navigation.tsx`)

- **`/compare` is nav:true in Markets only** ("Compare Companies"). Drop the duplicate bare "Compare" from Learn; the freed slot goes to a promoted ops calculator.
- **`pro: true` on the Compliance Hub entry**, and delete the hardcoded `item.href === '/compliance'` check at `Navigation.tsx:208` and `:774`. `DirectoryBrowser.tsx:71` already reads `e.pro`, so `/tools` currently shows no Pro pill for a genuinely paywalled page.
- **Drop the mobile "Show all N items" mechanism.** It fires under exactly one category (Launches) and reveals exactly one row — the "Everything in Launches" link that was last anyway.
- **Mobile menu gets a focus trap, Escape-to-close and `role="dialog"`/`aria-modal`**, reusing `OnboardingTour.tsx:202-235`, which already solved this for the same class of overlay.
- **Overlay budget: one.** Cookie sheet, onboarding modal, Quick Start checklist, feedback edge tab and `FloatingCTA` cannot co-occur. Cookie consent becomes a ~120px bottom sheet, not a 260px block over the lower third of every first screen.
- `MobileTabBar` survives: Home / Launches / News / Tycoon / More.

---

## 4. Ranked roadmap

Effort: **S** ≤ half a day · **M** 1–3 days · **L** > 3 days. Ranking rule: things that are *wrong* before things that are *thin*; things every visitor sees before things one persona sees; deletions before builds.

### DO NOW — this week

| # | What | Where | Effort | Audience | Why here |
|---|---|---|---|---|---|
| 1 | **Root-cause `/space-stocks` returning zero companies**, and replace the silent empty fallback with a distinct "data temporarily unavailable" state + owner alert on repeat failure | `src/app/space-stocks/page.tsx:184-192` | M | investor | The flagship, `hot`-flagged first click in the Markets menu renders a fully-built page with nothing in it and no signal that it's broken. Impact 5, live now. |
| 2 | **Delete the fabricated `$2.1B` funding fallbacks**; show the failure instead | `LandingHero.tsx:171-179` | S | all | An invented number in the same tile as real ones is disqualifying for the industry audience. If the funding number can be fiction, nothing on the site is quotable. 20 minutes. |
| 3 | **Repoint the nav Jobs links to `/jobs`** | `Navigation.tsx:461`, `:693` | S | industry | ~6,500 listings sitting two clicks behind a workforce chart on a persistent, every-page link. One hour, highest nav ROI on the site. |
| 4 | **Mission-debrief resync + backfill.** Re-run/invalidate a debrief when the outcome-sync flips its event's status; regenerate the 6 debriefs still showing SCRUBBED for launches that flew | `src/app/api/cron/mission-debriefs/route.ts:110-117`, `src/lib/events-fetcher.ts` | S | enthusiast | Live self-contradiction on plain fact ("did this rocket fly?"), with an AI narrative explaining a scrub that never happened. Residue of the 8/26 outcomes bug. Impact 5. |
| 5 | **Phase 1 chrome cull** — strip `TrialBanner`, `AnnouncementBanner`, `IndustryTicker`, `QuickAccessSidebar`, `ModuleNavBar`, `SwipeModuleNavigation`; add the missing carousel exclusions; fix the four duplicate breadcrumbs; cookie bar → 120px bottom sheet; fix the mobile headline `<br className="hidden sm:block">` that renders "Every launch.Live, tracked,explained." at 390px | `layout.tsx:297-304`, `useModuleNavigation.ts:57`, `rockets/page.tsx:45-47` + 3 guide pages, `ui/CookieConsent.tsx`, `LandingHero.tsx:226-230` | M (4 days) | all | Pure deletion. Returns ~240px desktop / ~300px mobile on every page, ships alone, reverts in one commit, and is the prerequisite for every design phase that follows. |
| 6 | **`LiveRail`** — server component in `layout.tsx`, cached 60s, static fallback, never `—` | new `src/components/LiveRail.tsx`, `src/lib/next-launch.ts`, `layout.tsx` | M (1 day) | enthusiast | Makes the site's own headline true in HTML on all 129 surfaces for the first time. Design-agnostic — it survives whatever else changes. |
| 7 | **`useReducedMotion()` hook**, wired into `AnimatedCounter`, `KPIStrip`, `ScrollReveal` | new `src/hooks/useReducedMotion.ts` + 3 components | S | all | rAF animation ignores the CSS clamp at `globals.css:318` entirely. One hook fixes 182 `ScrollReveal` call sites by editing one file. |
| 8 | **Homepage + `/rockets`: `force-dynamic` → `revalidate = 300`** | `page.tsx:64`, `rockets/page.tsx:8` | S | all | No cookies/headers/session usage justifies true dynamic rendering. Every homepage hit currently re-runs SSR + DB with zero edge cache, and that cost scales linearly with the 10k MAU push. |
| 9 | **Exit-intent popup**: drop the mobile fast-scroll heuristic, default to the free newsletter tab, suppress when a signup module was already shown this session | `marketing/ExitIntentPopup.tsx:26,99-118,251-259` | S | enthusiast | Fires on an ordinary scroll-back gesture mid-guide and leads with a paid trial — against "enthusiasts and information over profit". Also stops the same visitor being asked for email three times in one session. |
| 10 | **Hygiene bundle** (one PR): `/startups` double title suffix · `/market` single redirect (it currently 200s with a 1s meta-refresh flash) · widget URLs out of the sitemap or the robots rule dropped · `/space-stocks` meta description 306→~155 chars · `SimilarCompanies.tsx:166` "Defense0" guard · `RelationshipsTab` empty state · label the legacy score "Legacy scoring model (pre-2026)" · normalize the 3-way a16z investor split · `eventId` uniqueness + 301 for `us-eva-98-2` · `<h1>` on `/mission-control` and `/startups` · delete `page.tsx.bak` and `_edit.js` | ~11 files, all named in `audit-findings.json` | M | all | Eleven verified defects, each ≤30 minutes, several of them visible embarrassments to the exact audience they sit in front of. |

### SEPTEMBER

| # | What | Where | Effort | Audience | Why here |
|---|---|---|---|---|---|
| 11 | **Token + type PR**: palette per §2.1 with measured ratios in comments; 11px floor; radius set; delete Satoshi (5 woff2 + 3 preloads) and Orbitron (9 call sites) | `globals.css:37-150`, `tailwind.config.ts`, `layout.tsx:62-90,273-276` | M | all | The system has to exist before templates can use it. Font *deletion* only — no swap, no reflow risk. |
| 12 | **`Console`, `Button`, `Telemetry`, `StatusPip`, `Countdown`, `Deck`, `RowSkeleton`** + the `.card-*` → `.console` codemod-able alias layer | `src/components/ui/` | M | all | The alias layer means the ~352 files matching card classes keep rendering on swap day; migration is opportunistic afterwards. |
| 13 | **`DataTable` + `StatusBadge` + `EmptyState.reason`** (grafts A1, A3) | `src/components/ui/` | M | industry | The one genuinely reusable new primitive in the set; 149 files hand-roll tables today. `StatusBadge` collapses six components into one. |
| 14 | **Server-render `/mission-control` and `/company-profiles`**: server shell (header, telemetry, first screen of rows) + client island for filters | `mission-control/page.tsx:1`, `company-profiles/page.tsx:1` | M | all | The homepage's one primary CTA currently lands on a skeleton. Both pages ship "Loading…" / "0 companies found" to every crawler. Both briefs and all three judges flagged it. |
| 15 | **Homepage template**: next-launch hero (mission name as headline, `GO` pip, clock, four telemetry incl. **SLIPPED**, Watch + "Remind me at T−1h — no account needed"), next-five rail, live row, one industry telemetry row, three stories, Tycoon band, digest line. Delete `KPIStrip`, `BentoFeatures`, `DemoShowcase`, `HowItWorks`, `SocialProof`, `PersonaPicker`, `FloatingCTA`, `ModuleContainer`, `AdSlot`, `HomeScrollManager` — **moved intact to `/pricing`, not deleted** | `src/app/page.tsx`, `LandingHero.tsx` → `home/NextLaunchHero.tsx` | L | enthusiast | The whole thesis. Moving rather than deleting the trial funnel keeps the November monetization option alive and makes the A/B honest. |
| 16 | **Launch page template**: one URL, three states (T− / LIVE / FLEW·SCRUB + debrief), slip-history panel from `LaunchDateChange`, sticky no-account alert capture | `src/app/launch/[eventId]/*` | M | enthusiast | Makes a wrong status field impossible to hide — the exact class of bug as item 4. Slip history is the only dataset nobody else has. |
| 17 | **`AlertNudge` on rocket pages and viewing guides**, scoped to that rocket's/site's next launch | `rockets/[slug]`, `guide/watch-a-launch*` | S | enthusiast | The one feature built to bring enthusiasts back tomorrow currently lives on exactly one page (`mission-control`), which most of the journey never revisits. |
| 18 | **One launch-cost constant, imported everywhere** — list price, dedicated $/kg, rideshare $/kg, each with source + as-of | new `src/lib/launch-cost-constants.ts`; 10 call sites incl. `cost-to-launch.ts`, `space-manufacturing/page.tsx:243`, `tool-faqs.ts:16`, `resources-data.ts:1213` | M | industry | Falcon 9 is quoted at $2,700 / $2,900 / $2,940 / $3,000 / $3,070 per kg and $5,500 vs $7,000 rideshare across live pages. Self-contradiction on the site's most-cited number. |
| 19 | **`ChartFrame` to publication standard + "Chart of the Week" card** on the homepage and Mission Control | `src/lib/charts/*`, `ui/ChartFrame.tsx`, `page.tsx` | M | all | The chart engine already server-renders SVG + PNG + table + permalink and nothing links to it. Cheapest credibility win available. |
| 20 | **Nav/IA batch**: Index link in bar + footer, two ops promotions, `/compare` dedupe, `pro:true` on Compliance, drop mobile show-all, mobile focus trap + Escape + `aria-modal`, `hot` flag rendered in dropdowns | `Navigation.tsx`, `site-directory.ts`, `Footer.tsx` | M | all | Unblocks 31 engineering pages (two of them proven traffic winners) that have no menu path at all, and fixes an a11y gap the codebase already solved once. |
| 21 | **`/launches`: next-5-across-all-sites list above the spaceport cards** | `src/app/launches/page.tsx:27-33` | M | enthusiast | The page named "Launches" answers "which spaceport?" before it answers "what's flying?". |
| 22 | **Rocket hero images** on `/rockets/[slug]` | `rockets/[slug]/page.tsx` | M | enthusiast | A site for people who like rockets whose rocket pages contain exactly one image: the nav logo. |
| 23 | **Server-render the first page of `/news`, `/ai-insights`, `/intelligence-brief`** | `NewsPageClient.tsx:84`, `ai-insights/page.tsx:157`, `intelligence-brief/page.tsx:69` | M | enthusiast | ~108KB of shell with zero headlines to any non-JS client, on the three pages whose entire job is freshness. |
| 24 | **Mission Control timeline: cap + "load more"/"jump to month" + virtualize** | `mission-control/page.tsx:1524-1567`, fetch `limit` at `:1206` | M | enthusiast | 53,785px of measured scroll at 390px for ~100 events. Everything below the timeline is effectively unreachable on a phone. |
| 25 | **Mobile tap targets + banner consolidation**: 44px carousel dots; delete `TrialBanner` (keep `TrialCountdownBanner`) | `ModuleNavBar.tsx:206-211`, `ModuleContainer.tsx:394-399`, `TrialBanner.tsx` | S | all | 8px dots; and two components for one concept where only one got the accessibility fix. |
| 26 | **Guide answer-block above the fold** — ship on ONE guide, hold two weeks of Search Console before the rest | `guide/space-launch-cost-comparison`, then the family | M | enthusiast | The guides carry ~54k impressions/28d. An answer-shaped paragraph above the fold is what featured snippets want, but this estate ranks and gets one careful experiment, not sixteen simultaneous rewrites. |
| 27 | **Editorial hygiene**: newsletter page → "Twice-weekly (Mon/Thu)" + a real digest excerpt; a "paused Mar–Jul 2026" note on `/ai-insights`; suppress or weekly-batch abstract-free BIS regulatory insights | `newsletter/page.tsx:58,254-280`, `ai-insights`, insight generator | S | all | ~20% of the Regulatory feed is templated filler, one item literally saying it has no news to report. |
| 28 | **Post-deploy smoke test** over a sample of sitemap URLs, weighted to recently-touched routes | `scripts/`, CI | M | all | Two brand-new pages 404'd on first check and self-healed minutes later. Narrow, but invisible without a check. |

### OCTOBER

| # | What | Where | Effort | Audience | Why here |
|---|---|---|---|---|---|
| 29 | **Company + markets templates**: telemetry row with one provenance line, tabs, `DataTable` vehicles/contracts, retire the "61% Avg Completeness" tile and the unlabeled legacy score block | `company-profiles/*`, `space-stocks/*`, `startups/*` | L | investor | Depends on `DataTable` (13) and the server-render split (14). |
| 30 | **One authored sentence per company profile** (~300) | `CompanyProfile` + template | M | investor | The difference between a scraped directory and intelligence. A weekend of writing, not engineering. |
| 31 | **Price history**: 30/90-day sparkline + 52-week range on `/space-stocks` rows and the profile Financial Snapshot | `SpaceStocksTables.tsx`, `company-profiles/[slug]` | M | investor | Most quote APIs return this in the same call we already make. Depends on item 1 being fixed first — a chart on an empty table is worse than nothing. |
| 32 | **Space Tycoon landing (graft A4)**: live leaderboard + live commodity spot prices + the eight-region grid + live epoch state | `space-tycoon/page.tsx`; **new public route under `src/app/api/game/`** for `src/lib/game/spot-price.ts` | M | enthusiast | Proof the economy is running before you register. Needs a small API that does not exist yet. |
| 33 | **Region art language (Phase 3)**: `regionForRoute()` + `RegionBand` across ~30 top surfaces | new `src/lib/region-art.ts`, extend `src/lib/game/assets.ts` | L | enthusiast | The most beautiful and least load-bearing part of the direction, and per-image scrim QA is manual. Correctly last. |
| 34 | **Prime-contractor backfill**: `GovernmentContract` + `FundingRound` for Lockheed, Boeing, Northrop, L3Harris (SAM.gov, SEC) | data + scripts | L | investor | A visible zero on the flagship defense contractor's Contracts tab is the worst possible first test result for a BD lead — but it is a data project, not a design one. |
| 35 | **3 years of annual revenue for public companies** from 10-K filings, rendered as a trend | data + `company-profiles` | L | investor | Same argument; "is this growing?" is the actual investor question and today the answer is one 2024 cell. |
| 36 | **`⌘K` command palette (graft A5)** upgrading `SearchCommandPalette.tsx` | `SearchCommandPalette.tsx`, `Navigation.tsx` | M | all | For 129 surfaces search *is* the IA — but the five menus work, so this is the elegant answer, not the urgent one. |
| 37 | **Page-type structured data** for `/rockets`, `/launches`, `/mission-control`, `/tools`, `/chart` (`/company-profiles`, `/news` and the cost guide **already have it** — do not redo them) | per-page `<script type="application/ld+json">` | M | industry | Real gap, narrower than originally claimed. |
| 38 | **CTA unification**: every landing CTA through `Button` / `.btn-*` | `page.tsx:321`, `HowItWorks.tsx:99`, `DemoShowcase.tsx:392`, `LiveStreamSection.tsx:156,730` | M | all | Four unrelated shapes/colours claim "primary action" on one page today. Follows the `Button` component landing in September. |
| 39 | **Persona/checklist emoji → the stroked-SVG icon set** | `OnboardingTour.tsx:29-37`, `OnboardingChecklist` | M | industry | Emoji render differently per OS and break the line-icon language in the flow every new user meets first. |
| 40 | **`/ignition` decision** — cross-link from `/artemis` + add to `site-directory.ts`, or fold in and redirect. **Verify the zero-inbound-links claim first** (it is the one `unverified` finding) | `sitemap.ts:65`, `site-directory.ts`, `/artemis` | S | enthusiast | Sitemap priority 1.0 with no click path — if it holds. |
| 41 | **`/use-cases` and `/vs`**: wire in or mothball via `src/lib/mothballed-routes.ts` | those two routes | S | industry | The 8-page "orphan cluster" claim was mostly wrong — six of the eight have real inbound links. Only these two are genuinely orphaned. |
| 42 | **Launch cross-link specificity**: deep-link a flown launch to its own `/mission-debriefs/[slug]` (not the index) and add a provider slip-history link | `components/launches/LaunchCrossLinks.tsx` | S | enthusiast | The rail already ships; only the deep link and the slip link are missing. |

---

## 5. Rejected — do not re-propose

**From the three briefs**

| Rejected | Reason |
|---|---|
| **Paper / cream ground** (`#FBF8F3`, Editorial) | 929 files hardcode `text-white`, 903 `bg-white/[…]`; the required Tailwind override layer is a specificity war the brief itself calls debt and pre-authorises abandoning. Dark is also the norm for every serious data product in this vertical. |
| **Fraunces as body copy sitewide** (Editorial) | An unforced typographic bet on the ~54k-impression guide estate, hedged in its own brief. |
| **IBM Plex Sans swap** (Terminal) / **Space Grotesk swap** (Mission Control) | Pure reflow risk across every page for zero function. Both authors put them in their own cut lists. Revisit only as an isolated October A/B. |
| **13px base type and 3px radius as the sitewide default** (Terminal) | Reads instrument, and reads hostile to the founder's first audience. Terminal's own risk #1. Density is kept where it belongs: tables. |
| **Deleting `ScrollReveal`** (Terminal) | 182 call sites — an unpriced 182-file edit. Fixed at the component instead. |
| **Deleting `IndustryTicker` outright** (Mission Control) | Highest information-per-pixel object on a phone. Removed from global chrome, kept on markets surfaces. |
| **A sixth "Tools/Ops" nav dropdown** | Re-inflates the menu the 2026-08-28 overhaul deliberately cut. Solved with a persistent Index link + two `hot` promotions instead. |
| **Renaming the `/tools` URL** | It ranks; `next.config.js` already carries 100+ redirects. Label changes, URL does not. |
| **Deleting the homepage trial funnel** (`HowItWorks`, `SocialProof`, `DemoShowcase`, `BentoFeatures`) | Moved intact to `/pricing`, not deleted. Monetization is on hold, not cancelled. |
| **Demoting Jobs out of the masthead now** | Fix the href first, then decide with data in October. |
| **A light theme** | Real accessibility want, but it is the same 900-file problem as the paper ground. Backlog, not this cycle. |
| **`aria-live` on the countdown** | Deliberately `off`. A per-second live region is a screen-reader denial of service; the `aria-label` carries the value in words. |

**From the audit**

| Rejected | Reason |
|---|---|
| **News source-diversity cap** | Refuted on recheck: SpaceDaily is 8/40 (20%), already at the finding's own proposed cap. A single RSS snapshot is not a trend. |
| **Chasing the `/space-tycoon/about` 404** | Self-healed across 6+ retries with no action; a rolling-deploy propagation window, not a defect. Covered by the smoke test (item 28). |
| **Emergency overlay z-index rework** | The element covering the CTA is `OnboardingTour`'s once-per-browser persona modal (`role=dialog`, `aria-modal`, Escape-dismissible), not the cookie bar. Handled by the overlay budget in §3, not as a bug. |
| **"SpaceX valuation is three contradictory numbers"** | Two of the three reconcile — `valuation` ($1.78T) and `marketCap` ($1.865T) are different fields. Only the hardcoded "~$2T" banner string at `space-stocks/page.tsx:245` is wrong; it is in item 10. |
| **"8-page orphan SaaS cluster"** | Six of the eight have verified inbound links. Only `/use-cases` and `/vs` (item 41). |
| **Re-adding `ItemList`/`FAQPage` to `/company-profiles`, `/news`, the cost guide** | Already shipped. Item 37 covers only the five pages that genuinely lack it. |
| **A "start here" group in an 18-item Launches menu** | The menu renders 9 items, not 18; the 8/28 overhaul already fixed it. Only the `hot`-flag rendering survives, folded into item 20. |
| **Everything on `docs/ROADMAP_2026-09.md`'s Rejected list** | Crowd features at 450 MAU, new aggregator surfaces, 300 ISS-pass city pages, a cost-to-launch CTR pass, professional-depth tearsheets, ascent visibility. Reasons are in that file. |

---

## 6. Open questions — founder only

1. **Ember over indigo.** The palette swaps `#6366f1` indigo / `#22d3ee` cyan for `#FF7A18` ember on warm near-black, with violet reserved exclusively for Space Tycoon. This is the loudest visible change and the one no amount of evidence settles. Yes, or keep indigo and take everything else?
2. **The terminal chrome motif.** The macOS traffic-light dots and `spacenexus:~/dashboard` paths (`globals.css:562-600`) look deliberate. All three briefs want them gone — they read *developer tool* where the goal is *mission control*. Is that a motif you want kept, or was it scaffolding?
3. **The homepage trial funnel.** `HowItWorks`, `SocialProof`, `DemoShowcase` and `BentoFeatures` come off the homepage. My plan moves them intact to `/pricing`. If Pro signups matter more than the fold this quarter, say so now — it changes item 15, not the rest.
4. **Jobs' masthead slot.** I am keeping it and fixing the href, against two of three briefs. Confirm, or demote it into Business now and free the slot?
5. **The eight region paintings.** `public/game/region-*.webp` were commissioned for Space Tycoon and Phase 3 spreads them across ~30 non-game surfaces as the site's shared visual language. Any licensing, sourcing or brand reason not to use game art as site art?
