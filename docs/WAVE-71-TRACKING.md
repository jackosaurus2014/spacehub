# Wave 71: Marketing VP — Conversion, Content & Growth

**Date:** 2026-02-28
**Role:** Marketing VP (Vice President of Marketing)
**Branch:** `claude/peaceful-ardinghelli`
**Focus:** Drive signups, enterprise engagement, SEO dominance, conversion optimization

---

## Marketing VP Strategic Vision

Current state: Strong technical foundation (256+ pages, 30+ modules, 50+ data sources) but marketing infrastructure underutilizes the platform's breadth. Only 13 blog posts for a site with 200+ pages of tools. No dedicated landing pages for high-intent search keywords. Generic testimonials instead of detailed use cases.

**Three marketing pillars:**
1. **Content-Led SEO** — Capture organic traffic with targeted landing pages and blog content
2. **Conversion Optimization** — Turn visitors into signups with better CTAs, lead magnets, social proof
3. **Engagement & Retention** — Keep users coming back with contextual prompts and value demonstrations

---

## Tasks

### Task 1: SEO Landing Pages (4 pages)
- `/solutions/investors` — "Space Industry Intelligence for Investors"
- `/solutions/analysts` — "Space Market Analytics for Analysts"
- `/solutions/engineers` — "Engineering Tools for Space Professionals"
- `/solutions/executives` — "Space Business Intelligence for Executives"
- Each page: hero, pain points, feature highlights from relevant modules, CTA, testimonial

### Task 2: Blog Expansion (4 new posts)
- "The Complete Guide to Space Industry Due Diligence" (investor-focused)
- "Space Sector M&A Activity: Key Trends and Analysis" (analyst-focused)
- "How to Track Real-Time Satellite Positions: A Complete Guide" (drives to /satellite-tracker)
- "SpaceNexus Score: How We Rate 200+ Space Companies" (drives to company profiles)

### Task 3: Lead Magnet — Gated Industry Report
- `/report/state-of-space-2026` page
- "State of the Space Industry 2026" downloadable teaser
- Email gate: requires email + name to access full report
- Free preview with blurred/locked sections
- Integration with newsletter system

### Task 4: Use Cases Page
- `/use-cases` page with 4 detailed persona stories
- Each: problem, solution, modules used, outcomes
- Personas: VC Partner, Defense Analyst, Satellite Engineer, Space Startup CEO

### Task 5: Contextual Upgrade CTAs
- Add "Pro" badges and upgrade prompts in free-tier module pages
- Soft CTAs: "Unlock advanced analytics with Pro" inline in data-heavy pages
- Create `UpgradeCTA` component for consistent styling

### Task 6: Enhanced Social Proof
- Add industry/partner logos section to homepage
- Add more testimonials (6 total, up from 3)
- Add real-time usage counter ("X professionals using SpaceNexus")

### Task 7: Exit-Intent Newsletter Capture
- Detect mouse leaving viewport (desktop) or scroll-to-top pattern (mobile)
- Show overlay: "Before you go — get daily space intelligence"
- Email capture with immediate benefit: "Get our weekly industry brief free"
- Respect dismissal (localStorage flag, don't show again for 7 days)
- Don't show to logged-in or already-subscribed users

---

## Success Metrics
- Pages with clear CTA: increase from ~5 to 15+
- Blog posts: 13 → 17
- Email capture points: newsletter → newsletter + lead magnet + exit intent
- Landing pages targeting high-intent keywords: 0 → 4
