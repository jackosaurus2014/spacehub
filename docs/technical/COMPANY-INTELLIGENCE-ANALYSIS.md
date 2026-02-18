# SpaceNexus Company Intelligence Database: Strategic Analysis

**Prepared for**: CEO Overnight Review
**Date**: February 8, 2026
**Classification**: Internal Strategy Document

---

## Executive Summary

Company intelligence is the single most critical feature gap in SpaceNexus today. Every serious competitor in space industry intelligence -- Quilty Space, BryceTech, Novaspace, Seradata/Slingshot, Payload Pro, SpaceFund -- has mature company profile databases as their core value proposition. SpaceNexus currently has 123 companies seeded in a basic `SpaceCompany` model (market data oriented) and a more robust but unpopulated `CompanyProfile` schema with 12 related models added in v0.9.0. The schema is enterprise-grade in design; the problem is zero populated data in the intelligence models. This document lays out exactly what competitors offer, what we need, and how to build it in three phases over 8 weeks.

---

## 1. Competitive Landscape: What Competitors Offer

### 1.1 Quilty Space (quiltyspace.com) -- The Gold Standard

Quilty Space is the acknowledged global leader in subscription-based satellite and space sector business intelligence. Founded by Chris Quilty (former Cowen aerospace analyst), their platform targets strategy, policy, BD, M&A, and investment professionals.

**What they offer:**
- Company deep dives with proprietary financial models and projections
- Public company earnings data and analysis (quarterly)
- M&A and investment tracker (deals, valuations, multiples)
- Company KPI tracking with proprietary models
- Constellation mapping with company-level insights
- Competitive landscape mapping (identify buyers, partners, M&A targets, investors)
- Daily "News Flash" curated headlines
- "Quilty QuickTakes" rapid-response analysis
- Quarterly sector reports: Satcom, Earth Observation, Space Hardware

**Pricing**: Enterprise subscription, estimated $25K-$75K/year per seat (not publicly listed; contact-for-pricing model). This is the benchmark for what enterprise buyers expect.

**Key takeaway**: Quilty's moat is analyst-driven financial models and KPI projections -- things that require human expertise. But their company database itself (firmographics, funding, M&A, personnel) is something we can build and potentially offer at a lower price point.

### 1.2 BryceTech (brycetech.com) -- The Government Authority

BryceTech provides the official launch industry data to the FAA Office of Commercial Space Transportation and technology investment assessments for NASA. They are the authoritative source for space investment data.

**What they offer:**
- **Start-Up Space Report** (annual, free): Tracks publicly-reported seed, venture, and PE investment; debt financing; M&A; and IPO activity for space startups. The 2025 edition reports $7.8B invested globally in 2024.
- **Smallsats by the Numbers** (annual): Comprehensive smallsat ecosystem tracking
- Government program assessments for DoD and NASA
- Market, investment, strategic, and technology analyses for aerospace organizations
- Originated many authoritative datasets guiding the industry

**Pricing**: Reports are free (government-funded). Consulting and custom analytics are paid engagements ($200K+ per project).

**Key takeaway**: BryceTech's dataset is the industry benchmark for investment tracking. Their Start-Up Space methodology of tracking every publicly-reported funding round is what our FundingRound model needs to replicate. The 2024 data shows $7.8B globally, $4B to US companies, with a shift toward Series A ($1.4B) -- these are the numbers our platform should surface.

### 1.3 Payload Pro (pro.payloadspace.com) -- The Media-Intelligence Hybrid

Payload has built one of the most influential space industry newsletters (19,000+ subscribers including C-suite at every leading new space company and A&D primes), then layered a "Pro" intelligence tier on top.

**What they offer:**
- Company deep dives (e.g., SpaceX revenue model build, Rocket Lab analysis)
- Sector deep dives with financial analysis
- Propulsion vendor/product/spec catalog
- Research categories: Capital Markets, Civil & Defense, Earth Observation, Infrastructure, Launch, Satcom
- State of the Industry annual reports
- Podcast interviews with executives providing insider context

**Pricing**: Pro tier estimated at $300-$500/year (media subscription model, not enterprise SaaS).

**Key takeaway**: Payload demonstrates the power of "content + data" -- their newsletter drives daily engagement, and Pro adds company intelligence. SpaceNexus should study this model: company profiles become the "reason to come back daily" when linked to news feed and alerts.

### 1.4 Novaspace (nova.space) -- The Database Powerhouse

Formed from the merger of Euroconsult (40+ years of space industry analysis) and SpaceTec Partners, Novaspace is the deepest satellite-focused database in the market.

**What they offer:**
- Proprietary satellite databases: 30+ columns per entry covering constellation, application, manufacturing/launch contract status, operator, manufacturer, launch provider
- Smallsat constellation tracker: 440+ projects tracked individually (mass, orbit, satellite count, operator type/region, funding status)
- Organizational/financial details of 2,200+ companies
- Government space program budgets and forecasts
- 10-year satellite backlog and forecast database
- Market monitoring dashboards

**Pricing**: Individual reports from 3,000 EUR to 27,500 EUR. Annual subscriptions for database access likely $15K-$50K+.

**Key takeaway**: Novaspace's 2,200+ company database with 30+ data columns per satellite entry is the most comprehensive in terms of raw data volume. Their satellite-centric approach (linking companies TO satellites and programs) is a model we should adopt -- companies don't exist in isolation; they exist in the context of missions, contracts, and constellations.

### 1.5 Seradata / Slingshot Aerospace (seradata.com) -- The Historical Record

Acquired by Slingshot Aerospace in 2022, Seradata operates SpaceTrak, the space industry's most comprehensive launch and satellite database.

**What they offer:**
- 50,000+ spacecraft records with mission, ownership, and design lineage (updated daily)
- Historical reliability and event tagging for risk analysis
- Financial and insurance-linked metadata
- Operator profiles linked to spacecraft/mission data
- Technical specifications for every launched satellite since Sputnik (1957)
- Integration with Slingshot's AI, Digital Space Twin, and Developer APIs

**Key takeaway**: Seradata proves that the deepest value in company intelligence comes from linking companies to their ASSETS (satellites, launches, ground stations). A company profile that shows "Iridium operates 66 active LEO satellites in a 780km orbit" is vastly more useful than one that just says "Iridium is a satellite operator."

### 1.6 SpaceFund Intelligence (spacefundintelligence.com)

