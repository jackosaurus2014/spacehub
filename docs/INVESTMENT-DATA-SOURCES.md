# SpaceNexus Investment & Company Intelligence Data Sources

> Research completed 2026-02-20. Prioritized by investor value, integration ease, and data uniqueness.

## Current SpaceNexus Schema Capabilities
SpaceNexus already has Prisma models for: `CompanyProfile` (with ticker, exchange, marketCap, totalFunding, valuation, revenueEstimate, samUei, cageCode, dunsNumber, naicsCode), `FundingRound`, `SECFiling`, `GovernmentContractAward`, `CompanyScore`, `RevenueEstimate`, `SatelliteAsset`, `FacilityLocation`, `KeyPersonnel`, `CompanyEvent`, plus marketplace and competitive mapping models.

---

## TIER 1 - HIGHEST PRIORITY (Implement First)

### 1. SEC EDGAR APIs (Official)
**What's Available:**
- **Submissions API** (`data.sec.gov/submissions/CIK##########.json`): Complete filing history, CIK, SIC codes, filing dates, form types, accession numbers
- **CompanyFacts API** (`data.sec.gov/api/xbrl/companyfacts/CIK##########.json`): All XBRL-tagged financial data — revenue, net income, EPS, total assets, liabilities, cash, shares outstanding
- **Company-Concept API** (`data.sec.gov/api/xbrl/companyconcept/CIK/us-gaap/Revenue/...`): Individual financial concept time series
- **EFTS Full-Text Search** (`efts.sec.gov/LATEST/search-index?q=...`): Search across all filing text since 2001
- Covers 10-K (annual), 10-Q (quarterly), 8-K (events), S-1 (IPO), DEF-14A (proxy/exec comp), 13-F (institutional holdings), Form 4 (insider trades)

**Access Method:** REST API, JSON format, no authentication required
**Rate Limit:** 10 requests/second, must include User-Agent header with company name + email
**Cost:** 100% FREE
**Legal:** Public government data, explicitly intended for programmatic access
**Data Freshness:** Real-time (sub-second for submissions, sub-minute for XBRL)
**Implementation Complexity:** EASY — direct JSON endpoints, well-documented
**SpaceNexus Enhancement:**
- Auto-populate `SECFiling` model with all filings for public companies
- Extract revenue, net income, EPS into `RevenueEstimate` from XBRL
- Parse executive compensation from DEF-14A for `KeyPersonnel`
- Track insider trading (Form 4) for sentiment signals
- Monitor 8-K for material events → `CompanyEvent`
- Extract institutional holders from 13-F filings

**Recommended Endpoints to Integrate:**
```
GET https://data.sec.gov/submissions/CIK{padded_cik}.json
GET https://data.sec.gov/api/xbrl/companyfacts/CIK{padded_cik}.json
GET https://efts.sec.gov/LATEST/search-index?q="company name"&dateRange=custom&startdt=2024-01-01
```

---

### 2. USASpending.gov API
**What's Available:**
- Federal contract awards searchable by recipient, agency, NAICS, date range
- Award amounts, contract types, performance periods, place of performance
- Recipient profiles with total awards by year going back to FY2008
- Sub-awards data, transaction history
- Agency breakdown (NASA, Space Force, NRO, DARPA, etc.)
- Grant, loan, and other financial assistance data

**Access Method:** REST API (v2), JSON, no API key required
**Rate Limit:** Generous (no documented per-second limit for public endpoints)
**Cost:** 100% FREE
**Legal:** Public government data under DATA Act
**Data Freshness:** Updated daily (bulk) or near real-time for new awards
**Implementation Complexity:** EASY — well-documented, open-source GitHub repo with contract specs

**Key Endpoints:**
```
POST https://api.usaspending.gov/api/v2/search/spending_by_award/
POST https://api.usaspending.gov/api/v2/recipient/
POST https://api.usaspending.gov/api/v2/search/spending_by_award_count/
GET  https://api.usaspending.gov/api/v2/recipient/{id}/
```

**Filter by space-related agencies:** NASA, DoD (Space Force, DARPA, MDA), NRO, NOAA, FAA-AST
**Filter by NAICS codes:** 336414 (Guided Missile & Space Vehicle Mfg), 336415 (Parts), 517410 (Satellite Telecom), 927110 (Space Research)

**SpaceNexus Enhancement:**
- Auto-populate `GovernmentContractAward` for all 101 companies
- Calculate "government revenue dependency" ratio
- Track contract pipeline and win rates
- Identify which agencies each company serves
- Compare competitors by contract volume

---

### 3. SBIR.gov API (Already Partially Integrated)
**What's Available:**
- All SBIR/STTR awards since program inception
- Firm name, award amount, agency, phase, topic code, abstract
- UEI, DUNS, contact info, contract dates
- Filterable by agency=NASA, DOD, etc.

