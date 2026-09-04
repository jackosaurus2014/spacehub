# SpaceNexus roadmap — September to November 12, 2026

*Editor: Claude (Fable 5), 2026-08-28. Inputs: 7 Sonnet research lanes + 7 skeptics + editor (64 proposals, 58 survived), 4 Opus 5 lenses + devil's advocate (55 ideas). Raw outputs in `docs/research-2026-08-28/`. Every item below was re-verified by me against the repo before ranking; where the agents disagreed, I say who was right.*

## The read

Both fleets converged on the same diagnosis from different directions, and the code confirms it: **the site is leaking the audience it already wins.** Organic traffic is launch logistics (54k impressions/28d on two guides), but the front door sells a "terminal for space business" with a 14-day trial, onboarding offers six business personas and no space fan, a usage meter runs on launch pages, the launch pages themselves are invisible to Google (one generic OG card, no sitemap entries), and nobody can subscribe to anything without an account. Fixing the leaks is cheaper than any new content and multiplies everything else.

Second finding, unique to Opus and correct: **we are destroying proprietary data daily.** The launch sync overwrites each mission's date in place; recording the change costs one table and makes a slip index nobody can backfill. Same logic for the hiring census (history starts 8/13).

Third: **the agents' MAU arithmetic is optimistic by ~3×** (the Opus advocate said so itself). The honest posture is to build the compounding loop now and spend the perishable windows now, not to promise 10k by Nov 12 from any single list.

## Tier 1 — this week (all S, all funnel)

| # | Item | Evidence (verified) | Files |
|---|---|---|---|
| 1 | **Front door: lead with the launch board.** Hero headline = next launch + countdown + watch link; primary CTA "Every upcoming launch"; drop the trial line. Pricing stays in nav. | `LandingHero.tsx:226` "The terminal / for space / business", `:269` "14-day full trial" — inverts the founder's stated priority against launch-seeking traffic | `src/components/LandingHero.tsx` |
| 2 | **Fix `/jobs`.** Redirect targets `?tab=jobs`; the talent page has no such tab and falls through. The nav's Jobs link — 6,500 synced listings — lands nowhere useful. | `next.config.js:370`; `space-talent/page.tsx` tab ids | `next.config.js` |
| 3 | **Enthusiast persona in onboarding**, first card, routes to Mission Control; skip the modal entirely on `/space-tycoon`. Add focus trap + initial focus + `inert` background (a11y). | `OnboardingTour.tsx:28-33` — investor, entrepreneur, mission-planner, executive, supply-chain, legal; no fan | `src/components/ui/OnboardingTour.tsx` |
| 4 | **Stop metering launch pages.** Scope `UsageLimitBanner` to editorial routes; never on launches/rockets/mission-control. Queue Trial+Announcement banners instead of stacking. | `layout.tsx:333` mounts it globally | `src/app/layout.tsx` |
| 5 | **Launch pages exist to Google and group chats.** Per-launch `generateMetadata` + OG image via `/api/og`, slug URLs, T-14…T+90 in sitemap. | `launch/[eventId]/layout.tsx:10` one static OG card for every launch; 0 `/launch/` sitemap entries | `src/app/launch/[eventId]/*`, `sitemap.ts` |
| 6 | **Exclude `/space-tycoon` (and mission-control, company-profiles) from the module carousel.** The game's hero sits under a "3 of 42 modules" strip. | `useModuleNavigation.ts:25` EXCLUDED_PATHS | `src/hooks/useModuleNavigation.ts` |
| 7 | **Record slip history.** `LaunchDateChange(eventId, from, to, observedAt)` written inside the diff that already runs. Publish nothing yet. | `events-fetcher.ts` overwrites `launchDate` in the same block that diffs status | `src/lib/events-fetcher.ts`, schema |
| 8 | **Hygiene that embarrasses an analyst on first contact:** monthly report `isPublic` filter vs `/space-stocks` (two market caps on one site); funding-tracker's fabricated sources footer → honest `DataAsOf`; contrast tokens `#666/#444` → AA; drop `priority` on the 1.2 MB decorative hero PNG and convert to WebP. | `monthly-report-generator.ts:247`; `funding-tracker/page.tsx:767-771`; `globals.css:60-61`; `LandingHero.tsx:191` | as listed |

