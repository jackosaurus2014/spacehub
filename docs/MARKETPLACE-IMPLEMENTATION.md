# SpaceNexus Marketplace — Implementation Guide

**Version:** 1.0.0 (Phase 1 Foundation)
**Date:** February 2026

---

## Section 1: What We Built (Phase 1 Summary)

### New Database Models (7 models)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **ServiceListing** | Provider service catalog | slug, category, subcategory, pricing, certifications, specs |
| **RFQ** | Buyer request for quotes | title, category, budget range, compliance reqs, deadline |
| **Proposal** | Provider responses to RFQs | price, timeline, approach, status workflow |
| **RFQProviderMatch** | AI matching engine results | matchScore (0-100), matchReasons (JSON breakdown) |
| **ProviderReview** | Buyer reviews of providers | 5-dimension rating (overall, quality, timeline, comms, value) |
| **TeamingOpportunity** | Gov contract teaming board | role (prime/sub), capabilities, set-aside quals |
| **InterestExpression** | Business opportunity engagement | one per user per opportunity, dedup via @@unique |

### Extended Existing Models

- **CompanyProfile**: Added `claimedByUserId`, `claimedAt`, `verificationLevel`, `contactEmail`, `marketplaceActive`
- **User**: Added `claimedCompanyId` (links to their claimed company)