SpaceFund operates as both a VC fund and an intelligence provider, giving them unique deal-flow visibility.

**What they offer:**
- Reality Rating: Proprietary 0-9 scoring of space startups (technology readiness, team quality, funding status)
- 100+ launch companies profiled in detail
- Market intelligence across Transportation, Communication, Human Factors, Supplies, and Energy sectors
- Investor/startup matching based on sector and stage
- Satellite servicing database
- Beyond Earth Orbit communications database

**Key takeaway**: The "Reality Rating" concept -- a standardized score for space companies -- is brilliant for making a large database navigable. SpaceNexus should develop our own scoring methodology.

### 1.7 General-Purpose Platforms (Crunchbase, PitchBook, Tracxn)

These horizontal platforms also track space companies:
- **Crunchbase**: Free tier shows basic funding; Enterprise API provides 100+ firmographic fields. Space-specific coverage is shallow.
- **PitchBook**: Tracks space technology as an industry vertical. API provides company, fund, and deal data. $20K+/year. Deep financial data but no space domain expertise.
- **Tracxn**: Tracks 2,670+ companies in "Space Tech" globally. Offers funding, team, competitors, financials. $6K-$15K/year. Good breadth but no space-specific analysis.

**Key takeaway**: General platforms provide breadth but not depth. SpaceNexus can differentiate by combining horizontal company data (funding, personnel, financials) with space-specific intelligence (satellites operated, launch manifests, spectrum licenses, government contracts, regulatory filings).

---

## 2. What Makes Company Profiles "Enterprise-Grade" vs. "Basic"

### Basic (What We Currently Have in SpaceCompany)
- Company name, description, country, HQ
- Public/private status, ticker, market cap
- Focus areas (JSON array of tags)
- Last funding round summary
- Employee count

### Enterprise-Grade (What We Need in CompanyProfile)
Our v0.9.0 CompanyProfile schema is actually well-designed for enterprise grade. Here is what the schema already supports vs. what is missing:

**Already in Schema (CompanyProfile + related models):**
1. Core identity (name, legalName, ticker, HQ, founded, employees, website, logo)
2. Government contracting IDs (CAGE code, SAM UEI, NAICS, DUNS)
3. Sector/subsector classification
4. Status tracking (active, acquired, defunct, stealth)
5. FundingRound (date, amount, series, round type, valuations, investors, source)
6. RevenueEstimate (annual/quarterly, confidence level, source attribution)
7. CompanyProduct (name, category, status, specs as JSON, images)
8. KeyPersonnel (name, title, role, LinkedIn, bio, tenure, previous companies)
9. MergerAcquisition (acquirer/target, price, deal type, status, rationale)
10. Partnership (type, description, value, dates)
11. SECFiling (type, date, EDGAR URL, accession number, extracted highlights)
12. CompetitiveMapping (company-to-company, segment, relationship type)
13. GovernmentContractAward (agency, value, ceiling, type, set-aside, NAICS, period)

**Missing from Schema (needed for true enterprise grade):**

| Field/Table | Why It Matters | Data Source |
|---|---|---|
| **Patent portfolio** | IP strength indicator; M&A due diligence | USPTO Open Data Portal API |
| **SBIR/STTR awards** | Government R&D investment signal; startup viability | SBIR.gov API |
| **FCC/ITU spectrum filings** | Satellite operator regulatory status; constellation plans | FCC IBFS, ITU database |
| **Launch manifest** | Active missions, upcoming launches, customer relationships | SpaceX manifests, FAA licenses |
| **Satellite fleet** | Currently operational assets, orbit details, mission types | UCS Satellite Database, CelesTrak |
| **Facility locations** | Manufacturing, test, launch sites, ground stations | Company websites, SEC filings |
| **Board of directors** | Governance, investor representation, industry connections | SEC DEF 14A filings, LinkedIn |
| **Investor table** | All investors across all rounds (normalized, not just strings) | Crunchbase, PitchBook |
| **Company timeline/events** | Key milestones: first launch, first customer, IPO, etc. | Press releases, SEC filings |
| **Risk score / health index** | Automated scoring a la SpaceFund Reality Rating | Composite of multiple signals |
| **Social/media presence** | Twitter/X followers, LinkedIn employees, press mention frequency | APIs, web scraping |
| **Export control classification** | ITAR/EAR status, CFIUS considerations | Company disclosures, DDTC |
| **Supply chain relationships** | Who supplies whom (components, services) | Press releases, contracts |
| **ESG/sustainability data** | Debris mitigation plans, sustainability commitments | Company reports, FCC filings |

---

## 3. The 500 Most Important Space Companies to Profile

### Segmentation Framework

The global space economy reached $613 billion in 2024 (Space Foundation). We organize by 8 segments:

### Tier 1: MVP 100 Companies (Phase 1)

These are the companies every SpaceNexus user will search for on Day 1. If they don't find them, they leave.

#### A. Launch Providers (15 companies)
1. SpaceX (USA) -- Falcon 9, Falcon Heavy, Starship
2. Rocket Lab (USA/NZ) -- Electron, Neutron [RKLB]
3. United Launch Alliance (USA) -- Atlas V, Vulcan Centaur
4. Blue Origin (USA) -- New Glenn, New Shepard
5. Arianespace/ArianeGroup (France) -- Ariane 6, Vega-C
6. Firefly Aerospace (USA) -- Alpha, MLV
7. Relativity Space (USA) -- Terran R
8. Stoke Space (USA) -- Nova (fully reusable)
9. ISRO/NSIL (India) -- PSLV, GSLV, SSLV
10. Mitsubishi Heavy Industries (Japan) -- H3
11. CASC (China) -- Long March family
12. Galactic Energy (China) -- Ceres-1, Pallas-1
13. LandSpace (China) -- Zhuque-2 (methane)
14. Isar Aerospace (Germany) -- Spectrum
15. ABL Space Systems (USA) -- RS1

