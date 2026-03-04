'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type TabId = 'technologies' | 'providers' | 'dsn' | 'trends';

interface CommsTechnology {
  id: string;
  name: string;
  category: 'rf' | 'optical' | 'quantum' | 'dtn' | 'dsn';
  description: string;
  details: string[];
  keyMetrics: { label: string; value: string }[];
  status: 'operational' | 'demonstrated' | 'development' | 'planned';
  programs: string[];
}

type OrbitType = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'Mixed' | 'N/A';
type ProviderStatus = 'operational' | 'deploying' | 'development' | 'planned';

interface SATCOMProvider {
  id: string;
  name: string;
  parent?: string;
  orbitType: OrbitType;
  frequencyBands: string[];
  capacityGbps: string;
  coverageArea: string;
  constellationSize: string;
  status: ProviderStatus;
  founded: string;
  headquarters: string;
  keyProducts: string[];
  description: string;
  highlights: string[];
  useCase: string;
}

interface DSNComplex {
  name: string;
  location: string;
  country: string;
  coordinates: string;
  established: number;
  antennas: { designation: string; diameter: string; bands: string[]; role: string }[];
  missionsServed: string[];
}

interface EmergingTrend {
  id: string;
  title: string;
  category: string;
  description: string;
  keyPlayers: string[];
  timeline: string;
  impact: 'transformative' | 'significant' | 'moderate';
  details: string[];
}

// ────────────────────────────────────────────────────────────────
// Constants / Data
// ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'technologies', label: 'Communication Technologies', icon: 'signal' },
  { id: 'providers', label: 'SATCOM Providers', icon: 'satellite' },
  { id: 'dsn', label: 'Deep Space Network', icon: 'radar' },
  { id: 'trends', label: 'Emerging Trends', icon: 'trending' },
];

// ── Section 1: Communication Technologies ──

const COMM_TECHNOLOGIES: CommsTechnology[] = [
  // RF Communications
  {
    id: 'rf-sband',
    name: 'S-Band Communications',
    category: 'rf',
    description: 'The workhorse of space communications since the 1960s. S-band (2-4 GHz) provides reliable telemetry, tracking, and command (TT&C) links. Lower data rates but excellent signal propagation through atmosphere and minimal rain fade. Standard for most spacecraft bus operations.',
    details: [
      'Frequency range: 2.0-4.0 GHz (ITU allocated 2.025-2.120 GHz uplink, 2.200-2.300 GHz downlink)',
      'Typical data rates: 2 kbps - 10 Mbps depending on antenna and distance',
      'Primary use: Telemetry, tracking, command (TT&C), emergency communications',
      'Minimal atmospheric attenuation -- works in rain, clouds, and adverse weather',
      'Used by ISS, most LEO science missions, and as backup on deep space probes',
      'Bandwidth-limited: being gradually supplemented by higher bands for science data',
    ],
    keyMetrics: [
      { label: 'Frequency', value: '2-4 GHz' },
      { label: 'Typical Rate', value: '2 kbps - 10 Mbps' },
      { label: 'Rain Fade', value: 'Minimal' },
      { label: 'Primary Use', value: 'TT&C' },
    ],
    status: 'operational',
    programs: ['ISS', 'Hubble', 'Most LEO satellites', 'DSN TT&C'],
  },
  {
    id: 'rf-xband',
    name: 'X-Band Communications',
    category: 'rf',
    description: 'The primary science data return band for deep space missions. X-band (8-12 GHz) offers significantly higher bandwidth than S-band while maintaining reasonable atmospheric performance. Standard for NASA, ESA, and JAXA deep space missions since the 1970s.',
    details: [
      'Frequency range: 8.0-12.0 GHz (space science: 8.400-8.500 GHz downlink, 7.145-7.235 GHz uplink)',
      'Typical data rates: 10 Mbps - 800 Mbps depending on distance and antenna',
      'Moderate rain fade -- operationally manageable with link margin',
      'All DSN 34m and 70m antennas have X-band capability',
      'Primary science data return from Mars, Jupiter, Saturn missions',
      'Also used extensively for military SATCOM (XTAR, WGS)',
    ],
    keyMetrics: [
      { label: 'Frequency', value: '8-12 GHz' },
      { label: 'Typical Rate', value: '10-800 Mbps' },
      { label: 'Rain Fade', value: 'Moderate' },
      { label: 'Primary Use', value: 'Science data' },
    ],
    status: 'operational',
    programs: ['Mars missions', 'Juno', 'Cassini', 'WGS (military)', 'XTAR'],
  },
  {
    id: 'rf-kaband',
    name: 'Ka-Band Communications',
    category: 'rf',
    description: 'The high-throughput band enabling modern broadband satellite internet and advanced deep space links. Ka-band (26.5-40 GHz) delivers 5-10x the bandwidth of Ku-band but is more susceptible to rain fade. Powers Starlink, O3b mPOWER, and ViaSat-3.',
    details: [
      'Frequency range: 26.5-40 GHz (space: typically 27-31 GHz uplink, 17.7-21.2 GHz downlink)',
      'Data rates: Up to 100+ Gbps aggregate across spot beams',
      'High susceptibility to rain fade -- requires adaptive coding and modulation (ACM)',
      'Enables multi-spot-beam HTS architectures with massive frequency reuse',
      'NASA Ka-band capability on DSN enables 800+ Mbps from lunar distance',
      'Commercial: Starlink Gen2, SES O3b mPOWER, ViaSat-3, Jupiter-3',
    ],
    keyMetrics: [
      { label: 'Frequency', value: '26.5-40 GHz' },
      { label: 'Typical Rate', value: '1-100+ Gbps' },
      { label: 'Rain Fade', value: 'Significant' },
      { label: 'Primary Use', value: 'Broadband HTS' },
    ],
    status: 'operational',
    programs: ['Starlink', 'O3b mPOWER', 'ViaSat-3', 'TDRSS Ka', 'LCRD RF backup'],
  },
  {
    id: 'rf-vband',
    name: 'V-Band Communications',
    category: 'rf',
    description: 'The frontier of RF spectrum for satellite communications. V-band (40-75 GHz) offers enormous bandwidth but faces severe atmospheric challenges. SpaceX and Amazon have filed for V-band spectrum for next-generation mega-constellations.',
    details: [
      'Frequency range: 40-75 GHz (space allocations in 37.5-42.5 GHz and 47.2-52.4 GHz)',
      'Theoretical capacity: 10x Ka-band per beam, enabling terabit-class architectures',
      'Extreme rain fade and oxygen absorption near 60 GHz -- requires heavy link margins',
      'SpaceX Gen3 Starlink and Amazon Kuiper Phase 2 plan V-band payloads',
      'Requires advanced ground terminal phased arrays and adaptive beam forming',
      'ITU WRC-23 addressed V-band sharing rules for NGSO constellations',
    ],
    keyMetrics: [
      { label: 'Frequency', value: '40-75 GHz' },
      { label: 'Potential Rate', value: '10+ Gbps/beam' },
      { label: 'Rain Fade', value: 'Extreme' },
      { label: 'Primary Use', value: 'Next-gen HTS' },
    ],
    status: 'development',
    programs: ['Starlink Gen3', 'Amazon Kuiper Phase 2', 'Telesat Lightspeed V-band'],
  },
  // Optical/Laser Communications
  {
    id: 'optical-lcrd',
    name: 'LCRD (Laser Communications Relay Demonstration)',
    category: 'optical',
    description: 'NASA\'s flagship laser communications relay satellite in GEO, launched December 2021. LCRD demonstrates end-to-end optical relay from LEO spacecraft through GEO to ground terminals. Achieved 1.2 Gbps bidirectional optical links and serves as the pathfinder for NASA\'s optical communications future.',
    details: [
      'Launched: December 7, 2021, aboard STPSat-6 to GEO (38,000 km)',
      'Two optical terminals using 1550 nm wavelength (telecom-compatible)',
      'Demonstrated 1.2 Gbps bidirectional links between ground and GEO',
      'Ground terminals: Table Mountain (CA) and Haleakala (HI)',
      'Relay architecture: LEO user -> GEO LCRD -> ground terminal',
      'Heritage terminal design will fly on Orion, Gateway, and future missions',
      'First operational optical relay supporting ILLUMA-T on ISS',
    ],
    keyMetrics: [
      { label: 'Data Rate', value: '1.2 Gbps' },
      { label: 'Wavelength', value: '1550 nm' },
      { label: 'Orbit', value: 'GEO' },
      { label: 'Status', value: 'Operational' },
    ],
    status: 'operational',
    programs: ['NASA Goddard', 'MIT Lincoln Lab', 'ILLUMA-T (ISS)'],
  },
  {
    id: 'optical-illumat',
    name: 'ILLUMA-T (ISS Optical Terminal)',
    category: 'optical',
    description: 'Integrated LCRD Low-Earth Orbit User Modem and Amplifier Terminal -- NASA\'s first optical terminal on the ISS. Installed in late 2023, ILLUMA-T relays high-definition video and science data from ISS to ground via the LCRD GEO relay, proving the operational optical relay concept for future missions.',
    details: [
      'Installed on ISS exterior (Express Logistics Carrier) in November 2023',
      'Communicates with LCRD in GEO using 1550 nm laser link',
      'Demonstrated 1.2 Gbps downlink from ISS through LCRD to ground',
      'First end-to-end operational optical relay architecture in space',
      'Paves the way for optical terminals on Gateway, Orion, and science missions',
      'Significantly reduces data delivery latency compared to store-and-forward',
    ],
    keyMetrics: [
      { label: 'Data Rate', value: '1.2 Gbps' },
      { label: 'Wavelength', value: '1550 nm' },
      { label: 'Platform', value: 'ISS' },
      { label: 'Relay', value: 'Via LCRD' },
    ],
    status: 'operational',
    programs: ['NASA Goddard', 'ISS Program', 'LCRD'],
  },
  {
    id: 'optical-edrs',
    name: 'ESA EDRS (European Data Relay System)',
    category: 'optical',
    description: 'The world\'s first commercial laser relay service, branded the "SpaceDataHighway." Two GEO payloads relay data from LEO satellites via laser crosslinks at 1.8 Gbps, with over 55,000 successful laser link sessions completed by early 2026. Primary users include Copernicus Sentinel Earth observation satellites.',
    details: [
      'EDRS-A: GEO payload on Eutelsat 9B (launched January 2016)',
      'EDRS-C: Dedicated GEO satellite (launched August 2019)',
      '1.8 Gbps per optical link using 1064 nm laser terminals by Tesat-Spacecom',
      '55,000+ successful laser relay sessions completed',
      'Primary customers: Copernicus Sentinel-1A/1B/2A/2B, Pléiades Neo',
      'Enables near-real-time delivery of Earth observation data (vs. hours)',
      'Heritage: Tesat Laser Communication Terminal (LCT) series',
    ],
    keyMetrics: [
      { label: 'Data Rate', value: '1.8 Gbps' },
      { label: 'Wavelength', value: '1064 nm' },
      { label: 'Sessions', value: '55,000+' },
      { label: 'Status', value: 'Operational' },
    ],
    status: 'operational',
    programs: ['ESA', 'Airbus Defence & Space', 'Tesat-Spacecom', 'Copernicus'],
  },
  {
    id: 'optical-dsoc',
    name: 'NASA DSOC (Deep Space Optical Communications)',
    category: 'optical',
    description: 'Launched aboard the Psyche spacecraft in October 2023, DSOC is the first demonstration of optical communications beyond the Moon. Achieved a record 267 Mbps from 33 million km (Mars distance) -- 10-100x faster than the best RF links at comparable distances. A transformative proof of concept for future Mars relay networks.',
    details: [
      'Flight transceiver aboard Psyche spacecraft (launched October 2023)',
      'Ground terminal: 5.1m Hale Telescope at Palomar Observatory, California',
      'Achieved 267 Mbps downlink from 33 million km (0.22 AU) in December 2023',
      'Record-setting "first light" at 31 million km -- furthest laser link ever',
      'Demonstrated photon-counting superconducting nanowire detector on ground',
      'Technology pathfinder for future Mars optical relay constellation',
      'Uses 1550 nm uplink (beacon) and 1064 nm downlink (data)',
    ],
    keyMetrics: [
      { label: 'Peak Rate', value: '267 Mbps' },
      { label: 'Max Distance', value: '390M km' },
      { label: 'Wavelength', value: '1064 nm down' },
      { label: 'Status', value: 'Demonstrated' },
    ],
    status: 'demonstrated',
    programs: ['NASA JPL', 'Psyche mission', 'Caltech/Palomar'],
  },
  // Quantum Key Distribution
  {
    id: 'qkd',
    name: 'Quantum Key Distribution (QKD) from Space',
    category: 'quantum',
    description: 'Space-based QKD uses individual photon states to distribute cryptographic keys that are theoretically unbreakable by any computational attack, including quantum computers. China\'s Micius satellite demonstrated the first satellite-to-ground QKD in 2017 and intercontinental QKD between Beijing and Vienna.',
    details: [
      'Micius/Mozi (2016): First satellite QKD, achieved 1,200 km ground-to-ground key distribution',
      'QKD uses BB84 or decoy-state protocols encoding key bits in photon polarization',
      'Key rates: ~1-50 kbps at current tech (limited by single-photon detection efficiency)',
      'ESA SAGA mission: Planned QKD constellation for European quantum-safe comms',
      'SES partnering with Crypto Quantique for hybrid quantum-classical relay',
      'UK ROKS (Royal QKD Satellite) planned for 2027 demonstration',
      'Singapore QEYSSat-1 launched 2024 for equatorial QKD experiments',
      'Challenges: daylight operation, high loss, key rate, satellite pointing accuracy',
    ],
    keyMetrics: [
      { label: 'Key Rate', value: '1-50 kbps' },
      { label: 'Max Range', value: '1,200+ km' },
      { label: 'Security', value: 'Quantum-proof' },
      { label: 'Maturity', value: 'Early demos' },
    ],
    status: 'demonstrated',
    programs: ['Micius (China)', 'ESA SAGA', 'UK ROKS', 'QEYSSat-1 (Singapore)'],
  },
  // DTN
  {
    id: 'dtn',
    name: 'Delay/Disruption Tolerant Networking (DTN)',
    category: 'dtn',
    description: 'Bundle Protocol (RFC 9171) enables an Internet-like store-and-forward networking layer for space communications where round-trip light times can exceed 40 minutes and links are frequently disrupted. NASA has demonstrated DTN on ISS and plans to deploy it across the Solar System Internet.',
    details: [
      'Bundle Protocol v7 (BPv7) standardized as RFC 9171 in January 2022',
      'Store-and-forward hop-by-hop delivery -- tolerates hours/days of link outage',
      'Licklider Transmission Protocol (LTP) for deep space reliable link layer',
      'Operational on ISS since 2018 -- DTN payloads exchange data via TDRSS',
      'NASA plans DTN as core protocol for Artemis lunar surface network',
      'ION (Interplanetary Overlay Network): JPL reference implementation',
      'CCSDS has standardized BP and LTP as recommended standards',
      'Key advantage: decouples application data from link availability',
    ],
    keyMetrics: [
      { label: 'Protocol', value: 'BPv7 / LTP' },
      { label: 'Standard', value: 'RFC 9171' },
      { label: 'Delay Tolerance', value: 'Hours-days' },
      { label: 'Status', value: 'Operational (ISS)' },
    ],
    status: 'operational',
    programs: ['ISS', 'Artemis', 'CCSDS', 'JPL ION', 'Mars relay planning'],
  },
];