### New API Endpoints (12 routes)

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/marketplace/taxonomy` | GET | Returns all categories, pricing types, certifications |
| `/api/marketplace/stats` | GET | Marketplace-wide statistics |
| `/api/marketplace/listings` | GET, POST | Search/filter listings, create new listing |
| `/api/marketplace/listings/[slug]` | GET, PUT, DELETE | Listing detail, edit, archive |
| `/api/marketplace/rfq` | GET, POST | List public RFQs, submit new RFQ with auto-matching |
| `/api/marketplace/rfq/[id]` | GET, PUT | RFQ detail (role-based), update status/award |
| `/api/marketplace/proposals` | GET, POST | List proposals, submit new proposal |
| `/api/marketplace/proposals/[id]` | GET, PUT | Proposal detail, status updates |
| `/api/marketplace/reviews` | GET, POST | Company reviews with avg ratings |
| `/api/marketplace/interest` | GET, POST | Express interest in business opportunities |
| `/api/marketplace/teaming` | GET, POST | Government contract teaming board |
| `/api/marketplace/match` | POST | Re-run matching algorithm for an RFQ |
| `/api/company-profiles/[slug]/claim` | POST | Claim a company profile |

### New UI Pages (6 pages)

1. **`/marketplace`** — Landing page with stats, category grid, featured listings, open RFQs
2. **`/marketplace/search`** — Full search with sidebar filters (category, price, certs, verification), grid/list toggle, pagination
3. **`/marketplace/rfq/new`** — 4-step RFQ submission wizard (category → requirements → budget/compliance → review)
4. **`/marketplace/rfq/[id]`** — RFQ detail with role-based views (buyer sees proposals + matches, provider sees proposal form, public sees summary)
5. **`/marketplace/listings/[slug]`** — Listing detail with provider card, specs, reviews, similar listings, contact/RFQ buttons
6. **`/provider-dashboard`** — Provider portal with stats, tabs (overview, listings, proposals, reviews)

### New Components (10 components)

| Component | Location | Purpose |
|-----------|----------|---------|
| `MarketplaceCard` | `src/components/marketplace/` | Service listing card for grids |
| `RFQCard` | `src/components/marketplace/` | RFQ summary card |
| `ProposalCard` | `src/components/marketplace/` | Proposal display with buyer actions |
| `CategoryGrid` | `src/components/marketplace/` | 10-category selection grid |
| `MatchScore` | `src/components/marketplace/` | Match score progress bar + breakdown |
| `VerificationBadge` | `src/components/marketplace/` | Provider verification level badge |
| `ReviewCard` | `src/components/marketplace/` | Review display with star ratings |
| `PriceDisplay` | `src/components/marketplace/` | Formatted pricing display |
| `RFQForm` | `src/components/marketplace/` | 4-step RFQ submission wizard |
| `ProposalForm` | `src/components/marketplace/` | Proposal submission form |

### Gap Fixes on Existing Pages

1. **Company Profiles** (`/company-profiles/[slug]`): Added "Claim This Profile" button, verification badge, "Contact Provider" and "View Service Listings" links
2. **Business Opportunities** (`/business-opportunities`): Added "Express Interest" button with count, "Find providers on Marketplace" cross-link
3. **Navigation**: Added Marketplace link to QuickAccessSidebar, added routes to `module-routes.ts`

### Unified Service Taxonomy

10 categories with 40+ subcategories covering the entire space industry:
- Launch Services (dedicated, rideshare, rapid, orbital transfer)
- Satellite Services (EO, comms, nav, IoT)
- In-Space Services (hosted payloads, computing, servicing, logistics)
- Ground Segment (ground stations, mission control, data processing, antennas)
- Manufacturing & Components (buses, propulsion, avionics, solar, structures)
- Engineering & Consulting (systems eng, mission design, regulatory, testing)
- Space Environment (weather/radiation, debris tracking, conjunction)
- R&D Services (materials, microgravity, tech demos)
- Human Spaceflight (crew transport, habitats, life support, tourism)
- Space Power (solar, in-orbit power, beaming)

---

## Section 2: How the Matching Algorithm Works

The matching engine runs automatically when an RFQ is submitted (and can be re-triggered via `/api/marketplace/match`).

### Scoring Dimensions (100 points max)

| Dimension | Weight | How It Works |
|-----------|--------|--------------|
| **Category Match** | 30% | Exact category match = 30pts, +10 bonus for subcategory match. Non-matching categories are filtered out. |
| **Price Compatibility** | 20% | Full overlap (listing priceMin ≤ RFQ budgetMax) = 20pts. Within 20% = 10pts. Unknown = 10pts. |
| **Certification Match** | 20% | % of RFQ compliance reqs matched by listing certs (case-insensitive substring). No reqs = 15pts. |
| **Past Performance** | 15% | Base 10pts (would be enhanced with actual review data integration). |
| **Response Time** | 10% | Base 5pts (would be enhanced with historical response tracking). |
| **Verification Level** | 5% | performance=5, capability=3, identity=1, none=0. |

### Match Flow
1. Buyer submits RFQ → API creates RFQ record
2. System fetches ALL active ServiceListings
3. Each listing is scored against the RFQ
4. Non-category matches are immediately filtered
5. Remaining listings are sorted by score (descending)
6. Top 20 matches (score > 20) are saved as `RFQProviderMatch` records
7. Matches are returned to the buyer with score breakdown

---

## Section 3: Verification Levels

| Level | Badge | Requirements | Benefits |
|-------|-------|-------------|----------|
| **None** | — | New profile | Can browse, no marketplace activity |
| **Identity** | ✓ Blue | Email domain or business registration confirmed | Can list services, respond to RFQs |
| **Capability** | ✓✓ Green | Government contract on record OR capabilities independently verified | Higher match scores, featured placement |
| **Performance** | ★ Gold | 5+ completed transactions with buyer ratings above 4.0 | Top match priority, premium badge |

---

## Section 4: Phase 2 Roadmap (Months 3-6)

### 4.1 Intelligent Matching Refinement
- **Weighted reviews**: Incorporate actual review ratings into performance score
- **Response time tracking**: Track provider response times to RFQ matches
- **Historical match success**: Weight providers higher if their past matches led to awarded contracts
- **Geographic proximity**: Factor in HQ location for on-site service requirements
- **Files needed**: Extend `RFQProviderMatch` with response tracking, add cron job for score recalculation

### 4.2 Escrow & Milestone Payments
- **Stripe Connect**: Each provider onboards as a connected Stripe account
- **Payment flow**: Buyer funds escrow → Provider delivers → Buyer approves milestone → Funds released
- **New models**: `Transaction`, `Milestone`, `Escrow`, `PayoutRequest`
- **New routes**: `/api/marketplace/transactions/`, `/api/marketplace/milestones/`
- **Implementation notes**:
  - Use Stripe PaymentIntents with manual capture for escrow
  - Create Connected Accounts via Stripe Connect Express
  - Implement webhook handler for payment events
  - Platform fee: 2-5% per transaction (configurable)

### 4.3 Marketplace Analytics Dashboard
- **Provider analytics**: Views, inquiries, conversion rates, revenue tracking
- **Buyer analytics**: RFQ response rates, award metrics, spend analysis
- **Platform analytics**: GMV, take rate, category growth, provider churn
- **Implementation**: New `/api/marketplace/analytics/` routes, dashboard widgets

### 4.4 Enhanced Provider Dashboard
- **Listing management**: Full CRUD with image uploads, document attachments
- **Inbox**: Real-time notifications for new RFQ matches
- **Proposal tracking**: Status pipeline view with filters
- **Revenue dashboard**: Earnings, pending payments, payout history

### 4.5 Government Contract Teaming Enhancements
- **Auto-matching**: Match companies by CAGE code, NAICS codes, set-aside status
- **Teaming agreement templates**: Generate standard teaming agreements
- **Past performance database**: Link to government contract history (SAM.gov)

### 4.6 API v1 Marketplace Endpoints
- Extend existing API product with marketplace endpoints
- `/api/v1/marketplace/listings` — Programmatic listing management
- `/api/v1/marketplace/rfq` — RFQ submission and tracking
- Rate limiting: 100 req/min for free tier, 1000 for paid

---

## Section 5: Phase 3 Roadmap (Months 6-12)

### 5.1 AI Procurement Copilot
- Chat interface for RFQ creation ("I need to launch a 500kg satellite to SSO by Q3 2027")
- AI generates structured RFQ from natural language
- Provider recommendation engine with AI explanations
- **Tech**: Claude API integration, conversation history, structured output

### 5.2 Contract Management System
- Post-award contract tracking
- Milestone management with automated payment triggers
- Document management (SOWs, NDAs, invoices)
- **New models**: `Contract`, `ContractMilestone`, `ContractDocument`, `Invoice`

### 5.3 Supply Chain Marketplace
- Link existing supply chain module to marketplace
- Component sourcing via RFQ
- Supplier qualification workflows
- Alternative supplier recommendations when shortages detected

### 5.4 White-Label Provider Portals
- Branded storefronts for each verified provider
- Custom domains (provider.spacenexus.us)
- Self-service portal customization

### 5.5 International Expansion
- Multi-currency support (EUR, GBP, JPY)
- ITAR/EAR compliance checking in matching
- International certification recognition
- Localized content for key markets (EU, Japan, India)

---

## Section 6: Personal Action Items

### Immediate (This Week)
- [ ] **Test the marketplace flow end-to-end**: Visit `/marketplace`, submit an RFQ, verify matching works
- [ ] **Claim the first company profile**: Log in and claim a company to test the provider dashboard
- [ ] **Seed initial service listings**: Create 5-10 sample listings across different categories to populate the marketplace

### Short-Term (Next 2-4 Weeks)
- [ ] **Set up Stripe Connect for marketplace payments** (Phase 2 prep)
  - Register as a platform on [Stripe Dashboard](https://dashboard.stripe.com/connect/accounts/overview)
  - Configure connected account onboarding flow
  - Set platform fee percentage (recommended: 3-5%)
- [ ] **Personally onboard first 20 providers**
  - Reach out to companies already in the company profiles database
  - Help them claim profiles and create initial listings
  - Focus on: SpaceX, Rocket Lab, Planet Labs, AWS Ground Station, York Space Systems
- [ ] **Create marketplace launch announcement content**
  - Blog post for SpaceNexus
  - LinkedIn announcement
  - Newsletter to existing users

### Medium-Term (1-3 Months)
- [ ] **Set up SAM.gov API key** for live procurement data integration
  - Apply at [SAM.gov](https://sam.gov/content/entity-registration)
  - Configure in environment variables as `SAM_GOV_API_KEY`
- [ ] **Plan pricing structure for verified listings**
  - Free tier: 3 listings, basic matching
  - Pro tier ($99/mo): Unlimited listings, priority matching, analytics
  - Enterprise tier (custom): White-label portal, API access, dedicated support
- [ ] **Explore Space Foundation partnership** for industry credibility
- [ ] **Set up dedicated email** for marketplace notifications (marketplace@spacenexus.us)
- [ ] **Legal: Update Terms of Service** for marketplace transactions
- [ ] **Legal: Review ITAR implications** for cross-border matches

### Ongoing
- [ ] Monitor marketplace health metrics (see Section 7)
- [ ] Gather provider feedback and iterate on matching algorithm
- [ ] Track conversion: listing views → RFQ submissions → proposals → awards

---

## Section 7: Key Metrics to Track

### Marketplace Health Dashboard

| Metric | Target (Month 3) | Target (Month 6) | How to Measure |
|--------|-------------------|-------------------|----------------|
| Active Providers | 50 | 200 | Claimed company profiles with marketplace_active=true |
| Service Listings | 100 | 500 | ServiceListing where status='active' |
| Monthly RFQs | 20 | 100 | RFQ created per month |
| RFQ-to-Award Rate | 15% | 25% | RFQs with status='awarded' / total RFQs |
| Avg Proposals per RFQ | 3 | 5 | Proposal count / RFQ count |
| Provider Response Time | 48hrs | 24hrs | Avg time from match notification to proposal |
| Buyer Satisfaction | 4.0/5 | 4.2/5 | Average ProviderReview.overallRating |
| Gross Marketplace Value | — | $500K | Sum of awarded proposal prices |
| Platform Revenue | — | $15K/mo | Transaction fees + subscription revenue |

### Key Funnels
1. **Provider Onboarding**: Profile View → Claim → Listing Created → First RFQ Response → First Award
2. **Buyer Journey**: Marketplace Visit → RFQ Created → Proposals Received → Award Granted → Review Left
3. **Matching Effectiveness**: RFQ Created → Matches Generated → Provider Notified → Proposal Submitted

---

## Section 8: Technical Notes

### Adding New Service Categories
1. Add category to `MARKETPLACE_CATEGORIES` in `src/lib/marketplace-types.ts`
2. Add subcategories as needed
3. No database migration required (category is a string field)
4. Update taxonomy API if needed (auto-reads from types file)

### Database Migration Considerations
- All new models use `@default(cuid())` for IDs
- Indexes are optimized for common query patterns (category, status, companyId)
- `RFQProviderMatch` uses @@unique([rfqId, companyId]) to prevent duplicate matches
- `InterestExpression` uses @@unique([opportunityId, userId]) to prevent duplicate expressions
- `Proposal` uses @@unique([rfqId, companyId]) to prevent duplicate proposals from same company

### Environment Variables
No new environment variables are required for Phase 1. Phase 2 will need:
- `STRIPE_CONNECT_SECRET_KEY` — For escrow payments
- `SAM_GOV_API_KEY` — For live procurement data
- `MARKETPLACE_PLATFORM_FEE` — Transaction fee percentage (default: 0.03)

### File Structure
```
src/
├── app/
│   ├── marketplace/
│   │   ├── page.tsx              # Landing page
│   │   ├── search/page.tsx       # Search with filters
│   │   ├── rfq/
│   │   │   ├── new/page.tsx      # Submit RFQ wizard
│   │   │   └── [id]/page.tsx     # RFQ detail
│   │   └── listings/
│   │       └── [slug]/page.tsx   # Listing detail
│   ├── provider-dashboard/
│   │   └── page.tsx              # Provider portal
│   └── api/
│       ├── marketplace/
│       │   ├── taxonomy/route.ts
│       │   ├── stats/route.ts
│       │   ├── listings/route.ts
│       │   ├── listings/[slug]/route.ts
│       │   ├── rfq/route.ts
│       │   ├── rfq/[id]/route.ts
│       │   ├── proposals/route.ts
│       │   ├── proposals/[id]/route.ts
│       │   ├── reviews/route.ts
│       │   ├── interest/route.ts
│       │   ├── teaming/route.ts
│       │   └── match/route.ts
│       └── company-profiles/
│           └── [slug]/claim/route.ts
├── components/
│   └── marketplace/
│       ├── MarketplaceCard.tsx
│       ├── RFQCard.tsx
│       ├── ProposalCard.tsx
│       ├── CategoryGrid.tsx
│       ├── MatchScore.tsx
│       ├── VerificationBadge.tsx
│       ├── ReviewCard.tsx
│       ├── PriceDisplay.tsx
│       ├── RFQForm.tsx
│       └── ProposalForm.tsx
└── lib/
    └── marketplace-types.ts      # Taxonomy, constants, helpers
```

---

*This document was generated as part of SpaceNexus v1.1.0 — Phase 1 Marketplace Foundation.*
