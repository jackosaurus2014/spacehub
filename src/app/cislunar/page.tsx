'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface ArtemisMission {
  id: string;
  name: string;
  date: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'planned';
  vehicle: string;
  hls?: string;
  crew?: number;
  objectives: string[];
  internationalContributions?: string[];
  description: string;
}

interface CLPSMission {
  id: string;
  name: string;
  company: string;
  lander: string;
  launchDate: string;
  landingSite?: string;
  status: 'success' | 'partial-success' | 'failure' | 'in-transit' | 'upcoming' | 'planned';
  payloads: string[];
  result?: string;
  contractValue?: string;
  description: string;
}

interface ISRUProgram {
  id: string;
  name: string;
  organization: string;
  category: 'water-ice' | 'oxygen' | 'regolith' | 'metals' | 'propellant' | 'prospecting';
  trl: number;
  status: 'active' | 'completed' | 'cancelled' | 'planned';
  description: string;
  keyMilestones?: string[];
  targetDate?: string;
}

interface InfrastructureElement {
  id: string;
  name: string;
  category: 'gateway' | 'communications' | 'power' | 'surface' | 'transport';
  developer: string;
  status: 'operational' | 'under-construction' | 'development' | 'design' | 'concept';
  description: string;
  timeline?: string;
  cost?: string;
  partners?: string[];
}

interface LunarInvestment {
  id: string;
  program: string;
  organization: string;
  type: 'government' | 'commercial' | 'international';
  amount: string;
  amountNum: number;
  period: string;
  category: string;
  description: string;
}

// ────────────────────────────────────────
// Data: Artemis Program
// ────────────────────────────────────────

const ARTEMIS_MISSIONS: ArtemisMission[] = [
  {
    id: 'artemis-1',
    name: 'Artemis I',
    date: 'Nov 16 - Dec 11, 2022',
    status: 'completed',
    vehicle: 'SLS Block 1 / Orion (EFT-1)',
    crew: 0,
    objectives: [
      'Uncrewed test flight of SLS and Orion',
      'Distant retrograde orbit around the Moon',
      'Heat shield reentry test at lunar return speeds',
      'Orion systems validation in deep space',
    ],
    description:
      'Successfully completed a 25.5-day mission traveling 1.4 million miles. Orion performed multiple lunar flybys, entered a distant retrograde orbit (DRO), and set a new distance record for a spacecraft designed to carry humans (268,563 miles from Earth). The heat shield withstood reentry at approximately 24,500 mph (Mach 32) and 5,000 degrees Fahrenheit. All primary mission objectives were met, validating SLS and Orion for crewed flights.',
  },
  {
    id: 'artemis-2',
    name: 'Artemis II',
    date: 'NET Sep 2025',
    status: 'upcoming',
    vehicle: 'SLS Block 1 / Orion',
    crew: 4,
    objectives: [
      'First crewed Artemis flight (4 astronauts)',
      'Lunar free-return trajectory flyby',
      'Test Orion life support systems with crew',
      'Manual piloting demonstrations',
    ],
    internationalContributions: ['CSA: Jeremy Hansen (first non-American on lunar trajectory)'],
    description:
      'The first crewed Artemis mission will carry astronauts Reid Wiseman (Commander), Victor Glover (Pilot), Christina Koch (Mission Specialist), and Jeremy Hansen of the Canadian Space Agency (Mission Specialist) on an approximately 10-day free-return trajectory around the Moon. This will be the first crewed mission beyond low Earth orbit since Apollo 17 in 1972. The crew will test Orion\'s environmental control and life support systems (ECLSS) under operational conditions and perform manual piloting maneuvers.',
  },
  {
    id: 'artemis-3',
    name: 'Artemis III',
    date: 'NET mid-2026',
    status: 'upcoming',
    vehicle: 'SLS Block 1 / Orion',
    hls: 'SpaceX Starship HLS',
    crew: 4,
    objectives: [
      'First crewed lunar landing since Apollo 17 (1972)',
      'South polar region surface operations (~6.5 days)',
      'Up to 2 astronauts on lunar surface via Starship HLS',
      'Moonwalks for science collection and technology demos',
    ],
    internationalContributions: ['ESA: Orion European Service Module (ESM)'],
    description:
      'This historic mission will return humans to the lunar surface for the first time in over 50 years. Two astronauts will descend to the south polar region using SpaceX\'s Starship Human Landing System (HLS), while two remain in Orion in lunar orbit. Surface astronauts will conduct multiple EVAs (moonwalks) over approximately a week, collecting samples from permanently shadowed regions that may contain water ice. Starship HLS will require multiple orbital refueling flights before the crew transfer. This is the first mission to target the lunar south pole, a region of high scientific interest due to its potential volatile deposits.',
  },
  {
    id: 'artemis-4',
    name: 'Artemis IV',
    date: 'NET 2028',
    status: 'planned',
    vehicle: 'SLS Block 1B / Orion',
    hls: 'SpaceX Starship HLS (enhanced)',
    crew: 4,
    objectives: [
      'First crewed mission to the Lunar Gateway',
      'Delivery of I-HAB module to Gateway',
      'Dock Orion with PPE+HALO in NRHO',
      'Potential surface sortie via Starship HLS',
    ],
    internationalContributions: [
      'ESA: I-HAB module (Thales Alenia Space)',
      'JAXA: I-HAB ECLSS components',
      'CSA: Canadarm3 robotic operations',
    ],
    description:
      'Artemis IV marks the debut of the SLS Block 1B configuration with its more powerful Exploration Upper Stage (EUS), providing significantly more payload capacity than Block 1. This mission will be the first crewed visit to the Lunar Gateway, docking Orion with the PPE+HALO modules already in near-rectilinear halo orbit (NRHO). The crew will deliver and activate the I-HAB (International Habitation) module, built by ESA with JAXA life support contributions, expanding the Gateway\'s habitable volume and capabilities.',
  },
  {
    id: 'artemis-5',
    name: 'Artemis V',
    date: 'NET 2030',
    status: 'planned',
    vehicle: 'SLS Block 1B / Orion',
    hls: 'Blue Origin Blue Moon Mark 2',
    crew: 4,
    objectives: [
      'Second provider HLS demonstration (Blue Origin)',
      'Blue Moon Mark 2 crewed lunar landing',
      'Further Gateway assembly and outfitting',
      'Extended surface operations',
    ],
    internationalContributions: [
      'ESA: ESPRIT refueling module delivery',
      'CSA: Canadarm3 autonomous assembly operations',
    ],
    description:
      'Artemis V will feature Blue Origin\'s Blue Moon Mark 2 Human Landing System, providing NASA a second independent crew transportation option to the lunar surface. Blue Origin leads the National Team that includes Lockheed Martin, Draper, Boeing, Astrobotic, and Honeybee Robotics. The mission will continue expanding the Gateway and demonstrate sustained surface operations with an enhanced lander capability. Blue Origin received a $3.4 billion contract for HLS development under the Sustaining Lunar Development (SLD) program.',
  },
  {
    id: 'artemis-6-plus',
    name: 'Artemis VI+',
    date: '2031 and beyond',
    status: 'planned',
    vehicle: 'SLS Block 1B or Block 2 / Orion',
    hls: 'Alternating SpaceX / Blue Origin HLS',
    crew: 4,
    objectives: [
      'Sustained lunar presence with annual missions',
      'Extended surface stays (weeks to months)',
      'Lunar surface habitat deployment',
      'ISRU demonstrations at scale',
      'Mars forward technology testing',
    ],
    internationalContributions: [
      'ESA: Crew & Science Airlock contributions',
      'JAXA: HTV-X cargo resupply',
      'Multiple Artemis Accords signatories',
    ],
    description:
      'The sustained phase of Artemis envisions regular missions to the Gateway and lunar surface through the 2030s and beyond. NASA plans to alternate between SpaceX and Blue Origin landing systems, establishing a cadence of approximately one crewed landing per year. Key goals include deploying permanent surface habitats, demonstrating in-situ resource utilization (ISRU) at operational scale, testing technologies critical for eventual Mars missions, and expanding international participation under the Artemis Accords framework. As of early 2025, 43 nations have signed the Artemis Accords.',
  },
];

