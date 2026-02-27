// ────────────────────────────────────────
// Spacecraft Reference Design Data
// Real CubeSat, SmallSat standards & subsystem specs
// ────────────────────────────────────────

// ── Subsystem Option Types ──

export interface SubsystemOption {
  id: string;
  name: string;
  mass: number;       // kg
  power: number;      // W (average draw)
  cost: number;       // USD thousands
  description: string;
  trl: number;        // Technology Readiness Level 1-9
  vendors: string[];
  referenceUrl?: string;
}

export interface SubsystemCategory {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  options: SubsystemOption[];
}

export interface CubeSatStandard {
  id: string;
  name: string;
  formFactor: string;
  dimensions: string;
  maxMass: number;       // kg
  typicalCostMin: number; // USD thousands
  typicalCostMax: number; // USD thousands
  typicalPower: string;
  description: string;
  commonMissions: string[];
  structureMass: number; // kg (frame only)
  availableVolume: string;
  deployers: string[];
  references: { label: string; url: string }[];
}

export interface SmallSatPlatform {
  id: string;
  name: string;
  massRange: string;
  maxMass: number;
  description: string;
  typicalCostMin: number;
  typicalCostMax: number;
  capabilities: string[];
  exampleMissions: string[];
  references: { label: string; url: string }[];
}

export interface MissionTemplate {
  id: string;
  name: string;
  orbit: string;
  altitude: string;
  inclination: string;
  duration: string;
  description: string;
  typicalBus: string;
  keyRequirements: string[];
  recommendedSubsystems: Record<string, string>; // category id -> option id
  references: { label: string; url: string }[];
}

// ── CubeSat Standards ──

export const CUBESAT_STANDARDS: CubeSatStandard[] = [
  {
    id: '1u',
    name: '1U CubeSat',
    formFactor: '1U',
    dimensions: '10 x 10 x 10 cm',
    maxMass: 1.33,
    typicalCostMin: 50,
    typicalCostMax: 200,
    typicalPower: '1-2 W',
    description: 'The smallest standard CubeSat form factor. Ideal for simple technology demonstrations, basic Earth imaging, and educational missions. Limited volume constrains payload options but keeps costs extremely low.',
    commonMissions: ['Technology demonstration', 'Education/training', 'Basic Earth imaging', 'IoT sensor node', 'Amateur radio'],
    structureMass: 0.15,
    availableVolume: '~800 cm3',
    deployers: ['P-POD', 'ISIPOD', 'NRCSD (ISS)'],
    references: [
      { label: 'CubeSat Design Specification (Cal Poly)', url: 'https://www.cubesat.org/cubesatinfo' },
      { label: 'NASA CubeSat Launch Initiative', url: 'https://www.nasa.gov/directorates/heo/home/CubeSats_initiative' },
    ],
  },
  {
    id: '3u',
    name: '3U CubeSat',
    formFactor: '3U',
    dimensions: '10 x 10 x 30 cm',
    maxMass: 4.0,
    typicalCostMin: 100,
    typicalCostMax: 500,
    typicalPower: '5-10 W',
    description: 'The most commonly built CubeSat form factor, offering a good balance of volume, mass, and cost. Supports meaningful scientific payloads, moderate-resolution imaging, and AIS/ADS-B receivers. Standard deployer compatibility makes launch access straightforward.',
    commonMissions: ['Earth observation (5-30m)', 'AIS/ADS-B tracking', 'Weather monitoring', 'Scientific instruments', 'Spectrum monitoring', 'Technology demonstration'],
    structureMass: 0.35,
    availableVolume: '~2400 cm3',
    deployers: ['P-POD', 'ISIPOD', 'QuadPack', 'NRCSD (ISS)'],
    references: [
      { label: 'CubeSat Design Specification (Cal Poly)', url: 'https://www.cubesat.org/cubesatinfo' },
      { label: 'Planet Dove Constellation (3U)', url: 'https://www.planet.com/products/planet-imagery/' },
    ],
  },
  {
    id: '6u',
    name: '6U CubeSat',
    formFactor: '6U',
    dimensions: '10 x 20 x 30 cm',
    maxMass: 12.0,
    typicalCostMin: 300,
    typicalCostMax: 1000,
    typicalPower: '15-40 W',
    description: 'An increasingly popular form factor that provides significantly more volume for payloads and solar arrays. Supports higher-resolution imaging (sub-5m), synthetic aperture radar, and multi-instrument payloads. Often chosen for operational missions rather than just demonstrations.',
    commonMissions: ['High-res Earth observation (<5m)', 'Synthetic Aperture Radar', 'SIGINT/ELINT', 'Multi-instrument science', 'Space weather monitoring', 'Proximity operations'],
    structureMass: 0.7,
    availableVolume: '~5000 cm3',
    deployers: ['6U deployer', 'Canisterized Satellite Dispenser', 'QuadPack'],
    references: [
      { label: 'CubeSat Design Specification (Cal Poly)', url: 'https://www.cubesat.org/cubesatinfo' },
      { label: 'NASA PACE/SPEXone (6U instrument)', url: 'https://pace.gsfc.nasa.gov/' },
    ],
  },
  {
    id: '12u',
    name: '12U CubeSat',
    formFactor: '12U',
    dimensions: '20 x 20 x 30 cm',
    maxMass: 24.0,
    typicalCostMin: 500,
    typicalCostMax: 2000,
    typicalPower: '40-80 W',
    description: 'The largest standard CubeSat form factor, bridging the gap to microsatellites. Accommodates high-performance payloads including large-aperture optics, advanced radar, and propulsion for orbit maneuvers. Increasingly used for operational government and commercial missions.',
    commonMissions: ['High-performance EO (<1m)', 'Advanced SAR', 'Space situational awareness', 'Communications relay', 'Deep space missions', 'On-orbit servicing demo'],
    structureMass: 1.2,
    availableVolume: '~10000 cm3',
    deployers: ['12U deployer', 'Canisterized Satellite Dispenser'],
    references: [
      { label: 'CubeSat Design Specification (Cal Poly)', url: 'https://www.cubesat.org/cubesatinfo' },
      { label: 'NASA MarCO (6U deep space)', url: 'https://www.jpl.nasa.gov/missions/mars-cube-one-marco' },
    ],
  },
];

