# SpaceNexus Marketplace Strategy

**The Space Industry's Premier Service Procurement Platform**

*Version 1.0 -- February 2026*

---

## Executive Summary

The global space economy is projected to exceed $1.8 trillion by 2035, yet the industry lacks a centralized, digital-first marketplace where service providers and customers can discover, evaluate, and procure space services. SpaceNexus is uniquely positioned to fill this gap.

Today, SpaceNexus already tracks 100+ space companies, catalogs 25+ orbital services with transparent pricing, monitors government contracts worth billions of dollars, and provides procurement intelligence across NASA, Space Force, and ESA. The platform has the foundational data infrastructure, company intelligence, and user base to evolve from an information platform into the **transactional hub** for space industry procurement.

This strategy outlines a phased 12-month plan to transform SpaceNexus into the definitive marketplace where space service providers list their capabilities and customers -- from government agencies to commercial enterprises to startups -- find, compare, and procure the services they need.

**Target Outcome:** $10M+ in marketplace GMV within 18 months, 500+ active service providers, and recognition as the industry's go-to procurement platform.

---

## Current State Assessment

### Existing Marketplace Assets

SpaceNexus already possesses significant marketplace infrastructure, though most features operate as **information layers** rather than **transactional systems**. Below is an honest assessment of each component.

#### 1. Company Profiles Directory (Maturity: HIGH)
- **What exists:** 101 company profiles across 3 tiers (31 Tier 1, 40 Tier 2, 30 Tier 3) with 9-tab detail pages covering financials, key personnel, products, contracts, satellite assets, facilities, competitive mapping, partnerships, and scoring.
- **Code:** `src/app/company-profiles/page.tsx` (directory with grid/list views, search, sector/tier/status filters, sorting), `src/app/api/company-profiles/route.ts` and `[slug]/route.ts`
- **Prisma models:** `CompanyProfile` with 15 related models (`FundingRound`, `CompanyProduct`, `KeyPersonnel`, `GovernmentContractAward`, `SatelliteAsset`, `FacilityLocation`, `CompanyScore`, `Partnership`, `MergerAcquisition`, `CompetitiveMapping`, `SECFiling`, `RevenueEstimate`)
- **Strength:** Rich data model with government contracting identifiers (`cageCode`, `samUei`, `naicsCode`, `dunsNumber`) that are critical for procurement workflows
- **Gap:** Profiles are read-only intelligence. Companies cannot claim or manage their own profiles, add service listings, or respond to inquiries.

#### 2. Orbital Services Marketplace (Maturity: MEDIUM)
- **What exists:** 25 orbital services across 6 categories (Earth Observation, In-Orbit Computing, Hosted Payloads, Space Solar, Communications, Sensor-as-a-Service) with transparent pricing data and 15 known contracts totaling ~$9B in value.
- **Code:** `src/lib/orbital-services-data.ts` (seed data with detailed pricing, specifications, margin estimates), API routes at `src/app/api/orbital-services/` (services, contracts, init, listing, request)
- **Prisma models:** `OrbitalService`, `OrbitalServiceContract`, `OrbitalServiceRequest`, `OrbitalServiceListing`
- **Strength:** Unique transparent pricing data (e.g., Satellogic $8-12/km^2, Maxar $25-29/km^2) that does not exist elsewhere in a structured, comparable format. The `OrbitalServiceRequest` and `OrbitalServiceListing` models already support basic two-sided marketplace mechanics.
- **Gap:** No matching engine between requests and providers. No provider self-service dashboard. Listing approval is manual admin-only. No communication channel between parties.

#### 3. Government Contracts & Procurement Intelligence (Maturity: MEDIUM-HIGH)
- **What exists:** 29 government contracts across NASA, USSF, and ESA with detailed financials. Full procurement intelligence module with SAM.gov integration, SBIR/STTR tracking, congressional activity monitoring, and budget analysis.
- **Code:** `src/lib/government-contracts-data.ts` (29 contracts with solicitation numbers, NAICS codes, value ranges), `src/app/api/procurement/` (7 API routes)
- **Prisma models:** `GovernmentContract`, `ProcurementOpportunity`, `SBIRSolicitation`, `SpaceBudgetItem`, `CongressionalActivity`, `SavedProcurementSearch`, `SavedSearchMatch`
- **Strength:** The `SavedProcurementSearch` model with alert capabilities already provides a "procurement monitoring" workflow. NAICS codes and set-aside classifications enable targeted matching.
- **Gap:** No teaming partner discovery. No subcontractor matching for large government contracts. No bid-no-bid decision support.

#### 4. Service Provider Submission (Maturity: LOW)
- **What exists:** A basic form submission endpoint that creates a `ServiceProviderSubmission` record and emails the admin.
- **Code:** `src/app/api/service-providers/route.ts` (Zod-validated POST with Resend email notification)
- **Prisma model:** `ServiceProviderSubmission` (7 fields: businessName, contactName, phone, email, website, description, pricing)
- **Strength:** The pipeline exists. Providers can submit their information.
- **Gap:** This is a one-way contact form, not a marketplace onboarding flow. No self-service profile management, no service catalog creation, no approval workflow beyond manual email review.

#### 5. Business Opportunities (Maturity: MEDIUM)
- **What exists:** AI-curated business opportunities with confidence scores, target audience filtering (entrepreneurs, investors, students, corporations), and category/type/timeframe classification. Integrated government contracts ticker.
- **Code:** `src/app/business-opportunities/page.tsx` (dual-tab with AI Opportunities and Government Contracts), `src/app/api/opportunities/`
- **Prisma model:** `BusinessOpportunity` with AI analysis metadata
- **Gap:** Opportunities are informational only. No "respond to opportunity" or "express interest" action. No way for providers to be matched to opportunities.

#### 6. Resource Exchange (Maturity: MEDIUM)
- **What exists:** A pricing calculator comparing Earth commodity prices against space delivery costs, with 8+ launch provider cost models across LEO/GEO/Moon/Mars destinations.
- **Code:** `src/app/resource-exchange/page.tsx` (interactive calculator with provider selection, destination pricing, export)
- **Prisma models:** `SpaceResource`, `LaunchProvider`
- **Gap:** Purely a calculator/information tool. No actual resource trading or procurement workflow.

#### 7. Revenue Infrastructure (Maturity: MEDIUM)
- **What exists:** Stripe payment integration with checkout, portal, and webhook handling. Subscription tiers (free, pro, enterprise). API key management with usage tracking and rate limits. Ad system with campaigns, impressions, and billing.
- **Prisma models:** `ApiKey`, `ApiUsageLog`, `Advertiser`, `AdCampaign`, `AdCreative`, `AdImpression`
- **Strength:** Payment rails are already built. The subscription model can be extended with marketplace transaction fees.

