# SpaceNexus v1.2.0 — Implementation Documentation

**Release Date:** February 21, 2026
**Branch:** `dev` (commit `e436a9e`)
**Scope:** Revenue activation, data pipeline, sponsored profiles, community platform, and critical workflow fixes

---

## 1. Tier Gating for Premium Pages

### Overview
7 premium pages are now gated behind `PremiumGate`, showing a blurred preview with contextual upgrade CTA for users who don't meet the tier requirement.

### Gated Pages

| Page | File | Required Tier | Context Key |
|------|------|---------------|-------------|
| Investment Thesis | `src/app/investment-thesis/page.tsx` | Enterprise | `investment-thesis` |
| Deal Rooms | `src/app/deal-rooms/page.tsx` | Enterprise | `deal-rooms` |
| Funding Tracker | `src/app/funding-tracker/page.tsx` | Pro | `funding-tracker` |
| Customer Discovery | `src/app/customer-discovery/page.tsx` | Enterprise | `customer-discovery` |
| API Documentation | `src/app/developer/docs/page.tsx` | Enterprise | `api-access` |
| API Explorer | `src/app/developer/explorer/page.tsx` | Enterprise | `api-access` |
| Alerts | `src/app/alerts/page.tsx` | Pro | `alerts` |

### Pages Left Open (by design)
- **Market Sizing** — Free (SEO content)
- **Salary Benchmarks** — Free (SEO page)
- **Space Score** — Free with teaser

### Files Modified
- `src/components/PremiumGate.tsx` — 4 new `UpgradeContext` types with contextual messages
- `src/lib/subscription.ts` — 4 new entries in `PREMIUM_MODULES`
- 7 page files wrapped with `<PremiumGate>`

### Pattern Used
Pages with hooks/multiple returns use an inner/wrapper pattern:
```tsx
function PageInner() { /* existing content */ }
export default function Page() {
  return (
    <PremiumGate requiredTier="enterprise" context="investment-thesis" showPreview={true}>
      <PageInner />
    </PremiumGate>
  );
}
```

---

## 2. Data Pipeline Seeding

### Overview
New `/api/admin/seed-all` endpoint calls all 19 init endpoints to populate DynamicContent tables in a single request.

### File
`src/app/api/admin/seed-all/route.ts`

