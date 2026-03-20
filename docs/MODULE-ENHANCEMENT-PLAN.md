# SpaceNexus Module Enhancement Plan — Multi-Role Analysis

**Date:** 2026-03-20
**Modules Audited:** 214 directories, 279 page routes, 9 module clusters
**Analysis Approach:** 3 cycles per role, 9 roles

---

## CYCLE 1: Identify Gaps (What's Missing?)

### Product Manager
1. **Company profiles don't show funding history inline** — users navigate away to funding-rounds. Should embed a funding timeline directly on each company profile.
2. **Dashboard doesn't show contract awards or executive moves** — these are high-signal events that users want on their main screen.
3. **Space Weather has no impact indicator** — shows raw data but doesn't translate to "what does this mean for my satellite/mission?"
4. **No unified search across all modules** — search only works within individual modules. A global command palette exists but only links to pages, not data.
5. **No "follow a company" → get updates across all modules** — watchlist exists but doesn't aggregate news + funding + executive moves for a watched company.

### CTO
1. **Data duplication across modules** — company data fetched independently on company-profiles, deal-flow, executive-moves, market-intel. Should be a shared service with caching.
2. **No real-time data streaming** — all data is polling-based. WebSocket or SSE would enable live updates.
3. **Module relationships are static configuration** — should be dynamically generated based on actual user navigation patterns.
4. **No A/B testing infrastructure** — can't test different layouts or features.
5. **No error tracking per module** — if one module breaks, it's hard to know without user reports.

### Marketing VP
1. **No social sharing on individual data points** — can share articles but not a specific company profile or funding round.
2. **Blog articles don't link to relevant tools** — "How to Track Satellites" should have an embedded satellite tracker widget.
3. **No "powered by SpaceNexus" embed widgets** — other sites can't embed our data, missing distribution channel.
4. **City pages don't have company comparison tables** — lost SEO opportunity for "space companies in Houston vs Denver."
5. **No referral program reward for game players** — Space Tycoon players are engaged users who could refer others.

### CEO
1. **No usage analytics visible to me** — I need a simple dashboard showing: users/day, most viewed pages, conversion funnel, revenue.
2. **Free tier gives away too much** — 25 articles/day + unlimited tools = no urgency to upgrade.
3. **No annual pricing nudge** — monthly users who've been subscribed 3+ months should see annual discount offers.
4. **No partnership/integration page for B2B** — defense contractors and VCs would pay for API access but don't know it exists.
5. **Game doesn't drive subscriptions** — Space Tycoon is free with no connection to the Pro tier.

### TPM (Technical Program Manager)
1. **Module loading performance varies wildly** — heavy pages (market-intel, company-profiles) need audit.
2. **No feature flags** — can't gradually roll out changes to specific user segments.
3. **Cron job monitoring is internal only** — need external uptime monitoring (UptimeRobot/Checkly).
4. **No deployment rollback plan** — if a bad commit goes to Railway, recovery is manual.
5. **Technical debt in page.tsx files** — space-tycoon/page.tsx is 900+ lines, needs decomposition.

### Lead Designer
1. **Inconsistent card layouts** — some modules use `.card`, others use custom rounded-xl with different padding.
2. **No empty state design system** — each module handles "no data" differently.
3. **Mobile tab bar doesn't reflect progressive disclosure** — shows all categories regardless.
4. **No skeleton loading patterns for data tables** — some pages show spinners, others show nothing.
5. **Color semantics not standardized** — green sometimes means "positive," sometimes "active."

### SEO Specialist
1. **No internal linking strategy from blog → tools** — 200+ articles rarely link to the actual tools they describe.
2. **Comparison pages (/compare/) are thin content** — need more substance for SEO.
3. **No FAQ schema on tool pages** — satellite tracker, mission simulator, calculators need FAQ.
4. **No breadcrumb schema on most pages** — BreadcrumbSchema component exists but underused.
5. **City pages don't cross-link to each other** — "Compare Houston vs Denver" would be valuable SEO.