// ── Section 2: SATCOM Providers ──

const SATCOM_PROVIDERS: SATCOMProvider[] = [
  {
    id: 'ses',
    name: 'SES',
    orbitType: 'Mixed',
    frequencyBands: ['C-band', 'Ku-band', 'Ka-band'],
    capacityGbps: '10+ Tbps (O3b mPOWER)',
    coverageArea: 'Global (GEO + MEO)',
    constellationSize: '70+ GEO + 11 O3b mPOWER MEO',
    status: 'operational',
    founded: '1985',
    headquarters: 'Betzdorf, Luxembourg',
    keyProducts: ['O3b mPOWER (MEO HTS)', 'GEO fleet', 'SES Astra (DTH)', 'Government Solutions'],
    description: 'World\'s second-largest satellite operator by revenue. SES operates a unique multi-orbit fleet combining traditional GEO satellites with the revolutionary O3b mPOWER MEO constellation. O3b mPOWER\'s 11 satellites (all launched by early 2025) deliver 10+ terabits of throughput via 5,000+ dynamically steerable beams -- the most powerful commercial MEO system ever built.',
    highlights: [
      'O3b mPOWER: 11 MEO satellites delivering 10+ Tbps with <150ms latency',
      'Over 5,000 dynamically shaped and steered Ka-band beams',
      'Combined GEO+MEO multi-orbit architecture for optimal coverage/latency tradeoff',
      'Major government/defense customer base (SES GS acquired by SES)',
      'C-band spectrum clearing in US generated $4B+ in proceeds',
    ],
    useCase: 'Telecom backhaul, maritime, aviation, government, enterprise broadband',
  },
  {
    id: 'intelsat',
    name: 'Intelsat',
    orbitType: 'GEO',
    frequencyBands: ['C-band', 'Ku-band', 'Ka-band'],
    capacityGbps: '1.5+ Tbps (Epic NG fleet)',
    coverageArea: 'Global (GEO)',
    constellationSize: '50+ GEO satellites',
    status: 'operational',
    founded: '1964',
    headquarters: 'McLean, Virginia, USA',
    keyProducts: ['Epic NG (HTS)', 'IntelsatOne Flex', 'FlexEnterprise', 'Government solutions'],
    description: 'The original commercial satellite operator, founded as an intergovernmental organization in 1964. Intelsat operates one of the world\'s largest GEO fleets with over 50 satellites. The Epic NG series brought high-throughput capability, and the unified network architecture enables seamless managed services across the fleet.',
    highlights: [
      'Over 50 GEO satellites providing truly global coverage',
      'Epic NG series: HTS overlay with multi-spot-beam Ka-band',
      'IntelsatOne Flex: managed service platform for telecom, maritime, aero',
      'Emerged from Chapter 11 in 2022, restructured and recapitalized',
      'SES-Intelsat merger agreement announced in 2024',
    ],
    useCase: 'Broadcasting, telecom backhaul, maritime/aero mobility, government',
  },
  {
    id: 'eutelsat-oneweb',
    name: 'Eutelsat Group (Eutelsat + OneWeb)',
    orbitType: 'Mixed',
    frequencyBands: ['Ku-band', 'Ka-band'],
    capacityGbps: '1+ Tbps combined',
    coverageArea: 'Global (GEO + LEO)',
    constellationSize: '36 GEO + 634 OneWeb LEO',
    status: 'operational',
    founded: '1977 / 2012 (OneWeb)',
    headquarters: 'Paris, France',
    keyProducts: ['OneWeb LEO constellation', 'KONNECT VHTS', 'GEO broadcast fleet', 'Eutelsat ADVANCE'],
    description: 'Created by the 2023 merger of Eutelsat and OneWeb, forming the first multi-orbit operator combining a 36-satellite GEO fleet with the 634-satellite OneWeb LEO constellation. OneWeb provides low-latency broadband (Ku-band) while GEO satellites serve broadcasting and VHTS broadband (KONNECT VHTS launched 2022 with 500 Gbps).',
    highlights: [
      'First integrated GEO + LEO commercial operator post-merger',
      'OneWeb: 634 LEO satellites in 12 planes at 1,200 km, Ku-band user links',
      'KONNECT VHTS: 500 Gbps Ka-band GEO satellite covering Europe/Africa',
      'Strong government partnerships (UK golden share in OneWeb)',
      'Backhaul partnerships with telcos in Africa, Asia, Arctic regions',
    ],
    useCase: 'Enterprise broadband, government, maritime, aviation, broadcast',
  },
  {
    id: 'viasat',
    name: 'Viasat',
    orbitType: 'GEO',
    frequencyBands: ['Ka-band'],
    capacityGbps: '1+ Tbps per ViaSat-3 satellite',
    coverageArea: 'Global (3 ViaSat-3 for full coverage)',
    constellationSize: '5 GEO (ViaSat-1/2/3 family)',
    status: 'deploying',
    founded: '1986',
    headquarters: 'Carlsbad, California, USA',
    keyProducts: ['ViaSat-3 (ultra-HTS GEO)', 'Viasat Flex', 'Government systems', 'In-flight connectivity'],
    description: 'Viasat is building the world\'s highest-capacity individual satellites with the ViaSat-3 constellation. Each ViaSat-3 satellite delivers 1+ Tbps from GEO using Ka-band multi-spot beams. ViaSat-3 Americas launched April 2023; the EMEA and APAC satellites are in production. Viasat also acquired Inmarsat in 2023, adding L-band and Ka-band ELERA and Global Xpress assets.',
    highlights: [
      'ViaSat-3 Americas launched April 2023 (1+ Tbps single satellite)',
      'Three ViaSat-3 satellites for complete global coverage',
      'Acquired Inmarsat (2023): added L-band safety services + Global Xpress Ka',
      'Major airline in-flight connectivity provider (United, Delta partnerships)',
      'Significant US government/military business (Link 16, BLOS comms)',
    ],
    useCase: 'Consumer broadband, in-flight connectivity, maritime, government/military',
  },
  {
    id: 'hughes',
    name: 'Hughes Network Systems',
    parent: 'EchoStar',
    orbitType: 'GEO',
    frequencyBands: ['Ka-band', 'Ku-band'],
    capacityGbps: '500+ Gbps (Jupiter system)',
    coverageArea: 'Americas, India',
    constellationSize: '3 GEO (Jupiter-1/2/3)',
    status: 'operational',
    founded: '1971',
    headquarters: 'Germantown, Maryland, USA',
    keyProducts: ['Jupiter constellation', 'HughesNet consumer', 'Hughes 59 JUPITER platform', 'Managed SD-WAN'],
    description: 'A subsidiary of EchoStar, Hughes is the largest satellite internet provider in the Americas by subscriber count. The Jupiter constellation (Jupiter-1, -2, -3) provides broadband via Ka-band HTS. Jupiter-3 (EchoStar XXIV), launched July 2023, is one of the largest commercial communications satellites ever built at 500+ Gbps capacity.',
    highlights: [
      'Jupiter-3: 500+ Gbps, largest commercial GEO comsat at launch',
      '#1 satellite internet provider in Americas by subscriber count',
      'Hughes 59 JUPITER platform: ground system supporting HTS operations',
      'Managed SD-WAN services for enterprise multi-site connectivity',
      'EchoStar parent company exploring LEO integration strategies',
    ],
    useCase: 'Consumer broadband, enterprise networking, community Wi-Fi',
  },
  {
    id: 'iridium',
    name: 'Iridium Communications',
    orbitType: 'LEO',
    frequencyBands: ['L-band', 'Ka-band (feeder)'],
    capacityGbps: '~1.5 Mbps per channel (narrowband)',
    coverageArea: 'True global (pole-to-pole)',
    constellationSize: '66 active + 9 spares (LEO, 780 km)',
    status: 'operational',
    founded: '1998 (originally Motorola 1991)',
    headquarters: 'McLean, Virginia, USA',
    keyProducts: ['Iridium Certus (broadband)', 'Iridium PTT', 'Iridium GO!', 'SBD (Short Burst Data)', 'GMDSS safety'],
    description: 'The only satellite constellation providing true pole-to-pole global voice and data coverage. Iridium NEXT (66 active satellites launched 2017-2019 by SpaceX) replaced the original constellation. L-band ensures zero rain fade. Iridium Certus enables maritime safety (GMDSS) and broadband services up to 1.4 Mbps.',
    highlights: [
      'Only true pole-to-pole global coverage (including oceans and polar regions)',
      'Iridium NEXT: 66 active + 9 orbital spares at 780 km, cross-linked mesh',
      'L-band: zero rain fade, penetrates foliage and light structures',
      'Iridium Certus: up to 1.4 Mbps for maritime, aviation, land mobile',
      'IMO-recognized GMDSS provider for maritime distress/safety',
      'Hosted payloads: AireonSM (ADS-B), Harris L3 payloads',
    ],
    useCase: 'Maritime safety, aviation, government, IoT, emergency comms, polar ops',
  },
  {
    id: 'globalstar',
    name: 'Globalstar',
    orbitType: 'LEO',
    frequencyBands: ['L-band', 'S-band', 'Band n53/n256'],
    capacityGbps: '~1 Mbps per channel (narrowband)',
    coverageArea: 'Global (excl. polar)',
    constellationSize: '24 2nd-gen satellites (LEO, 1,414 km)',
    status: 'operational',
    founded: '1991',
    headquarters: 'Covington, Louisiana, USA',
    keyProducts: ['SPOT satellite messenger', 'Sat-Fi2 hotspot', 'Band n53 (Apple partnership)', 'IoT simplex/duplex'],
    description: 'A LEO satellite operator with a transformative Apple partnership. Globalstar\'s Band n53 (2483.5-2495 MHz) and n256 are used for Apple\'s Emergency SOS via Satellite feature on iPhone 14+ and the Find My network. This partnership has revitalized the company and funded the next-generation constellation.',
    highlights: [
      'Apple Emergency SOS via Satellite: powered by Globalstar spectrum',
      'Band n53/n256: Apple partnership generates ~90% of revenue',
      'Next-gen constellation funded by Apple with 17 new satellites from MDA',
      'SPOT and Sat-Fi product lines for consumer satellite messaging',
      'Simple bent-pipe architecture (ground processing vs. onboard)',
    ],
    useCase: 'Apple Emergency SOS, consumer satellite messaging, IoT, asset tracking',
  },
  {
    id: 'telesat',
    name: 'Telesat',
    orbitType: 'Mixed',
    frequencyBands: ['Ka-band', 'Ku-band (GEO)'],
    capacityGbps: '15+ Tbps (Lightspeed target)',
    coverageArea: 'Global (GEO now, Lightspeed for global LEO)',
    constellationSize: '15 GEO + 198 planned Lightspeed LEO',
    status: 'deploying',
    founded: '1969',
    headquarters: 'Ottawa, Ontario, Canada',
    keyProducts: ['Lightspeed LEO constellation', 'Telstar GEO fleet', 'Government/defense solutions'],
    description: 'Canadian satellite operator building the Lightspeed LEO constellation -- 198 satellites in polar and inclined orbits delivering 15+ Tbps of Ka-band capacity with optical inter-satellite links. Each satellite uses software-defined payloads and multiple steerable beams. MDA selected as prime contractor. First launches expected 2026-2027.',
    highlights: [
      'Lightspeed: 198 LEO satellites, 15+ Tbps Ka-band capacity',
      'Optical inter-satellite links for low-latency global mesh',
      'Software-defined payloads: beams and capacity dynamically allocated',
      'MDA/Thales Alenia Space building the constellation',
      'Strong government backing: Canadian government $1.44B investment',
      'Targeting enterprise, government, aero/maritime markets (not consumer)',
    ],
    useCase: 'Enterprise broadband, government/defense, aviation, maritime, telco backhaul',
  },
  {
    id: 'ast-spacemobile',
    name: 'AST SpaceMobile',
    orbitType: 'LEO',
    frequencyBands: ['700 MHz - 2.1 GHz (cellular bands)'],
    capacityGbps: '10+ Mbps per user (target)',
    coverageArea: 'Global (targeting unconnected areas)',
    constellationSize: '5 operational (Block 1), 168+ planned',
    status: 'deploying',
    founded: '2017',
    headquarters: 'Midland, Texas, USA',
    keyProducts: ['BlueBird satellites', 'Direct-to-cell broadband', 'MNO partnerships'],
    description: 'Building the first space-based cellular broadband network that connects directly to unmodified smartphones. AST SpaceMobile\'s BlueBird Block 1 satellites feature the largest commercial phased arrays ever deployed (64 m^2 each). Successfully demonstrated voice calls and 14 Mbps data on a standard Samsung Galaxy via the BlueWalker 3 test satellite in 2023.',
    highlights: [
      'BlueWalker 3 test satellite: first voice call from space to standard phone (2023)',
      'Demonstrated 14 Mbps download to unmodified Samsung Galaxy',
      'Block 1: 5 BlueBird satellites launched September 2024, each 64 m^2 array',
      'Partnerships: AT&T, Vodafone, Rakuten, Bell Canada, and 45+ MNOs',
      'Uses existing cellular spectrum licensed by MNO partners',
      'Targeting 168+ satellites for continuous global coverage',
    ],
    useCase: 'Direct-to-cell broadband, rural connectivity, disaster response, MNO coverage extension',
  },
  {
    id: 'lynk',
    name: 'Lynk Global',
    orbitType: 'LEO',
    frequencyBands: ['Cellular bands (600 MHz - 2.1 GHz)'],
    capacityGbps: 'SMS + narrowband data',
    coverageArea: 'Global (SMS first, broadband later)',
    constellationSize: '6 operational, 1,000+ planned',
    status: 'operational',
    founded: '2017',
    headquarters: 'Falls Church, Virginia, USA',
    keyProducts: ['Lynk satellite-direct-to-phone', 'SMS/MMS service', 'Emergency alerts', 'MNO roaming integration'],
    description: 'The first company to send a text message from space to an unmodified phone (2020). Lynk Global provides satellite-direct-to-phone connectivity as a roaming partner for mobile network operators. Started with SMS/MMS and emergency alerts, with plans to scale to broadband via a larger constellation.',
    highlights: [
      'First text message from satellite to standard phone (February 2020)',
      'First commercial satellite-to-phone service (Palau, 2022)',
      'FCC commercial license for satellite-direct-to-phone service',
      'MNO partnerships in 40+ countries across Pacific, Africa, Caribbean',
      'SMS-first approach allows rapid deployment with minimal satellites',
      'Planning 1,000+ satellite constellation for continuous broadband',
    ],
    useCase: 'Emergency SMS/alerts, rural connectivity, MNO roaming extension, disaster comms',
  },
  {
    id: 'rivada',
    name: 'Rivada Space Networks',
    orbitType: 'LEO',
    frequencyBands: ['Ka-band', 'Optical ISLs'],
    capacityGbps: '30+ Tbps aggregate',
    coverageArea: 'Global (600 LEO satellites)',
    constellationSize: '600 planned LEO satellites',
    status: 'development',
    founded: '2021',
    headquarters: 'Munich, Germany',
    keyProducts: ['OuterNET constellation', 'Secure point-to-point connectivity', 'Low-latency enterprise backbone'],
    description: 'Building the OuterNET -- a 600-satellite LEO constellation with optical inter-satellite links designed as a global point-to-point connectivity backbone. Unlike consumer broadband constellations, Rivada targets enterprise and government customers needing secure, low-latency trunk connectivity. Each satellite connects to 4+ neighbors via laser crosslinks.',
    highlights: [
      'OuterNET: 600 LEO satellites with optical inter-satellite mesh',
      'Targeting secure enterprise/government point-to-point connectivity',
      'Differentiated from Starlink: backbone wholesale model, not consumer retail',
      'ITU filing for Ka-band spectrum, optical ISLs for backbone',
      'Backed by Dennis Washington family office (Rivada Networks)',
      'First launches planned for 2027',
    ],
    useCase: 'Enterprise backbone, government secure comms, financial low-latency, telco transport',
  },
  {
    id: 'astranis',
    name: 'Astranis',
    orbitType: 'GEO',
    frequencyBands: ['Ka-band', 'Ku-band'],
    capacityGbps: '7.5-15 Gbps per microsatellite',
    coverageArea: 'Targeted regional beams',
    constellationSize: '5 operational, 20+ planned',
    status: 'deploying',
    founded: '2015',
    headquarters: 'San Francisco, California, USA',
    keyProducts: ['MicroGEO dedicated satellites', 'Single-customer dedicated capacity', 'Rapid deployment GEO'],
    description: 'Pioneering the "MicroGEO" concept -- small, dedicated GEO broadband satellites built for individual customers or regions at a fraction of traditional GEO cost. Each Astranis satellite is ~400 kg and delivers 7.5-15 Gbps of dedicated Ka-band capacity to a specific market. Dramatically reduces time-to-market and cost compared to traditional multi-Gbps GEO satellites.',
    highlights: [
      'MicroGEO concept: dedicated GEO satellite per customer/region',
      'Each satellite ~400 kg, 7.5-15 Gbps, built in months not years',
      'Arcturus: first operational satellite, serving Alaska (launched 2024)',
      'Multiple satellites launched for Pacific Islands, LatAm, Africa clients',
      'Built in San Francisco -- vertically integrated manufacturing',
      'Disrupting traditional GEO economics: $tens of millions vs. hundreds',
    ],
    useCase: 'Underserved regional broadband, telecom backhaul, dedicated enterprise',
  },
  {
    id: 'kepler',
    name: 'Kepler Communications',
    orbitType: 'LEO',
    frequencyBands: ['Ku-band', 'Ka-band (planned)'],
    capacityGbps: '4-40 Mbps per satellite',
    coverageArea: 'Global (store-and-forward + real-time)',
    constellationSize: '19 operational, 140+ planned',
    status: 'operational',
    founded: '2015',
    headquarters: 'Toronto, Ontario, Canada',
    keyProducts: ['Kepler IoT services', 'In-space connectivity relay', 'Global data store-and-forward', 'Aether Ku-band relay'],
    description: 'Canadian LEO operator focused on two markets: narrowband IoT connectivity and in-space data relay services. Kepler\'s unique Aether relay service provides Ku-band connectivity to other satellites, enabling operators to downlink data in near-real-time without building their own ground stations. Expanding from 19 to 140+ satellite constellation.',
    highlights: [
      'Aether: in-space relay service -- provides connectivity TO other satellites',
      'First commercial operator offering inter-satellite relay as a service',
      '19 operational Ku-band LEO satellites as of 2025',
      'IoT: store-and-forward for maritime, agriculture, mining, utilities',
      'Planning 140+ satellite constellation for continuous real-time global coverage',
      'Significant Canadian government (DND) and maritime customer base',
    ],
    useCase: 'IoT, in-space relay, maritime monitoring, remote asset management',
  },
  {
    id: 'swarm-spacex',
    name: 'Swarm Technologies (SpaceX)',
    orbitType: 'LEO',
    frequencyBands: ['VHF (137-150 MHz)'],
    capacityGbps: '750 bps - 1 kbps per device',
    coverageArea: 'Global',
    constellationSize: '150 SpaceBEE satellites (LEO, 450-550 km)',
    status: 'operational',
    founded: '2016 (acquired by SpaceX 2021)',
    headquarters: 'Palo Alto, California, USA',
    keyProducts: ['Swarm Tile (IoT modem)', 'Swarm Eval Kit', 'Swarm Hive (cloud platform)', 'Two-way IoT messaging'],
    description: 'Acquired by SpaceX in 2021, Swarm operates a constellation of 150 tiny SpaceBEE satellites (0.25U CubeSat size) providing ultra-low-cost global IoT connectivity. The Swarm Tile modem costs $5/month with no per-message fees. SpaceX is integrating Swarm\'s IoT capability into the broader Starlink ecosystem for machine-to-machine applications.',
    highlights: [
      'SpaceBEE: world\'s smallest operational commercial satellites (0.25U)',
      '150 satellites providing global two-way IoT messaging',
      'Swarm Tile modem: $119 hardware + $5/month unlimited data',
      'VHF band: excellent propagation, penetrates buildings and vegetation',
      'Acquired by SpaceX (2021) -- integrating with Starlink ecosystem',
      'Use cases: agriculture, maritime, utilities, asset tracking, weather stations',
    ],
    useCase: 'Ultra-low-cost IoT, asset tracking, agriculture, remote sensors',
  },
  {
    id: 'mynaric',
    name: 'Mynaric',
    orbitType: 'N/A',
    frequencyBands: ['1550 nm laser (optical terminals)'],
    capacityGbps: '10+ Gbps per terminal',
    coverageArea: 'N/A (terminal manufacturer)',
    constellationSize: 'N/A (hardware supplier)',
    status: 'operational',
    founded: '2009',
    headquarters: 'Munich, Germany',
    keyProducts: ['CONDOR Mk3 (space terminal)', 'HAWK (airborne terminal)', 'CONDOR Mk4 (next-gen)'],
    description: 'The world\'s leading manufacturer of laser communication terminals for space. Mynaric\'s CONDOR terminals are selected for the US Space Development Agency (SDA) Transport and Tracking Layer satellites, creating a massive military optical mesh network. Also supplying Northrop Grumman, L3Harris, and commercial constellation operators.',
    highlights: [
      'CONDOR Mk3: 10+ Gbps optical terminal selected for SDA Transport Layer',
      'Mass production facility in Los Angeles (1,000+ units/year capacity)',
      'Key supplier to SDA Tranche 1/2 Transport Layer via Northrop & L3Harris',
      'HAWK: air-to-space optical terminal for aircraft and UAVs',
      'Also selected by ESA HydRON and commercial constellation programs',
      'Enabling the shift from RF to optical inter-satellite links across the industry',
    ],
    useCase: 'Inter-satellite links, ground-to-space optical, air-to-space optical, military mesh',
  },
];