#### 8. Supply Chain Intelligence (Maturity: LOW-MEDIUM)
- **Types defined:** `SupplyChainCompany`, `SupplyRelationship`, `SupplyShortage` with tier classifications (prime, tier1-3) and geopolitical risk assessment.
- **Gap:** Types defined but limited implementation. This data could power a supply chain marketplace for component sourcing.

### Summary Maturity Matrix

| Component | Data Quality | UX Quality | Transaction-Ready | Priority |
|---|---|---|---|---|
| Company Profiles | HIGH | HIGH | LOW | Phase 1 |
| Orbital Services | HIGH | MEDIUM | LOW-MEDIUM | Phase 1 |
| Gov Contracts | HIGH | MEDIUM | LOW | Phase 1 |
| Service Provider Submissions | LOW | LOW | LOW | Phase 1 |
| Business Opportunities | MEDIUM | HIGH | LOW | Phase 2 |
| Resource Exchange | MEDIUM | HIGH | LOW | Phase 3 |
| Revenue Infrastructure | MEDIUM | MEDIUM | MEDIUM | Phase 1 |
| Supply Chain | LOW | LOW | LOW | Phase 2 |

---

## Marketplace Vision

### The End State: SpaceNexus as THE Space Services Marketplace

**For service providers (sellers),** SpaceNexus is where they:
- Create and manage verified company profiles with capabilities, certifications, and past performance
- List services with transparent pricing (building on the existing orbital services pricing model)
- Receive qualified inbound RFQs and RFPs matched to their capabilities
- Respond to government contract teaming opportunities
- Track their competitive positioning against peers
- Access analytics on market demand for their service categories
- Get verified badges that signal credibility to buyers

**For customers (buyers),** SpaceNexus is where they:
- Search and compare service providers across all space service categories
- Issue RFQs that get routed to qualified, verified providers
- Access transparent pricing benchmarks (no more opaque "contact us" pricing)
- Find teaming partners for government contracts
- Track procurement opportunities with saved searches and alerts
- Manage the full procurement lifecycle from discovery to contract execution
- Read reviews and past performance data from other buyers

**For the platform,** SpaceNexus generates revenue through:
- Transaction fees on facilitated deals
- Premium provider listings and verified badges
- Subscription upgrades for advanced marketplace features
- API access for procurement systems integration
- Sponsored placements in search results

### What Makes This Vision Achievable

SpaceNexus has three structural advantages that make this marketplace vision realistic rather than aspirational:

1. **The data is already here.** 101 company profiles, 25 orbital services with real pricing, 29 government contracts, procurement intelligence across 7 agencies -- this is the kind of structured, comprehensive data that takes years to build. Competitors would need to start from zero.

2. **Both sides of the market visit the platform.** Service providers come to SpaceNexus to track competitors and government opportunities. Buyers come to research companies and monitor procurement. Both sides are already on the platform; they just cannot transact with each other yet.

3. **The regulatory integration is a moat.** SpaceNexus uniquely integrates ITAR/EAR compliance data, export classifications, government contracting identifiers (CAGE codes, SAM UEI, NAICS), and regulatory intelligence. For a marketplace in a heavily regulated industry, this compliance layer is not a nice-to-have -- it is a prerequisite that competitors cannot easily replicate.

---

## Phase 1: Foundation (Months 0-3)

**Goal:** Transform SpaceNexus from an information platform into a functioning two-sided marketplace where providers can list services and buyers can discover and contact them.

### 1.1 Provider Self-Service Profiles (Priority: CRITICAL)

**Current state:** Companies have read-only intelligence profiles managed by admin seed data (`scripts/seed-company-profiles.ts`). The `ServiceProviderSubmission` model is a simple contact form.

**Target state:** Service providers can claim their existing profile (or create a new one), add service listings, manage their presence, and receive inbound inquiries.

**Implementation:**

- **Claim flow:** Add a "Claim this profile" button to each `CompanyProfile` detail page. Provider submits proof of affiliation (company email domain verification). Admin approves claim. The existing `CompanyProfile` model already has all necessary fields; add a `claimedByUserId` and `claimedAt` field.

- **Provider dashboard:** New page at `/provider-dashboard` where claimed profiles can:
  - Edit company description, contact info, and capabilities
  - Add/manage service listings (extending `OrbitalServiceListing` beyond the current pending-only workflow)
  - View profile analytics (views, search appearances, inquiry volume)
  - Respond to inbound service requests

- **Service catalog:** Each claimed profile can add multiple service listings. Extend the existing `OrbitalServiceListing` model to support:
  - Multiple service categories (not just orbital services -- extend to launch, ground segment, manufacturing, consulting, etc.)
  - Structured pricing tiers (free-form `pricingDetails` field replaced with structured pricing objects)
  - Certifications and past performance references
  - Service area / geographic coverage
  - Capacity and lead time information

**New Prisma models to create:**
```prisma
model ServiceListing {
  id              String          @id @default(cuid())
  companyId       String
  company         CompanyProfile  @relation(fields: [companyId], references: [id])
  slug            String          @unique
  name            String
  description     String          @db.Text
  category        String          // launch, ground_station, manufacturing, etc.
  subcategory     String?
  pricingType     String          // fixed, hourly, per_unit, subscription, rfq_only
  priceMin        Float?
  priceMax        Float?
  priceUnit       String?
  pricingNotes    String?
  specifications  Json?
  certifications  String[]        // ITAR, ISO 9001, AS9100, etc.
  pastPerformance String?         @db.Text
  leadTime        String?
  capacity        String?
  coverageArea    String?
  status          String          @default("active")
  featured        Boolean         @default(false)
  viewCount       Int             @default(0)
  inquiryCount    Int             @default(0)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}
```

**Effort:** 3-4 weeks
**Impact:** Unlocks the supply side of the marketplace

### 1.2 RFQ/RFP System (Priority: CRITICAL)

**Current state:** The `OrbitalServiceRequest` model exists but creates unstructured requests that go into an admin queue. No matching, no provider notification, no response workflow.

**Target state:** Buyers can submit structured RFQs that get matched to qualified providers, who can then respond with proposals.

**Implementation:**

- **RFQ submission form:** New page at `/marketplace/rfq/new`. Buyer specifies:
  - Service category and subcategory
  - Technical requirements (structured form based on category)
  - Budget range
  - Timeline / delivery date
  - Geographic / compliance requirements (ITAR, etc.)
  - Whether to broadcast to all matching providers or select specific ones

