# SpaceNexus R&D: Path to Preeminence

**Status:** Active Development
**Goal:** Make SpaceNexus the #1 space intelligence platform on the internet
**Started:** 2026-03-20

---

## Strategic Thesis

SpaceNexus has breadth (270+ pages, 200+ articles, 50+ data sources). To become preeminent, we need:
1. **Proprietary data** nobody else has
2. **Distribution** that compounds (email list, citations, word-of-mouth)
3. **Stickiness** — one tool so good people can't work without it
4. **Trust** — real users, real citations, real industry presence

---

## PROJECT 1: Space Company Health Index (SCHI)
**Priority:** HIGHEST — creates proprietary data asset
**Status:** In Progress

### Research
- [ESA European Space Index](https://commercialisation.esa.int/european-space-index/) — tracks economic performance of space sector
- [Space Capital Space Investment Quarterly](https://www.spacecapital.com/space-iq) — funding trends (paid reports)
- [NewSpace Index by SpaceWorks](https://www.spaceworks.aero/new-space-index/) — stock-based index weighted by market cap
- [OECD Composite Indicator Handbook](https://www.oecd.org/content/dam/oecd/en/publications/reports/2005/08/handbook-on-constructing-composite-indicators_g17a16e3/533411815016.pdf) — gold standard methodology

### Our Methodology
Composite score 0-100 for each tracked company, updated weekly:

| Signal | Weight | Source | How We Measure |
|--------|--------|--------|---------------|
| Funding Velocity | 25% | Prisma DB + Crunchbase | Months since last round, round size vs. peers |
| News Sentiment | 20% | AI analysis of news mentions | Positive/negative/neutral ratio over 30 days |
| Hiring Momentum | 20% | Job posting count trend | Week-over-week change in open positions |
| Patent Activity | 15% | USPTO + SpaceNexus DB | Patents filed in last 12 months |
| Contract Wins | 10% | SAM.gov + USAspending | Government contracts awarded in last 6 months |
| Market Position | 10% | SpaceNexus Score | Existing composite score (sector, tier, revenue) |

### Score Interpretation
- 80-100: **Strong Growth** — actively raising, hiring, winning contracts
- 60-79: **Stable** — healthy operations, moderate growth signals
- 40-59: **Watch** — mixed signals, some concerning trends
- 20-39: **At Risk** — declining indicators, possible trouble
- 0-19: **Distressed** — significant negative signals across multiple dimensions

### Implementation
1. Create `src/lib/company-health-index.ts` — scoring algorithm
2. Create `/api/company-health/[slug]` — per-company score API
3. Create `/api/company-health/rankings` — top/bottom ranked companies
4. Add weekly cron job to recalculate scores
5. Display on company profiles + dedicated rankings page at `/space-score`
6. Publish weekly "Space Company Health Rankings" as shareable content

### Files
- `src/lib/company-health-index.ts` — scoring engine
- `src/app/api/company-health/` — API routes
- `src/components/company/HealthScoreBadge.tsx` — visual badge component

---

## PROJECT 2: Live Launch Webcast Hub
**Priority:** HIGH — creates stickiness
**Status:** In Progress

### Research
- [RocketLaunch.Live](https://www.rocketlaunch.live/) — aggregates launch streams
- [Spaceflight Now Launch Pad Live](https://spaceflightnow.com/launch-pad-live/) — 24/7 Cape Canaveral cameras
- [NASA Live](https://www.nasa.gov/live/) — official NASA streams
- SpaceX, Rocket Lab, ULA all provide YouTube embed links

### What Makes Ours Better
- **Auto-detect upcoming webcasts** from YouTube using launch event data
- **Countdown timer** synced to T-0
- **Live chat** (already built) for community during launch
- **Telemetry overlay** — show altitude, velocity, downrange when available
- **Post-launch summary** — AI-generated recap within 30 minutes
- **Push notification** 30 minutes before liftoff (already wired)

### Implementation
1. Enhance existing `/live` page with YouTube embed detection
2. Add `webcatUrl` field to SpaceEvent model (already exists)
3. Auto-search YouTube for "{rocket name} launch live" when T-minus < 2 hours
4. Show embedded YouTube player on Mission Control when stream is live
5. Add "Watch Live" prominent button that appears 1 hour before launch

### Files
- `src/app/live/page.tsx` — enhanced live page
- `src/components/modules/LiveWebcast.tsx` — embeddable webcast widget
- `src/app/mission-control/` — add live stream embed when active

---

## PROJECT 3: "What's Overhead Now" Satellite Feature
**Priority:** HIGH — viral potential
**Status:** Planned

### Research
- [Heavens-Above](https://www.heavens-above.com/) — gold standard for pass predictions
- [N2YO.com](https://www.n2yo.com/) — real-time tracking with Google Maps
- [NASA Spot the Station](https://www.nasa.gov/spot-the-station/) — ISS-specific predictions
- [ISS Detector](https://www.issdetector.com/) — popular mobile app for visual passes

### What Makes Ours Better
- **No app download required** — works in browser on any device
- **One-click geolocation** — "What's above me right now?"
- **Integrated with our satellite database** — 10,000+ objects
- **Starlink train predictor** — when to see newly deployed Starlink
- **ISS pass alerts** — push notification when ISS is visible from your location
- **Shareable results** — "I just spotted ISS!" social card

### Implementation
1. Create `/whats-overhead` page
2. Use browser Geolocation API for user position
3. SGP4 propagation against CelesTrak TLE data (already have this in `satellite-propagator.ts`)
4. Calculate visible passes (elevation > 10°, sunlit satellite, dark sky)
5. Show list of satellites currently overhead + upcoming visible passes
6. Add ISS-specific section with next 5 visible passes
7. "Notify me" button for next ISS pass (uses push notification system)

### Files
- `src/app/whats-overhead/page.tsx` — main page
- `src/lib/pass-predictor.ts` — visible pass calculation engine
- `src/components/satellites/OverheadMap.tsx` — visual sky map

---

## PROJECT 4: Monthly Space Economy Report (Gated PDF)
**Priority:** HIGH — email list growth
**Status:** Planned

### Research
- [Gated Content Best Practices (Foleon)](https://www.foleon.com/blog/should-i-gate-my-white-papers-or-not-6-points-to-consider) — gate only genuinely valuable content
- [B2B SaaS Lead Generation 2026](https://www.headleymedia.com/resources/b2b-saas-lead-generation-3-key-strategies-for-2026/) — progressive profiling
- [Ditch the Gate debate](https://www.a88lab.com/blog/ditch-the-gate-how-to-build-trust-and-demand-with-ungated-content) — semi-gated approach (preview + email for full)
- Key insight: Gate the report PDF but make the web version ungated. Captures leads who want the portable format.

### Report Contents (Monthly)
1. **Launch Activity Summary** — total launches, success rate, by provider
2. **Funding & Investment** — rounds closed, total capital deployed, notable deals
3. **Market Movers** — stock performance of public space companies
4. **Company Health Index Rankings** — top 10 and bottom 5 (our proprietary data!)
5. **Regulatory Updates** — key FCC, NOAA, FAA actions
6. **Technology Milestones** — notable achievements
7. **SpaceNexus Outlook** — AI-generated forward-looking analysis

### Implementation
1. Create `src/lib/report-generator.ts` — aggregates data into report structure
2. Create `/api/reports/monthly/generate` — cron-triggered report generation
3. Create `/report/monthly/[month]` — web version (ungated)
4. Add "Download PDF" button gated behind email
5. Use React-PDF or html-to-pdf for PDF generation
6. Email PDF to subscribers via Resend

### Files
- `src/lib/report-generator.ts` — data aggregation
- `src/app/report/monthly/` — web + gated PDF pages
- Cron: monthly on the 1st

---

## PROJECT 5: Weekly Intelligence Brief Enhancement
**Priority:** MEDIUM — retention
**Status:** Partially Built (cron exists, needs quality improvement)

### Research
- [Best B2B Newsletters (Dock)](https://www.dock.us/library/b2b-newsletters) — clean, minimal layouts
- [SaaS Newsletter Examples (Encharge)](https://encharge.io/saas-newsletter-examples/) — multiple entry points
- Key format: 6-10 links, strong hierarchy, brief descriptions, one primary CTA

### Current State
- `/api/newsletter/intelligence-brief` generates a brief weekly (Fridays 10am UTC)
- Template exists but is basic text
- Not enough subscribers receiving it

### Enhancement Plan
1. Improve template with HTML email design (dark theme, branded)
2. Add sections: "This Week's Launches", "Top Funding Round", "Health Index Mover", "One Tool to Try"
3. Add "Forward to a colleague" link in footer
4. Add "View in browser" link (drives traffic back to site)
5. Promote aggressively: blog footer, dashboard widget, Space Tycoon banner

### Files
- `src/lib/newsletter/` — template improvements
- `src/app/api/newsletter/intelligence-brief/route.ts` — enhanced generation

---

## PROGRESS TRACKER

| # | Project | Status | Started | Completed |
|---|---------|--------|---------|-----------|
| 1 | Space Company Health Index | ✅ Built | 2026-03-20 | 2026-03-20 |
| 2 | Live Launch Webcast Hub | ✅ Built | 2026-03-20 | 2026-03-20 |
| 3 | "What's Overhead Now" | ✅ Built | 2026-03-20 | 2026-03-20 |
| 4 | Monthly Report (Gated PDF) | ✅ Built | 2026-03-20 | 2026-03-20 |
| 5 | Intelligence Brief Enhancement | ✅ Built | 2026-03-20 | 2026-03-20 |

---

## METRICS TO TRACK

| Metric | Current | 30-Day Target | 90-Day Target |
|--------|---------|---------------|---------------|
| Push notification subscribers | 0 | 50 | 500 |
| Email newsletter subscribers | ~unknown | 100 | 1,000 |
| Daily active users | ~unknown | 50 | 500 |
| Play Store installs | 0 (pending) | 50 | 500 |
| Industry citations | 0 | 1 | 5 |
| Real user testimonials | 0 | 3 | 10 |

---

## RESEARCH SOURCES

- [ESA European Space Index](https://commercialisation.esa.int/european-space-index/)
- [Space Capital Investment Quarterly](https://www.spacecapital.com/space-iq)
- [NewSpace Index (SpaceWorks)](https://www.spaceworks.aero/new-space-index/)
- [OECD Composite Indicator Handbook](https://www.oecd.org/content/dam/oecd/en/publications/reports/2005/08/handbook-on-constructing-composite-indicators_g17a16e3/533411815016.pdf)
- [Heavens-Above Satellite Predictions](https://www.heavens-above.com/)
- [N2YO Real-Time Satellite Tracking](https://www.n2yo.com/)
- [NASA Spot the Station](https://www.nasa.gov/spot-the-station/)
- [RocketLaunch.Live](https://www.rocketlaunch.live/)
- [NASA Live](https://www.nasa.gov/live/)
- [Gated Content Best Practices (Foleon)](https://www.foleon.com/blog/should-i-gate-my-white-papers-or-not-6-points-to-consider)
- [B2B SaaS Lead Generation 2026](https://www.headleymedia.com/resources/b2b-saas-lead-generation-3-key-strategies-for-2026/)
- [Best B2B Newsletters (Dock)](https://www.dock.us/library/b2b-newsletters)
- [SaaS Newsletter Examples (Encharge)](https://encharge.io/saas-newsletter-examples/)