// ── Section 3: DSN Data ──

const DSN_COMPLEXES: DSNComplex[] = [
  {
    name: 'Goldstone Deep Space Communications Complex',
    location: 'Barstow, California, USA',
    country: 'United States',
    coordinates: '35.4267 N, 116.8900 W',
    established: 1958,
    antennas: [
      { designation: 'DSS-14 "Mars"', diameter: '70m', bands: ['S-band', 'X-band'], role: 'Primary deep space antenna, planetary radar' },
      { designation: 'DSS-24', diameter: '34m BWG', bands: ['S-band', 'X-band', 'Ka-band'], role: 'Beam waveguide, deep space tracking, arraying' },
      { designation: 'DSS-25', diameter: '34m BWG', bands: ['S-band', 'X-band', 'Ka-band'], role: 'Beam waveguide, DSOC ground station support' },
      { designation: 'DSS-26', diameter: '34m BWG', bands: ['S-band', 'X-band', 'Ka-band'], role: 'Beam waveguide, newest Goldstone antenna' },
      { designation: 'DSS-36', diameter: '34m BWG', bands: ['X-band', 'Ka-band'], role: 'Under construction, next-gen deep space antenna' },
    ],
    missionsServed: ['Voyager 1/2', 'Mars 2020/Perseverance', 'Juno', 'OSIRIS-REx', 'Psyche', 'Lucy', 'Europa Clipper', 'DART'],
  },
  {
    name: 'Canberra Deep Space Communication Complex',
    location: 'Tidbinbilla, ACT, Australia',
    country: 'Australia',
    coordinates: '35.4014 S, 148.9817 E',
    established: 1965,
    antennas: [
      { designation: 'DSS-43', diameter: '70m', bands: ['S-band', 'X-band'], role: 'Southern hemisphere primary, Voyager 2 sole contact' },
      { designation: 'DSS-34', diameter: '34m BWG', bands: ['S-band', 'X-band', 'Ka-band'], role: 'Beam waveguide, general deep space' },
      { designation: 'DSS-35', diameter: '34m BWG', bands: ['S-band', 'X-band', 'Ka-band'], role: 'Beam waveguide, Ka-band capable' },
      { designation: 'DSS-36', diameter: '34m BWG', bands: ['X-band', 'Ka-band'], role: 'Newest antenna, next-gen capabilities' },
    ],
    missionsServed: ['Voyager 2 (sole contact)', 'New Horizons', 'InSight', 'Mars Express', 'Chandrayaan', 'Hayabusa2'],
  },
  {
    name: 'Madrid Deep Space Communications Complex',
    location: 'Robledo de Chavela, Spain',
    country: 'Spain',
    coordinates: '40.4314 N, 4.2481 W',
    established: 1964,
    antennas: [
      { designation: 'DSS-63', diameter: '70m', bands: ['S-band', 'X-band'], role: 'European coverage primary, critical encounter support' },
      { designation: 'DSS-54', diameter: '34m BWG', bands: ['S-band', 'X-band', 'Ka-band'], role: 'Beam waveguide, general deep space' },
      { designation: 'DSS-55', diameter: '34m BWG', bands: ['S-band', 'X-band', 'Ka-band'], role: 'Beam waveguide, Ka-band capable' },
      { designation: 'DSS-56', diameter: '34m BWG', bands: ['S-band', 'X-band', 'Ka-band'], role: 'Newest Madrid antenna, multi-mission' },
    ],
    missionsServed: ['James Webb Space Telescope', 'Solar Orbiter', 'BepiColombo', 'Mars Express', 'Gaia', 'Euclid'],
  },
];