**Founder decision inside Tier 1:** the funding tracker is the only fully paywalled business page while monetization is on hold. Sonnet was right to flag rather than fix. My recommendation: open it (enthusiast/investor information over profit, per your own principle); keep Pro for the enterprise-utility tools.

## Tier 2 — weeks 2-3 (M, the compounding loop)

| # | Item | Why | Verdict on the debate |
|---|---|---|---|
| 9 | **Capture without an account.** Email field on launch, rocket, mission-control and cost pages: "one email at T-24h, one at T-1h, one if it scrubs." Nullable-user alert rules. | Alerts gate on `session.user.id` (`api/alerts/route.ts:27`); the site's biggest traffic source cannot be reached twice. Opus: "the only idea that changes the MAU arithmetic of a one-shot visitor." I agree. | Opus wins over Sonnet's "notify me per rocket" — same idea, but the account wall is the blocker. |
| 10 | **Cost-to-launch 4 → ~16, plus ~10 honest city viewing pages** (Cape/Vandenberg/Starbase at city granularity where bearing and distance genuinely differ). Must ship by week 3 to rank by Nov 12. Numeric fact-check budgeted into each entry. | Same template driving the site's largest impression pool. | Both fleets agree. Reject the 300 ISS-pass city pages (doorway farm) — Opus advocate was right. |
| 11 | **Iterate the two pages that carry the site** — launch-cost and launch-schedule guides: refresh, deepen, add the slip strip and rocket links. | 54k impressions; neither fleet proposed it until the skeptic caught the omission. | Sonnet's skeptic, right. |
| 12 | **Cross-link rail on every launch surface**: predict this launch → set alert → track after liftoff → rocket page → viewing guide. Wire `RelatedModules` into compare and guide templates (150 relations defined, 13 call sites). | Only the game averages 5+ views/user; everything else is a dead end. | Both agree. |
| 13 | **Predictions without the sign-in wall**: let anyone pick an answer; stake only on sign-in. FAQ schema + numeric titles on the top-impression compare pages. | `predictions/page.tsx` sends every option to the game; compare CTR <1.3%. | Both agree. |
| 14 | **Universal 24-hour debriefs**: raise the cron cap so every flown launch gets its record within a day. | Generator + gate shipped 8/24; 6 published. | Opus, S effort. |
| 15 | **Spend the Epoch 2 window**: post Space Tycoon to r/incremental_games and the browser-game community while "every deposit is unclaimed" is true (~3 weeks). *Founder action — outbound is gated on you.* | Only channel that can deliver thousands in a week; hard expiry. | Opus. Needs #6 and #3 first so the landing isn't undercut. |
| 16 | **Per-page "returned within 30 days" report in `/admin/analytics`** so the week-3 reallocation is measured, not argued. | GA4 wiring exists. | Opus. |

## Tier 3 — October (M/L, authority)

