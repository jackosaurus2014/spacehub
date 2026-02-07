import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type {
  OrbitalServiceCategory,
  OrbitalServiceAvailability,
  OrbitalPricingModel,
  OrbitalServiceStatus,
  OrbitalContractType,
  OrbitalCustomerType,
} from '@/types';

// ============================================================
// Seed Data - Orbital Services
// ============================================================

interface OrbitalServiceSeed {
  slug: string;
  providerName: string;
  providerSlug?: string;
  providerCountry: string;
  providerWebsite?: string;
  category: OrbitalServiceCategory;
  serviceType: string;
  serviceName: string;
  description: string;
  specifications?: Record<string, unknown>;
  orbitType?: string;
  coverage?: string;
  availability: OrbitalServiceAvailability;
  pricingModel: OrbitalPricingModel;
  priceMin?: number;
  priceMax?: number;
  priceUnit?: string;
  pricingNotes?: string;
  launchCostBasis?: number;
  operationalCost?: number;
  marketRate?: number;
  marginEstimate?: number;
  status: OrbitalServiceStatus;
  launchDate?: Date;
}

export const ORBITAL_SERVICES_SEED: OrbitalServiceSeed[] = [
  // ============================================================
  // Earth Observation Services
  // ============================================================
  {
    slug: 'satellogic-standard-tasking',
    providerName: 'Satellogic',
    providerCountry: 'ARG',
    providerWebsite: 'https://satellogic.com',
    category: 'earth_observation',
    serviceType: 'optical_imagery',
    serviceName: 'Standard Tasking',
    description: '70cm multispectral imagery with rapid revisit. Industry-leading transparent pricing for commercial EO.',
    specifications: { resolution: '70cm', bands: 'Multispectral', revisit: '12 hours' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'per_km2',
    priceMin: 8,
    priceMax: 12,
    priceUnit: '$/km²',
    pricingNotes: 'Minimum order 50km². Volume discounts available for 12-24 month commitments.',
    launchCostBasis: 5500,
    marketRate: 10,
    marginEstimate: 45,
    status: 'active',
  },
  {
    slug: 'maxar-worldview-legion',
    providerName: 'Maxar Technologies',
    providerSlug: 'maxar-technologies',
    providerCountry: 'USA',
    providerWebsite: 'https://maxar.com',
    category: 'earth_observation',
    serviceType: 'optical_imagery',
    serviceName: 'WorldView Legion',
    description: '30cm resolution imagery from next-gen constellation. Best-in-class resolution for detailed analysis.',
    specifications: { resolution: '30cm', bands: 'Panchromatic + 8-band MS', revisit: '15 passes/day' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'per_km2',
    priceMin: 25,
    priceMax: 29,
    priceUnit: '$/km²',
    pricingNotes: 'Minimum 100km² for new tasking. Archive imagery from $14/km².',
    launchCostBasis: 5500,
    marketRate: 27,
    marginEstimate: 55,
    status: 'active',
  },
  {
    slug: 'planet-daily-imagery',
    providerName: 'Planet Labs',
    providerSlug: 'planet-labs',
    providerCountry: 'USA',
    providerWebsite: 'https://planet.com',
    category: 'earth_observation',
    serviceType: 'optical_imagery',
    serviceName: 'PlanetScope Daily',
    description: 'Daily global coverage at 3m resolution from 200+ satellite constellation.',
    specifications: { resolution: '3m', bands: '4-band', revisit: 'Daily' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'subscription',
    priceMin: 500,
    priceMax: 50000,
    priceUnit: '$/month',
    pricingNotes: 'Subscription tiers based on AOI size and download limits.',
    launchCostBasis: 5500,
    marketRate: 2500,
    marginEstimate: 60,
    status: 'active',
  },
  {
    slug: 'blacksky-on-demand',
    providerName: 'BlackSky',
    providerCountry: 'USA',
    providerWebsite: 'https://blacksky.com',
    category: 'earth_observation',
    serviceType: 'optical_imagery',
    serviceName: 'On-Demand Tasking',
    description: '1m resolution imagery with rapid revisit and fast delivery. Spectra AI analytics included.',
    specifications: { resolution: '1m', bands: 'RGB + NIR', revisit: 'Multiple/day' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'per_km2',
    priceMin: 6,
    priceMax: 10,
    priceUnit: '$/km²',
    pricingNotes: 'Rush delivery available. Analytics add-ons priced separately.',
    launchCostBasis: 5500,
    marketRate: 8,
    marginEstimate: 40,
    status: 'active',
  },
  {
    slug: 'capella-sar-spotlight',
    providerName: 'Capella Space',
    providerCountry: 'USA',
    providerWebsite: 'https://capellaspace.com',
    category: 'earth_observation',
    serviceType: 'sar_imagery',
    serviceName: 'SAR Spotlight',
    description: '50cm SAR imagery - see through clouds, day or night. Best commercial SAR resolution.',
    specifications: { resolution: '50cm', mode: 'Spotlight', polarization: 'HH/VV' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'per_km2',
    priceMin: 15,
    priceMax: 25,
    priceUnit: '$/km²',
    pricingNotes: 'Wide area mode available at lower price point. Change detection bundles available.',
    launchCostBasis: 5500,
    marketRate: 20,
    marginEstimate: 50,
    status: 'active',
  },
  {
    slug: 'iceye-sar-monitoring',
    providerName: 'ICEYE',
    providerCountry: 'FIN',
    providerWebsite: 'https://iceye.com',
    category: 'earth_observation',
    serviceType: 'sar_imagery',
    serviceName: 'SAR Monitoring Service',
    description: '1m SAR imagery from largest commercial SAR constellation. Persistent monitoring solutions.',
    specifications: { resolution: '1m', mode: 'Strip/Spot', constellation: '29+ satellites' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'per_km2',
    priceMin: 12,
    priceMax: 20,
    priceUnit: '$/km²',
    pricingNotes: 'Natural catastrophe response pricing available. Multi-year contracts negotiable.',
    launchCostBasis: 5500,
    marketRate: 16,
    marginEstimate: 45,
    status: 'active',
  },
  {
    slug: 'umbra-sar-imaging',
    providerName: 'Umbra',
    providerCountry: 'USA',
    providerWebsite: 'https://umbra.space',
    category: 'earth_observation',
    serviceType: 'sar_imagery',
    serviceName: 'SAR Imaging Service',
    description: '25cm ultra-high resolution SAR. Open data program for researchers.',
    specifications: { resolution: '25cm', mode: 'Spotlight', polarization: 'Single/Dual' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'per_km2',
    priceMin: 10,
    priceMax: 18,
    priceUnit: '$/km²',
    pricingNotes: 'Academic discounts available. API access included.',
    launchCostBasis: 5500,
    marketRate: 14,
    marginEstimate: 42,
    status: 'active',
  },
  {
    slug: 'airbus-pleiades-neo',
    providerName: 'Airbus Defence and Space',
    providerCountry: 'FRA',
    providerWebsite: 'https://intelligence.airbus.com',
    category: 'earth_observation',
    serviceType: 'optical_imagery',
    serviceName: 'Pleiades Neo',
    description: '30cm native resolution with 12-band multispectral. Industry benchmark for geospatial intelligence.',
    specifications: { resolution: '30cm', bands: '12-band', swath: '14km' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'per_km2',
    priceMin: 15,
    priceMax: 25,
    priceUnit: '$/km²',
    pricingNotes: 'Archive from €3.80/km². Volume licensing available.',
    launchCostBasis: 8000,
    marketRate: 20,
    marginEstimate: 50,
    status: 'active',
  },

  // ============================================================
  // In-Orbit Computing Services
  // ============================================================
  {
    slug: 'starcloud-gpu-service',
    providerName: 'Starcloud',
    providerCountry: 'USA',
    providerWebsite: 'https://starcloud.ai',
    category: 'in_orbit_computing',
    serviceType: 'gpu_compute',
    serviceName: 'Orbital GPU Service',
    description: 'First operational space data center with Nvidia H100 GPUs. 10x energy cost advantage over ground.',
    specifications: { gpu: 'Nvidia H100', power: 'Solar', latency: '20-40ms' },
    orbitType: 'LEO',
    coverage: 'Global',
    availability: 'limited',
    pricingModel: 'per_hour',
    priceMin: 3,
    priceMax: 6,
    priceUnit: '$/GPU-hour',
    pricingNotes: 'Beta pricing. Reserved capacity contracts available at discount.',
    launchCostBasis: 5500,
    operationalCost: 500000,
    marginEstimate: 60,
    status: 'active',
  },
  {
    slug: 'orbitsedge-satcloud',
    providerName: 'OrbitsEdge',
    providerCountry: 'USA',
    providerWebsite: 'https://orbitsedge.com',
    category: 'in_orbit_computing',
    serviceType: 'edge_compute',
    serviceName: 'SatCloud Edge',
    description: 'Orbital edge computing for satellite data processing. Reduce downlink costs with on-orbit analysis.',
    specifications: { compute: 'ARM-based', memory: '64GB', storage: '2TB NVMe' },
    orbitType: 'LEO',
    coverage: 'Global',
    availability: 'limited',
    pricingModel: 'per_hour',
    priceMin: 0.5,
    priceMax: 2,
    priceUnit: '$/hour',
    pricingNotes: 'Payload integration services available. Custom ML model deployment.',
    launchCostBasis: 5500,
    operationalCost: 200000,
    marginEstimate: 50,
    status: 'beta',
  },
  {
    slug: 'lumen-orbit-ai',
    providerName: 'Lumen Orbit',
    providerCountry: 'USA',
    providerWebsite: 'https://lumenorbit.com',
    category: 'in_orbit_computing',
    serviceType: 'ai_inference',
    serviceName: 'Orbital AI Inference',
    description: 'AI/ML inference at the edge of space. Optimized for Earth observation analytics.',
    specifications: { accelerator: 'Custom ASIC', models: 'Computer Vision', throughput: '1000 images/hour' },
    orbitType: 'LEO',
    coverage: 'Global',
    availability: 'coming_soon',
    pricingModel: 'custom',
    priceUnit: 'Contact',
    pricingNotes: 'Launching 2026. Early access program available.',
    launchCostBasis: 5500,
    operationalCost: 300000,
    marginEstimate: 55,
    status: 'planned',
    launchDate: new Date('2026-06-01'),
  },
  {
    slug: 'axiom-orbital-datacenter',
    providerName: 'Axiom Space',
    providerSlug: 'axiom-space',
    providerCountry: 'USA',
    providerWebsite: 'https://axiomspace.com',
    category: 'in_orbit_computing',
    serviceType: 'datacenter',
    serviceName: 'Orbital Data Center',
    description: 'Commercial space station with integrated computing facilities. Unique microgravity environment.',
    specifications: { environment: 'Pressurized module', power: '25kW', cooling: 'Active thermal' },
    orbitType: 'LEO',
    coverage: 'Global',
    availability: 'coming_soon',
    pricingModel: 'custom',
    priceUnit: 'Contact',
    pricingNotes: 'Part of Axiom Station. Mission-specific pricing.',
    launchCostBasis: 5500,
    operationalCost: 50000000,
    marginEstimate: 40,
    status: 'planned',
    launchDate: new Date('2026-01-01'),
  },

  // ============================================================
  // Hosted Payload Services
  // ============================================================
  {
    slug: 'loft-orbital-yam',
    providerName: 'Loft Orbital',
    providerCountry: 'USA',
    providerWebsite: 'https://loftorbital.com',
    category: 'hosted_payload',
    serviceType: 'satellite_hosting',
    serviceName: 'YAM Platform',
    description: 'Space infrastructure as a service. Deploy your payload on a proven platform with mission assurance.',
    specifications: { mass: 'Up to 200kg', power: 'Up to 500W', data: '100+ Mbps' },
    orbitType: 'LEO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'per_kg_year',
    priceMin: 25000,
    priceMax: 75000,
    priceUnit: '$/kg/year',
    pricingNotes: '$500K-$5M annual depending on payload requirements. 3-year contracts typical.',
    launchCostBasis: 5500,
    operationalCost: 1000000,
    marginEstimate: 35,
    status: 'active',
  },
  {
    slug: 'spaceflight-sherpa',
    providerName: 'Spaceflight Inc',
    providerCountry: 'USA',
    providerWebsite: 'https://spaceflight.com',
    category: 'hosted_payload',
    serviceType: 'rideshare_hosting',
    serviceName: 'Sherpa OTV',
    description: 'Orbital transfer vehicle with hosted payload slots. Precise orbital delivery included.',
    specifications: { mass: 'Up to 300kg total', orbits: 'LEO to MEO', propulsion: 'Chemical' },
    orbitType: 'LEO',
    coverage: 'Multiple orbits',
    availability: 'available',
    pricingModel: 'custom',
    priceMin: 100000,
    priceMax: 500000,
    priceUnit: '$/mission',
    pricingNotes: 'Pricing varies by mass and destination orbit. Frequent launch opportunities.',
    launchCostBasis: 5500,
    operationalCost: 500000,
    marginEstimate: 30,
    status: 'active',
  },
  {
    slug: 'dorbit-ion-carrier',
    providerName: 'D-Orbit',
    providerCountry: 'ITA',
    providerWebsite: 'https://d-orbit.com',
    category: 'hosted_payload',
    serviceType: 'last_mile_delivery',
    serviceName: 'ION Satellite Carrier',
    description: 'Last-mile delivery for small satellites. Deploy payloads to precise orbital slots.',
    specifications: { capacity: '16-24 cubesats', orbits: 'SSO/LEO', propulsion: 'Green' },
    orbitType: 'LEO',
    coverage: 'Multiple slots',
    availability: 'available',
    pricingModel: 'custom',
    priceMin: 50000,
    priceMax: 200000,
    priceUnit: '$/cubesat',
    pricingNotes: 'Pricing by unit size. Hosted payload experiments accepted.',
    launchCostBasis: 5500,
    operationalCost: 300000,
    marginEstimate: 35,
    status: 'active',
  },

  // ============================================================
  // Space Solar Power Services
  // ============================================================
  {
    slug: 'aetherflux-power-beaming',
    providerName: 'Aetherflux',
    providerCountry: 'USA',
    providerWebsite: 'https://aetherflux.com',
    category: 'space_solar',
    serviceType: 'power_beaming',
    serviceName: 'Orbital Power Delivery',
    description: 'Space-based solar power beamed to ground receivers. 24/7 clean energy from orbit.',
    specifications: { power: '1MW initial', wavelength: 'IR laser', efficiency: '20%' },
    orbitType: 'LEO',
    coverage: 'Ground stations',
    availability: 'coming_soon',
    pricingModel: 'custom',
    priceMin: 0.05,
    priceMax: 0.10,
    priceUnit: '$/kWh',
    pricingNotes: 'Demo mission 2026. Commercial service 2028. Ground infrastructure required.',
    launchCostBasis: 5500,
    operationalCost: 10000000,
    marginEstimate: 40,
    status: 'planned',
    launchDate: new Date('2026-12-01'),
  },
  {
    slug: 'virtus-solis-sbsp',
    providerName: 'Virtus Solis',
    providerCountry: 'USA',
    providerWebsite: 'https://virtussolis.space',
    category: 'space_solar',
    serviceType: 'solar_power',
    serviceName: 'Space-Based Solar Power',
    description: 'GW-scale space solar power with proprietary concentrator technology. Target LCOE: $25/MWh.',
    specifications: { power: '1GW target', orbit: 'GEO', technology: 'Concentrator + beaming' },
    orbitType: 'GEO',
    coverage: 'Continental',
    availability: 'coming_soon',
    pricingModel: 'custom',
    priceMin: 25,
    priceMax: 50,
    priceUnit: '$/MWh',
    pricingNotes: 'Demo missions 2025-2027. Full commercial 2030s.',
    launchCostBasis: 5500,
    operationalCost: 100000000,
    marginEstimate: 50,
    status: 'planned',
    launchDate: new Date('2027-01-01'),
  },

  // ============================================================
  // Communications Services
  // ============================================================
  {
    slug: 'aws-ground-station',
    providerName: 'Amazon Web Services',
    providerCountry: 'USA',
    providerWebsite: 'https://aws.amazon.com/ground-station',
    category: 'communications',
    serviceType: 'ground_station',
    serviceName: 'AWS Ground Station',
    description: 'Ground station as a service. Download satellite data directly to AWS cloud.',
    specifications: { bands: 'S/X/UHF', locations: '12+ global', integration: 'AWS native' },
    orbitType: 'All',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'custom',
    priceMin: 3,
    priceMax: 10,
    priceUnit: '$/minute',
    pricingNotes: 'Pay per minute of antenna time. Data egress to S3 included.',
    operationalCost: 50000000,
    marginEstimate: 60,
    status: 'active',
  },
  {
    slug: 'ksat-lite',
    providerName: 'KSAT',
    providerCountry: 'NOR',
    providerWebsite: 'https://ksat.no',
    category: 'communications',
    serviceType: 'ground_station',
    serviceName: 'KSAT Lite',
    description: 'Global ground station network with polar coverage. Industry leader in satellite data services.',
    specifications: { bands: 'S/X/Ka', locations: '25+ sites', polar: 'Svalbard coverage' },
    orbitType: 'All',
    coverage: 'Global + Polar',
    availability: 'available',
    pricingModel: 'custom',
    priceMin: 5,
    priceMax: 15,
    priceUnit: '$/minute',
    pricingNotes: 'Volume discounts for regular passes. Express delivery options.',
    operationalCost: 30000000,
    marginEstimate: 45,
    status: 'active',
  },
  {
    slug: 'viasat-rte',
    providerName: 'Viasat',
    providerSlug: 'viasat',
    providerCountry: 'USA',
    providerWebsite: 'https://viasat.com',
    category: 'communications',
    serviceType: 'data_relay',
    serviceName: 'Real-Time Earth',
    description: 'High-bandwidth data relay service. Continuous connectivity for LEO satellites via GEO relay.',
    specifications: { bandwidth: '600 Mbps', latency: '< 500ms', coverage: 'Near-global' },
    orbitType: 'GEO relay',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'subscription',
    priceMin: 10000,
    priceMax: 100000,
    priceUnit: '$/month',
    pricingNotes: 'Bandwidth tiers available. NASA Near Space Network partner.',
    operationalCost: 20000000,
    marginEstimate: 55,
    status: 'active',
  },
  {
    slug: 'inmarsat-elera',
    providerName: 'Inmarsat',
    providerCountry: 'GBR',
    providerWebsite: 'https://inmarsat.com',
    category: 'communications',
    serviceType: 'satellite_comms',
    serviceName: 'ELERA Network',
    description: 'L-band narrowband IoT and M2M connectivity. Global coverage for asset tracking and telemetry.',
    specifications: { band: 'L-band', coverage: 'Global', devices: 'IoT/M2M' },
    orbitType: 'GEO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'subscription',
    priceMin: 10,
    priceMax: 500,
    priceUnit: '$/device/month',
    pricingNotes: 'Volume pricing for fleet deployments. Hardware bundles available.',
    operationalCost: 100000000,
    marginEstimate: 65,
    status: 'active',
  },

  // ============================================================
  // Sensor-as-a-Service
  // ============================================================
  {
    slug: 'spire-weather',
    providerName: 'Spire Global',
    providerSlug: 'spire-global',
    providerCountry: 'USA',
    providerWebsite: 'https://spire.com',
    category: 'sensor_service',
    serviceType: 'weather_data',
    serviceName: 'Weather Intelligence',
    description: 'Radio occultation weather data from 100+ satellite constellation. Best-in-class forecast accuracy.',
    specifications: { technique: 'GNSS-RO', profiles: '15,000+/day', latency: '90 min' },
    orbitType: 'LEO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'subscription',
    priceMin: 5000,
    priceMax: 50000,
    priceUnit: '$/month',
    pricingNotes: 'API access included. Custom data products available.',
    launchCostBasis: 5500,
    operationalCost: 20000000,
    marginEstimate: 55,
    status: 'active',
  },
  {
    slug: 'hawkeye360-rf-geolocation',
    providerName: 'HawkEye 360',
    providerCountry: 'USA',
    providerWebsite: 'https://he360.com',
    category: 'sensor_service',
    serviceType: 'rf_monitoring',
    serviceName: 'RF Geolocation',
    description: 'Space-based RF signal detection and geolocation. Track vessels, monitor spectrum interference.',
    specifications: { frequency: '144 MHz - 15 GHz', accuracy: '500m', revisit: 'Hours' },
    orbitType: 'LEO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'subscription',
    priceMin: 10000,
    priceMax: 100000,
    priceUnit: '$/month',
    pricingNotes: 'Tiered by AOI and signal types. Custom analytics available.',
    launchCostBasis: 5500,
    operationalCost: 15000000,
    marginEstimate: 50,
    status: 'active',
  },
  {
    slug: 'exactearth-ais',
    providerName: 'Spire Global (exactEarth)',
    providerCountry: 'USA',
    providerWebsite: 'https://spire.com',
    category: 'sensor_service',
    serviceType: 'ais_tracking',
    serviceName: 'Maritime AIS',
    description: 'Global ship tracking via satellite AIS. Real-time vessel positions and maritime intelligence.',
    specifications: { coverage: 'Global oceans', vessels: '400,000+', update: 'Minutes' },
    orbitType: 'LEO',
    coverage: 'Global maritime',
    availability: 'available',
    pricingModel: 'subscription',
    priceMin: 1000,
    priceMax: 25000,
    priceUnit: '$/month',
    pricingNotes: 'Fleet tracking plans available. Historical data access.',
    launchCostBasis: 5500,
    operationalCost: 10000000,
    marginEstimate: 60,
    status: 'active',
  },
  {
    slug: 'ghgsat-emissions',
    providerName: 'GHGSat',
    providerCountry: 'CAN',
    providerWebsite: 'https://ghgsat.com',
    category: 'sensor_service',
    serviceType: 'emissions_monitoring',
    serviceName: 'Emissions Monitoring',
    description: 'High-resolution methane and CO2 detection from space. ESG compliance and leak detection.',
    specifications: { gases: 'CH4, CO2', resolution: '25m', sensitivity: '< 100 kg/hr' },
    orbitType: 'SSO',
    coverage: 'Global',
    availability: 'available',
    pricingModel: 'subscription',
    priceMin: 5000,
    priceMax: 50000,
    priceUnit: '$/month',
    pricingNotes: 'Per-site monitoring plans. Compliance reporting included.',
    launchCostBasis: 5500,
    operationalCost: 8000000,
    marginEstimate: 55,
    status: 'active',
  },
];

// ============================================================
// Seed Data - Known Contracts
// ============================================================

interface OrbitalServiceContractSeed {
  slug: string;
  title: string;
  description: string;
  customerName: string;
  customerType: OrbitalCustomerType;
  providerName: string;
  contractValue?: number;
  contractType: OrbitalContractType;
  duration?: string;
  serviceCategory: string;
  scope?: string;
  awardDate?: Date;
  startDate?: Date;
  endDate?: Date;
  sourceUrl?: string;
  status: string;
}

export const ORBITAL_CONTRACTS_SEED: OrbitalServiceContractSeed[] = [
  {
    slug: 'nasa-csda-2024',
    title: 'NASA Commercial Smallsat Data Acquisition (CSDA)',
    description: 'Multi-vendor contract for commercial Earth observation data supporting NASA science missions.',
    customerName: 'NASA',
    customerType: 'government',
    providerName: 'Multiple (8 companies)',
    contractValue: 476,
    contractType: 'idiq',
    duration: '4 years',
    serviceCategory: 'earth_observation',
    scope: 'Satellite imagery from Planet, Maxar, BlackSky, Satellogic, and others for NASA research.',
    awardDate: new Date('2024-01-15'),
    startDate: new Date('2024-02-01'),
    endDate: new Date('2028-01-31'),
    sourceUrl: 'https://science.nasa.gov/earth-science/csda/',
    status: 'active',
  },
  {
    slug: 'nasa-near-space-network-2025',
    title: 'NASA Near Space Network (NSN)',
    description: 'Commercial communications services for NASA missions in near-Earth space.',
    customerName: 'NASA',
    customerType: 'government',
    providerName: 'Viasat, Kongsberg, SES, SpaceX',
    contractValue: 4820,
    contractType: 'idiq',
    duration: '5 years',
    serviceCategory: 'communications',
    scope: 'Direct-to-Earth and relay services for missions within 2 million km of Earth.',
    awardDate: new Date('2025-01-07'),
    startDate: new Date('2025-02-01'),
    sourceUrl: 'https://www.nasa.gov/news-release/nasa-selects-four-commercial-companies-to-support-near-space-network/',
    status: 'active',
  },
  {
    slug: 'loft-csa-qeyssat',
    title: 'QEYSSat Mission - Loft/CSA',
    description: 'Quantum encryption satellite mission using Loft Orbital platform.',
    customerName: 'Canadian Space Agency (CSA)',
    customerType: 'government',
    providerName: 'Loft Orbital, Honeywell',
    contractValue: 30,
    contractType: 'firm_fixed',
    duration: '2 years mission',
    serviceCategory: 'hosted_payload',
    scope: 'Quantum key distribution demonstration payload hosted on Loft satellite.',
    awardDate: new Date('2023-06-01'),
    status: 'active',
  },
  {
    slug: 'earthdaily-loft-constellation',
    title: 'EarthDaily Analytics Constellation',
    description: '10-satellite Earth observation constellation built on Loft Orbital platform.',
    customerName: 'EarthDaily Analytics',
    customerType: 'commercial',
    providerName: 'Loft Orbital',
    contractValue: 200,
    contractType: 'firm_fixed',
    duration: '5 years',
    serviceCategory: 'hosted_payload',
    scope: 'Complete constellation build and operations using Loft YAM platform.',
    awardDate: new Date('2022-01-01'),
    status: 'active',
  },
  {
    slug: 'wyvern-loft-dragonette',
    title: 'Wyvern Dragonette Expansion',
    description: 'Hyperspectral imaging satellite constellation expansion.',
    customerName: 'Wyvern',
    customerType: 'commercial',
    providerName: 'Loft Orbital',
    contractValue: 50,
    contractType: 'firm_fixed',
    duration: '3 years',
    serviceCategory: 'hosted_payload',
    scope: 'Additional hyperspectral imaging satellites on Loft platform.',
    awardDate: new Date('2023-03-01'),
    status: 'active',
  },
  {
    slug: 'nro-blacksky-eocl',
    title: 'NRO Electro-Optical Commercial Layer (EOCL)',
    description: 'Commercial imagery for National Reconnaissance Office.',
    customerName: 'National Reconnaissance Office (NRO)',
    customerType: 'government',
    providerName: 'BlackSky',
    contractValue: 1000,
    contractType: 'idiq',
    duration: '10 years',
    serviceCategory: 'earth_observation',
    scope: 'On-demand high-resolution imagery for intelligence community.',
    awardDate: new Date('2022-05-01'),
    sourceUrl: 'https://www.blacksky.com',
    status: 'active',
  },
  {
    slug: 'noaa-spire-weather',
    title: 'NOAA Commercial Weather Data',
    description: 'Commercial radio occultation data for weather forecasting.',
    customerName: 'NOAA',
    customerType: 'government',
    providerName: 'Spire Global',
    contractValue: 25,
    contractType: 'subscription',
    duration: '3 years',
    serviceCategory: 'sensor_service',
    scope: 'Daily GNSS-RO weather profiles for NWS forecast models.',
    awardDate: new Date('2023-01-01'),
    status: 'active',
  },
  {
    slug: 'esa-copernicus-airbus',
    title: 'Copernicus Data Access - Airbus',
    description: 'Very high resolution optical data for EU Copernicus programme.',
    customerName: 'European Space Agency (ESA)',
    customerType: 'government',
    providerName: 'Airbus Defence and Space',
    contractValue: 100,
    contractType: 'idiq',
    duration: '4 years',
    serviceCategory: 'earth_observation',
    scope: 'Pleiades and SPOT imagery for Copernicus services.',
    awardDate: new Date('2022-01-01'),
    status: 'active',
  },
  {
    slug: 'usaf-starshield',
    title: 'USAF Starshield Contract',
    description: 'Military satellite communications and services.',
    customerName: 'U.S. Air Force',
    customerType: 'government',
    providerName: 'SpaceX',
    contractValue: 2000,
    contractType: 'firm_fixed',
    duration: 'Multi-year',
    serviceCategory: 'communications',
    scope: 'Starshield secure satellite services for defense applications.',
    awardDate: new Date('2023-09-01'),
    status: 'active',
  },
  {
    slug: 'nsa-aws-ground-station',
    title: 'NSA AWS Ground Station Access',
    description: 'Cloud-integrated ground station services for classified missions.',
    customerName: 'National Security Agency (NSA)',
    customerType: 'government',
    providerName: 'Amazon Web Services',
    contractValue: 50,
    contractType: 'subscription',
    duration: '5 years',
    serviceCategory: 'communications',
    scope: 'GovCloud integrated satellite data downlink.',
    awardDate: new Date('2022-06-01'),
    status: 'active',
  },
  {
    slug: 'bp-ghgsat-monitoring',
    title: 'BP Global Methane Monitoring',
    description: 'Enterprise methane emissions monitoring for oil & gas operations.',
    customerName: 'BP',
    customerType: 'commercial',
    providerName: 'GHGSat',
    contractValue: 15,
    contractType: 'subscription',
    duration: '3 years',
    serviceCategory: 'sensor_service',
    scope: 'Global asset monitoring and ESG reporting.',
    awardDate: new Date('2023-01-01'),
    status: 'active',
  },
  {
    slug: 'maersk-spire-ais',
    title: 'Maersk Maritime Intelligence',
    description: 'Global fleet tracking and route optimization.',
    customerName: 'Maersk',
    customerType: 'commercial',
    providerName: 'Spire Global',
    contractValue: 5,
    contractType: 'subscription',
    duration: '2 years',
    serviceCategory: 'sensor_service',
    scope: 'Real-time AIS data for 700+ vessel fleet.',
    awardDate: new Date('2023-06-01'),
    status: 'active',
  },
  {
    slug: 'azure-orbital-partnership',
    title: 'Microsoft Azure Orbital Partnership',
    description: 'Strategic partnership for cloud-integrated satellite services.',
    customerName: 'Microsoft Azure',
    customerType: 'commercial',
    providerName: 'Multiple operators',
    contractValue: 100,
    contractType: 'subscription',
    duration: 'Ongoing',
    serviceCategory: 'communications',
    scope: 'Ground station and data services integration with Azure cloud.',
    awardDate: new Date('2022-01-01'),
    status: 'active',
  },
  {
    slug: 'usda-planet-monitoring',
    title: 'USDA Crop Monitoring Program',
    description: 'Agricultural monitoring using daily satellite imagery.',
    customerName: 'USDA',
    customerType: 'government',
    providerName: 'Planet Labs',
    contractValue: 30,
    contractType: 'idiq',
    duration: '3 years',
    serviceCategory: 'earth_observation',
    scope: 'Daily coverage of US agricultural regions for crop assessment.',
    awardDate: new Date('2023-01-01'),
    status: 'active',
  },
  {
    slug: 'uk-mod-capella',
    title: 'UK MoD SAR Intelligence',
    description: 'All-weather surveillance capability for UK defence.',
    customerName: 'UK Ministry of Defence',
    customerType: 'government',
    providerName: 'Capella Space',
    contractValue: 20,
    contractType: 'idiq',
    duration: '2 years',
    serviceCategory: 'earth_observation',
    scope: 'On-demand SAR imagery for defence intelligence.',
    awardDate: new Date('2023-09-01'),
    status: 'active',
  },
];

// ============================================================
// Database Operations
// ============================================================

export async function initializeOrbitalServices(): Promise<{ services: number; contracts: number }> {
  let servicesCreated = 0;
  let contractsCreated = 0;

  // Initialize services
  for (const service of ORBITAL_SERVICES_SEED) {
    try {
      await prisma.orbitalService.upsert({
        where: { slug: service.slug },
        update: {
          providerName: service.providerName,
          providerSlug: service.providerSlug || null,
          providerCountry: service.providerCountry,
          providerWebsite: service.providerWebsite || null,
          category: service.category,
          serviceType: service.serviceType,
          serviceName: service.serviceName,
          description: service.description,
          specifications: service.specifications ? JSON.stringify(service.specifications) : null,
          orbitType: service.orbitType || null,
          coverage: service.coverage || null,
          availability: service.availability,
          pricingModel: service.pricingModel,
          priceMin: service.priceMin || null,
          priceMax: service.priceMax || null,
          priceUnit: service.priceUnit || null,
          pricingNotes: service.pricingNotes || null,
          launchCostBasis: service.launchCostBasis || null,
          operationalCost: service.operationalCost || null,
          marketRate: service.marketRate || null,
          marginEstimate: service.marginEstimate || null,
          status: service.status,
          launchDate: service.launchDate || null,
        },
        create: {
          slug: service.slug,
          providerName: service.providerName,
          providerSlug: service.providerSlug || null,
          providerCountry: service.providerCountry,
          providerWebsite: service.providerWebsite || null,
          category: service.category,
          serviceType: service.serviceType,
          serviceName: service.serviceName,
          description: service.description,
          specifications: service.specifications ? JSON.stringify(service.specifications) : null,
          orbitType: service.orbitType || null,
          coverage: service.coverage || null,
          availability: service.availability,
          pricingModel: service.pricingModel,
          priceMin: service.priceMin || null,
          priceMax: service.priceMax || null,
          priceUnit: service.priceUnit || null,
          pricingNotes: service.pricingNotes || null,
          launchCostBasis: service.launchCostBasis || null,
          operationalCost: service.operationalCost || null,
          marketRate: service.marketRate || null,
          marginEstimate: service.marginEstimate || null,
          status: service.status,
          launchDate: service.launchDate || null,
        },
      });
      servicesCreated++;
    } catch (error) {
      logger.error(`Error creating service ${service.slug}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  // Initialize contracts
  for (const contract of ORBITAL_CONTRACTS_SEED) {
    try {
      await prisma.orbitalServiceContract.upsert({
        where: { slug: contract.slug },
        update: {
          title: contract.title,
          description: contract.description,
          customerName: contract.customerName,
          customerType: contract.customerType,
          providerName: contract.providerName,
          contractValue: contract.contractValue || null,
          contractType: contract.contractType,
          duration: contract.duration || null,
          serviceCategory: contract.serviceCategory,
          scope: contract.scope || null,
          awardDate: contract.awardDate || null,
          startDate: contract.startDate || null,
          endDate: contract.endDate || null,
          sourceUrl: contract.sourceUrl || null,
          status: contract.status,
        },
        create: {
          slug: contract.slug,
          title: contract.title,
          description: contract.description,
          customerName: contract.customerName,
          customerType: contract.customerType,
          providerName: contract.providerName,
          contractValue: contract.contractValue || null,
          contractType: contract.contractType,
          duration: contract.duration || null,
          serviceCategory: contract.serviceCategory,
          scope: contract.scope || null,
          awardDate: contract.awardDate || null,
          startDate: contract.startDate || null,
          endDate: contract.endDate || null,
          sourceUrl: contract.sourceUrl || null,
          status: contract.status,
        },
      });
      contractsCreated++;
    } catch (error) {
      logger.error(`Error creating contract ${contract.slug}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { services: servicesCreated, contracts: contractsCreated };
}

export async function getOrbitalServices(filters?: {
  category?: string;
  provider?: string;
  pricingModel?: string;
  availability?: string;
  status?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.provider) {
    where.providerName = { contains: filters.provider, mode: 'insensitive' };
  }
  if (filters?.pricingModel) {
    where.pricingModel = filters.pricingModel;
  }
  if (filters?.availability) {
    where.availability = filters.availability;
  }
  if (filters?.status) {
    where.status = filters.status;
  } else {
    // Default to showing active and beta services
    where.status = { in: ['active', 'beta', 'planned'] };
  }

  return prisma.orbitalService.findMany({
    where,
    select: {
      id: true,
      slug: true,
      providerName: true,
      providerSlug: true,
      providerCountry: true,
      providerWebsite: true,
      category: true,
      serviceType: true,
      serviceName: true,
      description: true,
      specifications: true,
      orbitType: true,
      coverage: true,
      availability: true,
      pricingModel: true,
      priceMin: true,
      priceMax: true,
      priceUnit: true,
      pricingNotes: true,
      launchCostBasis: true,
      operationalCost: true,
      marketRate: true,
      marginEstimate: true,
      status: true,
      launchDate: true,
    },
    orderBy: [{ category: 'asc' }, { providerName: 'asc' }],
  });
}

export async function getOrbitalContracts(filters?: {
  customerType?: string;
  serviceCategory?: string;
  status?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.customerType) {
    where.customerType = filters.customerType;
  }
  if (filters?.serviceCategory) {
    where.serviceCategory = filters.serviceCategory;
  }
  if (filters?.status) {
    where.status = filters.status;
  }

  return prisma.orbitalServiceContract.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      customerName: true,
      customerType: true,
      providerName: true,
      contractValue: true,
      contractType: true,
      duration: true,
      serviceCategory: true,
      scope: true,
      awardDate: true,
      startDate: true,
      endDate: true,
      sourceUrl: true,
      status: true,
    },
    orderBy: [{ contractValue: 'desc' }],
  });
}

export async function getOrbitalServicesStats() {
  const [
    totalServices,
    activeServices,
    totalContracts,
    contractsAggregation,
    categoryStats,
    providerStats,
  ] = await Promise.all([
    prisma.orbitalService.count(),
    prisma.orbitalService.count({ where: { status: 'active' } }),
    prisma.orbitalServiceContract.count(),
    prisma.orbitalServiceContract.aggregate({
      _sum: { contractValue: true },
      _avg: { contractValue: true },
    }),
    prisma.orbitalService.groupBy({
      by: ['category'],
      _count: { id: true },
    }),
    prisma.orbitalService.groupBy({
      by: ['providerName'],
      _count: { id: true },
    }),
  ]);

  return {
    totalServices,
    activeServices,
    totalContracts,
    totalContractValue: contractsAggregation._sum.contractValue || 0,
    avgContractValue: contractsAggregation._avg.contractValue || 0,
    servicesByCategory: categoryStats.reduce((acc, cat) => {
      acc[cat.category] = cat._count.id;
      return acc;
    }, {} as Record<string, number>),
    uniqueProviders: providerStats.length,
  };
}