#### B. Satellite Operators / Constellation Companies (20 companies)
16. Starlink/SpaceX (USA) -- 6,000+ LEO broadband
17. SES (Luxembourg) -- GEO + MEO (O3b mPOWER) [SES.PA]
18. Telesat (Canada) -- Lightspeed LEO constellation
19. Iridium Communications (USA) -- 66 LEO voice/data [IRDM]
20. Viasat (USA) -- GEO broadband, Inmarsat integration [VSAT]
21. Eutelsat/OneWeb (France) -- GEO + LEO [ETL.PA]
22. AST SpaceMobile (USA) -- Direct-to-cell LEO [ASTS]
23. Planet Labs (USA) -- 200+ EO satellites [PL]
24. BlackSky Technology (USA) -- Real-time geoint [BKSY]
25. Spire Global (USA) -- RF sensing constellation [SPIR]
26. ICEYE (Finland) -- SAR constellation
27. Capella Space (USA) -- SAR constellation (acquired by IonQ, 2025)
28. Umbra (USA) -- SAR constellation
29. HawkEye 360 (USA) -- RF geolocation
30. Maxar Technologies (USA) -- WorldView, Legion [acquired by Advent]
31. Satellogic (Uruguay/USA) -- Multispectral EO [SATL]
32. Astranis (USA) -- MicroGEO broadband
33. Amazon/Kuiper (USA) -- 3,236 LEO broadband
34. Lynk Global (USA) -- Direct-to-cell
35. Rivada Space Networks (Germany/USA) -- Secure mesh LEO

#### C. Defense Primes with Major Space Divisions (8 companies)
36. Lockheed Martin Space (USA) -- Orion, GPS III, OPIR [LMT]
37. Northrop Grumman Space (USA) -- Cygnus, GBSD, JWST [NOC]
38. Boeing Space & Launch (USA) -- Starliner, SLS, WGS [BA]
39. L3Harris Technologies (USA) -- Responsive space, sensors [LHX]
40. RTX (Raytheon) (USA) -- Missile defense, space sensors [RTX]
41. BAE Systems (UK) -- Space electronics, EW [BA.L]
42. Thales Alenia Space (France/Italy) -- Telecom/nav satellites
43. Airbus Defence & Space (EU) -- OneWeb buses, Copernicus, Ariane

#### D. Space Infrastructure & Services (15 companies)
44. Axiom Space (USA) -- Commercial space station
45. Vast (USA) -- Haven-1 space station
46. Sierra Space (USA) -- Dream Chaser, LIFE habitat
47. Starlab Space (USA/EU) -- Commercial LEO station (Voyager/Airbus)
48. Intuitive Machines (USA) -- Lunar landers, CLPS [LUNR]
49. Astrobotic (USA) -- Peregrine, Griffin lunar landers
50. ispace (Japan) -- HAKUTO-R lunar lander [9348.T]
51. Redwire Corporation (USA) -- In-space manufacturing [RDW]
52. Varda Space Industries (USA) -- In-space pharma manufacturing
53. Astroscale (Japan) -- ELSA-d debris removal
54. ClearSpace (Switzerland) -- ESA debris removal
55. Orbit Fab (USA) -- In-space refueling
56. Impulse Space (USA) -- In-space transportation
57. Turion Space (USA) -- Droid satellite servicing
58. True Anomaly (USA) -- Space domain awareness

#### E. Ground Segment & Communications (10 companies)
59. Kongsberg Satellite Services / KSAT (Norway) -- 270+ antennas, 26 locations
60. SSC (Swedish Space Corporation) -- Global ground station network
61. AWS Ground Station (USA) -- Cloud-integrated GSaaS
62. ATLAS Space Operations (USA) -- GSaaS
63. Infostellar (Japan) -- Ground station marketplace
64. Leaf Space (Italy) -- LEO ground segment
65. Mynaric (Germany) -- Optical inter-satellite links
66. Aalyria (USA) -- Network orchestration (ex-Google Loon)
67. CesiumAstro (USA) -- Phased array comms
68. Hubble Network (USA) -- Bluetooth-to-satellite IoT

#### F. Components & Manufacturing (15 companies)
69. Aerojet Rocketdyne / L3Harris Propulsion (USA) -- Rocket engines
70. Honeywell Aerospace (USA) -- Avionics, navigation [HON]
71. HEICO Corporation (USA) -- Aerospace components [HEI]
72. Ball Aerospace (USA) -- Instruments, spacecraft
73. MDA Space (Canada) -- Canadarm, radar satellites [MDA.TO]
74. Voyager Space (USA) -- Space station investments, Nanoracks
75. York Space Systems (USA) -- Smallsat buses
76. Apex (USA) -- Satellite bus manufacturing
77. Terran Orbital (USA) -- Smallsats (acquired by Lockheed Martin, 2024)
78. Exotrail (France) -- Electric propulsion
79. Morpheus Space (Germany/USA) -- Electric propulsion
80. ILC Dover (USA) -- Spacesuits, inflatable structures
81. Draper Laboratory (USA) -- GN&C, avionics
82. Hadrian (USA) -- CNC precision manufacturing for aerospace
83. K2 Space (USA) -- Large satellite buses

#### G. Analytics, Software & Data (10 companies)
84. Slingshot Aerospace (USA) -- SSA, Seradata
85. Privateer (USA) -- Space sustainability data
86. Kayhan Space (USA) -- Autonomous collision avoidance
87. Digantara (India) -- Space domain awareness
88. Vyoma (Germany) -- SSA and space traffic management
89. Scout Space (USA) -- In-orbit space surveillance
90. Orbital Sidekick (USA) -- Hyperspectral analytics
91. Albedo (USA) -- Very-low-Earth-orbit imaging
92. Pixxel (India) -- Hyperspectral Earth observation
93. Epsilon3 (USA) -- Mission operations software

#### H. Space Agencies (Government -- 7 entries)
94. NASA (USA) -- $25.4B budget
95. ESA (Europe) -- ~$6B budget
96. CNSA (China) -- ~$8.9B budget
97. JAXA (Japan) -- ~$3B budget
98. ISRO (India) -- ~$1.6B budget
99. CSA (Canada) -- ~$1B budget
100. UKSA (United Kingdom) -- ~$600M budget

### Tier 2: Expansion to 300 (Phase 2)

Add 200 more companies across these categories:

- **Additional launch startups** (25): PLD Space, Orbex, Gilmour Space, Skyroot, Agnikul, iSpace China, Galactic Energy, Latitude, Pangea Aerospace, RFA, SpinLaunch, Phantom Space, Space Perspective, Rocket Factory Augsburg, Copenhagen Suborbitals, Interstellar Technologies, Space One, Perigee Aerospace, TiSPACE, Zero 2 Infinity, Skyrora, HyImpulse, Ripple Aerospace, CAS Space, Jiuzhou Yunjian
- **More satellite operators** (30): EchoStar/Hughes, SkyBridge, Globalstar, Orbcomm, Swarm/SpaceX, Fleet Space, Kepler Communications, OQ Technology, Kineis, E-Space, Mangata Networks, Omnispace, Lockheed Martin Space (military constellations), Spacety, GeoOptics, Tomorrow.io, PlanetiQ, Synspective, Warpspace, NorthStar Earth & Space, LeoStella, MicroStar, Aistech, Open Cosmos, ISISpace, NanoAvionics, Tyvak, GomSpace, AAC Clyde Space, D-Orbit
- **Expanded defense/national security** (20): General Dynamics Space, Leidos Space, SAIC Space, Parsons, Kratos Defense, Peraton, Booz Allen Hamilton, Science Applications, Shield AI, Anduril, Palantir (space division), Raytheon Missiles & Defense, NGC Innovation Systems, Collins Aerospace (RTX), SpiderOak, Hermeus, Mach Industries, Rebellion Defense, Second Front Systems, Ditto Space
- **Ground segment expansion** (15): Comtech, Hughes Network Systems, ST Engineering iDirect, Kratos Ground, AvL Technologies, General Dynamics Mission Systems, Gilat Satellite, RBC Signals, Fossa Systems, Dhruva Space, SRT Marine, Leaf Space, Telespazio, Roscosmos ground operations, CNES Toulouse
- **Manufacturing supply chain** (25): Safran, MTU Aero Engines, Moog Inc, Curtiss-Wright, BWX Technologies, Virgin Orbit (assets), Rocket Crafters, Ursa Major, Relativity Space (3D printing), Launcher (acquired by Vast), Benchmark Space Systems, Dawn Aerospace, Phase Four, Busek, Bradford Space, GomSpace, Loft Orbital, Spire custom hardware, RUAG Space, OHB, Thales Group, Leonardo, Elbit Systems, Israel Aerospace Industries, Hanwha Systems
- **International expansion** (25): Bayanat (UAE), TASI Group (Saudi Arabia), Arabsat, Thuraya, EgyptSat, Nigerian Space Agency companies, Ethiopian Space Science and Technology Institute partners, South Africa Denel Spaceteq, South Korea KARI suppliers, KSLV Development Consortium, Japanese smallsat makers, Australian Space Agency ecosystem companies, New Zealand space companies
- **Emerging verticals** (35): In-space manufacturing (Space Forge, Varda, Outpost, Redwire), Space tourism (Space Perspective, Blue Origin, Virgin Galactic, Axiom tourist missions), Lunar economy (Intuitive Machines, Astrobotic, ispace, Lunar Outpost, OffWorld), Space mining (AstroForge, TransAstra, Asteroid Mining Corp, Interlune), Space energy (Star Catcher, Virtus Solis, Aetherflux, Reflect Orbital, Overview Energy), Space pharma (Varda, SpacePharma, Yosemite), Space sustainability (Astroscale, ClearSpace, Starfish Space, Neuraspace)
- **VC funds and investors** (25): Space Capital, SpaceFund, Seraphim Space, In-Q-Tel, Lockheed Martin Ventures, Boeing HorizonX, RTX Ventures, Airbus Ventures, Decisive Point, Type One Ventures, Promus Ventures, E2MC, Cosmica, First Spark Ventures, Space.VC, Karman+, Orbital Ventures, Starburst, Space Frontier Fund, Paladin, Tribe Capital, a16z (space portfolio), Founders Fund (space portfolio), Khosla Ventures (space), Bessemer Venture Partners (space)

### Tier 3: Full 500 (Phase 3)

Add remaining 200 companies:
- Regional players in Asia-Pacific (Japan, Korea, India, Australia, Singapore)
- European small/medium space companies
- Emerging African and Middle Eastern space companies
- Academic spinouts and deep-tech startups
- Service providers: legal firms (Hogan Lovells space), insurance (Marsh, AIG space), consulting, recruitment
- Additional supply chain: fasteners, thermal management, composites, RF components
- Defunct/acquired companies (historical context): Virgin Orbit, OneWeb (original), Terran Orbital (pre-LMT), LeoSat

---

## 4. Data Sources for Populating Company Profiles

### 4.1 Free Government APIs (Highest Priority -- Zero Cost)

| Source | API Endpoint | Data Fields | Rate Limits |
|---|---|---|---|
| **SEC EDGAR** | data.sec.gov (REST, no auth) | 10-K, 10-Q, 8-K, S-1, DEF 14A filings; XBRL financial data | <1 second delay; no key needed |
| **SBIR/STTR** | sbir.gov/api/company | Award amounts, agency, topic, abstract, company details | Currently under maintenance; downloadable XLS/JSON/XML |
| **USAspending.gov** | api.usaspending.gov | All federal contract awards, values, agencies, NAICS codes, set-asides | Free, no auth; filter by agency (NASA, USSF, NRO) |
| **SAM.gov Entity API** | open.gsa.gov/api/entity-api/ | Company registration, CAGE code, UEI, NAICS, size status | Public: 10 req/day; registered: 1,000/day |
| **FCC IBFS** | licensing.fcc.gov/icfs | Satellite license applications, spectrum assignments, orbital slots | Public access; web scraping may be needed |
| **USPTO Open Data** | data.uspto.gov | Patent filings, claims, citations, assignees, CPC classifications | Free API; also bulk downloads |
| **NASA APIs** | api.nasa.gov | Mission data, SBIR/STTR awards, TechPort R&D projects | API key (free); 1,000 req/hour |
| **FPDS** | fpds.gov | Federal procurement data; NASA/DoD contract details | Public; supplement USAspending |

### 4.2 Commercial APIs (Paid -- Phase 2+)

| Source | Cost | Data Fields | Priority |
|---|---|---|---|
| **Crunchbase Enterprise** | ~$10K-$30K/year | Funding rounds, investors, personnel, company details, news | HIGH - Best for funding data |
| **PitchBook API** | ~$20K+/year | Deep financial data, deal comps, fund info, valuations | MEDIUM - Expensive but comprehensive |
| **Clearbit/HubSpot** | ~$12K-$36K/year | 100+ firmographic fields, employee count, tech stack, social | MEDIUM - Good for enrichment |
| **LinkedIn Sales Navigator** | ~$1,200/year per seat | Employee counts, personnel changes, company updates | HIGH - Personnel tracking |
| **OpenCorporates** | Free tier + paid | Legal entity data, registration, officers, filings | LOW - Supplementary |