// ────────────────────────────────────────
// Data: Commercial Lunar (CLPS)
// ────────────────────────────────────────

const CLPS_MISSIONS: CLPSMission[] = [
  {
    id: 'peregrine-1',
    name: 'Peregrine Mission One',
    company: 'Astrobotic Technology',
    lander: 'Peregrine',
    launchDate: 'Jan 8, 2024',
    status: 'failure',
    payloads: [
      'NASA LETS (Linear Energy Transfer Spectrometer)',
      'NASA NSS (Neutron Spectrometer System)',
      'NASA NIRVSS (Near-Infrared Volatile Spectrometer System)',
      'NASA PITMS (Peregrine Ion Trap Mass Spectrometer)',
      'NASA LRA (Laser Retroreflector Array)',
      'CMU Iris rover',
      'DHL MoonBox',
      'Celestis/Elysium memorial payloads',
    ],
    result:
      'Propulsion anomaly shortly after launch caused oxidizer leak. The spacecraft lost attitude control and was unable to achieve lunar landing. Peregrine reentered Earth\'s atmosphere on Jan 18, 2024 over the South Pacific. Root cause determined to be a stuck valve in the propulsion system.',
    contractValue: '$79.5M',
    description:
      'The first CLPS delivery attempt. Astrobotic\'s Peregrine lander launched on the inaugural ULA Vulcan Centaur rocket. Despite the mission failure, it provided valuable data for future attempts and validated the Vulcan Centaur launch vehicle.',
  },
  {
    id: 'im-1',
    name: 'IM-1 (Nova-C Odysseus)',
    company: 'Intuitive Machines',
    lander: 'Nova-C "Odysseus"',
    launchDate: 'Feb 15, 2024',
    landingSite: 'Malapert A crater (south polar region, 80.13S)',
    status: 'partial-success',
    payloads: [
      'NASA ROLSES (Radio wave Observations at the Lunar Surface of the photoElectron Sheath)',
      'NASA LN-1 (Lunar Node-1 Navigation Demonstrator)',
      'NASA LRA (Laser Retroreflector Array)',
      'NASA NDL (Navigation Doppler Lidar)',
      'NASA SCALPSS (Stereo Cameras for Lunar Plume-Surface Studies)',
      'NASA ILO-X (International Lunar Observatory precursor)',
      'Columbia Sportswear insulation experiment',
      'Jeff Koons Moon Phases sculpture',
    ],
    result:
      'Landed on Feb 22, 2024 near Malapert A crater, becoming the first US soft landing on the Moon since Apollo 17 in 1972 and the first commercial lunar landing in history. However, Odysseus tipped onto its side during landing due to higher-than-expected lateral velocity, likely caused by a last-minute nav switch to the NASA NDL instrument after the primary laser rangefinders failed to activate. The lander operated for about 7 days in a tilted configuration before losing power as the sun set on its solar panels. Despite the tipping, most instruments returned data.',
    contractValue: '$118M',
    description:
      'Historic mission -- the first commercial lunar landing and first US lunar landing in over 50 years. Launched on SpaceX Falcon 9. The landing site near the south pole was the closest to the lunar south pole any spacecraft had landed.',
  },
  {
    id: 'im-2',
    name: 'IM-2 (Athena)',
    company: 'Intuitive Machines',
    lander: 'Nova-C "Athena"',
    launchDate: 'Q1 2025',
    landingSite: 'Shackleton crater ridge (south pole)',
    status: 'upcoming',
    payloads: [
      'NASA PRIME-1 (Polar Resources Ice Mining Experiment)',
      'TRIDENT drill (1 meter depth)',
      'Mass Spectrometer observing lunar Operations (MSolo)',
      'Micro-Nova hopper robot',
      'Nokia 4G/LTE lunar communications demo',
      'Lunar Outpost MAPP rover',
    ],
    contractValue: '$$130M',
    description:
      'IM-2 will target the Shackleton crater connecting ridge at the lunar south pole. The mission\'s centerpiece is NASA\'s PRIME-1 experiment, which includes the TRIDENT drill designed to extract subsurface ice samples from up to 1 meter depth. The MSolo mass spectrometer will analyze volatiles in the excavated material. The mission also carries a Nokia/Bell Labs 4G/LTE network demonstration and the Micro-Nova hopper -- a small deployable that can hop into permanently shadowed regions to directly investigate ice deposits.',
  },
  {
    id: 'blue-ghost-1',
    name: 'Blue Ghost Mission 1',
    company: 'Firefly Aerospace',
    lander: 'Blue Ghost',
    launchDate: 'Jan 15, 2025',
    landingSite: 'Mare Crisium',
    status: 'in-transit',
    payloads: [
      'NASA LISTER (Lunar Instrumentation for Subsurface Thermal Exploration with Rapidity)',
      'NASA LRA (Laser Retroreflector Array)',
      'NASA LETS (Lunar Environment heliophysics X-ray Imager)',
      'NASA BFSS (Electrodynamic Dust Shield)',
      'NASA RAC (Regolith Adherence Characterization)',
      'NASA SPELLS (Sample Plume Experiment for Lunar Landing Studies)',
      'NASA NextStep-2 experiments',
      'Honeybee Robotics LUNARSABER',
    ],
    contractValue: '$93.3M',
    description:
      'Firefly\'s first CLPS mission, launched on SpaceX Falcon 9. Blue Ghost is a mid-size lander designed to carry up to 150 kg of payload to the lunar surface. The mission targets Mare Crisium (Sea of Crises) on the Moon\'s near side. Blue Ghost will spend approximately 45 days in transit, using a low-energy transfer trajectory. It carries 10 NASA payloads focused on lunar regolith interaction, subsurface thermal properties, and heliophysics.',
  },
  {
    id: 'im-3',
    name: 'IM-3',
    company: 'Intuitive Machines',
    lander: 'Nova-C (enhanced)',
    launchDate: 'Late 2025',
    landingSite: 'Reiner Gamma (magnetic swirl)',
    status: 'planned',
    payloads: [
      'NASA Lunar Vertex (magnetometer, electron spectrometer, cameras)',
      'Additional NASA & commercial payloads TBD',
    ],
    contractValue: '$77.5M',
    description:
      'IM-3 will deliver the Lunar Vertex payload suite to Reiner Gamma, one of the most prominent lunar swirls -- mysterious bright patterns on the Moon\'s surface associated with localized magnetic fields. The mission includes a small rover equipped with a magnetometer to create detailed magnetic field maps across the swirl formation, providing key data on the origin and evolution of these enigmatic features.',
  },
  {
    id: 'griffin-viper',
    name: 'Griffin / VIPER',
    company: 'Astrobotic Technology',
    lander: 'Griffin',
    launchDate: 'Cancelled (was NET late 2024)',
    landingSite: 'Was: Mons Mouton (south pole)',
    status: 'failure',
    payloads: [
      'NASA VIPER rover (cancelled Jul 2024)',
    ],
    result:
      'NASA cancelled the VIPER (Volatiles Investigating Polar Exploration Rover) mission in July 2024 due to cost overruns and schedule delays, despite the rover being nearly complete. The rover had ballooned from its original $433M budget to over $609M. NASA cited the need to protect other CLPS missions in the pipeline. The Griffin lander development also faced challenges. Some VIPER instruments may fly on future commercial missions. The cancellation was widely debated within the space community.',
    contractValue: '$320M+ (combined, before cancellation)',
    description:
      'Originally planned to deliver NASA\'s VIPER rover to the lunar south pole to prospect for water ice in permanently shadowed regions. VIPER was a golf-cart-sized rover with a 1-meter drill and multiple spectrometers designed to create the first resource maps of lunar water ice. The Griffin lander, Astrobotic\'s larger platform after Peregrine, was designed to deliver up to 625 kg of payload.',
  },
  {
    id: 'clps-cs3',
    name: 'CS-3 (Draper/Firefly)',
    company: 'Draper / Firefly Aerospace',
    lander: 'Blue Ghost (Series 2)',
    launchDate: 'NET 2026',
    landingSite: 'Schrödinger basin (lunar far side)',
    status: 'planned',
    payloads: [
      'Farside Seismic Suite (FSS)',
      'Lunar Interior Temperature & Materials Suite (LITMS)',
    ],
    contractValue: '$73M',
    description:
      'A landmark CLPS mission that will deliver science instruments to the Schrödinger basin on the lunar far side -- the first US landing on the far side of the Moon. Draper leads the mission with Firefly providing the Blue Ghost lander. The mission will require a relay satellite for communications since the far side never faces Earth. Key instruments will study the Moon\'s interior seismology and thermal properties.',
  },
  {
    id: 'blue-ghost-2',
    name: 'Blue Ghost Mission 2',
    company: 'Firefly Aerospace',
    lander: 'Blue Ghost',
    launchDate: 'NET 2026',
    landingSite: 'TBD (near side)',
    status: 'planned',
    payloads: [
      'NASA Lunar PlanetVac sample collection',
      'Additional TBD payloads',
    ],
    contractValue: '$110M',
    description:
      'Firefly\'s second CLPS award will demonstrate the Blue Ghost lander\'s versatility on a second mission. It includes the Lunar PlanetVac pneumatic sample collection system and additional payloads for regolith science and technology demonstrations.',
  },
  {
    id: 'hakuto-r-m2',
    name: 'HAKUTO-R Mission 2 (RESILIENCE)',
    company: 'ispace (Japan)',
    lander: 'HAKUTO-R Series 1 (RESILIENCE)',
    launchDate: 'Dec 2024 (launched)',
    landingSite: 'Mare Frigoris',
    status: 'in-transit',
    payloads: [
      'Tenacious micro rover (ispace)',
      'ESA deep space radiation monitor',
      'Multiple commercial payloads',
    ],
    result:
      'HAKUTO-R Mission 1 crashed on the Moon in April 2023 due to an altitude estimation error. Mission 2 (RESILIENCE) launched in December 2024 with software fixes to prevent the same issue. Landing attempt expected in early-mid 2025.',
    contractValue: 'Commercial (non-NASA CLPS)',
    description:
      'ispace\'s second attempt at a commercial lunar landing following the Mission 1 crash in April 2023. Mission 2 carries a small micro-rover called Tenacious that will deploy onto the surface. ispace is a Japanese company aiming to build a cislunar transportation network. Though not a NASA CLPS mission, it represents the growing commercial lunar delivery market.',
  },
];

