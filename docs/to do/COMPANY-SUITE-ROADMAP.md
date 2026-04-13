# SpaceNexus Company Suite Roadmap

> Comprehensive feature roadmap for making SpaceNexus indispensable to space industry companies, C-suite executives, and employees. Each feature is researched against the actual codebase with implementation details.

**Generated:** 2026-04-10
**Current State:** 1,913 tests, 120+ Prisma models, 258 blog posts, 101 company profiles

---

## Priority Legend

| Priority | Meaning | Timeline |
|----------|---------|----------|
| P0 | Build immediately — highest ROI | Sprint 1-2 |
| P1 | Build next — high value | Sprint 3-4 |
| P2 | Build after P1 — strong revenue | Sprint 5-6 |
| P3 | Build when ready — network effects | Sprint 7+ |

---

## TIER 1: DAILY WORKFLOW TOOLS (P0)

### 1.1 Executive Command Center
**Impact: 5/5 | Feasibility: 4/5 | Revenue: 5/5**

The "why I open SpaceNexus every morning" page. Replaces checking 6 separate sources.

**Sections:**
- **My Company Signals**: News mentions, funding events, exec moves for user's claimed company (via `/api/company-signals`)
- **Competitor Watch**: Signals for watchlisted companies (via `CompanyWatchlistItem` with notifyNews/notifyContracts/notifyListings flags)
- **Pipeline Snapshot**: Open RFQs, proposals by status, deal room activity (RFQ, Proposal, DealRoom models)
- **Regulatory Deadlines**: Upcoming comment periods and effective dates (ProposedRegulation, PolicyChange — filter by commentDeadline/effectiveDate)
- **Talent Flags**: Executive departures/hires at watched companies (ExecutiveMove filtered by companySlug)
- **Market Pulse**: Latest launch, space weather, market status (existing `/api/pulse` endpoint)
- **AI Morning Brief**: Claude-generated 3-sentence summary of today's top signals (pattern from intelligence-brief.ts)

**Existing Data Sources:**
- `/api/company-signals?company=<name>` — aggregates news, funding, exec moves
- `/api/pulse` — latest news, next launch, space weather, satellite count
- `CompanyWatchlistItem` model — userId, companyProfileId, priority, notifyNews/Contracts/Listings
- `AlertDelivery` model — pending/sent/delivered alerts with title/message
- `CompanyDigest` model — AI-generated weekly company summaries
- `ProposedRegulation` — commentDeadline, effectiveDate, impactSeverity
- `RFQ` — status tracking (open/evaluating/awarded)
- `Proposal` — status tracking (submitted/shortlisted/awarded/rejected)

**Implementation:**
- New page: `/executive-command-center`
- New API: `GET /api/executive/briefing` — aggregates all sources for authenticated user
- Requires: User must have claimed company + watchlist configured
- Gate: Pro/Enterprise tier
- Claude call: Generate 3-sentence executive summary from aggregated signals (reuse intelligence-brief pattern)

**Cross-Feature Dependencies:**
- Feeds from: Watchlist system, Company Signals, Regulatory tracking, RFQ/Proposal pipeline
- Feeds into: BD Pipeline Tracker (opportunity discovery), Board Prep Reports (data source)

---

### 1.2 BD Opportunity Pipeline Tracker
**Impact: 5/5 | Feasibility: 4/5 | Revenue: 5/5**

Personal CRM for BD professionals. Makes SpaceNexus a daily work tool with high switching cost.

**New Prisma Models Required:**
```
BDOpportunity
  - companyId (FK CompanyProfile)
  - bdManagerUserId (FK User)
  - title, description, externalId (link to SAM.gov)
  - opportunityType: procurement | partnership | funding | teaming | contract_renewal
  - sector, category, valueEstimated
  - agency, cageCodeRequired, itarRequired, setAsideEligibility[]
  - samOpportunityId, solicitationNumber
  - stage: discovery | pursuit | proposal | award | lost | on_hold
  - probability (0-100), expectedCloseDate
  - notes, discoveredAt, submittedAt, awardedAt, lostAt

BDInteraction
  - opportunityId (FK BDOpportunity)
  - type: call | email | meeting | proposal_submission | negotiation
  - date, notes, contactName

BDDocument
  - opportunityId (FK BDOpportunity)
  - name, documentType: rfp | proposal | bid | contract | capability_statement
  - fileUrl, uploadedAt
```

