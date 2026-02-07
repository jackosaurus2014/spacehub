'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'forces' | 'programs' | 'procurement' | 'threats' | 'alliances';

interface SpaceForce {
  id: string;
  name: string;
  country: string;
  flag: string;
  established: string;
  personnel: string;
  budget: string;
  budgetYear: string;
  parentService: string;
  commander: string;
  headquarters: string;
  keyPrograms: string[];
  description: string;
  fieldCommands?: string[];
}

interface DefenseProgram {
  id: string;
  name: string;
  abbreviation: string;
  agency: string;
  contractor: string;
  status: 'operational' | 'development' | 'production' | 'planned' | 'concept';
  category: 'communications' | 'missile_warning' | 'navigation' | 'launch' | 'surveillance' | 'sda' | 'ground' | 'classified';
  budget?: string;
  description: string;
  nextMilestone?: string;
  constellation?: string;
}

interface ContractAward {
  id: string;
  title: string;
  contractor: string;
  value: string;
  awardDate: string;
  agency: string;
  category: string;
  description: string;
  period?: string;
}

interface CounterspaceEvent {
  id: string;
  date: string;
  nation: string;
  flag: string;
  type: 'kinetic_asat' | 'rpo' | 'electronic_warfare' | 'cyber' | 'directed_energy' | 'co_orbital';
  name: string;
  description: string;
  debrisGenerated?: string;
  altitude?: string;
  target?: string;
}