// ── SmallSat Platforms ──

export const SMALLSAT_PLATFORMS: SmallSatPlatform[] = [
  {
    id: 'espa-class',
    name: 'ESPA-Class',
    massRange: '60-180 kg',
    maxMass: 180,
    description: 'ESPA (EELV Secondary Payload Adapter) class satellites use the standard ESPA ring for rideshare access on medium and heavy launch vehicles. The 24-inch port provides a standardized mechanical and electrical interface, making launch access predictable and affordable.',
    typicalCostMin: 2000,
    typicalCostMax: 15000,
    capabilities: [
      'Standard 24-inch ESPA port interface',
      'Rideshare on Atlas V, Falcon 9, Vulcan',
      'Typical 60-180 kg total mass',
      'Supports propulsion for orbit adjust',
      'Power: 100-500 W typical',
      'Multiple ESPA variants (Grande, ESPA-class)',
    ],
    exampleMissions: [
      'STPSat-6 (Space Test Program)',
      'LDPE (Long Duration Propulsive ESPA)',
      'Orbital ATK ESPAStar',
      'Various DoD technology demonstrations',
    ],
    references: [
      { label: 'Northrop Grumman ESPA', url: 'https://www.northropgrumman.com/space/espa-rideshare/' },
      { label: 'USAF Space Test Program', url: 'https://www.kirtland.af.mil/Units/Space-Test-Program/' },
    ],
  },
  {
    id: 'microsatellite',
    name: 'Microsatellite',
    massRange: '10-100 kg',
    maxMass: 100,
    description: 'Microsatellites bridge the gap between CubeSats and larger spacecraft, offering custom bus designs with moderate capability. They support dedicated propulsion, higher-power payloads, and multi-year missions at costs well below traditional satellites.',
    typicalCostMin: 1000,
    typicalCostMax: 10000,
    capabilities: [
      'Custom bus design flexibility',
      'Moderate payload accommodation',
      'Multi-year design life typical',
      'Supports electric and chemical propulsion',
      'Power: 50-300 W typical',
      'Dedicated or rideshare launch',
    ],
    exampleMissions: [
      'BlackSky Global constellation',
      'Spire Global LEMUR series',
      'ICEYE SAR constellation',
      'HawkEye 360 RF geolocation',
    ],
    references: [
      { label: 'ICEYE Microsatellite SAR', url: 'https://www.iceye.com/technology' },
      { label: 'BlackSky Earth Observation', url: 'https://www.blacksky.com/satellite-constellation/' },
    ],
  },
  {
    id: 'minisatellite',
    name: 'Minisatellite',
    massRange: '100-500 kg',
    maxMass: 500,
    description: 'Minisatellites offer medium capability with dedicated instrument accommodation, meaningful propulsion budgets, and design lives of 5-10+ years. They fill a sweet spot between small sats and full-size missions, offering operational performance at reduced cost.',
    typicalCostMin: 5000,
    typicalCostMax: 50000,
    capabilities: [
      'High-performance payload hosting',
      'Significant propulsion delta-V',
      'Design life 5-10+ years',
      'High data rate downlink (>100 Mbps)',
      'Power: 200-2000 W typical',
      'Dedicated launch or primary rideshare',
    ],
    exampleMissions: [
      'WorldView Legion (Maxar)',
      'Starlink v1 satellites (~260 kg)',
      'OneWeb satellites (~150 kg)',
      'TROPICS constellation (NASA)',
    ],
    references: [
      { label: 'Maxar WorldView Legion', url: 'https://www.maxar.com/products/satellite-imagery/worldview-legion' },
      { label: 'OneWeb Constellation', url: 'https://oneweb.net/our-technology' },
    ],
  },
];

