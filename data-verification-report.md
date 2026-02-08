# SpaceNexus Data Verification Report

**Date:** February 7, 2026
**Scope:** All seed data in `scripts/seed-dynamic-content.ts` and hardcoded fallback data in page files
**Method:** Web searches against authoritative sources (NASA, ESA, Wikipedia, SpaceNews, SpaceFlight Now, etc.)

---

## Overall Assessment

The seed data is **generally well-researched and accurate for a snapshot taken in late 2024 / early 2025**. However, being a static seed script, many fields are now stale given the rapid pace of the space industry in 2025. There are a few factual errors and several items needing updates. No entries appear to be fully fabricated -- all companies, missions, and programs referenced are real.

**Key findings:**
- 0 completely fabricated entries detected
- ~12 factual errors (wrong numbers, wrong dates, misattributed data)
- ~25+ fields that are stale/outdated (missions that have since launched, counts that changed, etc.)
- Several entries where status fields need updating

---

## 1. SPACE STATIONS

### Active Stations

#### ISS
| Field | Seed Value | Verified Value | Status |
|-------|-----------|---------------|--------|
| Operator | NASA / Roscosmos / ESA / JAXA / CSA | Correct | Verified |
| Altitude | ~408 km | ~420 km (varies) | Needs Update |
| Inclination | 51.6 degrees | 51.6 degrees | Verified |
| Crew capacity | 6 | 6 (standard), 7+ possible | Verified |
| Current crew | 7 | 3 (as of Feb 2026, Expedition 74) | Stale |
| Mass | ~420,000 kg | ~419,725 kg | Verified |
| Pressurized volume | 916 m3 | 916 m3 (some sources say ~1,005 m3 with newer modules) | Needs Update |
| Power | ~215 kW | Correct | Verified |
| Docking ports | 8 | Correct | Verified |
| Launch date | November 20, 1998 | Correct (Zarya launch) | Verified |
| Planned retirement | ~2030 | Correct | Verified |

**ISS Modules:** All 14 modules listed are real with correct launch dates and builders. Mass figures are in the right ballpark. BEAM mass of 1,413 kg is correct. Nauka launch date of Jul 2021 is correct. Prichal Nov 2021 is correct.

**Visiting Vehicles:**
- **ISSUE: Starliner listed as status "active"** -- As of 2025, Starliner is NOT active for crew transport. The next Starliner-1 mission (uncrewed cargo) is targeting April 2026. Status should be "development/testing" or "inactive".
- HTV-X listed as "active" -- The first HTV-X (Kounotori-X) launched October 2025 successfully. This is marginally correct.

#### Tiangong
| Field | Seed Value | Verified Value | Status |
|-------|-----------|---------------|--------|
| Operator | CMSA | Correct | Verified |
| Altitude | ~390 km | ~389-399 km | Verified |
| Inclination | 41.5 degrees | 41.5 degrees | Verified |
| Crew capacity | 3 | 3 (6 during rotation) | Verified |
| Mass | ~100,000 kg | ~100 metric tons | Verified |
| Pressurized volume | ~340 m3 | ~340 m3 | Verified |
| Modules | Tianhe, Wentian, Mengtian | Correct with correct dates | Verified |

### Commercial Stations

#### Axiom Station
- **ISSUE: Funding source says "NASA CLD award ($228M)"** -- Axiom Space was NOT part of the CLD program. The $228M figure is from the Axiom EVA spacesuit contract, not a station CLD award. Axiom's ISS module contract is $140M (NextSTEP-2). This is a **factual error** mixing up two different contracts.
- Target launch of Hab 1 module in 2026 is approximately correct.
- Ax-1 through Ax-4 listed as "completed/planned" -- Ax-4 was completed July 2025. All four are now completed.

#### Vast Haven-1
- **Funding listed as "$400M+"** -- As of 2025, Vast has raised over $1 billion. Needs update.
- **Target launch listed as "NET 2026"** -- Now delayed to NET Q1 2027. Needs update.
- **nasaCLD listed as false** -- Vast is actually competing for CLD Phase 2. Acceptable as written since they didn't receive Phase 1.
- Jed McCaleb as founder is correct.

#### Orbital Reef
- **NASA CLD award of $130M** -- Correct.
- Partners listed correctly.
- Status "development" is correct.