**Access Method:** REST API, JSON/XML, no authentication
**Rate Limit:** Default 100 rows/request, max 400, offset pagination
**Cost:** 100% FREE
**Legal:** Public government data
**Data Freshness:** Updated as awards are made (note: program authorization expired Sept 2025 — historical data still available)
**Implementation Complexity:** EASY — simple REST endpoint

**Endpoint:**
```
GET https://api.www.sbir.gov/public/api/awards?agency=NASA&rows=400&start=0
GET https://api.www.sbir.gov/public/api/awards?agency=DOD&keyword=satellite
```

**SpaceNexus Enhancement:**
- Extend existing integration to cross-reference all 101 company profiles
- Track Phase I → Phase II → Phase III conversion rates (innovation pipeline metric)
- Aggregate total SBIR funding per company
- Identify R&D focus areas from award abstracts

---

### 4. SAM.gov Entity Management API
**What's Available:**
- Entity registration data: UEI, CAGE code, legal business name, DBA
- Business types, socioeconomic classifications (8(a), HUBZone, WOSB, SDVOSB)
- NAICS codes, PSC codes, entity status
- Physical and mailing addresses
- Points of contact (name + address for public records)
- Exclusion records (debarred/suspended entities)
- Entity registration dates, expiration, last update

**Access Method:** REST API, JSON, requires API key
**Rate Limit:** 10 requests/day (public), 1,000/day (registered entity), 10,000/day (approved system account)
**Cost:** FREE but requires registration (1-4 weeks approval process)
**Legal:** Public government data
**Data Freshness:** Updated as entities modify registrations
**Implementation Complexity:** MEDIUM — requires system account registration, API key approval process

**Endpoint:**
```
GET https://api.sam.gov/entity-information/v3/entities?api_key={key}&ueiSAM={uei}
GET https://api.sam.gov/entity-information/v3/entities?api_key={key}&legalBusinessName={name}
```

**SpaceNexus Enhancement:**
- Enrich `CompanyProfile` with verified government contractor status
- Auto-populate `samUei`, `cageCode`, `naicsCode`, `dunsNumber` fields
- Identify small business certifications (valuable for investor due diligence)
- Cross-reference with `GovernmentContractAward` for active registrations
- Flag companies with exclusion records

---

### 5. PatentsView API (USPTO)
**What's Available:**
- All U.S. granted patents through Sept 2025+
- Patent title, abstract, claims, classification (CPC/USPC)
- Assignee (company) with disambiguated names
- Inventor names and locations
- Citation data (forward/backward citations)
- Legal status, filing dates, grant dates
- Patent families

**Access Method:** REST API (PatentSearch API v2), JSON, no API key required
**Rate Limit:** Reasonable (undocumented specific limit but designed for researcher access)
**Cost:** 100% FREE (both API and bulk downloads)
**Legal:** Public government data, explicitly for public use
**Data Freshness:** Quarterly updates (current through Q3 2025)
**Implementation Complexity:** MEDIUM — new API version as of May 2025, need to learn new query syntax

**Endpoints:**
```
GET https://search.patentsview.org/api/v1/patent/?q={"_contains":{"assignee_organization":"SpaceX"}}
GET https://search.patentsview.org/api/v1/assignee/?q={"assignee_organization":"Rocket Lab"}
```

**SpaceNexus Enhancement:**
- Create new `PatentPortfolio` model or extend `CompanyScore`
- Count patents per company, calculate patent growth velocity
- Analyze technology focus from CPC classification codes
- Citation analysis for patent quality/influence scoring
- Track patent filing velocity as innovation metric
- Compare patent portfolios across competitors (competitive intelligence)

---

### 6. FCC Universal Licensing System (ULS) / IBFS
**What's Available:**
- Satellite space station licenses (Part 25)
- Satellite earth station licenses
- Spectrum licenses and experimental authorizations
- Licensee information, grant dates, expiration dates
- Frequency assignments, orbital parameters
- Application status tracking

**Access Method:** Bulk download (pipe-delimited files), web search, FCC.report mirror
**Rate Limit:** N/A for bulk downloads
**Cost:** 100% FREE
**Legal:** Public government data
**Data Freshness:** Updated as filings are processed
**Implementation Complexity:** MEDIUM — requires parsing pipe-delimited bulk files or building web scraper for IBFS

**Access Points:**
- ULS bulk downloads: `https://www.fcc.gov/uls/transactions/daily-weekly`
- IBFS satellite filings: `https://fcc.report/IBFS/Filing-List/SES`
- Search: `https://wireless2.fcc.gov/UlsApp/UlsSearch/searchLicense.jsp`

