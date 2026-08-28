# SpaceNexus Roadmap — Consolidation, Content, Design & Growth
*Prepared for Jay — synthesized from six verified research lanes (consolidation, design, content, enthusiast, business, game, quality). Every item below survived an adversarial skeptic pass; rejected findings are noted only where the rejection itself is instructive.*

---

## 1. Executive Summary

The site's data and backend are deeper than the traffic numbers suggest — 24 rocket pages, 16 launch-site pages, a 46-file compare suite, a mature company/investor data layer, and a genuinely well-built game — but growth is being throttled by funnel bugs, not content gaps. The single highest-impact fix in this whole roadmap is one line in `next.config.js`: the primary "Jobs" nav link redirects job-seekers to a consultant marketplace instead of the 6,500-listing jobs board. The onboarding modal that greets every new visitor offers six business personas and zero for the enthusiast the founder's mandate prioritizes. And the site's two proven organic-traffic families (cost/schedule guides at 25-29k impressions) are each represented by only a handful of pages while the repo has quietly grown nine parallel near-duplicate reference-page clusters that nobody visits.

**Three bets:**
1. **Fix the funnel before feeding it.** Jobs redirect, enthusiast persona, module-carousel burying Space Tycoon, and OnboardingTour's accessibility gaps are all S-effort, high-impact, and currently working against every other investment on this list.
2. **Double down on what's already proven, don't diversify.** Cost-to-launch and launch-site guides are the site's only content family with 5-figure impressions; expanding those 2 registries (12-16 new entries, ~2 days of careful work) outranks writing new guide topics from scratch.
3. **Treat the nine-page long-tail consolidation as hygiene, not growth.** It's real technical debt (three L-effort merges, ~1-2 weeks total) but none of it plausibly moves MAU by Nov 12 — schedule it after the funnel and content bets, not before.

---

## 2. Quick Wins (S effort, impact ≥ 3)

**Funnel-breaking bugs — do these first:**
- [ ] **Fix the Jobs nav redirect** — `next.config.js:370` sends `/jobs` → `/space-talent?tab=jobs`, an invalid tab value that silently falls back to the consultant-marketplace tab. Change to `?tab=workforce`. *(impact 5, jobseeker)*
- [ ] **Add a "Space Fan / Enthusiast" persona to onboarding** — `src/components/ui/OnboardingTour.tsx` ships six personas, all business roles, on a mandatory first-visit modal, contradicting CLAUDE.md's enthusiast-first mandate. Add a 7th persona + `PERSONA_DESTINATIONS` entry routing to Mission Control/Live; make it the first card. *(impact 5, enthusiast)*
- [ ] **Exclude `/space-tycoon` from the module-navigation carousel** — `src/hooks/useModuleNavigation.ts`'s `EXCLUDED_PATHS` already excludes `/dashboard`, `/live`, `/search` but not `/space-tycoon`; the game's own hero pitch is currently pushed below a "3 of 42 modules" carousel strip. One-line fix. *(impact 4, enthusiast)*
- [ ] **Add focus trap + initial focus + `aria-hidden`/`inert` to OnboardingTour** — the first interactive surface nearly every visitor hits has `role="dialog" aria-modal="true"` but no Tab containment, no `.focus()` call, and doesn't hide the backgrounded page from screen readers. `src/components/ui/OnboardingTour.tsx`. *(impact 4, all)*

