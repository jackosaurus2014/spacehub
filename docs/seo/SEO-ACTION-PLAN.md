# SEO Critical Fix & High-Impact Action Plan

**Date**: February 18, 2026
**Status**: In Progress

---

## Issues Identified

### CRITICAL: Missing OpenGraph Image (og-image.png)

**Problem**: The root layout (`src/app/layout.tsx`) references `/og-image.png` in both OpenGraph and Twitter Card meta tags, but the file does not exist in `public/`. Every time the site URL is shared on LinkedIn, Twitter/X, Slack, Discord, or any social platform, the preview shows no image — just text.

**Impact**: High. Social sharing is a primary driver of organic traffic. A missing preview image reduces click-through rates by 30-50% compared to posts with images (industry benchmarks).

**Solution**: Generate a branded 1200x630px og-image.png using the existing SpaceNexus logo and sharp library. Place in `public/og-image.png`.

---

### HIGH-IMPACT #1: Google Search Console Not Registered

**Problem**: The site has no Google Search Console (GSC) verification. Without GSC:
- No visibility into which pages Google has indexed
- No crawl error reports
- No search query data (what terms people use to find the site)
- No Core Web Vitals monitoring
- No ability to request re-indexing of updated pages
- No structured data validation

**Impact**: Very high. GSC is the single most important SEO tool. Without it, all other SEO work is unmeasured.

**Solution**: Add a `google-site-verification` meta tag to the site metadata. The actual verification code is obtained from GSC during registration. We'll add the infrastructure and provide step-by-step instructions.

---

### HIGH-IMPACT #2: Sitemap Not Submitted to Google

**Problem**: While the sitemap exists at `/sitemap.xml` and is referenced in `robots.txt`, it has never been explicitly submitted to Google Search Console. Google will eventually discover it via robots.txt, but explicit submission:
- Triggers immediate crawling of all 114+ URLs
- Provides indexing status reports per URL
- Shows coverage errors

**Impact**: Medium-high. Explicit submission accelerates initial indexing from weeks to days.

**Solution**: Submit sitemap URL in Google Search Console after registration. Document the steps.

---

### HIGH-IMPACT #3: Bing Webmaster Tools Not Registered

**Problem**: No Bing Webmaster Tools verification. Bing powers:
- Bing search (8% US market share)
- DuckDuckGo (privacy-focused search)
- Yahoo Search
- Microsoft Copilot / AI search results

**Impact**: Medium. Missing 10-15% of potential search traffic.

**Solution**: Add a `msvalidate.01` meta tag for Bing verification. Provide setup instructions.

---

### HIGH-IMPACT #4: No Google Business Profile

**Problem**: SpaceNexus LLC has no Google Business Profile. When someone searches "SpaceNexus" or "Space Nexus", Google shows no knowledge panel, no business info, no reviews section.

**Impact**: Medium. Branded searches ("space nexus") should show a rich knowledge panel with logo, description, website link, and social links. This builds credibility and captures clicks.

**Solution**: Create a Google Business Profile at business.google.com. This is entirely external to the codebase — documented with step-by-step instructions.

---

## Implementation Plan

### 1. Generate og-image.png (Automated)
- Use `sharp` to compose a branded OG image
- Logo centered on dark background with site name and tagline
- 1200x630px PNG, optimized for file size
- Also generate `twitter-image.png` (same dimensions, different crop if needed)
- Place in `public/`

### 2. Add Verification Meta Tags (Code Change)
- Add `verification` field to root layout metadata
- Support both Google (`google-site-verification`) and Bing (`msvalidate.01`)
- Use environment variables so verification codes aren't hardcoded:
  - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
  - `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- Fallback: tags not rendered if env vars not set

### 3. Create Step-by-Step Guides (Documentation)
- Google Search Console registration + verification + sitemap submission
- Bing Webmaster Tools registration + verification
- Google Business Profile creation

### 4. Verify Build
- `npm run build` to confirm no errors
- Check that og-image.png is accessible

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `scripts/generate-og-image.ts` | OG image generation script |
| Create | `public/og-image.png` | Generated OG image |
| Modify | `src/app/layout.tsx` | Add verification meta tags |
| Create | `docs/seo/SEO-SETUP-GUIDE.md` | Step-by-step external setup |
| Create | `docs/seo/SEO-COMPLETED-WORK.md` | Summary of completed work |