**Existing Data Sources:**
- `ProcurementOpportunity` — SAM.gov opportunities with agency, setAside, responseDeadline, tags
- `SavedProcurementSearch` — User's saved searches with alertEnabled
- `GovernmentContractAward` — Historical win data for pricing intelligence
- `FundingOpportunity` — SBIR/STTR/grants with deadlines
- `TeamingOpportunity` — Teaming arrangements for proposals
- SAM.gov fetcher at `src/lib/procurement/sam-gov.ts` — fetches opportunities by NAICS/agency

**Implementation:**
- New page: `/bd-pipeline`
- New APIs: CRUD at `/api/bd-pipeline/` + `/api/bd-pipeline/[id]/interactions`
- Auto-import: "Add to Pipeline" button on procurement opportunity pages
- Dashboard tab: Add "Pipeline" tab to provider dashboard
- Gate: Pro/Enterprise tier

**Cross-Feature Dependencies:**
- Feeds from: SAM.gov procurement data, RFQ system, Partnership Requests
- Feeds into: Proposal Intelligence (win/loss tracking), Executive Command Center (pipeline snapshot)

---

### 1.3 Enhanced Company Profiles as Sales Tools
**Impact: 5/5 | Feasibility: 4/5 | Revenue: 5/5**

Turn company profiles into lead generation and sales enablement machines.

**New Capabilities:**
1. **Case Studies Section** — New `CaseStudy` model (title, summary, content, metrics JSON, clientName, sector)
2. **Capability Statement** — Auto-generated from CompanyProfile data, downloadable as PDF
3. **"Request a Meeting" Button** — New `MeetingRequest` model (visitorName, email, message, preferredDate, status)
4. **Anonymous Viewer Analytics** — New `CompanyProfileView` model (viewerCompanyName inferred from email domain, sectionsViewed[], timeSpentMs)
5. **One-Pager PDF Export** — Server-side generation via Puppeteer (already installed: puppeteer@^24.40.0)

**Existing Infrastructure:**
- `sponsorTier` (verified/premium) — tiered company presence already exists
- `sponsorAnalytics` JSON (views, clicks, leads) — basic analytics in place
- `sponsorBanner`, `sponsorTagline` — premium visual branding
- Leads endpoint at `/api/company-profiles/[slug]/leads` — captures leads for premium sponsors
- Sponsor checkout via Stripe at `/api/company-profiles/sponsor/checkout`
- `chart-export.ts` — client-side SVG→PNG export; `export-utils.ts` — CSV/JSON export
- Puppeteer installed for server-side PDF generation

**Implementation:**
- Extend CompanyProfile page with case studies tab
- New APIs: `/api/company-profiles/[slug]/case-studies` (CRUD), `/api/company-profiles/[slug]/meeting-requests` (POST/GET)
- PDF generation: `/api/company-profiles/[slug]/one-pager` — renders HTML template → PDF via Puppeteer
- Profile view tracking: Middleware or API-level tracking on profile GET
- Gate: Case studies (all claimed), Meeting requests (verified+), Viewer analytics (premium), PDF export (pro+)

**Cross-Feature Dependencies:**
- Feeds from: ServiceListing (showcase capabilities), GovernmentContractAward (past performance)
- Feeds into: Lead generation, BD Pipeline (meeting → opportunity), Analytics dashboard

---

## TIER 2: INTELLIGENCE PRODUCTS (P1)

### 2.1 Company Intelligence Dossiers
**Impact: 5/5 | Feasibility: 4/5 | Revenue: 5/5**

On-demand deep-dive report on any company. CEOs currently pay $500-$2,000 for this.

