# Google Play Store Marketing & Launch Plan -- SpaceNexus

**Package ID:** `com.spacenexus.app`
**App Type:** TWA (Trusted Web Activity) wrapping PWA at https://spacenexus.us
**Model:** Freemium (Free tier + Pro $29/mo + Enterprise $99/mo)
**Target Launch:** Q1 2026
**Document Version:** 1.0 | February 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Pre-Launch Preparation](#2-pre-launch-preparation)
3. [App Store Optimization (ASO)](#3-app-store-optimization-aso)
4. [Launch Strategy](#4-launch-strategy)
5. [Play Store SEO](#5-play-store-seo)
6. [User Acquisition](#6-user-acquisition)
7. [Rating & Review Management](#7-rating--review-management)
8. [Retention & Engagement](#8-retention--engagement)
9. [Monetization on Play Store](#9-monetization-on-play-store)
10. [Analytics & KPIs](#10-analytics--kpis)
11. [Competitive Analysis](#11-competitive-analysis)
12. [Getting Featured](#12-getting-featured)
13. [Timeline & Milestones](#13-timeline--milestones)
14. [Budget Recommendations](#14-budget-recommendations)
15. [Progress Tracking](#15-progress-tracking)

---

## 1. Executive Summary

SpaceNexus is a comprehensive space industry intelligence platform serving aerospace engineers, defense contractors, investors, startup founders, and space enthusiasts. The Android app is a TWA wrapper of the existing production PWA at https://spacenexus.us, giving us the advantage of a single codebase while gaining full Play Store distribution, discoverability, and monetization capabilities.

**Why Google Play now:**
- 3.5+ billion active Android devices globally represent untapped market potential
- B2B/professional apps on Play Store face less competition than consumer apps, making featuring more achievable
- The space industry is growing at 7.5% CAGR through 2030, and no single dominant "Bloomberg terminal for space" exists on Android
- TWA architecture means zero additional app development cost -- all improvements to the PWA automatically ship to Android users
- Google Play Billing integration via the Digital Goods API enables subscription revenue with 15% commission (first $1M/year) vs. Stripe's 2.9%+30c

**Key objectives for months 1-6:**
- 5,000+ installs in the first 90 days
- 4.5+ star average rating within the first 60 days
- 500+ paying Pro subscribers by month 6
- Top 10 ranking for "space industry news" and "satellite tracker" keywords
- Play Store editorial feature within the first 6 months

**Competitive advantage:** SpaceNexus is not a single-purpose satellite tracker or a news aggregator. It is the only app combining 200+ company profiles, AI-powered market intelligence (Claude Sonnet), launch tracking, satellite monitoring, procurement intelligence (SAM.gov/SBIR), regulatory compliance data, and a B2B marketplace -- all in one platform. No competitor on Play Store offers this breadth.

---

## 2. Pre-Launch Preparation

### 2.1 Developer Account Setup Checklist

| Step | Action | Details |
|------|--------|---------|
| 1 | Register Google Play Developer account | $25 one-time fee at https://play.google.com/console/signup |
| 2 | Register as Organization (not Individual) | Select "Organization" -- this unlocks team management, provides trust signals, and is required for some featuring |
| 3 | Verify identity | Government-issued ID + address verification (takes 2-5 business days) |
| 4 | Set up payments profile | Link business bank account for receiving payouts (Google pays net-30) |
| 5 | Enable Google Play Billing | Navigate to Monetization > Products > Subscriptions; required for in-app subscriptions |
| 6 | Add team members | Settings > Developer account > Users & permissions; add developer, marketing, support roles |
| 7 | Set up Play Console API access | For automated deployment from CI/CD (Railway); enable Publishing API |
| 8 | Create service account | For Fastlane or custom deployment scripts; grant "Release manager" role |
| 9 | Set up internal testing track | Create internal test group with team members for pre-launch QA |
| 10 | Configure app signing | Enroll in Google Play App Signing (required since August 2021); store upload key securely |

### 2.2 Content Rating (IARC) Questionnaire Guidance

The IARC questionnaire determines the age rating for your app. For SpaceNexus:

**Key answers for our content type:**
- **Violence:** None (we display news content but no graphic/violent imagery)
- **Sexual content:** None
- **Language:** None (professional/business content)
- **Controlled substances:** None
- **User-generated content:** Yes -- marketplace listings, user reviews; select "Users can interact" and "Content is moderated"
- **Data sharing:** Yes -- select that user data is collected (analytics, account info)
- **In-app purchases:** Yes
- **Ads:** Yes (we display non-intrusive ad slots)
- **Location data:** Yes (for nearby launch sites, ground stations, spaceports)

**Expected rating:** PEGI 3 / ESRB Everyone / USK 0 -- professional business app with no objectionable content.

**Action items:**
- Complete the questionnaire honestly -- misrepresentation can result in app removal
- Save the IARC certificate for records
- Re-complete the questionnaire if significant features change (e.g., adding a chat/social feature)

### 2.3 Store Listing Asset Requirements

#### App Icon
| Specification | Requirement |
|---------------|-------------|
| Size | 512 x 512 px |
| Format | 32-bit PNG (with alpha) |
| File size | Up to 1 MB |
| Shape | Full bleed square; Google applies adaptive masking (circle, squircle, rounded square) |
| Guidelines | No badges, no text overlays, avoid thin borders, use vibrant colors that stand out on both light/dark backgrounds |

**SpaceNexus icon design:** Use the existing SpaceNexus logo (stylized "S" with orbital ring motif) on a deep space gradient background (dark navy #0B1026 to space blue #1a237e). Ensure the icon is legible at 48x48dp and works with Google's adaptive icon masking. Test the icon at multiple sizes: 16px (favicon), 48px (app drawer), 96px (settings), 512px (Play Store).

#### Feature Graphic (REQUIRED)
| Specification | Requirement |
|---------------|-------------|
| Size | 1024 x 500 px |
| Format | JPEG or 24-bit PNG (no alpha/transparency) |
| File size | Up to 15 MB |
| Safe zone | Keep critical text/visuals in center 924 x 400 px area |

**Design guidelines for SpaceNexus feature graphic:**
- Show a dramatic space backdrop (Earth from orbit, rocket launch, or satellite constellation)
- Include tagline: "The Intelligence Platform for the Space Industry"
- Avoid duplicating the app icon prominently (it appears alongside the graphic)
- Use vibrant colors -- avoid pure white or dark gray (blends with Play Store background)
- Include 2-3 small UI screenshots composited to show the app in action
- Do NOT include pricing or time-sensitive promotions

#### Screenshots
| Device Type | Min Count | Recommended | Size | Aspect Ratio |
|-------------|-----------|-------------|------|--------------|
| Phone | 2 (min) | 8 (max) | Min 1080 x 1920 px | 9:16 portrait |
| 7" Tablet | 0 | 8 | Min 1080 x 1920 px | 9:16 or 16:9 |
| 10" Tablet | 0 | 8 | Min 1080 x 1920 px | 9:16 or 16:9 |
| Chromebook | 0 | 8 | Min 1080 x 1920 px | 16:9 |

**Screenshot specifications:**
- Format: JPEG or 24-bit PNG (no alpha)
- Max file size: 8 MB each
- Maximum dimension cannot exceed 2x the minimum dimension
- Must have at least 4 screenshots at 1080px+ resolution to be eligible for Play Store recommendations

#### Promo Video
| Specification | Requirement |
|---------------|-------------|
| Format | YouTube video URL (public or unlisted) |
| Length | 30 seconds to 2 minutes recommended |
| Orientation | Landscape preferred |
| Content | App functionality demo, not a cinematic ad |
| Autoplay | First 30 seconds autoplay muted in Play Store |

### 2.4 Screenshot Strategy -- Which Screens to Showcase

Order matters. The first 3 screenshots appear in search results and are the most critical for conversion.

**Recommended 8-screenshot sequence:**

| Order | Screen | Caption/Annotation | Why |
|-------|--------|---------------------|-----|
| 1 | Mission Control Dashboard | "Real-Time Space Industry Intelligence" | Hero shot -- shows comprehensive data at a glance, establishes credibility |
| 2 | Launch Countdown + Upcoming Launches | "Never Miss a Launch -- Live Countdowns & Alerts" | Highest-interest feature for both pros and enthusiasts |
| 3 | Company Profiles Directory | "200+ Space Company Profiles & Analytics" | Unique differentiator -- no competitor has this |
| 4 | AI Insights Panel (Claude-powered) | "AI-Powered Market Intelligence" | Cutting-edge feature, trending keyword |
| 5 | Satellite Tracker (3D Globe) | "Track 19,000+ Satellites in Real Time" | Visual showstopper, competes with dedicated tracker apps |
| 6 | Marketplace / Business Opportunities | "Space Industry Marketplace & Procurement" | B2B value proposition |
| 7 | News Feed with Company Tags | "Aggregated Space News from 50+ Sources" | Content breadth |
| 8 | Space Weather + Debris Tracking | "Space Environment Monitoring & Alerts" | Unique operational value |

**Screenshot design guidelines:**
- Use device frames (Pixel 8 Pro recommended for modern look)
- Add concise annotation text above or below each screenshot (max 5-7 words)
- Use consistent brand colors (space blue palette)
- Ensure text is legible at thumbnail size in search results
- A/B test screenshot order using Play Store Listing Experiments

### 2.5 Feature Graphic Design Guidelines

The feature graphic appears at the top of the store listing on phones and is the first visual users see.

**Design composition for SpaceNexus:**
```
+-----------------------------------------------------+
|                                                     |
|   [Left side: App UI mockup showing dashboard]      |
|                                                     |
|        "The Intelligence Platform                   |
|         for the Space Industry"                     |
|                                                     |
|   [Right side: Subtle space imagery -- stars,       |
|    orbital paths, or Earth curvature]               |
|                                                     |
+-----------------------------------------------------+
```

**Color palette:** Deep navy (#0B1026) background with accent blue (#2196F3) and white text. Avoid green (associated with finance apps) and red (associated with warnings).

**Tools to create:**
- Figma (free) -- use Play Store feature graphic template
- Canva Pro -- has pre-sized Play Store templates
- Adobe Illustrator -- for professional results

### 2.6 Promo Video Recommendations

**30-second promo video storyboard:**

| Timestamp | Visual | Voiceover/Text |
|-----------|--------|----------------|
| 0-3s | SpaceNexus logo animation on starfield | "SpaceNexus" |
| 3-8s | Dashboard overview with data flowing in | "The command center for the space industry" |
| 8-13s | Launch countdown ticking + rocket footage | "Track every launch in real time" |
| 13-18s | Scrolling through company profiles | "200+ company profiles. AI-powered insights." |
| 18-23s | Satellite tracker 3D globe spinning | "Monitor 19,000+ satellites" |
| 23-27s | Marketplace + procurement intel | "Find contracts. Close deals." |
| 27-30s | App icon + "Download Free on Google Play" | CTA overlay |

**Production tips:**
- Record screen captures at 60fps for smooth scrolling
- Add subtle motion graphics (orbital paths, data visualizations)
- Use royalty-free space footage from NASA (public domain) for B-roll
- Background music: ambient electronic (suggest Epidemic Sound or Artlist subscription)
- Upload to YouTube as unlisted; link in Play Console

### 2.7 Privacy Policy Requirements

Google Play requires a privacy policy URL that is:
- Publicly accessible (not behind a login)
- Specific to the app (not a generic corporate policy)
- Accurate about data collection practices
- Compliant with GDPR, CCPA, and other regional regulations

**SpaceNexus must disclose:**
- Account data collected (email, name, company, role)
- Analytics data (Firebase Analytics, usage patterns)
- Location data (if used for nearby spaceports/ground stations)
- Third-party SDKs and their data practices (Firebase, Stripe, any ad networks)
- Data retention and deletion policies
- Contact information for privacy inquiries

**Privacy policy URL:** `https://spacenexus.us/privacy`

**Data Safety Section (required):**
Complete the Data Safety form in Play Console declaring:
- Data types collected (name, email, usage data, device identifiers)
- Data sharing practices (analytics to Firebase, payments to Stripe)
- Security practices (encryption in transit, can request data deletion)
- Whether the app follows Google's Families policy (N/A -- not a children's app)

---

## 3. App Store Optimization (ASO) -- AGGRESSIVE

### 3.1 Title Optimization (30-Character Limit)

The title is the single most powerful ranking signal on Google Play. Every word in the title is indexed with the highest weight.

**Primary title options (ranked by keyword impact):**

| Option | Characters | Keywords Covered |
|--------|-----------|-----------------|
| `SpaceNexus: Space Industry Hub` | 31 -- TOO LONG | space, industry, hub |
| `SpaceNexus: Space Intel & News` | 31 -- TOO LONG | space, intel, news |
| `SpaceNexus - Space Industry` | 28 | space, industry |
| `SpaceNexus: Space Intel App` | 28 | space, intel, app |
| `SpaceNexus Space Intelligence` | 30 | space, intelligence |

**RECOMMENDED TITLE:** `SpaceNexus Space Intelligence`

Rationale:
- Exactly 30 characters (maximum)
- "Space" appears early for highest keyword weight
- "Intelligence" captures both "market intelligence" and "business intelligence" searches
- Brand name is first for recognition
- Avoids special characters that can cause rendering issues

### 3.2 Short Description (80-Character Limit)

The short description is indexed by Google Play and appears directly below the title. It should complement the title keywords, not repeat them.

**RECOMMENDED SHORT DESCRIPTION:**

```
Space launches, satellite tracking, market data & 200+ company profiles in one app
```
(82 chars -- needs trim)

**FINAL VERSION:**
```
Launches, satellites, market data & 200+ company profiles for space industry
```
(76 characters)

**Alternative options:**
```
Space industry intelligence: launches, satellites, news, markets & AI insights
```
(79 characters)

```
Track launches, satellites & space markets. AI insights. 200+ company profiles
```
(79 characters)

**Keyword coverage in short description:**
- launches (high-volume keyword)
- satellites (high-volume keyword)
- market data / markets (B2B keyword)
- company profiles (differentiator)
- space industry (primary keyword)
- AI insights (trending keyword)

### 3.3 Full Description Optimization (4000-Character Limit)

Google Play indexes the full description using NLP semantic analysis. The strategy is natural keyword integration, NOT keyword stuffing. Place the most important keywords in the first 1-2 lines (visible before "read more" expansion).

**RECOMMENDED FULL DESCRIPTION:**

```
SpaceNexus is the most comprehensive space industry intelligence platform on Android. Track rocket launches in real time, monitor 19,000+ satellites, follow breaking space news from 50+ sources, and access AI-powered market insights -- all in one app.

WHETHER YOU ARE AN AEROSPACE ENGINEER, DEFENSE CONTRACTOR, INVESTOR, OR SPACE ENTHUSIAST, SpaceNexus gives you the data edge you need.

REAL-TIME LAUNCH TRACKING
Track every orbital and suborbital launch worldwide with live countdowns, mission details, launch vehicle specs, and instant notifications. Never miss a SpaceX Falcon 9, ULA Vulcan Centaur, or Rocket Lab Electron launch again.

SATELLITE & SPACE OBJECT TRACKING
Monitor the positions of 19,000+ active satellites, the International Space Station, Tiangong, debris objects, and Starlink constellations on an interactive 3D globe. Get pass predictions for your location.

200+ SPACE COMPANY PROFILES
Deep-dive into profiles of SpaceX, Blue Origin, Rocket Lab, Relativity Space, Astra, Virgin Orbit, and 195+ more companies. View financials, funding rounds, launch history, satellite assets, facility locations, and competitive positioning.

AI-POWERED MARKET INTELLIGENCE
Powered by advanced AI, SpaceNexus analyzes space industry trends, generates market insights, identifies investment opportunities, and tracks the $546B global space economy in real time.

SPACE NEWS AGGREGATION
Breaking news from 50+ curated sources including SpaceNews, Ars Technica, NASASpaceflight, The Verge, Space.com, and more. AI-categorized by topic with company tagging for instant context.

BUSINESS OPPORTUNITIES & PROCUREMENT
Search active government contracts from SAM.gov, track SBIR/STTR grants, find supply chain partners, and discover business opportunities across the space industry supply chain.

REGULATORY & COMPLIANCE
Stay current on FCC spectrum filings, ITU coordination, launch licensing requirements, space debris regulations, and international space law developments.

SPACE WEATHER & ENVIRONMENT
Monitor solar flares, geomagnetic storms, Kp index, and space debris conjunctions that affect satellite operations and launch windows.

MARKETPLACE
Buy and sell space industry products and services. Post RFQs, find component suppliers, and connect with service providers.

FREE FEATURES INCLUDED:
- Mission Control dashboard
- Launch countdown tracker
- Space news feed
- Basic satellite tracking
- Space weather alerts
- Company directory

PRO SUBSCRIPTION ($29/mo):
- AI-powered insights
- Full company profiles with financials
- Advanced satellite analytics
- Procurement intelligence
- Priority notifications
- Ad-free experience

Built by space industry professionals, for space industry professionals. SpaceNexus is the Bloomberg Terminal of the space economy.

Questions? Contact us: support@spacenexus.us
Website: https://spacenexus.us
```

**Character count:** ~2,400 characters (leaves room for localized expansion)

**Keyword density analysis:**
- "space" -- 25+ occurrences (natural, not stuffed)
- "satellite" / "satellites" -- 6 occurrences
- "launch" / "launches" -- 7 occurrences
- "industry" -- 5 occurrences
- "intelligence" -- 3 occurrences
- "tracking" / "tracker" -- 4 occurrences
- "company" -- 4 occurrences
- "news" -- 3 occurrences
- "AI" -- 3 occurrences

### 3.4 Keyword Research -- Specific Target Keywords

#### Primary Keywords (High Volume, High Competition)

| Keyword | Est. Monthly Searches | Difficulty | Strategy |
|---------|----------------------|------------|----------|
| space news | 40,000+ | High | In title + description |
| satellite tracker | 30,000+ | High | In short description + description |
| space launches | 15,000+ | Medium | In description header |
| ISS tracker | 20,000+ | High | In description body |
| SpaceX | 500,000+ | Very High | In description (company name) |
| rocket launch | 25,000+ | High | In description |
| starlink tracker | 15,000+ | Medium | In description body |
| NASA | 1,000,000+ | Very High | In description (referenced) |

#### Secondary Keywords (Medium Volume, Medium Competition)

| Keyword | Est. Monthly Searches | Difficulty | Strategy |
|---------|----------------------|------------|----------|
| space industry | 5,000+ | Low | In title |
| space intelligence | 1,000+ | Very Low | In title |
| space weather | 8,000+ | Medium | In description section |
| space economy | 2,000+ | Low | In description |
| aerospace | 10,000+ | Medium | In description |
| space companies | 3,000+ | Low | In description |
| launch schedule | 5,000+ | Medium | In description |
| orbital tracking | 2,000+ | Low | In description |

#### Long-Tail Keywords (Low Volume, Low Competition -- Easy Wins)

| Keyword | Est. Monthly Searches | Difficulty | Strategy |
|---------|----------------------|------------|----------|
| space industry intelligence | 100+ | Very Low | In title (exact match) |
| space company profiles | 200+ | Very Low | In short description |
| space procurement | 100+ | Very Low | In description |
| space market data | 300+ | Very Low | In short description |
| space business opportunities | 200+ | Very Low | In description |
| satellite constellation tracker | 500+ | Low | In description |
| space supply chain | 100+ | Very Low | In description |
| FCC spectrum space | 50+ | Very Low | In description |
| space debris tracker | 1,000+ | Low | In description |
| space economy dashboard | 100+ | Very Low | In description |
| space defense intelligence | 100+ | Very Low | In description |
| rocket launch countdown | 2,000+ | Low | In description |
| space startup tracker | 200+ | Very Low | In description |

#### Competitor Keywords to Target

| Competitor App | Their Keywords to Poach |
|---------------|----------------------|
| Satellite Tracker by Star Walk | satellite tracker, satellite finder, ISS tracker, starlink |
| ISS Detector | ISS pass, space station tracker, satellite passes |
| N2YO | satellite tracking, orbital, TLE |
| Space Launch Now | launch schedule, rocket launch, launch countdown |
| Flightradar24 (tangential) | real-time tracking, flight tracker (tangential overlap) |
| NASA App | NASA, space exploration, Mars, Artemis |

**Keyword research tools to use:**
- **AppTweak** (https://apptweak.com) -- Play Store keyword volumes and difficulty
- **Sensor Tower** (https://sensortower.com) -- Competitor keyword intelligence
- **MobileAction** (https://mobileaction.co) -- ASO intelligence suite
- **Google Play Console** -- Search terms report (available post-launch)
- **KeywordTool.io** (https://keywordtool.io/play-store) -- Free Play Store keyword suggestions
- **Ahrefs** (https://ahrefs.com) -- Web search volume proxy for app keywords
- **AppFollow** (https://appfollow.io) -- Review and keyword monitoring

### 3.5 Category Selection Strategy

**Primary category:** `Business`

**Rationale:**
- SpaceNexus is fundamentally a B2B intelligence platform
- The Business category has less competition than News or Education
- Business apps command higher LTV users
- Aligns with our Pro/Enterprise pricing model
- Professional users browse this category

**Secondary category consideration:** `News & Magazines` (if Google allows dual-category in the future)

**Why NOT other categories:**
- `Education` -- too broad, saturated with children's apps
- `Tools` -- implies utility, not intelligence platform
- `News & Magazines` -- too competitive; dominated by CNN, BBC, Reuters
- `Weather` -- space weather is a feature, not the core product

### 3.6 Icon Design Best Practices

**Design principles for SpaceNexus icon:**
- Use a single, recognizable silhouette (the SpaceNexus "S" with orbital ring)
- Background: deep gradient (space blue #0D1B3E to accent blue #1565C0)
- Avoid text in the icon (illegible at small sizes)
- Use bold, simple shapes with high contrast
- Test against both light and dark launcher backgrounds
- Ensure it looks good in Google's adaptive icon masks (circle, squircle, rounded rectangle)
- No photographs or complex illustrations (too detailed at 48dp)

**Adaptive icon specs:**
- Foreground layer: 108 x 108 dp (72dp safe zone centered)
- Background layer: 108 x 108 dp
- Final output: 512 x 512 px for Play Store

**A/B test icon variants:**
- Variant A: "S" with orbital ring on gradient
- Variant B: Stylized satellite/orbit symbol on gradient
- Variant C: Rocket silhouette integrated with "S"
- Run test via Play Console Store Listing Experiments for 7-14 days

### 3.7 Screenshot Optimization

**Order optimization strategy:**
1. Lead with the highest-converting screenshot (test via experiments)
2. Show the broadest feature first (dashboard), then drill into specifics
3. End with social proof or credibility (number of companies, data sources)

**Annotation style guide:**
- Font: Bold sans-serif (Inter, SF Pro, or Roboto)
- Size: Readable at 50% thumbnail scale
- Position: Top 20% of screenshot (above device frame)
- Color: White text on semi-transparent dark overlay, or accent blue text on white
- Max 5-7 words per annotation

**A/B testing plan (Play Console Store Listing Experiments):**
- **Test 1:** Screenshot order -- Dashboard first vs. Launch Tracker first
- **Test 2:** Annotation style -- Minimal text vs. Feature callouts
- **Test 3:** Device frame -- Pixel 8 frame vs. no frame (full-bleed)
- **Test 4:** Background color -- Dark space theme vs. light/white theme
- Run each test for minimum 7 days at 95% confidence level

### 3.8 Feature Graphic Optimization

**A/B test variants:**
- Variant A: UI mockup + space imagery + tagline
- Variant B: Bold typography only ("Space Intelligence at Your Fingertips") on gradient
- Variant C: Split-screen showing 3 key features with icons

**Optimization tips:**
- The feature graphic appears with a play button overlay if a promo video is linked; keep center area clear of critical text
- Test on multiple devices (phones, tablets, Chromebooks)
- Update seasonally or for major events (Artemis missions, SpaceX milestones)

### 3.9 Promo Video Optimization

**Video SEO for YouTube (where the promo is hosted):**
- Title: "SpaceNexus - Space Industry Intelligence App | Android"
- Description: Include target keywords + Play Store link
- Tags: space app, satellite tracker, space news, space industry, launch tracker
- Thumbnail: Custom thumbnail matching feature graphic style
- Captions: Enable auto-captions + manual review for accuracy

**Play Store video behavior:**
- First 30 seconds autoplay on mute in the store listing
- Hook viewers in the first 3 seconds with dramatic visuals
- Show the app in use (not a cinematic trailer)
- End with a clear value proposition and CTA

### 3.10 Localization Strategy

**Phase 1 (Launch) -- English-dominant markets:**
| Language | Market | Rationale |
|----------|--------|-----------|
| English (US) | United States | Primary market, largest space industry |
| English (UK) | United Kingdom | ESA/UK Space Agency, strong defense sector |
| English (AU) | Australia | Growing space program, English-speaking |
| English (CA) | Canada | CSA, Telesat, MDA Space |
| English (IN) | India | ISRO, rapidly growing space program |

**Phase 2 (Month 3) -- Major space-faring nations:**
| Language | Market | Rationale |
|----------|--------|-----------|
| French (FR) | France | CNES, Arianespace, Thales Alenia |
| German (DE) | Germany | DLR, OHB, major ESA contributor |
| Japanese (JA) | Japan | JAXA, ispace, Astroscale |
| Korean (KO) | South Korea | KARI, Hanwha Systems, growing space program |
| Portuguese (BR) | Brazil | INPE, Embraer Defense, Latin America's largest |

**Phase 3 (Month 6) -- Expansion:**
| Language | Market | Rationale |
|----------|--------|-----------|
| Spanish (ES) | Spain/Latin America | ESA member, growing NewSpace |
| Italian (IT) | Italy | ASI, Leonardo, Thales Alenia Space Italy |
| Hindi (HI) | India | 500M+ Hindi speakers, ISRO enthusiasm |
| Chinese Simplified (ZH-CN) | China (if applicable) | CASC, huge market (Play Store availability varies) |
| Arabic (AR) | UAE/Saudi Arabia | UAE Space Agency, Saudi Space Commission, massive investment |

**Localization checklist per language:**
- [ ] Translate app title (with localized keyword research)
- [ ] Translate short description (with localized keywords)
- [ ] Translate full description
- [ ] Create localized screenshots with translated annotations
- [ ] Translate feature graphic tagline
- [ ] Create localized promo video subtitles
- [ ] Use Custom Store Listings for country-specific messaging

---

## 4. Launch Strategy

### 4.1 Soft Launch in Limited Markets

**Soft launch markets (2 weeks before global launch):**

| Market | Why | What to Test |
|--------|-----|-------------|
| Canada | English-speaking, smaller market, similar demographics to US | Core functionality, crash rates, load times |
| Australia | English-speaking, different timezone (tests time-based features) | Launch countdown accuracy, notification timing |
| United Kingdom | Active space industry, early adopter tech market | Subscription conversion, pricing acceptance |
| New Zealand | Small market, minimal risk, English-speaking | Edge cases, low-bandwidth performance |

**Soft launch objectives:**
- Achieve <1% crash rate (ANR rate below 0.47%)
- Validate push notification delivery across Android versions (12, 13, 14, 15)
- Test subscription purchase flow end-to-end
- Collect 50+ organic reviews before global launch
- Identify and fix top 5 user-reported issues
- Establish baseline metrics (DAU, session length, retention)

**Testing tracks:**
1. **Internal testing** (Week -4 to -3): Team members only, 10-20 testers
2. **Closed testing** (Week -3 to -2): Invite 100 beta testers from existing web users
3. **Open testing** (Week -2 to -1): Public beta in soft launch markets
4. **Production** (Week 0): Global launch

### 4.2 Pre-Registration Campaign

**Timeline:** Enable pre-registration 6 weeks before launch.

**Setup steps:**
1. Create the app in Play Console with a draft store listing
2. Set the app status to "pre-registration"
3. Publish the complete store listing (icon, feature graphic, screenshots, descriptions)
4. Set a target launch date
5. Configure pre-registration rewards (optional)

**Pre-registration reward options:**
- Exclusive "Early Adopter" badge on user profile
- 30-day free Pro trial (vs. standard 14-day)
- Access to a "Founding Members" channel for product feedback
- Priority support queue

**Driving pre-registrations:**
- Add pre-registration badge to spacenexus.us homepage with deep link
- Email all existing web users (see Section 4.7)
- Social media campaign with countdown to launch
- Google Ads App Campaign for pre-registration (see Section 6.1)
- Include pre-registration link in email signatures, LinkedIn posts, and conference materials

**Pre-registration Google Ads:**
- Campaign type: App campaign > Pre-registration
- Assets needed: Landscape image (1200x628), landscape video, portrait video, HTML5 assets
- Budget: Start at $20/day, scale based on cost-per-registration
- Targeting: Space industry interest categories + competitor app audiences

### 4.3 Launch Day Tactics

**Launch day checklist (the day of global production release):**

| Time | Action | Owner |
|------|--------|-------|
| 6:00 AM ET | Publish production release in Play Console | Dev |
| 6:30 AM ET | Verify app is live and searchable | Dev |
| 7:00 AM ET | Send launch announcement email to entire mailing list | Marketing |
| 7:30 AM ET | Publish launch blog post on spacenexus.us/blog | Marketing |
| 8:00 AM ET | Post on LinkedIn (company page + personal) | CEO/Marketing |
| 8:15 AM ET | Post on Twitter/X with launch video | Marketing |
| 8:30 AM ET | Post on Reddit (r/space, r/spacex, r/aerospace) | Marketing |
| 9:00 AM ET | Activate Google Ads campaigns | Marketing |
| 9:30 AM ET | Send press release via PR distribution | Marketing |
| 10:00 AM ET | Post on Hacker News (Show HN) | CEO |
| 12:00 PM ET | Monitor reviews and respond within 1 hour | Support |
| 3:00 PM ET | Second social media push (different time zones) | Marketing |
| 6:00 PM ET | Review Day 1 metrics, address any issues | Dev/Marketing |

**Launch day monitoring:**
- Play Console: Real-time installs, crashes, ANRs
- Firebase Crashlytics: Monitor for launch-day crashes
- Google Analytics: Track user flows, feature usage
- Social media: Monitor mentions, respond to questions
- Email: Monitor support@ for launch issues

### 4.4 Cross-Promotion with Web App

**On-site promotion for existing web users:**

| Placement | Description | Implementation |
|-----------|-------------|----------------|
| Top banner | "Now on Android! Download SpaceNexus from Google Play" smart banner | Use Smart App Banner meta tag or custom banner detecting Android UA |
| Footer | Google Play badge with download link | Persistent across all pages |
| Dashboard | "Get the mobile app" card in Mission Control | One-time dismissible card |
| Settings page | "Mobile App" section with QR code + Play Store link | Permanent section |
| Email footer | Google Play badge in all transactional emails | Add to email template |
| Login page | "Also available on Android" with Play Store badge | Below login form |

**Smart App Banner implementation:**
```html
<!-- Add to <head> of spacenexus.us -->
<meta name="google-play-app" content="app-id=com.spacenexus.app">
<link rel="manifest" href="/manifest.json">
```

**Deep linking from web to app:**
- Implement Android App Links (verified deep links)
- When Android user visits spacenexus.us, show "Open in App" prompt
- Use `intent://` URLs for fallback to Play Store if app not installed

### 4.5 Social Media Announcement Plan

**LinkedIn (primary B2B channel):**

| Post # | Timing | Content Type | Topic |
|--------|--------|-------------|-------|
| 1 | Launch day | Video + text | Launch announcement with promo video |
| 2 | Day 2 | Image carousel | "5 things you can do with SpaceNexus on Android" |
| 3 | Day 4 | Text + screenshot | User testimonial or early review highlight |
| 4 | Day 7 | Article | "Why We Built the Bloomberg Terminal for Space -- Now on Android" |
| 5 | Day 14 | Poll | "What space industry data do you check most?" |

**Twitter/X:**

| Post # | Timing | Content |
|--------|--------|---------|
| 1 | Launch day | Launch announcement + video clip + Play Store link |
| 2 | Launch day +4h | Thread: "10 features in SpaceNexus you won't find anywhere else" |
| 3 | Day 2 | GIF showing launch countdown feature |
| 4 | Day 3 | Satellite tracking 3D globe GIF |
| 5 | Day 5 | "X users downloaded SpaceNexus this week" milestone |

**Reddit:**

| Subreddit | Post Type | Title |
|-----------|-----------|-------|
| r/space (23M members) | Self-post | "I built a comprehensive space industry intelligence app -- now on Android [free]" |
| r/spacex (2.1M members) | Self-post | "Track SpaceX launches, Starlink sats, and 200+ space companies in one app" |
| r/aerospace (120K members) | Self-post | "SpaceNexus: A free intelligence platform for aerospace professionals" |
| r/SideProject (100K members) | Self-post | "After 2 years building the 'Bloomberg Terminal for Space', we just launched on Android" |
| r/androidapps (500K members) | Self-post | "SpaceNexus - comprehensive space industry tracker app (satellites, launches, news, markets)" |
| r/spaceflight (40K members) | Self-post | "Free app for tracking launches, space weather, and industry news" |

**Reddit rules to follow:**
- Do not post more than 1 self-promotional post per subreddit per week
- Engage with comments authentically for at least 24 hours
- Disclose that you are the developer
- Do not use multiple accounts for upvoting

### 4.6 Press Release

**Distribution services:**
- **PRWeb** ($99-$389 per release) -- good for SEO backlinks
- **Business Wire** ($400-$800) -- reaches trade publications
- **PR Newswire** ($350-$800) -- wide distribution, space industry verticals
- **GlobeNewswire** ($350-$600) -- good for B2B tech

**Target journalists and publications:**

| Publication | Beat Reporter | Email Pattern |
|-------------|---------------|---------------|
| SpaceNews | Staff writers | tips@spacenews.com |
| Space.com | App/Tech reviewer | tips@space.com |
| TechCrunch | Space/aerospace | tips@techcrunch.com |
| The Verge | Android apps | tips@theverge.com |
| Ars Technica | Space desk | tips@arstechnica.com |
| Payload Space | Newsletter | editor@payloadspace.com |
| Via Satellite | Industry tools | editor@viasatellite.com |
| Android Police | App reviews | tips@androidpolice.com |
| Android Authority | App reviews | contact@androidauthority.com |
| 9to5Google | Android apps | tips@9to5mac.com |

**Press release headline options:**
- "SpaceNexus Launches Android App: The First Comprehensive Space Industry Intelligence Platform for Mobile"
- "New Android App Brings Bloomberg-Style Intelligence to the $546B Space Economy"
- "SpaceNexus App Puts 200+ Space Company Profiles, Real-Time Launch Tracking, and AI Insights in Your Pocket"

### 4.7 Email to Existing Web App Users

**Email sequence (3 emails):**

**Email 1: Launch Announcement (Day 0)**
```
Subject: SpaceNexus is now on Android
Preview: Track launches, satellites, and space markets from your phone

Body:
[SpaceNexus Logo]

SpaceNexus is now available on Google Play.

Everything you use on spacenexus.us -- launch tracking, satellite monitoring,
company profiles, AI insights, and more -- now in a native Android experience
with push notifications, offline access, and one-tap launch alerts.

[Google Play Badge - Download Button]

Already a Pro subscriber? Your subscription works on mobile too.
Just sign in with your existing account.

Free users: Download now and get a 7-day Pro trial, on us.

[Download SpaceNexus on Google Play]
```

**Email 2: Feature Highlight (Day 3)**
```
Subject: 3 things SpaceNexus Android does that the web can't
Preview: Push notifications, offline mode, and instant launch alerts

Body:
The SpaceNexus Android app isn't just a mobile website.
Here's what makes it better:

1. INSTANT LAUNCH ALERTS: Get notified 24h, 1h, and 10min before
   every launch. Never miss another Falcon 9.

2. OFFLINE COMPANY PROFILES: Save company profiles for offline
   reading -- perfect for conferences and travel.

3. ONE-TAP SATELLITE TRACKING: Open the app, tap the satellite
   icon, and see what's overhead right now.

[Download on Google Play]
```

**Email 3: Social Proof (Day 7)**
```
Subject: X professionals downloaded SpaceNexus this week
Preview: Join the space industry's fastest-growing intelligence community

Body:
In just one week, X aerospace professionals downloaded SpaceNexus
on Android.

Here's what they're saying:
[Insert 2-3 early review quotes]

If you haven't tried it yet, download it free today:
[Google Play Badge]

Pro tip: Leave us a 5-star review and help other space professionals
discover SpaceNexus.
```

---

## 5. Play Store SEO

### 5.1 Keyword Strategy

**Keyword placement hierarchy (by indexing weight):**

| Field | Weight | Strategy |
|-------|--------|----------|
| App Title | Highest | Primary keywords: "Space Intelligence" |
| Short Description | High | Secondary keywords: launches, satellites, market data, company profiles |
| Full Description | Medium | Long-tail keywords distributed naturally across 2400+ characters |
| Developer Name | Low | Consider "SpaceNexus LLC" (brand reinforcement) |
| URL/Package ID | Low | com.spacenexus.app (contains "spacenexus") |

**Keyword refresh schedule:**
- Monthly: Review Play Console search terms report
- Quarterly: Full keyword audit using AppTweak or Sensor Tower
- Event-driven: Update description for major space events (Artemis, Starship flights)

**Semantic keyword clusters to cover:**

| Cluster | Keywords |
|---------|----------|
| Tracking | satellite tracker, ISS tracker, starlink tracker, orbital tracking, space station tracker |
| Launches | rocket launch, launch schedule, launch countdown, SpaceX launch, launch tracker |
| News | space news, aerospace news, space industry news, rocket news |
| Business | space industry, space economy, space market, space companies, aerospace companies |
| Weather | space weather, solar flare, geomagnetic storm, Kp index |
| Defense | space defense, space force, military space, USSF |
| Science | space exploration, Mars, Moon, asteroid, NASA |

### 5.2 Backlink Strategy

Backlinks to the Play Store listing improve Google Search ranking for your app listing page.

**High-priority backlink targets:**

| Source | Type | Action |
|--------|------|--------|
| spacenexus.us | Own website | Add Google Play badge on homepage, footer, and dedicated /android page |
| Product Hunt | Launch platform | Create a product listing with Play Store link |
| AlternativeTo | App directory | List SpaceNexus as alternative to NASA App, Space Launch Now, Satellite Tracker |
| G2 | B2B software reviews | Create a product profile in "Aerospace" category |
| Capterra | Software reviews | List under "Business Intelligence" or custom category |
| SaaSHub | SaaS directory | List with Play Store link |
| BetaList | Startup launches | Submit for featured launch |
| AppBrain | Android app directory | Submit for listing and review |
| XDA Developers | Android community | Post app showcase thread |
| Hacker News | Tech community | "Show HN" post linking to Play Store |
| LinkedIn articles | Professional content | Write articles linking to Play Store listing |
| Medium articles | Content marketing | Publish space industry analysis linking to app |

### 5.3 Deep Linking Setup

**Android App Links (verified deep links):**

Add to `AndroidManifest.xml` (or TWA configuration):
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https"
          android:host="spacenexus.us"
          android:pathPrefix="/" />
</intent-filter>
```

**Digital Asset Links verification:**
Host at `https://spacenexus.us/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.spacenexus.app",
    "sha256_cert_fingerprints": ["YOUR_APP_SIGNING_CERT_SHA256"]
  }
}]
```

**Key deep link routes to support:**
| Web URL | Deep Link |
|---------|-----------|
| spacenexus.us/mission-control | Open to Mission Control tab |
| spacenexus.us/news | Open to News feed |
| spacenexus.us/satellites | Open to Satellite Tracker |
| spacenexus.us/company-profiles/[slug] | Open specific company profile |
| spacenexus.us/market-intel | Open Market Intelligence |
| spacenexus.us/space-environment | Open Space Weather |

### 5.4 Google Search Integration (App Indexing)

**Firebase App Indexing setup:**

1. Add Firebase to the TWA project
2. Enable App Indexing in Firebase Console
3. Implement the Indexable API for key content pages
4. Submit app content to Google via the Search Console

**Benefits:**
- App install buttons appear in Google Search results for relevant queries
- "Open in App" buttons for users who have the app installed
- App content pages appear in Google Search alongside web results

**Implementation priority:**
1. Company profile pages (200+ indexable pages)
2. News articles (dynamic content, fresh index signals)
3. Launch schedule (high search volume queries)
4. Satellite tracker (feature pages)

### 5.5 Organic Search Optimization

**Google Search queries to target with app indexing:**

| Query | Current Web Position | App Opportunity |
|-------|---------------------|-----------------|
| "space industry intelligence" | Top 10 | App pack result |
| "space company profiles" | Top 5 | App pack result |
| "[company name] space" (e.g., "Rocket Lab space") | Top 20 | Deep link to company profile |
| "next rocket launch" | Top 30 | App pack with countdown |
| "space industry news app" | Not ranked | Direct app store result |
| "satellite tracker app android" | Not ranked | App store result |

**Web-to-app SEO strategy:**
- Create a dedicated landing page at spacenexus.us/android with:
  - Play Store badge and download link
  - App screenshots and feature descriptions
  - Schema markup for SoftwareApplication (helps rich snippets)
  - FAQ section targeting "space industry app" queries
- Add SoftwareApplication schema to the /android page:
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SpaceNexus",
  "operatingSystem": "Android",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "150"
  }
}
```

---

## 6. User Acquisition

### 6.1 Google Ads (App Campaigns)

**Campaign structure:**

| Campaign | Objective | Budget | Targeting |
|----------|-----------|--------|-----------|
| Brand Awareness | Installs | $15/day | Space industry interest segments |
| Competitor Conquest | Installs | $10/day | Users of competitor apps |
| Retargeting | Engagement | $10/day | Web visitors who haven't installed |
| Subscription | In-app actions | $15/day | Users who installed but didn't subscribe |

**Ad creative assets needed:**
- 5 text ideas (max 25 characters each)
- 5 text descriptions (max 90 characters each)
- 20 images in multiple sizes (1200x628, 1200x1200, 300x250)
- 5 video ads (portrait and landscape, 15s and 30s)
- 5 HTML5 interactive ads (optional)

**Text ad ideas:**
```
Idea 1: "Space Intelligence, One App"
Idea 2: "Track Every Launch Live"
Idea 3: "200+ Space Company Profiles"
Idea 4: "AI-Powered Space Insights"
Idea 5: "The Bloomberg of Space"

Description 1: "Real-time launches, satellites, market data. Free download."
Description 2: "Track SpaceX, Blue Origin, Rocket Lab & 200 more companies."
Description 3: "Space news, weather, procurement intel. All in one app."
Description 4: "AI insights for the $546B space economy. Download free."
Description 5: "Never miss a launch. Get countdown alerts on your phone."
```

**Targeting specifications:**
- **Affinity audiences:** Space enthusiasts, Technology early adopters, Business professionals, News junkies
- **In-market audiences:** Business & industrial products, Aerospace & defense
- **Custom intent audiences:** People searching for "satellite tracker", "space news app", "rocket launch schedule"
- **Similar audiences:** Based on existing web app users (upload customer list to Google Ads)
- **Demographics:** Age 25-65, all genders, household income top 50%
- **Geography:** United States (primary), then UK, Canada, Australia, Germany, France, Japan

**Bidding strategy:**
- Start with "Maximize installs" (Target CPI)
- Target CPI: $1.50-$3.00 (B2B professional app typical range)
- After 50+ conversions, switch to "Target CPA" for subscription conversion
- Target CPA for Pro subscription: $25-$50 (acceptable given $29/mo LTV)

### 6.2 Social Media Ads

**LinkedIn Ads (highest B2B value):**

| Ad Type | Target Audience | Budget | Expected CPC |
|---------|----------------|--------|-------------|
| Sponsored Content | Aerospace/Defense industry | $20/day | $5-$10 |
| Message Ads | VP/Director level at space companies | $15/day | $0.50/send |
| Carousel Ads | Space startup founders/investors | $10/day | $4-$8 |

**LinkedIn targeting criteria:**
- Job titles: Aerospace Engineer, Satellite Engineer, Space Systems Engineer, Program Manager, VP Engineering, Chief Scientist, Defense Analyst, Investment Analyst
- Companies: SpaceX, Blue Origin, Rocket Lab, Northrop Grumman, Lockheed Martin, Boeing, L3Harris, BAE Systems, Raytheon, Maxar, Planet Labs, Spire Global
- Industries: Aerospace & Defense, Aviation & Aerospace, Defense & Space
- Skills: Satellite communications, Orbital mechanics, Space systems, Propulsion, GNC
- Groups: Space industry groups, NewSpace groups, Satellite industry groups

**Twitter/X Ads:**

| Ad Type | Target | Budget |
|---------|--------|--------|
| Promoted Tweets | Space industry followers | $10/day |
| App Install Cards | @SpaceX, @RocketLab followers | $10/day |

**Twitter targeting:**
- Follow look-alikes: @SpaceX, @RocketLab, @SpaceNews_Inc, @NASASpaceflight, @planet, @SpireGlobal, @ArianeGroup
- Keywords: #space, #newspace, #satellite, #SpaceX, #rocketlaunch
- Interests: Space, Technology, Science, Defense

### 6.3 Cross-Promotion from Web App

**In-app promotion placements on spacenexus.us:**

| Placement | Type | Trigger | Dismissible |
|-----------|------|---------|-------------|
| Smart App Banner | Native banner | Android user visits site | Yes |
| Dashboard card | Feature card | First 3 visits from Android | Yes, permanent dismiss |
| Post-login modal | Full-screen prompt | Android user signs in first time | Yes |
| Settings section | Permanent link | Always visible | N/A |
| Email footer | Badge | All emails | N/A |
| Push notification | Web push | One-time, 7 days after registration | N/A |

### 6.4 App Review Sites and Directories

**Tier 1 -- High-traffic review sites (submit within first week):**

| Site | URL | Type | Cost |
|------|-----|------|------|
| Product Hunt | producthunt.com | Launch platform | Free |
| AppBrain | appbrain.com | Android directory | Free |
| AlternativeTo | alternativeto.net | App comparison | Free |
| SaaSHub | saashub.com | SaaS directory | Free |
| G2 | g2.com | B2B software reviews | Free listing |
| Capterra | capterra.com | Software reviews | Free listing |
| GetApp | getapp.com | Software comparison | Free listing |
| BetaList | betalist.com | Startup launches | Free / $129 featured |

**Tier 2 -- Android-focused sites:**

| Site | URL | Notes |
|------|-----|-------|
| Android Police | androidpolice.com | Email tips@androidpolice.com for review |
| Android Authority | androidauthority.com | Submit via contact form |
| Android Central | androidcentral.com | Email editors |
| 9to5Google | 9to5google.com | Email tips |
| XDA Developers | xda-developers.com | Post in Apps forum |
| APKMirror | apkmirror.com | Auto-indexed from Play Store |
| AndroidPIT (NextPit) | nextpit.com | Submit app for review |

**Tier 3 -- Space/Tech niche sites:**

| Site | URL | Notes |
|------|-----|-------|
| Space.com | space.com | Email tips for app review |
| SpaceNews | spacenews.com | Industry publication |
| Payload Space | payloadspace.com | Newsletter feature |
| The Space Review | thespacereview.com | Essay/review submission |
| NASASpaceflight forum | forum.nasaspaceflight.com | Community post |
| SpaceRef | spaceref.com | Press release distribution |

**Tier 4 -- General app directories (submit for SEO backlinks):**

| Site | URL |
|------|-----|
| Softpedia | softpedia.com |
| CNET Download | download.cnet.com |
| FileHippo | filehippo.com |
| Softonic | en.softonic.com |
| AppGrooves | appgrooves.com |
| AppAdvice | appadvice.com |

### 6.5 Influencer Partnerships

**Space industry influencers to partner with:**

| Influencer/Channel | Platform | Followers | Why |
|--------------------|----------|-----------|-----|
| Everyday Astronaut (Tim Dodd) | YouTube | 2.5M+ | Premier space education, launch coverage |
| Scott Manley | YouTube | 1.3M+ | Orbital mechanics, space tech analysis |
| Marcus House | YouTube | 800K+ | SpaceX/launch coverage |
| NASASpaceflight | YouTube/Twitter | 1.2M+ | Launch coverage, industry news |
| Felix Schlang (What About It?) | YouTube | 500K+ | Space industry analysis |
| Primal Space | YouTube | 700K+ | Space industry documentaries |
| Christian Davenport | Twitter/WaPo | 50K+ | Space industry journalist |
| Eric Berger | Twitter/Ars | 100K+ | Space journalist, Ars Technica |
| Supercluster | Instagram | 200K+ | Space media company |

**Partnership models:**
- **Sponsored video mention:** $500-$5,000 per mention (30-60 seconds)
- **Dedicated review video:** $2,000-$15,000 (full app walkthrough)
- **Affiliate program:** 20% recurring commission on Pro subscriptions referred
- **Free Pro access:** Give influencers lifetime Pro access in exchange for honest review
- **Data partnership:** Provide exclusive data/insights for their content, credited to SpaceNexus

### 6.6 Reddit/Twitter Organic Promotion

**Reddit strategy (ongoing, not just launch):**

| Subreddit | Content Strategy | Frequency |
|-----------|-----------------|-----------|
| r/space | Share interesting data visualizations generated from SpaceNexus data | 2x/month |
| r/spacex | Launch day threads with SpaceNexus tracking data | Per launch |
| r/aerospace | Industry analysis posts citing SpaceNexus data | 1x/month |
| r/dataisbeautiful | Space industry data visualizations | 1x/month |
| r/stocks + r/investing | Space economy/SPAC analysis posts | 1x/month |
| r/androidapps | Feature update announcements | Monthly |

**Twitter/X organic strategy:**
- Live-tweet every major launch with SpaceNexus countdown screenshots
- Share daily "Space Industry Stat of the Day" with app screenshots
- Engage with space industry conversations using @SpaceNexusApp
- Quote-tweet breaking space news with SpaceNexus analysis
- Weekly "What's New in SpaceNexus" thread with feature highlights

### 6.7 QR Codes on Marketing Materials

**QR code placements:**

| Material | QR Destination | Context |
|----------|---------------|---------|
| Business cards | Play Store listing | In-person networking |
| Conference booth banners | Play Store listing with UTM params | Trade shows (Space Tech Expo, Satellite, AMOS, IAC) |
| Slide deck footer | Play Store listing | Investor/partner presentations |
| Printed brochures | Landing page spacenexus.us/android | Mailed materials |
| Stickers/swag | Play Store listing | Giveaways at events |
| Email signature | Play Store listing | Ongoing passive promotion |

**QR code best practices:**
- Use UTM parameters: `https://play.google.com/store/apps/details?id=com.spacenexus.app&utm_source=conference&utm_medium=qr&utm_campaign=satellite2026`
- Generate QR codes with logo embedded (use QR Code Generator Pro or Uniqode)
- Minimum print size: 2cm x 2cm (0.8" x 0.8")
- Test every QR code before printing
- Use a short URL redirect (e.g., spacenexus.us/android) for tracking flexibility

---

## 7. Rating & Review Management

### 7.1 Initial Review Seeding Strategy

**Goal:** 50+ five-star reviews within the first 2 weeks.

**Ethical review seeding tactics (do NOT buy fake reviews):**

| Source | Expected Reviews | Tactic |
|--------|-----------------|--------|
| Team & family | 10-15 | Personal ask (genuine reviews only) |
| Beta testers | 15-25 | Email after positive beta feedback |
| Existing web power users | 20-30 | In-app prompt to web users who download Android |
| Launch day social media | 5-10 | Ask followers to review after downloading |

**Seeding email template (to beta testers):**
```
Subject: You helped build SpaceNexus Android -- would you share your experience?

Hi [Name],

Thank you for beta testing SpaceNexus on Android. Your feedback helped us
squash 23 bugs and improve the experience for everyone.

Now that we've launched on Google Play, would you take 30 seconds to leave
an honest review? Your review helps other space professionals discover
SpaceNexus.

[Leave a Review on Google Play]

Thank you for being part of the SpaceNexus community.

-- The SpaceNexus Team
```

**Critical rules:**
- NEVER offer incentives for specific star ratings (violates Play Store policy)
- NEVER buy reviews from review farms (app will be suspended)
- NEVER create fake accounts to leave reviews (detectable, results in ban)
- DO ask satisfied users for honest reviews
- DO make it easy with a direct link to the review page

### 7.2 In-App Review Prompt Timing and Triggers

**Google Play In-App Review API implementation:**

The API shows a native Play Store review dialog without leaving the app. Google controls the quota (typically 1-3 times per year per user).

**When to trigger the review prompt:**

| Trigger | Timing | Rationale |
|---------|--------|-----------|
| After 3rd app open | Day 3-7 | User has demonstrated basic retention |
| After viewing 5th company profile | Feature engagement | User is finding value in core feature |
| After first successful launch alert | Post-value delivery | User just experienced a "wow" moment |
| After 2nd week of daily use | Day 14+ | Power user confirmation |
| After completing a successful search | Feature satisfaction | User found what they were looking for |

**When NOT to trigger:**
- During onboarding or first session
- After a crash or error
- During a time-sensitive task (watching a live launch countdown)
- Immediately after opening the app
- When the user is filling out a form or in the middle of a workflow
- Within 2 weeks of a previous prompt

**Implementation code pattern:**
```kotlin
// TWA apps should use the Play Core library
val manager = ReviewManagerFactory.create(context)
val request = manager.requestReviewFlow()
request.addOnCompleteListener { task ->
    if (task.isSuccessful) {
        val reviewInfo = task.result
        val flow = manager.launchReviewFlow(activity, reviewInfo)
        flow.addOnCompleteListener { _ ->
            // Flow completed (user may or may not have left review)
            // Do NOT check result -- API deliberately hides outcome
        }
    }
}
```

**Pre-qualification gate (before calling the API):**
```
IF user.appOpenCount >= 3
AND user.lastCrash is null OR user.lastCrash > 7 days ago
AND user.lastReviewPrompt is null OR user.lastReviewPrompt > 90 days ago
AND user.currentSession.errors == 0
AND user.featureEngagement >= 5 actions
THEN requestReviewFlow()
```

### 7.3 Responding to Reviews -- Templates

**Respond to every review within 24 hours.** Responding to negative reviews can increase the rating by an average of +0.7 stars.

**Positive review response templates:**

**5-star review, short:**
```
Thank you for the kind words, [Name]! We're glad SpaceNexus is helping you
stay on top of the space industry. If you have feature suggestions, we'd
love to hear them at support@spacenexus.us.
```

**5-star review, feature-specific:**
```
Thanks for highlighting the [feature name], [Name]! It's one of our
favorites too. We're constantly adding new data sources and features --
stay tuned for [upcoming feature] coming soon!
```

**4-star review:**
```
Thank you for the great rating, [Name]! We noticed you gave us 4 stars --
we'd love to earn that 5th star. What could we improve? Drop us a note
at support@spacenexus.us and we'll prioritize your feedback.
```

**Negative review response templates:**

**1-2 star review, bug report:**
```
We're sorry about this issue, [Name]. This is not the experience we want
for you. We've logged this bug and our team is working on a fix. Could you
email us at support@spacenexus.us with your device model and Android version?
We want to resolve this for you ASAP. We'll follow up when the fix is live.
```

**1-2 star review, feature request:**
```
Thank you for the feedback, [Name]. We understand the frustration --
[requested feature] is something we're actively working on and plan to
release in [timeframe]. We'd love to keep you updated. Please reach out
at support@spacenexus.us and we'll notify you when it's available.
```

**1-2 star review, pricing complaint:**
```
Thank you for trying SpaceNexus, [Name]. We understand the Pro pricing
may not fit everyone's budget. Our free tier includes launch tracking,
news, basic satellite monitoring, and space weather -- completely free,
forever. The Pro tier is designed for industry professionals who need
advanced analytics and AI insights. We appreciate your feedback and are
always looking for ways to deliver more value.
```

**1 star review, vague/hostile:**
```
We're sorry SpaceNexus didn't meet your expectations, [Name]. We'd
genuinely like to understand what went wrong so we can improve. Please
reach out to support@spacenexus.us -- our team reads every email and
we're committed to making this right.
```

### 7.4 Rating Improvement Tactics

**Proactive rating management:**

| Tactic | Expected Impact | Effort |
|--------|----------------|--------|
| Fix top-reported bugs within 48 hours | +0.2-0.5 stars | High |
| Respond to every negative review | +0.3-0.7 stars per updated review | Medium |
| Implement in-app review API | +0.5-1.0 overall rating | Medium |
| Release updates every 2 weeks | Signals active development | Medium |
| Add "Report a Problem" in-app (before user goes to Play Store) | Fewer 1-star rage reviews | Low |
| Intercept unhappy users with in-app feedback form | Diverts negative reviews | Medium |

**Negative review interception flow:**
```
User taps "Rate Us" or feedback button
  --> "Are you enjoying SpaceNexus?"
      --> "Yes!" --> Launch Play Store In-App Review API
      --> "Not really" --> Show in-app feedback form (email to support@)
                         --> "We're sorry! Tell us what's wrong and we'll fix it."
```

This pattern routes satisfied users to Play Store and routes unhappy users to your support team instead of a public 1-star review.

### 7.5 Bug Fix Prioritization Based on Reviews

**Review monitoring workflow:**

| Step | Tool | Frequency |
|------|------|-----------|
| 1. Monitor new reviews | Play Console > Reviews | Daily |
| 2. Categorize by issue type | Spreadsheet or AppFollow | Daily |
| 3. Prioritize bugs by frequency | Jira/Linear/GitHub Issues | Weekly |
| 4. Deploy fix | Railway auto-deploy from dev | As needed |
| 5. Reply to affected reviewers | Play Console | Within 24h of fix |
| 6. Track review updates | AppFollow or manual check | Weekly |

**Review monitoring tools:**
- **Play Console** (free) -- Built-in review management
- **AppFollow** (https://appfollow.io, from $25/mo) -- Multi-platform review monitoring, auto-tagging, reply templates
- **Appbot** (https://appbot.co, from $49/mo) -- AI-powered sentiment analysis on reviews
- **ReviewBot** (free Slack integration) -- Posts new reviews to Slack channel

---

## 8. Retention & Engagement

### 8.1 Push Notification Strategy

**Notification categories and cadence:**

| Category | Trigger | Frequency | User Segments |
|----------|---------|-----------|---------------|
| Launch alerts | Launch T-24h, T-1h, T-10min | Per launch (2-5/week) | All users (opt-in) |
| Space weather alerts | Kp >= 5 or X-class flare | As it happens (rare) | All users (opt-in) |
| Breaking news | Major industry event | 1-2/week max | All users (opt-in) |
| Company updates | Tracked company news | 1-3/week | Users tracking specific companies |
| Weekly digest | Sunday evening | 1/week | All users |
| AI insights | New market insight generated | 1/week | Pro users |
| Procurement alerts | New matching SAM.gov opportunity | As posted | Pro users with saved searches |
| Re-engagement | User inactive 7+ days | Once at day 7, once at day 14 | Churning users |

**Notification best practices:**
- Always include a clear value proposition in the notification text
- Use rich notifications with images when possible (launch vehicle photo, company logo)
- Allow granular opt-in/opt-out per category in app settings
- Never send more than 3 push notifications in a single day
- A/B test notification copy and timing
- Respect user timezone (send during waking hours 8AM-9PM local)

**Re-engagement notification examples:**
```
Day 7 inactive: "3 launches happened this week. See what you missed."
Day 14 inactive: "SpaceX just announced [event]. Get the full story."
Day 30 inactive: "We've added 15 new company profiles. Come explore."
```

### 8.2 In-App Messaging

**In-app message types:**

| Message Type | Trigger | Content | Dismissible |
|-------------|---------|---------|-------------|
| Feature announcement | After app update | "New: [Feature] is here. Try it now." | Yes |
| Onboarding tooltip | First visit to each section | "Tip: Tap a company name to see their full profile" | Yes |
| Upgrade prompt | After 5+ sessions as free user | "Unlock AI insights with Pro. Free 14-day trial." | Yes |
| Feedback request | After 10 sessions | "How's SpaceNexus working for you? [Great / Needs work]" | Yes |
| Event promotion | During major space events | "Artemis III landing today! Follow live in Mission Control." | Yes |

### 8.3 Feature Discovery Flow

**Progressive feature disclosure (don't overwhelm new users):**

| Session # | Features Highlighted | Method |
|-----------|---------------------|--------|
| 1 | Mission Control dashboard, News feed | Welcome tour (3 screens) |
| 2 | Launch tracker, Push notification opt-in | Tooltip on launch countdown |
| 3 | Satellite tracker | "Did you know?" card on dashboard |
| 4 | Company profiles | Tooltip when viewing a news article with company tag |
| 5 | AI Insights (Pro feature) | Feature preview with upgrade prompt |
| 6 | Marketplace | Card in Business Opportunities section |
| 7+ | Advanced features (procurement, compliance) | Contextual tooltips on first visit |

### 8.4 Onboarding Optimization

**First-time user experience (FTUE) flow:**

```
Screen 1: "Welcome to SpaceNexus"
  - Select interests: [ ] Launches [ ] Satellites [ ] News [ ] Markets
  - "This helps us personalize your experience"

Screen 2: "Set up launch alerts"
  - Enable push notifications
  - Select launch providers to follow (SpaceX, ULA, Rocket Lab, etc.)

Screen 3: "Your Mission Control"
  - Show personalized dashboard based on selections
  - Highlight key cards with pulsing animation

Screen 4 (optional): "Go Pro for AI Insights"
  - Brief preview of AI-powered features
  - "Start 14-day free trial" or "Maybe later"
```

**Onboarding metrics to track:**
- Onboarding completion rate (target: 80%+)
- Permission grant rate (push notifications, target: 65%+)
- Time to first value action (target: <60 seconds)
- Day 1 retention of users who completed onboarding vs. those who skipped

### 8.5 Re-engagement Campaigns

**Dormant user segments and strategies:**

| Segment | Definition | Re-engagement Tactic |
|---------|-----------|---------------------|
| At-risk | No open in 5-7 days | Push: "This week's top space story" |
| Lapsed | No open in 8-14 days | Push: "3 launches this week -- see the schedule" |
| Dormant | No open in 15-30 days | Push: "We've added [X] new features since you last visited" |
| Churned | No open in 30+ days | Email: "We miss you -- here's what's new in SpaceNexus" |
| Uninstalled | App removed | Google Ads remarketing campaign |

---

## 9. Monetization on Play Store

### 9.1 In-App Purchase Setup (Google Play Billing for TWA)

**Architecture for TWA + Play Billing:**

SpaceNexus as a TWA uses the **Digital Goods API** + **Payment Request API** to integrate with Google Play Billing. This allows subscription purchases to flow through Google Play instead of Stripe when the user is in the Android app.

**Implementation steps:**
1. Enable `playBilling` feature in `twa-manifest.json`
2. Set up subscription products in Play Console > Monetization > Subscriptions
3. Implement Digital Goods API in the PWA JavaScript to query product details
4. Implement Payment Request API to initiate purchases
5. Verify purchases server-side using Google Play Developer API
6. Sync subscription status with your existing Prisma User model

**twa-manifest.json configuration:**
```json
{
  "alphaDependencies": {
    "enabled": true
  },
  "features": {
    "playBilling": {
      "enabled": true
    }
  }
}
```

### 9.2 Subscription Products to Create

**Set up in Play Console > Monetization > Products > Subscriptions:**

| Product ID | Name | Price | Billing Period | Trial |
|-----------|------|-------|---------------|-------|
| `pro_monthly` | SpaceNexus Pro (Monthly) | $29.99/mo | Monthly | 14-day free trial |
| `pro_annual` | SpaceNexus Pro (Annual) | $249.99/yr | Annually | 14-day free trial |
| `enterprise_monthly` | SpaceNexus Enterprise (Monthly) | $99.99/mo | Monthly | 7-day free trial |
| `enterprise_annual` | SpaceNexus Enterprise (Annual) | $899.99/yr | Annually | 7-day free trial |

**Google Play commission rates:**
- First $1M in annual revenue: 15% commission
- Revenue above $1M: 30% commission
- Subscription renewals after 12 months: 15% commission

**Pricing strategy notes:**
- Annual plans should offer 25-30% savings vs. monthly to incentivize commitment
- Round to .99 pricing (psychological pricing standard on Play Store)
- Consider regional pricing tiers (India: $9.99/mo, Brazil: $14.99/mo)

### 9.3 Free Trial Strategy

**Trial configuration:**

| Plan | Trial Length | Trial Type | Conversion Target |
|------|-------------|------------|-------------------|
| Pro Monthly | 14 days | Full access | 15-25% conversion |
| Pro Annual | 14 days | Full access | 10-15% conversion |
| Enterprise Monthly | 7 days | Full access | 8-12% conversion |
| Enterprise Annual | 7 days | Full access | 5-8% conversion |

**Trial-to-paid conversion tactics:**
- Day 1: Welcome email explaining what's unlocked
- Day 7: Mid-trial email highlighting features they've used
- Day 11: "3 days left" push notification with usage summary
- Day 13: "Trial ending tomorrow" with value recap
- Day 14: "Your trial ended. Upgrade to keep [specific features they used]."
- Day 21 (post-lapse): "We miss you. Here's 20% off your first month."

**Grace period:** Enable 7-day grace period for failed payments (Play Console > Subscription settings). Users retain access while Google retries the payment.

**Account hold:** Enable account hold to pause subscription instead of canceling on payment failure. Resume access automatically when payment succeeds.

### 9.4 Price Point Optimization

**A/B testing price points (use Play Console Custom Store Listings):**

| Test | Control | Variant | Metric |
|------|---------|---------|--------|
| Pro Monthly | $29.99 | $24.99 | Conversion rate |
| Pro Monthly | $29.99 | $34.99 | Revenue per user |
| Pro Annual | $249.99 | $199.99 | Annual plan adoption rate |
| Trial Length | 14 days | 7 days | Trial-to-paid conversion |

**Regional pricing recommendations:**

| Region | Pro Monthly | Pro Annual | Rationale |
|--------|-----------|-----------|-----------|
| United States | $29.99 | $249.99 | Base pricing |
| United Kingdom | $24.99 / 19.99 GBP | $199.99 / 159.99 GBP | Slight discount for market entry |
| European Union | $29.99 / 27.99 EUR | $249.99 / 229.99 EUR | Near parity |
| India | $9.99 | $79.99 | PPP-adjusted, huge market |
| Brazil | $14.99 | $119.99 | PPP-adjusted |
| Japan | $29.99 / 3,980 JPY | $249.99 / 33,800 JPY | Near parity, high-value market |
| Australia | $29.99 / 39.99 AUD | $249.99 / 339.99 AUD | Currency-adjusted |

### 9.5 Promotional Pricing Events

**Planned promotional calendar:**

| Event | Timing | Promotion | Goal |
|-------|--------|-----------|------|
| Launch Week | App launch | 30-day free Pro trial (vs. 14) | Drive initial adoption |
| World Space Week | Oct 4-10 | 40% off annual plan | Seasonal relevance |
| Artemis missions | Mission dates | 20% off Pro monthly | Event-driven conversion |
| Black Friday | Late November | 50% off first year | Q4 revenue push |
| New Year | January | "New year, new data" -- 30% off annual | Q1 push |
| Space Symposium | April | Conference attendee discount code | B2B pipeline |

**Promotional offer setup in Play Console:**
1. Navigate to Monetization > Subscriptions > [Product] > Offers
2. Create a new offer with introductory pricing
3. Set eligibility criteria (new users only, or specific regions)
4. Set duration (e.g., "first 3 months at $19.99/mo")
5. Promote via Custom Store Listings with promotional messaging

---

## 10. Analytics & KPIs

### 10.1 Google Play Console Metrics to Track

**Acquisition metrics (Play Console > Statistics):**

| Metric | Description | Target (Month 1) | Target (Month 6) |
|--------|-------------|-------------------|-------------------|
| Store listing visitors | Users who viewed the listing | 10,000+ | 50,000+ |
| Store listing conversion rate | Visitors who installed | 25-35% | 30-40% |
| First-time installers | Unique device installs | 2,000+ | 15,000+ |
| Install by source | Organic vs. paid vs. referral | 60% organic | 70% organic |
| Uninstall rate | Users who removed the app | <30% (30-day) | <25% (30-day) |
| Update rate | Users on latest version | >80% | >90% |

**Quality metrics (Play Console > Android Vitals):**

| Metric | Description | Target | Play Store Threshold |
|--------|-------------|--------|---------------------|
| Crash rate | % of sessions with crash | <1% | Bad if >1.09% |
| ANR rate | App Not Responding | <0.1% | Bad if >0.47% |
| Excessive wakeups | Battery drain | 0 | Bad if >10/hour |
| Stuck partial wake locks | Battery drain | 0 | Bad if >1/hour |
| Permission denials | % denied permissions | <20% | N/A |

**Engagement metrics (Play Console > Statistics):**

| Metric | Description | Target |
|--------|-------------|--------|
| Daily active users (DAU) | Unique users per day | 500+ (month 1), 3,000+ (month 6) |
| Monthly active users (MAU) | Unique users per month | 3,000+ (month 1), 12,000+ (month 6) |
| DAU/MAU ratio (stickiness) | Daily engagement rate | >20% |
| Average sessions per user | Sessions per day | >1.5 |
| Average session duration | Time in app | >3 minutes |

**Revenue metrics (Play Console > Financial reports):**

| Metric | Description | Target |
|--------|-------------|--------|
| Revenue (gross) | Total subscription revenue | $5,000/mo (month 3) |
| ARPU | Average revenue per user | $2-5/mo |
| Subscriber count | Active paid subscribers | 200 (month 3), 500 (month 6) |
| Trial-to-paid conversion | % of trial users who subscribe | >15% |
| Churn rate | Monthly subscriber cancellations | <8% |

### 10.2 Firebase Analytics Setup

**Events to track (custom events beyond auto-collected):**

| Event Name | Parameters | Purpose |
|------------|-----------|---------|
| `launch_viewed` | launch_id, provider | Track launch interest |
| `company_profile_viewed` | company_slug, tier | Track company engagement |
| `satellite_tracked` | satellite_id, type | Track satellite feature usage |
| `ai_insight_viewed` | insight_type | Track AI feature engagement |
| `search_performed` | query, results_count | Track search effectiveness |
| `news_article_read` | source, category | Track news engagement |
| `marketplace_listing_viewed` | listing_id, category | Track marketplace usage |
| `subscription_started` | plan_type, trial | Track monetization |
| `subscription_cancelled` | plan_type, reason | Track churn |
| `push_notification_opened` | notification_type | Track notification effectiveness |
| `onboarding_completed` | step_count, time_spent | Track onboarding |
| `onboarding_skipped` | last_step_seen | Track onboarding drops |
| `feature_discovered` | feature_name | Track feature discovery |
| `share_performed` | content_type, platform | Track virality |

**User properties to set:**

| Property | Values | Purpose |
|----------|--------|---------|
| `subscription_tier` | free, pro, enterprise | Segment by subscription |
| `user_role` | engineer, investor, analyst, enthusiast | Segment by persona |
| `company_type` | startup, defense, government, investor, academic | Segment by organization |
| `registration_source` | web, android, referral | Track acquisition channel |
| `days_since_install` | integer | Lifecycle stage |

### 10.3 Key Performance Indicators (KPIs)

**North Star Metrics:**

| KPI | Definition | Target | Cadence |
|-----|-----------|--------|---------|
| Weekly Active Subscribers | Paid users active in last 7 days | 80% of all subscribers | Weekly |
| Install-to-Subscribe Rate | % of installers who subscribe within 30 days | 5% | Monthly |
| Net Promoter Score (NPS) | Would you recommend SpaceNexus? (via in-app survey) | 50+ | Quarterly |

**Leading Indicators:**

| KPI | Why It Matters | Target |
|-----|---------------|--------|
| Day 1 retention | Onboarding effectiveness | >50% |
| Day 7 retention | Product-market fit signal | >25% |
| Day 30 retention | Habit formation | >15% |
| Feature breadth per session | Users exploring multiple features | >2 features/session |
| Push notification opt-in rate | Re-engagement potential | >65% |
| Organic install growth rate | Word-of-mouth and ASO effectiveness | >10% MoM |

### 10.4 Funnel Analysis

**Primary conversion funnel:**

```
Play Store Impression (100%)
  --> Store Listing View (30-40%)
    --> Install (25-35% of views)
      --> First Open (90% of installs)
        --> Onboarding Complete (80% of opens)
          --> Day 1 Return (50% of completed onboarding)
            --> Day 7 Return (25% of day 1)
              --> Trial Start (10% of day 7 retained)
                --> Trial-to-Paid (15-25% of trials)
                  --> Month 2 Renewal (85-92% of subscribers)
```

**Drop-off analysis actions:**

| Funnel Step | If Below Target | Action |
|-------------|----------------|--------|
| Store listing conversion <25% | Optimize screenshots, description, icon | A/B test via Store Listing Experiments |
| First open <90% | App too large, slow download | Optimize APK/bundle size |
| Onboarding complete <80% | Too many steps or confusing | Simplify to 3 screens max |
| Day 1 retention <50% | Not delivering value fast enough | Improve time-to-first-value |
| Trial start <10% | Not surfacing Pro value | Earlier feature previews |
| Trial-to-paid <15% | Trial too long or Pro not compelling | Shorten trial, improve Pro features |

### 10.5 Cohort Analysis

**Cohort dimensions to analyze:**

| Dimension | Cohorts | Purpose |
|-----------|---------|---------|
| Install date | Weekly cohorts | Track retention improvement over time |
| Acquisition channel | Organic, Google Ads, Social, Referral | Compare channel quality |
| Subscription tier | Free, Pro, Enterprise | Track feature usage by tier |
| User persona | Engineer, Investor, Enthusiast, Analyst | Product fit per persona |
| Geography | US, UK, EU, Asia, Other | Regional engagement patterns |
| Onboarding variant | Completed vs. skipped | Impact of onboarding |
| Device type | Phone vs. tablet vs. Chromebook | Platform-specific issues |

**Cohort reports to generate monthly:**
1. Retention curves by install week (Firebase > Analytics > Retention)
2. Revenue cohorts (ARPU by install month)
3. Feature engagement by acquisition channel
4. Subscription conversion by user persona
5. Churn analysis by subscription duration

---

## 11. Competitive Analysis

### 11.1 Direct Competitors on Play Store

| App | Developer | Rating | Installs | Price | Core Features |
|-----|-----------|--------|----------|-------|---------------|
| Space Launch Now | Caleb Jones | 4.5 | 500K+ | Free + $3.99 Pro | Launch tracking, rocket info, news |
| Satellite Tracker by Star Walk | Vito Technology | 4.6 | 10M+ | Free + $5.99/yr | 19K+ satellite tracking, AR view |
| ISS Detector | RunaR | 4.6 | 5M+ | Free + $2-5 IAP | ISS/satellite pass predictions |
| NASA App | NASA | 4.5 | 10M+ | Free | NASA news, images, missions, live TV |
| Star Walk 2 | Vito Technology | 4.5 | 50M+ | Free + $5.99/yr | Star chart, satellites, AR |
| Heavens-Above | Chris Peat | 4.3 | 1M+ | Free + $2.49 | Satellite passes, ISS, iridium |
| N2YO Satellite Tracker | N2YO.com | 3.8 | 100K+ | Free | Real-time satellite tracking |
| Flightradar24 (tangential) | Flightradar24 AB | 4.4 | 50M+ | Free + $1.49-$3.99/yr | Flight/aircraft tracking |
| SpaceX Go! | Jeremie M | 4.5 | 100K+ | Free | SpaceX launch/landing tracker |
| Orbit - Satellite Tracker | Lkosmi | 4.3 | 500K+ | Free + $4.99 | 3D satellite viewer |

### 11.2 Feature Comparison Matrix

| Feature | SpaceNexus | Space Launch Now | Satellite Tracker | NASA App | ISS Detector |
|---------|-----------|-----------------|-------------------|---------|-------------|
| Launch tracking | Yes | Yes | No | Limited | No |
| Satellite tracking | Yes (19K+) | No | Yes (19K+) | No | Yes (limited) |
| Company profiles (200+) | **Yes** | No | No | No | No |
| AI market insights | **Yes** | No | No | No | No |
| Space news aggregation | Yes (50+ sources) | Yes (limited) | No | Yes (NASA only) | No |
| Procurement intel | **Yes (SAM.gov)** | No | No | No | No |
| Space weather | Yes | No | No | Yes (basic) | No |
| Marketplace | **Yes** | No | No | No | No |
| Space debris tracking | Yes | No | Limited | No | No |
| Regulatory/compliance | **Yes** | No | No | No | No |
| Subscription analytics | **Yes** | No | No | No | No |
| AR satellite view | Planned | No | Yes | No | Yes |
| Offline mode | Partial | Yes | Yes | Yes | Yes |
| Push notifications | Yes | Yes | No | Yes | Yes |
| 3D visualization | Yes | No | Yes | No | No |

**SpaceNexus unique advantages (no competitor has these):**
1. 200+ company profiles with financials, funding, and competitive analysis
2. AI-powered market intelligence (Claude Sonnet)
3. Procurement intelligence (SAM.gov/SBIR integration)
4. B2B marketplace
5. Regulatory and compliance tracking
6. Space economy analytics
7. All-in-one platform (not a single-purpose tool)

### 11.3 Rating/Review Comparison

| App | Rating | Reviews | Common Praise | Common Complaints |
|-----|--------|---------|---------------|-------------------|
| Space Launch Now | 4.5 | 8K+ | Reliable launch data, clean UI | Notifications sometimes late, crashes |
| Satellite Tracker | 4.6 | 200K+ | Beautiful AR, easy to use | Battery drain, subscription too expensive |
| NASA App | 4.5 | 100K+ | Official source, great images | Slow, crashes, limited features |
| ISS Detector | 4.6 | 80K+ | Accurate predictions, simple | Ads intrusive, dated UI |

**Opportunity gaps from competitor reviews:**
- Users want MORE data in one app (multiple apps for launches + satellites + news)
- Users complain about paid apps with intrusive ads
- Users want professional-grade data, not just enthusiast tools
- Users want real-time notifications that actually work
- Users want dark mode (SpaceNexus has this by default)

### 11.4 Pricing Comparison

| App | Free Tier | Paid Tier | Annual Option |
|-----|-----------|-----------|---------------|
| SpaceNexus | Full dashboard, news, basic tracking | $29.99/mo Pro | $249.99/yr |
| Space Launch Now | Basic launch tracking | $3.99 one-time | N/A |
| Satellite Tracker | Limited satellites | $5.99/yr premium | $5.99/yr |
| ISS Detector | ISS only | $2-5 per satellite pack | N/A |
| NASA App | Fully free | N/A | N/A |

**Pricing positioning:**
SpaceNexus is deliberately priced above consumer apps because it serves a different market: B2B professionals, not hobbyists. A $29.99/mo subscription is comparable to industry data services (Seradata at $500+/yr, Bryce Tech reports at $3K+/yr, SpaceCapital at $10K+/yr), making SpaceNexus a fraction of the cost of alternatives.

### 11.5 Gap Analysis

| Gap | Opportunity for SpaceNexus |
|-----|---------------------------|
| No all-in-one space platform on Android | First-mover advantage as comprehensive platform |
| No AI-powered space analysis app | Unique AI differentiator |
| No procurement intelligence app | Government contractor pipeline is underserved |
| Consumer satellite trackers lack B2B features | Professional-grade analytics and profiles |
| Space news apps lack context and analysis | AI-categorized, company-tagged news |
| No space marketplace on mobile | First B2B space marketplace on Android |
| Most space apps are hobby-grade | Professional positioning commands premium pricing |
| No space company directory on mobile | 200+ profiles is a unique dataset |

---

## 12. Getting Featured

### 12.1 Google Play Editorial Team Outreach

**How to submit for featuring:**

1. Navigate to Play Console > Growth > Store presence > Featuring
2. Fill out the "Promote your app" form with:
   - App description and unique value proposition
   - Target audience and use case
   - Recent updates and improvements
   - Press coverage links
   - Usage metrics and growth trajectory
   - Screenshots and marketing assets

**Outreach strategy:**
- Submit the featuring request 3-4 weeks before your target feature date
- Include a compelling narrative: "SpaceNexus is the first comprehensive space industry intelligence platform on Android, combining launch tracking, satellite monitoring, AI-powered insights, and 200+ company profiles in one app"
- Highlight your app's quality metrics (crash rate, ANR rate, ratings)
- Mention any press coverage or industry recognition
- Tie your request to relevant events (World Space Week, major launches, Artemis missions)

**Google Play Developer Relations:**
- Attend Google Play developer events and webinars
- Engage with the @GooglePlayDev Twitter account
- Participate in the Google Play Developer Community forums
- Apply for the Google Play Developer Partner program

### 12.2 Android Excellence Criteria

**Technical quality requirements:**
- Crash-free rate > 99% (measured via Android Vitals)
- ANR rate < 0.47%
- No stuck partial wake locks
- Target API level is current (Android 15 / API 35 in 2026)
- Support for large screens (tablets, foldables, Chromebooks)
- Material You (Material Design 3) implementation
- Predictive back gesture support
- Per-app language preferences support
- Edge-to-edge display support

**Design quality requirements:**
- Follow Material Design 3 guidelines
- Adaptive layouts for phones, tablets, foldables
- Dark/light theme support
- Smooth 60fps animations
- Accessibility: screen reader support, sufficient contrast ratios, touch target sizes

**User experience requirements:**
- Rating > 4.0 stars
- Positive review sentiment
- Low uninstall rate
- Regular updates (at least monthly)
- Responsive developer replies to reviews

### 12.3 Play Store Featuring Requirements

**Types of featuring available:**

| Feature Type | Description | How to Get |
|-------------|-------------|------------|
| Apps tab hero | Large featured banner | Editorial selection + submit form |
| Top Charts | Top Free/Paid/Grossing lists | Install velocity + quality signals |
| Category spotlight | Featured within Business category | Strong category metrics |
| "For you" recommendations | Algorithmically personalized | High retention + engagement signals |
| Editor's Choice | Curated collection of best apps | Editorial review + quality criteria |
| New & Updated | Recently updated apps showcase | Regular meaningful updates |
| Indie Corner | Small developer spotlight | <50 employees, high quality |
| Seasonal collections | Holiday/event themed collections | Event-relevant app + timely submission |

**Indie Corner eligibility:**
SpaceNexus qualifies for Indie Corner as a small company with <50 employees. This is a less competitive featuring opportunity with significant visibility.

### 12.4 Seasonal/Event-Based Featuring Opportunities

**Space industry calendar for featuring submissions:**

| Event | Date | Featuring Angle | Submit By |
|-------|------|----------------|-----------|
| World Space Week | Oct 4-10 | "Apps for Space Enthusiasts" collection | Sep 10 |
| Artemis missions | Mission-specific | "Follow the Moon Mission" angle | 4 weeks pre-launch |
| Starship flights | Ongoing | "Track the Biggest Rocket" angle | After announcement |
| Solar eclipses | Event-specific | "Space Events" collection | 6 weeks prior |
| Meteor showers (Perseids, Geminids) | Aug/Dec | "Night Sky" collection | 4 weeks prior |
| International Space Station milestones | As announced | "Space Exploration" collection | 3 weeks prior |
| Satellite 20XX conference | March | "Space Industry" angle | Feb 15 |
| Space Symposium | April | "Space Technology" angle | Mar 15 |
| IAC (International Astronautical Congress) | October | "Global Space" angle | Sep 1 |
| SpaceX annual launch milestones | As achieved | "Record-Breaking" angle | Day of milestone |

**Pro tip:** Create Custom Store Listings for seasonal events with themed screenshots and descriptions. Example: During World Space Week, update the feature graphic to include "Celebrate World Space Week with SpaceNexus" and highlight educational features.

---

## 13. Timeline & Milestones

### 13.1 Pre-Launch (Weeks 1-2)

| Week | Day | Task | Owner | Status |
|------|-----|------|-------|--------|
| 1 | Mon | Register Google Play Developer account (organization) | Dev | |
| 1 | Mon | Generate TWA APK using Bubblewrap/PWA Builder | Dev | |
| 1 | Tue | Complete IARC content rating questionnaire | Dev | |
| 1 | Tue | Write privacy policy and host at /privacy | Legal | |
| 1 | Wed | Design app icon (512x512) with adaptive layers | Design | |
| 1 | Wed | Design feature graphic (1024x500) | Design | |
| 1 | Thu | Create 8 annotated phone screenshots | Design | |
| 1 | Thu | Create 4 tablet screenshots | Design | |
| 1 | Fri | Write app title, short description, full description | Marketing | |
| 1 | Fri | Record promo video (30s) and upload to YouTube | Marketing | |
| 2 | Mon | Upload all assets to Play Console draft listing | Dev | |
| 2 | Mon | Set up internal testing track, add 10 team testers | Dev | |
| 2 | Tue | Enable pre-registration (target: 6 weeks before launch) | Dev | |
| 2 | Tue | Set up Firebase Analytics + Crashlytics | Dev | |
| 2 | Wed | Configure Google Play Billing products (subscriptions) | Dev | |
| 2 | Wed | Set up Digital Goods API in PWA | Dev | |
| 2 | Thu | Begin keyword research with AppTweak/KeywordTool.io | Marketing | |
| 2 | Thu | Submit app to closed testing track (100 beta testers) | Dev | |
| 2 | Fri | Set up review monitoring (AppFollow or Play Console alerts) | Support | |
| 2 | Fri | Prepare press release draft | Marketing | |

### 13.2 Soft Launch (Weeks 3-4)

| Week | Day | Task | Owner | Status |
|------|-----|------|-------|--------|
| 3 | Mon | Promote to open testing in soft launch markets (CA, AU, UK, NZ) | Dev | |
| 3 | Mon | Begin pre-registration Google Ads campaign ($20/day) | Marketing | |
| 3 | Tue | Monitor crash rates and ANR rates in Android Vitals | Dev | |
| 3 | Wed | Fix top 5 issues from beta/soft launch feedback | Dev | |
| 3 | Thu | A/B test screenshot order (Store Listing Experiments) | Marketing | |
| 3 | Fri | Collect and respond to soft launch reviews | Support | |
| 4 | Mon | Release patched version to testing tracks | Dev | |
| 4 | Tue | Finalize store listing based on A/B test results | Marketing | |
| 4 | Wed | Prepare launch day email sequence (3 emails) | Marketing | |
| 4 | Thu | Brief influencers and provide early access | Marketing | |
| 4 | Thu | Finalize and queue press release with distribution service | Marketing | |
| 4 | Fri | Final QA pass on production-ready build | Dev/QA | |
| 4 | Fri | Submit app for full production review | Dev | |

### 13.3 Full Launch (Week 5)

| Week | Day | Task | Owner | Status |
|------|-----|------|-------|--------|
| 5 | Mon | Roll out production release to all countries | Dev | |
| 5 | Mon | Execute launch day tactics (see Section 4.3) | All | |
| 5 | Mon | Send launch announcement email (Email 1) | Marketing | |
| 5 | Mon | Publish all social media launch posts | Marketing | |
| 5 | Mon | Submit press release via distribution service | Marketing | |
| 5 | Mon | Post on Reddit (r/space, r/spacex, r/androidapps) | Marketing | |
| 5 | Mon | Post on Hacker News (Show HN) | CEO | |
| 5 | Mon | Activate Google Ads app campaigns | Marketing | |
| 5 | Tue | Monitor reviews and respond within 1 hour | Support | |
| 5 | Tue | Monitor crash/ANR rates closely | Dev | |
| 5 | Wed | Send Email 2 (feature highlights) | Marketing | |
| 5 | Wed | Submit to Tier 1 app review sites (Product Hunt, AppBrain) | Marketing | |
| 5 | Thu | Submit to Tier 2 Android review sites | Marketing | |
| 5 | Thu | Submit featuring request to Google Play editorial | Marketing | |
| 5 | Fri | Review Week 1 metrics, compile report | Marketing/Dev | |
| 5 | Fri | Send Email 3 (social proof) | Marketing | |

### 13.4 Post-Launch Optimization (Months 2-6)

**Month 2: Stabilize & Optimize**
| Task | Target | Owner |
|------|--------|-------|
| Achieve 4.5+ average rating | Address all 1-2 star reviews | Support |
| Optimize store listing based on search terms report | Improve keyword rankings | Marketing |
| Release 2 feature updates | Maintain "New & Updated" visibility | Dev |
| Scale Google Ads to $50/day if CPI < $3 | 2,000+ additional installs | Marketing |
| Submit to 20+ app directories | Build backlink profile | Marketing |
| Launch LinkedIn ad campaign ($20/day) | B2B professional acquisition | Marketing |

**Month 3: Growth**
| Task | Target | Owner |
|------|--------|-------|
| Reach 5,000+ total installs | Growth milestone | All |
| Launch Phase 2 localization (FR, DE, JA, KO, PT-BR) | Expand to 10 languages | Marketing |
| First influencer partnership video published | Awareness in space community | Marketing |
| A/B test pricing (Pro monthly $24.99 vs $29.99) | Optimize conversion | Marketing |
| Implement onboarding optimization based on funnel data | Improve day 1 retention to 55%+ | Dev |
| Run first promotional pricing event | Boost subscriber count | Marketing |

**Month 4: Scale**
| Task | Target | Owner |
|------|--------|-------|
| Reach 8,000+ total installs | Continued growth | All |
| 200+ paying Pro subscribers | Revenue milestone | All |
| Implement App Indexing for company profiles | Organic search traffic | Dev |
| Create Custom Store Listings for top 5 markets | Improve per-market conversion | Marketing |
| Second round of A/B testing (icon, feature graphic) | Continuous optimization | Marketing |
| Prepare World Space Week featuring submission | Seasonal featuring | Marketing |

**Month 5: Mature**
| Task | Target | Owner |
|------|--------|-------|
| Reach 12,000+ total installs | Growth trajectory | All |
| 350+ paying Pro subscribers | Revenue growth | All |
| Launch Phase 3 localization (ES, IT, HI, AR) | 15 languages | Marketing |
| Build tablet/Chromebook-optimized experience | Expand device coverage | Dev |
| Second influencer partnership | Sustained awareness | Marketing |
| Apply for Indie Corner featuring | Premium visibility | Marketing |

**Month 6: Optimize & Report**
| Task | Target | Owner |
|------|--------|-------|
| Reach 15,000+ total installs | 6-month milestone | All |
| 500+ paying Pro subscribers | Revenue target | All |
| Compile 6-month performance report | Board/stakeholder update | All |
| Set Year 1 targets based on data | Strategic planning | All |
| Evaluate ROI on ad spend by channel | Budget optimization | Marketing |
| Plan v2.0 Android features (AR, widgets, Wear OS) | Product roadmap | Dev |

---

## 14. Budget Recommendations

### 14.1 Minimal Budget ($0-$300/month)

**For bootstrapped launch with maximum organic growth:**

| Expense | Monthly Cost | Notes |
|---------|-------------|-------|
| Google Play Developer account | $25 one-time | One-time fee |
| Canva Pro (design) | $13/mo | Screenshots, feature graphic, social posts |
| AppFollow (review monitoring) | $0-25/mo | Free tier monitors 1 app |
| PRWeb press release | $99 one-time | Basic distribution for launch |
| Total ongoing | ~$38/mo | |
| Total month 1 | ~$162 | Including one-time costs |

**What you can do for free:**
- Organic social media (LinkedIn, Twitter, Reddit)
- Cross-promotion from web app (smart banner, emails)
- Personal outreach to beta testers for reviews
- Submit to free app directories
- A/B testing via Play Console (free)
- Firebase Analytics (free)
- Respond to all reviews (Play Console, free)
- SEO content on spacenexus.us/blog (free)
- Product Hunt launch (free)

**Expected results:** 1,000-3,000 installs in 6 months, primarily from cross-promotion and organic search. Slow but sustainable growth.

### 14.2 Growth Budget ($300-$1,500/month)

**For steady growth with targeted paid acquisition:**

| Expense | Monthly Cost | Notes |
|---------|-------------|-------|
| Google Ads (App Campaigns) | $300-$600/mo | Target CPI: $1.50-$3.00 |
| LinkedIn Ads | $200-$400/mo | B2B professional targeting |
| AppTweak (ASO tool) | $69/mo | Keyword research, competitor tracking |
| AppFollow (review monitoring) | $25/mo | Review management |
| Canva Pro | $13/mo | Design |
| Press release (quarterly) | $100/quarter | Ongoing press presence |
| BetaList featured listing | $129 one-time | Launch visibility |
| Total ongoing | $607-$1,107/mo | |

**Paid acquisition expectations at $600/mo Google Ads:**
- CPI (cost per install): $1.50-$3.00
- Monthly installs from ads: 200-400
- Expected CPA (cost per subscriber): $25-$50
- Monthly subscribers from ads: 12-24
- Breakeven: 1-2 months per subscriber at $29.99/mo

**Expected results:** 5,000-10,000 installs in 6 months. 200-400 paid subscribers. Positive ROI on ad spend by month 4.

### 14.3 Scale Budget ($1,500-$5,000/month)

**For aggressive growth and market dominance:**

| Expense | Monthly Cost | Notes |
|---------|-------------|-------|
| Google Ads (App Campaigns) | $1,000-$2,000/mo | Scaled campaigns, multiple ad groups |
| LinkedIn Ads | $500-$1,000/mo | Sponsored content + Message Ads |
| Twitter/X Ads | $200-$500/mo | App install cards |
| Influencer partnerships | $500-$1,500/mo | 1-2 sponsored mentions/month |
| Sensor Tower (competitive intel) | $199/mo | Full competitive intelligence |
| AppFollow (review monitoring) | $79/mo | Advanced plan with automation |
| Canva Pro | $13/mo | Design |
| PR distribution (monthly) | $200-$400/mo | Regular press coverage |
| Localization services | $200-$500/mo | Professional translation for 10+ languages |
| Total ongoing | $2,891-$5,992/mo | |

**Paid acquisition expectations at $2,000/mo Google Ads:**
- Monthly installs from ads: 700-1,300
- Monthly subscribers from ads: 40-80
- Monthly subscription revenue: $1,200-$2,400
- Incremental LTV: $3,600-$7,200 (3-month average tenure)

**Expected results:** 20,000-40,000 installs in 6 months. 500-1,000 paid subscribers. Clear market leadership in space industry apps category. Multiple featuring opportunities. Strong organic growth flywheel established.

**ROI analysis at scale budget:**
```
Monthly spend: $4,000 (average)
Monthly new subscribers: 60 (average)
Monthly new revenue: $1,800 (60 x $29.99)
Cumulative revenue month 6: $37,800 (growing subscriber base)
Cumulative spend month 6: $24,000
6-month ROI: 57.5% (positive, with accelerating returns)
12-month projected ROI: 250%+ (subscriber revenue compounds)
```

---

## 15. Progress Tracking

### 15.1 Pre-Launch Checklist

| # | Task | Status | Owner | Due Date | Notes |
|---|------|--------|-------|----------|-------|
| 1 | Register Google Play Developer account | Not Started | Dev | | $25 fee |
| 2 | Verify organization identity | Not Started | Dev | | 2-5 business days |
| 3 | Generate TWA APK with Bubblewrap | Not Started | Dev | | |
| 4 | Configure app signing (Play App Signing) | Not Started | Dev | | |
| 5 | Complete IARC content rating | Not Started | Dev | | |
| 6 | Write and host privacy policy | Not Started | Legal | | spacenexus.us/privacy |
| 7 | Complete Data Safety section | Not Started | Dev | | |
| 8 | Design app icon (512x512, adaptive) | Not Started | Design | | |
| 9 | Design feature graphic (1024x500) | Not Started | Design | | |
| 10 | Create 8 phone screenshots (1080x1920) | Not Started | Design | | |
| 11 | Create 4 tablet screenshots | Not Started | Design | | |
| 12 | Write app title (30 chars) | Not Started | Marketing | | |
| 13 | Write short description (80 chars) | Not Started | Marketing | | |
| 14 | Write full description (4000 chars) | Not Started | Marketing | | |
| 15 | Record promo video (30s-2min) | Not Started | Marketing | | |
| 16 | Upload promo video to YouTube | Not Started | Marketing | | |
| 17 | Set up Firebase Analytics | Not Started | Dev | | |
| 18 | Set up Firebase Crashlytics | Not Started | Dev | | |
| 19 | Configure Google Play Billing subscriptions | Not Started | Dev | | |
| 20 | Implement Digital Goods API in PWA | Not Started | Dev | | |
| 21 | Test subscription flow end-to-end | Not Started | QA | | |
| 22 | Set up internal testing track | Not Started | Dev | | |
| 23 | Recruit 100 beta testers from web users | Not Started | Marketing | | |
| 24 | Conduct keyword research | Not Started | Marketing | | |
| 25 | Prepare 3-email launch sequence | Not Started | Marketing | | |
| 26 | Draft press release | Not Started | Marketing | | |
| 27 | Set up deep links (assetlinks.json) | Not Started | Dev | | |
| 28 | Create spacenexus.us/android landing page | Not Started | Dev | | |
| 29 | Add SoftwareApplication schema markup | Not Started | Dev | | |
| 30 | Set up Google Ads account for app campaigns | Not Started | Marketing | | |

### 15.2 Soft Launch Checklist

| # | Task | Status | Owner | Due Date | Notes |
|---|------|--------|-------|----------|-------|
| 31 | Deploy to open testing (CA, AU, UK, NZ) | Not Started | Dev | | |
| 32 | Launch pre-registration campaign | Not Started | Marketing | | |
| 33 | Start pre-registration Google Ads ($20/day) | Not Started | Marketing | | |
| 34 | Monitor Android Vitals daily | Not Started | Dev | | |
| 35 | Fix top 5 soft launch issues | Not Started | Dev | | |
| 36 | Start Store Listing Experiment (screenshot order) | Not Started | Marketing | | |
| 37 | Respond to all beta reviews within 24h | Not Started | Support | | |
| 38 | Brief 3 influencers with early access | Not Started | Marketing | | |
| 39 | Queue press release with distribution service | Not Started | Marketing | | |
| 40 | Final QA pass on production build | Not Started | QA | | |

### 15.3 Launch Week Checklist

| # | Task | Status | Owner | Due Date | Notes |
|---|------|--------|-------|----------|-------|
| 41 | Roll out production release globally | Not Started | Dev | | |
| 42 | Send launch email (Email 1) | Not Started | Marketing | | |
| 43 | Publish blog post on spacenexus.us | Not Started | Marketing | | |
| 44 | Post on LinkedIn (company + personal) | Not Started | CEO/Mktg | | |
| 45 | Post on Twitter/X with video | Not Started | Marketing | | |
| 46 | Post on Reddit (3-5 subreddits) | Not Started | Marketing | | |
| 47 | Post on Hacker News (Show HN) | Not Started | CEO | | |
| 48 | Activate Google Ads app campaigns | Not Started | Marketing | | |
| 49 | Distribute press release | Not Started | Marketing | | |
| 50 | Send Email 2 (Day 3 feature highlight) | Not Started | Marketing | | |
| 51 | Submit to Product Hunt | Not Started | Marketing | | |
| 52 | Submit to AppBrain | Not Started | Marketing | | |
| 53 | Submit to AlternativeTo | Not Started | Marketing | | |
| 54 | Submit to G2, Capterra, GetApp | Not Started | Marketing | | |
| 55 | Send Email 3 (Day 7 social proof) | Not Started | Marketing | | |
| 56 | Submit Google Play featuring request | Not Started | Marketing | | |
| 57 | Compile Week 1 metrics report | Not Started | Marketing | | |

### 15.4 Post-Launch Monthly Checklist

| # | Task | Status | Owner | Cadence | Notes |
|---|------|--------|-------|---------|-------|
| 58 | Review and respond to all new reviews | Not Started | Support | Daily | |
| 59 | Check Android Vitals (crash rate, ANR) | Not Started | Dev | Daily | |
| 60 | Review acquisition metrics in Play Console | Not Started | Marketing | Weekly | |
| 61 | Adjust Google Ads bids and creatives | Not Started | Marketing | Weekly | |
| 62 | Update keyword strategy based on search terms | Not Started | Marketing | Monthly | |
| 63 | Run Store Listing Experiment | Not Started | Marketing | Monthly | |
| 64 | Release app update (features/fixes) | Not Started | Dev | Bi-weekly | |
| 65 | Publish social media content | Not Started | Marketing | 3x/week | |
| 66 | Analyze cohort retention data | Not Started | Marketing | Monthly | |
| 67 | Review subscription metrics (conversion, churn) | Not Started | Marketing | Monthly | |
| 68 | A/B test pricing or trial length | Not Started | Marketing | Quarterly | |
| 69 | Submit for seasonal featuring | Not Started | Marketing | As events arise | |
| 70 | Add new localization (1-2 languages/quarter) | Not Started | Marketing | Quarterly | |
| 71 | Brief and manage influencer partnerships | Not Started | Marketing | Monthly | |
| 72 | Compile monthly performance report | Not Started | Marketing | Monthly | |
| 73 | Submit to additional app directories | Not Started | Marketing | Monthly | |
| 74 | Review competitive landscape | Not Started | Marketing | Quarterly | |
| 75 | Plan next quarter's promotional events | Not Started | Marketing | Quarterly | |

### 15.5 Key Metrics Dashboard (Update Weekly)

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Month 2 | Month 3 | Month 6 |
|--------|--------|--------|--------|--------|---------|---------|---------|
| Total Installs | | | | | | | |
| DAU | | | | | | | |
| MAU | | | | | | | |
| Store Listing CVR | | | | | | | |
| Average Rating | | | | | | | |
| Total Reviews | | | | | | | |
| Crash Rate | | | | | | | |
| ANR Rate | | | | | | | |
| Day 1 Retention | | | | | | | |
| Day 7 Retention | | | | | | | |
| Day 30 Retention | | | | | | | |
| Trial Starts | | | | | | | |
| Trial-to-Paid CVR | | | | | | | |
| Active Subscribers | | | | | | | |
| MRR (Monthly Recurring) | | | | | | | |
| CPI (Cost per Install) | | | | | | | |
| CPA (Cost per Subscriber) | | | | | | | |
| Ad Spend (Total) | | | | | | | |
| Organic vs Paid % | | | | | | | |

---

## Appendix A: Tools & Resources

| Tool | Purpose | URL | Cost |
|------|---------|-----|------|
| Google Play Console | App management | play.google.com/console | Free (after $25 signup) |
| Firebase Analytics | Event tracking | firebase.google.com | Free |
| Firebase Crashlytics | Crash reporting | firebase.google.com | Free |
| AppTweak | ASO & keyword research | apptweak.com | $69-299/mo |
| Sensor Tower | Competitive intelligence | sensortower.com | $199-499/mo |
| MobileAction | ASO intelligence | mobileaction.co | $59-299/mo |
| KeywordTool.io | Free keyword suggestions | keywordtool.io/play-store | Free (limited) |
| AppFollow | Review management | appfollow.io | $0-159/mo |
| Appbot | Review sentiment analysis | appbot.co | $49-199/mo |
| Canva Pro | Design (screenshots, graphics) | canva.com | $13/mo |
| Figma | UI/design | figma.com | Free-$15/mo |
| Bubblewrap | TWA APK generation | npm: @aspect-build/aspect-bubblewrap | Free (CLI) |
| PWA Builder | TWA packaging | pwabuilder.com | Free |
| Google Ads | Paid user acquisition | ads.google.com | Variable |
| LinkedIn Campaign Manager | B2B advertising | linkedin.com/campaignmanager | Variable |
| PRWeb | Press release distribution | prweb.com | $99-389/release |
| Epidemic Sound | Royalty-free music (video) | epidemicsound.com | $15/mo |

## Appendix B: Key Links

| Resource | URL |
|----------|-----|
| Play Console Help | support.google.com/googleplay/android-developer |
| Play Store listing guidelines | play.google.com/console/about/guides/ |
| Google Play featuring guide | play.google.com/console/about/guides/featuring/ |
| Digital Goods API documentation | developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing |
| TWA + Play Billing sample | github.com/chromeos/pwa-play-billing |
| Android App Links guide | developer.android.com/training/app-links |
| In-App Review API | developer.android.com/guide/playcore/in-app-review |
| Store Listing Experiments | play.google.com/console/about/store-listing-experiments/ |
| Custom Store Listings | play.google.com/console/about/customstorelistings/ |
| Android Vitals documentation | developer.android.com/docs/quality-guidelines/core-app-quality |
| Material Design 3 | m3.material.io |
| Google Play badge generator | play.google.com/intl/en_us/badges/ |

---

*Document prepared February 2026. Review and update monthly.*
*Next review date: March 2026*
