'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'active' | 'emerging' | 'comparison' | 'traffic' | 'communications';
type SpaceportStatus = 'operational' | 'under-construction' | 'planned' | 'limited';
type LaunchCapability = 'orbital' | 'suborbital' | 'both' | 'horizontal';

interface Spaceport {
  id: string;
  name: string;
  location: string;
  country: string;
  operator: string;
  latitude: number;
  longitude: number;
  yearEstablished: number;
  status: SpaceportStatus;
  launchCapability: LaunchCapability;
  inclinationRange: string;
  primaryVehicles: string[];
  launchPads: number;
  padDetails: string;
  recentLaunches2024: number;
  recentLaunches2023: number;
  maxPayloadClass: string;
  fuelingTypes: string[];
  rangeSafety: string;
  reuseLanding: string;
  description: string;
  highlights: string[];
}

interface EmergingSpaceport {
  id: string;
  name: string;
  location: string;
  country: string;
  developer: string;
  status: SpaceportStatus;
  targetDate: string;
  plannedCapabilities: string[];
  plannedVehicles: string[];
  investmentInfo: string;
  description: string;
  keyMilestones: string[];
}

interface TrafficRecord {
  siteId: string;
  siteName: string;
  country: string;
  launches2020: number;
  launches2021: number;
  launches2022: number;
  launches2023: number;
  launches2024: number;
  trend: 'up' | 'down' | 'stable';
  successRate: number;
}

type CommsSubTab = 'dsn' | 'relay' | 'optical' | 'lunar' | 'standards';

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
// Status & Capability Configs
// ────────────────────────────────────────