**Report Sections (14 sections, all from existing data):**
1. Executive Summary (Claude-generated synthesis)
2. Company Overview (CompanyProfile core fields)
3. Financial Snapshot (totalFunding, valuation, FundingRound history)
4. Leadership & Team (KeyPersonnel with tenure, previousCompanies)
5. Products & Technology (CompanyProduct with specs JSON, SatelliteAsset)
6. Government Contracts (GovernmentContractAward with value trends)
7. Funding & Investors (FundingRound timeline with investor tracking)
8. Partnerships & Customers (Partnership, TeamingOpportunity, Proposal awarded)
9. Competitive Landscape (CompetitiveMapping, CompanyScore market_position)
10. Acquisitions & M&A (MergerAcquisition as acquirer and target)
11. SEC Filings (SECFiling with highlights JSON — public companies only)
12. Market Sentiment & News (NewsArticle by companyTags, CompanyEvent)
13. Investment Thesis (Claude-generated via existing `/api/investment-thesis`)
14. Data Quality (calculateCompletenessBreakdown() — 5-category scoring)

**Existing Infrastructure:**
- Investment thesis generator at `/api/investment-thesis` — Claude synthesis pattern proven
- Report generator at `src/lib/report-generator.ts` — 4 report types with data gathering
- Company completeness scoring at `src/lib/company-completeness.ts`
- Puppeteer installed for PDF export
- `export-utils.ts` — CSV/JSON domain-specific exporters

**Implementation:**
- New API: `POST /api/reports/dossier` with `{ companySlug }` — gathers all 25+ related models, sends to Claude, formats as HTML
- PDF export: `/api/reports/dossier/export?slug=X&format=pdf` — Puppeteer HTML→PDF
- Gate: 1 free sample, 5/month Pro, unlimited Enterprise (reuse report-templates.ts tier limits)
- Price: $49 per dossier or included in Enterprise

**Cross-Feature Dependencies:**
- Feeds from: ALL company data models, Investment Thesis, Company Scores
- Feeds into: BD Pipeline (pre-meeting prep), Executive Command Center (competitor intel)

---

### 2.2 Competitive Intelligence War Room
**Impact: 5/5 | Feasibility: 3/5 | Revenue: 5/5**

Side-by-side competitive dashboards with temporal trend analysis.

**Dashboard Panels:**
1. **Headcount Trends** — KeyPersonnel (startDate, endDate, isCurrent) grouped by quarter
2. **Contract Win Rates** — GovernmentContractAward grouped by agency/quarter with value trends
3. **Funding Velocity** — FundingRound timeline with series progression and time-between-rounds
4. **Executive Stability Index** — Average tenure by role, departure rate per quarter (red flags)
5. **Product Launch Cadence** — CompanyProduct (launchDate, status) by category over time
6. **Side-by-Side Metrics Table** — Up to 5 competitors (reuse `/compare/companies` pattern)

**Existing Infrastructure:**
- `CompetitiveMapping` model — company-to-company relationships by segment
- `CompanyScore` model — 7 score types with breakdown JSON (temporal via calculatedAt)
- Compare pages at `/compare/companies` — side-by-side comparison already working
- `ExecutiveMove` model — tracks departures/hires/promotions with dates
- All temporal models have date fields enabling trend analysis

**Implementation:**
- New page: `/intelligence/war-room`
- New API: `GET /api/intelligence/war-room?companies=slug1,slug2&period=3y`
- Prisma aggregate queries: GROUP BY quarter on contracts, funding, personnel
- Recharts visualizations (line charts, bar charts — already used throughout site)
- Gate: Enterprise tier

**Cross-Feature Dependencies:**
- Feeds from: CompetitiveMapping, all temporal company data
- Feeds into: Company Dossiers (competitive landscape section), Board Prep Reports

---

### 2.3 AI Board Prep Reports
**Impact: 5/5 | Feasibility: 4/5 | Revenue: 5/5**

One-click quarterly board briefing document. CEOs spend 10-20 hours preparing manually.

