# Competitor review — 2026-09-10

Scope: space-industry news publishers and space job boards, compared against
SpaceNexus as it stands today (after the 9/8–9/10 audit and the trial/cloud-save
work). Sources: each competitor's live site or subscription page on 9/10, plus
Hark's 2026 newsletter ranking. Our side is from the code and a real-browser
walk of `/jobs`, `/news`, `/space-talent`, `/hiring-index` and a job page.

Ideas are ranked at the end. Effort is a rough build-days estimate.

---

## 1. Where we stand (facts, not opinions)

**Jobs.** 8,661 open roles at 41 companies, refreshed daily from 16 ATS
boards; 15 SEO landing pages (6 functions, remote, 8 states); job alerts
(daily/weekly), "Who's Hiring" Wednesday email, a monthly hiring index and
weekly hiring report; company links from every job; a Talent Hub (expert
consultants, gig board, workforce analytics); a salary dataset
(`salary-data.ts`, Aug 2026) used on the job guide. **Not** on the page:
any filter or search on `/jobs` itself (category cards only), no salary on job
cards or job pages, no saved jobs, no candidate profile, no employer product
or price on `/hire`.

**News.** Aggregated feed from 50+ automated sources with thumbnails, 11
category chips, "Why this matters" blocks, AI insights, the M/Th digest,
intelligence briefs, mission debriefs, a live rail and livestream banner. **Not**
there: search or date/source filters on `/news`, saving/reading-list on the
feed, comments, an editorial voice (no named authors, no opinion), no
daily email.

**Membership.** One Pro tier at $19.99/mo · $199/yr with a 14-day trial;
exclusives are the supply-chain map, compliance suite, customer-discovery DB,
alerts/webhooks, API, watchlists, ad-free.

---

## 2. News competitors

| Site | Model | What they do that we don't | What we do that they don't |
|---|---|---|---|
| **SpaceNews** | Trade paper; paywall from $25/mo; events (World Space Business Week, Icon Awards); sponsored content; press-release service; job board | Named reporters and opinion; six verticals; "First Up" weekday email + Friday weekly; events business; press-release distribution ("Stellar Dispatch") | Live launch/cadence data, trackers, calculators, company profiles, the game, free everything |
| **Payload** | Newsletter-first (weekday daily, Pro weekly, Europe, Polaris policy); Payload Pro $999/yr research | Newsletter as the product; a policy vertical; fundraising tracking as a content pillar; exclusive reporting | Structured data (funding rounds DB, launch calendar, stocks) instead of prose roundups; tools |
| **Via Satellite** | 40-year trade pub; SATELLITE conference; 12 topic verticals; "On Orbit" podcast; awards; career center | Awards/recognition programs; executive interviews; conference gravity | Broader than satellite; live data; game; free |
| **Spaceflight Now** | Launch coverage; members-only tier; Launch Pad Live 24/7 cam; per-vehicle mission reports; donate/shop | Live launch coverage with timestamps; 24/7 pad camera; booster-reuse records; per-vehicle report archives | Launch *data* (calendar, slips, cadence, cost), alerts without account, rockets/site pages |
| **NASASpaceflight** | L2 subscription (from $19.99; ~$90/yr) with insider docs/photos; huge forum; YouTube live | Community: the forum is the product; insider L2 content | Structured intelligence, business/investor tools, jobs |
| **Space.com** | Mass audience; Space+ membership (early access, badges); affiliate buying guides; skywatching tools | Photo of the day; night-sky/moon tools; comments; achievements; entertainment crossover | Industry depth, company/market data, jobs |
| **Ars Technica (Berger)** | Rocket Report weekly (the most-read launch newsletter) | A single trusted voice with sharp weekly commentary | Everything data-driven |

**Newsletter landscape (Hark 2026):** 18 ranked space newsletters, *all free*.
Payload #1, Space.com Daily #2, SpaceNews First Up #3, Rocket Report #4. Gaps
Hark names: human spaceflight/tourism, propulsion/technology, non-European
international programs, citizen-science. Our M/Th Digest is not on the list.

**Pattern:** every serious competitor's growth engine is an *email with a
voice*, and their revenue is events, sponsorship, or a research tier — not
site subscriptions. Nobody in the top tier ships live data; nobody has a game.

## 3. Job-board competitors

| Board | Scale | Filters | Salary | Candidate features | Employer product |
|---|---|---|---|---|---|
| **Space Talent** (Space Capital) | 10,000+ roles, 50,000 profiles, 100+ portfolio cos | sector tags | **salary ranges on every role**; salary DB by sector/stage/location | required talent profile; mentorship office hours; Gravitate network; expert sessions | portfolio-only (VC-backed) |
| **SpaceCrew** | 16,255+ jobs | category, location, remote, **salary filter** | crowd-sourced salaries ("avg $109,968"); per-company salary pages (e.g. ESA) | daily/weekly/monthly alerts; free account; salary submissions | undisclosed |
| **Space-Careers** (EuroJobsites) | 200+ jobs, 40+ employers, EU | 30+ job types, country, experience level, sector | no | CV upload, profile (0/3), saved jobs, daily/weekly alerts, weekly newsletter, career guides, conference directory | €720 standard post; free basic/academic |
| **FindASpaceJob** | ~3,000 visitors/mo, 1,300 subscribers | basic | no | newsletter (65% open rate) | €249 standard / €399 featured / custom; repost guarantee |
| **SpaceNexus** | **8,661 roles, 41 cos** | none on `/jobs` (15 landing pages) | no (dataset exists, unused on cards) | alerts, Who's Hiring email, hiring index, consultants | none priced |

