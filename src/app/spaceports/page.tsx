'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'active' | 'emerging' | 'comparison' | 'traffic';
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
// Main Page Component
// ────────────────────────────────────────

export default function SpaceportDirectoryPage() {
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [countryFilter, setCountryFilter] = useState<string>('');

  const countries = Array.from(new Set(ACTIVE_SPACEPORTS.map(s => s.country))).sort();

  const filteredSpaceports = countryFilter
    ? ACTIVE_SPACEPORTS.filter(s => s.country === countryFilter)
    : ACTIVE_SPACEPORTS;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'active', label: 'Active Sites' },
    { id: 'emerging', label: 'Emerging Sites' },
    { id: 'comparison', label: 'Site Comparison' },
    { id: 'traffic', label: 'Traffic Data' },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Spaceport Directory"
          subtitle="Comprehensive directory of global orbital launch sites -- active facilities, emerging spaceports, capabilities, and launch traffic analysis"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Spaceport Directory' },
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
        </div>
      </div>
    </div>
  );
}