**Report Sections:**
1. Company Performance Summary (last 90 days: news, events, contracts won)
2. Competitive Landscape Changes (competitor signals, exec moves, funding)
3. Regulatory Developments (ProposedRegulation + PolicyChange with high impact in sector)
4. Market Sizing Update (MARKET_SEGMENTS data for relevant segments)
5. Talent & Workforce Conditions (WorkforceTrend, salary trends, skills demand)
6. Investment Activity (FundingRound + GovernmentContractAward + MergerAcquisition in sector)
7. Strategic Opportunities (AI-identified from procurement + marketplace data)
8. Key Risks & Mitigations (regulatory, competitive, talent)

**Existing Infrastructure:**
- Intelligence brief generator — same Claude synthesis pattern (intelligence-brief.ts)
- Company digest generator — AI summarization of company-specific data
- Market sizing data — 14 segments with TAM/CAGR/projections to 2035
- All regulatory models with impact severity and deadlines

**Implementation:**
- New API: `POST /api/reports/board-prep` with `{ companySlug, period: '90d' }`
- Gather 90 days of data across all models → Claude synthesis → structured report
- PDF export via Puppeteer with executive formatting
- Gate: Enterprise tier, $199/report or included in Enterprise
- Schedule: Optional quarterly auto-generation via cron

---

### 2.4 Proposal Intelligence System
**Impact: 5/5 | Feasibility: 3/5 | Revenue: 5/5**

Historical win analysis, pricing intelligence, and team composition analytics.

**Capabilities:**
1. **Win Analysis by Agency/NAICS** — GovernmentContractAward aggregated by agency, naicsCode, setAside with win counts and values
2. **Pricing Intelligence** — Average contract values by NAICS + agency + setAside; bid/award ratio analysis
3. **Team Composition Analytics** — KeyPersonnel at time of proposal; which roles correlate with wins
4. **Past Performance Tracker** — Contract completion rates, duration trends, customer ratings (ProviderReview)
5. **Set-Aside Qualification Analysis** — Win rates by set-aside category (8(a), HUBZone, WOSB, SDVOSB)
6. **Pipeline Forecasting** — Open RFQs × historical win rate = expected revenue

**Existing Data:**
- `GovernmentContractAward` — agency, value, naicsCode, setAside, awardDate, performancePeriod (all indexed)
- `Proposal` — status tracking with submittedAt, price
- `RFQ` — budgetMin/Max, complianceReqs, awardedToCompanyId
- `ProviderReview` — overallRating, qualityRating, timelineRating (5 rating dimensions)

**Implementation:**
- New page: `/intelligence/proposals`
- New API: `GET /api/intelligence/proposal-analytics?companyId=X`
- Prisma aggregate queries with GROUP BY on agency, naicsCode, setAside, quarter
- Recharts heatmaps (win rate by category × agency)
- Gate: Enterprise tier

---

## TIER 3: EMPLOYEE ENGAGEMENT (P2)

### 3.1 Space Career Intelligence
**Impact: 4/5 | Feasibility: 3/5 | Revenue: 3/5**

Beyond job listings — personalized career intelligence for space professionals.

**Capabilities:**
1. **Salary Benchmarking** — By role/location/clearance with confidence intervals (SpaceJobPosting has salaryMin/Max/Median)
2. **Career Path Visualization** — Progression trees by specialization (entry → mid → senior → lead → director)
3. **Skills Gap Analysis** — Compare WorkerProfile.skills against WorkforceTrend.topSkills
4. **Clearance Premium Calculator** — "With TS/SCI, median salary is $X vs $Y without" (unique to space industry)
5. **Company Culture Signals** — Derived from hiring velocity (ExecutiveMove) and retention (KeyPersonnel tenure)

**Existing Data:**
- `SpaceJobPosting` — 42+ postings with full salary, category, specialization, clearance data
- `WorkforceTrend` — 8 quarters of aggregate data (totalOpenings, avgSalary, topSkills, yoyGrowth)
- `WorkerProfile` — skills[], experienceYears, hourlyRate, clearanceLevel
- `getSalaryBenchmarks()` — aggregates by category (6) and seniority (7), returns avgMin/Max/Median

**Implementation:**
- New page: `/career-intelligence`
- Personalized: Matches user's WorkerProfile against job market data
- Gate: Free (limited), Pro (full benchmarks + career paths)

