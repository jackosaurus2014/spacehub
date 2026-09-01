# SpaceNexus Security Audit Delta — September 2026

**Date:** 2026-09-01
**Scope:** Everything the August audit (`docs/SECURITY_AUDIT_2026-08.md`) did not enumerate, plus verification of its deferred items. Same surface: `src/app/api/**`, `src/middleware.ts`, `src/lib/auth.ts`, token flows, game economy routes.
**Method:** One read-only sweep agent against the August findings list, every Critical/High claim re-verified by hand in the source before work started, then five parallel implementation agents with disjoint file ownership and regression tests, followed by full `tsc`, full Jest, and a production build.

All items below are **fixed in this pass** unless marked otherwise.

---

## Fixed — Critical

### C1 — Unauthenticated click fraud drained advertiser prepaid budgets
`POST /api/ads/impression` accepted any `{campaignId, placementId, type:'click'}` anonymously and `recordImpression` added `cpcRate` to `AdCampaign.spent` with no dedup and no binding to a served ad. Campaign ids ship in the served ad markup, so anyone could burn every campaign to zero in minutes.

**Fix.** `src/lib/ads/impression-token.ts`: the serve route mints an HMAC-SHA256 token `{campaignId, placementId, exp (6h), nonce, ip}` per served ad; the impression route verifies it (timing-safe), refuses reuse of the nonce, and `recordImpression` charges at most one click per `(campaign, placement, ip)` per 24 h and one impression per 10 min. Duplicate events are still written for analytics with `revenue: 0`. The route now reads the **rightmost** `x-forwarded-for` entry (was leftmost, spoofable). Middleware bucket: 30/min. Key: `AD_TOKEN_SECRET`, falling back to `CRON_SECRET`.

### C2 — Stored SSRF via podcast submissions
`POST /api/podcasts` had no auth; `feedUrl` was regex-checked only; the hourly `podcasts-sync` cron then fetched it from inside the container (rss-parser follows redirects) and published the response at a public URL. `http://169.254.169.254/…` and loopback targets were reachable.

**Fix.** `POST /api/podcasts` requires an admin session or the cron secret. New `src/lib/security/safe-url.ts` (+ `safe-url-core.ts` for client-safe schema use): rejects non-http(s), credentials, non-default ports, `localhost`/`.local`/`.internal`, private/link-local/loopback/multicast IPv4 and IPv6 (incl. v4-mapped), and resolves DNS, refusing if **any** answer is private (rebinding). `safeFetchText` follows redirects manually, re-validating each hop, with a body-size cap and a single deadline. `podcast-sync.ts` uses it and parses the fetched text. Zod schema rejects private literals at submit time.

## Fixed — High

### H1 — Seven ingestion routes had no authentication
`news/fetch`, `blogs/fetch`, `events/fetch`, `solar-flares/fetch`, `launch-windows/fetch`, `debris-monitor/fetch` (`POST()` with no request argument) and `compliance/fetch` (took the request, never checked). Same class as August G1, in directories that audit never enumerated. Any forged same-origin POST triggered third-party API pulls and DB write storms.

**Fix.** All seven gate on `requireCronSecret` as their first statement. `news/fetch` and `blogs/fetch` accept an admin session too (`src/lib/api-auth.ts` → `requireCronSecretOrAdmin`) because the industry-voices page has a refresh button; that button now renders for admins only. `src/components/DataInitializer.tsx` no longer fires `/api/news/fetch` for every visitor (news is already refreshed every 5 min by the scheduler through `/api/refresh`). The four paths were added to middleware `cronPaths`.

### H2 — No brute-force protection on sign-in
`/api/auth/callback/credentials` fell into the generic 200/min bucket; `authorize()` had no lockout.

**Fix.** Middleware bucket 10 per 15 min per IP on the credentials callback, plus `src/lib/login-throttle.ts`: per-account lockout after 8 failures in 15 min (15-min lock, unknown emails counted too so cost is uniform). In-memory, per instance — same trade-off as the middleware limiter.

### H3 — Stored XSS through launch-alert scope
The rocket/site strings from `POST /api/launch-watch` were interpolated raw into the verify page's HTML (served on the app origin, where CSP permits inline scripts) and the email subject.

**Fix.** Both verify pages (`launch-watch/verify`, `company-brief/verify`) escape every interpolation. The schema restricts rocket/site to letters, digits, spaces and basic punctuation and pins `eventId` to `[A-Za-z0-9_-]`.

### H4 — Nine fail-open game crons and a spoofable localhost escape (August P2/P3)
`market/restock`, `market/mean-revert`, `demand-pools/update`, `labor/update`, `zones/update`, `bidding/resolve`, `orbital-slots/resolve` used `if (secret && mismatch)` (skips the check when the env var is unset); `leagues/process-week` and `market/share/rollup` read the secret from the JSON body. `requireCronSecret` trusted `Host: localhost` whenever no secret was configured.