### Execution
```bash
curl -X POST https://spacenexus.us/api/admin/seed-all \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Phases
1. **Phase 1 (sequential):** Master `/api/init` — seeds news, events, blogs, companies, resources, opportunities, compliance
2. **Phase 2 (parallel batch A):** blueprints, orbital-services, space-mining, orbital-slots, spectrum, companies, opportunities
3. **Phase 3 (parallel batch B):** workforce, space-insurance, solar-exploration, solar-flares, debris-monitor, resources
4. **Phase 4 (parallel batch C):** government-contracts, launch-windows, operational-awareness, regulatory-agencies, compliance

### Features
- `maxDuration = 300` (5 minutes)
- Requires `CRON_SECRET` authorization
- Per-endpoint error isolation (one failure doesn't stop others)
- Returns summary with success/failure counts

---

## 3. Sponsored Company Profiles

### Overview
Companies can pay for enhanced profiles with verified badges, priority placement, analytics, and lead capture.

### Sponsorship Tiers

| Tier | Price | Features |
|------|-------|----------|
| Basic | Free | Standard profile listing |
| Verified | $200/mo ($2,000/yr) | Verified badge, priority search, enhanced profile |
| Premium | $500/mo ($5,000/yr) | Custom banner, featured products, lead capture form, analytics |

### Schema Changes (`prisma/schema.prisma`)
Added to `CompanyProfile` model:
```prisma
sponsorTier         String?     // 'verified' | 'premium'
sponsorSince        DateTime?
sponsorExpires      DateTime?
sponsorStatus       String?     @default("active")
sponsorStripeSubId  String?
sponsorBanner       String?
sponsorTagline      String?     @db.Text
sponsorAnalytics    Json?
```

### New Files

| File | Purpose |
|------|---------|
| `src/app/company-profiles/sponsor/page.tsx` | 3-tier pricing page with monthly/yearly toggle |
| `src/app/api/company-profiles/sponsor/checkout/route.ts` | Stripe checkout session for sponsorship |
| `src/app/api/company-profiles/[slug]/leads/route.ts` | POST submit lead, GET list leads |
| `src/app/api/company-profiles/[slug]/analytics/route.ts` | GET analytics, POST track event |
| `src/components/company/SponsorBadge.tsx` | Verified (blue) / Premium (amber) badge |
| `src/components/company/SponsorBanner.tsx` | Premium sponsor banner at top of profile |
| `src/components/company/LeadCaptureForm.tsx` | Contact form on premium profiles |

### Modified Files
- `src/lib/stripe.ts` — 4 new sponsor price IDs + `priceIdToSponsorTier()` function
- `src/lib/validations.ts` — `sponsorCheckoutSchema`, `leadCaptureSchema`
- `src/app/api/stripe/webhooks/route.ts` — Handles sponsorship checkout/update/delete events
- `src/app/company-profiles/page.tsx` — SponsorBadge on cards, ring highlight for sponsors
- `src/app/company-profiles/[slug]/page.tsx` — SponsorBanner, SponsorBadge, Contact tab with LeadCaptureForm, view analytics tracking

### Stripe Setup Required
Create 2 products in Stripe Dashboard:
1. "SpaceNexus Verified Sponsor" — $200/mo, $2,000/yr
2. "SpaceNexus Premium Sponsor" — $500/mo, $5,000/yr

Set 4 env vars:
```
STRIPE_PRICE_SPONSOR_VERIFIED_MONTHLY=price_...
STRIPE_PRICE_SPONSOR_VERIFIED_YEARLY=price_...
STRIPE_PRICE_SPONSOR_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_SPONSOR_PREMIUM_YEARLY=price_...
```

---

## 4. Professional Messaging & Community

### Overview
Full community platform with professional directory, direct messaging, and industry forums — the "Bloomberg Terminal moat" for the ~15,000-person space industry.

### Prisma Models (9 new)

| Model | Purpose |
|-------|---------|
| `ProfessionalProfile` | Professional directory entries (headline, bio, expertise, location) |
| `UserFollow` | User-to-user follow relationships |
| `CompanyFollow` | User-to-company follow relationships |
| `Conversation` | DM conversation container |
| `ConversationParticipant` | Users in a conversation with read receipts |
| `DirectMessage` | Individual messages |
| `ForumCategory` | Forum categories (Propulsion, Regulation, Funding, etc.) |
| `ForumThread` | Forum threads with pinning, locking, view counts |
| `ForumPost` | Replies within threads |

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/community/profiles` | GET, POST | Search/create professional profiles |
| `/api/community/follow` | GET, POST, DELETE | Follow stats, follow/unfollow users/companies |
| `/api/messages` | GET, POST | List conversations, send messages |
| `/api/messages/[conversationId]` | GET, POST | Get messages, mark as read |
| `/api/community/forums` | GET | List forum categories |
| `/api/community/forums/[slug]` | GET, POST | List/create threads |
| `/api/community/forums/[slug]/[threadId]` | GET, POST | Get thread + posts, reply |

### UI Pages

| Page | File | Description |
|------|------|-------------|
| Community Hub | `src/app/community/page.tsx` | Landing page with directory, messages, forums links |
| Professional Directory | `src/app/community/directory/page.tsx` | Search/filter profiles, ProfileCard grid |
| Edit Profile | `src/app/community/profile/page.tsx` | Form to edit own professional profile |
| Messages | `src/app/messages/page.tsx` | Split-pane inbox with ConversationList + MessageThread |
| Forum Categories | `src/app/community/forums/page.tsx` | Category grid with thread counts |
| Thread List | `src/app/community/forums/[slug]/page.tsx` | Threads in category, new thread form |
| Thread Detail | `src/app/community/forums/[slug]/[threadId]/page.tsx` | Thread content, replies, reply form |