---

### 3.2 Technical Standards & Compliance Checklist Engine
**Impact: 4/5 | Feasibility: 4/5 | Revenue: 4/5**

Interactive compliance workflows replacing static reference pages.

**Existing Infrastructure (rich):**
- `RegulatoryAgency` model — FAA, FCC, NOAA, DDTC, BIS with keyStatutes, keyRegulations
- `SpaceLicenseType` — processingDaysMin/Max, applicationFeeMin/Max, keyRequirements, guidanceDocuments
- `LicenseRequirement` — by agency/category (launch, satellite, remote_sensing, spectrum, export)
- `ExportClassification` — ITAR/EAR with regime, classification, category, controlReason
- `ECCNClassification` — ECCN codes with licenseRequirements, licenseExceptions, spaceRelevance
- Compliance checklist page at `/compliance-checklist` — 26 items across 5 categories with localStorage persistence

**Enhancement:**
- Make checklist **server-persisted** (per-user progress tracking in database)
- **Auto-populate** based on company sector and products
- **Interactive license finder** — decision tree: "What are you launching?" → required licenses/permits
- **ITAR compliance wizard** — step-by-step DDTC registration + classification guide
- **Deadline tracking** — connect to ProposedRegulation.commentDeadline for regulatory alerts

**Implementation:**
- New model: `ComplianceProgress` (userId, companyId, checklistItems JSON, completedItems[], lastUpdatedAt)
- Extend compliance checklist to persist via API
- Connect to notification system for deadline reminders
- Gate: Pro tier

---

### 3.3 Recruitment Suite Enhancement
**Impact: 4/5 | Feasibility: 3/5 | Revenue: 5/5**

Transform job posting into full talent acquisition platform.

**New Capabilities:**
1. **Applicant Tracking** — New `JobApplication` model (status: applied → reviewed → shortlisted → interviewed → offered → hired → rejected)
2. **Job Promotion/Boosting** — Featured placement in talent board, sponsored job cards
3. **Talent Search** — Search WorkerProfile by skills, clearance, location, availability
4. **Automated Job Matching** — When job posted, notify matching WorkerProfiles (skills intersection)
5. **Application Analytics** — Views, applications, conversion rates per posting

**Existing Infrastructure:**
- `SpaceJobPosting` with companyProfileId — company-linked jobs already working
- `GigOpportunity` with companyProfileId — gig posting working
- `WorkerProfile` — skills[], availability, clearanceLevel
- Provider dashboard "Jobs" tab — post/manage jobs already built

**Implementation:**
- New models: `JobApplication`, `JobPromotion`, `AutomatedJobMatch`
- New APIs: `/api/company-profiles/[slug]/jobs/[id]/applications` (GET/POST)
- Matching engine: Compare SpaceJobPosting.specialization/category against WorkerProfile.skills
- Gate: Job posting (free for claimed), Applicant tracking (Pro), Talent search (Enterprise)

---

## TIER 4: COMMUNITY & NETWORK EFFECTS (P2-P3)

### 4.1 Company-Tagged Forum Discussions
**Impact: 4/5 | Feasibility: 5/5 | Revenue: 3/5**

Nearly zero engineering needed — schema already supports this.

**Already Built:**
- ForumThread.companyId and ForumPost.companyId fields exist in schema
- `postAsCompany` flag implemented in thread creation and reply APIs
- CompanyProfile has `forumThreads` and `forumPosts` relations

**Remaining Work:**
- UI: Add "Post as [Company Name]" toggle in forum compose form
- UI: Show company logo + verified badge on company-authored posts
- Company profile page: Add "Community Discussions" tab showing threads tagged to this company
- "Start discussion about [Company]" button on company profile
- Weight company-official posts higher in trending algorithm

**Implementation:** Mostly UI changes to existing forum components
- Update `ThreadCard.tsx` to show company identity
- Add company discussions API: `GET /api/company-profiles/[slug]/discussions`

---

### 4.2 Industry Expert AMAs
**Impact: 4/5 | Feasibility: 5/5 | Revenue: 2/5**

