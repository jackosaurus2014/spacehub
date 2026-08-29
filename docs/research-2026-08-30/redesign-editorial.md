# Brief C — "The Journal"

**An editorial magazine with data.** SpaceNexus is not a dashboard product. It is a
publication that happens to own its own instruments. The redesign makes that literal.

The wager, in one sentence: **the site's problem is not that it looks dated, it is that it
looks *provisional* — 124 surfaces of white-on-black cards that all carry the same weight,
so nothing reads as authored.** `/rockets`, the guides and `/chart` already prove the
opposite is possible. The Journal generalises those three and lets the rest inherit.

---

## 1. Design principles (5 lines)

1. **Two grounds, one system.** Reading surfaces are *paper*; live surfaces are *ink*. The article and the ops room are different rooms, and the reader should feel the door.
2. **Hierarchy over decoration.** One serif display face, a real deck, and a 68ch measure do more for authority than any glow, gradient or terminal chrome.
3. **A chart is an article.** Every chart gets a title, a source line, a permalink and a table — publishable on its own, not a widget inside something else.
4. **Live is a rail, not a room.** The next launch is a persistent one-line instrument in the masthead, above the fold on every page, server-rendered.
5. **The long tail lives in the back of the book.** Five sections in the masthead; everything else in The Index. A menu is an editorial judgement, not a sitemap.

---

## 2. Design system

### 2.1 Palette

Two grounds. Same token *names*, different values, switched by `data-ground` on `<body>`.
Every component reads tokens; nothing reads a hex.

#### Paper — front page, sections, guides, articles, company pages, charts

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--ground` | `#FBF8F3` | page | warm off-white; never `#fff`, which flares under a bright launch photo |
| `--ground-raised` | `#FFFFFF` | cards, chart frames | cards lift *toward* white on paper |
| `--ground-sunken` | `#F3EEE5` | table zebra, pull-quotes, colophon | 1.06:1 vs ground — texture, not contrast |
| `--rule` | `#E3DDD2` | hairlines, table borders | decorative only, never load-bearing |
| `--rule-strong` | `#C9C0B2` | section-opener rules, active tab | |
| `--ink-900` | `#14110D` | headlines, body | **17.1:1** on ground — AAA |
| `--ink-600` | `#4A4238` | deck, secondary body | **9.4:1** — AAA |
| `--ink-400` | `#6E665A` | bylines, timestamps, table meta | **5.3:1** — AA at any size |
| `--signal` | `#C8102E` | live, countdown, failure | **5.6:1** — AA for text *and* the 3:1 UI threshold |
| `--link` | `#1F4E79` | links, primary button ground | **8.0:1**; always underlined, so colour is never the only cue |

#### Ink — Mission Control, /live, /space-tycoon, and the masthead live rail

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--ground` | `#12100E` | page | warm near-black, **not** today's `#000000` |
| `--ground-raised` | `#1B1815` | cards | |
| `--ground-sunken` | `#0C0A09` | wells, code | |
| `--rule` | `#2E2924` | hairlines | |
| `--ink-900` | `#F7F3EC` | headlines, body | **16.4:1** |
| `--ink-600` | `#B4ABA0` | secondary | **8.3:1** |
| `--ink-400` | `#8A8177` | meta | **4.9:1** — AA |
| `--signal` | `#FF4D5E` | live, countdown | **5.8:1**. The paper red is 3.2:1 on ink — this pair must not be collapsed into one hex, which is the mistake `--status-critical: #FF3838` makes today by being used on both. |
| `--link` | `#7FB2E5` | links | **8.1:1** |

**Chart series** — five, fixed order, both grounds:

| # | Paper | Ink | Name |
|---|---|---|---|
| 1 | `#1F4E79` | `#7FB2E5` | Blue |
| 2 | `#C8102E` | `#FF4D5E` | Signal |
| 3 | `#B45309` | `#E8A33D` | Oxide |
| 4 | `#2E6F5E` | `#56C4A7` | Verdigris |
| 5 | `#6B4E8C` | `#B695DC` | Aubergine |

Colourblind note: 1 vs 5 (blue/aubergine) is the weak pair under deuteranopia, 2 vs 3 under
protanopia. The mitigation is structural, not chromatic — **every series carries a direct
end-of-line label, and every non-line mark carries a distinct fill pattern.** Status
colours always ship with a glyph (`●` `▲` `■`) *and* a word. This is already the rule in
`CLAUDE.md`; `globals.css:78-84` currently defines five status hexes with no glyph contract
attached to them.

**What this replaces:** `src/app/globals.css:47-84` — `--bg-void: #000000`,
`--text-primary: #ffffff`, `--accent-primary: #6366f1` (indigo), `--accent-secondary:
#22d3ee` (cyan). The indigo/cyan pair is the most generic thing on the site: it is the
homepage Space Tycoon button (`src/app/page.tsx:322`), the leaderboard strip (`:344`), and
every `section-header__bar` gradient. It goes.

### 2.2 Type

**Three families. All Google Fonts. Net −5 font files versus today.**

| Role | Family | Why |
|---|---|---|
| Display **and** article body | **Fraunces** (variable: `opsz 9–144`, `wght 300–900`, `SOFT`, `WONK`) | one serif does both jobs — that is precisely what the optical-size axis is for |
| UI | **Inter** (variable) | nav, labels, buttons, chips, table headers |
| Data | **JetBrains Mono** | all numerals, `tabular-nums` — already in the stack |