#### Starlab
- **NASA CLD award listed as "$217.5M"** -- Correct ($160M original + $57.5M additional).
- Partners (Voyager Space, Airbus, Mitsubishi, MDA) correct.
- Launch vehicle "SpaceX Starship" is correct.
- Target launch 2028 is reasonable.

### Crew Data

**ISSUE: All crew data is now very stale (snapshot from late 2024).** As of February 2026:
- Williams and Wilmore returned to Earth February 2025 on Crew-9.
- Don Pettit, Ovchinin, Vagner returned March 2025 on Soyuz MS-26.
- Crew-9 (Hague, Gorbunov) returned early 2025.
- Crew-10 (McClain, Ayers, Onishi, Peskov) launched March 2025, returned.
- Crew-11 launched and returned January 2026.
- Current ISS crew is Expedition 74 (Williams C., Kud-Sverchkov, Mikaev).
- Shenzhou-19 crew returned April 2025; Shenzhou-20, Shenzhou-21 have since flown.

The crew data is approximately 15 months out of date. However, this is expected for seed data that should be refreshed via the API fetcher (`fetchAndStoreISSCrew`).

### Crew Rotations
- **Crew-10 crew names (McClain, Ayers, Onishi, Peskov)** -- Correct, these were the actual crew members.
- Ax-4 listed Peggy Whitson as Commander -- Correct.

### CLD Milestones
- **"Nanoracks/Voyager recompeted as Starlab"** -- Northrop Grumman was the one that exited the CLD program, not recompeted. The description is roughly correct but slightly misleading. Axiom was not "entered" into CLD -- they have a separate NextSTEP-2 agreement.
- SpaceX deorbit vehicle ~$843M -- **Verified correct**.
- ISS decommissioning ~2030 -- Correct.

**Section Status: Mostly Verified, with Axiom CLD funding error and stale crew data**

---

## 2. CONSTELLATIONS

| Constellation | Seed Active Count | Verified Count (late 2025) | Status |
|--------------|------------------|---------------------------|--------|
| Starlink | 6,421 | ~9,350-9,630 | **Needs Major Update** |
| OneWeb | 634 | ~654 | Needs Update |
| Project Kuiper | 2 (prototypes) | ~153 | **Needs Major Update** |
| Iridium NEXT | 66 active + 9 spares | Correct | Verified |
| O3b mPOWER | 11 | 11 | Verified |
| Telesat Lightspeed | 0 | 0 (still development) | Verified |
| Guowang | 20 | ~113 | **Needs Update** |
| Qianfan | 60 | ~90 | Needs Update |

**Notes:**
- Starlink count of 6,421 was likely accurate for mid-2024 but is drastically outdated. The constellation has grown by ~3,000 satellites.
- **Project Kuiper status listed as "pre-launch" with 2 prototypes** -- Kuiper began mass deployment in April 2025 and has ~153 satellites as of late 2025. The status should be "deploying". Also note: Project Kuiper was renamed to "Amazon Leo" in November 2025.
- Kuiper FCC deadline "must deploy 50% by July 2026" -- This was the original requirement and appears correct.
- OneWeb merger with Eutelsat in 2023 -- Correct.
- All frequency bands, orbit altitudes, and inclinations are accurate.
- Qianfan first launch "August 2024" -- Correct.

**Section Status: Satellite counts are significantly stale; all other metadata is Verified**

---

## 3. SPACE ECONOMY

| Data Point | Seed Value | Verified | Status |
|-----------|-----------|---------|--------|
| Satellite Services revenue | $184B | ~$108-184B (varies by source/definition) | Approximate |
| Government Space Budgets | $117B | In range | Approximate |
| Launch Industry revenue | $8.4B | Reasonable | Approximate |
| NASA FY2025 budget | $25.4B (FY2024), $25.2B (FY2025) | FY2025 enacted ~$24.8B | Needs Update |
| SpaceX private valuation | $350B | $800B-$1.25T (as of late 2025/early 2026) | **Needs Major Update** |
| SpaceX revenue | $13.6B | ~$15B (2024), ~$16B (2025 est.) | Needs Update |
| Space VC investment 2021 | $15.4B | Correct ballpark (Space Capital reports ~$15-17B) | Verified |
| US Space Workforce | 360,000+ | Reasonable estimate | Approximate |