interface Alliance {
  id: string;
  name: string;
  abbreviation?: string;
  established: string;
  members: string[];
  description: string;
  keyActivities: string[];
  headquarters?: string;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const SPACE_FORCES: SpaceForce[] = [
  {
    id: 'ussf',
    name: 'United States Space Force',
    country: 'United States',
    flag: 'US',
    established: 'December 20, 2019',
    personnel: '~16,000 Guardians + ~11,000 civilians',
    budget: '$33.3B (FY2025 request)',
    budgetYear: 'FY2025',
    parentService: 'Department of the Air Force',
    commander: 'Gen. B. Chance Saltzman, Chief of Space Operations',
    headquarters: 'The Pentagon, Arlington, VA',
    keyPrograms: [
      'National Security Space Launch (NSSL)',
      'GPS III / IIIF',
      'Next-Generation Overhead Persistent Infrared (Next-Gen OPIR)',
      'Evolved Strategic SATCOM (ESS)',
      'Space Development Agency (SDA) Proliferated Warfighter Space Architecture',
      'Space Fence (Kwajalein)',
      'Space Domain Awareness',
    ],
    description: 'The United States Space Force (USSF) is the space service branch of the U.S. Armed Forces, one of the eight uniformed services, and the world\'s first and currently only independent space force. It was established on December 20, 2019, with the signing of the National Defense Authorization Act for Fiscal Year 2020. The USSF organizes, trains, and equips space forces to protect U.S. and allied interests in space and to provide space capabilities to the joint force. The FY2025 budget request of $33.3 billion represents a significant increase, reflecting growing emphasis on space as a warfighting domain.',
    fieldCommands: [
      'Space Operations Command (SpOC) -- Peterson SFB, CO',
      'Space Systems Command (SSC) -- Los Angeles AFB, CA',
      'Space Training and Readiness Command (STARCOM) -- Peterson SFB, CO',
    ],
  },
  {
    id: 'uksc',
    name: 'UK Space Command',
    country: 'United Kingdom',
    flag: 'GB',
    established: 'April 1, 2021',
    personnel: '~1,500 (projected growth)',
    budget: 'Part of ~GBP 6.6B defence space allocation (2024-2034)',
    budgetYear: 'Multi-year',
    parentService: 'Ministry of Defence',
    commander: 'Air Vice-Marshal Paul Mayall (initial); rotating command',
    headquarters: 'RAF High Wycombe, Buckinghamshire',
    keyPrograms: [
      'SKYNET 6 military satellite communications',
      'Istari space domain awareness program',
      'MINERVA small satellite demonstration',
      'Operation Olympic Defender (with USSF)',
    ],
    description: 'UK Space Command is a joint command of the British Armed Forces responsible for all UK military space operations. Established in April 2021, it brings together existing space capabilities from across the Royal Air Force, Royal Navy, and British Army under a single operational command. The command is a key component of the UK\'s Defence Space Strategy, which recognizes space as an operational domain. The UK has committed approximately GBP 6.6 billion over ten years to defence space capabilities, including the next-generation SKYNET 6 satellite communications program.',
  },
  {
    id: 'cde',
    name: 'French Space Command (Commandement de l\'Espace)',
    country: 'France',
    flag: 'FR',
    established: 'September 3, 2019',
    personnel: '~500 (growing)',
    budget: 'EUR 6.5B allocated for military space (2024-2030)',
    budgetYear: 'Multi-year',
    parentService: 'French Air and Space Force (Armee de l\'Air et de l\'Espace)',
    commander: 'General Philippe Adam (initial); rotating command',
    headquarters: 'Toulouse, France',
    keyPrograms: [
      'Syracuse IV military SATCOM',
      'CSO (Composante Spatiale Optique) reconnaissance',
      'CERES SIGINT satellite constellation',
      'YODA active defense demonstrator',
      'SPIRALE / ARES missile warning',
    ],
    description: 'France became the first European nation to establish a dedicated military space command in September 2019, reflecting French strategic doctrine that space is a domain of confrontation. The Commandement de l\'Espace (CDE) operates under the French Air and Space Force, renamed in 2020 to reflect its expanded space mission. France\'s 2024-2030 Military Programming Law allocates EUR 6.5 billion for military space, a significant increase from previous cycles. France has been a pioneer in recognizing counterspace threats, with the YODA program exploring active defense capabilities for satellites.',
  },
  {
    id: 'dsc',
    name: 'German Space Command (Weltraumkommando)',
    country: 'Germany',
    flag: 'DE',
    established: 'July 13, 2021',
    personnel: '~80 (initial cadre, growing)',
    budget: 'Part of Bundeswehr modernization budget',
    budgetYear: 'Ongoing',
    parentService: 'Bundeswehr (German Armed Forces)',
    commander: 'Brigadier General Michael Traut (initial)',
    headquarters: 'Uedem, North Rhine-Westphalia',
    keyPrograms: [
      'SATCOMBw satellite communications',
      'SAR-Lupe / SARah radar reconnaissance',
      'Space Situational Awareness Center (GSSAC)',
      'NATO Space Centre contribution',
    ],
    description: 'Germany established its Space Command (Weltraumkommando der Bundeswehr) in July 2021 at Uedem Air Base, recognizing space as an increasingly contested operational domain. The command operates alongside the existing German Space Situational Awareness Centre (GSSAC) and coordinates Germany\'s military space activities across intelligence, communications, and domain awareness. Germany operates the SARah radar reconnaissance constellation and contributes significantly to NATO space initiatives.',
  },
  {
    id: 'isro_def',
    name: 'Defence Space Agency (DSA)',
    country: 'India',
    flag: 'IN',
    established: 'April 2019',
    personnel: '~200 (initial)',
    budget: 'Part of Indian defence budget (est. ~$1.5B space allocation)',
    budgetYear: 'Estimated',
    parentService: 'Indian Armed Forces',
    commander: 'Under Chief of Defence Staff',
    headquarters: 'Bengaluru, India',
    keyPrograms: [
      'GSAT-7 / GSAT-7A military SATCOM',
      'EMISAT SIGINT satellite',
      'RISAT radar imaging constellation',
      'Mission Shakti ASAT capability (tested 2019)',
      'Navigation with Indian Constellation (NavIC)',
    ],
    description: 'India\'s Defence Space Agency was established in April 2019 as a tri-service agency to coordinate the country\'s military space efforts. India demonstrated its counterspace capability with Mission Shakti in March 2019, a direct-ascent ASAT test that destroyed a target satellite at ~300 km altitude. The DSA works closely with ISRO and the Defence Research and Development Organisation (DRDO) to develop indigenous military space capabilities.',
  },
  {
    id: 'pla_ssf',
    name: 'PLA Strategic Support Force (Space Systems Department)',
    country: 'China',
    flag: 'CN',
    established: 'December 31, 2015 (SSF); Restructured April 2024',
    personnel: 'Estimated ~100,000+ (full SSF, including cyber and EW)',
    budget: 'Not publicly disclosed (est. ~$15B+ for military space)',
    budgetYear: 'Estimated',
    parentService: 'People\'s Liberation Army',
    commander: 'Classified (SSF Commander)',
    headquarters: 'Beijing',
    keyPrograms: [
      'BeiDou-3 navigation constellation',
      'Yaogan reconnaissance satellite series',
      'Shijian technology demonstrator series',
      'Tiangong space station (dual-use)',
      'SJ-21 / debris cleanup / RPO capable spacecraft',
      'SC-19 / DN-series ASAT missiles',
    ],
    description: 'China reorganized its PLA Strategic Support Force in April 2024, reportedly splitting it into separate organizations for space, cyber, and electronic warfare. China\'s military space capabilities have expanded rapidly, with an extensive constellation of reconnaissance, navigation, communications, and SIGINT satellites. The Yaogan reconnaissance series alone comprises dozens of satellites in various orbits. China conducted a destructive kinetic ASAT test in 2007 and has since demonstrated advanced co-orbital and rendezvous-proximity operations. The country\'s military space budget is not publicly disclosed but is estimated at well over $15 billion annually.',
  },
  {
    id: 'russia_vks',
    name: 'Russian Space Forces (VKS Space Troops)',
    country: 'Russia',
    flag: 'RU',
    established: '1992 (various forms); Current structure 2015',
    personnel: 'Estimated ~10,000-15,000',
    budget: 'Not fully disclosed (est. ~$3-5B for military space)',
    budgetYear: 'Estimated',
    parentService: 'Russian Aerospace Forces (VKS)',
    commander: 'Under VKS Commander-in-Chief',
    headquarters: 'Moscow',
    keyPrograms: [
      'GLONASS navigation constellation',
      'Tundra missile early warning satellites (EKS)',
      'Persona / Razdan optical reconnaissance',
      'Liana SIGINT constellation (Lotos-S / Pion-NKS)',
      'Nudol / PL-19 direct-ascent ASAT system',
      'Burevestnik co-orbital inspector satellites (Cosmos series)',
    ],
    description: 'Russia\'s military space forces operate within the Russian Aerospace Forces (VKS). Despite budget constraints, Russia maintains significant space capabilities including the GLONASS navigation system, the EKS missile early warning constellation, and an active counterspace research program. In November 2021, Russia conducted a destructive ASAT test against its own defunct Cosmos 1408 satellite, generating over 1,500 pieces of trackable debris and drawing widespread international condemnation. Russia has also demonstrated advanced co-orbital proximity operations with satellites such as Cosmos 2542/2543.',
  },
  {
    id: 'japan_sod',
    name: 'Japan Space Operations Squadron',
    country: 'Japan',
    flag: 'JP',
    established: 'May 18, 2020',
    personnel: '~70 (initial cadre, expanding)',
    budget: 'Part of JSDF increased defence budget (~$2B+ space over 5 years)',
    budgetYear: 'Multi-year',
    parentService: 'Japan Air Self-Defense Force',
    commander: 'Under JASDF',
    headquarters: 'Fuchu Air Base, Tokyo',
    keyPrograms: [
      'Quasi-Zenith Satellite System (QZSS) augmentation',
      'Space Situational Awareness (SSA) system',
      'IGS reconnaissance satellite series',
      'X-band defense communications satellite',
    ],
    description: 'Japan established its Space Operations Squadron in May 2020, reflecting growing concerns about space domain threats in the Indo-Pacific region. The unit is tasked primarily with space domain awareness, monitoring debris and potential counterspace activities. Japan has significantly increased its defense budget including space capabilities, and cooperates closely with the United States and Australia on space domain awareness sharing. The unit is planned to expand into a Space Operations Group.',
  },
  {
    id: 'aus_dsg',
    name: 'Defence Space Command',
    country: 'Australia',
    flag: 'AU',
    established: 'January 2022',
    personnel: '~100+ (growing)',
    budget: 'Part of AUD 100B+ AUKUS/defence investment (space component est. ~AUD 2-3B)',
    budgetYear: 'Multi-year',
    parentService: 'Australian Defence Force',
    commander: 'Air Vice-Marshal Catherine Roberts (initial head)',
    headquarters: 'Canberra, ACT',
    keyPrograms: [
      'JP 9360 Resilient Multi-Mission Space (RMMS)',
      'C-band space surveillance radar',
      'AUKUS space cooperation',
      'Buccaneer risk-mitigation satellite',
      'Ground-based SSA sensors',
    ],
    description: 'Australia established Defence Space Command in January 2022, consolidating various military space activities under a single joint command. Australia plays a critical role in the Five Eyes and Combined Space Operations (CSpO) partnerships, hosting key ground infrastructure including C-band space surveillance radar systems and satellite ground stations. The AUKUS partnership has expanded into space domain cooperation between Australia, the UK, and the US.',
  },
];

const DEFENSE_PROGRAMS: DefenseProgram[] = [
  {
    id: 'sda-tl',
    name: 'SDA Transport Layer (Tranche 0/1/2)',
    abbreviation: 'TL',
    agency: 'Space Development Agency (SDA)',
    contractor: 'York Space Systems (Tranche 0); Lockheed Martin, Northrop Grumman (Tranche 1); L3Harris, Northrop Grumman (Tranche 2)',
    status: 'production',
    category: 'sda',
    budget: '~$3.6B+ (across tranches)',
    description: 'The Transport Layer is the backbone of SDA\'s Proliferated Warfighter Space Architecture (PWSA), providing a mesh network of satellites in low Earth orbit for resilient military data transport and beyond-line-of-sight targeting. Tranche 0 (28 satellites) launched in 2023-2024 for demonstration. Tranche 1 targets ~126 satellites with optical inter-satellite links (OISL). Tranche 2 will expand to ~216 satellites with enhanced capabilities.',
    nextMilestone: 'Tranche 2 deliveries beginning 2026',
    constellation: '~300+ satellites at full PWSA',
  },
  {
    id: 'sda-track',
    name: 'SDA Tracking Layer',
    abbreviation: 'TrL',
    agency: 'Space Development Agency (SDA)',
    contractor: 'L3Harris, SpaceX (Tranche 0); Northrop Grumman, L3Harris (Tranche 1/2)',
    status: 'production',
    category: 'sda',
    budget: '~$2.4B+ (across tranches)',
    description: 'The Tracking Layer provides global, persistent missile warning and missile tracking from LEO using wide-field-of-view and medium-field-of-view infrared sensors. Designed to detect and track advanced threats including hypersonic glide vehicles that challenge traditional GEO-based missile warning systems. Tranche 0 included 8 prototype tracking satellites; Tranche 1/2 will scale up to full operational capability.',
    nextMilestone: 'Tranche 1 launches throughout 2025-2026',
    constellation: '~100+ tracking satellites at full capability',
  },
  {
    id: 'gps-iii',
    name: 'GPS III / GPS IIIF',
    abbreviation: 'GPS III',
    agency: 'Space Systems Command (SSC)',
    contractor: 'Lockheed Martin',
    status: 'production',
    category: 'navigation',
    budget: '~$1.7B (GPS IIIF block buy of 22 satellites)',
    description: 'GPS III modernizes the Global Positioning System with more powerful signals (3x more power for military M-code), improved anti-jamming capabilities, and a new civil signal (L1C) interoperable with Galileo and other GNSS systems. GPS IIIF (Follow On) adds a regional military protection capability, a fully digital navigation payload, and a search and rescue payload. 6 GPS III satellites launched 2018-2023; GPS IIIF satellites begin launching mid-2020s.',
    nextMilestone: 'GPS IIIF SV01 launch expected 2026-2027',
    constellation: '31+ operational GPS satellites (24 baseline)',
  },
  {
    id: 'ngopir',
    name: 'Next-Generation Overhead Persistent Infrared',
    abbreviation: 'Next-Gen OPIR',
    agency: 'Space Systems Command (SSC)',
    contractor: 'Lockheed Martin (GEO); Northrop Grumman (Polar)',
    status: 'development',
    category: 'missile_warning',
    budget: '~$14.4B (total program estimate)',
    description: 'Next-Gen OPIR is the follow-on to the Space-Based Infrared System (SBIRS) for missile warning and missile defense. The program includes GEO satellites built by Lockheed Martin and polar-orbiting satellites built by Northrop Grumman, providing significantly enhanced capability to detect advanced missile threats including hypersonic weapons. The system features improved sensor technology and resilient architecture.',
    nextMilestone: 'First GEO satellite launch NET 2028',
    constellation: '3 GEO + 2 Polar (minimum)',
  },
  {
    id: 'sbirs',
    name: 'Space-Based Infrared System',
    abbreviation: 'SBIRS',
    agency: 'Space Systems Command (SSC)',
    contractor: 'Lockheed Martin',
    status: 'operational',
    category: 'missile_warning',
    description: 'SBIRS provides global missile warning, missile defense, battlespace awareness, and technical intelligence. The constellation includes satellites in GEO and sensors hosted on satellites in highly elliptical orbits (HEO). SBIRS is being replaced by Next-Gen OPIR but remains the primary operational missile warning system. The system detects missile launches worldwide within seconds of ignition.',
    constellation: '6 GEO + 4 HEO payloads',
  },
  {
    id: 'wgs',
    name: 'Wideband Global SATCOM',
    abbreviation: 'WGS',
    agency: 'Space Systems Command (SSC)',
    contractor: 'Boeing',
    status: 'operational',
    category: 'communications',
    description: 'WGS is the DoD\'s highest-capacity military communications satellite system, providing flexible, high-capacity communications to military forces worldwide. Each WGS satellite provides more capacity than the entire legacy DSCS constellation it replaced. WGS satellites use Ka-band and X-band frequencies and support both tactical and strategic users. International partners Australia, Canada, Denmark, Luxembourg, Netherlands, and New Zealand have contributed to the program.',
    constellation: '12 operational satellites (WGS-1 through WGS-12)',
  },
  {
    id: 'aehf-eps',
    name: 'Advanced Extremely High Frequency / Evolved Strategic SATCOM',
    abbreviation: 'AEHF / ESS',
    agency: 'Space Systems Command (SSC)',
    contractor: 'Lockheed Martin (AEHF); Northrop Grumman (ESS)',
    status: 'development',
    category: 'communications',
    budget: '~$10B+ (ESS total estimate)',
    description: 'AEHF provides survivable, protected, global communications for strategic command and control, supporting the nuclear command, control, and communications (NC3) mission. The system is hardened against jamming, nuclear effects, and cyber threats. AEHF is being succeeded by the Evolved Strategic SATCOM (ESS) program, which will deliver next-generation protected communications with enhanced resilience and capacity. ESS represents one of the most expensive USSF acquisition programs.',
    constellation: '6 AEHF operational; ESS replacing from late 2020s',
    nextMilestone: 'ESS first satellite launch NET 2029',
  },
  {
    id: 'nssl',
    name: 'National Security Space Launch (NSSL Phase 2/3)',
    abbreviation: 'NSSL',
    agency: 'Space Systems Command (SSC)',
    contractor: 'ULA (Vulcan Centaur), SpaceX (Falcon 9/Heavy) - Phase 2; Phase 3: SpaceX, ULA, Blue Origin (New Glenn)',
    status: 'operational',
    category: 'launch',
    budget: '~$5.6B Phase 2 ceiling; Phase 3 TBD',
    description: 'NSSL ensures assured access to space for the most critical national security payloads. Phase 2 split ~60/40 between ULA and SpaceX for 2022-2027 launches. Phase 3 expands competition, with contracts awarded to SpaceX, ULA, and Blue Origin. Phase 3 Lane 1 covers ~30 less-demanding missions; Lane 2 covers the most stressing reference orbits. SpaceX and ULA won Lane 2 contracts; Blue Origin won a Lane 1 contract.',
    nextMilestone: 'Phase 3 Lane 1/Lane 2 missions beginning FY2025-2029',
  },
  {
    id: 'space-fence',
    name: 'Space Fence',
    abbreviation: 'S-fence',
    agency: 'Space Operations Command (SpOC)',
    contractor: 'Lockheed Martin',
    status: 'operational',
    category: 'surveillance',
    budget: '~$1.5B (development + initial operations)',
    description: 'Space Fence is an S-band ground-based radar system on Kwajalein Atoll in the Marshall Islands that provides space surveillance and tracking. It can detect objects as small as 10 cm in LEO, dramatically increasing the space object catalog. Space Fence processes ~1.5 million observations per day and has significantly improved the ability to detect and track small debris and maneuvering objects in LEO. A second site has been discussed but not yet funded.',
  },
  {
    id: 'nro-ops',
    name: 'NRO Satellite Programs (unclassified details)',
    abbreviation: 'NRO',
    agency: 'National Reconnaissance Office',
    contractor: 'Various (classified)',
    status: 'operational',
    category: 'classified',
    budget: '~$18.9B NRO total budget (FY2025 request, publicly disclosed top line)',
    description: 'The National Reconnaissance Office (NRO) designs, builds, launches, and operates the nation\'s signals intelligence, imagery intelligence, and measurement and signature intelligence satellites. The NRO\'s budget was publicly disclosed for the first time in 2024 at approximately $18.9 billion, making it one of the largest intelligence community agencies by budget. In 2024, the NRO announced plans for a dramatically expanded architecture, potentially comprising hundreds of satellites in multiple orbit regimes, representing a significant shift from its traditional small number of large, exquisite satellites.',
    nextMilestone: 'Expanded proliferated architecture deliveries 2025-2030',
  },
  {
    id: 'gssap',
    name: 'Geosynchronous Space Situational Awareness Program',
    abbreviation: 'GSSAP',
    agency: 'Space Operations Command (SpOC)',
    contractor: 'Orbital ATK (now Northrop Grumman)',
    status: 'operational',
    category: 'surveillance',
    description: 'GSSAP satellites operate in near-geosynchronous orbit to provide space domain awareness of the GEO belt. These spacecraft can maneuver to characterize objects and activities in the GEO regime, supporting the detection and tracking of threats to critical U.S. and allied space assets. GSSAP satellites have conducted numerous rendezvous-proximity operations (RPO) to inspect objects in GEO. The existence and mission of these satellites are unclassified, though specific activities and capabilities are classified.',
    constellation: '6+ satellites (publicly acknowledged)',
  },
];

const RECENT_CONTRACTS: ContractAward[] = [
  {
    id: 'c1',
    title: 'SDA Tranche 2 Transport Layer',
    contractor: 'L3Harris Technologies / Northrop Grumman',
    value: '$1.5B / $900M respectively',
    awardDate: 'FY2024',
    agency: 'Space Development Agency',
    category: 'Satellite Systems',
    description: 'Awards for the Tranche 2 Transport Layer of the Proliferated Warfighter Space Architecture. L3Harris to build 36 satellites; Northrop Grumman to build 36 satellites. Satellites will feature enhanced optical inter-satellite links and increased data throughput.',
    period: '2024-2028',
  },
  {
    id: 'c2',
    title: 'NSSL Phase 3 Lane 2 Launch Services',
    contractor: 'SpaceX, ULA',
    value: '~$5.6B ceiling (combined Phase 3)',
    awardDate: 'June 2024',
    agency: 'Space Systems Command',
    category: 'Launch Services',
    description: 'Lane 2 contracts for the most stressing national security launch missions requiring the highest performance vehicles. SpaceX (Falcon Heavy / Starship) and ULA (Vulcan Centaur) selected for the most demanding reference orbits. Covers missions from FY2025 through FY2029.',
    period: 'FY2025-FY2029',
  },
  {
    id: 'c3',
    title: 'NSSL Phase 3 Lane 1 Launch Services',
    contractor: 'Blue Origin (New Glenn), SpaceX, ULA',
    value: 'Task-order based',
    awardDate: 'June 2024',
    agency: 'Space Systems Command',
    category: 'Launch Services',
    description: 'Lane 1 contracts for less-demanding launch missions. Blue Origin\'s New Glenn certified as a third NSSL provider, marking its entry into the national security launch market alongside SpaceX and ULA. Approximately 30 missions over 5 years.',
    period: 'FY2025-FY2029',
  },
  {
    id: 'c4',
    title: 'Evolved Strategic SATCOM (ESS)',
    contractor: 'Northrop Grumman',
    value: '~$6.2B (initial production)',
    awardDate: 'FY2023-2024',
    agency: 'Space Systems Command',
    category: 'Protected Communications',
    description: 'Development and production of the Evolved Strategic SATCOM system to replace AEHF for nuclear command, control, and communications (NC3). ESS will provide survivable, protected, and endurable communications for the nation\'s highest-priority missions.',
    period: '2023-2032',
  },
  {
    id: 'c5',
    title: 'Next-Gen OPIR GEO Satellites',
    contractor: 'Lockheed Martin',
    value: '~$4.9B (3 GEO satellites)',
    awardDate: 'FY2018 (ongoing)',
    agency: 'Space Systems Command',
    category: 'Missile Warning',
    description: 'Three geostationary missile warning satellites with next-generation infrared sensors. The program has experienced cost growth and schedule delays, with the first launch now expected no earlier than 2028. Intended to provide significantly improved missile warning capabilities over legacy SBIRS.',
    period: '2018-2030',
  },
  {
    id: 'c6',
    title: 'GPS IIIF Follow-On Satellites',
    contractor: 'Lockheed Martin',
    value: '~$7.2B (22 satellites)',
    awardDate: 'FY2018 (ongoing)',
    agency: 'Space Systems Command',
    category: 'Navigation',
    description: 'Production of 22 GPS IIIF satellites featuring the new Regional Military Protection (RMP) capability and fully digital navigation payload. These satellites will provide significantly improved anti-jamming capability compared to earlier GPS III satellites.',
    period: '2018-2030s',
  },
  {
    id: 'c7',
    title: 'NRO Proliferated Architecture',
    contractor: 'Multiple (including SpaceX, BlackSky, others)',
    value: 'Multiple billions (classified details)',
    awardDate: 'FY2024-2025',
    agency: 'National Reconnaissance Office',
    category: 'Intelligence Satellites',
    description: 'The NRO\'s shift toward a proliferated, diversified architecture leveraging commercial providers for part of its constellation. Includes contracts with commercial imaging companies and dedicated satellite bus providers. This represents a fundamental shift in NRO acquisition strategy.',
    period: '2024-2030',
  },
  {
    id: 'c8',
    title: 'SKYNET 6A Satellite Communications',
    contractor: 'Airbus Defence and Space',
    value: '~GBP 5B (full SKYNET 6 program)',
    awardDate: '2022 (multi-year)',
    agency: 'UK Ministry of Defence',
    category: 'Allied Communications',
    description: 'SKYNET 6A provides next-generation protected military satellite communications for the UK and allied forces. The program represents the UK\'s largest single defence space procurement and will replace the aging SKYNET 5 constellation.',
    period: '2022-2035',
  },
  {
    id: 'c9',
    title: 'Commercial Space Domain Awareness (SDA) Services',
    contractor: 'LeoLabs, ExoAnalytic Solutions, Slingshot Aerospace',
    value: '~$150M+ (various contracts)',
    awardDate: 'FY2023-2025',
    agency: 'Space Operations Command / SPACECOM',
    category: 'Space Domain Awareness',
    description: 'Multiple commercial space domain awareness service contracts to supplement government sensor networks. LeoLabs provides LEO tracking data, ExoAnalytic provides GEO tracking, and Slingshot provides data fusion and analytics. These contracts reflect growing reliance on commercial providers for SDA.',
    period: '2023-2027',
  },
  {
    id: 'c10',
    title: 'SDA Tranche 2 Tracking Layer',
    contractor: 'Northrop Grumman, L3Harris',
    value: '~$2.4B (combined)',
    awardDate: 'FY2024',
    agency: 'Space Development Agency',
    category: 'Missile Tracking',
    description: 'Tranche 2 Tracking Layer satellites for persistent global missile warning and tracking from LEO, with improved sensors for hypersonic missile detection. Part of the Proliferated Warfighter Space Architecture.',
    period: '2024-2028',
  },
];

const COUNTERSPACE_EVENTS: CounterspaceEvent[] = [
  {
    id: 'e1',
    date: 'January 11, 2007',
    nation: 'China',
    flag: 'CN',
    type: 'kinetic_asat',
    name: 'SC-19 ASAT Test',
    description: 'China destroyed its defunct Fengyun-1C (FY-1C) weather satellite at an altitude of approximately 865 km using a direct-ascent kinetic kill vehicle. The test generated over 3,500 pieces of trackable debris (>10 cm) and an estimated 150,000+ pieces of debris >1 cm. It remains the single largest debris-generating event in the history of spaceflight. Debris from this event will remain in orbit for decades to centuries, posing ongoing collision risks to operational satellites.',
    debrisGenerated: '3,500+ trackable (>10 cm); ~150,000+ total (>1 cm)',
    altitude: '~865 km',
    target: 'Fengyun-1C weather satellite',
  },
  {
    id: 'e2',
    date: 'February 21, 2008',
    nation: 'United States',
    flag: 'US',
    type: 'kinetic_asat',
    name: 'Operation Burnt Frost',
    description: 'The United States intercepted its malfunctioning USA-193 (NROL-21) reconnaissance satellite at ~247 km altitude using a modified SM-3 missile launched from the USS Lake Erie. The operation was publicly stated to be necessary due to the risk of the satellite\'s hydrazine fuel tank surviving reentry. Due to the low intercept altitude, virtually all debris reentered the atmosphere within weeks. The operation demonstrated a latent ASAT capability using existing missile defense systems.',
    debrisGenerated: 'Minimal (all reentered within weeks)',
    altitude: '~247 km',
    target: 'USA-193 (malfunctioning reconnaissance satellite)',
  },
  {
    id: 'e3',
    date: 'March 27, 2019',
    nation: 'India',
    flag: 'IN',
    type: 'kinetic_asat',
    name: 'Mission Shakti',
    description: 'India conducted a direct-ascent ASAT test, destroying its own Microsat-R satellite at approximately 300 km altitude using a Prithvi Defence Vehicle Mark II (PDV Mk-II) missile. The low altitude was chosen to minimize long-lived debris. The test generated approximately 400 pieces of trackable debris. Most debris reentered within months, though some pieces were initially tracked at higher altitudes. India became the fourth nation to demonstrate a kinetic ASAT capability.',
    debrisGenerated: '~400 trackable pieces (most reentered within months)',
    altitude: '~300 km',
    target: 'Microsat-R (purpose-built target satellite)',
  },
  {
    id: 'e4',
    date: 'November 15, 2021',
    nation: 'Russia',
    flag: 'RU',
    type: 'kinetic_asat',
    name: 'Nudol ASAT Test (Cosmos 1408)',
    description: 'Russia destroyed its defunct Cosmos 1408 (Tselina-D SIGINT) satellite at approximately 480 km altitude using a PL-19 Nudol direct-ascent missile. The test generated over 1,500 pieces of trackable debris and was widely condemned internationally. The debris cloud initially posed a direct threat to the International Space Station crew, who sheltered in their return vehicles. Debris from this event will remain in orbit for years to decades, contaminating heavily used LEO orbits.',
    debrisGenerated: '1,500+ trackable pieces',
    altitude: '~480 km',
    target: 'Cosmos 1408 (defunct Tselina-D SIGINT satellite)',
  },
  {
    id: 'e5',
    date: '2013 - Present',
    nation: 'China',
    flag: 'CN',
    type: 'co_orbital',
    name: 'SJ-Series Rendezvous and Proximity Operations',
    description: 'China has conducted numerous rendezvous and proximity operations (RPO) using satellites in the Shijian (SJ) series. Notable events include SJ-12 maneuvering close to SJ-06F in 2010, SJ-17 conducting proximity operations near GEO targets in 2016-2021, and SJ-21 grappling and relocating a defunct BeiDou satellite in 2022. These operations demonstrate advanced on-orbit maneuvering capabilities that could be used for satellite inspection, servicing, or counterspace purposes.',
  },
  {
    id: 'e6',
    date: '2014 - 2020',
    nation: 'Russia',
    flag: 'RU',
    type: 'co_orbital',
    name: 'Cosmos 2542/2543 Inspector Satellites',
    description: 'In 2019, Russia\'s Cosmos 2542 maneuvered to shadow the USA-245 (KH-11) reconnaissance satellite in LEO, approaching within a few kilometers. Cosmos 2542 subsequently released a sub-satellite (Cosmos 2543), which itself later ejected a small projectile in a possible weapons test. This series of events raised significant concern about Russian counterspace intentions. Additional Russian "inspector" satellites have been observed conducting proximity operations near U.S. and allied space assets.',
  },
  {
    id: 'e7',
    date: 'February 2022 - Present',
    nation: 'Russia',
    flag: 'RU',
    type: 'electronic_warfare',
    name: 'GPS/GNSS Jamming and Spoofing (Ukraine Theater)',
    description: 'Russia has employed extensive GPS/GNSS jamming and spoofing in the Ukraine conflict zone, affecting both military and civilian users. Jamming activities have impacted GPS-guided munitions, commercial aviation across the Baltic and Eastern Mediterranean, and civilian navigation services in neighboring countries. The conflict has demonstrated the vulnerability of space-based PNT services to ground-based electronic warfare and accelerated development of anti-jam and alternative PNT technologies.',
  },
  {
    id: 'e8',
    date: 'February 24, 2022',
    nation: 'Russia',
    flag: 'RU',
    type: 'cyber',
    name: 'Viasat KA-SAT Cyberattack',
    description: 'Approximately one hour before Russia\'s invasion of Ukraine, a cyberattack targeted Viasat\'s KA-SAT satellite broadband network, disabling tens of thousands of terminals across Ukraine and Europe. The attack, attributed to Russian military intelligence (GRU), used AcidRain wiper malware to brick modem firmware. The incident disrupted Ukrainian military communications and affected wind farm operations in Germany. It demonstrated that attacking satellite ground infrastructure can be as effective as attacking the space segment.',
  },
  {
    id: 'e9',
    date: '2006 - Present',
    nation: 'China',
    flag: 'CN',
    type: 'directed_energy',
    name: 'Ground-Based Laser Dazzling / ASAT Laser Development',
    description: 'Multiple intelligence community reports have assessed that China is developing ground-based laser weapons capable of dazzling or damaging satellite optical sensors. In 2006, a U.S. reconnaissance satellite was reportedly illuminated by a Chinese ground-based laser. China\'s ongoing directed-energy weapons research includes both ground-based and potentially space-based laser systems for counterspace applications. The Secure World Foundation\'s annual Counterspace Assessment provides ongoing OSINT analysis of these capabilities.',
  },
  {
    id: 'e10',
    date: 'October 2023',
    nation: 'Russia',
    flag: 'RU',
    type: 'co_orbital',
    name: 'Cosmos 2570 GEO Vicinity Operations',
    description: 'Russia launched Cosmos 2570 into a near-geostationary orbit where it was observed maneuvering in the vicinity of GEO satellites. The spacecraft\'s behavior was consistent with signals intelligence collection or satellite inspection. This continued Russia\'s pattern of placing inspector/surveillance spacecraft near sensitive GEO assets. The U.S. publicly expressed concern about Russian activities in the GEO belt through Combined Space Operations Center statements.',
  },
];

const ALLIANCES: Alliance[] = [
  {
    id: 'cspo',
    name: 'Combined Space Operations Initiative',
    abbreviation: 'CSpO',
    established: '2014 (expanded multiple times)',
    members: ['United States', 'United Kingdom', 'Canada', 'Australia', 'New Zealand', 'France', 'Germany'],
    description: 'The Combined Space Operations (CSpO) initiative is the premier multilateral space operations partnership, bringing together seven nations to enhance allied space cooperation. Originally a Five Eyes (FVEY) construct, CSpO expanded to include France and Germany. The initiative focuses on generating unity of effort in space operations, enabling information sharing, and developing combined space operational capabilities. CSpO nations conduct regular combined space exercises and maintain shared space domain awareness.',
    keyActivities: [
      'Combined Space Operations Center (CSpOC) participation',
      'Shared space domain awareness data',
      'Combined space exercises (e.g., Global Sentinel, Schriever Wargames)',
      'Interoperability standards development',
      'Combined space tasking orders',
      'Mutual space support agreements',
    ],
    headquarters: 'Vandenberg SFB, CA (CSpOC)',
  },
  {
    id: 'fvey-space',
    name: 'Five Eyes Space Cooperation',
    abbreviation: 'FVEY Space',
    established: '1950s (intelligence sharing); space focus expanded post-2010',
    members: ['United States', 'United Kingdom', 'Canada', 'Australia', 'New Zealand'],
    description: 'The Five Eyes (FVEY) intelligence alliance includes the deepest level of space intelligence sharing among partner nations. Space-related intelligence sharing covers satellite reconnaissance, signals intelligence from space, space threat assessments, and space domain awareness data. FVEY nations operate complementary satellite ground stations and share overhead intelligence products. This cooperation enables a persistent, global space surveillance and intelligence capability that no single nation could maintain alone.',
    keyActivities: [
      'Space-derived intelligence sharing',
      'Shared satellite ground station access',
      'Joint space threat assessments',
      'Complementary sensor coverage',
      'Combined overhead intelligence production',
      'Joint satellite tasking coordination',
    ],
  },
  {
    id: 'nato-space',
    name: 'NATO Space Centre',
    abbreviation: 'NATO Space',
    established: '2020 (Space Centre at Ramstein); Space declared operational domain 2019',
    members: ['All 32 NATO member states'],
    description: 'NATO declared space an operational domain in December 2019 and established the NATO Space Centre at Allied Air Command, Ramstein, Germany in 2020. The Space Centre serves as a coordination hub for space activities across the Alliance, providing space domain awareness and space support to NATO operations. NATO\'s approach to space is defensive; it does not intend to deploy weapons in space but recognizes the need to protect space-based assets critical to Alliance security. NATO\'s 2022 Strategic Concept explicitly addresses space security.',
    keyActivities: [
      'NATO Space Centre operations at Ramstein',
      'Space Situational Awareness sharing',
      'Space support to NATO operations',
      'Space threat assessment coordination',
      'Annual NATO Space Conference',
      'Space capability development (via NSPA)',
      'Overarching Space Policy implementation',
    ],
    headquarters: 'Allied Air Command, Ramstein, Germany',
  },
  {
    id: 'aukus-space',
    name: 'AUKUS Space Cooperation',
    abbreviation: 'AUKUS',
    established: '2021 (AUKUS partnership); space component expanded 2023',
    members: ['Australia', 'United Kingdom', 'United States'],
    description: 'The AUKUS security partnership between Australia, the UK, and the US includes advanced technology cooperation in space, among other domains. AUKUS Pillar 2 (Advanced Capabilities) encompasses space-related cooperation including deep space advanced radar, space domain awareness, and resilient space architectures. The partnership provides a framework for sharing sensitive space technologies and operational concepts among three of the most capable allied space nations.',
    keyActivities: [
      'Deep space advanced radar capability',
      'Space domain awareness integration',
      'Resilient space architecture cooperation',
      'Space technology sharing and co-development',
      'Combined space operations exercises',
      'Industrial base cooperation for space',
    ],
  },
  {
    id: 'quod-space',
    name: 'Quad Space Cooperation',
    abbreviation: 'Quad',
    established: '2023 (space cooperation framework)',
    members: ['United States', 'Japan', 'India', 'Australia'],
    description: 'The Quad (Quadrilateral Security Dialogue) has expanded into space cooperation, with leaders endorsing a framework for shared space domain awareness and sustainable space activities in the Indo-Pacific region. While primarily a diplomatic rather than military framework, Quad space cooperation includes SSA data sharing, space weather information exchange, and capacity building for space operations. This complements bilateral military space agreements between the four nations.',
    keyActivities: [
      'Space situational awareness data sharing',
      'Space sustainability norm-setting',
      'Climate observation data sharing (satellite-derived)',
      'GNSS interoperability discussions',
      'Capacity building for Indo-Pacific space partners',
    ],
  },
  {
    id: 'sda-commercial',
    name: 'Commercial Space Domain Awareness Ecosystem',
    abbreviation: 'Commercial SDA',
    established: 'Ongoing (matured 2018-present)',
    members: ['LeoLabs', 'ExoAnalytic Solutions', 'Slingshot Aerospace', 'Numerica Corporation', 'COMSPOC (AGI)', 'Kayhan Space', 'Privateer Space'],
    description: 'The commercial space domain awareness ecosystem has matured significantly, with multiple companies providing tracking, characterization, and analytics services that complement government sensor networks. The U.S. Space Force and allied nations increasingly rely on commercial SDA providers for persistent, global space surveillance data. LeoLabs operates ground-based phased array radars for LEO tracking; ExoAnalytic operates a global telescope network for GEO surveillance; Slingshot Aerospace provides data fusion and AI-powered analytics.',
    keyActivities: [
      'LEO object tracking and conjunction assessment (LeoLabs)',
      'GEO belt surveillance and characterization (ExoAnalytic)',
      'Data fusion and AI analytics (Slingshot Aerospace)',
      'Astrodynamics and collision avoidance (COMSPOC, Kayhan)',
      'Space sustainability and debris mapping (Privateer)',
      'Commercial SSA data provision to military (via contracts)',
    ],
  },
];

const PROGRAM_STATUS_STYLES: Record<DefenseProgram['status'], { label: string; color: string; bg: string }> = {
  operational: { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/20' },
  production: { label: 'Production', color: 'text-blue-400', bg: 'bg-blue-900/20' },
  development: { label: 'Development', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  planned: { label: 'Planned', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  concept: { label: 'Concept', color: 'text-purple-400', bg: 'bg-purple-900/20' },
};

const CATEGORY_STYLES: Record<DefenseProgram['category'], { label: string; color: string }> = {
  communications: { label: 'Communications', color: 'text-blue-300' },
  missile_warning: { label: 'Missile Warning', color: 'text-red-300' },
  navigation: { label: 'Navigation', color: 'text-green-300' },
  launch: { label: 'Launch', color: 'text-orange-300' },
  surveillance: { label: 'Surveillance', color: 'text-purple-300' },
  sda: { label: 'SDA Architecture', color: 'text-cyan-300' },
  ground: { label: 'Ground Systems', color: 'text-yellow-300' },
  classified: { label: 'Classified', color: 'text-slate-300' },
};

const EVENT_TYPE_STYLES: Record<CounterspaceEvent['type'], { label: string; color: string; bg: string }> = {
  kinetic_asat: { label: 'Kinetic ASAT', color: 'text-red-400', bg: 'bg-red-900/20' },
  co_orbital: { label: 'Co-Orbital / RPO', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  electronic_warfare: { label: 'Electronic Warfare', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  cyber: { label: 'Cyber Attack', color: 'text-purple-400', bg: 'bg-purple-900/20' },
  directed_energy: { label: 'Directed Energy', color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
  rpo: { label: 'RPO', color: 'text-orange-400', bg: 'bg-orange-900/20' },
};

// ────────────────────────────────────────
// Tab Configuration
// ────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'forces', label: 'Space Forces' },
  { id: 'programs', label: 'Programs' },
  { id: 'procurement', label: 'Procurement' },
  { id: 'threats', label: 'Threat Assessment' },
  { id: 'alliances', label: 'Alliances' },
];

// ────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────

function HeroStats() {
  const stats = [
    { label: 'USSF Budget (FY25)', value: '$33.3B', sub: 'Requested' },
    { label: 'NRO Budget (FY25)', value: '$18.9B', sub: 'Publicly disclosed' },
    { label: 'Nations w/ Space Forces', value: '9+', sub: 'Dedicated commands' },
    { label: 'SDA Satellites Planned', value: '300+', sub: 'PWSA total' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
          <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
          <div className="text-white font-bold text-2xl mt-1">{stat.value}</div>
          <div className="text-star-400 text-xs">{stat.sub}</div>
        </div>
      ))}
    </div>
  );
}

function SpaceForceCard({ force }: { force: SpaceForce }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center text-xs font-bold text-white">
            {force.flag}
          </div>
          <div>
            <h3 className="text-white font-bold">{force.name}</h3>
            <span className="text-star-400 text-sm">{force.country}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Established:</span>
          <span className="text-star-200">{force.established}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Personnel:</span>
          <span className="text-star-200">{force.personnel}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Budget:</span>
          <span className="text-green-400 font-medium">{force.budget}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Parent:</span>
          <span className="text-star-200">{force.parentService}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">Commander:</span>
          <span className="text-star-200">{force.commander}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[100px]">HQ:</span>
          <span className="text-star-200">{force.headquarters}</span>
        </div>
      </div>

      {force.fieldCommands && (
        <div className="mb-4">
          <span className="text-star-400 text-xs uppercase tracking-widest">Field Commands</span>
          <ul className="mt-1 space-y-1">
            {force.fieldCommands.map((cmd) => (
              <li key={cmd} className="text-star-300 text-sm flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-nebula-500 mt-1.5 flex-shrink-0" />
                {cmd}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4">
        <span className="text-star-400 text-xs uppercase tracking-widest">Key Programs</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {force.keyPrograms.map((program) => (
            <span key={program} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">
              {program}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Show less' : 'Read more'}
      </button>
      {expanded && (
        <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
          {force.description}
        </p>
      )}
    </div>
  );
}

function ProgramCard({ program }: { program: DefenseProgram }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = PROGRAM_STATUS_STYLES[program.status];
  const catStyle = CATEGORY_STYLES[program.category];

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-nebula-400 font-mono font-bold text-sm">{program.abbreviation}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
            <span className={`text-xs ${catStyle.color}`}>{catStyle.label}</span>
          </div>
          <h3 className="text-white font-semibold">{program.name}</h3>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[90px]">Agency:</span>
          <span className="text-star-200">{program.agency}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[90px]">Contractor:</span>
          <span className="text-star-200">{program.contractor}</span>
        </div>
        {program.budget && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[90px]">Budget:</span>
            <span className="text-green-400 font-medium">{program.budget}</span>
          </div>
        )}
        {program.constellation && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[90px]">Constellation:</span>
            <span className="text-star-200">{program.constellation}</span>
          </div>
        )}
        {program.nextMilestone && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[90px]">Next:</span>
            <span className="text-yellow-400">{program.nextMilestone}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Show less' : 'Details'}
      </button>
      {expanded && (
        <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
          {program.description}
        </p>
      )}
    </div>
  );
}

function ContractCard({ contract }: { contract: ContractAward }) {
  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-white font-semibold">{contract.title}</h3>
        <span className="text-green-400 font-bold text-sm whitespace-nowrap ml-3">{contract.value}</span>
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Contractor:</span>
          <span className="text-star-200">{contract.contractor}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Agency:</span>
          <span className="text-star-200">{contract.agency}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Awarded:</span>
          <span className="text-star-200">{contract.awardDate}</span>
        </div>
        {contract.period && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-400 min-w-[80px]">Period:</span>
            <span className="text-star-200">{contract.period}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Category:</span>
          <span className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs font-medium">{contract.category}</span>
        </div>
      </div>
      <p className="text-star-300 text-sm leading-relaxed">{contract.description}</p>
    </div>
  );
}

function ThreatEventCard({ event }: { event: CounterspaceEvent }) {
  const typeStyle = EVENT_TYPE_STYLES[event.type];

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-700/50 flex items-center justify-center text-xs font-bold text-white">
            {event.flag}
          </div>
          <div>
            <h3 className="text-white font-semibold">{event.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${typeStyle.bg} ${typeStyle.color}`}>
                {typeStyle.label}
              </span>
              <span className="text-star-400 text-xs">{event.nation}</span>
            </div>
          </div>
        </div>
        <span className="text-star-400 text-sm font-mono whitespace-nowrap">{event.date}</span>
      </div>

      {(event.altitude || event.target || event.debrisGenerated) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {event.altitude && (
            <div className="bg-slate-900/50 rounded p-2">
              <span className="text-star-400 text-xs block">Altitude</span>
              <span className="text-star-200 text-sm font-medium">{event.altitude}</span>
            </div>
          )}
          {event.target && (
            <div className="bg-slate-900/50 rounded p-2">
              <span className="text-star-400 text-xs block">Target</span>
              <span className="text-star-200 text-sm font-medium">{event.target}</span>
            </div>
          )}
          {event.debrisGenerated && (
            <div className="bg-slate-900/50 rounded p-2">
              <span className="text-star-400 text-xs block">Debris Generated</span>
              <span className="text-red-400 text-sm font-medium">{event.debrisGenerated}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-star-300 text-sm leading-relaxed">{event.description}</p>
    </div>
  );
}

function AllianceCard({ alliance }: { alliance: Alliance }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 border border-slate-700/50 bg-slate-800/50 backdrop-blur hover:border-nebula-500/40 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold">{alliance.name}</h3>
            {alliance.abbreviation && (
              <span className="text-nebula-400 font-mono text-sm">({alliance.abbreviation})</span>
            )}
          </div>
          <span className="text-star-400 text-sm">Est. {alliance.established}</span>
        </div>
        {alliance.headquarters && (
          <span className="text-star-400 text-xs">{alliance.headquarters}</span>
        )}
      </div>

      <div className="mb-3">
        <span className="text-star-400 text-xs uppercase tracking-widest">Members</span>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {alliance.members.map((member) => (
            <span key={member} className="px-2 py-0.5 bg-slate-700/50 text-star-200 rounded text-xs">
              {member}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="text-star-400 text-xs uppercase tracking-widest">Key Activities</span>
        <ul className="mt-1 space-y-1">
          {alliance.keyActivities.slice(0, expanded ? undefined : 3).map((activity) => (
            <li key={activity} className="text-star-300 text-sm flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-nebula-500 mt-1.5 flex-shrink-0" />
              {activity}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {expanded ? 'Show less' : 'Read more'}
      </button>
      {expanded && (
        <p className="text-star-300 text-sm mt-3 leading-relaxed border-t border-slate-700/50 pt-3">
          {alliance.description}
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Spending Trends Component
// ────────────────────────────────────────

function SpendingTrends() {
  const budgetData = [
    { year: 'FY2020', ussf: 15.4, nro: 16.0 },
    { year: 'FY2021', ussf: 17.4, nro: 16.5 },
    { year: 'FY2022', ussf: 24.5, nro: 17.2 },
    { year: 'FY2023', ussf: 26.3, nro: 17.8 },
    { year: 'FY2024', ussf: 30.3, nro: 18.3 },
    { year: 'FY2025', ussf: 33.3, nro: 18.9 },
  ];

  const maxVal = 35;

  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h3 className="text-white font-bold mb-4">U.S. Defense Space Budget Trends ($B)</h3>
      <div className="space-y-3">
        {budgetData.map((row) => (
          <div key={row.year} className="flex items-center gap-3">
            <span className="text-star-400 text-sm font-mono w-16 flex-shrink-0">{row.year}</span>
            <div className="flex-1 flex gap-1">
              <div
                className="h-6 rounded-l bg-nebula-500/60 flex items-center pl-2"
                style={{ width: `${(row.ussf / maxVal) * 100}%` }}
              >
                <span className="text-white text-xs font-medium whitespace-nowrap">${row.ussf}B</span>
              </div>
              <div
                className="h-6 rounded-r bg-purple-500/60 flex items-center pl-2"
                style={{ width: `${(row.nro / maxVal) * 100}%` }}
              >
                <span className="text-white text-xs font-medium whitespace-nowrap">${row.nro}B</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-6 mt-4 text-xs text-star-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-nebula-500/60" />
          <span>USSF Budget</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500/60" />
          <span>NRO Budget</span>
        </div>
      </div>
      <p className="text-star-500 text-xs mt-3">
        Note: FY2025 figures are budget requests. USSF budget includes Space Force-specific funding within the DAF budget.
        NRO budget was first publicly disclosed in 2024. All figures from public/unclassified sources.
      </p>
    </div>
  );
}

// ────────────────────────────────────────
// Threat Summary Component
// ────────────────────────────────────────

function ThreatSummary() {
  const categories = [
    {
      name: 'Kinetic ASAT',
      level: 'high',
      nations: ['China', 'Russia', 'India', 'United States'],
      description: 'Direct-ascent missiles that physically destroy satellites. Creates debris, difficult to conceal. Four nations have demonstrated this capability.',
    },
    {
      name: 'Co-Orbital / RPO',
      level: 'high',
      nations: ['China', 'Russia', 'United States'],
      description: 'Satellites that maneuver near other satellites for inspection, surveillance, or potential interference. Ambiguous intent makes attribution challenging.',
    },
    {
      name: 'Electronic Warfare (Jamming/Spoofing)',
      level: 'very_high',
      nations: ['Russia', 'China', 'Iran', 'North Korea'],
      description: 'Ground-based or space-based systems that jam or spoof satellite signals, particularly GPS/GNSS and SATCOM. Most frequently used counterspace capability.',
    },
    {
      name: 'Cyber',
      level: 'high',
      nations: ['Russia', 'China', 'Iran', 'North Korea'],
      description: 'Attacks on satellite ground systems, communication links, or spacecraft software. Demonstrated in the 2022 Viasat attack. Hard to attribute definitively.',
    },
    {
      name: 'Directed Energy',
      level: 'medium',
      nations: ['China', 'Russia'],
      description: 'Ground-based or space-based lasers for dazzling, blinding, or damaging satellite sensors. China and Russia assessed to be developing these systems.',
    },
  ];

  const levelStyles: Record<string, { label: string; color: string; bg: string }> = {
    very_high: { label: 'Very High', color: 'text-red-400', bg: 'bg-red-900/20' },
    high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-900/20' },
    medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
    low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-900/20' },
  };

  return (
    <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur mb-8">
      <h3 className="text-white font-bold mb-4">Counterspace Threat Overview (OSINT Assessment)</h3>
      <div className="space-y-4">
        {categories.map((cat) => {
          const style = levelStyles[cat.level];
          return (
            <div key={cat.name} className={`rounded-lg border border-slate-700/50 ${style.bg} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">{cat.name}</h4>
                <span className={`text-xs font-bold px-2.5 py-1 rounded ${style.bg} ${style.color}`}>
                  Threat Level: {style.label}
                </span>
              </div>
              <p className="text-star-300 text-sm mb-2">{cat.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-star-400 text-xs mr-1">Known capable:</span>
                {cat.nations.map((nation) => (
                  <span key={nation} className="px-2 py-0.5 bg-slate-700/50 text-star-200 rounded text-xs">
                    {nation}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-star-500 text-xs mt-4">
        Source: Compiled from the Secure World Foundation Global Counterspace Capabilities report,
        CSIS Aerospace Security Project, and U.S. DoD public threat assessments.
        All information is from open/unclassified sources.
      </p>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SpaceDefensePage() {
  const [activeTab, setActiveTab] = useState<TabId>('forces');
  const [programCategoryFilter, setProgramCategoryFilter] = useState<DefenseProgram['category'] | ''>('');
  const [threatTypeFilter, setThreatTypeFilter] = useState<CounterspaceEvent['type'] | ''>('');

  const filteredPrograms = programCategoryFilter
    ? DEFENSE_PROGRAMS.filter((p) => p.category === programCategoryFilter)
    : DEFENSE_PROGRAMS;

  const filteredEvents = threatTypeFilter
    ? COUNTERSPACE_EVENTS.filter((e) => e.type === threatTypeFilter)
    : COUNTERSPACE_EVENTS;

  const programCategories = Array.from(new Set(DEFENSE_PROGRAMS.map((p) => p.category)));
  const eventTypes = Array.from(new Set(COUNTERSPACE_EVENTS.map((e) => e.type)));

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Space Defense & National Security"
          subtitle="Open-source intelligence on military space organizations, programs, procurement, counterspace threats, and allied cooperation"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Space Defense' },
          ]}
        />

        {/* Hero Stats */}
        <HeroStats />

        {/* Classification Disclaimer */}
        <div className="card p-4 border border-yellow-500/30 bg-yellow-900/10 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg flex-shrink-0">&#9888;</span>
            <div>
              <h4 className="text-yellow-400 font-semibold text-sm">UNCLASSIFIED / OPEN SOURCE INFORMATION ONLY</h4>
              <p className="text-star-400 text-xs mt-1">
                All information presented on this page is sourced exclusively from publicly available, unclassified sources
                including official government press releases, congressional budget justification documents, academic research,
                and reputable open-source intelligence publications (Secure World Foundation, CSIS, etc.).
                No classified or controlled unclassified information (CUI) is included.
                Budget figures are based on public budget requests and may differ from enacted appropriations.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setProgramCategoryFilter('');
                  setThreatTypeFilter('');
                }}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-nebula-500 text-nebula-300'
                    : 'border-transparent text-star-300 hover:text-white hover:border-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ──────────────── SPACE FORCES TAB ──────────────── */}
        {activeTab === 'forces' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Military Space Organizations Worldwide</h2>
              <p className="text-star-300 text-sm mb-6">
                Dedicated space forces and commands have proliferated since 2019, reflecting global recognition
                of space as a contested operational domain. The following organizations represent the primary
                military space commands with dedicated organizational structures.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {SPACE_FORCES.map((force) => (
                  <SpaceForceCard key={force.id} force={force} />
                ))}
              </div>
            </div>

            {/* USSF Organizational Detail */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-4">U.S. Space Force Organizational Structure</h3>
              <p className="text-star-300 text-sm mb-4">
                The USSF is organized under the Department of the Air Force and structured around three
                field commands. Space Operations Command (SpOC) is responsible for operating space forces;
                Space Systems Command (SSC) handles acquisition and launch; and Space Training and Readiness
                Command (STARCOM) oversees training, testing, and doctrine development.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
                  <h4 className="text-nebula-400 font-semibold mb-2">Space Operations Command (SpOC)</h4>
                  <p className="text-star-400 text-sm">
                    Peterson SFB, CO. Operates the nation&apos;s military space forces including GPS, missile warning,
                    space surveillance, and satellite communications operations. Houses the Combined Space Operations
                    Center (CSpOC).
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
                  <h4 className="text-nebula-400 font-semibold mb-2">Space Systems Command (SSC)</h4>
                  <p className="text-star-400 text-sm">
                    Los Angeles AFB, CA. Responsible for developing, acquiring, and sustaining lethal and resilient
                    space capabilities. Manages NSSL, GPS, SBIRS/Next-Gen OPIR, WGS, AEHF/ESS, and other programs.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
                  <h4 className="text-nebula-400 font-semibold mb-2">Space Training & Readiness Command (STARCOM)</h4>
                  <p className="text-star-400 text-sm">
                    Peterson SFB, CO. Responsible for training, testing, and developing tactics, techniques, and
                    procedures for space operations. Operates the National Space Test and Training Complex.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── PROGRAMS TAB ──────────────── */}
        {activeTab === 'programs' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Major Defense Space Programs</h2>
              <p className="text-star-300 text-sm mb-6">
                The U.S. defense space enterprise encompasses hundreds of billions of dollars in satellite
                constellations, ground systems, and launch services. The following are the major publicly
                known programs across the Space Force, SDA, and NRO.
              </p>

              {/* Category Filters */}
              <div className="card p-4 border border-slate-700/50 bg-slate-800/50 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-star-400 text-sm mr-2">Filter by category:</span>
                  <button
                    onClick={() => setProgramCategoryFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      programCategoryFilter === ''
                        ? 'bg-nebula-500 text-slate-900'
                        : 'bg-slate-700 text-star-400 hover:bg-slate-600'
                    }`}
                  >
                    All ({DEFENSE_PROGRAMS.length})
                  </button>
                  {programCategories.map((cat) => {
                    const count = DEFENSE_PROGRAMS.filter((p) => p.category === cat).length;
                    const style = CATEGORY_STYLES[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setProgramCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          programCategoryFilter === cat
                            ? `bg-nebula-500/20 ${style.color} border border-nebula-500/40`
                            : 'bg-slate-700 text-star-400 hover:bg-slate-600'
                        }`}
                      >
                        {style.label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))}
              </div>
            </div>

            {/* SDA Architecture Explainer */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-4">Proliferated Warfighter Space Architecture (PWSA)</h3>
              <p className="text-star-300 text-sm mb-4">
                The Space Development Agency (SDA) is building the Proliferated Warfighter Space Architecture,
                a multi-layered constellation of hundreds of satellites in LEO designed for resilience through numbers.
                Unlike traditional exquisite military satellites, PWSA uses a &quot;spiral development&quot; model
                with new tranches every two years, incorporating commercial technology and manufacturing practices.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { layer: 'Transport Layer', purpose: 'Mesh networking and data transport', icon: '&#128752;' },
                  { layer: 'Tracking Layer', purpose: 'Missile warning and missile tracking', icon: '&#128269;' },
                  { layer: 'Custody Layer', purpose: 'Target custody for beyond-LOS fires', icon: '&#127919;' },
                  { layer: 'Deterrence Layer', purpose: 'Demonstration of capabilities', icon: '&#128737;' },
                ].map((layer) => (
                  <div key={layer.layer} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-center">
                    <span className="text-2xl block mb-2" dangerouslySetInnerHTML={{ __html: layer.icon }} />
                    <h4 className="text-nebula-400 font-semibold text-sm">{layer.layer}</h4>
                    <p className="text-star-400 text-xs mt-1">{layer.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── PROCUREMENT TAB ──────────────── */}
        {activeTab === 'procurement' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Recent Contract Awards & Procurement</h2>
              <p className="text-star-300 text-sm mb-6">
                Major defense space contract awards from FY2023-FY2025. Defense space procurement has
                seen a significant increase reflecting the urgency to modernize and expand military space
                capabilities in response to peer competitor developments.
              </p>

              {/* Budget Trends */}
              <SpendingTrends />

              {/* Contract Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {RECENT_CONTRACTS.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} />
                ))}
              </div>
            </div>

            {/* SBIR/STTR Note */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-3">SBIR/STTR Opportunities in Space Defense</h3>
              <p className="text-star-300 text-sm mb-3">
                The Space Force and SDA actively use the Small Business Innovation Research (SBIR) and
                Small Business Technology Transfer (STTR) programs to fund innovative space technologies
                from small businesses. Key topic areas include:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  'Resilient satellite bus technologies',
                  'Optical inter-satellite link components',
                  'On-orbit servicing capabilities',
                  'Space domain awareness sensors',
                  'Anti-jam communication waveforms',
                  'Radiation-hardened electronics',
                  'Autonomous satellite operations (AI/ML)',
                  'Additive manufacturing for space',
                  'Cybersecurity for space systems',
                ].map((topic) => (
                  <div key={topic} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-nebula-500 mt-1.5 flex-shrink-0" />
                    <span className="text-star-300 text-sm">{topic}</span>
                  </div>
                ))}
              </div>
              <p className="text-star-500 text-xs mt-4">
                Visit SAM.gov and the SBIR.gov portal for current solicitations. SpaceWERX (the USSF
                innovation arm) also manages Orbital Prime and other programs for space technology development.
              </p>
            </div>
          </div>
        )}

        {/* ──────────────── THREAT ASSESSMENT TAB ──────────────── */}
        {activeTab === 'threats' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Counterspace Threat Assessment</h2>
              <p className="text-star-300 text-sm mb-6">
                Based exclusively on open-source intelligence (OSINT) from the Secure World Foundation&apos;s
                Global Counterspace Capabilities report, CSIS Aerospace Security Project, and publicly released
                U.S. government threat assessments. This section catalogs known counterspace events and assessed
                capabilities by nation.
              </p>

              {/* Threat Overview */}
              <ThreatSummary />

              {/* Event Type Filters */}
              <div className="card p-4 border border-slate-700/50 bg-slate-800/50 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-star-400 text-sm mr-2">Filter events:</span>
                  <button
                    onClick={() => setThreatTypeFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      threatTypeFilter === ''
                        ? 'bg-nebula-500 text-slate-900'
                        : 'bg-slate-700 text-star-400 hover:bg-slate-600'
                    }`}
                  >
                    All ({COUNTERSPACE_EVENTS.length})
                  </button>
                  {eventTypes.map((type) => {
                    const count = COUNTERSPACE_EVENTS.filter((e) => e.type === type).length;
                    const style = EVENT_TYPE_STYLES[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setThreatTypeFilter(type)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          threatTypeFilter === type
                            ? `${style.bg} ${style.color} border border-slate-600`
                            : 'bg-slate-700 text-star-400 hover:bg-slate-600'
                        }`}
                      >
                        {style.label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Timeline */}
              <h3 className="text-white font-bold mb-4">Counterspace Event Timeline</h3>
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <ThreatEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>

            {/* Source Note */}
            <div className="card p-6 border-dashed border border-slate-700/50">
              <h3 className="text-white font-semibold mb-2">Sources & Methodology</h3>
              <p className="text-star-400 text-sm mb-3">
                This threat assessment is compiled exclusively from open-source materials:
              </p>
              <ul className="space-y-1.5">
                {[
                  'Secure World Foundation -- "Global Counterspace Capabilities: An Open Source Assessment" (annual)',
                  'Center for Strategic and International Studies (CSIS) -- Aerospace Security Project',
                  'U.S. Director of National Intelligence -- Annual Threat Assessment',
                  'U.S. Space Command -- Public statements and press releases',
                  'Defense Intelligence Agency -- "Challenges to Security in Space" (2022)',
                  'Congressional Research Service -- Reports on space security',
                  'Verified tracking data from 18th Space Defense Squadron (public catalog)',
                ].map((source) => (
                  <li key={source} className="text-star-300 text-sm flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-star-400 mt-1.5 flex-shrink-0" />
                    {source}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ──────────────── ALLIANCES TAB ──────────────── */}
        {activeTab === 'alliances' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Space Defense Alliances & Cooperation</h2>
              <p className="text-star-300 text-sm mb-6">
                International space defense cooperation has expanded significantly since 2019, with
                multilateral frameworks enabling shared space domain awareness, combined operations,
                and technology cooperation among allied nations.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ALLIANCES.map((alliance) => (
                  <AllianceCard key={alliance.id} alliance={alliance} />
                ))}
              </div>
            </div>

            {/* Data Sharing Frameworks */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-4">Key Data Sharing Frameworks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    name: 'SSA Sharing Agreements',
                    description: 'The U.S. has over 200 SSA sharing agreements with commercial and government entities worldwide, providing conjunction warnings and tracking data through Space-Track.org.',
                    partners: '200+ entities globally',
                  },
                  {
                    name: 'Operation Olympic Defender',
                    description: 'A multinational coalition focused on deterring hostile actions in space through shared domain awareness, combined operations, and coordinated messaging.',
                    partners: 'US, UK, Australia, Canada, France, Germany',
                  },
                  {
                    name: 'Allied Ground Surveillance Sharing',
                    description: 'Bilateral and multilateral agreements for sharing space surveillance sensor data from ground-based radars, telescopes, and other SDA assets.',
                    partners: 'CSpO nations + additional partners',
                  },
                  {
                    name: 'Space-Track.org (Public Catalog)',
                    description: 'The 18th Space Defense Squadron maintains the publicly accessible space object catalog, sharing orbital data with registered users worldwide for collision avoidance and space safety.',
                    partners: 'Open to registered users globally',
                  },
                ].map((framework) => (
                  <div key={framework.name} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
                    <h4 className="text-nebula-400 font-semibold mb-2">{framework.name}</h4>
                    <p className="text-star-400 text-sm mb-2">{framework.description}</p>
                    <span className="text-star-500 text-xs">Partners: {framework.partners}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allied Capability Comparison */}
            <div className="card p-6 border border-slate-700/50 bg-slate-800/50 backdrop-blur">
              <h3 className="text-white font-bold mb-4">Allied Space Capability Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-3 text-star-400 font-medium">Nation</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">ISR</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">SATCOM</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">PNT</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">SDA</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">Launch</th>
                      <th className="text-center py-3 px-3 text-star-400 font-medium">Missile Warning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { nation: 'United States', isr: 'full', satcom: 'full', pnt: 'full', sda: 'full', launch: 'full', mw: 'full' },
                      { nation: 'China', isr: 'full', satcom: 'full', pnt: 'full', sda: 'high', launch: 'full', mw: 'high' },
                      { nation: 'Russia', isr: 'high', satcom: 'high', pnt: 'full', sda: 'medium', launch: 'full', mw: 'high' },
                      { nation: 'France', isr: 'high', satcom: 'high', pnt: 'partial', sda: 'medium', launch: 'full', mw: 'limited' },
                      { nation: 'United Kingdom', isr: 'medium', satcom: 'high', pnt: 'partial', sda: 'medium', launch: 'developing', mw: 'none' },
                      { nation: 'Japan', isr: 'high', satcom: 'medium', pnt: 'partial', sda: 'medium', launch: 'full', mw: 'limited' },
                      { nation: 'India', isr: 'medium', satcom: 'medium', pnt: 'regional', sda: 'developing', launch: 'full', mw: 'developing' },
                      { nation: 'Germany', isr: 'high', satcom: 'medium', pnt: 'partial', sda: 'medium', launch: 'none', mw: 'none' },
                      { nation: 'Australia', isr: 'limited', satcom: 'limited', pnt: 'none', sda: 'medium', launch: 'developing', mw: 'none' },
                    ].map((row) => {
                      const capStyles: Record<string, string> = {
                        full: 'text-green-400',
                        high: 'text-blue-400',
                        medium: 'text-yellow-400',
                        regional: 'text-yellow-400',
                        partial: 'text-orange-400',
                        limited: 'text-orange-400',
                        developing: 'text-purple-400',
                        none: 'text-slate-600',
                      };
                      return (
                        <tr key={row.nation} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-white font-medium">{row.nation}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.isr]}`}>{row.isr}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.satcom]}`}>{row.satcom}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.pnt]}`}>{row.pnt}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.sda]}`}>{row.sda}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.launch]}`}>{row.launch}</td>
                          <td className={`py-2.5 px-3 text-center capitalize ${capStyles[row.mw]}`}>{row.mw}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-star-400">
                <span><span className="text-green-400 font-medium">Full</span> = Comprehensive indigenous capability</span>
                <span><span className="text-blue-400 font-medium">High</span> = Significant capability</span>
                <span><span className="text-yellow-400 font-medium">Medium</span> = Moderate capability</span>
                <span><span className="text-orange-400 font-medium">Limited/Partial</span> = Emerging or dependent</span>
                <span><span className="text-purple-400 font-medium">Developing</span> = Under development</span>
                <span><span className="text-slate-600 font-medium">None</span> = No known capability</span>
              </div>
              <p className="text-star-500 text-xs mt-3">
                Capability assessments are approximate and based on publicly available information.
                ISR = Intelligence, Surveillance, Reconnaissance. PNT = Position, Navigation, Timing.
                SDA = Space Domain Awareness. Missile Warning = Overhead persistent infrared / early warning.
              </p>
            </div>
          </div>
        )}

        {/* Footer Disclaimer */}
        <div className="card p-6 mt-8 border-dashed border border-slate-700/50">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">About This Module</h3>
            <p className="text-star-400 text-sm max-w-3xl mx-auto">
              All information on this page is compiled exclusively from publicly available, unclassified sources
              including official government publications, congressional budget documents, academic research, and
              established open-source intelligence organizations. This module is intended for educational and
              industry awareness purposes. Budget figures represent requested amounts unless otherwise noted
              and may differ from final enacted appropriations. Capability assessments represent best
              available open-source analysis and should not be considered authoritative intelligence assessments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
