'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';
import { clientLogger } from '@/lib/client-logger';

// Lazy-load the Communications tab (~730 lines, only visible when tab selected)
const SpaceportsCommunicationsTab = dynamic(() => import('./SpaceportsCommunicationsTab'), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-800 rounded-lg"></div>)}</div>
      <div className="h-32 bg-slate-800 rounded-xl"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="h-64 bg-slate-800 rounded-lg"></div>)}</div>
    </div>
  ),
});

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
  recentLaunches2025: number;
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
  launches2025: number;
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

interface LunarCommsElement {
  id: string;
  name: string;
  agency: string;
  status: string;
  statusColor: string;
  description: string;
  keyFeatures: string[];
}

interface LatencyEntry {
  orbit: string;
  oneWayLatency: string;
  roundTrip: string;
  example: string;
  color: string;
}

interface CommsHeroStat {
  label: string;
  value: string;
  color: string;
}

interface EstrackStation {
  name: string;
  location: string;
  diameter: string;
  bands: string;
  role: string;
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
    primaryVehicles: ['Falcon 9', 'Falcon Heavy', 'SLS', 'New Glenn'],
    launchPads: 2,
    padDetails: 'LC-39A (SpaceX), LC-39B (NASA SLS / Blue Origin New Glenn)',
    recentLaunches2025: 48,
    recentLaunches2024: 37,
    recentLaunches2023: 31,
    maxPayloadClass: 'Super Heavy (130+ tonnes to LEO via SLS Block 2)',
    fuelingTypes: ['RP-1/LOX', 'LH2/LOX', 'CH4/LOX'],
    rangeSafety: 'Eastern Range (Space Force)',
    reuseLanding: 'LZ-1 and LZ-2 landing pads; drone ship recovery offshore',
    description: 'America\'s premier human spaceflight launch site since the Apollo era. LC-39A is the world\'s busiest orbital launch pad, operated by SpaceX for Falcon 9 and Falcon Heavy. LC-39B supports NASA\'s Space Launch System for Artemis lunar missions and Blue Origin\'s New Glenn, which made its debut flight in January 2025.',
    highlights: [
      'Most historic launch site in the US -- Apollo, Shuttle, Artemis',
      'LC-39A: world\'s highest-cadence orbital launch pad',
      'Blue Origin New Glenn debut flight from LC-39B in January 2025',
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
    primaryVehicles: ['Falcon 9', 'Vulcan Centaur'],
    launchPads: 3,
    padDetails: 'SLC-40 (SpaceX Falcon 9), SLC-41 (ULA Vulcan Centaur), SLC-37B (retired)',
    recentLaunches2025: 54,
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
    recentLaunches2025: 24,
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
    padDetails: 'Orbital Launch Mount A (OLM-A, active), Orbital Launch Mount B (OLM-B, operational)',
    recentLaunches2025: 10,
    recentLaunches2024: 6,
    recentLaunches2023: 2,
    maxPayloadClass: 'Super Heavy (100-150+ tonnes to LEO, fully reusable target)',
    fuelingTypes: ['CH4/LOX'],
    rangeSafety: 'FAA-licensed commercial site',
    reuseLanding: 'Mechazilla tower catch system for Super Heavy booster; ship landing TBD',
    description: 'SpaceX\'s dedicated Starship development and launch facility at the southern tip of Texas. The site achieved historic milestones with the first successful Super Heavy booster catch by the Mechazilla tower in October 2024 (Flight 5). Second launch mount (OLM-B) became operational in 2025, enabling higher launch cadence.',
    highlights: [
      'Only operational launch site for Starship/Super Heavy',
      'Mechazilla tower catch system for booster reuse (first achieved Oct 2024)',
      'Second orbital launch mount (OLM-B) operational in 2025',
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
    primaryVehicles: ['Northrop Grumman Antares (retired)', 'Rocket Lab Electron', 'Firefly Alpha'],
    launchPads: 2,
    padDetails: 'Pad-0A (Antares/Firefly), Pad-0B (Minotaur / suborbital), LC-2 (Rocket Lab Electron)',
    recentLaunches2025: 3,
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
    primaryVehicles: ['Electron', 'Neutron (in development)'],
    launchPads: 2,
    padDetails: 'Pad A (primary), Pad B (second pad for higher cadence)',
    recentLaunches2025: 16,
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
    recentLaunches2025: 5,
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
    recentLaunches2025: 8,
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
    recentLaunches2025: 7,
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
    primaryVehicles: ['Soyuz-2.1a/b', 'Angara-A5'],
    launchPads: 2,
    padDetails: 'Launch Complex 1S (Soyuz-2), Complex 1A (Angara)',
    recentLaunches2025: 4,
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
    recentLaunches2025: 26,
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
    recentLaunches2025: 13,
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
    primaryVehicles: ['Long March 5/5B/7/7A/8', 'CZ-12'],
    launchPads: 3,
    padDetails: 'LC-101 (LM-5/5B), LC-201 (LM-7/7A), commercial pad',
    recentLaunches2025: 16,
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
    recentLaunches2025: 12,
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
    recentLaunches2025: 9,
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
    primaryVehicles: ['H3', 'Epsilon S'],
    launchPads: 2,
    padDetails: 'Yoshinobu Launch Complex (H3), Osaki Range (Epsilon)',
    recentLaunches2025: 5,
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
    recentLaunches2025: 1,
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
    recentLaunches2025: 2,
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
    recentLaunches2025: 1,
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
    recentLaunches2025: 0,
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
    recentLaunches2025: 1,
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
    status: 'operational',
    targetDate: 'Operational (2025)',
    plannedCapabilities: ['Vertical orbital launch', 'Polar/SSO orbits', 'Sub-500 kg class'],
    plannedVehicles: ['RFA One (Rocket Factory Augsburg)', 'HyImpulse SL1', 'ABL Space RS1'],
    investmentInfo: 'Approximately GBP 50M+ total investment; UK Space Agency grants + private funding',
    description: 'The most northerly spaceport to host an orbital launch attempt, located on the island of Unst in Shetland. SaxaVord conducted its first orbital launch attempt with RFA One in early 2025 -- the vehicle was lost shortly after ignition but the spaceport infrastructure performed as designed. The UK\'s first vertical orbital launch site, now operational and preparing for subsequent attempts.',
    keyMilestones: [
      'First UK vertical orbital launch attempt conducted in early 2025',
      'Spaceport infrastructure validated during first launch campaign',
      'UK CAA orbital launch license granted',
      'Multiple launch providers signed for future campaigns',
    ],
  },
  {
    id: 'sutherland',
    name: 'Space Hub Sutherland',
    location: 'A\'Mhoine Peninsula, Sutherland, Scotland',
    country: 'United Kingdom',
    developer: 'Highlands and Islands Enterprise / Orbex',
    status: 'under-construction',
    targetDate: '2026-2027',
    plannedCapabilities: ['Vertical orbital launch', 'Polar/SSO orbits', 'Small satellite class'],
    plannedVehicles: ['Orbex Prime'],
    investmentInfo: 'GBP 17.3M UK Space Agency funding; total project GBP 20M+',
    description: 'Space Hub Sutherland on the A\'Mhoine Peninsula in the Scottish Highlands is being developed specifically for Orbex\'s Prime rocket. It will be the first carbon-neutral spaceport, using bio-propane fuel. The site offers direct polar orbit access launching northward over the Atlantic. Construction continues with first launch now expected no earlier than 2026.',
    keyMilestones: [
      'Planning permission granted after legal challenges resolved',
      'Site construction and infrastructure build-out continuing',
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
    targetDate: '2026',
    plannedCapabilities: ['Orbital launch', 'Polar/SSO orbits', 'Suborbital missions'],
    plannedVehicles: ['Isar Aerospace Spectrum', 'Various small launchers'],
    investmentInfo: 'NOK 1.5B (approximately USD 150M); Norwegian government + EU funding',
    description: 'Andoya Spaceport in northern Norway is Europe\'s first continental orbital launch site. Located above the Arctic Circle, it offers ideal trajectories for polar and SSO orbits. Andoya Space has decades of sounding rocket heritage and is now building orbital launch infrastructure. Isar Aerospace signed as anchor customer. Launch infrastructure nearing completion.',
    keyMilestones: [
      'Launch pad and integration facility construction nearing completion',
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
    plannedVehicles: ['Virgin Galactic Delta-class (in development)', 'SpinLaunch (testing)'],
    investmentInfo: 'USD 225M in state funding; designed by Foster + Partners',
    description: 'The world\'s first purpose-built commercial spaceport, designed by Norman Foster. Primary base for Virgin Galactic, which paused SpaceShipTwo tourism flights in 2024 to focus on developing the next-generation Delta-class vehicle. Includes a 12,000-ft runway and vertical launch area. Seeking orbital launch tenants.',
    keyMilestones: [
      'Virgin Galactic paused SpaceShipTwo flights in 2024; developing Delta-class vehicle',
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
    targetDate: '2026',
    plannedCapabilities: ['Orbital launch', 'Polar/SSO orbits', 'Suborbital/sounding rockets'],
    plannedVehicles: ['RFA One', 'Isar Aerospace Spectrum'],
    investmentInfo: 'EUR 30M+ Swedish government and ESA investment; existing sounding rocket infrastructure',
    description: 'The Esrange Space Center near Kiruna in Arctic Sweden has been launching sounding rockets since 1966. Now expanding with orbital launch capability as part of European efforts to establish sovereign launch access. Located above the Arctic Circle, ideal for polar orbit missions. Orbital launch pad construction well advanced.',
    keyMilestones: [
      '550+ sounding rockets launched since 1966',
      'Orbital launch pad construction well advanced',
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
  { siteId: 'cape-combined', siteName: 'Cape Canaveral / KSC (Combined)', country: 'United States', launches2020: 31, launches2021: 31, launches2022: 45, launches2023: 72, launches2024: 72, launches2025: 102, trend: 'up', successRate: 99.4 },
  { siteId: 'jiuquan', siteName: 'Jiuquan SLC', country: 'China', launches2020: 14, launches2021: 16, launches2022: 18, launches2023: 18, launches2024: 22, launches2025: 26, trend: 'up', successRate: 95.0 },
  { siteId: 'vandenberg', siteName: 'Vandenberg SFB', country: 'United States', launches2020: 4, launches2021: 6, launches2022: 9, launches2023: 15, launches2024: 18, launches2025: 24, trend: 'up', successRate: 98.5 },
  { siteId: 'wenchang', siteName: 'Wenchang SLS', country: 'China', launches2020: 4, launches2021: 5, launches2022: 6, launches2023: 7, launches2024: 13, launches2025: 16, trend: 'up', successRate: 97.0 },
  { siteId: 'xichang', siteName: 'Xichang SLC', country: 'China', launches2020: 10, launches2021: 11, launches2022: 12, launches2023: 14, launches2024: 12, launches2025: 13, trend: 'stable', successRate: 96.5 },
  { siteId: 'mahia', siteName: 'Mahia Peninsula (LC-1)', country: 'New Zealand', launches2020: 7, launches2021: 6, launches2022: 9, launches2023: 10, launches2024: 13, launches2025: 16, trend: 'up', successRate: 93.5 },
  { siteId: 'baikonur', siteName: 'Baikonur Cosmodrome', country: 'Kazakhstan', launches2020: 15, launches2021: 15, launches2022: 12, launches2023: 11, launches2024: 10, launches2025: 8, trend: 'down', successRate: 96.0 },
  { siteId: 'taiyuan', siteName: 'Taiyuan SLC', country: 'China', launches2020: 6, launches2021: 7, launches2022: 8, launches2023: 8, launches2024: 10, launches2025: 12, trend: 'up', successRate: 95.0 },
  { siteId: 'plesetsk', siteName: 'Plesetsk Cosmodrome', country: 'Russia', launches2020: 8, launches2021: 9, launches2022: 10, launches2023: 8, launches2024: 8, launches2025: 7, trend: 'down', successRate: 97.0 },
  { siteId: 'sriharikota', siteName: 'SDSC SHAR (Sriharikota)', country: 'India', launches2020: 2, launches2021: 3, launches2022: 5, launches2023: 7, launches2024: 7, launches2025: 9, trend: 'up', successRate: 94.0 },
  { siteId: 'starbase', siteName: 'Starbase (Boca Chica)', country: 'United States', launches2020: 0, launches2021: 1, launches2022: 0, launches2023: 2, launches2024: 6, launches2025: 10, trend: 'up', successRate: 80.0 },
  { siteId: 'tanegashima', siteName: 'Tanegashima Space Center', country: 'Japan', launches2020: 4, launches2021: 3, launches2022: 1, launches2023: 2, launches2024: 4, launches2025: 5, trend: 'up', successRate: 96.0 },
  { siteId: 'kourou', siteName: 'CSG (Kourou)', country: 'France (EU)', launches2020: 5, launches2021: 5, launches2022: 5, launches2023: 3, launches2024: 3, launches2025: 5, trend: 'up', successRate: 92.0 },
  { siteId: 'vostochny', siteName: 'Vostochny Cosmodrome', country: 'Russia', launches2020: 3, launches2021: 3, launches2022: 4, launches2023: 4, launches2024: 4, launches2025: 4, trend: 'stable', successRate: 95.0 },
  { siteId: 'wallops', siteName: 'Wallops / MARS', country: 'United States', launches2020: 2, launches2021: 2, launches2022: 2, launches2023: 1, launches2024: 2, launches2025: 3, trend: 'stable', successRate: 95.0 },
  { siteId: 'kodiak', siteName: 'PSCA (Kodiak)', country: 'United States', launches2020: 3, launches2021: 3, launches2022: 1, launches2023: 1, launches2024: 1, launches2025: 1, trend: 'down', successRate: 75.0 },
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

function HeroStats({ activeSpaceports, emergingSpaceports, trafficData }: {
  activeSpaceports: Spaceport[];
  emergingSpaceports: EmergingSpaceport[];
  trafficData: TrafficRecord[];
}) {
  const totalActive = activeSpaceports.length;
  const totalEmerging = emergingSpaceports.length;
  const totalLaunches2025 = trafficData.reduce((sum, t) => sum + t.launches2025, 0);
  const countries = Array.from(new Set(activeSpaceports.map(s => s.country)));

  const stats = [
    { label: 'Active Launch Sites', value: totalActive.toString(), color: 'text-cyan-400' },
    { label: 'Emerging Sites', value: totalEmerging.toString(), color: 'text-amber-400' },
    { label: 'Orbital Launches (2025)', value: totalLaunches2025.toString(), color: 'text-green-400' },
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

function SpaceportCard({ spaceport, maxLaunches }: { spaceport: Spaceport; maxLaunches: number }) {
  const [expanded, setExpanded] = useState(false);
  const statusStyle = STATUS_CONFIG[spaceport.status];
  const capStyle = CAPABILITY_CONFIG[spaceport.launchCapability];
  const launchBarWidth = maxLaunches > 0 ? (spaceport.recentLaunches2025 / maxLaunches) * 100 : 0;
  const launchBar2024Width = maxLaunches > 0 ? (spaceport.recentLaunches2024 / maxLaunches) * 100 : 0;

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
          <div className="text-star-300/50 text-xs font-mono mt-1">
            {formatCoordinate(spaceport.latitude, spaceport.longitude)}
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border flex-shrink-0 ml-2 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
          {statusStyle.label}
        </span>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-space-800/50 rounded-lg p-2.5 text-center">
          <div className="text-cyan-400 text-xl font-bold font-display">{spaceport.recentLaunches2025}</div>
          <div className="text-star-300/60 text-xs uppercase tracking-widest">2025 Launches</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-2.5 text-center">
          <div className="text-white text-xl font-bold font-display">{spaceport.launchPads}</div>
          <div className="text-star-300/60 text-xs uppercase tracking-widest">Launch Pads</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-2.5 text-center">
          <div className="text-amber-400 text-xl font-bold font-display">{spaceport.yearEstablished}</div>
          <div className="text-star-300/60 text-xs uppercase tracking-widest">Established</div>
        </div>
      </div>

      {/* Launch Count Comparison Bars */}
      <div className="mb-4 space-y-1.5">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-star-300/60 text-xs">2025</span>
            <span className="text-cyan-400 text-xs font-mono font-bold">{spaceport.recentLaunches2025}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${launchBarWidth}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-star-300/60 text-xs">2024</span>
            <span className="text-star-300/70 text-xs font-mono">{spaceport.recentLaunches2024}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500/60 to-blue-400/60 transition-all duration-500"
              style={{ width: `${launchBar2024Width}%` }}
            />
          </div>
        </div>
      </div>

      {/* Operator */}
      <div className="text-star-300/70 text-xs mb-3">
        <span className="text-star-300/50">Operator:</span> <span className="text-white/80">{spaceport.operator}</span>
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

          {/* 3-year launch history comparison */}
          <div>
            <span className="text-star-300/60 text-xs block mb-2">Launch History</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { year: '2023', count: spaceport.recentLaunches2023 },
                { year: '2024', count: spaceport.recentLaunches2024 },
                { year: '2025', count: spaceport.recentLaunches2025 },
              ].map((d) => (
                <div key={d.year} className="bg-space-800/50 rounded-lg p-2 text-center">
                  <div className="text-white font-bold font-mono text-sm">{d.count}</div>
                  <div className="text-star-300/50 text-xs">{d.year}</div>
                </div>
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
          <div className="text-star-300/60 text-xs uppercase tracking-widest">Target</div>
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

function SiteComparisonTable({ activeSpaceports }: { activeSpaceports: Spaceport[] }) {
  const allSites = activeSpaceports;

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
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2025</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2024</th>
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
                        <span key={f} className="px-1.5 py-0.5 bg-space-700 text-emerald-300 rounded text-xs">
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
                  <td className="px-4 py-3 text-right text-cyan-400 font-mono font-bold">{s.recentLaunches2025}</td>
                  <td className="px-4 py-3 text-right text-star-300 font-mono">{s.recentLaunches2024}</td>
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
        <span>2025 launches (active sites): <span className="text-cyan-400 font-bold">{allSites.reduce((s, sp) => s + sp.recentLaunches2025, 0)}</span></span>
        <span>With reuse capability: <span className="text-green-400 font-bold">{allSites.filter(s => !s.reuseLanding.startsWith('None')).length}</span></span>
      </div>
    </div>
  );
}

function TrafficDataTab({ trafficData }: { trafficData: TrafficRecord[] }) {
  const [sortBy, setSortBy] = useState<'launches2025' | 'trend' | 'successRate'>('launches2025');
  const sortedData = [...trafficData].sort((a, b) => {
    if (sortBy === 'launches2025') return b.launches2025 - a.launches2025;
    if (sortBy === 'successRate') return b.successRate - a.successRate;
    // trend sort: up > stable > down
    const trendOrder = { up: 3, stable: 2, down: 1 };
    return trendOrder[b.trend] - trendOrder[a.trend];
  });

  const totalByYear = {
    y2021: trafficData.reduce((s, t) => s + t.launches2021, 0),
    y2022: trafficData.reduce((s, t) => s + t.launches2022, 0),
    y2023: trafficData.reduce((s, t) => s + t.launches2023, 0),
    y2024: trafficData.reduce((s, t) => s + t.launches2024, 0),
    y2025: trafficData.reduce((s, t) => s + t.launches2025, 0),
  };

  const maxLaunches = Math.max(...trafficData.map(t => t.launches2025));

  // Country breakdown
  const countryData: Record<string, number> = {};
  trafficData.forEach(t => {
    const country = t.country;
    countryData[country] = (countryData[country] || 0) + t.launches2025;
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
            { year: '2021', count: totalByYear.y2021 },
            { year: '2022', count: totalByYear.y2022 },
            { year: '2023', count: totalByYear.y2023 },
            { year: '2024', count: totalByYear.y2024 },
            { year: '2025', count: totalByYear.y2025 },
          ].map((d) => (
            <div key={d.year} className="text-center">
              <div className="text-2xl md:text-3xl font-bold font-display text-white">{d.count}</div>
              <div className="text-star-300/60 text-xs uppercase tracking-widest mt-1">{d.year}</div>
              {/* Mini bar */}
              <div className="mt-2 mx-auto w-full max-w-[60px] h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                  style={{ width: `${(d.count / totalByYear.y2025) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] rounded-lg p-4">
          <div className="text-star-300/60 text-xs uppercase tracking-widest mb-3">Growth</div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-green-400 font-bold text-lg">+{((totalByYear.y2025 / totalByYear.y2021 - 1) * 100).toFixed(0)}%</span>
              <span className="text-star-300/60 text-xs ml-2">since 2021</span>
            </div>
            <span className="text-white/10">|</span>
            <div>
              <span className="text-green-400 font-bold text-lg">+{((totalByYear.y2025 / totalByYear.y2024 - 1) * 100).toFixed(0)}%</span>
              <span className="text-star-300/60 text-xs ml-2">YoY (2024 to 2025)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Country Breakdown */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-4">2025 Launches by Country</h2>
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
          { key: 'launches2025' as const, label: '2025 Launches' },
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
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2021</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2022</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2023</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2024</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2025</th>
                <th className="text-center px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Trend</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Success</th>
                <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedData.map((t) => {
                const trend = getTrendIndicator(t.trend);
                const barWidth = maxLaunches > 0 ? (t.launches2025 / maxLaunches) * 100 : 0;
                return (
                  <tr key={t.siteId} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{t.siteName}</td>
                    <td className="px-4 py-3 text-star-300 whitespace-nowrap">{t.country}</td>
                    <td className="px-4 py-3 text-right text-star-300/60 font-mono">{t.launches2021}</td>
                    <td className="px-4 py-3 text-right text-star-300/70 font-mono">{t.launches2022}</td>
                    <td className="px-4 py-3 text-right text-star-300/80 font-mono">{t.launches2023}</td>
                    <td className="px-4 py-3 text-right text-star-300 font-mono">{t.launches2024}</td>
                    <td className="px-4 py-3 text-right text-white font-mono font-bold">{t.launches2025}</td>
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
          <span>Tracked sites: <span className="text-white font-bold">{trafficData.length}</span></span>
          <span>Total 2025 launches: <span className="text-cyan-400 font-bold">{totalByYear.y2025}</span></span>
          <span>Growing sites: <span className="text-green-400 font-bold">{trafficData.filter(t => t.trend === 'up').length}</span></span>
          <span>Declining sites: <span className="text-red-400 font-bold">{trafficData.filter(t => t.trend === 'down').length}</span></span>
        </div>
      </div>

      {/* Industry Projections */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-2">Launch Industry Projections</h2>
        <p className="text-star-300 text-sm mb-4">Forward-looking analysis based on current trends and announced plans</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-cyan-400 text-2xl font-bold font-display mb-1">280+</div>
            <div className="text-white text-sm font-medium mb-2">Projected 2026 Global Launches</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              Continued growth driven by Starlink deployment cadence, increasing Starship flights, Chinese commercial launchers, and new vehicles ramping up (New Glenn, Ariane 6, Neutron).
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-amber-400 text-2xl font-bold font-display mb-1">4+</div>
            <div className="text-white text-sm font-medium mb-2">New Launch Sites by 2028</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              Sutherland (UK), Andoya (Norway), Esrange (Sweden), and commercial pads in China are targeting first orbital launches in the next 1-2 years. SaxaVord (UK) conducted its first attempt in 2025.
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-green-400 text-2xl font-bold font-display mb-1">62%</div>
            <div className="text-white text-sm font-medium mb-2">US Share of Global Launches</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              The United States dominates global launch traffic, primarily driven by SpaceX Falcon 9 operations from Cape Canaveral, KSC, and Vandenberg. Starship and New Glenn cadence will increase this further.
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
  const [capabilityFilter, setCapabilityFilter] = useState<string>('');
  const [operatorFilter, setOperatorFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'launches' | 'location' | 'established'>('launches');
  const [commsSubTab, setCommsSubTab] = useState<CommsSubTab>('dsn');
  const [relayFilter, setRelayFilter] = useState<string>('');

  // API-fetched data (falls back to hardcoded consts)
  const [activeSpaceportsData, setActiveSpaceportsData] = useState<Spaceport[]>(ACTIVE_SPACEPORTS);
  const [emergingSpaceportsData, setEmergingSpaceportsData] = useState<EmergingSpaceport[]>(EMERGING_SPACEPORTS);
  const [trafficDataState, setTrafficDataState] = useState<TrafficRecord[]>(TRAFFIC_DATA);
  const [dsnComplexesData, setDsnComplexesData] = useState<DSNComplex[]>(DSN_COMPLEXES);
  const [relayNetworksData, setRelayNetworksData] = useState<RelayNetwork[]>(RELAY_NETWORKS);
  const [opticalSystemsData, setOpticalSystemsData] = useState<OpticalSystem[]>(OPTICAL_SYSTEMS);
  const [lunarCommsData, setLunarCommsData] = useState<LunarCommsElement[]>(LUNAR_COMMS_ELEMENTS);
  const [ccsdsProtocolsData, setCcsdsProtocolsData] = useState<CCSDSProtocol[]>(CCSDS_PROTOCOLS);
  const [frequencyAllocationsData, setFrequencyAllocationsData] = useState<FrequencyAllocation[]>(FREQUENCY_ALLOCATIONS);
  const [latencyByOrbitData, setLatencyByOrbitData] = useState<LatencyEntry[]>(LATENCY_BY_ORBIT);
  const [commsHeroStatsData, setCommsHeroStatsData] = useState<CommsHeroStat[]>(COMMS_HERO_STATS);
  const [estrackStationsData, setEstrackStationsData] = useState<EstrackStation[]>(ESTRACK_STATIONS);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setError(null);
      try {
        const sections = [
          'active-spaceports', 'emerging-spaceports', 'traffic-data',
          'dsn-complexes', 'relay-networks', 'optical-systems',
          'lunar-comms-elements', 'ccsds-protocols', 'frequency-allocations',
          'latency-by-orbit', 'comms-hero-stats', 'estrack-stations',
        ];
        const responses = await Promise.all(
          sections.map(s => fetch(`/api/content/spaceports?section=${s}`))
        );
        const data = await Promise.all(responses.map(r => r.json()));

        if (data[0].data?.length) setActiveSpaceportsData(data[0].data);
        if (data[1].data?.length) setEmergingSpaceportsData(data[1].data);
        if (data[2].data?.length) setTrafficDataState(data[2].data);
        if (data[3].data?.length) setDsnComplexesData(data[3].data);
        if (data[4].data?.length) setRelayNetworksData(data[4].data);
        if (data[5].data?.length) setOpticalSystemsData(data[5].data);
        if (data[6].data?.length) setLunarCommsData(data[6].data);
        if (data[7].data?.length) setCcsdsProtocolsData(data[7].data);
        if (data[8].data?.length) setFrequencyAllocationsData(data[8].data);
        if (data[9].data?.length) setLatencyByOrbitData(data[9].data);
        if (data[10].data?.length) setCommsHeroStatsData(data[10].data);
        if (data[11].data?.length) setEstrackStationsData(data[11].data);
        setRefreshedAt(data[0].meta?.lastRefreshed || null);
      } catch (error) {
        clientLogger.error('Failed to load spaceport data', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const countries = Array.from(new Set(activeSpaceportsData.map(s => s.country))).sort();
  const capabilities = Array.from(new Set(activeSpaceportsData.map(s => s.launchCapability))).sort();
  const operators = Array.from(new Set(activeSpaceportsData.map(s => s.operator))).sort();

  const filteredSpaceports = activeSpaceportsData
    .filter(s => !countryFilter || s.country === countryFilter)
    .filter(s => !capabilityFilter || s.launchCapability === capabilityFilter)
    .filter(s => !operatorFilter || s.operator === operatorFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'launches': return b.recentLaunches2025 - a.recentLaunches2025;
        case 'location': return a.country.localeCompare(b.country) || a.location.localeCompare(b.location);
        case 'established': return a.yearEstablished - b.yearEstablished;
        default: return 0;
      }
    });

  const maxLaunchesForCards = Math.max(...activeSpaceportsData.map(s => s.recentLaunches2025), 1);

  const filteredRelays = relayFilter
    ? relayNetworksData.filter((n) => n.status === relayFilter)
    : relayNetworksData;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'active', label: 'Active Sites' },
    { id: 'emerging', label: 'Emerging Sites' },
    { id: 'comparison', label: 'Site Comparison' },
    { id: 'traffic', label: 'Traffic Data' },
    { id: 'communications', label: 'Communications' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              {[1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Infrastructure Network"
          subtitle="Global launch sites, deep space networks, relay constellations, laser communications, and the protocols connecting humanity to the cosmos"
          icon="🏭"
          accentColor="amber"
        />

        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" className="mb-4" />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Hero Stats */}
        <ScrollReveal>
          <HeroStats activeSpaceports={activeSpaceportsData} emergingSpaceports={emergingSpaceportsData} trafficData={trafficDataState} />
        </ScrollReveal>

        {/* Industry Overview Banner */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="font-semibold text-white mb-1">Global Launch Infrastructure</h3>
              <p className="text-sm text-star-300 leading-relaxed">
                The world recorded approximately 260+ orbital launch attempts in 2025, a new record driven by SpaceX Falcon 9
                operations and China&apos;s expanding commercial launch sector. Cape Canaveral / KSC alone accounted for 100+ launches.
                SaxaVord in the UK conducted its first orbital launch attempt. Blue Origin&apos;s New Glenn debuted from KSC, and
                Starship flight cadence increased from Starbase with the second launch mount operational.
                Launch site infrastructure remains the critical bottleneck as the industry scales toward 300+ annual launches.
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
              {/* Filters & Sort Controls */}
              <div className="card p-4 space-y-4">
                {/* Country Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-star-300 text-sm mr-2 flex-shrink-0">Country:</span>
                  <button
                    onClick={() => setCountryFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      countryFilter === ''
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    All ({activeSpaceportsData.length})
                  </button>
                  {countries.map((country) => {
                    const count = activeSpaceportsData.filter(s => s.country === country).length;
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

                {/* Capability Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-star-300 text-sm mr-2 flex-shrink-0">Capability:</span>
                  <button
                    onClick={() => setCapabilityFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      capabilityFilter === ''
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    All
                  </button>
                  {capabilities.map((cap) => {
                    const capLabel = CAPABILITY_CONFIG[cap]?.label || cap;
                    const capColor = CAPABILITY_CONFIG[cap]?.color || 'text-white';
                    return (
                      <button
                        key={cap}
                        onClick={() => setCapabilityFilter(cap)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          capabilityFilter === cap
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                            : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className={capabilityFilter === cap ? '' : capColor}>{capLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Operator Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-star-300 text-sm mr-2 flex-shrink-0">Operator:</span>
                  <button
                    onClick={() => setOperatorFilter('')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      operatorFilter === ''
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    All
                  </button>
                  {operators.map((op) => (
                    <button
                      key={op}
                      onClick={() => setOperatorFilter(op)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        operatorFilter === op
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>

                {/* Sort + Active Filter Count */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-star-300 text-sm mr-2 flex-shrink-0">Sort by:</span>
                    {([
                      { key: 'launches' as const, label: 'Most Launches' },
                      { key: 'name' as const, label: 'Name' },
                      { key: 'location' as const, label: 'Location' },
                      { key: 'established' as const, label: 'Year Established' },
                    ]).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setSortBy(opt.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          sortBy === opt.key
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                            : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-star-300/60 text-sm">
                    Showing <span className="text-white font-bold">{filteredSpaceports.length}</span> of {activeSpaceportsData.length} sites
                    {(countryFilter || capabilityFilter || operatorFilter) && (
                      <button
                        onClick={() => { setCountryFilter(''); setCapabilityFilter(''); setOperatorFilter(''); }}
                        className="ml-3 text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Spaceport Cards Grid */}
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredSpaceports.map((spaceport) => (
                  <StaggerItem key={spaceport.id}>
                    <SpaceportCard spaceport={spaceport} maxLaunches={maxLaunchesForCards} />
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {filteredSpaceports.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-star-300">No spaceports match the selected filters.</p>
                  <button
                    onClick={() => { setCountryFilter(''); setCapabilityFilter(''); setOperatorFilter(''); }}
                    className="mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Clear all filters
                  </button>
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

              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {emergingSpaceportsData.map((spaceport) => (
                  <StaggerItem key={spaceport.id}>
                    <EmergingSpaceportCard spaceport={spaceport} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          )}

          {/* ──────────────── COMPARISON TAB ──────────────── */}
          {activeTab === 'comparison' && (
            <SiteComparisonTable activeSpaceports={activeSpaceportsData} />
          )}

          {/* ──────────────── TRAFFIC DATA TAB ──────────────── */}
          {activeTab === 'traffic' && (
            <TrafficDataTab trafficData={trafficDataState} />
          )}

          {/* ──────────────── COMMUNICATIONS TAB ──────────────── */}
          {activeTab === 'communications' && (
            <SpaceportsCommunicationsTab
              commsHeroStats={commsHeroStatsData}
              dsnComplexes={dsnComplexesData}
              relayNetworks={relayNetworksData}
              opticalSystems={opticalSystemsData}
              lunarComms={lunarCommsData}
              ccsdsProtocols={ccsdsProtocolsData}
              frequencyAllocations={frequencyAllocationsData}
              latencyByOrbit={latencyByOrbitData}
              estrackStations={estrackStationsData}
            />
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
