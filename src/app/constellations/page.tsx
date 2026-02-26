'use client';

import { useState, useEffect } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import DataFreshness from '@/components/ui/DataFreshness';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { clientLogger } from '@/lib/client-logger';

// ────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────

type ConstellationStatus = 'operational' | 'deploying' | 'pre-launch' | 'development';
type ServiceType = 'Broadband' | 'Voice/IoT' | 'Earth Observation' | 'Broadband/IoT';

interface Constellation {
  id: string;
  name: string;
  operator: string;
  country: string;
  activeSatellites: number;
  authorizedSatellites: number;
  plannedGeneration: string;
  altitudeKm: string;
  inclinationDeg: string;
  frequencyBands: string;
  serviceType: ServiceType;
  status: ConstellationStatus;
  latencyEstimate: string;
  deorbitPlan: string;
  fccLicense: string;
  ituFiling: string;
  debrisCompliance: string;
  description: string;
  launchProvider: string;
  firstLaunch: string;
  estimatedCompletion: string;
}

const STATUS_CONFIG: Record<ConstellationStatus, { label: string; bg: string; text: string; border: string }> = {
  operational: { label: 'Operational', bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/40' },
  deploying: { label: 'Deploying', bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  'pre-launch': { label: 'Pre-Launch', bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/40' },
  development: { label: 'Development', bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/40' },
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  'Broadband': 'text-blue-400',
  'Voice/IoT': 'text-teal-400',
  'Earth Observation': 'text-emerald-400',
  'Broadband/IoT': 'text-indigo-400',
};

// ────────────────────────────────────────
// Fallback Data (used when API returns insufficient data)
// ────────────────────────────────────────

const FALLBACK_CONSTELLATIONS: Constellation[] = [
  {
    id: 'starlink',
    name: 'Starlink',
    operator: 'SpaceX',
    country: 'United States',
    activeSatellites: 6274,
    authorizedSatellites: 11943,
    plannedGeneration: 'Gen2 (V2 Mini deploying; full V2 planned)',
    altitudeKm: '540-570',
    inclinationDeg: '53.0 / 70.0 / 97.6',
    frequencyBands: 'Ku / Ka / E-band (V2)',
    serviceType: 'Broadband',
    status: 'deploying',
    latencyEstimate: '20-40 ms',
    deorbitPlan: 'Autonomous collision avoidance via onboard ion thrusters; satellites designed to fully demise on atmospheric re-entry within 5 years of end-of-life. Active deorbit demonstrated on failed units.',
    fccLicense: 'FCC Gen1 approved (2018, modified 2021); Gen2 partial approval April 2023 for 7,500 satellites. Full 29,988 Gen2 application pending.',
    ituFiling: 'Multiple ITU filings under SpaceX NGSO-1 through NGSO-4; coordination ongoing with GSO operators per Article 22.',
    debrisCompliance: 'Exemplary -- active deorbit within months of failure, all satellites have propulsion, autonomous collision avoidance with DoD coordination.',
    description: 'The largest satellite constellation ever deployed, Starlink provides broadband internet service to over 4 million subscribers across 100+ countries. Gen2 satellites feature direct-to-cell capabilities and inter-satellite laser links for global mesh networking.',
    launchProvider: 'SpaceX Falcon 9 / Starship (planned)',
    firstLaunch: 'May 2019',
    estimatedCompletion: '2027 (Gen2)',
  },
  {
    id: 'oneweb',
    name: 'OneWeb',
    operator: 'Eutelsat OneWeb',
    country: 'United Kingdom / France',
    activeSatellites: 634,
    authorizedSatellites: 648,
    plannedGeneration: 'Gen1 complete; Gen2 planned (~2,000 sats)',
    altitudeKm: '1,200',
    inclinationDeg: '87.9',
    frequencyBands: 'Ku / Ka',
    serviceType: 'Broadband',
    status: 'operational',
    latencyEstimate: '30-50 ms',
    deorbitPlan: 'All satellites carry fuel reserves for controlled deorbit; planned end-of-life disposal within 5 years. Near-polar orbit ensures atmospheric drag assists decay.',
    fccLicense: 'FCC market access granted June 2020; spectrum sharing conditions with Starlink in 12 GHz band.',
    ituFiling: 'ITU filings maintained via UK Ofcom and French ARCEP; coordination with GSO Ku-band operators complete.',
    debrisCompliance: 'Compliant -- all Gen1 satellites equipped with Hall-effect thrusters for deorbit; debris mitigation plan accepted by UK Space Agency and FCC.',
    description: 'A near-polar LEO broadband constellation providing global coverage including Arctic regions. Merged with Eutelsat in 2023, combining GEO and LEO capabilities. Focuses on enterprise, government, maritime, and aviation markets via partner ground terminals.',
    launchProvider: 'Arianespace Soyuz / SpaceX Falcon 9 / ISRO GSLV / NewSpace India SSLV',
    firstLaunch: 'February 2019',
    estimatedCompletion: '2023 (Gen1 complete)',
  },
  {
    id: 'kuiper',
    name: 'Project Kuiper',
    operator: 'Amazon / Kuiper Systems',
    country: 'United States',
    activeSatellites: 2,
    authorizedSatellites: 3236,
    plannedGeneration: 'Production constellation (after 2 prototypes)',
    altitudeKm: '590-630',
    inclinationDeg: '30.0 / 40.0 / 51.9',
    frequencyBands: 'Ka',
    serviceType: 'Broadband',
    status: 'deploying',
    latencyEstimate: '20-40 ms',
    deorbitPlan: 'FCC-approved plan requires deorbit within 355 days of end-of-life for lowest shell. Satellites equipped with propulsion for active disposal; designed for full demise on re-entry.',
    fccLicense: 'FCC license granted July 2020 for 3,236 satellites. Must deploy 50% by 2026 (deadline met via waiver extension to 2029).',
    ituFiling: 'ITU coordination filings via US Administration; NGSO coordination with existing Ka-band GSO fleet ongoing.',
    debrisCompliance: 'Planned -- propulsion on all production satellites; Amazon committed to 0% casualty risk on re-entry via design-for-demise architecture.',
    description: 'Amazon\'s LEO broadband mega-constellation aims to provide affordable high-speed internet globally. First two prototype satellites (KuiperSat-1 and KuiperSat-2) launched October 2023. Production launches contracted with ULA Vulcan, Arianespace Ariane 6, and Blue Origin New Glenn.',
    launchProvider: 'ULA Vulcan Centaur / Arianespace Ariane 6 / Blue Origin New Glenn',
    firstLaunch: 'October 2023 (prototypes)',
    estimatedCompletion: '2029',
  },
  {
    id: 'iridium-next',
    name: 'Iridium NEXT',
    operator: 'Iridium Communications',
    country: 'United States',
    activeSatellites: 66,
    authorizedSatellites: 75,
    plannedGeneration: 'NEXT (Gen2) -- fully deployed',
    altitudeKm: '780',
    inclinationDeg: '86.4',
    frequencyBands: 'L-band / Ka-band (feeder)',
    serviceType: 'Voice/IoT',
    status: 'operational',
    latencyEstimate: '30-50 ms',
    deorbitPlan: 'End-of-life satellites deorbited via onboard propulsion; 9 on-orbit spares maintain coverage. Original Iridium constellation satellites (Gen1) deorbited by 2019.',
    fccLicense: 'FCC license for NEXT constellation granted 2016; renewed and modified for Iridium Certus broadband service.',
    ituFiling: 'Long-standing ITU filings under Iridium LLC; L-band coordination priority established in 1990s.',
    debrisCompliance: 'Compliant -- all 75 NEXT satellites (66 active + 9 spares) equipped with hydrazine propulsion for active deorbit; Gen1 fleet fully decommissioned.',
    description: 'The only satellite constellation providing true pole-to-pole voice and data coverage. Iridium NEXT replaced the original 1990s constellation with 75 modern satellites featuring Iridium Certus broadband (up to 700 kbps), ADS-B aircraft surveillance (Aireon), AIS ship tracking, and IoT services. Critical for aviation, maritime, military, and emergency communications.',
    launchProvider: 'SpaceX Falcon 9',
    firstLaunch: 'January 2017',
    estimatedCompletion: '2019 (complete)',
  },
  {
    id: 'globalstar',
    name: 'Globalstar',
    operator: 'Globalstar Inc.',
    country: 'United States',
    activeSatellites: 48,
    authorizedSatellites: 48,
    plannedGeneration: 'Gen2 (operational); Gen3 planned',
    altitudeKm: '1,414',
    inclinationDeg: '52.0',
    frequencyBands: 'L-band / S-band / n53 (5G)',
    serviceType: 'Voice/IoT',
    status: 'operational',
    latencyEstimate: '40-60 ms',
    deorbitPlan: 'Passive deorbit via atmospheric drag; orbital altitude ensures decay within 25 years. Gen3 satellites will include active propulsion for faster deorbit.',
    fccLicense: 'FCC license for 48-satellite constellation; additional spectrum authorization for Band n53 (partnered with Apple for satellite SOS). Spectrum lease to Apple approved 2023.',
    ituFiling: 'ITU filings via US Administration under Globalstar system; S-band and L-band allocations coordinated.',
    debrisCompliance: 'Compliant -- current fleet at altitude ensuring natural decay; no debris-generating events recorded. Gen3 will meet updated FCC 5-year rule.',
    description: 'Globalstar provides satellite voice, data, and IoT services with coverage focused on mid-latitudes. Partnered with Apple for Emergency SOS via Satellite on iPhone (using Band n53 / 2.4 GHz). Planning next-generation constellation to expand capacity and support direct-to-device services.',
    launchProvider: 'Arianespace Soyuz (Gen2) / TBD (Gen3)',
    firstLaunch: '2010 (Gen2)',
    estimatedCompletion: '2012 (Gen2 complete)',
  },
  {
    id: 'o3b-mpower',
    name: 'O3b mPOWER',
    operator: 'SES S.A.',
    country: 'Luxembourg',
    activeSatellites: 11,
    authorizedSatellites: 13,
    plannedGeneration: 'mPOWER (Gen2) -- deploying final units',
    altitudeKm: '8,062',
    inclinationDeg: '0 (equatorial)',
    frequencyBands: 'Ka',
    serviceType: 'Broadband',
    status: 'deploying',
    latencyEstimate: '120-150 ms',
    deorbitPlan: 'MEO graveyard orbit disposal; satellites equipped with sufficient fuel reserves to boost to higher disposal orbit at end-of-life. Compliant with IADC 25-year guidelines.',
    fccLicense: 'FCC market access granted for O3b mPOWER; Ka-band spectrum sharing agreements with GSO operators in place.',
    ituFiling: 'ITU filings under SES/O3b Networks; MEO Ka-band coordination completed with GEO fleet operators.',
    debrisCompliance: 'Compliant -- graveyard orbit disposal plan; Boeing-built satellites include full propulsion system for controlled end-of-life maneuvers.',
    description: 'SES O3b mPOWER is a second-generation MEO constellation providing high-throughput, low-latency broadband services. Each satellite generates over 5,000 fully shapeable beams delivering terabits of throughput. Targets enterprise, government, cruise, and telecom backhaul markets with fiber-like performance in underserved regions.',
    launchProvider: 'SpaceX Falcon 9',
    firstLaunch: 'December 2022',
    estimatedCompletion: '2025',
  },
  {
    id: 'telesat-lightspeed',
    name: 'Telesat Lightspeed',
    operator: 'Telesat',
    country: 'Canada',
    activeSatellites: 0,
    authorizedSatellites: 298,
    plannedGeneration: 'Lightspeed LEO (initial deployment)',
    altitudeKm: '1,015-1,325',
    inclinationDeg: '98.98 / 50.88 / 46.0',
    frequencyBands: 'Ka',
    serviceType: 'Broadband',
    status: 'pre-launch',
    latencyEstimate: '30-50 ms',
    deorbitPlan: 'Active deorbit via electric propulsion within 5 years of end-of-life; design-for-demise satellite architecture to minimize ground casualty risk on re-entry.',
    fccLicense: 'FCC market access application pending; Canadian ISED license granted. Priority filing rights established via Canadian Administration.',
    ituFiling: 'ITU filings under Canadian Administration; coordination with existing Ka-band NGSO and GSO systems required under Article 22.',
    debrisCompliance: 'Planned -- Thales Alenia Space-built satellites will feature electric propulsion, autonomous collision avoidance, and design-for-demise compliance.',
    description: 'Telesat Lightspeed is a planned LEO constellation designed for enterprise-grade connectivity. Features advanced laser inter-satellite links and a software-defined networking architecture enabling dynamic capacity allocation. Targeting government, maritime, aviation, telecom backhaul, and enterprise markets. MDA selected as prime contractor (2024 restructured contract).',
    launchProvider: 'TBD (contract restructured)',
    firstLaunch: '2026 (planned)',
    estimatedCompletion: '2028',
  },
  {
    id: 'sda-transport',
    name: 'SDA Transport Layer',
    operator: 'US Space Development Agency (SDA)',
    country: 'United States',
    activeSatellites: 28,
    authorizedSatellites: 300,
    plannedGeneration: 'Tranche 0 deployed; Tranche 1 deploying; Tranche 2 planned',
    altitudeKm: '950',
    inclinationDeg: '0 / 90 (various planes)',
    frequencyBands: 'Ka / Optical (laser crosslinks)',
    serviceType: 'Broadband/IoT',
    status: 'deploying',
    latencyEstimate: '< 20 ms',
    deorbitPlan: 'Government-mandated debris mitigation; active deorbit at end-of-life using onboard propulsion. Compliant with DoD and NASA Orbital Debris Mitigation Standard Practices.',
    fccLicense: 'Military spectrum authorizations via NTIA (not FCC); allocated DoD Ka-band and optical crosslink frequencies.',
    ituFiling: 'Filings managed by US Government via NTIA/DoD; coordination with commercial NGSO constellations handled via Space-Track sharing.',
    debrisCompliance: 'Compliant -- all SDA satellites meet ODMSP (Orbital Debris Mitigation Standard Practices); active deorbit required by contract.',
    description: 'The SDA Transport Layer is a military mesh network providing low-latency, jam-resistant data connectivity for the US Department of Defense. Features optical inter-satellite links enabling beyond-line-of-sight targeting and missile tracking data relay. Tranche 0 (28 satellites) operational; Tranche 1 adds ~150 satellites. Integrates with the Tracking Layer for missile defense.',
    launchProvider: 'SpaceX Falcon 9 / ULA Vulcan',
    firstLaunch: 'April 2023 (Tranche 0)',
    estimatedCompletion: '2028 (Tranche 2)',
  },
  {
    id: 'gps',
    name: 'GPS (Navstar)',
    operator: 'US Space Force',
    country: 'United States',
    activeSatellites: 31,
    authorizedSatellites: 33,
    plannedGeneration: 'GPS III / IIIF (Block III deploying)',
    altitudeKm: '20,180',
    inclinationDeg: '55.0',
    frequencyBands: 'L1 / L2 / L5',
    serviceType: 'Voice/IoT',
    status: 'operational',
    latencyEstimate: 'N/A (one-way broadcast)',
    deorbitPlan: 'MEO disposal orbit; satellites boosted ~500 km above operational altitude at end-of-life. Average operational life 12-15 years per satellite.',
    fccLicense: 'Government-operated; spectrum managed by NTIA. L-band protected allocations under international agreements.',
    ituFiling: 'ITU allocations under Radio Navigation Satellite Service (RNSS); protected spectrum under WRC decisions.',
    debrisCompliance: 'Compliant -- disposal orbit maneuvers performed at end-of-life; long operational history with zero debris-generating events.',
    description: 'The Global Positioning System provides worldwide navigation, positioning, and timing services. GPS III satellites feature improved accuracy (L5 civil signal), enhanced anti-jamming capabilities (M-code military signal), and longer operational lifespans. Backbone of global navigation and critical infrastructure timing. 31 operational satellites in 6 orbital planes.',
    launchProvider: 'SpaceX Falcon 9 / ULA Delta IV / ULA Atlas V',
    firstLaunch: '1978 (Block I); 2018 (GPS III)',
    estimatedCompletion: 'Ongoing replacement cycle',
  },
  {
    id: 'galileo',
    name: 'Galileo',
    operator: 'European Union Agency for the Space Programme (EUSPA)',
    country: 'European Union',
    activeSatellites: 28,
    authorizedSatellites: 30,
    plannedGeneration: 'FOC (Full Operational Capability); Gen2 planned',
    altitudeKm: '23,222',
    inclinationDeg: '56.0',
    frequencyBands: 'E1 / E5a / E5b / E6',
    serviceType: 'Voice/IoT',
    status: 'operational',
    latencyEstimate: 'N/A (one-way broadcast)',
    deorbitPlan: 'MEO graveyard orbit disposal; satellites raised ~300 km above operational altitude at end-of-life. Gen2 will incorporate improved disposal strategies.',
    fccLicense: 'Not applicable (EU system); spectrum coordination with US via bilateral agreements for GPS/Galileo interoperability.',
    ituFiling: 'ITU filings under European administrations; RNSS allocations coordinated with GPS, GLONASS, and BeiDou under multilateral agreements.',
    debrisCompliance: 'Compliant -- ESA debris mitigation guidelines followed; graveyard orbit disposal demonstrated on decommissioned test satellites.',
    description: 'The European Union\'s global navigation satellite system provides independent positioning, navigation, and timing services. Features the High Accuracy Service (HAS) delivering 20 cm precision, Search and Rescue (SAR) return-link capability, and the Commercial Authentication Service. Second-generation Galileo satellites will add inter-satellite links and enhanced signals.',
    launchProvider: 'Arianespace Ariane 5 / Ariane 6 / Soyuz / SpaceX Falcon 9 (Gen2)',
    firstLaunch: '2011 (IOV); 2014 (FOC)',
    estimatedCompletion: '2024 (FOC complete); 2030 (Gen2)',
  },
  {
    id: 'beidou',
    name: 'BeiDou-3 (BDS-3)',
    operator: 'China Satellite Navigation Office (CSNO)',
    country: 'China',
    activeSatellites: 35,
    authorizedSatellites: 35,
    plannedGeneration: 'BDS-3 (fully deployed)',
    altitudeKm: '21,528 (MEO) / 35,786 (GEO/IGSO)',
    inclinationDeg: '55.0 (MEO) / 0-55 (GEO/IGSO)',
    frequencyBands: 'B1I / B1C / B2a / B2b / B3I',
    serviceType: 'Voice/IoT',
    status: 'operational',
    latencyEstimate: 'N/A (one-way broadcast)',
    deorbitPlan: 'End-of-life disposal orbits for MEO satellites; GEO satellites moved to graveyard orbit above GEO belt. Compliant with IADC guidelines.',
    fccLicense: 'Not applicable (Chinese system); no FCC authorization required. Spectrum coordinated via ITU.',
    ituFiling: 'ITU filings under Chinese Administration; RNSS allocations in B-band frequencies coordinated with other GNSS providers.',
    debrisCompliance: 'Compliant -- follows IADC Space Debris Mitigation Guidelines; disposal procedures implemented on retired BDS-2 satellites.',
    description: 'China\'s global navigation satellite system achieved full operational capability in June 2020 with 35 satellites in a hybrid MEO/GEO/IGSO architecture. Provides open, authorized, and precise positioning services globally, with enhanced regional services in Asia-Pacific via GEO and IGSO satellites. Unique short message communication capability enables two-way messaging.',
    launchProvider: 'CASC Long March 3B / Long March 3C',
    firstLaunch: '2017 (BDS-3 MEO); 2020 (final GEO)',
    estimatedCompletion: '2020 (BDS-3 complete)',
  },
  {
    id: 'glonass',
    name: 'GLONASS',
    operator: 'Roscosmos / ISS Reshetnev',
    country: 'Russia',
    activeSatellites: 24,
    authorizedSatellites: 27,
    plannedGeneration: 'GLONASS-M (operational); GLONASS-K2 deploying',
    altitudeKm: '19,130',
    inclinationDeg: '64.8',
    frequencyBands: 'L1 / L2 / L3',
    serviceType: 'Voice/IoT',
    status: 'operational',
    latencyEstimate: 'N/A (one-way broadcast)',
    deorbitPlan: 'MEO disposal orbit; satellites boosted above operational altitude at end-of-life. Older GLONASS-M satellites have limited remaining fuel for disposal maneuvers.',
    fccLicense: 'Not applicable (Russian system); US government restricts GLONASS ground stations on US soil without agreements.',
    ituFiling: 'ITU filings under Russian Administration; RNSS allocations in GLONASS L-band frequencies.',
    debrisCompliance: 'Compliant -- follows IADC guidelines for MEO constellation disposal; some legacy GLONASS-M satellites may have limited deorbit capability.',
    description: 'Russia\'s global navigation satellite system operates 24 satellites across 3 orbital planes. The higher inclination (64.8 degrees) provides better coverage at northern latitudes compared to GPS. GLONASS-K2 modernization adds CDMA signals for improved interoperability with GPS and Galileo. System accuracy approximately 2.8 meters with SDCM augmentation.',
    launchProvider: 'Roscosmos Soyuz-2.1b / Proton-M',
    firstLaunch: '1982 (original); 2003 (GLONASS-M); 2022 (GLONASS-K2)',
    estimatedCompletion: '2030 (K2 modernization)',
  },
  {
    id: 'planet-dove',
    name: 'Planet (Dove / SuperDove / SkySat)',
    operator: 'Planet Labs PBC',
    country: 'United States',
    activeSatellites: 200,
    authorizedSatellites: 250,
    plannedGeneration: 'SuperDove (main fleet); SkySat (high-res sub-constellation)',
    altitudeKm: '475-500 (Dove) / 450 (SkySat)',
    inclinationDeg: '97.4 (SSO)',
    frequencyBands: 'X-band (downlink) / UHF (uplink)',
    serviceType: 'Earth Observation',
    status: 'operational',
    latencyEstimate: 'N/A (imaging)',
    deorbitPlan: 'Low-altitude orbit ensures natural atmospheric decay within 5 years. No active propulsion on Dove satellites; SkySat has propulsion for orbit maintenance and deorbit.',
    fccLicense: 'FCC experimental and operational licenses for X-band downlink and UHF uplink; NOAA remote sensing license granted.',
    ituFiling: 'ITU filings for X-band Earth Exploration Satellite Service (EESS) downlink frequencies.',
    debrisCompliance: 'Compliant -- low altitude ensures rapid orbital decay; no debris-generating events. CubeSat form factor minimizes collision risk. Passively compliant with 5-year FCC rule.',
    description: 'Planet operates the largest Earth observation constellation, imaging the entire landmass of Earth daily at 3-5 meter resolution (SuperDove) and up to 50 cm resolution (SkySat). Serves agriculture, forestry, disaster response, defense, and climate monitoring markets. Data accessed via Planet Platform API with AI-ready analytics.',
    launchProvider: 'SpaceX / ISRO PSLV / Rocket Lab Electron / Various rideshare',
    firstLaunch: '2013 (Dove-1)',
    estimatedCompletion: 'Ongoing replenishment',
  },
  {
    id: 'spire-global',
    name: 'Spire Global',
    operator: 'Spire Global Inc.',
    country: 'United States',
    activeSatellites: 110,
    authorizedSatellites: 150,
    plannedGeneration: 'LEMUR-2 (continuous replenishment)',
    altitudeKm: '400-600',
    inclinationDeg: '37-97 (various)',
    frequencyBands: 'UHF / S-band / GNSS-RO',
    serviceType: 'Voice/IoT',
    status: 'operational',
    latencyEstimate: 'N/A (data collection)',
    deorbitPlan: 'Very low orbits (400-600 km) ensure natural decay within 2-5 years. No active deorbit needed; satellites designed as expendable CubeSats.',
    fccLicense: 'FCC license for AIS data collection and GNSS radio occultation; experimental licenses for various payloads.',
    ituFiling: 'ITU filings for MetSat (meteorological) and EESS (Earth exploration) service allocations.',
    debrisCompliance: 'Compliant -- low-altitude CubeSats with short orbital lifetime; no propulsion systems simplifies debris assessment. Fully compliant with FCC 5-year deorbit rule.',
    description: 'Spire operates a multi-purpose CubeSat constellation collecting global weather data (GNSS radio occultation), maritime vessel tracking (AIS), aircraft surveillance (ADS-B), and RF analytics. Provides Space-as-a-Service platform allowing customers to deploy custom payloads. Serves NOAA, ESA, and commercial weather forecasting companies.',
    launchProvider: 'SpaceX Rideshare / Rocket Lab Electron / ISRO PSLV',
    firstLaunch: '2015',
    estimatedCompletion: 'Ongoing replenishment',
  },
  {
    id: 'blacksky',
    name: 'BlackSky',
    operator: 'BlackSky Technology',
    country: 'United States',
    activeSatellites: 18,
    authorizedSatellites: 30,
    plannedGeneration: 'Gen2 (current); Gen3 planned',
    altitudeKm: '430-450',
    inclinationDeg: '97.5 (SSO) / 45.0',
    frequencyBands: 'X-band',
    serviceType: 'Earth Observation',
    status: 'deploying',
    latencyEstimate: 'N/A (imaging, < 90 min revisit)',
    deorbitPlan: 'Low-altitude orbit ensures natural atmospheric decay within 3-5 years. Gen3 satellites will include propulsion for orbit maintenance and active deorbit.',
    fccLicense: 'FCC license for X-band downlink; NOAA remote sensing license granted for commercial Earth observation.',
    ituFiling: 'ITU filings for EESS X-band downlink frequencies via US Administration.',
    debrisCompliance: 'Compliant -- very low orbit ensures rapid natural decay; no debris-generating events. Passively meets FCC 5-year rule due to low altitude.',
    description: 'BlackSky provides high-revisit, high-resolution (1 meter) satellite imagery with AI-powered analytics. Spectre AI platform fuses satellite imagery with global data sources for real-time intelligence. Focus on defense, intelligence, and commercial geospatial analytics. Dawn-to-dusk and mid-inclination orbits enable frequent revisit over key areas of interest.',
    launchProvider: 'Rocket Lab Electron / SpaceX Rideshare',
    firstLaunch: '2018 (Gen1)',
    estimatedCompletion: '2026 (Gen2 full deployment)',
  },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function getDeploymentPercent(active: number, authorized: number): number {
  if (authorized === 0) return 0;
  return Math.min((active / authorized) * 100, 100);
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function HeroStats({ constellations }: { constellations: Constellation[] }) {
  const totalActive = constellations.reduce((sum, c) => sum + c.activeSatellites, 0);
  const totalAuthorized = constellations.reduce((sum, c) => sum + c.authorizedSatellites, 0);
  const totalConstellations = constellations.length;
  // Rough global coverage estimate based on operational + deploying constellations
  const operationalOrDeploying = constellations.filter(
    c => c.status === 'operational' || c.status === 'deploying'
  );
  const coverageEstimate = Math.min(
    Math.round(
      operationalOrDeploying.reduce((sum, c) => {
        const pct = getDeploymentPercent(c.activeSatellites, c.authorizedSatellites);
        return sum + pct * 0.15; // weighted contribution per constellation
      }, 0)
    ),
    98
  );

  const stats = [
    { label: 'Constellations Tracked', value: totalConstellations.toString(), color: 'text-white' },
    { label: 'Active Satellites', value: formatNumber(totalActive), color: 'text-cyan-400' },
    { label: 'Total Authorized', value: formatNumber(totalAuthorized), color: 'text-amber-400' },
    { label: 'Est. Global Coverage', value: `${coverageEstimate}%`, color: 'text-green-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="card-elevated p-5 text-center">
          <div className={`text-3xl font-bold font-display ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConstellationCard({ constellation }: { constellation: Constellation }) {
  const statusStyle = STATUS_CONFIG[constellation.status];
  const deployPct = getDeploymentPercent(
    constellation.activeSatellites,
    constellation.authorizedSatellites
  );
  const serviceColor = SERVICE_COLORS[constellation.serviceType] || 'text-white';

  return (
    <div className="card p-6 hover:border-nebula-500/30 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-white truncate">{constellation.name}</h3>
            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-star-300 text-sm">{constellation.operator}</p>
          <p className="text-star-300/60 text-xs mt-0.5">{constellation.country}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className={`text-2xl font-bold font-display ${serviceColor}`}>
            {formatNumber(constellation.activeSatellites)}
          </div>
          <div className="text-star-300 text-xs">
            / {formatNumber(constellation.authorizedSatellites)} authorized
          </div>
        </div>
      </div>

      {/* Deployment Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-star-300 text-xs font-medium">Deployment Progress</span>
          <span className="text-white text-xs font-bold">{deployPct.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              deployPct >= 90
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : deployPct >= 50
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                : deployPct >= 10
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-purple-500 to-purple-400'
            }`}
            style={{ width: `${Math.max(deployPct, 1)}%` }}
          />
        </div>
        <div className="text-star-300/50 text-xs mt-1">{constellation.plannedGeneration}</div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-star-300/60 text-xs block">Altitude</span>
          <span className="text-white font-medium">{constellation.altitudeKm} km</span>
        </div>
        <div>
          <span className="text-star-300/60 text-xs block">Inclination</span>
          <span className="text-white font-medium">{constellation.inclinationDeg}&deg;</span>
        </div>
        <div>
          <span className="text-star-300/60 text-xs block">Bands</span>
          <span className="text-white font-medium">{constellation.frequencyBands}</span>
        </div>
        <div>
          <span className="text-star-300/60 text-xs block">Service</span>
          <span className={`font-medium ${serviceColor}`}>{constellation.serviceType}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-star-300/70 text-xs mt-4 leading-relaxed line-clamp-2">
        {constellation.description}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 text-xs text-star-300/50">
        <span>Latency: <span className="text-star-300">{constellation.latencyEstimate}</span></span>
        <span className="text-white/10">|</span>
        <span>First launch: <span className="text-star-300">{constellation.firstLaunch}</span></span>
      </div>
    </div>
  );
}

function ComparisonTable({ constellations }: { constellations: Constellation[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <h2 className="text-lg font-bold text-white">Constellation Comparison</h2>
        <p className="text-star-300 text-sm mt-1">Side-by-side analysis of all tracked constellations</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Constellation</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Operator</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Active</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Authorized</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Deployed %</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Altitude</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Bands</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Service</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Latency</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {constellations.map((c) => {
              const statusStyle = STATUS_CONFIG[c.status];
              const deployPct = getDeploymentPercent(c.activeSatellites, c.authorizedSatellites);
              return (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{c.operator}</td>
                  <td className="px-4 py-3 text-right text-white font-mono">{formatNumber(c.activeSatellites)}</td>
                  <td className="px-4 py-3 text-right text-star-300 font-mono">{formatNumber(c.authorizedSatellites)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            deployPct >= 90 ? 'bg-green-400' : deployPct >= 50 ? 'bg-cyan-400' : deployPct >= 10 ? 'bg-amber-400' : 'bg-purple-400'
                          }`}
                          style={{ width: `${Math.max(deployPct, 2)}%` }}
                        />
                      </div>
                      <span className="text-white font-mono text-xs w-12 text-right">{deployPct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{c.altitudeKm} km</td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{c.frequencyBands}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={SERVICE_COLORS[c.serviceType] || 'text-white'}>{c.serviceType}</span>
                  </td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{c.latencyEstimate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                      {statusStyle.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Summary */}
      <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center gap-6 text-xs text-star-300/60">
        <span>Total active: <span className="text-white font-bold">{formatNumber(constellations.reduce((s, c) => s + c.activeSatellites, 0))}</span></span>
        <span>Total authorized: <span className="text-white font-bold">{formatNumber(constellations.reduce((s, c) => s + c.authorizedSatellites, 0))}</span></span>
        <span>Operational: <span className="text-green-400 font-bold">{constellations.filter(c => c.status === 'operational').length}</span></span>
        <span>Deploying: <span className="text-cyan-400 font-bold">{constellations.filter(c => c.status === 'deploying').length}</span></span>
        <span>Development/Pre-Launch: <span className="text-amber-400 font-bold">{constellations.filter(c => c.status === 'development' || c.status === 'pre-launch').length}</span></span>
      </div>
    </div>
  );
}

function ConstellationDetail({ constellation }: { constellation: Constellation }) {
  const statusStyle = STATUS_CONFIG[constellation.status];
  const deployPct = getDeploymentPercent(constellation.activeSatellites, constellation.authorizedSatellites);

  return (
    <div className="card p-6" id={constellation.id}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">{constellation.name}</h3>
            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-star-300 text-sm mt-1">{constellation.operator} &mdash; {constellation.country}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-display text-cyan-400">{formatNumber(constellation.activeSatellites)}</div>
          <div className="text-star-300 text-xs">of {formatNumber(constellation.authorizedSatellites)} authorized</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-star-300 text-sm leading-relaxed mb-6">{constellation.description}</p>

      {/* Deployment bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-star-300 text-sm font-medium">Deployment Progress</span>
          <span className="text-white font-bold">{deployPct.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              deployPct >= 90
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : deployPct >= 50
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                : deployPct >= 10
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-purple-500 to-purple-400'
            }`}
            style={{ width: `${Math.max(deployPct, 1)}%` }}
          />
        </div>
      </div>

      {/* Technical Specs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Altitude</span>
          <span className="text-white font-semibold">{constellation.altitudeKm} km</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Inclination</span>
          <span className="text-white font-semibold">{constellation.inclinationDeg}&deg;</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Frequency Bands</span>
          <span className="text-white font-semibold">{constellation.frequencyBands}</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Service Type</span>
          <span className={`font-semibold ${SERVICE_COLORS[constellation.serviceType] || 'text-white'}`}>
            {constellation.serviceType}
          </span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Latency Estimate</span>
          <span className="text-white font-semibold">{constellation.latencyEstimate}</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Launch Provider</span>
          <span className="text-white font-semibold text-xs">{constellation.launchProvider}</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">First Launch</span>
          <span className="text-white font-semibold">{constellation.firstLaunch}</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Est. Completion</span>
          <span className="text-white font-semibold">{constellation.estimatedCompletion}</span>
        </div>
      </div>

      {/* Deorbit Plan */}
      <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
        <h4 className="text-sm font-semibold text-white mb-2">Deorbit / Debris Mitigation Plan</h4>
        <p className="text-star-300 text-xs leading-relaxed">{constellation.deorbitPlan}</p>
      </div>
    </div>
  );
}

function RegulatoryPanel({ constellations }: { constellations: Constellation[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-white mb-2">Regulatory & Compliance Overview</h2>
      <p className="text-star-300 text-sm mb-6">
        FCC/ITU licensing status and debris mitigation compliance across tracked constellations
      </p>

      <div className="space-y-4">
        {constellations.map((c) => {
          const statusStyle = STATUS_CONFIG[c.status];
          const complianceColor = c.debrisCompliance.toLowerCase().startsWith('compliant')
            ? 'text-green-400'
            : c.debrisCompliance.toLowerCase().startsWith('exemplary')
            ? 'text-green-400'
            : c.debrisCompliance.toLowerCase().startsWith('planned')
            ? 'text-amber-400'
            : 'text-yellow-400';
          const complianceBg = c.debrisCompliance.toLowerCase().startsWith('compliant')
            ? 'bg-green-900/20 border-green-500/20'
            : c.debrisCompliance.toLowerCase().startsWith('exemplary')
            ? 'bg-green-900/20 border-green-500/20'
            : c.debrisCompliance.toLowerCase().startsWith('planned')
            ? 'bg-amber-900/20 border-amber-500/20'
            : 'bg-yellow-900/20 border-yellow-500/20';
          const complianceLabel = c.debrisCompliance.toLowerCase().startsWith('compliant')
            ? 'Compliant'
            : c.debrisCompliance.toLowerCase().startsWith('exemplary')
            ? 'Exemplary'
            : c.debrisCompliance.toLowerCase().startsWith('planned')
            ? 'Planned'
            : 'Under Review';

          return (
            <div key={c.id} className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-white">{c.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                    {statusStyle.label}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${complianceBg} ${complianceColor}`}>
                  {complianceLabel}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-star-300/60 block mb-1 font-medium uppercase tracking-wider">FCC License</span>
                  <span className="text-star-300 leading-relaxed">{c.fccLicense}</span>
                </div>
                <div>
                  <span className="text-star-300/60 block mb-1 font-medium uppercase tracking-wider">ITU Filing</span>
                  <span className="text-star-300 leading-relaxed">{c.ituFiling}</span>
                </div>
                <div>
                  <span className="text-star-300/60 block mb-1 font-medium uppercase tracking-wider">Debris Compliance</span>
                  <span className={`leading-relaxed ${complianceColor}`}>{c.debrisCompliance}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regulatory Notes */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-lg border-dashed">
        <h4 className="text-sm font-semibold text-white mb-2">Regulatory Notes</h4>
        <ul className="text-star-300 text-xs space-y-2 leading-relaxed">
          <li>
            <strong className="text-white">FCC 25-Year Rule (Updated 2022):</strong> The FCC adopted a new 5-year post-mission disposal rule for LEO satellites (effective Sep 2024), replacing the prior 25-year guideline. US-licensed operators must now deorbit within 5 years of mission end.
          </li>
          <li>
            <strong className="text-white">ITU Coordination:</strong> Non-geostationary (NGSO) constellations must coordinate with existing GEO and NGSO systems per ITU Radio Regulations Article 22. WRC-23 updated rules for NGSO milestone requirements.
          </li>
          <li>
            <strong className="text-white">IADC Guidelines:</strong> The Inter-Agency Space Debris Coordination Committee guidelines recommend end-of-life passivation, collision avoidance maneuvers, and post-mission disposal for all operators.
          </li>
          <li>
            <strong className="text-white">Space Sustainability Rating (SSR):</strong> The World Economic Forum&apos;s SSR initiative scores operators on debris mitigation, data sharing, collision avoidance, and detectability.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

type TabId = 'overview' | 'comparison' | 'details' | 'regulatory';

export default function ConstellationTrackerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [statusFilter, setStatusFilter] = useState<ConstellationStatus | ''>('');
  const [constellations, setConstellations] = useState<Constellation[]>(FALLBACK_CONSTELLATIONS);
  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/content/constellations?section=constellations');
        if (!res.ok) throw new Error('Failed to fetch constellations');
        const json = await res.json();
        const apiData: Constellation[] = json.data || [];
        // Only replace fallback if API returned meaningful data
        if (apiData.length >= 3) {
          setConstellations(apiData);
        }
        setRefreshedAt(json.meta?.lastRefreshed || null);
      } catch (err) {
        clientLogger.error('Error fetching constellation data', { error: err instanceof Error ? err.message : String(err) });
        // Keep fallback data on error -- do not clear to empty
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredConstellations = statusFilter
    ? constellations.filter((c) => c.status === statusFilter)
    : constellations;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'comparison', label: 'Comparison Table' },
    { id: 'details', label: 'Detailed Profiles' },
    { id: 'regulatory', label: 'Regulatory & Compliance' },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Constellation Tracker"
          subtitle="Track major satellite constellations -- deployments, orbital parameters, coverage, and regulatory compliance"
          icon="✨"
          accentColor="purple"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {/* Hero Stats */}
        <ScrollReveal>
          <HeroStats constellations={constellations} />
        </ScrollReveal>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-white/5 text-star-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ──────────────── OVERVIEW TAB ──────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Filters */}
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-star-300 text-sm mr-2">Filter by status:</span>
                <button
                  onClick={() => setStatusFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === ''
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                  }`}
                >
                  All ({constellations.length})
                </button>
                {(Object.entries(STATUS_CONFIG) as [ConstellationStatus, typeof STATUS_CONFIG[ConstellationStatus]][]).map(([key, config]) => {
                  const count = constellations.filter((c) => c.status === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === key
                          ? `${config.bg} ${config.text} border ${config.border}`
                          : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {config.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Constellation Cards Grid */}
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredConstellations.map((constellation) => (
                <StaggerItem key={constellation.id}>
                  <ConstellationCard constellation={constellation} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Market Overview */}
            <ScrollReveal>
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Deployment Race -- Satellites by Operator</h3>
              <div className="space-y-3">
                {[...constellations]
                  .sort((a, b) => b.activeSatellites - a.activeSatellites)
                  .map((c) => {
                    const maxActive = Math.max(...constellations.map(x => x.activeSatellites));
                    const barWidth = maxActive > 0 ? (c.activeSatellites / maxActive) * 100 : 0;
                    const statusStyle = STATUS_CONFIG[c.status];
                    return (
                      <div key={c.id} className="flex items-center gap-4">
                        <div className="w-32 flex-shrink-0 text-sm text-white font-medium truncate">{c.name}</div>
                        <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded transition-all"
                            style={{ width: `${Math.max(barWidth, 0.5)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">
                            {formatNumber(c.activeSatellites)}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} flex-shrink-0`}>
                          {statusStyle.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
            </ScrollReveal>

            {/* Orbit Distribution */}
            <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-4">By Orbital Regime</h3>
                <div className="space-y-3">
                  {[
                    { label: 'LEO (< 2,000 km)', constellations: constellations.filter(c => {
                      const alt = parseInt(c.altitudeKm.replace(/,/g, '').split('-')[0]);
                      return alt < 2000;
                    }), color: 'from-blue-500 to-blue-400' },
                    { label: 'MEO (2,000 - 35,786 km)', constellations: constellations.filter(c => {
                      const alt = parseInt(c.altitudeKm.replace(/,/g, '').split('-')[0]);
                      return alt >= 2000 && alt < 35786;
                    }), color: 'from-purple-500 to-purple-400' },
                  ].map((regime) => (
                    <div key={regime.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-star-300 text-sm">{regime.label}</span>
                        <span className="text-white text-sm font-medium">{regime.constellations.length} constellations</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {regime.constellations.map(c => (
                          <span key={c.id} className="px-2 py-0.5 rounded text-xs bg-white/5 text-star-300">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-4">By Service Type</h3>
                <div className="space-y-3">
                  {['Broadband', 'Voice/IoT'].map((svc) => {
                    const matching = constellations.filter(c => c.serviceType === svc);
                    const totalActive = matching.reduce((s, c) => s + c.activeSatellites, 0);
                    return (
                      <div key={svc}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${SERVICE_COLORS[svc as ServiceType] || 'text-white'}`}>{svc}</span>
                          <span className="text-white text-sm font-medium">
                            {matching.length} constellations &middot; {formatNumber(totalActive)} active
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {matching.map(c => (
                            <span key={c.id} className="px-2 py-0.5 rounded text-xs bg-white/5 text-star-300">
                              {c.name} ({formatNumber(c.activeSatellites)})
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* Data Sources */}
            <div className="card p-5 border-dashed">
              <h3 className="text-sm font-semibold text-white mb-2">Data Sources</h3>
              <p className="text-star-300/60 text-xs leading-relaxed">
                Satellite counts derived from UCS Satellite Database, Space-Track.org TLE catalog, operator press releases, and FCC/ITU public filings.
                Coverage estimates are approximate and based on deployed satellite count relative to constellation design parameters.
                Data is representative and may not reflect real-time operational status.
              </p>
            </div>
          </div>
        )}

        {/* ──────────────── COMPARISON TABLE TAB ──────────────── */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <ComparisonTable constellations={constellations} />
          </div>
        )}

        {/* ──────────────── DETAILED PROFILES TAB ──────────────── */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {constellations.map((constellation) => (
              <ConstellationDetail key={constellation.id} constellation={constellation} />
            ))}
          </div>
        )}

        {/* ──────────────── REGULATORY TAB ──────────────── */}
        {activeTab === 'regulatory' && (
          <div className="space-y-6">
            <RegulatoryPanel constellations={constellations} />
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>
    </div>
  );
}