Scheduled live Q&A events using existing forum infrastructure.

**New Models:**
```
AMASession
  - expertUserId, companyId (optional)
  - title, description, scheduledStart, scheduledEnd
  - forumThreadId (link to auto-created discussion thread)
  - status: upcoming | live | completed
  - maxQuestions

AMAQuestion
  - sessionId, userId
  - content, upvoteCount
  - status: pending | answered | skipped
  - answerContent, answeredAt
```

**Implementation:**
- Create AMA event → auto-create ForumThread in 'announcements' category
- Landing page: `/community/ama`
- Notify subscribers and newsletter
- Gate: Free to participate, scheduled by admins

---

### 4.3 Referral & Introduction Network
**Impact: 5/5 | Feasibility: 3/5 | Revenue: 3/5**

LinkedIn-style introductions for the space industry.

**New Models:**
```
IntroductionRequest
  - fromUserId, toUserId (mutual connection), aboutUserId (person to meet)
  - message, status: pending | accepted | declined
  - requestedAt, respondedAt
```

**Existing Infrastructure:**
- `UserFollow` — bidirectional social graph (followers/following)
- `ProfessionalProfile` — headline, bio, expertise[], linkedinUrl
- `DirectMessage` + `Conversation` — messaging system for facilitated intros

**Implementation:**
- "Request Introduction" button on professional profiles
- Intro flow: Requester → Mutual Connection → Target
- Gate: Pro tier (limited intros/month), Enterprise (unlimited)

---

### 4.4 Company Benchmarking Reports
**Impact: 4/5 | Feasibility: 4/5 | Revenue: 3/5**

Auto-generated quarterly "Space Industry Report Cards."

**Existing Infrastructure:**
- `CompanyScore` model — 7 score types (overall, technology, team, funding, market_position, growth, momentum) with breakdown JSON
- `CompanyDigest` — periodic AI-generated summaries
- Report-cards page at `/report-cards` — already exists
- `calculateCompletenessBreakdown()` — 5-category scoring system

**Enhancement:**
- Generate sector-level rankings (sort companies by scoreType within sector)
- Quarterly auto-generation via cron
- Shareable badges: "Ranked #1 in launch provider efficiency by SpaceNexus"
- Gate: Free (top 10 visible), Pro (full rankings + export)

---

## TIER 5: PREMIUM DATA PRODUCTS (P1-P2)

### 5.1 Space Market Intelligence Reports
**Impact: 5/5 | Feasibility: 3/5 | Revenue: 5/5**

Monthly/quarterly deep-dive reports by segment. Bryce Tech charges $5K-$20K per report.

**Existing Data:**
- Market sizing: 14 segments with current TAM, projected TAM, CAGR, government share, key players, trends
- FundingRound, GovernmentContractAward, MergerAcquisition — temporal transaction data
- NewsArticle — categorized industry news
- CompanyProfile — 101 companies with sector classification

**Implementation:**
- Segment-specific reports generated via Claude from aggregated platform data
- Monthly cron: auto-generate for top 5 segments
- Pricing: $99-$499 per report, or included in Enterprise
- Gate: Enterprise tier for full reports, Pro for summaries

---

### 5.2 Funding & Investment Flow Tracker
**Impact: 5/5 | Feasibility: 4/5 | Revenue: 5/5**

Real-time tracking of investment flows into the space industry.

**Existing Data:**
- `FundingRound` — date, amount, seriesLabel, investors[], preValuation, postValuation (indexed by date, seriesLabel)
- `Investor` model — 70+ investors with type, AUM, fundSize, investmentStage[], sectorFocus[], portfolioCount, notableDeals[]
- SpaceCompany has isPreIPO, expectedIPODate, totalFunding

**Dashboard:**
- Total funding by quarter/year with YoY comparison
- Funding by sector, stage, geography
- Most active investors this quarter
- IPO pipeline tracker (pre-IPO companies with expected dates)
- Exit analysis (MergerAcquisition with prices and multiples)