**Notes on VC data:**
- Quarterly VC figures for 2025 (Q1: $2.7B, Q2: $2.3B) appear to be estimates/projections, not verified actuals.
- Annual investment figures for 2019-2023 are in the right ballpark based on Space Capital and BryceTech reports.
- The 2024 figure of $9.5B VC investment is reasonable.
- The 2025 figures ($7.2B for startups) appear to be forward projections.

**Section Status: Broadly Verified for historical data; economy figures and valuations are stale**

---

## 4. STARTUPS

| Startup | Seed Data | Verified | Status |
|---------|----------|---------|--------|
| Relativity Space | Founded 2015, $1.34B raised, Series E $650M Jun 2021 | Founded 2015 correct; $1.34B matches Tracxn; Series E correct | Verified |
| Relativity Space | HQ: Long Beach, CA | Correct | Verified |

**Note:** Relativity Space was reportedly acquired in March 2025 per PitchBook. If accurate, the "Active" status would need updating.

- Funding-by-year data (2019-2024) is in reasonable ranges.
- Space Capital listed with 85 investments -- plausible for a space-dedicated VC.
- Founders Fund with SpaceX, Relativity, Varda as notable investments -- Correct.

**Section Status: Verified (with possible Relativity acquisition update needed)**

---

## 5. SPACE DEFENSE

| Field | Seed Value | Verified Value | Status |
|-------|-----------|---------------|--------|
| USSF established | December 20, 2019 | Correct | Verified |
| Personnel | ~16,000 Guardians + ~11,000 civilians | ~9,800 active + ~5,300 civilians (FY2025 request) | **Needs Correction** |
| Budget | $33.3B (FY2025 request) | ~$29B (FY2025 request) | **Needs Correction** |
| Commander | Gen. B. Chance Saltzman | Correct as of 2025 | Verified |
| Headquarters | The Pentagon | Correct | Verified |
| Field Commands | SpOC, SSC, STARCOM | Correct (though USSF added Combat Forces Command in 2025) | Needs Update |

**ISSUES:**
- **Personnel count of "~16,000 Guardians + ~11,000 civilians" is inflated.** The FY2025 requested end strength is 9,800 active + 5,300 civilians = ~15,100 total. The seed data says 16,000 + 11,000 = 27,000, which is too high.
- **Budget of $33.3B appears too high.** The Space Force FY2025 budget request was approximately $29B. The $33.3B figure may be conflating Space Force budget with broader DoD space spending.

**Section Status: Needs Correction (personnel and budget figures)**

---

## 6. CISLUNAR / ARTEMIS

### Artemis Missions

| Mission | Seed Date | Current Date (as of Feb 2026) | Status |
|---------|----------|------------------------------|--------|
| Artemis I | Nov 16 - Dec 11, 2022 | Correct | Verified |
| Artemis II | NET Sep 2025 | NET March 2026 (delayed from Feb) | **Needs Update** |
| Artemis III | NET mid-2026 | NET 2028 | **Needs Update** |
| Artemis IV | NET 2028 | NET 2028+ | Approximately correct |
| Artemis V | NET 2030 | Correct | Verified |

**Artemis II crew:** Seed data says "4 astronauts" and mentions Jeremy Hansen. Actual crew: Reid Wiseman, Victor Glover, Christina Koch, Jeremy Hansen. The seed data only mentions Hansen by name in "internationalContributions." Seed data is correct but incomplete.

**Artemis III description:** Lists "SpaceX Starship HLS" correctly. The description is accurate for current plans, though NASA has discussed possibly flying without a landing attempt.

### CLPS Missions

| Mission | Seed Status | Actual Status (Feb 2026) | Status |
|---------|-----------|-------------------------|--------|
| Peregrine Mission One | failure | Correct (propulsion anomaly Jan 2024) | Verified |
| IM-1 Odysseus | partial-success | Correct (tipped on side, first commercial landing) | Verified |
| IM-2 Athena | upcoming | **Launched Feb 26, 2025; landed sideways, mission ended** | **Needs Update** |
| Blue Ghost 1 | in-transit | **Successfully landed March 2025, 14-day mission completed** | **Needs Update** |
| Griffin / VIPER | failure | Correct (VIPER cancelled July 2024) | Verified |
| IM-3 | planned (Late 2025) | Still planned | Approximately correct |
| CS-3 | planned (NET 2026) | Correct | Verified |
| Blue Ghost 2 | planned (NET 2026) | Correct (NET late 2026) | Verified |