// ── Subsystem Categories & Options ──

export const SUBSYSTEM_CATEGORIES: SubsystemCategory[] = [
  {
    id: 'adcs',
    name: 'Attitude Determination & Control (ADCS)',
    abbreviation: 'ADCS',
    description: 'Controls spacecraft orientation using sensors and actuators',
    options: [
      {
        id: 'adcs-magnetorquer-only',
        name: 'Magnetorquer Only',
        mass: 0.08,
        power: 0.5,
        cost: 15,
        description: 'Basic 3-axis magnetic torque rods. Limited to LEO, coarse pointing (~5 deg). Suitable for 1U-3U tech demos.',
        trl: 9,
        vendors: ['ISISPACE', 'NewSpace Systems', 'CubeSpace'],
        referenceUrl: 'https://www.isispace.nl/product/isis-magnetorquer-board/',
      },
      {
        id: 'adcs-reaction-wheels-sun',
        name: 'Reaction Wheels + Sun Sensors',
        mass: 0.3,
        power: 1.5,
        cost: 40,
        description: '3-4 reaction wheels with coarse/fine sun sensors. Pointing accuracy ~0.5 deg. Standard for 3U-6U missions.',
        trl: 9,
        vendors: ['Blue Canyon Technologies', 'CubeSpace', 'Hyperion Technologies'],
        referenceUrl: 'https://bluecanyontech.com/components',
      },
      {
        id: 'adcs-rw-star-tracker',
        name: 'Reaction Wheels + Star Tracker',
        mass: 0.6,
        power: 3.0,
        cost: 80,
        description: 'Reaction wheels with star tracker for fine pointing (~0.01 deg). Required for high-res imaging. Standard for 6U+ missions.',
        trl: 9,
        vendors: ['Blue Canyon Technologies', 'Terma', 'Ball Aerospace', 'Rocket Lab'],
        referenceUrl: 'https://bluecanyontech.com/xact',
      },
      {
        id: 'adcs-cmg',
        name: 'CMGs + Star Tracker + IRU',
        mass: 3.0,
        power: 15.0,
        cost: 250,
        description: 'Control Moment Gyros with star trackers and inertial reference unit. High agility, arcsecond-class pointing. For microsats and minisats.',
        trl: 8,
        vendors: ['Honeywell', 'Collins Aerospace', 'Blue Canyon Technologies'],
      },
    ],
  },
  {
    id: 'eps',
    name: 'Electrical Power System (EPS)',
    abbreviation: 'EPS',
    description: 'Generates, stores, and distributes electrical power',
    options: [
      {
        id: 'eps-body-mounted',
        name: 'Body-Mounted Solar Cells + Battery',
        mass: 0.15,
        power: 2,
        cost: 10,
        description: 'Solar cells bonded to satellite faces with small Li-ion battery pack. 1-3 W orbit average. Minimal for 1U.',
        trl: 9,
        vendors: ['Clyde Space', 'GOMspace', 'Endurosat'],
        referenceUrl: 'https://www.aac-clyde.space/what-we-do/subsystems/eps',
      },
      {
        id: 'eps-deployable-2panel',
        name: '2-Panel Deployable Arrays + Battery',
        mass: 0.5,
        power: 10,
        cost: 30,
        description: 'Two deployable solar panels with 20-30 Wh Li-ion battery. 5-15 W orbit avg. Standard for 3U.',
        trl: 9,
        vendors: ['DHV Technology', 'MMA Design', 'Endurosat'],
      },
      {
        id: 'eps-deployable-4panel',
        name: '4-Panel Deployable Arrays + Battery',
        mass: 1.2,
        power: 40,
        cost: 60,
        description: 'Four deployable solar panels with 40-80 Wh battery. 20-50 W orbit avg. Standard for 6U-12U.',
        trl: 9,
        vendors: ['DHV Technology', 'MMA Design', 'Spectrolab'],
      },
      {
        id: 'eps-high-power',
        name: 'High-Power Arrays + Large Battery',
        mass: 5.0,
        power: 200,
        cost: 150,
        description: 'Large deployable arrays with 200+ Wh battery bank. 100-500 W orbit avg. For microsats/minisats.',
        trl: 9,
        vendors: ['Spectrolab', 'SolAero', 'MMA Design', 'Redwire'],
      },
    ],
  },
  {
    id: 'cdh',
    name: 'Command & Data Handling (C&DH)',
    abbreviation: 'C&DH',
    description: 'Flight computer, data storage, and command processing',
    options: [
      {
        id: 'cdh-basic',
        name: 'Basic OBC (ARM Cortex-M)',
        mass: 0.05,
        power: 0.3,
        cost: 8,
        description: 'Single-board computer with ARM Cortex-M class processor. 256 KB - 1 MB storage. Simple command/telemetry.',
        trl: 9,
        vendors: ['GOMspace', 'Endurosat', 'NanoAvionics'],
      },
      {
        id: 'cdh-standard',
        name: 'Standard OBC (ARM Cortex-A)',
        mass: 0.1,
        power: 1.0,
        cost: 20,
        description: 'Linux-capable OBC with 1-8 GB storage, Cortex-A processor. Supports onboard image processing.',
        trl: 9,
        vendors: ['Unibap', 'Xiphos', 'AAC Clyde Space'],
        referenceUrl: 'https://unibap.com/products/spaceclouds/',
      },
      {
        id: 'cdh-high-perf',
        name: 'High-Performance OBC + GPU/FPGA',
        mass: 0.4,
        power: 5.0,
        cost: 60,
        description: 'Multi-core processor with GPU or FPGA co-processor. 32-256 GB storage. On-board AI/ML processing.',
        trl: 8,
        vendors: ['Unibap', 'Innoflight', 'Xiphos', 'Nvidia (rad-hard)'],
      },
      {
        id: 'cdh-redundant',
        name: 'Redundant Flight Computer',
        mass: 1.5,
        power: 10.0,
        cost: 200,
        description: 'Triple-redundant radiation-hardened processors with 1 TB+ storage. For high-reliability missions.',
        trl: 9,
        vendors: ['BAE Systems', 'Honeywell', 'Microchip (rad-hard)'],
      },
    ],
  },
  {
    id: 'comms',
    name: 'Communications',
    abbreviation: 'Comms',
    description: 'Uplink/downlink radio systems for telemetry and data',
    options: [
      {
        id: 'comms-uhf',
        name: 'UHF/VHF Transceiver',
        mass: 0.08,
        power: 1.5,
        cost: 8,
        description: '9.6 kbps data rate. Simple omnidirectional antenna. Suitable for basic telemetry and command on 1U-3U.',
        trl: 9,
        vendors: ['GOMspace', 'Endurosat', 'ISIS'],
        referenceUrl: 'https://www.endurosat.com/products/uhf-transceiver/',
      },
      {
        id: 'comms-sband',
        name: 'S-Band Transceiver',
        mass: 0.15,
        power: 3.0,
        cost: 25,
        description: '1-10 Mbps data rate. Patch or helical antenna. Standard for 3U-6U missions needing moderate data.',
        trl: 9,
        vendors: ['IQ Spacecom', 'Endurosat', 'NanoAvionics'],
      },
      {
        id: 'comms-xband',
        name: 'X-Band Transmitter',
        mass: 0.4,
        power: 8.0,
        cost: 50,
        description: '50-200 Mbps data rate. Requires patch array or small dish. For 6U-12U high-data missions.',
        trl: 9,
        vendors: ['Syrlinks', 'IQ Spacecom', 'Tethers Unlimited'],
      },
      {
        id: 'comms-kaband',
        name: 'Ka-Band Terminal',
        mass: 1.5,
        power: 25.0,
        cost: 120,
        description: '100-1000+ Mbps data rate. Steerable antenna required. For microsats/minisats with large data volumes.',
        trl: 8,
        vendors: ['Mynaric', 'Ball Aerospace', 'General Dynamics'],
      },
      {
        id: 'comms-laser',
        name: 'Optical/Laser Communication',
        mass: 2.5,
        power: 30.0,
        cost: 300,
        description: '1-10+ Gbps data rate. Requires fine pointing. Emerging technology for high-bandwidth missions.',
        trl: 7,
        vendors: ['Mynaric', 'CACI (SA Photonics)', 'Tesat-Spacecom'],
        referenceUrl: 'https://mynaric.com/products/space/',
      },
    ],
  },
  {
    id: 'propulsion',
    name: 'Propulsion',
    abbreviation: 'Prop',
    description: 'Orbit maneuver and station-keeping systems',
    options: [
      {
        id: 'prop-none',
        name: 'No Propulsion (Drag Only)',
        mass: 0,
        power: 0,
        cost: 0,
        description: 'No active propulsion. Orbit decays naturally. Acceptable for short LEO missions under 400 km.',
        trl: 9,
        vendors: [],
      },
      {
        id: 'prop-cold-gas',
        name: 'Cold Gas Thruster',
        mass: 0.3,
        power: 0.5,
        cost: 15,
        description: 'Nitrogen or R-236fa cold gas. Low delta-V (~10 m/s) but simple and safe. Good for detumble/deorbit.',
        trl: 9,
        vendors: ['VACCO', 'GOMspace', 'Bradford Space'],
        referenceUrl: 'https://www.cubesat-propulsion.com/cold-gas-propulsion/',
      },
      {
        id: 'prop-electric',
        name: 'Electric (Ion/Hall Thruster)',
        mass: 0.8,
        power: 30.0,
        cost: 80,
        description: 'High Isp (>1000s), low thrust. 100-500+ m/s delta-V. Requires significant power. For orbit raising/maintenance.',
        trl: 8,
        vendors: ['Enpulsion', 'Busek', 'Phase Four', 'Accion Systems'],
        referenceUrl: 'https://www.enpulsion.com/products/',
      },
      {
        id: 'prop-green-mono',
        name: 'Green Monopropellant',
        mass: 1.5,
        power: 2.0,
        cost: 60,
        description: 'AF-M315E or LMP-103S. Moderate delta-V (50-200 m/s). Higher density Isp than hydrazine. Non-toxic.',
        trl: 8,
        vendors: ['Aerojet Rocketdyne', 'Bradford Space', 'Dawn Aerospace'],
      },
      {
        id: 'prop-hydrazine',
        name: 'Hydrazine Monopropellant',
        mass: 3.0,
        power: 2.0,
        cost: 100,
        description: 'Heritage system. Isp ~220s. 100-500 m/s delta-V. Requires special handling. For microsats+.',
        trl: 9,
        vendors: ['Aerojet Rocketdyne', 'Moog', 'Northrop Grumman'],
      },
      {
        id: 'prop-biprop',
        name: 'Bipropellant System',
        mass: 8.0,
        power: 5.0,
        cost: 250,
        description: 'MMH/NTO or similar. Isp ~300s. 500-2000+ m/s delta-V. For minisats needing significant maneuver capability.',
        trl: 9,
        vendors: ['Aerojet Rocketdyne', 'Moog', 'Northrop Grumman', 'Ariane Group'],
      },
    ],
  },
  {
    id: 'thermal',
    name: 'Thermal Control',
    abbreviation: 'TCS',
    description: 'Manages spacecraft temperature within operational limits',
    options: [
      {
        id: 'thermal-passive',
        name: 'Passive (Coatings + MLI)',
        mass: 0.05,
        power: 0,
        cost: 5,
        description: 'Surface coatings, MLI blankets, and thermal tapes. No active power draw. Standard for simple CubeSats.',
        trl: 9,
        vendors: ['Sheldahl', 'Dunmore', 'MAP Space Coatings'],
      },
      {
        id: 'thermal-passive-heaters',
        name: 'Passive + Survival Heaters',
        mass: 0.15,
        power: 2.0,
        cost: 10,
        description: 'MLI/coatings plus thermostatically controlled heaters for eclipse survival. Standard for 3U+.',
        trl: 9,
        vendors: ['Minco', 'Tayco', 'Birk Manufacturing'],
      },
      {
        id: 'thermal-active',
        name: 'Active (Heat Pipes + Radiators)',
        mass: 1.0,
        power: 5.0,
        cost: 40,
        description: 'Heat pipes, deployable radiators, and active heaters. For higher-power microsats with thermal challenges.',
        trl: 9,
        vendors: ['ACT', 'Thermacore', 'Northrop Grumman'],
      },
      {
        id: 'thermal-full',
        name: 'Full Active (Fluid Loop)',
        mass: 4.0,
        power: 15.0,
        cost: 120,
        description: 'Mechanically pumped fluid loop with deployable radiators. For high-power minisats/GEO platforms.',
        trl: 9,
        vendors: ['Northrop Grumman', 'Lockheed Martin', 'Airbus'],
      },
    ],
  },
  {
    id: 'structure',
    name: 'Structure',
    abbreviation: 'STR',
    description: 'Primary and secondary spacecraft structure',
    options: [
      {
        id: 'struct-cots-1u',
        name: 'COTS 1U Frame (Aluminum)',
        mass: 0.15,
        power: 0,
        cost: 3,
        description: 'Commercial off-the-shelf 1U CubeSat aluminum structure. Standard PC/104 stack compatible.',
        trl: 9,
        vendors: ['Pumpkin', 'ISIS', 'Endurosat', 'GOMspace'],
      },
      {
        id: 'struct-cots-3u',
        name: 'COTS 3U Frame (Aluminum)',
        mass: 0.35,
        power: 0,
        cost: 5,
        description: 'Commercial 3U CubeSat structure. Side panel mounting options. PC/104 or custom board stacks.',
        trl: 9,
        vendors: ['Pumpkin', 'ISIS', 'Endurosat', 'NanoAvionics'],
      },
      {
        id: 'struct-cots-6u',
        name: 'COTS 6U Frame (Aluminum)',
        mass: 0.7,
        power: 0,
        cost: 8,
        description: 'Commercial 6U structure with payload bay. Supports large deployable mechanisms.',
        trl: 9,
        vendors: ['Pumpkin', 'ISIS', 'Blue Canyon Technologies'],
      },
      {
        id: 'struct-cots-12u',
        name: 'COTS 12U Frame (Aluminum)',
        mass: 1.2,
        power: 0,
        cost: 12,
        description: 'Commercial 12U structure. Multiple payload bays. Accommodates large solar arrays and antennas.',
        trl: 9,
        vendors: ['Pumpkin', 'ISIS', 'Tyvak'],
      },
      {
        id: 'struct-custom-cf',
        name: 'Custom Carbon Fiber Composite',
        mass: 3.0,
        power: 0,
        cost: 80,
        description: 'Custom-designed carbon fiber structure for microsats/minisats. High stiffness-to-weight ratio.',
        trl: 9,
        vendors: ['Composite Technology Development', 'Northrop Grumman', 'L3Harris'],
      },
      {
        id: 'struct-3d-printed',
        name: '3D-Printed Metal Structure',
        mass: 2.5,
        power: 0,
        cost: 50,
        description: 'Additively manufactured aluminum or titanium structure. Topology optimized for minimum mass.',
        trl: 8,
        vendors: ['Relativity Space', 'Made In Space (Redwire)', 'Rocket Lab'],
      },
    ],
  },
];