**Fix.** All nine use `requireCronSecret` (Bearer, timing-safe, fail-closed); `market/init` too. The localhost allowance now only exists outside production. **Side effect worth knowing:** the scheduler always sent a Bearer header and an empty body, so `leagues/process-week` had been returning 401 to its own cron in production; it works now.

## Fixed — Medium

- **M2 Registration granted `emailVerified: true` without proof**, which made the public `domain` badge claimable by registering `ceo@<company>` and claiming the company. Now `false` until the emailed link is clicked; login is not blocked; badge recompute moved to `verify-email` only.
- **M3 Registration timing oracle.** bcrypt now runs before the existence check so new and existing emails cost the same.
- **M4 Email bomb via double-opt-in resends.** Per-address 10-minute confirmation cooldown shared by launch-watch and company-brief (reported as success, no send), plus an 8/hour IP bucket on both POSTs.
- **M5 `market/init` unauthenticated** — gated.
- **M6 Order book accepted unbounded price/quantity.** Quantity ≤ 100 000; price within 0.1×–10× of the resource's current price.
- **M7 `/api/og` unbounded parameters.** Title ≤ 120, subtitle ≤ 200, control characters stripped, `type` validated against the palette.
- **August P4** `seasons/progress` trusted `body.progress` and `speed-runs/check` trusted `body.gameState`. Progress is now derived server-side per metric (`src/lib/game/season-metrics-server.ts`; delta metrics baseline on first touch so veterans don't auto-complete). Metrics that cannot be derived are clamped non-decreasing and ≤ a server ceiling — listed in that file. Speed-run state is built from the profile.
- **August P5** Expired Pro trials could be restarted forever → one trial per account.
- **August P6** Any alliance member could spend the treasury → leader/officer only.
- **August P7** Deal-room `accessCode` shipped to viewers; documents bypassed the NDA gate → explicit select, code only for owner/admin, NDA gate applied on the detail and list GETs.
- **August P8** Public channel and study-group rosters leaked member emails → `PUBLIC_USER_SELECT` (`src/lib/public-user-select.ts`); private study groups require membership.
- **August P9** Unauthenticated write-on-GET (`company-profiles/recalculate`) gated by cron secret; sponsor analytics deduped per IP/hour; session-question upvotes deduped per user (in-memory — a `SessionQuestionVote` table is the durable fix if AMAs are ever relisted).
- **August P10** Company-name spoofing in chat/colonies/milestones/competitive-contracts → the session profile's name is written; milestone `reward` derived from the definition. `sync` remains the single legitimate rename path, now sanitised.
- **Colony claims were free** (the live half of the $50B `cc_pluto_expedition` payout): now a burned one-time fee per location ($100M LEO … $5B Pluto, table in `src/lib/game/colonies.ts`) with a presence prerequisite, debited atomically through the server ledger.

## Fixed — Low

- **L1** `sn_ref` referral cookie now `httpOnly` + `secure`.
- **L2** Password reset/change did not revoke sessions. New `User.passwordChangedAt` (column added in prod 2026-09-01); the JWT callback re-checks it every 5 minutes and refuses to hydrate a session whose token predates it.
- **L5** Zod schemas for `poach`, `espionage/execute`, `espionage/upgrade`, `alliance-treasury`, `colonies`, `seasons/progress`.
- Rate limits added: Stripe/ads checkout and `/api/subscription` 10/min; `POST /api/compliance/questions` 5/hour.

## Not changed, by decision

- **L3** One launch-watch unsubscribe token can unsubscribe every watch on that address. This is the RFC 8058 "unsubscribe from all" behaviour and the token proves receipt at that mailbox; left as designed.
- **L4** CSP still ships `script-src 'unsafe-inline'`. Nonce migration is scheduled as its own change; H3 is closed by escaping regardless.
- `compliance-fetcher.ts` still uses `parseURL` on a DB column that only admin seeding writes. Switch to `safeFetchText` if legal sources become user-editable.

## Still open — structural

- **August P1 — game inventory remains client-authoritative** for resources, buildings, ships and research (`sync/route.ts` `applyResourceDeltas(clientResources…)`); money is clamped and reconciled. The contract/order-book payout class survives until the server-authoritative migration lands. Tracked as the top game-engineering item.
- **Next.js 14 is out of support.** `npm audit` lists nine advisories (request smuggling in rewrites, RSC cache poisoning, several DoS) with no fix inside 14.x. Upgrade planned as its own project.
- `sanitize-html`, `nodemailer` (via resend), `postcss` bumps ride with that upgrade.

## Regression tests added

`cron-auth-regressions` (129), `ad-impression-security` (22), `safe-url` + `podcasts-ssrf-regressions`, `game-authz-regressions` (18), `data-exposure-regressions` (10), `login-throttle` (4). Existing suites updated where behaviour intentionally changed (compliance fetch now needs the Bearer; change-password writes `passwordChangedAt`; deal-room GET checks membership first).