// ────────────────────────────────────────
// Data: ISRU & Resources
// ────────────────────────────────────────

const ISRU_PROGRAMS: ISRUProgram[] = [
  {
    id: 'prime-1',
    name: 'PRIME-1 (Polar Resources Ice Mining Experiment)',
    organization: 'NASA / Honeybee Robotics',
    category: 'water-ice',
    trl: 6,
    status: 'active',
    description:
      'The first attempt to drill into the lunar surface and analyze subsurface volatiles in situ. Consists of the TRIDENT rotary percussive drill (capable of 1m depth) and the MSolo mass spectrometer to identify water and other volatiles in excavated material. Flying on the IM-2 mission to Shackleton crater.',
    keyMilestones: [
      'Hardware integrated onto IM-2 lander (2024)',
      'Flight to Shackleton crater ridge (Q1 2025)',
      'First subsurface ice detection attempt',
    ],
    targetDate: 'Q1 2025',
  },
  {
    id: 'viper-legacy',
    name: 'VIPER Instrument Suite Legacy',
    organization: 'NASA Ames Research Center',
    category: 'prospecting',
    trl: 7,
    status: 'cancelled',
    description:
      'VIPER (Volatiles Investigating Polar Exploration Rover) was cancelled in July 2024 after exceeding its budget ($609M+ vs $433M original). The golf-cart-sized rover had instruments including TRIDENT drill, MSolo, NSS (Neutron Spectrometer System), and NIRVSS (Near-Infrared Volatile Spectrometer System). Despite cancellation, NASA is exploring options to fly VIPER-heritage instruments on future commercial landers. The rover hardware was offered to industry for potential alternative missions.',
    keyMilestones: [
      'Rover assembly completed (2024)',
      'Mission cancelled due to cost overruns (Jul 2024)',
      'Instruments being considered for future CLPS flights',
    ],
  },
  {
    id: 'moxie-heritage',
    name: 'MOXIE Heritage / Lunar Oxygen Extraction',
    organization: 'NASA JPL / MIT',
    category: 'oxygen',
    trl: 5,
    status: 'active',
    description:
      'Building on the success of MOXIE (Mars Oxygen In-Situ Resource Utilization Experiment) on the Perseverance rover, which successfully produced oxygen from CO2 on Mars (2021-2023), NASA is developing concepts for lunar oxygen extraction from regolith. Lunar soil is approximately 43% oxygen by weight, locked in mineral oxides. Multiple extraction methods are under investigation: molten oxide electrolysis, hydrogen reduction of ilmenite, and carbothermal reduction.',
    keyMilestones: [
      'MOXIE on Mars exceeded all production targets (2023)',
      'Lunar oxygen extraction pathways under study',
      'Ground demonstrations of molten oxide electrolysis',
    ],
  },
  {
    id: 'isru-pilot',
    name: 'Lunar Surface ISRU Pilot Plant',
    organization: 'NASA / Multiple contractors',
    category: 'propellant',
    trl: 3,
    status: 'planned',
    description:
      'NASA\'s long-term vision includes deploying an ISRU pilot plant capable of producing water, oxygen, and potentially hydrogen/LOX propellant from lunar resources. This would enable refueling of landers and ascent vehicles at the Moon, dramatically reducing launch mass from Earth. The pilot plant concept integrates ice mining, water purification, electrolysis, and cryogenic storage systems.',
    keyMilestones: [
      'System architecture studies (2024-2025)',
      'Component-level ground testing',
      'Targeted pilot deployment after 2030',
    ],
    targetDate: 'Post-2030',
  },
  {
    id: 'regolith-processing',
    name: 'Lunar Regolith Construction Materials',
    organization: 'NASA / ICON / AI SpaceFactory',
    category: 'regolith',
    trl: 4,
    status: 'active',
    description:
      'Multiple programs are investigating using lunar regolith (soil) as a construction material. ICON received a $57.2M NASA contract to develop a lunar surface construction system using 3D printing with regolith-based materials (Project Olympus). AI SpaceFactory has demonstrated Mars/lunar habitat prototypes. Sintering, microwave melting, and binder-jet approaches are all under development for roads, landing pads, and habitats.',
    keyMilestones: [
      'ICON Project Olympus contract awarded ($57.2M)',
      'Earth-based regolith simulant printing demonstrations',
      'Landing pad construction technology maturation',
    ],
    targetDate: '2026-2030',
  },
  {
    id: 'lunar-metals',
    name: 'Lunar Metal Extraction',
    organization: 'ESA / Universities',
    category: 'metals',
    trl: 3,
    status: 'active',
    description:
      'ESA and academic partners are developing methods to extract metals (iron, aluminum, titanium) from lunar regolith using molten salt electrolysis. The FFC Cambridge process, originally developed for terrestrial titanium extraction, has been adapted for lunar applications. Ground-based experiments using lunar regolith simulants have successfully extracted metallic alloys, with oxygen as a valuable byproduct.',
    keyMilestones: [
      'Successful metal extraction from regolith simulants',
      'ESA study contracts for industrial-scale processes',
      'Technology roadmap for 2030s deployment',
    ],
    targetDate: '2030s',
  },
  {
    id: 'water-ice-mapping',
    name: 'Lunar Water Ice Mapping & Characterization',
    organization: 'NASA / ISRO / KARI',
    category: 'water-ice',
    trl: 5,
    status: 'active',
    description:
      'Multiple missions have confirmed water ice exists in permanently shadowed regions (PSRs) of the lunar south pole. NASA\'s Lunar Reconnaissance Orbiter (LRO), ISRO\'s Chandrayaan-1 (which first detected ice via its Moon Impact Probe), and Chandrayaan-2 continue to map these deposits from orbit. Estimated reserves range from 600 million to several billion metric tons, though concentration and accessibility remain uncertain. Upcoming surface missions (IM-2, future CLPS) will provide crucial ground-truth data.',
    keyMilestones: [
      'Chandrayaan-1 confirmed water ice at poles (2009)',
      'LRO ongoing detailed mapping (2009-present)',
      'Chandrayaan-3 south pole landing data (Aug 2023)',
      'Ground-truth from PRIME-1 / IM-2 (2025)',
    ],
  },
];