### 4.3 Web Scraping & Manual Sources (Ongoing)

| Source | Data | Method |
|---|---|---|
| Company websites | Product info, team pages, press releases | Scraping + manual |
| SpaceNews, Via Satellite, Payload | News, deals, personnel moves | RSS + NLP categorization |
| SEC EDGAR full-text | Revenue, customer concentration, risk factors | API + NLP extraction |
| Conference presentations | Strategic direction, product roadmaps | Manual curation |
| LinkedIn company pages | Employee growth trends, open positions | Sales Navigator API |
| Glassdoor / levels.fyi | Salary data, employee sentiment | Scraping (careful - ToS) |
| Orbital data (CelesTrak, UCS) | Active satellites, orbits, mission types | Public datasets |

### 4.4 Recommended Data Pipeline Architecture

```
Phase 1 (Manual + Free APIs):
  SEC EDGAR --> SECFiling model (auto for public companies)
  USAspending --> GovernmentContractAward model (auto for all)
  SBIR.gov --> SBIR awards (new model needed)
  Company websites --> Manual entry for core fields
  Press releases --> Manual FundingRound, M&A, Partnership entries

Phase 2 (Add Commercial APIs):
  Crunchbase API --> FundingRound enrichment (auto)
  LinkedIn --> KeyPersonnel updates (semi-auto)
  USPTO --> Patent data (auto, new model)

Phase 3 (Full Automation):
  News NLP pipeline --> Auto-detect funding, M&A, personnel changes
  SEC XBRL --> Auto-extract financial data quarterly
  CelesTrak --> Auto-update satellite fleet data
  FCC IBFS --> Auto-track spectrum filings
```

---

## 5. Current Schema Assessment and Required Changes

### 5.1 Existing Models (from prisma/schema.prisma)

The v0.9.0 CompanyProfile schema has 12 related models:

```
CompanyProfile (core)
  |-- FundingRound (date, amount, series, type, valuations, investors[])
  |-- RevenueEstimate (year, quarter, revenue, range, source, confidence)
  |-- CompanyProduct (name, category, status, specs JSON, image)
  |-- KeyPersonnel (name, title, role, LinkedIn, bio, tenure, previousCompanies[])
  |-- MergerAcquisition (acquirer/target, price, dealType, status, rationale)
  |-- Partnership (type, description, value, dates)
  |-- SECFiling (type, date, EDGAR URL, accession, highlights JSON)
  |-- CompetitiveMapping (company-company, segment, relationship)
  |-- GovernmentContractAward (agency, value, ceiling, type, NAICS, setAside)
```

**Assessment**: This is already 80% of what enterprise platforms offer. The schema was well-designed. The problem is purely data population.

### 5.2 Recommended Additional Models

```prisma
model CompanyEvent {
  id          String          @id @default(cuid())
  companyId   String
  company     CompanyProfile  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  date        DateTime
  type        String          // "founding", "first_launch", "ipo", "acquisition", "contract_win", "milestone"
  title       String
  description String?         @db.Text
  source      String?
  sourceUrl   String?
  importance  Int             @default(5) // 1-10 scale
  createdAt   DateTime        @default(now())

  @@index([companyId])
  @@index([date])
  @@index([type])
}

model PatentFiling {
  id              String          @id @default(cuid())
  companyId       String?
  company         CompanyProfile? @relation(fields: [companyId], references: [id])
  companyName     String
  patentNumber    String?         @unique
  applicationNumber String?
  title           String
  abstract        String?         @db.Text
  filingDate      DateTime?
  grantDate       DateTime?
  status          String          @default("pending") // "pending", "granted", "expired", "abandoned"
  cpcClassification String[]     // CPC codes
  inventors       String[]
  assignee        String?
  source          String?
  sourceUrl       String?
  createdAt       DateTime        @default(now())

  @@index([companyId])
  @@index([filingDate])
}

model SBIRAward {
  id          String          @id @default(cuid())
  companyId   String?
  company     CompanyProfile? @relation(fields: [companyId], references: [id])
  companyName String
  agency      String          // "NASA", "DoD", "DOE", etc.
  program     String          // "SBIR", "STTR"
  phase       String          // "I", "II", "III"
  awardAmount Float?
  awardDate   DateTime?
  topic       String?
  abstract    String?         @db.Text
  piName      String?         // Principal Investigator
  sbirId      String?         @unique
  createdAt   DateTime        @default(now())

  @@index([companyId])
  @@index([agency])
  @@index([awardDate])
}

model SatelliteAsset {
  id              String          @id @default(cuid())
  companyId       String?
  company         CompanyProfile? @relation(fields: [companyId], references: [id])
  operatorName    String
  satelliteName   String
  noradId         String?
  cosparId        String?
  launchDate      DateTime?
  orbitType       String?         // "LEO", "MEO", "GEO", "HEO", "SSO", "Lunar"
  orbitAltitudeKm Float?
  inclination     Float?
  status          String          @default("active") // "active", "decommissioned", "failed", "planned"
  missionType     String?         // "broadband", "EO", "SAR", "signals", "navigation", "weather"
  massKg          Float?
  manufacturer    String?
  launchProvider  String?
  constellation   String?
  createdAt       DateTime        @default(now())

  @@index([companyId])
  @@index([orbitType])
  @@index([status])
  @@index([missionType])
}

model SpectrumFiling {
  id              String          @id @default(cuid())
  companyId       String?
  company         CompanyProfile? @relation(fields: [companyId], references: [id])
  companyName     String
  filingType      String          // "satellite_license", "earth_station", "spectrum_allocation"
  authority       String          // "FCC", "ITU", "Ofcom", etc.
  fileNumber      String?
  callSign        String?
  frequencyBandMHz String?
  orbitalSlot     String?
  status          String          @default("pending")
  filingDate      DateTime?
  grantDate       DateTime?
  description     String?         @db.Text
  sourceUrl       String?
  createdAt       DateTime        @default(now())

  @@index([companyId])
  @@index([authority])
  @@index([filingDate])
}

model Investor {
  id          String   @id @default(cuid())
  name        String   @unique
  type        String?  // "vc", "pe", "corporate", "government", "angel", "family_office"
  website     String?
  description String?  @db.Text
  aum         Float?   // Assets under management (billions USD)
  headquarters String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  investments InvestorRound[]

  @@index([name])
  @@index([type])
}

model InvestorRound {
  id             String       @id @default(cuid())
  investorId     String
  investor       Investor     @relation(fields: [investorId], references: [id], onDelete: Cascade)
  fundingRoundId String
  isLead         Boolean      @default(false)
  createdAt      DateTime     @default(now())

  @@unique([investorId, fundingRoundId])
  @@index([investorId])
  @@index([fundingRoundId])
}

model CompanyScore {
  id          String          @id @default(cuid())
  companyId   String
  company     CompanyProfile  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  scoreType   String          // "overall", "technology", "team", "funding", "market_position", "growth"
  score       Float           // 0-100
  methodology String?
  calculatedAt DateTime       @default(now())
  validUntil  DateTime?
  breakdown   Json?           // Detailed scoring breakdown

  @@unique([companyId, scoreType])
  @@index([companyId])
  @@index([scoreType])
}

model FacilityLocation {
  id          String          @id @default(cuid())
  companyId   String
  company     CompanyProfile  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name        String
  type        String          // "headquarters", "manufacturing", "test_facility", "launch_site", "ground_station", "office"
  address     String?
  city        String?
  state       String?
  country     String
  latitude    Float?
  longitude   Float?
  employees   Int?
  description String?         @db.Text
  createdAt   DateTime        @default(now())

  @@index([companyId])
  @@index([type])
  @@index([country])
}
```