**Business-page credibility:**
- [ ] **Deduplicate Regulatory Radar** — `/regulatory-radar` and `/compliance`'s "Radar" sub-tab (`src/app/compliance/RegulatoryRadarTab.tsx`) render the identical live feed via the same components/API. Turn the compliance tab into a teaser card deep-linking to `/regulatory-radar?category=X`. *(impact 3, business)*
- [ ] **Fix funding-tracker's fabricated data-source footer** — `src/app/funding-tracker/page.tsx:759-777` names Bloomberg/PitchBook/Crunchbase as sources with no code evidence of integration. Replace with the honest `DataAsOf` pattern already used on sibling pages. *(impact 4, investor)*
- [ ] **Decide funding-tracker's Pro gate** — it's the only fully `PremiumGate`-wrapped business page (`page.tsx:788`) while every sibling (space-stocks, investors, procurement) is free, in tension with the standing monetization-hold. Flag to Jay explicitly rather than leave as an inconsistency. *(impact 4, investor)*
- [ ] **Rewrite title/meta on top-impression `/compare/*` pages** — numeric, specific titles (cost/kg, funding totals) instead of generic "Compare X and Y," matching how the top unserved query ("blue origin vs spacex," 1.2k impressions) is phrased. *(impact 3, business)*

**Content — cheapest, highest-confidence extensions of what already works:**
- [ ] **Build `/guide/cost-to-launch/page.tsx`** — the `[thing]` dynamic segment has no parent hub page listing all entries. *(impact 3, all)*
- [ ] **Add "a crew to the Moon" and "a Mars mission" to `cost-to-launch.ts`** — Artemis II is imminent and already has two blog posts' worth of interest; the data-row pattern is established. *(impact 4, enthusiast)*
- [ ] **Backfill `GUIDE_LIST`** in `src/lib/guide-navigation.ts` with the four orphaned live guide pages (`cost-to-launch`, `satellite-companies`, `space-companies-directory`, `space-mining-guide`) — pure internal-linking fix, restores prev/next link equity. *(impact 3, all)*
- [ ] **Wire FAQ schema into the top 10 `/compare` pages** — `src/components/seo/FAQSchema.tsx` exists and is unused there; FAQ rich results are a direct lever on the sub-1.3% CTR problem without needing more impressions. *(impact 4, all)*
- [ ] **Add Spectrum, Kinetica-1, Long March 6C** rocket registry rows/matchers — `src/lib/rocket-registry.ts`'s own header comment names these as ready to light up, zero new page code. *(impact 3, enthusiast)*
- [ ] **Add `/compare/vulcan-centaur-vs-falcon-9`** — Falcon 9's most direct NSSL Phase 3 competitor has no vehicle-level compare page. *(impact 3, business)*
- [ ] **Refresh stale figures** in `guide/space-business-opportunities` (2024 Space Foundation numbers on a 2026-dated guide) and `guide/space-mining-guide` (cites 2024 VIPER cancellation with nothing since). *(impact 3, business)*
- [ ] **Merge duplicate satellite-tracking content** — two near-identical blog posts plus two guide pages compete for one query cluster; canonicalize on the guides. *(impact 3, enthusiast)*