// ────────────────────────────────────────
// Data: Infrastructure
// ────────────────────────────────────────

const INFRASTRUCTURE: InfrastructureElement[] = [
  {
    id: 'gateway-ppe-halo',
    name: 'Lunar Gateway (PPE + HALO)',
    category: 'gateway',
    developer: 'Maxar (PPE) / Northrop Grumman (HALO)',
    status: 'under-construction',
    description:
      'The first two modules of the Lunar Gateway: the Power and Propulsion Element (PPE, ~5,000 kg, 60 kW solar electric propulsion with Hall-effect thrusters) and the Habitation and Logistics Outpost (HALO, ~8,600 kg, crew capacity of 4 for up to 30 days). They will launch co-manifested on a SpaceX Falcon Heavy to a near-rectilinear halo orbit (NRHO) around the Moon. Integration and testing at Kennedy Space Center are underway.',
    timeline: 'Launch NET late 2025',
    cost: '~$1.3B combined (PPE $375M + HALO $935M)',
    partners: ['NASA', 'SpaceX (launch)', 'ESA (comms support)'],
  },
  {
    id: 'gateway-ihab',
    name: 'I-HAB (International Habitation Module)',
    category: 'gateway',
    developer: 'Thales Alenia Space (ESA)',
    status: 'under-construction',
    description:
      'ESA\'s primary contribution to the Gateway. I-HAB expands the habitable volume and provides enhanced life support, additional docking ports, and crew quarters. JAXA provides ECLSS (Environmental Control and Life Support System) components. Delivery planned on Artemis IV.',
    timeline: 'Delivery on Artemis IV (NET 2028)',
    cost: 'ESA contribution (~EUR 600M)',
    partners: ['ESA', 'JAXA', 'NASA'],
  },
  {
    id: 'gateway-esprit',
    name: 'ESPRIT (European Refueling & Telecom Module)',
    category: 'gateway',
    developer: 'Thales Alenia Space',
    status: 'design',
    description:
      'The European System Providing Refueling, Infrastructure and Telecommunications. ESPRIT provides propellant storage and transfer capabilities, enhanced deep-space communications relay, and a science airlock for instrument deployment and EVA access.',
    timeline: 'NET 2029',
    cost: 'ESA contribution',
    partners: ['ESA'],
  },
  {
    id: 'lunanet',
    name: 'LunaNet Communications Architecture',
    category: 'communications',
    developer: 'NASA / ESA / JAXA',
    status: 'development',
    description:
      'An interoperable lunar communications and navigation framework analogous to the Internet. LunaNet defines standards for networking protocols, navigation services (similar to GPS), and detection/information services for the cislunar environment. It will support surface-to-orbit, orbit-to-Earth, and surface-to-surface communications for all Artemis missions and commercial activities. Relay satellites in lunar orbit and at Earth-Moon Lagrange points will provide coverage, including for the far side.',
    timeline: 'Phased deployment 2025-2030',
    partners: ['NASA', 'ESA (Moonlight)', 'JAXA'],
  },
  {
    id: 'moonlight',
    name: 'ESA Moonlight Initiative',
    category: 'communications',
    developer: 'ESA / SSTL / Telespazio',
    status: 'development',
    description:
      'ESA\'s commercial lunar communications and navigation service. Moonlight aims to create a constellation of satellites around the Moon providing telecommunications relay and precise navigation services, available to all lunar missions. The Lunar Pathfinder satellite is the first element, planned to provide S-band and UHF relay services.',
    timeline: 'Lunar Pathfinder NET 2026; Full constellation 2028+',
    cost: '~EUR 340M (initial phase)',
    partners: ['ESA', 'SSTL', 'Telespazio'],
  },
  {
    id: 'starship-hls',
    name: 'SpaceX Starship HLS',
    category: 'transport',
    developer: 'SpaceX',
    status: 'development',
    description:
      'Starship Human Landing System for Artemis III and subsequent missions. A modified Starship vehicle optimized for lunar landing with a high-mounted crew cabin, elevator system for surface access, and enhanced solar arrays. Requires multiple orbital refueling flights using Starship tanker variants before each lunar mission. SpaceX is conducting orbital test flights of the full Starship system from Boca Chica, TX with progressive capability demonstrations.',
    timeline: 'Uncrewed demo landing before Artemis III; crewed Artemis III NET mid-2026',
    cost: '$2.89B initial + $1.15B option (NASA HLS contract)',
    partners: ['NASA', 'SpaceX'],
  },
  {
    id: 'blue-moon',
    name: 'Blue Origin Blue Moon Mark 2',
    category: 'transport',
    developer: 'Blue Origin (National Team)',
    status: 'development',
    description:
      'Blue Origin\'s Human Landing System for Artemis V and beyond. Blue Moon Mark 2 is a single-stage design using BE-7 LOX/LH2 engine. The National Team includes Lockheed Martin (crew module, cislunar flight ops), Draper (guidance and navigation), Boeing (descent stage), Astrobotic (cargo variant), and Honeybee Robotics (surface sampling). Unlike Starship HLS, Blue Moon does not require orbital refueling.',
    timeline: 'Crewed landing on Artemis V (NET 2030)',
    cost: '$3.4B (NASA SLD contract)',
    partners: ['Blue Origin', 'Lockheed Martin', 'Draper', 'Boeing', 'Astrobotic'],
  },
  {
    id: 'surface-power',
    name: 'Fission Surface Power System',
    category: 'power',
    developer: 'NASA / DOE / Lockheed Martin / IX (Intuitive Machines/X-energy)',
    status: 'development',
    description:
      'A compact nuclear fission reactor designed to provide 40 kW of continuous electrical power on the lunar surface, enough to support a crewed habitat and ISRU operations. Nuclear power is critical for lunar south pole operations where solar power is intermittent. NASA and DOE have selected industry teams to develop preliminary designs. Lockheed Martin and Intuitive Machines/X-energy joint venture (IX) received contracts for fission surface power systems.',
    timeline: 'Technology demonstration target: late 2020s to early 2030s',
    cost: '$150M+ (combined NASA/DOE investment)',
    partners: ['NASA', 'DOE', 'Lockheed Martin', 'IX (Intuitive Machines/X-energy)'],
  },
  {
    id: 'surface-hab',
    name: 'Lunar Surface Habitat',
    category: 'surface',
    developer: 'NASA / Multiple contractors',
    status: 'concept',
    description:
      'NASA is studying pressurized habitat concepts for extended crew stays on the lunar surface (weeks to months). Concepts range from rigid modules delivered by Starship HLS or Blue Moon cargo variants to inflatable habitats (like those from Sierra Space). Key requirements include radiation protection, dust mitigation, thermal management, and integration with ISRU systems for life support consumables. 3D-printed regolith shielding (ICON\'s Project Olympus) is under development for additional protection.',
    timeline: 'Design studies ongoing; deployment post-2030',
    partners: ['NASA', 'ICON', 'Sierra Space', 'Lockheed Martin'],
  },
  {
    id: 'lpr',
    name: 'Lunar Terrain Vehicle (LTV)',
    category: 'surface',
    developer: 'Lunar Dawn (Intuitive Machines + AVL + Northrop Grumman + Michelin)',
    status: 'development',
    description:
      'NASA selected three teams to develop the next-generation Lunar Terrain Vehicle for Artemis astronauts. The Lunar Dawn team (led by Intuitive Machines) was awarded the primary contract. The LTV will be an unpressurized rover for crew mobility during EVAs, capable of both crewed and autonomous remote operation. Unlike Apollo rovers which were left on the surface, the LTV is designed for reuse across multiple Artemis missions. Venturi Astrolab and Astrolab also received study contracts.',
    timeline: 'Delivery before Artemis V surface mission',
    cost: '$4.6B (maximum potential, task order based)',
    partners: ['Intuitive Machines', 'AVL', 'Northrop Grumman', 'Michelin'],
  },
];

