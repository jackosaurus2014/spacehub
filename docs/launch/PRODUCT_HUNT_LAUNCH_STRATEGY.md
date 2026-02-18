# SpaceNexus -- Product Hunt Launch Strategy

> **Internal document. Last updated: February 2026.**
> Target launch window: Q1/Q2 2026.

---

## Table of Contents

1. [Product Positioning](#1-product-positioning)
2. [Product Hunt Listing Content](#2-product-hunt-listing-content)
3. [Six Screenshot Descriptions](#3-six-screenshot-descriptions)
4. [Launch Day Timeline](#4-launch-day-timeline)
5. [Pre-Launch Checklist](#5-pre-launch-checklist)
6. [Potential Product Hunt Hunters](#6-potential-product-hunt-hunters)
7. [Post-Launch Follow-Up Plan](#7-post-launch-follow-up-plan)
8. [Risk Mitigation](#8-risk-mitigation)

---

## 1. Product Positioning

### One-Liner (under 60 characters)

**"The Bloomberg Terminal for the space industry"**

### Primary Tagline (under 260 characters)

**"Real-time satellite tracking, AI-powered market intelligence, mission cost calculators, regulatory compliance tools, and 3D solar system exploration -- all in one affordable platform built for space industry professionals."**

### Five Alternative Taglines

1. "Stop paying $10K for outdated space industry reports. Get real-time intelligence, interactive tools, and AI insights starting at $0/month."

2. "10 integrated modules. 40+ data sources. One platform. SpaceNexus gives space entrepreneurs, lawyers, and mission planners the intelligence edge they need."

3. "Track satellites in real time. Monitor government contracts. Navigate ITAR/EAR compliance. Explore the solar system in 3D. The space industry finally has its operating system."

4. "From launch countdowns to regulatory filings, from asteroid tracking to space economy data -- SpaceNexus is the command center the commercial space industry has been missing."

5. "What if the space industry had a platform as good as the rockets it builds? AI-powered intelligence, live data, and interactive tools for professionals and enthusiasts."

### Elevator Pitch (2-3 sentences)

SpaceNexus is the first comprehensive intelligence platform purpose-built for the commercial space industry. It replaces the patchwork of expensive consulting reports, scattered government databases, and outdated spreadsheets with 10 integrated modules covering everything from real-time satellite tracking and AI-powered market analysis to regulatory compliance tools and 3D solar system exploration. With a free tier and plans starting at $9.99/month, it makes space industry intelligence accessible to everyone from startup founders to mission planners to space law attorneys.

---

## 2. Product Hunt Listing Content

### Product Name

**SpaceNexus**

### Tagline

Real-time satellite tracking, AI-powered market intelligence, mission cost calculators, regulatory compliance tools, and 3D solar system exploration -- all in one affordable platform built for space industry professionals.

### Description (260 characters)

SpaceNexus combines 10 integrated modules -- satellite tracking, AI insights, mission planning, regulatory compliance, market data, and more -- into the first affordable intelligence platform for the $546B space industry. Free tier available.

### Topics / Categories

- **SaaS**
- **Artificial Intelligence**
- **Space**
- **Analytics**
- **Data Visualization**

(Product Hunt allows up to 5 topics. Prioritize "SaaS" and "Artificial Intelligence" since those categories get the most browse traffic. "Space" targets the niche audience that will become super-fans.)

### Maker Comment

Post this as the first comment immediately at 12:01 AM PT on launch day:

---

Hey Product Hunt!

I built SpaceNexus because I kept running into the same problem: the commercial space industry is a $546 billion market growing at 9% annually, but the data and tools available to professionals are either locked behind $3,000-$10,000 consulting reports or scattered across dozens of government websites that update quarterly at best.

That felt broken. A SpaceX engineer, a space law attorney, a startup founder trying to figure out launch costs, and an investor tracking space SPACs should all be able to access real-time intelligence without spending five figures.

So I built SpaceNexus as a single platform that brings together:

- **Real-time satellite tracking** with orbital data for 10,000+ objects
- **AI-powered insights** via Claude that analyze regulatory changes, market shifts, and technology trends
- **Mission planning tools** including cost calculators, launch vehicle comparators, and window trackers
- **Regulatory compliance** for ITAR/EAR export controls, FCC/FAA/ITU filings, and space treaties
- **3D solar system exploration** built with Three.js for interactive celestial visualization
- **Market intelligence** with space company stock tracking, funding data, and startup monitoring
- **Government contract monitoring** for procurement opportunities

The tech stack is Next.js 14, TypeScript, Prisma + PostgreSQL, Three.js for 3D, and the Anthropic Claude API for AI analysis. The UI is designed to feel like you are actually in a mission control center -- dark backgrounds, cyan accents, animated starfield, and a video hero section showing ISS docking footage.

**Special offer for the PH community:** Use code **PRODUCTHUNT** at checkout for 50% off your first 3 months on any paid plan (Professional at $9.99/mo or Enterprise at $29.99/mo). The free tier is genuinely useful too -- it includes Mission Control, space weather, launch windows, and news browsing.

I would love your feedback. The platform is live and I ship updates weekly. What modules would you want to see next?

---

## 3. Six Screenshot Descriptions

All screenshots should be captured at **1270x760px** resolution in a desktop browser with no browser chrome visible (use fullscreen or a screenshot tool that crops). Use the live deployed site. Each image should include 2-3 text annotation callouts overlaid in a clean sans-serif font (white text with dark shadow, or use a branded cyan highlight box).

### Screenshot 1: Mission Control Dashboard

- **URL to capture:** `/mission-control`
- **What to show:** The full Mission Control page with countdown timers to upcoming launches, event type filters (Launches, Crewed, Moon, Mars, Stations, Satellites), live status badges, NASA EPIC Earth images, and the Deep Space Network antenna status section.
- **Why it is compelling:** This is the "wow factor" shot. The countdown cards with live timers, color-coded event types, and the space-themed dark UI immediately communicate that this is not a generic SaaS dashboard.
- **Suggested annotations:**
  - Arrow pointing to countdown timer: "Live countdown to next launch"
  - Arrow pointing to event filters: "Filter by mission type"
  - Arrow pointing to DSN section: "Real-time Deep Space Network data"

### Screenshot 2: 3D Solar System Exploration

- **URL to capture:** `/solar-exploration`
- **What to show:** The interactive Three.js solar system with visible planet orbits, celestial body labels, and the control panel. If possible, capture with a planet selected to show the info overlay.
- **Why it is compelling:** This is the most visually striking feature. It demonstrates technical sophistication and is immediately shareable. Nobody expects a SaaS platform to have an interactive 3D solar system.
- **Suggested annotations:**
  - Arrow pointing to a planet: "Click any body for mission data"
  - Arrow pointing to controls: "Rotate, zoom, and explore"
  - Bottom overlay text: "Built with Three.js and React Three Fiber"

### Screenshot 3: AI Insights (Claude-Powered Analysis)

- **URL to capture:** `/ai-insights`
- **What to show:** The AI Insights listing page with category filters (Regulatory, Market, Technology, Geopolitical) and several insight cards showing titles, summaries, and generated timestamps. Ideally show a mix of categories to demonstrate breadth.
- **Why it is compelling:** AI is the hottest category on Product Hunt. Showing that SpaceNexus uses Claude to generate original market intelligence analysis -- not just regurgitate news -- is a major differentiator.
- **Suggested annotations:**
  - Badge on an insight card: "Powered by Claude AI"
  - Arrow pointing to category filters: "4 intelligence categories"
  - Arrow pointing to a summary: "Original AI-generated analysis"

### Screenshot 4: Satellite Tracker

- **URL to capture:** `/satellites`
- **What to show:** The satellite overview tab with orbit type breakdown (LEO, MEO, GEO, HEO, SSO, Polar), operator rankings, total satellite count statistics, and ISS tracking data. Show the stats cards prominently.
- **Why it is compelling:** Satellite data is tangible and impressive. Showing 10,000+ tracked objects with real orbital classifications makes the platform feel data-rich and authoritative.
- **Suggested annotations:**
  - Arrow pointing to total count: "10,000+ tracked objects"
  - Arrow pointing to orbit breakdown: "Classified by orbit type"
  - Arrow pointing to ISS card: "Real-time ISS position"

### Screenshot 5: Regulatory and Compliance Hub

- **URL to capture:** `/compliance`
- **What to show:** The compliance page with treaty monitoring, ITAR/EAR classification tools, FCC/FAA/ITU filing trackers, and the tabbed interface (Treaties, Filings). Show enough of the interface to communicate depth.
- **Why it is compelling:** This is the enterprise value proposition. Space lawyers, compliance officers, and export control specialists have very few digital tools. This screenshot speaks directly to the highest-value user segment.
- **Suggested annotations:**
  - Arrow pointing to treaty section: "Monitor 100+ space treaties"
  - Arrow pointing to ITAR section: "ITAR/EAR export control tools"
  - Arrow pointing to filings tab: "Track FCC, FAA, and ITU filings"

### Screenshot 6: Market Intelligence

- **URL to capture:** `/market-intel`
- **What to show:** The Space Market Intelligence page with stock tickers for space companies, market cap data, funding rounds, company profiles, and the startup tracker tab. Show real data (SpaceX, Rocket Lab, Planet Labs, etc.).
- **Why it is compelling:** Investors and executives immediately understand the value of a Bloomberg-style terminal for space stocks and funding. Real company names and real numbers build credibility.
- **Suggested annotations:**
  - Arrow pointing to stock data: "Real-time space company stocks"
  - Arrow pointing to funding section: "Track VC funding rounds"
  - Arrow pointing to startup cards: "Monitor 500+ space startups"

### Screenshot Preparation Notes

- Take all screenshots on the same day to ensure consistent data states.
- Use a monitor set to 1920x1080 resolution or higher, then crop to 1270x760.
- Ensure no personal data, test accounts, or debug information is visible.
- Consider adding a thin 1px border in #1a1a2e to frame each screenshot consistently.
- Export as PNG with high quality (no JPEG artifacts on the dark UI).

---

## 4. Launch Day Timeline

### Two Weeks Before Launch (T-14 to T-8)

**Social media teasers:**
- Post 3 teaser images on Twitter/X showing cropped UI screenshots with "Coming soon to Product Hunt" messaging.
- Create a "We're launching on Product Hunt" badge/banner for the SpaceNexus homepage (temporary).
- Post a "building in public" thread on Twitter/X showing the journey of building SpaceNexus (tech stack, challenges, lessons learned).
- Share a teaser on LinkedIn targeting space industry professionals.

**Build email list of supporters:**
- Add a "Product Hunt Launch" banner to the SpaceNexus newsletter (if applicable) asking subscribers to support on launch day.
- Send a dedicated email to all registered users: "We're launching on Product Hunt on [DATE] -- here's how you can help."
- Create a Product Hunt "upcoming" page and collect subscribers there.

**Reach out to 3 potential hunters:**
- Identify 3 hunters (see Section 6) and send personalized emails explaining what SpaceNexus is, why it matters, and why their audience would care.
- Include a private demo link or offer a video walkthrough.
- Follow up once if no response within 3 days.

**Prepare all assets:**
- Finalize all 6 screenshots at 1270x760px.
- Write all copy variants (tagline, description, maker comment).
- Create a 60-second product walkthrough GIF or video (optional but high-impact).
- Prepare the PRODUCTHUNT promo code in Stripe.
- Set up UTM parameters: `?utm_source=producthunt&utm_medium=referral&utm_campaign=launch`.

### One Week Before Launch (T-7 to T-2)

**Final asset review:**
- Review all screenshots for freshness -- retake any that look outdated.
- Proofread all copy one final time.
- Have 2-3 people outside the project review the listing for clarity and appeal.

**Draft responses to common questions:**
- "How is this different from [X]?" -- See prepared differentiators below.
- "What data sources do you use?" -- Government APIs (NASA, NOAA, FCC, FAA), financial data providers, curated industry feeds.
- "Is the data accurate/real-time?" -- Yes, continuously updated from live APIs, not scraped or cached reports.
- "What's the tech stack?" -- Next.js 14, TypeScript, Prisma + PostgreSQL, Three.js, Claude API.
- "Do you have an API?" -- Enterprise plan includes API access and webhooks.
- "What's the roadmap?" -- Prepare 3-5 upcoming features to share.

**Schedule social media posts:**
- Pre-schedule 6 tweets/posts for launch day at 2-hour intervals.
- Prepare a LinkedIn post for 9 AM ET (when space industry professionals are online).
- Draft a Hacker News "Show HN" post for midday.
- Draft a Reddit post for r/space, r/spacex, r/aerospace (check subreddit rules first).

**Brief team on response strategy:**
- Assign who monitors and responds to Product Hunt comments (aim for < 15 minute response time).
- Assign who handles social media amplification.
- Assign who monitors site performance and uptime.
- Create a shared Slack/Discord channel for real-time coordination.

### Launch Day (Tuesday or Thursday, 12:01 AM PT)

Product Hunt resets daily at 12:01 AM Pacific Time. Tuesday and Thursday launches historically get the most traffic.

**12:01 AM PT -- Launch**
- Submit the product listing (or have the hunter submit it).
- Post the maker comment immediately (see Section 2).
- Share the PH link in the team coordination channel.

**12:15 AM PT -- First Wave**
- Send the "We're live!" email to your supporter list with the direct PH link.
- Post on Twitter/X: "We just launched on @ProductHunt! SpaceNexus is the Bloomberg Terminal for the space industry. [link] Would love your support!"
- Post in any private Slack/Discord communities you belong to (founder groups, tech communities).

**6:00 AM PT -- Morning Push**
- Post on LinkedIn with a personal story angle: "Today I launched SpaceNexus on Product Hunt. Here's why I believe the $546B space industry deserves better tools..."
- Send a second tweet with a different angle (e.g., feature-focused or data-focused).
- Begin monitoring for and responding to every comment on the PH listing.

**9:00 AM PT -- Peak Hours Begin**
- This is when most PH users are active. Monitor closely.
- Post in relevant online communities:
  - **Hacker News**: "Show HN: SpaceNexus -- An intelligence platform for the space industry" (link to the site, not PH -- HN rules).
  - **Reddit r/space**: "I built a free platform that tracks satellites, monitors space weather, and provides AI-powered space industry analysis" (follow subreddit self-promotion rules).
  - **Reddit r/aerospace**: Similar post tailored to professionals.
  - **Reddit r/SaaS**: "Launched our vertical SaaS for the space industry on Product Hunt today."
- Respond to every PH comment within 15 minutes. Be genuine, thankful, and detailed.

**12:00 PM PT -- Midday Check-In**
- Post a "thank you" tweet with current upvote count and a fresh screenshot.
- If trending well, reach out to any tech journalists or space bloggers you have relationships with: "Hey, we're trending on Product Hunt today if you'd like to check it out."
- Share an interesting data point from the platform on social media to drive curiosity.

**3:00 PM PT -- Afternoon Push**
- Post another tweet highlighting a specific feature (e.g., "Did you know SpaceNexus tracks every upcoming launch with live countdowns? Check it out on Product Hunt today.").
- Respond to any new comments on PH.
- Check site performance -- review error logs and response times.

**6:00 PM PT -- Evening Engagement**
- Post a final social push: "A few hours left on our Product Hunt launch day. Thank you to everyone who has supported us. [link]"
- Respond to all remaining comments.
- Update the maker comment if there's a milestone to celebrate (e.g., "Wow, we hit 200 upvotes! Thank you PH community!").

**9:00 PM PT -- Wind Down**
- Final comment responses.
- Prepare a thank-you post for the next morning.
- Document metrics: upvotes, comments, website traffic, signups, conversions.

### Response Templates for Common Comments

**Positive feedback:**
> "Thank you so much! Really glad you see the value. If there's a specific module you'd love us to build next, I'm all ears -- we ship updates weekly."

**Feature request:**
> "Great suggestion! That's actually on our roadmap for [timeframe]. I've added your vote to our internal tracker. Would you like me to notify you when it ships?"

**Technical question:**
> "Great question. [Detailed answer.] The full tech stack is Next.js 14, TypeScript, Prisma + PostgreSQL, Three.js for 3D, and Claude API for AI. Happy to go deeper on any of this."

**Comparison question:**
> "Good question. [Competitor] does [X] really well. Where SpaceNexus is different is [specific differentiator]. We're not trying to replace tools that work -- we're filling the gaps where no tool exists today."

**Skeptical comment:**
> "Totally fair concern. Here's how we address that: [specific answer]. We also have a free tier so you can try it yourself without any commitment. Would love to know what you think after taking a look."

### Post-Launch Days 2-7

**Day 2:**
- Post a "Day 2 update" on Twitter/X with final PH ranking and total upvotes.
- Respond to any overnight PH comments.
- Send a thank-you email to everyone who shared or upvoted (if you can identify them).

**Day 3:**
- Publish a "lessons learned" Twitter/X thread about the PH launch experience.
- Begin analyzing referral traffic in analytics.

**Day 4-5:**
- Reach out individually to people who left thoughtful comments to build relationships.
- Follow up with anyone who requested features to let them know you heard them.

**Day 6-7:**
- Compile a full metrics report (see Section 7).
- Begin drafting a blog post about the launch experience.
- Plan the next feature sprint based on feedback received.

---

## 5. Pre-Launch Checklist

### Account and Profile Setup (T-30 days)

- [ ] Create a Product Hunt maker account (use a real photo, complete bio mentioning space industry experience)
- [ ] Join Product Hunt and engage authentically for 2-4 weeks before launch (upvote products, leave comments, build karma)
- [ ] Set up the Product Hunt "upcoming" page and start collecting subscribers
- [ ] Follow relevant Product Hunt makers and hunters in the SaaS/AI/data space

### Asset Preparation (T-21 days)

- [ ] Capture all 6 screenshots at 1270x760px resolution (PNG, no JPEG)
- [ ] Add annotation callouts to each screenshot (consistent font, placement, and style)
- [ ] Create a product logo/icon for the PH listing (240x240px, works on both light and dark backgrounds)
- [ ] Write all copy variants: tagline, description, maker comment, and 5 backup taglines
- [ ] Create a 60-second product walkthrough video or GIF (optional but recommended)
- [ ] Film a 30-second "maker video" -- you at your desk explaining SpaceNexus in your own words (optional but high-converting)

### Technical Preparation (T-14 days)

- [ ] Set up the PRODUCTHUNT promo code in Stripe (50% off first 3 months, all paid plans)
- [ ] Add UTM tracking parameters and verify they appear correctly in analytics
- [ ] Set up a dedicated analytics dashboard to monitor PH referral traffic in real time
- [ ] Load test the site -- ensure it can handle 10x normal traffic without degradation
- [ ] Verify Railway auto-scaling settings or manually increase instance capacity for launch day
- [ ] Set up uptime monitoring alerts (e.g., UptimeRobot, Pingdom) with 1-minute check intervals
- [ ] Review and optimize Core Web Vitals (LCP, FID, CLS) -- PH visitors bounce fast on slow sites
- [ ] Ensure all API rate limits can handle increased traffic
- [ ] Test the registration, login, and subscription flows end to end
- [ ] Verify the free tier experience is genuinely compelling without paywalls blocking exploration

### Outreach Preparation (T-14 days)

- [ ] Compile a list of 3 potential hunters with contact information (see Section 6)
- [ ] Draft personalized outreach emails for each hunter
- [ ] Compile a supporter email list (registered users, newsletter subscribers, personal contacts in tech/space)
- [ ] Draft the "We're launching!" email for supporters
- [ ] Identify 10-15 online communities where SpaceNexus is relevant (subreddits, Slack groups, Discord servers, LinkedIn groups)
- [ ] Draft tailored posts for each community (do NOT copy-paste the same message everywhere)
- [ ] Reach out to 5-10 people with space industry audiences (bloggers, newsletter authors, podcasters) to let them know about the launch

### Content Preparation (T-7 days)

- [ ] Write all copy variants and finalize (tagline, description, maker comment)
- [ ] Draft responses to the 10 most likely questions/comments
- [ ] Prepare a FAQ document that can be linked from PH comments if needed
- [ ] Draft social media posts for every 2-hour slot on launch day
- [ ] Draft the Hacker News "Show HN" post
- [ ] Draft Reddit posts for r/space, r/aerospace, r/SaaS (check each subreddit's rules)
- [ ] Prepare a "press kit" page on the site with logo, screenshots, and a brief description (or add to an existing /about page)

### Final Review (T-2 days)

- [ ] Have 3 people outside the project review the full PH listing for clarity and typos
- [ ] Verify all links in the listing work correctly
- [ ] Test the PRODUCTHUNT promo code end to end (apply, checkout, verify discount)
- [ ] Confirm launch day assignments: who handles PH comments, social media, site monitoring
- [ ] Set alarms for 11:45 PM PT the night before launch
- [ ] Ensure the PH submission is drafted and ready to publish

### Launch Day (T-0)

- [ ] Submit listing at 12:01 AM PT (or confirm hunter has submitted)
- [ ] Post maker comment immediately
- [ ] Send supporter email within 15 minutes
- [ ] Begin social media schedule
- [ ] Monitor comments and respond within 15 minutes
- [ ] Monitor site uptime and performance throughout the day
- [ ] Document all metrics at end of day

---

## 6. Potential Product Hunt Hunters

A "hunter" on Product Hunt is someone who submits your product to the platform. Being hunted by a well-known hunter gives you visibility to their follower base and adds credibility. You can also self-hunt, but having a recognized hunter is preferable.

### Type 1: SaaS and Developer Tools Hunter

**Profile:** This person regularly hunts and features B2B SaaS products, developer tools, and data platforms. They typically have 5,000-50,000 followers on Product Hunt and a track record of hunting products that reach the top 5 daily. They are likely a founder, VC, or tech journalist themselves.

**Why they would care:** SpaceNexus is a vertical SaaS product with an unusual and compelling niche. The tech stack (Next.js 14, Three.js, Claude API) is interesting from a developer perspective. The "Bloomberg Terminal for space" positioning is a proven narrative format that has worked for products like Terminal (Bloomberg for crypto) and Crunchbase.

**How to approach:**
- Find them by browsing recent top-hunted SaaS/analytics products on Product Hunt and noting who hunted them.
- Send a concise email: introduce yourself in one sentence, describe SpaceNexus in two sentences, explain why their audience would care in one sentence, and offer a private demo or early access.
- Follow up once after 3-5 days if no response. Do not be pushy.
- If they decline, ask if they can recommend someone else.

### Type 2: Space and Science Enthusiast Hunter

**Profile:** This person is passionate about space exploration and regularly shares space-related content. They may be a space industry professional, a science communicator, or a developer who builds side projects related to astronomy or space data. They may not have the largest PH following, but their enthusiasm and authenticity will come through in the hunt description.

**Why they would care:** SpaceNexus is literally built for people like them. The 3D solar system, satellite tracker, and launch countdowns are the kind of features that get space enthusiasts excited. They will write a genuinely passionate hunt description.

**How to approach:**
- Search Product Hunt for previously hunted space-related products (satellite trackers, astronomy apps, space news aggregators) and identify the hunters.
- Search Twitter/X for people who post about space tech AND are active on Product Hunt.
- Send a message that leads with the product experience: "I built a platform where you can track every satellite in orbit, explore the solar system in 3D, and get AI-powered analysis of space industry trends. I think you'd genuinely enjoy using it."
- Offer them early access so they can explore before committing to hunt.

### Type 3: Data and Analytics Product Hunter

**Profile:** This person hunts products in the data, analytics, and business intelligence space. They understand the value of real-time data platforms and vertical intelligence tools. They often have audiences of data analysts, product managers, and business strategists.

**Why they would care:** SpaceNexus is a data-dense platform with 40+ data sources, real-time APIs, interactive charts, and AI-powered analysis. The "vertical intelligence platform" angle resonates with data-focused hunters because it represents a growing product category.

**How to approach:**
- Browse recent top hunts in the "Analytics," "Data," and "Business Intelligence" categories on Product Hunt.
- Look for hunters who have featured products like data dashboards, API platforms, or market intelligence tools.
- Email them emphasizing the data angle: "SpaceNexus aggregates 40+ space industry data sources into a single real-time intelligence platform. Think of it as a Bloomberg Terminal for the $546B space industry."
- Include 1-2 screenshots showing data density (market intelligence, satellite tracker).

### Self-Hunting as a Backup

If none of the three outreach efforts succeed, self-hunting is a perfectly valid strategy. Many top Product Hunt products were self-hunted. In this case:

- Ensure your PH maker profile is complete, professional, and shows genuine engagement on the platform.
- Write a compelling product description that doesn't read like marketing copy -- be authentic and specific.
- Compensate for the lack of a hunter's follower base by increasing your outreach to communities and supporters on launch day.

---

## 7. Post-Launch Follow-Up Plan

### Week 1 (Days 1-7): Immediate Engagement

- Respond to every Product Hunt comment, even "congrats" messages. Personalize each response.
- Share the PH launch results on Twitter/X, LinkedIn, and any communities you posted in.
- Send a thank-you email to everyone on the supporter list who helped.
- Individually message the 5-10 people who left the most thoughtful comments to build relationships.
- Add "Featured on Product Hunt" badge to the SpaceNexus homepage and footer (PH provides official badges).
- Track metrics daily: PH upvotes, comments, referral traffic, signups, trial starts, promo code redemptions.

### Week 2 (Days 8-14): Content and Reflection

- Publish a "lessons learned" blog post about the Product Hunt launch experience. Include:
  - What worked and what did not.
  - Actual metrics (traffic, signups, conversion rates).
  - Feedback themes and what you are building next.
  - Honest reflections on the process.
- Share this blog post on Twitter/X, LinkedIn, Hacker News, and relevant subreddits.
- Submit the blog post to Indie Hackers and other founder communities.
- Update the PH listing with any new features shipped since launch.

### Week 3 (Days 15-21): Press and Outreach

- Compile a list of 10-15 tech blogs and space industry publications that have covered top Product Hunt launches in the past.
- Send personalized pitches: "SpaceNexus launched on Product Hunt last week and was ranked #[X] Product of the Day. Here's why the space industry's first intelligence platform matters..."
- Reach out to space industry podcasts offering to be a guest (angle: "I built the Bloomberg Terminal for space").
- Contact space industry newsletters offering a guest post or feature.

### Month 1 (Days 1-30): Conversion Measurement

Track and document these metrics:

| Metric | Target | Actual |
|--------|--------|--------|
| Product Hunt upvotes | 300+ | |
| Product Hunt comments | 50+ | |
| PH referral traffic (unique visitors) | 2,000+ | |
| New user registrations from PH | 200+ | |
| Free-to-trial conversion rate | 10%+ | |
| PRODUCTHUNT promo code redemptions | 30+ | |
| Trial-to-paid conversion rate | 20%+ | |
| Average session duration from PH traffic | 3+ min | |
| Bounce rate from PH traffic | < 50% | |

**Analyze cohort behavior:**
- Are PH users exploring multiple modules or bouncing after one?
- Which modules are PH users most drawn to?
- What's the retention rate of PH signups after 7 days? 14 days? 30 days?
- Are PH users hitting paywalls and leaving, or converting?

### Ongoing (Month 2+): Sustained Presence

- Keep the Product Hunt listing updated with new features and milestones ("Launches" section on PH).
- Post product updates on PH every 4-6 weeks (PH allows "maker updates" on your listing).
- Engage with new space-related products on PH -- comment, support, and build relationships in the community.
- Consider a "V2 launch" on Product Hunt when a major feature ships (e.g., API launch, mobile app, new AI capabilities).
- Reference "Featured on Product Hunt" in sales materials, pitch decks, and the website.
- Continue building the email list for future launches and announcements.

---

## 8. Risk Mitigation

### Risk 1: Low Upvote Count (Finishing Outside Top 10)

**Probability:** Medium. Space is a niche category and may not attract the volume of a general-audience product.

**Mitigation strategies:**
- Focus on quality of engagement over quantity of upvotes. 50 genuine comments from space professionals are more valuable than 500 drive-by upvotes.
- Lean heavily into community outreach on launch day -- space communities (r/space, r/spacex, space Slack groups, LinkedIn space industry groups) are passionate and supportive.
- Have the maker comment be genuinely compelling and personal -- this is what converts browsers into upvoters.
- Do NOT ask people to "upvote" -- ask them to "check it out and let me know what you think." Genuine interest drives upvotes.
- Do NOT use upvote exchange services or buy upvotes. Product Hunt actively penalizes this and it can result in delisting.

**If it happens anyway:**
- Do not despair. Many successful products had modest PH launches. The launch is a single event; the product is forever.
- Focus on the feedback and relationships you gained, not the final ranking.
- Use the experience to refine positioning for a V2 launch later.

### Risk 2: Site Goes Down or Degrades Under Traffic

**Probability:** Low-Medium. Railway handles auto-scaling, but a 10x traffic spike could overwhelm the database or external API rate limits.

**Mitigation strategies:**

**Before launch:**
- Run a load test simulating 500 concurrent users. Identify and fix bottlenecks.
- Increase Railway instance capacity temporarily (can scale back after launch week).
- Add aggressive caching headers for static assets and API responses that don't change frequently.
- Pre-warm database connection pools.
- Ensure the circuit breaker pattern (`src/lib/circuit-breaker.ts`) is configured with appropriate thresholds so external API failures degrade gracefully rather than taking down pages.
- Verify the API cache (`src/lib/api-cache.ts`) has reasonable TTLs so pages can serve stale data if APIs are overwhelmed.
- Set up uptime monitoring with 1-minute intervals and immediate alerts (email + SMS/push).

**During launch:**
- Have one team member dedicated to monitoring server metrics: CPU, memory, database connections, response times.
- Keep the Railway dashboard open for instant scaling.
- Have a "maintenance mode" page ready that shows a friendly message: "SpaceNexus is experiencing high demand from our Product Hunt launch. We'll be back shortly. In the meantime, here's a quick preview of what you'll find..."

**If it happens:**
- Post a transparent comment on Product Hunt immediately: "We're experiencing a surge of traffic from this amazing PH community. We're scaling up right now and should be back in [X] minutes. Thank you for your patience!"
- Transparency and humor go a long way. PH users respect builders who are honest about growing pains.
- Scale up immediately, fix the issue, and post an update when resolved.

### Risk 3: Negative or Critical Feedback

**Probability:** Medium. Every PH launch gets some critical comments. Common criticisms for a product like SpaceNexus might include: "this is too niche," "the data seems thin," "why would I pay for this when [government site] is free," or "the UI is too busy."

**Mitigation strategies:**

**Before launch:**
- Anticipate the top 10 criticisms and prepare thoughtful responses (not defensive, not dismissive).
- Ensure the free tier is genuinely useful so critics can try it themselves.
- Have a friend or advisor do a "hostile review" before launch -- ask them to find every flaw they can.

**Response framework for negative comments:**
1. **Acknowledge** the feedback: "That's a fair point."
2. **Explain** context without being defensive: "Here's why we made that choice..."
3. **Commit** to improvement if warranted: "We're actually working on improving that. Would love your input."
4. **Invite** continued conversation: "Would you be open to sharing more about what you'd want to see?"

**Specific prepared responses:**

"Too niche / small market":
> "The global space economy hit $546B in 2024 and is projected to exceed $1T by 2030. Over 10,000 companies operate in this market. We believe vertical intelligence platforms for large specialized industries are underserved -- similar to how Bloomberg built a business serving finance before expanding."

"Why pay when NASA/NOAA/FCC data is free?":
> "Great question. The raw data IS free, and we actually pull from those exact government APIs. The value SpaceNexus adds is aggregation (40+ sources in one place), analysis (AI-powered insights), and tooling (calculators, comparators, compliance wizards). It's the difference between having access to financial data and having a Bloomberg Terminal."

"UI is too busy / overwhelming":
> "Appreciate the feedback. We designed the module configurator so you can enable only the modules you care about -- you don't have to see everything at once. That said, we're always working on UX improvements. Any specific areas that felt overwhelming?"

### Risk 4: Hunter Drops Out Last Minute

**Probability:** Low. But it happens.

**Mitigation:**
- Have a backup hunter identified and warmed up.
- Be fully prepared to self-hunt. Your PH maker account should be established and credible.
- Self-hunting is not a sign of failure -- many #1 Product of the Day launches were self-hunted.

### Risk 5: Launch Day Coincides with a Major Competing Launch

**Probability:** Low-Medium. Some days, a major product launches (e.g., a well-funded startup with 50K followers) and absorbs most of the attention.

**Mitigation:**
- Check the Product Hunt upcoming page a few days before launch. If a major product is scheduled for the same day, consider postponing by 1-2 days.
- If you discover the conflict on launch day, do not panic. Focus on your niche audience -- space professionals will find you regardless of what else is launching.
- A strong showing in a specific niche (e.g., #1 in Space, #3 overall) can be more valuable than a middling #6 on a quiet day.

### Risk 6: Promo Code Issues

**Probability:** Low, but embarrassing if it happens.

**Mitigation:**
- Test the PRODUCTHUNT promo code end-to-end at least 3 times before launch day (different plan combinations, monthly vs. yearly).
- Have a manual override process ready -- if the code fails, be prepared to manually apply discounts via the Stripe dashboard for anyone who reaches out.
- Monitor promo code redemptions in real time on launch day.

---

## Appendix A: Key Differentiators (Reference for Comment Responses)

Use these when responding to "how is this different?" questions:

| Differentiator | Detail |
|---|---|
| **Breadth** | 10 integrated modules covering the full space industry value chain (no other platform does this) |
| **Affordability** | Free tier + $9.99/mo Pro vs. $3,000-$10,000 for traditional space industry reports |
| **Real-time data** | Live APIs from NASA, NOAA, FCC, FAA, financial data providers vs. quarterly/annual reports |
| **AI-powered analysis** | Claude-powered insights generating original analysis, not just news aggregation |
| **Interactive tools** | Mission cost calculators, satellite trackers, launch vehicle comparators, compliance wizards |
| **3D visualization** | Interactive Three.js solar system exploration (no competitor has this) |
| **Modern tech stack** | Next.js 14, TypeScript, PWA-capable vs. legacy enterprise software |
| **Individual-friendly** | Built for individual professionals and startups, not just enterprise procurement |

## Appendix B: Competitor Landscape (Reference)

When asked about competitors, be respectful and specific:

- **SpaceNews / SpaceFlightNow / NASASpaceFlight**: News sites. SpaceNexus aggregates their content AND adds tools, data, and analysis they don't offer.
- **Bryce Tech / Euroconsult**: Consulting firms selling $5K-$10K reports. SpaceNexus offers real-time data at 1/500th the cost.
- **Satellite tracking apps**: Single-purpose tools. SpaceNexus integrates tracking with market data, compliance, and mission planning.
- **No direct competitor** offers the full-stack combination of news + market data + satellite tracking + regulatory compliance + AI analysis + mission planning + 3D visualization in a single platform.

## Appendix C: Quick Reference -- PH Listing Specs

| Asset | Specification |
|---|---|
| Product logo/icon | 240x240px, PNG, works on light and dark backgrounds |
| Screenshots | 1270x760px, PNG, up to 6 images |
| Video/GIF | Optional, 60 seconds max, auto-plays on listing |
| Tagline | 260 characters max |
| Description | No hard limit, but keep concise (2-3 short paragraphs) |
| Topics | Up to 5 categories |
| Maker comment | No limit, but aim for 200-400 words |
| Gallery order | First image is the thumbnail -- make it the most visually striking |