- **Matching algorithm:** Match RFQs to `ServiceListing` records based on:
  - Category alignment
  - Price range overlap
  - Certification requirements match (e.g., ITAR-cleared only)
  - Geographic coverage match
  - Provider tier and verification status
  - Past performance in similar contracts

- **Provider notification:** Matched providers receive email + in-app notification (leveraging the existing `AlertRule` / `AlertDelivery` system). Provider can view RFQ details and submit a proposal.

- **Proposal workflow:**
  - Provider views anonymized RFQ (buyer identity hidden until they choose to reveal)
  - Provider submits proposal with pricing, timeline, and approach
  - Buyer reviews proposals in a comparison view
  - Buyer can request clarification, shortlist providers, or award

**New Prisma models:**
```prisma
model RFQ {
  id              String     @id @default(cuid())
  slug            String     @unique
  buyerUserId     String
  title           String
  description     String     @db.Text
  category        String
  subcategory     String?
  requirements    Json
  budgetMin       Float?
  budgetMax       Float?
  budgetCurrency  String     @default("USD")
  deadline        DateTime?
  deliveryDate    DateTime?
  complianceReqs  String[]   // ITAR, AS9100, etc.
  isPublic        Boolean    @default(true)
  status          String     @default("open") // open, evaluating, awarded, cancelled
  awardedTo       String?    // CompanyProfile ID
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  proposals       Proposal[]
  matches         RFQProviderMatch[]
}

model Proposal {
  id            String         @id @default(cuid())
  rfqId         String
  rfq           RFQ            @relation(fields: [rfqId], references: [id])
  providerId    String         // CompanyProfile ID
  price         Float?
  pricingDetail String?        @db.Text
  timeline      String?
  approach      String?        @db.Text
  attachments   Json?
  status        String         @default("submitted") // submitted, shortlisted, awarded, rejected
  submittedAt   DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}
```

**Effort:** 4-5 weeks
**Impact:** Creates the core transaction loop of the marketplace

### 1.3 Verified Provider Badges (Priority: HIGH)

**Current state:** Company profiles have a `tier` field (1-3) assigned by admin, and a `dataCompleteness` score. No verification of provider claims.

**Target state:** Providers can earn verified badges that increase buyer confidence.

**Implementation:**

- **Verification levels:**
  - **Identity Verified:** Company email domain confirmed, business registration validated
  - **Capability Verified:** At least one government contract on record (`GovernmentContractAward` exists), or independent verification of stated capabilities
  - **Performance Verified:** 5+ completed marketplace transactions with buyer ratings above 4.0

- **Badge display:** Add badges to company cards in the directory (`CompanyCardComponent` in `company-profiles/page.tsx`), service listings, and proposal responses.

- **Data leverage:** The existing `cageCode`, `samUei`, `dunsNumber` fields on `CompanyProfile` can be cross-referenced against SAM.gov to auto-verify government contracting capability. This is a unique advantage -- no other marketplace has this built-in.

**Effort:** 2 weeks
**Impact:** Builds trust on the platform, differentiates from simple directories

### 1.4 Review & Rating System (Priority: HIGH)

**Current state:** The `CompanyScore` model exists but only stores algorithmic scores (technology, team, funding, etc.), not user-submitted reviews.

**Target state:** Buyers who have completed transactions can rate and review providers.

**Implementation:**

```prisma
model ProviderReview {
  id             String          @id @default(cuid())
  providerId     String          // CompanyProfile ID
  reviewerUserId String
  rfqId          String?         // Link to original RFQ if applicable
  overallRating  Int             // 1-5 stars
  qualityRating  Int?
  timelineRating Int?
  commRating     Int?            // Communication rating
  valueRating    Int?
  title          String?
  content        String?         @db.Text
  isVerified     Boolean         @default(false) // Verified transaction
  status         String          @default("published")
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}
```

**Effort:** 2 weeks
**Impact:** Creates data moat through user-generated content that competitors cannot replicate

### 1.5 Enhanced Service Category Taxonomy (Priority: MEDIUM)

**Current state:** Service categories are split across multiple models with different taxonomies. `OrbitalService` uses 6 categories. `BusinessOpportunity` uses 9 categories. `GovernmentContract` uses 10 categories.

**Target state:** A unified service taxonomy that covers the full space industry value chain.

**Proposed taxonomy:**
1. **Launch Services** -- Dedicated launch, rideshare, rapid/responsive launch, orbital transfer
2. **Satellite Services** -- Earth observation (optical, SAR, hyperspectral), communications (data relay, ground station, IoT), navigation
3. **In-Space Services** -- Hosted payloads, in-orbit computing, satellite servicing (RPO/refueling/deorbit), space logistics
4. **Ground Segment** -- Ground stations (GaaS), mission control, data processing, antenna networks
5. **Manufacturing & Components** -- Satellite buses, propulsion systems, avionics, solar arrays, structures
6. **Engineering & Consulting** -- Systems engineering, mission design, regulatory consulting, testing & qualification
7. **Space Environment** -- Weather/radiation monitoring, debris tracking, conjunction assessment
8. **R&D Services** -- Materials research, microgravity experiments, technology demonstration
9. **Human Spaceflight** -- Crew transport, habitat modules, life support, space tourism
10. **Space Power** -- Space solar, in-orbit power, power beaming

**Effort:** 1-2 weeks
**Impact:** Enables accurate matching and discoverability across the entire marketplace

### 1.6 Migrate Existing Data Into Marketplace Framework

**Current state:** Orbital services data in `orbital-services-data.ts` is seeded as static reference data.

**Target state:** These 25 services become the first "listings" in the marketplace, demonstrating the format for new provider submissions.

**Implementation:**
- Write migration script to create `ServiceListing` records from `OrbitalService` data
- Link to relevant `CompanyProfile` records via `providerSlug`
- Preserve pricing transparency (this is a differentiator)
- Flag these as "SpaceNexus Verified" listings (verified by editorial team, not provider-submitted)

**Effort:** 1 week
**Impact:** Day-one marketplace has 25+ professional listings with real pricing data

---

## Phase 1 Implementation Status

*Last updated: February 2026*

### 1.1 Provider Self-Service Profiles — COMPLETE
- **Status:** Fully implemented and deployed
- **What was built:** Company profile claim flow, provider dashboard at `/provider-dashboard`, ServiceListing model with full CRUD, marketplace search/browse at `/marketplace/search`, listing detail pages at `/marketplace/listings/[slug]`
- **Key files:** `src/app/provider-dashboard/page.tsx`, `src/app/api/company-profiles/[slug]/claim/route.ts`, `src/app/api/marketplace/listings/route.ts`
- **Seed data:** 80 editorial service listings across 41 companies via `scripts/seed-marketplace.ts`
- **Notes:** CompanyProfile extended with `claimedByUserId`, `claimedAt`, `marketplaceActive` fields