**Implementation:**
- New page: `/investment-tracker`
- Prisma aggregate queries on FundingRound grouped by quarter, sector
- Recharts time-series visualizations
- Gate: Pro (summary), Enterprise (full data + API access)

---

### 5.3 Regulatory Impact Forecasting
**Impact: 5/5 | Feasibility: 3/5 | Revenue: 5/5**

AI-powered analysis of how regulations affect specific companies.

**Existing Data:**
- `ProposedRegulation` — impactAreas (JSON), impactSeverity, category, agency, commentDeadline
- `PolicyChange` — impactAnalysis, affectedParties (JSON), keyChanges
- `RegulationExplainer` — whoItAffects, affectedCompanyTypes (JSON), whatToDoNext
- `CompanyProfile` — sector, subsector, tags

**Implementation:**
- Match ProposedRegulation.impactAreas against CompanyProfile.sector/tags
- Claude synthesis: "How does [regulation] affect [company]?" using company context
- Auto-push to affected companies' watchlists
- Gate: Enterprise tier

---

### 5.4 Supply Chain Risk Dashboard
**Impact: 5/5 | Feasibility: 2/5 | Revenue: 5/5**

Supplier risk scoring, dependency mapping, ITAR compliance chain verification.

**Existing Data:**
- Supply chain data at `src/lib/supply-chain-data.ts` — 40+ companies with tier, products, customers, suppliers, criticality
- CompanyProfile — cageCode, samUei, naicsCode, dunsNumber
- CompanyScore — can add "supply_chain_risk" score type
- Supply chain page at `/supply-chain` — visualization already exists

**Data Gaps:**
- No real-time shortage data integration
- No geopolitical risk scoring model
- No dependency path analysis (3+ tiers deep)
- No supplier financial health scoring

**Implementation:**
- Extend supply chain data with risk scores derived from CompanyScore + public data
- Geopolitical risk overlay using FacilityLocation.country
- Alert when watched supplier shows risk signals
- Gate: Enterprise tier

---

### 5.5 Space Industry API Product Enhancement
**Impact: 4/5 | Feasibility: 4/5 | Revenue: 5/5**

Expand existing commercial API with premium data endpoints.

**Existing Infrastructure:**
- 11 v1 API endpoints at `/api/v1/` (companies, contracts, opportunities, launches, satellites, news, regulatory, etc.)
- ApiKey model with tier-based rate limiting (developer: 5K/mo, business: 50K/mo, enterprise: unlimited)
- ApiUsageLog tracking every call (endpoint, statusCode, responseTimeMs)
- API auth middleware at `src/lib/api-auth-middleware.ts`
- OpenAPI spec at `/api/v1/openapi.json`

**New Premium Endpoints:**
- `/api/v1/funding-rounds` — Funding data with investor details
- `/api/v1/executive-moves` — Leadership change tracking
- `/api/v1/market-sizing` — Segment TAM/CAGR data
- `/api/v1/company-scores` — Multi-dimensional company ratings
- `/api/v1/supply-chain` — Supply chain relationships and risk

**Pricing:** $500-$2,000/month for enterprise API access

---

## TIER 6: COLLABORATION TOOLS (P3)

### 6.1 Project Collaboration Workspace
**Impact: 3/5 | Feasibility: 3/5 | Revenue: 4/5**

Lightweight project rooms for cross-company proposal collaboration.

**Existing Infrastructure:**
- DealRoom model — name, description, accessCode, ndaRequired, ndaText
- DealRoomMember — role (owner/admin/viewer), ndaAcceptedAt
- DealRoomDocument — category (pitch_deck/financials/technical/legal), version tracking
- DealRoomActivity — full audit trail (viewed/uploaded/joined/accepted_nda)
- PartnershipRequest — company-to-company connect flow

**Enhancement:**
- Add task tracking to DealRoom (milestone, assignee, dueDate, status)
- Auto-create DealRoom when PartnershipRequest is accepted
- Template document structures based on collaboration type
- Gate: Pro tier

---

### 6.2 Space Knowledge Base (Wiki)
**Impact: 3/5 | Feasibility: 3/5 | Revenue: 2/5**

