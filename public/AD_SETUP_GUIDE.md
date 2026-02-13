# SpaceNexus Ad Monetization Setup Guide

This guide walks you through setting up ad monetization for the SpaceNexus application using Google AdSense and alternative ad networks.

## Table of Contents

1. [Google AdSense Setup](#google-adsense-setup)
2. [Getting Ad Unit IDs](#getting-ad-unit-ids)
3. [Configuring Components](#configuring-components)
4. [Revenue Optimization Tips](#revenue-optimization-tips)
5. [Alternative Ad Networks](#alternative-ad-networks)
6. [Troubleshooting](#troubleshooting)

---

## Google AdSense Setup

### Step 1: Create an AdSense Account

1. Visit [Google AdSense](https://www.google.com/adsense/start/)
2. Sign in with your Google account
3. Enter your website URL: `https://spacenexus.us`
4. Select your country and accept the Terms of Service
5. Click "Start using AdSense"

### Step 2: Verify Your Website

Google will need to verify ownership of your website:

1. In AdSense dashboard, go to **Sites** > **Add site**
2. Enter your website URL
3. Copy the verification code provided
4. Add the verification meta tag to your site's `<head>` section in `src/app/layout.tsx`

```tsx
<meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXXX" />
```

### Step 3: Enable the AdSense Script

Once your account is approved, uncomment the AdSense script in `src/app/layout.tsx`:

```tsx
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX"
  crossOrigin="anonymous"
/>
```

Replace `ca-pub-XXXXXXXXXXXXXXXXX` with your actual Publisher ID.

### Step 4: Wait for Approval

- AdSense approval typically takes 1-14 days
- Ensure your site has substantial content (10+ pages recommended)
- Content must comply with [AdSense Program Policies](https://support.google.com/adsense/answer/48182)

---

## Getting Ad Unit IDs

### Creating Ad Units in AdSense

1. Log into your AdSense account
2. Navigate to **Ads** > **By ad unit**
3. Click **Create new ad unit**
4. Choose your ad type:
   - **Display ads**: Flexible, responsive ads
   - **In-feed ads**: Native ads that match your content
   - **In-article ads**: Ads within article content
5. Configure settings:
   - Name your ad unit (e.g., "SpaceNexus Homepage Banner")
   - Choose ad size (responsive recommended)
   - Set ad style if applicable
6. Click **Create** and copy the ad unit ID (format: `1234567890`)

### Recommended Ad Units for SpaceNexus

| Location | Ad Type | Format | Suggested Size |
|----------|---------|--------|----------------|
| Homepage Banner | Display | Horizontal | 728x90 (Leaderboard) |
| News Feed | In-feed Native | Responsive | Auto |
| Article Page | In-article | Responsive | Auto |
| Sidebar | Display | Rectangle | 300x250 |

---

## Configuring Components

### AdBanner Component

Located at: `src/components/ads/AdBanner.tsx`

1. **Enable AdSense**: Change `ADSENSE_ENABLED` to `true`:

```tsx
const ADSENSE_ENABLED = true;
```

2. **Set Publisher ID**: Replace the placeholder:

```tsx
const ADSENSE_CLIENT_ID = 'ca-pub-YOUR_PUBLISHER_ID';
```

3. **Usage in pages**:

```tsx
import { AdBanner } from '@/components/ads';

// Horizontal banner (728x90)
<AdBanner slot="1234567890" format="horizontal" />

// Rectangle ad (300x250)
<AdBanner slot="0987654321" format="rectangle" />

// Responsive ad (auto-sizing)
<AdBanner slot="1122334455" format="responsive" />
```

### NativeAd Component

Located at: `src/components/ads/NativeAd.tsx`

For direct-sold native ads or programmatic native inventory:

```tsx
import { NativeAd } from '@/components/ads';

<NativeAd
  title="Your Ad Title"
  description="Ad description text here"
  image="/path/to/image.jpg"
  link="https://advertiser-link.com"
  sponsor="Advertiser Name"
/>
```

### SponsorBadge Component

Located at: `src/components/ads/SponsorBadge.tsx`

For sponsorship acknowledgments:

```tsx
import { SponsorBadge } from '@/components/ads';

<SponsorBadge
  sponsorName="Sponsor Name"
  sponsorLogo="/path/to/logo.png" // optional
  link="https://sponsor-website.com"
/>
```

---

## Revenue Optimization Tips

### 1. Ad Placement Strategy

- **Above the fold**: Place at least one ad visible without scrolling
- **Content integration**: Ads within content perform 2-3x better
- **Don't overcrowd**: 3-4 ads per page maximum for best UX
- **Mobile optimization**: Ensure ads are responsive

### 2. Ad Format Selection

| Format | Best For | Expected CTR |
|--------|----------|--------------|
| Leaderboard (728x90) | Top of page | 0.06% |
| Medium Rectangle (300x250) | Sidebar, in-content | 0.25% |
| Large Rectangle (336x280) | In-content | 0.35% |
| Native In-feed | News/article lists | 0.40% |

### 3. Content Optimization

- **Quality content**: Higher quality = higher CPM rates
- **Niche focus**: Space industry content attracts tech advertisers
- **Engagement**: Longer session times improve ad revenue
- **SEO**: More organic traffic = more ad impressions

### 4. Technical Optimizations

- **Lazy loading**: Load ads only when visible
- **Ad refresh**: Refresh ads every 30-60 seconds (check policy)
- **A/B testing**: Test different placements and formats
- **Core Web Vitals**: Fast pages = better ad performance

### 5. Revenue Diversification

- Combine AdSense with direct sponsorships
- Consider affiliate programs (space companies, courses)
- Offer premium ad-free subscriptions
- Native advertising for space industry partners

---

## Alternative Ad Networks

### 1. Media.net (Contextual Ads)

- **Best for**: High-quality contextual ads
- **CPM Range**: $1-5
- **Requirements**: 10K+ monthly pageviews
- **Website**: [media.net](https://www.media.net)

### 2. Carbon Ads (Tech/Developer Focus)

- **Best for**: Tech-focused audience
- **CPM Range**: $2-8
- **Requirements**: Tech/developer content
- **Website**: [carbonads.net](https://www.carbonads.net)

### 3. BuySellAds

- **Best for**: Direct ad sales
- **CPM Range**: Variable (direct pricing)
- **Requirements**: Quality niche content
- **Website**: [buysellads.com](https://www.buysellads.com)

### 4. Ezoic

- **Best for**: AI-optimized ad placements
- **CPM Range**: $3-10+
- **Requirements**: 10K+ monthly pageviews
- **Website**: [ezoic.com](https://www.ezoic.com)

### 5. Mediavine

- **Best for**: Premium publisher network
- **CPM Range**: $15-30+
- **Requirements**: 50K+ monthly sessions
- **Website**: [mediavine.com](https://www.mediavine.com)

### 6. Snigel (Header Bidding)

- **Best for**: Maximum revenue optimization
- **CPM Range**: Variable (auction-based)
- **Requirements**: Quality content, enterprise focus
- **Website**: [snigel.com](https://www.snigel.com)

### Comparison Matrix

| Network | Min Traffic | Setup Difficulty | Revenue Potential |
|---------|-------------|------------------|-------------------|
| AdSense | None | Easy | Medium |
| Media.net | 10K/mo | Easy | Medium |
| Carbon Ads | None | Medium | Medium-High |
| Ezoic | 10K/mo | Medium | High |
| Mediavine | 50K/mo | Medium | Very High |

---

## Troubleshooting

### Ads Not Showing

1. **Check console for errors**: Open browser DevTools
2. **Verify ad blockers**: Test with ad blockers disabled
3. **Check AdSense status**: Ensure account is approved
4. **Verify domain**: Site must be verified in AdSense
5. **Wait 24-48 hours**: New ad units take time to populate

### Low Revenue

1. **Check ad viewability**: Ads must be 50%+ visible
2. **Review placement**: Move ads to more visible locations
3. **Analyze traffic sources**: Direct/organic traffic converts better
4. **Check content quality**: Ensure content meets advertiser standards

### Policy Violations

Common violations to avoid:
- Clicking your own ads
- Encouraging ad clicks
- Placing ads on prohibited content
- Deceptive ad placement
- Too many ads per page

### Performance Issues

If ads slow down your site:

1. Implement lazy loading:
```tsx
// Already implemented in AdBanner component
```

2. Use intersection observer for visibility detection
3. Consider async ad loading
4. Monitor Core Web Vitals impact

---

## Support Resources

- [AdSense Help Center](https://support.google.com/adsense)
- [AdSense Community Forum](https://support.google.com/adsense/community)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [IAB Ad Standards](https://www.iab.com/guidelines/)

---

## Quick Start Checklist

- [ ] Create Google AdSense account
- [ ] Submit site for verification
- [ ] Wait for account approval (1-14 days)
- [ ] Create ad units in AdSense dashboard
- [ ] Update `ADSENSE_ENABLED` to `true` in AdBanner.tsx
- [ ] Add your Publisher ID to AdBanner.tsx
- [ ] Uncomment AdSense script in layout.tsx
- [ ] Replace placeholder slot IDs with real ad unit IDs
- [ ] Test ad display on staging environment
- [ ] Monitor performance and optimize placements

---

*Last updated: February 2026*