**Removed:** Satoshi (5 local `.woff2` in `public/fonts/`, 3 of them `<link rel=preload>` at
`src/app/layout.tsx:274-276`), Orbitron (`layout.tsx:75`, `--font-hud`), DM Sans
(`layout.tsx:62`). Satoshi is a good grotesk doing a job Inter already does; Orbitron is
sci-fi costume. Eight files become three variable files and the LCP preload chain shortens
by two requests.

**Scale** — 1.25 ratio, fluid; `opsz` tracks size automatically so small text thickens and
large text refines without a second family:

| Name | Font | Size | LH | Tracking |
|---|---|---|---|---|
| `masthead` | Fraunces 900, `opsz 144`, `WONK 1` | `clamp(2.75rem, 5vw, 4.25rem)` | 1.02 | −0.022em |
| `lead` | Fraunces 700, `opsz 96` | `clamp(2rem, 3.4vw, 3rem)` | 1.08 | −0.018em |
| `h1` | Fraunces 600, `opsz 72` | 2.5rem | 1.12 | −0.014em |
| `h2` | Fraunces 600, `opsz 48` | 1.75rem | 1.20 | −0.010em |
| `h3` | **Inter** 600 | 1.125rem | 1.30 | +0.005em |
| `deck` | Fraunces 400 *italic*, `opsz 24` | 1.25rem | 1.50 | 0 |
| `body` | Fraunces 400, `opsz 14` | 1.125rem | **1.65** | 0 |
| `ui` | Inter 500 | 0.875rem | 1.45 | 0 |
| `kicker` | Inter 600, uppercase | 0.75rem | 1.20 | **+0.09em** |
| `data` | JetBrains Mono 500, `tabular-nums` | 0.9375rem | 1.35 | 0 |

The rank break at H3 is deliberate: serif for the two levels a reader *scans*, sans for the
level they *use*. It makes the coloured `section-header__bar` gradient
(`globals.css:609`) redundant.

**Measure:** the body column is hard-capped at `68ch`. Today the homepage content cards run
`max-w-5xl` at `text-sm` (`page.tsx:214`) — about 110 characters at 14px, which is why the
site reads as a feed rather than as writing.

### 2.3 Spacing and grid

- **Base 4px.** Vertical rhythm on an 8px baseline; every block height is a multiple.
- **Three column widths, and only three:**
  - `--col-read` **720px** (68ch) — body copy, decks, quotes
  - `--col-wide` **1080px** — charts, tables, card rows, launch lists
  - `--col-bleed` **1440px** — section openers, hero art, the live rail
- **Section spacing** 96px desktop / 56px at 390. Replaces `section-spacer` and
  `section-spacer-sm`, which vary 24–64px with no stated rule.
- **Whitespace budget:** no more than **three modules per 900px screenful**. The current
  homepage renders 14 sections (`src/app/page.tsx:203-490`); that is the entire diagnosis.
- **12 columns only inside `--col-wide`**, 24px gutters. Everything else is one column.

### 2.4 Component inventory

| Journal component | What it is | Maps to today |
|---|---|---|
| **Masthead** | date · live rail · wordmark · 5 sections · Index · Tycoon | `src/components/Navigation.tsx` (989 lines → target ~350) |
| **LiveRail** | one server-rendered line: `T−04:12:07 · Falcon 9 · Starlink 12-8 · Cape SLC-40 · Watch` | new; replaces the four `DataCard`s in `LandingHero.tsx:41-63` |
| **SectionOpener** | full-bleed art + kicker + serif H1 + deck + rule | `ui/HeroArt.tsx` — already correct. Extend from 7 pages to every section front; 43 assets sit in `public/art/` and only 6 are used |
| **Story** (lead / standard / brief) | three densities of one card: art, kicker, serif headline, deck, byline · time | `ui/GlassCard.tsx`, `.card-content` (`globals.css:546`), the inline card at `page.tsx:220-243` |
| **DataCard** | mono figure + label + as-of + source link | `.card-data` (`globals.css:509`), `ui/AnimatedCounter.tsx`, `ui/StockCard.tsx` |
| **ChartFrame** | `figure`/`figcaption`: title, deck, plot, legend, **source + as-of + permalink + table toggle** | `src/lib/charts/{registry,render,data}.ts` + `/chart` — already server-renders SVG with PNG and a table. It is the best thing on the site and the front page does not link to it. |
| **DataTable** | serif caption, Inter header, mono cells, zebra on `--ground-sunken`, sticky header, scroll shadow | `ui/MobileTableView.tsx`, `ui/VirtualList.tsx`, the rockets/guide tables |
| **Button** | `primary` (solid `--link`), `secondary` (rule outline), `quiet` (underline only) — three, not more | `.btn-primary` / `.btn-secondary` / `.btn-ghost` (`globals.css:410-455`) — keep the API, restyle |
| **Kicker** | uppercase Inter category label — **outline, not filled** | `CATEGORY_COLORS` (`page.tsx:180-188`), seven filled pastel pills, becomes seven outline labels |
| **Deck / standfirst** | italic serif intro paragraph | **does not exist today.** The single highest-leverage new component on the list |
| **SourceLine** | `Source: CelesTrak · as of 29 Aug 2026 14:02 UTC` | `ui/SourceCitation.tsx`, `ui/DataAsOf.tsx`, `ui/DataFreshness.tsx`, `ui/DataFreshnessBadge.tsx`, `ui/DataFreshnessIndicator.tsx` — **five components for one idea; merge to one** |
| **The Index** | the `/tools` directory, grouped and searchable | `src/app/tools/page.tsx` + `components/directory/DirectoryBrowser` — already server-rendered, keep |

**Deleted:** `.card-terminal` with its dots and `__path` (`globals.css:562-600`) — the fake
macOS terminal chrome around the homepage game card is the loudest un-editorial object on
the site; `ui/StarField.tsx` and `.starfield`; `ui/TerminalPanel.tsx`; the four
`DataFreshness*` variants, collapsed into `SourceLine`.

