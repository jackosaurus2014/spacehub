'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type MassClass = 'Small' | 'Medium' | 'Large';
type OrbitType = 'LEO' | 'SSO' | 'MEO' | 'GEO' | 'GTO' | 'HEO' | 'Interplanetary';
type TabId = 'database' | 'compare' | 'manufacturers' | 'guide';
type SortKey = 'name' | 'mass' | 'power' | 'cost' | 'designLife' | 'manufacturer';

interface SatelliteBus {
  id: string;
  name: string;
  manufacturer: string;
  massClass: MassClass;
  dryMassKg: number;
  dryMassMaxKg: number;
  powerW: number;
  powerMaxW: number;
  designLifeYears: number;
  orbits: OrbitType[];
  payloadMassKg: number;
  payloadMassMaxKg: number;
  costMillionsMin: number;
  costMillionsMax: number;
  propulsion: string;
  attitude: string;
  thermalControl: string;
  dataRate: string;
  heritage: string;
  notableMissions: string[];
  description: string;
}

interface Manufacturer {
  name: string;
  country: string;
  founded: number;
  headquarters: string;
  employees: string;
  busCount: number;
  specialties: string[];
  website: string;
  description: string;
}

// ────────────────────────────────────────
// Satellite Bus Data (15+ buses)
// ────────────────────────────────────────