**SpaceNexus Enhancement:**
- Link FCC licenses to `SatelliteAsset` model
- Track spectrum holdings per company
- Monitor new satellite filings as leading indicator of expansion
- Identify which companies have active vs pending licenses
- Regulatory risk analysis (license expirations, pending applications)

---

## TIER 2 - HIGH VALUE (Implement Second)

### 7. sec-api.io (Third-Party SEC Enhancement)
**What's Available:**
- Full-text search across all 18M+ EDGAR filings since 1993
- XBRL-to-JSON conversion for standardized financial statements
- Real-time filing stream
- Insider trading tracker (Form 4)
- Institutional holdings (13-F)
- Audit fees data
- Executive compensation extraction
- 150+ filing types

**Access Method:** REST API, JavaScript/Python SDKs
**Rate Limit:** Varies by tier
**Cost:** Free (100 calls/mo) | Personal $55/mo | Business $239/mo | Enterprise custom
**Legal:** Redistributes public SEC data, commercial service
**Data Freshness:** Real-time streaming available
**Implementation Complexity:** EASY — excellent documentation, SDKs available

**SpaceNexus Enhancement:**
- Supplements official EDGAR with structured financial statement extraction
- Real-time alerts when space companies file material events
- Automated insider trading signals
- Extract executive comp data into `KeyPersonnel` salary fields

**Recommendation:** Start with free tier for testing, upgrade to Personal ($55/mo) if official EDGAR parsing proves too complex.

---

### 8. DoD Contract Announcements
**What's Available:**
- All DoD contracts valued at $7.5M+ announced daily at 5 PM ET
- Contract value, contractor name, description, contracting activity
- Available via defense.gov/News/Contracts/ (structured HTML/RSS)

**Access Method:** RSS feed / web scraping of defense.gov
**Rate Limit:** N/A
**Cost:** 100% FREE
**Legal:** Public government information
**Data Freshness:** Daily (business days, 5 PM ET)
**Implementation Complexity:** EASY — RSS parsing or simple HTML scraping

**SpaceNexus Enhancement:**
- Auto-ingest new defense contracts mentioning space companies
- Early detection of contract wins before they appear in FPDS/USASpending
- Complement existing `GovernmentContractAward` pipeline

---

### 9. FPDS (Federal Procurement Data System) — Migrating to SAM.gov
**What's Available:**
- 180+ data points on every federal contract above micro-purchase threshold (~$10K)
- Contracting officer, award type, competition status, set-aside type
- Period of performance, place of performance, funding agency
- Modification history for contract changes

**Access Method:** SOAP/XML web services (legacy), migrating to SAM.gov REST API
**Rate Limit:** User account required
**Cost:** 100% FREE
**Legal:** Public government data under FOIA
**Data Freshness:** Near real-time as agencies report
**Implementation Complexity:** MEDIUM — SOAP API is cumbersome; better to wait for full SAM.gov migration or use USASpending as the primary source (USASpending pulls from FPDS)

**SpaceNexus Enhancement:**
- More granular contract data than USASpending
- Competition analysis (sole-source vs competitive)
- Contract modification tracking
- Sub-contractor identification

**Recommendation:** Use USASpending.gov API as primary (covers FPDS data in friendlier format). Only integrate FPDS directly if granular modification data is needed.

---

### 10. NASA Technology Transfer Portal API
**What's Available:**
- 1,400+ technologies available for licensing
- Patent data, software catalog, spinoff database
- Technology descriptions, categories, licensing status
- Searchable by keyword

**Access Method:** REST API, JSON
**Cost:** 100% FREE
**Legal:** Public government data
**Data Freshness:** Updated as new technologies are added
**Implementation Complexity:** EASY — simple REST endpoints

**Endpoint:**
```
GET https://technology.nasa.gov/api/api/patent/{keywords}
GET https://technology.nasa.gov/api/api/software/{keywords}
GET https://technology.nasa.gov/api/api/spinoff/{keywords}
```

**SpaceNexus Enhancement:**
- Cross-reference NASA patents with company licensees
- Identify companies licensing NASA technology (technology transfer signals)
- Track NASA spinoff companies

---

### 11. Google Patents via BigQuery
**What's Available:**
- 19 datasets: patent classifications, standards-essential patents, chemical compounds, patent litigation, patent publications, etc.
- Global patent data (not just USPTO)
- Citation networks, patent families, legal status
- Full-text search via SQL

**Access Method:** Google BigQuery SQL queries, REST API
**Rate Limit:** Based on data scanned
**Cost:** First 1 TB/month FREE, then $5/TB
**Legal:** Public patent data aggregated by Google
**Data Freshness:** Updated periodically (varies by dataset)
**Implementation Complexity:** MEDIUM — requires BigQuery setup, SQL familiarity

**SpaceNexus Enhancement:**
- Global patent coverage (European, Japanese, Chinese patents)
- Patent litigation tracking
- Standards-essential patent identification
- More comprehensive than USPTO-only PatentsView

