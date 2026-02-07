'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'dsn' | 'relay' | 'optical' | 'lunar' | 'standards';

interface DSNComplex {
  id: string;
  name: string;
  location: string;
  coordinates: string;
  country: string;
  antennas: DSNAntenna[];
  missionsServed: string[];
  description: string;
  established: number;
}

interface DSNAntenna {
  designation: string;
  diameter: string;
  type: string;
  bands: string[];
  maxDataRate: string;
  features: string;
}

interface RelayNetwork {
  id: string;
  name: string;
  operator: string;
  constellation: string;
  orbit: string;
  coverage: string;
  status: 'operational' | 'deploying' | 'development' | 'decommissioning';
  capabilities: string[];
  dataRate: string;
  description: string;
  users: string[];
}

interface OpticalSystem {
  id: string;
  name: string;
  operator: string;
  status: 'operational' | 'demonstrated' | 'development' | 'commercial';
  type: 'demonstration' | 'relay' | 'terminal' | 'deep-space';
  maxDataRate: string;
  wavelength: string;
  distance: string;
  launchDate: string;
  description: string;
  milestones: string[];
}

interface CCSDSProtocol {
  name: string;
  abbreviation: string;
  layer: string;
  description: string;
  usedBy: string[];
}

interface FrequencyAllocation {
  band: string;
  range: string;
  allocation: string;
  typicalUse: string;
  maxDataRate: string;
  color: string;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const DSN_COMPLEXES: DSNComplex[] = [
  {
    id: 'goldstone',
    name: 'Goldstone Deep Space Communications Complex',
    location: 'Mojave Desert, California, USA',
    coordinates: '35.4267 N, 116.8900 W',
    country: 'United States',
    established: 1958,
    description: 'The Goldstone complex is situated in the Mojave Desert approximately 72 km north of Barstow, California. It was the first DSN site established and is operated by JPL. The complex occupies a portion of the Fort Irwin Military Reservation, which provides a radio-quiet environment critical for receiving faint spacecraft signals. Goldstone serves as the primary development and testing site for new DSN technologies.',
    antennas: [
      {
        designation: 'DSS-14 (Mars)',
        diameter: '70m',
        type: 'Cassegrain',
        bands: ['S-band', 'X-band'],
        maxDataRate: '~28 kbps from Mars distance',
        features: 'Largest steerable antenna in DSN. Originally 64m, expanded to 70m in 1988. Used for critical spacecraft encounters and emergency communications.',
      },
      {
        designation: 'DSS-25',
        diameter: '34m BWG',
        type: 'Beam Waveguide',
        bands: ['S-band', 'X-band', 'Ka-band'],
        maxDataRate: '~150 Mbps (LEO), ~6 Mbps (Mars)',
        features: 'Beam waveguide design routes signals through a series of mirrors to a below-ground equipment room, enabling easier maintenance and upgrades.',
      },
      {
        designation: 'DSS-26',
        diameter: '34m BWG',
        type: 'Beam Waveguide',
        bands: ['S-band', 'X-band', 'Ka-band'],
        maxDataRate: '~150 Mbps (LEO)',
        features: 'Ka-band capable for high-data-rate deep space missions. Supports arraying with other DSN antennas for improved signal reception.',
      },
      {
        designation: 'DSS-24',
        diameter: '34m BWG',
        type: 'Beam Waveguide',
        bands: ['S-band', 'X-band', 'Ka-band'],
        maxDataRate: '~150 Mbps (LEO)',
        features: 'Part of the BWG subnet; supports multiple simultaneous spacecraft contacts through frequency multiplexing.',
      },
    ],
    missionsServed: ['Voyager 1 & 2', 'Mars rovers (Curiosity, Perseverance)', 'Juno', 'Psyche', 'New Horizons', 'Parker Solar Probe', 'OSIRIS-REx'],
  },
  {
    id: 'canberra',
    name: 'Canberra Deep Space Communication Complex',
    location: 'Tidbinbilla, ACT, Australia',
    coordinates: '35.4014 S, 148.9817 E',
    country: 'Australia',
    established: 1965,
    description: 'Located about 40 km southwest of Canberra in the Tidbinbilla Nature Reserve, the Canberra complex is managed by CSIRO on behalf of NASA. It provides critical Southern Hemisphere coverage and is the only DSN site able to communicate with spacecraft at far-southern declinations. The site is frequently the sole contact point for Voyager 2 due to its southern trajectory.',
    antennas: [
      {
        designation: 'DSS-43',
        diameter: '70m',
        type: 'Cassegrain',
        bands: ['S-band', 'X-band'],
        maxDataRate: '~28 kbps from Mars distance',
        features: 'Only antenna capable of commanding Voyager 2. Underwent major upgrades 2020-2021 including new X-band transmitter and cone replacement.',
      },
      {
        designation: 'DSS-35',
        diameter: '34m BWG',
        type: 'Beam Waveguide',
        bands: ['S-band', 'X-band', 'Ka-band'],
        maxDataRate: '~150 Mbps (LEO)',
        features: 'Commissioned in 2015, newest BWG antenna at Canberra. Designed for next-generation deep space missions.',
      },
      {
        designation: 'DSS-36',
        diameter: '34m BWG',
        type: 'Beam Waveguide',
        bands: ['S-band', 'X-band', 'Ka-band'],
        maxDataRate: '~150 Mbps (LEO)',
        features: 'Completed in 2016. Supports array configurations with DSS-43 and DSS-35 for enhanced sensitivity.',
      },
    ],
    missionsServed: ['Voyager 2', 'Mars Express', 'Chandrayaan', 'Hayabusa2', 'BepiColombo', 'JUICE', 'Europa Clipper'],
  },
  {
    id: 'madrid',
    name: 'Madrid Deep Space Communications Complex',
    location: 'Robledo de Chavela, Madrid, Spain',
    coordinates: '40.4314 N, 4.2481 W',
    country: 'Spain',
    established: 1964,
    description: 'Situated approximately 60 km west of Madrid near the town of Robledo de Chavela, the Madrid complex is operated by INTA (Instituto Nacional de Tecnica Aeroespacial) under agreement with NASA. It provides European coverage and fills the longitudinal gap between Goldstone and Canberra, ensuring continuous 24-hour spacecraft coverage.',
    antennas: [
      {
        designation: 'DSS-63',
        diameter: '70m',
        type: 'Cassegrain',
        bands: ['S-band', 'X-band'],
        maxDataRate: '~28 kbps from Mars distance',
        features: 'Third 70m antenna in the DSN network. Critical for European coverage window. Supports planetary radar science.',
      },
      {
        designation: 'DSS-55',
        diameter: '34m BWG',
        type: 'Beam Waveguide',
        bands: ['S-band', 'X-band', 'Ka-band'],
        maxDataRate: '~150 Mbps (LEO)',
        features: 'Commissioned in 2003. One of Madrid\'s primary beam waveguide antennas for routine deep space tracking.',
      },
      {
        designation: 'DSS-56',
        diameter: '34m BWG',
        type: 'Beam Waveguide',
        bands: ['S-band', 'X-band', 'Ka-band', 'K-band'],
        maxDataRate: '~150 Mbps (LEO)',
        features: 'Newest DSN antenna, completed in 2021. First DSN antenna with K-band (26 GHz) receive capability. Designed specifically for next-generation mission support.',
      },
    ],
    missionsServed: ['Mars 2020 (Perseverance)', 'Solar Orbiter', 'James Webb Space Telescope', 'Lucy', 'DART', 'Artemis'],
  },
];

const RELAY_NETWORKS: RelayNetwork[] = [
  {
    id: 'tdrs',
    name: 'Tracking and Data Relay Satellite System (TDRSS)',
    operator: 'NASA / WSC (White Sands Complex)',
    constellation: '6 active satellites (TDRS-6, 7, 8, 9, 10, 11, 12, 13)',
    orbit: 'GEO (35,786 km)',
    coverage: '~85% of LEO orbital coverage (Zone of Exclusion over Indian Ocean)',
    status: 'operational',
    capabilities: [
      'S-band Single Access (SA): voice, telemetry, commanding',
      'Ku-band Single Access: high-rate science data up to 300 Mbps',
      'Ka-band Single Access: up to 800 Mbps forward/return',
      'S-band Multiple Access (MA): simultaneous tracking of up to 5 spacecraft per TDRS',
    ],
    dataRate: 'Up to 800 Mbps (Ka-band SA)',
    description: 'TDRSS has been NASA\'s primary space relay network since 1983. The system provides near-continuous communication coverage for LEO spacecraft, most notably the ISS, Hubble Space Telescope, and numerous Earth science missions. Ground terminal located at White Sands, New Mexico. The fleet is aging, with the oldest active satellites launched in 2000 and the newest (TDRS-13) in 2017.',
    users: ['ISS', 'Hubble Space Telescope', 'Landsat', 'Aqua/Terra', 'GPM', 'ICESat-2', 'Space Shuttle (historical)'],
  },
  {
    id: 'sda-transport',
    name: 'SDA Transport Layer (Proliferated Warfighter Space Architecture)',
    operator: 'Space Development Agency (U.S. Space Force)',
    constellation: 'Tranche 0: 28 satellites, Tranche 1: 126 satellites, Tranche 2: ~250+ planned',
    orbit: 'LEO (~950-1,200 km)',
    coverage: 'Global military mesh network',
    status: 'deploying',
    capabilities: [
      'Optical inter-satellite links (OISL) for mesh networking',
      'Ka-band tactical data links to ground users',
      'Low-latency data transport for missile warning and tracking',
      'Integration with Tracking Layer for kill chain completion',
    ],
    dataRate: '~10 Gbps per optical crosslink',
    description: 'The SDA Transport Layer forms the backbone of the U.S. military\'s Proliferated Warfighter Space Architecture (PWSA). Using commercially-derived small satellites with optical inter-satellite links, it creates a resilient mesh network in LEO for low-latency data transport. Tranche 0 satellites launched in 2023-2024 from York Space Systems and Lockheed Martin. Tranche 1 expanding to 126 satellites with additional capabilities.',
    users: ['U.S. Space Force', 'U.S. Indo-Pacific Command', 'Missile Defense Agency', 'NORTHCOM'],
  },
  {
    id: 'starshield',
    name: 'SpaceX Starshield',
    operator: 'SpaceX (classified government program)',
    constellation: 'Classified (estimated 50-100+ satellites)',
    orbit: 'LEO (multiple orbital planes)',
    coverage: 'Global (classified specifics)',
    status: 'deploying',
    capabilities: [
      'Secure inter-satellite laser links',
      'End-to-end encryption for government communications',
      'Earth observation payload hosting',
      'Mesh networking derived from Starlink architecture',
    ],
    dataRate: 'Classified (likely multi-Gbps based on Starlink heritage)',
    description: 'SpaceX\'s Starshield is a classified government satellite network leveraging Starlink bus technology and laser inter-satellite links. Designed for national security applications including secure communications, Earth observation, and hosted payloads. The NRO awarded SpaceX a $1.8B contract in 2021 for Starshield development. Satellites reportedly incorporate enhanced encryption and secure ground segment.',
    users: ['NRO', 'U.S. Space Force', 'Intelligence Community', 'DoD'],
  },
  {
    id: 'edrs',
    name: 'European Data Relay System (EDRS)',
    operator: 'ESA / Airbus Defence and Space',
    constellation: '2 active nodes (EDRS-A at 9 East, EDRS-C at 31 East)',
    orbit: 'GEO',
    coverage: 'Europe, Africa, Americas, Atlantic',
    status: 'operational',
    capabilities: [
      'Laser inter-satellite links at 1.8 Gbps',
      'Ka-band downlink to ground at 600 Mbps',
      'Near-real-time data relay for LEO satellites',
      'Hosted payload model on commercial GEO satellites',
    ],
    dataRate: '1.8 Gbps (optical ISL)',
    description: 'EDRS, also called the "SpaceDataHighway," is ESA\'s operational laser relay system. It uses GEO-hosted laser communication terminals to relay data from LEO satellites to ground stations in near-real-time. Copernicus Sentinel satellites are the primary users, enabling rapid delivery of Earth observation data. EDRS-A is hosted on Eutelsat 9B, while EDRS-C is a dedicated satellite.',
    users: ['Copernicus Sentinel-1', 'Copernicus Sentinel-2', 'ISS (Columbus module)', 'Pléiades Neo', 'Military users'],
  },
  {
    id: 'aws-ground',
    name: 'AWS Ground Station',
    operator: 'Amazon Web Services',
    constellation: '12 antenna locations worldwide',
    orbit: 'Ground-based (supports LEO/MEO/GEO)',
    coverage: 'Global (US, EU, Asia-Pacific, Middle East, Africa)',
    status: 'operational',
    capabilities: [
      'Direct-to-S3 data delivery',
      'S-band, X-band, UHF downlink support',
      'Auto-scaling for burst contacts',
      'Integration with AWS compute, storage, AI/ML',
    ],
    dataRate: 'Up to 800 Mbps (X-band)',
    description: 'AWS Ground Station provides satellite ground station as a service, integrating directly with AWS cloud infrastructure. Operators schedule satellite contacts through the AWS console, and data flows directly into S3 buckets for processing with EC2, Lambda, or SageMaker. Pay-per-minute pricing with no capital infrastructure investment.',
    users: ['Capella Space', 'Spire Global', 'Maxar', 'D-Orbit', 'HawkEye 360'],
  },
  {
    id: 'azure-orbital',
    name: 'Azure Orbital Ground Station',
    operator: 'Microsoft Azure',
    constellation: '5+ partner sites (KSAT, Viasat, ATLAS)',
    orbit: 'Ground-based (supports LEO/MEO/GEO)',
    coverage: 'Global (via partner network)',
    status: 'operational',
    capabilities: [
      'Azure-native satellite data processing',
      'S-band, X-band, Ka-band support',
      'Partner antenna aggregation (KSAT, Viasat, ATLAS)',
      'Integration with Azure AI, Synapse Analytics, IoT Hub',
    ],
    dataRate: 'Up to 1+ Gbps (Ka-band)',
    description: 'Microsoft Azure Orbital integrates satellite communications directly into the Azure cloud ecosystem. By partnering with established ground station operators (KSAT, Viasat, ATLAS), Azure Orbital provides global coverage without building proprietary antenna infrastructure. Unified billing through Azure portal simplifies ground segment procurement.',
    users: ['SES', 'Loft Orbital', 'Muon Space', 'Government customers'],
  },
];

const OPTICAL_SYSTEMS: OpticalSystem[] = [
  {
    id: 'lcrd',
    name: 'Laser Communications Relay Demonstration (LCRD)',
    operator: 'NASA Goddard Space Flight Center',
    status: 'operational',
    type: 'relay',
    maxDataRate: '1.2 Gbps (bidirectional)',
    wavelength: '1550 nm (near-infrared)',
    distance: 'GEO to ground (~35,786 km)',
    launchDate: 'December 2021',
    description: 'LCRD is NASA\'s first long-duration optical communications relay, hosted on the U.S. Space Force STPSat-6 satellite in GEO. It demonstrates end-to-end laser relay capability between ground stations and LEO user spacecraft. LCRD operates two optical terminals that can simultaneously communicate with ground stations at Table Mountain, California and Haleakala, Hawaii. In 2024, LCRD completed its relay demonstration with the ILLUMA-T terminal on the ISS.',
    milestones: [
      'December 2021: Launched aboard STPSat-6',
      'June 2022: First light -- 1.2 Gbps optical link established with ground station',
      'November 2023: ILLUMA-T terminal installed on ISS',
      'March 2024: First end-to-end laser relay: ISS to LCRD to ground station at 1.2 Gbps',
      'Ongoing: Characterizing atmospheric effects, adaptive optics, and link availability',
    ],
  },
  {
    id: 'dsoc',
    name: 'Deep Space Optical Communications (DSOC)',
    operator: 'NASA JPL',
    status: 'demonstrated',
    type: 'deep-space',
    maxDataRate: '267 Mbps (from 33 million km)',
    wavelength: '1550 nm (downlink), 1064 nm (uplink beacon)',
    distance: 'Up to 390 million km (2x Earth-Sun distance)',
    launchDate: 'October 2023 (aboard Psyche spacecraft)',
    description: 'DSOC is a groundbreaking technology demonstration aboard NASA\'s Psyche asteroid mission spacecraft. It achieved the first-ever laser communication from deep space, transmitting data at rates 10-100x faster than the best radio-frequency systems at comparable distances. The system uses a 22-cm aperture flight laser transceiver and communicates with the 5.1-meter Hale Telescope at Palomar Observatory (California) as its ground receiver.',
    milestones: [
      'November 2023: "First light" -- laser link established from 16 million km (40x Moon distance)',
      'December 2023: Transmitted test data at 267 Mbps from 33 million km',
      'January 2024: Demonstrated stable link at 25 Mbps from 53 million km',
      'March 2024: Maintained 8.3 Mbps link from 225 million km (1.5 AU)',
      'June 2024: Achieved data return from maximum range of 390 million km (2.6 AU)',
      'November 2024: Transmitted 1.58 terabits over 560 million km during technology demonstration phase',
    ],
  },
  {
    id: 'mynaric',
    name: 'Mynaric CONDOR Mk3',
    operator: 'Mynaric AG',
    status: 'commercial',
    type: 'terminal',
    maxDataRate: '100 Gbps',
    wavelength: '1550 nm',
    distance: 'LEO-LEO / LEO-GEO inter-satellite links (up to 7,800 km)',
    launchDate: 'Production since 2023',
    description: 'Mynaric is a leading manufacturer of laser communication terminals for satellite constellations. The CONDOR Mk3 optical inter-satellite link (OISL) terminal is designed for mass production and supports data rates up to 100 Gbps. Mynaric has secured major contracts with the SDA Transport Layer and Telesat Lightspeed. Their Hawthorne, California manufacturing facility can produce hundreds of units per year.',
    milestones: [
      'CONDOR Mk3 qualification completed for SDA Tranche 1',
      'Production contract for SDA Transport Layer (hundreds of units)',
      'Selected by Telesat for Lightspeed constellation optical crosslinks',
      'Northrop Grumman partnership for SDA Tranche 2',
      'Manufacturing capacity: 50+ units per month target',
    ],
  },
  {
    id: 'caci-sa',
    name: 'CACI Crossbeam (formerly SA Photonics)',
    operator: 'CACI International',
    status: 'commercial',
    type: 'terminal',
    maxDataRate: '100+ Gbps',
    wavelength: '1550 nm',
    distance: 'LEO-LEO / LEO-GEO / LEO-Ground',
    launchDate: 'Production since 2022',
    description: 'CACI acquired SA Photonics in 2021, gaining its laser communication terminal technology. The Crossbeam product line serves both government and commercial markets with terminals for space-to-space and space-to-ground links. CACI provides optical terminals for the SDA Transport Layer and has contracts with multiple defense and intelligence programs. Their terminals feature advanced pointing, acquisition, and tracking (PAT) systems.',
    milestones: [
      'SDA Tranche 0 optical terminals delivered and on-orbit',
      'SDA Tranche 1 production underway',
      'On-orbit demonstrations with L3Harris SDA satellites',
      'Ground-to-space optical link demonstrations',
      'Selected for multiple classified NRO programs',
    ],
  },
  {
    id: 'tesat',
    name: 'Tesat-Spacecom LCT',
    operator: 'Tesat-Spacecom (Airbus subsidiary)',
    status: 'operational',
    type: 'terminal',
    maxDataRate: '1.8 Gbps',
    wavelength: '1064 nm',
    distance: 'LEO-GEO (up to 45,000 km)',
    launchDate: 'Operational since 2016 (EDRS)',
    description: 'Tesat-Spacecom manufactures the laser communication terminals (LCTs) used in the European Data Relay System (EDRS). Their technology enables the "SpaceDataHighway" -- the world\'s first commercial laser relay service. The LCT uses a coherent homodyne BPSK detection scheme at 1064 nm wavelength, achieving extremely low bit error rates over 45,000 km LEO-to-GEO links.',
    milestones: [
      '2008: First inter-satellite laser link (TerraSAR-X to NFIRE)',
      '2016: EDRS-A operational -- first commercial laser relay',
      '2019: EDRS-C operational -- expanding coverage',
      '2020+: 50,000+ successful laser links completed',
      'Selected for Copernicus Sentinel expansion program',
    ],
  },
  {
    id: 'spacex-laser',
    name: 'SpaceX Starlink Laser Inter-Satellite Links',
    operator: 'SpaceX',
    status: 'operational',
    type: 'terminal',
    maxDataRate: '~100 Gbps (estimated)',
    wavelength: '~1550 nm (proprietary)',
    distance: 'LEO-LEO (up to ~5,400 km crosslinks)',
    launchDate: '2021 (V1.5 shell, polar orbits)',
    description: 'SpaceX has deployed the largest constellation of laser-linked satellites in history. Starting with Starlink V1.5 polar orbit satellites in 2021, SpaceX equipped satellites with inter-satellite laser links enabling global mesh networking without ground station relays. By 2024, the majority of newly launched Starlink satellites carry laser links, with over 9,000 operational laser terminals on orbit. Each satellite connects to 4 neighbors via laser crosslinks.',
    milestones: [
      '2021: First Starlink satellites with laser links launched (polar shell)',
      '2022: Laser links expanded to mid-inclination shells',
      '2023: Over 5,000 laser-linked satellites operational',
      '2024: 9,000+ laser terminals on orbit -- largest optical network in space',
      'Enables Starlink service in regions without ground stations (oceans, polar)',
    ],
  },
];

const LUNAR_COMMS_ELEMENTS = [
  {
    id: 'lunanet',
    name: 'LunaNet',
    agency: 'NASA',
    status: 'Development',
    statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'LunaNet is NASA\'s architecture framework for lunar communications and navigation services. Inspired by terrestrial internet principles, LunaNet defines interoperable standards that allow multiple providers to offer communications, positioning, navigation, timing (PNT), detection and information services at the Moon. It is designed as an extensible framework -- not a single system -- enabling a multi-vendor lunar infrastructure.',
    keyFeatures: [
      'Delay/Disruption Tolerant Networking (DTN) as the core protocol',
      'Lunar Search and Rescue (LunaSAR) for crew safety',
      'Positioning, Navigation, and Timing (PNT) services',
      'Open architecture for commercial and international provider participation',
      'Interoperability standards for cross-mission compatibility',
    ],
  },
  {
    id: 'csns',
    name: 'Lunar Communications Relay and Navigation System (LCRNS)',
    agency: 'NASA / ESA',
    status: 'Planned',
    statusColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    description: 'The proposed relay satellite constellation for LunaNet. Multiple relay satellites in lunar orbit would provide coverage of the lunar surface, including the far side and polar regions. ESA is studying Moonlight, a parallel initiative to provide commercial lunar communication and navigation services via satellites in lunar orbit.',
    keyFeatures: [
      'Relay satellites in elliptical frozen orbits for polar/far-side coverage',
      'S-band and Ka-band links to surface assets',
      'Optical crosslinks between relay satellites',
      'Integration with Gateway for crew communications',
      'Commercial service model under consideration',
    ],
  },
  {
    id: 'moonlight',
    name: 'ESA Moonlight',
    agency: 'ESA',
    status: 'Development',
    statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'ESA\'s Moonlight initiative aims to create a dedicated lunar communications and navigation constellation as a commercial service. Led by a consortium including Surrey Satellite Technology and Telespazio, Moonlight would deploy 3-5 relay satellites in lunar orbit providing continuous coverage of key areas including the South Pole. The system would offer PNT accuracy within 100 meters.',
    keyFeatures: [
      '3-5 satellites in elliptical lunar orbit (ELO)',
      'Continuous coverage of South Pole and near-side',
      'Navigation accuracy targeting ~100 meters',
      'Commercial service model -- pay-per-use for missions',
      'Interoperable with NASA LunaNet standards',
    ],
  },
  {
    id: 'artemis-comms',
    name: 'Artemis Direct Communications',
    agency: 'NASA',
    status: 'Operational',
    statusColor: 'text-green-400 bg-green-500/10 border-green-500/30',
    description: 'For initial Artemis missions, communications rely on the existing Deep Space Network supplemented by TDRS and the Near Space Network. Orion spacecraft communicates via S-band (TT&C) and Ka-band (high-rate video/data) directly with DSN ground stations. This direct link approach works for near-side operations but cannot support far-side or polar surface missions without relay infrastructure.',
    keyFeatures: [
      'S-band for telemetry, tracking, and commanding via DSN',
      'Ka-band for HD video and high-rate science data',
      'TDRS relay for LEO transit phase',
      'DSN 34m and 70m antenna support',
      'Limited to near-side lunar operations (line of sight to Earth)',
    ],
  },
  {
    id: 'gateway-comms',
    name: 'Lunar Gateway Communications',
    agency: 'NASA / International Partners',
    status: 'Development',
    statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'The Lunar Gateway\'s Power and Propulsion Element (PPE) includes high-rate communications capability to serve as a relay between lunar surface assets and Earth. Gateway will orbit in a Near-Rectilinear Halo Orbit (NRHO) providing periodic coverage of the lunar South Pole and continuous Earth visibility, making it an ideal relay platform for Artemis surface missions.',
    keyFeatures: [
      'Ka-band high-rate link to DSN (up to 600 Mbps)',
      'S-band proximity links to Orion and surface assets',
      'NRHO provides ~6.5 day period with periodic South Pole coverage',
      'Relay capability for surface EVA communications',
      'International partner contribution to comm systems (ESA ESPRIT module)',
    ],
  },
];

const CCSDS_PROTOCOLS: CCSDSProtocol[] = [
  {
    name: 'Space Packet Protocol',
    abbreviation: 'SPP',
    layer: 'Network / Transport',
    description: 'The fundamental data unit protocol for space communications. Defines variable-length packets with 6-byte primary headers containing version, type, APID (Application Process Identifier), sequence count, and data length. Used by virtually all modern spacecraft for telemetry and commanding.',
    usedBy: ['ISS', 'Mars rovers', 'JWST', 'Artemis', 'ESA missions'],
  },
  {
    name: 'TM/TC Space Data Link Protocol',
    abbreviation: 'TM/TC SDLP',
    layer: 'Data Link',
    description: 'Defines telemetry (TM) and telecommand (TC) transfer frames for reliable delivery of data between spacecraft and ground stations. TM frames are fixed-length with virtual channel multiplexing. TC frames support command verification through FARM (Frame Acceptance and Reporting Mechanism) protocol.',
    usedBy: ['All DSN-supported missions', 'ESA ESTRACK missions', 'JAXA missions'],
  },
  {
    name: 'Proximity-1 Space Link Protocol',
    abbreviation: 'Prox-1',
    layer: 'Data Link / Physical',
    description: 'Protocol for short-range communications between spacecraft and surface assets, such as Mars orbiters relaying data from rovers. Supports UHF and S-band links with automatic hailing, link establishment, and data transfer. Designed for store-and-forward relay operations.',
    usedBy: ['Mars Reconnaissance Orbiter', 'Mars Odyssey', 'MAVEN', 'Curiosity/Perseverance relay'],
  },
  {
    name: 'Delay/Disruption Tolerant Networking',
    abbreviation: 'DTN / BP',
    layer: 'Overlay / Network',
    description: 'Bundle Protocol designed for networks with long delays, intermittent connectivity, and high error rates -- exactly the conditions in deep space. Implements store-and-forward routing using "bundles" that can be stored at intermediate nodes until the next link becomes available. Adopted as the core protocol for LunaNet.',
    usedBy: ['ISS (operational since 2016)', 'LunaNet (planned)', 'DTN Gateway tests on LEO satellites'],
  },
  {
    name: 'CCSDS File Delivery Protocol',
    abbreviation: 'CFDP',
    layer: 'Application',
    description: 'Reliable file transfer protocol designed for space links. Supports both acknowledged (Class 2) and unacknowledged (Class 1) file delivery. Handles link interruptions through checkpoint/resume capability. Essential for transferring large science data files from deep space missions.',
    usedBy: ['Mars missions', 'Juno', 'New Horizons', 'OSIRIS-REx'],
  },
  {
    name: 'Space Link Extension',
    abbreviation: 'SLE',
    layer: 'Cross-Support',
    description: 'Service framework enabling cross-support between different space agencies\' ground networks. SLE allows a mission operations center (e.g., ESA/ESOC) to receive data from another agency\'s ground station (e.g., NASA/DSN) through standardized service interfaces. Crucial for international mission cooperation.',
    usedBy: ['ESA-NASA cross-support', 'JAXA-NASA cooperation', 'International DSN agreements'],
  },
];

const FREQUENCY_ALLOCATIONS: FrequencyAllocation[] = [
  { band: 'UHF', range: '390-450 MHz', allocation: 'Space Operations (Earth-to-space, space-to-Earth)', typicalUse: 'Proximity links (Mars relay), CubeSat TT&C, IoT', maxDataRate: '~256 kbps - 2 Mbps', color: 'text-green-400' },
  { band: 'S-band', range: '2.0-2.3 GHz', allocation: 'Space Research, Space Operations, Earth Exploration', typicalUse: 'Spacecraft TT&C, deep space uplink/downlink, TDRS MA', maxDataRate: '~2-10 Mbps', color: 'text-cyan-400' },
  { band: 'X-band', range: '8.0-8.5 GHz (downlink), 7.1-7.2 GHz (uplink)', allocation: 'Space Research (deep space), Earth Exploration', typicalUse: 'Deep space downlink, EO payload data, planetary science', maxDataRate: '~10-800 Mbps', color: 'text-blue-400' },
  { band: 'Ku-band', range: '12-18 GHz', allocation: 'Fixed Satellite Service, Broadcast Satellite Service', typicalUse: 'TDRS Ku SA, DTH broadcasting, VSAT, Starlink user links', maxDataRate: '~50 Mbps - 1 Gbps', color: 'text-purple-400' },
  { band: 'Ka-band', range: '26.5-40 GHz', allocation: 'Space Research, Fixed Satellite Service', typicalUse: 'High-rate deep space downlink, HTS broadband, LCRD', maxDataRate: '~100 Mbps - 10 Gbps', color: 'text-amber-400' },
  { band: 'Optical', range: '~200 THz (1550 nm / 1064 nm)', allocation: 'Unregulated (no ITU allocation needed)', typicalUse: 'LCRD, DSOC, OISL, EDRS laser links', maxDataRate: '~1 Gbps - 100 Gbps', color: 'text-red-400' },
];

const LATENCY_BY_ORBIT = [
  { orbit: 'LEO (550 km)', oneWayLatency: '~3.6 ms', roundTrip: '~7.2 ms', example: 'Starlink, ISS', color: 'text-green-400' },
  { orbit: 'MEO (8,000 km)', oneWayLatency: '~27 ms', roundTrip: '~54 ms', example: 'O3b mPOWER, GPS', color: 'text-cyan-400' },
  { orbit: 'GEO (35,786 km)', oneWayLatency: '~120 ms', roundTrip: '~240 ms', example: 'TDRS, EDRS, Intelsat', color: 'text-blue-400' },
  { orbit: 'Lunar (384,400 km)', oneWayLatency: '~1.28 s', roundTrip: '~2.56 s', example: 'Artemis, Gateway', color: 'text-purple-400' },
  { orbit: 'Earth-Sun L2 (1.5M km)', oneWayLatency: '~5 s', roundTrip: '~10 s', example: 'JWST, Euclid', color: 'text-amber-400' },
  { orbit: 'Mars (avg. 225M km)', oneWayLatency: '~12.5 min', roundTrip: '~25 min', example: 'Perseverance, InSight', color: 'text-orange-400' },
  { orbit: 'Jupiter (avg. 778M km)', oneWayLatency: '~43 min', roundTrip: '~86 min', example: 'Juno, Europa Clipper', color: 'text-red-400' },
  { orbit: 'Voyager 1 (~24.5B km)', oneWayLatency: '~22.7 hrs', roundTrip: '~45.4 hrs', example: 'Voyager 1', color: 'text-rose-400' },
];

const HERO_STATS = [
  { label: 'DSN Antennas', value: '13', color: 'text-cyan-400' },
  { label: 'Relay Satellites', value: '40+', color: 'text-blue-400' },
  { label: 'Optical Terminals On-Orbit', value: '9,000+', color: 'text-green-400' },
  { label: 'Max Optical Data Rate', value: '100 Gbps', color: 'text-amber-400' },
];

const ESTRACK_STATIONS = [
  { name: 'Malargue', location: 'Argentina', diameter: '35m', bands: 'X/Ka-band', role: 'Deep space' },
  { name: 'Cebreros', location: 'Spain', diameter: '35m', bands: 'X/Ka-band', role: 'Deep space' },
  { name: 'New Norcia', location: 'Australia', diameter: '35m', bands: 'S/X/Ka-band', role: 'Deep space' },
  { name: 'Kourou', location: 'French Guiana', diameter: '15m', bands: 'S-band', role: 'Launch support, LEO' },
  { name: 'Redu', location: 'Belgium', diameter: '15m', bands: 'S/X-band', role: 'LEO operations' },
  { name: 'Kiruna', location: 'Sweden', diameter: '15m', bands: 'S/X-band', role: 'Polar LEO support' },
  { name: 'Santa Maria', location: 'Azores', diameter: '5.5m', bands: 'S-band', role: 'Launch & early orbit' },
];

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function DSNComplexCard({ complex }: { complex: DSNComplex }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{complex.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-cyan-400 text-sm font-medium">{complex.location}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 text-sm">Est. {complex.established}</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">{complex.coordinates}</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded border text-green-400 bg-green-500/10 border-green-500/30">
          Operational
        </span>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {expanded ? complex.description : complex.description.slice(0, 200) + '...'}
      </p>

      {/* Antennas */}
      <div className="mb-4">
        <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Antenna Assets ({complex.antennas.length})</div>
        <div className="space-y-2">
          {complex.antennas.map((antenna) => (
            <div key={antenna.designation} className="bg-space-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-medium">{antenna.designation}</span>
                <span className="text-cyan-400 text-xs font-bold">{antenna.diameter}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-1">
                {antenna.bands.map((band) => (
                  <span key={band} className="px-1.5 py-0.5 bg-space-700 text-cyan-300 border border-space-600 rounded text-xs">
                    {band}
                  </span>
                ))}
              </div>
              {expanded && (
                <div className="mt-2">
                  <p className="text-slate-400 text-xs">{antenna.features}</p>
                  <p className="text-slate-500 text-xs mt-1">Max data rate: {antenna.maxDataRate}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Missions Served */}
      {expanded && (
        <div className="mb-4">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Missions Served</div>
          <div className="flex flex-wrap gap-1.5">
            {complex.missionsServed.map((mission) => (
              <span key={mission} className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
                {mission}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Show details'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

function RelayNetworkCard({ network }: { network: RelayNetwork }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    operational: 'text-green-400 bg-green-500/10 border-green-500/30',
    deploying: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    development: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    decommissioning: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg">{network.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-cyan-400 text-sm font-medium">{network.operator}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ml-2 ${statusColors[network.status] || ''}`}>
          {network.status.charAt(0).toUpperCase() + network.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Constellation</div>
          <div className="text-white text-sm font-medium">{network.constellation}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Data Rate</div>
          <div className="text-white text-sm font-medium">{network.dataRate}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Orbit</div>
          <div className="text-white text-sm font-medium">{network.orbit}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Coverage</div>
          <div className="text-white text-sm font-medium">{network.coverage}</div>
        </div>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {expanded ? network.description : network.description.slice(0, 180) + '...'}
      </p>

      {expanded && (
        <div className="space-y-4 mb-4">
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Capabilities</div>
            <ul className="space-y-1">
              {network.capabilities.map((cap, i) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>
                  {cap}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Users</div>
            <div className="flex flex-wrap gap-1.5">
              {network.users.map((user) => (
                <span key={user} className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
                  {user}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Show details'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

function OpticalSystemCard({ system }: { system: OpticalSystem }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    operational: 'text-green-400 bg-green-500/10 border-green-500/30',
    demonstrated: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    development: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    commercial: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  };

  const typeLabels: Record<string, string> = {
    demonstration: 'Demo',
    relay: 'Relay',
    terminal: 'Terminal',
    'deep-space': 'Deep Space',
  };

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg">{system.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-cyan-400 text-sm font-medium">{system.operator}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 text-sm">{system.launchDate}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusColors[system.status] || ''}`}>
            {system.status.charAt(0).toUpperCase() + system.status.slice(1)}
          </span>
          <span className="text-xs text-slate-500 px-2 py-0.5 bg-space-800 rounded border border-space-700">
            {typeLabels[system.type]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Max Data Rate</div>
          <div className="text-amber-400 text-sm font-bold">{system.maxDataRate}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Wavelength</div>
          <div className="text-white text-sm font-medium">{system.wavelength}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Distance</div>
          <div className="text-white text-sm font-medium">{system.distance}</div>
        </div>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {expanded ? system.description : system.description.slice(0, 180) + '...'}
      </p>

      {expanded && (
        <div className="mb-4">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Milestones</div>
          <div className="space-y-1.5">
            {system.milestones.map((milestone, i) => (
              <div key={i} className="text-slate-300 text-sm flex items-start gap-2 bg-space-800/30 rounded-lg p-2">
                <span className="text-cyan-400 font-bold text-xs mt-0.5 flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{milestone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Show milestones'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function SpaceCommsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dsn');
  const [relayFilter, setRelayFilter] = useState<string>('');

  const filteredRelays = relayFilter
    ? RELAY_NETWORKS.filter((n) => n.status === relayFilter)
    : RELAY_NETWORKS;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'dsn', label: 'DSN Status', icon: String.fromCodePoint(0x1F4E1) },
    { id: 'relay', label: 'Relay Networks', icon: String.fromCodePoint(0x1F6F0) },
    { id: 'optical', label: 'Optical Comms', icon: String.fromCodePoint(0x1F4A1) },
    { id: 'lunar', label: 'Lunar Comms', icon: String.fromCodePoint(0x1F319) },
    { id: 'standards', label: 'Standards', icon: String.fromCodePoint(0x1F4CB) },
  ];

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Space Communications Network"
          subtitle="Deep space networks, relay constellations, laser communications, and the protocols that connect humanity to the cosmos"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Space Communications' }]}
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            {String.fromCharCode(8592)} Back to Dashboard
          </Link>
        </PageHeader>

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

        {/* Industry Overview Banner */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">{String.fromCodePoint(0x1F310)}</span>
            <div>
              <h3 className="font-semibold text-white mb-1">The Laser Communications Revolution</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Space communications is undergoing its most significant transformation since the advent of satellite relay systems.
                NASA&apos;s DSOC experiment achieved 267 Mbps from deep space -- 10-100x faster than radio -- while SpaceX has deployed
                over 9,000 laser terminals on Starlink satellites, creating the largest optical network in space. The SDA Transport
                Layer is building a military mesh network using optical crosslinks, and ESA&apos;s EDRS &quot;SpaceDataHighway&quot; has completed
                over 50,000 successful laser relay sessions. By the end of this decade, optical communications will become the
                standard for high-rate space data links, complementing -- not replacing -- proven RF systems for command and control.
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

          {/* ──────────────── DSN STATUS TAB ──────────────── */}
          {activeTab === 'dsn' && (
            <div>
              {/* DSN Overview */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold text-lg mb-2">NASA Deep Space Network (DSN)</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  The Deep Space Network is NASA&apos;s international array of giant radio antennas supporting interplanetary
                  spacecraft missions and radio/radar astronomy observations. Managed by JPL, the DSN consists of three
                  complexes placed approximately 120 degrees apart around the Earth -- Goldstone (California), Canberra
                  (Australia), and Madrid (Spain) -- ensuring that any spacecraft in deep space can communicate with at
                  least one complex at all times as the Earth rotates.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-space-800/50 rounded-lg p-3">
                    <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Complexes</div>
                    <div className="text-cyan-400 text-lg font-bold">3</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3">
                    <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Total Antennas</div>
                    <div className="text-cyan-400 text-lg font-bold">13</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3">
                    <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">70m Dishes</div>
                    <div className="text-cyan-400 text-lg font-bold">3</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3">
                    <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Missions Supported</div>
                    <div className="text-cyan-400 text-lg font-bold">40+</div>
                  </div>
                </div>
              </div>

              {/* DSN Complex Cards */}
              <div className="space-y-5 mb-6">
                {DSN_COMPLEXES.map((complex) => (
                  <DSNComplexCard key={complex.id} complex={complex} />
                ))}
              </div>

              {/* Antenna Type Comparison */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-4">DSN Antenna Types</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-space-700">
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Type</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Diameter</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Frequency Bands</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Typical Use</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { type: '70m Cassegrain', diameter: '70m', bands: 'S/X-band', use: 'Critical encounters, emergency comms, Voyager, planetary radar', count: '3 (one per complex)' },
                        { type: '34m Beam Waveguide (BWG)', diameter: '34m', bands: 'S/X/Ka-band', use: 'Primary deep space tracking, Ka-band high-rate data, arraying', count: '8' },
                        { type: '34m High Efficiency (HEF)', diameter: '34m', bands: 'S/X-band', use: 'Legacy missions, supplementary tracking, radio science', count: '2' },
                      ].map((row, idx) => (
                        <tr key={idx} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                          <td className="py-2 px-3 text-white font-medium">{row.type}</td>
                          <td className="py-2 px-3 text-cyan-400 font-bold">{row.diameter}</td>
                          <td className="py-2 px-3 text-slate-300">{row.bands}</td>
                          <td className="py-2 px-3 text-slate-400">{row.use}</td>
                          <td className="py-2 px-3 text-white">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ESA ESTRACK Companion */}
              <div className="card-elevated p-6 border border-space-700">
                <h3 className="text-white font-semibold mb-2">ESA ESTRACK Ground Station Network</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  ESA operates the European Space Tracking (ESTRACK) network, a global system of ground stations supporting
                  ESA missions from launch through end of life. The network includes three 35m deep space antennas spaced
                  around the globe -- mirroring the DSN architecture -- plus smaller stations for LEO and launch support.
                  ESA and NASA maintain cross-support agreements through CCSDS Space Link Extension (SLE) protocols.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-space-700">
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Station</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Location</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Diameter</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Bands</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ESTRACK_STATIONS.map((station, idx) => (
                        <tr key={station.name} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                          <td className="py-2 px-3 text-white font-medium">{station.name}</td>
                          <td className="py-2 px-3 text-slate-300">{station.location}</td>
                          <td className="py-2 px-3 text-cyan-400 font-bold">{station.diameter}</td>
                          <td className="py-2 px-3 text-slate-300">{station.bands}</td>
                          <td className="py-2 px-3 text-slate-400">{station.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── RELAY NETWORKS TAB ──────────────── */}
          {activeTab === 'relay' && (
            <div>
              {/* Filter */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-slate-400 text-sm">Filter by status:</span>
                {['', 'operational', 'deploying', 'development'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setRelayFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      relayFilter === status
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
                    }`}
                  >
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
                  </button>
                ))}
              </div>

              {/* Relay Network Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {filteredRelays.map((network) => (
                  <RelayNetworkCard key={network.id} network={network} />
                ))}
              </div>

              {filteredRelays.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-5xl block mb-4">{String.fromCodePoint(0x1F6F0)}</span>
                  <p className="text-slate-400">No networks match the selected filter.</p>
                </div>
              )}

              {/* Relay Architecture Comparison */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-4">Relay Architecture Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-space-700">
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Network</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Orbit</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Link Type</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Data Rate</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Coverage</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: 'TDRSS', orbit: 'GEO', link: 'RF (S/Ku/Ka)', rate: '800 Mbps', coverage: '~85% LEO', status: 'Operational' },
                        { name: 'EDRS', orbit: 'GEO', link: 'Laser + Ka', rate: '1.8 Gbps', coverage: 'Europe/Atlantic', status: 'Operational' },
                        { name: 'SDA Transport', orbit: 'LEO', link: 'Optical mesh', rate: '10 Gbps/link', coverage: 'Global (military)', status: 'Deploying' },
                        { name: 'Starshield', orbit: 'LEO', link: 'Laser mesh', rate: 'Classified', coverage: 'Global', status: 'Deploying' },
                        { name: 'AWS GS', orbit: 'Ground', link: 'RF (S/X/UHF)', rate: '800 Mbps', coverage: 'Global (12 sites)', status: 'Operational' },
                        { name: 'Azure Orbital', orbit: 'Ground', link: 'RF (S/X/Ka)', rate: '1+ Gbps', coverage: 'Global (partners)', status: 'Operational' },
                      ].map((row, idx) => (
                        <tr key={idx} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                          <td className="py-2 px-3 text-white font-medium">{row.name}</td>
                          <td className="py-2 px-3 text-slate-300">{row.orbit}</td>
                          <td className="py-2 px-3 text-cyan-400">{row.link}</td>
                          <td className="py-2 px-3 text-amber-400 font-medium">{row.rate}</td>
                          <td className="py-2 px-3 text-slate-300">{row.coverage}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              row.status === 'Operational' ? 'text-green-400 bg-green-500/10' :
                              row.status === 'Deploying' ? 'text-cyan-400 bg-cyan-500/10' :
                              'text-amber-400 bg-amber-500/10'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Key Insights */}
              <div className="card-elevated p-6 border border-space-700">
                <h3 className="text-white font-semibold mb-4">Relay Network Insights</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">01</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">TDRSS is aging without a direct replacement.</strong> The newest TDRS satellite launched in 2017,
                      and NASA is evaluating commercial alternatives for LEO relay services. The transition from government-owned
                      to commercially-provided relay infrastructure is a major strategic shift for the 2030s.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">02</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">Optical inter-satellite links are the new standard.</strong> SDA, SpaceX, and Telesat are all
                      building constellations with laser crosslinks. This eliminates ground station dependency for data routing
                      and reduces latency for global data transport.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">03</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">Cloud-integrated ground services are disrupting traditional ground segments.</strong> AWS
                      Ground Station and Azure Orbital enable operators to process satellite data in cloud environments within
                      seconds of antenna contact, eliminating complex data distribution infrastructure.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── OPTICAL COMMS TAB ──────────────── */}
          {activeTab === 'optical' && (
            <div>
              {/* Optical Revolution Banner */}
              <div className="card-elevated p-6 border border-amber-500/20 mb-6">
                <h3 className="text-amber-400 font-semibold text-lg mb-2">The Laser Communications Revolution</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Laser (optical) communications represent the biggest leap in space data rates since the transition
                  from S-band to X-band in the 1970s. Unlike radio frequency (RF) systems, laser beams have extremely
                  narrow divergence, concentrating energy on the receiver and enabling data rates 10-100x higher than
                  RF at comparable power levels. The challenge: laser links require precise pointing (sub-microradian)
                  and are affected by atmospheric conditions for space-to-ground links.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-amber-400 text-lg font-bold">267 Mbps</div>
                    <div className="text-slate-500 text-xs">DSOC deep space record</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-amber-400 text-lg font-bold">100 Gbps</div>
                    <div className="text-slate-500 text-xs">Commercial OISL capability</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-amber-400 text-lg font-bold">9,000+</div>
                    <div className="text-slate-500 text-xs">Starlink laser terminals</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-amber-400 text-lg font-bold">50,000+</div>
                    <div className="text-slate-500 text-xs">EDRS laser link sessions</div>
                  </div>
                </div>
              </div>

              {/* RF vs Optical Comparison */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-4">RF vs. Optical Communications Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-space-700">
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Parameter</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">RF (X/Ka-band)</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Optical (Laser)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { param: 'Max Data Rate', rf: '~1-10 Gbps', optical: '~100 Gbps' },
                        { param: 'Beam Divergence', rf: '~0.1-1 degree', optical: '~0.001 degree (sub-microradian)' },
                        { param: 'Spectrum Licensing', rf: 'Required (ITU coordination)', optical: 'Not required (unregulated)' },
                        { param: 'Atmospheric Effects', rf: 'Rain fade (Ka), minimal (S/X)', optical: 'Cloud blockage, turbulence, scintillation' },
                        { param: 'Terminal Size/Weight', rf: 'Large (0.5-10m dishes)', optical: 'Compact (10-30 cm aperture)' },
                        { param: 'Pointing Requirement', rf: 'Moderate (~0.01 deg)', optical: 'Extreme (~1 microradian)' },
                        { param: 'Deep Space Heritage', rf: 'Decades (proven)', optical: 'DSOC 2023 (first demonstration)' },
                        { param: 'All-Weather Operation', rf: 'Yes (S/X-band)', optical: 'No (requires site diversity)' },
                      ].map((row, idx) => (
                        <tr key={idx} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                          <td className="py-2 px-3 text-white font-medium">{row.param}</td>
                          <td className="py-2 px-3 text-cyan-400">{row.rf}</td>
                          <td className="py-2 px-3 text-amber-400">{row.optical}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Optical System Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {OPTICAL_SYSTEMS.map((system) => (
                  <OpticalSystemCard key={system.id} system={system} />
                ))}
              </div>

              {/* DSOC Deep Dive */}
              <div className="card-elevated p-6 border border-cyan-500/20">
                <h3 className="text-cyan-400 font-semibold mb-4">DSOC: Rewriting the Deep Space Communications Playbook</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  NASA&apos;s Deep Space Optical Communications (DSOC) experiment on the Psyche spacecraft has
                  fundamentally demonstrated that laser communications work in deep space. The system achieved
                  267 Mbps from 33 million km -- a data rate that would have taken the best RF system roughly
                  10x longer to transmit the same data volume. During its technology demonstration phase, DSOC
                  transmitted 1.58 terabits of data from distances up to 2.6 AU (390 million km).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-space-800/50 rounded-xl p-4">
                    <div className="text-cyan-400 text-2xl font-bold mb-1">10-100x</div>
                    <div className="text-slate-400 text-sm">Faster than RF at comparable distance</div>
                    <p className="text-slate-500 text-xs mt-2">
                      At 33 million km, DSOC achieved 267 Mbps vs. ~2-25 Mbps for X-band RF systems.
                    </p>
                  </div>
                  <div className="bg-space-800/50 rounded-xl p-4">
                    <div className="text-cyan-400 text-2xl font-bold mb-1">2.6 AU</div>
                    <div className="text-slate-400 text-sm">Maximum demonstrated range</div>
                    <p className="text-slate-500 text-xs mt-2">
                      390 million km -- nearly 2x the Earth-Sun distance, well beyond Mars distance.
                    </p>
                  </div>
                  <div className="bg-space-800/50 rounded-xl p-4">
                    <div className="text-cyan-400 text-2xl font-bold mb-1">1.58 Tb</div>
                    <div className="text-slate-400 text-sm">Total data transmitted</div>
                    <p className="text-slate-500 text-xs mt-2">
                      Cumulative data return during the technology demonstration phase in 2024.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── LUNAR COMMS TAB ──────────────── */}
          {activeTab === 'lunar' && (
            <div>
              {/* Lunar Communications Overview */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold text-lg mb-2">Lunar Communications Architecture</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  As humanity returns to the Moon under the Artemis program and commercial lunar missions proliferate,
                  the need for a robust lunar communications infrastructure has become critical. Current lunar
                  communications rely on direct Earth links via the DSN, which only supports near-side operations
                  with line-of-sight to Earth. Far-side coverage, polar region support, and multi-user relay
                  services require a dedicated lunar communications constellation -- the vision behind NASA&apos;s
                  LunaNet and ESA&apos;s Moonlight initiatives.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-purple-400 text-lg font-bold">1.28 sec</div>
                    <div className="text-slate-500 text-xs">One-way light delay</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-purple-400 text-lg font-bold">384,400 km</div>
                    <div className="text-slate-500 text-xs">Average Earth-Moon distance</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-purple-400 text-lg font-bold">~41%</div>
                    <div className="text-slate-500 text-xs">Lunar far side (no Earth LOS)</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-purple-400 text-lg font-bold">DTN</div>
                    <div className="text-slate-500 text-xs">Core protocol (Bundle Protocol)</div>
                  </div>
                </div>
              </div>

              {/* Lunar Comm Elements */}
              <div className="space-y-5 mb-6">
                {LUNAR_COMMS_ELEMENTS.map((element) => (
                  <div key={element.id} className="card-elevated p-6 border border-space-700">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{element.name}</h3>
                        <span className="text-slate-400 text-sm">{element.agency}</span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded border ${element.statusColor}`}>
                        {element.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{element.description}</p>
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Features</div>
                      <ul className="space-y-1">
                        {element.keyFeatures.map((feature, i) => (
                          <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                            <span className="text-purple-400 mt-0.5 flex-shrink-0">-</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Artemis Comms Timeline */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-4">Artemis Communications Evolution</h3>
                <div className="space-y-3">
                  {[
                    { phase: 'Artemis I (2022)', comms: 'Direct DSN links via Orion S-band/Ka-band', status: 'Completed', color: 'text-green-400' },
                    { phase: 'Artemis II (2025)', comms: 'DSN + TDRS relay for crew safety during Earth transit', status: 'Upcoming', color: 'text-cyan-400' },
                    { phase: 'Artemis III (2026)', comms: 'DSN direct + potential Starlink supplement for video relay', status: 'Planned', color: 'text-amber-400' },
                    { phase: 'Gateway Ops (2027+)', comms: 'Gateway PPE Ka-band relay + proximity S-band to surface', status: 'Development', color: 'text-amber-400' },
                    { phase: 'LunaNet Era (2030+)', comms: 'Multi-provider relay constellation with DTN networking', status: 'Planned', color: 'text-purple-400' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 bg-space-800/30 rounded-lg p-4">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-400 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-white font-semibold text-sm">{item.phase}</span>
                          <span className={`text-xs font-bold ${item.color}`}>{item.status}</span>
                        </div>
                        <p className="text-slate-400 text-sm">{item.comms}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lunar Coverage Challenge */}
              <div className="card-elevated p-6 border border-purple-500/20">
                <h3 className="text-purple-400 font-semibold mb-4">The Lunar Far-Side Challenge</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Approximately 41% of the lunar surface (the far side) never faces Earth and cannot communicate
                  directly with ground stations. The lunar South Pole -- the primary Artemis landing target -- has
                  limited and intermittent Earth visibility due to the Moon&apos;s low axial tilt. China&apos;s Queqiao
                  relay satellite (launched 2018) demonstrated far-side relay for the Chang&apos;e 4 lander, marking
                  the first communications relay at a lunar Lagrange point (Earth-Moon L2). A follow-up, Queqiao-2,
                  launched in 2024 to support Chang&apos;e 6 and future missions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-space-800/50 rounded-xl p-4">
                    <h4 className="text-white font-semibold text-sm mb-2">Near-Side Coverage (Current)</h4>
                    <ul className="space-y-1 text-slate-400 text-xs">
                      <li>- Direct DSN links when Earth is above local horizon</li>
                      <li>- Limited to ~59% of lunar surface (with libration)</li>
                      <li>- Sufficient for Apollo-era style operations</li>
                      <li>- No coverage during lunar night for polar sites</li>
                    </ul>
                  </div>
                  <div className="bg-space-800/50 rounded-xl p-4">
                    <h4 className="text-white font-semibold text-sm mb-2">Relay Coverage (Future)</h4>
                    <ul className="space-y-1 text-slate-400 text-xs">
                      <li>- Frozen elliptical orbits for polar/far-side coverage</li>
                      <li>- 3-5 relay satellites for continuous South Pole service</li>
                      <li>- DTN networking for store-and-forward during gaps</li>
                      <li>- Optical crosslinks between relay satellites</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── STANDARDS TAB ──────────────── */}
          {activeTab === 'standards' && (
            <div>
              {/* CCSDS Overview */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold text-lg mb-2">CCSDS: The Standards Body for Space Communications</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  The Consultative Committee for Space Data Systems (CCSDS) is a multinational forum of space agencies
                  that develops communications and data systems standards for spaceflight. Founded in 1982, CCSDS
                  includes NASA, ESA, JAXA, ROSCOSMOS, CNES, DLR, ASI, UKSA, CSA, ISRO, and KARI as member agencies.
                  CCSDS standards ensure interoperability between different agencies&apos; ground and space systems --
                  enabling, for example, ESA ground stations to receive data from NASA spacecraft and vice versa.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-green-400 text-lg font-bold">11</div>
                    <div className="text-slate-500 text-xs">Member agencies</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-green-400 text-lg font-bold">28</div>
                    <div className="text-slate-500 text-xs">Observer agencies</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-green-400 text-lg font-bold">150+</div>
                    <div className="text-slate-500 text-xs">Published standards</div>
                  </div>
                  <div className="bg-space-800/50 rounded-lg p-3 text-center">
                    <div className="text-green-400 text-lg font-bold">1982</div>
                    <div className="text-slate-500 text-xs">Founded</div>
                  </div>
                </div>
              </div>

              {/* CCSDS Protocol Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {CCSDS_PROTOCOLS.map((protocol) => (
                  <div key={protocol.abbreviation} className="card-elevated p-6 border border-space-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{protocol.name}</h3>
                        <span className="text-cyan-400 text-sm font-mono">{protocol.abbreviation}</span>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-space-800 text-slate-400 border border-space-700">
                        {protocol.layer}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">{protocol.description}</p>
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-widest mb-1.5">Used By</div>
                      <div className="flex flex-wrap gap-1.5">
                        {protocol.usedBy.map((user) => (
                          <span key={user} className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
                            {user}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Frequency Allocations */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-2">Space Communications Frequency Allocations</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  The International Telecommunication Union (ITU) allocates radio frequency spectrum for space services
                  through World Radiocommunication Conferences (WRC). These allocations define which frequencies can
                  be used for space research, Earth exploration, and fixed/mobile satellite services. Optical frequencies
                  are currently unregulated by the ITU, which is one advantage of laser communications.
                </p>

                {/* Visual Spectrum Bar */}
                <div className="mb-4">
                  <div className="text-slate-500 text-xs mb-2">Space Communications Spectrum (Low {String.fromCharCode(8594)} High)</div>
                  <div className="flex rounded-lg overflow-hidden h-8">
                    <div className="bg-green-500/30 flex-[1] flex items-center justify-center text-xs text-green-300 font-medium border-r border-space-900">UHF</div>
                    <div className="bg-cyan-500/30 flex-[1] flex items-center justify-center text-xs text-cyan-300 font-medium border-r border-space-900">S</div>
                    <div className="bg-blue-500/30 flex-[2] flex items-center justify-center text-xs text-blue-300 font-medium border-r border-space-900">X</div>
                    <div className="bg-purple-500/30 flex-[3] flex items-center justify-center text-xs text-purple-300 font-medium border-r border-space-900">Ku</div>
                    <div className="bg-amber-500/30 flex-[6] flex items-center justify-center text-xs text-amber-300 font-medium border-r border-space-900">Ka</div>
                    <div className="bg-red-500/30 flex-[8] flex items-center justify-center text-xs text-red-300 font-medium">Optical</div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>390 MHz</span>
                    <span>2 GHz</span>
                    <span>8 GHz</span>
                    <span>18 GHz</span>
                    <span>40 GHz</span>
                    <span>~200 THz</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-space-700">
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Band</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Frequency Range</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">ITU Allocation</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Typical Use</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Max Data Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FREQUENCY_ALLOCATIONS.map((alloc, idx) => (
                        <tr key={alloc.band} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                          <td className={`py-2 px-3 font-bold ${alloc.color}`}>{alloc.band}</td>
                          <td className="py-2 px-3 text-white text-xs font-mono">{alloc.range}</td>
                          <td className="py-2 px-3 text-slate-300 text-xs">{alloc.allocation}</td>
                          <td className="py-2 px-3 text-slate-400 text-xs">{alloc.typicalUse}</td>
                          <td className="py-2 px-3 text-amber-400 font-medium">{alloc.maxDataRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Latency by Orbit */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-2">Signal Latency by Distance</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Radio waves and laser beams travel at the speed of light (~299,792 km/s). As spacecraft venture
                  further from Earth, communication latency increases proportionally. This latency fundamentally
                  constrains mission operations -- Mars rovers cannot be joystick-driven, and deep space missions
                  require high degrees of autonomy.
                </p>
                <div className="space-y-3">
                  {LATENCY_BY_ORBIT.map((entry) => {
                    const distances: Record<string, number> = {
                      'LEO (550 km)': 0.0018,
                      'MEO (8,000 km)': 0.027,
                      'GEO (35,786 km)': 0.12,
                      'Lunar (384,400 km)': 1.28,
                      'Earth-Sun L2 (1.5M km)': 5,
                      'Mars (avg. 225M km)': 750,
                      'Jupiter (avg. 778M km)': 2580,
                      'Voyager 1 (~24.5B km)': 81720,
                    };
                    const maxDist = 81720;
                    const thisDist = distances[entry.orbit] || 1;
                    // Use log scale for visualization
                    const logWidth = Math.max((Math.log10(thisDist + 1) / Math.log10(maxDist + 1)) * 100, 2);

                    return (
                      <div key={entry.orbit} className="flex items-center gap-4">
                        <div className="w-44 flex-shrink-0 text-sm text-white font-medium truncate">{entry.orbit}</div>
                        <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden relative">
                          <div
                            className={`h-full rounded transition-all ${
                              entry.color === 'text-green-400' ? 'bg-gradient-to-r from-green-600 to-green-400' :
                              entry.color === 'text-cyan-400' ? 'bg-gradient-to-r from-cyan-600 to-cyan-400' :
                              entry.color === 'text-blue-400' ? 'bg-gradient-to-r from-blue-600 to-blue-400' :
                              entry.color === 'text-purple-400' ? 'bg-gradient-to-r from-purple-600 to-purple-400' :
                              entry.color === 'text-amber-400' ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                              entry.color === 'text-orange-400' ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                              entry.color === 'text-red-400' ? 'bg-gradient-to-r from-red-600 to-red-400' :
                              'bg-gradient-to-r from-rose-600 to-rose-400'
                            }`}
                            style={{ width: `${logWidth}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">
                            {entry.oneWayLatency}
                          </span>
                        </div>
                        <div className="w-28 flex-shrink-0 text-right text-xs text-slate-400 hidden md:block">
                          RT: {entry.roundTrip}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-slate-500 text-xs mt-3">RT = Round Trip. Logarithmic scale. Actual distances vary by orbital position.</p>
              </div>

              {/* Link Budget Overview */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-2">Link Budget Fundamentals</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  A link budget is the accounting of all gains and losses in a communications link from transmitter
                  to receiver. It determines whether a signal can be successfully received at the required data rate
                  and bit error rate. Every space communications link must close -- meaning the received signal power
                  must exceed the receiver sensitivity by a sufficient margin.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <h4 className="text-green-400 text-xs uppercase tracking-widest mb-3">Signal Gains (+)</h4>
                    <div className="space-y-2">
                      {[
                        { item: 'Transmitter Power (EIRP)', desc: 'RF amplifier output power, typically 5-400W for space' },
                        { item: 'Transmit Antenna Gain', desc: 'Larger antenna = more focused beam = higher gain (70m DSN ~74 dBi at X-band)' },
                        { item: 'Receive Antenna Gain', desc: 'Collecting area of the receiving antenna' },
                        { item: 'Coding Gain', desc: 'Forward error correction (turbo codes, LDPC) add 6-10 dB effective gain' },
                      ].map((gain, i) => (
                        <div key={i} className="bg-space-800/30 rounded-lg p-3 flex items-start gap-2">
                          <span className="text-green-400 font-bold text-xs mt-0.5 flex-shrink-0">+</span>
                          <div>
                            <span className="text-white text-sm font-medium">{gain.item}</span>
                            <p className="text-slate-500 text-xs mt-0.5">{gain.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-red-400 text-xs uppercase tracking-widest mb-3">Signal Losses (-)</h4>
                    <div className="space-y-2">
                      {[
                        { item: 'Free Space Path Loss', desc: 'Signal weakens with distance squared. Mars: ~280 dB at X-band' },
                        { item: 'Atmospheric Attenuation', desc: 'Rain fade (Ka-band), water vapor absorption, cloud blockage (optical)' },
                        { item: 'Pointing Loss', desc: 'Misalignment between antenna boresight and spacecraft direction' },
                        { item: 'System Noise Temperature', desc: 'Thermal noise in receiver electronics, cosmic background noise' },
                      ].map((loss, i) => (
                        <div key={i} className="bg-space-800/30 rounded-lg p-3 flex items-start gap-2">
                          <span className="text-red-400 font-bold text-xs mt-0.5 flex-shrink-0">-</span>
                          <div>
                            <span className="text-white text-sm font-medium">{loss.item}</span>
                            <p className="text-slate-500 text-xs mt-0.5">{loss.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Sources */}
              <div className="card-elevated p-5 border border-space-700 border-dashed">
                <h3 className="text-sm font-semibold text-white mb-2">Data Sources & References</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Information sourced from NASA/JPL DSN public documentation, CCSDS Blue Books (ccsds.org), ITU Radio
                  Regulations, ESA ESTRACK public materials, NASA LCRD and DSOC mission pages, SDA public acquisition
                  documents, and company press releases. Data rates and specifications are representative of published
                  capabilities and may not reflect real-time operational status.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Related Modules */}
        <div className="card-elevated p-5 border border-space-700 mb-12">
          <h3 className="text-white font-semibold text-sm mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/ground-stations" className="btn-secondary text-sm">
              {String.fromCodePoint(0x1F4E1)} Ground Station Map
            </Link>
            <Link href="/satellites" className="btn-secondary text-sm">
              {String.fromCodePoint(0x1F6F0)} Satellite Tracker
            </Link>
            <Link href="/spectrum" className="btn-secondary text-sm">
              {String.fromCodePoint(0x1F4F6)} Spectrum Tracker
            </Link>
            <Link href="/constellations" className="btn-secondary text-sm">
              {String.fromCodePoint(0x1F310)} Constellation Tracker
            </Link>
            <Link href="/lunar-gateway" className="btn-secondary text-sm">
              {String.fromCodePoint(0x1F319)} Lunar Gateway
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