### Components

| Component | File | Description |
|-----------|------|-------------|
| ProfileCard | `src/components/community/ProfileCard.tsx` | Profile card with follow/message buttons |
| ConversationList | `src/components/community/ConversationList.tsx` | Conversation sidebar with unread indicators |
| MessageThread | `src/components/community/MessageThread.tsx` | Message bubbles with auto-scroll |
| ThreadCard | `src/components/community/ThreadCard.tsx` | Forum thread preview card |

### Tier Gating (planned)
- **Free:** Browse directory, view profiles, read forums
- **Pro:** Full directory, DMs (50/day), create threads, unlimited follows
- **Enterprise:** Unlimited DMs, priority placement, profile view analytics

---

## 5. Critical Fixes (Newsletter, Approval, Fact Checker)

### Newsletter Frequency & Content

**Problem:** Newsletter sent daily with only external news; no SpaceNexus content.

**Fix:**
- Removed newsletter sending from daily refresh (`src/app/api/refresh/route.ts`)
- Added `newsletter-digest` cron job: Mon/Thu at 8am UTC (`src/lib/cron-scheduler.ts`)
- New dedicated endpoint: `src/app/api/newsletter/send-digest/route.ts`
  - Finds period since last sent newsletter
  - Fetches published AI Insights (highest priority)
  - Fetches SpaceNexus blog posts (second priority)
  - Fetches top 10 external news articles
  - Generates AI analysis features from combined content

### AI Insights Approval Workflow

**Problem:** Articles passing fact-check were auto-published without admin review. Approve/deny buttons didn't work (Next.js params issue).

**Fixes:**
- ALL articles now require admin approval (`src/app/api/ai-insights/generate/route.ts`)
  - `publishStatus` is always `'pending_review'`
  - `reviewToken` always generated
  - Review email sent for every generated article
- Fixed `await params` on all `[slug]` routes:
  - `src/app/api/ai-insights/[slug]/approve/route.ts`
  - `src/app/api/ai-insights/[slug]/reject/route.ts`
  - `src/app/api/ai-insights/[slug]/route.ts`
  - `src/app/api/ai-insights/[slug]/preview/route.ts`
- Bulk-publish (`src/app/api/ai-insights/bulk-publish/route.ts`) now requires admin session only — CRON_SECRET bypass removed

**Required env var:** `ADMIN_EMAIL=owner@spacenexus.us`

### AI Fact Checker Date Awareness

**Problem:** Fact checker flagged February 2026 as "in the future" and incorrectly claimed major issues on accurate articles.

**Fix in `src/app/api/ai-insights/generate/route.ts`:**
- Added current date to fact-checker prompt: `"Today's date is [current date]"`
- Added explicit instruction: references to current year are NOT future predictions
- Added guidance to err on the side of "pass" when in doubt
- Emphasized original articles were written using verified real-time data sources

---

## Environment Variables Required

| Variable | Value | Purpose |
|----------|-------|---------|
| `ADMIN_EMAIL` | `owner@spacenexus.us` | AI insights approval emails |
| `STRIPE_PRICE_SPONSOR_VERIFIED_MONTHLY` | Stripe price ID | Verified sponsor monthly |
| `STRIPE_PRICE_SPONSOR_VERIFIED_YEARLY` | Stripe price ID | Verified sponsor yearly |
| `STRIPE_PRICE_SPONSOR_PREMIUM_MONTHLY` | Stripe price ID | Premium sponsor monthly |
| `STRIPE_PRICE_SPONSOR_PREMIUM_YEARLY` | Stripe price ID | Premium sponsor yearly |

---

## File Count Summary

- **New files:** 27
- **Modified files:** 23
- **Total lines added:** ~5,200
- **New Prisma models:** 9
- **New API routes:** 10
- **New UI pages:** 8
- **New components:** 7