**Site chrome and performance:**
- [ ] **Stop stacking TrialBanner + AnnouncementBanner** — `src/app/layout.tsx:297-298` renders both unconditionally back-to-back (~80-90px combined on mobile before nav even starts); queue them instead. *(impact 3, all)*
- [ ] **Fix satellite-tracker stat-tile desync** — `/satellites`' TRACKED/LEO/MEO/GEO/HEO counter tiles read 0 while the map below is already rendering hundreds of live dots — two data paths out of sync. *(impact 3, enthusiast)*
- [ ] **Drop `priority`/`fetchPriority="high"` from decorative hero art** — `src/components/LandingHero.tsx:184-192` requests a 1.19MB PNG at high priority for a 15%-opacity background layer, competing with real above-fold content; homepage `load` is 2.2s vs 260-380ms on inner pages. Also drop bare `priority` from `src/app/ignition/page.tsx` and `src/app/mission-cost/page.tsx`'s hero images. Compress all three source PNGs to WebP. *(impact 3, all)*
- [ ] **Raise `--text-tertiary` and `--text-muted` for WCAG AA** — `src/app/globals.css:60-61` (`#666666` on black ≈3.66:1, `#444444` ≈2.16:1, both fail AA), used 148× across 88 files including real heading copy on the homepage. Target ≈`#949494` and ≈`#6b6b6b`. *(impact 3, all)*
- [ ] **Company Profiles copy fix** — subtitle says "100+ companies," stat tile below it says "318 Companies Tracked." Swap to the live `SITE_STATS.companies` value already used on `/compare/page.tsx`. *(impact 2 — included since it's a one-line credibility fix)*

---

## 3. Consolidation Plan

*Grouped by hub. All are content-preserving merges (tabs, not deletions) with 301s from old slugs. **Caveat that applies to every row below**: none of these were checked against `next.config.js`'s existing redirect patterns for query-param destinations, per-URL Search Console rankings that might be lost in a merge, or a repo-wide grep for hardcoded old-slug links in `blog-content.ts`/`guide-navigation.ts`. Verify blast radius before starting each merge.*

| Hub | Merges (source → destination) | Redirect | Deleted | Effort | Impact | Notes |
|---|---|---|---|---|---|---|
| **Launch/Mission Economics** | `/launch-cost-calculator`, `/orbital-costs`, `/unit-economics`, `/launch-economics`, `/mission-cost` → one hub at `/launch-economics` (tabs: Calculator \| Orbital Costs \| Mission Cost & Insurance \| Unit Economics) | 4 slugs → tab query params | 4 of 5 page files | **L** | 2 | Effort is understated in the original scoping — `MODULES.missionCost/orbitalCosts/launchCostCalc/launchEconomics` are referenced as 4 distinct related-modules across 20+ `PAGE_RELATIONS` entries including high-traffic guide/compare pages; every one of those cross-references needs rewriting to tab-anchor variants, not just the 4 site-directory rows. Also: `mission-cost` is in the **Business** nav menu, the other four are in the unfeatured **ops** group — the "none are nav-reachable" framing was wrong for one of the five. |
| **Digest** | `/briefs` → `/intelligence-brief` as a "Live" tab | `/briefs` → `/intelligence-brief?tab=live` | `briefs/page.tsx` | S | 2 | Keep `/newsletter` fully separate — it's the email opt-in funnel, a different function. |
| **Investor** | `/investor-hub` folded into an overview section atop `/investors` | `/investor-hub` → `/investors` | `investor-hub/page.tsx` | S | 2 | `investor-hub` never joined `module-relationships.ts`'s relation graph — evidence it was bolted on without integration. |
| **Company Scoring** | `/space-score`'s composite score merged into `/report-cards` as a summary tab | `/space-score` → `/report-cards` | `space-score/page.tsx` | M | 3 | One scoring methodology, one page — currently a business/investor visitor sees two competing "go see the grade" links from Company Profiles. |
| **Compliance Reference** | `/regulatory-calendar`, `/export-classifications`, `/licensing-checker`, `/export-compliance-qa` → tabs inside `/compliance` | 4 slugs → tab query params | 4 page files | **L** | 3 | Keep `/regulatory-radar` **out** of this merge — it's a distinct live-feed feature (see Quick Wins for its separate dedup issue with the compliance page's existing Radar tab, which is a different bug from this reference-page merge). `export-compliance-qa` is a 107-line stub, likely absorbable into the Q&A tab with minimal rework. |
| **Engineering Reference** | `/propulsion-database`, `/materials-database`, `/standards-reference`, `/clean-room-reference`, `/tech-readiness` → tabs inside `/engineering-reference` | 5 slugs → tab query params | 5 page files (~6,600 lines consolidated) | **L** | 2 | All five sit in the unfeatured "ops" group (no `menu:true`), cross-link each other in a near-complete graph already — this is corpus hygiene, not a traffic play. |
| **Space History** | `/this-day-in-space` → `/history` as a default-selected "Today" tab | `/this-day-in-space` → `/history?tab=today` | `this-day-in-space/page.tsx` | S | 2 | Preserves the daily-hook UX while removing the duplicate shell. |

