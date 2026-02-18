# Dynamic Content for Space Insurance & Resource Exchange

## Overview

This document covers the implementation of four dynamic content features added to the Space Insurance and Resource Exchange modules, transforming them from static seed-data pages into live, continuously-updated intelligence modules.

**Date**: February 18, 2026
**Modules affected**: Space Insurance, Resource Exchange
**New files**: 5 created
**Modified files**: 6 updated

---

## Features Implemented

### 1. Related News Articles (Both Modules)

**What**: Automated compilation of news articles and blog posts from the SpaceNexus database that match module-specific keywords.

**How it works**:
- Queries `NewsArticle` and `BlogPost` tables using keyword matching (case-insensitive `contains`)
- Insurance keywords: "space insurance", "satellite insurance", "launch failure", insurer names (Swiss Re, Munich Re, AXA XL, etc.)
- Resource keywords: "space mining", "asteroid mining", "launch cost", "ISRU", material names (titanium, xenon, carbon fiber)
- Results stored in `DynamicContent` table with 14-day news window and 30-day blog window
- Displayed as card grids on each page

**Files**:
- `src/lib/fetchers/insurance-resource-news-fetcher.ts` — Fetcher logic
- `src/app/space-insurance/page.tsx` — UI (DynamicInsuranceContent component)
- `src/app/resource-exchange/page.tsx` — UI (DynamicResourceContent component)

**Cron**: Daily at 7:30 AM UTC (`/api/refresh?type=module-news`)

---

### 2. AI-Generated Market Commentary (Both Modules)

**What**: Weekly AI-generated market analysis using Claude Sonnet, providing professional commentary on trends, risks, and developments.

**How it works**:
- Gathers module-specific data from Prisma (market history, active policies, resource prices, launch providers)
- Combines with recent news headlines and blog excerpts
- Sends structured prompt to Claude Sonnet API with module-specific instructions
- Parses JSON response: title, summary, full markdown content, key takeaways
- Stored in `DynamicContent` with `sourceType: 'ai-research'`
- Displayed with expandable full-text view and key takeaways callout box

**Insurance commentary covers**: Market conditions, claims trends, underwriting adjustments, regulatory outlook, emerging risks

**Resource commentary covers**: Launch cost trends, critical material pricing, propellant markets, ISRU developments, supply chain risks

**Files**:
- `src/lib/fetchers/module-market-commentary.ts` — AI generation logic
- Both page components — UI rendering

**Cron**: Weekly on Tuesdays at 6:00 AM UTC (`/api/refresh?type=market-commentary`)

**Requires**: `ANTHROPIC_API_KEY` environment variable (gracefully skips if not set)

---

### 3. Insurance Industry RSS Feeds

**What**: Four new RSS feed sources added to the blog aggregation system, bringing insurance industry reporting into the SpaceNexus content pipeline.

**Sources added**:
| Source | RSS Feed | Content Type |
|--------|----------|-------------|
| Insurance Journal | `insurancejournal.com/feed/` | P&C insurance news including space/satellite |
| Artemis.bm | `artemis.bm/feed/` | Cat bonds, ILS, reinsurance capital markets |
| AXA XL Fast Forward | `axaxl.com/fast-fast-forward/articles/feed/` | Space insurance risk management |
| Global Reinsurance | `globalreinsurance.com/feed/` | Reinsurance industry, aerospace markets |

**Files**:
- `src/lib/blogs-fetcher.ts` — 4 new entries in `BLOG_SOURCES` array

**Cron**: Existing blog fetch cycle (every 4 hours via `blogs-fetch`)

---

### 4. Commodity Pricing Data (Resource Exchange)

**What**: Live metal and commodity pricing from the Metals.dev API, automatically updating SpaceResource earth prices.

**How it works**:
- Fetches current metal prices from Metals.dev API (free tier: 100 req/month)
- Maps commodity symbols to SpaceResource slugs via `RESOURCE_COMMODITY_MAP`
- Applies aerospace markup multipliers (e.g., aluminum × 3.5 for aerospace-grade)
- Converts units: troy oz → per-kg (precious metals), tonne → per-kg (base metals)
- Only updates prices that changed by > 0.1% (avoids noise)
- Stores price update history in DynamicContent for UI display
- Circuit breaker protection for API failures