### 1.2 RFQ/RFP System — COMPLETE
- **Status:** Fully implemented with clarifications, deadline processing, and email notifications
- **What was built:**
  - RFQ creation with AI-powered provider matching (`/marketplace/rfq/new`)
  - Proposal submission and management (`/api/marketplace/proposals`)
  - **Q&A Clarification system** — providers ask questions, buyers answer, public/private visibility (`RFQClarification` model, `/api/marketplace/rfq/[id]/clarifications`)
  - **Deadline enforcement cron** — auto-transitions expired RFQs to "evaluating", stale evaluating to "closed" (`/api/marketplace/rfq/process`)
  - **Countdown display** — color-coded deadline badges (red ≤3 days, orange ≤7 days, green) on RFQ detail pages
  - **Email notifications** — 4 templates: RFQ match, proposal received, proposal status change, clarification Q&A
- **Key files:** `src/app/api/marketplace/rfq/[id]/clarifications/route.ts`, `src/app/api/marketplace/rfq/process/route.ts`, `src/components/marketplace/ClarificationThread.tsx`
- **Prisma:** New `RFQClarification` model with rfqId, authorId, authorRole, question, answer, isPublic, answeredAt

### 1.3 Verified Provider Badges — COMPLETE
- **Status:** Fully implemented with auto-verification engine and admin override
- **What was built:**
  - **Verification engine** — auto-evaluates companies for 3 levels: Identity (claimed profile), Capability (gov contract OR SAM/CAGE registration OR 3+ certified listings), Performance (5+ reviews avg ≥4.0 AND awarded RFQ)
  - **Batch evaluation** — cron endpoint processes all claimed companies, upgrades qualifying ones (`POST /api/marketplace/verify`)
  - **Admin override** — admin can manually set verification level + notes (`PUT /api/marketplace/verify/admin`)
  - **Enhanced VerificationBadge component** — tooltip with criteria descriptions for each level
  - **Provider dashboard integration** — verification progress card with criteria checklist and upgrade notification
  - **Email notification** — template for verification level upgrades
- **Key files:** `src/lib/marketplace/verification-engine.ts`, `src/app/api/marketplace/verify/route.ts`, `src/components/marketplace/VerificationBadge.tsx`
- **Prisma:** CompanyProfile extended with `verificationDocuments Json?`, `verificationNotes String?`

### 1.4 Review & Rating System — COMPLETE
- **Status:** Fully implemented with review form, provider responses, and rating distribution
- **What was built:**
  - **ReviewForm component** — star selectors for 5 rating categories (overall, quality, timeline, communication, value), title, content, verified transaction detection
  - **RatingDistribution component** — horizontal bar histogram of 1-5 star ratings + sub-rating averages grid
  - **Provider responses** — company owners can respond to reviews via `PUT /api/marketplace/reviews/[id]` (one response per review)
  - **Duplicate prevention** — unique constraint `@@unique([companyId, reviewerUserId])` ensures one review per user per company
  - **Admin moderation** — admin can hide inappropriate reviews via `DELETE /api/marketplace/reviews/[id]`
  - **Listing detail integration** — rating distribution + review form displayed on listing pages, "Write a Review" CTA
  - **Email notifications** — review notification and review response templates
- **Key files:** `src/components/marketplace/ReviewForm.tsx`, `src/components/marketplace/RatingDistribution.tsx`, `src/app/api/marketplace/reviews/[id]/route.ts`
- **Prisma:** ProviderReview extended with `providerResponse String?`, `providerRespondedAt DateTime?`, `@@unique([companyId, reviewerUserId])`

### 1.5 Enhanced Service Category Taxonomy — COMPLETE
- **Status:** Fully implemented with descriptions, match weights, and helpers
- **What was built:**
  - 10 categories with 38 subcategories, each with `description` and `matchWeight` (0.0-1.0) for smarter matching
  - 12 certifications grouped into 4 categories (Export Control, Quality, Process, Security)
  - Helper functions: `getMatchingCategories(query)` for text-based category suggestions, `getCertificationsByGroup()` for grouped cert display, `getSubcategoryDescription(category, subcategory)` for tooltips
  - Validation schemas: `rfqClarificationSchema`, `rfqClarificationAnswerSchema`, `reviewResponseSchema`
- **Key files:** `src/lib/marketplace-types.ts`, `src/lib/validations.ts`

### 1.6 Migrate Existing Data Into Marketplace Framework — COMPLETE
- **Status:** Migration script ready, schema extended with editorial tracking
- **What was built:**
  - **Migration script** — `scripts/migrate-orbital-to-marketplace.ts` maps 43 orbital services to ServiceListing records linked to matching CompanyProfiles
  - **Category mapping** — 11 orbital categories mapped to marketplace categories/subcategories
  - **Pricing mapping** — 11 pricing models mapped to marketplace pricing types
  - **Editorial tracking** — `isEditorial Boolean` and `sourceService String?` fields on ServiceListing
  - **UI integration** — purple "Editorial" badge on MarketplaceCard, "Claim this listing" banner on detail pages for unclaimed editorial listings
- **Key files:** `scripts/migrate-orbital-to-marketplace.ts`, `src/components/marketplace/MarketplaceCard.tsx`
- **Run:** `npx tsx scripts/migrate-orbital-to-marketplace.ts`

### Phase 1 File Inventory (New Files Created)

| File | Purpose |
|---|---|
| `src/lib/marketplace/verification-engine.ts` | Auto-verification evaluation logic |
| `src/app/api/marketplace/verify/route.ts` | Verification status API + batch cron |
| `src/app/api/marketplace/verify/admin/route.ts` | Admin verification override |
| `src/app/api/marketplace/reviews/[id]/route.ts` | Single review detail, provider response, admin moderation |
| `src/app/api/marketplace/rfq/[id]/clarifications/route.ts` | RFQ Q&A clarification system |
| `src/app/api/marketplace/rfq/process/route.ts` | Deadline enforcement cron |
| `src/components/marketplace/ReviewForm.tsx` | Star rating review submission form |
| `src/components/marketplace/RatingDistribution.tsx` | Rating histogram + sub-rating averages |
| `src/components/marketplace/ClarificationThread.tsx` | Q&A thread display + ask/answer forms |
| `scripts/migrate-orbital-to-marketplace.ts` | Orbital services → marketplace migration |

### Phase 1 Modified Files