const DSN_STATS = {
  complexes: 3,
  totalAntennas: 13,
  seventyMeterDishes: 3,
  missionsSupported: '40+',
  maxDistance: '24+ billion km (Voyager 1)',
  operationalSince: 1958,
};

const FREQUENCY_BANDS = [
  { band: 'UHF', range: '0.3-1 GHz', use: 'LEO proximity links, EVA comms', maxRate: '10 Mbps', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { band: 'L-band', range: '1-2 GHz', use: 'Mobile satellite (Iridium, Inmarsat)', maxRate: '1.4 Mbps', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { band: 'S-band', range: '2-4 GHz', use: 'TT&C, deep space command', maxRate: '10 Mbps', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
  { band: 'C-band', range: '4-8 GHz', use: 'FSS, broadcast distribution', maxRate: '100 Mbps', color: 'text-teal-400', bgColor: 'bg-teal-500/10' },
  { band: 'X-band', range: '8-12 GHz', use: 'Deep space science data, military', maxRate: '800 Mbps', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  { band: 'Ku-band', range: '12-18 GHz', use: 'DTH broadcast, VSAT, Starlink', maxRate: '1+ Gbps', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  { band: 'Ka-band', range: '26.5-40 GHz', use: 'HTS broadband, deep space', maxRate: '100+ Gbps', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  { band: 'V-band', range: '40-75 GHz', use: 'Next-gen HTS (planned)', maxRate: '10+ Gbps/beam', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  { band: 'Optical', range: '100-400 THz', use: 'ISLs, high-rate relay', maxRate: '100+ Gbps', color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
];

const LATENCY_TABLE = [
  { destination: 'LEO (550 km)', oneWay: '~3.6 ms', roundTrip: '~7.2 ms', color: 'text-green-400' },
  { destination: 'MEO (8,000 km)', oneWay: '~27 ms', roundTrip: '~54 ms', color: 'text-cyan-400' },
  { destination: 'GEO (35,786 km)', oneWay: '~120 ms', roundTrip: '~240 ms', color: 'text-yellow-400' },
  { destination: 'Moon', oneWay: '~1.3 s', roundTrip: '~2.6 s', color: 'text-orange-400' },
  { destination: 'Mars (closest)', oneWay: '~3 min', roundTrip: '~6 min', color: 'text-red-400' },
  { destination: 'Mars (farthest)', oneWay: '~22 min', roundTrip: '~44 min', color: 'text-red-500' },
  { destination: 'Jupiter', oneWay: '~33-54 min', roundTrip: '~66-108 min', color: 'text-purple-400' },
  { destination: 'Saturn', oneWay: '~68-88 min', roundTrip: '~136-176 min', color: 'text-purple-500' },
  { destination: 'Voyager 1 (edge)', oneWay: '~22.5 hours', roundTrip: '~45 hours', color: 'text-slate-400' },
];

// ── Section 4: Emerging Trends ──

const EMERGING_TRENDS: EmergingTrend[] = [
  {
    id: 'direct-to-device',
    title: 'Direct-to-Device (D2D) Satellite',
    category: 'Connectivity',
    description: 'Connecting unmodified smartphones directly to satellites is the most disruptive trend in SATCOM. Multiple companies and standards bodies are racing to enable broadband from space to standard phones, eliminating the need for specialized satellite terminals.',
    keyPlayers: ['AST SpaceMobile', 'Lynk Global', 'SpaceX/T-Mobile', 'Apple/Globalstar', 'Qualcomm', '3GPP NTN'],
    timeline: '2024-2028',
    impact: 'transformative',
    details: [
      'AST SpaceMobile: broadband D2D at 14+ Mbps demonstrated, Block 1 operational',
      'SpaceX + T-Mobile: Starlink D2D for SMS (2024), voice/data (2025-2026)',
      'Apple + Globalstar: Emergency SOS on iPhone 14+, expanding to messaging',
      'Lynk Global: SMS-first D2D already commercial in 40+ countries',
      '3GPP Release 17/18: NTN (Non-Terrestrial Networks) standards for LTE/5G via satellite',
      'Qualcomm Snapdragon Satellite: modem chipset supporting direct satellite links',
      'Market potential: 750M+ people globally lack any cellular coverage',
    ],
  },
  {
    id: 'inter-satellite-links',
    title: 'Optical Inter-Satellite Links (ISLs)',
    category: 'Architecture',
    description: 'Laser crosslinks between satellites are replacing ground relay hops, creating space-based mesh networks with lower latency than terrestrial fiber for many routes. SpaceX alone has deployed 9,000+ laser terminals on Starlink, while military programs are building dedicated optical mesh networks.',
    keyPlayers: ['SpaceX/Starlink', 'Mynaric', 'Tesat-Spacecom', 'SDA Transport Layer', 'CACI', 'Rivada'],
    timeline: '2023-2030',
    impact: 'transformative',
    details: [
      'Starlink: 9,000+ laser terminals deployed, enabling polar coverage without ground stations',
      'SDA Transport Layer: 100+ LEO satellites with Mynaric CONDOR optical crosslinks',
      'ESA EDRS: 55,000+ laser relay sessions between LEO and GEO',
      'Mynaric CONDOR Mk3: 10+ Gbps, mass-produced in Los Angeles (1,000+/yr)',
      'Tesat-Spacecom LCT: heritage from EDRS, also selected for multiple programs',
      'Latency advantage: LEO mesh can beat submarine fiber for intercontinental routes',
      'Rivada OuterNET and Telesat Lightspeed both use full-mesh optical ISLs',
    ],
  },
  {
    id: 'lunar-comms',
    title: 'Lunar Communications Relay Network',
    category: 'Deep Space',
    description: 'The Artemis program and commercial lunar economy require a communications infrastructure around the Moon. NASA, ESA, and commercial providers are building relay networks at lunar distances to support surface operations, rovers, habitats, and the Gateway station.',
    keyPlayers: ['NASA (LunaNet)', 'ESA (Moonlight)', 'Intuitive Machines', 'Nokia Bell Labs', 'Crescent Space (Parsec)'],
    timeline: '2025-2032',
    impact: 'significant',
    details: [
      'NASA LunaNet: standards and architecture for lunar communications and navigation',
      'ESA Moonlight: planned 3-4 satellite relay constellation around the Moon',
      'Crescent Space (Parsec): commercial lunar relay with first pathfinder in 2025',
      'Intuitive Machines: contracted for NASA CLPS with lunar relay capability',
      'Nokia Bell Labs: 4G/LTE network on lunar surface (via Intuitive Machines lander)',
      'Lunar Gateway: will have optical and RF relay capability for surface ops',
      'Key challenge: South Pole coverage for Artemis Base Camp comms',
    ],
  },
  {
    id: 'mars-relay',
    title: 'Mars Relay Network',
    category: 'Deep Space',
    description: 'NASA is planning a dedicated Mars relay constellation to replace the aging fleet of Mars orbiters (MRO, MAVEN, TGO) currently providing relay services. Future Mars relay satellites would use optical communications for dramatically higher data rates and support the eventual human Mars missions.',
    keyPlayers: ['NASA JPL', 'NASA Glenn', 'ESA', 'SpaceX (aspirational)'],
    timeline: '2030-2040',
    impact: 'significant',
    details: [
      'Current relay: MRO (2006), MAVEN (2014), ESA TGO (2016) -- all aging',
      'Mars Relay Network study: 3-4 dedicated areosynchronous relay satellites',
      'DSOC demonstrated 267 Mbps optical from Mars distance -- key technology proof',
      'Optical relay could deliver 100+ Mbps from Mars surface vs. ~2 Mbps today',
      'DTN/Bundle Protocol planned as core networking standard for Mars',
      'Human Mars missions will need video-capable data rates (100s Mbps+)',
      'SpaceX Starlink-to-Mars aspirational concept (unconfirmed technical path)',
    ],
  },
  {
    id: 'ai-network-mgmt',
    title: 'AI-Driven Network Management',
    category: 'Operations',
    description: 'Machine learning and AI are being applied to satellite network management -- dynamically allocating beams, predicting interference, optimizing handovers between satellites, and managing spectrum sharing in increasingly congested orbital environments.',
    keyPlayers: ['SES (AI beam management)', 'Telesat', 'SpaceX', 'DARPA Space-BACN', 'Aalyria (ex-Google Loon)'],
    timeline: '2024-2030',
    impact: 'significant',
    details: [
      'O3b mPOWER: AI-driven dynamic beam forming across 5,000+ beams',
      'Starlink: automated collision avoidance and network optimization at scale',
      'DARPA Space-BACN: reconfigurable optical terminals for ad-hoc mesh networks',
      'Aalyria (Google Loon spinoff): Tightbeam network orchestration platform',
      'Predictive interference management for NGSO/GSO spectrum sharing',
      'Automated handover optimization for LEO constellations with 4-8 min passes',
      'Digital twin modeling of entire constellations for capacity planning',
    ],
  },
  {
    id: 'quantum-internet',
    title: 'Space-Based Quantum Internet',
    category: 'Quantum',
    description: 'Beyond QKD, researchers are working toward a full quantum internet using satellite-based entanglement distribution. This would enable quantum-secure communications, distributed quantum computing, and precision timing/sensing networks -- all mediated through space-based quantum relays.',
    keyPlayers: ['Micius team (China)', 'ESA SAGA', 'IQOQI Vienna', 'SpeQtral (Singapore)', 'Arqit (UK)'],
    timeline: '2028-2040',
    impact: 'moderate',
    details: [
      'Micius: demonstrated 1,200 km entanglement distribution and intercontinental QKD',
      'ESA SAGA: European quantum satellite constellation study',
      'SpeQtral: commercial QKD satellite startup (Singapore), demonstrations 2025+',
      'Arqit QuantumCloud: symmetric key agreement via satellite quantum channel',
      'Challenge: quantum memory and repeaters needed for truly global network',
      'Daylight operation and higher key rates remain active research areas',
      'Could underpin quantum-safe government and financial communications by 2035',
    ],
  },
];

// ── FAQ Items ──

const FAQ_ITEMS = [
  {
    question: 'What is the Deep Space Network (DSN)?',
    answer: 'The DSN is NASA\'s international network of large radio antennas managed by JPL. Three complexes in California, Australia, and Spain are spaced 120 degrees apart to ensure any deep space spacecraft can communicate with Earth at all times. The DSN supports 40+ active missions including Voyager, Mars rovers, and the James Webb Space Telescope.',
  },
  {
    question: 'What is the advantage of laser/optical communications in space?',
    answer: 'Optical (laser) communications can deliver 10-100x higher data rates than RF at the same power and mass. NASA\'s DSOC experiment achieved 267 Mbps from Mars distance. Laser terminals are also more compact and consume less power. However, laser links require precise pointing and can be affected by clouds on the ground.',
  },
  {
    question: 'How does direct-to-cell satellite service work?',
    answer: 'Companies like AST SpaceMobile and SpaceX/T-Mobile use satellites with very large antennas (phased arrays) that can communicate directly with standard unmodified smartphones using existing cellular bands. The satellite acts as a cell tower in space, connecting to phones using the same LTE/5G protocols. MNO partners provide the spectrum licenses.',
  },
  {
    question: 'What is the difference between GEO, MEO, and LEO satellite orbits?',
    answer: 'GEO (Geostationary, 35,786 km) satellites appear stationary, covering large areas but with ~240ms round-trip latency. MEO (2,000-35,786 km) like O3b mPOWER offers a middle ground with ~50-150ms latency. LEO (160-2,000 km) like Starlink provides the lowest latency (~7-20ms) but requires large constellations for continuous coverage as each satellite quickly passes overhead.',
  },
];

// ── Related Modules ──

const RELATED_MODULES = [
  { name: 'Satellite Tracker', description: 'Track satellites in real-time', href: '/satellites', icon: 'satellite' },
  { name: 'Spectrum Management', description: 'Frequency allocations and filings', href: '/spectrum', icon: 'radio' },
  { name: 'Spaceports', description: 'Global launch sites and DSN ground stations', href: '/spaceports', icon: 'rocket' },
  { name: 'Space Operations', description: 'Orbital management and operations', href: '/space-environment', icon: 'globe' },
  { name: 'Company Profiles', description: 'SATCOM company intelligence', href: '/company-profiles', icon: 'building' },
  { name: 'Marketplace', description: 'Find SATCOM products and services', href: '/marketplace', icon: 'shop' },
];

// ────────────────────────────────────────────────────────────────
// Utility Components
// ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    operational: 'text-green-400 bg-green-500/10 border-green-500/30',
    deploying: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    demonstrated: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    development: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    planned: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  };

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ${colors[status] || colors.development}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, string> = {
    transformative: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    significant: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    moderate: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  };

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ${colors[impact] || ''}`}>
      {impact.charAt(0).toUpperCase() + impact.slice(1)}
    </span>
  );
}

function MetricCard({ label, value, color = 'text-cyan-400' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-space-800/50 rounded-lg p-3">
      <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}

function HeroStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="card-elevated p-5 text-center">
      <div className={`text-3xl font-bold font-display tracking-tight ${color}`}>{value}</div>
      <div className="text-star-300/60 text-xs uppercase tracking-widest font-medium mt-1">{label}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Tab Content Components
// ────────────────────────────────────────────────────────────────

// ── Technologies Tab ──

function TechnologiesTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'rf', label: 'RF Communications' },
    { id: 'optical', label: 'Optical/Laser' },
    { id: 'quantum', label: 'Quantum' },
    { id: 'dtn', label: 'DTN Protocol' },
  ];

  const filtered = categoryFilter === 'all'
    ? COMM_TECHNOLOGIES
    : COMM_TECHNOLOGIES.filter((t) => t.category === categoryFilter);

  return (
    <div>
      {/* Banner */}
      <ScrollReveal>
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
          <h3 className="font-semibold text-white mb-1">The Laser Communications Revolution</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Space communications is undergoing its most significant transformation since the advent of satellite relay systems.
            NASA&apos;s DSOC achieved 267 Mbps from deep space -- 10-100x faster than radio -- while SpaceX has deployed
            over 9,000 laser terminals on Starlink. The SDA Transport Layer is building a military mesh network using optical
            crosslinks, and ESA&apos;s EDRS has completed over 55,000 laser relay sessions. By the end of this decade, optical
            communications will become the standard for high-rate space data links.
          </p>
        </div>
      </ScrollReveal>

      {/* Frequency Band Reference */}
      <ScrollReveal delay={0.1}>
        <div className="card-elevated p-6 border border-space-700 mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Space Communication Frequency Bands</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-space-700">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Band</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Frequency Range</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Primary Use</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Max Data Rate</th>
                </tr>
              </thead>
              <tbody>
                {FREQUENCY_BANDS.map((band, idx) => (
                  <tr key={band.band} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                    <td className={`py-2 px-3 font-bold ${band.color}`}>{band.band}</td>
                    <td className="py-2 px-3 text-white">{band.range}</td>
                    <td className="py-2 px-3 text-slate-300">{band.use}</td>
                    <td className="py-2 px-3 text-slate-300 font-medium">{band.maxRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* Signal Latency Reference */}
      <ScrollReveal delay={0.15}>
        <div className="card-elevated p-6 border border-space-700 mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Signal Latency by Distance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LATENCY_TABLE.map((entry) => (
              <div key={entry.destination} className="bg-space-800/50 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className={`text-sm font-medium ${entry.color}`}>{entry.destination}</div>
                  <div className="text-slate-500 text-xs">Round-trip: {entry.roundTrip}</div>
                </div>
                <div className="text-white font-bold text-sm">{entry.oneWay}</div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-slate-400 text-sm">Filter:</span>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              categoryFilter === cat.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Technology Cards */}
      <StaggerContainer className="space-y-5">
        {filtered.map((tech) => {
          const isExpanded = expandedId === tech.id;
          return (
            <StaggerItem key={tech.id}>
              <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg">{tech.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded">
                        {tech.category.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={tech.status} />
                </div>

                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {isExpanded ? tech.description : tech.description.slice(0, 200) + '...'}
                </p>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {tech.keyMetrics.map((metric) => (
                    <MetricCard key={metric.label} label={metric.label} value={metric.value} />
                  ))}
                </div>

                {isExpanded && (
                  <div className="space-y-4 mb-4">
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Technical Details</div>
                      <ul className="space-y-1.5">
                        {tech.details.map((detail, i) => (
                          <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                            <span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Programs</div>
                      <div className="flex flex-wrap gap-1.5">
                        {tech.programs.map((prog) => (
                          <span key={prog} className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
                            {prog}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : tech.id)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {isExpanded ? 'Show less' : 'Show details'} {isExpanded ? '\u2191' : '\u2193'}
                </button>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </div>
  );
}

// ── Providers Tab ──

function ProvidersTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orbitFilter, setOrbitFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const orbitTypes = ['all', 'LEO', 'MEO', 'GEO', 'Mixed', 'N/A'];
  const statuses = ['all', 'operational', 'deploying', 'development', 'planned'];

  const filtered = SATCOM_PROVIDERS.filter((p) => {
    if (orbitFilter !== 'all' && p.orbitType !== orbitFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.keyProducts.some((kp) => kp.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div>
      {/* Provider Stats */}
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <HeroStat value={String(SATCOM_PROVIDERS.length)} label="Providers Tracked" color="text-cyan-400" />
          <HeroStat
            value={String(SATCOM_PROVIDERS.filter((p) => p.status === 'operational').length)}
            label="Operational"
            color="text-green-400"
          />
          <HeroStat
            value={String(SATCOM_PROVIDERS.filter((p) => p.orbitType === 'LEO').length)}
            label="LEO Operators"
            color="text-blue-400"
          />
          <HeroStat
            value={String(SATCOM_PROVIDERS.filter((p) => p.orbitType === 'GEO').length)}
            label="GEO Operators"
            color="text-amber-400"
          />
        </div>
      </ScrollReveal>

      {/* Orbit Comparison Table */}
      <ScrollReveal delay={0.1}>
        <div className="card-elevated p-6 border border-space-700 mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Orbit Comparison: Tradeoffs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-space-700">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Factor</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">LEO</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">MEO</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">GEO</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { factor: 'Altitude', leo: '160-2,000 km', meo: '2,000-35,786 km', geo: '35,786 km' },
                  { factor: 'Latency (RT)', leo: '7-20 ms', meo: '50-150 ms', geo: '~240 ms' },
                  { factor: 'Coverage/Sat', leo: '~1,000 km diameter', meo: '~10,000 km', geo: '~1/3 of Earth' },
                  { factor: 'Constellation Size', leo: '100s-10,000s', meo: '10s-100s', geo: '1-3 for global' },
                  { factor: 'Sat Lifetime', leo: '5-7 years', meo: '10-15 years', geo: '15-20 years' },
                  { factor: 'Launch Cost/Gbps', leo: 'Lowest', meo: 'Medium', geo: 'Highest' },
                  { factor: 'Ground Tracking', leo: 'Continuous handovers', meo: 'Some handovers', geo: 'Fixed pointing' },
                  { factor: 'Key Players', leo: 'Starlink, OneWeb, Kuiper', meo: 'O3b mPOWER', geo: 'SES, Intelsat, Viasat' },
                ].map((row, idx) => (
                  <tr key={row.factor} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                    <td className="py-2 px-3 text-white font-medium">{row.factor}</td>
                    <td className="py-2 px-3 text-green-400">{row.leo}</td>
                    <td className="py-2 px-3 text-cyan-400">{row.meo}</td>
                    <td className="py-2 px-3 text-amber-400">{row.geo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="search"
            placeholder="Search providers, products, technologies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-space-800 border border-space-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={orbitFilter}
            onChange={(e) => setOrbitFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-space-800 border border-space-700 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            {orbitTypes.map((o) => (
              <option key={o} value={o}>{o === 'all' ? 'All Orbits' : o}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-space-800 border border-space-700 text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-slate-400 text-sm mb-4">
        Showing {filtered.length} of {SATCOM_PROVIDERS.length} providers
      </p>

      {/* Provider Cards */}
      <StaggerContainer className="space-y-5">
        {filtered.map((provider) => {
          const isExpanded = expandedId === provider.id;
          return (
            <StaggerItem key={provider.id}>
              <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg">{provider.name}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {provider.parent && (
                        <span className="text-slate-500 text-sm">({provider.parent})</span>
                      )}
                      <span className="text-cyan-400 text-sm font-medium">{provider.headquarters}</span>
                      <span className="text-slate-500 text-sm">Est. {provider.founded}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                    <StatusBadge status={provider.status} />
                    <span className="text-xs px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded">
                      {provider.orbitType}
                    </span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                  <MetricCard label="Orbit Type" value={provider.orbitType} />
                  <MetricCard label="Freq. Bands" value={provider.frequencyBands.join(', ')} />
                  <MetricCard label="Capacity" value={provider.capacityGbps} color="text-amber-400" />
                  <MetricCard label="Coverage" value={provider.coverageArea} />
                  <MetricCard label="Constellation" value={provider.constellationSize} />
                  <MetricCard label="Status" value={provider.status.charAt(0).toUpperCase() + provider.status.slice(1)} color={
                    provider.status === 'operational' ? 'text-green-400' :
                    provider.status === 'deploying' ? 'text-cyan-400' :
                    'text-amber-400'
                  } />
                </div>

                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {isExpanded ? provider.description : provider.description.slice(0, 200) + '...'}
                </p>

                {/* Key Products */}
                <div className="mb-4">
                  <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Products</div>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.keyProducts.map((prod) => (
                      <span key={prod} className="px-2 py-0.5 bg-space-700 text-cyan-300 border border-space-600 rounded text-xs">
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>

                {isExpanded && (
                  <div className="space-y-4 mb-4">
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Highlights</div>
                      <ul className="space-y-1.5">
                        {provider.highlights.map((h, i) => (
                          <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                            <span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Primary Use Cases</div>
                      <p className="text-slate-300 text-sm">{provider.useCase}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : provider.id)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {isExpanded ? 'Show less' : 'Show details'} {isExpanded ? '\u2191' : '\u2193'}
                </button>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400">No providers match the selected filters.</p>
          <button
            onClick={() => { setOrbitFilter('all'); setStatusFilter('all'); setSearchQuery(''); }}
            className="mt-3 text-sm text-cyan-400 hover:text-cyan-300"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

// ── DSN Tab ──

function DSNTab() {
  const [expandedComplex, setExpandedComplex] = useState<string | null>(null);

  return (
    <div>
      {/* DSN Overview Stats */}
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <HeroStat value={String(DSN_STATS.complexes)} label="Ground Complexes" color="text-cyan-400" />
          <HeroStat value={String(DSN_STATS.totalAntennas)} label="Total Antennas" color="text-green-400" />
          <HeroStat value={String(DSN_STATS.seventyMeterDishes)} label="70m Dishes" color="text-amber-400" />
          <HeroStat value={DSN_STATS.missionsSupported} label="Missions Supported" color="text-blue-400" />
          <HeroStat value={DSN_STATS.maxDistance} label="Maximum Range" color="text-purple-400" />
          <HeroStat value={String(DSN_STATS.operationalSince)} label="Operational Since" color="text-rose-400" />
        </div>
      </ScrollReveal>

      {/* DSN Overview Card */}
      <ScrollReveal delay={0.1}>
        <div className="card-elevated p-6 border border-space-700 mb-8">
          <h3 className="text-white font-semibold text-lg mb-2">NASA Deep Space Network Architecture</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            The Deep Space Network is NASA&apos;s international array of giant radio antennas, managed by the Jet Propulsion
            Laboratory. Three complexes -- Goldstone (California), Canberra (Australia), and Madrid (Spain) -- are spaced
            approximately 120 degrees apart around the Earth, ensuring that any spacecraft in deep space can communicate
            with at least one complex at all times as the Earth rotates. The DSN supports over 40 active interplanetary
            missions and is the only system capable of communicating with Voyager 1 and 2, now over 24 billion km from Earth.
          </p>
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4">
            <h4 className="text-white font-medium text-sm mb-2">120-Degree Spacing Principle</h4>
            <p className="text-slate-300 text-sm">
              With three complexes separated by ~120 degrees of longitude, the DSN guarantees continuous coverage: as one
              complex rotates out of view of a deep space target, the next complex rotates into view. This &quot;follow the sun&quot;
              architecture ensures no gaps in communication for missions beyond Earth orbit.
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* Antenna Types */}
      <ScrollReveal delay={0.15}>
        <div className="card-elevated p-6 border border-space-700 mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">DSN Antenna Types</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-space-700">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Type</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Diameter</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Bands</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Use</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Count</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: '70m Cassegrain', diameter: '70m', bands: 'S/X-band', use: 'Critical encounters, Voyager, planetary radar', count: '3 (one/complex)' },
                  { type: '34m Beam Waveguide (BWG)', diameter: '34m', bands: 'S/X/Ka-band', use: 'Primary tracking, Ka-band data, arraying', count: '8' },
                  { type: '34m High Efficiency (HEF)', diameter: '34m', bands: 'S/X-band', use: 'Legacy missions, radio science', count: '2' },
                ].map((row, idx) => (
                  <tr key={row.type} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
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
      </ScrollReveal>

      {/* Complex Cards */}
      <ScrollReveal delay={0.2}>
        <h3 className="text-white font-semibold text-lg mb-4">Ground Complexes</h3>
      </ScrollReveal>
      <StaggerContainer className="space-y-5 mb-8">
        {DSN_COMPLEXES.map((complex) => {
          const isExpanded = expandedComplex === complex.name;
          return (
            <StaggerItem key={complex.name}>
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

                {/* Antennas */}
                <div className="mb-4">
                  <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">
                    Antenna Assets ({complex.antennas.length})
                  </div>
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
                        {isExpanded && (
                          <p className="text-slate-400 text-xs mt-1">{antenna.role}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {isExpanded && (
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
                  onClick={() => setExpandedComplex(isExpanded ? null : complex.name)}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {isExpanded ? 'Show less' : 'Show details'} {isExpanded ? '\u2191' : '\u2193'}
                </button>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* ESA ESTRACK */}
      <ScrollReveal delay={0.1}>
        <div className="card-elevated p-6 border border-space-700 mb-8">
          <h3 className="text-white font-semibold text-lg mb-2">ESA ESTRACK Ground Station Network</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            ESA operates the European Space Tracking (ESTRACK) network, mirroring DSN architecture with three 35m
            deep space antennas spaced around the globe, plus smaller stations for LEO and launch support. ESA and
            NASA maintain cross-support agreements through CCSDS Space Link Extension (SLE) protocols.
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
                {[
                  { name: 'New Norcia (NNO)', location: 'Australia', diameter: '35m', bands: 'S/X/Ka', role: 'Deep space primary (southern)' },
                  { name: 'Cebreros (CEB)', location: 'Spain', diameter: '35m', bands: 'X/Ka', role: 'Deep space (European)' },
                  { name: 'Malargue (MLG)', location: 'Argentina', diameter: '35m', bands: 'X/Ka', role: 'Deep space (Americas)' },
                  { name: 'Kourou (KRU)', location: 'French Guiana', diameter: '15m', bands: 'S/X', role: 'Launch support, LEO tracking' },
                  { name: 'Redu (RDU)', location: 'Belgium', diameter: '15m', bands: 'S/X/Ka', role: 'LEO satellite control' },
                  { name: 'Santa Maria (SMA)', location: 'Azores', diameter: '5.5m', bands: 'S-band', role: 'Launcher tracking' },
                ].map((station, idx) => (
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
      </ScrollReveal>

      {/* Relay Architecture Comparison */}
      <ScrollReveal delay={0.15}>
        <div className="card-elevated p-6 border border-space-700">
          <h3 className="text-white font-semibold text-lg mb-4">Space Relay Networks Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-space-700">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Network</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Operator</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Orbit</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Link Type</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Data Rate</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'TDRSS', operator: 'NASA', orbit: 'GEO', link: 'RF (S/Ku/Ka)', rate: '800 Mbps', status: 'Operational' },
                  { name: 'EDRS SpaceDataHighway', operator: 'ESA/Airbus', orbit: 'GEO', link: 'Laser + Ka', rate: '1.8 Gbps', status: 'Operational' },
                  { name: 'LCRD', operator: 'NASA Goddard', orbit: 'GEO', link: 'Laser (1550 nm)', rate: '1.2 Gbps', status: 'Operational' },
                  { name: 'SDA Transport Layer', operator: 'US Space Force', orbit: 'LEO', link: 'Optical mesh', rate: '10 Gbps/link', status: 'Deploying' },
                  { name: 'Starshield', operator: 'SpaceX', orbit: 'LEO', link: 'Laser mesh', rate: 'Classified', status: 'Deploying' },
                  { name: 'AWS Ground Station', operator: 'Amazon', orbit: 'Ground', link: 'RF (S/X/UHF)', rate: '800 Mbps', status: 'Operational' },
                  { name: 'Azure Orbital', operator: 'Microsoft', orbit: 'Ground', link: 'RF (S/X/Ka)', rate: '1+ Gbps', status: 'Operational' },
                ].map((row, idx) => (
                  <tr key={row.name} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                    <td className="py-2 px-3 text-white font-medium">{row.name}</td>
                    <td className="py-2 px-3 text-slate-300">{row.operator}</td>
                    <td className="py-2 px-3 text-slate-300">{row.orbit}</td>
                    <td className="py-2 px-3 text-cyan-400">{row.link}</td>
                    <td className="py-2 px-3 text-amber-400 font-medium">{row.rate}</td>
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
      </ScrollReveal>
    </div>
  );
}

// ── Trends Tab ──

function TrendsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      {/* Trends Overview */}
      <ScrollReveal>
        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 border border-purple-500/30 rounded-xl p-5 mb-8">
          <h3 className="font-semibold text-white mb-1">The Future of Space Communications</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Space communications is at an inflection point. Direct-to-device connectivity will bring satellite service to
            every smartphone. Optical inter-satellite links are creating space-based mesh networks faster than terrestrial
            fiber for some routes. Lunar and Mars relay networks will extend the Internet to the solar system. And quantum
            communications may eventually provide unhackable links from orbit.
          </p>
        </div>
      </ScrollReveal>

      {/* Trend Cards */}
      <StaggerContainer className="space-y-5">
        {EMERGING_TRENDS.map((trend) => {
          const isExpanded = expandedId === trend.id;
          return (
            <StaggerItem key={trend.id}>
              <div className="card-elevated p-6 border border-space-700 hover:border-purple-500/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-lg">{trend.title}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-space-700 text-purple-300 border border-space-600 rounded">
                        {trend.category}
                      </span>
                      <span className="text-slate-400 text-sm">Timeline: {trend.timeline}</span>
                    </div>
                  </div>
                  <ImpactBadge impact={trend.impact} />
                </div>

                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {isExpanded ? trend.description : trend.description.slice(0, 200) + '...'}
                </p>

                {/* Key Players */}
                <div className="mb-4">
                  <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Players</div>
                  <div className="flex flex-wrap gap-1.5">
                    {trend.keyPlayers.map((player) => (
                      <span key={player} className="px-2 py-0.5 bg-space-700 text-cyan-300 border border-space-600 rounded text-xs">
                        {player}
                      </span>
                    ))}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mb-4">
                    <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Details</div>
                    <ul className="space-y-1.5">
                      {trend.details.map((detail, i) => (
                        <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5 flex-shrink-0">-</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : trend.id)}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {isExpanded ? 'Show less' : 'Show details'} {isExpanded ? '\u2191' : '\u2193'}
                </button>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Technology Readiness Timeline */}
      <ScrollReveal delay={0.2}>
        <div className="card-elevated p-6 border border-space-700 mt-8">
          <h3 className="text-white font-semibold text-lg mb-4">Technology Adoption Timeline</h3>
          <div className="space-y-4">
            {[
              { year: '2024-2025', status: 'Now', color: 'border-green-500', items: ['D2D SMS service (Lynk, SpaceX/T-Mobile)', 'LCRD + ILLUMA-T operational relay', 'SDA Tranche 1 optical mesh', 'O3b mPOWER full constellation'] },
              { year: '2025-2027', status: 'Near-term', color: 'border-cyan-500', items: ['AST SpaceMobile broadband D2D', 'Telesat Lightspeed first launches', 'Nokia 4G on the Moon', 'ESA Moonlight pathfinder'] },
              { year: '2027-2030', status: 'Mid-term', color: 'border-amber-500', items: ['V-band constellations (Starlink Gen3)', 'Rivada OuterNET operational', 'Commercial lunar relay service', 'Space QKD demonstrations scale'] },
              { year: '2030-2040', status: 'Long-term', color: 'border-purple-500', items: ['Mars optical relay constellation', 'Global quantum-safe satellite network', 'AI-autonomous network management', 'Terabit-class satellite systems'] },
            ].map((phase) => (
              <div key={phase.year} className={`border-l-2 ${phase.color} pl-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-semibold text-sm">{phase.year}</span>
                  <span className="text-xs px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded">
                    {phase.status}
                  </span>
                </div>
                <ul className="space-y-1">
                  {phase.items.map((item, i) => (
                    <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
                      <span className="text-slate-500 flex-shrink-0">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page Content (wrapped for Suspense)
// ────────────────────────────────────────────────────────────────

function SpaceCommsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = (searchParams.get('tab') as TabId) || 'technologies';

  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : 'technologies'
  );

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams();
    if (tabId !== 'technologies') params.set('tab', tabId);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <main className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <FAQSchema items={FAQ_ITEMS} />

        {/* Header */}
        <AnimatedPageHeader
          title="Space Communications"
          subtitle="RF, optical/laser, quantum, and DTN technologies. 15+ SATCOM provider profiles. DSN architecture. Emerging trends in direct-to-device and deep space relay networks."
          breadcrumb="Space Operations"
          accentColor="cyan"
        />

        {/* Hero Stats Row */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <HeroStat value="15+" label="SATCOM Providers" color="text-cyan-400" />
            <HeroStat value="10" label="Comm Technologies" color="text-green-400" />
            <HeroStat value="3" label="DSN Complexes" color="text-amber-400" />
            <HeroStat value="6" label="Emerging Trends" color="text-purple-400" />
          </div>
        </ScrollReveal>

        {/* Tab Navigation */}
        <div className="border-b border-space-700 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'technologies' && <TechnologiesTab />}
        {activeTab === 'providers' && <ProvidersTab />}
        {activeTab === 'dsn' && <DSNTab />}
        {activeTab === 'trends' && <TrendsTab />}

        {/* Related Modules */}
        <RelatedModules
          modules={RELATED_MODULES}
          title="Related Intelligence Modules"
        />
      </div>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────
// Page Export (Suspense boundary for useSearchParams)
// ────────────────────────────────────────────────────────────────

export default function SpaceCommsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-10 bg-slate-800 rounded-lg w-80" />
              <div className="h-5 bg-slate-800 rounded-lg w-full max-w-xl" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-slate-800 rounded-lg" />
                ))}
              </div>
              <div className="h-12 bg-slate-800 rounded-lg" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-slate-800 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </main>
      }
    >
      <SpaceCommsContent />
    </Suspense>
  );
}