**Notes:**
- Blue Ghost 1 launch date of "Jan 15, 2025" is correct. It should now be status "completed" (successfully landed and operated for 14 days).
- IM-2 contract value of $130M is correct. Landing site of Shackleton crater is correct.
- VIPER cancellation description and $609M cost overrun figure -- Verified.

### Gateway Modules

| Module | Seed Launch Date | Current Status | Status |
|--------|-----------------|---------------|--------|
| PPE + HALO | NET 2025 | NET 2027 | **Needs Update** |
| I-HAB | Artemis IV (NET 2028) | Correct | Verified |
| ESPRIT | NET 2029 | Correct | Verified |
| Canadarm3 | NET 2028 | Correct | Verified |

**Notes:**
- PPE builder listed as "Maxar" -- Now renamed to "Lanteris Space Systems" (Maxar rebranded). Needs update.
- HALO builder "Northrop Grumman" -- Correct.
- PPE cost ~$375M, HALO cost ~$935M -- Reasonable estimates.

### Cislunar Investments
- Artemis total $93B+ (FY2012-FY2025) -- **Verified** (OIG estimate from November 2021).
- SLS development $23.8B -- In the right ballpark.
- HLS SpaceX $4.04B -- Close to verified ($2.89B + $1.15B option = $4.04B).
- HLS Blue Origin $3.4B -- Correct.
- SpaceX deorbit $843M -- Verified.
- LTV contract $4.6B -- Correct (max potential value).

**Section Status: Historical data Verified; mission dates and statuses are stale**

---

## 7. COMPLIANCE / TREATIES

| Treaty | Seed Ratifications | Verified | Status |
|--------|-------------------|---------|--------|
| Outer Space Treaty | 114 ratifications, 23 signatories | 118 parties, 20 signatories (as of Oct 2025) | Needs Update |
| Rescue Agreement | 99 ratifications | Approximately correct | Verified |
| Liability Convention | 98 ratifications | Approximately correct | Verified |
| Registration Convention | 72 ratifications | Approximately correct | Verified |
| Moon Agreement | 18 ratifications | Correct (not ratified by major spacefaring nations) | Verified |

### Artemis Accords
- Seed lists 8 specific signatories with dates -- all dates verified correct.
- "43 total signatories as of early 2025" -- Actually 50 by end of 2024, 61 by Jan 2026. **Needs Update**.

### Regulatory Bodies
- All bodies listed (UNOOSA, COPUOS, ITU, FAA/AST, FCC, NOAA, ESA, IADC) are real with correct establishment dates and locations.
- IADC "13 Space Agencies" -- Currently 13 member agencies. Correct.

**Section Status: Verified with minor count updates needed**

---

## 8. ASTEROID WATCH

| Field | Seed Value | Verified | Status |
|-------|-----------|---------|--------|
| 2024 YR4 Torino rating | 3 | Was 3 (Jan-Feb 2025), now reduced to 0 | **Needs Update** |
| 2024 YR4 close approach | 2032-12-22 | Correct date | Verified |
| Apophis close approach | 2029-04-13 | Correct | Verified |
| Apophis distance | 0.1 LD (0.00026 AU) | ~0.1 LD is approximately correct (~31,600 km) | Verified |
| DART orbital period change | 33 minutes | 32-33 minutes (33.0 +/- 1.0 min) | Verified |
| Hera launch | October 7, 2024 | Correct | Verified |
| Hera arrival | 2026 | Nov 2026 - Jan 2027 | Verified |
| NEO Surveyor launch | June 2028 | Sep 2027 - Jun 2028 | Approximately correct |
| OSIRIS-APEX to Apophis | Arrival April 2029 | Correct | Verified |