**Two structural fixes that make every future page addition cheaper, not just these seven merges:**
- [ ] **Wire `getRelatedModules()` into the templates that already have data for it** — `module-relationships.ts` defines ~150 `PAGE_RELATIONS` keys, but only 13 call sites exist (marketing pages only). None of the 46 `compare/[slug]` pages, none of the `guide/[slug]` pages — including the 28.7k-impression cost-comparison guide — ever render their curated related-links. Add `<RelatedModules />` to `compare/[slug]/page.tsx` and `guide/[slug]/page.tsx`. **This is the cheapest lever on the whole long-tail-discovery problem.** *(S, impact 4, all)*
- [ ] **Delete ~35 `PAGE_RELATIONS`/`MODULES` keys pointing at routes that don't exist** (`regulatory-tracker`, `deal-flow`, `space-weather`, `debris-catalog`, etc.) — inert data that invites a future dev to build another near-duplicate page against a phantom key. Point call sites at the real equivalent instead. *(S, impact 1)*

**Explicit trade-off to name to Jay:** this table totals 3×L + 1×M of engineering time — roughly 1-2 weeks. None of it plausibly moves the MAU needle before Nov 12. Sequence it after the funnel fixes and content expansion in sections 2 and 4.

---

## 4. Content Plan

*Ordered by effort-to-impact. The compare-suite CTR problem (top unserved query "blue origin vs spacex," 1.2k impressions) already has a matching page — `/compare/spacex-vs-blue-origin` — so the fix is FAQ schema + title/meta tuning (§2/§3), not a new page. The items below are genuinely new or genuinely missing.*

| # | Title | Type | Target query/intent | Why it will rank | Effort | Impact |
|---|---|---|---|---|---|---|
| 1 | Extend `cost-to-launch.ts` from 4 → ~16 entries (GPS satellite, ISS resupply, Mars rover, spy satellite, CLPS lander, space telescope, weather satellite, constellation shell, hosted payload, crewed Artemis mission, dedicated Falcon Heavy, national-security payload, 100+-sat constellation) | Data page (registry-driven) | "how much does it cost to launch X" long-tail | Direct extension of the site's proven #1 organic asset (28.7k impressions); same template, same registry pattern already validated | M | 4 |
| 2 | Where to Watch a Launch at Wallops / at Kourou | Guide (viewing-guide template) | "where to watch [site] launch" | Exact template match to 3 existing guides already in `GUIDE_LIST`'s proven top-15; Wallops (Electron/Neutron/Antares) and Kourou (Ariane 6/Vega-C) are high-cadence sites with zero coverage | M | 3 |
| 3 | Blue Origin vs SpaceX: The Complete 2026 Comparison | Long-form guide (not compare-table) | "blue origin vs spacex" (top unserved query, 1.2k impressions) | Guide format outperforms compare format sitewide (102 vs 45 users/28d for comparable impression volume); narrative rivalry piece, cross-linked from the existing compare page rather than replacing it | M | 4 |
| 4 | Space Industry Career Paths (promoted from blog to guide template) | Guide | "space industry careers/jobs" | Live jobs-board anchor (~6,500 ATS listings) already exists to link into; guide template historically outperforms blog for this kind of evergreen query | M | 3 |
| 5 | National Security Space Launch (NSSL) Phase 3 Explained | Guide | procurement/defense-space business queries | Cross-links all three NSSL competitors' `/rockets/[slug]` pages and the new Vulcan-vs-Falcon-9 compare page into one procurement narrative | M | 3 |
| 6 | Amazon Leo (Kuiper) vs Starlink: Deployment Race 2026 | Guide (consolidates 2 blog posts) | constellation deployment / D2D rollout queries | Volatile, high-interest topic split across compare + 2 blog posts today; one authoritative guide-format piece | M | 3 |
| 7 | Space Debris Removal & Space Traffic Management 2026 | Guide | debris/STM regulatory queries | Built on the now-correct SATCAT-derived stats (34.5k tracked / 12.5k debris, fixed 8/24) — fresh accurate data with no showcase page yet | M | 3 |
| 8 | Space Weather & Solar Storm Risk for Satellite Operators | Guide (consolidates 2 blog posts) | "satellite solar storm risk" | Cross-promotes Space Tycoon's solar-storm hazard mechanic — game-to-site funnel | M | 2 |
| 9 | Space Investing Fundamentals (Learn course) | Interactive course | investor onboarding | Reuses existing `guide/space-economy-investment` research; Learn has zero course touching markets/finance today | M | 3 |
| 10 | Reading a Space Company Balance Sheet (Learn course) | Interactive course | SpaceNexus Score explainer | Operationalizes the existing scoring methodology as a teachable format; gives Company Profiles (30 users/28d) a second traffic path via Learn | S | 2 |
| 11 | Consolidate "Top 50 Space Companies" duplicate posts | Cleanup | dedup ranking | Two near-identical posts (base + "2nd Half") compete for the same query; canonicalize the newer, retitle evergreen, 301 the older | S | 2 |
| 12 | Cross-link cost-to-launch entries ↔ `/launch-cost-calculator` | Internal linking | funnel connection | Turns two standalone assets into one connected tool | S | 2 |