### 10x Developer
1. **Module relationships file is 160+ lines of manual config** — should be auto-generated from page metadata.
2. **Blog CTA map is manually maintained** — 150+ entries that could be automated with keyword matching.
3. **Each tool page reimplements similar layouts** — need a `ToolPageLayout` component.
4. **Game page is monolithic** — 900+ lines in one file with inline components.
5. **Type definitions scattered** — game types in types.ts, but component props defined inline.

### Site Designer
1. **Hero section could be more dynamic** — show live launch countdown or space weather alert.
2. **Footer is overcrowded** — 80+ links in 8 columns. Needs hierarchy/grouping.
3. **No visual hierarchy on data-heavy pages** — market-intel and company-profiles are walls of text.
4. **No dark/light theme toggle** — OLED mode exists but normal dark vs light doesn't.
5. **Game UI doesn't match the rest of the site** — different background color (#050510 vs space-900).

---

## CYCLE 2: Prioritize (What Has the Highest Impact?)

### Cross-Role Priority Matrix

| Enhancement | PM | CTO | Mkt | CEO | TPM | Des | SEO | Dev | Site | Score |
|---|---|---|---|---|---|---|---|---|---|---|
| Company profile funding timeline | 5 | 3 | 3 | 4 | 2 | 4 | 3 | 3 | 3 | **30** |
| Dashboard shows exec moves + contracts | 5 | 2 | 3 | 4 | 2 | 4 | 2 | 2 | 4 | **28** |
| Blog articles → tool deep links | 3 | 2 | 5 | 3 | 1 | 3 | 5 | 4 | 2 | **28** |
| Global unified search | 5 | 4 | 2 | 3 | 3 | 4 | 3 | 3 | 2 | **29** |
| Company watchlist aggregation | 5 | 3 | 3 | 4 | 2 | 3 | 2 | 3 | 3 | **28** |
| Space weather impact indicator | 4 | 2 | 3 | 3 | 2 | 5 | 3 | 2 | 4 | **28** |
| FAQ schema on tool pages | 2 | 1 | 4 | 2 | 1 | 2 | 5 | 3 | 1 | **21** |
| Social sharing on data points | 2 | 2 | 5 | 3 | 1 | 3 | 4 | 2 | 2 | **24** |
| City page cross-linking | 1 | 1 | 4 | 2 | 1 | 2 | 5 | 3 | 1 | **20** |
| Shared company data service | 3 | 5 | 1 | 2 | 4 | 1 | 1 | 5 | 1 | **23** |
| Internal linking blog → tools | 2 | 2 | 5 | 3 | 1 | 2 | 5 | 4 | 1 | **25** |
| Game → subscription bridge | 2 | 2 | 4 | 5 | 1 | 2 | 2 | 3 | 2 | **23** |

### TOP 10 BY SCORE:
1. **Company profile funding timeline** (30) — PM + CEO + Designer win
2. **Global unified search** (29) — PM + CTO + Designer win
3. **Dashboard exec moves + contracts** (28) — PM + CEO + Designer win
4. **Blog → tool deep links** (28) — Marketing + SEO win
5. **Company watchlist aggregation** (28) — PM + CEO win
6. **Space weather impact indicator** (28) — PM + Designer win
7. **Internal linking blog → tools** (25) — Marketing + SEO + Dev win
8. **Social sharing on data points** (24) — Marketing + SEO win
9. **Shared company data service** (23) — CTO + Dev win
10. **Game → subscription bridge** (23) — CEO + Marketing win

---

## CYCLE 3: Implementation Plan

### BATCH 1: Cross-Module Data Widgets (3 items, high PM + CEO impact)

**1.1 Company Profile Funding Timeline**
- Add a `FundingTimeline` component showing funding rounds as a visual timeline
- Render inside each company profile page
- Data: round type, amount, date, lead investor
- Visual: vertical timeline with colored dots by round stage

**1.2 Dashboard Executive Moves + Contract Awards Widget**
- Add `RecentSignals` widget to dashboard showing:
  - Latest 3 executive moves (name, from→to company, role)
  - Latest 3 contract awards (agency, company, value)
- Each links to the full module page

