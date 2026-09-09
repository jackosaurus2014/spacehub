# Site audit — 2026-09-09 (overnight, CEO-for-the-night)

Method: every static route under `src/app` (336) plus every nav/footer link
was loaded in a real headless browser at 1366×900 (`scratchpad/crawl.js`),
recording HTTP status, page errors, console errors, title/H1/description,
text smells (`undefined`, `NaN`, `null`, `[object Object]`, `Invalid Date`),
broken images, horizontal overflow, empty states and a screenshot. The five
desktop menus and the mobile menu were opened and their links recorded
(`scratchpad/menus.js`). Menu-linked pages were re-crawled at 390×844.

## Fixed tonight

| # | Surface | Problem | Fix |
|---|---------|---------|-----|
| 1 | `/sitemap/0-3.xml` | Every part served an empty `<urlset>` since the Next 15.5 upgrade (2026-09-02): ids arrive as strings, numeric `switch` matched nothing | `Number(id)`; `sitemap-id-guard.test.ts` (7cf01521) — live: 773 / 331 / 64 / 1,255 URLs |
| 2 | 18 routes (`/artemis`, `/starship`, `/countdown`, `/regulatory-radar`, `/community`, …) | Title rendered "… \| SpaceNexus \| SpaceNexus" — 33 files set a top-level title that already carried the suffix and the root template appended it again | Suffix stripped in 33 files; `metadata-precedence-guard` now covers the root template |
| 3 | `/launch-vehicles` | Page crashed to the error boundary: `Cannot read properties of undefined (reading 'bg')` when a vehicle status is outside the three literals | `getStatusColor` default branch |
| 4 | `/space-quiz` | React #418 on every load — questions shuffled in the `useState` initializer | Deterministic first ten on the server, shuffle in `useEffect` |
| 5 | `/space-stations` | React #418 — ISS fallback timestamp is `Date.now()` at module load | `suppressHydrationWarning` on the clock line |
| 6 | `/news-aggregator` | React #418 — "Updated HH:MM" rendered from `new Date()` | `suppressHydrationWarning` |
| 7 | `/space-manufacturing` | "$NaNM - $NaNM" — the refresher stored free-form analyst notes where `MarketProjection` rows are expected | Live rows must have numeric low/mid/high or the fallback stays |
| 8 | `/asteroid-watch` | Torino cell printed the word "null" (Sentry `ts_max` null → NaN → JSON null → `String(null)`) | `n/a` for non-finite Torino/Palermo/velocity; fetcher keeps null |
| 9 | `/launch-cost-calculator` | Six console errors: `<rect>` negative width | `BarChart` clamps widths at 0 |
| 10 | `/app` | Broken image `nb-phone-screenshot-5.png` (file never existed) | Screenshot list skips 5 |
| 11 | `/pricing`, `/my-watchlists` (signed out) | No `<h1>` | First section heading promoted |
| 12 | `/mission-control`, `/startups` | Two `<h1>`s | Secondary headings demoted to `<h2>` |
| 13 | `/api/auth/session` | 429 under the generic 200/min API budget bounced fast multi-tab sessions to /login | Own 600/min budget (807264a5) |
| 14 | `/space-tycoon` (any viewport) | Landing crashed to the "Mission Failure" boundary — whose button offers to clear the save — when `/api/game/spot-prices` returned an error body (`.prices.length` of `{ error }`); reproduced with an injected 429 | `LiveEconomyStrip` checks `res.ok` and the array; failure hides the strip |
| 15 | Every anonymous page | Four requests that can only 401 per view (`/api/init` admin-only, two notification feeds, persona sync) | Gated on `useSession` |
| 16 | Generic `/api/*` budget | 200/min per IP; a page fires 5–10 GETs, so a member with a few tabs — and the crawl itself — hit "Too many requests" (company profiles rendered the error card) | GET 400/min, writes 200/min |
| 17 | Every 404 URL | React #418: the 404 shell is prerendered once with pathname `/_not-found` and served for all unknown URLs, so the breadcrumb trail never matched | `AutoBreadcrumb` skips the not-found shell |
| 18 | `/launch-vehicles` (again) | After the status default, crashed on a missing numeric field from live refresher rows | Live rows accepted only when shaped like the curated rows (same keys, same types) |
| 19 | `/supply-chain` (signed in) | "NaN" tier counts from an error body | Stats ignore non-OK / malformed responses |
| 20 | `/launch/[id]`, `/space-tycoon/balance-reports/[slug]`, community posts | Second `<h1>` (dashboard header; markdown `# Title`) | Demoted to `<h2>` |
| 21 | `/space-quiz` | Bare question block, no heading | H1 + one-line intro |

| 22 | Every page, every member | AdSense script loaded unconditionally from the root layout: Google's page-level units reached Pro/trial members (promised "Ad-free" on /pricing) and the Space Tycoon command deck, where an anchor bar sat over the outliner | `AdSenseLoader` gated on tier and route; `AdBanner` renders nothing on an ad-free tier; `adsense-gating-guard.test.ts` |
| 23 | `/login` (and any page) | The onboarding "Welcome to SpaceNexus" modal fired on a visitor's fifth page view even on the login form, covering it | Tour excluded on auth, checkout, pricing, embed, account and admin routes |
| 24 | Global chrome (14/14 pages) | axe-core WCAG AA: ~9 colour-contrast failures per page from the nav search hint and footer meta (slate/zinc-500/600 on black, 2.7–4.4:1); pricing CTA white on the orange accent (2.6:1); `<time aria-label>` without a role; a link distinguishable only by colour | Lightened to 400-weights; CTA text dark on the accent; `role="timer"`; underline |

Verified working (no change): desktop menus and mobile menu; search palette (Ctrl+K → 7 results for "starship"); newsletter signup rejects a bad address; wrong password shows "Invalid credentials"; contact form validation; no-account launch alert form on launch pages; **Space Tycoon signed-in join** (New Game → Cape Heritage → dashboard live at $75.0M, `POST /api/space-tycoon/sync` 200, map hotkey `2` selects LEO, zero page errors).

Structural note: company-profile bodies are client-fetched (`/api/company-profiles/...`), so a rate-limited or slow API leaves a titled page with an error card, and Google gets the shell. Worth server-rendering the profile body (331 pages in the sitemap).

## Open / by design (not changed)

- `/space-environment` shows "Sample data — live feed unavailable": NASA DONKI rejects `DEMO_KEY`; needs `NASA_API_KEY` in Railway (Jay action, noted since 8/28).
- `/solutions/analysts`, `/space-tycoon/about`: React #418 seen once each, did not reproduce on a second load; the site-wide LiveRail clock fix (9/3) covers the usual cause. Re-check on the next crawl.
- `/developer/explorer`: #418 seen once on 9/8, clean on three later runs.
- Login-redirect pages (`/account`, `/dashboard`, `/desk`, `/settings`, …) are intentionally thin for anonymous visitors.
- `/widgets/*` are iframe embeds — thin by design, no H1 wanted.
- Mothballed routes (`/gig-work`, `/deal-rooms`, `/speaking`, `/teams`, `/study-groups`, `/ticket-resale`, `/investor-hub/*`) 307 to their hubs as designed.
- 20–30 s loads were observed on some redirect chains while five crawlers ran in parallel; not reproduced singly.

## Menus

Desktop: Launches (10 links), News (8), Markets (9), Business (8), Learn (8) — all open, all links visible and on-screen. Mobile: hamburger opens search, quick links (Live, Jobs, Space Tycoon) and the five collapsible categories plus More.