| File | Changes |
|---|---|
| `prisma/schema.prisma` | RFQClarification model, ServiceListing + ProviderReview + CompanyProfile fields |
| `src/lib/marketplace-types.ts` | Subcategory descriptions, match weights, helper functions |
| `src/lib/validations.ts` | 3 new schemas + type exports |
| `src/lib/newsletter/email-templates.ts` | 7 marketplace email templates |
| `src/components/marketplace/MarketplaceCard.tsx` | Editorial badge |
| `src/components/marketplace/ReviewCard.tsx` | Provider response display |
| `src/components/marketplace/VerificationBadge.tsx` | Tooltip with criteria descriptions |
| `src/app/marketplace/listings/[slug]/page.tsx` | Rating distribution, review form, editorial banner |
| `src/app/marketplace/rfq/[id]/page.tsx` | Clarification thread, deadline countdown |
| `src/app/provider-dashboard/page.tsx` | Verification progress card |
| `src/app/api/marketplace/rfq/[id]/route.ts` | Clarification count in response |
| `src/app/api/marketplace/listings/[slug]/route.ts` | Rating distribution data |
| `src/app/api/marketplace/reviews/route.ts` | Duplicate review prevention |

---

## Phase 2: Growth (Months 3-6)

**Goal:** Scale both sides of the marketplace with tools that make SpaceNexus indispensable for space procurement workflows.

### 2.1 Intelligent Matching Engine

**Current state:** No matching capability. Service requests and provider listings exist independently.

**Target state:** AI-powered matching that considers capability alignment, past performance, pricing compatibility, compliance requirements, and relationship history.

**Implementation:**
- **Scoring algorithm:** Weighted scoring across dimensions:
  - Category/subcategory match (30%)
  - Price range compatibility (20%)
  - Compliance/certification match (20%)
  - Past performance relevance (15%)
  - Response time/availability (10%)
  - Provider verification level (5%)

- **Proactive recommendations:** When a new RFQ is posted, automatically identify and rank the top 10 matching providers. When a new provider lists a service, surface relevant open RFQs.

- **"Providers like you" recommendations:** For buyers viewing a company profile, suggest similar providers based on `CompetitiveMapping` data already in the database.

**Effort:** 3-4 weeks
**Impact:** Reduces time-to-match from weeks (industry average for manual RFQ processes) to minutes

### 2.2 Escrow & Payments for Services

**Current state:** Stripe integration exists for subscriptions (`src/lib/stripe.ts`, checkout/portal/webhook routes). No transaction-level payment handling.

**Target state:** SpaceNexus facilitates payment for marketplace transactions, with escrow for milestone-based contracts.

**Implementation:**
- Extend Stripe integration with `PaymentIntent` for one-time service purchases
- Milestone-based escrow: Buyer funds are held until delivery milestones are confirmed
- Support for various payment structures common in space procurement:
  - Fixed-price (release on delivery)
  - Time-and-materials (monthly billing based on reported hours)
  - Milestone-based (partial releases at defined milestones)
  - Subscription (recurring services like ground station passes)
- SpaceNexus takes a platform fee (see Revenue Model section)

**Effort:** 4-5 weeks
**Impact:** Enables actual transactions, generates transaction fee revenue

### 2.3 Marketplace Analytics Dashboard

**Current state:** Basic stats exist on the company profiles page (total companies, funding tracked, market cap). No marketplace-specific analytics.

**Target state:** Both providers and buyers get data-driven insights.

**Provider analytics:**
- Profile view count and trend
- Search appearance count and ranking keywords
- RFQ match rate and win rate
- Competitive benchmarking (how your pricing compares to category average)
- Market demand trends for your service categories

**Buyer analytics:**
- RFQ response rate and average time to first response
- Price benchmarking (are you paying market rate?)
- Provider landscape analysis for planned procurements
- Spend tracking across providers and categories

**Platform analytics (admin):**
- GMV (Gross Marketplace Value) tracked and facilitated
- Active providers and buyers by category
- RFQ-to-award conversion funnel
- Popular search terms and unmatched demand (categories where buyers search but few providers exist)

**Effort:** 3-4 weeks
**Impact:** Provides the data network effects that lock in users -- the more they use the marketplace, the better their insights

### 2.4 Provider Dashboards

**Current state:** No provider-facing dashboard.

**Target state:** A comprehensive provider portal at `/provider-dashboard`.

**Features:**
- **Inbox:** Incoming RFQs, messages from buyers, platform notifications
- **Listings manager:** Create, edit, pause, and analyze service listings
- **Proposals tracker:** Active proposals with status, win/loss tracking
- **Analytics:** Views, inquiries, conversion rates, competitive positioning
- **Profile editor:** Manage company information, team, certifications, past performance
- **Revenue tracking:** Platform-facilitated transactions, invoices, payouts

**Effort:** 4-5 weeks
**Impact:** Makes the platform "sticky" for providers by becoming their business management tool

### 2.5 Government Contract Teaming

**Current state:** Government contracts are displayed as information. The `ProcurementOpportunity` model tracks opportunities, and `SavedProcurementSearch` enables monitoring.

**Target state:** SpaceNexus facilitates teaming arrangements for large government contracts.

**Implementation:**
- **Teaming board:** For each open government contract, show a teaming board where companies can post "seeking teammates for X capability" or "available as subcontractor for Y"
- **Capability gap analysis:** When viewing a contract, AI analyzes the requirements and identifies which capabilities a company has vs. needs from teammates
- **Small business teaming:** Leverage `setAside` data from `ProcurementOpportunity` to connect large primes with small business subcontractors meeting 8(a), HUBZone, WOSB requirements
- **Past team detection:** Using `Partnership` and `GovernmentContractAward` data, surface companies that have previously teamed together successfully

**Effort:** 3-4 weeks
**Impact:** Government contracting represents the largest addressable market. Teaming facilitation is an unsolved problem.

### 2.6 API Integrations for Procurement Systems

**Current state:** Commercial API exists with key management (`ApiKey` model), usage tracking, and rate limiting. V1 endpoints serve data.

**Target state:** API endpoints that integrate with procurement workflows.

**New API endpoints:**
- `POST /api/v1/rfq` -- Submit RFQ programmatically
- `GET /api/v1/providers/search` -- Search providers by capability
- `GET /api/v1/providers/{slug}/services` -- Get provider service listings
- `POST /api/v1/proposals` -- Submit proposal response
- `GET /api/v1/market-rates/{category}` -- Get current market pricing benchmarks
- Webhook notifications for RFQ matches, proposal updates, contract awards

