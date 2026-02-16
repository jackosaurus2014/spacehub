# SpaceNexus 30-Day Launch Plan — CEO Playbook

**Author:** Claude (Acting CEO)
**Date:** February 15, 2026
**Current Version:** v1.2.0
**Live URL:** https://spacenexus.us
**Company:** SpaceNexus LLC, Houston, TX

---

## Executive Summary

SpaceNexus is a fully built, production-ready space industry intelligence platform with 10 modules, 200+ company profiles, marketplace, API product, and native mobile apps. The platform is live at spacenexus.us and auto-deploys from the `dev` branch via Railway.

**The product is built. Now we launch.**

This document covers every action needed over the next 30 days to go from "built" to "launched with users." It is organized as a day-by-day execution plan with specific tasks, accounts to create, content to publish, and metrics to track.

---

## Table of Contents

1. [What's Already Done](#whats-already-done)
2. [Week 1 (Days 1-7): Foundation & Accounts](#week-1-days-1-7-foundation--accounts)
3. [Week 2 (Days 8-14): Content & Community](#week-2-days-8-14-content--community)
4. [Week 3 (Days 15-21): App Stores & Outreach](#week-3-days-15-21-app-stores--outreach)
5. [Week 4 (Days 22-30): Public Launch](#week-4-days-22-30-public-launch)
6. [Account Creation Checklist](#account-creation-checklist)
7. [Content Assets: What's Built & What to Do With Them](#content-assets-whats-built--what-to-do-with-them)
8. [Google Analytics: How to Use Your New Setup](#google-analytics-how-to-use-your-new-setup)
9. [App Store Launch Plans](#app-store-launch-plans)
10. [Marketing Execution Plan](#marketing-execution-plan)
11. [Email Marketing Plan](#email-marketing-plan)
12. [SEO Execution Plan](#seo-execution-plan)
13. [Social Media Execution Plan](#social-media-execution-plan)
14. [Advertising & Revenue Plan](#advertising--revenue-plan)
15. [Beta Testing Plan](#beta-testing-plan)
16. [30-Day Metrics Dashboard](#30-day-metrics-dashboard)
17. [Budget Summary](#budget-summary)
18. [Risk Register](#risk-register)
19. [Day-by-Day Execution Calendar](#day-by-day-execution-calendar)

---

## What's Already Done

Before diving into what we need to do, here's what's already built and deployed:

### Platform (100% Complete)
- 10 intelligence modules (News, Market Intel, Satellites, Business Opportunities, Mission Planning, Space Operations, Talent Hub, Regulatory, Solar System, Space Environment)
- 200+ space company profiles with 9-tab detail pages
- B2B marketplace with listings, RFQs, AI Copilot (Claude-powered)
- Stripe payment integration (Free / Pro $29/mo / Enterprise $99/mo)
- Commercial API v1 with developer portal and API key management
- Smart alert system with email delivery
- SAM.gov procurement intelligence
- Custom dashboard builder
- Real-time launch day dashboard

### Content (100% Complete)
- 6 original blog posts at `/blog` (see Content Assets section below)
- 11 SEO pillar guide pages at `/guide/*`
- 5 city-specific landing pages at `/space-industry/*`
- Press kit at `/press` with boilerplate, stats, brand assets
- FAQ page with 28 items across 4 categories
- RSS feed at `/api/feed/rss`

### Marketing Infrastructure (100% Complete)
- Google Analytics 4 enabled (Measurement ID: G-6N63DLGQMJ)
- Cookie consent banner (GDPR-compliant)
- 6-email welcome drip sequence (Days 0, 1, 3, 5, 10, 14)
- 4 marketing email templates (launch announcement, feature highlight, mobile app, newsletter)
- NPS survey system (triggers after 14 days, then quarterly)
- In-app changelog modal ("What's New")
- Advertise page with pricing ($25-$500 CPM)
- Ad infrastructure on 8 pages (hybrid AdSense + custom ads)
- JSON-LD structured data (Organization, WebSite, SoftwareApplication, FAQPage, Article, BreadcrumbList)
- Smart app banners for Google Play and iOS
- Sitemap with 90+ URLs

### Mobile Apps
- Android TWA: Built, signed AAB ready at `android-twa/app-release.aab`
- iOS Capacitor: Configured, native features coded (push, biometrics, haptics, share), awaiting Mac build

### Infrastructure
- Railway deployment (auto-deploy from `dev` branch)
- PostgreSQL database on Railway
- Cloudflare DNS with www redirect
- SSL certificates (auto-provisioned)
- Service worker for offline/PWA
- Rate limiting and CSRF protection

---

## Week 1 (Days 1-7): Foundation & Accounts

**Theme: "Set up every account and tool we need. Zero content creation — pure infrastructure."**

### Day 1 (Saturday, Feb 15) — Accounts & DNS

**Morning:**
- [x] Enable Google Analytics 4 (Done — G-6N63DLGQMJ)
- [x] Configure www.spacenexus.us redirect (Done — Cloudflare CNAME + middleware)
- [ ] **Google Search Console Setup:**
  1. Go to https://search.google.com/search-console
  2. Click "Add property" → choose "URL prefix" → enter `https://spacenexus.us`
  3. Verify via DNS TXT record (Cloudflare → DNS → Add TXT record with the verification string Google provides)
  4. After verification, go to "Sitemaps" → submit `https://spacenexus.us/sitemap.xml`
  5. Also add `https://www.spacenexus.us` as a separate property (it will auto-verify)
  6. Request indexing for the homepage by entering `https://spacenexus.us` in the URL inspection tool and clicking "Request Indexing"

**Afternoon:**
- [ ] **Google Play Developer Account:**
  1. Go to https://play.google.com/console
  2. Sign in with your Google account
  3. Pay the $25 one-time registration fee
  4. Complete identity verification (government ID, takes 1-3 days)
  5. Once verified, you can upload the AAB

- [ ] **D-U-N-S Number (for Apple Developer Account):**
  1. Go to https://developer.apple.com/enroll/duns-lookup/
  2. Search for "SpaceNexus LLC"
  3. If not found, request a free D-U-N-S number
  4. Provide: Company name, address (Houston, TX), your name as principal
  5. Takes 5-7 business days — **start this TODAY**
  6. You'll receive an email from Dun & Bradstreet with your number

- [ ] **Apple Developer Account:**
  1. You can start enrollment at https://developer.apple.com/programs/enroll/
  2. Choose "Organization" enrollment (for SpaceNexus LLC)
  3. You'll need: D-U-N-S number, Apple ID, $99/year payment
  4. If D-U-N-S isn't ready yet, bookmark this and come back on Day 5-7

### Day 2 (Sunday, Feb 16) — Social Media Accounts

- [ ] **Create Twitter/X Account:**
  1. Go to https://x.com → Sign up
  2. Handle: `@SpaceNexusHQ` (or `@SpaceNexusUS` if taken)
  3. Display name: "SpaceNexus"
  4. Bio: "Space industry intelligence platform. Track launches, satellites, market data, and 200+ company profiles. Free to use. 🚀"
  5. Link: `https://spacenexus.us`
  6. Profile picture: Use the SpaceNexus logo (from `/public/icons/icon-512x512.png`)
  7. Banner image: Use the OG image or create a banner showing the dashboard
  8. Pin a tweet: "SpaceNexus is live! The Bloomberg Terminal for the space industry. Free to try → spacenexus.us"

- [ ] **Optimize LinkedIn Company Page:**
  1. Go to https://www.linkedin.com/company/112094370/admin/
  2. Complete all fields:
     - Tagline: "Space Industry Intelligence Platform"
     - Industry: "Space Research and Technology"
     - Company size: 2-10 employees
     - About section: Use the 250-word boilerplate from the `/press` page
     - Website: `https://spacenexus.us`
     - Specialties: Space Industry, Satellite Tracking, Market Intelligence, Business Intelligence, Aerospace, Space Economy
  3. Upload company logo and banner
  4. Create a "Launch Announcement" post (draft now, publish on launch day)

- [ ] **Create Product Hunt "Coming Soon" Page:**
  1. Go to https://www.producthunt.com
  2. Sign up / sign in
  3. Click your avatar → "My Products" → "Add a product"
  4. Product name: SpaceNexus
  5. Tagline: "The Bloomberg Terminal for the space industry"
  6. Topics: SaaS, Space, Analytics, Business Intelligence
  7. Set status to "Coming Soon"
  8. Add your website URL and social links
  9. This creates a landing page where people can subscribe for launch notifications
  10. Share the Coming Soon link on LinkedIn and Twitter

- [ ] **Create Discord Server:**
  1. Create server named "SpaceNexus Community"
  2. Channels: #welcome, #announcements, #general, #feature-requests, #bugs, #space-news, #introductions
  3. Set up roles: Admin, Beta Tester, Pro Member, Community
  4. Create an invite link (permanent, no expiration)
  5. Add the Discord link to the SpaceNexus footer or a community page

### Day 3 (Monday, Feb 17) — Developer Accounts & Tools

- [ ] **UptimeRobot Setup (Free uptime monitoring):**
  1. Go to https://uptimerobot.com → Sign up free
  2. Add monitor: HTTP(s) → URL: `https://spacenexus.us/api/health`
  3. Monitoring interval: 5 minutes
  4. Alert contacts: Your email and phone (for SMS alerts)
  5. Add a second monitor for: `https://spacenexus.us` (homepage)
  6. This will email you immediately if the site goes down

- [ ] **Set up Resend (if not already done):**
  1. Go to https://resend.com → Sign up
  2. Add domain: `spacenexus.us`
  3. Add DNS records (SPF, DKIM, DMARC) to Cloudflare
  4. Copy API key and set in Railway: `RESEND_API_KEY=re_xxxxxxxxxxxx`
  5. This enables: welcome emails, drip sequence, password resets, NPS emails
  6. Resend free tier: 3,000 emails/month (more than enough to start)

- [ ] **Verify all Railway environment variables are set:**
  ```
  DATABASE_URL=postgresql://...          (should already be set)
  NEXTAUTH_SECRET=...                    (should already be set)
  NEXTAUTH_URL=https://spacenexus.us     (should already be set)
  RESEND_API_KEY=re_...                  (set today)
  CRON_SECRET=...                        (generate a random UUID, set today)
  NEXT_PUBLIC_APP_URL=https://spacenexus.us
  STRIPE_SECRET_KEY=sk_live_...          (if Stripe is set up)
  STRIPE_WEBHOOK_SECRET=whsec_...        (if Stripe is set up)
  ```

### Day 4 (Tuesday, Feb 18) — Stripe & Payments

- [ ] **Activate Stripe Live Mode (if not already):**
  1. Go to https://dashboard.stripe.com
  2. Complete business verification (EIN, business address, bank account)
  3. Switch from test mode to live mode
  4. Copy live keys and update Railway env vars:
     - `STRIPE_SECRET_KEY=sk_live_...`
     - `STRIPE_PUBLISHABLE_KEY=pk_live_...`
     - `STRIPE_WEBHOOK_SECRET=whsec_...` (create webhook endpoint: `https://spacenexus.us/api/stripe/webhooks`)
  5. Create Products in Stripe Dashboard:
     - "SpaceNexus Pro Monthly" — $29/month recurring
     - "SpaceNexus Pro Yearly" — $250/year recurring
     - "SpaceNexus Enterprise Monthly" — $99/month recurring
     - "SpaceNexus Enterprise Yearly" — $850/year recurring
  6. Test a real $1 charge to yourself and refund it

### Day 5 (Wednesday, Feb 19) — Google Play Submission

- [ ] **Upload Android App to Google Play Console:**
  1. Log into https://play.google.com/console (account should be verified by now)
  2. Click "Create app"
     - App name: "SpaceNexus - Space Industry Intelligence"
     - Default language: English (United States)
     - App type: App
     - Free or paid: Free
     - Declarations: Check all (app policies, US export laws)
  3. **Store listing:**
     - Short description: "Space industry intelligence: launches, market data, news & satellite tracking." (80 chars)
     - Full description: Copy from `android-twa/PLAY-STORE-LISTING.md`
     - Screenshots: Upload from `public/play-store/` directory
     - Feature graphic: Upload the 1024x500 feature graphic
     - App icon: Upload 512x512 icon from `public/icons/`
     - App category: Business
     - Contact email: Your email
     - Privacy policy URL: `https://spacenexus.us/privacy`
  4. **Content rating:**
     - Complete the IARC questionnaire (answer honestly — the app has no violence, gambling, etc.)
     - You'll get "Everyone" rating
  5. **Data safety:**
     - Data collected: Email, name (for account creation)
     - Data shared: None
     - Security: Data encrypted in transit (HTTPS), data can be deleted (account deletion)
  6. **App release:**
     - Go to "Production" → "Create new release"
     - Upload `android-twa/app-release.aab`
     - Release name: "1.2.0"
     - Release notes: "Initial release of SpaceNexus for Android. Track launches, satellites, market data, and 200+ space company profiles."
     - Review and roll out to production
  7. **Review timeline:** 1-7 days for first submission (usually 2-3 days)

### Day 6 (Thursday, Feb 20) — Search Console & Indexing

- [ ] **Request indexing for all key pages in Search Console:**
  - Use URL Inspection tool for each URL, click "Request Indexing"
  - Priority pages to index first:
    1. `https://spacenexus.us/` (homepage)
    2. `https://spacenexus.us/blog` (blog index)
    3. All 6 blog posts (see URLs in Content Assets section)
    4. `https://spacenexus.us/guide/space-launch-schedule-2026` (high-volume keyword)
    5. `https://spacenexus.us/guide/satellite-tracking-guide`
    6. `https://spacenexus.us/company-profiles`
    7. `https://spacenexus.us/marketplace`
    8. `https://spacenexus.us/pricing`
    9. All 5 city pages
  - Google limits to ~10-20 indexing requests per day, so spread across 2 days

- [ ] **Check robots.txt is correct:**
  - Visit `https://spacenexus.us/robots.txt` and confirm it allows Googlebot
  - Visit `https://spacenexus.us/sitemap.xml` and confirm all URLs are listed

### Day 7 (Friday, Feb 21) — QA & Bug Sweep

- [ ] **Full QA Walkthrough:**
  Test every page and flow on both desktop and mobile:

  **Critical paths:**
  1. Homepage loads → all sections render → CTAs work
  2. Registration → email verification → login → dashboard
  3. Forgot password → email received → reset works
  4. Upgrade to Pro → Stripe checkout → subscription active → Pro features unlocked
  5. Each of the 10 main modules loads without errors
  6. Company profiles directory → search → individual company page (all 9 tabs)
  7. Marketplace → search → listing detail → submit RFQ
  8. Blog → individual post → related posts links work
  9. All guide pages load and render correctly
  10. City pages load with correct data
  11. RSS feed renders valid XML at `/api/feed/rss`
  12. Press page loads with all sections
  13. FAQ page accordion works
  14. Pricing page → all CTAs lead to correct Stripe checkout
  15. Contact form submits successfully
  16. Newsletter signup works
  17. Cookie consent banner appears and respects choices
  18. Account settings → delete account flow works
  19. Mobile: Tab bar navigation works on all pages
  20. Mobile: Swipe between modules works
  21. PWA: Install prompt appears on mobile browsers

  **Cross-browser testing:**
  - Chrome (desktop + mobile)
  - Safari (desktop + iOS)
  - Firefox (desktop)
  - Edge (desktop)

  **Performance check:**
  - Run Lighthouse audit on homepage (target: 80+ performance, 90+ accessibility)
  - Run Lighthouse on 2-3 module pages
  - Check Core Web Vitals in Search Console (once data appears)

---

## Week 2 (Days 8-14): Content & Community

**Theme: "Create buzz. Get our first users. Build the community."**

### Day 8 (Saturday, Feb 22) — Demo Video

- [ ] **Record a 3-minute product demo video:**
  1. Use a screen recorder (OBS Studio is free, or Loom for easy sharing)
  2. Script outline:
     - **0:00-0:15** — Hook: "What if you could track every satellite, every launch, and every opportunity in the space industry from one dashboard?"
     - **0:15-0:45** — Show Mission Control dashboard with live data
     - **0:45-1:15** — Click through satellite tracker, show 3D visualization
     - **1:15-1:45** — Show market intelligence, company profiles (search for SpaceX)
     - **1:45-2:15** — Show marketplace, procurement intelligence, AI Copilot
     - **2:15-2:45** — Show mobile app, push notifications, offline capability
     - **2:45-3:00** — CTA: "Free to try at spacenexus.us. Pro starts at $29/month."
  3. Upload to YouTube (unlisted or public)
  4. Use this video on: Product Hunt, LinkedIn, Twitter, Play Store listing, press kit

### Day 9 (Sunday, Feb 23) — LinkedIn Content Prep

- [ ] **Draft 7 LinkedIn posts (one for each day of launch week):**

  **Post 1 (Launch Day):** "After months of building, SpaceNexus is officially live. We built the Bloomberg Terminal for the space industry — and it's free to try. [Link] Here's what you can do..."

  **Post 2:** "The space industry is a $1.8 trillion economy. But there's no single platform where professionals can track all of it. Until now. [Blog link: space-economy-2026]"

  **Post 3:** "We track 200+ space companies. Here's what their data tells us about the market in 2026. [Link to company profiles]"

  **Post 4:** "Winning government space contracts shouldn't require a $50K consultant. We built free procurement intelligence into SpaceNexus. [Blog link: how-to-win-government-space-contracts]"

  **Post 5:** "Most satellite trackers show you dots on a map. We show you the business intelligence behind every constellation. [Link to satellites module]"

  **Post 6:** "SpaceNexus is now on Google Play. Track launches, market data, and 200+ companies from your phone. [Play Store link]"

  **Post 7:** "We launched SpaceNexus on Product Hunt today. If you work in space, aerospace, or defense — we built this for you. [PH link]"

### Day 10 (Monday, Feb 24) — Beta Tester Recruitment

- [ ] **Recruit 50 beta testers from these sources:**

  **Source 1: LinkedIn (target 20 testers)**
  - Search for: "space industry" + "business development" or "program manager" or "analyst"
  - Send connection requests with note: "Hi [Name], I'm building SpaceNexus — a free intelligence platform for space professionals. Would love your feedback as a beta tester. Takes 10 min. Interested?"
  - Send 50 connection requests → expect 20 accepts → 10-15 will actually test

  **Source 2: Reddit (target 15 testers)**
  - Post in: r/spaceindustry, r/aerospace, r/spacex, r/SaaS, r/startups, r/sideproject
  - Title: "I built a free Bloomberg Terminal for the space industry — looking for beta testers"
  - Include 3-4 screenshots, explain what it does, link to site
  - Follow each subreddit's self-promotion rules (some require minimum karma/age)

  **Source 3: Space Industry Slack/Discord Communities (target 10 testers)**
  - Join: NewSpace community, Space Startups Slack, Aerospace & Defense Discord
  - Introduce yourself and share the product naturally in relevant channels

  **Source 4: Hacker News (target 5 testers)**
  - "Show HN: SpaceNexus — free space industry intelligence platform"
  - Keep the post factual, technical, and humble
  - Respond to every comment within 1 hour

  **What to ask beta testers:**
  - Create a free account
  - Explore at least 3 modules
  - Try the company profiles search
  - Fill out a 5-question survey:
    1. How useful is this on a scale of 1-10?
    2. What's the most valuable feature?
    3. What's confusing or broken?
    4. Would you recommend this to a colleague?
    5. Would you pay $29/month for Pro features?

### Day 11 (Tuesday, Feb 25) — Startup Directories

- [ ] **Submit to all free startup directories:**

  | Directory | URL | Notes |
  |-----------|-----|-------|
  | BetaList | https://betalist.com/submit | Free, 2-4 week queue |
  | Product Hunt (Coming Soon) | Already created Day 2 | Keep building subscriber list |
  | AlternativeTo | https://alternativeto.net/submit/ | List as alternative to: Bloomberg Terminal, Orbital Insight, Quilty Analytics |
  | SaaSHub | https://www.saashub.com/submit | Free listing |
  | G2 | https://www.g2.com/products/new | Free listing, takes 2-4 weeks to appear |
  | Capterra | https://www.capterra.com/vendors/sign-up | Free basic listing |
  | GetApp | https://www.getapp.com/vendors/sign-up | Free listing |
  | Crunchbase | https://www.crunchbase.com/add-new | Add SpaceNexus LLC as a company |
  | AngelList | https://angel.co | Create company profile |
  | F6S | https://www.f6s.com | Startup platform, good for networking |
  | Launching Next | https://www.launchingnext.com/submit/ | Free |
  | StartupBase | https://startupbase.io/submit | Free |
  | BuiltWith | Will auto-detect | Lists your tech stack publicly |

### Day 12 (Wednesday, Feb 26) — Email List Building

- [ ] **Set up email collection beyond the existing newsletter signup:**
  1. The newsletter signup form on the site already works
  2. Create a lead magnet: "2026 Space Industry Market Map" (a 1-page PDF showing the space economy segments)
  3. Add to the blog sidebar and guide pages: "Download our free Space Industry Market Map"
  4. Use Resend to send the PDF automatically on signup

- [ ] **Send launch announcement to any existing newsletter subscribers:**
  - Use the "Launch Announcement" email template (already built in `src/lib/newsletter/email-templates.ts`)
  - Subject: "SpaceNexus is live — the space industry just got easier to navigate"
  - Include: 3 key features, link to the demo video, CTA to log in

### Day 13 (Thursday, Feb 27) — Backlink Outreach (Round 1)

- [ ] **HARO / Connectively Expert Responses:**
  1. Sign up at https://www.connectively.us (formerly HARO)
  2. Select categories: Technology, Business, Science
  3. Respond to 2-3 relevant journalist queries per day
  4. Pitch yourself as "CEO of SpaceNexus, a space industry intelligence platform"
  5. Provide genuinely useful expert quotes → journalists link back to your site

- [ ] **Space Industry Blog Outreach:**
  - Find 10 space industry blogs/media outlets:
    1. SpaceNews.com
    2. NASASpaceFlight.com
    3. SpacePolicyOnline.com
    4. TheSpaceReview.com
    5. PayloadSpace.com
    6. AviationWeek.com
    7. Via Satellite (satellitetoday.com)
    8. SpaceTechAsia.com
    9. GeekWire Space
    10. TechCrunch Space
  - Email template: "Hi [Name], I wanted to share SpaceNexus — a free intelligence platform for space professionals. We aggregate data from 50+ sources including NASA, NOAA, and SAM.gov into one dashboard. Happy to provide a demo or more details. [Link]"

### Day 14 (Friday, Feb 28) — Apple Developer & Analytics Review

- [ ] **Apple Developer Account (D-U-N-S should be ready by now):**
  1. Go to https://developer.apple.com/programs/enroll/
  2. Choose Organization enrollment
  3. Enter D-U-N-S number, company details
  4. Pay $99/year
  5. Approval takes 1-2 business days

- [ ] **First Analytics Review:**
  - It's been 2 weeks since GA4 was enabled. Check:
  1. **Google Analytics** (analytics.google.com):
     - Go to Reports → Realtime → verify data is flowing
     - Go to Reports → Engagement → Pages and screens → see which pages get the most views
     - Go to Reports → Acquisition → Traffic acquisition → see where users come from
     - Note: Data takes 24-48 hours to fully populate
  2. **Google Search Console** (search.google.com/search-console):
     - Check "Coverage" → how many pages are indexed
     - Check "Performance" → any search impressions yet?
     - Check "Enhancements" → structured data validity (FAQ, Article, etc.)
  3. **Action items from analytics:**
     - If pages aren't indexed: request indexing manually
     - If structured data has errors: fix them
     - Note top traffic sources for doubling down in Week 3

---

## Week 3 (Days 15-21): App Stores & Outreach

**Theme: "Get on both app stores. Accelerate content distribution."**

### Day 15 (Saturday, Mar 1) — Google Play Launch Prep

- [ ] **Google Play app should be approved by now (submitted Day 5)**
  - If approved:
    1. Verify the app works by downloading it on your Android phone
    2. Test: login, navigation, push notifications (if configured), all modules
    3. Take 2-3 real screenshots on your device for marketing use
  - If still in review: Contact Google Play support if it's been more than 7 days
  - If rejected: Read the rejection reason, fix the issue, resubmit

- [ ] **Update Smart App Banner:**
  - If the Play Store listing is live, the smart app banner in `layout.tsx` already points to `com.spacenexus.app`
  - Verify by visiting spacenexus.us on an Android phone — you should see a "Get the app" banner

### Day 16 (Sunday, Mar 2) — iOS Build (Requires Mac)

- [ ] **Build iOS App on a Mac:**

  If you have access to a Mac (your own, a friend's, or a cloud Mac like MacStadium):

  1. Clone the repo: `git clone https://github.com/jackosaurus2014/spacehub.git`
  2. Install dependencies: `npm install`
  3. Build the Next.js app: `npm run build`
  4. Add iOS platform: `npx cap add ios`
  5. Sync web assets: `npx cap sync ios`
  6. Open in Xcode: `npx cap open ios`
  7. In Xcode:
     - Select your Apple Developer Team
     - Set bundle identifier: `com.spacenexus.app`
     - Enable capabilities: Push Notifications, Associated Domains
     - Add `applinks:spacenexus.us` to Associated Domains
     - Copy `ios-assets/PrivacyInfo.xcprivacy` into the project
     - Add to Info.plist:
       ```
       NSFaceIDUsageDescription: "Use Face ID to quickly and securely log in"
       NSCameraUsageDescription: "Scan QR codes for quick access"
       ```
  8. Archive: Product → Archive → Distribute App → App Store Connect
  9. In App Store Connect (https://appstoreconnect.apple.com):
     - Create new app: "SpaceNexus - Space Industry Intel"
     - Bundle ID: `com.spacenexus.app`
     - Upload screenshots (from `public/apple-store/`)
     - Fill in description (use Play Store description, adapted for Apple's style)
     - Set age rating (4+)
     - Set pricing: Free
     - Submit for review

  **If you don't have a Mac:** Use a cloud Mac service:
  - MacStadium: ~$50/month for a Mac mini
  - GitHub Actions with macOS runner (free for public repos, limited minutes for private)
  - Ask a friend/colleague with a Mac for a 2-hour session

  **Apple Review timeline:** 1-3 days typically, sometimes up to 7 days for first submission.

### Day 17 (Monday, Mar 3) — Content Distribution Blitz

- [ ] **Distribute all 6 blog posts across platforms:**

  | Blog Post | LinkedIn | Twitter | Reddit | Medium |
  |-----------|----------|---------|--------|--------|
  | "Why Space Needs Its Own Bloomberg Terminal" | Share as article | Thread (5 tweets) | r/spaceindustry | Cross-post full article |
  | "$1.8T Space Economy: Where Money Goes in 2026" | Share as article | Thread with data points | r/space, r/investing | Cross-post |
  | "How to Win Government Space Contracts" | Share with SAM.gov tips | Thread | r/govcon | Cross-post |
  | "Space Startup Funding Trends 2026" | Share targeting VCs | Thread with charts | r/startups | Cross-post |
  | "Satellite Tracking Explained" | Share as educational content | Thread | r/spacex, r/satellites | Cross-post |
  | "Space Weather: Why It Matters" | Share targeting ops people | Thread | r/solarflare | Cross-post |

  **Medium Strategy:**
  - Create a Medium publication: "SpaceNexus"
  - Cross-post all 6 blog posts with canonical URL pointing back to spacenexus.us/blog
  - This gets your content in front of Medium's audience while preserving SEO

  **LinkedIn Article Strategy:**
  - Republish the 2 most business-relevant posts as LinkedIn articles
  - Best candidates: "Bloomberg Terminal" and "$1.8T Space Economy"
  - Add "Originally published at spacenexus.us/blog" at the bottom

### Day 18 (Tuesday, Mar 4) — Twitter/X Content Push

- [ ] **Start daily Twitter posting cadence:**
  - **Space news commentary** (1 tweet/day): React to daily space news with a SpaceNexus link
  - **Data-driven insights** (2-3 tweets/week): "There are currently 19,127 active satellites in orbit. Track them all free at spacenexus.us"
  - **Feature spotlights** (2 tweets/week): Screenshot + brief description of a module
  - **Engagement** (daily): Reply to space industry accounts (SpaceX, NASA, ESA, Rocket Lab, etc.)

  **Accounts to follow and engage with:**
  - @SpaceX, @NASA, @RocketLab, @BlueOrigin, @planet, @Maxar
  - @SpcPolicyOnline, @PayloadSpace, @SpaceNews_Inc, @NASASpaceflight
  - Space industry influencers: journalists, analysts, executives

### Day 19 (Wednesday, Mar 5) — Backlink & SEO Push

- [ ] **Submit guide pages to relevant aggregators:**
  - Submit "Space Launch Schedule 2026" to launch tracking communities
  - Submit "Satellite Tracking Guide" to amateur radio / satellite hobbyist forums
  - Submit "ITAR Compliance Guide" to defense industry forums and newsletters
  - Each guide page targets specific long-tail keywords with 1,000-10,000 monthly searches

- [ ] **Google Business Profile (optional but valuable):**
  1. Go to https://business.google.com
  2. Create a listing for SpaceNexus LLC in Houston, TX
  3. Category: "Software Company"
  4. This helps with local SEO and gives you a Knowledge Panel in Google

### Day 20 (Thursday, Mar 6) — Partnership Outreach

- [ ] **Reach out to potential integration partners:**
  - Space agencies with open data: NASA, ESA, JAXA (link to their APIs, they may link back)
  - Launch providers: Offer free company profile pages in exchange for a "Tracked by SpaceNexus" badge
  - Industry associations: AIAA, SIA, Space Foundation — offer member discount on Pro tier
  - University space programs: Offer free Pro access to aerospace engineering departments

- [ ] **Prepare case study template:**
  - Template is already at `docs/CASE_STUDIES.md`
  - After getting first beta testers' feedback, write up 1-2 mini case studies
  - "How [Beta Tester's Company] uses SpaceNexus to track competitive intelligence"

### Day 21 (Friday, Mar 7) — Pre-Launch Analytics Check

- [ ] **Week 3 Analytics Review:**

  **Google Analytics — Check:**
  - Total users in the last 7 days
  - Top pages by pageviews
  - Bounce rate (target: under 60%)
  - Average session duration (target: over 2 minutes)
  - Top traffic sources (direct, organic, social, referral)
  - Conversion events (registrations, newsletter signups)

  **Google Search Console — Check:**
  - Total pages indexed (target: 50+ pages)
  - Total impressions and clicks
  - Average position for target keywords
  - Any crawl errors to fix
  - Mobile usability issues (fix any flagged)

  **Action items:**
  - Double down on whatever traffic source is working best
  - Fix any pages with high bounce rates
  - Optimize meta descriptions for pages getting impressions but low clicks (low CTR)

---

## Week 4 (Days 22-30): Public Launch

**Theme: "Go loud. Product Hunt. Press. Full marketing push."**

### Day 22 (Saturday, Mar 8) — Product Hunt Launch Prep

- [ ] **Prepare Product Hunt launch assets:**
  1. **Gallery images (5-6 images):**
     - Image 1: Dashboard overview (hero shot)
     - Image 2: Satellite tracker with 3D visualization
     - Image 3: Company profiles page
     - Image 4: Marketplace / AI Copilot
     - Image 5: Mobile app screenshots
     - Image 6: Pricing comparison showing free tier value
  2. **Maker's comment** (draft):
     ```
     Hey Product Hunt! 👋

     I'm [Your Name], founder of SpaceNexus.

     The space industry is a $1.8 trillion economy, but the tools available to
     professionals are either absurdly expensive (Bloomberg at $25K/year) or
     scattered across dozens of government websites.

     SpaceNexus brings it all together — for free:

     🛰️ Real-time satellite tracking (19,000+ active satellites)
     📊 Market intelligence and company profiles (200+ companies)
     🚀 Launch schedules and mission planning tools
     💼 Government procurement opportunities (SAM.gov integration)
     🤖 AI-powered insights and marketplace copilot

     The Explorer tier is completely free. Pro is $29/month for teams that
     need advanced analytics and API access.

     I'd love your feedback — what modules are most useful?
     What would you add?

     Try it: https://spacenexus.us
     ```
  3. **Recruit 5 "hunters"** — people who will upvote and comment on launch day
     - Ask beta testers, friends, LinkedIn connections
     - The more genuine comments early on, the better Product Hunt ranks you

### Day 23-24 (Sunday-Monday, Mar 9-10) — Soft Launch

- [ ] **Soft launch announcement on personal networks:**
  - LinkedIn personal post: "I built something. After [X months], SpaceNexus is live..."
  - Twitter announcement tweet + pin it
  - Email to personal contacts in aerospace
  - Post in Discord/Slack communities you've joined

- [ ] **Monitor and respond:**
  - Check for bugs reported by early visitors
  - Respond to every comment, email, and message within 2 hours
  - Fix critical bugs immediately, note non-critical issues for later

### Day 25 (Tuesday, Mar 11) — Product Hunt Launch Day

- [ ] **Launch on Product Hunt:**
  1. Schedule the launch for 12:01 AM Pacific Time (Product Hunt resets daily at midnight PT)
  2. Immediately after launch:
     - Post maker's comment
     - Share the PH link on Twitter, LinkedIn, Discord
     - Email your beta testers: "We just launched on Product Hunt — would mean the world if you could check it out and leave an honest comment"
  3. Throughout the day:
     - Respond to every Product Hunt comment within 30 minutes
     - Share updates on social media ("We're #5 on Product Hunt today!")
     - Don't ask for upvotes (against PH rules) — ask people to "check it out"
  4. Target: Top 10 product of the day (realistic with 100+ upvotes)

### Day 26 (Wednesday, Mar 12) — Press Outreach

- [ ] **Send press releases using the `/press` page content:**

  **Email template to journalists:**
  ```
  Subject: New free platform brings Bloomberg-level intelligence to the space industry

  Hi [Name],

  I wanted to share SpaceNexus, a new intelligence platform for the space
  industry that just launched. Think of it as a Bloomberg Terminal for
  aerospace — but with a free tier.

  Key stats:
  - Tracks 200+ space companies with financial and operational data
  - Real-time monitoring of 19,000+ satellites
  - Aggregates 50+ news sources and 26 data feeds
  - Integrates SAM.gov procurement data for government contractors
  - AI-powered market analysis

  We launched on Product Hunt yesterday and [reached #X].
  The platform is live at spacenexus.us.

  Happy to provide a demo, screenshots, or answer any questions.
  Press kit: https://spacenexus.us/press

  Best,
  [Your Name]
  CEO, SpaceNexus LLC
  ```

  **Send to:**
  - TechCrunch Space reporter
  - SpaceNews editor
  - PayloadSpace
  - GeekWire Space reporter
  - Ars Technica space reporter
  - Via Satellite
  - Space.com
  - The Verge (if relevant angle)

### Day 27 (Thursday, Mar 13) — Hacker News & Reddit Push

- [ ] **Post on Hacker News:**
  - Title: "Show HN: SpaceNexus – Free space industry intelligence platform"
  - Link to: https://spacenexus.us
  - Be prepared to answer technical questions (tech stack, data sources, business model)
  - HN audience loves: open data, technical depth, honest maker stories
  - Don't ask for upvotes — let it rise organically

- [ ] **Reddit launch posts** (one per subreddit, respect posting rules):
  - r/spaceindustry: "We built a free intelligence platform for the space industry"
  - r/aerospace: "SpaceNexus — satellite tracking, market data, and company profiles in one place"
  - r/SaaS: "Launched my B2B SaaS for the space industry after [X months] of building"
  - r/sideproject: "Built a Bloomberg Terminal for space — here's what I learned"
  - r/startups: "We just launched on Product Hunt — lessons learned"

### Day 28 (Friday, Mar 14) — Industry Outreach

- [ ] **Space industry conference/event prep:**
  - SATELLITE 2026 conference (March 23-26, Washington DC):
    - If budget allows: attend, even just for 1 day
    - If not: reach out to attendees on LinkedIn before the event
    - Offer free Pro trial to anyone from the conference
  - Space Symposium (usually April in Colorado Springs): start planning attendance

- [ ] **Industry association outreach:**
  - Email AIAA (American Institute of Aeronautics and Astronautics)
  - Email SIA (Satellite Industry Association)
  - Email Space Foundation
  - Offer: bulk Pro licenses at discount for their members

### Day 29 (Saturday, Mar 15) — Week 4 Analytics & Optimization

- [ ] **Comprehensive analytics review:**

  **Google Analytics deep dive:**
  - User count (target: 500+ total users by Day 30)
  - Registration conversion rate (target: 5-10% of visitors register)
  - Pages per session (target: 3+)
  - Module usage (which modules are most popular?)
  - Funnel: Homepage → Registration → Email Verified → First Module Visit

  **Search Console:**
  - Total impressions (target: 1,000+ by Day 30)
  - Average position for key terms
  - Pages getting the most search impressions

  **Product Hunt results:**
  - Final upvote count
  - Number of registrations attributed to PH (check GA referral source)

  **Business metrics:**
  - Total registered users
  - Email-verified users
  - Pro trial starts
  - Paid conversions (likely 0 at this point — that's OK)
  - NPS scores (if any have come in)

### Day 30 (Sunday, Mar 16) — Reflect & Plan Month 2

- [ ] **Write a "Month 1 Retrospective":**
  - What worked best for user acquisition?
  - What was the biggest surprise?
  - What feature got the most positive feedback?
  - What's the #1 feature request from beta testers?

- [ ] **Set Month 2 goals:**
  - User growth target (aim for 3-5x Month 1)
  - First paid conversion target
  - Content publishing cadence (2 blog posts/week)
  - Social media follower targets
  - SEO: target 500+ monthly organic sessions

---

## Account Creation Checklist

Every account you need to create, in priority order:

| # | Account | URL | Cost | Status | When |
|---|---------|-----|------|--------|------|
| 1 | Google Search Console | search.google.com/search-console | Free | ⬜ | Day 1 |
| 2 | Google Play Console | play.google.com/console | $25 one-time | ⬜ | Day 1 |
| 3 | D-U-N-S Number | developer.apple.com/enroll/duns-lookup | Free | ⬜ | Day 1 |
| 4 | Twitter/X (@SpaceNexusHQ) | x.com | Free | ⬜ | Day 2 |
| 5 | Product Hunt | producthunt.com | Free | ⬜ | Day 2 |
| 6 | Discord Server | discord.com | Free | ⬜ | Day 2 |
| 7 | UptimeRobot | uptimerobot.com | Free | ⬜ | Day 3 |
| 8 | Resend (email) | resend.com | Free (3K/mo) | ⬜ | Day 3 |
| 9 | Apple Developer Program | developer.apple.com | $99/year | ⬜ | Day 14 |
| 10 | Medium Publication | medium.com | Free | ⬜ | Day 17 |
| 11 | Crunchbase | crunchbase.com | Free | ⬜ | Day 11 |
| 12 | BetaList | betalist.com | Free | ⬜ | Day 11 |
| 13 | AlternativeTo | alternativeto.net | Free | ⬜ | Day 11 |
| 14 | SaaSHub | saashub.com | Free | ⬜ | Day 11 |
| 15 | G2 | g2.com | Free | ⬜ | Day 11 |
| 16 | Connectively/HARO | connectively.us | Free | ⬜ | Day 13 |
| 17 | Google Business Profile | business.google.com | Free | ⬜ | Day 19 |

**Total cost: $124 + $99/year = ~$223 for all accounts**

---

## Content Assets: What's Built & What to Do With Them

### Blog Posts (6 Published)

| # | Title | URL | What to Do |
|---|-------|-----|------------|
| 1 | "Why the Space Industry Needs Its Own Bloomberg Terminal" | `/blog/why-space-industry-needs-bloomberg-terminal` | Share on LinkedIn as article, use as Product Hunt maker story basis, pitch to SpaceNews |
| 2 | "The $1.8 Trillion Space Economy: Where the Money Is Going in 2026" | `/blog/space-economy-2026-where-money-is-going` | Share as LinkedIn article with data graphics, post key stats on Twitter as thread, cross-post to Medium |
| 3 | "Space Industry Procurement: How to Win Government Contracts" | `/blog/how-to-win-government-space-contracts` | Share in government contracting communities (r/govcon, GovWin, SAM.gov forums), LinkedIn targeting procurement officers |
| 4 | "Space Startup Funding in 2026: Trends, Data, and What Investors Want" | `/blog/space-startup-funding-trends-2026` | Share on LinkedIn targeting VCs and startup founders, post in r/venturecapital and r/startups |
| 5 | "Satellite Tracking Explained: How It Works and Why It Matters" | `/blog/satellite-tracking-explained-beginners-guide` | Share in satellite hobby communities, ham radio forums, educational contexts, great for SEO |
| 6 | "How to Monitor Space Weather and Why It Matters for Your Business" | `/blog/space-weather-monitoring-business-impact` | Share in aviation, telecommunications, and power grid communities where space weather matters |

**How to leverage these blog posts:**
1. **Cross-post to Medium** with canonical URL → reaches Medium's 100M monthly readers
2. **Turn each into a Twitter thread** → each post can become a 5-7 tweet thread with key takeaways
3. **Repurpose as LinkedIn carousels** → take the main data points and create a 10-slide PDF carousel
4. **Submit to relevant newsletters** → many industry newsletters accept guest submissions
5. **Use quotes as social proof** → pull the best data points for social media posts

### Pillar Guide Pages (11 Published)

| # | Guide | URL | Target Keyword |
|---|-------|-----|----------------|
| 1 | Space Industry Overview | `/guide/space-industry` | "space industry overview" |
| 2 | Space Industry Market Size | `/guide/space-industry-market-size` | "space industry market size" |
| 3 | How Satellite Tracking Works | `/guide/how-satellite-tracking-works` | "how does satellite tracking work" |
| 4 | ITAR Compliance Guide | `/guide/itar-compliance-guide` | "ITAR compliance" |
| 5 | Space Launch Cost Comparison | `/guide/space-launch-cost-comparison` | "space launch cost" |
| 6 | Commercial Space Economy | `/guide/commercial-space-economy` | "commercial space economy" |
| 7 | Space Launch Schedule 2026 | `/guide/space-launch-schedule-2026` | "space launch schedule 2026" (5-10K monthly) |
| 8 | Satellite Tracking Guide | `/guide/satellite-tracking-guide` | "satellite tracking guide" |
| 9 | Space Business Opportunities | `/guide/space-business-opportunities` | "space business opportunities" |
| 10 | Space Regulatory Compliance | `/guide/space-regulatory-compliance` | "space regulatory compliance" |
| 11 | Space Economy Investment | `/guide/space-economy-investment` | "space economy investment" |

**How to leverage guide pages:**
- These are **SEO pillar content** — they target long-tail keywords that space professionals search for
- They typically take 2-6 months to rank in Google, so patience is required
- Accelerate ranking by getting backlinks: share guide URLs when answering questions on forums/Quora/Reddit
- Each guide has FAQ schema markup → can appear as rich snippets in Google search results
- Internal linking: every guide links to relevant SpaceNexus modules → drives organic visitors deeper into the platform

### City Landing Pages (5 Published)

| City | URL | Target Keyword |
|------|-----|----------------|
| Houston, TX | `/space-industry/houston` | "space industry houston" |
| Washington, D.C. | `/space-industry/washington-dc` | "space industry washington dc" |
| Los Angeles, CA | `/space-industry/los-angeles` | "space industry los angeles" |
| Colorado Springs, CO | `/space-industry/colorado-springs` | "space industry colorado springs" |
| Cape Canaveral, FL | `/space-industry/cape-canaveral` | "space industry cape canaveral" |

**How to leverage city pages:**
- **Local SEO play** — people searching for space jobs/companies in their city
- Share each city page in local LinkedIn groups and city-specific subreddits
- Eventually: create Google Business Profile listings in each city (if you have virtual presence)
- These cross-link to company profiles of companies headquartered in each city

### Content Still Needed (Month 2+)

| Content Type | Quantity | Priority | Notes |
|-------------|----------|----------|-------|
| Blog posts (ongoing) | 2/week | High | Focus on trending space news + SpaceNexus angles |
| Case studies | 2-3 | High | From beta tester feedback |
| Video tutorials | 3-5 | Medium | "How to use [module]" for YouTube + embed on site |
| Infographics | 2-3 | Medium | Space economy data visualizations for social sharing |
| Podcast guest appearances | 2-3/month | Medium | Space industry podcasts: Main Engine Cut Off, T-Minus, Off-Nominal |
| Comparison pages | 3-5 | Medium | "SpaceNexus vs Bloomberg Terminal", "SpaceNexus vs Quilty Analytics" |

---

## Google Analytics: How to Use Your New Setup

Your GA4 property (G-6N63DLGQMJ) is live. Here's how to use it effectively.

### Daily Checks (1 minute)
1. Open https://analytics.google.com
2. Click **Reports → Realtime** → verify people are on your site right now
3. Glance at today's user count in the home overview

### Weekly Checks (10 minutes)
1. **Reports → Engagement → Pages and screens**
   - Which pages are most viewed?
   - Which have the highest engagement time?
   - Which have the highest bounce rate? (Those need improvement)

2. **Reports → Acquisition → Traffic acquisition**
   - Where are users coming from? (Organic search, direct, social, referral)
   - After launch day: track Product Hunt, Twitter, LinkedIn referrals

3. **Reports → Acquisition → User acquisition**
   - New vs returning users ratio
   - Which channels bring the most new users?

### Monthly Analysis (30 minutes)

1. **Set up Conversions (do this once):**
   - Go to Admin → Events → find `sign_up` event → mark as conversion
   - Go to Admin → Events → find `purchase` event → mark as conversion
   - Now you can track registration and payment conversions by traffic source

2. **Check Search Console integration:**
   - In GA4, go to Admin → Product links → Search Console → Link
   - This lets you see search query data directly in GA4

3. **Build a custom dashboard:**
   - Widgets to track: Users, Sessions, Registrations, Top Pages, Traffic Sources, Bounce Rate
   - Set comparison to previous period to see growth

### Key Metrics to Track

| Metric | Target (Day 30) | Target (Day 90) | Where to Find |
|--------|-----------------|------------------|---------------|
| Total Users | 500 | 5,000 | GA4 → Home |
| Registered Users | 50 | 500 | Database query |
| Daily Active Users | 20 | 200 | GA4 → Home |
| Avg Session Duration | 2+ min | 3+ min | GA4 → Engagement |
| Pages per Session | 3+ | 4+ | GA4 → Engagement |
| Bounce Rate | <60% | <50% | GA4 → Engagement |
| Organic Search Traffic | Any | 500/month | GA4 → Acquisition |
| Registration Rate | 5% of visitors | 8% of visitors | Calculated |
| Pro Trial Starts | 1-5 | 30-50 | Stripe Dashboard |
| Paid Conversions | 0-1 | 10-20 | Stripe Dashboard |

### Setting Up GA4 Explorations (Advanced)

For deeper analysis, use GA4's "Explore" feature:

1. **Registration Funnel:**
   - Steps: Page view → Sign up click → Registration complete → Email verified → First module visit
   - Shows you where people drop off

2. **Module Popularity:**
   - Dimension: Page path
   - Metric: Active users, Engagement time
   - Filter: Only `/mission-control`, `/news`, `/satellites`, etc.
   - Shows which modules retain users

3. **Content Performance:**
   - Dimension: Page path (filter to `/blog/*` and `/guide/*`)
   - Metrics: Users, Avg engagement time, Bounce rate
   - Shows which content drives the most engaged traffic

---

## App Store Launch Plans

### Google Play Store

**Status:** AAB built and signed, ready for upload on Day 5.

**Listing Content** (from `android-twa/PLAY-STORE-LISTING.md`):
- App Name: "SpaceNexus - Space Industry Intelligence"
- Category: Business
- Rating: Everyone
- Price: Free
- In-App Purchases: Yes (Pro/Enterprise subscriptions)

**Post-Launch Checklist:**
- [ ] Respond to all reviews within 24 hours
- [ ] Monitor crash reports in Play Console → Vitals
- [ ] Update screenshots if UI changes significantly
- [ ] Create a "What's New" release note for each update
- [ ] Target: 100 installs in first month, 4.0+ star rating

**ASO (App Store Optimization):**
- Primary keywords in title: "Space Industry Intelligence"
- Secondary keywords in description: satellite tracking, space news, launch schedule, market data
- Screenshots should show key features with text overlays
- Feature graphic (1024x500) should be visually striking with SpaceNexus branding

### Apple App Store

**Status:** Capacitor configured, native features coded, awaiting Mac build.

**Timeline:**
- Day 1: Request D-U-N-S number (5-7 business days)
- Day 14: Enroll in Apple Developer Program ($99/year)
- Day 16: Build iOS app on Mac, submit to App Store Connect
- Day 19-23: Apple review (1-7 days)
- Day 23+: App live on App Store

**App Store Listing:**
- App Name: "SpaceNexus - Space Industry Intel" (30 char limit is tighter than Play)
- Subtitle: "Launches, Satellites & Market Data"
- Category: Business (Primary), Reference (Secondary)
- Price: Free
- In-App Purchases: Pro ($29/mo), Enterprise ($99/mo)

**Apple-Specific Requirements:**
- Privacy Nutrition Labels: Must accurately describe all data collection
- App Privacy Policy URL: `https://spacenexus.us/privacy`
- Account deletion: Already implemented at `/account`
- No placeholder content: All modules must show real data or graceful empty states
- Native features required (Guideline 4.2): Push notifications, Face ID, haptics, native share — all already coded

**Screenshots needed (generate with `scripts/generate-apple-store-screenshots.ts`):**
- 6 iPhone screenshots (6.9" — iPhone 16 Pro Max: 1320x2868)
- 2 iPad screenshots (13" iPad Pro: 2064x2752)
- Each with device frame, feature text overlay, and actual app content

---

## Marketing Execution Plan

### Product Hunt Launch (Day 25)

**Pre-Launch (Days 1-24):**
1. Create "Coming Soon" page (Day 2)
2. Get 50+ subscribers on the Coming Soon page
3. Engage on Product Hunt: upvote and comment on other products daily
4. Build relationships with Product Hunt community members

**Launch Day (Day 25):**
1. Launch at 12:01 AM Pacific
2. Post maker's comment immediately
3. Share on all social channels
4. Email beta testers asking them to check it out
5. Monitor and respond to all comments
6. Target: Top 10 of the day (100+ upvotes)

**Post-Launch (Days 26-30):**
1. Share results on social media
2. Write a "What we learned launching on Product Hunt" blog post
3. Thank everyone who supported

### LinkedIn B2B Strategy

**Organic (Free):**
- Post 3-5x per week on company page
- Post 2-3x per week from personal account (founder posts get more engagement)
- Content mix: 40% industry insights, 30% product features, 20% company building, 10% engagement questions

**Paid (Month 2+, when budget allows):**
- LinkedIn Ads targeting:
  - Job titles: VP Strategy, Director BD, Program Manager, CTO, Analyst
  - Industries: Aviation & Aerospace, Defense & Space, Satellite Communications
  - Companies: SpaceX, Rocket Lab, L3Harris, Northrop Grumman, Planet Labs, Maxar, etc.
  - Company size: 50-10,000 employees
- Budget: Start at $500/month, scale what works
- Ad format: Sponsored content (blog posts and feature announcements)

### Conference Strategy

| Conference | Date | Location | Action |
|-----------|------|----------|--------|
| SATELLITE 2026 | Mar 23-26 | Washington, DC | Attend if possible, network, offer Pro trials |
| Space Symposium | Apr 7-10 | Colorado Springs, CO | Attend, showcase at startup row |
| SmallSat | Aug 2026 | Logan, UT | Submit to present |
| IAC 2026 | Oct 2026 | Milan, Italy | Long-term goal |

---

## Email Marketing Plan

### Automated Sequences (Already Built)

**Welcome Drip (6 emails over 14 days):**
| Day | Subject | Purpose |
|-----|---------|---------|
| 0 | "Welcome to SpaceNexus" | First steps: 3 things to try |
| 1 | "Never miss a launch" | Feature tour: launch dashboard |
| 3 | "200+ space companies at your fingertips" | Company profiles deep dive |
| 5 | "3 features most users discover on week 2" | Market Intel, Procurement, Compliance |
| 10 | "Unlock AI insights with Pro" | Upsell: Pro features comparison |
| 14 | "How's SpaceNexus working for you?" | NPS survey (0-10 score) |

These trigger automatically for new verified users via `/api/drip/process`. Set up a cron job to call this endpoint daily:
- In Railway, add a cron service or use an external cron (cron-job.org, free):
  - URL: `https://spacenexus.us/api/drip/process`
  - Method: POST
  - Header: `Authorization: Bearer YOUR_CRON_SECRET`
  - Schedule: Daily at 10:00 AM Eastern

### Manual Email Campaigns (To Send)

**Campaign 1: Launch Announcement (Day 23-24)**
- To: All newsletter subscribers
- Template: "Launch Announcement" (already built)
- Subject: "SpaceNexus is live — your space industry command center"

**Campaign 2: Product Hunt Day (Day 25)**
- To: All registered users + newsletter subscribers
- Subject: "We launched on Product Hunt today"
- CTA: "Check us out and let us know what you think"

**Campaign 3: Weekly Newsletter (Starting Week 3)**
- Template: "Space Intel Brief" (already built)
- Frequency: Weekly (every Tuesday)
- Content: Top space news, new features, data highlights
- Automate: Set up in Resend with weekly schedule

### Email List Growth Tactics
1. Blog post opt-ins: "Subscribe for weekly space industry insights"
2. Guide page gated content: "Download the full report" (requires email)
3. Product Hunt Coming Soon page subscribers
4. Conference/event email collection
5. Target: 500 subscribers by Day 30, 2,000 by Day 90

---

## SEO Execution Plan

### Technical SEO (Already Done)
- [x] Sitemap at `/sitemap.xml` with 90+ URLs
- [x] robots.txt allows all crawlers
- [x] JSON-LD structured data on key pages
- [x] Canonical URLs configured
- [x] Mobile-responsive design
- [x] HTTPS everywhere
- [x] Page load speed optimized (Next.js static generation + CDN)
- [x] www → non-www redirect (301)

### Content SEO (Ongoing)

**Month 1 content targets:**
- 6 blog posts (done)
- 11 guide pages (done)
- 5 city pages (done)
- Request indexing for all pages in Search Console

**Month 2 content targets:**
- 8 more blog posts (2 per week)
- 3 more city pages (Huntsville AL, Tucson AZ, Seattle WA)
- 5 "SpaceNexus vs X" comparison pages
- 3 case studies from beta testers

**Keyword Targets (ranked by monthly search volume):**

| Keyword | Volume | Difficulty | Current Page |
|---------|--------|------------|-------------|
| "space launch schedule 2026" | 5,000-10,000 | Medium | `/guide/space-launch-schedule-2026` |
| "satellite tracking" | 10,000+ | High | `/guide/satellite-tracking-guide` |
| "space industry market size" | 2,000-5,000 | Medium | `/guide/space-industry-market-size` |
| "ITAR compliance" | 1,000-2,000 | Medium | `/guide/itar-compliance-guide` |
| "space launch cost" | 1,000-2,000 | Low | `/guide/space-launch-cost-comparison` |
| "space economy" | 2,000-5,000 | Medium | `/guide/commercial-space-economy` |
| "space business opportunities" | 500-1,000 | Low | `/guide/space-business-opportunities` |
| "space industry houston" | 200-500 | Low | `/space-industry/houston` |
| "space companies" | 5,000+ | High | `/company-profiles` |

### Link Building Strategy

**Month 1 (5-10 backlinks):**
1. Startup directories (Day 11): 10+ directory listings
2. HARO/Connectively responses (Day 13+): 2-3 journalist mentions
3. Space industry blog outreach (Day 13): 1-2 mentions or guest posts
4. Reddit/HN/PH (Days 10, 25, 27): organic backlinks from discussions

**Month 2-3 (20-50 backlinks):**
5. Guest posts on space industry blogs
6. Data-driven content that people want to cite ("State of the Space Economy 2026")
7. Tool/resource page listings ("best space industry tools")
8. University aerospace program links (partner with programs, get .edu backlinks)

---

## Social Media Execution Plan

### Twitter/X

**Posting cadence:** 1-2 tweets/day

**Content calendar (repeating weekly):**
| Day | Content Type | Example |
|-----|-------------|---------|
| Monday | Space news reaction | "SpaceX just launched Starship for the Xth time. Track all launches at spacenexus.us/launch" |
| Tuesday | Data insight | "There are 19,127 active satellites in orbit. The top operators: SpaceX (6,371), OneWeb (634), Planet (200)..." |
| Wednesday | Feature spotlight | Screenshot of a module with brief explanation |
| Thursday | Blog post share | Link to a blog post or guide |
| Friday | Community/behind-the-scenes | "This week we added X feature based on user feedback" |
| Weekend | Engagement | Space trivia, polls, questions |

### LinkedIn

**Posting cadence:** 3-5 posts/week

**Content mix:**
- 40% Industry analysis (space economy data, market trends)
- 30% Product updates (new features, milestones)
- 20% Building in public (lessons learned, challenges, growth metrics)
- 10% Engagement (questions, polls, discussions)

**Post format that works on LinkedIn:**
```
[Hook line — provocative or data-driven]

[3-5 bullet points or short paragraphs]

[CTA: "What do you think?" or "Try it free at spacenexus.us"]

#SpaceIndustry #Aerospace #SaaS #SpaceTech
```

### Discord

**Purpose:** Community building, beta testing, feature feedback
**Target:** 50 members by Day 30, 500 by Day 90
**Channels:** #announcements, #general, #feature-requests, #bugs, #space-news

---

## Advertising & Revenue Plan

### Revenue Streams

| Stream | Status | Month 1 Target | Month 3 Target |
|--------|--------|----------------|----------------|
| Pro Subscriptions ($29/mo) | Ready | $0-29 | $290-870 |
| Enterprise Subscriptions ($99/mo) | Ready | $0 | $99-297 |
| Google AdSense | Needs setup (see `docs/ADSENSE.md`) | $0-10 | $50-200 |
| Direct Sponsorship Ads | Infrastructure ready | $0 | $500-2,000 |
| API Access (Enterprise) | Ready | $0 | $99-297 |
| **Total** | | **$0-39** | **$1,038-3,664** |

### AdSense Activation (see `docs/ADSENSE.md` for full guide)
1. Apply at adsense.google.com (Day 1-3)
2. Wait for approval (1-14 days)
3. Set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` env var in Railway
4. Ads automatically appear on 8 pages
5. Revenue starts immediately (but small at low traffic)

### When to Pursue Direct Sponsors (Month 3+)
- Reach 5,000+ monthly users first
- Target aerospace companies with marketing budgets:
  - Launch service providers (SpaceX, Rocket Lab, ULA)
  - Satellite operators (Planet, Maxar, BlackSky)
  - Defense contractors (Northrop, L3Harris, Raytheon)
  - Space startups raising funding (want visibility)
- Use the `/advertise` page as the self-service entry point
- Pricing: $25 CPM (banners), $40 CPM (native), $500 (sponsored articles)

---

## Beta Testing Plan

### Recruitment (Day 10)
- Target: 50 beta testers
- Sources: LinkedIn (20), Reddit (15), Slack/Discord (10), HN (5)

### Testing Protocol
1. **Onboarding test:** Can they register, verify email, and navigate to Mission Control without getting stuck?
2. **Feature discovery:** Ask them to explore 3 modules and report what they find
3. **Pain point identification:** What's confusing? What's broken? What's missing?
4. **Value assessment:** "Would you use this weekly?" "Would you pay $29/month?"

### Feedback Collection
- **Survey** (Google Forms or Typeform): 5 questions, takes 3 minutes
  1. How useful is SpaceNexus on a scale of 1-10?
  2. What's the single most valuable feature?
  3. What was confusing or didn't work?
  4. Would you recommend this to a colleague? (Yes/No/Maybe)
  5. Would you pay $29/month for Pro features? (Yes/No/At a different price)
- **In-app NPS survey:** Already built, triggers after 14 days
- **Discord channel:** #bugs and #feature-requests for ongoing feedback
- **Direct conversations:** Schedule 15-minute calls with 5-10 most engaged testers

### Success Criteria
- Average usefulness score: 7+/10
- NPS score: 30+ (30% promoters minus detractors)
- 60%+ would recommend to a colleague
- 20%+ would consider paying for Pro

---

## 30-Day Metrics Dashboard

Track these numbers daily/weekly:

| Metric | Day 7 | Day 14 | Day 21 | Day 30 |
|--------|-------|--------|--------|--------|
| Site visitors (GA4) | 50 | 200 | 500 | 1,000+ |
| Registered users | 5 | 20 | 50 | 100+ |
| Email subscribers | 10 | 30 | 75 | 200+ |
| Google indexed pages | 20 | 50 | 70 | 90+ |
| Twitter followers | 10 | 30 | 75 | 200+ |
| LinkedIn followers | 20 | 50 | 100 | 250+ |
| Discord members | 5 | 15 | 30 | 50+ |
| Product Hunt upvotes | — | — | — | 100+ |
| Play Store installs | — | 10 | 30 | 100+ |
| App Store installs | — | — | — | 50+ |
| Pro trial starts | 0 | 0 | 2 | 5+ |
| Paid conversions | 0 | 0 | 0 | 1+ |
| Blog post views | 20 | 100 | 300 | 500+ |
| Revenue | $0 | $0 | $0 | $0-29 |

**Reality check:** Month 1 revenue will likely be $0. That's normal. The goal is users and validation, not revenue. Revenue comes in Month 2-3 as the user base grows and converts.

---

## Budget Summary

### Required Spend (Month 1)

| Item | Cost | When |
|------|------|------|
| Google Play Developer Account | $25 | Day 1 |
| Apple Developer Program | $99/year | Day 14 |
| Railway hosting | ~$20/month | Ongoing |
| Domain renewal (spacenexus.us) | ~$12/year | Already paid |
| **Total Required** | **~$156** | |

### Optional Spend (Month 1)

| Item | Cost | When | ROI |
|------|------|------|-----|
| Cloud Mac for iOS build | $50-100 | Day 16 | Required for App Store |
| LinkedIn Premium | $60/month | Day 2 | Better outreach/search |
| Loom Pro (video) | $15/month | Day 8 | Nicer demo videos |
| SATELLITE 2026 ticket | $500-1,500 | Day 28 | Networking/leads |
| LinkedIn Ads | $500/month | Month 2 | User acquisition |
| **Total Optional** | **$1,125-2,175** | | |

### Total Month 1 Budget
- **Minimum (just launch):** $156
- **Recommended:** $300-500
- **Full marketing push:** $1,500-2,000

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Google Play rejection | Low | Medium | TWA is straightforward; follow all policies. Resubmit if rejected. |
| Apple App Store rejection (4.2 — minimal functionality) | Medium | High | Native features already coded (push, biometrics, haptics). If rejected, add more native features. |
| AdSense rejection (insufficient traffic) | Medium | Low | Apply early, reapply after building traffic. Not critical for Month 1. |
| Low user acquisition | Medium | High | Diversify channels: SEO, social, directories, Reddit, HN, PH. Don't rely on one channel. |
| D-U-N-S number delayed | Low | Medium | Apply Day 1 to buffer. Can do iOS build later if delayed. |
| Railway outage | Low | High | UptimeRobot alerts, Railway has good uptime SLA. |
| Stripe account restriction | Low | High | Complete all verifications early. Don't process suspicious transactions. |
| Negative Product Hunt reception | Low | Medium | Test thoroughly before launch. Have genuine first users with positive experience. |
| Competitor launches similar product | Low | Medium | Focus on unique value: free tier, breadth of modules, AI copilot. Move fast. |
| Zero paid conversions in Month 1 | High | Low | Expected. Focus on free users and engagement first. Conversions come later. |

---

## Day-by-Day Execution Calendar

### Week 1: Foundation
| Day | Date | Focus | Key Actions |
|-----|------|-------|-------------|
| 1 | Feb 15 (Sat) | Accounts | Google Search Console, Play Console ($25), D-U-N-S request |
| 2 | Feb 16 (Sun) | Social | Twitter/X account, LinkedIn optimization, Product Hunt Coming Soon, Discord |
| 3 | Feb 17 (Mon) | Tools | UptimeRobot, Resend email, verify Railway env vars |
| 4 | Feb 18 (Tue) | Payments | Stripe live mode, create products, test payment flow |
| 5 | Feb 19 (Wed) | Android | Upload AAB to Google Play Console, complete listing |
| 6 | Feb 20 (Thu) | SEO | Request indexing for 20 key pages in Search Console |
| 7 | Feb 21 (Fri) | QA | Full site walkthrough, cross-browser testing, Lighthouse audit |

### Week 2: Content & Community
| Day | Date | Focus | Key Actions |
|-----|------|-------|-------------|
| 8 | Feb 22 (Sat) | Video | Record 3-min demo video, upload to YouTube |
| 9 | Feb 23 (Sun) | Content | Draft 7 LinkedIn launch week posts |
| 10 | Feb 24 (Mon) | Beta | Recruit 50 beta testers (LinkedIn, Reddit, Slack, HN) |
| 11 | Feb 25 (Tue) | Directories | Submit to 12+ startup directories |
| 12 | Feb 26 (Wed) | Email | Set up cron for drip emails, prepare launch announcement email |
| 13 | Feb 27 (Thu) | Outreach | HARO signup, email 10 space industry journalists/bloggers |
| 14 | Feb 28 (Fri) | Apple | Enroll in Apple Developer Program ($99), first analytics review |

### Week 3: App Stores & Distribution
| Day | Date | Focus | Key Actions |
|-----|------|-------|-------------|
| 15 | Mar 1 (Sat) | Android | Verify Play Store app is approved, download and test |
| 16 | Mar 2 (Sun) | iOS | Build iOS app on Mac, submit to App Store Connect |
| 17 | Mar 3 (Mon) | Content | Distribute all 6 blog posts across LinkedIn, Twitter, Medium, Reddit |
| 18 | Mar 4 (Tue) | Social | Begin daily Twitter posting cadence, engage with industry accounts |
| 19 | Mar 5 (Wed) | SEO | Submit guides to aggregators, create Google Business Profile |
| 20 | Mar 6 (Thu) | Partners | Outreach to integration partners, industry associations |
| 21 | Mar 7 (Fri) | Analytics | Week 3 analytics review, optimize based on data |

### Week 4: Public Launch
| Day | Date | Focus | Key Actions |
|-----|------|-------|-------------|
| 22 | Mar 8 (Sat) | PH Prep | Prepare Product Hunt assets, recruit 5 supporters |
| 23 | Mar 9 (Sun) | Soft Launch | Personal network announcements (LinkedIn, Twitter, email) |
| 24 | Mar 10 (Mon) | Soft Launch | Monitor feedback, fix bugs, respond to everything |
| 25 | Mar 11 (Tue) | **PRODUCT HUNT** | Launch at 12:01AM PT, all-day engagement |
| 26 | Mar 12 (Wed) | Press | Email journalists, share PH results |
| 27 | Mar 13 (Thu) | HN/Reddit | Post on Hacker News and Reddit, engage all day |
| 28 | Mar 14 (Fri) | Industry | Conference prep, association outreach |
| 29 | Mar 15 (Sat) | Analytics | Comprehensive analytics review, Month 1 metrics |
| 30 | Mar 16 (Sun) | Planning | Write retrospective, set Month 2 goals |

---

## Final Notes

**The single most important thing:** Get real users using the product and talking to them. Everything else — SEO, ads, social media — is amplification. But the signal has to exist first.

**In 30 days, success looks like:**
- 100+ registered users who chose to sign up
- 50+ users who returned more than once
- 10+ users who gave you direct feedback
- 1+ person who said "I'd pay for this"
- A clear picture of which modules people actually use
- App live on Google Play (and hopefully App Store)
- First organic search traffic appearing in Google Analytics

**What doesn't matter yet:**
- Revenue (it'll come)
- Thousands of users (you need 100 good ones first)
- Perfect product (ship, learn, iterate)
- Viral growth (sustainable > viral)

The product is built. The content is published. The infrastructure is ready. Now go find your first 100 users and make them love it.

— Claude, Acting CEO