---

### 12. FAA Commercial Space Launch Licenses
**What's Available:**
- Active launch/reentry operator licenses
- Spaceport licenses
- Safety element approvals
- License holder names, license types, dates

**Access Method:** Web scraping of faa.gov/space/licenses, structured data tables
**Rate Limit:** N/A
**Cost:** 100% FREE
**Legal:** Public government data
**Data Freshness:** Updated as licenses are granted/modified
**Implementation Complexity:** EASY — relatively simple web tables to scrape

**SpaceNexus Enhancement:**
- Identify which companies hold active launch licenses
- Track new license applications as growth signals
- Link to `CompanyProfile` for launch providers
- Regulatory status tracking

---

## TIER 3 - MEDIUM PRIORITY (Valuable but Higher Cost/Complexity)

### 13. Crunchbase API
**What's Available:**
- Company profiles: founding date, description, categories, location
- Funding rounds with investors, amounts, dates
- Acquisitions, IPOs, key people
- News, events, board members
- Financial data for public companies

**Access Method:** REST API (requires API key)
**Rate Limit:** Varies by plan
**Cost:** Free account (limited web access) | Pro $49-99/mo (2K exports) | Enterprise (API access — custom pricing, likely $10K+/year)
**Legal:** Commercial data, API access requires license agreement. Scraping explicitly prohibited in TOS.
**Data Freshness:** Near real-time for funding rounds
**Implementation Complexity:** MEDIUM (API), but HIGH cost barrier for programmatic access

**SpaceNexus Enhancement:**
- Most comprehensive funding round data source
- Investor network mapping
- Acquisition tracking
- Would directly populate `FundingRound` model

**Recommendation:** Crunchbase API access at enterprise level ($10K+/yr) is expensive. Consider manual data entry for key companies, supplementing with SEC filings (free) for public companies and press release monitoring for private companies.

---

### 14. PitchBook API
**What's Available:**
- Most comprehensive PE/VC database
- Detailed deal terms, investor profiles, fund performance
- Comparable company analysis
- Financial forecasts, multiples
- Board member and advisor data

**Access Method:** RESTful API (JSON), CRM integrations
**Cost:** Starting at $12,000/year single user; API access requires enterprise contract (est. $25K-50K+/year)
**Legal:** Licensed commercial data, strict redistribution restrictions
**Data Freshness:** Near real-time
**Implementation Complexity:** EASY (technically) but VERY HIGH cost barrier

**SpaceNexus Enhancement:**
- Gold standard for investment data
- Would dramatically enhance funding round data
- Comparable valuations for private companies

**Recommendation:** Too expensive for current stage. Use free alternatives (SEC EDGAR, press releases, Bryce Tech reports) to build funding data. Consider PitchBook partnership when SpaceNexus has more revenue.

---

### 15. LinkedIn Company Data (via Third-Party APIs)
**What's Available:**
- Employee count and growth trends
- Department breakdown
- Job openings (growth signals)
- Company description, industry, headquarters
- Key personnel profiles

**Access Method:** Third-party APIs (Proxycurl, ScrapIn, Bright Data) — LinkedIn official API is restricted
**Rate Limit:** Varies by provider
**Cost:** Proxycurl ~$0.01-0.03/request; Bright Data custom pricing; ScrapIn per-request pricing
**Legal:** GRAY AREA — scraping public LinkedIn data is generally legal per HiQ Labs v. LinkedIn ruling, but LinkedIn TOS prohibits it. Third-party APIs operate in compliance with data protection laws (GDPR/CCPA).
**Data Freshness:** Near real-time
**Implementation Complexity:** MEDIUM — reliable third-party APIs available

**SpaceNexus Enhancement:**
- Most valuable for employee headcount tracking as growth signal
- Department growth shows where companies are investing
- Job posting analysis for hiring trends
- Would enhance `CompanyProfile.employeeCount` and `employeeCountSource`

**Recommendation:** Use Proxycurl ($0.01/request) for periodic enrichment of employee data. Budget ~$10-20/month for 101 companies refreshed monthly.

---

### 16. Glassdoor Company Data
**What's Available:**
- Company ratings (overall, culture, work-life balance, management, compensation)
- CEO approval rating
- Employee reviews (pros/cons, sentiment)
- Salary data by role
- Interview difficulty and experience
- Company size, revenue estimates

**Access Method:** Official API (partnership required) or third-party scraping APIs (Apify, OpenWeb Ninja, Bright Data)
**Rate Limit:** Varies
**Cost:** Official API requires partnership agreement; third-party APIs ~$50-200/month
**Legal:** Official partnership is clean; scraping is gray area per Glassdoor TOS
**Data Freshness:** Near real-time reviews, quarterly aggregates
**Implementation Complexity:** MEDIUM