**Effort:** 2-3 weeks
**Impact:** Enables enterprise procurement teams to integrate SpaceNexus into their existing workflows

---

## Phase 3: Dominance (Months 6-12)

**Goal:** Build defensible advantages that make SpaceNexus the default choice for space industry procurement.

### 3.1 AI-Powered Procurement Copilot

**Current state:** The `AIAnalysisRun` model tracks AI analysis of opportunities. `BusinessOpportunity` includes `aiConfidence` and `aiReasoning`. The infrastructure for AI-driven insights exists.

**Target state:** An AI assistant that helps both buyers and providers make better procurement decisions.

**For buyers:**
- "Write my RFQ" -- AI drafts structured RFQ from natural language description
- "Analyze proposals" -- AI compares proposals against requirements, flags gaps, and summarizes strengths/weaknesses
- "Should I bid?" -- For government contracts, AI assesses fit based on company capabilities, past performance, and competitive landscape
- "Market intelligence briefing" -- Weekly AI-generated summary of market changes, new providers, pricing trends relevant to the buyer's interests

**For providers:**
- "Optimize my listing" -- AI suggests improvements to service descriptions based on what successful listings in the same category include
- "Price check" -- AI benchmarks pricing against market data from `OrbitalService` records
- "Proposal assistant" -- AI drafts initial proposal response based on RFQ requirements and provider capabilities

**Effort:** 6-8 weeks
**Impact:** Transforms SpaceNexus from a tool into an intelligent advisor

### 3.2 Contract Management

**Current state:** No post-award contract management.

**Target state:** SpaceNexus manages the lifecycle from RFQ through contract execution.

**Features:**
- **Contract templates:** Pre-built templates for common space service agreements (data license, hosted payload, ground station access, launch services)
- **Milestone tracking:** Define and track delivery milestones with approval workflow
- **Change order management:** Handle scope changes and price adjustments
- **Invoice generation and payment processing:** Automated based on milestone completion
- **Performance monitoring:** Track SLAs and delivery metrics
- **Contract renewal reminders:** Proactive alerts before contract expiration

**Effort:** 6-8 weeks
**Impact:** Once contracts are managed on-platform, switching costs become very high

### 3.3 Supply Chain Integration

**Current state:** Supply chain types are defined (`SupplyChainCompany`, `SupplyRelationship`, `SupplyShortage`) with tier classifications and geopolitical risk.

**Target state:** A supply chain marketplace for space component sourcing.

**Features:**
- **Component marketplace:** Providers list available components, subsystems, and materials
- **Supply chain mapping:** Visualize the space industry supply chain with relationship data
- **Shortage alerts:** Using `SupplyShortage` data, alert buyers to material availability risks
- **Geopolitical risk scoring:** Flag components with high-risk supply chains (leveraging `GeopoliticalRisk` type)
- **Second source recommendations:** When a component has a single-source supplier, recommend alternatives

**Effort:** 4-5 weeks
**Impact:** Addresses a critical industry pain point (fragile space supply chains) while deepening platform lock-in

### 3.4 White-Label Procurement Portal

**Target state:** Large companies and agencies can use SpaceNexus as their procurement system with custom branding.

**Features:**
- Custom-branded procurement portal (company logo, colors)
- Internal-only listings for preferred suppliers
- Custom approval workflows
- Integration with internal ERP/procurement systems
- Custom analytics and reporting
- SSO integration

**Effort:** 6-8 weeks
**Impact:** Enterprise contracts with significant recurring revenue

### 3.5 Industry Partnerships

**Strategic partnerships to pursue:**

1. **SAM.gov / GSA:** Official data integration for government contract opportunities
2. **Space ISAC:** Cybersecurity verification for providers
3. **Space Foundation:** Industry association endorsement and event co-location
4. **Major primes (Lockheed Martin, Northrop Grumman, Boeing, Raytheon):** Preferred supplier marketplace for their supply chains
5. **Commercial space leaders (SpaceX, Blue Origin, Rocket Lab):** Integration of their service catalogs
6. **Trade publications (SpaceNews, Via Satellite, Payload):** Cross-promotion and embedded marketplace widgets
7. **Defense Innovation Unit (DIU):** Dual-use technology marketplace
8. **SBIR/STTR programs:** Embedded marketplace for technology transition

**Effort:** Ongoing BD activity
**Impact:** Credibility, deal flow, and network effects

### 3.6 International Expansion

**Current state:** Company profiles include international companies. Government contracts track NASA, USSF, and ESA.

**Target state:** Full international marketplace coverage.

**Priority markets:**
1. **ESA member states:** European space industry ($12B+ annual)
2. **Japan (JAXA ecosystem):** Growing commercial space sector
3. **India (ISRO ecosystem):** Rapidly commercializing
4. **United Kingdom:** Active space regulatory modernization
5. **Australia:** New space agency with growing demand

**Requirements:**
- Multi-currency support (Stripe already supports this)
- ITAR/EAR compliance flagging for cross-border transactions
- Localized taxonomy mapping (ESA procurement categories differ from FAR/DFAR)

---

## Revenue Model

### Revenue Streams (ordered by expected contribution)

#### 1. Transaction Fees (Target: 40% of revenue by month 12)
- **Standard rate:** 3-5% of transaction value on facilitated deals
- **Enterprise rate:** 1-2% for high-volume buyers (>$1M annual GMV)
- **Government exemption:** No fee on government prime contracts (attract the deal flow, monetize subcontracting layer)
- **Pricing rationale:** Industry standard for B2B marketplaces. Space procurement has high average order values ($50K-$50M), so even small percentages generate meaningful revenue.

#### 2. Premium Subscriptions (Target: 25% of revenue)
Extend the existing Stripe subscription tiers:

| Feature | Free | Pro ($199/mo) | Enterprise ($999/mo) |
|---|---|---|---|
| View provider directory | Yes | Yes | Yes |
| Submit RFQs | 2/month | 20/month | Unlimited |
| Receive proposals | 3/RFQ | Unlimited | Unlimited |
| Market pricing benchmarks | Limited | Full | Full + API |
| Saved procurement searches | 1 | 10 | Unlimited |
| Analytics dashboard | Basic | Full | Full + export |
| API access | None | 5K calls/mo | 50K calls/mo |
| Government contract alerts | 5/week | Unlimited | Unlimited + team |
| White-label portal | No | No | Yes |

#### 3. Verified Provider Listings (Target: 15% of revenue)
- **Basic listing:** Free (provider-submitted, unverified)
- **Verified listing:** $499/year (identity and capability verified, priority in search results)
- **Premium listing:** $1,999/year (featured placement, enhanced analytics, priority RFQ matching, "SpaceNexus Preferred" badge)
- **Sponsored listing:** $5,000+/year (top placement in category search, homepage feature rotation)