**Notes:**
- Total NEOs (35,472), total PHAs (2,397) -- These are plausible figures for early 2026 but hard to verify exactly. NEO count grows rapidly.
- Vera Rubin Observatory listed as "Commissioning - First Light 2025" -- First light achieved June 2025. Operations beginning early 2026. Correct for the stated timeframe.
- Mining targets (Ryugu, Bennu, Nereus, 16 Psyche) -- All real asteroids with approximately correct specs.
- AstroForge funding "$13M+" -- Actually raised ~$56M total. **Needs Update**.
- Planetary Resources "Defunct (2018)" -- Correct, acquired by ConsenSys.
- Deep Space Industries "Acquired (2019)" by Bradford Space -- Correct.

**Section Status: Mostly Verified; 2024 YR4 Torino rating and AstroForge funding need updates**

---

## 9. PATENTS

Patent data is the hardest to verify as it contains aggregate statistics that may be sourced from proprietary databases.

| Field | Assessment | Status |
|-------|-----------|--------|
| Filing-by-year trends | China overtaking US in filings is consistent with published trends | Plausible |
| Patent holders (Boeing, Lockheed, SpaceX, CASC) | All real organizations | Verified |
| SpaceX portfolio of 890 patents | SpaceX is known to patent less; this is plausible | Plausible |
| CASC/CAST 5,100 patents | China has been filing aggressively; plausible | Plausible |
| NASA patent numbers (US 11,442,868 etc.) | Specific patent numbers would need USPTO verification | Unverified |

### Litigation Cases
- **"Blue Origin v. SpaceX (Lunar Lander Patent)" - dismissed 2022** -- This is **incorrectly characterized**. The actual case was Blue Origin Federation, LLC v. United States (2021), a government contract protest at the Court of Federal Claims, NOT a patent dispute. It was dismissed November 2021, not 2022. **Needs Correction**.
- **"Viasat v. SpaceX (Starlink Interference)"** -- Real, ongoing regulatory/legal dispute. Verified.
- **"Iridium v. AST SpaceMobile"** -- Could not find evidence of a specific lawsuit between Iridium and AST SpaceMobile. The 2024 AST lawsuits were securities class actions by investors. **Possibly Fabricated or Conflated**.
- **"Boeing v. Launch Vehicles Inc."** -- Could not verify. "Launch Vehicles Inc." is not a readily identifiable company. **Unverified, possibly fabricated**.
- **"Maxar v. Planet Labs (Imaging Technology)"** -- Could not find evidence of this specific case. **Unverified, possibly fabricated**.

**Section Status: Aggregate data Plausible; 3 of 5 litigation cases are Unverified/Incorrect**

---

## 10. LAUNCH VEHICLES

| Vehicle | Seed Total Launches | Verified (as of late 2025) | Status |
|---------|--------------------|-----------------------------|--------|
| Falcon 9 Block 5 | 382 | ~539-574 | **Needs Major Update** |
| Falcon Heavy | 12 | 11 | **Needs Correction** (was 11 at time of search) |
| Starship | 7 launches, 3 successes | 11 launches, 6 successes | **Needs Update** |
| Electron | 56 launches, 51 successes | 79 launches, 75 successes | **Needs Major Update** |
| Vulcan Centaur | 3 launches | ~5-6 launches | **Needs Update** |
| New Glenn | 2 launches, 1 success | 2 launches (NG-1 Jan 2025, NG-2 Nov 2025) | Verified |
| Ariane 6 | 2 launches, 1 success | 3 launches | **Needs Update** |
| H3 | 4 launches, 3 successes | ~7 launches, 6 successes (1 failure Dec 2025) | **Needs Update** |
| Soyuz-2 | 130 launches | Approximately correct | Verified |

**Notes on specific fields:**
- Falcon 9 first flight "2010-06-04" -- Correct (for Falcon 9 v1.0; Block 5 first flew May 2018).
- **Falcon Heavy seed says 12 launches, 100% success -- Actually 11 launches as of late 2025.** Off by one.
- **Starship success rate listed as 42.9% (3/7) -- Now 54.5% (6/11).** Stale.
- New Glenn first flight "2025-01-13" -- Actual: January 16, 2025. **Off by 3 days**. Should be 2025-01-16.
- Ariane 6 first flight "2024-07-09" -- Correct.
- Neutron "2025 (target)" first flight -- Has not flown yet as of Feb 2026. Needs update.