**SpaceNexus Enhancement:**
- Add employer quality score to `CompanyScore`
- Salary benchmarking for space industry roles
- Employee sentiment as company health indicator
- Useful for talent module cross-reference

---

### 17. Job Posting Data (Indeed, LinkedIn)
**What's Available:**
- Open positions by company (volume = growth signal)
- Role types and seniority levels
- Location data (expansion signals)
- Salary ranges
- Skills/requirements (technology signal)

**Access Method:** Third-party APIs (Coresignal, TheirStack, JobsPikr) — Indeed/LinkedIn official APIs are restricted to partners
**Cost:** Coresignal ~$200-500/month for jobs API; TheirStack per-request
**Legal:** Aggregating publicly posted jobs is generally legal
**Data Freshness:** Real-time to daily
**Implementation Complexity:** MEDIUM

**SpaceNexus Enhancement:**
- Hiring velocity as growth metric for `CompanyScore`
- Technology stack inference from job requirements
- Geographic expansion detection
- Headcount growth prediction

---

### 18. GitHub/Open Source Activity
**What's Available:**
- Repository count, stars, forks, contributors
- Commit frequency and contributor growth
- Programming languages used
- Release cadence
- Issue/PR activity

**Access Method:** GitHub REST API v3 or GraphQL v4, free with authentication
**Rate Limit:** 5,000 requests/hour (authenticated), 60/hour (unauthenticated)
**Cost:** 100% FREE
**Legal:** Fully permitted — official API
**Data Freshness:** Real-time
**Implementation Complexity:** EASY — excellent API documentation

**Endpoints:**
```
GET https://api.github.com/orgs/{org}/repos
GET https://api.github.com/repos/{owner}/{repo}/stats/contributors
GET https://api.github.com/repos/{owner}/{repo}/stats/commit_activity
```

**SpaceNexus Enhancement:**
- Technology transparency score for companies with open-source presence
- Developer ecosystem health (for platform companies like Planet, SpaceX Starlink)
- Innovation velocity proxy
- Only applicable to ~20-30% of space companies

---

### 19. ITU SpaceExplorer (Satellite Frequency Filings)
**What's Available:**
- Geostationary satellite filings database
- Non-geostationary satellite filings
- Earth station filings
- Spectrum occupancy analysis by orbit
- Filing status tracking by country

**Access Method:** Web interface (SpaceExplorer dashboard), TIES account for advanced features
**Rate Limit:** N/A (web interface)
**Cost:** FREE for basic access; TIES account (free for ITU members)
**Legal:** Public international regulatory data
**Data Freshness:** Updated as filings are processed
**Implementation Complexity:** HARD — no REST API, requires web scraping or manual extraction

**SpaceNexus Enhancement:**
- Identify planned satellite constellations before they launch
- Spectrum asset mapping per company
- Regulatory compliance tracking
- International filing activity as expansion signal

---

### 20. NOAA Commercial Remote Sensing Licenses
**What's Available:**
- Licensed remote sensing satellite operators
- License tier (Tier 1, 2, 3)
- Operating conditions and restrictions
- Compliance status

**Access Method:** Web-accessible licensee list; no formal API
**Cost:** 100% FREE
**Legal:** Public government data
**Data Freshness:** Updated as licenses change
**Implementation Complexity:** EASY — small dataset, manual or simple scrape

**SpaceNexus Enhancement:**
- Identify licensed EO/remote sensing companies
- Tier classification indicates capability level
- Regulatory compliance status

---

## TIER 4 - SUPPLEMENTARY SOURCES

### 21. Space-Specific Industry Reports & Databases

#### Bryce Tech (Start-Up Space Report)
- Annual report tracking all space VC/PE investment
- Sources from PitchBook + press releases
- Cost: Reports available free (PDF); custom analysis is paid
- Enhancement: Benchmark investment data, validate funding rounds

#### Space Capital (Space Investment Quarterly)
- Quarterly investment reports with deal-level data
- Available at spacecapital.com/space-iq
- Cost: Free quarterly reports
- Enhancement: Investment trend tracking, sector benchmarking

#### SpaceFund
- Startup funding tracker, launch database
- SpaceFund Reality Rating (readiness scoring)
- Cost: Free access to some data; premium features available
- Enhancement: Cross-reference startup readiness scores

#### The Space List
- 4,000+ space entities from 90 countries, 1,600+ funding rounds
- Cost: Subscription model
- Enhancement: International company discovery

#### Dealroom.co (ESA Partnership)
- 2,200+ space tech startups, 3,000+ funding rounds
- Cost: Custom enterprise pricing (expensive)
- Enhancement: European space startup data