#### 4. Data & Intelligence Products (Target: 10% of revenue)
- **Market intelligence reports:** Quarterly pricing benchmarks by service category (building on existing `OrbitalService` pricing data)
- **Custom competitive analysis:** Using `CompetitiveMapping` and `CompanyScore` data
- **Procurement forecast reports:** Based on `SpaceBudgetItem` and `CongressionalActivity` data
- **API access tiers:** Already implemented via `ApiKey` model; extend with marketplace data endpoints

#### 5. Advertising & Sponsored Content (Target: 10% of revenue)
- Leverage existing `Advertiser` / `AdCampaign` system
- Sponsored search results (pay-per-click within marketplace search)
- Category sponsorship (e.g., "Earth Observation services brought to you by Maxar")
- Newsletter sponsorship in procurement digests

### Revenue Projections

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Active providers | 50 | 200 | 500 |
| Active buyers | 100 | 500 | 2,000 |
| Monthly RFQs | 20 | 100 | 500 |
| Facilitated GMV | $100K | $1M | $10M |
| Monthly Revenue | $5K | $30K | $150K |

---

## Competitive Moat

### 1. Data Network Effects
Every transaction on the platform generates data: pricing benchmarks, provider ratings, capability verification, proposal quality scores, win/loss patterns. This data makes the matching engine smarter, which attracts more users, which generates more data. This flywheel is extremely difficult to replicate.

### 2. Regulatory Intelligence Integration
SpaceNexus uniquely integrates:
- ITAR/EAR export classification data (`ExportClassification` model with 400+ entries)
- Proposed regulations and compliance monitoring (`ProposedRegulation` model)
- Government contracting identifiers (`cageCode`, `samUei` on `CompanyProfile`)
- NAICS codes for procurement matching
- Set-aside classifications for small business compliance

No competitor has this regulatory layer integrated into a marketplace. For an industry where a single ITAR violation can result in $500K+ fines, compliance-aware procurement is not optional.

### 3. Verified Provider Network
The combination of:
- SAM.gov cross-reference verification (using `samUei` and `cageCode`)
- Government contract award history (`GovernmentContractAward` model)
- Transparent pricing benchmarks
- User-generated reviews

...creates a trust layer that is expensive and time-consuming to replicate.

### 4. Government Contract Integration
The `ProcurementOpportunity`, `SBIRSolicitation`, `SpaceBudgetItem`, and `CongressionalActivity` models provide procurement intelligence that drives buyer engagement. Government space procurement is $50B+/year in the US alone. Being the platform where providers find government opportunities AND where they team for bids creates a powerful lock-in.

### 5. Company Intelligence Depth
101 company profiles with 15 related data models each (funding rounds, products, key personnel, contracts, satellite assets, facilities, competitive mapping, partnerships, M&A history, SEC filings, revenue estimates, scores). This depth of structured intelligence is comparable to what Bloomberg provides for public equities -- but for the space industry specifically.

### 6. Transparent Pricing Benchmark Database
The existing `OrbitalService` data with `priceMin`, `priceMax`, `pricingNotes`, and `marginEstimate` fields represents unique market intelligence. As the marketplace processes more transactions, this pricing database becomes increasingly accurate and valuable -- a self-reinforcing competitive advantage.

---

## Key Metrics to Track

### Marketplace Health Metrics

| Metric | Definition | Month 3 Target | Month 6 Target | Month 12 Target |
|---|---|---|---|---|
| **GMV** | Total value of transactions facilitated | $100K | $1M | $10M |
| **Active Providers** | Providers with at least 1 active listing | 50 | 200 | 500 |
| **Active Buyers** | Buyers who submitted 1+ RFQ in last 90 days | 100 | 500 | 2,000 |
| **RFQ Volume** | Total RFQs submitted per month | 20 | 100 | 500 |
| **Match Rate** | % of RFQs that receive at least 1 proposal | 40% | 60% | 75% |
| **Conversion Rate** | % of RFQs that result in an award | 10% | 15% | 25% |
| **Time to First Proposal** | Median time from RFQ post to first response | 72 hrs | 48 hrs | 24 hrs |
| **Provider NPS** | Net Promoter Score from provider surveys | 20 | 35 | 50 |
| **Buyer NPS** | Net Promoter Score from buyer surveys | 20 | 35 | 50 |

### Supply-Side Metrics

| Metric | Definition | Target |
|---|---|---|
| **Listing coverage** | % of AVAILABLE_MODULES service categories with 3+ listings | 50% by M6 |
| **Profile claim rate** | % of 101 company profiles claimed by actual companies | 30% by M6 |
| **Verification rate** | % of active providers with at least "Identity Verified" badge | 60% by M6 |
| **Listing quality score** | Average completeness of service listings (0-100) | 70 by M6 |
| **Provider response rate** | % of matched RFQs where provider responds | 50% by M6 |

### Demand-Side Metrics

| Metric | Definition | Target |
|---|---|---|
| **RFQ quality score** | Average completeness of RFQ submissions (0-100) | 65 by M6 |
| **Repeat buyer rate** | % of buyers who submit 2+ RFQs | 40% by M12 |
| **Category breadth** | Number of distinct categories with active RFQs | 8 of 10 by M12 |
| **Saved search volume** | Active `SavedProcurementSearch` records | 500 by M12 |
| **Search-to-RFQ conversion** | % of marketplace searches that lead to RFQ submission | 5% by M6 |

### Financial Metrics

| Metric | Definition | Target |
|---|---|---|
| **Take rate** | Platform revenue / GMV | 4% by M12 |
| **ARPU (providers)** | Average revenue per active provider | $100/mo by M12 |
| **ARPU (buyers)** | Average revenue per active buyer | $50/mo by M12 |
| **CAC (providers)** | Cost to acquire a new active provider | <$500 |
| **CAC (buyers)** | Cost to acquire a new active buyer | <$200 |
| **LTV:CAC ratio** | Lifetime value to customer acquisition cost | >3:1 by M12 |

---

## Implementation Priority Matrix

### High Impact / Low Effort (DO FIRST)

| Initiative | Impact | Effort | Timeline |
|---|---|---|---|
| Unified service taxonomy | Enables all matching | 1-2 weeks | Month 1 |
| Migrate orbital services to marketplace listings | 25+ day-one listings | 1 week | Month 1 |
| "Claim this profile" flow on company pages | Unlocks supply side | 2 weeks | Month 1 |
| Add provider verification badges (SAM.gov cross-ref) | Builds trust instantly | 1-2 weeks | Month 1 |
| Enhanced service listing model (extend `OrbitalServiceListing`) | Structured supply | 2 weeks | Month 1-2 |
| Contact provider button (simple email routing) | Enables first transactions | 1 week | Month 1 |