// ────────────────────────────────────────
// Data: Investment
// ────────────────────────────────────────

const INVESTMENTS: LunarInvestment[] = [
  {
    id: 'nasa-artemis-total',
    program: 'Artemis Program (Total)',
    organization: 'NASA',
    type: 'government',
    amount: '$93B+',
    amountNum: 93000,
    period: 'FY2012-FY2025',
    category: 'Program Total',
    description:
      'NASA Inspector General estimated total Artemis costs including SLS, Orion, Ground Systems, HLS, spacesuits, and Gateway from inception through 2025. Per-launch SLS cost estimated at $4.1B for initial flights.',
  },
  {
    id: 'sls-dev',
    program: 'Space Launch System (SLS)',
    organization: 'NASA / Boeing',
    type: 'government',
    amount: '$23.8B',
    amountNum: 23800,
    period: 'FY2011-FY2024 (development)',
    category: 'Launch Vehicle',
    description:
      'SLS development costs through first flight (Artemis I). Boeing is the prime contractor for the core stage. Aerojet Rocketdyne (now L3Harris) builds the RS-25 engines (upgraded Space Shuttle main engines). Northrop Grumman provides the solid rocket boosters.',
  },
  {
    id: 'orion-dev',
    program: 'Orion Multi-Purpose Crew Vehicle',
    organization: 'NASA / Lockheed Martin',
    type: 'government',
    amount: '$20.4B',
    amountNum: 20400,
    period: 'FY2006-FY2024 (development)',
    category: 'Crew Vehicle',
    description:
      'Orion spacecraft development by Lockheed Martin (crew module) and Airbus Defence and Space (European Service Module, for ESA). Orion is the only crew-rated deep space vehicle currently operational.',
  },
  {
    id: 'hls-spacex',
    program: 'HLS Option A - SpaceX Starship',
    organization: 'NASA / SpaceX',
    type: 'government',
    amount: '$4.04B',
    amountNum: 4040,
    period: '$2.89B initial (2021) + $1.15B option (2022)',
    category: 'Human Landing System',
    description:
      'SpaceX HLS contract for Artemis III and IV lunar landings using modified Starship. Includes uncrewed demonstration landing and two crewed missions. SpaceX is also investing significant private capital in overall Starship development.',
  },
  {
    id: 'hls-blue',
    program: 'HLS Sustaining Lunar Development - Blue Origin',
    organization: 'NASA / Blue Origin',
    type: 'government',
    amount: '$3.4B',
    amountNum: 3400,
    period: 'Awarded May 2023',
    category: 'Human Landing System',
    description:
      'Blue Origin National Team contract for the Blue Moon Mark 2 Human Landing System for Artemis V and beyond. Team includes Lockheed Martin, Draper, Boeing, Astrobotic, and Honeybee Robotics.',
  },
  {
    id: 'gateway-contracts',
    program: 'Lunar Gateway (All Modules)',
    organization: 'NASA + ESA + JAXA + CSA',
    type: 'government',
    amount: '~$7.8B',
    amountNum: 7800,
    period: '2018-2030s',
    category: 'Orbital Infrastructure',
    description:
      'Combined estimated value of all Gateway elements including PPE ($375M, Maxar), HALO ($935M, Northrop Grumman), I-HAB (ESA ~EUR 600M), ESPRIT (ESA), Canadarm3 (CSA ~$2.2B CAD), Dragon XL logistics (SpaceX), and operations.',
  },
  {
    id: 'clps-total',
    program: 'CLPS Task Orders (Cumulative)',
    organization: 'NASA',
    type: 'government',
    amount: '$2.6B+',
    amountNum: 2600,
    period: '2019-2028 (allocated)',
    category: 'Commercial Lunar Delivery',
    description:
      'Total value of CLPS task orders awarded through early 2025. NASA has certified 14 companies as eligible CLPS vendors. Active task order recipients include Intuitive Machines, Astrobotic, Firefly Aerospace, and Draper. CLPS allows NASA to buy payload delivery as a service rather than building its own landers.',
  },
  {
    id: 'xeva-suits',
    program: 'xEVA Spacesuits (Axiom Space)',
    organization: 'NASA / Axiom Space',
    type: 'government',
    amount: '$228.5M',
    amountNum: 228,
    period: 'Awarded 2022 (task order based)',
    category: 'Crew Systems',
    description:
      'Axiom Space was awarded the contract to develop next-generation spacesuits (AxEMU - Axiom Extravehicular Mobility Unit) for Artemis III moonwalks. The suit must support 8+ hour EVAs in the south polar environment, with improved mobility, sizing range, and dust protection compared to Apollo-era suits.',
  },
  {
    id: 'ltv-contract',
    program: 'Lunar Terrain Vehicle (LTV)',
    organization: 'NASA / Intuitive Machines (Lunar Dawn)',
    type: 'government',
    amount: '$4.6B',
    amountNum: 4600,
    period: 'Max potential (task order), awarded 2024',
    category: 'Surface Mobility',
    description:
      'Maximum potential value of the LTV services contract. Intuitive Machines\' Lunar Dawn team will provide an unpressurized rover for crew transport during EVAs, with autonomous remote-driving capability between missions. The contract is structured as task orders over the Artemis campaign.',
  },
  {
    id: 'im-commercial',
    program: 'Intuitive Machines (Public)',
    organization: 'Intuitive Machines',
    type: 'commercial',
    amount: '$LUNR on NASDAQ',
    amountNum: 800,
    period: 'IPO Feb 2023; Market cap ~$800M-1.5B (varies)',
    category: 'Publicly Traded Lunar Company',
    description:
      'Intuitive Machines went public via SPAC in February 2023 (NASDAQ: LUNR). The company has NASA CLPS contracts (IM-1, IM-2, IM-3), the LTV contract (via Lunar Dawn), and a growing commercial customer base. They are developing orbital services, data transmission, and navigation capabilities alongside their lunar lander fleet.',
  },
  {
    id: 'astrobotic-funding',
    program: 'Astrobotic Technology',
    organization: 'Astrobotic',
    type: 'commercial',
    amount: '$600M+',
    amountNum: 600,
    period: 'Cumulative funding + NASA contracts',
    category: 'Commercial Lunar Services',
    description:
      'Pittsburgh-based Astrobotic has received significant NASA funding via CLPS (Peregrine, Griffin) plus the LunaGrid power service studies. Despite the Peregrine Mission One failure, the company continues development of the Griffin lander and CubeRover small rover platform. Astrobotic is a key member of Blue Origin\'s HLS National Team.',
  },
  {
    id: 'ispace-funding',
    program: 'ispace Inc.',
    organization: 'ispace (Japan)',
    type: 'commercial',
    amount: '$210M+',
    amountNum: 210,
    period: 'Cumulative through Series D+',
    category: 'Commercial Lunar Transport',
    description:
      'Japanese lunar transportation company ispace (listed on Tokyo Stock Exchange) is developing a lunar lander series and micro-rover for commercial payload delivery. Following the Mission 1 crash (Apr 2023), Mission 2 launched Dec 2024. The company has partnerships with JAXA and commercial customers, and US subsidiary ispace technologies U.S. is a CLPS-certified vendor.',
  },
  {
    id: 'esa-terrae-novae',
    program: 'ESA Terrae Novae / Exploration Envelope',
    organization: 'European Space Agency',
    type: 'international',
    amount: '~EUR 2.7B',
    amountNum: 2900,
    period: 'ESA Ministerial 2022 allocation (3 years)',
    category: 'European Exploration',
    description:
      'ESA\'s exploration program includes Gateway contributions (I-HAB, ESPRIT), Orion European Service Module production, Moonlight communications, PROSPECT lunar drill package, and participation in Artemis surface missions. ESA astronauts will fly on Artemis missions under bilateral agreements.',
  },
  {
    id: 'jaxa-lunar',
    program: 'JAXA Lunar Programs',
    organization: 'JAXA (Japan)',
    type: 'international',
    amount: '~$1.5B',
    amountNum: 1500,
    period: '2020s allocation',
    category: 'Japanese Lunar Program',
    description:
      'Japan\'s lunar efforts include SLIM (Smart Lander for Investigating Moon -- successfully landed Jan 2024, first Japanese lunar landing), Gateway I-HAB ECLSS contributions, HTV-X cargo vehicle for Gateway resupply, and the LUPEX (Lunar Polar Exploration) rover mission with ISRO. JAXA astronaut will fly on future Artemis mission.',
  },
  {
    id: 'isro-chandrayaan',
    program: 'ISRO Chandrayaan Program',
    organization: 'ISRO (India)',
    type: 'international',
    amount: '~$300M',
    amountNum: 300,
    period: 'Chandrayaan-1 through Chandrayaan-4',
    category: 'Indian Lunar Program',
    description:
      'India\'s Chandrayaan program achieved major milestones: Chandrayaan-1 discovered water ice at the poles (2008), Chandrayaan-3 achieved India\'s first successful lunar landing near the south pole (August 2023, making India the 4th country to soft-land on the Moon). Chandrayaan-4 is planned as a sample return mission. ISRO is also partnering with JAXA on the LUPEX lunar polar exploration mission and signed the Artemis Accords in 2023.',
  },
  {
    id: 'kari-lunar',
    program: 'KARI Lunar Exploration',
    organization: 'KARI (South Korea)',
    type: 'international',
    amount: '~$180M',
    amountNum: 180,
    period: '2016-2030',
    category: 'Korean Lunar Program',
    description:
      'South Korea\'s Korea Aerospace Research Institute successfully orbited the Danuri (KPLO) lunar orbiter in December 2022, making Korea the 7th country to orbit the Moon. Danuri carries a NASA ShadowCam instrument mapping permanently shadowed regions. Korea is planning a lunar lander mission for the late 2020s and signed the Artemis Accords in 2021.',
  },
];

