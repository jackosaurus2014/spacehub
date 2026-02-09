# Ad Integration Guide for SpaceNexus

## Overview

SpaceNexus uses a self-serve ad platform that allows space industry companies to
run targeted ad campaigns across module pages. The system respects subscription
tiers -- Pro and Enterprise subscribers never see ads.

## AdSlot Component

The `<AdSlot />` component is the universal entry point for placing ads on pages.

```tsx
import AdSlot from '@/components/ads/AdSlot';

// In a page component:
<AdSlot position="top_banner" module="news-feed" />
```

### Props

| Prop       | Type     | Required | Description                                           |
|------------|----------|----------|-------------------------------------------------------|
| position   | string   | Yes      | Ad position (see positions below)                     |
| module     | string   | No       | Module ID for targeting (e.g., "news-feed", "satellites") |
| className  | string   | No       | Additional CSS classes                                |

### Available Positions

| Position       | Typical Placement              | Recommended Format   |
|----------------|-------------------------------|---------------------|
| top_banner     | Above main content            | banner_728x90       |
| sidebar        | Right sidebar                 | banner_300x250      |
| in_feed        | Between content items         | native_card         |
| footer         | Below main content            | banner_728x90       |
| interstitial   | Between page sections         | native_card         |

### Available Formats

- `banner_728x90` - Standard leaderboard banner
- `banner_300x250` - Medium rectangle (sidebar)
- `native_card` - Sponsored content card (matches NativeAd component)
- `sponsored_article` - Full sponsored article placement

## Placement Examples

### News & Media Module (`/news`)
```tsx
{/* Top of page */}
<AdSlot position="top_banner" module="news-feed" className="mb-6" />

{/* Between news cards in a grid */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {newsItems.slice(0, 3).map(item => <NewsCard key={item.id} {...item} />)}
  <AdSlot position="in_feed" module="news-feed" />
  {newsItems.slice(3).map(item => <NewsCard key={item.id} {...item} />)}
</div>

{/* Footer */}
<AdSlot position="footer" module="news-feed" className="mt-8" />
```

### Sidebar Layout
```tsx
<div className="flex gap-6">
  <div className="flex-1">{/* Main content */}</div>
  <aside className="w-[300px] hidden lg:block">
    <AdSlot position="sidebar" module="market-intel" className="sticky top-4" />
  </aside>
</div>
```

### Space Talent Hub (`/space-talent`)
```tsx
{/* Between job listings */}
<AdSlot position="in_feed" module="space-talent" />
```

## How the Ad-Free Check Works

1. `AdSlot` uses the `useSubscription()` hook from `SubscriptionProvider`
2. It calls `canUseFeature('adFree')` which checks the user's tier
3. If the user is on Pro ($9.99/mo) or Enterprise ($29.99/mo), the component
   renders `null` -- no API calls, no DOM elements
4. Free tier users see the ad (if one is available for that position/module)
5. Anonymous (non-logged-in) users see ads

## Revenue Estimation

### CPM-Based Revenue

```
Revenue = (Impressions / 1000) * CPM Rate

Example:
- 50,000 monthly page views from free users
- Average 2 ad slots per page = 100,000 impressions
- $25 CPM banner rate
- Monthly revenue = (100,000 / 1000) * $25 = $2,500
```

### Blended Revenue (banner + native)

```
Banner impressions: 60,000 @ $25 CPM = $1,500
Native impressions: 40,000 @ $40 CPM = $1,600
Total monthly: $3,100
```

### With CPC (optional click-based billing)

```
If a campaign sets CPC rate = $2.00:
- 100,000 impressions @ $25 CPM = $2,500
- 1,500 clicks (1.5% CTR) @ $2.00 CPC = $3,000
- Revenue = higher of CPM or CPC (configured per campaign)
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

## Budget Enforcement

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