#### NewSpace Index (SpaceWorks)
- Public space company stock performance vs S&P 500, DJIA
- Updated quarterly from 10-K/10-Q reports
- Cost: Free
- Enhancement: Public market performance benchmarking

---

### 22. Wellfound (formerly AngelList)
**What's Available:** Startup profiles, funding rounds, job listings, team data
**Access Method:** No official API; scraping is heavily blocked
**Cost:** Free web access, scraping tools available via third parties
**Legal:** TOS prohibits scraping; Wellfound actively blocks scrapers
**Implementation Complexity:** HARD — anti-scraping measures
**Recommendation:** Skip — data available elsewhere (Crunchbase, press releases)

---

### 23. Y Combinator Directory
**What's Available:** 5,000+ companies, 8,000+ founders, batch info, status, location, jobs
**Access Method:** Third-party scrapers (Apify ~$5/month free tier); open-source scrapers on GitHub
**Cost:** Apify free tier allows ~30 results; $49/mo for 3,000+
**Legal:** Web scraping of publicly available data — generally legal but check TOS
**Data Freshness:** Updated as YC updates directory
**Implementation Complexity:** EASY via Apify

**SpaceNexus Enhancement:**
- Identify YC-backed space companies
- Track batch trends (increasing space focus)
- ~20-30 space-relevant companies in YC portfolio

---

### 24. WIPO International Patent Filings
**What's Available:** PATENTSCOPE search across international patent applications (PCT filings)
**Access Method:** SOAP API, API Catalog (apicatalog.wipo.int)
**Rate Limit:** <10 retrieval actions per minute
**Cost:** Free with WIPO subscription
**Legal:** Public data, requires TOS acceptance
**Implementation Complexity:** HARD — SOAP protocol, rate-limited

**SpaceNexus Enhancement:** International patent portfolio analysis beyond USPTO
**Recommendation:** Use Google Patents BigQuery for international coverage instead — easier integration.

---

### 25. ESA Procurement Dashboard
**What's Available:** Tender actions, contract status, procurement progress
**Access Method:** Web portal (esa-star Publication), no API
**Cost:** Free
**Legal:** Public procurement data
**Implementation Complexity:** HARD — no API, manual monitoring

**SpaceNexus Enhancement:** European contract tracking for companies with ESA business

---

### 26. UK Space Agency Grants/Contracts
**What's Available:** Grant awards, contract opportunities via Contracts Finder
**Access Method:** UK Contracts Finder API (contracts.gov.uk)
**Cost:** Free
**Legal:** Public procurement data
**Implementation Complexity:** MEDIUM — Contracts Finder has an API

**SpaceNexus Enhancement:** UK space sector funding tracking

---

### 27. JAXA Partnerships
**What's Available:** International cooperation agreements, partnership contracts
**Access Method:** Web scraping of JAXA news/press releases
**Cost:** Free
**Legal:** Public information
**Implementation Complexity:** HARD — no structured data source
**Recommendation:** Monitor via RSS/news feed integration (already have news pipeline)

---

### 28. News Sentiment Analysis
**What's Available:** Sentiment scoring on company mentions in news articles
**Access Method:** Apply NLP to existing SpaceNexus news pipeline
**Cost:** Free (open-source models) or ~$0.001-0.01/analysis (cloud APIs)
**Legal:** Processing your own aggregated news data is fine
**Options:**
- FinBERT (free, open-source, finance-tuned)
- Google Cloud NLP ($1/1000 documents)
- Azure Text Analytics ($1/1000 documents)
- TextBlob (free, simpler)

**Implementation Complexity:** MEDIUM — already have news pipeline, need to add sentiment scoring
**SpaceNexus Enhancement:**
- Company sentiment score in `CompanyScore` model
- Trend alerts when sentiment shifts dramatically
- Already have 53 RSS feeds + 39 blog sources

---

### 29. Web Traffic / Domain Analytics
**What's Available:** Website traffic estimates, visitor trends, geographic distribution
**Access Method:** SimilarWeb API (paid) or alternatives (SEMrush, Ahrefs, SpyFu)
**Cost:** SimilarWeb API $10K+/year; SEMrush $139/mo; SpyFu $9/mo
**Legal:** Commercial data
**Implementation Complexity:** MEDIUM
**SpaceNexus Enhancement:** Website traffic as company growth proxy — useful but not critical for space companies

**Recommendation:** Low priority — most space companies' value isn't reflected in web traffic. Skip for now.

---

## IMPLEMENTATION ROADMAP