---

## 3. Navigation model

**Today:** ten top-level items at `lg` (`Navigation.tsx:398-478`) — Home, Live, Launches,
News, Markets, Business, Learn, Jobs, 🎮 Space Tycoon, Pricing — plus search, login and
register. Twelve targets in one bar.

**The Journal masthead — two rows, seven targets.**

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Sat 29 Aug 2026   ● T−04:12:07  Falcon 9 · Starlink 12-8 · Cape SLC-40  Watch → │  ← LiveRail · 32px · ink · SSR
├──────────────────────────────────────────────────────────────────────────────────┤
│  SPACENEXUS         LAUNCHES  NEWS  MARKETS  BUSINESS  LEARN    Index ⌕ Sign in  │
│                                                                  Space Tycoon →  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **Kept unchanged:** the five section words. They are the `menu: true` groups in
  `site-directory.ts`, and that model is right — do not touch it.
- **Removed — Home.** The wordmark is the front page. `Navigation.tsx:398-408` currently
  ships a logo *and* the word "Home" inside the same link.
- **Removed — Pricing.** To the account menu and the colophon. Monetization is on hold to
  ~November; a price link in the masthead of a free publication costs trust and earns
  nothing.
- **Demoted — Live.** It stops being a section word and becomes the LiveRail, which is
  strictly better: above the fold on *every* page instead of one click from one page, and
  it answers the question ("what's next?") rather than offering a destination.
- **Merged — Jobs.** It stays in **Business → Jobs**, where it already is. It is also a bug
  today: `Navigation.tsx:461` labels a link "Jobs" and points it at `/space-talent`, while
  `site-directory.ts` has "Jobs" → `/jobs`, which `next.config.js:372` 301s to
  `/space-talent?tab=workforce`. Two links called Jobs, three destinations. One row wins.
- **Set apart — Space Tycoon.** Right-aligned, below the section words, with a rule between.
  It is not a section of the publication; it is the other thing the site is. The 🎮 goes —
  the type carries it.
- **Promoted — The Index** (today `/tools`). Renamed because "Tools" undersells it: it is
  the back of the book and the only honest home for the ~90 surfaces that are not in a
  menu. The two menu-less groups in `site-directory.ts` — `ops` (31 entries) and
  `reference` (13) — become its spine: **Calculators & Engineering** and **Sources, Data &
  Account**.

**Dropdowns** are kept but restyled: from five-column mega-panels to a two-column list at
`--col-wide` — the seven `nav: true` rows in Fraunces 1.0625rem with an Inter description,
a rule, then `Everything in Launches →`. **No icons.** The 20 emoji in the Launches group
are doing tone work that type should do.

**To the colophon:** Pricing, About, Help, Feedback, Advertise, Developer API, Widgets,
Data Sources — four columns on `--ground-sunken`.

---

## 4. Page templates