**1.3 Space Weather Impact Indicator**
- Add `SpaceWeatherImpact` component to /space-weather showing:
  - Current risk level (Low/Moderate/High/Severe) with color
  - Impact on: GPS accuracy, HF radio, satellite drag, aurora visibility
  - Recommended actions for satellite operators

### BATCH 2: SEO + Content Cross-Pollination (3 items, high Marketing + SEO impact)

**2.1 Blog Article → Tool Embeds**
- Create `InlineToolCTA` component that renders a mini-preview of a tool
- Auto-insert at the end of blog articles based on CTA map
- Examples: satellite article → mini satellite tracker, launch article → mini countdown

**2.2 FAQ Schema on 10 Tool Pages**
- Add FAQ structured data to: orbital-calculator, link-budget-calculator, mission-simulator, constellation-designer, thermal-calculator, radiation-calculator, power-budget-calculator, satellite-tracker, space-weather, mission-cost

**2.3 City Page Cross-Linking**
- Add "Compare with other space hubs" section to each city page
- Links to other city pages with brief stat comparison
- Creates internal link network for SEO authority

### BATCH 3: Platform Intelligence (2 items, high CTO + Dev impact)

**3.1 Unified Company Signal Feed**
- Create `/api/company-signals/[slug]` endpoint
- Aggregates: news mentions, funding events, executive moves, patent filings
- Render as a timeline on each company profile
- Cache with 5-minute SWR

**3.2 Game → Pro Subscription Bridge**
- After reaching Tier 2 in Space Tycoon, show a banner:
  "Enjoying Space Tycoon? Explore real space industry data with SpaceNexus Pro"
- Link to /pricing with UTM: ?utm_source=game&utm_medium=tier2_banner
- Non-intrusive: dismissible, shows once

---

## DATA CROSS-POLLINATION MAP

```
┌──────────────────────────────────────────────────────────────────┐
│                    COMPANY DATABASE (core)                       │
│  company-profiles ←→ funding-rounds ←→ executive-moves          │
│         ↕                   ↕                  ↕                │
│    market-intel        deal-flow          news/blogs            │
│         ↕                   ↕                  ↕                │
│    space-economy      investors        ai-insights              │
│         ↕                                     ↕                │
│    industry-trends ←─────────────→ intelligence-brief           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   ORBITAL DATABASE (operations)                  │
│   satellites ←→ constellations ←→ debris-tracker                │
│       ↕               ↕                ↕                       │
│  space-weather   ground-stations   space-insurance              │
│       ↕               ↕                ↕                       │
│  aurora-forecast  launch-manifest  compliance                   │
│       ↕                                ↕                       │
│  earth-events ←──────────────→ regulatory-calendar              │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  ENGINEERING DATABASE (tools)                    │
│  orbital-calc ←→ mission-cost ←→ launch-vehicles               │
│       ↕               ↕                ↕                       │
│  link-budget    mission-simulator  propulsion-db                │
│       ↕               ↕                ↕                       │
│  power-budget  constellation-designer  thermal-calc             │
│       ↕                                                        │
│  radiation-calc ←────────────→ space-environment               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   TALENT DATABASE (careers)                      │
│  space-talent ←→ salary-benchmarks ←→ jobs                     │
│       ↕               ↕                ↕                       │
│  career-guide    workforce-analytics  education-pathways        │
│       ↕                                ↕                       │
│  conferences ←──────────────→ company-profiles (jobs tab)       │
└──────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION PRIORITY ORDER

| # | Enhancement | Effort | Impact | Role Winners |
|---|---|---|---|---|
| 1 | Dashboard signals widget (exec + contracts) | Low | High | PM, CEO, Designer |
| 2 | Space weather impact indicator | Low | High | PM, Designer |
| 3 | Blog → tool CTA embeds | Medium | High | Marketing, SEO |
| 4 | City page cross-linking | Low | Medium | SEO |
| 5 | FAQ schema on 10 tool pages | Low | Medium | SEO |
| 6 | Game → Pro subscription bridge | Low | Medium | CEO, Marketing |
| 7 | Company profile funding timeline | Medium | High | PM, CEO, Designer |
| 8 | Unified company signal feed | High | High | CTO, Dev |
