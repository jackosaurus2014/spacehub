# Google AdSense Setup Guide for SpaceNexus

Complete guide to enabling live advertising on the SpaceNexus website and Google Play Android app.

---

## Table of Contents

1. [How Ads Work in SpaceNexus](#how-ads-work-in-spacenexus)
2. [Step 1: Apply for Google AdSense](#step-1-apply-for-google-adsense)
3. [Step 2: Get Approved](#step-2-get-approved)
4. [Step 3: Create Ad Units](#step-3-create-ad-units)
5. [Step 4: Enable AdSense on the Website](#step-4-enable-adsense-on-the-website)
6. [Step 5: Enable AdSense in the Android App](#step-5-enable-adsense-in-the-android-app)
7. [AdSense vs AdMob (Web vs App)](#adsense-vs-admob-web-vs-app)
8. [Current Ad Placements](#current-ad-placements)
9. [How the Hybrid Ad System Works](#how-the-hybrid-ad-system-works)
10. [Direct Sponsorship Ads (Custom)](#direct-sponsorship-ads-custom)
11. [Revenue Optimization Tips](#revenue-optimization-tips)
12. [AdSense Policies to Follow](#adsense-policies-to-follow)
13. [Troubleshooting](#troubleshooting)

---

## How Ads Work in SpaceNexus

SpaceNexus has a **hybrid waterfall** ad system already built in:

```
1. Check if user is Pro/Enterprise → show NO ads (ad-free perk)
2. Try to serve a custom ad from the database (direct sponsorships)
3. Fall back to Google AdSense (programmatic ads)
4. Neither available → show nothing (no empty containers)
```

**Key files:**
- `src/components/ads/AdSlot.tsx` — Universal ad slot component (waterfall logic)
- `src/components/ads/AdBanner.tsx` — Google AdSense `<ins>` tag renderer
- `src/components/ads/NativeAd.tsx` — Custom native ad card renderer
- `src/lib/ads/ad-server.ts` — Server-side ad selection, impression tracking, analytics
- `src/app/layout.tsx` — AdSense script tag (loads when env var is set)
- `src/app/advertise/page.tsx` — Self-service advertiser landing page

---

## Step 1: Apply for Google AdSense

1. Go to **https://adsense.google.com**
2. Click **Get Started**
3. Sign in with your Google account
4. Enter your website URL: `spacenexus.us`
5. Select your country and accept the terms
6. Google will give you a **Publisher ID** (format: `ca-pub-XXXXXXXXXXXXXXXX`)

---

## Step 2: Get Approved

Google reviews every site before enabling ads. Here's what they check:

### Requirements (SpaceNexus already meets these)
- **Original content** — Blog posts, pillar guides, city landing pages
- **Privacy policy** — Available at `/privacy`
- **Terms of service** — Available at `/terms`
- **Cookie consent** — GDPR-compliant banner already implemented
- **Navigation** — Clear site structure with accessible menus
- **No prohibited content** — Space industry news is fine

### What Might Delay Approval
- **Low traffic** — If the site is brand new with very few visitors, Google may ask you to reapply after building more traffic. Aim for at least a few hundred pageviews/day.
- **Thin content pages** — Any page that's mostly empty or placeholder content should be fleshed out before applying.
- **Too many ads per page** — SpaceNexus uses max 2 per page (in_feed + footer), which is well within limits.

### Approval Timeline
- Usually **1-3 business days**, sometimes up to 2 weeks
- You'll receive an email at your Google account
- If rejected, the email will tell you why and you can reapply after fixing issues

---

## Step 3: Create Ad Units

Once approved, create ad units in your AdSense dashboard:

### Ad Unit 1: In-Feed Ad (Responsive)
1. In AdSense → **Ads** → **By ad unit** → **Create new ad unit**
2. Choose **In-feed** or **Display ads**
3. Name it: `SpaceNexus In-Feed`
4. Format: **Responsive**
5. Click **Create** and copy the **Slot ID** (numeric, e.g., `1234567890`)

### Ad Unit 2: Footer Ad (Horizontal)
1. Create another ad unit
2. Name it: `SpaceNexus Footer`
3. Format: **Horizontal** (or Responsive)
4. Copy the Slot ID

### Ad Unit 3: Rectangle Ad (Optional, for sidebars)
1. Name it: `SpaceNexus Rectangle`
2. Format: **Rectangle (300x250)**
3. Copy the Slot ID

> **Note:** You'll use these Slot IDs in Step 4 to connect specific ad units to specific placements on the site.

---

## Step 4: Enable AdSense on the Website

### 4a. Set the Environment Variable

In **Railway** (https://railway.com → your project → Variables):

```
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
```

Replace `ca-pub-XXXXXXXXXXXXXXXX` with your actual Publisher ID from Step 1.

**Redeploy** the app (Railway auto-deploys on variable change).

This single env var does two things:
1. Loads the AdSense `adsbygoogle.js` script in `<head>` (see `src/app/layout.tsx`)
2. Enables the `AdBanner` component to render actual ad `<ins>` tags

### 4b. Add Slot IDs to Ad Placements (Optional Enhancement)

Currently, the `AdSlot` components on the 8 pages don't pass `adsenseSlot` props, so they only serve custom database ads. To enable AdSense fallback on each page, you can add the slot IDs to the AdSlot components.

For example, in `src/app/news/page.tsx`:
```tsx
// Before (custom ads only):
<AdSlot position="in_feed" module="news-feed" />
<AdSlot position="footer" module="news-feed" />

// After (custom ads with AdSense fallback):
<AdSlot position="in_feed" module="news-feed" adsenseSlot="1234567890" />
<AdSlot position="footer" module="news-feed" adsenseSlot="0987654321" />
```

Replace the slot IDs with the ones you created in Step 3.

**Pages with AdSlot components (8 pages):**

| Page | File | Module ID |
|------|------|-----------|
| News | `src/app/news/page.tsx` | `news-feed` |
| Blogs | `src/app/blogs/page.tsx` | `blogs-articles` |
| Market Intel | `src/app/market-intel/page.tsx` | `market-intel` |
| Mission Control | `src/app/mission-control/page.tsx` | `mission-control` |
| Company Profiles | `src/app/company-profiles/page.tsx` | `company-profiles` |
| Marketplace | `src/app/marketplace/page.tsx` | `marketplace` |
| Space Talent | `src/app/space-talent/page.tsx` | `space-talent` |
| Satellites | `src/app/satellites/page.tsx` | `satellite-tracker` |

### 4c. Verify Ads Are Showing

1. Visit your site in an **incognito/private window** (to avoid ad blockers)
2. Open **DevTools → Network** tab
3. Look for requests to `pagead2.googlesyndication.com` — this confirms the script loaded
4. Ads may take a few hours to start showing after first setup (Google needs to crawl your site)
5. Check AdSense dashboard → **Reports** for impression/click data

---

## Step 5: Enable AdSense in the Android App

For the Google Play app (TWA — Trusted Web Activity), the website ads will **automatically show** inside the app because the TWA renders your actual website. No extra setup needed for the existing web ad placements.

However, for better mobile monetization, use **Google AdMob** (Google's mobile-specific ad platform):

### 5a. Sign Up for AdMob
1. Go to **https://admob.google.com**
2. Sign in with the **same Google account** as your AdSense account
3. Link your AdSense account to AdMob (Settings → Account → AdSense linking)

### 5b. Create an AdMob App
1. In AdMob → **Apps** → **Add app**
2. Platform: **Android**
3. Published: **Yes** (after your app is on Google Play) or **No** (before publishing)
4. App name: `SpaceNexus`
5. Copy the **App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`)

### 5c. Create AdMob Ad Units
Create these ad units in AdMob:

| Ad Unit | Type | Where It Shows |
|---------|------|---------------|
| `SpaceNexus Banner` | Banner | Bottom of screen |
| `SpaceNexus Interstitial` | Interstitial | Between page navigations (use sparingly) |
| `SpaceNexus Rewarded` | Rewarded | Optional: "Watch ad to unlock premium feature preview" |

### 5d. Add AdMob to the Android TWA

Since SpaceNexus uses a TWA (not a native app), you have two options:

**Option A: Use web ads only (simplest)**
- The website's AdSense ads already show in the TWA
- No extra work needed
- Revenue tracked in AdSense dashboard

**Option B: Add native AdMob ads (higher revenue)**
- Requires modifying the TWA wrapper to include the AdMob SDK
- Add to `android-twa/app/build.gradle`:
  ```gradle
  dependencies {
      implementation 'com.google.android.gms:play-services-ads:23.0.0'
  }
  ```
- Add to `android-twa/app/src/main/AndroidManifest.xml`:
  ```xml
  <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
  ```
- This is more complex and requires rebuilding the AAB. Start with Option A and upgrade later if needed.

### 5e. Google Play AdSense Policy
- Your app must comply with Google Play's **Families Policy** if applicable (SpaceNexus is not targeted at children, so this doesn't apply)
- Ads must not be deceptive or overlap interactive elements
- Include an **ad disclosure** in your Play Store listing privacy policy
- Link your AdMob account to your Play Console for revenue reporting

---

## AdSense vs AdMob (Web vs App)

| Feature | AdSense (Web) | AdMob (App) |
|---------|--------------|-------------|
| Platform | Websites | Mobile apps |
| Integration | JavaScript `<ins>` tags | Native SDK or web fallback |
| Ad formats | Display, in-feed, matched content | Banner, interstitial, rewarded, native |
| Revenue model | CPM + CPC | CPM + CPC + rewarded |
| Dashboard | adsense.google.com | admob.google.com |
| Payment | Same Google Payments account | Same Google Payments account |
| Minimum payout | $100 | $100 |

**For SpaceNexus:** Start with AdSense only. Since the TWA renders your website, web ads work in the app automatically. Add AdMob later when you want app-specific ad formats like interstitials or rewarded ads.

---

## Current Ad Placements

Each of the 8 ad-enabled pages has **2 ad slots**:

| Position | Location | Format |
|----------|----------|--------|
| `in_feed` | Between content items (after the 4th-6th item) | Native card or responsive display |
| `footer` | Bottom of page, above the site footer | Horizontal banner or responsive |

### Rules enforced by the system:
- **Max 2 ads per page** — No interstitials, no top banners
- **Pro/Enterprise users** — See zero ads (ad-free subscription perk)
- **No ads on legal pages** — Privacy, terms, cookies, login, register
- **No ads on conversion pages** — Pricing, developer portal, advertise page

---

## How the Hybrid Ad System Works

```
User visits page with <AdSlot position="in_feed" module="news-feed" adsenseSlot="123" />
  │
  ├─ Is user Pro/Enterprise?
  │    └─ YES → Render nothing (ad-free)
  │
  ├─ Fetch custom ad from POST /api/ads/serve
  │    └─ Found active campaign targeting this module + position?
  │         └─ YES → Render NativeAd or custom banner
  │              │    Track impression via IntersectionObserver (50% visible)
  │              │    Track click on link tap
  │              └─ Revenue: CPM rate / 1000 per impression + CPC per click
  │
  ├─ No custom ad available, adsenseSlot provided?
  │    └─ YES → Render <AdBanner> with AdSense <ins> tag
  │         └─ Revenue: Google handles bidding, pays you monthly
  │
  └─ Neither available → Render nothing (no empty space)
```

### Custom Ads (Direct Sponsorships)

Custom ads are served from the database and managed via the admin API. These pay more than AdSense because they're direct deals with aerospace companies.

**Database models:**
- `Advertiser` — Company info (name, logo, contact)
- `AdCampaign` — Budget, dates, CPM/CPC rates, targeting, priority
- `AdPlacement` — Creative content (title, description, image, link, format)
- `AdImpression` — Event log (impressions, clicks, conversions, revenue)

**API routes:**
- `GET /api/ads/serve?position=in_feed&module=news-feed` — Select best ad
- `POST /api/ads/impression` — Track impression/click/conversion
- `GET /api/ads/analytics?campaignId=xxx` — Campaign performance data

---

## Direct Sponsorship Ads (Custom)

For higher revenue, sell ad space directly to aerospace companies. The infrastructure is already built.

### How to Create a Custom Ad Campaign

Use the database directly (or build an admin UI later):

```sql
-- 1. Create an advertiser
INSERT INTO "Advertiser" (id, "companyName", "contactEmail", "logoUrl")
VALUES ('adv_spacex', 'SpaceX', 'ads@spacex.com', 'https://...');

-- 2. Create a campaign
INSERT INTO "AdCampaign" (id, "advertiserId", name, type, status, budget, "dailyBudget",
  "cpmRate", "cpcRate", priority, "startDate", "endDate", "targetModules")
VALUES ('camp_1', 'adv_spacex', 'SpaceX Launch Promo', 'cpm', 'active',
  5000, 200, 25, 2.50, 10, NOW(), NOW() + INTERVAL '30 days',
  ARRAY['news-feed', 'mission-control', 'satellite-tracker']);

-- 3. Create a placement (the actual ad creative)
INSERT INTO "AdPlacement" (id, "campaignId", position, format, title, description,
  "imageUrl", "linkUrl", "ctaText", "isActive")
VALUES ('pl_1', 'camp_1', 'in_feed', 'native_card', 'Watch Starship Launch Live',
  'Tune in for the next Starship test flight...', 'https://...image.jpg',
  'https://spacex.com/launches', 'Watch Now', true);
```

### Suggested Pricing for Direct Ads
| Format | CPM Rate | Why |
|--------|----------|-----|
| Banner (728x90) | $25 | Standard display |
| Native Card | $40 | Higher engagement, blends with content |
| Sponsored Module | $75 | Premium placement, exclusive to one section |

This pricing is on the `/advertise` page for self-service inquiries.

---

## Revenue Optimization Tips

### Short Term (Month 1-2)
1. **Enable AdSense** as described above — immediate passive revenue
2. **Grow traffic first** — More pageviews = more ad impressions = more revenue
3. **Don't overdo ads** — 2 per page is the sweet spot. More ads = lower engagement

### Medium Term (Month 3-6)
4. **Add adsenseSlot props** to all 8 AdSlot components for AdSense fallback
5. **A/B test ad positions** — Try moving in_feed ads to different positions
6. **Enable Auto Ads** — In AdSense dashboard, turn on "Auto ads" to let Google find additional placements (test carefully — it can be aggressive)

### Long Term (Month 6+)
7. **Sell direct sponsorships** — Reach out to space companies (SpaceX, Blue Origin, Rocket Lab, etc.). Direct deals pay 5-10x more than AdSense.
8. **Upgrade to premium networks** — Once you hit 50k sessions/month, apply to Mediavine ($15-25 RPM vs AdSense's $1-5 RPM)
9. **Rewarded ads in app** — "Watch an ad to preview a Pro feature" converts users while generating revenue

### Revenue Expectations

| Traffic Level | AdSense RPM | Monthly Revenue (est.) |
|--------------|-------------|----------------------|
| 1,000 pageviews/day | $2-5 | $60-150 |
| 5,000 pageviews/day | $3-7 | $450-1,050 |
| 20,000 pageviews/day | $4-8 | $2,400-4,800 |
| 50,000 pageviews/day | $5-10 | $7,500-15,000 |

RPM (Revenue Per Mille) = revenue per 1,000 pageviews. B2B/tech niches like aerospace tend to have higher RPMs than general content.

---

## AdSense Policies to Follow

Violating these can get your account banned:

1. **Never click your own ads** — Google detects this immediately
2. **Never ask others to click ads** — No "please support us by clicking ads"
3. **Don't place ads on pages with no content** — Every page with ads needs real content
4. **Don't disguise ads as content** — SpaceNexus already labels ads with "Ad" badge and "Sponsored by" attribution
5. **Don't place more than the reasonable limit** — Google recommends content should outweigh ads on every page
6. **Don't modify ad code** — Use the AdSense `<ins>` tag exactly as provided (our `AdBanner` component does this correctly)
7. **Keep privacy policy updated** — Must mention use of Google AdSense and cookies for ad personalization (already covered in `/privacy`)
8. **Disclose in app store listings** — Play Store privacy section must mention ads

---

## Troubleshooting

### Ads Not Showing
- **Check env var**: Make sure `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is set in Railway and the app was redeployed after setting it
- **Check ad blocker**: Test in incognito window with no extensions
- **New account delay**: It can take 24-48 hours after approval for ads to start serving
- **Low traffic**: Google may not serve ads if your site has very few visitors initially
- **Ad slot not passed**: If no `adsenseSlot` prop is passed to `<AdSlot>`, it won't fall back to AdSense

### AdSense Application Rejected
- **"Valuable inventory: No content"** — Add more original content to pages. The blog posts and pillar guides help significantly.
- **"Site not accessible"** — Make sure Google can crawl your site. Check `robots.txt` doesn't block Googlebot.
- **"Policy violation"** — Review the specific violation mentioned and fix it before reapplying.
- **Wait before reapplying** — Google recommends waiting 2-4 weeks after fixing issues.

### Low Revenue
- Normal at first — RPM increases as Google learns your audience
- Ensure ads are visible (not below very long pages where nobody scrolls)
- More content = more pages indexed = more search traffic = more impressions

### Ads Showing on Wrong Pages
- AdSlot components only exist on the 8 pages listed above
- Pro/Enterprise users never see ads (handled by `useSubscription()` hook)
- If using Auto Ads in AdSense, it may inject ads on additional pages — disable in AdSense dashboard if unwanted

---

## Environment Variables Reference

| Variable | Where to Set | Example | Purpose |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Railway | `ca-pub-1234567890123456` | Enables AdSense script + AdBanner component |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Railway | `G-6N63DLGQMJ` | Already set — Google Analytics 4 |

Both are `NEXT_PUBLIC_` prefixed, meaning they are embedded in the client-side JavaScript bundle at build time. Changing them requires a redeploy.

---

## Quick Start Checklist

- [ ] Apply at https://adsense.google.com with site URL `spacenexus.us`
- [ ] Wait for approval email (1-14 days)
- [ ] Copy your Publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`)
- [ ] Set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` in Railway variables
- [ ] Redeploy (automatic on Railway)
- [ ] Create ad units in AdSense dashboard and copy Slot IDs
- [ ] (Optional) Add `adsenseSlot` props to AdSlot components for fallback
- [ ] Verify ads load in incognito window
- [ ] Monitor revenue in AdSense dashboard → Reports
- [ ] For Android app: ads work automatically via TWA (no extra setup)
- [ ] For higher app revenue later: set up AdMob and link to AdSense