// ────────────────────────────────────────
// Status Styles
// ────────────────────────────────────────

const ARTEMIS_STATUS_STYLES: Record<ArtemisMission['status'], { label: string; color: string; bg: string; border: string }> = {
  'completed': { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
  'in-progress': { label: 'In Progress', color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
  'upcoming': { label: 'Upcoming', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
  'planned': { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
};

const CLPS_STATUS_STYLES: Record<CLPSMission['status'], { label: string; color: string; bg: string }> = {
  'success': { label: 'Success', color: 'text-green-400', bg: 'bg-green-900/20' },
  'partial-success': { label: 'Partial Success', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  'failure': { label: 'Failed', color: 'text-red-400', bg: 'bg-red-900/20' },
  'in-transit': { label: 'In Transit', color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
  'upcoming': { label: 'Upcoming', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  'planned': { label: 'Planned', color: 'text-blue-400', bg: 'bg-blue-900/20' },
};

const ISRU_STATUS_STYLES: Record<ISRUProgram['status'], { label: string; color: string; bg: string }> = {
  'active': { label: 'Active', color: 'text-green-400', bg: 'bg-green-900/20' },
  'completed': { label: 'Completed', color: 'text-blue-400', bg: 'bg-blue-900/20' },
  'cancelled': { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-900/20' },
  'planned': { label: 'Planned', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
};

const INFRA_STATUS_STYLES: Record<InfrastructureElement['status'], { label: string; color: string; bg: string }> = {
  'operational': { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/20' },
  'under-construction': { label: 'Under Construction', color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
  'development': { label: 'In Development', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  'design': { label: 'Design Phase', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  'concept': { label: 'Concept', color: 'text-purple-400', bg: 'bg-purple-900/20' },
};

const ISRU_CATEGORY_STYLES: Record<ISRUProgram['category'], { label: string; icon: string }> = {
  'water-ice': { label: 'Water Ice', icon: '🧊' },
  'oxygen': { label: 'Oxygen Production', icon: '💨' },
  'regolith': { label: 'Regolith Processing', icon: '🪨' },
  'metals': { label: 'Metal Extraction', icon: '🔩' },
  'propellant': { label: 'Propellant Production', icon: '⛽' },
  'prospecting': { label: 'Resource Prospecting', icon: '🔍' },
};

const INFRA_CATEGORY_STYLES: Record<InfrastructureElement['category'], { label: string; icon: string }> = {
  'gateway': { label: 'Lunar Gateway', icon: '🛰️' },
  'communications': { label: 'Communications', icon: '📡' },
  'power': { label: 'Power Systems', icon: '⚡' },
  'surface': { label: 'Surface Systems', icon: '🏗️' },
  'transport': { label: 'Transportation', icon: '🚀' },
};

// ────────────────────────────────────────
// TRL Bar Component
// ────────────────────────────────────────

function TRLBar({ trl }: { trl: number }) {
  const getColor = (level: number) => {
    if (level <= 3) return 'bg-red-500';
    if (level <= 5) return 'bg-yellow-500';
    if (level <= 7) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-star-400 text-xs min-w-[52px]">TRL {trl}/9</span>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm ${i < trl ? getColor(trl) : 'bg-slate-700/50'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Hero Stats
// ────────────────────────────────────────

function HeroStats() {
  const stats = [
    { label: 'Artemis Missions', value: '6+', icon: '🚀', sub: 'Planned through 2030s' },
    { label: 'CLPS Deliveries', value: `${CLPS_MISSIONS.length}`, icon: '🌙', sub: 'Missions awarded' },
    { label: 'Cislunar Investment', value: '$93B+', icon: '💰', sub: 'NASA Artemis total' },
    { label: 'Accords Signatories', value: '43', icon: '🌐', sub: 'Nations as of 2025' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
              <div className="text-white font-bold text-xl">{stat.value}</div>
              <div className="text-star-400 text-xs">{stat.sub}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────
// Tab 1: Artemis Program
// ────────────────────────────────────────

function ArtemisTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* SLS/Orion Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🚀</span>
          SLS & Orion Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
            <h3 className="text-white font-semibold mb-2">Space Launch System (SLS)</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-star-400">Configuration:</span>
                <span className="text-star-200">Block 1 (Artemis I-III) / Block 1B (IV+)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">LEO Payload (Block 1):</span>
                <span className="text-star-200">95 metric tons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">TLI Payload (Block 1B):</span>
                <span className="text-star-200">38+ metric tons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Prime Contractor:</span>
                <span className="text-star-200">Boeing (core stage)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Engines:</span>
                <span className="text-star-200">4x RS-25 + 2x SRBs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Flights to Date:</span>
                <span className="text-green-400 font-semibold">1 (Artemis I)</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
            <h3 className="text-white font-semibold mb-2">Orion MPCV</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-star-400">Crew Capacity:</span>
                <span className="text-star-200">4 astronauts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Mission Duration:</span>
                <span className="text-star-200">Up to 21 days (free-flying)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Crew Module:</span>
                <span className="text-star-200">Lockheed Martin</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Service Module:</span>
                <span className="text-star-200">Airbus (ESA contribution)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Heat Shield:</span>
                <span className="text-star-200">AVCOAT (5,000 deg F capable)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">Status:</span>
                <span className="text-green-400 font-semibold">Flight proven</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HLS Status */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🛬</span>
          Human Landing Systems
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-900/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-400">In Development</span>
              <span className="text-white font-semibold">SpaceX Starship HLS</span>
            </div>
            <p className="text-star-300 text-sm mb-3">
              Modified Starship for Artemis III and IV. Requires orbital refueling via tanker flights. Features high-mounted crew cabin, elevator for surface access. Iterative flight test program ongoing from Starbase, Texas.
            </p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-star-400">Contract:</span>
                <span className="text-green-400">$4.04B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">First Use:</span>
                <span className="text-star-200">Artemis III (NET mid-2026)</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-900/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-900/30 text-blue-400">In Development</span>
              <span className="text-white font-semibold">Blue Origin Blue Moon Mk2</span>
            </div>
            <p className="text-star-300 text-sm mb-3">
              Single-stage lander using BE-7 LOX/LH2 engine. National Team with Lockheed Martin, Draper, Boeing, Astrobotic, Honeybee Robotics. Does not require orbital refueling.
            </p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-star-400">Contract:</span>
                <span className="text-green-400">$3.4B</span>
              </div>
              <div className="flex justify-between">
                <span className="text-star-400">First Use:</span>
                <span className="text-star-200">Artemis V (NET 2030)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Timeline */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📅</span>
          Artemis Mission Timeline
        </h2>
        <div className="relative">
          <div className="absolute left-[18px] top-6 bottom-6 w-px bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500 opacity-30" />
          <div className="space-y-6">
            {ARTEMIS_MISSIONS.map((mission) => {
              const style = ARTEMIS_STATUS_STYLES[mission.status];
              const isExpanded = expandedId === mission.id;
              return (
                <div key={mission.id} className="relative pl-12">
                  <div className={`absolute left-2.5 top-2 w-4 h-4 rounded-full border-2 ${
                    mission.status === 'completed'
                      ? 'bg-green-500 border-green-400'
                      : mission.status === 'upcoming'
                        ? 'bg-yellow-500 border-yellow-400 animate-pulse'
                        : mission.status === 'in-progress'
                          ? 'bg-cyan-500 border-cyan-400 animate-pulse'
                          : 'bg-slate-600 border-slate-500'
                  }`} />
                  <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-white font-bold text-lg">{mission.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.color} bg-slate-800/50`}>
                        {style.label}
                      </span>
                      <span className="text-star-400 text-sm font-mono">{mission.date}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm mb-3">
                      <span className="text-star-400">
                        Vehicle: <span className="text-star-200">{mission.vehicle}</span>
                      </span>
                      {mission.hls && (
                        <span className="text-star-400">
                          HLS: <span className="text-star-200">{mission.hls}</span>
                        </span>
                      )}
                      {mission.crew !== undefined && (
                        <span className="text-star-400">
                          Crew: <span className="text-star-200">{mission.crew === 0 ? 'Uncrewed' : `${mission.crew} astronauts`}</span>
                        </span>
                      )}
                    </div>
                    <div className="mb-3">
                      <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Objectives</div>
                      <ul className="space-y-1">
                        {mission.objectives.map((obj) => (
                          <li key={obj} className="text-star-300 text-sm flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-nebula-500 mt-2 flex-shrink-0" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {mission.internationalContributions && mission.internationalContributions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {mission.internationalContributions.map((contrib) => (
                          <span key={contrib} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">
                            {contrib}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                      className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {isExpanded ? 'Show less' : 'Read full details'}
                    </button>
                    {isExpanded && (
                      <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
                        {mission.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 2: Commercial Lunar
// ────────────────────────────────────────

function CommercialLunarTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const companies = Array.from(new Set(CLPS_MISSIONS.map((m) => m.company))).sort();
  const statuses = Array.from(new Set(CLPS_MISSIONS.map((m) => m.status)));

  const filtered = CLPS_MISSIONS.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (companyFilter !== 'all' && m.company !== companyFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{CLPS_STATUS_STYLES[s].label}</option>
          ))}
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-star-400 text-sm self-center ml-2">
          {filtered.length} mission{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* CLPS Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">📋</span>
          CLPS Program Overview
        </h2>
        <p className="text-star-300 text-sm leading-relaxed">
          NASA&apos;s Commercial Lunar Payload Services (CLPS) initiative allows the agency to buy lunar delivery as a commercial service
          rather than building and operating its own landers. Fourteen companies are certified as CLPS vendors, competing for task orders
          to deliver NASA instruments and technology demonstrations to the lunar surface. The program embraces a &ldquo;shoot for the Moon&rdquo;
          philosophy, accepting higher risk in exchange for faster, more affordable access to the Moon. Total CLPS funding exceeds $2.6 billion
          across all awarded task orders.
        </p>
      </div>

      {/* Mission Cards */}
      <div className="space-y-4">
        {filtered.map((mission) => {
          const style = CLPS_STATUS_STYLES[mission.status];
          const isExpanded = expandedId === mission.id;
          return (
            <div
              key={mission.id}
              className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold text-lg">{mission.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.bg} ${style.color}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-star-400">
                    <span>Company: <span className="text-star-200">{mission.company}</span></span>
                    <span>Lander: <span className="text-star-200">{mission.lander}</span></span>
                    <span>Launch: <span className="text-star-200 font-mono">{mission.launchDate}</span></span>
                  </div>
                </div>
                {mission.contractValue && (
                  <span className="text-green-400 font-semibold text-sm">{mission.contractValue}</span>
                )}
              </div>

              {mission.landingSite && (
                <div className="text-sm mb-2">
                  <span className="text-star-400">Landing Site: </span>
                  <span className="text-star-200">{mission.landingSite}</span>
                </div>
              )}

              {/* Payloads */}
              <div className="mb-3">
                <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Payloads</div>
                <div className="flex flex-wrap gap-1.5">
                  {mission.payloads.slice(0, isExpanded ? undefined : 4).map((payload) => (
                    <span
                      key={payload}
                      className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium"
                    >
                      {payload}
                    </span>
                  ))}
                  {!isExpanded && mission.payloads.length > 4 && (
                    <span className="px-2 py-0.5 bg-slate-700/50 text-star-400 rounded text-xs">
                      +{mission.payloads.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Result */}
              {mission.result && (
                <div className={`rounded-lg p-3 text-sm mb-3 ${
                  mission.status === 'failure' ? 'bg-red-900/10 border border-red-500/20' :
                  mission.status === 'partial-success' ? 'bg-yellow-900/10 border border-yellow-500/20' :
                  'bg-slate-900/40 border border-slate-700/50'
                }`}>
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1">Result</div>
                  <p className="text-star-300 text-sm leading-relaxed">{mission.result}</p>
                </div>
              )}

              <button
                onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {isExpanded ? 'Show less' : 'Show full details'}
              </button>
              {isExpanded && (
                <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
                  {mission.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 3: ISRU & Resources
// ────────────────────────────────────────

function ISRUTab() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const categories = Array.from(new Set(ISRU_PROGRAMS.map((p) => p.category)));

  const filtered = ISRU_PROGRAMS.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-nebula-500/20 flex items-center justify-center text-lg">🏭</span>
          Lunar ISRU Overview
        </h2>
        <p className="text-star-300 leading-relaxed mb-4">
          In-Situ Resource Utilization (ISRU) is the practice of harvesting, processing, and using materials found at the destination
          rather than launching everything from Earth. For the Moon, ISRU focuses on extracting water ice from permanently shadowed
          craters, producing oxygen from regolith, and eventually manufacturing propellant, construction materials, and metals. Successful
          ISRU would transform the economics of lunar exploration by reducing the mass that must be launched from Earth -- water alone
          could provide drinking water, breathable oxygen, and hydrogen/oxygen rocket propellant.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-center">
            <div className="text-2xl mb-1">🧊</div>
            <div className="text-white font-semibold text-sm">Water Ice</div>
            <div className="text-star-400 text-xs">600M+ metric tons (est.)</div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-center">
            <div className="text-2xl mb-1">💨</div>
            <div className="text-white font-semibold text-sm">Oxygen</div>
            <div className="text-star-400 text-xs">43% of regolith by weight</div>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 text-center">
            <div className="text-2xl mb-1">🔩</div>
            <div className="text-white font-semibold text-sm">Metals</div>
            <div className="text-star-400 text-xs">Iron, titanium, aluminum</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{ISRU_CATEGORY_STYLES[c].icon} {ISRU_CATEGORY_STYLES[c].label}</option>
          ))}
        </select>
        <span className="text-star-400 text-sm self-center ml-2">
          {filtered.length} program{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ISRU Program Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((program) => {
          const catStyle = ISRU_CATEGORY_STYLES[program.category];
          const statusStyle = ISRU_STATUS_STYLES[program.status];
          return (
            <div
              key={program.id}
              className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catStyle.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold">{program.name}</h3>
                    <span className="text-star-400 text-xs">{program.organization}</span>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>

              <p className="text-star-300 text-sm leading-relaxed mb-3">{program.description}</p>

              {/* TRL */}
              <div className="mb-3">
                <TRLBar trl={program.trl} />
              </div>

              {/* Milestones */}
              {program.keyMilestones && program.keyMilestones.length > 0 && (
                <div className="mb-2">
                  <div className="text-star-400 text-xs uppercase tracking-widest mb-1.5">Key Milestones</div>
                  <ul className="space-y-1">
                    {program.keyMilestones.map((milestone) => (
                      <li key={milestone} className="text-star-300 text-xs flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-nebula-500 mt-1.5 flex-shrink-0" />
                        {milestone}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {program.targetDate && (
                <div className="text-sm mt-2 pt-2 border-t border-slate-700/50">
                  <span className="text-star-400">Target: </span>
                  <span className="text-star-200 font-mono">{program.targetDate}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 4: Infrastructure
// ────────────────────────────────────────

function InfrastructureTab() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const categories = Array.from(new Set(INFRASTRUCTURE.map((i) => i.category)));

  const filtered = INFRASTRUCTURE.filter((i) => {
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{INFRA_CATEGORY_STYLES[c].icon} {INFRA_CATEGORY_STYLES[c].label}</option>
          ))}
        </select>
        <span className="text-star-400 text-sm self-center ml-2">
          {filtered.length} element{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Infrastructure Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const catStyle = INFRA_CATEGORY_STYLES[item.category];
          const statusStyle = INFRA_STATUS_STYLES[item.status];
          return (
            <div
              key={item.id}
              className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catStyle.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold">{item.name}</h3>
                    <span className="text-star-400 text-xs">{item.developer}</span>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
                  {statusStyle.label}
                </span>
              </div>

              <p className="text-star-300 text-sm leading-relaxed mb-3">{item.description}</p>

              <div className="space-y-2 text-sm">
                {item.timeline && (
                  <div className="flex items-start gap-2">
                    <span className="text-star-400 min-w-[70px]">Timeline:</span>
                    <span className="text-star-200">{item.timeline}</span>
                  </div>
                )}
                {item.cost && (
                  <div className="flex items-start gap-2">
                    <span className="text-star-400 min-w-[70px]">Cost:</span>
                    <span className="text-green-400">{item.cost}</span>
                  </div>
                )}
              </div>

              {item.partners && item.partners.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-700/50">
                  {item.partners.map((partner) => (
                    <span key={partner} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">
                      {partner}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 5: Investment
// ────────────────────────────────────────

function InvestmentTab() {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const types = Array.from(new Set(INVESTMENTS.map((i) => i.type)));

  const filtered = INVESTMENTS.filter((i) => {
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    return true;
  });

  const typeLabels: Record<string, string> = {
    government: 'Government (NASA)',
    commercial: 'Commercial',
    international: 'International',
  };

  // Summary stats
  const govTotal = INVESTMENTS.filter((i) => i.type === 'government').reduce((sum, i) => sum + i.amountNum, 0);
  const intlTotal = INVESTMENTS.filter((i) => i.type === 'international').reduce((sum, i) => sum + i.amountNum, 0);
  const commercialCount = INVESTMENTS.filter((i) => i.type === 'commercial').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇺🇸</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">NASA / US Government</div>
              <div className="text-white font-bold text-xl">${(govTotal / 1000).toFixed(0)}B+</div>
              <div className="text-star-400 text-xs">Artemis program total</div>
            </div>
          </div>
        </div>
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">International Partners</div>
              <div className="text-white font-bold text-xl">${(intlTotal / 1000).toFixed(1)}B+</div>
              <div className="text-star-400 text-xs">ESA, JAXA, ISRO, KARI combined</div>
            </div>
          </div>
        </div>
        <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">Commercial Players</div>
              <div className="text-white font-bold text-xl">{commercialCount}+ Companies</div>
              <div className="text-star-400 text-xs">Public & private lunar ventures</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 text-star-200 text-sm rounded-lg px-3 py-2 focus:border-nebula-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{typeLabels[t] || t}</option>
          ))}
        </select>
        <span className="text-star-400 text-sm self-center ml-2">
          {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Investment Cards */}
      <div className="space-y-4">
        {filtered.map((investment) => {
          const typeBg =
            investment.type === 'government'
              ? 'border-l-blue-500'
              : investment.type === 'commercial'
                ? 'border-l-green-500'
                : 'border-l-purple-500';

          return (
            <div
              key={investment.id}
              className={`card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur border-l-4 ${typeBg} hover:border-nebula-500/40 transition-all`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-white font-semibold text-lg">{investment.program}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-star-400">
                    <span>{investment.organization}</span>
                    <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs">{investment.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold text-lg">{investment.amount}</div>
                  <div className="text-star-400 text-xs">{investment.period}</div>
                </div>
              </div>
              <p className="text-star-300 text-sm leading-relaxed">{investment.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tabs Configuration
// ────────────────────────────────────────

type TabId = 'artemis' | 'commercial' | 'isru' | 'infrastructure' | 'investment';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'artemis', label: 'Artemis Program', icon: '🚀' },
  { id: 'commercial', label: 'Commercial Lunar', icon: '🌙' },
  { id: 'isru', label: 'ISRU & Resources', icon: '🏭' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🛰️' },
  { id: 'investment', label: 'Investment', icon: '💰' },
];

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function CislunarEconomyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('artemis');

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Cislunar Economy Tracker"
          subtitle="Comprehensive intelligence on the Artemis program, commercial lunar services, in-situ resource utilization, cislunar infrastructure, and investment across the Earth-Moon economic zone"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Cislunar Economy' },
          ]}
        />

        {/* Hero Stats */}
        <HeroStats />

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-nebula-500 text-nebula-300'
                    : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'artemis' && <ArtemisTab />}
        {activeTab === 'commercial' && <CommercialLunarTab />}
        {activeTab === 'isru' && <ISRUTab />}
        {activeTab === 'infrastructure' && <InfrastructureTab />}
        {activeTab === 'investment' && <InvestmentTab />}

        {/* Related Modules */}
        <div className="card p-4 border border-slate-700/50 bg-slate-800/50 backdrop-blur mt-8">
          <h3 className="text-sm font-semibold text-white mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/lunar-gateway" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Lunar Gateway
            </Link>
            <Link href="/solar-exploration" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Solar Exploration
            </Link>
            <Link href="/space-mining" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Space Mining
            </Link>
            <Link href="/launch-windows" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Launch Windows
            </Link>
            <Link href="/mars-planner" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Mars Planner
            </Link>
            <Link href="/market-intel" className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-star-300 hover:text-white hover:bg-slate-600/50 text-sm transition-colors">
              Market Intel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