### Phase 1 — Free Government APIs (Weeks 1-4, $0 cost)
| Source | New Files | Existing Models Used | Priority |
|--------|-----------|---------------------|----------|
| SEC EDGAR XBRL | `src/lib/fetchers/sec-edgar.ts` | SECFiling, RevenueEstimate, KeyPersonnel | P0 |
| USASpending.gov | `src/lib/fetchers/usaspending.ts` | GovernmentContractAward | P0 |
| SBIR.gov (extend) | Extend existing | GovernmentContractAward | P0 |
| PatentsView | `src/lib/fetchers/patentsview.ts` | New: PatentAsset model | P1 |
| NASA T2 Portal | `src/lib/fetchers/nasa-t2.ts` | New: TechTransfer model | P1 |
| DoD Announcements | `src/lib/fetchers/dod-contracts.ts` | GovernmentContractAward | P1 |
| FAA Licenses | `src/lib/fetchers/faa-licenses.ts` | CompanyProfile metadata | P2 |

### Phase 2 — Registered Government APIs (Weeks 5-8, $0 cost)
| Source | Requirements | Priority |
|--------|-------------|----------|
| SAM.gov Entity API | System account registration (1-4 wk approval) | P0 |
| FPDS/SAM.gov Contracts | Account + API key | P1 |
| FCC ULS bulk data | Download + parse pipeline | P2 |

### Phase 3 — Low-Cost Commercial APIs (Weeks 9-12, ~$100-200/month)
| Source | Monthly Cost | Priority |
|--------|-------------|----------|
| sec-api.io (Personal) | $55/mo | P1 (if EDGAR parsing is too complex) |
| LinkedIn via Proxycurl | ~$10-20/mo | P1 |
| GitHub API | $0 (free) | P2 |
| News Sentiment (FinBERT) | $0 (self-hosted) | P2 |

### Phase 4 — Premium Data (Future, when revenue supports it)
| Source | Annual Cost | When to Consider |
|--------|------------|-----------------|
| Crunchbase Enterprise API | ~$10K+/yr | When ARR > $100K |
| PitchBook API | ~$25K+/yr | When ARR > $500K |
| Dealroom.co | Custom | When targeting European market |
| SimilarWeb API | ~$10K+/yr | Probably never needed for space |

---

## SUGGESTED SCHEMA ADDITIONS

```prisma
model PatentAsset {
  id             String         @id @default(cuid())
  companyId      String?
  company        CompanyProfile? @relation(fields: [companyId], references: [id])
  patentNumber   String         @unique
  title          String
  abstract       String?        @db.Text
  filingDate     DateTime?
  grantDate      DateTime?
  expirationDate DateTime?
  inventors      String[]
  cpcCodes       String[]       // Classification codes
  citations      Int?           // Forward citation count
  status         String?        // "active", "expired", "pending"
  assignee       String?
  source         String?        // "USPTO", "WIPO", "Google Patents"
  sourceUrl      String?
  createdAt      DateTime       @default(now())

  @@index([companyId])
  @@index([grantDate])
}

model RegulatoryLicense {
  id            String         @id @default(cuid())
  companyId     String?
  company       CompanyProfile? @relation(fields: [companyId], references: [id])
  agency        String         // "FCC", "FAA", "NOAA", "ITU"
  licenseType   String         // "satellite", "launch", "remote_sensing", "spectrum"
  licenseNumber String?
  callSign      String?
  grantDate     DateTime?
  expirationDate DateTime?
  status        String?        // "active", "pending", "expired", "suspended"
  details       Json?
  source        String?
  sourceUrl     String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([companyId])
  @@index([agency])
  @@unique([agency, licenseNumber])
}

model InsiderTransaction {
  id            String         @id @default(cuid())
  companyId     String?
  company       CompanyProfile? @relation(fields: [companyId], references: [id])
  filerName     String
  filerTitle    String?        // "CEO", "CFO", "Director"
  transactionDate DateTime
  transactionType String       // "purchase", "sale", "option_exercise"
  shares        Int?
  pricePerShare Float?
  totalValue    Float?
  sharesOwned   Int?           // Post-transaction holdings
  filingDate    DateTime?
  accessionNumber String?
  source        String?        // "SEC Form 4"
  createdAt     DateTime       @default(now())

  @@index([companyId])
  @@index([transactionDate])
}

model InstitutionalHolding {
  id              String         @id @default(cuid())
  companyId       String?
  company         CompanyProfile? @relation(fields: [companyId], references: [id])
  institutionName String
  institutionCik  String?
  sharesHeld      Int
  value           Float?         // Market value of holdings
  percentOwned    Float?
  quarterEnd      DateTime       // Filing quarter
  changeShares    Int?           // Change from prior quarter
  changePercent   Float?
  filingDate      DateTime?
  source          String?        // "SEC 13-F"
  createdAt       DateTime       @default(now())

  @@index([companyId])
  @@index([quarterEnd])
  @@unique([companyId, institutionCik, quarterEnd])
}
```

---

## DATA FLOW ARCHITECTURE