Community-curated reference content on space industry topics.

**New Models:**
```
WikiPage
  - slug, title, content (@db.Text), category
  - authorId, version, publishedAt
  - viewCount

WikiPageEdit
  - pageId, editorId, previousContent, editedAt
```

**Seed from:** 258 existing blog posts + regulatory reference data + compliance checklists

**Implementation:**
- New pages: `/knowledge-base`, `/knowledge-base/[slug]`
- Community editing with expert verification
- Link to forum discussions for commentary
- Gate: Free (read), Pro (edit)

---

## CROSS-FEATURE INTEGRATION MAP

```
Executive Command Center
    ├── reads from: Watchlist, Company Signals, Regulatory, Pipeline
    ├── links to: BD Pipeline, War Room, Board Reports
    └── drives: Daily engagement, morning workflow

BD Pipeline Tracker
    ├── reads from: SAM.gov, RFQ, TeamingOpportunity
    ├── links to: Proposal Intelligence, Deal Rooms
    └── drives: Revenue tracking, win/loss analysis

Enhanced Company Profiles
    ├── reads from: ServiceListing, Contracts, Reviews
    ├── links to: Lead Capture, Meeting Requests, Analytics
    └── drives: Company sponsorship revenue

Company Dossiers
    ├── reads from: ALL company models (25+)
    ├── links to: War Room, Board Reports, BD Pipeline
    └── drives: Per-report revenue, pre-meeting prep

Forum Company Identity
    ├── reads from: CompanyProfile, ForumThread/Post
    ├── links to: Company profile page, Notifications
    └── drives: Company engagement, verified responses

Proposal Intelligence
    ├── reads from: GovernmentContractAward, Proposal, RFQ
    ├── links to: BD Pipeline, War Room
    └── drives: Win rate improvement, pricing optimization
```

---

## IMPLEMENTATION ORDER

**Sprint 1-2 (P0):**
1. Executive Command Center (page + API aggregation)
2. BD Pipeline Tracker (new models + CRUD + dashboard tab)
3. Company-Tagged Forum UI (low effort, high engagement)

**Sprint 3-4 (P1):**
4. Company Intelligence Dossiers (Claude synthesis + PDF export)
5. Enhanced Company Profiles (case studies, meeting requests, viewer analytics)
6. Funding & Investment Flow Tracker (aggregate queries + visualization)

**Sprint 5-6 (P2):**
7. Competitive Intelligence War Room (temporal analysis + dashboards)
8. AI Board Prep Reports (quarterly generation + PDF)
9. Proposal Intelligence System (win analysis + pricing intelligence)
10. Space Career Intelligence (personalized benchmarking)

**Sprint 7+ (P3):**
11. Compliance Checklist Engine (interactive + server-persisted)
12. Recruitment Suite Enhancement (applicant tracking + matching)
13. Industry Expert AMAs (scheduled events)
14. Referral & Introduction Network (mutual connection intros)
15. Space Knowledge Base (wiki infrastructure)
16. Supply Chain Risk Dashboard (risk scoring + alerts)
17. Project Collaboration Workspace (extended deal rooms)
18. API Product Enhancement (premium endpoints)

---

## REVENUE IMPACT ESTIMATES

| Feature | Revenue Model | Est. Monthly Revenue |
|---------|--------------|---------------------|
| Executive Command Center | Pro/Enterprise upsell | Drives $2K-$5K MRR |
| BD Pipeline | Enterprise tier | $3K-$10K MRR |
| Enhanced Profiles | Sponsorship + leads | $5K-$15K MRR |
| Company Dossiers | Per-report ($49-$199) | $2K-$8K MRR |
| Board Prep Reports | Enterprise + per-report | $1K-$5K MRR |
| Proposal Intelligence | Enterprise tier | $3K-$10K MRR |
| Market Reports | Per-report ($99-$499) | $2K-$10K MRR |
| API Product | Subscription ($500-$2K/mo) | $5K-$20K MRR |
| Recruitment Suite | Per-posting + search | $1K-$5K MRR |

**Total addressable MRR from company suite: $24K-$88K**