- **Slip Index page + per-provider on-time scorecard** (publish once #7 has ~6 weeks of data). Proprietary forever.
- **Hero illustration batch** — **DONE 2026-08-29** (6 heroes on 7 page types via `HeroArt`, batch `c1-guide-heroes`). Was: for the top 10 guide/compare pages via the existing Gemini pipeline — the highest-traffic page on the site is white text on gray. Alt text + contrast in acceptance criteria. (Sonnet design lane's one strong finding.)
- **Chart of the Week** — **DONE 2026-08-29**: `src/lib/charts/` (registry, SVG renderer, Prisma loaders), `/api/chart/[slug]` PNG, `/chart` + `/chart/[slug]` permalinks, fixed digest slot rotating by ISO week (first send Mon 2026-08-31). Was: a fixed slot in the M/Th Digest with `/chart/[slug]` permalinks — not a third newsletter. Opus's Orbital-Index-seat idea is real; the advocate's correction (a slot, not a send) is right.
- **Space Hiring Index** (monthly, methodology attached) when `CompanyJobSnapshot` has ~12 weeks. Fix the movers window and `isPublic` now (Tier 1) so the numbers are right on day one.
- **Terminal-chrome bridge** on Company Profiles / Space Stocks / Mission Control (Sonnet design) — polish, L, after content.
- New guides in this order: Blue Origin vs SpaceX long-form (the 1.2k-impression query; guide format outperforms compare here) — **guide shipped 2026-08-29; CTR pass DONE 2026-09-04** (8e97fe0d: the guide owns the head term as "Who Is Winning in 2026?", the compare page is retitled to the table intent at sitemap 0.6 with a callout into the guide, the snippet leads with the tracker's New Glenn next-flight line via generateMetadata — live today as "return to flight … on the manifest for Sep 30, 2026" — dateModified is a hand-bumped constant instead of now(), and Falcon 9 / Falcon Heavy / Starship / New Glenn pages link in. Measure: the query's CTR and which URL Google shows, ~2 weeks after 9/4), Wallops + Kourou viewing guides, NSSL Phase 3, Kuiper/Leo vs Starlink (consolidating two blog posts), space debris & STM on the corrected SATCAT numbers.

## Consolidation — hygiene, scheduled after growth (Sonnet's merge map, my edits)

| Merge | Verdict |
|---|---|
| `/briefs` → `/intelligence-brief`; `/investor-hub` → `/investors`; `/this-day-in-space` → `/history#today` | **DONE 2026-08-29** — mothballed (307) via `src/lib/mothballed-routes.ts` group `consolidation`; /history gained a "Today in space history" strip (`src/app/history/TodayInSpace.tsx`). investor-hub had 0 memos / 0 theses in prod. |
| `/space-score` → `/report-cards?view=score` | **DONE 2026-08-29** — page moved to `src/app/report-cards/SpaceScorePanel.tsx` behind a `GradeViewSwitch`; old URL mothballed, `?tab=` deep links carried over by middleware. |
| Compliance reference (4 pages) → `/compliance` tabs | **Do in October** (L). Keep `/regulatory-radar` separate; dedupe the compliance Radar tab into a teaser now (S). |
| Engineering reference (5 pages, ~6,600 lines) → `/engineering-reference` | **Do in November** — corpus hygiene, no traffic. |
| Launch-economics hub (5 pages) | **Defer.** Sonnet's skeptic found 20+ PAGE_RELATIONS references and a nav entry; effort is understated and the calculator pages are in the "hot" tools cluster. Revisit after the cost-to-launch family lands and we can see which calculators it feeds. |
| Delete ~35 phantom `MODULES` keys pointing at non-existent routes | **Re-checked 2026-08-29: the claim was wrong.** 128 keys, 0 missing — 6 pointed at redirected legacy paths and were repointed at the live destination. Nothing to delete. |
| Freeze new pages in Engineering & Operations | **Adopted as policy.** |

## Rejected, with reasons (so they are not re-proposed)

- **Anything that needs a crowd**: live viewer counts, launch-day chat, ground reports/photos, collections and badges, a public game economy dashboard. At 450 MAU they render emptiness. Revisit at ~5k.
- **New aggregators** (`/today`, a Sunday technical newsletter, a quarterly "State of Launch" page): the site's illness is 124 surfaces; the cure is not #125. The Orbital Index audience is real — serve it with a slot inside the digest.
- **300 auto-generated ISS-pass city pages**: doorway farm; risks the family that already ranks.
- **CTR pass on cost-to-launch**: already done 8/28 (answer-first titles, FAQ+Article schema) — Opus advocate caught its own lens.
- **Professional depth** (tearsheets, contract competition fields, exec talent flow, regulatory deadline feed): sound, but every metric is BD sessions, not MAU, and monetization is on hold. Q4.
- **"Will I see this launch from my yard" ascent visibility**: novel, but wrong bearings destroy trust and it's an honest L. Later, after the simpler "Tonight over your town" (coarse-IP default, email-only alerts) ships.

## What the research got wrong (for next time)

- The Sonnet design lane screenshotted with a fresh browser every time, so first-visit modals looked like permanent bugs; three findings were rejected for it. Grep mount/persistence logic before scoring.
- Two lanes proposed reviving surfaces that shipped 8/28 (referral card, rocket cross-links). Check `site-directory.ts` and the memory file first.
- Nobody pulled per-URL Search Console data for the consolidation candidates. I'll do that before any merge that touches a ranking URL.

## 2026-08-30 — Status

The Mission Control redesign (docs/research-2026-08-30/SYNTHESIS.md) shipped end to end on 2026-08-30: all ten do-now items, the September list (11–28) and the October list (29–42). Open follow-ups are telemetry, not build: two weeks of Search Console on the cost-guide answer block before the rest of the family; the USSF leg of the prime-contract backfill (verify `fetched > 0` on the first scheduled run); 37 thin company profiles without an analyst sentence; the 13 tickers with no EDGAR CIK match.