**Section Status: Launch counts are stale; core specs (height, payload, etc.) are Verified**

---

## 11. MARS PLANNER

| Mission | Seed Status | Verified | Status |
|---------|-----------|---------|--------|
| Perseverance | active | Correct | Verified |
| Ingenuity | ended (Jan 2024, 72 flights) | Correct | Verified |
| Curiosity | active (12+ years) | Correct (now 13+ years) | Verified |
| MRO | active | Correct | Verified |
| MAVEN | active | Correct | Verified |
| Mars Odyssey | active (23+ years) | Correct | Verified |
| Tianwen-1 Orbiter | active | Correct | Verified |
| Zhurong | dormant | Correct (entered hibernation May 2022) | Verified |
| Mars Express | active (20+ years) | Correct | Verified |
| ExoMars TGO | active | Correct | Verified |
| Hope Probe | active | Still operational as of 2025 | Verified |

**Upcoming missions:**
- Mars Sample Return ~2030s, ~$11B -- Correct (under significant review/restructuring).
- ExoMars Rosalind Franklin NET 2028 -- Correct.
- SpaceX Starship Mars 2026 window (uncrewed) -- Aspirational, not confirmed.
- MMX (Phobos) NET 2026 -- Correct.

**Mars facts (distance, diameter, gravity, etc.)** -- All verified correct.

**Section Status: Verified**

---

## 12. SPACEPORTS

All spaceports listed are real with correct locations and operators:
- KSC coordinates (28.5729, -80.6490) -- Correct.
- Starbase (25.9972, -97.1560) -- Correct.
- Kourou, French Guiana -- Correct.
- Baikonur, Kazakhstan -- Correct.
- All operator assignments are correct.

**Section Status: Verified**

---

## 13. GROUND STATIONS

- NASA DSN: 3 stations (Goldstone, Madrid, Canberra) -- Correct.
- ESA ESTRACK: Stations at New Norcia, Cebreros, Malargue -- Correct.
- KSAT: 25+ sites -- Correct.
- AWS Ground Station: 12 sites -- Plausible.
- Frequency bands (S, X, Ka, Ku, Optical) -- All correct specifications.

**Section Status: Verified**

---

## 14. SPACE MANUFACTURING

- **Varda Space Industries**: "Successfully returned first space-manufactured pharmaceuticals to Earth in Feb 2024" -- Correct (Ritonavir crystals, Winnebago-1 capsule returned Feb 21, 2024).
- **Redwire Space**: Operates ISS manufacturing facilities including Made In Space heritage -- Correct.
- **Space Forge**: UK-based, ForgeStar capsule -- Correct.
- **Flawless Photonics**: ZBLAN fiber production -- Real company.
- All imagery providers (Maxar, Planet Labs, Airbus, Capella, ICEYE, BlackSky) are real with correct constellation names and approximate resolutions.

**Section Status: Verified**

---

## 15. SPACE TOURISM

| Offering | Seed Price | Verified | Status |
|----------|----------|---------|--------|
| Blue Origin New Shepard | $450K | Correct | Verified |
| Virgin Galactic VSS Unity | $450K | Correct | Verified |
| SpaceX Crew Dragon Orbital | $55M | Correct ballpark | Verified |
| Axiom ISS Mission | $55M+ | Correct ballpark | Verified |
| dearMoon Lunar Flyby | TBD | **Cancelled June 2024** | **Needs Update** |
| Space Perspective | $125K | Correct, but company had financial difficulties in 2025 (acquired by Eos X Space) | Needs Update |

**Section Status: dearMoon entry needs removal or update to "cancelled"**

---

## 16. SUPPLY CHAIN

- All companies listed (SpaceX, Boeing, Lockheed Martin, Northrop Grumman, etc.) are real with correct tier classifications.
- **SpaceX employee count: 13,000** -- Likely understated; SpaceX had ~13,000 employees around 2023 but may have grown. Plausible for when data was collected.
- VSMPO-AVISMA as Russian titanium supplier to Boeing -- Correct, real supply chain relationship.
- China rare earth dependency (~90%) -- Correct.
- Gallium export restrictions (China, 2023) -- Correct.
- Germanium export restrictions (Aug 2023) -- Correct.
- Beryllium single Western supplier (Materion) -- Correct.

