import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 80);
}

// ============================================================
// SERVICE LISTINGS — 80+ listings across all 10 categories
// Each linked to a real CompanyProfile by slug
// ============================================================

interface ListingData {
  companySlug: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  pricingType: string;
  priceMin?: number;
  priceMax?: number;
  priceUnit?: string;
  pricingNotes?: string;
  certifications: string[];
  leadTime?: string;
  capacity?: string;
  coverageArea?: string;
  specifications?: Record<string, unknown>;
  pastPerformance?: string;
  featured?: boolean;
}

const LISTINGS: ListingData[] = [
  // ===== LAUNCH SERVICES (8 listings) =====
  {
    companySlug: 'spacex',
    name: 'Falcon 9 Dedicated Launch',
    description: 'Full dedicated launch on SpaceX Falcon 9 to LEO, SSO, or GTO. Includes mission integration, fairing, and launch operations from Cape Canaveral or Vandenberg. First stage recovery keeps costs low. Flight-proven boosters available for additional savings.',
    category: 'launch',
    subcategory: 'dedicated',
    pricingType: 'fixed',
    priceMin: 62_000_000,
    priceMax: 67_000_000,
    priceUnit: 'launch',
    certifications: ['ITAR', 'ISO_9001', 'AS9100'],
    leadTime: '12-18 months',
    capacity: '40+ launches/year',
    coverageArea: 'LEO, SSO, GTO, GEO, Interplanetary',
    specifications: { payloadLEO: '22,800 kg', payloadGTO: '8,300 kg', fairingDiameter: '5.2 m', reliability: '99.5%' },
    pastPerformance: 'Over 300 successful Falcon 9 flights. Customers include NASA, DoD, commercial operators.',
    featured: true,
  },
  {
    companySlug: 'spacex',
    name: 'Falcon 9 Rideshare (Transporter Program)',
    description: 'Affordable rideshare to sun-synchronous orbit on SpaceX Transporter missions. Regularly scheduled launches to 525km SSO. Standard ESPA ports and custom adapters available. Ideal for smallsats, cubesats, and microsatellites.',
    category: 'launch',
    subcategory: 'rideshare',
    pricingType: 'per_unit',
    priceMin: 5_500,
    priceMax: 6_500,
    priceUnit: 'kg',
    certifications: ['ITAR', 'ISO_9001'],
    leadTime: '6-12 months',
    capacity: 'Quarterly missions',
    coverageArea: 'SSO (525 km)',
    specifications: { minPayload: '1 kg', maxPayload: '200 kg', orbit: '525 km SSO', deploymentAccuracy: '±25 km' },
  },
  {
    companySlug: 'rocket-lab',
    name: 'Electron Dedicated Smallsat Launch',
    description: 'Dedicated launch for smallsats up to 300 kg to LEO and SSO on Rocket Lab Electron. Full mission customization including orbit, timing, and deployment. Photon kick stage available for custom orbits and lunar trajectories.',
    category: 'launch',
    subcategory: 'dedicated',
    pricingType: 'fixed',
    priceMin: 7_500_000,
    priceMax: 8_000_000,
    priceUnit: 'launch',
    certifications: ['ITAR', 'ISO_9001', 'AS9100'],
    leadTime: '6-12 months',
    capacity: '15+ launches/year',
    coverageArea: 'LEO, SSO, custom orbits',
    specifications: { payloadLEO: '300 kg', payloadSSO: '200 kg', fairingDiameter: '1.2 m', launchSites: 'LC-1 NZ, LC-2 Wallops' },
    pastPerformance: '40+ Electron launches. NASA TROPICS, Synspective, BlackSky, Capella missions.',
    featured: true,
  },
  {
    companySlug: 'united-launch-alliance',
    name: 'Vulcan Centaur Heavy-Lift Launch',
    description: 'Next-generation heavy-lift launch vehicle for national security, commercial, and science missions. Vulcan Centaur delivers to all orbits from LEO to beyond GEO with best-in-class reliability heritage from Atlas and Delta programs.',
    category: 'launch',
    subcategory: 'dedicated',
    pricingType: 'rfq_only',
    priceMin: 100_000_000,
    priceMax: 150_000_000,
    priceUnit: 'launch',
    certifications: ['ITAR', 'ISO_9001', 'AS9100', 'CMMI'],
    leadTime: '18-24 months',
    capacity: '8-12 launches/year',
    coverageArea: 'LEO to beyond GEO',
    specifications: { payloadLEO: '27,200 kg', payloadGTO: '7,200 kg', fairingDiameter: '5.4 m' },
    pastPerformance: '100% Atlas V mission success rate. National security and NASA heritage.',
  },
  {
    companySlug: 'relativity-space',
    name: 'Terran R Medium-Lift Launch',
    description: 'Fully reusable, 3D-printed medium-lift launch vehicle. Terran R offers competitive pricing with rapid manufacturing and a fully reusable design. Ideal for commercial constellation deployment and government missions.',
    category: 'launch',
    subcategory: 'dedicated',
    pricingType: 'rfq_only',
    priceMin: 50_000_000,
    priceMax: 65_000_000,
    priceUnit: 'launch',
    certifications: ['ITAR', 'ISO_9001'],
    leadTime: '12-18 months',
    coverageArea: 'LEO, SSO, GTO',
    specifications: { payloadLEO: '20,000 kg', reusable: true, manufacturingMethod: '3D Printed' },
  },
  {
    companySlug: 'abl-space-systems',
    name: 'RS1 Responsive Launch Service',
    description: 'Rapid-response launch capability designed for responsive space access. RS1 launches from a transportable ground system, enabling launch from multiple sites with minimal infrastructure. Perfect for urgent national security needs.',
    category: 'launch',
    subcategory: 'rapid_responsive',
    pricingType: 'fixed',
    priceMin: 12_000_000,
    priceMax: 15_000_000,
    priceUnit: 'launch',
    certifications: ['ITAR', 'ISO_9001'],
    leadTime: '3-6 months',
    coverageArea: 'LEO, SSO',
    specifications: { payloadLEO: '1,350 kg', mobileLaunch: true },
  },
  {
    companySlug: 'firefly-aerospace',
    name: 'Alpha Smallsat Launch Vehicle',
    description: 'Dedicated small launch vehicle for payloads up to 1,030 kg to LEO. Alpha provides dedicated access to orbit for smallsat operators who need custom orbits and deployment schedules.',
    category: 'launch',
    subcategory: 'dedicated',
    pricingType: 'fixed',
    priceMin: 15_000_000,
    priceMax: 15_000_000,
    priceUnit: 'launch',
    certifications: ['ITAR'],
    leadTime: '9-12 months',
    coverageArea: 'LEO, SSO',
    specifications: { payloadLEO: '1,030 kg', payloadSSO: '630 kg' },
  },
  {
    companySlug: 'momentus',
    name: 'Vigoride Orbital Transfer Service',
    description: 'Last-mile orbital delivery via the Vigoride orbital transfer vehicle. Departs from rideshare orbits and delivers payloads to custom final orbits, saving satellite operators the need for expensive onboard propulsion.',
    category: 'launch',
    subcategory: 'orbital_transfer',
    pricingType: 'per_unit',
    priceMin: 25_000,
    priceMax: 35_000,
    priceUnit: 'kg',
    certifications: ['ITAR'],
    leadTime: '6-9 months',
    coverageArea: 'LEO to MEO',
    specifications: { maxPayload: '300 kg', deltaV: '1+ km/s', propulsion: 'Water plasma' },
  },

  // ===== SATELLITE SERVICES (8 listings) =====
  {
    companySlug: 'planet-labs',
    name: 'PlanetScope Daily Monitoring',
    description: 'Daily global imagery from Planet\'s constellation of 200+ Dove satellites. 3-5m resolution, multi-spectral imaging covering the entire Earth landmass daily. Ideal for agriculture, forestry, urban planning, and environmental monitoring.',
    category: 'satellite',
    subcategory: 'earth_observation',
    pricingType: 'subscription',
    priceMin: 5_000,
    priceMax: 50_000,
    priceUnit: 'month',
    certifications: ['ISO_27001', 'SOC_2'],
    leadTime: '1-2 weeks',
    capacity: 'Global daily coverage',
    coverageArea: 'Global',
    specifications: { resolution: '3-5m', revisitRate: 'Daily', bands: 8, coverage: '150M km²/day' },
    pastPerformance: '2,000+ customers across 40 countries. Used by NASA, ESA, USDA.',
    featured: true,
  },
  {
    companySlug: 'maxar-technologies',
    name: 'WorldView Legion 30cm Imagery',
    description: 'Industry-leading 30cm resolution satellite imagery from the WorldView Legion constellation. Precision geolocation, multi-spectral analysis, and 3D surface models. Gold standard for defense, intelligence, and mapping applications.',
    category: 'satellite',
    subcategory: 'earth_observation',
    pricingType: 'per_unit',
    priceMin: 14,
    priceMax: 29,
    priceUnit: 'km²',
    certifications: ['ITAR', 'ISO_9001', 'ISO_27001', 'NIST_800_171'],
    leadTime: '1-3 days',
    coverageArea: 'Global',
    specifications: { resolution: '30cm', geolocationAccuracy: '<3m CE90', spectralBands: 16 },
    pastPerformance: 'NGA Foundation GEOINT contract. 20+ years serving DoD and IC.',
    featured: true,
  },
  {
    companySlug: 'spire-global',
    name: 'Spire Weather & Maritime AIS Data',
    description: 'Global radio occultation weather data and maritime AIS vessel tracking from 100+ nanosatellites. Near-real-time weather profiles and ship position data delivered via API. Ideal for weather forecasting and maritime intelligence.',
    category: 'satellite',
    subcategory: 'earth_observation',
    pricingType: 'subscription',
    priceMin: 3_000,
    priceMax: 25_000,
    priceUnit: 'month',
    certifications: ['ISO_27001'],
    leadTime: '1 week',
    coverageArea: 'Global',
    specifications: { weatherProfiles: '20,000+/day', aisMessages: '100M+/month', latency: 'Near real-time' },
  },
  {
    companySlug: 'ses',
    name: 'SES O3b mPOWER Low-Latency Broadband',
    description: 'High-throughput, low-latency broadband connectivity via SES O3b mPOWER MEO constellation. Delivers fiber-like performance with <150ms latency for government, maritime, enterprise, and telco customers worldwide.',
    category: 'satellite',
    subcategory: 'communications',
    pricingType: 'subscription',
    priceMin: 10_000,
    priceMax: 100_000,
    priceUnit: 'month',
    certifications: ['ISO_9001', 'ISO_27001'],
    leadTime: '4-8 weeks',
    coverageArea: 'Global (±50° latitude)',
    specifications: { throughput: 'Up to 10 Gbps per beam', latency: '<150ms', orbit: 'MEO (8,000 km)' },
    pastPerformance: 'Serving 50+ governments and militaries worldwide.',
  },
  {
    companySlug: 'viasat',
    name: 'ViaSat-3 Global Ka-Band Capacity',
    description: 'Next-generation global Ka-band capacity from ViaSat-3 constellation. Ultra-high capacity for government, commercial aviation, and residential broadband. Each satellite delivers 1+ Tbps of total throughput.',
    category: 'satellite',
    subcategory: 'communications',
    pricingType: 'rfq_only',
    priceMin: 50_000,
    priceMax: 500_000,
    priceUnit: 'month',
    certifications: ['ITAR', 'ISO_9001', 'FedRAMP'],
    leadTime: '6-8 weeks',
    coverageArea: 'Global',
    specifications: { throughputPerSat: '1+ Tbps', frequency: 'Ka-band', constellation: '3 GEO satellites' },
  },
  {
    companySlug: 'capella-space',
    name: 'Capella SAR On-Demand Imaging',
    description: 'All-weather, day-or-night synthetic aperture radar (SAR) imagery at sub-50cm resolution. On-demand tasking with rapid delivery for defense, maritime, and infrastructure monitoring. Penetrates clouds and operates 24/7.',
    category: 'satellite',
    subcategory: 'earth_observation',
    pricingType: 'per_unit',
    priceMin: 2_500,
    priceMax: 6_000,
    priceUnit: 'image',
    certifications: ['ITAR', 'ISO_27001'],
    leadTime: 'Same day tasking',
    coverageArea: 'Global',
    specifications: { resolution: 'Sub-50cm', imagingMode: 'Spotlight, Strip, Sliding Spotlight', polarization: 'HH, VV, HV, VH' },
  },
  {
    companySlug: 'swarm-technologies',
    name: 'Swarm IoT Satellite Connectivity',
    description: 'Low-cost satellite IoT connectivity for remote sensors, trackers, and devices. Swarm provides bidirectional data relay for agricultural sensors, wildlife trackers, maritime devices, and industrial IoT in areas beyond cellular coverage.',
    category: 'satellite',
    subcategory: 'iot',
    pricingType: 'per_unit',
    priceMin: 5,
    priceMax: 5,
    priceUnit: 'device/month',
    certifications: ['FCC'],
    leadTime: '2 weeks',
    coverageArea: 'Global',
    specifications: { messageSize: '192 bytes', latency: 'Hours (store-and-forward)', groundModem: 'Swarm M138' },
  },
  {
    companySlug: 'blacksky',
    name: 'BlackSky Real-Time Intelligence',
    description: 'High-revisit satellite imagery and AI-powered analytics for real-time geospatial intelligence. Frequent revisit, rapid tasking, and automated change detection for defense and commercial intelligence customers.',
    category: 'satellite',
    subcategory: 'earth_observation',
    pricingType: 'subscription',
    priceMin: 10_000,
    priceMax: 75_000,
    priceUnit: 'month',
    certifications: ['ITAR', 'ISO_27001', 'NIST_800_171'],
    leadTime: '1 week',
    coverageArea: 'Global',
    specifications: { resolution: '1m', revisit: 'Up to 15x/day', aiAnalytics: true },
  },

  // ===== IN-SPACE SERVICES (6 listings) =====
  {
    companySlug: 'northrop-grumman',
    name: 'Mission Extension Vehicle (MEV) Servicing',
    description: 'In-orbit satellite life extension via Northrop Grumman\'s Mission Extension Vehicle. MEV docks with aging GEO satellites to provide propulsion and attitude control, extending operational life by 5+ years without requiring satellite modification.',
    category: 'in_space',
    subcategory: 'satellite_servicing',
    pricingType: 'rfq_only',
    priceMin: 50_000_000,
    priceMax: 100_000_000,
    priceUnit: 'mission',
    certifications: ['ITAR', 'ISO_9001', 'AS9100'],
    leadTime: '18-24 months',
    coverageArea: 'GEO',
    specifications: { lifExtension: '5-15 years', targetOrbit: 'GEO', dockingMethod: 'Liquid apogee engine interface' },
    pastPerformance: 'Successfully extended life of Intelsat-901 (2020) and Intelsat-10-02 (2021).',
    featured: true,
  },
  {
    companySlug: 'astroscale',
    name: 'Active Debris Removal (ELSA-M)',
    description: 'End-of-life satellite removal service using Astroscale\'s ELSA-M servicer. Designed to rendezvous with, capture, and deorbit multiple debris objects or defunct satellites in a single mission. Supports responsible space operations.',
    category: 'in_space',
    subcategory: 'satellite_servicing',
    pricingType: 'rfq_only',
    priceMin: 10_000_000,
    priceMax: 30_000_000,
    priceUnit: 'mission',
    certifications: ['ISO_9001'],
    leadTime: '12-18 months',
    coverageArea: 'LEO',
    specifications: { captureMethod: 'Magnetic docking plate', targetsPerMission: 'Multiple', orbit: 'LEO' },
  },
  {
    companySlug: 'redwire-corporation',
    name: 'In-Space Manufacturing & 3D Printing',
    description: 'Microgravity manufacturing and 3D printing services aboard the ISS and future platforms. Produce advanced materials, optical fibers (ZBLAN), and bio-printed tissues that can only be manufactured in zero gravity.',
    category: 'in_space',
    subcategory: 'hosted_payload',
    pricingType: 'rfq_only',
    priceMin: 500_000,
    priceMax: 5_000_000,
    priceUnit: 'experiment',
    certifications: ['ISO_9001', 'NASA_QPL'],
    leadTime: '6-12 months',
    coverageArea: 'ISS / LEO',
    specifications: { platform: 'ISS', printMaterials: 'Polymers, metals, ceramics, ZBLAN', microgravity: true },
    pastPerformance: 'Multiple NASA contracts. Produced first 3D-printed tools in space.',
  },
  {
    companySlug: 'orbit-fab',
    name: 'RAFTI Satellite Refueling Interface',
    description: 'Satellite refueling hardware and on-orbit fuel delivery. Orbit Fab\'s RAFTI (Rapidly Attachable Fluid Transfer Interface) enables satellites to be refueled in orbit, extending mission life and enabling new mission profiles.',
    category: 'in_space',
    subcategory: 'space_logistics',
    pricingType: 'rfq_only',
    priceMin: 1_000_000,
    priceMax: 20_000_000,
    priceUnit: 'service',
    certifications: ['ITAR'],
    leadTime: '12-24 months',
    coverageArea: 'LEO to GEO',
    specifications: { fuelTypes: 'Hydrazine, Xenon, Green propellant', interface: 'RAFTI', orbit: 'LEO-GEO' },
  },
  {
    companySlug: 'axiom-space',
    name: 'Axiom Hosted Payload on ISS Module',
    description: 'Host your experimental payloads on the Axiom segment of the International Space Station. Full payload integration, power, data, and crew time for microgravity research, Earth observation, and technology demonstrations.',
    category: 'in_space',
    subcategory: 'hosted_payload',
    pricingType: 'rfq_only',
    priceMin: 1_000_000,
    priceMax: 10_000_000,
    priceUnit: 'experiment',
    certifications: ['NASA_QPL', 'ISO_9001'],
    leadTime: '6-18 months',
    coverageArea: 'ISS (408 km LEO)',
    specifications: { platform: 'Axiom ISS Module', power: 'Up to 3kW', data: 'Up to 100 Mbps downlink' },
  },
  {
    companySlug: 'spacex',
    name: 'Starlink Direct-to-Cell Service',
    description: 'Direct-to-cell satellite connectivity enabling standard mobile phones to connect via Starlink satellites. Provides text, voice, and data services in areas without terrestrial cellular coverage worldwide.',
    category: 'in_space',
    subcategory: 'in_orbit_computing',
    pricingType: 'subscription',
    priceMin: 2,
    priceMax: 10,
    priceUnit: 'device/month',
    certifications: ['FCC'],
    leadTime: '1 month',
    coverageArea: 'Global',
    specifications: { technology: 'Direct-to-Cell', compatibility: 'Standard LTE phones', services: 'Text, Voice, Data' },
  },

  // ===== GROUND SEGMENT (7 listings) =====
  {
    companySlug: 'aws-ground-station',
    name: 'AWS Ground Station as a Service',
    description: 'Fully managed ground station service integrated with AWS cloud. Schedule satellite contacts at globally distributed ground stations and have data delivered directly to your AWS account. No ground infrastructure investment needed.',
    category: 'ground',
    subcategory: 'ground_stations',
    pricingType: 'per_unit',
    priceMin: 3,
    priceMax: 10,
    priceUnit: 'minute',
    certifications: ['FedRAMP', 'SOC_2', 'ISO_27001', 'NIST_800_171'],
    leadTime: '1-2 weeks',
    coverageArea: 'Global (12 locations)',
    specifications: { bands: 'S, X, UHF', dataRate: 'Up to 500 Mbps', integration: 'Native AWS (S3, EC2, Lambda)' },
    pastPerformance: 'Used by NASA JPL, Capella Space, BlackSky, Spire.',
    featured: true,
  },
  {
    companySlug: 'kongsberg-satellite-services',
    name: 'KSAT Ground Network',
    description: 'World\'s largest commercial ground station network with 200+ antennas at 25 sites including unique polar coverage. Full TT&C, data reception, and mission support services for LEO, MEO, and GEO satellites.',
    category: 'ground',
    subcategory: 'ground_stations',
    pricingType: 'subscription',
    priceMin: 5_000,
    priceMax: 50_000,
    priceUnit: 'month',
    certifications: ['ISO_9001', 'ISO_27001'],
    leadTime: '2-4 weeks',
    coverageArea: 'Global (including polar)',
    specifications: { antennas: '200+', sites: '25+', bands: 'UHF, S, X, Ka', polarCoverage: true },
    pastPerformance: 'Supports ESA, NASA, NOAA, and 50+ commercial operators.',
  },
  {
    companySlug: 'microsoft',
    name: 'Azure Orbital Ground Station',
    description: 'Cloud-integrated ground station service on Microsoft Azure. Connect satellites directly to Azure for processing, storage, and analytics. Built-in support for virtual ground station networks and multi-cloud architectures.',
    category: 'ground',
    subcategory: 'ground_stations',
    pricingType: 'per_unit',
    priceMin: 4,
    priceMax: 12,
    priceUnit: 'minute',
    certifications: ['FedRAMP', 'SOC_2', 'ISO_27001'],
    leadTime: '1-2 weeks',
    coverageArea: 'Global',
    specifications: { bands: 'S, X, Ka', integration: 'Azure native', processing: 'Azure Synapse, AI/ML' },
  },
  {
    companySlug: 'kratos-defense',
    name: 'OpenSpace Ground System Platform',
    description: 'Software-defined ground infrastructure platform for satellite operations. Virtualized, cloud-native ground system that replaces dedicated hardware with software. Supports multi-mission, multi-orbit operations from a single platform.',
    category: 'ground',
    subcategory: 'mission_control',
    pricingType: 'subscription',
    priceMin: 8_000,
    priceMax: 30_000,
    priceUnit: 'month',
    certifications: ['ITAR', 'ISO_9001', 'NIST_800_171'],
    leadTime: '4-8 weeks',
    coverageArea: 'Global',
    specifications: { architecture: 'Cloud-native, containerized', protocol: 'CCSDS', multiMission: true },
  },
  {
    companySlug: 'leaf-space',
    name: 'Leaf Line Ground Segment as a Service',
    description: 'Turnkey ground segment solution for smallsat and cubesat operators. End-to-end ground station network with automated scheduling, UHF/S/X-band support, and data delivery via API. Affordable access for startups and university missions.',
    category: 'ground',
    subcategory: 'ground_stations',
    pricingType: 'per_unit',
    priceMin: 2,
    priceMax: 6,
    priceUnit: 'minute',
    certifications: ['ISO_9001'],
    leadTime: '1-2 weeks',
    coverageArea: 'Global',
    specifications: { bands: 'UHF, S, X', targetMarket: 'Smallsat/CubeSat', api: 'REST API' },
  },
  {
    companySlug: 'analytical-graphics',
    name: 'STK Mission Analysis & Visualization',
    description: 'Industry-standard Systems Tool Kit (STK) for mission planning, orbit analysis, and visualization. Used by government and commercial operators for coverage analysis, conjunction assessment, and mission design.',
    category: 'ground',
    subcategory: 'data_processing',
    pricingType: 'subscription',
    priceMin: 5_000,
    priceMax: 50_000,
    priceUnit: 'year',
    certifications: ['ITAR', 'ISO_9001'],
    leadTime: 'Immediate',
    coverageArea: 'Software (global)',
    specifications: { platform: 'Desktop + Cloud', modules: 'Coverage, Conjunction, Comms, Chains', format: 'CCSDS, TLE, SP3' },
  },
  {
    companySlug: 'atlas-space-operations',
    name: 'Freedom Ground Network',
    description: 'Multi-band, cloud-integrated ground station network optimized for smallsat constellation operations. Automated scheduling, real-time telemetry processing, and data delivery through a unified platform.',
    category: 'ground',
    subcategory: 'antenna_networks',
    pricingType: 'subscription',
    priceMin: 3_000,
    priceMax: 20_000,
    priceUnit: 'month',
    certifications: ['ISO_9001', 'ISO_27001'],
    leadTime: '2-3 weeks',
    coverageArea: 'Global',
    specifications: { bands: 'UHF, S, X', schedulingMode: 'Automated', api: 'REST + GraphQL' },
  },

  // ===== MANUFACTURING & COMPONENTS (8 listings) =====
  {
    companySlug: 'york-space-systems',
    name: 'S-CLASS Satellite Bus Platform',
    description: 'High-performance, affordable satellite bus designed for rapid production. The S-CLASS platform supports payloads from 20-85 kg with standardized interfaces, enabling 5-month delivery from order to orbit-ready spacecraft.',
    category: 'manufacturing',
    subcategory: 'satellite_buses',
    pricingType: 'fixed',
    priceMin: 3_000_000,
    priceMax: 6_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'ISO_9001', 'AS9100'],
    leadTime: '5-8 months',
    capacity: '20+ units/year',
    specifications: { dryMass: '85 kg', payloadMass: '20-85 kg', power: '250-500W', designLife: '3-7 years' },
    pastPerformance: 'SDA Tranche 0 and Tranche 1 Transport Layer contracts.',
    featured: true,
  },
  {
    companySlug: 'aerojet-rocketdyne',
    name: 'Electric Propulsion Systems (XR-5, NEXT-C)',
    description: 'Hall-effect and ion electric propulsion systems for satellite station-keeping, orbit raising, and deep space missions. Flight-proven systems with thousands of hours of operational heritage.',
    category: 'manufacturing',
    subcategory: 'propulsion',
    pricingType: 'rfq_only',
    priceMin: 500_000,
    priceMax: 5_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'AS9100', 'Nadcap', 'NASA_QPL'],
    leadTime: '12-18 months',
    specifications: { types: 'Hall-effect, Ion (NEXT-C)', thrust: '75-237 mN', isp: '1,500-4,190s', power: '0.6-6.9 kW' },
    pastPerformance: 'Dawn mission, AEHF constellation, numerous GEO comsat programs.',
  },
  {
    companySlug: 'ball-aerospace',
    name: 'Precision Optical Instruments & Sensors',
    description: 'Custom optical instruments, telescopes, and sensor systems for Earth observation, astronomy, and defense applications. Heritage in building optics for the most demanding space missions.',
    category: 'manufacturing',
    subcategory: 'avionics',
    pricingType: 'rfq_only',
    priceMin: 1_000_000,
    priceMax: 50_000_000,
    priceUnit: 'instrument',
    certifications: ['ITAR', 'AS9100', 'ISO_9001', 'Nadcap'],
    leadTime: '18-36 months',
    specifications: { types: 'Optical, IR, Hyperspectral, Lidar', heritage: 'JWST, Hubble, Kepler instruments' },
    pastPerformance: 'JWST optics, ICESAT-2 laser altimeter, GPS III navigation payload.',
  },
  {
    companySlug: 'l3harris-technologies',
    name: 'Mission-Ready Avionics & Payloads',
    description: 'Complete avionics suites and mission payloads for military and commercial satellites. Command and data handling, power electronics, star trackers, and integrated payload solutions with extensive flight heritage.',
    category: 'manufacturing',
    subcategory: 'avionics',
    pricingType: 'rfq_only',
    priceMin: 2_000_000,
    priceMax: 20_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'AS9100', 'CMMI', 'Nadcap'],
    leadTime: '12-24 months',
    specifications: { products: 'CDH, Power Electronics, Star Trackers, Payloads', heritage: '300+ missions' },
    pastPerformance: 'SDA Transport Layer, GPS III, SBIRS, classified national security missions.',
  },
  {
    companySlug: 'redwire-corporation',
    name: 'Deployable Solar Arrays (ROSA)',
    description: 'Roll-Out Solar Array (ROSA) technology for high-power satellite applications. Compact stowage with large deployed area, providing 30+ kW for large spacecraft. Flight-proven on ISS and Gateway.',
    category: 'manufacturing',
    subcategory: 'solar_arrays',
    pricingType: 'rfq_only',
    priceMin: 2_000_000,
    priceMax: 15_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'AS9100', 'NASA_QPL'],
    leadTime: '12-18 months',
    specifications: { power: '20-150 kW', stowageRatio: '10:1', designLife: '15+ years', heritage: 'ISS, Gateway' },
    pastPerformance: 'ISS ROSA arrays, Lunar Gateway power system.',
  },
  {
    companySlug: 'rocket-lab',
    name: 'Photon Satellite Bus & Components',
    description: 'Configurable Photon satellite bus for LEO, MEO, GEO, and interplanetary missions. Available as complete spacecraft or components including star trackers, reaction wheels, solar panels, and separation systems.',
    category: 'manufacturing',
    subcategory: 'satellite_buses',
    pricingType: 'rfq_only',
    priceMin: 5_000_000,
    priceMax: 15_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'AS9100'],
    leadTime: '6-12 months',
    specifications: { dryMass: '50-250 kg', power: '200-1000W', propulsion: 'Curie engine', orbits: 'LEO to interplanetary' },
    pastPerformance: 'CAPSTONE lunar mission, NASA ESCAPADE Mars mission.',
  },
  {
    companySlug: 'virgin-orbit',
    name: 'Composite Structures & Thermal Systems',
    description: 'Lightweight composite structures, thermal management systems, and spacecraft structural components. Advanced composite materials with flight heritage for demanding thermal environments.',
    category: 'manufacturing',
    subcategory: 'structures',
    pricingType: 'rfq_only',
    priceMin: 100_000,
    priceMax: 2_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'AS9100', 'Nadcap'],
    leadTime: '8-16 weeks',
    specifications: { materials: 'Carbon fiber, aluminum honeycomb', thermalRange: '-180°C to +200°C' },
  },
  {
    companySlug: 'terran-orbital',
    name: 'Small Satellite Manufacturing (1-100 kg)',
    description: 'End-to-end smallsat manufacturing from concept to orbit-ready spacecraft. Terran Orbital produces CubeSats through 100kg-class microsatellites with integrated bus, payload, propulsion, and ground support equipment.',
    category: 'manufacturing',
    subcategory: 'satellite_buses',
    pricingType: 'rfq_only',
    priceMin: 500_000,
    priceMax: 5_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'AS9100'],
    leadTime: '6-12 months',
    capacity: '30+ units/year',
    specifications: { massRange: '1-100 kg', types: 'CubeSat, MicroSat, custom' },
    pastPerformance: 'Rivada constellation contract, Lockheed Martin Tranche 1 partner.',
  },

  // ===== ENGINEERING & CONSULTING (6 listings) =====
  {
    companySlug: 'the-aerospace-corporation',
    name: 'Independent Systems Engineering & Assurance',
    description: 'Independent systems engineering, mission assurance, and technical advisory services. The Aerospace Corporation provides objective analysis and assessment for the nation\'s most critical space programs.',
    category: 'engineering',
    subcategory: 'systems_engineering',
    pricingType: 'hourly',
    priceMin: 250,
    priceMax: 500,
    priceUnit: 'hour',
    certifications: ['ITAR', 'CMMI', 'ISO_9001'],
    leadTime: '2-4 weeks',
    specifications: { expertise: 'Mission assurance, systems review, launch certification, anomaly resolution' },
    pastPerformance: 'Supported every GPS launch, national security space programs, NASA flagship missions.',
  },
  {
    companySlug: 'bryce-tech',
    name: 'Space Market Intelligence & Analysis',
    description: 'Custom market research, competitive analysis, and strategic advisory for space industry companies and investors. Bryce Tech delivers rigorous data-driven analysis of space economy trends, funding, and market dynamics.',
    category: 'engineering',
    subcategory: 'regulatory',
    pricingType: 'fixed',
    priceMin: 25_000,
    priceMax: 200_000,
    priceUnit: 'project',
    certifications: [],
    leadTime: '2-6 weeks',
    specifications: { reports: 'Custom research, Start Up Space annual report, State of the Satellite Industry', clients: 'SIA, FAA, DARPA' },
  },
  {
    companySlug: 'saic',
    name: 'Space Systems Engineering & Integration',
    description: 'Full lifecycle space systems engineering from concept design through on-orbit operations. Mission design, simulation, test and integration, and launch support for government and commercial programs.',
    category: 'engineering',
    subcategory: 'systems_engineering',
    pricingType: 'rfq_only',
    priceMin: 100_000,
    priceMax: 10_000_000,
    priceUnit: 'project',
    certifications: ['ITAR', 'CMMI', 'ISO_9001', 'NIST_800_171'],
    leadTime: '4-8 weeks',
    specifications: { services: 'Mission design, test & integration, launch support, ops sustainment' },
    pastPerformance: 'NASA GSFC mission support, Space Force ground systems, missile defense.',
  },
  {
    companySlug: 'nanoracks',
    name: 'ISS Payload Integration & Testing',
    description: 'End-to-end payload integration and testing for experiments destined for the International Space Station. Nanoracks handles safety reviews, manifesting, integration, and on-orbit operations.',
    category: 'engineering',
    subcategory: 'testing',
    pricingType: 'fixed',
    priceMin: 50_000,
    priceMax: 500_000,
    priceUnit: 'payload',
    certifications: ['NASA_QPL', 'ISO_9001'],
    leadTime: '3-12 months',
    specifications: { platforms: 'CubeSat deployer, external platform, internal racks', services: 'Safety review, integration, ops' },
    pastPerformance: '1,600+ payloads deployed from ISS. Hundreds of research experiments.',
  },
  {
    companySlug: 'leidos',
    name: 'Space Mission Design & Orbit Analysis',
    description: 'Comprehensive mission design services including orbit selection, constellation design, link budget analysis, and mission planning. Expert team with heritage across civil, military, and commercial space programs.',
    category: 'engineering',
    subcategory: 'mission_design',
    pricingType: 'hourly',
    priceMin: 200,
    priceMax: 400,
    priceUnit: 'hour',
    certifications: ['ITAR', 'CMMI', 'ISO_9001', 'NIST_800_171'],
    leadTime: '2-4 weeks',
    specifications: { services: 'Orbit design, constellation optimization, link budget, mission planning' },
  },
  {
    companySlug: 'parsons-corporation',
    name: 'Space Regulatory & Licensing Consulting',
    description: 'Expert consulting for FCC licensing, ITU coordination, NOAA remote sensing licenses, and export control (ITAR/EAR) compliance. Navigate the complex regulatory landscape for commercial space operations.',
    category: 'engineering',
    subcategory: 'regulatory',
    pricingType: 'fixed',
    priceMin: 15_000,
    priceMax: 100_000,
    priceUnit: 'project',
    certifications: ['ITAR'],
    leadTime: '1-2 weeks',
    specifications: { services: 'FCC licensing, ITU filing, NOAA permits, ITAR/EAR, debris mitigation plans' },
  },

  // ===== SPACE ENVIRONMENT (5 listings) =====
  {
    companySlug: 'leolabs',
    name: 'LeoLabs Space Domain Awareness',
    description: 'High-fidelity LEO object tracking and conjunction assessment using a global network of phased-array radars. Real-time tracking of 20,000+ objects with precision maneuver detection and collision avoidance services.',
    category: 'environment',
    subcategory: 'debris_tracking',
    pricingType: 'subscription',
    priceMin: 5_000,
    priceMax: 50_000,
    priceUnit: 'month',
    certifications: ['ISO_27001'],
    leadTime: '1 week',
    coverageArea: 'LEO (200-2000 km)',
    specifications: { trackedObjects: '20,000+', accuracy: '<10m positional', updateRate: 'Every 2 hours', maneuverDetection: true },
    featured: true,
  },
  {
    companySlug: 'kayhan-space',
    name: 'Pathfinder Conjunction Assessment',
    description: 'AI-powered space traffic management platform. Automated conjunction assessment, collision avoidance maneuver planning, and mission-level space situational awareness for constellation operators.',
    category: 'environment',
    subcategory: 'conjunction_assessment',
    pricingType: 'subscription',
    priceMin: 2_000,
    priceMax: 15_000,
    priceUnit: 'month',
    certifications: [],
    leadTime: 'Immediate',
    coverageArea: 'All orbits',
    specifications: { platform: 'Cloud-based SaaS', features: 'Automated alerts, maneuver planning, fleet management' },
  },
  {
    companySlug: 'exoanalytic-solutions',
    name: 'ExoAnalytic Space Domain Awareness',
    description: 'Global network of optical sensors providing real-time space domain awareness. Track objects in all orbital regimes including GEO with astrometric and photometric observations.',
    category: 'environment',
    subcategory: 'debris_tracking',
    pricingType: 'subscription',
    priceMin: 10_000,
    priceMax: 100_000,
    priceUnit: 'month',
    certifications: ['ITAR', 'ISO_27001'],
    coverageArea: 'LEO to GEO+',
    specifications: { sensors: '300+ optical telescopes', orbits: 'LEO, MEO, GEO, HEO, cislunar', products: 'Tracking, characterization, maneuver detection' },
    pastPerformance: 'Space Force contracts, allied nation SSA sharing.',
  },
  {
    companySlug: 'noaa',
    name: 'Space Weather Prediction Center Data',
    description: 'Authoritative space weather forecasting and monitoring services. Solar flare alerts, geomagnetic storm warnings, radiation belt models, and solar wind data for satellite operators and mission planners.',
    category: 'environment',
    subcategory: 'weather_radiation',
    pricingType: 'subscription',
    priceMin: 0,
    priceMax: 0,
    priceUnit: 'free',
    certifications: [],
    leadTime: 'Immediate',
    coverageArea: 'Global',
    specifications: { products: 'Kp index, GOES particle flux, solar flare alerts, CME tracking', latency: 'Real-time to 3-day forecast' },
  },
  {
    companySlug: 'slingshot-aerospace',
    name: 'Slingshot Beacon Space Domain Awareness',
    description: 'Comprehensive space domain awareness platform combining data from multiple sensor networks with AI analytics. Beacon provides conjunction screening, object characterization, and pattern-of-life analysis.',
    category: 'environment',
    subcategory: 'conjunction_assessment',
    pricingType: 'subscription',
    priceMin: 5_000,
    priceMax: 30_000,
    priceUnit: 'month',
    certifications: ['ISO_27001'],
    leadTime: '1 week',
    coverageArea: 'All orbits',
    specifications: { features: 'Conjunction screening, object characterization, pattern-of-life, anomaly detection' },
  },

  // ===== R&D SERVICES (4 listings) =====
  {
    companySlug: 'nanoracks',
    name: 'ISS Microgravity Research Platform',
    description: 'Access to the International Space Station for microgravity research. Accommodate experiments in internal racks, external platforms, and cubesat deployers. Full experiment design support and astronaut interaction available.',
    category: 'rnd',
    subcategory: 'microgravity',
    pricingType: 'fixed',
    priceMin: 35_000,
    priceMax: 300_000,
    priceUnit: 'experiment',
    certifications: ['NASA_QPL'],
    leadTime: '6-12 months',
    coverageArea: 'ISS (LEO)',
    specifications: { platforms: 'NanoRacks Modules, Bishop Airlock, CubeSat Deployer', crewTime: 'Available', downmass: 'Available' },
  },
  {
    companySlug: 'axiom-space',
    name: 'Private Astronaut Mission to ISS',
    description: 'Organize private astronaut missions to the International Space Station for research, technology demonstration, and commercial activities. Full mission support from training through on-orbit operations.',
    category: 'rnd',
    subcategory: 'tech_demo',
    pricingType: 'rfq_only',
    priceMin: 55_000_000,
    priceMax: 55_000_000,
    priceUnit: 'seat',
    certifications: ['NASA_QPL'],
    leadTime: '12-18 months',
    specifications: { vehicle: 'SpaceX Dragon', duration: '10-14 days', crew: 'Up to 4', activities: 'Research, tech demo, commercial' },
    pastPerformance: 'Ax-1 (2022), Ax-2 (2023), Ax-3 (2024) successful private missions.',
  },
  {
    companySlug: 'made-in-space',
    name: 'ZBLAN Fiber Optic Manufacturing',
    description: 'Microgravity manufacturing of high-purity ZBLAN fiber optics. Fibers produced in space have 10-100x lower signal loss than Earth-manufactured equivalents, enabling next-generation telecommunications and sensing applications.',
    category: 'rnd',
    subcategory: 'materials',
    pricingType: 'rfq_only',
    priceMin: 100_000,
    priceMax: 1_000_000,
    priceUnit: 'batch',
    certifications: ['NASA_QPL'],
    leadTime: '6-12 months',
    coverageArea: 'ISS manufacturing',
    specifications: { product: 'ZBLAN fluoride glass fiber', improvement: '10-100x lower attenuation', applications: 'Telecom, medical, sensing' },
  },
  {
    companySlug: 'virgin-galactic',
    name: 'Suborbital Research Flights',
    description: 'Suborbital research flights aboard SpaceShipTwo for microgravity experiments, Earth observation, and atmospheric research. 3-4 minutes of high-quality microgravity with researcher-tended experiment capability.',
    category: 'rnd',
    subcategory: 'microgravity',
    pricingType: 'fixed',
    priceMin: 250_000,
    priceMax: 600_000,
    priceUnit: 'seat',
    certifications: [],
    leadTime: '3-12 months',
    specifications: { microgravityDuration: '3-4 minutes', altitude: '80+ km', payloadMass: 'Up to 20 kg', humanTended: true },
  },

  // ===== HUMAN SPACEFLIGHT (4 listings) =====
  {
    companySlug: 'spacex',
    name: 'Crew Dragon Crew Transportation',
    description: 'Human-rated crew transportation to low Earth orbit aboard SpaceX Crew Dragon. Supports missions to the ISS, free-flying orbital missions, and future commercial space station access. NASA Commercial Crew certified.',
    category: 'human',
    subcategory: 'crew_transport',
    pricingType: 'rfq_only',
    priceMin: 55_000_000,
    priceMax: 55_000_000,
    priceUnit: 'seat',
    certifications: ['ITAR', 'NASA_QPL', 'AS9100'],
    leadTime: '12-24 months',
    specifications: { crew: 'Up to 4', duration: 'Up to 210 days (ISS)', pressurizedVolume: '9.3 m³' },
    pastPerformance: '10+ crewed missions to ISS. Inspiration4 private orbital mission.',
  },
  {
    companySlug: 'blue-origin',
    name: 'New Shepard Suborbital Experience',
    description: 'Suborbital spaceflight experience aboard Blue Origin New Shepard. Six passengers experience 3+ minutes of weightlessness and views from above the Karman line. Fully autonomous capsule with the largest windows in spaceflight.',
    category: 'human',
    subcategory: 'tourism',
    pricingType: 'rfq_only',
    priceMin: 200_000,
    priceMax: 500_000,
    priceUnit: 'seat',
    certifications: [],
    leadTime: '3-6 months',
    specifications: { altitude: '100+ km', duration: '11 minutes total', weightlessness: '3+ minutes', crew: 6, windows: 'Largest in spaceflight' },
    pastPerformance: '25+ successful flights, 40+ passengers.',
  },
  {
    companySlug: 'axiom-space',
    name: 'Axiom Station Commercial Habitat',
    description: 'Commercial space station module for research, manufacturing, and habitation. Axiom Station will provide sovereign astronaut access, microgravity research labs, and commercial facilities in low Earth orbit.',
    category: 'human',
    subcategory: 'habitats',
    pricingType: 'rfq_only',
    priceMin: 5_000_000,
    priceMax: 50_000_000,
    priceUnit: 'module access/year',
    certifications: ['NASA_QPL', 'ISO_9001'],
    leadTime: '2027+',
    specifications: { pressurizedVolume: '500+ m³ (planned)', labs: 'Research, manufacturing, filming', access: 'SpaceX Dragon, Boeing Starliner' },
  },
  {
    companySlug: 'sierra-space',
    name: 'Dream Chaser Cargo Transport',
    description: 'Reusable spaceplane for cargo transport to the ISS and future commercial stations. Dream Chaser provides gentle runway landings enabling return of sensitive experiments and time-critical cargo.',
    category: 'human',
    subcategory: 'crew_transport',
    pricingType: 'rfq_only',
    priceMin: 10_000_000,
    priceMax: 50_000_000,
    priceUnit: 'mission',
    certifications: ['ITAR', 'NASA_QPL', 'AS9100'],
    leadTime: '12-24 months',
    specifications: { cargoUp: '5,500 kg', cargoDown: '1,850 kg', landingType: 'Runway', reusable: true },
    pastPerformance: 'NASA CRS-2 contract for ISS resupply missions.',
  },

  // ===== SPACE POWER (3 listings) =====
  {
    companySlug: 'redwire-corporation',
    name: 'Space-Grade Solar Array Systems',
    description: 'High-efficiency deployable solar array systems for satellites and space stations. Multi-junction GaAs cells with automated deployment. Scalable from small satellites to 150+ kW class platforms.',
    category: 'power',
    subcategory: 'space_solar',
    pricingType: 'rfq_only',
    priceMin: 500_000,
    priceMax: 10_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'AS9100', 'NASA_QPL'],
    leadTime: '8-18 months',
    specifications: { cellType: 'Multi-junction GaAs', efficiency: '30-33%', powerRange: '500W to 150kW', designLife: '15+ years' },
  },
  {
    companySlug: 'bwxt',
    name: 'Nuclear Thermal Propulsion & Power',
    description: 'Space nuclear thermal propulsion and fission surface power systems. BWXT develops compact nuclear reactors for deep space propulsion and surface power for Moon and Mars operations.',
    category: 'power',
    subcategory: 'in_orbit_power',
    pricingType: 'rfq_only',
    priceMin: 50_000_000,
    priceMax: 500_000_000,
    priceUnit: 'system',
    certifications: ['ITAR', 'ISO_9001'],
    leadTime: '36-60 months',
    specifications: { type: 'Nuclear Thermal Propulsion / Fission Surface Power', power: '10-40 kWe', thrust: '25,000 lbf (NTP)' },
    pastPerformance: 'NASA DRACO nuclear thermal propulsion contract. DOE nuclear reactor heritage.',
  },
  {
    companySlug: 'northrop-grumman',
    name: 'UltraFlex Solar Array Wings',
    description: 'Proven UltraFlex deployable solar arrays for deep space and high-power missions. Fan-fold deployment design delivers high power density with low mass. Flight heritage on InSight, Phoenix, and Lucy missions.',
    category: 'power',
    subcategory: 'space_solar',
    pricingType: 'rfq_only',
    priceMin: 3_000_000,
    priceMax: 20_000_000,
    priceUnit: 'unit',
    certifications: ['ITAR', 'AS9100', 'NASA_QPL'],
    leadTime: '12-24 months',
    specifications: { design: 'UltraFlex fan-fold', power: '1-20 kW', mass: 'Industry-leading W/kg' },
    pastPerformance: 'InSight Mars lander, Phoenix Mars lander, Lucy asteroid mission, Cygnus.',
  },
];