**Missed by this lane, worth doing first:** the highest-confidence lever implied by the site's own evidence — direct iteration on `/guide/space-launch-cost-comparison` and `/guide/space-launch-schedule-2026` (28.7k + 25.3k impressions, the overwhelming majority of all organic traffic) — was never proposed. Before adding adjacent long-tail pages, refresh and expand those two pages' own content depth.

---

## 5. Visual Revamp

### Design tokens (current values, `src/app/globals.css`)
| Token | Current | Problem | Proposed |
|---|---|---|---|
| `--bg-void` | `#000000` | — (true-black base is fine, kept) | unchanged |
| `--text-tertiary` | `#666666` | 3.66:1 on black — fails AA (4.5:1) | `#949494` (~4.6:1) |
| `--text-muted` | `#444444` | 2.16:1 on black — fails even large-text AA (3:1) | `#6b6b6b` (~4.5:1), or restrict to non-text decorative use only |
| `--accent-primary` | indigo (`rgba(99,102,241,…)`) | Used correctly in `LandingHero.tsx`'s radial glow — this is the confirmed brand accent | unchanged; enforce as the only primary-CTA color sitewide |
| `--accent-secondary` | cyan | Matches the game's status-standby cyan | unchanged; reserve for live/data/telemetry accents |
| `--status-nominal/caution/serious/critical` | green/yellow/amber/red | Already semantic and separate from decorative gradients | keep strictly reserved for status, never decorative |

*Correction to an earlier internal claim: a "six competing gradient hues in the hero" finding did not hold up — a direct grep of `LandingHero.tsx` found only the indigo glow and one emerald status pulse, i.e. the file already follows the 2-accent discipline. Don't spend effort "fixing" something that isn't broken; the two real token bugs are the contrast failures above.*