**Pattern:** we have more *jobs* than anyone but Space Talent and SpaceCrew
and no way to work the list — no filters, no salary, no save. The two boards
people talk about (Space Talent, SpaceCrew) both lead with **salary**.

---

## 4. Ideas, ranked

Scored on impact for acquisition/retention × fit with what already exists ×
effort. "Days" are build-days.

### Tier 1 — do these (high impact, mostly existing data)

1. **Search + filters on `/jobs`** (1–2 d). Category, location/state, remote,
   company, "new this week", posted-within; URL-addressable so filters become
   landing pages. We have 8,661 rows and the landing-page infrastructure; the
   hub just doesn't expose them. This is the single biggest gap versus every
   board above.
2. **Salary on job cards and pages** (1 d). Use `salary-data.ts` (role × level
   × location modifiers) to show an *estimated* band on every listing where
   the posting has none, labelled "SpaceNexus estimate", plus stated ranges
   where the ATS provides them. Space Talent's whole pitch is "salary ranges
   on every role"; ours would be on 8,661 roles. Also unlocks a
   `/salaries` page family (by role, by company) — SpaceCrew's most-linked
   pages.
3. **A daily email with a voice** (2 d + ongoing). Every top newsletter is a
   weekday morning brief; ours is Monday/Thursday. Add a weekday "Space Nexus
   AM" built from the same feed: five stories with one-line "why it matters",
   the next launch, one data point (cadence, slip, stock). Sonnet drafts,
   the digest pipeline sends. Hark's list has an obvious slot for a
   *data-led* daily.
4. **Saved jobs + saved searches without an account → nudge to account** (1 d).
   localStorage first (same pattern as the game), then "keep these on your
   account" — the acquisition loop we just built for the game, applied to
   the hub with the most traffic.
5. **Employer product on `/hire`** (1 d). Featured placement + newsletter
   inclusion + company-profile highlight, priced €249–399 like FindASpaceJob,
   invoice-billed via Stripe. We already aggregate their jobs for free; a
   featured slot is pure margin and needs no sales motion. (Monetization is
   on hold until November — build the page, decide the launch date then.)

### Tier 2 — strong, some build

6. **Launch-day live blog with a 24/7 pad view** (2–3 d). Spaceflight Now's
   Launch Pad Live and NSF's streams are why enthusiasts go there on launch
   day. We have the live rail, streams and alerts; a per-launch live page
   (`/launch/[id]` gains a "live" mode with the embed, T-minus, timeline,
   and outcome) turns alert clicks into sessions.
7. **Named voices** (ongoing). Competitors are people: Berger, Payload's
   reporters. Publish the AI insights under a consistent byline
   ("SpaceNexus Desk") with a short standing view, and open one weekly
   opinion column. Cheap, and it fixes the "who is this" trust gap.
8. **Company salary pages** (1 d after #2). `/salaries/[company]` from ATS
   ranges + our estimates; SpaceCrew ranks for "ESA salary"-type queries with
   thin pages.
9. **Awards / rankings as recurring content** (1 d each). Via Satellite's
   "10 Hottest", Executive of the Year; we already have the Space Score and
   hiring index — publish "Space Score Top 25" quarterly and "Fastest-hiring
   companies" monthly as dated, linkable pages with OG images.
10. **Reading list on the news feed** (0.5 d). We have `/reading-list`; put
    the save action on every card and in the digest.

### Tier 3 — later or Jay's call

11. **Events calendar with submissions** (SpaceNews, Via Satellite) — we have
    `/events`; add community submissions and a weekly "this week" block.
12. **Press-release intake** (SpaceNews's Stellar Dispatch) — a form that
    feeds the news pipeline with a "press release" label; small revenue line
    later.
13. **Forum** — NSF's moat; ours is mothballed. Revisit only with traffic.
14. **Research tier** (Payload Pro at $999/yr) — the intelligence briefs +
    funding DB + supply-chain map could become an annual "SpaceNexus Research"
    seat for firms; a November decision.
15. **Space+ style perks for members** (badges, early access) — low cost,
    low value at current scale.

### Rejected

- Paywalling news (SpaceNews model): contradicts "information over profit",
  and every competitor's newsletter is free anyway.
- Portfolio-only jobs (Space Talent): our breadth is the asset.
- Affiliate buying guides (Space.com): wrong audience.

---

## 5. What I'd start on

1 → 2 → 4 → 3 → 5. The first three are a week of work that turns the largest
job board in the space industry into one people can actually use, and reuses
data we already hold. The daily email is the growth lever every competitor
proves out; it needs an editorial rhythm, so it comes once the hub work is
done and can be its first feature.