**Commodity mappings**:
| Resource | Commodity | Markup | Unit |
|----------|-----------|--------|------|
| Aluminum 6061-T6 | aluminum | 3.5x | $/tonne |
| Inconel 718 | nickel | 8.0x | $/tonne |
| Oxygen-Free Copper | copper | 2.0x | $/tonne |
| Platinum | platinum | 1.0x | $/troy oz |
| Gold | gold | 1.0x | $/troy oz |

**Files**:
- `src/lib/fetchers/commodity-pricing-fetcher.ts` — Fetcher logic with circuit breaker
- `src/app/api/resources/dynamic/route.ts` — API endpoint for UI

**Cron**: Daily at 8:30 AM UTC (`/api/refresh?type=commodity-prices`)

**Requires**: `METALS_DEV_API_KEY` environment variable (gracefully falls back to static prices if not set)

---

## New API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/space-insurance/dynamic` | GET | None | Serves related news, blogs, and commentary for insurance page |
| `/api/resources/dynamic` | GET | None | Serves price updates, news, and commentary for resource page |
| `/api/refresh?type=module-news` | POST | CRON_SECRET | Triggers module news compilation |
| `/api/refresh?type=commodity-prices` | POST | CRON_SECRET | Triggers commodity price update |
| `/api/refresh?type=market-commentary` | POST | CRON_SECRET | Triggers AI commentary generation |

---

## New Cron Jobs (3 added)

| Job | Schedule | Description |
|-----|----------|-------------|
| `module-news-compilation` | Daily 7:30 AM UTC | Compiles insurance + resource news from DB |
| `commodity-price-update` | Daily 8:30 AM UTC | Fetches live metal prices from Metals.dev |
| `market-commentary-generation` | Weekly Tues 6:00 AM UTC | AI generates market commentary for both modules |

Total cron jobs: 24 → 27

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `METALS_DEV_API_KEY` | Optional | Metals.dev API for live commodity prices |
| `ANTHROPIC_API_KEY` | Optional | Claude API for AI market commentary |
| `CRON_SECRET` | Required | Authentication for all cron job endpoints |

Both new features gracefully degrade when API keys are not configured — the modules continue to work with static data, and the dynamic sections simply don't appear.

---

## Architecture Decisions

1. **DynamicContent over new Prisma models**: Used the existing `DynamicContent` table for all new data rather than creating new models. This keeps the schema stable and follows the established pattern from Space Defense.

2. **Separate `/dynamic` API routes**: Created lightweight GET endpoints specifically for the UI components, rather than adding to the existing module GET endpoints. This keeps the main data flow unchanged.

3. **Aerospace markup multipliers**: Commodity APIs return raw material prices (LME aluminum, etc.), but aerospace-grade materials cost significantly more. Applied researched markup multipliers to bridge the gap.

4. **Weekly AI commentary, not daily**: Commentary is most useful as a weekly digest. Daily generation would be expensive (API tokens) and repetitive. The 7-day window gives enough news accumulation for meaningful analysis.

5. **Insurance RSS feeds in existing blog pipeline**: Added to `BLOG_SOURCES` in `blogs-fetcher.ts` rather than creating a separate fetcher. This means insurance articles flow through the same deduplication, sanitization, and topic categorization as all other blog sources.

---

## Files Summary

### Created
| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/fetchers/insurance-resource-news-fetcher.ts` | ~170 | News/blog keyword matching for both modules |
| `src/lib/fetchers/commodity-pricing-fetcher.ts` | ~200 | Metals.dev API integration + price updates |
| `src/lib/fetchers/module-market-commentary.ts` | ~215 | AI market commentary generator |
| `src/app/api/space-insurance/dynamic/route.ts` | ~30 | Dynamic content API for insurance |
| `src/app/api/resources/dynamic/route.ts` | ~45 | Dynamic content API for resources |

### Modified
| File | Changes |
|------|---------|
| `src/lib/blogs-fetcher.ts` | Added 4 insurance industry RSS sources |
| `src/lib/cron-scheduler.ts` | Added 3 new cron jobs + logger entries |
| `src/app/api/refresh/route.ts` | Added 3 new refresh type handlers |
| `src/app/space-insurance/page.tsx` | Added DynamicInsuranceContent component (~140 lines) |
| `src/app/resource-exchange/page.tsx` | Added DynamicResourceContent component (~160 lines) |