// ============================================================
// SAMPLE RFQs — 12 RFQs with varied categories and statuses
// ============================================================

interface RFQData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  budgetMin?: number;
  budgetMax?: number;
  deadline?: Date;
  deliveryDate?: Date;
  complianceReqs: string[];
  isPublic: boolean;
  status: string;
}

const RFQS: RFQData[] = [
  {
    title: 'Rideshare Launch for 6U CubeSat Constellation (4 units)',
    description: 'Seeking rideshare launch services for a constellation of four 6U CubeSats to sun-synchronous orbit (500-550 km). Each satellite weighs approximately 12 kg. Looking for a launch window in Q3-Q4 2026. Standard ESPA-compatible or CubeSat deployer interface required.',
    category: 'launch',
    subcategory: 'rideshare',
    budgetMin: 200_000,
    budgetMax: 400_000,
    deadline: new Date('2026-04-15'),
    deliveryDate: new Date('2026-10-01'),
    complianceReqs: ['ITAR'],
    isPublic: true,
    status: 'open',
  },
  {
    title: 'High-Resolution SAR Imagery — Arctic Region Monitoring',
    description: 'Require ongoing synthetic aperture radar (SAR) imagery of Arctic shipping routes and coastal infrastructure. Minimum 1m resolution, weekly revisit over 15 areas of interest. Need all-weather, day-night capability. 12-month contract with option to extend.',
    category: 'satellite',
    subcategory: 'earth_observation',
    budgetMin: 80_000,
    budgetMax: 200_000,
    deadline: new Date('2026-03-30'),
    complianceReqs: ['ITAR', 'ISO_27001'],
    isPublic: true,
    status: 'open',
  },
  {
    title: 'GEO Satellite Life Extension Service',
    description: 'Our C-band communications satellite at 75°E is approaching end of propellant life with 8+ years of payload capability remaining. Seeking Mission Extension Vehicle (MEV) or similar service to extend operations by at least 5 years.',
    category: 'in_space',
    subcategory: 'satellite_servicing',
    budgetMin: 40_000_000,
    budgetMax: 80_000_000,
    deadline: new Date('2026-06-01'),
    deliveryDate: new Date('2027-06-01'),
    complianceReqs: ['ITAR', 'ISO_9001'],
    isPublic: true,
    status: 'open',
  },
  {
    title: 'Ground Station Network for LEO Constellation (12 satellites)',
    description: 'Need ground station as a service for a 12-satellite LEO constellation in polar orbit. Requirements: UHF and S-band, 8+ contacts per satellite per day, data latency <2 hours, integration with our existing AWS pipeline. Minimum 6 ground station locations with polar coverage.',
    category: 'ground',
    subcategory: 'ground_stations',
    budgetMin: 30_000,
    budgetMax: 80_000,
    deadline: new Date('2026-05-01'),
    complianceReqs: ['ISO_27001'],
    isPublic: true,
    status: 'open',
  },
  {
    title: 'Custom 150kg-Class Satellite Bus for EO Mission',
    description: 'Procuring a custom satellite bus for an Earth observation mission. Requirements: 150kg class, 500W+ power, 3-axis stabilized, SSO-compatible, 5-year design life. Must accommodate our proprietary hyperspectral imager (40kg, 200W). ITAR and AS9100 required.',
    category: 'manufacturing',
    subcategory: 'satellite_buses',
    budgetMin: 4_000_000,
    budgetMax: 7_000_000,
    deadline: new Date('2026-04-30'),
    deliveryDate: new Date('2027-03-01'),
    complianceReqs: ['ITAR', 'AS9100'],
    isPublic: true,
    status: 'evaluating',
  },
  {
    title: 'Independent Mission Assurance Review — SDA Tranche 2 Bid',
    description: 'Seeking independent systems engineering and mission assurance support for our Space Development Agency Tranche 2 Transport Layer proposal. Need heritage review, risk assessment, and CDR preparation support. Must have active security clearance.',
    category: 'engineering',
    subcategory: 'systems_engineering',
    budgetMin: 200_000,
    budgetMax: 500_000,
    deadline: new Date('2026-03-15'),
    complianceReqs: ['ITAR', 'CMMI', 'NIST_800_171'],
    isPublic: false,
    status: 'open',
  },
  {
    title: 'Space Weather Alert Service for Constellation Operations',
    description: 'Need real-time space weather monitoring and alerting service for a LEO communications constellation. Requirements: solar flare prediction, geomagnetic storm alerts, radiation belt models, and automated safe-mode recommendations for our operations center.',
    category: 'environment',
    subcategory: 'weather_radiation',
    budgetMin: 20_000,
    budgetMax: 60_000,
    deadline: new Date('2026-04-15'),
    complianceReqs: [],
    isPublic: true,
    status: 'open',
  },
  {
    title: 'Microgravity Protein Crystal Growth Experiment — ISS',
    description: 'Pharmaceutical company seeking access to ISS microgravity for protein crystal growth experiments. Need 2-3 experiment cycles over 12 months. Requires temperature-controlled storage, crew time for setup, and downmass for sample return.',
    category: 'rnd',
    subcategory: 'microgravity',
    budgetMin: 100_000,
    budgetMax: 300_000,
    deadline: new Date('2026-05-30'),
    complianceReqs: ['NASA_QPL'],
    isPublic: true,
    status: 'open',
  },
  {
    title: 'Electric Propulsion System for GEO Communications Satellite',
    description: 'Procuring electric propulsion subsystem for a 3,500 kg GEO communications satellite. Need hall-effect thrusters for orbit raising and station keeping. Minimum 4,000s Isp, 15-year design life. Must include PPU, propellant management, and integration support.',
    category: 'manufacturing',
    subcategory: 'propulsion',
    budgetMin: 2_000_000,
    budgetMax: 6_000_000,
    deadline: new Date('2026-06-15'),
    deliveryDate: new Date('2027-09-01'),
    complianceReqs: ['ITAR', 'AS9100', 'Nadcap'],
    isPublic: true,
    status: 'open',
  },
  {
    title: 'Conjunction Assessment for 200-Satellite LEO Constellation',
    description: 'Need automated conjunction assessment and collision avoidance service for our growing LEO constellation. Currently 50 satellites, scaling to 200 by 2027. Need API integration with our flight dynamics system, automated alerts, and maneuver recommendations.',
    category: 'environment',
    subcategory: 'conjunction_assessment',
    budgetMin: 40_000,
    budgetMax: 120_000,
    deadline: new Date('2026-04-01'),
    complianceReqs: ['ISO_27001'],
    isPublic: true,
    status: 'evaluating',
  },
  {
    title: 'FCC & ITU Licensing Support for Ka-Band NGSO System',
    description: 'Seeking regulatory consulting for FCC and ITU licensing of a planned non-geostationary Ka-band communications constellation (48 satellites). Need spectrum coordination, ITU filing preparation, FCC market access application, and debris mitigation plan.',
    category: 'engineering',
    subcategory: 'regulatory',
    budgetMin: 100_000,
    budgetMax: 300_000,
    deadline: new Date('2026-05-15'),
    complianceReqs: [],
    isPublic: true,
    status: 'open',
  },
  {
    title: 'Dedicated Launch to 600km SSO — 800kg Payload',
    description: 'Need a dedicated launch for a single 800kg Earth observation satellite to 600km sun-synchronous orbit. Launch window: H1 2027. Fairing must accommodate 1.5m diameter payload. Prefer US launch provider for ITAR simplicity.',
    category: 'launch',
    subcategory: 'dedicated',
    budgetMin: 15_000_000,
    budgetMax: 25_000_000,
    deadline: new Date('2026-07-01'),
    deliveryDate: new Date('2027-06-01'),
    complianceReqs: ['ITAR'],
    isPublic: true,
    status: 'open',
  },
];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('=== SpaceNexus Marketplace Seed Script ===\n');

  // Step 1: Seed service listings
  console.log('Step 1: Seeding service listings...');
  let listingCount = 0;
  let skippedCount = 0;

  for (const listing of LISTINGS) {
    // Look up the company by slug
    const company = await prisma.companyProfile.findUnique({
      where: { slug: listing.companySlug },
      select: { id: true, name: true },
    });

    if (!company) {
      console.log(`  ⚠ Company not found: ${listing.companySlug} — skipping "${listing.name}"`);
      skippedCount++;
      continue;
    }

    const slug = `${slugify(listing.name)}-${Date.now().toString(36)}`;

    // Check for duplicate by name + company
    const existing = await prisma.serviceListing.findFirst({
      where: { name: listing.name, companyId: company.id },
    });
    if (existing) {
      console.log(`  ⏭ Already exists: "${listing.name}" by ${company.name}`);
      continue;
    }

    await prisma.serviceListing.create({
      data: {
        companyId: company.id,
        slug,
        name: listing.name,
        description: listing.description,
        category: listing.category,
        subcategory: listing.subcategory || null,
        pricingType: listing.pricingType,
        priceMin: listing.priceMin || null,
        priceMax: listing.priceMax || null,
        priceUnit: listing.priceUnit || null,
        pricingNotes: listing.pricingNotes || null,
        specifications: (listing.specifications || undefined) as any,
        certifications: listing.certifications,
        pastPerformance: listing.pastPerformance || null,
        leadTime: listing.leadTime || null,
        capacity: listing.capacity || null,
        coverageArea: listing.coverageArea || null,
        status: 'active',
        featured: listing.featured || false,
        viewCount: Math.floor(Math.random() * 500) + 10,
        inquiryCount: Math.floor(Math.random() * 30),
      },
    });

    listingCount++;
    console.log(`  ✓ Created: "${listing.name}" by ${company.name} [${listing.category}]`);
  }

  console.log(`\n  Listings: ${listingCount} created, ${skippedCount} skipped (company not found)\n`);

  // Step 2: Create a system user for RFQs (or use first admin user)
  console.log('Step 2: Finding/creating RFQ buyer user...');
  let buyerUser = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { id: true, email: true },
  });

  if (!buyerUser) {
    buyerUser = await prisma.user.findFirst({
      select: { id: true, email: true },
    });
  }

  if (!buyerUser) {
    console.log('  ⚠ No users found in database. Skipping RFQ seeding.');
    console.log('  Create a user account first, then re-run this script.');
    console.log('\n=== Seed complete (listings only) ===');
    await prisma.$disconnect();
    return;
  }

  console.log(`  Using buyer: ${buyerUser.email} (${buyerUser.id})`);

  // Step 3: Seed RFQs
  console.log('\nStep 3: Seeding RFQs...');
  let rfqCount = 0;

  for (const rfqData of RFQS) {
    const slug = `rfq-${slugify(rfqData.title)}-${Date.now().toString(36)}`;

    // Check for duplicate
    const existing = await prisma.rFQ.findFirst({
      where: { title: rfqData.title, buyerUserId: buyerUser.id },
    });
    if (existing) {
      console.log(`  ⏭ Already exists: "${rfqData.title}"`);
      continue;
    }

    const rfq = await prisma.rFQ.create({
      data: {
        slug,
        buyerUserId: buyerUser.id,
        title: rfqData.title,
        description: rfqData.description,
        category: rfqData.category,
        subcategory: rfqData.subcategory || null,
        budgetMin: rfqData.budgetMin || null,
        budgetMax: rfqData.budgetMax || null,
        deadline: rfqData.deadline || null,
        deliveryDate: rfqData.deliveryDate || null,
        complianceReqs: rfqData.complianceReqs,
        isPublic: rfqData.isPublic,
        status: rfqData.status,
      },
    });

    // Step 4: Create matches for each RFQ (best listing per company)
    const matchingListings = await prisma.serviceListing.findMany({
      where: {
        category: rfqData.category,
        status: 'active',
      },
      select: { id: true, companyId: true, certifications: true, priceMin: true, subcategory: true },
      take: 20,
    });

    // Deduplicate by companyId — keep first listing per company
    const seenCompanies = new Set<string>();
    const uniqueListings = matchingListings.filter(l => {
      if (seenCompanies.has(l.companyId)) return false;
      seenCompanies.add(l.companyId);
      return true;
    });

    for (const listing of uniqueListings) {
      let score = 30; // Category match base
      const reasons: Record<string, number> = { category: 30 };

      if (rfqData.subcategory && listing.subcategory === rfqData.subcategory) {
        score += 10;
        reasons.subcategory = 10;
      }

      if (rfqData.budgetMax && listing.priceMin) {
        if (listing.priceMin <= rfqData.budgetMax) {
          score += 20;
          reasons.price = 20;
        } else {
          score += 5;
          reasons.price = 5;
        }
      } else {
        score += 10;
        reasons.price = 10;
      }

      if (rfqData.complianceReqs.length > 0 && listing.certifications.length > 0) {
        const matched = rfqData.complianceReqs.filter(r =>
          listing.certifications.some(c => c.toLowerCase().includes(r.toLowerCase()))
        );
        const certScore = Math.round((matched.length / rfqData.complianceReqs.length) * 20);
        score += certScore;
        reasons.certifications = certScore;
      } else {
        score += 10;
        reasons.certifications = 10;
      }

      score += 10;
      reasons.performance = 10;
      score += 5;
      reasons.responsiveness = 5;

      await prisma.rFQProviderMatch.create({
        data: {
          rfqId: rfq.id,
          listingId: listing.id,
          companyId: listing.companyId,
          matchScore: score,
          matchReasons: reasons as any,
          notified: Math.random() > 0.3,
        },
      });
    }

    rfqCount++;
    console.log(`  ✓ Created RFQ: "${rfqData.title}" [${rfqData.category}] — ${matchingListings.length} matches`);
  }

  console.log(`\n  RFQs: ${rfqCount} created with provider matches\n`);

  // Step 5: Summary stats
  const totalListings = await prisma.serviceListing.count({ where: { status: 'active' } });
  const totalRFQs = await prisma.rFQ.count();
  const totalMatches = await prisma.rFQProviderMatch.count();

  console.log('=== Marketplace Seed Summary ===');
  console.log(`  Active listings: ${totalListings}`);
  console.log(`  RFQs: ${totalRFQs}`);
  console.log(`  Provider matches: ${totalMatches}`);
  console.log('=== Done! ===');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