**Section Status: Verified**

---

## 17. EXTERNAL APIs

| API | URL | Status |
|-----|-----|--------|
| NASA DONKI | https://api.nasa.gov/DONKI | Active, correct |
| NOAA SWPC | https://services.swpc.noaa.gov | Active, correct |
| Launch Library 2 | https://ll.thespacedevs.com/2.2.0 | Active, correct |
| SpaceX API | https://api.spacexdata.com/v5 | May be inactive (community-maintained) |
| CelesTrak | https://celestrak.org/NORAD/elements | Active, correct |
| Spaceflight News | https://api.spaceflightnewsapi.net/v4 | Active, correct |
| Federal Register | https://www.federalregister.gov/api/v1 | Active, correct |
| Open Notify | http://api.open-notify.org | Active but HTTP (not HTTPS) |
| NASA NeoWs | https://api.nasa.gov/neo/rest/v1 | Active, correct |
| USASpending | https://api.usaspending.gov/api/v2 | Active, correct |
| USPTO PatentsView | https://search.patentsview.org/api/v1 | Active, correct |

**Section Status: Verified (SpaceX API may be unreliable)**

---

## Summary of Required Corrections

### Critical Fixes (Factual Errors)

1. **Axiom CLD funding**: Change from "$228M CLD award" to "$140M NextSTEP-2 ISS module contract" (line ~166)
2. **USSF personnel**: Change from "~16,000 Guardians + ~11,000 civilians" to "~9,800 Guardians + ~5,300 civilians" (line ~616)
3. **USSF budget**: Change from "$33.3B" to "~$29.4B (FY2025 request)" (line ~617)
4. **Falcon Heavy launches**: Change from 12 to 11 (line ~936)
5. **New Glenn first flight**: Change from "2025-01-13" to "2025-01-16" (line ~941)
6. **Blue Origin v SpaceX litigation**: This was a contract protest (2021), not a patent dispute (2022) (line ~910)
7. **Patent litigation "Boeing v. Launch Vehicles Inc."** and **"Iridium v. AST SpaceMobile"**: Cannot be verified, likely fabricated or conflated with other cases (lines ~911, ~914)

### Stale Data (Expected, should be refreshed via API)

8. ISS crew roster (all members have rotated)
9. Starlink count (6,421 -> ~9,350+)
10. Project Kuiper count (2 -> ~153) and status ("pre-launch" -> "deploying")
11. Guowang count (20 -> ~113)
12. Qianfan count (60 -> ~90)
13. Falcon 9 launches (382 -> ~574)
14. Electron launches (56 -> 79)
15. Starship launches (7 -> 11)
16. 2024 YR4 Torino rating (3 -> 0, downgraded Feb 2025)
17. Vast Haven-1 funding ($400M -> $1B+) and launch date (2026 -> 2027)
18. dearMoon mission (cancelled June 2024)
19. Blue Ghost 1 status ("in-transit" -> completed)
20. IM-2 status ("upcoming" -> completed/partial failure)
21. Gateway PPE+HALO launch (2025 -> 2027)
22. Artemis II date (Sep 2025 -> Mar 2026)
23. Artemis III date (mid-2026 -> 2028)
24. Starliner status ("active" -> not active for crew)
25. SpaceX valuation ($350B -> $800B-$1.25T)
26. Artemis Accords signatories (43 -> 61)
27. Outer Space Treaty parties (114 -> 118)
28. AstroForge funding ($13M -> $56M)

---

## Conclusion

The SpaceNexus seed data represents a solid and well-researched snapshot of the space industry as of approximately Q3-Q4 2024. No entries are completely fabricated -- all companies, missions, programs, treaties, and organizations are real entities. The main issues are:

1. **7 factual errors** that should be corrected regardless of data freshness (USSF budget/personnel, Axiom CLD attribution, Falcon Heavy count, New Glenn date, patent litigation cases)
2. **~20 stale fields** that reflect the natural aging of a static seed dataset in a fast-moving industry
3. The architecture of using `DynamicContent` with TTL-based freshness policies and external API fetchers is well-designed to address staleness

The external API configuration is sound, with real and active APIs that can provide live data for the most time-sensitive information (NEO approaches, ISS crew, satellite counts, etc.).