const STATUS_CONFIG: Record<SpaceportStatus, { label: string; bg: string; text: string; border: string }> = {
  operational: { label: 'Operational', bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/40' },
  'under-construction': { label: 'Under Construction', bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/40' },
  planned: { label: 'Planned', bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/40' },
  limited: { label: 'Limited Operations', bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/40' },
};

const CAPABILITY_CONFIG: Record<LaunchCapability, { label: string; color: string }> = {
  orbital: { label: 'Orbital', color: 'text-cyan-400' },
  suborbital: { label: 'Suborbital', color: 'text-blue-400' },
  both: { label: 'Orbital + Suborbital', color: 'text-emerald-400' },
  horizontal: { label: 'Horizontal Launch', color: 'text-purple-400' },
};

// ────────────────────────────────────────
// Active Spaceport Data
// ────────────────────────────────────────

const ACTIVE_SPACEPORTS: Spaceport[] = [
  {
    id: 'ksc',
    name: 'Kennedy Space Center',
    location: 'Merritt Island, Florida',
    country: 'United States',
    operator: 'NASA / SpaceX / Blue Origin',
    latitude: 28.5729,
    longitude: -80.6490,
    yearEstablished: 1962,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '28.5 - 57 degrees',
    primaryVehicles: ['Falcon 9', 'Falcon Heavy', 'SLS', 'Starship (planned)', 'New Glenn'],
    launchPads: 2,
    padDetails: 'LC-39A (SpaceX), LC-39B (NASA SLS / Blue Origin New Glenn)',
    recentLaunches2024: 37,
    recentLaunches2023: 31,
    maxPayloadClass: 'Super Heavy (130+ tonnes to LEO via SLS Block 2)',
    fuelingTypes: ['RP-1/LOX', 'LH2/LOX', 'CH4/LOX'],
    rangeSafety: 'Eastern Range (Space Force)',
    reuseLanding: 'LZ-1 and LZ-2 landing pads; drone ship recovery offshore',
    description: 'America\'s premier human spaceflight launch site since the Apollo era. LC-39A is the world\'s busiest orbital launch pad, operated by SpaceX for Falcon 9 and Falcon Heavy. LC-39B supports NASA\'s Space Launch System for Artemis lunar missions and is being prepared for Blue Origin New Glenn.',
    highlights: [
      'Most historic launch site in the US -- Apollo, Shuttle, Artemis',
      'LC-39A: world\'s highest-cadence orbital launch pad',
      'Supports the heaviest vehicles currently flying (SLS, Falcon Heavy)',
      'Adjacent to LZ-1/LZ-2 for booster landing and recovery',
    ],
  },
  {
    id: 'ccsfs',
    name: 'Cape Canaveral Space Force Station',
    location: 'Cape Canaveral, Florida',
    country: 'United States',
    operator: 'US Space Force / SpaceX / ULA',
    latitude: 28.4889,
    longitude: -80.5778,
    yearEstablished: 1950,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '28.5 - 57 degrees',
    primaryVehicles: ['Falcon 9', 'Vulcan Centaur', 'Atlas V (retired 2024)'],
    launchPads: 3,
    padDetails: 'SLC-40 (SpaceX Falcon 9), SLC-41 (ULA Vulcan/Atlas V), SLC-37B (ULA Delta IV retired)',
    recentLaunches2024: 35,
    recentLaunches2023: 41,
    maxPayloadClass: 'Heavy (27 tonnes to LEO via Vulcan Centaur)',
    fuelingTypes: ['RP-1/LOX', 'LH2/LOX', 'CH4/LOX'],
    rangeSafety: 'Eastern Range (Space Force)',
    reuseLanding: 'Drone ship recovery offshore; booster RTLS to KSC LZ-1',
    description: 'The oldest US launch site, operational since 1950. SLC-40 is SpaceX\'s workhorse pad for Falcon 9, handling the majority of Starlink and commercial missions from the Cape. SLC-41 hosts ULA\'s Vulcan Centaur, successor to Atlas V. Combined with KSC, the Cape Canaveral range is the world\'s busiest launch corridor.',
    highlights: [
      'SLC-40 handles the bulk of SpaceX Falcon 9 launches from Florida',
      'SLC-41 transitioned from Atlas V to Vulcan Centaur in 2024',
      'Delta IV Heavy retired in 2024 after final NRO mission from SLC-37B',
      'Over 900 orbital launches in the site\'s history',
    ],
  },
  {
    id: 'vandenberg',
    name: 'Vandenberg Space Force Base',
    location: 'Lompoc, California',
    country: 'United States',
    operator: 'US Space Force / SpaceX / ULA',
    latitude: 34.7420,
    longitude: -120.5724,
    yearEstablished: 1957,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '63 - 145 degrees (polar & SSO)',
    primaryVehicles: ['Falcon 9', 'Falcon Heavy', 'Vulcan Centaur (planned)'],
    launchPads: 2,
    padDetails: 'SLC-4E (SpaceX Falcon 9/Heavy), SLC-3E (ULA)',
    recentLaunches2024: 18,
    recentLaunches2023: 15,
    maxPayloadClass: 'Heavy (16 tonnes to polar LEO via Falcon Heavy)',
    fuelingTypes: ['RP-1/LOX', 'LH2/LOX'],
    rangeSafety: 'Western Range (Space Force)',
    reuseLanding: 'LZ-4 landing pad for booster RTLS; drone ship recovery Pacific',
    description: 'The primary US launch site for polar and sun-synchronous orbits. Located on California\'s central coast, Vandenberg launches southward over the Pacific Ocean, providing access to high-inclination and retrograde orbits essential for Earth observation and reconnaissance satellites.',
    highlights: [
      'Only US site capable of direct insertion to polar/SSO orbits',
      'Critical for NRO, DoD, and commercial Earth observation missions',
      'SpaceX LZ-4 enables booster return-to-launch-site recovery',
      'Falcon Heavy polar orbit capability operational since 2023',
    ],
  },
  {
    id: 'starbase',
    name: 'Starbase (Boca Chica)',
    location: 'Boca Chica, Texas',
    country: 'United States',
    operator: 'SpaceX',
    latitude: 25.9972,
    longitude: -97.1561,
    yearEstablished: 2019,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '26 - 57 degrees',
    primaryVehicles: ['Starship / Super Heavy'],
    launchPads: 2,
    padDetails: 'Orbital Launch Mount A (OLM-A, active), Orbital Launch Mount B (OLM-B, under construction)',
    recentLaunches2024: 6,
    recentLaunches2023: 2,
    maxPayloadClass: 'Super Heavy (100-150+ tonnes to LEO, fully reusable target)',
    fuelingTypes: ['CH4/LOX'],
    rangeSafety: 'FAA-licensed commercial site',
    reuseLanding: 'Mechazilla tower catch system for Super Heavy booster; ship landing TBD',
    description: 'SpaceX\'s dedicated Starship development and launch facility at the southern tip of Texas. The site achieved historic milestones with the first successful Super Heavy booster catch by the Mechazilla tower in October 2024 (Flight 5). Second launch mount under construction to increase cadence.',
    highlights: [
      'Only operational launch site for Starship/Super Heavy',
      'Mechazilla tower catch system for booster reuse (first achieved Oct 2024)',
      'Second orbital launch mount (OLM-B) under construction',
      'Largest rocket ever flown -- 33 Raptor engines on Super Heavy booster',
    ],
  },
  {
    id: 'wallops',
    name: 'Wallops Flight Facility / MARS',
    location: 'Wallops Island, Virginia',
    country: 'United States',
    operator: 'NASA / Virginia Space (MARS)',
    latitude: 37.8402,
    longitude: -75.4886,
    yearEstablished: 1945,
    status: 'operational',
    launchCapability: 'both',
    inclinationRange: '38 - 60 degrees',
    primaryVehicles: ['Northrop Grumman Antares (retired)', 'Rocket Lab Electron (planned)', 'Firefly Alpha (planned)'],
    launchPads: 2,
    padDetails: 'Pad-0A (Antares), Pad-0B (Minotaur / suborbital)',
    recentLaunches2024: 2,
    recentLaunches2023: 1,
    maxPayloadClass: 'Medium (8 tonnes to LEO via Antares 330)',
    fuelingTypes: ['RP-1/LOX', 'Solid'],
    rangeSafety: 'NASA Wallops Range',
    reuseLanding: 'None currently',
    description: 'NASA\'s oldest launch facility, now home to the Mid-Atlantic Regional Spaceport (MARS). Primary launch site for Cygnus cargo resupply missions to the ISS. Transitioning to new vehicles as Antares is retired. Rocket Lab LC-2 adjacent for Electron launches.',
    highlights: [
      'ISS cargo resupply via Cygnus spacecraft',
      'Rocket Lab Launch Complex 2 (LC-2) for Electron adjacent',
      'One of the oldest continuously operating launch sites globally',
      'Supports sounding rockets and suborbital research',
    ],
  },
  {
    id: 'mahia',
    name: 'Rocket Lab Launch Complex 1',
    location: 'Mahia Peninsula, North Island',
    country: 'New Zealand',
    operator: 'Rocket Lab',
    latitude: -39.2615,
    longitude: 177.8649,
    yearEstablished: 2016,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '39 - 98 degrees (SSO accessible)',
    primaryVehicles: ['Electron', 'Neutron (planned)'],
    launchPads: 2,
    padDetails: 'Pad A (primary), Pad B (second pad for higher cadence)',
    recentLaunches2024: 13,
    recentLaunches2023: 10,
    maxPayloadClass: 'Small (300 kg to LEO via Electron)',
    fuelingTypes: ['RP-1/LOX (electric turbopump)'],
    rangeSafety: 'New Zealand CAA licensed',
    reuseLanding: 'Helicopter mid-air catch (tested); parachute ocean recovery',
    description: 'The world\'s first private orbital launch complex, purpose-built by Rocket Lab for the Electron small-lift vehicle. Located on New Zealand\'s Mahia Peninsula, the site provides access to a wide range of inclinations including sun-synchronous orbits. Second pad added to support increased launch tempo.',
    highlights: [
      'First private orbital launch complex in history',
      'Highest-cadence small-launch site globally',
      'Wide inclination access from southern hemisphere location',
      'Neutron medium-lift vehicle site under development',
    ],
  },
  {
    id: 'kourou',
    name: 'Guiana Space Centre (CSG)',
    location: 'Kourou, French Guiana',
    country: 'France (EU)',
    operator: 'CNES / ESA / Arianespace',
    latitude: 5.2360,
    longitude: -52.7684,
    yearEstablished: 1968,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '5 - 100+ degrees (near-equatorial prime)',
    primaryVehicles: ['Ariane 6', 'Vega-C', 'Soyuz (suspended)'],
    launchPads: 3,
    padDetails: 'ELA-4 (Ariane 6), ZLV (Vega-C), ELS (Soyuz, suspended since 2022)',
    recentLaunches2024: 3,
    recentLaunches2023: 3,
    maxPayloadClass: 'Heavy (21.6 tonnes to LEO via Ariane 64)',
    fuelingTypes: ['LH2/LOX', 'Solid (P120C)', 'RP-1/LOX (Soyuz)'],
    rangeSafety: 'CNES range safety',
    reuseLanding: 'None (expendable vehicles)',
    description: 'Europe\'s primary spaceport, ideally situated near the equator for maximum GTO performance. The equatorial location provides a significant velocity boost for geostationary missions. Ariane 6 made its maiden flight in July 2024 from the new ELA-4 pad. Soyuz launches suspended since Russia\'s invasion of Ukraine.',
    highlights: [
      'Near-equatorial location gives 15%+ payload boost to GTO vs. Cape Canaveral',
      'Ariane 6 maiden flight July 2024 from ELA-4',
      'Vega-C return to flight in December 2024',
      'Strategic European autonomous access to space',
    ],
  },
  {
    id: 'baikonur',
    name: 'Baikonur Cosmodrome',
    location: 'Baikonur, Kazakhstan',
    country: 'Kazakhstan (leased to Russia)',
    operator: 'Roscosmos',
    latitude: 45.9650,
    longitude: 63.3050,
    yearEstablished: 1955,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '46 - 99 degrees',
    primaryVehicles: ['Soyuz-2.1a/b', 'Proton-M'],
    launchPads: 4,
    padDetails: 'Site 1/5 (Gagarin\'s Start, Soyuz crewed), Site 31/6 (Soyuz), Site 200 (Proton), others retired',
    recentLaunches2024: 10,
    recentLaunches2023: 11,
    maxPayloadClass: 'Heavy (23 tonnes to LEO via Proton-M)',
    fuelingTypes: ['RP-1/LOX', 'UDMH/N2O4 (Proton)'],
    rangeSafety: 'Roscosmos range; downrange in Kazakhstan',
    reuseLanding: 'None (all expendable)',
    description: 'The world\'s first and oldest spaceport, operational since 1955. Launch site for Sputnik, Vostok (first human in space), and every crewed Soyuz mission to the ISS. Leased from Kazakhstan by Russia through 2050. Activity declining as Russia develops Vostochny cosmodrome as its domestic replacement.',
    highlights: [
      'World\'s first spaceport -- launched Sputnik (1957) and Yuri Gagarin (1961)',
      'Sole launch site for crewed Soyuz missions to the ISS',
      'Over 1,500 orbital launches in its history',
      'Proton-M remains Russia\'s heavy-lift workhorse',
    ],
  },
  {
    id: 'plesetsk',
    name: 'Plesetsk Cosmodrome',
    location: 'Mirny, Arkhangelsk Oblast',
    country: 'Russia',
    operator: 'Russian Aerospace Forces',
    latitude: 62.9271,
    longitude: 40.5777,
    yearEstablished: 1957,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '63 - 83 degrees (high inclination)',
    primaryVehicles: ['Soyuz-2.1a/b/v', 'Angara-A5', 'Rockot (retired)'],
    launchPads: 3,
    padDetails: 'Site 43 (Soyuz-2), Site 35 (Angara), Site 133 (Soyuz)',
    recentLaunches2024: 8,
    recentLaunches2023: 8,
    maxPayloadClass: 'Heavy (24.5 tonnes to LEO via Angara-A5)',
    fuelingTypes: ['RP-1/LOX', 'LH2/LOX (Angara upper stage)'],
    rangeSafety: 'Military range safety',
    reuseLanding: 'None',
    description: 'Russia\'s primary military launch site and the world\'s most northerly orbital spaceport. Originally an ICBM base, Plesetsk handles most Russian military and GLONASS navigation satellite launches. Its high latitude makes it ideal for high-inclination and polar orbits.',
    highlights: [
      'Most northerly operational orbital launch site',
      'Primary site for Russian military and GLONASS launches',
      'Angara-A5 heavy-lift rocket operational from Site 35',
      'More total launches than any other spaceport (over 1,600)',
    ],
  },
  {
    id: 'vostochny',
    name: 'Vostochny Cosmodrome',
    location: 'Tsiolkovsky, Amur Oblast',
    country: 'Russia',
    operator: 'Roscosmos',
    latitude: 51.8844,
    longitude: 128.3334,
    yearEstablished: 2016,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '52 - 98 degrees',
    primaryVehicles: ['Soyuz-2.1a/b', 'Angara-A5 (pad under construction)'],
    launchPads: 1,
    padDetails: 'Launch Complex 1S (Soyuz-2), Complex 1A (Angara, under construction)',
    recentLaunches2024: 4,
    recentLaunches2023: 4,
    maxPayloadClass: 'Medium (8 tonnes to LEO via Soyuz-2.1b)',
    fuelingTypes: ['RP-1/LOX'],
    rangeSafety: 'Roscosmos; downrange over Pacific Ocean',
    reuseLanding: 'None',
    description: 'Russia\'s newest cosmodrome, built in the Russian Far East to reduce dependence on Baikonur (leased from Kazakhstan). First launch in April 2016. An Angara-A5 pad is under construction to give Russia independent heavy-lift capability from its own territory.',
    highlights: [
      'Russia\'s first new cosmodrome since the Soviet era',
      'Provides Russian sovereign launch access (no foreign lease)',
      'Angara-A5 pad under construction for heavy-lift missions',
      'Luna-25 launched from Vostochny in August 2023',
    ],
  },
  {
    id: 'jiuquan',
    name: 'Jiuquan Satellite Launch Center',
    location: 'Gobi Desert, Inner Mongolia',
    country: 'China',
    operator: 'CNSA / CASC',
    latitude: 40.9606,
    longitude: 100.2910,
    yearEstablished: 1958,
    status: 'operational',
    launchCapability: 'both',
    inclinationRange: '41 - 97 degrees',
    primaryVehicles: ['Long March 2C/2D/2F/4B/4C/11', 'Kuaizhou-1A', 'CERES-1'],
    launchPads: 4,
    padDetails: 'SLS-1 (LM-2F crewed), Pads 43, 603, 921; commercial pad area',
    recentLaunches2024: 22,
    recentLaunches2023: 18,
    maxPayloadClass: 'Medium (8.4 tonnes to LEO via Long March 2F)',
    fuelingTypes: ['UDMH/N2O4', 'RP-1/LOX (Kuaizhou)', 'Solid'],
    rangeSafety: 'CNSA range safety; inland trajectory',
    reuseLanding: 'None',
    description: 'China\'s oldest and most versatile launch center. Sole launch site for Chinese crewed missions (Shenzhou) and Tiangong space station modules launched on Long March 2F. Also hosts numerous commercial launches from Kuaizhou and CERES-1 solid-fuel rockets.',
    highlights: [
      'China\'s sole crewed spaceflight launch site (Shenzhou/Tiangong)',
      'Highest launch cadence of any Chinese spaceport',
      'Hosts multiple commercial launch providers (iSpace, Galactic Energy)',
      'Launched China\'s first satellite (Dong Fang Hong 1, 1970)',
    ],
  },
  {
    id: 'xichang',
    name: 'Xichang Satellite Launch Center',
    location: 'Xichang, Sichuan Province',
    country: 'China',
    operator: 'CNSA / CASC',
    latitude: 28.2468,
    longitude: 102.0267,
    yearEstablished: 1970,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '28 - 59 degrees',
    primaryVehicles: ['Long March 3B/3C/2C'],
    launchPads: 3,
    padDetails: 'LC-2, LC-3 (Long March 3B/3C), new commercial pad',
    recentLaunches2024: 12,
    recentLaunches2023: 14,
    maxPayloadClass: 'Medium-Heavy (12 tonnes to LEO, 5.5 tonnes to GTO via LM-3B)',
    fuelingTypes: ['UDMH/N2O4', 'LH2/LOX (3rd stage)'],
    rangeSafety: 'CNSA range; inland trajectories over populated areas',
    reuseLanding: 'None',
    description: 'China\'s primary launch site for geostationary orbit missions, including BeiDou navigation satellites. Located in the mountains of Sichuan Province. The lower latitude (28 deg N) provides good GTO performance. Expanding with commercial launch pad infrastructure.',
    highlights: [
      'Primary site for China\'s BeiDou navigation constellation',
      'GTO specialist -- best Chinese site for geostationary launches',
      'Over 200 launches in operational history',
      'Inland location requires careful range safety for spent stages',
    ],
  },
  {
    id: 'wenchang',
    name: 'Wenchang Space Launch Site',
    location: 'Wenchang, Hainan Province',
    country: 'China',
    operator: 'CNSA / CASC',
    latitude: 19.6145,
    longitude: 110.9510,
    yearEstablished: 2014,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '19.6 - 59 degrees (lowest latitude in China)',
    primaryVehicles: ['Long March 5/5B/7/7A/8', 'CZ-12 (planned)'],
    launchPads: 3,
    padDetails: 'LC-101 (LM-5/5B), LC-201 (LM-7/7A), commercial pad',
    recentLaunches2024: 13,
    recentLaunches2023: 7,
    maxPayloadClass: 'Heavy (25 tonnes to LEO via Long March 5B)',
    fuelingTypes: ['RP-1/LOX', 'LH2/LOX'],
    rangeSafety: 'Coastal site; launches over South China Sea',
    reuseLanding: 'Landing pad under construction for reusable vehicles',
    description: 'China\'s newest and most modern spaceport, located on the coast of Hainan Island. Its low latitude and coastal location allow the largest Chinese rockets (Long March 5 series) to launch over water. Sole launch site for Tiangong space station resupply (Tianzhou on LM-7) and heavy-lift missions.',
    highlights: [
      'Lowest latitude Chinese launch site (19.6 deg N) for maximum GTO performance',
      'Coastal location eliminates inland debris risk',
      'Only Chinese site supporting Long March 5 heavy-lift vehicle',
      'Commercial launch zone under rapid development',
    ],
  },
  {
    id: 'taiyuan',
    name: 'Taiyuan Satellite Launch Center',
    location: 'Kelan County, Shanxi Province',
    country: 'China',
    operator: 'CNSA / CASC',
    latitude: 38.8490,
    longitude: 111.6080,
    yearEstablished: 1967,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '82 - 98 degrees (polar/SSO)',
    primaryVehicles: ['Long March 4B/4C/6/6A', 'Kuaizhou-1A/11'],
    launchPads: 2,
    padDetails: 'LC-7 (Long March 4/6 series), LC-16 (Kuaizhou)',
    recentLaunches2024: 10,
    recentLaunches2023: 8,
    maxPayloadClass: 'Medium (4.2 tonnes to SSO via Long March 6A)',
    fuelingTypes: ['UDMH/N2O4', 'RP-1/LOX (LM-6)', 'Solid (Kuaizhou)'],
    rangeSafety: 'CNSA range; inland trajectory',
    reuseLanding: 'None',
    description: 'China\'s dedicated polar and sun-synchronous orbit launch site, similar in function to Vandenberg in the US. Located in Shanxi Province, Taiyuan handles the majority of Chinese Earth observation, weather, and remote sensing satellite launches.',
    highlights: [
      'China\'s primary polar/SSO launch site',
      'Analog to Vandenberg for sun-synchronous missions',
      'Long March 6A with solid boosters operational since 2022',
      'Supports both liquid and solid-fuel vehicles',
    ],
  },
  {
    id: 'sriharikota',
    name: 'Satish Dhawan Space Centre (SDSC SHAR)',
    location: 'Sriharikota, Andhra Pradesh',
    country: 'India',
    operator: 'ISRO',
    latitude: 13.7199,
    longitude: 80.2304,
    yearEstablished: 1971,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '14 - 99 degrees',
    primaryVehicles: ['PSLV', 'GSLV Mk II', 'LVM3 (GSLV Mk III)', 'SSLV'],
    launchPads: 2,
    padDetails: 'First Launch Pad (FLP), Second Launch Pad (SLP)',
    recentLaunches2024: 7,
    recentLaunches2023: 7,
    maxPayloadClass: 'Medium-Heavy (10 tonnes to LEO via LVM3)',
    fuelingTypes: ['UDMH/N2O4', 'Solid (HTPB)', 'LH2/LOX (cryogenic upper stage)'],
    rangeSafety: 'ISRO range; launches over Bay of Bengal',
    reuseLanding: 'Reusable launch vehicle technology demonstrator program active',
    description: 'India\'s sole orbital launch center, located on a barrier island off the coast of Andhra Pradesh. Supports all ISRO launch vehicles from SSLV small-lift to LVM3 heavy-lift. Site of Chandrayaan-3 lunar lander mission launch (July 2023). Expanding capacity with new pads under construction.',
    highlights: [
      'Launched Chandrayaan-3 (2023) and Mangalyaan Mars orbiter (2013)',
      'PSLV is one of the most reliable rockets globally (50+ consecutive successes)',
      'LVM3 selected for Gaganyaan crewed mission',
      'Near-equatorial location ideal for GTO missions',
    ],
  },
  {
    id: 'tanegashima',
    name: 'Tanegashima Space Center',
    location: 'Tanegashima Island, Kagoshima',
    country: 'Japan',
    operator: 'JAXA',
    latitude: 30.4009,
    longitude: 130.9700,
    yearEstablished: 1969,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '30 - 99 degrees',
    primaryVehicles: ['H3', 'H-IIA (retired 2024)', 'Epsilon S (in development)'],
    launchPads: 2,
    padDetails: 'Yoshinobu Launch Complex (H3/H-IIA), Osaki Range (Epsilon)',
    recentLaunches2024: 4,
    recentLaunches2023: 2,
    maxPayloadClass: 'Medium-Heavy (6.5 tonnes to GTO via H3-24)',
    fuelingTypes: ['LH2/LOX', 'Solid (Epsilon boosters)'],
    rangeSafety: 'JAXA range; launches over Pacific Ocean',
    reuseLanding: 'None currently; reusable vehicle research ongoing',
    description: 'Japan\'s primary orbital launch facility, located on Tanegashima Island in southern Japan. The H3 rocket, successor to the long-serving H-IIA, achieved its first successful mission in February 2024. Sometimes called "the most beautiful launch site in the world" due to its coastal tropical setting.',
    highlights: [
      'H3 first successful flight in February 2024',
      'H-IIA retired in 2024 after 98% success rate over 47 flights',
      'Launched SLIM lunar lander (Japan\'s first Moon landing, Jan 2024)',
      'Coastal Pacific location ideal for GTO and polar trajectories',
    ],
  },
  {
    id: 'uchinoura',
    name: 'Uchinoura Space Center',
    location: 'Kimotsuki, Kagoshima',
    country: 'Japan',
    operator: 'JAXA',
    latitude: 31.2510,
    longitude: 131.0810,
    yearEstablished: 1962,
    status: 'operational',
    launchCapability: 'both',
    inclinationRange: '31 - 80 degrees',
    primaryVehicles: ['Epsilon', 'SS-520', 'Sounding rockets'],
    launchPads: 2,
    padDetails: 'Mu Center (Epsilon), KS Center (sounding rockets)',
    recentLaunches2024: 1,
    recentLaunches2023: 1,
    maxPayloadClass: 'Small (1.5 tonnes to LEO via Epsilon)',
    fuelingTypes: ['Solid'],
    rangeSafety: 'JAXA range',
    reuseLanding: 'None',
    description: 'JAXA\'s secondary launch facility specializing in solid-fuel rockets and sounding rockets. Originally the Kagoshima Space Center, it has supported Japan\'s scientific satellite program since the 1960s. The Epsilon series small launch vehicle operates from this site.',
    highlights: [
      'Japan\'s solid rocket heritage site since 1960s',
      'Epsilon launch vehicle for small scientific payloads',
      'SS-520 set record as smallest orbital rocket (2018)',
      'Active sounding rocket program for space science',
    ],
  },
  {
    id: 'semnan',
    name: 'Imam Khomeini Space Center',
    location: 'Semnan Province',
    country: 'Iran',
    operator: 'ISA (Iranian Space Agency)',
    latitude: 35.2346,
    longitude: 53.9208,
    yearEstablished: 2000,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '55 - 65 degrees',
    primaryVehicles: ['Simorgh', 'Qased', 'Zoljanah'],
    launchPads: 1,
    padDetails: 'Single orbital launch pad',
    recentLaunches2024: 3,
    recentLaunches2023: 2,
    maxPayloadClass: 'Very Small (under 100 kg to LEO)',
    fuelingTypes: ['UDMH/N2O4', 'Solid'],
    rangeSafety: 'Iranian military range',
    reuseLanding: 'None',
    description: 'Iran\'s primary orbital launch site in Semnan Province. Launched Iran\'s first satellite (Omid) in 2009. The program has had mixed success rates, with several failures alongside successful orbital insertions. Vehicle capabilities remain limited to small payloads.',
    highlights: [
      'Iran\'s only operational orbital launch facility',
      'Successfully orbited satellites since 2009',
      'Multiple vehicle types in development (liquid and solid)',
      'Subject to international sanctions affecting technology access',
    ],
  },
  {
    id: 'palmachim',
    name: 'Palmachim Airbase',
    location: 'Yavne, Central District',
    country: 'Israel',
    operator: 'Israel Ministry of Defense / IAI',
    latitude: 31.8847,
    longitude: 34.6827,
    yearEstablished: 1988,
    status: 'operational',
    launchCapability: 'orbital',
    inclinationRange: '142 - 144 degrees (retrograde only)',
    primaryVehicles: ['Shavit'],
    launchPads: 1,
    padDetails: 'Single launch pad for Shavit',
    recentLaunches2024: 1,
    recentLaunches2023: 0,
    maxPayloadClass: 'Very Small (350 kg to retrograde LEO)',
    fuelingTypes: ['Solid'],
    rangeSafety: 'Launches westward over Mediterranean (retrograde)',
    reuseLanding: 'None',
    description: 'Israel\'s sole orbital launch site. Uniquely, Israel must launch westward (retrograde orbit) over the Mediterranean Sea due to geopolitical constraints -- launching eastward would overfly hostile nations. This results in a significant payload penalty but ensures range safety.',
    highlights: [
      'Only country that launches westward (retrograde orbit)',
      'Shavit all-solid-fuel launch vehicle based on Jericho missile',
      'Supports Israeli reconnaissance satellite program (Ofek series)',
      'Geopolitical constraints dictate unique retrograde trajectory',
    ],
  },
  {
    id: 'alcantara',
    name: 'Alcantara Launch Center',
    location: 'Alcantara, Maranhao',
    country: 'Brazil',
    operator: 'Brazilian Air Force / AEB',
    latitude: -2.3730,
    longitude: -44.3964,
    yearEstablished: 1983,
    status: 'limited',
    launchCapability: 'both',
    inclinationRange: '2 - 100 degrees (near-equatorial prime)',
    primaryVehicles: ['VLM (under development)', 'Sounding rockets'],
    launchPads: 2,
    padDetails: 'CLA Tower 1 (orbital, rebuilding), Mobile launch platform (suborbital)',
    recentLaunches2024: 0,
    recentLaunches2023: 0,
    maxPayloadClass: 'Small (planned, VLM)',
    fuelingTypes: ['Solid', 'Liquid (planned)'],
    rangeSafety: 'Brazilian Air Force range; launches over Atlantic',
    reuseLanding: 'None',
    description: 'Located just 2.3 degrees south of the equator, Alcantara has the best equatorial location of any spaceport in the Americas. Despite this advantage, the orbital program has been slow to develop following a fatal pad accident in 2003. A Technology Safeguards Agreement with the US (signed 2019) is enabling commercial partnerships.',
    highlights: [
      'Closest launch site to the equator in the Western Hemisphere',
      'Maximum equatorial velocity boost for GTO missions',
      'US Technology Safeguards Agreement signed 2019 enabling commercial use',
      'Recovering from 2003 VLS-1 accident that killed 21 technicians',
    ],
  },
  {
    id: 'kodiak',
    name: 'Pacific Spaceport Complex - Alaska',
    location: 'Kodiak Island, Alaska',
    country: 'United States',
    operator: 'Alaska Aerospace Corporation',
    latitude: 57.4356,
    longitude: -152.3378,
    yearEstablished: 1998,
    status: 'operational',
    launchCapability: 'both',
    inclinationRange: '63 - 116 degrees (polar/SSO)',
    primaryVehicles: ['Astra Rocket (retired)', 'suborbital interceptors'],
    launchPads: 2,
    padDetails: 'LP-1 (orbital), LP-2 (suborbital/missile defense)',
    recentLaunches2024: 1,
    recentLaunches2023: 1,
    maxPayloadClass: 'Small (planned future capability)',
    fuelingTypes: ['RP-1/LOX', 'Solid'],
    rangeSafety: 'Alaska Aerospace / DoD range',
    reuseLanding: 'None',
    description: 'Located on Kodiak Island, Alaska, this site offers excellent polar orbit access with overwater trajectories in all directions. Primarily used for missile defense tests and suborbital launches. Astra operated from this site before ceasing operations. Seeking new commercial orbital launch customers.',
    highlights: [
      'Excellent polar/SSO orbit access from high latitude',
      'Overwater launch trajectories in multiple directions',
      'Supports DoD missile defense testing',
      'Remote island location provides natural range safety',
    ],
  },
];

// ────────────────────────────────────────
// Emerging Spaceport Data
// ────────────────────────────────────────

const EMERGING_SPACEPORTS: EmergingSpaceport[] = [
  {
    id: 'saxavord',
    name: 'SaxaVord Spaceport',
    location: 'Unst, Shetland Islands',
    country: 'United Kingdom',
    developer: 'SaxaVord UK',
    status: 'under-construction',
    targetDate: '2025',
    plannedCapabilities: ['Vertical orbital launch', 'Polar/SSO orbits', 'Sub-500 kg class'],
    plannedVehicles: ['RFA One (Rocket Factory Augsburg)', 'HyImpulse SL1', 'ABL Space RS1'],
    investmentInfo: 'Approximately GBP 50M+ total investment; UK Space Agency grants + private funding',
    description: 'The most northerly spaceport in development, located on the island of Unst in Shetland. SaxaVord will provide vertical launch capability for small orbital rockets targeting polar and sun-synchronous orbits. Multiple launch providers have signed agreements. The first launch was expected in 2024 but has slipped.',
    keyMilestones: [
      'Vertical launch area cleared and ground infrastructure constructed',
      'RFA One selected as initial launch customer',
      'UK CAA orbital launch license application submitted',
      'FAA-equivalent range safety system being implemented',
    ],
  },
  {
    id: 'sutherland',
    name: 'Space Hub Sutherland',
    location: 'A\'Mhoine Peninsula, Sutherland, Scotland',
    country: 'United Kingdom',
    developer: 'Highlands and Islands Enterprise / Orbex',
    status: 'under-construction',
    targetDate: '2025-2026',
    plannedCapabilities: ['Vertical orbital launch', 'Polar/SSO orbits', 'Small satellite class'],
    plannedVehicles: ['Orbex Prime'],
    investmentInfo: 'GBP 17.3M UK Space Agency funding; total project GBP 20M+',
    description: 'Space Hub Sutherland on the A\'Mhoine Peninsula in the Scottish Highlands is being developed specifically for Orbex\'s Prime rocket. It will be the first carbon-neutral spaceport, using bio-propane fuel. The site offers direct polar orbit access launching northward over the Atlantic.',
    keyMilestones: [
      'Planning permission granted after legal challenges resolved',
      'Site preparation and access road construction underway',
      'Orbex Prime rocket in final development and testing',
      'Targeting world\'s first carbon-neutral orbital launch',
    ],
  },
  {
    id: 'andoya',
    name: 'Andoya Spaceport',
    location: 'Andenes, Andoya Island',
    country: 'Norway',
    developer: 'Andoya Space',
    status: 'under-construction',
    targetDate: '2025',
    plannedCapabilities: ['Orbital launch', 'Polar/SSO orbits', 'Suborbital missions'],
    plannedVehicles: ['Isar Aerospace Spectrum', 'Various small launchers'],
    investmentInfo: 'NOK 1.5B (approximately USD 150M); Norwegian government + EU funding',
    description: 'Andoya Spaceport in northern Norway is Europe\'s first continental orbital launch site. Located above the Arctic Circle, it offers ideal trajectories for polar and SSO orbits. Andoya Space has decades of sounding rocket heritage and is now building orbital launch infrastructure. Isar Aerospace signed as anchor customer.',
    keyMilestones: [
      'Launch pad construction and integration facility underway',
      'Isar Aerospace Spectrum signed as first orbital customer',
      'Heritage of 1,200+ sounding rocket launches since 1962',
      'Norwegian Space Agency and ESA support for European launch autonomy',
    ],
  },
  {
    id: 'spaceport-america',
    name: 'Spaceport America',
    location: 'Sierra County, New Mexico',
    country: 'United States',
    developer: 'New Mexico Spaceport Authority',
    status: 'operational',
    targetDate: 'Operational (suborbital)',
    plannedCapabilities: ['Horizontal suborbital launch', 'Vertical orbital (planned)', 'Space tourism'],
    plannedVehicles: ['Virgin Galactic SpaceShipTwo', 'SpinLaunch (testing)', 'AeroVelo'],
    investmentInfo: 'USD 225M in state funding; designed by Foster + Partners',
    description: 'The world\'s first purpose-built commercial spaceport, designed by Norman Foster. Primary base for Virgin Galactic commercial suborbital space tourism flights. Includes a 12,000-ft runway and vertical launch area. Has hosted SpinLaunch kinetic energy launcher testing. Seeking orbital launch tenants.',
    keyMilestones: [
      'Virgin Galactic began commercial space tourism flights in 2023',
      'SpinLaunch suborbital accelerator testing conducted',
      'Multiple horizontal and vertical launch areas available',
      'Vertical orbital launch site development in planning',
    ],
  },
  {
    id: 'cecil',
    name: 'Cecil Spaceport',
    location: 'Jacksonville, Florida',
    country: 'United States',
    developer: 'Jacksonville Aviation Authority',
    status: 'operational',
    targetDate: 'Operational (horizontal)',
    plannedCapabilities: ['Horizontal launch', 'Drone operations', 'Spacecraft landing'],
    plannedVehicles: ['Various air-launch systems', 'Drone / UAS operations'],
    investmentInfo: 'FAA-licensed spaceport; former Naval Air Station Cecil Field',
    description: 'Located at the former Naval Air Station Cecil Field in Jacksonville, Florida. FAA-licensed for horizontal launch operations. Primarily focused on horizontal launch systems, drone operations, and potential spacecraft landing operations. Has a 12,500-ft runway suitable for carrier aircraft.',
    keyMilestones: [
      'FAA spaceport license received in 2010',
      'Converted from decommissioned Naval Air Station',
      '12,500-ft runway capable of supporting carrier aircraft',
      'Active drone and UAS testing operations',
    ],
  },
  {
    id: 'houston',
    name: 'Houston Spaceport',
    location: 'Ellington Field, Houston, Texas',
    country: 'United States',
    developer: 'Houston Airport System',
    status: 'operational',
    targetDate: 'Operational (horizontal)',
    plannedCapabilities: ['Horizontal launch', 'Spacecraft assembly/testing', 'Commercial astronaut training'],
    plannedVehicles: ['Collins Aerospace operations', 'Intuitive Machines operations'],
    investmentInfo: 'FAA-licensed; located at Ellington Field near NASA JSC',
    description: 'Located at Ellington Field adjacent to NASA Johnson Space Center. FAA-licensed for horizontal launch operations. Focus on aerospace manufacturing, spacecraft testing, and commercial space operations rather than vertical orbital launch. Tenants include Intuitive Machines and Collins Aerospace.',
    keyMilestones: [
      'FAA spaceport license granted in 2015',
      'Intuitive Machines headquartered and assembling lunar landers on-site',
      'Adjacent to NASA Johnson Space Center',
      'Axiom Space training and operations facilities nearby',
    ],
  },
  {
    id: 'esrange',
    name: 'Esrange Space Center',
    location: 'Kiruna, Norrbotten',
    country: 'Sweden',
    developer: 'SSC (Swedish Space Corporation)',
    status: 'under-construction',
    targetDate: '2025-2026',
    plannedCapabilities: ['Orbital launch', 'Polar/SSO orbits', 'Suborbital/sounding rockets'],
    plannedVehicles: ['RFA One', 'Isar Aerospace Spectrum'],
    investmentInfo: 'EUR 30M+ Swedish government and ESA investment; existing sounding rocket infrastructure',
    description: 'The Esrange Space Center near Kiruna in Arctic Sweden has been launching sounding rockets since 1966. Now expanding with orbital launch capability as part of European efforts to establish sovereign launch access. Located above the Arctic Circle, ideal for polar orbit missions.',
    keyMilestones: [
      '550+ sounding rockets launched since 1966',
      'Orbital launch pad construction initiated',
      'RFA One signed as launch customer',
      'Part of ESA\'s European launcher strategy',
    ],
  },
  {
    id: 'giallo',
    name: 'Grottaglie Spaceport',
    location: 'Grottaglie, Taranto, Puglia',
    country: 'Italy',
    developer: 'ENAC / Italian Space Agency (ASI)',
    status: 'planned',
    targetDate: '2026-2027',
    plannedCapabilities: ['Horizontal suborbital launch', 'Point-to-point transport', 'Space tourism'],
    plannedVehicles: ['Virgin Galactic (planned)', 'Various horizontal launch systems'],
    investmentInfo: 'Italian government investment; EU Next Generation funding',
    description: 'Grottaglie Airport in southern Italy is being developed as a European horizontal launch spaceport. Designated for suborbital tourism and point-to-point transport, it would be continental Europe\'s first spaceport for commercial flights. Regulatory framework being established with ENAC (Italian civil aviation authority).',
    keyMilestones: [
      'Framework agreement signed with Virgin Galactic',
      'ENAC developing European suborbital flight regulations',
      'Airport infrastructure upgrades in progress',
      'Part of EU strategy for commercial space access',
    ],
  },
];

// ────────────────────────────────────────
// Traffic Data
// ────────────────────────────────────────

const TRAFFIC_DATA: TrafficRecord[] = [
  { siteId: 'cape-combined', siteName: 'Cape Canaveral / KSC (Combined)', country: 'United States', launches2020: 31, launches2021: 31, launches2022: 45, launches2023: 72, launches2024: 72, trend: 'up', successRate: 99.2 },
  { siteId: 'jiuquan', siteName: 'Jiuquan SLC', country: 'China', launches2020: 14, launches2021: 16, launches2022: 18, launches2023: 18, launches2024: 22, trend: 'up', successRate: 94.5 },
  { siteId: 'vandenberg', siteName: 'Vandenberg SFB', country: 'United States', launches2020: 4, launches2021: 6, launches2022: 9, launches2023: 15, launches2024: 18, trend: 'up', successRate: 98.0 },
  { siteId: 'wenchang', siteName: 'Wenchang SLS', country: 'China', launches2020: 4, launches2021: 5, launches2022: 6, launches2023: 7, launches2024: 13, trend: 'up', successRate: 97.0 },
  { siteId: 'xichang', siteName: 'Xichang SLC', country: 'China', launches2020: 10, launches2021: 11, launches2022: 12, launches2023: 14, launches2024: 12, trend: 'stable', successRate: 96.5 },
  { siteId: 'mahia', siteName: 'Mahia Peninsula (LC-1)', country: 'New Zealand', launches2020: 7, launches2021: 6, launches2022: 9, launches2023: 10, launches2024: 13, trend: 'up', successRate: 92.5 },
  { siteId: 'baikonur', siteName: 'Baikonur Cosmodrome', country: 'Kazakhstan', launches2020: 15, launches2021: 15, launches2022: 12, launches2023: 11, launches2024: 10, trend: 'down', successRate: 96.0 },
  { siteId: 'taiyuan', siteName: 'Taiyuan SLC', country: 'China', launches2020: 6, launches2021: 7, launches2022: 8, launches2023: 8, launches2024: 10, trend: 'up', successRate: 95.0 },
  { siteId: 'plesetsk', siteName: 'Plesetsk Cosmodrome', country: 'Russia', launches2020: 8, launches2021: 9, launches2022: 10, launches2023: 8, launches2024: 8, trend: 'stable', successRate: 97.5 },
  { siteId: 'sriharikota', siteName: 'SDSC SHAR (Sriharikota)', country: 'India', launches2020: 2, launches2021: 3, launches2022: 5, launches2023: 7, launches2024: 7, trend: 'up', successRate: 93.0 },
  { siteId: 'starbase', siteName: 'Starbase (Boca Chica)', country: 'United States', launches2020: 0, launches2021: 1, launches2022: 0, launches2023: 2, launches2024: 6, trend: 'up', successRate: 66.7 },
  { siteId: 'tanegashima', siteName: 'Tanegashima Space Center', country: 'Japan', launches2020: 4, launches2021: 3, launches2022: 1, launches2023: 2, launches2024: 4, trend: 'stable', successRate: 95.0 },
  { siteId: 'kourou', siteName: 'CSG (Kourou)', country: 'France (EU)', launches2020: 5, launches2021: 5, launches2022: 5, launches2023: 3, launches2024: 3, trend: 'down', successRate: 90.0 },
  { siteId: 'vostochny', siteName: 'Vostochny Cosmodrome', country: 'Russia', launches2020: 3, launches2021: 3, launches2022: 4, launches2023: 4, launches2024: 4, trend: 'stable', successRate: 95.0 },
  { siteId: 'wallops', siteName: 'Wallops / MARS', country: 'United States', launches2020: 2, launches2021: 2, launches2022: 2, launches2023: 1, launches2024: 2, trend: 'stable', successRate: 95.0 },
  { siteId: 'kodiak', siteName: 'PSCA (Kodiak)', country: 'United States', launches2020: 3, launches2021: 3, launches2022: 1, launches2023: 1, launches2024: 1, trend: 'down', successRate: 75.0 },
];

// ────────────────────────────────────────
// Space Communications Data
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
      { designation: 'DSS-14 (Mars)', diameter: '70m', type: 'Cassegrain', bands: ['S-band', 'X-band'], maxDataRate: '~28 kbps from Mars distance', features: 'Largest steerable antenna in DSN. Originally 64m, expanded to 70m in 1988. Used for critical spacecraft encounters and emergency communications.' },
      { designation: 'DSS-25', diameter: '34m BWG', type: 'Beam Waveguide', bands: ['S-band', 'X-band', 'Ka-band'], maxDataRate: '~150 Mbps (LEO), ~6 Mbps (Mars)', features: 'Beam waveguide design routes signals through a series of mirrors to a below-ground equipment room, enabling easier maintenance and upgrades.' },
      { designation: 'DSS-26', diameter: '34m BWG', type: 'Beam Waveguide', bands: ['S-band', 'X-band', 'Ka-band'], maxDataRate: '~150 Mbps (LEO)', features: 'Ka-band capable for high-data-rate deep space missions. Supports arraying with other DSN antennas for improved signal reception.' },
      { designation: 'DSS-24', diameter: '34m BWG', type: 'Beam Waveguide', bands: ['S-band', 'X-band', 'Ka-band'], maxDataRate: '~150 Mbps (LEO)', features: 'Part of the BWG subnet; supports multiple simultaneous spacecraft contacts through frequency multiplexing.' },
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
      { designation: 'DSS-43', diameter: '70m', type: 'Cassegrain', bands: ['S-band', 'X-band'], maxDataRate: '~28 kbps from Mars distance', features: 'Only antenna capable of commanding Voyager 2. Underwent major upgrades 2020-2021 including new X-band transmitter and cone replacement.' },
      { designation: 'DSS-35', diameter: '34m BWG', type: 'Beam Waveguide', bands: ['S-band', 'X-band', 'Ka-band'], maxDataRate: '~150 Mbps (LEO)', features: 'Commissioned in 2015, newest BWG antenna at Canberra. Designed for next-generation deep space missions.' },
      { designation: 'DSS-36', diameter: '34m BWG', type: 'Beam Waveguide', bands: ['S-band', 'X-band', 'Ka-band'], maxDataRate: '~150 Mbps (LEO)', features: 'Completed in 2016. Supports array configurations with DSS-43 and DSS-35 for enhanced sensitivity.' },
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
      { designation: 'DSS-63', diameter: '70m', type: 'Cassegrain', bands: ['S-band', 'X-band'], maxDataRate: '~28 kbps from Mars distance', features: 'Third 70m antenna in the DSN network. Critical for European coverage window. Supports planetary radar science.' },
      { designation: 'DSS-55', diameter: '34m BWG', type: 'Beam Waveguide', bands: ['S-band', 'X-band', 'Ka-band'], maxDataRate: '~150 Mbps (LEO)', features: 'Commissioned in 2003. One of Madrid\'s primary beam waveguide antennas for routine deep space tracking.' },
      { designation: 'DSS-56', diameter: '34m BWG', type: 'Beam Waveguide', bands: ['S-band', 'X-band', 'Ka-band', 'K-band'], maxDataRate: '~150 Mbps (LEO)', features: 'Newest DSN antenna, completed in 2021. First DSN antenna with K-band (26 GHz) receive capability. Designed specifically for next-generation mission support.' },
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
    capabilities: ['S-band Single Access (SA): voice, telemetry, commanding', 'Ku-band Single Access: high-rate science data up to 300 Mbps', 'Ka-band Single Access: up to 800 Mbps forward/return', 'S-band Multiple Access (MA): simultaneous tracking of up to 5 spacecraft per TDRS'],
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
    capabilities: ['Optical inter-satellite links (OISL) for mesh networking', 'Ka-band tactical data links to ground users', 'Low-latency data transport for missile warning and tracking', 'Integration with Tracking Layer for kill chain completion'],
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
    capabilities: ['Secure inter-satellite laser links', 'End-to-end encryption for government communications', 'Earth observation payload hosting', 'Mesh networking derived from Starlink architecture'],
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
    capabilities: ['Laser inter-satellite links at 1.8 Gbps', 'Ka-band downlink to ground at 600 Mbps', 'Near-real-time data relay for LEO satellites', 'Hosted payload model on commercial GEO satellites'],
    dataRate: '1.8 Gbps (optical ISL)',
    description: 'EDRS, also called the "SpaceDataHighway," is ESA\'s operational laser relay system. It uses GEO-hosted laser communication terminals to relay data from LEO satellites to ground stations in near-real-time. Copernicus Sentinel satellites are the primary users, enabling rapid delivery of Earth observation data. EDRS-A is hosted on Eutelsat 9B, while EDRS-C is a dedicated satellite.',
    users: ['Copernicus Sentinel-1', 'Copernicus Sentinel-2', 'ISS (Columbus module)', 'Pl\u00e9iades Neo', 'Military users'],
  },
  {
    id: 'aws-ground',
    name: 'AWS Ground Station',
    operator: 'Amazon Web Services',
    constellation: '12 antenna locations worldwide',
    orbit: 'Ground-based (supports LEO/MEO/GEO)',
    coverage: 'Global (US, EU, Asia-Pacific, Middle East, Africa)',
    status: 'operational',
    capabilities: ['Direct-to-S3 data delivery', 'S-band, X-band, UHF downlink support', 'Auto-scaling for burst contacts', 'Integration with AWS compute, storage, AI/ML'],
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
    capabilities: ['Azure-native satellite data processing', 'S-band, X-band, Ka-band support', 'Partner antenna aggregation (KSAT, Viasat, ATLAS)', 'Integration with Azure AI, Synapse Analytics, IoT Hub'],
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
    milestones: ['December 2021: Launched aboard STPSat-6', 'June 2022: First light -- 1.2 Gbps optical link established with ground station', 'November 2023: ILLUMA-T terminal installed on ISS', 'March 2024: First end-to-end laser relay: ISS to LCRD to ground station at 1.2 Gbps', 'Ongoing: Characterizing atmospheric effects, adaptive optics, and link availability'],
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
    milestones: ['November 2023: "First light" -- laser link established from 16 million km (40x Moon distance)', 'December 2023: Transmitted test data at 267 Mbps from 33 million km', 'January 2024: Demonstrated stable link at 25 Mbps from 53 million km', 'March 2024: Maintained 8.3 Mbps link from 225 million km (1.5 AU)', 'June 2024: Achieved data return from maximum range of 390 million km (2.6 AU)', 'November 2024: Transmitted 1.58 terabits over 560 million km during technology demonstration phase'],
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
    milestones: ['CONDOR Mk3 qualification completed for SDA Tranche 1', 'Production contract for SDA Transport Layer (hundreds of units)', 'Selected by Telesat for Lightspeed constellation optical crosslinks', 'Northrop Grumman partnership for SDA Tranche 2', 'Manufacturing capacity: 50+ units per month target'],
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
    milestones: ['SDA Tranche 0 optical terminals delivered and on-orbit', 'SDA Tranche 1 production underway', 'On-orbit demonstrations with L3Harris SDA satellites', 'Ground-to-space optical link demonstrations', 'Selected for multiple classified NRO programs'],
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
    milestones: ['2008: First inter-satellite laser link (TerraSAR-X to NFIRE)', '2016: EDRS-A operational -- first commercial laser relay', '2019: EDRS-C operational -- expanding coverage', '2020+: 50,000+ successful laser links completed', 'Selected for Copernicus Sentinel expansion program'],
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
    milestones: ['2021: First Starlink satellites with laser links launched (polar shell)', '2022: Laser links expanded to mid-inclination shells', '2023: Over 5,000 laser-linked satellites operational', '2024: 9,000+ laser terminals on orbit -- largest optical network in space', 'Enables Starlink service in regions without ground stations (oceans, polar)'],
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
    keyFeatures: ['Delay/Disruption Tolerant Networking (DTN) as the core protocol', 'Lunar Search and Rescue (LunaSAR) for crew safety', 'Positioning, Navigation, and Timing (PNT) services', 'Open architecture for commercial and international provider participation', 'Interoperability standards for cross-mission compatibility'],
  },
  {
    id: 'csns',
    name: 'Lunar Communications Relay and Navigation System (LCRNS)',
    agency: 'NASA / ESA',
    status: 'Planned',
    statusColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    description: 'The proposed relay satellite constellation for LunaNet. Multiple relay satellites in lunar orbit would provide coverage of the lunar surface, including the far side and polar regions. ESA is studying Moonlight, a parallel initiative to provide commercial lunar communication and navigation services via satellites in lunar orbit.',
    keyFeatures: ['Relay satellites in elliptical frozen orbits for polar/far-side coverage', 'S-band and Ka-band links to surface assets', 'Optical crosslinks between relay satellites', 'Integration with Gateway for crew communications', 'Commercial service model under consideration'],
  },
  {
    id: 'moonlight',
    name: 'ESA Moonlight',
    agency: 'ESA',
    status: 'Development',
    statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'ESA\'s Moonlight initiative aims to create a dedicated lunar communications and navigation constellation as a commercial service. Led by a consortium including Surrey Satellite Technology and Telespazio, Moonlight would deploy 3-5 relay satellites in lunar orbit providing continuous coverage of key areas including the South Pole. The system would offer PNT accuracy within 100 meters.',
    keyFeatures: ['3-5 satellites in elliptical lunar orbit (ELO)', 'Continuous coverage of South Pole and near-side', 'Navigation accuracy targeting ~100 meters', 'Commercial service model -- pay-per-use for missions', 'Interoperable with NASA LunaNet standards'],
  },
  {
    id: 'artemis-comms',
    name: 'Artemis Direct Communications',
    agency: 'NASA',
    status: 'Operational',
    statusColor: 'text-green-400 bg-green-500/10 border-green-500/30',
    description: 'For initial Artemis missions, communications rely on the existing Deep Space Network supplemented by TDRS and the Near Space Network. Orion spacecraft communicates via S-band (TT&C) and Ka-band (high-rate video/data) directly with DSN ground stations. This direct link approach works for near-side operations but cannot support far-side or polar surface missions without relay infrastructure.',
    keyFeatures: ['S-band for telemetry, tracking, and commanding via DSN', 'Ka-band for HD video and high-rate science data', 'TDRS relay for LEO transit phase', 'DSN 34m and 70m antenna support', 'Limited to near-side lunar operations (line of sight to Earth)'],
  },
  {
    id: 'gateway-comms',
    name: 'Lunar Gateway Communications',
    agency: 'NASA / International Partners',
    status: 'Development',
    statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'The Lunar Gateway\'s Power and Propulsion Element (PPE) includes high-rate communications capability to serve as a relay between lunar surface assets and Earth. Gateway will orbit in a Near-Rectilinear Halo Orbit (NRHO) providing periodic coverage of the lunar South Pole and continuous Earth visibility, making it an ideal relay platform for Artemis surface missions.',
    keyFeatures: ['Ka-band high-rate link to DSN (up to 600 Mbps)', 'S-band proximity links to Orion and surface assets', 'NRHO provides ~6.5 day period with periodic South Pole coverage', 'Relay capability for surface EVA communications', 'International partner contribution to comm systems (ESA ESPRIT module)'],
  },
];

const CCSDS_PROTOCOLS: CCSDSProtocol[] = [
  { name: 'Space Packet Protocol', abbreviation: 'SPP', layer: 'Network / Transport', description: 'The fundamental data unit protocol for space communications. Defines variable-length packets with 6-byte primary headers containing version, type, APID (Application Process Identifier), sequence count, and data length. Used by virtually all modern spacecraft for telemetry and commanding.', usedBy: ['ISS', 'Mars rovers', 'JWST', 'Artemis', 'ESA missions'] },
  { name: 'TM/TC Space Data Link Protocol', abbreviation: 'TM/TC SDLP', layer: 'Data Link', description: 'Defines telemetry (TM) and telecommand (TC) transfer frames for reliable delivery of data between spacecraft and ground stations. TM frames are fixed-length with virtual channel multiplexing. TC frames support command verification through FARM (Frame Acceptance and Reporting Mechanism) protocol.', usedBy: ['All DSN-supported missions', 'ESA ESTRACK missions', 'JAXA missions'] },
  { name: 'Proximity-1 Space Link Protocol', abbreviation: 'Prox-1', layer: 'Data Link / Physical', description: 'Protocol for short-range communications between spacecraft and surface assets, such as Mars orbiters relaying data from rovers. Supports UHF and S-band links with automatic hailing, link establishment, and data transfer. Designed for store-and-forward relay operations.', usedBy: ['Mars Reconnaissance Orbiter', 'Mars Odyssey', 'MAVEN', 'Curiosity/Perseverance relay'] },
  { name: 'Delay/Disruption Tolerant Networking', abbreviation: 'DTN / BP', layer: 'Overlay / Network', description: 'Bundle Protocol designed for networks with long delays, intermittent connectivity, and high error rates -- exactly the conditions in deep space. Implements store-and-forward routing using "bundles" that can be stored at intermediate nodes until the next link becomes available. Adopted as the core protocol for LunaNet.', usedBy: ['ISS (operational since 2016)', 'LunaNet (planned)', 'DTN Gateway tests on LEO satellites'] },
  { name: 'CCSDS File Delivery Protocol', abbreviation: 'CFDP', layer: 'Application', description: 'Reliable file transfer protocol designed for space links. Supports both acknowledged (Class 2) and unacknowledged (Class 1) file delivery. Handles link interruptions through checkpoint/resume capability. Essential for transferring large science data files from deep space missions.', usedBy: ['Mars missions', 'Juno', 'New Horizons', 'OSIRIS-REx'] },
  { name: 'Space Link Extension', abbreviation: 'SLE', layer: 'Cross-Support', description: 'Service framework enabling cross-support between different space agencies\' ground networks. SLE allows a mission operations center (e.g., ESA/ESOC) to receive data from another agency\'s ground station (e.g., NASA/DSN) through standardized service interfaces. Crucial for international mission cooperation.', usedBy: ['ESA-NASA cross-support', 'JAXA-NASA cooperation', 'International DSN agreements'] },
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

const COMMS_HERO_STATS = [
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
// Helper Functions
// ────────────────────────────────────────

function formatCoordinate(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}${String.fromCharCode(176)}${latDir}, ${Math.abs(lon).toFixed(4)}${String.fromCharCode(176)}${lonDir}`;
}

function getTrendIndicator(trend: 'up' | 'down' | 'stable'): { symbol: string; color: string } {
  switch (trend) {
    case 'up': return { symbol: String.fromCharCode(9650), color: 'text-green-400' };
    case 'down': return { symbol: String.fromCharCode(9660), color: 'text-red-400' };
    case 'stable': return { symbol: String.fromCharCode(9644), color: 'text-yellow-400' };
  }
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 97) return 'text-green-400';
  if (rate >= 93) return 'text-emerald-400';
  if (rate >= 85) return 'text-yellow-400';
  return 'text-red-400';
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function HeroStats() {
  const totalActive = ACTIVE_SPACEPORTS.length;
  const totalEmerging = EMERGING_SPACEPORTS.length;
  const totalLaunches2024 = TRAFFIC_DATA.reduce((sum, t) => sum + t.launches2024, 0);
  const countries = Array.from(new Set(ACTIVE_SPACEPORTS.map(s => s.country)));

  const stats = [
    { label: 'Active Launch Sites', value: totalActive.toString(), color: 'text-cyan-400' },
    { label: 'Emerging Sites', value: totalEmerging.toString(), color: 'text-amber-400' },
    { label: 'Orbital Launches (2024)', value: totalLaunches2024.toString(), color: 'text-green-400' },
    { label: 'Countries', value: countries.length.toString(), color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="card-elevated p-5 text-center">
          <div className={`text-3xl font-bold font-display ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpaceportCard({ spaceport }: { spaceport: Spaceport }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_CONFIG[spaceport.status];
  const capStyle = CAPABILITY_CONFIG[spaceport.launchCapability];

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg group-hover:text-cyan-300 transition-colors truncate">
            {spaceport.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-star-300 text-sm">{spaceport.location}</span>
            <span className="text-star-300/30">|</span>
            <span className="text-star-300/70 text-sm">{spaceport.country}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ml-2 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-space-800/50 rounded-lg p-2.5 text-center">
          <div className="text-cyan-400 text-xl font-bold font-display">{spaceport.recentLaunches2024}</div>
          <div className="text-star-300/60 text-[10px] uppercase tracking-widest">2024 Launches</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-2.5 text-center">
          <div className="text-white text-xl font-bold font-display">{spaceport.launchPads}</div>
          <div className="text-star-300/60 text-[10px] uppercase tracking-widest">Launch Pads</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-2.5 text-center">
          <div className="text-amber-400 text-xl font-bold font-display">{spaceport.yearEstablished}</div>
          <div className="text-star-300/60 text-[10px] uppercase tracking-widest">Established</div>
        </div>
      </div>

      {/* Vehicles */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {spaceport.primaryVehicles.map((v) => (
          <span key={v} className="px-2 py-0.5 bg-space-700 text-cyan-300 border border-space-600 rounded text-xs font-medium">
            {v}
          </span>
        ))}
      </div>

      {/* Key Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <span className="text-star-300/60 text-xs block">Capability</span>
          <span className={`font-medium ${capStyle.color}`}>{capStyle.label}</span>
        </div>
        <div>
          <span className="text-star-300/60 text-xs block">Inclination Range</span>
          <span className="text-white font-medium text-xs">{spaceport.inclinationRange}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-star-300/70 text-xs leading-relaxed mb-3 line-clamp-2">
        {expanded ? spaceport.description : spaceport.description}
      </p>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-3 mb-3 pt-3 border-t border-white/5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-star-300/60 text-xs block mb-1">Operator</span>
              <span className="text-white text-xs">{spaceport.operator}</span>
            </div>
            <div>
              <span className="text-star-300/60 text-xs block mb-1">Coordinates</span>
              <span className="text-white text-xs font-mono">{formatCoordinate(spaceport.latitude, spaceport.longitude)}</span>
            </div>
            <div>
              <span className="text-star-300/60 text-xs block mb-1">Max Payload Class</span>
              <span className="text-white text-xs">{spaceport.maxPayloadClass}</span>
            </div>
            <div>
              <span className="text-star-300/60 text-xs block mb-1">Range Safety</span>
              <span className="text-white text-xs">{spaceport.rangeSafety}</span>
            </div>
          </div>

          <div>
            <span className="text-star-300/60 text-xs block mb-1">Pad Details</span>
            <span className="text-white text-xs">{spaceport.padDetails}</span>
          </div>

          <div>
            <span className="text-star-300/60 text-xs block mb-1">Reuse / Landing Facilities</span>
            <span className="text-white text-xs">{spaceport.reuseLanding}</span>
          </div>

          <div>
            <span className="text-star-300/60 text-xs block mb-1">Propellant Types</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {spaceport.fuelingTypes.map((f) => (
                <span key={f} className="px-2 py-0.5 bg-space-700 text-emerald-300 border border-space-600 rounded text-xs">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-star-300/60 text-xs block mb-2">Key Highlights</span>
            <ul className="space-y-1">
              {spaceport.highlights.map((h, i) => (
                <li key={i} className="text-star-300 text-xs flex items-start gap-2">
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

function EmergingSpaceportCard({ spaceport }: { spaceport: EmergingSpaceport }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_CONFIG[spaceport.status];

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-amber-500/30 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h3 className="text-white font-semibold text-lg">{spaceport.name}</h3>
            <span className={`text-xs font-bold px-2.5 py-1 rounded border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
              {statusStyle.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-star-300 text-sm">{spaceport.location}</span>
            <span className="text-star-300/30">|</span>
            <span className="text-star-300/70 text-sm">{spaceport.country}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="text-amber-400 text-sm font-bold">{spaceport.targetDate}</div>
          <div className="text-star-300/60 text-[10px] uppercase tracking-widest">Target</div>
        </div>
      </div>

      {/* Developer */}
      <div className="text-star-300/80 text-xs mb-3">
        Developer: <span className="text-white">{spaceport.developer}</span>
      </div>

      {/* Planned Vehicles */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {spaceport.plannedVehicles.map((v) => (
          <span key={v} className="px-2 py-0.5 bg-space-700 text-amber-300 border border-space-600 rounded text-xs font-medium">
            {v}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-star-300/70 text-xs leading-relaxed mb-3">
        {spaceport.description}
      </p>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-3 mb-3 pt-3 border-t border-white/5">
          <div>
            <span className="text-star-300/60 text-xs block mb-1">Planned Capabilities</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {spaceport.plannedCapabilities.map((c) => (
                <span key={c} className="px-2 py-0.5 bg-space-700 text-emerald-300 border border-space-600 rounded text-xs">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-star-300/60 text-xs block mb-1">Investment</span>
            <span className="text-white text-xs">{spaceport.investmentInfo}</span>
          </div>

          <div>
            <span className="text-star-300/60 text-xs block mb-2">Key Milestones</span>
            <ul className="space-y-1">
              {spaceport.keyMilestones.map((m, i) => (
                <li key={i} className="text-star-300 text-xs flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 flex-shrink-0">-</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Show details'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

function SiteComparisonTable() {
  const allSites = ACTIVE_SPACEPORTS;

  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <h2 className="text-lg font-bold text-white">Spaceport Capability Comparison</h2>
        <p className="text-star-300 text-sm mt-1">Side-by-side analysis of all active orbital launch sites</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Site</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Country</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Capability</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Inclination Range</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Pads</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Max Payload</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Propellants</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Reuse Landing</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2024</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2023</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {allSites.map((s) => {
              const capStyle = CAPABILITY_CONFIG[s.launchCapability];
              return (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{s.name}</td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{s.country}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium ${capStyle.color}`}>{capStyle.label}</span>
                  </td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap text-xs">{s.inclinationRange}</td>
                  <td className="px-4 py-3 text-right text-white font-mono">{s.launchPads}</td>
                  <td className="px-4 py-3 text-star-300 text-xs max-w-[180px]">{s.maxPayloadClass}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.fuelingTypes.map((f) => (
                        <span key={f} className="px-1.5 py-0.5 bg-space-700 text-emerald-300 rounded text-[10px]">
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-star-300 text-xs max-w-[150px] truncate">
                    {s.reuseLanding === 'None' || s.reuseLanding === 'None currently' || s.reuseLanding.startsWith('None')
                      ? <span className="text-star-300/40">None</span>
                      : s.reuseLanding.length > 40 ? s.reuseLanding.substring(0, 40) + '...' : s.reuseLanding}
                  </td>
                  <td className="px-4 py-3 text-right text-cyan-400 font-mono font-bold">{s.recentLaunches2024}</td>
                  <td className="px-4 py-3 text-right text-star-300 font-mono">{s.recentLaunches2023}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center gap-6 text-xs text-star-300/60">
        <span>Total sites: <span className="text-white font-bold">{allSites.length}</span></span>
        <span>Total pads: <span className="text-white font-bold">{allSites.reduce((s, sp) => s + sp.launchPads, 0)}</span></span>
        <span>2024 launches (active sites): <span className="text-cyan-400 font-bold">{allSites.reduce((s, sp) => s + sp.recentLaunches2024, 0)}</span></span>
        <span>With reuse capability: <span className="text-green-400 font-bold">{allSites.filter(s => !s.reuseLanding.startsWith('None')).length}</span></span>
      </div>
    </div>
  );
}

function TrafficDataTab() {
  const [sortBy, setSortBy] = useState<'launches2024' | 'trend' | 'successRate'>('launches2024');
  const sortedData = [...TRAFFIC_DATA].sort((a, b) => {
    if (sortBy === 'launches2024') return b.launches2024 - a.launches2024;
    if (sortBy === 'successRate') return b.successRate - a.successRate;
    // trend sort: up > stable > down
    const trendOrder = { up: 3, stable: 2, down: 1 };
    return trendOrder[b.trend] - trendOrder[a.trend];
  });

  const totalByYear = {
    y2020: TRAFFIC_DATA.reduce((s, t) => s + t.launches2020, 0),
    y2021: TRAFFIC_DATA.reduce((s, t) => s + t.launches2021, 0),
    y2022: TRAFFIC_DATA.reduce((s, t) => s + t.launches2022, 0),
    y2023: TRAFFIC_DATA.reduce((s, t) => s + t.launches2023, 0),
    y2024: TRAFFIC_DATA.reduce((s, t) => s + t.launches2024, 0),
  };

  const maxLaunches = Math.max(...TRAFFIC_DATA.map(t => t.launches2024));

  // Country breakdown
  const countryData: Record<string, number> = {};
  TRAFFIC_DATA.forEach(t => {
    const country = t.country;
    countryData[country] = (countryData[country] || 0) + t.launches2024;
  });
  const countrySorted = Object.entries(countryData).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Global Traffic Trend */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-2">Global Orbital Launch Traffic</h2>
        <p className="text-star-300 text-sm mb-6">Total orbital launch attempts tracked across all active sites</p>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { year: '2020', count: totalByYear.y2020 },
            { year: '2021', count: totalByYear.y2021 },
            { year: '2022', count: totalByYear.y2022 },
            { year: '2023', count: totalByYear.y2023 },
            { year: '2024', count: totalByYear.y2024 },
          ].map((d) => (
            <div key={d.year} className="text-center">
              <div className="text-2xl md:text-3xl font-bold font-display text-white">{d.count}</div>
              <div className="text-star-300/60 text-xs uppercase tracking-widest mt-1">{d.year}</div>
              {/* Mini bar */}
              <div className="mt-2 mx-auto w-full max-w-[60px] h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                  style={{ width: `${(d.count / totalByYear.y2024) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] rounded-lg p-4">
          <div className="text-star-300/60 text-xs uppercase tracking-widest mb-3">Growth</div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-green-400 font-bold text-lg">+{((totalByYear.y2024 / totalByYear.y2020 - 1) * 100).toFixed(0)}%</span>
              <span className="text-star-300/60 text-xs ml-2">since 2020</span>
            </div>
            <span className="text-white/10">|</span>
            <div>
              <span className="text-green-400 font-bold text-lg">+{((totalByYear.y2024 / totalByYear.y2023 - 1) * 100).toFixed(0)}%</span>
              <span className="text-star-300/60 text-xs ml-2">YoY (2023 to 2024)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Country Breakdown */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-4">2024 Launches by Country</h2>
        <div className="space-y-3">
          {countrySorted.map(([country, count]) => {
            const maxCountry = countrySorted[0][1];
            const pct = (count / maxCountry) * 100;
            return (
              <div key={country}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-star-300 text-sm">{country}</span>
                  <span className="text-white font-bold font-mono text-sm">{count}</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-star-300 text-sm">Sort by:</span>
        {[
          { key: 'launches2024' as const, label: '2024 Launches' },
          { key: 'successRate' as const, label: 'Success Rate' },
          { key: 'trend' as const, label: 'Trend' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sortBy === opt.key
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-white/5 text-star-300 border border-white/10 hover:border-white/20'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Site-by-site Traffic Table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Launch Traffic by Site</h2>
          <p className="text-star-300 text-sm mt-1">Historical launch counts and trends for each site</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Site</th>
                <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Country</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2020</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2021</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2022</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2023</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2024</th>
                <th className="text-center px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Trend</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Success</th>
                <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedData.map((t) => {
                const trend = getTrendIndicator(t.trend);
                const barWidth = maxLaunches > 0 ? (t.launches2024 / maxLaunches) * 100 : 0;
                return (
                  <tr key={t.siteId} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{t.siteName}</td>
                    <td className="px-4 py-3 text-star-300 whitespace-nowrap">{t.country}</td>
                    <td className="px-4 py-3 text-right text-star-300/60 font-mono">{t.launches2020}</td>
                    <td className="px-4 py-3 text-right text-star-300/70 font-mono">{t.launches2021}</td>
                    <td className="px-4 py-3 text-right text-star-300/80 font-mono">{t.launches2022}</td>
                    <td className="px-4 py-3 text-right text-star-300 font-mono">{t.launches2023}</td>
                    <td className="px-4 py-3 text-right text-white font-mono font-bold">{t.launches2024}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${trend.color} font-bold`}>{trend.symbol}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${getSuccessRateColor(t.successRate)}`}>
                      {t.successRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Summary */}
        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center gap-6 text-xs text-star-300/60">
          <span>Tracked sites: <span className="text-white font-bold">{TRAFFIC_DATA.length}</span></span>
          <span>Total 2024 launches: <span className="text-cyan-400 font-bold">{totalByYear.y2024}</span></span>
          <span>Growing sites: <span className="text-green-400 font-bold">{TRAFFIC_DATA.filter(t => t.trend === 'up').length}</span></span>
          <span>Declining sites: <span className="text-red-400 font-bold">{TRAFFIC_DATA.filter(t => t.trend === 'down').length}</span></span>
        </div>
      </div>

      {/* Industry Projections */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-2">Launch Industry Projections</h2>
        <p className="text-star-300 text-sm mb-4">Forward-looking analysis based on current trends and announced plans</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-cyan-400 text-2xl font-bold font-display mb-1">250+</div>
            <div className="text-white text-sm font-medium mb-2">Projected 2025 Global Launches</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              Continued growth driven by Starlink deployment cadence, Chinese commercial launchers, and new vehicles entering service (Ariane 6, New Glenn, Neutron).
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-amber-400 text-2xl font-bold font-display mb-1">5+</div>
            <div className="text-white text-sm font-medium mb-2">New Launch Sites by 2027</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              SaxaVord (UK), Sutherland (UK), Andoya (Norway), Esrange (Sweden), and commercial pads in China are all targeting operational status in the next 2-3 years.
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-green-400 text-2xl font-bold font-display mb-1">60%</div>
            <div className="text-white text-sm font-medium mb-2">US Share of Global Launches</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              The United States dominates global launch traffic, primarily driven by SpaceX Falcon 9 operations from Cape Canaveral, KSC, and Vandenberg. Starship cadence will increase this further.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Space Communications Components
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
// Main Page Component
// ────────────────────────────────────────

function SpaceportDirectoryPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs: TabId[] = ['active', 'emerging', 'comparison', 'traffic', 'communications'];
  const initialTab: TabId = validTabs.includes(tabParam as TabId) ? (tabParam as TabId) : 'active';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [commsSubTab, setCommsSubTab] = useState<CommsSubTab>('dsn');
  const [relayFilter, setRelayFilter] = useState<string>('');

  const countries = Array.from(new Set(ACTIVE_SPACEPORTS.map(s => s.country))).sort();

  const filteredSpaceports = countryFilter
    ? ACTIVE_SPACEPORTS.filter(s => s.country === countryFilter)
    : ACTIVE_SPACEPORTS;

  const filteredRelays = relayFilter
    ? RELAY_NETWORKS.filter((n) => n.status === relayFilter)
    : RELAY_NETWORKS;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'active', label: 'Active Sites' },
    { id: 'emerging', label: 'Emerging Sites' },
    { id: 'comparison', label: 'Site Comparison' },
    { id: 'traffic', label: 'Traffic Data' },
    { id: 'communications', label: 'Communications' },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Infrastructure Network"
          subtitle="Global launch sites, deep space networks, relay constellations, laser communications, and the protocols connecting humanity to the cosmos"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Infrastructure Network' },
          ]}
        />

        {/* Hero Stats */}
        <HeroStats />

        {/* Industry Overview Banner */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="font-semibold text-white mb-1">Global Launch Infrastructure</h3>
              <p className="text-sm text-star-300 leading-relaxed">
                The world recorded over 200 orbital launch attempts in 2024, a record driven by SpaceX Falcon 9 operations
                and China&apos;s expanding commercial launch sector. Cape Canaveral / KSC alone accounted for 70+ launches.
                New spaceports across Europe (SaxaVord, Andoya, Sutherland) are under construction to provide sovereign
                launch access, while Starbase in Texas achieved the first-ever booster catch with the Mechazilla tower.
                Launch site infrastructure is the critical bottleneck as the industry scales toward 300+ annual launches.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-white/5 text-star-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {/* ──────────────── ACTIVE SITES TAB ──────────────── */}
          {activeTab === 'active' && (
            <div className="space-y-6">
              {/* Country Filter */}
              <div className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-star-300 text-sm mr-2">Filter by country:</span>
                  <button
                    onClick={() => setCountryFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      countryFilter === ''
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    All ({ACTIVE_SPACEPORTS.length})
                  </button>
                  {countries.map((country) => {
                    const count = ACTIVE_SPACEPORTS.filter(s => s.country === country).length;
                    return (
                      <button
                        key={country}
                        onClick={() => setCountryFilter(country)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          countryFilter === country
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                            : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {country} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Spaceport Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredSpaceports.map((spaceport) => (
                  <SpaceportCard key={spaceport.id} spaceport={spaceport} />
                ))}
              </div>

              {filteredSpaceports.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-star-300">No spaceports match the selected filter.</p>
                </div>
              )}
            </div>
          )}

          {/* ──────────────── EMERGING SITES TAB ──────────────── */}
          {activeTab === 'emerging' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/30 rounded-xl p-5 mb-2">
                <h3 className="font-semibold text-white mb-1">The New Space Race for Launch Infrastructure</h3>
                <p className="text-sm text-star-300 leading-relaxed">
                  Multiple new orbital launch sites are under development worldwide, driven by demand for sovereign
                  launch access and growing small-satellite markets. Europe is leading the charge with SaxaVord (UK),
                  Sutherland (UK), Andoya (Norway), and Esrange (Sweden) all targeting operational status by 2025-2026.
                  In the US, established horizontal spaceports like Spaceport America and Cecil are seeking orbital
                  launch tenants, while Houston Spaceport focuses on spacecraft manufacturing and testing.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {EMERGING_SPACEPORTS.map((spaceport) => (
                  <EmergingSpaceportCard key={spaceport.id} spaceport={spaceport} />
                ))}
              </div>
            </div>
          )}

          {/* ──────────────── COMPARISON TAB ──────────────── */}
          {activeTab === 'comparison' && (
            <SiteComparisonTable />
          )}

          {/* ──────────────── TRAFFIC DATA TAB ──────────────── */}
          {activeTab === 'traffic' && (
            <TrafficDataTab />
          )}

          {/* ──────────────── COMMUNICATIONS TAB ──────────────── */}
          {activeTab === 'communications' && (
            <div>
              {/* Comms Hero Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {COMMS_HERO_STATS.map((stat) => (
                  <div key={stat.label} className="card-elevated p-5 text-center">
                    <div className={`text-3xl font-bold font-display tracking-tight ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-star-300/60 text-xs uppercase tracking-widest font-medium mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Laser Comms Revolution Banner */}
              <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
                <div className="flex items-start gap-4">
                  <div>
                    <h3 className="font-semibold text-white mb-1">The Laser Communications Revolution</h3>
                    <p className="text-sm text-star-300 leading-relaxed">
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

              {/* Comms Sub-Tab Navigation */}
              <div className="border-b border-space-700 mb-6">
                <div className="flex gap-1 overflow-x-auto">
                  {([
                    { id: 'dsn' as CommsSubTab, label: 'DSN Status' },
                    { id: 'relay' as CommsSubTab, label: 'Relay Networks' },
                    { id: 'optical' as CommsSubTab, label: 'Optical Comms' },
                    { id: 'lunar' as CommsSubTab, label: 'Lunar Comms' },
                    { id: 'standards' as CommsSubTab, label: 'Standards' },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCommsSubTab(tab.id)}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        commsSubTab === tab.id
                          ? 'border-cyan-500 text-cyan-300'
                          : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comms Sub-Tab Content */}
              <div>

                {/* ──── DSN STATUS ──── */}
                {commsSubTab === 'dsn' && (
                  <div>
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

                    <div className="space-y-5 mb-6">
                      {DSN_COMPLEXES.map((complex) => (
                        <DSNComplexCard key={complex.id} complex={complex} />
                      ))}
                    </div>

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

                {/* ──── RELAY NETWORKS ──── */}
                {commsSubTab === 'relay' && (
                  <div>
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                      {filteredRelays.map((network) => (
                        <RelayNetworkCard key={network.id} network={network} />
                      ))}
                    </div>

                    {filteredRelays.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-slate-400">No networks match the selected filter.</p>
                      </div>
                    )}

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

                {/* ──── OPTICAL COMMS ──── */}
                {commsSubTab === 'optical' && (
                  <div>
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                      {OPTICAL_SYSTEMS.map((system) => (
                        <OpticalSystemCard key={system.id} system={system} />
                      ))}
                    </div>

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

                {/* ──── LUNAR COMMS ──── */}
                {commsSubTab === 'lunar' && (
                  <div>
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

                {/* ──── STANDARDS ──── */}
                {commsSubTab === 'standards' && (
                  <div>
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

                    <div className="card-elevated p-6 border border-space-700 mb-6">
                      <h3 className="text-white font-semibold mb-2">Space Communications Frequency Allocations</h3>
                      <p className="text-slate-400 text-sm leading-relaxed mb-4">
                        The International Telecommunication Union (ITU) allocates radio frequency spectrum for space services
                        through World Radiocommunication Conferences (WRC). These allocations define which frequencies can
                        be used for space research, Earth exploration, and fixed/mobile satellite services. Optical frequencies
                        are currently unregulated by the ITU, which is one advantage of laser communications.
                      </p>

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InfrastructureNetworkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-star-300">Loading...</div></div>}>
      <SpaceportDirectoryPage />
    </Suspense>
  );
}