### 5.3 Dual Model Problem: SpaceCompany vs. CompanyProfile

We currently have TWO company models:
- `SpaceCompany` -- 123 companies seeded, used by `/api/companies` (market data)
- `CompanyProfile` -- 0 companies, used by `/api/companies/intelligence` (enterprise intelligence)

**Recommendation**: Migrate all SpaceCompany data INTO CompanyProfile using the `companyId` linkage field that already exists on CompanyProfile. Long-term, CompanyProfile should be the single source of truth, with SpaceCompany deprecated. The migration script should:
1. For each SpaceCompany, create/upsert a CompanyProfile with matching data
2. Set companyId on CompanyProfile to link back to SpaceCompany
3. Move market data fields (marketCap, stockPrice, valuation) into CompanyProfile or a linked MarketData model
4. Eventually sunset SpaceCompany once all consumers are migrated

---

## 6. MVP Build Plan

### Phase 1: Foundation (Weeks 1-2) -- 100 Top Companies

**Goal**: A searchable, professional company directory that immediately adds value.

**Week 1: Data Infrastructure**
- Day 1-2: Add 8 new Prisma models (CompanyEvent, PatentFiling, SBIRAward, SatelliteAsset, SpectrumFiling, Investor, CompanyScore, FacilityLocation)
- Day 2-3: Build migration script to port 100 companies from SpaceCompany into CompanyProfile with enriched data
- Day 3-4: Set up SEC EDGAR auto-ingestion pipeline (for ~30 public companies)
- Day 4-5: Set up USAspending.gov API integration (for all companies with CAGE codes)

**Week 2: Data Population**
- Day 6-7: Manually enrich 100 CompanyProfile records (description, CEO, CTO, employee count, key products, founding date, website)
- Day 7-8: Manually enter top 3-5 key personnel per company (500 KeyPersonnel records)
- Day 8-9: Enter known funding rounds for private companies (200+ FundingRound records from press releases)
- Day 9-10: Enter top products per company (300+ CompanyProduct records)
- Day 10: Launch company profile pages on frontend with search/filter

**Week 2 Deliverable**: `/companies/intelligence` returns 100 companies with:
- Full profile (identity, description, leadership, employees, HQ)
- Key personnel (3-5 per company)
- Products/services catalog
- Basic funding history (private companies)
- SEC filings auto-populated (public companies)
- Government contracts auto-populated (USAspending)

**Effort estimate**: 1 engineer full-time + 1 research analyst part-time

### Phase 2: Enrichment (Weeks 3-6) -- 300 Companies

**Goal**: Deep enough data to justify Pro/Enterprise subscription.

**Week 3-4: Expand Company Count**
- Add 200 more companies (Tier 2 from Section 3)
- Prioritize companies that SpaceNexus users are searching for (track 404s on company search)
- Begin community submission pipeline (/api/companies/request already exists)

**Week 4-5: Funding Data Deep Dive**
- Integrate Crunchbase API ($10K-$30K/year investment)
- Backfill all known funding rounds for 300 companies
- Build normalized Investor table linking investors to rounds
- Create "Investment Timeline" visualization component

**Week 5-6: News Integration**
- Link existing news feed to company profiles (auto-tag articles to companies via NLP)
- Build "Company News Feed" component on profile pages
- Implement "Company Alert" feature (email when news mentions tracked company)
- Add M&A activity tracker (manual entry + news detection)

**Week 6 Deliverable**: 300 companies with:
- Everything from Phase 1
- Complete funding history with investor details
- Investment timeline visualizations
- Linked news feed per company
- Company alerts
- M&A activity tracking
- Partnership mapping

**Effort estimate**: 1 engineer full-time + 1 data analyst full-time + Crunchbase API cost

### Phase 3: Enterprise Grade (Weeks 7-12) -- 500 Companies

**Goal**: Feature parity with Quilty Space on data; superiority on accessibility and price.

**Week 7-8: Advanced Data Sources**
- Integrate USPTO patent data pipeline
- Integrate SBIR.gov awards pipeline
- Integrate FCC IBFS satellite licensing data
- Integrate CelesTrak satellite fleet data
- Build automated daily update pipeline

**Week 9-10: Analytics & Scoring**
- Implement "SpaceNexus Score" (0-100, composite of technology readiness, funding health, team strength, market position, government revenue, patent portfolio)
- Build competitive landscape maps (interactive network graph)
- Build sector comparison dashboards (company vs. peers)
- Build "Company Health Dashboard" with trend indicators

**Week 10-12: Full 500 + Advanced Features**
- Expand to 500 companies
- Build supply chain mapping (who supplies whom)
- Build executive movement tracker (LinkedIn integration)
- Build "Due Diligence Report" export (PDF with all company data)
- Build API access for enterprise customers