// ── Mission Templates ──

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'eo-leo',
    name: 'Earth Observation LEO',
    orbit: 'LEO Sun-Synchronous',
    altitude: '400-600 km',
    inclination: '97-98 deg (SSO)',
    duration: '2-5 years',
    description: 'Standard Earth observation mission in a sun-synchronous orbit providing consistent lighting conditions. Requires precise pointing for imaging, moderate data downlink, and optional propulsion for orbit maintenance.',
    typicalBus: '6U CubeSat or Microsatellite',
    keyRequirements: [
      'Fine pointing accuracy (<0.1 deg)',
      'High data rate downlink (>50 Mbps)',
      'Sun-synchronous orbit for consistent illumination',
      'Orbit maintenance propulsion recommended',
      'Thermal control for optics stability',
    ],
    recommendedSubsystems: {
      adcs: 'adcs-rw-star-tracker',
      eps: 'eps-deployable-4panel',
      cdh: 'cdh-standard',
      comms: 'comms-xband',
      propulsion: 'prop-electric',
      thermal: 'thermal-passive-heaters',
      structure: 'struct-cots-6u',
    },
    references: [
      { label: 'Planet Labs EO Constellation', url: 'https://www.planet.com/products/' },
      { label: 'ESA Earth Observation', url: 'https://www.esa.int/Applications/Observing_the_Earth' },
    ],
  },
  {
    id: 'iot-constellation',
    name: 'IoT/M2M Constellation',
    orbit: 'LEO Inclined',
    altitude: '500-600 km',
    inclination: '45-55 deg',
    duration: '3-5 years',
    description: 'Internet of Things data collection constellation. Multiple small satellites collect short messages from ground sensors worldwide. Emphasis on low cost per node, rapid deployment, and global coverage.',
    typicalBus: '3U CubeSat',
    keyRequirements: [
      'UHF/VHF store-and-forward capability',
      'Low individual satellite cost',
      'Constellation of 20-100+ satellites',
      'Basic ADCS sufficient',
      'Passive deorbit compliance (25-year rule)',
    ],
    recommendedSubsystems: {
      adcs: 'adcs-reaction-wheels-sun',
      eps: 'eps-deployable-2panel',
      cdh: 'cdh-basic',
      comms: 'comms-uhf',
      propulsion: 'prop-none',
      thermal: 'thermal-passive',
      structure: 'struct-cots-3u',
    },
    references: [
      { label: 'Swarm Technologies (SpaceX)', url: 'https://swarm.space/' },
      { label: 'Lacuna Space IoT', url: 'https://lacuna.space/' },
    ],
  },
  {
    id: 'tech-demo',
    name: 'Technology Demonstration',
    orbit: 'LEO',
    altitude: '350-500 km',
    inclination: '51.6 deg (ISS) or SSO',
    duration: '6-18 months',
    description: 'Short-duration mission to validate new technology in space. Often deployed from the ISS or via rideshare. Emphasis on rapid development, low cost, and collecting flight heritage data.',
    typicalBus: '1U-3U CubeSat',
    keyRequirements: [
      'Rapid development timeline (<18 months)',
      'Low cost (minimize risk capital)',
      'ISS deployment or rideshare compatible',
      'Basic telemetry sufficient',
      'Short mission duration acceptable',
    ],
    recommendedSubsystems: {
      adcs: 'adcs-magnetorquer-only',
      eps: 'eps-body-mounted',
      cdh: 'cdh-basic',
      comms: 'comms-uhf',
      propulsion: 'prop-none',
      thermal: 'thermal-passive',
      structure: 'struct-cots-1u',
    },
    references: [
      { label: 'NASA CubeSat Launch Initiative', url: 'https://www.nasa.gov/directorates/heo/home/CubeSats_initiative' },
      { label: 'ISS CubeSat Deployment', url: 'https://www.nasa.gov/mission_pages/station/research/news/cubesat' },
    ],
  },
  {
    id: 'deep-space-cubesat',
    name: 'Deep Space CubeSat',
    orbit: 'Interplanetary / Lunar',
    altitude: 'Beyond LEO',
    inclination: 'Varies by target',
    duration: '6-36 months',
    description: 'CubeSat mission beyond Earth orbit, such as lunar flyby, asteroid rendezvous, or Mars orbit. Requires autonomous operation, deep-space communication, radiation hardening, and significant delta-V.',
    typicalBus: '6U-12U CubeSat',
    keyRequirements: [
      'Autonomous fault management',
      'Deep space communications (X-band+)',
      'Radiation-tolerant electronics',
      'Significant propulsion (>100 m/s delta-V)',
      'Precise navigation and ADCS',
      'Extended thermal management',
    ],
    recommendedSubsystems: {
      adcs: 'adcs-rw-star-tracker',
      eps: 'eps-deployable-4panel',
      cdh: 'cdh-high-perf',
      comms: 'comms-xband',
      propulsion: 'prop-electric',
      thermal: 'thermal-active',
      structure: 'struct-cots-6u',
    },
    references: [
      { label: 'NASA MarCO Mission', url: 'https://www.jpl.nasa.gov/missions/mars-cube-one-marco' },
      { label: 'NASA CAPSTONE', url: 'https://www.nasa.gov/smallspacecraft/capstone/' },
      { label: 'ESA M-Argo Asteroid CubeSat', url: 'https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Miniaturised_Asteroid_Remote_Geophysical_Observer_M-Argo' },
    ],
  },
  {
    id: 'geo-comms',
    name: 'GEO Communications Satellite',
    orbit: 'GEO',
    altitude: '35,786 km',
    inclination: '0 deg',
    duration: '15+ years',
    description: 'Geostationary communications satellite providing fixed coverage over a region. Full-size spacecraft with high power, long design life, and significant station-keeping propulsion. Represents the traditional commercial satellite model.',
    typicalBus: 'Minisatellite or Full-Size Bus (1000-6000 kg)',
    keyRequirements: [
      'High power (5-25 kW)',
      '15+ year design life',
      'Radiation-hardened for GEO environment',
      'Significant north-south station-keeping',
      'High-gain antenna pointing',
      'Reliable, redundant systems throughout',
    ],
    recommendedSubsystems: {
      adcs: 'adcs-cmg',
      eps: 'eps-high-power',
      cdh: 'cdh-redundant',
      comms: 'comms-kaband',
      propulsion: 'prop-biprop',
      thermal: 'thermal-full',
      structure: 'struct-custom-cf',
    },
    references: [
      { label: 'Maxar 1300 Platform', url: 'https://www.maxar.com/products/spacecraft-platforms/1300-series' },
      { label: 'Airbus Eurostar Neo', url: 'https://www.airbus.com/en/products-services/space/satellites/eurostar-neo' },
      { label: 'SES Fleet', url: 'https://www.ses.com/our-coverage/satellites-and-network' },
    ],
  },
];