```
                    CRON JOBS (daily/weekly/quarterly)
                              |
        +---------+-----------+-----------+---------+
        |         |           |           |         |
    SEC EDGAR  USASpending  SBIR.gov   PatentsView  FCC/FAA
        |         |           |           |         |
        v         v           v           v         v
    [Fetcher Functions in src/lib/fetchers/]
        |         |           |           |         |
        +----+----+-----------+-----------+---------+
             |
             v
    [Data Normalization & Deduplication]
             |
             v
    [Prisma Models - PostgreSQL]
             |
             v
    [CompanyScore Recalculation]
             |
             v
    [Company Profile Pages + API v1 Endpoints]
```

**Cron Schedule Recommendations:**
- SEC EDGAR submissions: Daily (check for new filings)
- SEC EDGAR XBRL: Weekly (financial data updates)
- USASpending.gov: Weekly (new contract awards)
- SBIR.gov: Weekly
- PatentsView: Monthly (quarterly data, check monthly)
- FCC/FAA licenses: Monthly
- SAM.gov entities: Monthly
- DoD announcements: Daily (5 PM ET scrape)
- LinkedIn employee data: Monthly (via Proxycurl)
- GitHub activity: Weekly
- News sentiment: Daily (apply to existing news pipeline)

---

## ESTIMATED IMPACT ON COMPANY PROFILES

| Data Source | Companies Enhanced | Data Completeness Impact |
|------------|-------------------|------------------------|
| SEC EDGAR | ~15-20 public companies | +15-20% for public companies |
| USASpending.gov | ~60-70 gov contractors | +10-15% across all profiles |
| SBIR.gov | ~30-40 SBIR recipients | +5-8% for smaller companies |
| SAM.gov | ~50-60 registered entities | +5-8% identity verification |
| PatentsView | ~40-50 patent holders | +5-10% innovation metrics |
| FCC/FAA | ~25-30 licensed operators | +3-5% regulatory data |
| LinkedIn | All 101 companies | +5-8% employee metrics |
| GitHub | ~20-30 with OSS presence | +2-3% tech transparency |
| News Sentiment | All 101 companies | +3-5% sentiment scoring |
| **Combined Phase 1-3** | **All 101 companies** | **+40-60% average completeness** |

---

## KEY SOURCES & REFERENCES

- [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [SEC Developer Resources](https://www.sec.gov/about/developer-resources)
- [data.sec.gov](https://data.sec.gov/)
- [sec-api.io Pricing](https://sec-api.io/pricing)
- [USASpending.gov API](https://api.usaspending.gov/)
- [USASpending GitHub](https://github.com/fedspendingtransparency/usaspending-api)
- [SAM.gov Entity API](https://open.gsa.gov/api/entity-api/)
- [SBIR.gov API](https://www.sbir.gov/api)
- [PatentsView API](https://patentsview.org/apis/purpose)
- [PatentsView Downloads](https://patentsview.org/download/data-download-tables)
- [Google Patents BigQuery](https://console.cloud.google.com/marketplace/product/google_patents_public_datasets/google-patents-public-data)
- [WIPO API Catalog](https://apicatalog.wipo.int/)
- [FCC ULS](https://catalog.data.gov/dataset/fcc-universal-licensing-system-uls)
- [FAA Commercial Space Licenses](https://www.faa.gov/space/licenses)
- [NOAA Remote Sensing Licensing](https://space.commerce.gov/regulations/commercial-remote-sensing-regulatory-affairs/licensing/)
- [NASA Technology Transfer Portal API](https://technology.nasa.gov/api/)
- [ITU SpaceExplorer](https://www.itu.int/itu-r/space/apps/public/spaceexplorer/)
- [DoD Contract Announcements](https://www.defense.gov/News/Contracts/)
- [Crunchbase Pricing](https://support.crunchbase.com/hc/en-us/articles/360062989313)
- [PitchBook API](https://pitchbook.com/products/direct-access-data/api)
- [GitHub REST API Statistics](https://docs.github.com/en/rest/metrics/statistics)
- [Bryce Tech Start-Up Space 2025](https://brycetech.com/reports/report-documents/start_up_space_2025/BryceTech_Start_Up_Space_2025.pdf)
- [Space Capital Investment Quarterly](https://www.spacecapital.com/space-iq)
- [The Space List](https://www.thespacelist.space/)
- [Dealroom Space Tech](https://dealroom.co/guides/space-tech-europe)
- [ESA Procurement Dashboard](https://www.esa.int/About_Us/Business_with_ESA/Small_and_Medium_Sized_Enterprises/Procurement_dashboard)
- [UK Contracts Finder](https://www.gov.uk/guidance/find-information-on-applying-for-grants-from-the-uk-space-agency)
- [Space Foundation Reports](https://www.thespacereport.org/)
- [SIA State of the Satellite Industry](https://sia.org/news-resources/state-of-the-satellite-industry-report/)
