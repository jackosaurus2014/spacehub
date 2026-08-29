# BRIEF A — "The Terminal"

A redesign proposal for SpaceNexus. 2026-08-30.

---

## 0. The argument

SpaceNexus already has the *data* of a terminal and the *chrome* of a SaaS brochure.

The evidence, all measured on the live site today:

- The homepage is **11,045px tall on desktop and 15,667px on mobile** (measured via `document.body.scrollHeight`). It is a stack of marketing sections — `src/app/page.tsx:170-490`: hero, Today's Reads, persona picker, KPI strip, livestream, bento features, game card, leaderboard, latest content, demo showcase, how-it-works, social proof, APOD, dashboard modules, ad slot, newsletter CTA, floating CTA.
- `/rockets` holds six genuine fields per vehicle — Falcon 9 Block 5 at ~$67M, 23t to LEO, 99.5% reliability, 39 launches/90d, next flight date — and renders them as **cards**, one vehicle per tile. That is a table wearing a costume.
- `/mission-control` (`src/app/mission-control/page.tsx:1`) and `/company-profiles` (`src/app/company-profiles/page.tsx:1`) are `'use client'` from the first line. The two most data-dense surfaces on the site ship an empty shell and fetch on mount; a crawler or a slow phone sees "Loading…" and "0 companies found".
- `/chart` is the counter-example and the proof of concept: server-rendered SVG, five real series ("Orbital launches per month", "Launch date slips per week"), a data table under each chart, PNG export, permalinks. **One page on this site already behaves like a terminal.** The redesign is the act of making the other 128 look like that one.