const SATELLITE_BUSES: SatelliteBus[] = [
  // Small / Micro (50-300 kg)
  {
    id: 'bcp-100',
    name: 'BCP-100',
    manufacturer: 'Ball Aerospace',
    massClass: 'Small',
    dryMassKg: 60,
    dryMassMaxKg: 120,
    powerW: 50,
    powerMaxW: 100,
    designLifeYears: 3,
    orbits: ['LEO', 'SSO'],
    payloadMassKg: 15,
    payloadMassMaxKg: 40,
    costMillionsMin: 3,
    costMillionsMax: 5,
    propulsion: 'Cold gas / none',
    attitude: '3-axis stabilized, star trackers, reaction wheels',
    thermalControl: 'Passive (MLI, radiators)',
    dataRate: 'Up to 100 Mbps (S/X-band)',
    heritage: '20+ missions since 2003',
    notableMissions: ['STPSat-2', 'STPSat-3', 'GPIM'],
    description: 'Ball Aerospace\'s smallest standard bus, designed for rapid-build small satellite missions. Compact form factor with high reliability heritage from government science and technology demonstration programs.',
  },
  {
    id: 'bcp-small',
    name: 'BCP-Small',
    manufacturer: 'Ball Aerospace',
    massClass: 'Small',
    dryMassKg: 120,
    dryMassMaxKg: 280,
    powerW: 100,
    powerMaxW: 400,
    designLifeYears: 5,
    orbits: ['LEO', 'SSO'],
    payloadMassKg: 40,
    payloadMassMaxKg: 130,
    costMillionsMin: 8,
    costMillionsMax: 20,
    propulsion: 'Hydrazine monopropellant',
    attitude: '3-axis stabilized, GPS, star trackers, IRU',
    thermalControl: 'Active + passive (heaters, MLI, radiators)',
    dataRate: 'Up to 300 Mbps (X-band)',
    heritage: '15+ missions',
    notableMissions: ['CloudSat', 'WorldView-Scout', 'WISE/NEOWISE'],
    description: 'A step up from BCP-100, the BCP-Small family bridges the gap between micro and medium satellites. Proven on NASA science missions and commercial Earth observation.',
  },
  {
    id: 'sstl-150',
    name: 'SSTL-150',
    manufacturer: 'Surrey Satellite Technology',
    massClass: 'Small',
    dryMassKg: 100,
    dryMassMaxKg: 160,
    powerW: 80,
    powerMaxW: 200,
    designLifeYears: 5,
    orbits: ['LEO', 'SSO'],
    payloadMassKg: 30,
    payloadMassMaxKg: 60,
    costMillionsMin: 5,
    costMillionsMax: 8,
    propulsion: 'Resistojet / cold gas',
    attitude: '3-axis, reaction wheels, magnetorquers, star tracker',
    thermalControl: 'Passive (MLI, surface coatings)',
    dataRate: 'Up to 105 Mbps (X-band)',
    heritage: '30+ missions in SSTL platform family',
    notableMissions: ['NigeriaSat-2', 'KazEOSat-2', 'DMC3 constellation'],
    description: 'Surrey\'s workhorse small satellite platform, widely used for Earth observation and technology demonstration. Offers excellent performance-to-cost ratio with rapid delivery timelines, typically 18-24 months.',
  },
  {
    id: 'sstl-300',
    name: 'SSTL-300',
    manufacturer: 'Surrey Satellite Technology',
    massClass: 'Small',
    dryMassKg: 200,
    dryMassMaxKg: 350,
    powerW: 200,
    powerMaxW: 450,
    designLifeYears: 7,
    orbits: ['LEO', 'SSO'],
    payloadMassKg: 60,
    payloadMassMaxKg: 130,
    costMillionsMin: 10,
    costMillionsMax: 18,
    propulsion: 'Hydrazine monopropellant / electric',
    attitude: '3-axis, high-agility reaction wheels, star trackers, GPS',
    thermalControl: 'Active + passive',
    dataRate: 'Up to 320 Mbps (X-band)',
    heritage: '10+ missions',
    notableMissions: ['NovaSAR-1', 'SSTL-300 S1', 'Carbonite-2'],
    description: 'Enhanced small satellite platform from SSTL supporting sub-meter imaging payloads. Offers high agility for multi-target imaging in a single pass with rapid slewing capability.',
  },
  {
    id: 'terran-orbital',
    name: 'Terran Orbital Standard Bus',
    manufacturer: 'Terran Orbital',
    massClass: 'Small',
    dryMassKg: 50,
    dryMassMaxKg: 120,
    powerW: 50,
    powerMaxW: 250,
    designLifeYears: 5,
    orbits: ['LEO'],
    payloadMassKg: 20,
    payloadMassMaxKg: 50,
    costMillionsMin: 3,
    costMillionsMax: 6,
    propulsion: 'Electric / cold gas / none',
    attitude: '3-axis, reaction wheels, star trackers',
    thermalControl: 'Passive (MLI, coatings)',
    dataRate: 'Up to 200 Mbps (X-band)',
    heritage: '25+ missions delivered',
    notableMissions: ['Rivada constellation', 'NASA TROPICS pathfinder', 'SDA Tranche 0'],
    description: 'Terran Orbital\'s configurable small satellite bus optimized for constellation deployment. High-rate production facility can deliver multiple units per month with standardized interfaces.',
  },
  {
    id: 'xb-series',
    name: 'XB-series',
    manufacturer: 'Blue Canyon Technologies',
    massClass: 'Small',
    dryMassKg: 8,
    dryMassMaxKg: 400,
    powerW: 20,
    powerMaxW: 1200,
    designLifeYears: 5,
    orbits: ['LEO', 'SSO', 'MEO'],
    payloadMassKg: 4,
    payloadMassMaxKg: 200,
    costMillionsMin: 1,
    costMillionsMax: 10,
    propulsion: 'Configurable: cold gas, electric, monopropellant',
    attitude: '3-axis, star trackers, reaction wheels, GPS',
    thermalControl: 'Modular passive + active options',
    dataRate: 'Configurable up to 400 Mbps',
    heritage: '100+ spacecraft delivered',
    notableMissions: ['NASA ESCAPADE', 'Hawkeye 360', 'DARPA Blackjack'],
    description: 'Blue Canyon\'s highly modular bus family spanning XB-1 (6U CubeSat class) through XB-16 (ESPA-class). The most scalable small satellite platform on the market, with configurations for everything from CubeSat-scale science to ESPA-class tactical missions.',
  },
  {
    id: 'leostar-2',
    name: 'LEOStar-2',
    manufacturer: 'Northrop Grumman',
    massClass: 'Small',
    dryMassKg: 200,
    dryMassMaxKg: 350,
    powerW: 300,
    powerMaxW: 700,
    designLifeYears: 6,
    orbits: ['LEO', 'SSO'],
    payloadMassKg: 80,
    payloadMassMaxKg: 200,
    costMillionsMin: 15,
    costMillionsMax: 30,
    propulsion: 'Hydrazine blowdown',
    attitude: '3-axis, reaction wheels, star trackers, IMU',
    thermalControl: 'Active + passive (louvers, heaters, MLI)',
    dataRate: 'Up to 150 Mbps (X-band)',
    heritage: '8+ missions, 100% success',
    notableMissions: ['ICON', 'TESS', 'Landsat 9 (LEOStar-3)'],
    description: 'Northrop Grumman\'s proven LEO science platform. Known for reliability and precision pointing for NASA astrophysics and Earth science missions.',
  },

  // Medium (300-3000 kg)
  {
    id: 'espastar',
    name: 'ESPAStar',
    manufacturer: 'Northrop Grumman',
    massClass: 'Medium',
    dryMassKg: 300,
    dryMassMaxKg: 450,
    powerW: 400,
    powerMaxW: 750,
    designLifeYears: 7,
    orbits: ['LEO', 'MEO'],
    payloadMassKg: 100,
    payloadMassMaxKg: 250,
    costMillionsMin: 15,
    costMillionsMax: 25,
    propulsion: 'Hydrazine / electric hybrid',
    attitude: '3-axis, star trackers, reaction wheels, GPS',
    thermalControl: 'Active + passive',
    dataRate: 'Up to 300 Mbps (X-band)',
    heritage: '5+ missions since 2018',
    notableMissions: ['SDA Tranche 1 Transport', 'LDPE missions', 'USSF technology demos'],
    description: 'ESPA-class bus designed to ride as a secondary payload on ESPA rings, reducing launch costs. Ideal for responsive space and SDA proliferated LEO architecture.',
  },
  {
    id: 'geostar-1',
    name: 'GEOStar-1',
    manufacturer: 'Northrop Grumman',
    massClass: 'Medium',
    dryMassKg: 800,
    dryMassMaxKg: 1500,
    powerW: 1500,
    powerMaxW: 4000,
    designLifeYears: 15,
    orbits: ['GEO', 'HEO'],
    payloadMassKg: 200,
    payloadMassMaxKg: 500,
    costMillionsMin: 50,
    costMillionsMax: 90,
    propulsion: 'Bipropellant + electric',
    attitude: '3-axis, momentum wheels, earth/sun sensors, star trackers',
    thermalControl: 'Heat pipes, OSRs, MLI, heaters',
    dataRate: 'Up to 1 Gbps (Ka-band capable)',
    heritage: '10+ missions',
    notableMissions: ['GOES-R series (GEOStar-3)', 'SBIRS GEO', 'Protected comms'],
    description: 'Northrop Grumman\'s GEO-optimized medium bus. Provides a smaller GEO platform option for missions that don\'t require the capacity of full-size GEO buses.',
  },
  {
    id: 'eurostar-neo',
    name: 'Eurostar Neo',
    manufacturer: 'Airbus Defence and Space',
    massClass: 'Medium',
    dryMassKg: 1500,
    dryMassMaxKg: 3000,
    powerW: 6000,
    powerMaxW: 25000,
    designLifeYears: 15,
    orbits: ['GEO'],
    payloadMassKg: 500,
    payloadMassMaxKg: 2000,
    costMillionsMin: 80,
    costMillionsMax: 150,
    propulsion: 'Chemical (bipropellant) + electric (Hall-effect thrusters)',
    attitude: '3-axis, momentum bias / zero-momentum, star trackers',
    thermalControl: 'Deployable radiators, heat pipes, active thermal control',
    dataRate: 'Up to 500 Gbps (HTS payloads)',
    heritage: 'Evolution of Eurostar 3000 (70+ GEO missions)',
    notableMissions: ['Eutelsat Konnect VHTS', 'SES mPower constellation', 'MEASAT-3d'],
    description: 'Airbus\'s next-generation GEO communications platform offering 50% more payload capacity than Eurostar E3000. Supports all-electric or hybrid propulsion configurations. Modular design enables rapid customization for broadband, broadcast, and government missions.',
  },
  {
    id: 'lm-2100',
    name: 'LM 2100',
    manufacturer: 'L3Harris / Lockheed Martin',
    massClass: 'Medium',
    dryMassKg: 1500,
    dryMassMaxKg: 3200,
    powerW: 4000,
    powerMaxW: 12000,
    designLifeYears: 15,
    orbits: ['GEO', 'MEO', 'HEO'],
    payloadMassKg: 400,
    payloadMassMaxKg: 1500,
    costMillionsMin: 60,
    costMillionsMax: 100,
    propulsion: 'Bipropellant + optional electric',
    attitude: '3-axis stabilized, precision pointing',
    thermalControl: 'Deployable radiators, heat pipes, MLI',
    dataRate: 'Up to 100 Gbps (mission-dependent)',
    heritage: '40+ A2100-heritage spacecraft',
    notableMissions: ['GPS III/IIIF', 'AEHF', 'GOES-T'],
    description: 'Modernized evolution of the A2100 bus, used extensively for military and civil government missions. Highly modular with a strong track record on GPS navigation satellites and protected communications.',
  },

  // Large (3000+ kg)
  {
    id: 'maxar-1300',
    name: '1300-series',
    manufacturer: 'Maxar Technologies',
    massClass: 'Large',
    dryMassKg: 2000,
    dryMassMaxKg: 3500,
    powerW: 5000,
    powerMaxW: 25000,
    designLifeYears: 15,
    orbits: ['GEO'],
    payloadMassKg: 600,
    payloadMassMaxKg: 1800,
    costMillionsMin: 100,
    costMillionsMax: 200,
    propulsion: 'Bipropellant + electric (XIPS ion thrusters)',
    attitude: '3-axis, zero-momentum bias, precision pointing',
    thermalControl: 'Deployable radiators, variable conductance heat pipes',
    dataRate: 'Up to 250 Gbps (HTS)',
    heritage: '120+ spacecraft launched, 95%+ on-orbit success',
    notableMissions: ['WGS', 'SiriusXM satellites', 'Intelsat Epic series', 'Jupiter-3'],
    description: 'The most-flown GEO commercial satellite bus in history with over 120 spacecraft delivered. Pioneered all-electric orbit raising for GEO missions. Supports the largest commercial broadband payloads including the 9,200 kg Jupiter-3, the heaviest commercial communications satellite ever launched.',
  },
  {
    id: 'maxar-legion',
    name: 'Maxar Legion',
    manufacturer: 'Maxar Technologies',
    massClass: 'Small',
    dryMassKg: 300,
    dryMassMaxKg: 600,
    powerW: 500,
    powerMaxW: 2000,
    designLifeYears: 7,
    orbits: ['LEO', 'SSO'],
    payloadMassKg: 100,
    payloadMassMaxKg: 300,
    costMillionsMin: 20,
    costMillionsMax: 40,
    propulsion: 'Electric (Hall thrusters)',
    attitude: '3-axis, high agility, star trackers, CMGs',
    thermalControl: 'Active + passive, body-mounted radiators',
    dataRate: 'Up to 800 Mbps (X-band downlink)',
    heritage: 'WorldView Legion constellation (6 satellites)',
    notableMissions: ['WorldView Legion-1/2/3/4/5/6'],
    description: 'Maxar\'s LEO Earth observation bus designed for the WorldView Legion constellation. Extremely agile with rapid target revisit. Represents Maxar\'s pivot from GEO-only to LEO constellation operations.',
  },
  {
    id: 'boeing-702',
    name: '702 series',
    manufacturer: 'Boeing',
    massClass: 'Large',
    dryMassKg: 3000,
    dryMassMaxKg: 6000,
    powerW: 8000,
    powerMaxW: 18000,
    designLifeYears: 15,
    orbits: ['GEO'],
    payloadMassKg: 800,
    payloadMassMaxKg: 2500,
    costMillionsMin: 150,
    costMillionsMax: 250,
    propulsion: 'Bipropellant (R-4D) + electric (XIPS-25)',
    attitude: '3-axis, momentum wheels, precision pointing < 0.05 deg',
    thermalControl: 'Deployable radiators, capillary heat pipes, active louvers',
    dataRate: 'Up to 200 Gbps (HTS)',
    heritage: '50+ spacecraft, 702HP and 702SP variants',
    notableMissions: ['Inmarsat-5 F1-F4', 'SES-15', 'O3b mPOWER', 'Viasat-3'],
    description: 'Boeing\'s flagship large GEO bus, available in high-power (702HP) and small platform (702SP) variants. The 702SP pioneered all-electric GEO satellites. Used for the largest broadband missions and is the platform for the O3b mPOWER MEO constellation.',
  },
  {
    id: 'spacebus-neo',
    name: 'Spacebus Neo',
    manufacturer: 'Thales Alenia Space',
    massClass: 'Large',
    dryMassKg: 2500,
    dryMassMaxKg: 5500,
    powerW: 6000,
    powerMaxW: 20000,
    designLifeYears: 15,
    orbits: ['GEO'],
    payloadMassKg: 800,
    payloadMassMaxKg: 2200,
    costMillionsMin: 100,
    costMillionsMax: 180,
    propulsion: 'Chemical + electric hybrid (PPS-5000 Hall thrusters)',
    attitude: '3-axis, zero-momentum, star trackers, fiber optic gyros',
    thermalControl: 'Deployable radiators, heat pipes, MLI',
    dataRate: 'Up to 500 Gbps (HTS)',
    heritage: 'Evolution of Spacebus 4000 (50+ satellites)',
    notableMissions: ['Konnect', 'EUTELSAT 36D', 'SES-17', 'Syracuse IV'],
    description: 'Thales\' next-generation GEO platform offering full flexibility between chemical, all-electric, and hybrid propulsion. 40% lighter than Spacebus 4000 thanks to composite structures. Supports both commercial broadband and military communications payloads.',
  },
  {
    id: 'a2100',
    name: 'A2100',
    manufacturer: 'Lockheed Martin',
    massClass: 'Large',
    dryMassKg: 2000,
    dryMassMaxKg: 4500,
    powerW: 4000,
    powerMaxW: 15000,
    designLifeYears: 15,
    orbits: ['GEO', 'HEO'],
    payloadMassKg: 500,
    payloadMassMaxKg: 1500,
    costMillionsMin: 80,
    costMillionsMax: 150,
    propulsion: 'Bipropellant + optional electric augmentation',
    attitude: '3-axis, momentum bias, earth sensors, star trackers, IRU',
    thermalControl: 'Heat pipes, OSRs, MLI, heaters, deployable radiators',
    dataRate: 'Up to 100 Gbps (mission-configurable)',
    heritage: '50+ spacecraft since 1996, 99%+ mission success',
    notableMissions: ['AEHF-1/2/3/4', 'MUOS', 'GPS IIR/IIR-M', 'Sirius XM-7'],
    description: 'One of the most prolific GEO satellite buses ever built with unmatched military heritage. The backbone of U.S. military protected communications and GPS navigation. Being superseded by the modernized LM 2100 for new programs.',
  },
  {
    id: 'onesat',
    name: 'OneSat',
    manufacturer: 'Airbus Defence and Space',
    massClass: 'Medium',
    dryMassKg: 1500,
    dryMassMaxKg: 3500,
    powerW: 3000,
    powerMaxW: 20000,
    designLifeYears: 15,
    orbits: ['GEO'],
    payloadMassKg: 400,
    payloadMassMaxKg: 1500,
    costMillionsMin: 70,
    costMillionsMax: 130,
    propulsion: 'All-electric (Hall-effect thrusters)',
    attitude: '3-axis, software-defined flexibility',
    thermalControl: 'Advanced passive + active thermal management',
    dataRate: 'Software-reconfigurable up to 500 Gbps',
    heritage: 'New platform (first launch 2023), Airbus GEO legacy',
    notableMissions: ['Inmarsat GX6A/6B (I-6)', 'Eutelsat 36D', 'SES GEO fleet renewal'],
    description: 'Airbus\'s fully software-defined, reconfigurable GEO platform. Payload coverage, capacity, and frequency can be dynamically adjusted in orbit. Standardized production line targets 50% cost reduction and 30% shorter delivery times versus bespoke GEO satellites.',
  },
  {
    id: 'arrow',
    name: 'Arrow',
    manufacturer: 'Aerojet Rocketdyne / L3Harris',
    massClass: 'Small',
    dryMassKg: 100,
    dryMassMaxKg: 250,
    powerW: 200,
    powerMaxW: 500,
    designLifeYears: 5,
    orbits: ['LEO', 'MEO'],
    payloadMassKg: 40,
    payloadMassMaxKg: 120,
    costMillionsMin: 8,
    costMillionsMax: 18,
    propulsion: 'Green monopropellant / electric',
    attitude: '3-axis, star trackers, reaction wheels',
    thermalControl: 'Passive + active options',
    dataRate: 'Up to 200 Mbps',
    heritage: 'SDA Tranche contracts',
    notableMissions: ['SDA Tracking Layer', 'Missile warning/tracking'],
    description: 'Purpose-built for the Space Development Agency\'s proliferated LEO constellation architecture. Designed for mass production with emphasis on rapid delivery and low recurring cost per unit.',
  },
];

