# SEO External Setup Guide

**Date**: February 18, 2026
**Purpose**: Step-by-step instructions for registering SpaceNexus with Google Search Console, Bing Webmaster Tools, and Google Business Profile.

---

## 1. Google Search Console (GSC)

### Why It Matters
Google Search Console is the single most important SEO tool. It tells you:
- Which pages Google has indexed
- What search queries bring people to your site
- Crawl errors and indexing issues
- Core Web Vitals scores
- Structured data validation
- Manual actions or security issues

### Setup Steps

1. **Go to** [search.google.com/search-console](https://search.google.com/search-console)
2. **Sign in** with a Google account (ideally the one associated with SpaceNexus)
3. **Add Property** → Choose "URL prefix" → Enter `https://spacenexus.us`
4. **Choose verification method**: Select "HTML tag"
5. **Copy the meta tag content value** — it looks like: `<meta name="google-site-verification" content="ABC123xyz..." />`
   - You only need the content value: `ABC123xyz...`
6. **Set the environment variable** in Railway:
   - Go to your Railway project → Variables
   - Add: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` = `ABC123xyz...` (paste the content value)
   - Railway will auto-redeploy
7. **Return to GSC** and click "Verify"
8. **Done!** The verification meta tag is already coded into `src/app/layout.tsx` and reads from this env var.

### Submit Sitemap

After verification:

1. In GSC, go to **Sitemaps** (left sidebar)
2. Enter `sitemap.xml` in the "Add a new sitemap" field
3. Click **Submit**
4. Google will begin crawling all 114+ URLs immediately
5. Check back in 24-48 hours for initial indexing data

### Key GSC Features to Monitor

- **Performance** → Search queries, impressions, clicks, CTR, position
- **Coverage** → Indexed pages, errors, excluded pages
- **Core Web Vitals** → LCP, FID, CLS scores
- **Enhancements** → Structured data validation (Organization, FAQ, etc.)

---

## 2. Bing Webmaster Tools

### Why It Matters
Bing powers multiple search engines:
- Bing (8% US market share)
- DuckDuckGo (uses Bing's index)
- Yahoo Search
- Microsoft Copilot / AI search

### Setup Steps

1. **Go to** [bing.com/webmasters](https://www.bing.com/webmasters)
2. **Sign in** with a Microsoft account
3. **Add your site** → Enter `https://spacenexus.us`
4. **Option 1 — Import from GSC**: If you've already set up Google Search Console, Bing offers a one-click import. This is the easiest method.
5. **Option 2 — HTML meta tag verification**:
   - Bing will give you a meta tag: `<meta name="msvalidate.01" content="BING_CODE_HERE" />`
   - Copy just the content value
   - Set the environment variable in Railway:
     - `NEXT_PUBLIC_BING_SITE_VERIFICATION` = `BING_CODE_HERE`
   - Railway will auto-redeploy
   - Return to Bing and click Verify
6. **Submit sitemap**: Go to Sitemaps → Submit `https://spacenexus.us/sitemap.xml`

### Key Bing Features

- **Search Performance** → Similar to GSC but for Bing traffic
- **URL Inspection** → Check individual page indexing
- **SEO Reports** → Bing's built-in SEO audit tool
- **Import from GSC** → Keep Bing in sync with Google data

---

## 3. Google Business Profile

### Why It Matters
When someone searches "SpaceNexus" or "Space Nexus" on Google, a Knowledge Panel should appear on the right side of results showing:
- Company logo and name
- Description
- Website link
- Social media links
- Industry category

Without a Google Business Profile, branded searches show only organic results with no rich panel.

### Setup Steps

1. **Go to** [business.google.com](https://business.google.com)
2. **Sign in** with the same Google account used for GSC
3. **Search for your business** → "SpaceNexus LLC"
4. If not found, click **"Add your business to Google"**
5. **Fill in details**:
   - **Business name**: SpaceNexus
   - **Category**: "Technology Company" or "Software Company"
   - **Service area**: Online / United States
   - **Website**: https://spacenexus.us
   - **Description**: "SpaceNexus is a space industry intelligence platform providing launch tracking, market data, satellite operations, and business opportunity discovery for the space economy."
6. **Verify ownership**: Google will send a verification code via postcard, phone, or email depending on business type. For online-only businesses, email or phone verification is usually available.
7. **After verification**:
   - Add the SpaceNexus logo
   - Add social links (LinkedIn: https://www.linkedin.com/company/112094370/)
   - Add business hours (if applicable, or mark as "Online only")
   - Write a longer business description

### Tips
- Google Business Profiles can take 1-2 weeks to fully propagate
- Keep information consistent across all platforms (same name, same URL)
- Respond to any reviews that appear

---

## 4. Post-Setup Checklist

After completing all three registrations:

- [ ] Google Search Console verified and sitemap submitted
- [ ] Check GSC Coverage report after 48 hours
- [ ] Bing Webmaster Tools verified and sitemap submitted
- [ ] Google Business Profile created and verified
- [ ] Set Railway env vars:
  - [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
  - [ ] `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- [ ] Verify meta tags appear in page source (View Source → search for "verification")
- [ ] Test OG image: Share spacenexus.us on LinkedIn/Twitter and confirm image preview appears

### Testing Social Sharing Previews

Use these tools to verify OG image and meta tags work correctly:

- **Facebook/Meta**: [developers.facebook.com/tools/debug/](https://developers.facebook.com/tools/debug/) — Enter your URL
- **Twitter/X**: [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) — Enter your URL
- **LinkedIn**: [linkedin.com/post-inspector/](https://www.linkedin.com/post-inspector/) — Enter your URL
- **General**: [opengraph.xyz](https://opengraph.xyz) — Shows how your URL looks across platforms

---

## 5. Ongoing SEO Monitoring

### Weekly
- Check GSC Performance for trending queries
- Monitor Coverage for new errors

### Monthly
- Review Core Web Vitals
- Check for manual actions
- Audit structured data errors
- Review Bing SEO Reports

### After Major Deployments
- Request re-indexing of changed pages in GSC (URL Inspection → Request Indexing)
- Submit updated sitemap if new routes were added
