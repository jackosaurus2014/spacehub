# SpaceNexus Investor & Entrepreneur Feature Suite — Implementation Plan

**Created:** 2026-02-20
**Status:** Complete (v1.2.0)
**Goal:** Transform SpaceNexus into the indispensable intelligence platform for space industry investors and entrepreneurs

---

## Task Sequencing & Dependencies

Tasks are ordered by: (1) dependency chain, (2) leverage on existing infrastructure, (3) ROI for users.

| # | Task | Status | Dependencies | Est. Files | Priority |
|---|------|--------|-------------|-----------|----------|
| 1 | Grant & Funding Opportunity Aggregator | `[x] Complete` | Existing SBIR/procurement | 6 files | P0 — Critical |
| 2 | Space Startup & Funding Tracker | `[x] Complete` | Company profiles | 7 files | P0 — Critical |
| 3 | Market Sizing & TAM Maps | `[x] Complete` | None | 3 files | P1 — High |
| 4 | Customer Discovery Database | `[x] Complete` | Company profiles, procurement | 4 files | P1 — High |
| 5 | Regulatory Risk Scoring | `[x] Complete` | Compliance module | 4 files | P1 — High |
| 6 | Unit Economics / Business Model Templates | `[x] Complete` | Orbital cost data | 4 files | P2 — Medium |
| 7 | Space Industry Event Calendar | `[x] Complete` | None (standalone) | 4 files | P2 — Medium |
| 8 | Investment Thesis Generator (AI) | `[x] Complete` | Tasks 2, 3, 4 | 3 files | P2 — Medium |
| 9 | Space Industry Deal Room | `[x] Complete` | Auth, file system | 10 files | P3 — Future |

---

## Task 1: Grant & Funding Opportunity Aggregator

**Rationale:** Entrepreneurs spend weeks manually searching for grants. Aggregating SBIR/STTR, NASA BAAs, DARPA solicitations, ESA programs, and state incentives into one searchable interface is immediately valuable and builds on existing procurement infrastructure.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: data sources, APIs, feed formats
- [ ] Design: data model, UI wireframe
- [ ] Implement: data fetcher + Prisma model
- [ ] Implement: API routes
- [ ] Implement: UI page with filters
- [ ] Implement: alert/notification integration
- [ ] Test & verify

---

## Task 2: Space Startup & Funding Tracker

**Rationale:** Real-time visibility into who's raising money, at what valuation, and from whom. This is the #1 tool investors use for deal sourcing. Leverages existing company profiles.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: funding data sources, APIs, scraping legality
- [ ] Design: data model, funding round schema
- [ ] Implement: Prisma models (FundingRound, Investor)
- [ ] Implement: data ingestion pipeline
- [ ] Implement: API routes
- [ ] Implement: UI (timeline, filters, charts)
- [ ] Implement: deal flow alerts
- [ ] Test & verify

---

## Task 3: Market Sizing & TAM Maps

**Rationale:** Consolidated TAM/SAM/SOM data by space vertical is extremely hard to find. Providing interactive market maps with growth projections makes SpaceNexus essential for investor due diligence.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: market data sources, industry reports, projections
- [ ] Design: market segment taxonomy, data model
- [ ] Implement: market data + segment definitions
- [ ] Implement: API routes
- [ ] Implement: interactive TAM map visualization
- [ ] Implement: growth projection charts
- [ ] Test & verify

---

## Task 4: Customer Discovery Database

**Rationale:** "Who would buy my product?" is the critical question for entrepreneurs. Cross-referencing company profiles, procurement data, and contract awards creates a powerful customer targeting tool.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: customer segmentation approaches, data enrichment
- [ ] Design: customer profile schema, search/filter UX
- [ ] Implement: enhanced company profile fields
- [ ] Implement: procurement cross-reference
- [ ] Implement: API routes with search
- [ ] Implement: UI with filters and export
- [ ] Test & verify

---

## Task 5: Regulatory Risk Scoring

**Rationale:** Licensing timelines and regulatory uncertainty are key investor concerns. A per-company/per-mission risk score using compliance data creates unique analytical value.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: regulatory frameworks, scoring methodologies
- [ ] Design: risk scoring algorithm, data model
- [ ] Implement: scoring engine
- [ ] Implement: API routes
- [ ] Implement: UI (risk dashboard, company risk cards)
- [ ] Test & verify

---

## Task 6: Unit Economics / Business Model Templates

**Rationale:** Space-specific financial models are rare. Providing templates with real cost benchmarks from our orbital estimator and BOM data helps entrepreneurs build credible financial projections.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: common space business models, financial metrics
- [ ] Design: template structure, calculator logic
- [ ] Implement: business model templates data
- [ ] Implement: interactive calculators
- [ ] Implement: UI page
- [ ] Test & verify

---

## Task 7: Space Industry Event Calendar

**Rationale:** Consolidated event calendar with speaker tracking and networking features. Lower complexity, high utility for community building.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: major conferences, data sources, APIs
- [ ] Design: event data model, calendar UI
- [ ] Implement: event data + Prisma model
- [ ] Implement: API routes
- [ ] Implement: calendar UI with filters
- [ ] Implement: .ics export integration
- [ ] Test & verify

---

## Task 8: Investment Thesis Generator (AI)

**Rationale:** AI-powered investment analysis using all platform data. Premium feature that synthesizes funding history, market sizing, competitive landscape, and regulatory risk into structured investment theses.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: investment thesis frameworks, AI prompt design
- [ ] Design: thesis template structure, AI pipeline
- [ ] Implement: thesis generation API (Claude integration)
- [ ] Implement: UI (thesis viewer, export to PDF)
- [ ] Test & verify

---

## Task 9: Space Industry Deal Room

**Rationale:** Secure document sharing for investor-startup interactions. Creates network effects and premium monetization. Most complex feature — implement last.

### Research Findings
_Pending research agent..._

### Implementation Plan
_Pending research..._

### Progress
- [ ] Research: deal room platforms, security requirements, file storage
- [ ] Design: data model, permission system, UI flow
- [ ] Implement: file upload + storage
- [ ] Implement: deal room Prisma models
- [ ] Implement: API routes with permissions
- [ ] Implement: UI (room view, document viewer, NDA flow)
- [ ] Test & verify

---

## Implementation Log

| Date | Action | Details |
|------|--------|---------|
| 2026-02-20 | Plan created | 9 tasks sequenced, research phase starting |
| 2026-02-20 | Research complete | 5 parallel research agents analyzed data sources, APIs, competitors |
| 2026-02-20 | Tasks 1-3 implemented | Grant aggregator, funding tracker, market sizing — all building clean |
| 2026-02-20 | Tasks 4-7 implemented | Customer discovery, regulatory risk, business models, event calendar |
| 2026-02-20 | Tasks 8-9 implemented | AI investment thesis generator, deal room MVP |
| 2026-02-20 | All tasks complete | 9 pages, 19 API routes, 9 data/logic files, 1 seed script. Build clean, 437 tests pass. |