// ────────────────────────────────────────
// Manufacturer Directory Data
// ────────────────────────────────────────

const MANUFACTURERS: Manufacturer[] = [
  {
    name: 'Ball Aerospace',
    country: 'United States',
    founded: 1956,
    headquarters: 'Broomfield, Colorado',
    employees: '5,000+',
    busCount: 2,
    specialties: ['Earth observation', 'Deep space science', 'Defense sensors', 'Small/medium buses'],
    website: 'ballaerospace.com',
    description: 'A subsidiary of BAE Systems, Ball Aerospace is renowned for building NASA flagship science instruments and spacecraft including the Hubble, James Webb, and Kepler space telescopes. Their BCP bus family is proven across LEO science and defense missions.',
  },
  {
    name: 'Surrey Satellite Technology',
    country: 'United Kingdom',
    founded: 1985,
    headquarters: 'Guildford, Surrey, UK',
    employees: '500+',
    busCount: 2,
    specialties: ['Small satellites', 'Earth observation', 'Constellation deployment', 'Rapid delivery'],
    website: 'sstl.co.uk',
    description: 'Pioneered the modern small satellite industry from the University of Surrey. Now an Airbus subsidiary, SSTL has delivered over 70 satellites for 23 countries and remains a global leader in cost-effective small satellite solutions.',
  },
  {
    name: 'Blue Canyon Technologies',
    country: 'United States',
    founded: 2008,
    headquarters: 'Lafayette, Colorado',
    employees: '800+',
    busCount: 1,
    specialties: ['CubeSats', 'SmallSats', 'Modular bus architecture', 'Rapid production'],
    website: 'bluecanyontech.com',
    description: 'Acquired by Raytheon Technologies in 2021, BCT is the leading provider of SmallSat and CubeSat buses with over 100 spacecraft delivered. Their XB-series covers a uniquely wide mass range from 6U CubeSats to ESPA-class satellites.',
  },
  {
    name: 'Terran Orbital',
    country: 'United States',
    founded: 2013,
    headquarters: 'Boca Raton, Florida',
    employees: '400+',
    busCount: 1,
    specialties: ['LEO constellations', 'Mass production', 'Defense SmallSats', 'Rapid delivery'],
    website: 'terranorbital.com',
    description: 'One of the fastest-growing small satellite manufacturers with a high-volume production facility in Irvine, California. Selected for major SDA and commercial constellation programs. Acquired by Lockheed Martin in 2024.',
  },
  {
    name: 'Northrop Grumman',
    country: 'United States',
    founded: 1939,
    headquarters: 'Falls Church, Virginia',
    employees: '95,000+',
    busCount: 3,
    specialties: ['Defense satellites', 'GEO missions', 'LEO science', 'Mission extension'],
    website: 'northropgrumman.com',
    description: 'A major U.S. defense prime contractor with deep satellite heritage through legacy Orbital Sciences and TRW programs. Builds buses across the full spectrum from LEOStar small science missions to large GEO defense payloads.',
  },
  {
    name: 'Airbus Defence and Space',
    country: 'France / Germany',
    founded: 2000,
    headquarters: 'Toulouse, France',
    employees: '35,000+',
    busCount: 2,
    specialties: ['GEO communications', 'Earth observation', 'Navigation', 'Software-defined satellites'],
    website: 'airbus.com/space',
    description: 'Europe\'s largest space company and world leader in GEO satellite manufacturing. The Eurostar family has been the backbone of global communications for decades. OneSat represents the next generation of fully reconfigurable satellites.',
  },
  {
    name: 'Maxar Technologies',
    country: 'United States',
    founded: 2017,
    headquarters: 'Westminster, Colorado',
    employees: '4,500+',
    busCount: 2,
    specialties: ['GEO broadband', 'Earth observation', 'All-electric propulsion', 'Robotic arms'],
    website: 'maxar.com',
    description: 'The world\'s most experienced GEO satellite bus manufacturer with 120+ spacecraft on the 1300-series platform. Also building NASA\'s HALO module for the Gateway lunar station and the Power and Propulsion Element for Artemis.',
  },
  {
    name: 'Boeing',
    country: 'United States',
    founded: 1916,
    headquarters: 'Arlington, Virginia',
    employees: '170,000+',
    busCount: 1,
    specialties: ['Large GEO platforms', 'All-electric satellites', 'Military comms', 'MEO constellations'],
    website: 'boeing.com/space',
    description: 'Operates the heritage Hughes/Boeing satellite line with the 702 family. Built some of the largest and most powerful GEO satellites ever launched. Also builds the ISS modules and CST-100 Starliner crew vehicle.',
  },
  {
    name: 'Thales Alenia Space',
    country: 'France / Italy',
    founded: 2007,
    headquarters: 'Cannes, France',
    employees: '8,500+',
    busCount: 1,
    specialties: ['GEO communications', 'Navigation (Galileo)', 'Earth observation', 'Space station modules'],
    website: 'thalesaleniaspace.com',
    description: 'A joint venture between Thales (67%) and Leonardo (33%). Manufacturer of the Spacebus family and Europe\'s Galileo navigation satellites. Also builds pressurized modules for the ISS and future space stations.',
  },
  {
    name: 'Lockheed Martin',
    country: 'United States',
    founded: 1995,
    headquarters: 'Bethesda, Maryland',
    employees: '116,000+',
    busCount: 1,
    specialties: ['Military satellites', 'GPS constellation', 'Missile warning', 'Protected comms'],
    website: 'lockheedmartin.com/space',
    description: 'The A2100 bus has been the foundation of U.S. military satellite communications and navigation for over two decades. Lockheed Martin builds GPS III satellites, SBIRS missile warning, and next-generation protected tactical communications.',
  },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatCost(min: number, max: number): string {
  return `$${min}-${max}M`;
}

function formatMass(min: number, max: number): string {
  if (max >= 1000) {
    return `${(min / 1000).toFixed(1)}-${(max / 1000).toFixed(1)}t`;
  }
  return `${min}-${max} kg`;
}

function formatPower(min: number, max: number): string {
  if (max >= 1000) {
    return `${(min / 1000).toFixed(1)}-${(max / 1000).toFixed(0)} kW`;
  }
  return `${min}-${max} W`;
}

function massClassColor(mc: MassClass): string {
  switch (mc) {
    case 'Small': return 'text-green-400 bg-green-900/30 border-green-500/30';
    case 'Medium': return 'text-amber-400 bg-amber-900/30 border-amber-500/30';
    case 'Large': return 'text-red-400 bg-red-900/30 border-red-500/30';
  }
}

function getScoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.75) return 'bg-green-500';
  if (pct >= 0.5) return 'bg-amber-500';
  if (pct >= 0.25) return 'bg-orange-500';
  return 'bg-red-500';
}

