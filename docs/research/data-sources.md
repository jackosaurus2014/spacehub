# SpaceNexus Investor Data Sources Research

**Date:** February 20, 2026
**Purpose:** Evaluate external data sources for enhancing company profiles with investment, financial, regulatory, and alternative data signals.

---

## Table of Contents

1. [SEC/Financial Data](#1-secfinancial-data)
2. [VC/Startup Data](#2-vcstartup-data)
3. [Government Contracts](#3-government-contracts)
4. [Space-Specific Sources](#4-space-specific-sources)
5. [Patent/IP Data](#5-patentip-data)
6. [Alternative Data](#6-alternative-data)
7. [Priority Implementation Matrix](#7-priority-implementation-matrix)
8. [Recommended Phase 1 Integration Plan](#8-recommended-phase-1-integration-plan)

---

## 1. SEC/Financial Data

### 1.1 SEC EDGAR API

**What data is available:**
- Full submission history for all SEC-registered entities (10-K, 10-Q, 8-K, 20-F, 40-F, 6-K filings)
- XBRL-structured financial statements (income statement, balance sheet, cash flow)
- Company facts (all XBRL disclosures aggregated per company)
- Real-time filing updates (submissions API < 1 second delay; XBRL < 1 minute delay)
- Historical filings back to 1993 (18M+ filings)
- Bulk data archives (ZIP files recompiled nightly)

**Access method:** RESTful JSON APIs on `data.sec.gov`
- Submissions: `https://data.sec.gov/submissions/CIK##########.json`
- Company Facts: `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`
- Company Concept: `https://data.sec.gov/api/xbrl/companyconcept/CIK##########/us-gaap/{tag}.json`
- XBRL Frames: `https://data.sec.gov/api/xbrl/frames/us-gaap/{tag}/{unit}/CY{year}.json`
- Bulk ZIP: `https://data.sec.gov/submissions/companyfacts.zip`

**Cost:** FREE - No API key required. No authentication needed.

**Rate limits:** 10 requests/second. Must include User-Agent header with company name and email.

**Legal considerations:** Public domain data. SEC requires fair-use User-Agent identification. No commercial restrictions.

**Value to investors:** CRITICAL - Revenue, earnings, assets, liabilities, cash flow for all public space companies. Real-time filing alerts. Fundamental analysis backbone.

**Implementation complexity:** EASY
- Standard REST/JSON, no auth
- Well-documented, stable endpoints
- Python/Node wrappers available (sec-edgar-api)
- Can start with CIK lookup for known space companies, then pull financials

**Relevant space companies on EDGAR:** SpaceX (if ever public), Rocket Lab (RKLB), Virgin Galactic (SPCE), Astra (ASTR), Momentus (MNTS), BlackSky (BKSY), Planet Labs (PL), Spire Global (SPIR), Mynaric (MYNA), Satellogic (SATL), Intuitive Machines (LUNR), Redwire (RDW), Virgin Orbit (VORB - delisted), Terran Orbital, L3Harris, Northrop Grumman, Lockheed Martin, Boeing, RTX, Maxar (now private/Advent).

---

### 1.2 SEC XBRL Financial Data

**What data is available:**
- Standardized financial data extracted from XBRL-tagged filings
- All US-GAAP taxonomy tags (revenue, net income, total assets, EPS, etc.)
- Cross-company comparable financial metrics
- Quarterly and annual data points
- Frame API allows querying a single financial metric across ALL companies for a given period

**Access method:** Part of the `data.sec.gov` API suite (see 1.1 above)
- Company Facts endpoint aggregates all XBRL disclosures for one company
- Frames endpoint aggregates one metric across all companies
- Bulk download: `companyfacts.zip` contains everything

**Cost:** FREE

**Rate limits:** Same as EDGAR (10 req/sec)

**Legal considerations:** Public domain. No restrictions.

**Value to investors:** HIGH - Enables automated financial screening, peer comparisons, trend analysis. Can build financial dashboards showing revenue growth, burn rate, margins across space companies.

**Implementation complexity:** EASY-MEDIUM
- Data is well-structured JSON
- Challenge: Mapping company names to CIKs, handling varying XBRL tag usage across companies
- Tip: Use the Frames API to build industry-wide benchmarks

---

### 1.3 OpenCorporates

**What data is available:**
- 200M+ company records across 170+ jurisdictions worldwide
- Company name, registration number, jurisdiction, incorporation date
- Company type, current status (active/dissolved/etc.)
- Registered address, officers/directors (where available)
- Filing history, subsidiary relationships
- Cross-jurisdiction corporate structure mapping

**Access method:** REST API v0.4.8 at `https://api.opencorporates.com/v0.4.8/`
- Search: `/companies/search?q={query}`
- Lookup: `/companies/{jurisdiction_code}/{company_number}`
- Officers: `/officers/search?q={name}`

**Cost:**
| Tier | Price/Year (GBP) | API Calls/Month |
|------|------------------|-----------------|
| Essentials | 2,250 | 500 |
| Starter | 6,600 | 500 |
| Basic | 12,000 | 500 |
| Standard+ | Custom | Custom |
| Free (NGO/Academic) | 0 | Limited |

All paid plans cap at 500 API calls/month and 200/day, which is very restrictive.

**Legal considerations:** Open data license for non-commercial/research use. Commercial use requires paid plan. Data sourced from official registries.

**Value to investors:** MEDIUM - Useful for verifying company registrations, finding subsidiaries, mapping corporate structures. Less useful for financial metrics.

**Implementation complexity:** EASY (technically) / MEDIUM (commercially)
- Simple REST API
- Low rate limits make bulk operations difficult
- High cost relative to data volume
- Consider: Manual lookups for high-value profiles rather than bulk integration

---

## 2. VC/Startup Data

### 2.1 Crunchbase API

**What data is available:**
- Company profiles (name, description, founding date, HQ, employee count, website)
- Funding rounds (date, amount, series, lead investors, valuation)
- Investor profiles and portfolio companies
- Acquisitions and IPO data
- Key personnel (founders, C-suite)
- Industry categories, technology tags
- Growth metrics (rank, trend scores)
- News mentions and press coverage

**Access method:** REST API v4.0
- Base URL: `https://api.crunchbase.com/api/v4/`
- Requires API key in header
- Supports filtering, sorting, field selection
- Also available via RapidAPI marketplace

**Cost:**
| Plan | Price | Access Level |
|------|-------|-------------|
| Free/Basic | $0 | Website only, limited profiles |
| Pro | $49/mo (annual) or $99/mo | 2K export rows/month, saved searches, alerts |
| Business | $199/mo (annual) | 5K export rows/month, CRM integrations |
| Enterprise/API | ~$2K+/user/year | Full API access, custom data feeds, bulk export |

Full API access requires Enterprise plan - must contact sales for custom pricing. Estimated $10K-50K+/year depending on usage.

**Legal considerations:** Strict ToS - no scraping. Data redistribution requires Enterprise license. Attribution required on free/Pro plans. Cannot resell raw data.

**Value to investors:** CRITICAL for private companies - Crunchbase is the de facto standard for startup funding data. Essential for tracking Series A/B/C rounds, investor networks, and valuation trends in space startups.

**Implementation complexity:** MEDIUM
- Well-documented API with good SDKs
- Enterprise pricing negotiation required
- Rate limits vary by plan
- Alternative: Use Crunchbase data manually for top-tier profiles, supplement with free sources for others

---

### 2.2 PitchBook

**What data is available:**
- Most comprehensive private market data globally
- VC, PE, and M&A transaction data
- Detailed company financials (even for private companies)
- Fund performance metrics
- LP/GP relationship data
- Comparable company analysis
- Industry verticals and sector deep-dives
- Board members, advisors, cap table estimates

**Access method:**
- Web platform (primary)
- API available for Direct Data subscribers
- Excel plugin
- CRM integrations (Salesforce, etc.)
- Data feeds (bulk delivery)

**Cost:**
| Plan | Estimated Price |
|------|----------------|
| Standard Platform | ~$25,000/year for 3 users |
| API / Direct Data | $50,000-$100,000+/year (custom) |
| Single user | ~$15,000-$22,000/year |

PitchBook does not publicly list API pricing; all quotes are custom based on data scope, user count, and usage patterns.

**Legal considerations:** Highly restrictive license. No data redistribution. Cannot display PitchBook data publicly. Intended for internal analysis only. Not suitable for powering a public-facing platform without explicit partnership.

**Value to investors:** VERY HIGH - Gold standard for private market intelligence. But licensing restrictions make it unsuitable for SpaceNexus's public-facing company profiles.

**Implementation complexity:** HARD
- Expensive and restrictive
- Cannot legally display data on SpaceNexus
- Best used as internal research tool, not a data feed
- Recommendation: Skip for platform integration; reference for manual research only

---

### 2.3 AngelList / Wellfound

**What data is available:**
- Startup profiles (name, industry, stage, location, team size)
- Job postings at startups
- Founder/team information
- Funding status (basic)
- Company culture and benefits info
- Investor profiles (limited)

**Access method:** NO PUBLIC API available as of 2026.
- Wellfound shut down its public API
- Data only accessible via website
- Third-party scraping tools exist (Clearout Chrome Extension) but violate ToS

**Cost:** N/A (no API). Website access is free for job seekers. Recruiter plans available for hiring.

**Legal considerations:** No API means any programmatic access would require scraping, which violates their Terms of Service. LinkedIn (parent company) has been aggressive about anti-scraping enforcement.

**Value to investors:** LOW-MEDIUM - Limited unique data compared to Crunchbase. Primarily a jobs platform now.

**Implementation complexity:** NOT FEASIBLE for automated integration
- No API
- Scraping is legally risky
- Recommendation: Skip entirely. Crunchbase and SEC data cover the same ground better.

---

## 3. Government Contracts

### 3.1 USASpending.gov API

**What data is available:**
- ALL federal contract awards (type, amount, date, agency, recipient)
- Grant awards and financial assistance
- Sub-awards and sub-contracts
- Geographic breakdowns of spending
- Agency-level budget data
- Recipient profiles (DUNS/UEI, address, business type)
- Award descriptions and NAICS/PSC codes
- Historical data back to FY2001

**Access method:** RESTful API at `https://api.usaspending.gov/`
- `/api/v2/search/spending_by_award/` - Search awards
- `/api/v2/recipient/` - Recipient profiles
- `/api/v2/awards/{award_id}/` - Award details
- `/api/v2/bulk_download/` - Bulk data exports
- Bulk CSV downloads also available

**Cost:** FREE - No API key required for most endpoints. No authentication needed.

**Rate limits:** No published hard rate limits for standard use. Bulk downloads are queued.

**Legal considerations:** Public domain (government data). No restrictions on commercial use. DATA Act mandates transparency.

**Value to investors:** CRITICAL for space/defense companies - Shows who is winning NASA, DoD, Space Force contracts. Revenue pipeline visibility. Can track contract growth over time. Identifies which companies are winning competitive awards.

**Implementation complexity:** EASY
- Standard REST/JSON
- No authentication
- Well-documented with training materials
- Can filter by NAICS codes relevant to space (e.g., 336414 - Guided Missile and Space Vehicle Manufacturing, 517410 - Satellite Telecommunications, 927110 - Space Research and Technology)
- SpaceNexus already has procurement intelligence module (`src/lib/procurement/`)

---

### 3.2 FPDS-NG (Federal Procurement Data System)

**What data is available:**
- Detailed contract action reports (more granular than USASpending)
- Contract modifications and amendments
- Competition type (sole source, full & open)
- Set-aside information (small business, 8(a), HUBZone, SDVOSB)
- Place of performance
- Contract pricing type (FFP, CPFF, T&M, etc.)
- Contractor DUNS/CAGE codes
- Product/service codes and NAICS codes

**Access method:** SOAP/XML web services (legacy architecture)
- FPDS ATOM feeds for real-time updates
- Bulk XML data downloads
- Web-based search at fpds.gov
- Integration specs: V1.5 specification document

**Cost:** FREE - Government system, public access.

**Rate limits:** Not explicitly documented. System can be slow during peak hours.

**Legal considerations:** Public domain government data. No commercial restrictions.

**Value to investors:** HIGH - More granular contract data than USASpending. Shows competition dynamics, pricing structures, and contract modifications. Useful for tracking DoD space contracts specifically.

**Implementation complexity:** MEDIUM-HARD
- Legacy SOAP/XML architecture (not REST/JSON)
- Documentation is sparse and dated
- Recommendation: Use USASpending.gov API instead (it sources from FPDS anyway) and only go to FPDS directly for fields USASpending doesn't expose
- ATOM feeds are the most practical integration point

---

### 3.3 SAM.gov Entity API

**What data is available:**
- Entity registration data (company name, address, CAGE code, UEI)
- Business type classifications (small business, woman-owned, veteran-owned, etc.)
- NAICS codes and capabilities
- Points of contact
- Exclusion records (debarred/suspended entities)
- Entity status (active/inactive registration)
- Disaster response registry
- Wage determinations

**Access method:** REST API via GSA Open Technology
- Base: `https://api.sam.gov/entity-management/v3/entities`
- Opportunities API: `https://api.sam.gov/opportunities/v2/search`
- Requires API key (free registration)

**Cost:** FREE

**Rate limits:**
| Access Type | Limit |
|-------------|-------|
| Public (no key) | 10 requests/day |
| Registered (API key) | 1,000 requests/day |
| Federal system account | Custom (case-by-case) |

**Legal considerations:** Public domain. Some entity data may have restricted fields (requires justification to access). FOUO data requires government system account.

**Value to investors:** MEDIUM-HIGH - Verifies government contractor status, identifies small business certifications (which affect contract eligibility), checks for exclusions/debarments. Useful for due diligence on defense/government contractors.

**Implementation complexity:** EASY-MEDIUM
- Standard REST API with API key
- 1,000/day limit is workable for targeted lookups
- SpaceNexus already has SAM.gov integration in `src/lib/procurement/sam-gov.ts`
- Extend existing integration to pull entity data for company profiles

---

### 3.4 NASA SBIR/STTR Awards Database

**What data is available:**
- All SBIR/STTR awards since program inception (1982+)
- Award amount, phase (I, II, III), year
- Company name, address, employee count
- Abstract/project description
- Awarding agency (NASA, DoD, DOE, NIH, NSF, etc.)
- Topic and subtopic information
- Socioeconomic data (woman-owned, minority-owned, etc.)

**Access method:**
- REST API at `https://www.sbir.gov/api/awards.json`
- Bulk downloads in XLS, JSON, XML formats
- Full database download available (~290 MB with abstracts, ~65 MB without)
- Web search at sbir.gov/awards

**Cost:** FREE

**Rate limits:** API currently undergoing maintenance (as of early 2026). Bulk downloads have 10K record limit per download on award data page. Full dataset available as single file.

**Legal considerations:** Public domain. No restrictions. Note: SBIR/STTR program authorization expired September 30, 2025 - historical data remains available but no new awards are being made until reauthorization.

**Value to investors:** HIGH for early-stage space companies - SBIR/STTR awards are a strong signal of technical innovation and government validation. Many space startups (Rocket Lab, Relativity Space, etc.) started with SBIR funding. Shows R&D capability and government relationships.

**Implementation complexity:** EASY (bulk download) / MEDIUM (API - currently in maintenance)
- Recommendation: Download full dataset, filter by space-related topics/NAICS codes, match to company profiles
- SpaceNexus already has SBIR fetcher in `src/lib/procurement/sbir-fetcher.ts`

---

## 4. Space-Specific Sources

### 4.1 FCC ULS (Universal Licensing System)

**What data is available:**
- All wireless radio service licenses in the United States
- Satellite space station licenses (call signs, frequencies, orbital positions)
- Earth station licenses
- Experimental licenses
- License status (active, expired, cancelled, terminated)
- License holder information (name, address, contact)
- Technical parameters (power, frequency, bandwidth)
- Application status and history

**Access method:**
- Web search: `https://wireless2.fcc.gov/UlsApp/UlsSearch/searchLicense.jsp`
- Bulk data downloads in pipe-delimited format
- Weekly full datasets (published weekends)
- Daily incremental updates
- No REST API - download-based access only

**Cost:** FREE

**Rate limits:** N/A for bulk downloads. Web searches may have implicit throttling.

**Legal considerations:** Public domain government data. No commercial restrictions.

**Value to investors:** HIGH for satellite companies - Shows who holds spectrum licenses, which orbital slots are assigned, license expiration dates. Critical for evaluating satellite operators' spectrum assets. Spectrum is a limited resource and licenses represent significant value.

**Implementation complexity:** MEDIUM
- No REST API - must download and parse pipe-delimited files
- Need to filter for satellite-relevant service codes (SA - Space Authorization, etc.)
- Weekly data refresh via cron job
- Data schema documented but requires mapping to internal models
- Multiple related tables (license header, frequencies, locations, emissions, etc.)

---

### 4.2 FAA AST (Office of Commercial Space Transportation)

**What data is available:**
- Active launch licenses and permits
- Reentry licenses
- Launch site operator licenses
- Safety approvals
- Licensed launch/reentry events history
- Forecast data on commercial space transportation
- Annual Compendium of Commercial Space Transportation

**Access method:**
- Web portal: `https://www.faa.gov/space/licenses`
- Commercial space data: `https://www.faa.gov/data_research/commercial_space_data`
- PDF reports and datasets (not a structured API)
- Annual forecasts published as PDFs

**Cost:** FREE

**Rate limits:** N/A (static content/PDFs)

**Legal considerations:** Public domain government data.

**Value to investors:** MEDIUM-HIGH - Shows which companies hold active launch licenses, tracks commercial launch activity over time. The FAA licensed its 1,000th commercial space operation in August 2025. License status is a key indicator of company maturity and regulatory readiness.

**Implementation complexity:** MEDIUM-HARD
- No structured API - data is primarily in web pages and PDFs
- Would need periodic scraping or manual data entry
- Alternative: Parse the annual compendium reports
- Small dataset (dozens of active licenses, not thousands) - manageable manually
- Recommendation: Manually curate license data for key companies, update quarterly

---

### 4.3 ITU Space Network List

**What data is available:**
- All satellite network filings worldwide (geostationary and non-geostationary)
- Advance Publication Information (API filings)
- Coordination requests
- Notification filings
- Orbital parameters, frequency assignments
- Filing administration (country)
- Filing dates and status
- Space Network Systems Database (SNS)

**Access method:**
- ITU Space Explorer: `https://www.itu.int/itu-r/space/apps/public/spaceexplorer/`
- SNS Database online query: `https://www.itu.int/sns/database.html`
- SpaceCap software for filing submissions
- Third-party tools: sat-coord.com for database browsing
- IFIC (International Frequency Information Circular) publications

**Cost:**
- Online browsing: FREE
- Detailed data products: CHF 400-2,000/year
- IFIC subscription: Varies

**Rate limits:** Web-based access, no documented API rate limits.

**Legal considerations:** ITU data is published for regulatory purposes. Commercial redistribution may require permission. Terms vary by data product.

**Value to investors:** MEDIUM - Shows satellite filing activity (a leading indicator of constellation plans). China's recent filing for ~200,000 satellites demonstrates how filings signal future market activity. Most useful for tracking mega-constellation operators.

**Implementation complexity:** HARD
- No REST API
- Legacy web interfaces
- Data is in specialized formats (SpaceCap/SNS)
- Recommendation: Monitor ITU filings manually or via news alerts for significant filings. Not suitable for automated integration.

---

### 4.4 NASA Technology Transfer Portal

**What data is available:**
- 1,400+ NASA-patented technologies available for licensing
- Software releases
- Spinoff publications (commercial applications of NASA tech)
- Patent details (title, abstract, inventors, NASA center)
- Technology categories
- Licensing status and terms

**Access method:** REST API
- Patents: `https://technology.nasa.gov/api/api/patent/{keywords}`
- Software: `https://technology.nasa.gov/api/api/software/{keywords}`
- Spinoffs: `https://technology.nasa.gov/api/api/spinoff/{keywords}`

**Cost:** FREE

**Rate limits:** Not documented, but reasonable use expected.

**Legal considerations:** API data is public. Patent licensing has specific terms:
- Evaluation license: $2,500 for 12 months
- Commercial license: 4.2% net royalty
- Startup license: Fees waived for first 3 years, then $3K/year minimum

**Value to investors:** MEDIUM - Shows which NASA technologies are being commercialized. Can identify companies licensing NASA IP (signals innovation pipeline). Spinoff data shows technology commercialization success stories.

**Implementation complexity:** EASY
- Simple REST API
- Small dataset (1,400 patents)
- Good for enriching company profiles with "Uses NASA Technology" badges
- Could cross-reference licensee companies with SpaceNexus company profiles

---

### 4.5 Space Foundation / The Space Report

**What data is available:**
- Global space economy size and growth ($613B in 2024)
- Commercial vs. government spending breakdowns
- Sector-level analysis (launch, satellite services, ground equipment)
- Country-level space budgets
- Launch activity statistics
- Workforce data
- Historical trend data

**Access method:**
- Subscription: `https://www.thespacereport.org/`
- Quarterly digital publication
- Online platform with interactive data, analysis, white papers
- No API

**Cost:** Subscription-based (pricing not publicly listed, estimated $500-2,000/year for organization access)

**Rate limits:** N/A (subscription content)

**Legal considerations:** Proprietary research. Cannot redistribute data. Citation/attribution required for quotes.

**Value to investors:** MEDIUM - Provides macro-level context (TAM, market growth rates) that frames company-level data. Good for market sizing sections in company profiles.

**Implementation complexity:** HARD (for automation) / EASY (for manual reference)
- No API - subscription content only
- Cannot programmatically extract data
- Recommendation: Subscribe for editorial reference, manually add macro data points to market overview sections. Do not attempt to automate.

---

## 5. Patent/IP Data

### 5.1 USPTO PatentsView API

**What data is available:**
- All U.S. granted patents (through Q3 2025 as of current update)
- Patent title, abstract, claims
- Inventors, assignees (companies)
- CPC/USPC classification codes
- Citation networks (which patents cite which)
- Patent prosecution history
- Examiner data
- Geographic data (inventor/assignee locations)
- Bulk download tables in TSV format

**Access method:** PatentSearch API (new version - Legacy API discontinued May 2025)
- Base URL: `https://search.patentsview.org/api/v1/`
- Endpoints: patents, inventors, assignees, CPC groups, locations
- Swagger documentation available
- Requires API key (free registration)
- Bulk downloads: `https://patentsview.org/download/data-download-tables`

**Cost:** FREE

**Rate limits:** API key required but free. Rate limits not explicitly published; reasonable use expected.

**Legal considerations:** Public domain (government patent data). Free for any use.

**Value to investors:** HIGH - Patent portfolio strength is a key indicator of innovation and defensibility. Can track patent filings over time (accelerating = R&D investment), identify technology focus areas, and map competitive IP landscapes in space tech.

**Implementation complexity:** EASY-MEDIUM
- Modern REST API with Swagger docs
- New PatentSearch API replaces legacy (important: do not use old api.patentsview.org)
- Can search by assignee name to find all patents held by a space company
- CPC codes for space: B64G (cosmonautics/vehicles), H04B7/185 (satellite comms), G01S (radar/navigation)
- SpaceNexus already has patent-tracker module

---

### 5.2 Google Patents / BigQuery

**What data is available:**
- 140M+ patent documents from 100+ patent offices worldwide
- Full text (title, abstract, claims, description)
- Patent families (related filings across countries)
- Citation data
- Classification codes (CPC, IPC)
- Legal status events
- Priority dates, publication dates
- Inventor and assignee data

**Access method:**
- Google BigQuery: `google_patents_public_data` dataset
  - SQL queries via BigQuery console or REST API
  - Tables: publications, claims, descriptions, etc.
- No direct Google Patents API (website is search-only)
- Third-party APIs: SerpApi, SearchAPI, Lens.org

**Cost:**
| Method | Price |
|--------|-------|
| BigQuery | First 1 TB/month FREE, then $5/TB |
| SerpApi | $50/month (5,000 searches) |
| Lens.org | Free for individuals, institutional pricing varies |
| EPO OPS | Free (reasonable use) |

**Legal considerations:** Patent data itself is public domain. Google's terms apply to BigQuery usage. Third-party API terms vary.

**Value to investors:** HIGH - Global patent coverage complements USPTO data. Patent family analysis shows international IP strategy. Useful for identifying global competitors and technology trends.

**Implementation complexity:** MEDIUM
- BigQuery requires GCP account setup
- SQL-based queries (different paradigm from REST)
- Alternative: Use Lens.org's free API for simpler access to global patent data
- Recommendation: Start with USPTO PatentsView for US patents, add Google BigQuery for global coverage later

---

### 5.3 WIPO Patent Data

**What data is available:**
- 2.4M+ Patent Cooperation Treaty (PCT) international applications
- 99M+ patent documents from global offices
- Bibliographic data (titles, abstracts in EN/FR)
- International patent classification (IPC)
- Applicant and inventor data
- PCT application status (IASR)
- Global IP statistics by country, technology, applicant

**Access method:**
- PATENTSCOPE search: `https://patentscope.wipo.int/`
- SOAP-based Java API for PATENTSCOPE data
- API Catalog: `https://apicatalog.wipo.int/`
- IP Statistics Data Center (free online, interactive)
- Bulk data subscriptions (XML format)

**Cost:**
| Product | Price (CHF/year) |
|---------|-----------------|
| Bibliographic data feed | 400-2,000 |
| PATENTSCOPE API | Free (with registration) |
| IP Statistics | Free |
| Bulk data | Custom |

**Legal considerations:** WIPO data is for informational purposes. Commercial redistribution requires licensing agreement. Statistics are freely available.

**Value to investors:** MEDIUM - PCT filings indicate international patent strategy. IP statistics provide macro trends. Less actionable than company-level patent data from USPTO.

**Implementation complexity:** HARD
- SOAP/XML APIs (legacy technology)
- Complex data schemas
- Recommendation: Use WIPO IP Statistics for macro data, rely on USPTO PatentsView + Google BigQuery for company-level patent analysis

---

## 6. Alternative Data

### 6.1 LinkedIn API / Company Data

**What data is available (with authorized access):**
- Company pages (name, industry, size, HQ, description)
- Employee count and growth trends
- Job postings
- Company updates/posts
- Follower counts
- Employee demographics (seniority, function - aggregated)

**Access method:** OAuth 2.0 API - RESTRICTED ACCESS
- Must be approved LinkedIn Partner
- Marketing APIs, Talent Solutions APIs, Sales Navigator APIs
- Each has different approval requirements
- DMA Portability API (EU compliance, limited data)

**Cost:** Partnership-based. LinkedIn Partner programs are free to apply but require:
- Valid business use case
- Technical compliance
- Data privacy compliance
- Often tied to LinkedIn product subscriptions ($5K-100K+/year for Sales Navigator, Recruiter, etc.)

**Rate limits:** Vary by API and partner level. Typically 100-1,000 requests/day.

**Legal considerations:** VERY RESTRICTIVE
- Scraping is explicitly prohibited and legally enforced (LinkedIn v. hiQ Labs Supreme Court case)
- API access requires partnership approval
- Cannot store data long-term or redistribute
- Must comply with LinkedIn's API Terms of Use
- User consent required for personal data

**Value to investors:** HIGH (if accessible) - Employee growth is one of the strongest signals of company trajectory. Hiring patterns reveal strategic direction. But access is extremely difficult.

**Implementation complexity:** VERY HARD
- Partnership approval process is lengthy (months)
- Restrictive terms make public display difficult
- Recommendation: Do NOT attempt API integration. Instead, manually reference publicly visible company page data for editorial content. Consider third-party enrichment providers (Coresignal, People Data Labs) that have licensed access.

---

### 6.2 Job Posting APIs (Growth Signals)

**What data is available:**
- Active job listings by company
- Job titles, descriptions, requirements
- Posting dates and durations
- Location data
- Salary ranges (where disclosed)
- Skills and qualifications demanded
- Hiring volume trends over time

**Access method:**
- **Indeed Job Sync API**: For posting jobs, not searching/reading (not useful for intelligence)
- **LinkedIn Job Posting API**: Restricted to partners (see 6.1)
- **Coresignal**: Multi-source API aggregating LinkedIn, Indeed, Glassdoor, Wellfound
  - 399M+ job postings, 65+ data points per posting
  - REST API with company enrichment
- **Adzuna API**: Free tier available, aggregates from multiple job boards
- **JSearch (via RapidAPI)**: Real-time job search aggregator

**Cost:**
| Provider | Price |
|----------|-------|
| Coresignal | Custom enterprise pricing (~$500-5,000/month) |
| Adzuna API | Free tier (limited), paid plans from $29/month |
| JSearch | Free tier (100 req/month), then $10-50/month |

**Legal considerations:** Aggregated job data is generally legal to use for market analysis. Direct scraping of job boards violates their ToS. Use authorized APIs only.

**Value to investors:** HIGH - Job posting velocity is a leading indicator of growth. Hiring for specific roles (e.g., "propulsion engineer" or "GNC lead") reveals product development stage. Layoffs/hiring freezes signal financial stress.

**Implementation complexity:** MEDIUM
- Coresignal: Best data but expensive
- Adzuna/JSearch: Good free starting points
- Recommendation: Start with Adzuna or JSearch free tier, track job counts per company over time, display as "Hiring Activity" metric on company profiles

---

### 6.3 GitHub API

**What data is available:**
- Organization profile (name, description, blog, location, public repos)
- Repository list (name, language, stars, forks, watchers)
- Commit activity (weekly additions/deletions)
- Contributor count and activity
- Release history
- Issue and PR activity
- Topics/tags
- GH Archive: Complete event history on BigQuery

**Access method:** REST API v3 + GraphQL API v4
- Base URL: `https://api.github.com/`
- Organization repos: `/orgs/{org}/repos`
- Repo stats: `/repos/{owner}/{repo}/stats/commit_activity`
- Contributors: `/repos/{owner}/{repo}/contributors`

**Cost:** FREE

**Rate limits:**
| Auth Level | Limit |
|-----------|-------|
| Unauthenticated | 60 requests/hour |
| Personal access token | 5,000 requests/hour |
| GitHub App (org) | 5,000-12,500 requests/hour |

**Legal considerations:** Public repository data is freely accessible. GitHub's ToS apply. Cannot use data to build competing products to GitHub.

**Value to investors:** MEDIUM-HIGH for tech-forward space companies - Open source activity indicates engineering culture, technology maturity, and developer ecosystem. Companies like SpaceX (though limited), Planet Labs, and others have public repos. Star counts and contributor growth are meaningful signals.

**Implementation complexity:** EASY
- Excellent REST and GraphQL APIs
- Well-documented, stable
- Free with generous rate limits (authenticated)
- Implementation: Map space companies to GitHub orgs, pull repo stats, track activity over time
- Relevant orgs: PlanetLabs, RocketLab, SpaceXLand (unofficial), NASA, ESA, NASAJPLOpenSource

---

### 6.4 Domain/Traffic Data

**What data is available:**
- Website traffic estimates (visits, unique visitors)
- Traffic sources (direct, search, referral, social)
- Geographic distribution of visitors
- Competitor benchmarking
- Technology stack detection
- Engagement metrics (bounce rate, pages/visit, time on site)

**Access method:**
- **SimilarWeb API**: Comprehensive but expensive ($428+/month with Trends add-on)
- **Semrush Traffic Analytics**: Competitor analysis ($139-428/month)
- **BuiltWith API**: Technology detection ($295-795/month)
- **Tranco List**: Free ranked domain list (research-focused)
- **Chrome UX Report (CrUX)**: Free, Google's real-user experience data via BigQuery

**Cost:**
| Provider | Price/Month |
|----------|------------|
| SimilarWeb | $149+ (API: custom enterprise) |
| Semrush | $139-428 |
| BuiltWith | $295-795 |
| CrUX (BigQuery) | Free |
| Tranco | Free |

**Legal considerations:** Traffic data is estimated (not actual). Accuracy varies. Attribution typically required. Cannot claim estimates as factual traffic numbers.

**Value to investors:** LOW-MEDIUM - Website traffic is a weak signal for most space companies (they're B2B/B2G, not consumer). More relevant for consumer space brands or marketplace platforms. Consider skipping unless targeting consumer-facing space companies.

**Implementation complexity:** MEDIUM-HARD
- Expensive for comprehensive data
- Accuracy questionable for B2B space sites with low traffic
- Recommendation: Skip for Phase 1. Consider CrUX (free) for basic data later. Focus on more meaningful signals (contracts, patents, hiring).

---

## 7. Priority Implementation Matrix

### Tier 1 - Implement Immediately (Free, High Value, Easy)

| Source | Cost | Value | Complexity | Notes |
|--------|------|-------|-----------|-------|
| SEC EDGAR API | Free | Critical | Easy | Public company financials |
| SEC XBRL Data | Free | High | Easy-Medium | Structured financial metrics |
| USASpending.gov | Free | Critical | Easy | Federal contract awards |
| NASA SBIR/STTR | Free | High | Easy | Innovation/R&D funding signals |
| USPTO PatentsView | Free | High | Easy-Medium | Patent portfolio analysis |
| GitHub API | Free | Medium-High | Easy | Engineering activity signals |

### Tier 2 - Implement Soon (Free/Low Cost, Moderate Effort)

| Source | Cost | Value | Complexity | Notes |
|--------|------|-------|-----------|-------|
| SAM.gov Entity API | Free | Medium-High | Easy-Medium | Already partially integrated |
| FCC ULS | Free | High | Medium | Satellite spectrum licenses |
| NASA Tech Transfer | Free | Medium | Easy | Technology commercialization |
| FPDS-NG | Free | High | Medium-Hard | Granular contract data |
| Job Posting API (Adzuna) | Free tier | High | Medium | Hiring velocity signals |

### Tier 3 - Evaluate Later (Paid, Complex, or Restricted)

| Source | Cost | Value | Complexity | Notes |
|--------|------|-------|-----------|-------|
| Crunchbase API | $10K+/year | Critical (private co.) | Medium | Negotiate enterprise deal |
| FAA AST | Free | Medium-High | Medium-Hard | Manual curation feasible |
| Google BigQuery Patents | Low | High | Medium | Global patent coverage |
| WIPO | Low-Medium | Medium | Hard | International IP data |
| OpenCorporates | $2,250+/year | Medium | Easy | Low rate limits |
| ITU Space Network List | Free-$2K | Medium | Hard | Legacy systems |
| Coresignal (Jobs) | ~$500+/month | High | Medium | If job data proves valuable |

### Tier 4 - Skip or Manual Only

| Source | Reason |
|--------|--------|
| PitchBook | Too expensive ($25K+), cannot display publicly |
| AngelList/Wellfound | No API available |
| LinkedIn API | Partnership approval too restrictive |
| SimilarWeb | Expensive, low value for B2B space |
| Space Foundation | No API, subscription-only reports |

---

## 8. Recommended Phase 1 Integration Plan

### Sprint 1: SEC + Government Contracts (Week 1-2)

**Goal:** Financial data and contract intelligence for public space companies.

1. **SEC EDGAR Integration**
   - Build CIK lookup table for ~50 public space companies
   - Fetch latest 10-K/10-Q XBRL data (revenue, net income, total assets, cash)
   - Display on company profile: Revenue chart, key financial metrics
   - Endpoint: `GET /api/company-profiles/[slug]/financials`

2. **USASpending.gov Integration**
   - Query awards by recipient name/UEI for tracked companies
   - Display on company profile: Contract awards table, total contract value
   - Filter by agency (NASA, DoD, Space Force, NOAA)
   - Endpoint: `GET /api/company-profiles/[slug]/contracts`

### Sprint 2: Innovation Signals (Week 3-4)

3. **USPTO PatentsView Integration**
   - Search patents by assignee name for tracked companies
   - Display on company profile: Patent count, recent filings, technology areas
   - CPC code analysis for technology focus visualization
   - Endpoint: `GET /api/company-profiles/[slug]/patents`

4. **NASA SBIR/STTR Integration**
   - Download bulk dataset, filter for space-related awards
   - Match award recipients to company profiles
   - Display: SBIR awards list, total funding amount, project descriptions
   - Extend existing `src/lib/procurement/sbir-fetcher.ts`

5. **GitHub Activity Integration**
   - Map companies to GitHub organizations
   - Pull repo counts, star counts, contributor counts, recent activity
   - Display: "Open Source Activity" section on profiles
   - Weekly cron job update

### Sprint 3: Regulatory & Spectrum (Week 5-6)

6. **FCC ULS Integration**
   - Download satellite license data (weekly bulk download)
   - Parse pipe-delimited files, filter for satellite services
   - Match license holders to company profiles
   - Display: Active licenses, frequencies, orbital slots

7. **SAM.gov Enhancement**
   - Extend existing SAM.gov integration for entity details
   - Pull business classifications, CAGE codes, status
   - Display: "Government Contractor Profile" section

8. **NASA Technology Transfer**
   - Query patent/software/spinoff APIs
   - Cross-reference with company profiles
   - Display: "NASA Technology Licensee" badge where applicable

### Data Architecture Notes

```
CompanyProfile (existing Prisma model)
  |
  |-- CompanyFinancials (new: SEC XBRL data)
  |     |-- revenue, netIncome, totalAssets, cashFlow
  |     |-- period, filingDate, source
  |
  |-- CompanyContracts (new: USASpending data)
  |     |-- awardId, amount, agency, description
  |     |-- startDate, endDate, type
  |
  |-- CompanyPatents (new: USPTO data)
  |     |-- patentNumber, title, abstract, grantDate
  |     |-- cpcCodes, inventors, citationCount
  |
  |-- CompanySBIRs (new: SBIR/STTR data)
  |     |-- awardId, amount, phase, year, agency
  |     |-- projectTitle, abstract
  |
  |-- CompanyLicenses (new: FCC ULS data)
  |     |-- callSign, serviceType, frequency
  |     |-- status, grantDate, expirationDate
  |
  |-- CompanyGitHub (new: GitHub data)
        |-- orgName, publicRepos, totalStars
        |-- totalContributors, lastActivityDate
```

### Estimated LOE

| Integration | New Files | Estimated Hours | Dependencies |
|------------|----------|----------------|-------------|
| SEC EDGAR | 3-4 | 16-24 | None |
| USASpending.gov | 2-3 | 12-16 | None |
| USPTO PatentsView | 2-3 | 12-16 | None |
| SBIR Enhancement | 1-2 | 8-12 | Existing SBIR module |
| GitHub API | 2-3 | 8-12 | None |
| FCC ULS | 3-4 | 16-24 | File parsing utility |
| SAM.gov Enhancement | 1-2 | 8-12 | Existing SAM module |
| NASA Tech Transfer | 1-2 | 6-8 | None |
| **Total** | **~20 files** | **~86-124 hours** | |

### API Keys / Accounts Needed

| Source | Auth Required | How to Get |
|--------|-------------|-----------|
| SEC EDGAR | User-Agent header only | Add company name + email to requests |
| USASpending.gov | None | No setup needed |
| USPTO PatentsView | API key (free) | Register at patentsview.org |
| SBIR.gov | None | No setup needed |
| GitHub | Personal access token | github.com/settings/tokens |
| FCC ULS | None | No setup needed (bulk download) |
| SAM.gov | API key (free) | Register at sam.gov |
| NASA T2 | None | No setup needed |

---

## Sources

- [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [SEC Accessing EDGAR Data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)
- [data.sec.gov](https://data.sec.gov/)
- [XBRL US API](https://xbrl.us/home/priorities/use/xbrl-api/)
- [OpenCorporates API Reference](https://api.opencorporates.com/documentation/API-Reference)
- [OpenCorporates Pricing](https://opencorporates.com/pricing/)
- [Crunchbase API](https://about.crunchbase.com/products/crunchbase-api/)
- [Crunchbase Pricing](https://www.crunchbase.com/buy/select-product)
- [PitchBook API](https://pitchbook.com/products/direct-access-data/api)
- [PitchBook Pricing](https://pitchbook.com/pricing)
- [Wellfound](https://wellfound.com/)
- [USASpending API](https://api.usaspending.gov/)
- [USASpending API GitHub](https://github.com/fedspendingtransparency/usaspending-api)
- [FPDS-NG](https://www.fpds.gov/)
- [FPDS Integration Specs](https://www.fpds.gov/wiki/index.php/V1.3_FPDS-NG_Web_Service_Integration_Specifications)
- [SAM.gov Entity Management API](https://open.gsa.gov/api/entity-api/)
- [SAM.gov API Guide (GovCon)](https://govconapi.com/sam-gov-api-guide)
- [SBIR.gov API](https://www.sbir.gov/api)
- [SBIR.gov Data Resources](https://www.sbir.gov/data-resources)
- [SBIR/STTR Dataset on Data.gov](https://catalog.data.gov/dataset/sbir-sttr-programs)
- [FCC ULS on Data.gov](https://catalog.data.gov/dataset/fcc-universal-licensing-system-uls)
- [FAA Commercial Space Licenses](https://www.faa.gov/space/licenses)
- [FAA Commercial Space Data](https://www.faa.gov/data_research/commercial_space_data)
- [ITU Space Explorer](https://www.itu.int/itu-r/space/apps/public/spaceexplorer/)
- [ITU SNS Database](https://www.itu.int/sns/database.html)
- [NASA Technology Transfer Portal](https://technology.nasa.gov/)
- [NASA T2 API](https://technology.nasa.gov/api/)
- [NASA T2 Patent Portfolio](https://technology.nasa.gov/patents)
- [The Space Report](https://www.thespacereport.org/)
- [Space Foundation Q2 2025 Report](https://www.spacefoundation.org/2025/07/22/the-space-report-2025-q2/)
- [PatentsView API Purpose](https://patentsview.org/apis/purpose)
- [PatentsView Data Downloads](https://patentsview.org/download/data-download-tables)
- [PatentSearch API Reference](https://search.patentsview.org/docs/docs/Search%20API/SearchAPIReference/)
- [Google Patents Public Data (BigQuery)](https://console.cloud.google.com/marketplace/product/google_patents_public_datasets/google-patents-public-data)
- [WIPO PATENTSCOPE](https://patentscope.wipo.int/)
- [WIPO API Catalog](https://apicatalog.wipo.int/)
- [LinkedIn API Terms of Use](https://www.linkedin.com/legal/l/api-terms-of-use)
- [LinkedIn Marketing API Restricted Uses](https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases)
- [Coresignal Company Data API](https://www.linkedin.com/products/coresignal-company-data-api/)
- [GitHub REST API Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GitHub Repository Statistics API](https://docs.github.com/en/rest/metrics/statistics)
- [GH Archive](https://www.gharchive.org/)
