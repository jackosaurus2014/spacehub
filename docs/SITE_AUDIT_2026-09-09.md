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