**Week 12 Deliverable**: 500 companies with:
- Everything from Phase 2
- Patent portfolios
- SBIR/STTR award histories
- Satellite fleet inventories
- Spectrum/FCC filing tracking
- SpaceNexus proprietary scoring
- Competitive landscape maps
- Due diligence PDF exports
- Enterprise API access
- Automated daily data updates

**Effort estimate**: 2 engineers + 1 data analyst + commercial API costs (~$25K/year)

---

## 7. Automation vs. Manual Curation Matrix

| Data Type | Auto-Populate? | Source | Maintenance |
|---|---|---|---|
| SEC filings | YES - Fully automated | EDGAR API (free) | Daily auto-sync |
| Government contracts | YES - Fully automated | USAspending API (free) | Weekly auto-sync |
| SBIR/STTR awards | YES - Fully automated | SBIR.gov downloads (free) | Monthly auto-sync |
| Patent filings | YES - Fully automated | USPTO API (free) | Weekly auto-sync |
| Satellite fleet data | YES - Fully automated | CelesTrak/UCS (free) | Daily auto-sync |
| Funding rounds | PARTIAL - Auto via Crunchbase | Crunchbase API ($10K+/yr) | Daily auto-sync + manual verification |
| Company description | NO - Manual curation | Company websites, press | Quarterly review |
| Key personnel | PARTIAL - Semi-automated | LinkedIn, SEC filings | Monthly update |
| M&A activity | PARTIAL - News detection | News NLP + manual | Real-time news + manual verification |
| Product catalog | NO - Manual curation | Company websites | Quarterly review |
| Revenue estimates | NO - Analyst curation | SEC filings + industry reports | Quarterly |
| Competitive mapping | NO - Analyst curation | Industry knowledge | Semi-annual |
| Company scoring | YES - Algorithmic | Composite of all data | Weekly recalculation |
| News linkage | YES - NLP auto-tag | News feed articles | Real-time |

**Bottom line**: ~50% of the data can be auto-populated from free government APIs. The other 50% requires either commercial API subscriptions or manual curation. The key insight: government data (SEC, SBIR, contracts, patents, FCC) is FREE and provides enormous value that general platforms like Crunchbase cannot match for space companies.

---

## 8. Monetization Strategy

### 8.1 How Company Intelligence Drives Enterprise Sales

Company intelligence is the #1 driver of enterprise SaaS revenue in every industry vertical intelligence platform (PitchBook, CB Insights, Tracxn, Quilty Space). Here is why:

**The Daily Habit Loop:**
1. User searches for a company they are evaluating (investment, partnership, customer, competitor)
2. SpaceNexus provides a comprehensive profile with data they cannot get elsewhere (government contracts + funding + patents + satellite fleet + competitive mapping)
3. User bookmarks the profile and sets up alerts
4. User returns daily to check alerts and news
5. User's colleagues need the same data --> team subscription
6. Team needs bulk export/API access --> enterprise upgrade

**Conversion Funnel:**
```
Free tier:    View 5 company profiles/day (basic fields only)
Pro ($29/mo): Unlimited company profiles + funding data + alerts
Enterprise:   API access + bulk export + due diligence reports + custom scoring
```

### 8.2 Tiered Feature Access

| Feature | Free | Pro ($29/mo) | Enterprise (Custom) |
|---|---|---|---|
| Company search & browse | 5/day | Unlimited | Unlimited |
| Basic profile (name, HQ, sector, description) | YES | YES | YES |
| Employee count, founding date | YES | YES | YES |
| Key personnel (top 3) | YES | All | All |
| Funding history | Last round only | Full history | Full + investor details |
| Government contracts | Count only | Full list | Full + bulk export |
| SEC filings | Count only | Full list + links | Full + extracted financials |
| Patent portfolio | Count only | Full list | Full + analytics |
| SBIR/STTR awards | NO | Full list | Full + agency analytics |
| Satellite fleet | NO | Summary | Full with orbital data |
| Competitive mapping | NO | View only | Interactive + custom |
| Company alerts | NO | 5 companies | Unlimited |
| SpaceNexus Score | NO | View only | Methodology + custom weights |
| Due diligence PDF export | NO | NO | YES |
| API access | NO | NO | YES |
| Bulk data export | NO | NO | YES (CSV/JSON) |
| Custom scoring models | NO | NO | YES |

### 8.3 Revenue Projections

Based on competitor pricing and market size:

**Market sizing:**
- ~10,000 professionals work in space industry strategy, BD, investment, and policy
- ~2,000 companies actively evaluate space industry companies for M&A, investment, partnerships, or competitive intelligence
- Current competitor pricing: Quilty ($25K-$75K/yr), Novaspace ($15K-$50K/yr), PitchBook ($20K+/yr)

**SpaceNexus pricing advantage:**
SpaceNexus can undercut ALL competitors by offering:
- More accessible (web-based, no enterprise sales cycle for Pro)
- Broader data (government data integration that others lack)
- Lower entry point ($29/mo Pro vs. $25K/yr Quilty)
- Self-serve (no need to contact sales)

**Year 1 revenue targets (after Phase 3 launch):**
- 500 Pro subscribers at $29/mo = $174K ARR
- 20 Enterprise accounts at $15K/yr = $300K ARR
- Total Year 1: ~$474K ARR

**Year 2 (with 500 companies, daily updates, mature features):**
- 2,000 Pro subscribers at $39/mo = $936K ARR
- 50 Enterprise accounts at $25K/yr = $1.25M ARR
- Total Year 2: ~$2.2M ARR

### 8.4 The "Daily Habit" Strategy

The company intelligence database becomes the daily habit through these mechanisms:

1. **Alert-driven engagement**: "New $50M contract awarded to [tracked company]" email at 8am drives a login
2. **News integration**: Every news article on SpaceNexus links to company profiles; every company profile shows latest news
3. **Portfolio tracking**: Users create "watchlists" of companies they monitor (competitors, targets, portfolio companies)
4. **M&A signal detection**: "Company X acquired Company Y" generates alerts for anyone tracking either company
5. **Personnel movement**: "VP of BD at [Company A] moved to [Company B]" is actionable intelligence
6. **Funding alerts**: "Company X raised Series B at $X valuation" is critical for investors and competitors
7. **Contract wins**: "NASA awards $100M to [Company X]" drives immediate user engagement

