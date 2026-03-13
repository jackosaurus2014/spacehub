'use client';

import { useState, useEffect } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import DataFreshness from '@/components/ui/DataFreshness';
import { clientLogger } from '@/lib/client-logger';
import Link from 'next/link';
import { getCompanyProfileUrl } from '@/lib/company-links';

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
// Static Config (UI style mappings)
// ────────────────────────────────────────

const PROGRAM_STATUS_STYLES: Record<DefenseProgram['status'], { label: string; color: string; bg: string }> = {
  operational: { label: 'Operational', color: 'text-green-400', bg: 'bg-green-900/20' },
  production: { label: 'Production', color: 'text-blue-400', bg: 'bg-blue-900/20' },
  development: { label: 'Development', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  planned: { label: 'Planned', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  concept: { label: 'Concept', color: 'text-purple-400', bg: 'bg-purple-900/20' },
};

const DEFAULT_PROGRAM_STATUS_STYLE = { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-900/20' };

const CATEGORY_STYLES: Record<DefenseProgram['category'], { label: string; color: string }> = {
  communications: { label: 'Communications', color: 'text-blue-300' },
  missile_warning: { label: 'Missile Warning', color: 'text-red-300' },
  navigation: { label: 'Navigation', color: 'text-green-300' },
  launch: { label: 'Launch', color: 'text-orange-300' },
  surveillance: { label: 'Surveillance', color: 'text-purple-300' },
  sda: { label: 'SDA Architecture', color: 'text-slate-200' },
  ground: { label: 'Ground Systems', color: 'text-yellow-300' },
  classified: { label: 'Classified', color: 'text-slate-300' },
};

const DEFAULT_CATEGORY_STYLE = { label: 'Unknown', color: 'text-slate-400' };

const EVENT_TYPE_STYLES: Record<CounterspaceEvent['type'], { label: string; color: string; bg: string }> = {
  kinetic_asat: { label: 'Kinetic ASAT', color: 'text-red-400', bg: 'bg-red-900/20' },
  co_orbital: { label: 'Co-Orbital / RPO', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  electronic_warfare: { label: 'Electronic Warfare', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  cyber: { label: 'Cyber Attack', color: 'text-purple-400', bg: 'bg-purple-900/20' },
  directed_energy: { label: 'Directed Energy', color: 'text-slate-300', bg: 'bg-slate-800/30' },
  rpo: { label: 'RPO', color: 'text-orange-400', bg: 'bg-orange-900/20' },
};

const DEFAULT_EVENT_TYPE_STYLE = { label: 'Unknown', color: 'text-slate-400', bg: 'bg-slate-900/20' };

// ────────────────────────────────────────
// Fallback Data (from seed script)
// ────────────────────────────────────────

const FALLBACK_SPACE_FORCES: SpaceForce[] = [
  {
    id: 'ussf',
    name: 'United States Space Force',
    country: 'United States',
    flag: 'US',
    established: 'December 20, 2019',
    personnel: '~9,800 Guardians + ~5,300 civilians',
    budget: '$29.4B (FY2025 request)',
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
    description: 'The United States Space Force (USSF) is the space service branch of the U.S. Armed Forces, one of the eight uniformed services, and the world\'s first and currently only independent space force. Established on December 20, 2019, the USSF organizes, trains, and equips space forces to protect U.S. and allied interests in space and to provide space capabilities to the joint force. The FY2025 budget request of $29.4 billion reflects growing emphasis on space as a warfighting domain.',
    fieldCommands: [
      'Space Operations Command (SpOC) \u2014 Peterson SFB, CO',
      'Space Systems Command (SSC) \u2014 Los Angeles AFB, CA',
      'Space Training and Readiness Command (STARCOM) \u2014 Peterson SFB, CO',
    ],
  },
  {
    id: 'pla-ssf',
    name: 'PLA Strategic Support Force (Aerospace Systems Dept.)',
    country: 'China',
    flag: 'CN',
    established: 'December 31, 2015 (restructured April 2024 as Information Support Force)',
    personnel: '~150,000 (estimated, includes cyber/electronic)',
    budget: 'Classified (~$15B estimated space portion)',
    budgetYear: '2024',
    parentService: "People's Liberation Army",
    commander: 'Lt. Gen. J\u00FC Qiansheng (Information Support Force)',
    headquarters: 'Beijing, China',
    keyPrograms: [
      'Beidou-3 Navigation Constellation (BDS)',
      'Yaogan reconnaissance satellite series',
      'Shiyan (experimental) technology demonstration',
      'Tianlian data relay satellite system',
      'Kuaizhou rapid-launch SLV',
      'SC-19 / DN-3 ASAT interceptors',
      'Shijian co-orbital inspection satellites',
    ],
    description: 'China\'s military space capabilities were consolidated under the PLA Strategic Support Force (SSF) in 2015, combining space, cyber, and electronic warfare missions. In April 2024, the SSF was restructured: space operations transferred to a new Information Support Force directly under the CMC. China operates the second-largest military satellite constellation and has demonstrated kinetic ASAT, co-orbital inspection, and directed-energy capabilities. Beidou-3 provides global PNT independent of GPS.',
    fieldCommands: [
      'Xichang Satellite Launch Center \u2014 Sichuan Province',
      'Jiuquan Satellite Launch Center \u2014 Inner Mongolia',
      'Taiyuan Satellite Launch Center \u2014 Shanxi Province',
      'Wenchang Space Launch Site \u2014 Hainan Province',
    ],
  },
  {
    id: 'russia-vks',
    name: 'Russian Aerospace Forces (VKS) \u2014 Space Troops',
    country: 'Russia',
    flag: 'RU',
    established: 'August 1, 2015 (Space Troops since 2001)',
    personnel: '~50,000 (Space Troops component)',
    budget: '~$3.5B estimated (from total defense ~$65B)',
    budgetYear: '2024',
    parentService: 'Russian Aerospace Forces (VKS)',
    commander: 'Col. Gen. Viktor Afzalov (VKS Commander-in-Chief)',
    headquarters: 'Moscow, Russia',
    keyPrograms: [
      'GLONASS navigation constellation',
      'Tundra/EKS missile warning satellites',
      'Liana SIGINT/ELINT constellation (Pion/Lotos)',
      'Nudol PL-19 direct-ascent ASAT',
      'Cosmos RPO/inspection satellites',
      'Angara launch vehicle family',
      'Sfera broadband constellation (planned)',
    ],
    description: 'The Russian Space Troops are a branch of the Russian Aerospace Forces (VKS) responsible for space launch, satellite operations, space surveillance, and ballistic missile early warning. Russia maintains GLONASS for global navigation, operates early-warning satellites, and has demonstrated both direct-ascent ASAT (Nudol, tested Nov 2021 against Cosmos 1408) and rendezvous/proximity operations. Budget constraints have slowed modernization, but Russia maintains significant legacy capabilities.',
    fieldCommands: [
      'Plesetsk Cosmodrome \u2014 Arkhangelsk Oblast',
      'Titov Main Space Testing Center \u2014 Krasnoznamenka',
      'Vostochny Cosmodrome \u2014 Amur Oblast',
    ],
  },
  {
    id: 'france-cde',
    name: 'French Space Command (Commandement de l\'Espace)',
    country: 'France',
    flag: 'FR',
    established: 'September 3, 2019',
    personnel: '~500 (growing to ~1,000 by 2030)',
    budget: '\u20AC3.6B (2019-2025 Military Programming Law allocation)',
    budgetYear: '2024',
    parentService: 'French Air and Space Force',
    commander: 'G\u00E9n\u00E9ral de brigade a\u00E9rienne Philippe Adam',
    headquarters: 'Toulouse, France',
    keyPrograms: [
      'CERES SIGINT constellation (3 satellites)',
      'CSO optical reconnaissance (3 satellites)',
      'Syracuse IV SATCOM (2 launched)',
      'GRAVES space surveillance radar',
      'GEOTracker telescope network',
      'YODA in-orbit defense demonstrator',
      'IRIS next-gen space domain awareness',
    ],
    description: 'France established a dedicated Space Command in September 2019, becoming the first European country with an independent military space organization. Operating under the renamed Air and Space Force, the CDE is responsible for space defense strategy including active defense measures. France has invested in the YODA program for in-orbit maneuvering and protection capabilities. The CSO and CERES constellations provide high-resolution imagery and SIGINT.',
    fieldCommands: [
      'Centre National d\'\u00C9tudes Spatiales (CNES) \u2014 Toulouse',
      'Centre Op\u00E9rationnel de Surveillance Militaire des Objets Spatiaux \u2014 Mont Verdun',
      'Guiana Space Centre (CSG) \u2014 Kourou, French Guiana',
    ],
  },
  {
    id: 'uk-space-command',
    name: 'UK Space Command',
    country: 'United Kingdom',
    flag: 'GB',
    established: 'April 1, 2021',
    personnel: '~700 (growing)',
    budget: '\u00A31.4B (2022-2032 UK Space Defence Strategy)',
    budgetYear: '2024',
    parentService: 'Joint command (RAF lead)',
    commander: 'Air Vice-Marshal Paul Mayall',
    headquarters: 'RAF High Wycombe, Buckinghamshire',
    keyPrograms: [
      'Skynet 6 military SATCOM',
      'OneWeb LEO broadband (govt stake)',
      'ISTARI sovereign SSA capability',
      'Tyche SSA sensor programme',
      'Minerva SSA operations center',
      'Space Operations Centre (SpOC UK)',
    ],
    description: 'UK Space Command was established to lead joint military space operations, integrating capabilities from all three armed services. The UK holds a strategic stake in OneWeb and is developing Skynet 6 as the next generation of military communications satellites. The ISTARI program aims to deliver a sovereign space surveillance and tracking capability. The UK is a founding member of the Combined Space Operations initiative.',
  },
  {
    id: 'japan-sog',
    name: 'Japan Space Operations Group',
    country: 'Japan',
    flag: 'JP',
    established: 'May 18, 2020',
    personnel: '~100 (growing to 200+)',
    budget: '\u00A5804B (~$5.5B, 2024 space-related defense budget)',
    budgetYear: 'FY2024',
    parentService: 'Japan Air Self-Defense Force',
    commander: 'Classified (under JASDF Chief of Staff)',
    headquarters: 'Fuchu Air Base, Tokyo',
    keyPrograms: [
      'Quasi-Zenith Satellite System (QZSS/Michibiki)',
      'X-band defense SATCOM (Kirameki)',
      'SSA satellite (collaboration with USSF)',
      'Information Gathering Satellites (IGS)',
      'Deep Space Radar (planned)',
      'HGV tracking satellite constellation (planned)',
    ],
    description: 'Japan established a Space Operations Group within the JASDF in 2020, reflecting growing concern over the space domain \u2014 particularly Chinese and North Korean threats. Japan operates QZSS for regional PNT enhancement and IGS reconnaissance satellites. The 2022 National Security Strategy significantly increased space defense spending, with plans for a hypersonic glide vehicle tracking satellite constellation and enhanced SSA cooperation with the US.',
  },
  {
    id: 'india-dsa',
    name: 'Defence Space Agency (DSA)',
    country: 'India',
    flag: 'IN',
    established: 'April 2019',
    personnel: '~200 (tri-service)',
    budget: '~$2B (estimated, space-related defense)',
    budgetYear: '2024',
    parentService: 'Tri-service joint agency under CDS',
    commander: 'Air Vice-Marshal SP Dharkar',
    headquarters: 'Bengaluru, India',
    keyPrograms: [
      'GSAT-7/7A military SATCOM',
      'RISAT radar imaging constellation',
      'NavIC/IRNSS regional navigation (7 satellites)',
      'Mission Shakti ASAT capability (tested 2019)',
      'Defence Space Research Agency (DSRO)',
      'Electronic intelligence satellites',
      'NETRA space situational awareness',
    ],
    description: 'India\'s Defence Space Agency was established in 2019 as a tri-service organization to handle space warfare and satellite-based defense needs. India demonstrated ASAT capability with Mission Shakti in March 2019, destroying a satellite in LEO. ISRO and DSRO collaborate on military applications including GSAT-7 naval SATCOM, RISAT synthetic aperture radar, and the NavIC regional navigation system. India is expanding its space domain awareness capabilities.',
  },
  {
    id: 'germany-weltraum',
    name: 'German Space Command (Weltraumkommando)',
    country: 'Germany',
    flag: 'DE',
    established: 'July 13, 2021',
    personnel: '~80 (planned growth to 200+)',
    budget: '~\u20AC500M (from Bundeswehr space activities)',
    budgetYear: '2024',
    parentService: 'Bundeswehr (German Armed Forces)',
    commander: 'Brig. Gen. Michael Traut',
    headquarters: 'Air Operations Centre, Uedem',
    keyPrograms: [
      'SARah radar reconnaissance constellation (3 satellites)',
      'Georg space domain awareness system',
      'SatCom BW Stufe 3 (next-gen MILSATCOM)',
      'LisaPathfinder contribution',
      'EU SST/Space Surveillance contribution',
      'FCAS remote carrier support',
    ],
    description: 'Germany established its Weltraumkommando (Space Command) in July 2021 within the Bundeswehr to centralize military space operations. Germany operates the SARah constellation of SAR reconnaissance satellites (replacing SAR-Lupe) and contributes to EU Space Surveillance and Tracking. The command coordinates SSA data and supports NATO space operations from the Combined Air Operations Centre in Uedem.',
  },
  {
    id: 'australia-dsc',
    name: 'Defence Space Command (Australia)',
    country: 'Australia',
    flag: 'AU',
    established: 'January 18, 2022',
    personnel: '~400 (tri-service)',
    budget: 'A$2.2B (2024-2034 Integrated Investment Program)',
    budgetYear: '2024',
    parentService: 'Australian Defence Force (RAAF lead)',
    commander: 'Air Vice-Marshal Catherine Roberts',
    headquarters: 'RAAF Base Edinburgh, South Australia',
    keyPrograms: [
      'JP 9102 Satellite Communications (MILSATCOM)',
      'JP 9360 Space Domain Awareness',
      'DEF 799 SSA sensors and C2',
      'Buccaneer LEO SSA pathfinder',
      'C-Band Space Surveillance Radar',
      'AUKUS space cooperation',
    ],
    description: 'Australia\'s Defence Space Command was established in January 2022, reflecting the growing importance of space in the Indo-Pacific region. Australia operates C-band space surveillance radar at Exmouth and contributes to the US Space Surveillance Network. Under AUKUS Pillar 2, Australia is expanding space cooperation with the US and UK on deep-space SSA, resilient SATCOM, and space domain awareness capabilities.',
  },
  {
    id: 'south-korea-scc',
    name: 'Space Operations Center (South Korea)',
    country: 'South Korea',
    flag: 'KR',
    established: 'December 2024 (Space Operations Command planned)',
    personnel: '~100 (initial cadre)',
    budget: '\u20A91.3T (~$950M, space defense related)',
    budgetYear: '2024',
    parentService: 'Republic of Korea Air Force',
    commander: 'Under ROKAF Chief of Staff',
    headquarters: 'Osan Air Base, Gyeonggi Province',
    keyPrograms: [
      'KASS Korean Augmentation System',
      'Baekdu surveillance satellite constellation (5 SAR)',
      'Next-gen military communications satellites',
      '425 Project reconnaissance satellite program',
      'Korea Positioning System (KPS, planned 2035)',
      'SSA radar/optical sensors',
    ],
    description: 'South Korea has accelerated space defense capabilities in response to North Korean missile and space threats. The 425 Project is building an indigenous SAR/EO reconnaissance satellite constellation. Korea plans to establish a dedicated Space Operations Command, announced in late 2024, to centralize military space operations. South Korea cooperates closely with the US on SSA and missile warning, and is developing the KPS for regional PNT independence.',
  },
];

const FALLBACK_DEFENSE_PROGRAMS: DefenseProgram[] = [
  {
    id: 'gps-iii',
    name: 'GPS III / IIIF',
    abbreviation: 'GPS III',
    agency: 'USSF / Space Systems Command',
    contractor: 'Lockheed Martin',
    status: 'production',
    category: 'navigation',
    budget: '$7.2B (GPS IIIF block, 22 satellites)',
    description: 'GPS III provides 3x better accuracy and 8x improved anti-jamming capability over GPS IIF. GPS IIIF (Follow-on, SV11-32) adds regional military protection, search-and-rescue payload, and a new laser retroreflector array. 6 GPS III SV launched to date; IIIF first launch expected 2027.',
    nextMilestone: 'GPS IIIF SV11 first launch \u2014 2027',
    constellation: '31 operational + new GPS III/IIIF replacing legacy Block IIR/IIF',
  },
  {
    id: 'next-gen-opir',
    name: 'Next-Generation Overhead Persistent Infrared',
    abbreviation: 'Next-Gen OPIR',
    agency: 'USSF / Space Systems Command',
    contractor: 'Lockheed Martin (GEO), Northrop Grumman (Polar)',
    status: 'development',
    category: 'missile_warning',
    budget: '$14.4B (total program)',
    description: 'Next-Gen OPIR replaces the legacy SBIRS missile warning constellation with more resilient, higher-capacity infrared sensors. The system comprises 3 GEO satellites (Lockheed Martin) and 2 polar-orbiting satellites (Northrop Grumman) to provide global persistent missile warning and tracking. Critical for detecting hypersonic and ballistic missile threats.',
    nextMilestone: 'GEO-1 launch \u2014 late 2025',
    constellation: '3 GEO + 2 Polar',
  },
  {
    id: 'sbirs',
    name: 'Space Based Infrared System',
    abbreviation: 'SBIRS',
    agency: 'USSF / Space Systems Command',
    contractor: 'Lockheed Martin',
    status: 'operational',
    category: 'missile_warning',
    budget: 'Sustainment',
    description: 'SBIRS provides global missile warning, missile defense, and battlespace characterization through a constellation of GEO and HEO payloads. All 6 GEO satellites and 4 HEO payloads are operational, being replaced by Next-Gen OPIR. SBIRS detects ballistic missile launches globally within seconds, providing critical warning to NORAD and USSTRATCOM.',
    constellation: '6 GEO + 4 HEO payloads',
  },
  {
    id: 'aehf-ess',
    name: 'Advanced EHF / Evolved Strategic SATCOM',
    abbreviation: 'AEHF / ESS',
    agency: 'USSF / Space Systems Command',
    contractor: 'Lockheed Martin (AEHF), Northrop Grumman (ESS)',
    status: 'development',
    category: 'communications',
    budget: '$8.9B (ESS program)',
    description: 'AEHF provides protected, jam-resistant communications for strategic command and control, including nuclear C3. 6 AEHF satellites are operational. Evolved Strategic SATCOM (ESS) is the next-gen replacement, featuring higher data rates, improved anti-jam, and cyber-hardened architecture to maintain nuclear command and control survivability.',
    nextMilestone: 'ESS first launch \u2014 ~2029',
    constellation: '6 AEHF operational, 3+ ESS planned',
  },
  {
    id: 'wgs',
    name: 'Wideband Global SATCOM',
    abbreviation: 'WGS',
    agency: 'USSF / Space Systems Command',
    contractor: 'Boeing',
    status: 'production',
    category: 'communications',
    budget: '$590M (WGS-11+)',
    description: 'WGS provides high-capacity wideband communications for DoD, allied nations, and the intelligence community. Each WGS satellite provides more bandwidth than the entire DSCS constellation it replaced. WGS-11+ features digital channelizers and enhanced cyber resilience. 10 satellites operational, with WGS-11 in production.',
    nextMilestone: 'WGS-11 launch \u2014 2027',
    constellation: '10 operational GEO satellites',
  },
  {
    id: 'sda-transport',
    name: 'SDA Proliferated Warfighter Space Architecture \u2014 Transport Layer',
    abbreviation: 'SDA Transport',
    agency: 'Space Development Agency',
    contractor: 'York Space Systems, Lockheed Martin (Tranche 0/1); L3Harris, Northrop Grumman (Tranche 2)',
    status: 'production',
    category: 'sda',
    budget: '$4.5B+ (all tranches)',
    description: 'The SDA Transport Layer provides resilient, low-latency data transport via interconnected LEO satellites with optical inter-satellite links (OISL). Tranche 0 (28 satellites) launched 2023-2024 and is operational. Tranche 1 (126 satellites) launching 2024-2025. Tranche 2 (~200 satellites) awarded for delivery 2027. This mesh network is designed to be resilient against adversary attacks through proliferation.',
    nextMilestone: 'Tranche 1 constellation completion \u2014 2025',
    constellation: '28 T0 + 126 T1 + ~200 T2 (LEO)',
  },
  {
    id: 'sda-tracking',
    name: 'SDA Proliferated Warfighter Space Architecture \u2014 Tracking Layer',
    abbreviation: 'SDA Tracking',
    agency: 'Space Development Agency',
    contractor: 'L3Harris, SpaceX (Tranche 0); Northrop Grumman, L3Harris (Tranche 1)',
    status: 'production',
    category: 'sda',
    budget: '$3.2B+ (all tranches)',
    description: 'The SDA Tracking Layer provides overhead persistent infrared missile warning/tracking from LEO, complementing the GEO-based Next-Gen OPIR. Designed to detect and track advanced missile threats including hypersonic glide vehicles. Tranche 0 (8 satellites) launched 2024. Tranche 1 (36 satellites) launching 2025-2026. Feeds data to the Transport Layer for rapid fire control.',
    nextMilestone: 'Tranche 1 first launches \u2014 2025',
    constellation: '8 T0 + 36 T1 (LEO)',
  },
  {
    id: 'sda-custody',
    name: 'SDA Custody Layer',
    abbreviation: 'SDA Custody',
    agency: 'Space Development Agency',
    contractor: 'Raytheon, Millennium Space Systems',
    status: 'development',
    category: 'sda',
    budget: '~$700M (initial tranche)',
    description: 'The Custody Layer maintains persistent tracking and custody of time-sensitive targets (especially mobile missile launchers and HGVs) through medium-FOV sensors. It bridges the gap between wide-area search and engagement-quality tracking. Designed to work with JADC2 and integrated with Transport and Tracking layers for rapid targeting.',
    nextMilestone: 'First Custody Layer satellites \u2014 2027',
  },
  {
    id: 'nssl',
    name: 'National Security Space Launch',
    abbreviation: 'NSSL',
    agency: 'USSF / Space Systems Command',
    contractor: 'SpaceX (Falcon 9/Heavy), ULA (Vulcan/Atlas V), Blue Origin (New Glenn \u2014 Phase 3)',
    status: 'operational',
    category: 'launch',
    budget: '$5.6B (Phase 2 awards, FY2025-2029)',
    description: 'NSSL ensures assured access to space for the most critical national security payloads. Phase 2 split launches 60/40 between ULA and SpaceX. Phase 3 (Lane 1 for smaller payloads) added Rocket Lab, Firefly, and Stoke Space alongside SpaceX. Blue Origin\'s New Glenn is entering NSSL certification. NSSL supports launches from CCSFS, VSFB, and Wallops.',
    nextMilestone: 'Vulcan NSSL certification \u2014 2025',
  },
  {
    id: 'gssap',
    name: 'Geosynchronous Space Situational Awareness Program',
    abbreviation: 'GSSAP',
    agency: 'USSF / Space Operations Command',
    contractor: 'Orbital ATK / Northrop Grumman',
    status: 'operational',
    category: 'surveillance',
    budget: 'Classified',
    description: 'GSSAP satellites operate in near-geosynchronous orbit to provide space domain awareness of the GEO belt. These satellites perform rendezvous and proximity operations (RPO) to characterize resident space objects and assess threats. At least 6 satellites are believed to be operational. Publicly acknowledged but mission details classified.',
    constellation: '6+ satellites in near-GEO',
  },
  {
    id: 'silentbarker',
    name: 'SILENTBARKER / NROL-107',
    abbreviation: 'SILENTBARKER',
    agency: 'NRO / USSF',
    contractor: 'Northrop Grumman',
    status: 'operational',
    category: 'surveillance',
    budget: 'Classified',
    description: 'SILENTBARKER (NROL-107) is a next-generation space domain awareness mission launched in September 2023 on a ULA Atlas V from CCSFS. The satellite is believed to detect, track, and characterize threats in the GEO belt with greater capability than GSSAP. Details remain highly classified; it is the first publicly named NRO/USSF joint SDA mission.',
    nextMilestone: 'Possible follow-on missions classified',
  },
  {
    id: 'muos',
    name: 'Mobile User Objective System',
    abbreviation: 'MUOS',
    agency: 'U.S. Navy / USSF',
    contractor: 'Lockheed Martin',
    status: 'operational',
    category: 'communications',
    budget: 'Sustainment (~$300M/yr)',
    description: 'MUOS provides narrowband tactical mobile SATCOM for the DoD, replacing the UFO constellation. Five MUOS satellites use Wideband Code Division Multiple Access (WCDMA) to deliver 3G-like smartphone capabilities to warfighters globally. Supports beyond-line-of-sight communications for dismounted troops, UAVs, ships, and vehicles.',
    constellation: '5 GEO (4 operational + 1 spare)',
  },
  {
    id: 'space-fence',
    name: 'Space Fence',
    abbreviation: 'Space Fence',
    agency: 'USSF / Space Operations Command',
    contractor: 'Lockheed Martin',
    status: 'operational',
    category: 'ground',
    budget: '$1.5B (development + initial operations)',
    description: 'Space Fence is an S-band ground-based radar on Kwajalein Atoll in the Marshall Islands that provides uncued detection and tracking of objects in LEO and MEO. It can detect objects as small as 10 cm, dramatically increasing the space object catalog. Space Fence processes ~1.5 million observations per day and achieved IOC in March 2020.',
  },
  {
    id: 'egs',
    name: 'Enterprise Ground Services',
    abbreviation: 'EGS',
    agency: 'USSF / Space Systems Command',
    contractor: 'Raytheon Technologies',
    status: 'development',
    category: 'ground',
    budget: '$3.5B',
    description: 'EGS modernizes the satellite ground control architecture by replacing legacy, stovepiped ground systems with a common, cloud-native, modular framework. It will provide a unified interface for commanding and controlling GPS, AEHF, SBIRS/OPIR, and other constellations. The serviceability-oriented architecture enables rapid software updates and integration of new capabilities.',
    nextMilestone: 'GPS OCX Block 3F \u2014 2026',
  },
  {
    id: 'skynet-6',
    name: 'Skynet 6',
    abbreviation: 'Skynet 6',
    agency: 'UK Ministry of Defence',
    contractor: 'Airbus Defence & Space',
    status: 'development',
    category: 'communications',
    budget: '\u00A36B (full programme, including ground)',
    description: 'Skynet 6 is the UK\'s next-generation military SATCOM system, replacing the Skynet 5 constellation. It includes Skynet 6A (GEO, built by Airbus) and leverages commercial/LEO augmentation for resilience. The program integrates ground segment modernization and anti-jamming enhancements to maintain sovereign UK and allied MILSATCOM through the 2040s.',
    nextMilestone: 'Skynet 6A launch \u2014 2025',
  },
  {
    id: 'cso',
    name: 'Composante Spatiale Optique',
    abbreviation: 'CSO',
    agency: 'French DGA / CNES',
    contractor: 'Airbus Defence & Space',
    status: 'operational',
    category: 'surveillance',
    budget: '\u20AC3.6B (programme)',
    description: 'CSO is France\'s next-generation military optical reconnaissance satellite system, replacing Helios 2. Three satellites launched (CSO-1 2018, CSO-2 2020, CSO-3 2023) in different orbits provide very high resolution imagery (20cm class), identification, and wide-area mapping. CSO data is shared with partner nations (Germany, Belgium, Sweden) under bilateral agreements.',
    constellation: '3 satellites (SSO and lower inclination)',
  },
  {
    id: 'sarah',
    name: 'SARah Radar Reconnaissance',
    abbreviation: 'SARah',
    agency: 'German BAAINBw',
    contractor: 'Airbus Defence & Space (reflector), OHB (phased array)',
    status: 'operational',
    category: 'surveillance',
    budget: '\u20AC816M',
    description: 'SARah is Germany\'s second-generation radar reconnaissance satellite system, replacing SAR-Lupe. It comprises 3 satellites: 1 with a large deployable reflector antenna (SARah-1, Airbus) and 2 with phased array antennas (SARah-2/3, OHB). SARah provides all-weather, day-night synthetic aperture radar imagery at sub-meter resolution for the Bundeswehr.',
    constellation: '3 SAR satellites',
  },
  {
    id: 'ceres',
    name: 'CERES SIGINT Constellation',
    abbreviation: 'CERES',
    agency: 'French DGA / CNES',
    contractor: 'Airbus Defence & Space / Thales',
    status: 'operational',
    category: 'surveillance',
    budget: '~\u20AC450M',
    description: 'Capacit\u00E9 de Renseignement \u00C9lectromagn\u00E9tique Spatiale (CERES) is France\'s first dedicated SIGINT satellite system, launched November 2021. Three satellites fly in formation to geolocate and characterize electromagnetic emitters (radars, communications) from space. CERES replaced the older ELISA demonstrator system and significantly enhances French electronic intelligence capabilities.',
    constellation: '3 satellites (formation flying)',
  },
  {
    id: 'syracuse-iv',
    name: 'Syracuse IV Military SATCOM',
    abbreviation: 'Syracuse IV',
    agency: 'French DGA / CNES',
    contractor: 'Thales Alenia Space',
    status: 'operational',
    category: 'communications',
    budget: '~\u20AC3.8B (full programme)',
    description: 'Syracuse IV is France\'s next-generation military communications satellite system. Two satellites launched (Syracuse 4A in 2021, 4B in 2023) provide jam-resistant, high-bandwidth communications for French forces and allies. Features flexible digital payloads, anti-jamming, and cybersecurity improvements over Syracuse III. Supports NATO SATCOM interoperability.',
    constellation: '2 GEO satellites',
  },
  {
    id: 'kirameki',
    name: 'X-Band Defense Communication (Kirameki)',
    abbreviation: 'Kirameki',
    agency: 'Japan MOD',
    contractor: 'DSN Corporation / NEC / Mitsubishi Electric',
    status: 'operational',
    category: 'communications',
    budget: '~\u00A5250B (~$1.7B)',
    description: 'Kirameki is Japan\'s first dedicated military communications satellite system, with Kirameki-1 (2017) and Kirameki-2 (2017) providing X-band SATCOM for the JSDF. A third satellite is planned. The system replaced reliance on commercial SATCOM and provides secure, jam-resistant communications for ground, maritime, and air self-defense forces.',
    constellation: '2 GEO satellites (3rd planned)',
  },
  {
    id: 'gsat-7',
    name: 'GSAT-7 Series Military SATCOM',
    abbreviation: 'GSAT-7',
    agency: 'Indian MOD / ISRO',
    contractor: 'ISRO',
    status: 'operational',
    category: 'communications',
    budget: '~$310M (total series)',
    description: 'India\'s GSAT-7 series provides dedicated military communications. GSAT-7 (Rukmini, 2013) serves the Indian Navy with UHF/S/C/Ku-band coverage across the Indian Ocean. GSAT-7A (2018) serves the Indian Air Force. GSAT-7B/C are planned for the Indian Army and tri-service use. These represent India\'s first indigenous MILSATCOM capability.',
    constellation: '2 operational GEO, 2 planned',
  },
  {
    id: 'qzss',
    name: 'Quasi-Zenith Satellite System (Michibiki)',
    abbreviation: 'QZSS',
    agency: 'Japan Cabinet Office / MOD',
    contractor: 'Mitsubishi Electric',
    status: 'operational',
    category: 'navigation',
    budget: '~\u00A5300B (~$2B)',
    description: 'QZSS is a regional satellite navigation system providing GPS augmentation with centimeter-level accuracy over Japan and the Asia-Oceania region. 4 satellites are operational (1 GEO + 3 quasi-zenith), expanding to 7 by 2026. While primarily civilian, QZSS provides military-grade authentication signals and serves as a GPS backup for JSDF operations in the Indo-Pacific.',
    nextMilestone: 'Expansion to 7 satellites \u2014 2026',
    constellation: '4 operational (1 GEO + 3 QZO), expanding to 7',
  },
];

const FALLBACK_RECENT_CONTRACTS: ContractAward[] = [
  {
    id: 'nssl-phase2-spacex',
    title: 'National Security Space Launch Phase 2 \u2014 Lane 1',
    contractor: 'SpaceX',
    value: '$5.6B (60% of Phase 2)',
    awardDate: 'August 2020',
    agency: 'USSF / Space Systems Command',
    category: 'Launch Services',
    description: 'SpaceX was awarded ~60% of NSSL Phase 2 launch service agreements for FY2022-2027. Covers approximately 40 national security missions using Falcon 9, Falcon Heavy, and potentially Starship. Largest launch contract in USSF history.',
    period: 'FY2022-2027',
  },
  {
    id: 'nssl-phase2-ula',
    title: 'National Security Space Launch Phase 2 \u2014 Lane 1',
    contractor: 'United Launch Alliance (ULA)',
    value: '$3.1B (40% of Phase 2)',
    awardDate: 'August 2020',
    agency: 'USSF / Space Systems Command',
    category: 'Launch Services',
    description: 'ULA was awarded ~40% of NSSL Phase 2 launch service agreements using Atlas V and Vulcan Centaur. Vulcan must complete certification flights before assuming NSSL missions from Atlas V, which is being retired after remaining orders.',
    period: 'FY2022-2027',
  },
  {
    id: 'next-gen-opir-geo',
    title: 'Next-Gen OPIR GEO Satellites (3 units)',
    contractor: 'Lockheed Martin',
    value: '$4.9B',
    awardDate: 'March 2021',
    agency: 'USSF / Space Systems Command',
    category: 'Missile Warning',
    description: 'Contract for three Next-Gen OPIR GEO satellites to replace SBIRS. Each satellite features improved infrared sensors for detecting advanced threats including hypersonic weapons. Builds on Lockheed Martin\'s heritage with SBIRS GEO satellites.',
    period: '2021-2030',
  },
  {
    id: 'next-gen-opir-polar',
    title: 'Next-Gen OPIR Polar Satellites (2 units)',
    contractor: 'Northrop Grumman',
    value: '$2.9B',
    awardDate: 'June 2021',
    agency: 'USSF / Space Systems Command',
    category: 'Missile Warning',
    description: 'Contract for two Next-Gen OPIR Polar satellites providing missile warning and tracking from highly elliptical orbits (HEO). Replaces SBIRS HEO payloads with dedicated, more capable satellites for Arctic and northern hemisphere coverage.',
    period: '2021-2029',
  },
  {
    id: 'gps-iiif',
    title: 'GPS IIIF Follow-On Production (22 satellites)',
    contractor: 'Lockheed Martin',
    value: '$7.2B',
    awardDate: 'September 2018 (initial) + modifications',
    agency: 'USSF / Space Systems Command',
    category: 'Navigation',
    description: 'Production of 22 GPS IIIF satellites (SV11-32) with enhanced capabilities including Regional Military Protection (RMP), search-and-rescue payload, and laser retroreflector arrays. Represents the final modernization of the GPS constellation.',
    period: '2018-2035',
  },
  {
    id: 'sda-tranche2-transport',
    title: 'SDA Tranche 2 Transport Layer (72 satellites)',
    contractor: 'Northrop Grumman',
    value: '$732M',
    awardDate: 'February 2024',
    agency: 'Space Development Agency',
    category: 'SDA / Proliferated Architecture',
    description: 'Award for 72 Tranche 2 Transport Layer Beta satellites with optical inter-satellite links for the Proliferated Warfighter Space Architecture mesh network. Part of the ongoing effort to build a resilient, redundant data transport constellation in LEO.',
    period: '2024-2027',
  },
  {
    id: 'sda-tranche2-transport-l3',
    title: 'SDA Tranche 2 Transport Layer (36 satellites)',
    contractor: 'L3Harris Technologies',
    value: '$559M',
    awardDate: 'February 2024',
    agency: 'Space Development Agency',
    category: 'SDA / Proliferated Architecture',
    description: 'Award for 36 Tranche 2 Transport Layer Alpha satellites. Together with the Northrop Grumman award, completes the Tranche 2 transport layer procurement providing military mesh network communications in LEO.',
    period: '2024-2027',
  },
  {
    id: 'sda-tranche1-tracking',
    title: 'SDA Tranche 1 Tracking Layer (14 satellites)',
    contractor: 'L3Harris Technologies',
    value: '$700M',
    awardDate: 'October 2023',
    agency: 'Space Development Agency',
    category: 'Missile Warning / Tracking',
    description: 'Contract for 14 overhead persistent infrared wide-FOV satellites for hypersonic and ballistic missile tracking from LEO. Part of the Proliferated Warfighter Space Architecture designed to detect and track advanced missile threats.',
    period: '2023-2026',
  },
  {
    id: 'wgs-11',
    title: 'WGS-11+ Wideband SATCOM',
    contractor: 'Boeing',
    value: '$590M',
    awardDate: 'June 2023',
    agency: 'USSF / Space Systems Command',
    category: 'Communications',
    description: 'Contract to build WGS-11 with enhanced digital channelizer, improved cybersecurity, and greater bandwidth. Extends the wideband SATCOM constellation that provides high-data-rate communications for tactical military operations worldwide.',
    period: '2023-2028',
  },
  {
    id: 'ess-initial',
    title: 'Evolved Strategic SATCOM (ESS) Development',
    contractor: 'Northrop Grumman',
    value: '$1.3B (initial development)',
    awardDate: 'July 2023',
    agency: 'USSF / Space Systems Command',
    category: 'Strategic Communications',
    description: 'Initial development contract for the Evolved Strategic SATCOM system to replace AEHF for nuclear command, control, and communications (NC3). ESS will provide jam-resistant, cyber-hardened strategic communications with significantly higher data rates.',
    period: '2023-2030',
  },
  {
    id: 'egs-raytheon',
    title: 'Enterprise Ground Services',
    contractor: 'Raytheon Technologies',
    value: '$3.5B (lifecycle)',
    awardDate: '2018 (modified through 2024)',
    agency: 'USSF / Space Systems Command',
    category: 'Ground Systems',
    description: 'Raytheon is developing the unified, cloud-native ground control system for multiple USSF satellite constellations. EGS replaces stovepiped legacy ground systems with a modular, software-defined architecture. Initial deployment supports GPS OCX.',
    period: '2018-2030',
  },
  {
    id: 'skynet-6a-contract',
    title: 'Skynet 6A Military Communications Satellite',
    contractor: 'Airbus Defence & Space',
    value: '\u00A35B+ (total Skynet 6 programme)',
    awardDate: 'July 2022',
    agency: 'UK MOD',
    category: 'Allied MILSATCOM',
    description: 'Airbus was awarded the contract to build Skynet 6A, the first satellite in the UK\'s next-generation military communications system. The contract includes the satellite, ground segment upgrades, and service provision through the 2040s. Includes anti-jam and enhanced cybersecurity capabilities.',
    period: '2022-2040+',
  },
  {
    id: 'nssl-phase3-lane1',
    title: 'NSSL Phase 3 Lane 1 (Small to Medium Launches)',
    contractor: 'SpaceX, Rocket Lab, Firefly Aerospace, Stoke Space',
    value: '~$5.6B (total lane, multiple IDIQ awards)',
    awardDate: 'June 2024',
    agency: 'USSF / Space Systems Command',
    category: 'Launch Services',
    description: 'Phase 3 Lane 1 awarded to four providers for small-to-medium national security launches. Represents the diversification of the NSSL program beyond the traditional two-provider model. Rocket Lab (Neutron), Firefly (Alpha/MLV), and Stoke Space join SpaceX (Falcon 9).',
    period: 'FY2025-2029',
  },
  {
    id: 'gambit-anduril',
    title: 'GAMBIT Mesh Satellite System',
    contractor: 'Anduril Industries',
    value: '$432M (initial contract)',
    awardDate: 'December 2024',
    agency: 'Space Development Agency',
    category: 'SDA / Proliferated Architecture',
    description: 'Anduril was awarded a contract for its GAMBIT mesh satellite system under SDA\'s Tranche 2 architecture. GAMBIT provides software-defined satellites with reconfigurable payloads supporting tactical military communications in contested environments.',
    period: '2024-2027',
  },
  {
    id: 'palantir-titan',
    title: 'TITAN Ground Station System',
    contractor: 'Palantir Technologies',
    value: '$250M (initial)',
    awardDate: 'March 2024',
    agency: 'U.S. Army / Space',
    category: 'Ground Systems / AI',
    description: 'Palantir\'s TITAN (Tactical Intelligence Targeting Access Node) integrates space sensor data with AI/ML for targeting and intelligence. TITAN processes satellite imagery, signals intelligence, and other space-derived data to create fused intelligence products for ground forces.',
    period: '2024-2028',
  },
  {
    id: 'space-fence-ops',
    title: 'Space Fence Operations & Sustainment',
    contractor: 'Lockheed Martin',
    value: '$1.3B (lifecycle operations)',
    awardDate: 'Ongoing (initial 2015)',
    agency: 'USSF / Space Operations Command',
    category: 'Space Domain Awareness',
    description: 'Lockheed Martin operates and maintains the Space Fence S-band radar on Kwajalein Atoll. The radar detects and tracks objects as small as 10cm in LEO/MEO, processing 1.5 million observations daily. Critical for collision avoidance and threat detection.',
    period: '2015-2030+',
  },
];

const FALLBACK_COUNTERSPACE_EVENTS: CounterspaceEvent[] = [
  {
    id: 'china-fy1c-2007',
    date: 'January 11, 2007',
    nation: 'China',
    flag: 'CN',
    type: 'kinetic_asat',
    name: 'FY-1C Destruction',
    description: 'China destroyed its own FY-1C weather satellite at ~865 km altitude using a SC-19 kinetic kill vehicle launched from Xichang. This was the most debris-generating event in space history, creating ~3,500 trackable fragments. Many remain in orbit and continue to threaten operational satellites. The event prompted international condemnation and accelerated space debris mitigation discussions.',
    debrisGenerated: '~3,500 trackable fragments (>10cm), ~35,000 estimated >1cm',
    altitude: '~865 km (sun-synchronous orbit)',
    target: 'FY-1C (Fengyun-1C) weather satellite',
  },
  {
    id: 'usa-193-2008',
    date: 'February 21, 2008',
    nation: 'United States',
    flag: 'US',
    type: 'kinetic_asat',
    name: 'Operation Burnt Frost (USA-193)',
    description: 'The US destroyed the defunct NRO spy satellite USA-193 using a modified SM-3 Block IA missile fired from USS Lake Erie (CG-70) in the Pacific. Officially justified to prevent hazardous hydrazine from reaching Earth\'s surface. The satellite was struck at ~247 km altitude; most debris deorbited within weeks. Widely viewed as a demonstration of US ASAT capability.',
    debrisGenerated: '~174 trackable fragments (most deorbited within weeks)',
    altitude: '~247 km (low orbit, decay imminent)',
    target: 'USA-193 (NROL-21) reconnaissance satellite',
  },
  {
    id: 'india-shakti-2019',
    date: 'March 27, 2019',
    nation: 'India',
    flag: 'IN',
    type: 'kinetic_asat',
    name: 'Mission Shakti',
    description: 'India successfully tested an anti-satellite weapon, destroying the Microsat-R satellite at ~283 km altitude with a PDV Mark II kinetic kill vehicle launched from Abdul Kalam Island. India became the fourth nation to demonstrate ASAT capability. The relatively low altitude was chosen to minimize debris, most of which deorbited within months, though some fragments initially rose to higher altitudes.',
    debrisGenerated: '~400 trackable fragments (mostly decayed by 2020)',
    altitude: '~283 km',
    target: 'Microsat-R (69 kg test satellite)',
  },
  {
    id: 'russia-cosmos1408-2021',
    date: 'November 15, 2021',
    nation: 'Russia',
    flag: 'RU',
    type: 'kinetic_asat',
    name: 'Cosmos 1408 Destruction (Nudol ASAT)',
    description: 'Russia destroyed its own defunct Cosmos 1408 satellite (~2 tons) using a Nudol PL-19 direct-ascent interceptor. The test at ~480 km altitude created 1,500+ trackable debris fragments, forcing ISS crew to shelter in their spacecraft. The event drew strong international condemnation, including from US allies. Many fragments will remain in orbit for decades, threatening the ISS, Tiangong, and commercial constellations.',
    debrisGenerated: '~1,500 trackable fragments (multi-decade lifetime)',
    altitude: '~480 km',
    target: 'Cosmos 1408 (defunct ELINT satellite, 1982)',
  },
  {
    id: 'russia-luch-rpo-2014',
    date: 'September 2014 \u2014 ongoing',
    nation: 'Russia',
    flag: 'RU',
    type: 'rpo',
    name: 'Luch/Olymp Rendezvous Operations',
    description: 'Russia\'s Luch (Olymp) satellite has conducted repeated rendezvous and proximity operations (RPO) near Western military and commercial SATCOM satellites in GEO, including Intelsat, SES, and suspected military targets. Luch has been observed maneuvering between multiple GEO positions, likely conducting signals intelligence collection. The satellite\'s behavior prompted France to move one of its Syracuse satellites and publicly denounce the activity.',
    target: 'Multiple GEO SATCOM satellites (Intelsat, SES, military)',
  },
  {
    id: 'china-shiyan-rpo',
    date: '2010 \u2014 ongoing',
    nation: 'China',
    flag: 'CN',
    type: 'co_orbital',
    name: 'Shiyan / SJ Series Co-Orbital Operations',
    description: 'China has conducted numerous co-orbital and proximity operations using satellites in the Shiyan (Experiment) and Shijian (Practice) series. SJ-17 in GEO performed rendezvous with other Chinese satellites and has a robotic arm. SJ-21 grappled and removed a defunct BeiDou satellite from GEO in 2022. These missions demonstrate inspection, servicing, and potential offensive co-orbital ASAT capabilities.',
    target: 'Chinese and potentially foreign GEO satellites',
  },
  {
    id: 'viasat-hack-2022',
    date: 'February 24, 2022',
    nation: 'Russia',
    flag: 'RU',
    type: 'cyber',
    name: 'Viasat KA-SAT Cyberattack',
    description: 'Hours before Russia\'s invasion of Ukraine, a cyberattack attributed to Russian military intelligence (GRU) disabled Viasat\'s KA-SAT network by corrupting thousands of SurfBeam2 modem firmware via a VPN exploit. The attack disrupted Ukrainian military communications and also affected 30,000+ terminals across Europe, including German wind farm monitoring. Demonstrated that space systems can be attacked through ground infrastructure.',
    target: 'Viasat KA-SAT commercial satellite network',
  },
  {
    id: 'gps-jamming-ukraine',
    date: '2022 \u2014 ongoing',
    nation: 'Russia',
    flag: 'RU',
    type: 'electronic_warfare',
    name: 'GPS/GNSS Jamming & Spoofing (Ukraine/Baltic/Middle East)',
    description: 'Russia has conducted persistent and widespread GPS/GNSS jamming and spoofing operations in Ukraine, the Baltic states, Black Sea, and Eastern Mediterranean. Russian EW systems (Krasukha-4, Pole-21, Tirada-2) have disrupted GPS for military operations and civilian aviation. NATO allies have reported GPS outages across large areas. Spoofing attacks have relocated civilian aircraft positions by hundreds of miles on navigation displays.',
    target: 'GPS/GNSS signals (military and civilian receivers)',
  },
  {
    id: 'cosmos-2542-rpo-2020',
    date: 'January 2020',
    nation: 'Russia',
    flag: 'RU',
    type: 'rpo',
    name: 'Cosmos 2542/2543 USA-245 Shadowing',
    description: 'Russian satellite Cosmos 2542 maneuvered to shadow USA-245 (KH-11 reconnaissance satellite) in LEO. Cosmos 2542 then released a sub-satellite (Cosmos 2543) that also approached the US spy satellite. Gen. Raymond (then CSO) publicly called the behavior "unusual and disturbing." Cosmos 2543 later conducted a directed-energy or kinetic test, releasing a projectile in orbit.',
    target: 'USA-245 (KH-11 Block V reconnaissance satellite)',
  },
  {
    id: 'china-dn3-2018',
    date: 'February 5, 2018',
    nation: 'China',
    flag: 'CN',
    type: 'kinetic_asat',
    name: 'DN-3 Midcourse Interceptor Test',
    description: 'China conducted what the US assessed as a test of the DN-3 exoatmospheric kinetic interceptor, which has dual-use ballistic missile defense and ASAT capability. The test did not create debris (missed or hit a suborbital target). DN-3 is believed capable of reaching satellites in LEO and potentially MEO. China described it as a "ballistic missile defense test."',
    altitude: 'Exoatmospheric (specific altitude classified)',
    target: 'Suborbital target (no orbital debris created)',
  },
  {
    id: 'iran-starlink-jamming-2024',
    date: '2024',
    nation: 'Iran',
    flag: 'IR',
    type: 'electronic_warfare',
    name: 'Iran GPS/Starlink Interference',
    description: 'Iran has been reported to interfere with GPS signals in the Persian Gulf region and has attempted to jam or interfere with Starlink signals during regional tensions. Iranian EW capabilities, while less sophisticated than Russian systems, have disrupted civilian aviation GPS in the region. Iran has also developed cyber capabilities targeting satellite ground stations.',
    target: 'GPS and commercial satellite communications',
  },
  {
    id: 'north-korea-gps-2016',
    date: 'March-April 2016',
    nation: 'North Korea',
    flag: 'KP',
    type: 'electronic_warfare',
    name: 'North Korea GPS Jamming Campaign',
    description: 'North Korea conducted a sustained GPS jamming campaign from locations near the DMZ that disrupted GPS signals across the Seoul metropolitan area and at Incheon International Airport. Over 1,100 aircraft and 700 ships reported GPS disruptions. The jamming used truck-mounted systems with power levels sufficient to affect receivers at 100+ km range. South Korea deployed GPS backup systems in response.',
    target: 'GPS receivers in South Korea (military and civilian)',
  },
];

const FALLBACK_ALLIANCES: Alliance[] = [
  {
    id: 'cspo',
    name: 'Combined Space Operations Initiative',
    abbreviation: 'CSpO',
    established: '2014',
    members: ['United States', 'United Kingdom', 'Australia', 'Canada', 'New Zealand', 'France', 'Germany'],
    description: 'CSpO is a multinational initiative to improve space operations cooperation among allied nations. It focuses on sharing SSA data, coordinating space operations, and developing collective space defense strategies. CSpO has grown from the original Five Eyes nations to include France and Germany, reflecting the expanding recognition of space as a coalition warfighting domain.',
    keyActivities: [
      'Unified space tasking and SSA data sharing',
      'Combined Space Operations Center (CSpOC) at Vandenberg SFB',
      'Multinational space exercises (e.g., Global Sentinel)',
      'Shared space domain awareness architecture',
      'Interoperable space C2 protocols',
    ],
    headquarters: 'Vandenberg SFB, California',
  },
  {
    id: 'five-eyes-space',
    name: 'Five Eyes Space Cooperation',
    abbreviation: 'FVEY Space',
    established: '1946 (UKUSA Agreement; space cooperation formalized 2010s)',
    members: ['United States', 'United Kingdom', 'Australia', 'Canada', 'New Zealand'],
    description: 'The Five Eyes intelligence alliance (UKUSA) extends to space intelligence sharing, including SSA data, SIGINT collection from space, and overhead imagery cooperation. Five Eyes nations share satellite reconnaissance products, contribute ground-based SSA sensors to a shared picture, and coordinate signals intelligence satellite operations.',
    keyActivities: [
      'Shared access to NRO/GCHQ/ASD satellite imagery',
      'SSA data sharing via Five Eyes Surveillance Network',
      'Joint SIGINT satellite operations coordination',
      'Ground-based radar/telescope contributions to shared SSA',
      'Intelligence assessments on counterspace threats',
    ],
  },
  {
    id: 'nato-space-centre',
    name: 'NATO Space Centre',
    abbreviation: 'NATO Space Centre',
    established: 'October 2020',
    members: ['All 32 NATO member states'],
    description: 'NATO recognized space as an operational domain in December 2019 and established the NATO Space Centre at Allied Air Command (AIRCOM) in Ramstein, Germany in 2020. The Centre coordinates space support to NATO operations, integrates space effects into allied planning, and serves as a hub for space domain awareness. NATO does not own space assets but coordinates member nations\' capabilities.',
    keyActivities: [
      'Space domain awareness coordination for NATO operations',
      'Space support to NATO Mission and Joint Operations',
      'Counterspace threat assessment and warning',
      'NATO space policy and doctrine development',
      'Annual Space exercises (Astro Fighter, AsterX participation)',
      'Integration with SACEUR planning processes',
    ],
    headquarters: 'Allied Air Command, Ramstein, Germany',
  },
  {
    id: 'aukus-space',
    name: 'AUKUS Pillar II \u2014 Space Cooperation',
    abbreviation: 'AUKUS',
    established: 'September 2021',
    members: ['Australia', 'United Kingdom', 'United States'],
    description: 'AUKUS Pillar II includes advanced space capabilities as a key area of trilateral cooperation. The three nations are collaborating on deep space SSA, resilient satellite communications, space-based hypersonic missile tracking, and space domain awareness. AUKUS space cooperation builds on existing Five Eyes and CSpO relationships with a focus on Indo-Pacific security.',
    keyActivities: [
      'Deep Space Advanced Radar Capability (DARC)',
      'Resilient space-based PNT alternatives',
      'Shared hypersonic threat tracking from space',
      'Joint space domain awareness architecture',
      'Space industrial base cooperation',
      'AI/ML for space object characterization',
    ],
  },
  {
    id: 'quad-space',
    name: 'Quad Space Cooperation',
    abbreviation: 'Quad',
    established: '2022 (space cooperation stream)',
    members: ['United States', 'India', 'Japan', 'Australia'],
    description: 'The Quad (Quadrilateral Security Dialogue) established a space cooperation stream in 2022, focusing on SSA data sharing, space sustainability, and climate monitoring from space. The Quad Space Working Group coordinates civilian and defense-related space cooperation in the Indo-Pacific. Notable initiatives include shared SSA data to address debris and space sustainability.',
    keyActivities: [
      'SSA data sharing framework',
      'Space sustainability and debris mitigation',
      'Climate and disaster monitoring cooperation',
      'GNSS interoperability (GPS-NavIC-QZSS)',
      'Space-based maritime domain awareness',
    ],
  },
  {
    id: 'eu-sst',
    name: 'EU Space Surveillance and Tracking (EU SST)',
    abbreviation: 'EU SST',
    established: '2014 (Decision 541/2014)',
    members: ['France', 'Germany', 'Spain', 'Italy', 'Poland', 'Portugal', 'Romania', 'Netherlands', 'Czech Republic', 'Denmark', 'Finland', 'Greece', 'Latvia', 'Belgium', 'Slovakia', 'Austria', 'Sweden', 'Norway'],
    description: 'EU SST is a consortium of EU member states providing SSA services including collision avoidance warnings, re-entry predictions, and fragmentation event analysis. The consortium operates a network of ground-based radars, telescopes, and laser ranging stations. It provides free conjunction warnings to satellite operators worldwide and is a key pillar of the EU Space Programme.',
    keyActivities: [
      'Collision avoidance warnings for satellite operators',
      'Atmospheric re-entry predictions',
      'Fragmentation event detection and analysis',
      'Space object catalogue maintenance',
      'Integration with EUSPA and ESA SSA programs',
      'Public conjunction data services (SST Portal)',
    ],
    headquarters: 'EU SatCen, Torrej\u00F3n de Ardoz, Spain',
  },
  {
    id: 'olympic-defender',
    name: 'Operation Olympic Defender',
    abbreviation: 'Olympic Defender',
    established: '2018',
    members: ['United States', 'United Kingdom', 'Australia', 'Canada', 'France'],
    description: 'Operation Olympic Defender is a multinational coalition for sharing space threat intelligence, coordinating defensive space operations, and developing shared tactics. The operation was established by USSPACECOM and partner nations to synchronize efforts in space protection and defense. Participants share indicators and warnings of counterspace activities and coordinate responses to threats.',
    keyActivities: [
      'Shared counterspace threat intelligence',
      'Coordinated defensive space operations',
      'Space threat response planning and coordination',
      'Shared indications and warning (I&W)',
      'Combined space defense exercises',
    ],
  },
  {
    id: 'japan-us-space',
    name: 'Japan-US Space Security Agreement',
    abbreviation: 'Japan-US SSA',
    established: '2023 (expanded cooperation)',
    members: ['Japan', 'United States'],
    description: 'Japan and the United States significantly expanded bilateral space security cooperation through a 2023 agreement covering SSA data sharing, allied satellite protection, hypersonic missile tracking, and integration of space capabilities into the bilateral alliance. The US will station a USSF unit at a JASDF base for the first time, and the nations will co-develop space-based missile tracking capabilities.',
    keyActivities: [
      'Real-time SSA data sharing',
      'USSF unit deployed to Japan (first overseas permanent presence)',
      'Joint hypersonic glide vehicle tracking satellite development',
      'Bilateral space operations coordination',
      'QZSS-GPS interoperability enhancement',
      'Japan participation in CSpO exercises',
    ],
    headquarters: 'Yokota Air Base, Japan / Vandenberg SFB, USA',
  },
  {
    id: 'schriever-wargame',
    name: 'Schriever Space Wargame Series',
    abbreviation: 'Schriever Wargame',
    established: '2001',
    members: ['United States', 'United Kingdom', 'Australia', 'Canada', 'New Zealand', 'France', 'Germany', 'Japan', 'South Korea'],
    description: 'The Schriever Wargame (now Schriever Spacepower Series) is a biennial multinational table-top exercise focused on space operations across the full spectrum of conflict. Hosted by USSPACECOM, it explores space deterrence, crisis escalation, and military operations in contested space environments. The wargame has been instrumental in developing allied space doctrine and cooperation frameworks.',
    keyActivities: [
      'Multinational space crisis scenario exercises',
      'Space doctrine and strategy development',
      'Allied space interoperability testing',
      'Counterspace threat response wargaming',
      'Space deterrence and escalation management',
      'Academic and think-tank integration',
    ],
    headquarters: 'USSPACECOM, Colorado Springs, CO',
  },
];

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

interface LiveProcurement {
  id: string;
  title: string;
  contractor: string;
  value: string;
  awardDate: string;
  agency: string;
  category: string;
  description: string;
  period?: string;
  samUrl?: string;
  naicsCode?: string;
  naicsDescription?: string;
  type?: string;
}

const FALLBACK_LIVE_PROCUREMENT: LiveProcurement[] = [];

function HeroStats({ forceCount, programCount, contractCount, allianceCount }: {
  forceCount: number;
  programCount: number;
  contractCount: number;
  allianceCount: number;
}) {
  const stats = [
    { label: 'Space Forces', value: forceCount > 0 ? String(forceCount) : '10', sub: 'Military organizations' },
    { label: 'Defense Programs', value: programCount > 0 ? String(programCount) : '22+', sub: 'Major programs tracked' },
    { label: 'Major Contracts', value: contractCount > 0 ? String(contractCount) : '16+', sub: 'Recent awards' },
    { label: 'Allied Partnerships', value: allianceCount > 0 ? String(allianceCount) : '9', sub: 'International frameworks' },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <div className="card p-5">
            <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
            <div className="text-white font-bold text-2xl mt-1">{stat.value}</div>
            <div className="text-star-400 text-xs">{stat.sub}</div>
          </div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

function SpaceForceCard({ force }: { force: SpaceForce }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 hover:border-nebula-500/40">
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
  const statusStyle = PROGRAM_STATUS_STYLES[program.status] || DEFAULT_PROGRAM_STATUS_STYLE;
  const catStyle = CATEGORY_STYLES[program.category] || DEFAULT_CATEGORY_STYLE;

  return (
    <div className="card p-5 hover:border-nebula-500/40">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-nebula-400 font-mono font-bold text-sm">{program.abbreviation}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusStyle.bg} ${statusStyle.color}`}>
              {statusStyle.label}
            </span>
            <span className={`text-xs ${catStyle.color}`}>{catStyle.label}</span>
          </div>
          <h3 className="text-white font-semibold">{program.name}</h3>
        </div>
        {program.budget && (
          <span className="text-green-400 font-bold text-sm whitespace-nowrap ml-3">{program.budget}</span>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {program.constellation && (
          <div className="bg-slate-900/50 rounded p-2">
            <span className="text-star-500 text-xs block">Assets</span>
            <span className="text-star-200 text-sm">{program.constellation}</span>
          </div>
        )}
        {program.nextMilestone && (
          <div className="bg-slate-900/50 rounded p-2">
            <span className="text-star-500 text-xs block">Next Milestone</span>
            <span className="text-yellow-400 text-sm">{program.nextMilestone}</span>
          </div>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[90px]">Agency:</span>
          <span className="text-star-200">{program.agency}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[90px]">Contractor:</span>
          <span className="text-star-200">
            {getCompanyProfileUrl(program.contractor) ? (
              <Link href={getCompanyProfileUrl(program.contractor)!} className="hover:underline">{program.contractor}</Link>
            ) : program.contractor}
          </span>
        </div>
      </div>

      {/* Always show a brief description excerpt */}
      <p className="text-star-300 text-sm leading-relaxed mb-2">
        {expanded ? program.description : program.description.slice(0, 180) + (program.description.length > 180 ? '...' : '')}
      </p>

      {program.description.length > 180 && (
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
          {expanded ? 'Show less' : 'Read full description'}
        </button>
      )}
    </div>
  );
}

function ContractCard({ contract }: { contract: ContractAward }) {
  return (
    <div className="card p-5 hover:border-nebula-500/40">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-white font-semibold">{contract.title}</h3>
        <span className="text-green-400 font-bold text-sm whitespace-nowrap ml-3">{contract.value}</span>
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-star-400 min-w-[80px]">Contractor:</span>
          <span className="text-star-200">
            {getCompanyProfileUrl(contract.contractor) ? (
              <Link href={getCompanyProfileUrl(contract.contractor)!} className="hover:underline">{contract.contractor}</Link>
            ) : contract.contractor}
          </span>
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
  const typeStyle = EVENT_TYPE_STYLES[event.type] || DEFAULT_EVENT_TYPE_STYLE;

  return (
    <div className="card p-5">
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
    <div className="card p-5 hover:border-nebula-500/40">
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
    <div className="card p-6 mb-8">
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

function ThreatCategoryCard({ cat, style }: {
  cat: {
    name: string;
    level: string;
    nations: string[];
    description: string;
    rationale: string;
    trajectory: string;
    keyIndicators: string[];
  };
  style: { label: string; color: string; bg: string };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-lg border border-slate-700/50 ${style.bg} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white font-semibold">{cat.name}</h4>
        <span className={`text-xs font-bold px-2.5 py-1 rounded ${style.bg} ${style.color}`}>
          Threat Level: {style.label}
        </span>
      </div>
      <p className="text-star-300 text-sm mb-2">{cat.description}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-star-400 text-xs mr-1">Known capable:</span>
        {cat.nations.map((nation) => (
          <span key={nation} className="px-2 py-0.5 bg-slate-700/50 text-star-200 rounded text-xs">
            {nation}
          </span>
        ))}
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
        {expanded ? 'Hide analysis' : 'Why this rating? View full analysis'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4 border-t border-slate-700/50 pt-3">
          {/* Rationale */}
          <div>
            <h5 className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
              Assessment Rationale
            </h5>
            <p className="text-star-300 text-sm leading-relaxed">{cat.rationale}</p>
          </div>

          {/* Key Indicators */}
          <div>
            <h5 className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
              Key Indicators
            </h5>
            <ul className="space-y-1">
              {cat.keyIndicators.map((indicator) => (
                <li key={indicator} className="text-star-300 text-sm flex items-start gap-2">
                  <span className="text-star-500 mt-0.5 flex-shrink-0">--</span>
                  {indicator}
                </li>
              ))}
            </ul>
          </div>

          {/* Trajectory */}
          <div>
            <h5 className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
              5-10 Year Trajectory
            </h5>
            <p className="text-star-300 text-sm leading-relaxed">{cat.trajectory}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ThreatSummary() {
  const categories = [
    {
      name: 'Kinetic ASAT',
      level: 'high',
      nations: ['China', 'Russia', 'India', 'United States'],
      description: 'Direct-ascent missiles that physically destroy satellites. Creates debris, difficult to conceal. Four nations have demonstrated this capability.',
      rationale: 'Rated HIGH because four nations have successfully demonstrated kinetic ASAT capability in live tests. China (2007), the United States (2008), India (2019), and Russia (2021) have all destroyed satellites with interceptor missiles. However, kinetic ASAT is not rated VERY HIGH because the debris consequences create strong deterrence against actual use -- Russia\'s 2021 Cosmos 1408 test drew near-universal condemnation and the resulting debris endangered the ISS. Additionally, kinetic ASAT tests are easily detected by ground-based sensors and provide significant strategic warning, limiting surprise employment. The capability exists and is proven, but practical use during conflict carries severe second-order consequences that constrain its utility.',
      keyIndicators: [
        'Four nations have conducted successful kinetic ASAT intercept tests',
        'China\'s SC-19 and DN-3 interceptors are assessed to be operationally deployable',
        'Russia\'s Nudol PL-19 has undergone at least 10 flight tests',
        'U.S. SM-3 Block IIA has inherent ASAT capability',
        'Kinetic ASAT creates long-lived debris that threatens all nations\' assets',
      ],
      trajectory: 'The kinetic ASAT threat is expected to remain HIGH but unlikely to escalate to VERY HIGH over the next decade. International norms against debris-generating ASAT tests are strengthening -- the U.S., Canada, New Zealand, Japan, Germany, and others have pledged to halt destructive ASAT testing. However, existing demonstrated capabilities cannot be un-invented. China and Russia are shifting investment toward reversible counterspace methods (jamming, cyber, directed energy) that avoid debris consequences. The primary risk is not new testing but the potential employment of existing kinetic ASAT arsenals during great-power conflict, where debris consequences may be accepted as a cost of war.',
    },
    {
      name: 'Co-Orbital / RPO',
      level: 'high',
      nations: ['China', 'Russia', 'United States'],
      description: 'Satellites that maneuver near other satellites for inspection, surveillance, or potential interference. Ambiguous intent makes attribution challenging.',
      rationale: 'Rated HIGH because Russia and China conduct regular, demonstrated rendezvous and proximity operations (RPO) near Western military and commercial satellites, and these operations are inherently dual-use. Russia\'s Luch/Olymp satellite has shadowed Western GEO SATCOM assets; Cosmos 2542/2543 tracked a U.S. KH-11 reconnaissance satellite. China\'s SJ-21 physically grappled and relocated a defunct BeiDou satellite, demonstrating potential offensive capability. The threat is HIGH rather than VERY HIGH because co-orbital attacks require significant orbital maneuvering time, providing some warning to defenders, and the ambiguity between inspection and attack allows diplomatic engagement before escalation.',
      keyIndicators: [
        'Russia\'s Luch satellite repositions near Western GEO assets repeatedly',
        'Cosmos 2543 released a projectile in orbit (July 2020)',
        'China\'s SJ-21 demonstrated grapple-and-tow capability (2022)',
        'Multiple Chinese Shiyan/Shijian satellites have performed close approaches',
        'The U.S. GSSAP program also conducts RPO for space domain awareness',
      ],
      trajectory: 'Expected to INCREASE toward VERY HIGH over the next 5-10 years. Co-orbital operations are proliferating as on-orbit servicing technology matures and dual-use RPO satellites become cheaper to build and deploy. China is investing heavily in robotic servicing, debris removal, and on-orbit manufacturing -- all with inherent co-orbital ASAT applications. Russia continues to develop successive generations of inspection satellites. The growing number of maneuvering objects in GEO and LEO will make it harder to distinguish hostile from benign RPO, increasing the risk of miscalculation. On-orbit "space-to-space" weapons that can disable satellites without creating debris are particularly concerning because they avoid the consequences that deter kinetic ASAT.',
    },
    {
      name: 'Electronic Warfare (Jamming/Spoofing)',
      level: 'very_high',
      nations: ['Russia', 'China', 'Iran', 'North Korea'],
      description: 'Ground-based or space-based systems that jam or spoof satellite signals, particularly GPS/GNSS and SATCOM. Most frequently used counterspace capability.',
      rationale: 'Rated VERY HIGH because electronic warfare is the most operationally deployed and frequently used counterspace capability today. Russia employs GPS/GNSS jamming and spoofing daily in the Ukraine conflict and across the Baltic, Black Sea, and Eastern Mediterranean regions, affecting both military operations and civilian aviation safety. Systems like Krasukha-4, Pole-21, and Tirada-2 are fielded in large numbers with trained operators. North Korea has jammed GPS across the Seoul metropolitan area affecting over 1,100 aircraft. Iran conducts regional GPS interference in the Persian Gulf. Unlike kinetic ASAT, electronic warfare is reversible, deniable, tactically useful at the unit level, and does not create debris -- making it far more likely to be employed across the conflict spectrum, including in gray-zone operations below the threshold of armed conflict.',
      keyIndicators: [
        'Russia conducts persistent GPS jamming/spoofing across multiple theaters daily',
        'NATO allies report widespread GPS outages caused by Russian EW systems',
        'North Korea conducted a mass GPS jamming campaign affecting 1,800+ aircraft and ships',
        'Iran interferes with GPS and commercial SATCOM in the Persian Gulf',
        'Jammers are cheap, mobile, and widely available on the commercial market',
        'SATCOM uplink jamming can be achieved with relatively low-power ground equipment',
      ],
      trajectory: 'Expected to REMAIN VERY HIGH and potentially worsen. Electronic warfare against space systems is becoming more accessible as software-defined radio technology proliferates and commercial jammers become cheaper. The barrier to entry is significantly lower than for other counterspace domains. Mitigation efforts (anti-jam GPS M-code, frequency hopping, beam nulling) are advancing but deployment lags the threat. As militaries become more dependent on space-based PNT and SATCOM, the incentive to jam increases. Space-based EW systems (jamming from orbit) represent an emerging threat that would extend jamming coverage globally. The contested electromagnetic environment in space will intensify through the 2030s.',
    },
    {
      name: 'Cyber',
      level: 'high',
      nations: ['Russia', 'China', 'Iran', 'North Korea'],
      description: 'Attacks on satellite ground systems, communication links, or spacecraft software. Demonstrated in the 2022 Viasat attack. Hard to attribute definitively.',
      rationale: 'Rated HIGH because the 2022 Viasat KA-SAT cyberattack proved that state actors will target satellite infrastructure in real combat operations. The GRU-attributed attack disabled 30,000+ terminals across Europe hours before Russia\'s invasion of Ukraine, disrupting Ukrainian military communications and affecting civilian infrastructure in multiple NATO countries. Satellite ground systems are networked, software-intensive, and exposed to the same cyber vulnerabilities as other IT infrastructure. Four nations (Russia, China, Iran, North Korea) have sophisticated cyber operations units with demonstrated interest in space targets. The threat is HIGH rather than VERY HIGH because successful satellite cyber operations require significant reconnaissance and access development, and the most critical military systems use isolated networks and encryption.',
      keyIndicators: [
        'Russia\'s GRU Unit 74455 (Sandworm) conducted the Viasat attack',
        'China\'s APT groups have targeted satellite operators and defense contractors',
        'Iran-linked groups attempted to compromise satellite ground stations',
        'Many satellite ground systems use legacy software with known vulnerabilities',
        'Supply chain attacks on satellite components represent a growing vector',
        'Ransomware groups have targeted space industry companies',
      ],
      trajectory: 'Expected to INCREASE toward VERY HIGH over the next 5-10 years. As satellite constellations grow and ground segments become more networked and cloud-based, the attack surface expands. The shift toward software-defined satellites with reprogrammable payloads introduces new attack vectors -- a compromised satellite firmware update could disable an entire constellation. AI-powered cyber tools will lower the skill barrier for sophisticated attacks. The proliferation of commercial space operations means more potential targets with varying levels of cybersecurity maturity. Space-specific cybersecurity standards (NIST, CISA) are emerging but adoption is uneven across the industry.',
    },
    {
      name: 'Directed Energy',
      level: 'medium',
      nations: ['China', 'Russia'],
      description: 'Ground-based or space-based lasers for dazzling, blinding, or damaging satellite sensors. China and Russia assessed to be developing these systems.',
      rationale: 'Rated MEDIUM because while China and Russia are both developing ground-based laser systems that can dazzle or blind satellite sensors, no confirmed operational attacks against foreign satellites have been publicly documented. China has reportedly lased U.S. satellites on multiple occasions for tracking purposes, and the DIA has assessed that China may have a limited capability to damage satellite sensors with ground-based lasers. Russia is developing similar systems, including the Peresvet mobile laser system (which may have an anti-satellite role). The threat is MEDIUM rather than HIGH because the technology is still maturing, atmospheric effects limit ground-to-space laser effectiveness, and the high-power systems needed to physically damage satellites at orbital distances require significant infrastructure that is detectable.',
      keyIndicators: [
        'China has lased U.S. reconnaissance satellites (multiple reported incidents)',
        'Russia deployed the Peresvet laser system to operational units in 2019',
        'DIA assesses China could have sensor-damaging laser by mid-2020s',
        'Both nations are investing in high-energy laser research',
        'Ground-based dazzling/blinding is achievable with current technology',
        'Physical damage from ground to orbit requires megawatt-class power levels',
      ],
      trajectory: 'Expected to INCREASE to HIGH over the next 5-10 years. Both China and Russia are investing heavily in directed energy programs. Advances in solid-state laser technology, adaptive optics, and beam control are steadily overcoming atmospheric limitations. Space-based directed energy weapons -- which avoid atmospheric absorption entirely -- are a logical next step and have been studied by multiple nations. By the early 2030s, China is assessed likely to have ground-based lasers capable of physically damaging satellite optical sensors and solar panels in LEO. The proliferation of lower-cost high-power lasers could also enable non-state actors to dazzle commercial satellites. Space-based laser weapons remain technically challenging but cannot be ruled out for the 2035 timeframe.',
    },
  ];

  const levelStyles: Record<string, { label: string; color: string; bg: string }> = {
    very_high: { label: 'Very High', color: 'text-red-400', bg: 'bg-red-900/20' },
    high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-900/20' },
    medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
    low: { label: 'Low', color: 'text-green-400', bg: 'bg-green-900/20' },
  };

  return (
    <div className="card p-6 mb-8">
      <h3 className="text-white font-bold mb-2">Counterspace Threat Overview (OSINT Assessment)</h3>
      <p className="text-star-400 text-xs mb-4">
        Click &quot;View full analysis&quot; on each threat category to see the rationale behind each rating,
        key indicators, and the projected 5-10 year trajectory.
      </p>
      <div className="space-y-4">
        {categories.map((cat) => {
          const style = levelStyles[cat.level];
          return (
            <ThreatCategoryCard key={cat.name} cat={cat} style={style} />
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
  const [spaceForces, setSpaceForces] = useState<SpaceForce[]>(FALLBACK_SPACE_FORCES);
  const [defensePrograms, setDefensePrograms] = useState<DefenseProgram[]>(FALLBACK_DEFENSE_PROGRAMS);
  const [recentContracts, setRecentContracts] = useState<ContractAward[]>(FALLBACK_RECENT_CONTRACTS);
  const [counterspaceEvents, setCounterspaceEvents] = useState<CounterspaceEvent[]>(FALLBACK_COUNTERSPACE_EVENTS);
  const [alliances, setAlliances] = useState<Alliance[]>(FALLBACK_ALLIANCES);
  const [liveProcurement, setLiveProcurement] = useState<LiveProcurement[]>(FALLBACK_LIVE_PROCUREMENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('forces');
  const [programCategoryFilter, setProgramCategoryFilter] = useState<DefenseProgram['category'] | ''>('');
  const [threatTypeFilter, setThreatTypeFilter] = useState<CounterspaceEvent['type'] | ''>('');

  useEffect(() => {
    async function fetchData() {
      setError(null);
      try {
        const [forcesRes, programsRes, contractsRes, eventsRes, alliancesRes, procurementRes] = await Promise.all([
          fetch('/api/content/space-defense?section=space-forces'),
          fetch('/api/content/space-defense?section=defense-programs'),
          fetch('/api/content/space-defense?section=recent-contracts'),
          fetch('/api/content/space-defense?section=counterspace-events'),
          fetch('/api/content/space-defense?section=alliances'),
          fetch('/api/content/space-defense?section=live-procurement'),
        ]);

        const [forcesJson, programsJson, contractsJson, eventsJson, alliancesJson, procurementJson] = await Promise.all([
          forcesRes.json(),
          programsRes.json(),
          contractsRes.json(),
          eventsRes.json(),
          alliancesRes.json(),
          procurementRes.json(),
        ]);

        setSpaceForces(forcesJson.data?.length > 3 ? forcesJson.data : FALLBACK_SPACE_FORCES);
        setDefensePrograms(programsJson.data?.length > 5 ? programsJson.data : FALLBACK_DEFENSE_PROGRAMS);
        setRecentContracts(contractsJson.data?.length > 5 ? contractsJson.data : FALLBACK_RECENT_CONTRACTS);
        setCounterspaceEvents(eventsJson.data?.length > 3 ? eventsJson.data : FALLBACK_COUNTERSPACE_EVENTS);
        setAlliances(alliancesJson.data?.length > 3 ? alliancesJson.data : FALLBACK_ALLIANCES);
        if (procurementJson.data) setLiveProcurement(procurementJson.data);

        // Use the most recent lastRefreshed from any section
        const timestamps = [
          forcesJson.meta?.lastRefreshed,
          programsJson.meta?.lastRefreshed,
          contractsJson.meta?.lastRefreshed,
          eventsJson.meta?.lastRefreshed,
          alliancesJson.meta?.lastRefreshed,
        ].filter(Boolean);
        if (timestamps.length > 0) {
          setRefreshedAt(timestamps.sort().reverse()[0]);
        }
      } catch (error) {
        clientLogger.error('Failed to fetch space defense data', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredPrograms = programCategoryFilter
    ? defensePrograms.filter((p) => p.category === programCategoryFilter)
    : defensePrograms;

  const filteredEvents = threatTypeFilter
    ? counterspaceEvents.filter((e) => e.type === threatTypeFilter)
    : counterspaceEvents;

  const programCategories = Array.from(new Set(defensePrograms.map((p) => p.category)));
  const eventTypes = Array.from(new Set(counterspaceEvents.map((e) => e.type)));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Defense & National Security"
          subtitle="Open-source intelligence on military space organizations, programs, procurement, counterspace threats, and allied cooperation"
          icon="🛡️"
          accentColor="red"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {error && !loading && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Hero Stats */}
        <HeroStats
          forceCount={spaceForces.length}
          programCount={defensePrograms.length}
          contractCount={recentContracts.length}
          allianceCount={alliances.length}
        />

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
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {spaceForces.map((force) => (
                  <StaggerItem key={force.id}>
                    <SpaceForceCard force={force} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            {/* USSF Organizational Detail */}
            <div className="card p-6">
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
                Tracking {defensePrograms.length} major defense space programs across the USSF, SDA, NRO, and allied nations.
                Programs span communications, missile warning, navigation, surveillance, launch, and the
                Proliferated Warfighter Space Architecture. Data sourced from public budget documents and official program updates.
              </p>

              {/* Program Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {Object.entries(PROGRAM_STATUS_STYLES).map(([status, style]) => {
                  const count = defensePrograms.filter((p) => p.status === status).length;
                  if (count === 0) return null;
                  return (
                    <div key={status} className={`rounded-lg border border-slate-700/50 ${style.bg} p-3 text-center`}>
                      <span className={`text-2xl font-bold ${style.color}`}>{count}</span>
                      <span className="text-star-400 text-xs block">{style.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Category Filters */}
              <div className="card p-4 mb-6">
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
                    All ({defensePrograms.length})
                  </button>
                  {programCategories.map((cat) => {
                    const count = defensePrograms.filter((p) => p.category === cat).length;
                    const style = CATEGORY_STYLES[cat] || DEFAULT_CATEGORY_STYLE;
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

              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPrograms.map((program) => (
                  <StaggerItem key={program.id}>
                    <ProgramCard program={program} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            {/* SDA Architecture Explainer */}
            <ScrollReveal>
            <div className="card p-6">
              <h3 className="text-white font-bold mb-4">Proliferated Warfighter Space Architecture (PWSA)</h3>
              <p className="text-star-300 text-sm mb-4">
                The Space Development Agency (SDA) is building the Proliferated Warfighter Space Architecture,
                a multi-layered constellation of hundreds of satellites in LEO designed for resilience through numbers.
                Unlike traditional exquisite military satellites, PWSA uses a &quot;spiral development&quot; model
                with new tranches every two years, incorporating commercial technology and manufacturing practices.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { layer: 'Transport Layer', purpose: 'Mesh networking and data transport', icon: '\u{1F6F0}' },
                  { layer: 'Tracking Layer', purpose: 'Missile warning and missile tracking', icon: '\u{1F50D}' },
                  { layer: 'Custody Layer', purpose: 'Target custody for beyond-LOS fires', icon: '\u{1F3AF}' },
                  { layer: 'Deterrence Layer', purpose: 'Demonstration of capabilities', icon: '\u{1F6E1}' },
                ].map((layer) => (
                  <div key={layer.layer} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-center">
                    <span className="text-2xl block mb-2">{layer.icon}</span>
                    <h4 className="text-nebula-400 font-semibold text-sm">{layer.layer}</h4>
                    <p className="text-star-400 text-xs mt-1">{layer.purpose}</p>
                  </div>
                ))}
              </div>
            </div>
            </ScrollReveal>
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
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {recentContracts.map((contract) => (
                  <StaggerItem key={contract.id}>
                    <ContractCard contract={contract} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            {/* Active USSF Procurement Priorities */}
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Active USSF/DoD Procurement Priorities</h2>
              <p className="text-star-300 text-sm mb-6">
                Key Space Force and DoD procurement programs currently seeking industry proposals,
                based on public RFIs, BAAs, and official acquisition announcements from FY2025-FY2026.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Tactically Responsive Space (TacRS) Launch',
                    agency: 'USSF / Space Systems Command',
                    status: 'Active',
                    statusColor: 'text-green-400',
                    statusBg: 'bg-green-900/20',
                    value: '~$200M (program)',
                    description: 'Rapid-response launch capability to deploy replacement or augmentation satellites within 24-48 hours of a tasking order. SSC seeking responsive launch providers with rapid integration, containerized payload processing, and launch-on-demand capability from multiple sites.',
                    vehicle: 'BAA / IDIQ',
                    focus: ['Rapid launch integration', 'Mobile launch capability', 'Containerized payload processing'],
                  },
                  {
                    title: 'Commercial SATCOM (COMSATCOM) Services',
                    agency: 'USSF / Space Systems Command',
                    status: 'Active',
                    statusColor: 'text-green-400',
                    statusBg: 'bg-green-900/20',
                    value: '$900M+ (IDIQ ceiling)',
                    description: 'Multi-award IDIQ contract for commercial satellite communications bandwidth to supplement military SATCOM capacity. Includes GEO and LEO commercial providers. Covers Ku, Ka, and commercial X-band services for COCOM requirements worldwide.',
                    vehicle: 'IDIQ / Task Order',
                    focus: ['LEO and GEO commercial bandwidth', 'CONUS and OCONUS coverage', 'Anti-jam augmentation'],
                  },
                  {
                    title: 'Space Domain Awareness Sensors (Ground & Space)',
                    agency: 'USSF / Space Operations Command',
                    status: 'Solicitation',
                    statusColor: 'text-blue-400',
                    statusBg: 'bg-blue-900/20',
                    value: '$300-500M (estimated)',
                    description: 'Expansion of the Space Surveillance Network through commercial sensor contributions and new government-owned sensors. Seeking deep-space optical telescopes, LEO radars, and space-based SDA payloads to improve the space object catalog and threat characterization.',
                    vehicle: 'CSO / BAA',
                    focus: ['Deep-space optical sensors', 'LEO/MEO radar systems', 'Space-based SDA payloads'],
                  },
                  {
                    title: 'PWSA Tranche 3 (Transport & Tracking)',
                    agency: 'Space Development Agency',
                    status: 'Pre-Solicitation',
                    statusColor: 'text-yellow-400',
                    statusBg: 'bg-yellow-900/20',
                    value: '$5B+ (estimated full tranche)',
                    description: 'Next spiral of the Proliferated Warfighter Space Architecture. Tranche 3 will add ~250 Transport Layer and ~60 Tracking Layer satellites with improved optical cross-links, higher-bandwidth data transport, and enhanced OPIR sensors. RFI released; solicitation expected FY2026.',
                    vehicle: 'RFI / forthcoming RFP',
                    focus: ['Next-gen optical inter-satellite links', 'Enhanced OPIR tracking sensors', 'Resilient mesh architecture'],
                  },
                  {
                    title: 'SpaceWERX Orbital Prime (On-Orbit Servicing)',
                    agency: 'USSF / SpaceWERX (AFWERX)',
                    status: 'Active',
                    statusColor: 'text-green-400',
                    statusBg: 'bg-green-900/20',
                    value: '$125M (program)',
                    description: 'SpaceWERX Orbital Prime SBIR/STTR program for on-orbit servicing, assembly, and manufacturing (OSAM). Seeks commercial providers for satellite life extension, debris removal, in-space assembly, and space logistics. Multiple phases from concept to on-orbit demonstration.',
                    vehicle: 'SBIR/STTR (Phase I/II/III)',
                    focus: ['Satellite life extension', 'Active debris removal', 'In-space manufacturing'],
                  },
                  {
                    title: 'Resilient GPS Backup / Alt-PNT',
                    agency: 'USSF / Space Systems Command / DoD PNT Oversight Council',
                    status: 'Sources Sought',
                    statusColor: 'text-purple-400',
                    statusBg: 'bg-purple-900/20',
                    value: '$150-250M (estimated)',
                    description: 'Alternative positioning, navigation, and timing solutions to supplement or back up GPS in contested/denied environments. Seeking LEO PNT augmentation, terrestrial eLoran, fiber-optic clocks, and quantum-inertial navigation solutions that can operate when GPS is jammed or spoofed.',
                    vehicle: 'Sources Sought / BAA',
                    focus: ['LEO PNT constellations', 'Terrestrial eLoran modernization', 'Quantum-inertial navigation'],
                  },
                ].map((opp) => (
                  <div key={opp.title} className="card p-5 hover:border-nebula-500/40">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-white font-semibold text-sm">{opp.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${opp.statusBg} ${opp.statusColor}`}>
                        {opp.status}
                      </span>
                    </div>
                    <div className="space-y-1.5 mb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-star-400 min-w-[70px]">Agency:</span>
                        <span className="text-star-200">{opp.agency}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-star-400 min-w-[70px]">Est. Value:</span>
                        <span className="text-green-400 font-medium">{opp.value}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-star-400 min-w-[70px]">Vehicle:</span>
                        <span className="text-star-200">{opp.vehicle}</span>
                      </div>
                    </div>
                    <p className="text-star-300 text-xs leading-relaxed mb-3">{opp.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opp.focus.map((f) => (
                        <span key={f} className="px-2 py-0.5 bg-nebula-500/10 text-nebula-400 rounded text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-star-500 text-xs mt-4">
                Note: Procurement status and values are based on public RFIs, BAAs, and official acquisition announcements.
                Visit SAM.gov for current solicitation details and response deadlines. For comprehensive procurement
                intelligence including SBIR/STTR topics, see the{' '}
                <a href="/business-opportunities?tab=procurement" className="text-nebula-400 hover:text-nebula-300 transition-colors underline">
                  Procurement Intelligence module
                </a>.
              </p>
            </div>

            {/* Live SAM.gov Solicitations */}
            {liveProcurement.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Live SAM.gov Defense Space Solicitations</h2>
                <p className="text-star-300 text-sm mb-6">
                  Live defense space opportunities pulled directly from SAM.gov, updated daily at 6:00 AM UTC.
                  Filtered for DoD/Space Force/DARPA agencies with space-related NAICS codes.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {liveProcurement.map((opp) => {
                    const typeStyles: Record<string, { label: string; color: string; bg: string }> = {
                      solicitation: { label: 'Solicitation', color: 'text-blue-400', bg: 'bg-blue-900/20' },
                      presolicitation: { label: 'Pre-Solicitation', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
                      award: { label: 'Award', color: 'text-green-400', bg: 'bg-green-900/20' },
                      sources_sought: { label: 'Sources Sought', color: 'text-purple-400', bg: 'bg-purple-900/20' },
                      special_notice: { label: 'Special Notice', color: 'text-slate-300', bg: 'bg-slate-800/30' },
                    };
                    const typeStyle = typeStyles[opp.type || 'solicitation'] || typeStyles.solicitation;

                    return (
                      <div key={opp.id} className="card p-4 hover:border-nebula-500/40">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-white font-semibold text-sm line-clamp-2">{opp.title}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${typeStyle.bg} ${typeStyle.color}`}>
                            {typeStyle.label}
                          </span>
                        </div>
                        <div className="space-y-1 mb-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-star-400 min-w-[60px]">Agency:</span>
                            <span className="text-star-200 truncate">{opp.agency}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-star-400 min-w-[60px]">Value:</span>
                            <span className="text-green-400 font-medium">{opp.value}</span>
                          </div>
                          {opp.period && (
                            <div className="flex items-center gap-2">
                              <span className="text-star-400 min-w-[60px]">Deadline:</span>
                              <span className="text-yellow-400">{opp.period}</span>
                            </div>
                          )}
                          {opp.naicsDescription && (
                            <div className="flex items-center gap-2">
                              <span className="text-star-400 min-w-[60px]">NAICS:</span>
                              <span className="text-star-300">{opp.naicsDescription}</span>
                            </div>
                          )}
                        </div>
                        {opp.description && (
                          <p className="text-star-400 text-xs line-clamp-2 mb-2">{opp.description}</p>
                        )}
                        {opp.samUrl && (
                          <a
                            href={opp.samUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-nebula-400 hover:text-nebula-300 transition-colors flex items-center gap-1"
                          >
                            View on SAM.gov
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Related News Cross-Link (replaces embedded news articles) */}
            <div className="card p-5 border border-nebula-500/20 bg-nebula-500/5 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-1">Defense & National Security News</h3>
                  <p className="text-star-400 text-sm">
                    Latest news articles on Space Force procurement, defense contracts, and national security developments
                    are available in the News module filtered by the defense category.
                  </p>
                </div>
                <a
                  href="/news?category=space-defense"
                  className="flex-shrink-0 ml-4 px-4 py-2 bg-nebula-500/20 hover:bg-nebula-500/30 text-nebula-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  View Defense News
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>

            {/* SBIR/STTR Note */}
            <div className="card p-6">
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
              <div className="card p-4 mb-6">
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
                    All ({counterspaceEvents.length})
                  </button>
                  {eventTypes.map((type) => {
                    const count = counterspaceEvents.filter((e) => e.type === type).length;
                    const style = EVENT_TYPE_STYLES[type] || DEFAULT_EVENT_TYPE_STYLE;
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

              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {alliances.map((alliance) => (
                  <StaggerItem key={alliance.id}>
                    <AllianceCard alliance={alliance} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>

            {/* Data Sharing Frameworks */}
            <div className="card p-6">
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
            <ScrollReveal>
            <div className="card p-6">
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
            </ScrollReveal>
          </div>
        )}

        {/* Footer Disclaimer */}
        <ScrollReveal>
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
        </ScrollReveal>
      </div>

            <ScrollReveal>
              <RelatedModules
                modules={[
              { name: 'Compliance Hub', description: 'Regulatory requirements and filings', href: '/compliance', icon: '📋' },
              { name: 'Space Law', description: 'International space law and treaties', href: '/space-law', icon: '⚖️' },
              { name: 'Regulatory Risk', description: 'Risk assessment and compliance scoring', href: '/regulatory-risk', icon: '⚠️' },
              { name: 'Space Agencies', description: 'Government space programs', href: '/space-agencies', icon: '🏛️' },
                ]}
              />
            </ScrollReveal>

    </div>
  );
}
