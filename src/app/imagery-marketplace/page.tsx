'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'providers' | 'compare' | 'usecases' | 'market';
type SensorType = 'Optical' | 'SAR' | 'Multispectral' | 'Hyperspectral' | 'Thermal';
type PricingTier = '$' | '$$' | '$$$';
type ProviderStatus = 'Operational' | 'Deploying' | 'Development';

interface ImageryProvider {
  id: string;
  name: string;
  headquarters: string;
  sensorType: SensorType;
  constellationSize: string;
  resolutionM: string;
  spectralBands: string;
  revisitHours: string;
  swathWidthKm: string;
  orbit: string;
  launchYear: number;
  status: ProviderStatus;
  pricingTier: PricingTier;
  archiveAvailable: boolean;
  taskingAvailable: boolean;
  coveragePercent: number;
  description: string;
  highlights: string[];
}

interface UseCase {
  id: string;
  name: string;
  icon: string;
  description: string;
  topProviders: string[];
  requirements: string[];
  keyMetrics: string[];
}

interface MarketTrend {
  title: string;
  description: string;
  color: string;
  borderColor: string;
  stats: string[];
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const PROVIDERS: ImageryProvider[] = [
  {
    id: 'maxar',
    name: 'Maxar Technologies',
    headquarters: 'Westminster, CO, USA',
    sensorType: 'Optical',
    constellationSize: '6 satellites (WorldView Legion + heritage)',
    resolutionM: '0.30',
    spectralBands: '8 multispectral + panchromatic',
    revisitHours: '4-6 (with Legion)',
    swathWidthKm: '14.5',
    orbit: 'SSO, ~450-770 km',
    launchYear: 2007,
    status: 'Operational',
    pricingTier: '$$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 95,
    description: 'Industry leader in very high resolution commercial satellite imagery. WorldView Legion constellation (launched 2023-2024) provides 30cm native resolution with rapid revisit. Heritage fleet includes WorldView-2, WorldView-3 (31cm, SWIR capable), and GeoEye-1. SecureWatch platform serves defense and intelligence communities.',
    highlights: [
      '30cm native resolution -- highest commercially available',
      'WorldView-3 offers 8 SWIR bands for material identification',
      '20+ year image archive (back to IKONOS era)',
      'Primary provider for US National Reconnaissance programs',
    ],
  },
  {
    id: 'planet',
    name: 'Planet Labs PBC',
    headquarters: 'San Francisco, CA, USA',
    sensorType: 'Multispectral',
    constellationSize: '200+ (PlanetScope) + 21 (SkySat) + 2 (Tanager)',
    resolutionM: '3.0-5.0 (PlanetScope), 0.5 (SkySat)',
    spectralBands: '8 bands (SuperDove), 400+ (Tanager hyperspectral)',
    revisitHours: '24 (daily global)',
    swathWidthKm: '24.6 (PlanetScope), 23x5 (SkySat)',
    orbit: 'SSO, ~475-500 km',
    launchYear: 2013,
    status: 'Operational',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 100,
    description: 'Operates the largest commercial Earth observation constellation. PlanetScope SuperDove fleet images the entire landmass daily at 3m resolution. SkySat provides sub-meter tasking capability. Tanager (launched 2024) is a hyperspectral mission built with NASA/JPL for methane and CO2 detection. Planetary Variables product delivers analysis-ready data feeds.',
    highlights: [
      'Only provider imaging entire Earth landmass every single day',
      'Tanager hyperspectral for greenhouse gas detection (400+ bands)',
      'SkySat sub-meter video and collect capability',
      'Planet Insights / Planetary Variables for automated analytics',
    ],
  },
  {
    id: 'airbus',
    name: 'Airbus Defence & Space',
    headquarters: 'Toulouse, France',
    sensorType: 'Optical',
    constellationSize: '6 (Pleiades Neo 3/4, Pleiades 1A/1B, SPOT 6/7)',
    resolutionM: '0.30 (Pleiades Neo), 0.50 (Pleiades), 1.5 (SPOT)',
    spectralBands: '4 MS + pan (Pleiades Neo), 4 MS + pan (SPOT)',
    revisitHours: '24 (any point on Earth)',
    swathWidthKm: '14 (Pleiades Neo), 60 (SPOT)',
    orbit: 'SSO, ~500-694 km',
    launchYear: 2012,
    status: 'Operational',
    pricingTier: '$$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 95,
    description: 'Major European EO provider operating the Pleiades Neo constellation (30cm native resolution, launched 2021-2022) alongside heritage Pleiades (50cm) and SPOT (1.5m) satellites. OneAtlas platform provides cloud-based access to imagery, basemaps, and analytics. Key supplier to European defence and government customers.',
    highlights: [
      'Pleiades Neo: 30cm resolution with 14km swath width',
      'SPOT 6/7 provides wide-area 1.5m coverage',
      'OneAtlas cloud platform and Living Library archive',
      'Strong European government and defence customer base',
    ],
  },
  {
    id: 'capella',
    name: 'Capella Space',
    headquarters: 'San Francisco, CA, USA',
    sensorType: 'SAR',
    constellationSize: '10 operational satellites',
    resolutionM: '0.25-0.50 (Spotlight), 1.0 (Stripmap)',
    spectralBands: 'X-band SAR (single polarization)',
    revisitHours: '1-6 (average latency)',
    swathWidthKm: '5 (Spot), 10 (Strip), 40 (Sliding Spot)',
    orbit: 'SSO, ~525 km',
    launchYear: 2020,
    status: 'Operational',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 85,
    description: 'Leading US commercial SAR provider with sub-25cm resolution spotlight capability. Acadia-generation satellites deliver industry-leading SAR resolution day or night, through clouds and smoke. Platform offers automated change detection, coherent change detection (CCD), and interferometric SAR (InSAR) products. Key US defense and intelligence contractor.',
    highlights: [
      'Sub-25cm SAR resolution -- sharpest commercial radar imagery',
      'All-weather, day/night imaging capability',
      'Automated tasking with sub-hour collection latency',
      'InSAR and coherent change detection products',
    ],
  },
  {
    id: 'iceye',
    name: 'ICEYE',
    headquarters: 'Espoo, Finland',
    sensorType: 'SAR',
    constellationSize: '30+ operational satellites',
    resolutionM: '0.25 (Spot Fine), 1.0 (Strip), 3.0 (Scan)',
    spectralBands: 'X-band SAR (VV polarization)',
    revisitHours: '4-20 (depending on mode)',
    swathWidthKm: '5 (Spot), 30 (Strip), 100 (Scan)',
    orbit: 'SSO & mid-inclination, ~570 km',
    launchYear: 2018,
    status: 'Operational',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 90,
    description: 'Finnish SAR microsatellite operator with the world\'s largest commercial SAR constellation (30+ satellites). Pioneered microsatellite SAR technology enabling rapid revisit. Strong flood monitoring and insurance analytics business. Provides persistent monitoring solutions for government and commercial customers globally.',
    highlights: [
      'World\'s largest commercial SAR constellation',
      '25cm Spot Fine resolution with rapid revisit',
      'Industry-leading flood extent and damage analytics',
      'Persistent monitoring and change detection solutions',
    ],
  },
  {
    id: 'satellogic',
    name: 'Satellogic',
    headquarters: 'Buenos Aires, Argentina',
    sensorType: 'Multispectral',
    constellationSize: '22 operational satellites',
    resolutionM: '0.70 (multispectral), 0.50 (panchromatic)',
    spectralBands: '4 MS + pan, hyperspectral option (29 bands)',
    revisitHours: '12-24',
    swathWidthKm: '5-10',
    orbit: 'SSO, ~475-500 km',
    launchYear: 2020,
    status: 'Deploying',
    pricingTier: '$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 75,
    description: 'Argentine NewSpace company offering sub-meter multispectral imagery at disruptive pricing. Constellation of 22+ microsatellites provides 70cm multispectral and 50cm panchromatic resolution. Also operates hyperspectral payloads. Pursuing constellation expansion to 200+ satellites for daily global coverage.',
    highlights: [
      'Most affordable sub-meter commercial imagery provider',
      'Hyperspectral capability alongside multispectral',
      'Vertically integrated satellite manufacturing',
      'Targeting 200+ satellite constellation for daily global coverage',
    ],
  },
  {
    id: 'blacksky',
    name: 'BlackSky Technology',
    headquarters: 'Herndon, VA, USA',
    sensorType: 'Optical',
    constellationSize: '16 operational satellites',
    resolutionM: '0.50-1.0',
    spectralBands: '4 MS + pan',
    revisitHours: '1-4 (rapid revisit)',
    swathWidthKm: '4.4',
    orbit: 'Low-inclination + SSO, ~430-450 km',
    launchYear: 2018,
    status: 'Operational',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 80,
    description: 'Real-time geospatial intelligence company combining satellite imagery with AI analytics. Operates 16 Gen-2 satellites in low-inclination and SSO orbits for rapid revisit of populated areas. Spectra AI platform fuses imagery with open-source intelligence for automated monitoring and alerting. Key US government analytics provider.',
    highlights: [
      'Sub-1m resolution with rapid revisit focus',
      'Spectra AI platform for automated geospatial intelligence',
      'Dawn-to-dusk orbit strategy for maximum revisit',
      'Integrated OSINT + satellite intelligence fusion',
    ],
  },
  {
    id: 'umbra',
    name: 'Umbra',
    headquarters: 'Santa Barbara, CA, USA',
    sensorType: 'SAR',
    constellationSize: '6 operational satellites',
    resolutionM: '0.16-0.25 (Spotlight), 1.0 (Stripmap)',
    spectralBands: 'X-band SAR (dual-pol capable)',
    revisitHours: '12-36',
    swathWidthKm: '5 (Spot), 15 (Strip)',
    orbit: 'SSO, ~525 km',
    launchYear: 2021,
    status: 'Deploying',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 60,
    description: 'US commercial SAR company with industry-leading 16cm resolution spotlight mode. Open data model with SAR data available for direct download. Deploying constellation of next-generation satellites with improved imaging modes and throughput. Focus on transparency and accessibility in the SAR market.',
    highlights: [
      '16cm SAR resolution -- among finest commercial radar imagery',
      'Open data model with direct download access',
      'Dual-polarization capable for enhanced analytics',
      'Expanding constellation for improved revisit',
    ],
  },
  {
    id: 'pixxel',
    name: 'Pixxel',
    headquarters: 'Bengaluru, India',
    sensorType: 'Hyperspectral',
    constellationSize: '6 satellites (Fireflies constellation)',
    resolutionM: '5.0',
    spectralBands: '150+ contiguous bands (400-2500nm VNIR-SWIR)',
    revisitHours: '24-48',
    swathWidthKm: '40',
    orbit: 'SSO, ~550 km',
    launchYear: 2022,
    status: 'Deploying',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 50,
    description: 'Indian hyperspectral imaging company deploying the Fireflies constellation for commercial hyperspectral Earth observation. Satellites capture 150+ contiguous spectral bands from visible through SWIR wavelengths at 5m spatial resolution. Aurora platform provides analysis-ready hyperspectral analytics for agriculture, mining, environment, and energy sectors.',
    highlights: [
      '150+ spectral bands from VNIR through SWIR',
      'First commercial hyperspectral constellation at 5m resolution',
      'Aurora analytics platform for automated spectral analysis',
      'Applications in agriculture, mining, oil & gas, environment',
    ],
  },
  {
    id: 'wyvern',
    name: 'Wyvern',
    headquarters: 'Edmonton, Canada',
    sensorType: 'Hyperspectral',
    constellationSize: '3 (Dragonette pathfinders)',
    resolutionM: '2.0-5.0 (target)',
    spectralBands: '32+ bands (VNIR, 400-1000nm)',
    revisitHours: '48-72',
    swathWidthKm: '40 (target)',
    orbit: 'SSO, ~550 km',
    launchYear: 2023,
    status: 'Deploying',
    pricingTier: '$',
    archiveAvailable: false,
    taskingAvailable: true,
    coveragePercent: 20,
    description: 'Canadian hyperspectral satellite startup focused on precision agriculture and environmental monitoring. Dragonette pathfinder satellites validated the proprietary deployable optics technology. Planning full constellation deployment for high-resolution hyperspectral coverage. Uses innovative folded optics design for higher resolution from smaller satellites.',
    highlights: [
      'Innovative deployable optics for high-res from small sats',
      'Focus on precision agriculture analytics',
      '32+ spectral bands in VNIR range',
      'Canadian Space Agency supported technology',
    ],
  },
  {
    id: 'satvu',
    name: 'SatVu (Satellite Vu)',
    headquarters: 'London, UK',
    sensorType: 'Thermal',
    constellationSize: '1 operational (HotSat-1) + 7 planned',
    resolutionM: '3.5 (thermal MWIR)',
    spectralBands: 'Mid-wave infrared (MWIR, 3-5 micron)',
    revisitHours: '24-48 (planned constellation: 1-3 hrs)',
    swathWidthKm: '10',
    orbit: 'SSO, ~500 km',
    launchYear: 2023,
    status: 'Deploying',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 30,
    description: 'UK-based thermal imaging satellite company. HotSat-1 (launched June 2023) provides 3.5m thermal resolution -- highest commercially available from space. Measures building-level heat emissions for energy efficiency, urban heat island mapping, industrial monitoring, and carbon emissions estimation. Planning 8-satellite constellation for frequent thermal revisit.',
    highlights: [
      '3.5m thermal resolution -- best commercial thermal from space',
      'Building-level heat loss detection and energy analytics',
      'Urban heat island and carbon emissions monitoring',
      'Planning 8-satellite constellation for hourly thermal revisit',
    ],
  },
  {
    id: 'albedo',
    name: 'Albedo Space',
    headquarters: 'Denver, CO, USA',
    sensorType: 'Optical',
    constellationSize: '0 (first launch planned 2025)',
    resolutionM: '0.10 (target visible), 2.0 (thermal)',
    spectralBands: 'Visible + thermal IR (co-registered)',
    revisitHours: '24-48 (planned)',
    swathWidthKm: '4.5',
    orbit: 'VLEO, ~250 km',
    launchYear: 2025,
    status: 'Development',
    pricingTier: '$$$',
    archiveAvailable: false,
    taskingAvailable: true,
    coveragePercent: 0,
    description: 'US startup developing 10cm visible resolution satellites from very low Earth orbit (~250km). Will also capture 2m co-registered thermal imagery, a unique dual-modality combination. VLEO orbit enables unprecedented resolution without larger apertures. Backed by significant VC funding. First satellite launch targeted for 2025.',
    highlights: [
      '10cm visible -- highest resolution commercial satellite planned',
      'Co-registered visible + thermal from single platform',
      'Very Low Earth Orbit (VLEO) approach for resolution',
      'Applications in urban analytics, infrastructure, and insurance',
    ],
  },
  {
    id: 'synspective',
    name: 'Synspective',
    headquarters: 'Tokyo, Japan',
    sensorType: 'SAR',
    constellationSize: '4 operational (StriX series)',
    resolutionM: '1.0-3.0 (Strip/Slide)',
    spectralBands: 'X-band SAR',
    revisitHours: '12-24',
    swathWidthKm: '10-30',
    orbit: 'SSO, ~560 km',
    launchYear: 2020,
    status: 'Deploying',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: true,
    coveragePercent: 40,
    description: 'Japanese SAR satellite startup operating the StriX small SAR constellation. Provides all-weather monitoring solutions for infrastructure, land subsidence, and disaster response in the Asia-Pacific region. Planning 30-satellite constellation for global persistent monitoring.',
    highlights: [
      'Compact SAR microsatellite design (StriX platform)',
      'Strong Asia-Pacific regional coverage',
      'Infrastructure monitoring and land subsidence analytics',
      'Planning 30-satellite constellation for sub-hour revisit',
    ],
  },
  {
    id: 'earthdaily',
    name: 'EarthDaily Analytics',
    headquarters: 'Vancouver, Canada',
    sensorType: 'Multispectral',
    constellationSize: '8 planned (EarthDaily constellation)',
    resolutionM: '3.5-5.0',
    spectralBands: '22 spectral bands (VNIR + Red Edge)',
    revisitHours: '24 (daily global)',
    swathWidthKm: '220',
    orbit: 'SSO, ~630 km',
    launchYear: 2025,
    status: 'Development',
    pricingTier: '$$',
    archiveAvailable: true,
    taskingAvailable: false,
    coveragePercent: 0,
    description: 'Canadian Earth observation analytics company (formerly UrtheCast/Deimos) developing a new 8-satellite constellation for daily global multispectral coverage with 22 spectral bands. Wide 220km swath enables full-Earth daily revisit. EarthPipeline platform integrates imagery with analytics for agriculture, forestry, and environmental monitoring.',
    highlights: [
      '22 spectral bands including red edge for vegetation analysis',
      '220km swath for efficient daily global coverage',
      'EarthPipeline science-grade analytics platform',
      'Heritage from Deimos/UrtheCast Earth observation programs',
    ],
  },
];

const USE_CASES: UseCase[] = [
  {
    id: 'agriculture',
    name: 'Agriculture & Precision Farming',
    icon: String.fromCodePoint(0x1F33E),
    description: 'Crop health monitoring, yield prediction, irrigation management, and soil analysis using multispectral and hyperspectral imagery.',
    topProviders: ['Planet Labs', 'Pixxel', 'Wyvern', 'EarthDaily Analytics', 'Satellogic'],
    requirements: [
      'Daily revisit for crop phenology tracking',
      'Red edge and NIR bands for vegetation indices (NDVI, EVI)',
      'Hyperspectral for nutrient deficiency detection',
      '3-10m resolution sufficient for field-level analysis',
    ],
    keyMetrics: ['3-5m resolution', 'Daily revisit', 'NIR/Red Edge bands', '$-$$ pricing'],
  },
  {
    id: 'defense',
    name: 'Defense & Intelligence',
    icon: String.fromCodePoint(0x1F6E1),
    description: 'Geospatial intelligence, change detection, activity monitoring, and battle damage assessment.',
    topProviders: ['Maxar Technologies', 'Capella Space', 'BlackSky Technology', 'Airbus Defence & Space', 'ICEYE'],
    requirements: [
      'Sub-50cm resolution for feature identification',
      'SAR for all-weather / denied area monitoring',
      'Rapid tasking with sub-hour collection latency',
      'Secure delivery and handling (ITAR/classified)',
    ],
    keyMetrics: ['<50cm resolution', '<1hr tasking', 'All-weather (SAR)', '$$$ pricing'],
  },
  {
    id: 'insurance',
    name: 'Insurance & Risk Assessment',
    icon: String.fromCodePoint(0x1F4CA),
    description: 'Pre-event risk assessment, post-disaster damage quantification, flood extent mapping, and portfolio exposure analysis.',
    topProviders: ['ICEYE', 'Maxar Technologies', 'Planet Labs', 'Capella Space', 'SatVu'],
    requirements: [
      'SAR for flood and weather-event monitoring through clouds',
      'Thermal for building-level risk assessment',
      'Historical archive for change-over-time analysis',
      'Automated analytics and API integration',
    ],
    keyMetrics: ['SAR + optical fusion', '4-24hr revisit', 'Archive depth', '$$-$$$ pricing'],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure Monitoring',
    icon: String.fromCodePoint(0x1F3D7),
    description: 'Bridge and dam stability, pipeline surveillance, construction progress tracking, and subsidence detection.',
    topProviders: ['ICEYE', 'Capella Space', 'Synspective', 'Maxar Technologies', 'Umbra'],
    requirements: [
      'InSAR for millimeter-level displacement detection',
      'High resolution for structural feature identification',
      'Consistent revisit for time-series analysis',
      'All-weather capability for continuous monitoring',
    ],
    keyMetrics: ['<1m SAR resolution', 'InSAR capability', '12-24hr revisit', '$$ pricing'],
  },
  {
    id: 'maritime',
    name: 'Maritime & Vessel Tracking',
    icon: String.fromCodePoint(0x1F6A2),
    description: 'Ship detection and classification, port activity monitoring, oil spill detection, and maritime domain awareness.',
    topProviders: ['ICEYE', 'Capella Space', 'Maxar Technologies', 'Planet Labs', 'Airbus Defence & Space'],
    requirements: [
      'SAR for all-weather ocean monitoring',
      'Wide-area scan mode for ocean surveillance',
      'Frequent revisit for vessel tracking',
      'AIS correlation and dark vessel detection',
    ],
    keyMetrics: ['Wide swath SAR', '<6hr revisit', 'AIS fusion', '$$-$$$ pricing'],
  },
  {
    id: 'environment',
    name: 'Environmental & Climate',
    icon: String.fromCodePoint(0x1F30D),
    description: 'Deforestation monitoring, methane detection, carbon stock estimation, wildfire mapping, and ecosystem health.',
    topProviders: ['Planet Labs', 'Pixxel', 'Wyvern', 'EarthDaily Analytics', 'SatVu'],
    requirements: [
      'Hyperspectral for gas detection and vegetation species',
      'Daily coverage for deforestation alerts',
      'Thermal for wildfire and industrial emissions',
      'Global basemap for change detection',
    ],
    keyMetrics: ['Hyperspectral bands', 'Daily global', 'Thermal IR', '$-$$ pricing'],
  },
  {
    id: 'urban',
    name: 'Urban Planning & Smart Cities',
    icon: String.fromCodePoint(0x1F3D9),
    description: 'Urban growth monitoring, land use classification, building footprint extraction, and urban heat island analysis.',
    topProviders: ['Maxar Technologies', 'Airbus Defence & Space', 'Albedo Space', 'SatVu', 'BlackSky Technology'],
    requirements: [
      'Very high resolution (<50cm) for building-level detail',
      'Thermal for urban heat mapping',
      '3D elevation models from stereo pairs',
      'Frequent revisit for change monitoring',
    ],
    keyMetrics: ['<50cm resolution', 'Thermal + visible', 'Stereo/3D', '$$-$$$ pricing'],
  },
  {
    id: 'disaster',
    name: 'Disaster Response',
    icon: String.fromCodePoint(0x26A1),
    description: 'Rapid damage assessment, flood mapping, earthquake impact, wildfire perimeter tracking, and humanitarian response.',
    topProviders: ['ICEYE', 'Capella Space', 'Maxar Technologies', 'Planet Labs', 'BlackSky Technology'],
    requirements: [
      'Rapid tasking (<1hr from request to collect)',
      'SAR for cloud-penetrating disaster imaging',
      'Before/after comparison capability',
      'Fast delivery and open data licensing for NGOs',
    ],
    keyMetrics: ['<1hr tasking', 'All-weather SAR', 'Fast delivery', 'Variable pricing'],
  },
];

const MARKET_TRENDS: MarketTrend[] = [
  {
    title: 'SAR Market Expansion',
    description: 'Synthetic Aperture Radar has emerged as the fastest-growing segment in commercial Earth observation. All-weather, day-night capability drives adoption for defense, insurance, maritime, and infrastructure monitoring. Multiple new entrants (Capella, ICEYE, Umbra, Synspective) have dramatically expanded commercial SAR supply since 2020.',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    stats: [
      'SAR market growing at 15-20% CAGR through 2030',
      '100+ commercial SAR satellites now in orbit',
      'Sub-25cm SAR resolution now commercially available',
      'InSAR analytics market exceeding $500M annually',
    ],
  },
  {
    title: 'Hyperspectral Emergence',
    description: 'Commercial hyperspectral satellites are transitioning from experimental to operational. Pixxel, Wyvern, Planet (Tanager), and OroraTech are deploying constellations that capture hundreds of spectral bands, enabling material identification, gas detection, and environmental monitoring previously only possible from aircraft.',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    stats: [
      'First commercial hyperspectral constellations deployed 2023-2024',
      'Methane detection from space now operational (Tanager, MethaneSAT)',
      'Precision agriculture driving demand for 10+ spectral bands',
      'Hyperspectral market projected to reach $1.8B by 2030',
    ],
  },
  {
    title: 'AI-Powered Analytics',
    description: 'The value chain is shifting from raw imagery to automated intelligence. Providers are increasingly offering AI/ML analytics layers -- automated change detection, object classification, activity monitoring, and predictive insights -- as the primary product, with imagery as the underlying data source.',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    stats: [
      'Geospatial AI analytics market exceeding $3B annually',
      'Automated object detection accuracy now >95% for major features',
      'Foundation models (IBM/NASA Prithvi, Clay) accelerating adoption',
      'Analytics revenue growing faster than imagery revenue for most providers',
    ],
  },
  {
    title: 'Very High Resolution Competition',
    description: 'The sub-50cm resolution market is intensifying with new entrants challenging Maxar and Airbus dominance. Albedo targets 10cm from VLEO, Satellogic offers sub-meter at disruptive pricing, and BlackSky combines resolution with rapid revisit. Meanwhile, Maxar Legion and Pleiades Neo have raised the bar to 30cm native.',
    color: 'text-green-400',
    borderColor: 'border-green-500/30',
    stats: [
      '10cm resolution planned from VLEO (Albedo) by 2025-2026',
      '30cm now standard for premium optical providers',
      'Sub-meter imagery pricing dropped 50%+ since 2020',
      'Daily sub-meter coverage becoming feasible by 2027',
    ],
  },
  {
    title: 'Thermal & Specialized Sensors',
    description: 'New sensor modalities are expanding the commercial EO market beyond traditional optical and radar. Thermal infrared (SatVu, Albedo), SIGINT-adjacent RF sensing, and LIDAR pathfinders are creating entirely new data products for energy, climate, and urban applications.',
    color: 'text-red-400',
    borderColor: 'border-red-500/30',
    stats: [
      'SatVu HotSat-1 achieves 3.5m thermal resolution from space',
      'Building-level heat loss detection now possible from orbit',
      'Thermal data enabling carbon emissions estimation',
      'Combined visible+thermal co-registration a key differentiator',
    ],
  },
  {
    title: 'Constellation Scale & Daily Coverage',
    description: 'The industry is moving toward daily or sub-daily global coverage as the baseline expectation. Planet demonstrated daily global imaging at 3m. Multiple providers now targeting daily revisit at higher resolutions through larger constellations, enabled by decreasing satellite manufacturing costs.',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    stats: [
      'Planet images entire Earth landmass daily at 3m resolution',
      '1,000+ commercial EO satellites now in orbit',
      'Average satellite manufacturing cost down 70% since 2015',
      'Daily sub-meter global coverage targeted by multiple providers by 2028',
    ],
  },
];

const HERO_STATS = [
  { label: 'Providers Tracked', value: '14', color: 'text-cyan-400' },
  { label: 'Satellites in Orbit', value: '500+', color: 'text-blue-400' },
  { label: 'Best Optical GSD', value: '30cm', color: 'text-green-400' },
  { label: 'Best SAR GSD', value: '16cm', color: 'text-amber-400' },
];

const STATUS_STYLES: Record<ProviderStatus, { bg: string; text: string; border: string }> = {
  Operational: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/40' },
  Deploying: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  Development: { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/40' },
};

const SENSOR_COLORS: Record<SensorType, string> = {
  Optical: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  SAR: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  Multispectral: 'text-green-400 bg-green-500/10 border-green-500/30',
  Hyperspectral: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  Thermal: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const PRICING_INFO: Record<string, { archive: string; tasking: string; notes: string }> = {
  '$': {
    archive: '$5-15 / km\u00B2',
    tasking: '$10-25 / km\u00B2',
    notes: 'Budget-friendly providers, often NewSpace startups with competitive pricing models. Best for large-area monitoring where sub-meter resolution is not required.',
  },
  '$$': {
    archive: '$10-30 / km\u00B2',
    tasking: '$20-75 / km\u00B2',
    notes: 'Mid-tier pricing with strong resolution and revisit capabilities. Includes most SAR providers and mid-resolution optical operators.',
  },
  '$$$': {
    archive: '$15-50 / km\u00B2',
    tasking: '$25-150+ / km\u00B2',
    notes: 'Premium very high resolution imagery from established providers. Pricing reflects 30-50cm optical resolution and extensive archive depth.',
  },
};

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function ProviderCard({ provider }: { provider: ImageryProvider }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_STYLES[provider.status];

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg group-hover:text-cyan-300 transition-colors">
            {provider.name}
          </h3>
          <p className="text-slate-400 text-sm mt-0.5">{provider.headquarters}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${SENSOR_COLORS[provider.sensorType]}`}>
            {provider.sensorType}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
            {provider.status}
          </span>
        </div>
      </div>

      {/* Key Specs Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-space-800/50 rounded-lg p-2.5">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-0.5">Resolution</div>
          <div className="text-white text-sm font-semibold">{provider.resolutionM}m</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-2.5">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-0.5">Revisit</div>
          <div className="text-white text-sm font-semibold">{provider.revisitHours}h</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-2.5">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-0.5">Satellites</div>
          <div className="text-white text-sm font-semibold">{provider.constellationSize.split(' ')[0]}</div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
          {provider.spectralBands}
        </span>
        <span className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
          Swath: {provider.swathWidthKm}km
        </span>
        <span className="px-2 py-0.5 bg-space-700 text-amber-300 border border-space-600 rounded text-xs font-semibold">
          {provider.pricingTier}
        </span>
        {provider.archiveAvailable && (
          <span className="px-2 py-0.5 bg-green-900/20 text-green-400 border border-green-500/20 rounded text-xs">
            Archive
          </span>
        )}
        {provider.taskingAvailable && (
          <span className="px-2 py-0.5 bg-cyan-900/20 text-cyan-400 border border-cyan-500/20 rounded text-xs">
            Tasking
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {expanded ? provider.description : provider.description.slice(0, 180) + '...'}
      </p>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-space-800/50 rounded-lg p-3">
              <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Orbit</div>
              <div className="text-white text-sm">{provider.orbit}</div>
            </div>
            <div className="bg-space-800/50 rounded-lg p-3">
              <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Since</div>
              <div className="text-white text-sm">{provider.launchYear}</div>
            </div>
            <div className="bg-space-800/50 rounded-lg p-3">
              <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Constellation</div>
              <div className="text-white text-sm">{provider.constellationSize}</div>
            </div>
            <div className="bg-space-800/50 rounded-lg p-3">
              <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Coverage</div>
              <div className="text-white text-sm">{provider.coveragePercent}% global</div>
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Highlights</div>
            <ul className="space-y-1">
              {provider.highlights.map((h, i) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Show details'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

function ComparisonTab({ sensorFilter }: { sensorFilter: string }) {
  const filtered = sensorFilter
    ? PROVIDERS.filter((p) => p.sensorType === sensorFilter)
    : PROVIDERS;

  return (
    <div className="card-elevated border border-space-700 overflow-hidden">
      <div className="p-4 border-b border-space-700">
        <h3 className="text-white font-semibold">Provider Comparison</h3>
        <p className="text-slate-400 text-sm mt-1">
          Side-by-side comparison of {filtered.length} satellite imagery providers
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-space-700">
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Provider</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Type</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Resolution</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Revisit</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Bands</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Coverage</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Pricing</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Archive</th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs whitespace-nowrap">Tasking</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr
                key={p.id}
                className={`border-b border-space-800 hover:bg-space-800/50 transition-colors ${
                  idx % 2 === 0 ? 'bg-space-900/50' : ''
                }`}
              >
                <td className="py-3 px-4 text-white font-medium whitespace-nowrap">{p.name}</td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${SENSOR_COLORS[p.sensorType]}`}>
                    {p.sensorType}
                  </span>
                </td>
                <td className="py-3 px-4 text-cyan-400 font-mono whitespace-nowrap">{p.resolutionM}m</td>
                <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{p.revisitHours}h</td>
                <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">{p.spectralBands}</td>
                <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{p.coveragePercent}%</td>
                <td className="py-3 px-4 text-amber-400 font-semibold whitespace-nowrap">{p.pricingTier}</td>
                <td className="py-3 px-4 whitespace-nowrap">
                  {p.archiveAvailable ? (
                    <span className="text-green-400 text-xs font-medium">Yes</span>
                  ) : (
                    <span className="text-slate-500 text-xs">No</span>
                  )}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  {p.taskingAvailable ? (
                    <span className="text-green-400 text-xs font-medium">Yes</span>
                  ) : (
                    <span className="text-slate-500 text-xs">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pricing Reference */}
      <div className="p-4 border-t border-space-700">
        <h4 className="text-white font-semibold text-sm mb-3">Pricing Reference (Typical Ranges)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(PRICING_INFO).map(([tier, info]) => (
            <div key={tier} className="bg-space-800/50 rounded-lg p-3">
              <div className="text-amber-400 font-bold text-lg mb-2">{tier}</div>
              <div className="space-y-1 mb-2">
                <div className="text-slate-300 text-xs">
                  <span className="text-slate-500">Archive:</span> {info.archive}
                </div>
                <div className="text-slate-300 text-xs">
                  <span className="text-slate-500">Tasking:</span> {info.tasking}
                </div>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">{info.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UseCaseCard({ useCase }: { useCase: UseCase }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">{useCase.icon}</span>
        <div>
          <h3 className="text-white font-semibold text-lg">{useCase.name}</h3>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">{useCase.description}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {useCase.keyMetrics.map((metric) => (
          <span
            key={metric}
            className="px-2 py-0.5 bg-cyan-900/20 text-cyan-300 border border-cyan-500/20 rounded text-xs font-medium"
          >
            {metric}
          </span>
        ))}
      </div>

      {/* Top Providers */}
      <div className="mb-4">
        <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Recommended Providers</div>
        <div className="flex flex-wrap gap-1.5">
          {useCase.topProviders.map((provider, idx) => (
            <span
              key={provider}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                idx === 0
                  ? 'bg-amber-900/20 text-amber-300 border border-amber-500/20'
                  : 'bg-space-700 text-slate-300 border border-space-600'
              }`}
            >
              {idx === 0 ? `${String.fromCodePoint(0x2B50)} ${provider}` : provider}
            </span>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="mb-4">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Requirements</div>
          <ul className="space-y-1">
            {useCase.requirements.map((req, i) => (
              <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {expanded ? 'Show less' : 'View requirements'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

function MarketTrendCard({ trend }: { trend: MarketTrend }) {
  return (
    <div className={`card-elevated p-6 border ${trend.borderColor} transition-all`}>
      <h3 className={`text-lg font-semibold ${trend.color} mb-2`}>{trend.title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-4">{trend.description}</p>
      <div className="space-y-2">
        {trend.stats.map((stat, i) => (
          <div key={i} className="text-slate-300 text-sm flex items-start gap-2">
            <span className={`mt-0.5 flex-shrink-0 ${trend.color}`}>-</span>
            {stat}
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function ImageryMarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabId>('providers');
  const [sensorFilter, setSensorFilter] = useState<string>('');

  const sensorTypes = Array.from(new Set(PROVIDERS.map((p) => p.sensorType)));

  const filteredProviders = sensorFilter
    ? PROVIDERS.filter((p) => p.sensorType === sensorFilter)
    : PROVIDERS;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'providers', label: 'Providers', icon: String.fromCodePoint(0x1F6F0) },
    { id: 'compare', label: 'Compare', icon: String.fromCodePoint(0x1F4CA) },
    { id: 'usecases', label: 'Use Cases', icon: String.fromCodePoint(0x1F3AF) },
    { id: 'market', label: 'Market Overview', icon: String.fromCodePoint(0x1F4C8) },
  ];

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Satellite Imagery Marketplace"
          subtitle="Compare commercial Earth observation providers -- optical, SAR, hyperspectral, and thermal satellite imagery capabilities and pricing"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Imagery Marketplace' }]}
        />

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="card-elevated p-5 text-center">
              <div className={`text-3xl font-bold font-display tracking-tight ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Market Overview Banner */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">{String.fromCodePoint(0x1F30D)}</span>
            <div>
              <h3 className="font-semibold text-white mb-1">Earth Observation Market</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                The commercial Earth observation market is projected to exceed $8 billion by 2028, growing at
                approximately 12% CAGR. Over 1,000 commercial EO satellites are now in orbit, with SAR, hyperspectral,
                and thermal sensors emerging alongside traditional optical imaging. AI-powered analytics platforms
                are transforming raw imagery into automated intelligence products, shifting value from data acquisition
                to actionable insights. New providers continue to enter, driving down pricing while increasing
                temporal and spectral coverage globally.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-space-700 mb-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {/* ──────────────── PROVIDERS TAB ──────────────── */}
          {activeTab === 'providers' && (
            <div>
              {/* Sensor Type Filter */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-slate-400 text-sm">Filter by sensor:</span>
                <button
                  onClick={() => setSensorFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    sensorFilter === ''
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
                  }`}
                >
                  All ({PROVIDERS.length})
                </button>
                {sensorTypes.map((type) => {
                  const count = PROVIDERS.filter((p) => p.sensorType === type).length;
                  return (
                    <button
                      key={type}
                      onClick={() => setSensorFilter(type)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        sensorFilter === type
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                          : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
                      }`}
                    >
                      {type} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Provider Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredProviders.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </div>

              {filteredProviders.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-5xl block mb-4">{String.fromCodePoint(0x1F6F0)}</span>
                  <p className="text-slate-400">No providers match the selected filter.</p>
                </div>
              )}

              {/* Sensor Type Summary */}
              <div className="mt-8 card-elevated p-6 border border-space-700">
                <h3 className="font-semibold text-white mb-4">Providers by Sensor Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {sensorTypes.map((type) => {
                    const count = PROVIDERS.filter((p) => p.sensorType === type).length;
                    const colorClass = SENSOR_COLORS[type as SensorType]?.split(' ')[0] || 'text-slate-400';
                    return (
                      <div key={type} className="bg-space-800/50 rounded-xl p-4 text-center">
                        <div className={`text-2xl font-bold mb-1 ${colorClass}`}>{count}</div>
                        <div className="text-slate-400 text-sm">{type}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── COMPARE TAB ──────────────── */}
          {activeTab === 'compare' && (
            <div>
              {/* Filter */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-slate-400 text-sm">Filter by sensor:</span>
                <button
                  onClick={() => setSensorFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    sensorFilter === ''
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
                  }`}
                >
                  All
                </button>
                {sensorTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSensorFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      sensorFilter === type
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <ComparisonTab sensorFilter={sensorFilter} />

              {/* Key Insights */}
              <div className="mt-6 card-elevated p-6 border border-space-700">
                <h3 className="text-white font-semibold mb-4">Key Selection Insights</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">01</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">Resolution vs. coverage tradeoff.</strong> Maxar and Airbus offer
                      30cm resolution but limited daily capacity. Planet delivers daily global coverage at 3m. Choose
                      based on whether you need detail or temporal frequency.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">02</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">SAR is essential for all-weather operations.</strong> If your
                      use case requires cloud-penetrating or nighttime imaging, SAR providers (ICEYE, Capella, Umbra)
                      are necessary. Many organizations fuse optical + SAR for complete coverage.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">03</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">Archive vs. tasking pricing differs significantly.</strong> Archive
                      imagery is typically 30-60% cheaper than new tasking collections. Always check archive availability
                      before commissioning new collects.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">04</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">Hyperspectral is the emerging differentiator.</strong> Pixxel, Wyvern,
                      and Planet Tanager enable material identification and gas detection that traditional
                      multispectral imagery cannot achieve. Critical for agriculture, mining, and environmental applications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── USE CASES TAB ──────────────── */}
          {activeTab === 'usecases' && (
            <div>
              <div className="card-elevated p-5 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-2">Choosing the Right Provider for Your Use Case</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Different applications require different combinations of spatial resolution, spectral bands,
                  revisit frequency, and sensor type. Below are provider recommendations organized by primary
                  use case, with the top recommendation highlighted for each category.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {USE_CASES.map((useCase) => (
                  <UseCaseCard key={useCase.id} useCase={useCase} />
                ))}
              </div>

              {/* Provider Frequency in Use Cases */}
              <div className="mt-8 card-elevated p-6 border border-space-700">
                <h3 className="font-semibold text-white mb-4">Most Versatile Providers</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Providers ranked by number of use cases where they appear as a top recommendation:
                </p>
                <div className="space-y-3">
                  {(() => {
                    const providerCounts: Record<string, number> = {};
                    USE_CASES.forEach((uc) => {
                      uc.topProviders.forEach((p) => {
                        providerCounts[p] = (providerCounts[p] || 0) + 1;
                      });
                    });
                    const sorted = Object.entries(providerCounts)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8);
                    const maxCount = sorted[0]?.[1] || 1;

                    return sorted.map(([name, count]) => {
                      const barWidth = (count / maxCount) * 100;
                      return (
                        <div key={name} className="flex items-center gap-4">
                          <div className="w-40 flex-shrink-0 text-sm text-white font-medium truncate">{name}</div>
                          <div className="flex-1 h-6 bg-space-800/50 rounded overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded transition-all"
                              style={{ width: `${Math.max(barWidth, 3)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">
                              {count} use cases
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Multi-Sensor Strategy */}
              <div className="mt-6 card-elevated p-6 border border-cyan-500/20">
                <h3 className="text-cyan-400 font-semibold mb-4">Multi-Sensor Fusion Strategy</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Most operational intelligence workflows benefit from combining multiple sensor types. Here are
                  recommended multi-sensor combinations:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      combo: 'Optical + SAR',
                      providers: 'Maxar + ICEYE',
                      reason: 'All-weather, high-resolution monitoring. Optical for detail, SAR for cloud penetration and nighttime coverage.',
                    },
                    {
                      combo: 'Daily Optical + Hyperspectral',
                      providers: 'Planet + Pixxel',
                      reason: 'Daily change detection combined with material-level identification. Ideal for agriculture and environmental monitoring.',
                    },
                    {
                      combo: 'SAR + Thermal',
                      providers: 'Capella + SatVu',
                      reason: 'Infrastructure monitoring combining structural displacement detection with thermal anomaly identification.',
                    },
                    {
                      combo: 'VHR Optical + Daily MS',
                      providers: 'Airbus + Planet',
                      reason: 'Detailed feature extraction from 30cm imagery combined with daily temporal monitoring at 3m.',
                    },
                  ].map((strategy) => (
                    <div key={strategy.combo} className="bg-space-800/50 rounded-lg p-4">
                      <div className="text-white font-semibold text-sm mb-1">{strategy.combo}</div>
                      <div className="text-cyan-400 text-xs font-medium mb-2">{strategy.providers}</div>
                      <p className="text-slate-400 text-xs leading-relaxed">{strategy.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── MARKET OVERVIEW TAB ──────────────── */}
          {activeTab === 'market' && (
            <div>
              {/* Market Size */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold text-lg mb-4">Global Earth Observation Market</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: '2024 Market Size', value: '$5.5B', color: 'text-cyan-400' },
                    { label: '2028 Projected', value: '$8.3B', color: 'text-green-400' },
                    { label: 'CAGR 2024-2030', value: '~12%', color: 'text-amber-400' },
                    { label: 'Commercial EO Sats', value: '1,000+', color: 'text-purple-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-space-800/50 rounded-xl p-4 text-center">
                      <div className={`text-2xl font-bold font-display ${stat.color}`}>{stat.value}</div>
                      <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-space-800/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold text-sm mb-2">Data Revenue</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Satellite imagery data sales represent approximately 60% of the EO market. Archive sales
                      continue growing as historical datasets become more valuable for AI training, change detection,
                      and baseline analysis.
                    </p>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold text-sm mb-2">Analytics / Value-Added</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Value-added analytics (object detection, change monitoring, predictive insights) represent the
                      fastest-growing segment at 18-22% CAGR. Multiple providers report analytics revenue growing
                      faster than raw data revenue.
                    </p>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold text-sm mb-2">Government vs. Commercial</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Government and defense remain the largest customer segment (~55% of revenue), but commercial
                      adoption is accelerating. Insurance, agriculture, energy, and finance sectors now represent
                      a rapidly growing commercial customer base.
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Trends */}
              <h3 className="text-white font-semibold text-lg mb-4">Key Market Trends</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {MARKET_TRENDS.map((trend) => (
                  <MarketTrendCard key={trend.title} trend={trend} />
                ))}
              </div>

              {/* Industry Evolution Timeline */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-4">Industry Evolution</h3>
                <div className="space-y-4">
                  {[
                    {
                      era: '1999-2010',
                      title: 'Pioneer Era',
                      description: 'IKONOS (1m), QuickBird (60cm), WorldView-1 (50cm). First commercial high-resolution satellites. Government as primary customer. Imagery priced at $20-50/km\u00B2.',
                      color: 'text-slate-400',
                    },
                    {
                      era: '2010-2018',
                      title: 'NewSpace Revolution',
                      description: 'Planet launches Dove flock (3m daily). WorldView-3 achieves 31cm. Smallsat EO becomes viable. Airbus launches Pleiades. SAR microsatellites emerge (ICEYE).',
                      color: 'text-blue-400',
                    },
                    {
                      era: '2018-2023',
                      title: 'Constellation Scale',
                      description: 'Planet achieves daily global imaging. ICEYE and Capella deploy commercial SAR fleets. Maxar launches WorldView Legion (30cm). BlackSky deploys rapid-revisit constellation. Pricing drops significantly.',
                      color: 'text-cyan-400',
                    },
                    {
                      era: '2024-2028',
                      title: 'Multi-Modal & AI Era',
                      description: 'Hyperspectral goes operational (Pixxel, Tanager). Thermal from space (SatVu). 10cm VLEO planned (Albedo). AI analytics become primary product. Market exceeds $8B.',
                      color: 'text-green-400',
                    },
                  ].map((era) => (
                    <div key={era.era} className="flex items-start gap-4">
                      <div className={`text-sm font-mono font-bold flex-shrink-0 w-24 ${era.color}`}>
                        {era.era}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-sm">{era.title}</h4>
                        <p className="text-slate-400 text-xs leading-relaxed mt-1">{era.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regional Market Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="card-elevated p-6 border border-space-700">
                  <h3 className="text-white font-semibold mb-4">Market by Region</h3>
                  <div className="space-y-3">
                    {[
                      { region: 'North America', share: '38%', color: 'from-blue-500 to-blue-400', providers: 'Maxar, Planet, Capella, BlackSky, Umbra, Albedo' },
                      { region: 'Europe', share: '28%', color: 'from-cyan-500 to-cyan-400', providers: 'Airbus, ICEYE, SatVu' },
                      { region: 'Asia-Pacific', share: '22%', color: 'from-green-500 to-green-400', providers: 'Pixxel, Synspective' },
                      { region: 'Rest of World', share: '12%', color: 'from-amber-500 to-amber-400', providers: 'Satellogic, Wyvern, EarthDaily' },
                    ].map((r) => (
                      <div key={r.region}>
                        <div className="flex justify-between mb-1">
                          <span className="text-white text-sm font-medium">{r.region}</span>
                          <span className="text-slate-400 text-sm">{r.share}</span>
                        </div>
                        <div className="h-2 bg-space-800/50 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${r.color}`}
                            style={{ width: r.share }}
                          />
                        </div>
                        <p className="text-slate-500 text-xs">{r.providers}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-elevated p-6 border border-space-700">
                  <h3 className="text-white font-semibold mb-4">Market by Sensor Type</h3>
                  <div className="space-y-3">
                    {[
                      { type: 'Optical (VHR)', share: '45%', growth: '8% CAGR', color: 'from-blue-500 to-blue-400' },
                      { type: 'SAR', share: '25%', growth: '17% CAGR', color: 'from-cyan-500 to-cyan-400' },
                      { type: 'Multispectral (Med-Res)', share: '18%', growth: '10% CAGR', color: 'from-green-500 to-green-400' },
                      { type: 'Hyperspectral', share: '7%', growth: '25% CAGR', color: 'from-purple-500 to-purple-400' },
                      { type: 'Thermal / Other', share: '5%', growth: '20% CAGR', color: 'from-red-500 to-red-400' },
                    ].map((s) => (
                      <div key={s.type}>
                        <div className="flex justify-between mb-1">
                          <span className="text-white text-sm font-medium">{s.type}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-green-400 text-xs">{s.growth}</span>
                            <span className="text-slate-400 text-sm">{s.share}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-space-800/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                            style={{ width: s.share }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Sources */}
              <div className="card-elevated p-5 border border-space-700 border-dashed">
                <h3 className="text-sm font-semibold text-white mb-2">Data Sources & Methodology</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Market size estimates derived from Euroconsult, Northern Sky Research (NSR), and publicly available
                  industry reports. Provider specifications sourced from official company documentation, SEC filings,
                  and satellite operator disclosures. Resolution figures represent best-available modes under optimal
                  conditions. Pricing ranges are indicative and vary by volume, area, licensing, and contract terms.
                  Data as of early 2025 -- constellation sizes and capabilities change frequently with new launches.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