### High Impact / Medium Effort (DO NEXT)

| Initiative | Impact | Effort | Timeline |
|---|---|---|---|
| RFQ submission and matching system | Core marketplace loop | 4-5 weeks | Month 2-3 |
| Provider dashboard | Provider retention | 4-5 weeks | Month 2-3 |
| Review and rating system | Trust and data moat | 2 weeks | Month 3 |
| Government contract teaming board | Largest addressable market | 3-4 weeks | Month 3-4 |
| Marketplace analytics for providers | Stickiness | 3-4 weeks | Month 4-5 |

### High Impact / High Effort (PLAN AND INVEST)

| Initiative | Impact | Effort | Timeline |
|---|---|---|---|
| Escrow and milestone payments | Transaction revenue | 4-5 weeks | Month 4-6 |
| AI matching engine | Conversion optimization | 3-4 weeks | Month 5-6 |
| Contract management | Lock-in | 6-8 weeks | Month 6-9 |
| AI procurement copilot | Differentiation | 6-8 weeks | Month 7-10 |
| White-label portal | Enterprise revenue | 6-8 weeks | Month 9-12 |

### Low Impact / Low Effort (OPPORTUNISTIC)

| Initiative | Impact | Effort | Timeline |
|---|---|---|---|
| Enhanced export of provider comparison data | Nice-to-have | 1 week | Any |
| Category sponsorship ad placements | Revenue add-on | 1 week | Month 3+ |
| Provider "similar to" recommendations | UX improvement | 1 week | Month 3+ |

---

## Technical Architecture Notes

### Leveraging Existing Infrastructure

The marketplace builds on existing SpaceNexus architecture patterns:

- **Authentication:** NextAuth sessions with `getServerSession(authOptions)` (already used in orbital service listing/request routes)
- **Validation:** Zod schemas via `validateBody()` pattern (extend `src/lib/validations.ts`)
- **Error handling:** `validationError()`, `internalError()`, `conflictError()` from `src/lib/errors.ts`
- **Logging:** Structured `logger` from `src/lib/logger.ts`
- **Payments:** Stripe via `getStripe()` lazy initialization from `src/lib/stripe.ts`
- **Notifications:** Resend email integration (already used in `service-providers/route.ts` and `orbital-services/listing/route.ts`) plus `AlertRule`/`AlertDelivery` for in-app alerts
- **API product:** `ApiKey` auth middleware for v1 marketplace API endpoints
- **Database:** Prisma ORM with PostgreSQL, using the existing `import prisma from '@/lib/db'` pattern

### New Route Structure

```
src/app/marketplace/                    # Marketplace landing page
src/app/marketplace/search/             # Unified provider/service search
src/app/marketplace/rfq/new/            # Submit new RFQ
src/app/marketplace/rfq/[id]/           # View RFQ details & proposals
src/app/marketplace/listings/[slug]/    # View service listing detail
src/app/provider-dashboard/             # Provider management portal
src/app/provider-dashboard/listings/    # Manage service listings
src/app/provider-dashboard/proposals/   # View & respond to RFQs
src/app/provider-dashboard/analytics/   # Provider analytics
src/app/api/marketplace/rfq/            # RFQ CRUD
src/app/api/marketplace/proposals/      # Proposal CRUD
src/app/api/marketplace/listings/       # Listing CRUD
src/app/api/marketplace/match/          # Matching engine
src/app/api/marketplace/reviews/        # Reviews CRUD
src/app/api/v1/marketplace/             # Public API endpoints
```

### Database Considerations

- New marketplace models should follow existing patterns: `cuid()` IDs, `createdAt`/`updatedAt` timestamps, indexed foreign keys
- Use `@@index` on all filter/sort columns (category, status, dates)
- Use `@db.Text` for large text fields (descriptions, proposals)
- Use `Json` type for flexible structured data (requirements, specifications)
- Consider read replicas if marketplace search volume grows beyond single-instance capacity

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Cold start problem (no providers or buyers) | HIGH | HIGH | Seed with existing orbital services data and 101 company profiles. Personally onboard first 20 providers. |
| Disintermediation (parties go off-platform) | MEDIUM | HIGH | Provide value beyond matching: contract management, escrow, analytics, compliance checking. Make staying on-platform easier than leaving. |
| ITAR/compliance liability | MEDIUM | HIGH | Platform facilitates connections, does not sell services directly. Clear Terms of Service disclaimers. Compliance flagging as a feature, not a guarantee. |
| Large incumbent enters market | LOW | MEDIUM | SpaceNexus has 18+ months of data and company intelligence head start. Focus on vertical depth over horizontal breadth. |
| Low transaction values | MEDIUM | MEDIUM | Target high-value service categories first (launch, satellite ops, consulting). Minimum transaction values for escrow features. |
| Provider quality issues | MEDIUM | MEDIUM | Verification badges, review system, and the ability to flag/remove bad actors. Manual review of first listings. |

---

## Conclusion

SpaceNexus has already built the hardest parts of a space industry marketplace: comprehensive company intelligence, service pricing data, government procurement integration, and regulatory compliance tools. The path from information platform to transactional marketplace requires six months of focused execution across provider onboarding, RFQ/matching systems, and payment facilitation.

The space industry is consolidating its digital tools. The platform that becomes the default for procurement will capture network effects that make it nearly impossible to displace. SpaceNexus has the data foundation, the domain expertise, and the existing user base to be that platform.

**The time to move is now.**

---

*This document references the following SpaceNexus codebase components:*
- Company profiles: `src/app/company-profiles/page.tsx`, `prisma/schema.prisma` (CompanyProfile + 15 related models)
- Orbital services: `src/lib/orbital-services-data.ts`, `src/app/api/orbital-services/`
- Government contracts: `src/lib/government-contracts-data.ts`, `src/app/api/procurement/`
- Service providers: `src/app/api/service-providers/route.ts`
- Business opportunities: `src/app/business-opportunities/page.tsx`
- Resource exchange: `src/app/resource-exchange/page.tsx`
- Payment infrastructure: `src/lib/stripe.ts`, `src/app/api/stripe/`
- API product: `src/lib/api-keys.ts`, `src/lib/api-auth-middleware.ts`
- Alert system: `src/lib/alerts/`, prisma models AlertRule/AlertDelivery
- Types: `src/types/index.ts` (OrbitalService*, SupplyChain*, GovernmentContract types)