### Component patterns
- **`.card-terminal`** (partially built in `globals.css`, already live on `/briefs` and `/compare/anduril-vs-l3harris-space`) — the monospace, dot-header "Bloomberg terminal" motif. Extend to **Company Profiles, Space Stocks, and Mission Control** data panels as the deliberate visual bridge between the calmer business-terminal register the rest of the site uses and the neon-glow, glassmorphism register (`GameStyles.tsx`'s `.game-panel`, `.game-glow-cyan/purple/green/amber`) reserved exclusively for Space Tycoon. **Don't unify the two languages** — the founder's own design principles want the game to read as an escalation into "the game," not chrome inconsistency with the rest of the site. Budget this as genuinely **L**, not the M it was first scoped at — no shared component currently wraps all three target page types, and there's no traffic/conversion evidence behind the aesthetic call, only internal consistency.
- **Empty states**: no `.empty-state` pattern exists in the token system, but this was never actually observed on a real zero-data page in this pass — treat as an open question (§9), not a scored fix.

### Landing/hero concept
- Fix the performance bug first (Quick Wins: drop `priority`/`fetchPriority` from the 1.2MB decorative hero PNG at 15% opacity — it's currently stealing bandwidth from real above-fold content on the site's slowest-loading page).
- **Imagery strategy — the single strongest proposal in this whole roadmap**: generate a hero-illustration set for the top 5-10 guide/compare pages by impression volume (`space-launch-cost-comparison`, `space-launch-schedule-2026`, `spacex-vs-blue-origin`, plus the 1-7k-impression compare pages) using the existing Gemini-based art pipeline (`scripts/generate-art.ts`), already proven on `/space-tycoon`'s marketing hero. The highest-traffic page on the entire site currently renders as plain white text on a flat gray gradient with zero imagery — search results and social shares pull `og:image`, and a blank gray box gives searchers no reason to click on a page family already stuck under 1.3% CTR. *(M, impact 4 — flag risk of slipping to L if per-image Gemini generation + QA review is slower than a first-batch estimate assumes; no cost/rate-limit check was done on the pipeline before scoping.)*

### Rollout order
1. Contrast token fix + OnboardingTour focus trap (both S, both accessibility-blocking) — ship together, this week.
2. Hero performance fix (drop priority props) — ship alongside, near-zero risk.
3. Hero illustration batch (top 5-10 guide/compare pages) — next sprint.
4. Terminal-chrome bridge extension (Company Profiles / Space Stocks / Mission Control) — schedule after content work, it's pure polish with no measured conversion tie.

### Accessibility notes
- Every new hero illustration needs alt text and a contrast check against overlaid text before shipping — not verified in this pass, must be part of the imagery batch's acceptance criteria, not a follow-up.
- The reduced-motion (`@media (prefers-reduced-motion: reduce)`, 11 occurrences) and high-contrast (`.high-contrast` + `@media (prefers-contrast: more)`, 18 occurrences) systems in `globals.css` are already solid — don't rebuild them, just confirm Space Tycoon's status colors (nominal/caution/serious/critical) carry redundant text/icon labels, not color alone, per CLAUDE.md's colorblind-safe requirement. *(S follow-up screenshot audit of live game panels — fleet status, research queue, order book — not yet done.)*
- The high-contrast token set already has a separately-fixed tertiary-text value (`--hc-text-tertiary`, noted in `globals.css` as "was slate-500") — confirm the default (non-high-contrast) tokens are the only remaining gap before treating this as unaudited territory.

---

## 6. Enthusiast and Business Experience Improvements (ranked)

1. **First viewport on every content page is consumed by chrome, not content** *(M, impact 4, enthusiast)* — before real content is visible on `/mission-control` or `/rockets`, the viewport already holds a promo banner, an app-store banner, main nav, the 42-module `ModuleNavBar` carousel, a floating Quick Start panel, and a cookie-consent bar; the H1 on Mission Control doesn't clear the fold until ~500px of scroll. Collapse to one banner at a time, slim or hide `ModuleNavBar` on primary content pages, default Quick Start to collapsed after first view. Files: `src/app/layout.tsx`, `src/components/ModuleNavBar.tsx`, `src/components/OnboardingChecklist.tsx`.
2. **No "what's next" cross-links from rocket/launch pages** *(M, impact 4, enthusiast)* — every walked page (`/rockets` → `/predictions` → `/satellites` → `/whats-overhead`) is a dead end with no path to Predictions, the live satellite map, or launch alerts. Add a standard rail: "Stake a prediction on this launch," "Track it live after launch," "Set a launch alert." This is the single highest-leverage change for turning single-page sessions into multi-page ones (Space Tycoon is the only surface currently averaging 5+ views/user).
3. **Retention hooks are essentially absent outside the game** *(M, impact 4, enthusiast)* — no streaks, shareable cards, or notification hooks on What's Overhead, Predictions, Rockets, or Mission Control. `localStorage` already collects visit history (`spacenexus-exploration-visits`) unused. Prioritized build order: (a) native Web Share + OG image on What's Overhead results and Predictions questions — cheap, feeds organic growth; (b) a lightweight visit streak on Mission Control built on data already collected; (c) per-rocket "notify me" extending the existing launch-alerts feature.
4. **Quick Start checklist should branch by persona** *(S, impact 3, enthusiast)* — currently 3 of its 4 items are business/market-intel tasks regardless of who's visiting. Branch on the new enthusiast persona: "Set up launch alerts," "Track a live launch," "Try What's Overhead," "Play a Prediction."
5. **Procurement — the flagship contracts hub — shows 1 live opportunity and 0 upcoming deadlines** *(M, impact 4, business)* — `src/app/procurement/page.tsx` bills itself as "the unified hub for government space contracts" but its live `ProcurementOpportunity` feed has gone effectively empty (worse than the already-flagged "soft-stale ~10d" open item). Investigate the ingestion cron for an upstream API/auth failure — but first confirm the cron is actually registered on Railway before scoping this as M.
6. **Company Scoring merge** *(M, impact 3, investor)* — see §3 consolidation table; a business/investor visitor currently sees two competing "go see the grade" surfaces (`/space-score`, `/report-cards`).

---

## 7. Space Tycoon Acquisition/Onboarding Improvements

- [ ] **Add an enthusiast/player persona to OnboardingTour and skip the modal entirely on `/space-tycoon`** *(S, impact 3)* — the game's own `GameStartMenu.tsx` is a better first-touch pitch than a generic business-persona tour dumped on top of it. Add `PERSONA_DESTINATIONS` entry to `/space-tycoon`; skip firing when the landing pathname already is `/space-tycoon`.
- [ ] **Exclude `/space-tycoon` from the module-navigation carousel** *(S, corrected from an initial M estimate — impact 4)* — confirmed live: the game's hero art is pushed to the very bottom of the fold beneath a "3 of 42 modules" progress strip and arrow-key hint. The fix is a one-line addition to `EXCLUDED_PATHS` in `src/hooks/useModuleNavigation.ts`, not a page restructure. **The single cheapest, highest-confidence fix in this entire roadmap.**
- [ ] **Conditional copy on Leaderboard/Registry during low-population windows** *(S, impact 2)* — post-Epoch-2-restart, `/space-tycoon/leaderboard` currently reads "1 corporations are competing… Top 1 by net worth." Below a floor threshold (e.g. <15 corps), swap to "A new epoch just began — be one of the first names on this board." `src/app/space-tycoon/leaderboard/page.tsx` and `registry/page.tsx`.
- [ ] **Surface the real-world NOAA/launch-window feed on the site side** *(S, impact 3)* — `src/lib/game/real-world-feed.ts` already pulls live space-weather and launch-window data into in-game contract bonuses, but nothing on `/launches/[site]/[yyyy-mm]` or `/mission-control` tells a site visitor a tracked real launch is currently boosting Tycoon contract payouts. A one-line contextual callout turns the site's strongest organic surface (launch pages, 28.7k+25.3k impressions) into a game-acquisition funnel using a mechanic that already exists server-side.

**Protect, don't touch:** the public/shareable game surfaces — leaderboard, corp pages, chronicle, registry, FAQ, referral system — are genuinely well built: honest `VideoGame` JSON-LD with no fabricated player counts, privacy-scoped public leaderboard data (`public-leaderboard.ts` explicitly excludes userId/email/raw state), and a working mentor/mentee referral loop wired into corp pages. Keep the fixes above scoped away from these server-rendered public routes.

**Open question flagged, not yet answered:** does OnboardingTour have any "already onboarded" skip logic tied to game-save state specifically (vs. the generic localStorage persona flag)? A returning player with a saved game seeing the full-screen persona modal on top of their own game state would be a worse UX than the first-visit case — worth checking before shipping the persona fix.

---

## 8. Quality Fixes

- [ ] **`--text-tertiary`/`--text-muted` WCAG AA failures** *(S, impact 3, all)* — see §5 token table. 148 usages across 88 files, including real heading copy (`src/app/page.tsx:216`).
- [ ] **OnboardingTour: no focus trap, no initial focus, background not hidden from assistive tech** *(S, impact 4, all)* — `role="dialog" aria-modal="true"` present, but no Tab containment, no `.focus()` call anywhere in the file, and the backdrop/page behind it carries no `aria-hidden`/`inert` while open. This is the first interactive surface nearly every new visitor's browser renders.
- [ ] **Decorative hero PNG over-prioritized** *(S, impact 3, all)* — `LandingHero.tsx` requests a 1.19MB image at `priority`+`fetchPriority="high"` for a 15%-opacity background layer; `/ignition` and `/mission-cost` carry the plain `priority` flag on similar hero images (not `fetchPriority`, so the fix scope is narrower than first estimated — do **not** touch `BentoFeatures.tsx`, which carries neither prop). Compress all three source PNGs to WebP under 150KB.

**Investigated and dropped:** a proposed fix for "401s and CSP-blocked ad-script requests on every page load" was rejected — `src/middleware.ts` sets no `connect-src`/`script-src` CSP directive that could cause the reported violations (only `frame-ancestors *`), so the fix target was misdiagnosed, and AdSense is already correctly env-gated behind `NEXT_PUBLIC_ADSENSE_CLIENT_ID`. Not worth further triage time given monetization is on hold.

---

## 9. What the Research Missed / Open Questions

- **Screenshot methodology inflated three design findings that were rejected outright.** Every screenshot in this investigation launched a fresh headless browser with empty `localStorage`/`sessionStorage` — so "the onboarding modal blocks every page" and "floating widgets permanently overlap" both scored as severe bugs when the underlying code (`OnboardingTour.tsx`, `TrialBanner.tsx`, `ArticleLimitBanner.tsx`) already persists dismissal correctly and, in one case, wasn't even mounted on the pages cited. **Lesson for future passes: grep the actual mount/persistence logic before scoring a UI complaint as "every visit," not just as "every screenshot."**
- **No 301-redirect mechanics were verified** against `next.config.js`'s existing 100+-entry redirect list or Railway's build-time route generation — confirm query-param destinations (`?tab=live`) work cleanly via `next.config.js` redirects vs. needing middleware before scoping any consolidation merge's effort.
- **No per-URL Search Console data was checked** for the 9 pages proposed for consolidation — collapsing five ranking URLs into one tabbed hub could lose distinct long-tail SEO value the GA4 session-count evidence doesn't capture.
- **No repo-wide grep for hardcoded old slugs** (in `blog-content.ts`, `guide-navigation.ts`, or inline `<Link>` tags) was done before scoping any merge — the true blast radius of each redirect is unverified.
- **No GA4 funnel/exit-rate data exists to confirm the onboarding modal or module carousel actually cause drop-off** — impact scores on those items are informed inference from UX friction, not measurement. Worth instrumenting before/after once the fixes ship.
- **Whether other flagship pages share the module-carousel problem wasn't checked** — if `/mission-control` and `/company-profiles` (both real GA4 traffic) also render the "42 modules" strip above their content, the `EXCLUDED_PATHS` fix should be templated across all of them in one pass, not scoped as Space-Tycoon-only.
- **funding-tracker's Pro gate is a monetization-strategy question disguised as a UX bug** — removing it has real revenue implications the research didn't quantify; this needs Jay's explicit ruling, not a unilateral fix, given the described audience ("the one page investors most want") sits behind the only full-page paywall on the business side.
- **No numeric fact-check process was specified** for ~16 new cost-to-launch price entries or the NSSL Phase 3 procurement guide — these are business claims a professional reader will check; effort estimates in §4 don't visibly budget verification time.
- **No accessibility check (colorblind-safe, reduced-motion, keyboard nav, screen-reader labels) was run on any proposed new UI** — persona card, cross-link rail, share buttons, hero illustrations — despite CLAUDE.md making this a hard requirement. Bake it into each build's acceptance criteria rather than treating it as a follow-up audit.
- **Mobile viewport wasn't verified** for the game-onboarding or module-carousel fixes despite CLAUDE.md's explicit mobile-parity requirement for Space Tycoon — a separate `SwipeModuleNavigation` component handles mobile and may behave differently from the desktop screenshots this research relied on.