The key insight: **Company profiles are not a feature -- they are THE PLATFORM**. Every other SpaceNexus module (news, market intel, procurement, mission planning) should link to and from company profiles. The company profile page should be the most-visited page on SpaceNexus.

---

## 9. Competitive Advantages of Our Approach

### 9.1 Unique Differentiators vs. Competitors

| Advantage | Why It Matters |
|---|---|
| **Government data integration** (SEC + USAspending + SBIR + USPTO + FCC) | No competitor combines ALL of these free data sources into one company profile. Quilty has SEC data but not SBIR. BryceTech has investment data but not patents. |
| **Self-serve pricing** ($29/mo Pro tier) | Quilty and Novaspace require enterprise sales cycles. We capture the long tail of individual analysts, consultants, journalists, and small companies. |
| **Real-time updates** (automated pipelines) | Most competitors update quarterly or annually. Our government API pipelines update daily. |
| **Full-stack integration** | Company profiles connected to news, procurement, mission planning, satellite tracking, regulatory, and market intelligence. No competitor has this breadth in one platform. |
| **Open company request system** | Community-driven company additions via /api/companies/request. Competitor databases are analyst-curated only. |
| **Modern tech stack** | Next.js + PostgreSQL vs. legacy platforms. Fast, mobile-friendly, API-first. |

### 9.2 Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Data accuracy/staleness | Automated pipelines + quarterly manual review cycle |
| Legal risk (scraping) | Rely on official APIs and public data; no scraping of Crunchbase/LinkedIn without paid access |
| Competitor response (Quilty adds free tier) | Move fast; data moat from government integrations is hard to replicate |
| Manual curation doesn't scale | Invest in NLP/AI extraction from press releases and SEC filings |
| Commercial API costs grow | Start with free government data; add commercial APIs only as revenue justifies |

---

## 10. Immediate Next Steps

### This Week (Priority Order)

1. **Add new Prisma models** to schema.prisma (CompanyEvent, PatentFiling, SBIRAward, SatelliteAsset, SpectrumFiling, Investor, InvestorRound, CompanyScore, FacilityLocation)

2. **Build migration script** to port the 100 highest-priority companies from SpaceCompany into CompanyProfile with enriched data

3. **Build SEC EDGAR ingestion** script (fetch 10-K, 10-Q, 8-K for all public space companies; store in SECFiling model; this is ~30 companies with tickers)

4. **Build USAspending.gov ingestion** script (fetch all NASA, USSF, and NRO contracts above $1M; match to companies by name/CAGE code; store in GovernmentContractAward model)

5. **Build company profile page** frontend (new page at /companies/[slug] or /company-intelligence/[id] showing full profile with tabs for Overview, Funding, Contracts, Personnel, Products, News)

### Resources Required

- 1 full-stack engineer (8 weeks dedicated)
- 1 data/research analyst (8 weeks part-time for manual curation)
- Crunchbase Enterprise API license (~$10K-$30K/year, needed by Week 4)
- Total Phase 1-3 cost estimate: ~$40K-$60K (labor + API costs)

---

## Appendix A: Existing Codebase Summary

### Current Files
- `prisma/schema.prisma` -- CompanyProfile + 9 related models (lines 2362-2589), SpaceCompany model (line 212)
- `src/lib/companies-data.ts` -- 123 companies seeded (2,517 lines)
- `src/app/api/companies/intelligence/route.ts` -- List/search CompanyProfile records
- `src/app/api/companies/intelligence/[id]/route.ts` -- Get single CompanyProfile with all relations
- `src/app/api/companies/intelligence/[id]/funding/route.ts` -- GET/POST funding rounds (admin-protected POST)
- `src/app/api/companies/intelligence/[id]/personnel/route.ts` -- GET/POST key personnel (admin-protected POST)
- `src/app/api/companies/route.ts` -- List SpaceCompany records (market data view)
- `src/app/api/companies/init/route.ts` -- Seed SpaceCompany data (cron-protected)
- `src/app/api/companies/stats/route.ts` -- Aggregate statistics
- `src/app/api/companies/request/route.ts` -- Community company requests

### API Endpoints Already Built
- `GET /api/companies/intelligence` -- Search/list companies (search, sector, status, isPublic, pagination)
- `GET /api/companies/intelligence/[id]` -- Full company profile with all relations
- `GET /api/companies/intelligence/[id]/funding` -- Funding rounds for a company
- `POST /api/companies/intelligence/[id]/funding` -- Create funding round (admin only)
- `GET /api/companies/intelligence/[id]/personnel` -- Key personnel for a company
- `POST /api/companies/intelligence/[id]/personnel` -- Create personnel record (admin only)

### Validation Schemas Already Built
- `companyProfileQuerySchema` -- Search/filter params
- `fundingRoundSchema` -- Funding round creation
- `personnelSchema` -- Personnel record creation

---

## Appendix B: Key Data Source API Details

### SEC EDGAR (Free, No Auth)
```
Base URL: https://data.sec.gov/
Submissions: /cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type=10-K&dateb=&owner=include&count=40
Company Filings: /submissions/CIK{cik_padded}.json
XBRL Data: /api/xbrl/companyfacts/CIK{cik_padded}.json
Rate Limit: 10 requests/second, User-Agent header required
```

### USAspending.gov (Free, No Auth)
```
Base URL: https://api.usaspending.gov/
Awards Search: POST /api/v2/search/spending_by_award/
Filter by agency: {"filters": {"agencies": [{"name": "National Aeronautics and Space Administration", "type": "awarding"}]}}
Filter by NAICS: 336414 (Guided Missile/Space Vehicle), 336415 (Components), 334511 (Space Instruments)
```

### SBIR.gov (Free, No Auth -- Currently Under Maintenance)
```
Base URL: https://www.sbir.gov/api/
Company Lookup: /api/company?keyword={name}
Awards: /api/awards?keyword={term}&agency={NASA}
Bulk Downloads: XLS, JSON, XML at /data-resources
```

### USPTO Patent Data (Free, API Key)
```
Base URL: https://data.uspto.gov/
Patent Search: /apis/patent-file-wrapper/search
Bulk Downloads: /bulkdata (weekly, monthly)
PatentsView: https://patentsview.org/ (pre-analyzed data with API)
CPC Classes for Space: B64G (Cosmonautics), H04B7/185 (Satellite Communication)
```

---

*End of Analysis*
*Prepared for CEO review -- February 8, 2026*