So: this is not a request for new data products. (The roadmap's rejected list already ruled out tearsheets and contract-competition fields until Q4, and I am not re-proposing them.) It is a proposal to **invert the ratio of chrome to data** using the data that is already in the database.

Two honest notes for whoever reads this next, because the last review burned three findings on exactly this:

- The **"You're offline. Cached data shown."** banner that appears in every headless screenshot and every WebFetch is a **tooling artifact, not a bug**. `src/hooks/useOfflineStatus.ts:11` initialises `isOnline` to `true` and reads `navigator.onLine`; headless Chrome and the fetch proxy report offline. Real browsers are fine. Do not file it.
- The **"Welcome to SpaceNexus, Step 1 of 4"** modal is **first-visit only and correct**: `OnboardingTour.tsx:139` gates on `localStorage['spacenexus-onboarding-complete']`, and `PersonaPicker.tsx:44` defaults `hasPersona = true` specifically to prevent a flash. It is not a permanent bug. It *is* still the first thing every new visitor meets, and at 450 MAU chasing 10k, first visits are most visits — so it belongs in the design conversation, just not on a defect list.

---

## 1. Design principles (5 lines)

1. **The data is the interface.** Every screen opens on real numbers, not on a sentence describing the numbers.
2. **Colour is meaning, never decoration.** Four signal colours carry state; everything else is monochrome.
3. **Density is respect.** A professional reading a table wants forty rows, not four cards and a scroll.
4. **Never blank.** Loading shows the shape of the answer; failure shows the last good value with a stale badge.
5. **The keyboard is a first-class input, and the phone is a first-class screen.** Neither is a port of the other.

---

## 2. Design system

### 2.1 Palette

Monochrome ink scale plus a strictly-rationed signal set. All ratios below are computed against the page background `#07080A`.

**Ink — backgrounds**

| Token | Hex | Use |
|---|---|---|
| `--ink-void` | `#07080A` | Page background |
| `--ink-surface` | `#0D0F12` | Panel background |
| `--ink-panel` | `#14171B` | Panel header, table header row |
| `--ink-raised` | `#1C2026` | Hover row, active tab |
| `--ink-active` | `#262B33` | Pressed, selected row |

**Ink — rules and text**

| Token | Hex | Contrast on void | Use |
|---|---|---|---|
| `--rule-hairline` | `#2A2F37` | — | Table gridlines, panel edges |
| `--rule-default` | `#3A414B` | — | Visible dividers |
| `--rule-strong` | `#59626F` | 3.2:1 | Focus outline base, non-text only |
| `--text-primary` | `#F2F4F7` | **17.8:1** | Values, headings, table cells |
| `--text-secondary` | `#A8B0BB` | **9.0:1** | Labels, descriptions |
| `--text-tertiary` | `#79828F` | **5.0:1** | Timestamps, units, source notes |

`#59626F` is 3.2:1 and is therefore **never used for text** — only for rules and disabled glyphs. This is the one discipline the current `globals.css` gets wrong in spirit: `--text-muted: #6b6b6b` is 3.1:1 and is used on real labels.

**Signal — data state only**

| Token | Hex | Contrast | Meaning |
|---|---|---|---|
| `--sig-up` | `#3DD68C` | **10.5:1** | Gain, success, GO, nominal |
| `--sig-down` | `#FF5D5D` | **6.5:1** | Loss, failure, scrub |
| `--sig-hold` | `#FFB020` | **10.7:1** | Caution, delayed, unverified |
| `--sig-info` | `#57A6FF` | **7.8:1** | Links, focus ring, selection |
| `--sig-live` | `#FF3B30` | **5.6:1** | Live-now pulse only |

Every signal colour is AA at body size and AAA at 14px+ except `--sig-live`, which is only ever a dot beside the word "LIVE".

**The colourblind rule, enforced:** a signal colour never travels alone. `▲ +2.4%` in green, `▼ −1.1%` in red, `● LIVE`, `◆ DELAYED`. Glyph plus sign plus label means the table reads correctly in greyscale — which also means it prints, and screenshots into a deck, and survives a projector. This replaces the current palette's reliance on `text-emerald-400` / `text-red-400` alone in `IndustryTicker.tsx:19-27`.

**Brand:** the identity is the typography and a single amber wordmark. There is no purple/indigo/cyan gradient system. `--accent-primary: #6366f1` and the `bg-purple-500/[0.06]` glow in `page.tsx:243` are retired — an indigo glow behind a game card is decoration, and decoration is what we are spending to remove.

### 2.2 Type

Google Fonts only. Two families, and I am deleting two of the four currently loaded.

| Role | Font | Why |
|---|---|---|
| Data, tables, tickers, timestamps, IDs, prices | **JetBrains Mono** | Already loaded (`layout.tsx:67`) as `--font-mono`. Zero migration cost, true tabular figures, unambiguous `0/O` and `1/l` — which matters when the cell says `$1,520/kg`. |
| UI, prose, headings | **IBM Plex Sans** | Replaces DM Sans as `--font-body`. Plex is IBM's engineering-documentation face: it has the technical register DM Sans's geometric friendliness lacks, and it is metrically calm at 12–13px where this design lives. One-line change at `layout.tsx:62`. |

**Deleted:** `Orbitron` (`--font-hud`, `layout.tsx:75`) and the five locally-hosted **Satoshi** weights (`globals.css:120-148`, `/public/fonts/Satoshi-*.woff2`). Orbitron is sci-fi costume lettering; Satoshi is a second sans doing the first sans's job. Removing them drops five `.woff2` files and a `localFont` call from the critical path.

**Scale.** Terminal typography is small and tight. Base is 13px, not 16px.

| Step | Size / line-height | Tracking | Use |
|---|---|---|---|
| `t-micro` | 10 / 14 | +0.08em, uppercase | Column headers, panel labels, units |
| `t-meta` | 11 / 16 | +0.04em | Timestamps, source attribution |
| `t-data` | 12 / 18 | 0, `tabular-nums` | Table cells, ticker values |
| `t-body` | 13 / 20 | 0 | UI text, descriptions |
| `t-read` | 16 / 26 | 0 | Guide and article prose **only** |
| `t-h3` | 15 / 20 | −0.01em, 600 | Panel titles |
| `t-h2` | 20 / 26 | −0.02em, 600 | Section headings |
| `t-h1` | 26 / 32 | −0.02em, 600 | Page titles |
| `t-hero` | 34 / 40 | −0.03em, 600 | Homepage / landing only |

Note there is no 3.25rem display step. The current `--fs-display: clamp(2.25rem, …, 3.25rem)` exists to make a marketing hero shout; this design has no marketing hero to shout with. Prose pages keep `t-read` at 16px because reading a 4,000-word launch-cost guide at 13px is hostile — density serves data, not paragraphs.

### 2.3 Spacing and grid

- **Base unit 4px.** Steps: 4, 8, 12, 16, 24, 32, 48. Nothing else.
- **12 columns**, 24px gutters, `max-width: 1600px` for terminal pages (wider than today's `max-w-5xl` = 1024px, because tables want the room), `max-width: 720px` for prose.
- **Row heights:** 28px compact / 34px comfortable on desktop; **44px on touch**, always. The existing `DensityToggle.tsx` is promoted from a per-page curiosity to a global preference in the command bar.
- **Panel padding:** 12px body, 8px 12px header. Tables bleed to the panel edge — no inner padding between the gridline and the panel wall.
- **Border radius: 3px, everywhere.** The current system runs `rounded-xl`, `rounded-2xl`, `rounded-3xl` and `rounded-full` simultaneously (`page.tsx:16`, `:344`, `:390`). Soft corners read as "consumer app". 3px reads as "instrument".

### 2.4 Component inventory

| New component | Replaces / maps to | Change |
|---|---|---|
| **`Panel`** | `ui/TerminalPanel.tsx`, `ui/GlassCard.tsx`, `.card`, `.card-content`, `.card-terminal` | Promote `TerminalPanel` to the universal container. **Delete the three mac traffic-light dots** (`TerminalPanel.tsx:38-42`) — skeuomorphic kitsch that costs 3 divs on every panel and says nothing. Header becomes: `LABEL · source · updated 14:32Z` on the left, status badge right. `GlassCard` is deleted outright; frosted glass is the opposite of this brief. |
| **`DataTable`** | *(does not exist — this is the gap)* | The core new primitive. Sticky header, `tabular-nums`, sortable columns, zebra-free (gridlines instead), right-aligned numerics, left-aligned text, 3-state sort glyph, keyboard `↑↓` row focus, `/` to filter. Wraps `ui/VirtualList.tsx` past 100 rows and `ui/MobileTableView.tsx` under 640px. |
| **`StatCell`** | `ui/AnimatedCounter.tsx`, `landing/KPIStrip` | Label / value / delta / sparkline in a 4px-gap stack. **`AnimatedCounter` is deleted.** Counting a real satellite count up from zero on every page load is a small lie about what the number is doing, and it delays the reading of it. |
| **`ChartFrame`** | `/chart` page internals, `ui/StockMiniChart.tsx` | Standardise what `/chart` already does right: title, subtitle, source, as-of, the SVG, a `<details>` data table, PNG export, permalink. `StockMiniChart` becomes the `Sparkline` primitive inside `StatCell`. |
| **`Button`** | inline Tailwind across ~40 files | Three variants only: `primary` (white on ink), `ghost` (hairline border), `link` (underline, `--sig-info`). No gradients, no shadows, no `shadow-purple-500/20` (`page.tsx:299`). |
| **`Ticker`** | `ui/IndustryTicker.tsx` | **Keep — it is already correct** and it is the single most on-brief thing on the site. Restyle to mono + signal set, drop the emoji in `TYPE_ICONS` (`IndustryTicker.tsx:31-39`) for glyphs, and pause on `prefers-reduced-motion`. |
| **`StatusBadge`** | `.badge`, `ConfidenceBadge`, `DataFreshnessBadge`, `DataFreshnessIndicator`, `DataAsOf`, `LastUpdated` | **Six components doing one job.** Collapse to one: `<StatusBadge kind="live\|stale\|delayed\|verified" asOf={date} />`. |
| **`Skeleton`** | `ui/Skeleton.tsx`, `CardSkeleton.tsx`, `GridSkeleton.tsx` | Collapse three into one `RowSkeleton` that renders at the *exact* final row height so nothing shifts. |
| **`EmptyState`** | `ui/EmptyState.tsx` | Keep, restyle, and require a `reason` prop (see §5). |
| **`CommandBar`** | `components/Navigation.tsx` (989 lines) | See §3. |

**Deleted on sight:** `ui/StarField.tsx`, `ui/SpaceIllustration.tsx`, `ui/HeroArt.tsx`, `ui/ScrollReveal.tsx`, `ui/AnimatedPageHeader.tsx`, `ui/GlassCard.tsx`, `ui/AnimatedCounter.tsx`, `landing/FloatingCTA.tsx`, `landing/BentoFeatures.tsx`, `landing/DemoShowcase.tsx`, `landing/HowItWorks.tsx`, `landing/SocialProof.tsx`.

That is twelve components and roughly 2,400 lines removed. None of them display a number.

---

## 3. Navigation model

### The command bar

A single 48px bar, monochrome, sticky, no second row:

```
SPACENEXUS │ Launches  News  Markets  Business  Learn │ ⌘K Search    ● LIVE (2)   Tycoon   ▤ Density   Account
```

**Kept:** the five menus from `site-directory.ts`. The 2026-08-28 nav overhaul was right and I am not undoing it — `nav: true` gating plus "Everything in … →" into `/tools` is exactly the correct structure. I am restyling it, not rebuilding it.

**Changed:**

- **`⌘K` becomes the primary navigation.** The search box already exists in `Navigation.tsx` with a `Ctrl+K` hint; today it is a box that sits there. It becomes a real command palette: type `f9` → Falcon 9; `sto` → Space Stocks; `>density compact` → a command. For 129 surfaces, search *is* the information architecture, and the menus are the discoverable fallback.
- **`/tools` is retitled "Index"** and reached from `⌘K` and the footer. URL unchanged — it ranks, and `next.config.js` already carries 100+ redirects without needing another.
- **"Jobs" is repointed to the actual job board.** Today the nav's Jobs link (`Navigation.tsx:461`) goes to `/space-talent`, which defaults to the `talent` tab (`space-talent/page.tsx:1202`), and `/jobs` redirects to `?tab=workforce` (`next.config.js:372`) — a workforce-analytics view. Meanwhile `site-directory.ts` describes Jobs as "Thousands of space jobs, synced daily" and marks it `hot`. **The ~6,500-listing board that the 06:30 cron fills is currently two clicks behind a trends chart.** Either give `/space-talent` a real `jobs` top-level tab or point the nav at `/space-talent/browse`. This is the single highest-value nav fix on the page and it costs an hour.
- **`● LIVE (2)`** replaces the standalone "Live" link — a count, not a word. Zero live streams means the indicator greys out rather than lying.
- **"Space Tycoon" stays top-level.** It is the stickiest surface on the site and the code says so (`page.tsx:82`). It keeps a text link, loses the 🎮 emoji.

**Removed:**

- **The left icon rail** — ~15 unlabelled emoji glyphs down the viewport edge (visible in the returning-visitor screenshot). Unlabelled emoji is not navigation; it is a memory test. Its contents are already in the menus and in `⌘K`.
- **"Upgrade" button** (`Navigation.tsx:492`) and **"Pricing"** (`:473`) — both move into the Account menu. Monetization is on hold until ~November per the standing strategy; a permanent Upgrade button in the command bar is chrome earning nothing.
- **The 14-day-trial banner** and the **Google Play internal-test banner**. Two full-width bars above the nav, on every page, for every visitor. The Play test is an email-the-owner invitation to an internal test — that is a footer note, not a sitewide interstitial.
- **`FloatingCTA`** (`page.tsx:487`), the **Quick Start 0/5 checklist overlay**, and the **edge "Feedback" tab**. On the returning-visitor screenshot three overlays are on screen simultaneously with the cookie bar. Feedback moves to the footer and `/feedback`.

**Demoted to `/tools` only:** nothing new. The 8/28 census already did this work; re-cutting it would be churn.

---

## 4. Page templates

### 4.1 Homepage — "The Front Page"

The thesis in one screen. Everything below is real and already in the database.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ SPACENEXUS │ Launches News Markets Business Learn │ ⌘K │ ●LIVE(1) Tycoon Acct │ ← 48px, only bar
├────────────────────────────────────────────────────────────────────────────────┤
│ ▲UFO 28.14 +1.2% │ ▼RKLB 41.09 −0.8% │ ●LIVE Starbase Rover 3 │ T-1d1h RFA One │ ← Ticker, kept from
├────────────────────────────────────────────────────────────────────────────────┤    IndustryTicker,
│                                                                                │    36px, pauses on
│  NEXT LAUNCH                                          26 sources · 14:32Z UTC  │    reduced-motion
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  T− 01:24:36                                        RFA One              │  │ ← Countdown is the
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░  Rocket Factory Augsburg · SaxaVord · [Watch ▸]     │  │    hero. No headline,
│  └──────────────────────────────────────────────────────────────────────────┘  │    no subhead, no
│                                                                                │    two CTAs.
├──────────────────────────┬───────────────────────────┬─────────────────────────┤
│ MANIFEST      next 30d ▸ │ THE WIRE          all ▸   │ MARKETS         all ▸   │ ← 4 / 5 / 3 columns
│ ──────────────────────── │ ─────────────────────────  │ ─────────────────────── │
│ T-1d1h  RFA One          │ 14:02  NASASpaceflight     │ UFO    28.14  ▲ +1.2%   │
│         SaxaVord         │  NASA's New Space Telescope│ ARKX   24.87  ▲ +0.4%   │
│ T-1d1h  Mir              │ ─────────────────────────  │ ROKT   19.02  ▼ −0.9%   │
│         ADD · Naro       │ 11:47  SpaceNews           │ ITA   142.60  ▲ +0.2%   │
│ T-31d   Long March 5     │  Long March 5 rolls out    │ ─────────────────────── │
│         CASC · Wenchang  │ ─────────────────────────  │ FUNDING        90d      │
│ T-33d   Electron         │ 09:15  Ars Technica        │ $65.0B  253 companies   │
│         Rocket Lab · LC-1│  Starship static fire      │ 131 rounds tracked      │
│ ──────────────────────── │ ─────────────────────────  │ ─────────────────────── │
│ 12 more this month    ▸  │ AI INSIGHTS         all ▸  │ COST/KG                 │
│                          │ ◆ Regulatory · 2h          │ Falcon Heavy    $1,520  │
│                          │  Export-control shift…     │ Falcon 9       ~$3,070  │
│                          │ ◆ Market · 5h              │ Electron       $25,000  │
│                          │  LandSpace's cadence…      │ Starship tgt     <$100  │
└──────────────────────────┴───────────────────────────┴─────────────────────────┘
│  LAUNCH CADENCE — orbital launches per month, trailing 12                       │ ← Reuses /chart's
│  ▁▂▃▅▄▆▇▆█▇▆█   [data ▾] [PNG] [permalink]              source: LL2 · 14:00Z    │    server-rendered SVG
├────────────────────────────────────────────────────────────────────────────────┤
│  ROCKETS — 23 operational vehicles                                    all ▸    │ ← THE proof point:
│  VEHICLE            OPERATOR       $/LAUNCH   LEO      REL.    90d    NEXT     │    the /rockets data
│  Falcon 9 Block 5   SpaceX          ~$67M     23.0t   99.5%     39    T-4d     │    that is currently
│  Electron           Rocket Lab      ~$7.5M     0.3t   95.1%      6    T-33d    │    23 cards, as the
│  Starship           SpaceX          ~$10M    150.0t      —       3    TBD      │    table it always was
│  Atlas V            ULA            ~$110M     19.0t   99.0%      1    T-88d    │
│  New Glenn          Blue Origin     ~$68M     45.0t   67.0%      2    T-51d    │
├────────────────────────────────────────────────────────────────────────────────┤
│  SPACE TYCOON  free · browser        │ 1 ORBITAL DYNAMICS      $2.41B  ▲       │ ← One row, not a
│  39 buildings · 240+ tech · 12 res.  │ 2 HELION FREIGHT        $1.88B  ▲       │    hero card with a
│  [Play ▸]  [What is it?]             │ 3 CERES MINING CO.      $1.52B  ▼       │    purple glow
└──────────────────────────────────────┴─────────────────────────────────────────┘
   Digest M/Th · Index (129) · Data sources · API · Feedback · About · Pricing
```

**Annotations.** Nine sections replace seventeen; the page lands near **3,000px instead of 11,045px**. Every element above the fold is a live number from an existing query. The "26 live data sources / 16,000+ satellites" stat pair survives — but as a timestamped source line, not an animated counter. `HowItWorks`, `SocialProof`, `BentoFeatures`, `DemoShowcase` and `PersonaPicker` all come out: a person who arrives at a terminal and sees the terminal does not need a three-step explanation of what a terminal is. APOD moves to `/mission-control`, where a picture belongs.

### 4.2 Launch page — `/launches/[mission]`

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Launches › Falcon 9 › Starlink Group 12-4                    ●LIVE  ⌂ Alert ▸ │
├────────────────────────────────────────────────────────────────────────────────┤
│  T− 00:41:07                                    ┌───────────────────────────┐  │
│  STARLINK GROUP 12-4                            │                           │  │
│  SpaceX · Falcon 9 Block 5 · SLC-40             │   [ live stream 16:9 ]    │  │ ← Stream is a panel,
│  ◆ GO — weather 80% favourable                  │   Avid Space · 27 watching│  │   not the page. It is
│                                                  └───────────────────────────┘  │   muted, and it does
├───────────────────────────────┬────────────────────────────────────────────────┤   not autoplay audio
│ VEHICLE                       │ TIMELINE                      all times UTC    │
│ Rocket      Falcon 9 Block 5  │ T−00:38  Propellant load                       │
│ Cost/launch        ~$67M      │ T−00:07  Engine chill                          │
│ LEO capacity        23.0t     │ T−00:01  Startup                               │
│ Reliability   99.5% (412/414) │ T+00:00  Liftoff                               │
│ Booster       B1080 · 12th ▸  │ T+00:08  Stage-1 landing — ASOG                │
│ Landing            ASOG       │ T+01:05  Payload deploy                        │
│ ───────────────────────────── │ ────────────────────────────────────────────── │
│ PAYLOAD                       │ SLIP HISTORY                          3 moves  │
│ Mass             ~17.5t       │ Aug 24 → Aug 27   +3d   range conflict         │ ← Slip history shipped
│ Orbit        LEO 43° · 550km  │ Aug 27 → Aug 29   +2d   weather                │   8/28; it is one of
│ Satellites           23       │ Aug 29 → Aug 30   +1d   vehicle                │   the most terminal
└───────────────────────────────┴────────────────────────────────────────────────┘   things on the site
│  WATCH IT  Cape Canaveral viewing ▸ · Playalinda Beach 12mi · sunset +18min     │ ← Enthusiast content
│  RELATED   Falcon 9 ▸ · SpaceX ▸ · Starlink constellation ▸ · Cost/kg guide ▸  │   as a data row
└────────────────────────────────────────────────────────────────────────────────┘
```

**Annotation.** The enthusiast is served *harder* here, not less: countdown, stream, timeline, viewing spots, slip history. The framing is a flight-ops board rather than a blog post about a launch. Note the outcome field is honest — this is the page that carried the 8/26 "every flown launch was scrubbed" bug, and a terminal layout makes a wrong status field impossible to hide.

### 4.3 Company page — `/company-profiles/[slug]`

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ROCKET LAB USA, INC.                          RKLB  41.09  ▼ −0.81%  ⊕ Watch  │
│ Launch Provider · Long Beach, CA · Founded 2006 · Public (NASDAQ)              │
│ ▁▂▃▂▄▅▄▆▇▆█  1D 5D 1M 6M 1Y 5Y                          as of 14:32Z · delayed │ ← StatusBadge carries
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────────┤   the delay honestly
│ MARKET CAP   │ EMPLOYEES    │ TOTAL RAISED │ LAUNCHES/90d │ SPACE SCORE        │
│ $20.1B       │ 2,100        │ $1.1B        │ 6            │ 82 / 100      ▲ +3 │
├──────────────┴──────────────┴──────────────┴──────────────┴────────────────────┤
│ [ Overview ][ Financials ][ Launches ][ Contracts ][ People ][ Filings ][ News ]│ ← Tabs, not a 4,000px
├────────────────────────────────────────────────────────────────────────────────┤   scroll
│ VEHICLES                                    │ RECENT ROUNDS & CONTRACTS        │
│ Electron    ~$7.5M   0.3t   95.1%   6/90d   │ 2026-07  NSSL Lane 1     $515M   │
│ Neutron     ~$50M   13.0t      —    TBD     │ 2026-04  NASA VADR        $86M   │
│ ─────────────────────────────────────────── │ 2026-02  Secondary offer  $355M  │
│ COMPARE ▸  vs SpaceX · vs Firefly · vs ABL  │                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Annotation.** This template is why the `'use client'` problem at `company-profiles/page.tsx:1` must be fixed first: the header block, the stat row and the first tab are all server-renderable from `CompanyProfile`, and today they arrive as "0 companies found". The `/compare` surface — already `hot` in the directory — becomes a first-class row rather than a menu item.

### 4.4 Guide — `/guide/space-launch-cost-comparison`

The one place density yields to reading.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ Guides › Launch economics                                    ▤ 18 min · Aug 26 │
├──────────────┬─────────────────────────────────────────────────────────────────┤
│ CONTENTS     │  SPACE LAUNCH COST COMPARISON 2026                              │ ← 720px measure,
│ ● Introduction│                                                                 │   16/26 Plex Sans.
│ ○ Cost/kg     │  The cost of reaching orbit is the single most important        │   The rest of the
│ ○ Historical  │  economic variable in the space industry. Launch cost           │   site is 13px; a
│ ○ Government  │  determines the viability of satellite constellations…          │   long read is not.
│ ○ Reusability │                                                                 │
│ ○ Outlook     │  ┌───────────────────────────────────────────────────────────┐ │
│ ○ FAQ         │  │ LAUNCH VEHICLE COST COMPARISON              2026 · $/kg   │ │ ← Tables inside prose
│              │  │ VEHICLE          LEO      LIST PRICE       $/kg           │ │   use the same
│ ─────────────│  │ Falcon Heavy    63.8t     ~$97M          $1,520           │ │   DataTable primitive
│ TOOLS        │  │ Falcon 9        22.8t     ~$70M          ~$3,070          │ │   as /rockets — one
│ Cost calc ▸  │  │ Electron         0.3t     ~$7.5M        $25,000           │ │   component, sitewide
│ Compare ▸    │  │ Starship (tgt)  150t         —            <$100           │ │
│ Rockets ▸    │  │ [data ▾] [PNG] [cite]         source: SpaceNexus trackers │ │
│              │  └───────────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────────────┘
```

**Annotation.** Guides are the SEO engine and the enthusiast on-ramp, so the prose column is genuinely comfortable. What changes is that **every table and figure in a guide is a live component reading the same source as `/rockets`**, with export and citation — so the guide cannot drift out of date the way a hand-typed markdown table does.

### 4.5 Game landing — `/space-tycoon`

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ SPACE TYCOON                            free · browser · no download · no P2W  │
│ An economic MMO. Most space games are about ships. This one is about balance   │
│ sheets.                                                    [ Play free ▸ ]     │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────────┤
│ BUILDINGS 39 │ RESEARCH 240+│ RESOURCES 12 │ REGIONS 8    │ EPOCH 2 · day 6    │
├──────────────┴──────────────┴──────────────┴──────────────┴────────────────────┤
│ LEADERBOARD — live                    │ MARKET — live spot prices              │
│ 1 ORBITAL DYNAMICS   $2.41B  ▲ +4.2%  │ Water ice     $412/t   ▲ +2.1%         │ ← The single best
│ 2 HELION FREIGHT     $1.88B  ▲ +1.1%  │ He-3           $8.9k/kg ▼ −0.4%        │   argument for this
│ 3 CERES MINING CO.   $1.52B  ▼ −0.6%  │ Refined Al     $1.2k/t  ▲ +0.8%        │   game is its own
│ 4 VOSTOK HEAVY IND.  $1.11B  ▲ +2.8%  │ Deuterium      $640/kg  ─  0.0%        │   market screen.
│ 5 LAGRANGE LOGISTICS $0.98B  ▲ +0.3%  │ [full market ▸]                        │   Show it.
├───────────────────────────────────────┴────────────────────────────────────────┤
│ A WEEK IN THE GAME   daily contracts → weekly leagues → quarterly reports       │
│ REGIONS  Inner ▸ Belt ▸ Luna ▸ Mars ▸ Jovian ▸ Saturnian ▸ Outer ▸ Interstellar│
└────────────────────────────────────────────────────────────────────────────────┘
```

**Annotation.** The current homepage game card sells the game with a paragraph and four emoji stat chips. A live leaderboard and a live commodity market *are* the pitch — they prove there is an economy running before you register, and they cost one query each (`getPublicLeaderboard` already exists and is already called in `page.tsx:82`).

---

## 5. Motion and states

**Motion budget: 150ms, ease `cubic-bezier(0.2, 0, 0, 1)`, opacity and 2–4px translate only.** No parallax, no scroll-triggered reveals, no counting numbers, no shimmer sweeps. The site currently ships `ScrollReveal`, `StaggerContainer`, `AnimatedCounter`, `AnimatedPageHeader`, `StarField` and framer-motion on `/company-profiles`; all are removed. Motion earns its place in exactly four situations:

| Situation | Motion |
|---|---|
| Value updates in a table/ticker | 400ms background flash in `--sig-up`/`--sig-down` at 12% alpha, then fade. This is the one animation that carries information. |
| Live pulse | 2s opacity 1→0.4 on the `● LIVE` dot only |
| Panel/menu open | 120ms opacity + 4px translate |
| Route change | Existing `NavigationProgress` hairline. Keep. |

**`prefers-reduced-motion: reduce`** — the ticker stops scrolling and becomes a static, horizontally-scrollable row (this matters: an auto-scrolling ticker is a genuine vestibular trigger); the value-flash becomes an instant background change held 800ms; the live pulse becomes a solid dot; all transitions go to 0ms. Implemented once in `globals.css`, not per-component.

**Loading.** `RowSkeleton` renders at the exact final row height so nothing reflows, and the panel header shows its label and `— · loading` immediately. Never a centred spinner on a data surface — `LoadingSpinner` is retired from tables (`mission-control/page.tsx:10` currently uses it for the whole page).

**Empty.** Every empty state answers three questions: what is missing, why, and when it changes.

> `NO LAUNCHES SCHEDULED — next 30 days` · `Manifest is complete through Oct 12. Sources refresh 06:30Z.` · `[ Show past launches ▸ ]`

This replaces `/company-profiles`'s current "0 companies found" and `/space-stocks`'s "No companies matched this category yet", neither of which says why.

**Error.** The terminal rule: **stale data beats no data.** On fetch failure the panel keeps its last good values, dims to `--text-secondary`, and shows `◆ STALE · last good 13:58Z · retrying`. A full-panel error is reserved for "we have never had this data". `FetchErrorBanner.tsx` becomes the retry affordance inside the panel header instead of a bar above the page.

**Focus.** 2px `--sig-info` outline with a 2px `--ink-void` offset on every interactive element — visible on both panel and page backgrounds. Table rows are focusable; `↑↓` moves, `Enter` opens, `/` filters, `Esc` clears.

---

## 6. Mobile — what changes at 390px

The measurement to beat: **15,667px of homepage**, behind a full-screen 7-option persona modal and a cookie bar.

- **Command bar collapses to `SPACENEXUS · ⌘K · ●LIVE · ☰`.** The existing bottom tab bar stays — it is the right pattern and it already works.
- **The ticker survives.** It is 36px, it is the most information-per-pixel element on the site, and it is native to a phone. It becomes swipeable and drops to a static scroll under reduced-motion.
- **Three columns → one column, in this order:** countdown → manifest → wire → markets. Markets last on a phone; the enthusiast is the majority mobile visitor and the founder's stated priority.
- **Tables become `MobileTableView` key–value rows** — the component already exists and is barely used. Each row is a 44px-min tappable block: primary value large, 2–3 secondary fields as `label · value` pairs, the rest behind "more ▾". Horizontal-scroll tables are banned; a table that must scroll sideways on a phone is a table that was never designed for one.
- **Density defaults to comfortable (44px)** on touch; the compact toggle is available but never the default.
- **Prose stays 16px.** Nothing about density applies to reading.
- **First visit gets one decision, not four.** The 4-step / 7-persona onboarding becomes a single dismissible strip under the ticker: `Here for launches, or for the industry?  [Launches] [Industry] [Both ✕]`. It is a strip, not a modal, so the data behind it is visible and usable while the visitor decides — and a visitor who ignores it loses nothing. (Correctly first-visit-gated today, per §0 — the change is the *shape*, not the gating.)
- **Overlay budget: one.** Cookie bar, Quick Start checklist, feedback tab and floating CTA cannot co-occur; on a 390×844 screen those four consume roughly a third of the viewport.

---

## 7. Migration plan

Three phases. The order is chosen so that **phase 1 alone is worth shipping** even if 2 and 3 never happen.

### Phase 1 — Tokens, chrome, and the two broken surfaces · **5 days**

The highest ratio of user-visible gain to risk. No new components; mostly deletion.

| Touchpoint | Work | Days |
|---|---|---|
| `src/app/globals.css:37-120` | New ink + signal token values under existing token names, so every consumer inherits. Radius → 3px. Reduced-motion block. | 1.0 |
| `src/app/layout.tsx:62-89` | DM Sans → IBM Plex Sans; delete Orbitron + Satoshi `localFont`; delete `/public/fonts/Satoshi-*.woff2`. | 0.5 |
| `src/components/Navigation.tsx` | Remove icon rail, Upgrade, Pricing, trial banner, Play banner. Repoint **Jobs** (`:461`) at the real board. Wire `⌘K` to a real palette. | 1.5 |
| `src/app/page.tsx` | Delete `BentoFeatures`, `DemoShowcase`, `HowItWorks`, `SocialProof`, `FloatingCTA` imports + sections. | 0.5 |
| `mission-control/page.tsx:1`, `company-profiles/page.tsx:1` | Split each into a server shell (header, stats, first screen of rows) + a client island for filters/interaction. | 1.5 |

**Ship gate:** homepage under 4,000px; `/mission-control` and `/company-profiles` return real rows in `curl` output.

### Phase 2 — The `DataTable` and the panel system · **6 days**

| Touchpoint | Work | Days |
|---|---|---|
| `src/components/ui/DataTable.tsx` *(new)* | Sort, sticky header, tabular-nums, keyboard rows, `VirtualList` over 100, `MobileTableView` under 640px. | 2.0 |
| `src/components/ui/Panel.tsx` | `TerminalPanel` → `Panel`; drop traffic-light dots; header = label · source · as-of · status. | 0.5 |
| `StatusBadge` consolidation | Collapse `ConfidenceBadge`, `DataFreshness*` ×3, `DataAsOf`, `LastUpdated` → one. | 0.5 |
| `/rockets`, `/launch-vehicles`, `/space-stocks`, `/company-profiles`, `/funding-tracker` | Cards → `DataTable`. This is where the density thesis becomes visible. | 2.0 |
| `Skeleton`/`CardSkeleton`/`GridSkeleton` → `RowSkeleton`; `EmptyState` gains `reason`; stale-not-blank error path | Per §5. | 1.0 |

### Phase 3 — Templates and the long tail · **7 days**

| Touchpoint | Work | Days |
|---|---|---|
| `src/app/page.tsx` | Rebuild as the three-column Front Page per §4.1. | 2.0 |
| Launch + company templates | §4.2, §4.3, incl. tabs on company pages. | 2.0 |
| `/space-tycoon` landing | Live leaderboard + live market panel. | 1.0 |
| Guide template + shared table components in prose | §4.4. | 1.0 |
| Delete the twelve retired components; sweep `rounded-xl/2xl/3xl` and legacy `--v2-*` aliases | Cleanup. | 1.0 |

**Total ≈ 18 days.** Phases are independently shippable to `dev`, which auto-deploys — so this lands as ~6 pushes, not one.

---

## 8. Risks, and what I would cut first

**Risks, honestly stated.**

1. **Density can read as coldness, and the founder's stated first priority is enthusiasts.** A twelve-year-old who came to watch a Starship launch does not want a Bloomberg screen. *Mitigation, and it is load-bearing:* the countdown, the stream and the viewing guides get the largest, warmest, most prominent treatment on every launch surface. The terminal aesthetic applies to *tables of things*, not to *the moment a rocket leaves the pad*. If this redesign makes launch day feel clinical, it has failed regardless of how good `/rockets` looks.
2. **SEO regression on a ranking estate.** `/guide/*` and the jobs pages rank and drive the funnel. Phase 3 touches templates, not URLs, and Phase 1 *improves* crawlability by server-rendering two pages that currently emit "Loading…" — but per the roadmap's own lesson, **pull per-URL Search Console data before any template change on a ranking page.**
3. **Empty panels look worse than empty cards.** A three-column terminal with two columns of "no data" is more damning than a marketing section. `/space-stocks` returning no ticker rows in my fetch is a live example. Fix the feeds before shipping the layout that exposes them.
4. **18 days of design work produces zero new information.** Every one of the ~450 current actives already gets the data; a redesign monetizes attention it does not yet have. This is a bet that presentation is the growth constraint. It is a defensible bet — the site's problem is 129 surfaces nobody can navigate — but it is a bet.
5. **`Navigation.tsx` is 989 lines and touched by every page.** Phase 1 concentrates risk there. Ship it behind a preview deploy and check the mobile tab bar and the Pro-gating logic explicitly.

**What I would cut first, in order.**

1. **Phase 3 entirely.** Phases 1–2 deliver ~80% of the perceived change for 11 of 18 days. The homepage rebuild is the most visible and the least load-bearing.
2. **The `⌘K` command palette.** It is the elegant answer to 129 surfaces, but the five menus already work. Two days that can wait.
3. **The IBM Plex Sans swap.** DM Sans is not *wrong*, just friendlier than this brief wants. Keeping it saves half a day and all font-loading risk.
4. **The `/space-tycoon` live market panel.** Delightful, genuinely persuasive, and entirely optional.

**What I would not cut under any circumstances**, because each is a bug or near-bug rather than a preference:

- The **Jobs → job board** repoint. The 6,500-listing board the cron fills twice daily is currently behind a workforce-trends tab. One hour.
- **Server-rendering `/mission-control` and `/company-profiles`.** They are the two most valuable pages on the site and they ship empty shells to crawlers and slow phones.
- **The banner and overlay cull.** Three stacked bars above the nav and four simultaneous overlays cost nothing to remove and are the first thing every new visitor sees.