// ────────────────────────────────────────
// Tab Definitions
// ────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'database', label: 'Bus Database' },
  { id: 'compare', label: 'Side-by-Side' },
  { id: 'manufacturers', label: 'Manufacturers' },
  { id: 'guide', label: 'Selection Guide' },
];

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SatelliteBusComparisonPage() {
  const [activeTab, setActiveTab] = useState<TabId>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [massClassFilter, setMassClassFilter] = useState<MassClass | ''>('');
  const [orbitFilter, setOrbitFilter] = useState<OrbitType | ''>('');
  const [manufacturerFilter, setManufacturerFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  // Derived lists
  const allManufacturers = useMemo(
    () => Array.from(new Set(SATELLITE_BUSES.map(b => b.manufacturer))).sort(),
    []
  );
  const allOrbits = useMemo(
    () => Array.from(new Set(SATELLITE_BUSES.flatMap(b => b.orbits))).sort(),
    []
  );

  // Filter + sort
  const filteredBuses = useMemo(() => {
    let result = [...SATELLITE_BUSES];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.manufacturer.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.notableMissions.some(m => m.toLowerCase().includes(q))
      );
    }

    if (massClassFilter) {
      result = result.filter(b => b.massClass === massClassFilter);
    }

    if (orbitFilter) {
      result = result.filter(b => b.orbits.includes(orbitFilter));
    }

    if (manufacturerFilter) {
      result = result.filter(b => b.manufacturer === manufacturerFilter);
    }

    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'mass':
        result.sort((a, b) => a.dryMassMaxKg - b.dryMassMaxKg);
        break;
      case 'power':
        result.sort((a, b) => b.powerMaxW - a.powerMaxW);
        break;
      case 'cost':
        result.sort((a, b) => a.costMillionsMin - b.costMillionsMin);
        break;
      case 'designLife':
        result.sort((a, b) => b.designLifeYears - a.designLifeYears);
        break;
      case 'manufacturer':
        result.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
        break;
    }

    return result;
  }, [searchQuery, massClassFilter, orbitFilter, manufacturerFilter, sortBy]);

  const selectedBuses = useMemo(
    () => SATELLITE_BUSES.filter(b => compareSelection.includes(b.id)),
    [compareSelection]
  );

  const toggleCompare = (bus: SatelliteBus) => {
    setCompareSelection(prev => {
      if (prev.includes(bus.id)) return prev.filter(id => id !== bus.id);
      if (prev.length >= 3) return prev;
      return [...prev, bus.id];
    });
  };

  // Stats
  const totalBuses = SATELLITE_BUSES.length;
  const smallCount = SATELLITE_BUSES.filter(b => b.massClass === 'Small').length;
  const mediumCount = SATELLITE_BUSES.filter(b => b.massClass === 'Medium').length;
  const largeCount = SATELLITE_BUSES.filter(b => b.massClass === 'Large').length;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">

        <AnimatedPageHeader
          title="Satellite Bus Comparison"
          subtitle="Compare satellite bus platforms from major manufacturers worldwide. Filter by mass class, orbit, and manufacturer to find the right bus for your mission."
          icon={<span>&#x1F6F0;&#xFE0F;</span>}
          accentColor="cyan"
        />

        {/* Quick Stats */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold font-display text-white">{totalBuses}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Bus Platforms</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold font-display text-green-400">{smallCount}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Small / Micro</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold font-display text-amber-400">{mediumCount}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Medium</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold font-display text-red-400">{largeCount}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Large</div>
            </div>
          </div>
        </ScrollReveal>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-700/50 pb-3">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-lg shadow-black/10'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.id === 'compare' && compareSelection.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-white/10 text-slate-200 rounded text-xs">
                  {compareSelection.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ──────────────────────────────── */}
        {/* TAB: Bus Database                */}
        {/* ──────────────────────────────── */}
        {activeTab === 'database' && (
          <div>
            {/* Filters Row */}
            <div className="card p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Search</label>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Bus name, manufacturer..."
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-white/15"
                  />
                </div>
                {/* Mass Class */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Mass Class</label>
                  <select
                    value={massClassFilter}
                    onChange={(e) => setMassClassFilter(e.target.value as MassClass | '')}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-white/15"
                  >
                    <option value="">All Classes</option>
                    <option value="Small">Small / Micro (50-300 kg)</option>
                    <option value="Medium">Medium (300-3000 kg)</option>
                    <option value="Large">Large (3000+ kg)</option>
                  </select>
                </div>
                {/* Orbit */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Orbit</label>
                  <select
                    value={orbitFilter}
                    onChange={(e) => setOrbitFilter(e.target.value as OrbitType | '')}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-white/15"
                  >
                    <option value="">All Orbits</option>
                    {allOrbits.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                {/* Manufacturer */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Manufacturer</label>
                  <select
                    value={manufacturerFilter}
                    onChange={(e) => setManufacturerFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-white/15"
                  >
                    <option value="">All Manufacturers</option>
                    {allManufacturers.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {/* Sort */}
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-white/15"
                  >
                    <option value="name">Name</option>
                    <option value="mass">Mass (low to high)</option>
                    <option value="power">Power (high to low)</option>
                    <option value="cost">Cost (low to high)</option>
                    <option value="designLife">Design Life (longest)</option>
                    <option value="manufacturer">Manufacturer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <p className="text-sm text-slate-400 mb-4">
              Showing {filteredBuses.length} of {totalBuses} satellite buses
            </p>

            {/* Bus Table */}
            <div className="card overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Manufacturer</th>
                      <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Bus Name</th>
                      <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Class</th>
                      <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Mass Range</th>
                      <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Power</th>
                      <th className="text-center p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Life (yr)</th>
                      <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Orbits</th>
                      <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Payload</th>
                      <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Cost</th>
                      <th className="text-center p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Compare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuses.map((bus, i) => (
                      <tr
                        key={bus.id}
                        className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors ${
                          i % 2 === 0 ? 'bg-slate-800/10' : ''
                        }`}
                      >
                        <td className="p-3 text-slate-300 whitespace-nowrap">{bus.manufacturer}</td>
                        <td className="p-3 text-white font-semibold whitespace-nowrap">{bus.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${massClassColor(bus.massClass)}`}>
                            {bus.massClass}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 whitespace-nowrap font-mono text-xs">{formatMass(bus.dryMassKg, bus.dryMassMaxKg)}</td>
                        <td className="p-3 text-slate-300 whitespace-nowrap font-mono text-xs">{formatPower(bus.powerW, bus.powerMaxW)}</td>
                        <td className="p-3 text-center text-slate-300 font-mono text-xs">{bus.designLifeYears}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {bus.orbits.map(o => (
                              <span key={o} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/40 text-slate-300 border border-white/10">
                                {o}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300 whitespace-nowrap font-mono text-xs">{formatMass(bus.payloadMassKg, bus.payloadMassMaxKg)}</td>
                        <td className="p-3 text-emerald-400 whitespace-nowrap font-mono text-xs font-semibold">{formatCost(bus.costMillionsMin, bus.costMillionsMax)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleCompare(bus)}
                            disabled={!compareSelection.includes(bus.id) && compareSelection.length >= 3}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                              compareSelection.includes(bus.id)
                                ? 'bg-white text-slate-900'
                                : compareSelection.length >= 3
                                  ? 'bg-slate-700/30 text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                            }`}
                          >
                            {compareSelection.includes(bus.id) ? 'Selected' : 'Add'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bus Detail Cards */}
            <h3 className="text-lg font-bold text-white mb-4">Detailed Profiles</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredBuses.map(bus => (
                <ScrollReveal key={bus.id}>
                  <div className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-white">{bus.name}</h4>
                        <p className="text-sm text-slate-400">{bus.manufacturer}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${massClassColor(bus.massClass)}`}>
                        {bus.massClass}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 mb-4 leading-relaxed">{bus.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-800/40 rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Dry Mass</span>
                        <span className="text-sm text-white font-semibold">{formatMass(bus.dryMassKg, bus.dryMassMaxKg)}</span>
                      </div>
                      <div className="bg-slate-800/40 rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Power</span>
                        <span className="text-sm text-white font-semibold">{formatPower(bus.powerW, bus.powerMaxW)}</span>
                      </div>
                      <div className="bg-slate-800/40 rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Design Life</span>
                        <span className="text-sm text-white font-semibold">{bus.designLifeYears} years</span>
                      </div>
                      <div className="bg-slate-800/40 rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Payload</span>
                        <span className="text-sm text-white font-semibold">{formatMass(bus.payloadMassKg, bus.payloadMassMaxKg)}</span>
                      </div>
                      <div className="bg-slate-800/40 rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Cost</span>
                        <span className="text-sm text-emerald-400 font-semibold">{formatCost(bus.costMillionsMin, bus.costMillionsMax)}</span>
                      </div>
                      <div className="bg-slate-800/40 rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Data Rate</span>
                        <span className="text-sm text-white font-semibold">{bus.dataRate}</span>
                      </div>
                    </div>

                    {/* Subsystems */}
                    <div className="space-y-1.5 mb-4 text-xs">
                      <div className="flex gap-2">
                        <span className="text-slate-500 min-w-[80px]">Propulsion:</span>
                        <span className="text-slate-300">{bus.propulsion}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-500 min-w-[80px]">ADCS:</span>
                        <span className="text-slate-300">{bus.attitude}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-500 min-w-[80px]">Thermal:</span>
                        <span className="text-slate-300">{bus.thermalControl}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-500 min-w-[80px]">Heritage:</span>
                        <span className="text-slate-300">{bus.heritage}</span>
                      </div>
                    </div>

                    {/* Orbits + Missions */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {bus.orbits.map(o => (
                        <span key={o} className="px-2 py-0.5 rounded text-[10px] bg-slate-800/40 text-slate-300 border border-white/10">
                          {o}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {bus.notableMissions.map(m => (
                        <span key={m} className="px-2 py-0.5 rounded text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/20">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              ))}

        <RelatedModules modules={PAGE_RELATIONS['satellite-bus-comparison']} />
            </div>
          </div>
        )}

        {/* ──────────────────────────────── */}
        {/* TAB: Side-by-Side Comparison     */}
        {/* ──────────────────────────────── */}
        {activeTab === 'compare' && (
          <div>
            {selectedBuses.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-4">&#x1F50D;</div>
                <h3 className="text-lg font-bold text-white mb-2">No Buses Selected</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Select 2 or 3 satellite buses from the Bus Database tab to compare them side-by-side.
                </p>
                <button
                  onClick={() => setActiveTab('database')}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-sm rounded-lg font-medium transition-colors"
                >
                  Go to Bus Database
                </button>
              </div>
            ) : (
              <>
                {/* Selection summary */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedBuses.map(bus => (
                    <span
                      key={bus.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/40 border border-white/10 rounded-lg text-sm text-slate-200"
                    >
                      {bus.name} ({bus.manufacturer})
                      <button
                        onClick={() => toggleCompare(bus)}
                        className="text-slate-300 hover:text-red-400 transition-colors font-bold"
                        aria-label={`Remove ${bus.name} from comparison`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                  {selectedBuses.length < 3 && (
                    <button
                      onClick={() => setActiveTab('database')}
                      className="px-3 py-1.5 bg-slate-800/60 border border-dashed border-slate-600/50 rounded-lg text-sm text-slate-400 hover:text-white hover:border-white/10 transition-colors"
                    >
                      + Add Bus
                    </button>
                  )}
                </div>

                {/* Comparison Table */}
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="text-left p-4 text-slate-400 font-medium text-xs uppercase tracking-wider w-48">Attribute</th>
                          {selectedBuses.map(bus => (
                            <th key={bus.id} className="text-left p-4 min-w-[220px]">
                              <div className="text-white font-bold">{bus.name}</div>
                              <div className="text-slate-400 text-xs">{bus.manufacturer}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Mass Class', render: (b: SatelliteBus) => <span className={`px-2 py-0.5 rounded text-xs font-medium border ${massClassColor(b.massClass)}`}>{b.massClass}</span> },
                          { label: 'Dry Mass', render: (b: SatelliteBus) => formatMass(b.dryMassKg, b.dryMassMaxKg) },
                          { label: 'Power', render: (b: SatelliteBus) => formatPower(b.powerW, b.powerMaxW) },
                          { label: 'Design Life', render: (b: SatelliteBus) => `${b.designLifeYears} years` },
                          { label: 'Orbits', render: (b: SatelliteBus) => (
                            <div className="flex flex-wrap gap-1">
                              {b.orbits.map(o => (
                                <span key={o} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/40 text-slate-300 border border-white/10">{o}</span>
                              ))}
                            </div>
                          )},
                          { label: 'Payload Mass', render: (b: SatelliteBus) => formatMass(b.payloadMassKg, b.payloadMassMaxKg) },
                          { label: 'Approx Cost', render: (b: SatelliteBus) => <span className="text-emerald-400 font-semibold">{formatCost(b.costMillionsMin, b.costMillionsMax)}</span> },
                          { label: 'Propulsion', render: (b: SatelliteBus) => b.propulsion },
                          { label: 'Attitude Control', render: (b: SatelliteBus) => b.attitude },
                          { label: 'Thermal Control', render: (b: SatelliteBus) => b.thermalControl },
                          { label: 'Data Rate', render: (b: SatelliteBus) => b.dataRate },
                          { label: 'Heritage', render: (b: SatelliteBus) => b.heritage },
                          { label: 'Notable Missions', render: (b: SatelliteBus) => (
                            <div className="flex flex-wrap gap-1">
                              {b.notableMissions.map(m => (
                                <span key={m} className="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/20">{m}</span>
                              ))}
                            </div>
                          )},
                        ].map((row, i) => (
                          <tr key={row.label} className={`border-b border-slate-700/20 ${i % 2 === 0 ? 'bg-slate-800/10' : ''}`}>
                            <td className="p-4 text-slate-400 font-medium text-xs uppercase tracking-wider">{row.label}</td>
                            {selectedBuses.map(bus => (
                              <td key={bus.id} className="p-4 text-slate-300 text-sm">{row.render(bus)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Visual Comparison Bars */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Power Comparison */}
                  <div className="card p-5">
                    <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Max Power Comparison</h4>
                    <div className="space-y-3">
                      {selectedBuses.map(bus => {
                        const maxPower = Math.max(...selectedBuses.map(b => b.powerMaxW));
                        const pct = (bus.powerMaxW / maxPower) * 100;
                        return (
                          <div key={bus.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300">{bus.name}</span>
                              <span className="text-white font-mono">{formatPower(bus.powerW, bus.powerMaxW)}</span>
                            </div>
                            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getScoreColor(pct, 100)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mass Comparison */}
                  <div className="card p-5">
                    <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Max Mass Comparison</h4>
                    <div className="space-y-3">
                      {selectedBuses.map(bus => {
                        const maxMass = Math.max(...selectedBuses.map(b => b.dryMassMaxKg));
                        const pct = (bus.dryMassMaxKg / maxMass) * 100;
                        return (
                          <div key={bus.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300">{bus.name}</span>
                              <span className="text-white font-mono">{formatMass(bus.dryMassKg, bus.dryMassMaxKg)}</span>
                            </div>
                            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-white"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cost Comparison */}
                  <div className="card p-5">
                    <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Cost Range Comparison</h4>
                    <div className="space-y-3">
                      {selectedBuses.map(bus => {
                        const maxCost = Math.max(...selectedBuses.map(b => b.costMillionsMax));
                        const minPct = (bus.costMillionsMin / maxCost) * 100;
                        const maxPct = (bus.costMillionsMax / maxCost) * 100;
                        return (
                          <div key={bus.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300">{bus.name}</span>
                              <span className="text-emerald-400 font-mono">{formatCost(bus.costMillionsMin, bus.costMillionsMax)}</span>
                            </div>
                            <div className="h-3 bg-slate-700 rounded-full overflow-hidden relative">
                              <div
                                className="h-full rounded-full transition-all bg-emerald-500 absolute"
                                style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Design Life Comparison */}
                  <div className="card p-5">
                    <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Design Life Comparison</h4>
                    <div className="space-y-3">
                      {selectedBuses.map(bus => {
                        const maxLife = Math.max(...selectedBuses.map(b => b.designLifeYears));
                        const pct = (bus.designLifeYears / maxLife) * 100;
                        return (
                          <div key={bus.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-300">{bus.name}</span>
                              <span className="text-white font-mono">{bus.designLifeYears} years</span>
                            </div>
                            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all bg-purple-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ──────────────────────────────── */}
        {/* TAB: Manufacturer Directory      */}
        {/* ──────────────────────────────── */}
        {activeTab === 'manufacturers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {MANUFACTURERS.map(mfr => (
              <ScrollReveal key={mfr.name}>
                <div className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-white">{mfr.name}</h4>
                      <p className="text-xs text-slate-400">{mfr.headquarters} | Founded {mfr.founded}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-300 border border-slate-600/30">
                      {mfr.country}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 mb-4 leading-relaxed">{mfr.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-800/40 rounded-lg p-2.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Employees</span>
                      <span className="text-sm text-white font-semibold">{mfr.employees}</span>
                    </div>
                    <div className="bg-slate-800/40 rounded-lg p-2.5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Bus Platforms</span>
                      <span className="text-sm text-slate-300 font-semibold">{mfr.busCount} in database</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Specialties</span>
                    <div className="flex flex-wrap gap-1.5">
                      {mfr.specialties.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-slate-800/30 text-slate-300 border border-white/10">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Buses from this manufacturer */}
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Bus Platforms</span>
                    <div className="flex flex-wrap gap-1.5">
                      {SATELLITE_BUSES.filter(b => b.manufacturer === mfr.name || b.manufacturer.includes(mfr.name.split(' ')[0])).map(b => (
                        <span key={b.id} className="px-2 py-0.5 rounded text-[10px] bg-purple-900/20 text-purple-400 border border-purple-500/20">
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* ──────────────────────────────── */}
        {/* TAB: Selection Guide             */}
        {/* ──────────────────────────────── */}
        {activeTab === 'guide' && (
          <div className="space-y-8">
            {/* Decision Matrix */}
            <ScrollReveal>
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-2">Satellite Bus Selection Decision Matrix</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Use this matrix to narrow down the right bus platform based on your mission requirements. Each factor should be weighted according to your specific program priorities.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Requirement</th>
                        <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Small Bus</th>
                        <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Medium Bus</th>
                        <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Large Bus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          req: 'Budget',
                          small: '$1-30M per unit',
                          medium: '$15-150M per unit',
                          large: '$80-250M per unit',
                        },
                        {
                          req: 'Mission Duration',
                          small: '3-7 years typical',
                          medium: '7-15 years typical',
                          large: '15+ years typical',
                        },
                        {
                          req: 'Payload Power',
                          small: '< 1 kW',
                          medium: '1-12 kW',
                          large: '12-25 kW',
                        },
                        {
                          req: 'Payload Mass',
                          small: '< 200 kg',
                          medium: '200-1500 kg',
                          large: '500-2500 kg',
                        },
                        {
                          req: 'Orbit',
                          small: 'LEO / SSO primarily',
                          medium: 'LEO / MEO / GEO flexible',
                          large: 'GEO primarily',
                        },
                        {
                          req: 'Build Time',
                          small: '12-24 months',
                          medium: '18-36 months',
                          large: '24-48 months',
                        },
                        {
                          req: 'Constellation',
                          small: 'Ideal for large constellations',
                          medium: 'MEO constellations, smaller GEO fleets',
                          large: 'Single high-value assets',
                        },
                        {
                          req: 'Risk Tolerance',
                          small: 'Higher (replenishable)',
                          medium: 'Moderate',
                          large: 'Low (mission-critical)',
                        },
                        {
                          req: 'Launch Flexibility',
                          small: 'Rideshare, dedicated small, ESPA',
                          medium: 'Dedicated medium, dual-manifest',
                          large: 'Dedicated heavy-lift',
                        },
                      ].map((row, i) => (
                        <tr key={row.req} className={`border-b border-slate-700/20 ${i % 2 === 0 ? 'bg-slate-800/10' : ''}`}>
                          <td className="p-3 text-white font-medium">{row.req}</td>
                          <td className="p-3 text-green-400 text-xs">{row.small}</td>
                          <td className="p-3 text-amber-400 text-xs">{row.medium}</td>
                          <td className="p-3 text-red-400 text-xs">{row.large}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>

            {/* Key Considerations */}
            <ScrollReveal>
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Key Selection Considerations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      title: 'Heritage & Reliability',
                      color: 'cyan',
                      items: [
                        'Number of successful flights on the bus platform',
                        'On-orbit anomaly history and resolution track record',
                        'Manufacturing maturity and production line stability',
                        'Component supply chain reliability and lead times',
                      ],
                    },
                    {
                      title: 'Payload Accommodation',
                      color: 'purple',
                      items: [
                        'Available volume envelope for instrument integration',
                        'Structural mounting interface compatibility',
                        'Thermal and electrical isolation from bus subsystems',
                        'Field of view and pointing accuracy requirements',
                      ],
                    },
                    {
                      title: 'Cost & Schedule Drivers',
                      color: 'emerald',
                      items: [
                        'Non-recurring engineering (NRE) for bus modifications',
                        'Recurring unit cost for constellation procurements',
                        'Lead time from contract to delivery (typically 18-48 months)',
                        'Integration and test campaign duration and facility needs',
                      ],
                    },
                    {
                      title: 'Orbit & Operations',
                      color: 'amber',
                      items: [
                        'Delta-V budget for orbit raising, station-keeping, and disposal',
                        'Ground segment compatibility and contact window analysis',
                        'Radiation environment tolerance (especially MEO/GEO)',
                        'End-of-life disposal compliance (25-year rule / 5-year FCC rule)',
                      ],
                    },
                  ].map(section => (
                    <div key={section.title}>
                      <h4 className={`text-sm font-bold mb-3 ${
                        section.color === 'cyan' ? 'text-slate-300' :
                        section.color === 'purple' ? 'text-purple-400' :
                        section.color === 'emerald' ? 'text-emerald-400' :
                        'text-amber-400'
                      }`}>{section.title}</h4>
                      <ul className="space-y-2">
                        {section.items.map(item => (
                          <li key={item} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                              section.color === 'cyan' ? 'bg-white' :
                              section.color === 'purple' ? 'bg-purple-400' :
                              section.color === 'emerald' ? 'bg-emerald-400' :
                              'bg-amber-400'
                            }`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Mission Type Recommendations */}
            <ScrollReveal>
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Recommended Buses by Mission Type</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      mission: 'LEO Earth Observation Constellation',
                      color: 'green',
                      recommended: ['XB-series', 'Terran Orbital', 'SSTL-150', 'Maxar Legion'],
                      rationale: 'High-volume production, rapid delivery, low per-unit cost. Constellation resilience compensates for shorter individual design life.',
                    },
                    {
                      mission: 'GEO Broadband Communications',
                      color: 'amber',
                      recommended: ['Eurostar Neo', 'Maxar 1300', 'Boeing 702', 'Spacebus Neo'],
                      rationale: 'High power for HTS payloads, 15+ year design life, all-electric or hybrid propulsion to maximize payload mass fraction.',
                    },
                    {
                      mission: 'Military / Government LEO',
                      color: 'red',
                      recommended: ['ESPAStar', 'LEOStar-2', 'Arrow', 'BCP-Small'],
                      rationale: 'SDA-compatible, ESPA-class form factor, secure ground segment interfaces, rapid replenishment capability for resilient architectures.',
                    },
                    {
                      mission: 'Deep Space / Science',
                      color: 'purple',
                      recommended: ['BCP-100', 'BCP-Small', 'LEOStar-2'],
                      rationale: 'Proven heritage on NASA science missions, precision pointing, robust thermal control for extreme environments.',
                    },
                    {
                      mission: 'GEO Military Communications',
                      color: 'cyan',
                      recommended: ['A2100', 'LM 2100', 'GEOStar-1'],
                      rationale: 'Protected communications heritage, anti-jam capability, hardened electronics for nuclear environments.',
                    },
                    {
                      mission: 'Software-Defined / Flexible GEO',
                      color: 'emerald',
                      recommended: ['OneSat', 'Eurostar Neo', 'Spacebus Neo'],
                      rationale: 'In-orbit reconfigurability, digital payload processing, ability to redirect capacity based on changing market demands.',
                    },
                  ].map(rec => (
                    <div key={rec.mission} className={`bg-slate-800/40 rounded-xl p-4 border ${
                      rec.color === 'green' ? 'border-green-500/20' :
                      rec.color === 'amber' ? 'border-amber-500/20' :
                      rec.color === 'red' ? 'border-red-500/20' :
                      rec.color === 'purple' ? 'border-purple-500/20' :
                      rec.color === 'cyan' ? 'border-white/10' :
                      'border-emerald-500/20'
                    }`}>
                      <h5 className={`text-sm font-bold mb-2 ${
                        rec.color === 'green' ? 'text-green-400' :
                        rec.color === 'amber' ? 'text-amber-400' :
                        rec.color === 'red' ? 'text-red-400' :
                        rec.color === 'purple' ? 'text-purple-400' :
                        rec.color === 'cyan' ? 'text-slate-300' :
                        'text-emerald-400'
                      }`}>{rec.mission}</h5>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {rec.recommended.map(name => (
                          <span key={name} className="px-2 py-0.5 rounded text-[10px] bg-slate-700/50 text-white border border-slate-600/30 font-medium">
                            {name}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{rec.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Procurement Process Overview */}
            <ScrollReveal>
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Satellite Bus Procurement Process</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      step: '1',
                      title: 'Requirements Definition',
                      desc: 'Define mission objectives, orbit, payload specs, design life, and budget envelope. Create a System Requirements Document (SRD).',
                    },
                    {
                      step: '2',
                      title: 'Request for Information',
                      desc: 'Issue RFI to potential bus providers to assess capability, schedule, and rough-order-of-magnitude (ROM) cost.',
                    },
                    {
                      step: '3',
                      title: 'Trade Study & Down-select',
                      desc: 'Evaluate responses against weighted criteria: technical performance, cost, schedule, heritage, risk.',
                    },
                    {
                      step: '4',
                      title: 'Contract & Build',
                      desc: 'Negotiate fixed-price or cost-plus contract. Bus build typically 18-48 months through CDR, integration, and environmental testing.',
                    },
                  ].map(step => (
                    <div key={step.step} className="bg-slate-800/40 rounded-xl p-4 relative">
                      <div className="absolute -top-3 -left-1 w-7 h-7 bg-white rounded-full flex items-center justify-center text-slate-900 text-xs font-bold">
                        {step.step}
                      </div>
                      <h5 className="text-sm font-bold text-white mt-2 mb-2">{step.title}</h5>
                      <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Glossary of Terms */}
            <ScrollReveal>
              <div className="card p-6">
                <h3 className="text-xl font-bold text-white mb-4">Satellite Bus Terminology</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {[
                    { term: 'Bus (Platform)', def: 'The structural and functional backbone of a satellite that provides power, propulsion, thermal control, and communications to the payload.' },
                    { term: 'Dry Mass', def: 'Mass of the satellite bus without propellant. Launch mass includes propellant for orbit raising and station-keeping.' },
                    { term: 'Payload Mass', def: 'Maximum mass of mission-specific instruments and equipment the bus can support.' },
                    { term: 'Design Life', def: 'The minimum operational lifetime the bus is designed and qualified to achieve in its target orbit environment.' },
                    { term: 'ADCS', def: 'Attitude Determination and Control System. Maintains the satellite\'s orientation using reaction wheels, thrusters, star trackers, and other sensors.' },
                    { term: 'BOL / EOL Power', def: 'Beginning of Life / End of Life power. Solar array degradation reduces available power over the mission; EOL power is the design constraint.' },
                    { term: 'All-Electric Propulsion', def: 'Uses electric thrusters (ion or Hall-effect) instead of chemical propulsion for orbit raising and station-keeping. Saves mass but requires longer transfer times.' },
                    { term: 'ESPA Class', def: 'EELV Secondary Payload Adapter. A standardized interface ring allowing secondary payloads (up to ~450 kg each) to ride with a primary payload.' },
                    { term: 'TRL (Technology Readiness Level)', def: 'NASA scale from 1 (basic research) to 9 (flight-proven). Bus heritage is often expressed in terms of TRL for key subsystems.' },
                    { term: 'Delta-V Budget', def: 'Total velocity change capacity of the propulsion system. Determines orbit transfer capability and on-orbit maneuvering lifetime.' },
                  ].map(item => (
                    <div key={item.term} className="py-2">
                      <dt className="text-sm font-semibold text-slate-300">{item.term}</dt>
                      <dd className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.def}</dd>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}
      </div>
    </div>
  );
}