### 4.1 Front page — `/`

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║ ● T−04:12:07  Falcon 9 · Starlink 12-8 · Cape SLC-40                   Watch → ║  (1)
╟──────────────────────────────────────────────────────────────────────────────────╢
║  SPACENEXUS         LAUNCHES NEWS MARKETS BUSINESS LEARN   Index ⌕ Sign in      ║
║                                                            Space Tycoon →       ║
╚══════════════════════════════════════════════════════════════════════════════════╝
   ┌──────────────────────────────────────────────┐ ┌──────────────────────────────┐
   │ LAUNCH ANALYSIS                              │ │ NEXT FIVE LAUNCHES       (3) │
   │                                              │ │ ──────────────────────────── │
   │ Artemis II Flew. Here Is                     │ │ T−04:12  Falcon 9            │
   │ What It Cost.                            (2) │ │          Starlink 12-8       │
   │ ──────────────────────────────────────────── │ │          Cape SLC-40 Watch → │
   │ Four days, one free-return trajectory, and   │ │ ──────────────────────────── │
   │ the first crewed lunar flyby since 1972 —    │ │ 31 Aug   Electron            │
   │ against a program that has now spent $53.5bn.│ │ 02 Sep   Falcon 9            │
   │                                              │ │ 09 Sep   Soyuz-2.1b  ▲ 3d    │
   │ [ ──── 21:9 hero art, /art/*.webp ────────── ]│ │ 12 Sep   New Glenn           │
   │                                              │ │                              │
   │ SpaceNexus staff · 8 min · 29 Aug            │ │ Full schedule →              │
   └──────────────────────────────────────────────┘ └──────────────────────────────┘
                     720px lead                              360px rail
   ─────────────────────────────────────────────────────────────────────────────  (4)
   CHART OF THE WEEK                                       /chart/launches-per-month
   Orbital launches per month
   Completed and failed attempts worldwide, last 12 months.
   ┌───────────────────────────────────────────────────────────────────────────────┐
   │  ▇▇  ▇▇  ▇▇▇ ▇▇  ▇▇▇▇ ▇▇▇ ▇▇▇▇▇ ▇▇▇▇  ▇▇▇▇▇▇ ▇▇▇▇▇ ▇▇▇▇▇▇▇ ▇▇▇▇▇▇▇▇         │
   └───────────────────────────────────────────────────────────────────────────────┘
   Source: SpaceNexus launch tracker · as of 29 Aug 2026 · PNG · Table
   ─────────────────────────────────────────────────────────────────────────────
   THIS WEEK                                                             (5) 3-up
   ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
   │ [ 16:9 ]            │ │ [ 16:9 ]            │ │ [ 16:9 ]            │
   │ MARKETS             │ │ POLICY              │ │ GUIDE               │
   │ SPCX Since the IPO  │ │ The Artemis III     │ │ What It Costs to    │
   │                     │ │ Paradox             │ │ Launch a CubeSat    │
   │ 6 min · 27 Aug      │ │ 5 min · 26 Aug      │ │ Updated 25 Aug      │
   └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
   ─────────────────────────────────────────────────────────────────────────────
   THE NUMBERS                                                               (6)
   ┌──────────┬──────────┬──────────┬──────────┐
   │ 11,847   │ $2.4bn   │  6,512   │   414    │   mono · tabular · each figure
   │ ACTIVE   │ FUNDING  │  OPEN    │ LAUNCHES │   links to the page that owns it
   │ SATS     │ Q3 2026  │  JOBS    │ 2026 YTD │
   └──────────┴──────────┴──────────┴──────────┘
   Sources: CelesTrak · SpaceNexus funding tracker · 16 ATS boards · as of 14:02 UTC
   ─────────────────────────────────────────────────────────────────────────────
   ┌───────────────────────────────────────────────────────────────────────────┐
   │ SPACE TYCOON                                                          (7) │
   │ Most space games are about ships. This one is about balance sheets.       │
   │ A free browser MMO with no combat, built on the same launch and market     │
   │ data as the rest of the site.                                             │
   │ [ 21:9 region art ]                     Play free →    What is it? →      │
   └───────────────────────────────────────────────────────────────────────────┘
   ─────────────────────────────────────────────────────────────────────────────
   THE M/TH DIGEST — Mondays and Thursdays.   [ email             ] [ Subscribe ]
   ═══════════════════════ colophon · 4 columns · sunken ground ═══════════════════
```

**1 — The rail is server-rendered, and it is the fix for this brief's hardest constraint.**
`LandingHero.tsx:78-133` initialises `nextLaunch` to `'—'`, `weatherSummary` to `'—'` and
`fundingValue` to `'—'`, then fetches `/api/pulse` inside a `useEffect`. The live HTML of
`spacenexus.us` today reads "Next Launch (LIVE) —", "Space Weather: checking", "VC Funding:
loading". The site's own headline promise — *"Every launch. Live, tracked, explained."* — is
four em-dashes on first paint and to every crawler. The rail is one Prisma call in the root
layout.

**2 — One lead story, 720px, serif, with a deck.** Today's hero is a headline, a subhead,
two CTAs, four dead data cards and a `PLATFORM_STATS` strip ("40+ modules · 250+ articles ·
26 sources") — the site talking about itself. A publication leads with the best thing it
published.

**3 — Next five launches, on the front page, always.** `/launches` and `/rockets` already
hold this data server-side (`launches/page.tsx:7`, `force-dynamic`). The slip flag (`▲ 3d`)
uses the slip-history data that shipped in Tier 1.

**4 — Chart of the Week takes front-page position.** `src/lib/charts/` shipped 8/29 with
five registered charts, SVG + PNG + table + permalink — and nothing on the front page links
to it. The cheapest credibility win available.

**5 — Three stories, not fourteen sections.** This replaces Today's Reads (2 cards) +
Latest from SpaceNexus (4) + `BentoFeatures` (7 tiles) + `DemoShowcase` + `HowItWorks` +
`SocialProof` + `ModuleContainer` + `FloatingCTA` + `PersonaPicker`.

**6 — The Numbers replaces `KPIStrip`.** Same figures, but each links to the page that owns
it and the block carries one source line. An animated counter with no source is decoration;
a sourced figure with a link is journalism.

**7 — The game gets a paragraph, not a spec sheet.** Today it gets terminal chrome, a 🎮,
four stat chips (39 buildings / 240+ research / 12 resources / Global ranking) and a purple
glow. The copy that actually sells it is already written, on `/space-tycoon/about`: *"Most
space games are about ships. Space Tycoon is about balance sheets."* Use it.

**Removed from the front page:** `PersonaPicker`, `DemoShowcase`, `HowItWorks`,
`SocialProof`, `BentoFeatures`, `FloatingCTA`, `ModuleContainer` ("Your Dashboard" — it
moves to `/dashboard`, where it belongs), the leaderboard strip (onto the Tycoon block) and
`SpacePhotoOfDay` (to the Launches section front — APOD is lovely and it is not news). Nine
of fourteen sections, and roughly 60% of the homepage JS bundle, all of it currently
`ssr: false`.

### 4.2 Launch page — `/launches`, `/rockets/[slug]`, a mission page

```
[ LiveRail ][ Masthead ]
┌────────────────────────────────────────────────────────────────────────────────┐
│ [ ─────────── 21:9 section opener: /art/hero-launch-sites.webp ─────────────── ]│
│                                                                                │
│   LAUNCHES                                                                     │
│   Every Launch, Live and After                                             (1) │
│   Countdowns and streams before the flight; outcome, orbit and a debrief       │
│   within 24 hours of it.                                                       │
└────────────────────────────────────────────────────────────────────────────────┘
   ┌── NEXT ──────────────────────────────────────────────────────────────────┐
   │  ● T−04:12:07                                          [ WATCH LIVE → ]  │  (2)
   │  Falcon 9 Block 5 · Starlink 12-8                                        │
   │  Cape Canaveral SLC-40 · 29 Aug 2026 18:14 UTC · 92% GO                  │
   │  Set an alert →   Predict the outcome →   About Falcon 9 →               │  (3)
   └──────────────────────────────────────────────────────────────────────────┘
   UPCOMING                             [ All ][ Cape ][ Vandenberg ][ Starbase ]
   ┌──────────┬───────────────────┬──────────────┬────────────┬────────────────┐
   │ 31 Aug   │ Electron          │ Mahia LC-1   │ Rocket Lab │ ● scheduled    │  (4)
   │ 02 Sep   │ Falcon 9          │ Vandenberg   │ SpaceX     │ ● scheduled    │
   │ 09 Sep   │ Soyuz-2.1b        │ Baikonur     │ Roscosmos  │ ▲ slipped 3d   │
   └──────────┴───────────────────┴──────────────┴────────────┴────────────────┘
   ────────────────────────────────────────────────────────────────────── 1080px
   THE RECORD                                                                 (5)
   ┌────────────────────────────────────────────────────────────────────────┐
   │ [ launches-per-month, inline ChartFrame ]                              │
   └────────────────────────────────────────────────────────────────────────┘
   Source: SpaceNexus launch tracker · as of 29 Aug 14:02 UTC · PNG · Table
   ─────────────────────────────────────────────────────────────────────────
   BY SITE             Cape Canaveral · Vandenberg · Starbase · Wallops · Kourou →
   RECENT DEBRIEFS     How Artemis II Flew →   Starship Flight 14 →
   WATCHING IN PERSON  Cape guide →   Vandenberg guide →   From your city →   (6)
```

1. Section-opener art is the one place illustration is allowed to be full-bleed. Six `.webp`
   heroes exist and are wired through `HeroArt`; the other 37 assets in `public/art/` are
   unconverted `.png` and unused.
2. **The countdown is the only animated thing on the page.** It is a `<time>` element with
   `aria-live="off"` and a text alternative (`T minus four hours twelve minutes`).
3. The cross-link rail from ROADMAP #12 (`RelatedModules`, 150 relations, 13 call sites)
   lands *here*, as four verbs, not as a related-content box at the bottom of the page.
4. **Slip state is a first-class column** — glyph *and* word, never colour alone.
5. A launch index that does not show the launch rate is not a publication.
6. Nine viewing guides exist in `site-directory.ts` and are invisible outside a menu.

### 4.3 Company page — `/company-profiles/[slug]`

```
[ LiveRail ][ Masthead ]
   MARKETS ▸ COMPANIES
   Rocket Lab USA                                                    [ ★ Watch ]
   RKLB · NASDAQ · Long Beach, CA · founded 2006 · 2,100 employees          (1)
   ─────────────────────────────────────────────────────────────────────────
   Small-lift launch and spacecraft components. Electron is the second-most-
   flown Western orbital rocket; Neutron is the bet that decides the decade. (2)
   ┌─────────────┬─────────────┬─────────────┬─────────────┐
   │ $28.40      │ $13.1bn     │ 68          │ 95.1%       │                (3)
   │ SHARE PRICE │ MARKET CAP  │ ELECTRON    │ SUCCESS     │
   │ ▲ 1.8%      │             │ FLIGHTS     │ RATE        │
   └─────────────┴─────────────┴─────────────┴─────────────┘
   Sources: market data 15-min delayed · SpaceNexus launch tracker · 29 Aug
   ─────────────────────────────────────────────────────────────────────────
   [ Overview ][ Launches ][ Financials ][ Contracts ][ People ][ News ]     (4)
   ┌────────────────────────────────────────────────────────────────────────┐
   │ [ price + launch-cadence, dual axis, ChartFrame ]                      │
   └────────────────────────────────────────────────────────────────────────┘
   RECENT CONTRACTS   table: date · agency · value · vehicle · source
   LEADERSHIP         table: name · role · since · previous
   ─────────────────────────────────────────────────────────────────────────
   IN THE JOURNAL     3 Story cards filtered to this company                (5)
   COMPARE            vs SpaceX →   vs Firefly →   All comparisons →
```

1. **A dateline, not a hero.** Company pages are reference; they open with facts.
2. **Every company gets one authored sentence.** That is the difference between a directory
   and a publication. It is ~300 sentences of work and the highest-value editorial task on
   this list.
3. A `DataCard` row with **one shared source line**, not four freshness badges.
4. `src/app/company-profiles/page.tsx:1` is `'use client'`, and the live page ships **"0
   companies found"** in its HTML — under a subtitle claiming "100+ space industry
   companies" (the real figure is 300+; the copy is stale too). The index and the tabs must
   be server-rendered, with filters hydrating on top.
5. The site publishes news *about* these companies and never joins the two.

### 4.4 Guide — `/guide/[slug]`

```
[ LiveRail ][ Masthead ]
┌────────────────────────────────────────────────────────────────────────────────┐
│ [ ─────────── 21:9 /art/hero-launch-cost.webp ─────────── ]                     │
└────────────────────────────────────────────────────────────────────────────────┘
                        ┌─── 720px, centred ────────────────────┐
   ┌── 200px ──┐        │ GUIDE · UPDATED 25 AUG 2026           │
   │ CONTENTS  │        │                                       │
   │ 1 The Cost│        │ Space Launch Cost                     │ Fraunces 600
   │   Revolut.│        │ Comparison 2026                       │
   │ 2 Vehicle │        │ ───────────────────────────────────── │
   │   by      │        │ Nine vehicles, list prices and dollars│ deck, italic
   │   Vehicle │        │ per kilogram — and why the number you │
   │ 3 …       │        │ have been quoted is almost never the  │
   │           │        │ number on this page.              (1) │
   │ ────────  │        │                                       │
   │ Calculator│  (2)   │ Body at 68ch, Fraunces opsz 14,       │
   │ Cost/kg   │        │ 1.125rem / 1.65. Links underlined in  │
   │ Rockets   │        │ --link. No card, no border, no glow.  │
   └───────────┘        └───────────────────────────────────────┘
   ── widens to 1080px for the table ──────────────────────────────────────────
   ┌──────────────────┬───────────┬────────────┬───────────┐
   │ VEHICLE          │     LEO t │    LIST $M │  $/kg LEO │                (3)
   ├──────────────────┼───────────┼────────────┼───────────┤
   │ Falcon 9         │      22.8 │         67 │     2,939 │  JetBrains Mono
   │ Electron         │       0.3 │        7.5 │    25,000 │  tabular, right
   │ New Glenn        │      45.0 │         68 │     1,511 │  zebra: sunken
   └──────────────────┴───────────┴────────────┴───────────┘
   Source: published list prices, Aug 2026 · Methodology →
   ── back to 720px ───────────────────────────────────────────────────────────
   [ ChartFrame: $/kg by vehicle ]                                          (4)
   FREQUENTLY ASKED   ▸ accordion, FAQ schema (already shipped)
   ─────────────────────────────────────────────────────────────────────────
   NEXT               Cost to launch a CubeSat →   Launch schedule 2026 →
```

1. **The deck is the new component.** This page carries ~54k impressions a quarter and opens
   straight into an H2 ("The Cost Revolution"). One italic sentence stating the argument is
   worth more than any other visual change on this list.
2. Sticky contents left, the tools this guide feeds beneath it. `ui/TableOfContents.tsx`
   exists.
3. Tables are the reason people arrive. Mono, right-aligned, tabular figures, zebra — and
   scrollable in their own container at 390.
4. Every guide with a table should end with the chart of that table. `src/lib/charts/`
   renders it server-side today.

### 4.5 Game landing — `/space-tycoon`

Ink ground. This is the one place a console aesthetic is *correct* — but it is still The
Journal's console: same type, same rules, inverted palette.

```
[ LiveRail, ink ][ Masthead, ink ]
┌────────────────────────────────────────────────────────────────────────────────┐
│ [ ────────── full-bleed region art, ink gradient scrim ────────── ]             │
│                                                                                │
│   SPACE TYCOON · FREE · NO ACCOUNT NEEDED TO LOOK AROUND                       │
│   Most space games are about ships.                                        (1) │
│   This one is about balance sheets.                                            │
│   ───────────────────────────────────────────────────────────────────          │
│   A browser MMO across eight regions of the solar system. Nothing is           │
│   destroyed by other players — solar storms, micrometeoroids and equipment     │
│   failure are the risks. Hardware is manufactured, not conjured.               │
│                                                                                │
│   [ Play free → ]    Read how it plays →                                       │
└────────────────────────────────────────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ THE MARKET, RIGHT NOW                                                (2) │
   │ [ ChartFrame, ink series: aluminium spot price, last 30 days ]           │
   │ Live from the game economy · 41 corporations trading                     │
   └──────────────────────────────────────────────────────────────────────────┘
   TOP CORPORATIONS      #1 Helios Freight $4.2bn ▸  #2 …  #3 …             (3)
   ── EIGHT REGIONS, ONE ECONOMY ────────────────────────────────────────────
   [ art ][ art ][ art ][ art ]   Inner · Lunar · Mars · Belt               (4)
   [ art ][ art ][ art ][ art ]   Jovian · Saturnian · Outer · Interstellar
   ── WHAT A WEEK LOOKS LIKE ────────────────────────────────────────────────
   Mon contracts refresh · Wed league standings · Fri corporate quarterlies
   ── DEV LOG ───────────────────────────────────────────────────────────────
   Epoch 2 has begun — every deposit, slot and lane unclaimed.   Read →      (5)
```

1. The pitch already exists on `/space-tycoon/about` and is genuinely good. Promote it to
   the landing page; the landing currently sells "39 buildings, 240+ research".
2. **A live price chart is the best possible advertisement for an economic MMO** — it proves
   the claim inside the same object. Rendering it with the site's own chart engine means the
   game inherits the publication's credibility instead of borrowing a games-site aesthetic.
3. `getPublicLeaderboard` already returns this (`src/app/page.tsx:66`).
4. The eight region banners exist — on `/about`, not on the landing page.
5. The dev log is both the retention hook and the honest-development signal `POLICY.md` asks
   for.

---

## 5. Motion and states

**Motion budget: three effects, site-wide.**

| Effect | Spec | Where |
|---|---|---|
| Countdown tick | text swap, no transition | LiveRail, launch pages |
| Underline draw | 200ms `cubic-bezier(.2,0,0,1)` on `text-decoration-color` | links, section words |
| Chart plot-in | 400ms `stroke-dashoffset` / bar height, **once**, on first view | ChartFrame only |

Everything else is a 120ms opacity or colour change. No parallax, no reveal-on-scroll, no
counters, no floating, no pulsing glow. Today `ui/ScrollReveal.tsx` + `StaggerContainer` run
on Mission Control (`mission-control/page.tsx:22`), `AnimatedCounter` on the KPI strip,
`animate-reveal-up` on every hero child (`LandingHero.tsx:11-19`), `animate-pulse` on three
blurred blobs *behind every empty state* (`ui/EmptyState.tsx:25-27`), and `animate-float` on
the empty-state icon. A magazine does not shimmer.

**Reduced motion.** `globals.css:318-337` already does this well — it collapses animation
duration, preserves opacity/colour transitions, and forces `transform: none` on cards. Two
additions: the chart plot-in must render at its **final** state (collapsing it to 0.01ms
mid-animation can flash), and the LiveRail's pulsing `●` becomes a static filled dot.

**Loading.** No spinners on content. Every reading surface is server-rendered, so first
paint *is* the content. Where hydration adds a filter (companies, startups), the server
renders the unfiltered list and the filter appears on hydrate — the page is never empty.
`ui/LoadingSpinner.tsx` survives only inside forms and the game. Skeletons
(`ui/Skeleton.tsx`, `CardSkeleton`, `GridSkeleton`) keep the final block's exact dimensions,
use `--ground-sunken`, and do **not** shimmer.

**Empty.** One rule: *say what is missing, say when it comes back, offer the nearest real
thing.* "No launches scheduled from Wallops this month. The next is 14 Oct. See all sites
→". `ui/EmptyState.tsx` keeps its illustration slot (4 assets already in `public/art/`) and
loses the three pulsing blurred blobs behind it.

**Error.** Two kinds, and the site conflates them today:

- **Stale data** — the page renders, with a rule-bordered strip: `Market data last updated
  27 Aug. Live feed unavailable.` The content stays. `ui/FetchErrorBanner.tsx` is the right
  component; it is simply not applied on the homepage, where a failed `/api/pulse` silently
  leaves `—`.
- **Page failed** — `error.tsx` and 404 become editorial: `/art/404-lost-astronaut.png`, a
  serif headline, one sentence, four links to the busiest sections. The 28-entry real-404
  registry shipped 8/24; give it a face.

---

## 6. Mobile — 390px

The Journal is *more* itself on a phone, because a phone is one column and so is a magazine.

| Element | 1440 | 390 |
|---|---|---|
| LiveRail | one line, all fields | **two lines, and it stays** — `● T−04:12:07 Watch →` over `Falcon 9 · Starlink 12-8`. Non-negotiable: this is the above-the-fold live launch. |
| Masthead | 5 words + Index | wordmark, `⌕`, `☰`. The sheet opens to the five sections as a serif list; Index and Space Tycoon below a rule. |
| Front page | lead + 360px rail | lead story, then **Next five launches**, then Chart of the Week. The rail becomes the second block, not a sidebar. |
| Type | body 1.125rem | body **1.0625rem / 1.60**; masthead clamps to 2.75rem; body `opsz` drops to 12 — Fraunces thickens its strokes automatically at small sizes, which is the whole reason for choosing it |
| Section spacing | 96px | 56px |
| Story cards | 3-up | 1-up, art 16:9 above the headline; anything past the third drops to "brief" density (no art) |
| Tables | full width | own `overflow-x: auto` container with a **right-edge fade and shadow** so the scroll is discoverable; first column sticky. `ui/MobileTableView.tsx` exists and is used on about 6 of ~40 tables. |
| ChartFrame | 1080px | full-bleed edge to edge — the one element allowed to break the 16px gutter — with title and source inside the gutter |
| Guide contents | sticky sidebar | a collapsed `▸ Contents` accordion under the deck |
| Company tabs | horizontal row | scrollable chip row, active chip scrolled into view |
| Touch targets | — | 44×44 minimum; section words in the sheet are 52px rows |

**Deleted at 390:** `FloatingCTA` (a scroll-depth CTA over one-column body copy on a phone
is the definition of un-calm), `PullToRefresh` on reading pages (it stays on Mission
Control), and the ad slot between the lead and the chart.

---

## 7. Migration — three phases

Effort in engineer-days, one person. The tokens are centralised (`globals.css:47-115`),
which is the good news. The bad news, measured: **929 of 1,497 `.tsx` files hardcode
`text-white`; 862 hardcode `bg-white/[…]`; 765 hardcode `text-slate-400`; only 58 read
`var(--text-…)`.** A site-wide ground flip is a 900-file rewrite and is not in this plan.
This plan flips route by route.

### Phase 1 — The masthead, the rail, and the front page (7 days)

The whole thesis, on the two surfaces that carry first impressions, with **no ground flip
yet**: Phase 1 ships *warm ink* (`#12100E`, not `#000000`), so all 929 hardcoded
`text-white` files keep working untouched.

| File | Work | d |
|---|---|---|
| `src/app/layout.tsx:62-89, 273-276` | Add Fraunces + Inter via `next/font/google`; delete the Satoshi `localFont` block and its three preloads; delete Orbitron and DM Sans. Add `data-ground` to `<body>`. | 0.5 |
| `tailwind.config.*:57-70` | Rewire `fontFamily` and `fontSize` to the new scale | 0.5 |
| `src/app/globals.css:47-115` | Re-value the token block to Ink; add `--col-read/wide/bleed`; delete `.card-terminal` (562-600), `.starfield`, `section-header__bar` | 1 |
| **new** `src/components/LiveRail.tsx` + `src/lib/next-launch.ts` | Server component, one Prisma query, rendered in `layout.tsx` above `Navigation`. **The single most important file in this plan.** | 1 |
| `src/components/Navigation.tsx` | 989 → ~350 lines. Drop Home / Pricing / Live / Jobs from the bar; restyle dropdowns to a two-column serif list; move Space Tycoon to its own right-aligned slot | 1.5 |
| `src/app/page.tsx` | Delete nine of fourteen sections and their `nextDynamic` imports (lines 16-58, 203-490). Add lead Story, Next Five, ChartFrame (from `src/lib/charts/registry`), the 3-up, The Numbers, the Tycoon block | 1.5 |
| `src/components/LandingHero.tsx` | **Delete.** Its `useEffect` / `—` placeholder logic (78-133) is superseded by the LiveRail | 0.25 |
| **new** `src/components/journal/{Story,Deck,ChartFrame,SourceLine,Kicker}.tsx` | The five primitives | 0.75 |

*Ships:* a front page that answers "what is launching" in its HTML, three stories instead of
fourteen modules, and the chart engine finally visible.

### Phase 2 — Paper ground and the reading templates (9 days)

| File | Work | d |
|---|---|---|
| `globals.css` | Add the `[data-ground="paper"]` token block, **plus a bounded compatibility layer** remapping ~8 Tailwind utilities (`.text-white`, `.text-slate-300/400`, `.bg-white/[0.03]`, `.border-white/[0.08]`) under `[data-ground="paper"]` only. Explicitly transitional — see Risks. | 1 |
| `src/app/guide/**` (13 templates) | Set `data-ground="paper"`; add `Deck`; body to `--col-read`; tables to `--col-wide` + `DataTable`; append a `ChartFrame` wherever a table exists | 2.5 |
| `src/app/launches/page.tsx`, `src/app/rockets/**` | SectionOpener; the Next block with its four cross-links; slip column; inline chart. Both are already server-rendered — the cheapest wins on the list | 1.5 |
| `src/app/company-profiles/**` | **Remove `'use client'` from the index** (`page.tsx:1`) — server-render the list, hydrate the filters. Fix the "100+ companies" copy. Dateline layout, plus the one-sentence description field | 2 |
| `src/app/news/**`, `src/app/blog/**`, `src/app/ai-insights/**` | Story cards, Deck, outline kickers; retire the `CATEGORY_COLORS` pills | 1 |
| `src/app/tools/page.tsx` + `Navigation.tsx` | Rename to The Index; add the `ops` and `reference` groups as its spine | 0.5 |
| `src/components/ui/` | Merge `DataAsOf` + `DataFreshness` + `DataFreshnessBadge` + `DataFreshnessIndicator` + `SourceCitation` into `SourceLine`. Delete `StarField`, `TerminalPanel`, `AnimatedCounter` | 0.5 |

### Phase 3 — Ops surfaces, motion budget, mobile (6 days)

| File | Work | d |
|---|---|---|
| `src/app/mission-control/page.tsx` (`'use client'`, line 1) | Server-render the shell and the next-five list; keep filters and streams client-side. **The live HTML today is `Loading…` plus "You're offline. Cached data shown."** — the flagship enthusiast page is empty to every crawler and every slow connection | 2 |
| `src/app/space-tycoon/page.tsx` | The ink landing per §4.5; promote the `/about` pitch; add the live market ChartFrame and the leaderboard | 1.5 |
| `ui/ScrollReveal.tsx`, `ui/EmptyState.tsx`, `error.tsx`, `Skeleton*` | Enforce the three-effect budget; strip the pulsing blobs; editorial error and 404 | 1 |
| `ui/MobileTableView.tsx` + ~34 table call sites | Scroll affordance and sticky first column, applied everywhere | 1 |
| `globals.css:318-337` | Reduced-motion additions (chart final state, static live dot) | 0.5 |

**Total ≈ 22 days. Phase 1 alone is a coherent, shippable redesign.**

---

## 8. Risks, and what I would cut first

**Risks**

1. **The Tailwind compatibility layer in Phase 2 is a hack.** Remapping `.text-white` under
   `[data-ground="paper"]` will produce a wrong colour somewhere — a white icon on a
   coloured button, a white border on a dark inset. It is bounded (paper routes only, ~8
   utilities) and it buys the paper ground in 1 day instead of 15, but it is debt with a
   named owner, not an end state. **If it produces more than ~10 visual bugs across the
   guide templates, abandon paper and ship the whole site on warm ink.** The type,
   hierarchy, decks, charts and measure carry about 80% of this design; the ground carries
   20%.
2. **SEO.** The guides carry ~54k impressions a quarter. Nothing here changes a URL, a
   title, an FAQ schema block, or the text of a heading — only its type. Phase 2 guide work
   ships behind a per-template flag with a Search Console check at 14 days.
3. **The LiveRail is a query on every page.** Cache it for 60s, and make it fail to a static
   `Next launch →` link, never to `—`. That failure mode is the exact bug it exists to fix.
4. **Fraunces as body copy is the one genuinely contestable call.** It is defensible because
   of `opsz`, but if reading-time telemetry on `/guide/space-launch-cost-comparison` drops
   after Phase 2, swap body to **Source Serif 4** and keep Fraunces for display. One token
   change; budget half a day.
5. **The calm is the point, and it will feel like a loss.** Deleting `BentoFeatures`,
   `DemoShowcase`, `HowItWorks`, `SocialProof` and `PersonaPicker` removes a lot of visible
   effort. Measure homepage → any-section clickthrough before and after. The hypothesis —
   three real stories beat fourteen modules — is falsifiable, and should be falsified if
   wrong.
6. **Four things lose their menu slot** (Home, Live, Jobs, Pricing). Jobs is the one to
   watch; it is a `hot` surface. It keeps its Business row and gains a colophon link, and if
   `/space-talent` traffic falls more than 15% in three weeks it returns as a sixth section
   word.

**What I would cut first, in order**

1. **The paper ground.** (Risk 1.) Ship warm ink everywhere. This loses the most distinctive
   thing about Brief C and none of its substance.
2. **The §4.5 game landing rebuild.** `/space-tycoon` has its own audience, arriving from
   the game rather than the front page. First thing to go in Phase 3.
3. **The company-page redesign (§4.3) — but not the `'use client'` fix.** "0 companies
   found" in the HTML of the industry's directory is a bug, not a design task, and it
   survives every cut.
4. **The three-density Story component.** Ship one density.
5. **Sticky first columns across 34 mobile tables.** Ship the scroll shadow only.

**What I would never cut**

The **LiveRail** and the **deck**. One makes the site's own headline promise true in HTML
for the first time; the other is the difference between a directory and a publication.
Together, about a day and a half.
