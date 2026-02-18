# Ad Integration Guide for SpaceNexus

## Overview

SpaceNexus uses a hybrid ad system with two revenue channels:
1. **Custom ad campaigns** — direct-sold campaigns from space industry advertisers (stored in DB)
2. **Google AdSense fallback** — automatic ad fill when no custom campaign is available

The system respects subscription tiers — Pro and Enterprise subscribers never see ads.
Ads are designed to be non-intrusive: max 2 per page, no interstitials, no top banners.

## Hybrid Waterfall

When an `<AdSlot />` is rendered, the system follows this priority:

1. Check if user is ad-free (Pro/Enterprise) → render nothing
2. Fetch custom ad from `/api/ads/serve` → render if found
3. If no custom ad AND Google AdSense is configured → render AdSense unit
4. If neither → render nothing (no empty containers, no layout shift)

## AdSlot Component

The `<AdSlot />` component is the universal entry point for placing ads on pages.

```tsx
import AdSlot from '@/components/ads/AdSlot';

// Basic usage (custom ads only)
<AdSlot position="in_feed" module="news-feed" />

// With AdSense fallback
<AdSlot position="in_feed" module="news-feed" adsenseSlot="1234567890" />
```

### Props

| Prop          | Type     | Required | Description                                           |
|---------------|----------|----------|-------------------------------------------------------|
| position      | string   | Yes      | Ad position (see positions below)                     |
| module        | string   | No       | Module ID for targeting (e.g., "news-feed", "satellites") |
| className     | string   | No       | Additional CSS classes                                |
| adsenseSlot   | string   | No       | Google AdSense ad unit slot ID for fallback            |
| adsenseFormat | string   | No       | AdSense format: 'horizontal', 'rectangle', 'responsive' (default) |

### Available Positions

| Position       | Typical Placement              | Used On |
|----------------|-------------------------------|---------|
| in_feed        | Between content items         | All 8 pages |
| footer         | Below main content            | All 8 pages |
| sidebar        | Right sidebar (desktop)       | Not currently used |
| top_banner     | Above main content            | Not used (UX decision) |
| interstitial   | Modal overlay                 | Not used (Play Store policy) |

## Current Ad Placements (8 Pages)

| Page | In-Feed Ad | Footer Ad | Module ID |
|------|-----------|-----------|-----------|
| `/news` | After every 6th article (col-span-full) | Before "Load More" button | `news-feed` |
| `/blogs` | After every 4th blog post (col-span-full) | Before info card | `blogs-articles` |
| `/market-intel` | Between ETF section and company tables | Before info note | `market-intel` |
| `/mission-control` | Between timeline and dynamic content | Before related intelligence | `mission-control` |
| `/company-profiles` | After every 9th company card (col-span-full) | After company grid | `company-profiles` |
| `/marketplace` | Between featured listings and RFQs | Before CTA section | `marketplace` |
| `/space-talent` | After every 6th talent card | Below content | `space-talent` |
| `/satellites` | Between orbit distribution and notable satellites | Before data sources | `satellite-tracker` |

### Pages with NO ads

Auth pages, admin, pricing, terms/privacy/cookies, contact, search, developer portal, dashboard, advertise page.

## Google AdSense Setup

### Environment Variable

Set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` to enable AdSense:

```env
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1234567890123456
```

When this variable is set:
- The AdSense script automatically loads in `layout.tsx`
- `AdBanner` components render real AdSense `<ins>` elements
- `AdSlot` falls back to AdSense when no custom campaign ad is available

When this variable is NOT set:
- No AdSense script loads
- `AdBanner` returns null
- Only custom DB campaigns are served (or nothing)

### CSP Configuration

The Content Security Policy in `next.config.js` already whitelists these AdSense domains:
- `script-src`: `pagead2.googlesyndication.com`, `adservice.google.com`, `googletagservices.com`, `tpc.googlesyndication.com`
- `frame-src`: `googleads.g.doubleclick.net`, `tpc.googlesyndication.com`, `google.com`
- `connect-src`: `pagead2.googlesyndication.com`, `adservice.google.com`

## How the Ad-Free Check Works

1. `AdSlot` uses the `useSubscription()` hook from `SubscriptionProvider`
2. It calls `canUseFeature('adFree')` which checks the user's tier
3. If the user is on Pro ($9.99/mo) or Enterprise ($29.99/mo), the component
   renders `null` — no API calls, no DOM elements
4. Free tier users see the ad (if one is available for that position/module)
5. Anonymous (non-logged-in) users see ads

## Revenue Estimation

### CPM-Based Revenue (Custom Campaigns)

```
Revenue = (Impressions / 1000) * CPM Rate

Example:
- 50,000 monthly page views from free users
- Average 2 ad slots per page = 100,000 impressions
- $25 CPM banner rate
- Monthly revenue = (100,000 / 1000) * $25 = $2,500
```

### Google AdSense Revenue

```
AdSense revenue varies by niche. Space/technology CPMs are typically $2-$8.
- 100,000 impressions × $5 avg CPM = $500/month from AdSense alone
- Combined with direct campaigns: $2,500 + $500 = $3,000/month
```

## API Endpoints

| Endpoint                                | Method | Auth     | Description                    |
|-----------------------------------------|--------|----------|--------------------------------|
| `/api/ads/serve?position=X&module=Y`    | GET    | None     | Fetch ad for position/module   |
| `/api/ads/impression`                   | POST   | None     | Track impression/click         |
| `/api/ads/register`                     | POST   | Required | Register as advertiser         |
| `/api/ads/register`                     | GET    | Required | Get advertiser profile         |
| `/api/ads/campaigns`                    | GET    | Required | List campaigns                 |
| `/api/ads/campaigns`                    | POST   | Required | Create campaign                |
| `/api/ads/campaigns/[id]`              | GET    | Required | Campaign details               |
| `/api/ads/campaigns/[id]`              | PUT    | Required | Update campaign                |
| `/api/ads/campaigns/[id]`              | DELETE | Required | Cancel campaign                |
| `/api/ads/campaigns/[id]/analytics`    | GET    | Required | Campaign analytics             |

## Ad Labels & Compliance

All ad placements include clear "Ad" or "Sponsored" labels:
- Banner ads show an "Ad" label in the top-right corner
- Native cards show a "Sponsored" label in the top-left corner
- All ad links use `rel="sponsored noopener noreferrer"`

## Play Store / TWA Compatibility

The ad integration is designed to comply with Google Play Store policies:
- No interstitial ads (avoids policy violations)
- No top banners that push content down
- Max 2 ads per page (well under 30% ad density threshold)
- All ads clearly labeled
- CSP allows AdSense iframes in TWA context
- No changes needed to `assetlinks.json` or service worker for ads

## Budget Enforcement (Custom Campaigns)

- The ad server never overspends a campaign's total budget
- If a daily budget is set, it caps daily spend as well
- When budget is exhausted, the campaign status automatically changes to "completed"
- Revenue per impression = CPM rate / 1000
- Revenue per click = CPC rate (if set)

## Database Models

- `Advertiser` - Company profiles for ad buyers
- `AdCampaign` - Campaign settings (budget, targeting, dates)
- `AdPlacement` - Individual ad creatives (title, image, link)
- `AdImpression` - Impression/click/conversion tracking
