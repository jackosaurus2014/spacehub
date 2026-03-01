'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type SiteStatus = 'Active' | 'Under Construction' | 'Proposed' | 'Limited';
type SortField = 'name' | 'annualLaunchRate' | 'padCount' | 'latitude';
type SortDirection = 'asc' | 'desc';

interface LaunchSite {
  id: string;
  name: string;
  location: string;
  country: string;
  latitude: number;
  longitude: number;
  operator: string;
  status: SiteStatus;
  padCount: number;
  orbitalCapabilities: string[];
  notableLaunches: string[];
  vehiclesSupported: string[];
  annualLaunchRate: number;
  description: string;
  yearEstablished: number;
}

// ────────────────────────────────────────
// Launch Site Data (25+ real-world sites)
// ────────────────────────────────────────

const LAUNCH_SITES: LaunchSite[] = [
  {
    id: 'cape-canaveral',
    name: 'Cape Canaveral Space Force Station',
    location: 'Cape Canaveral, Florida, USA',
    country: 'United States',
    latitude: 28.4889,
    longitude: -80.5778,
    operator: 'US Space Force / SpaceX / ULA',
    status: 'Active',
    padCount: 4,
    orbitalCapabilities: ['LEO', 'GTO', 'GEO', 'Interplanetary', 'Polar (dogleg)'],
    notableLaunches: ['Explorer 1 (1958)', 'Mercury-Atlas 6 (1962)', 'Falcon 9 Starlink missions'],
    vehiclesSupported: ['Falcon 9', 'Falcon Heavy', 'Vulcan Centaur', 'Atlas V'],
    annualLaunchRate: 58,
    description: 'Primary East Coast launch facility for the US. Home to SLC-40 (SpaceX) and SLC-41 (ULA). Handles the majority of US commercial launches.',
    yearEstablished: 1950,
  },
  {
    id: 'ksc-lc39a',
    name: 'Kennedy Space Center (LC-39A)',
    location: 'Merritt Island, Florida, USA',
    country: 'United States',
    latitude: 28.6083,
    longitude: -80.6041,
    operator: 'NASA / SpaceX',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'GTO', 'GEO', 'Lunar', 'Interplanetary'],
    notableLaunches: ['Apollo 11 (1969)', 'STS-1 (1981)', 'Artemis I (2022)', 'Falcon Heavy Demo (2018)'],
    vehiclesSupported: ['Falcon 9', 'Falcon Heavy', 'SLS'],
    annualLaunchRate: 22,
    description: 'Historic NASA launch complex. LC-39A leased by SpaceX for crewed missions and Falcon Heavy. LC-39B supports SLS/Artemis.',
    yearEstablished: 1962,
  },
  {
    id: 'vandenberg',
    name: 'Vandenberg Space Force Base',
    location: 'Lompoc, California, USA',
    country: 'United States',
    latitude: 34.7420,
    longitude: -120.5724,
    operator: 'US Space Force / SpaceX / ULA',
    status: 'Active',
    padCount: 3,
    orbitalCapabilities: ['LEO', 'SSO', 'Polar'],
    notableLaunches: ['NROL classified missions', 'Sentinel-6 (2020)', 'Iridium NEXT constellation'],
    vehiclesSupported: ['Falcon 9', 'Delta IV Heavy', 'Minotaur'],
    annualLaunchRate: 18,
    description: 'Primary US West Coast launch site. SLC-4E (SpaceX) enables polar and sun-synchronous orbits impossible from Florida due to overflight restrictions.',
    yearEstablished: 1957,
  },
  {
    id: 'wallops',
    name: 'Mid-Atlantic Regional Spaceport (Wallops)',
    location: 'Wallops Island, Virginia, USA',
    country: 'United States',
    latitude: 37.8433,
    longitude: -75.4781,
    operator: 'Virginia Space / NASA',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'ISS resupply'],
    notableLaunches: ['Cygnus CRS missions to ISS', 'LADEE (2013)', 'Rocket Lab Electron (2023+)'],
    vehiclesSupported: ['Antares', 'Electron', 'Minotaur I/IV'],
    annualLaunchRate: 6,
    description: 'East Coast mid-latitude launch facility. Northrop Grumman launches Cygnus cargo to ISS. Rocket Lab added a pad (LC-2) for Electron.',
    yearEstablished: 1945,
  },
  {
    id: 'kodiak',
    name: 'Pacific Spaceport Complex - Alaska',
    location: 'Kodiak Island, Alaska, USA',
    country: 'United States',
    latitude: 57.4356,
    longitude: -152.3378,
    operator: 'Alaska Aerospace Corporation',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'SSO', 'Polar'],
    notableLaunches: ['Kodiak Star (2001)', 'Astra Rocket 3 tests', 'DoD responsive launch demos'],
    vehiclesSupported: ['Astra Rocket 3', 'Minotaur IV', 'Various small launch vehicles'],
    annualLaunchRate: 2,
    description: 'High-latitude launch site ideal for polar and sun-synchronous orbits. Supports responsive launch for DoD and commercial small-sat missions.',
    yearEstablished: 1998,
  },
  {
    id: 'spaceport-america',
    name: 'Spaceport America',
    location: 'Sierra County, New Mexico, USA',
    country: 'United States',
    latitude: 32.9903,
    longitude: -106.9750,
    operator: 'New Mexico Spaceport Authority',
    status: 'Active',
    padCount: 1,
    orbitalCapabilities: ['Suborbital', 'Vertical launch capable'],
    notableLaunches: ['Virgin Galactic Unity flights', 'SpinLaunch test launches'],
    vehiclesSupported: ['SpaceShipTwo', 'SpinLaunch', 'Small vertical launchers'],
    annualLaunchRate: 4,
    description: 'World\'s first purpose-built commercial spaceport. Anchor tenant is Virgin Galactic for suborbital space tourism. Vertical launch area also available.',
    yearEstablished: 2011,
  },
  {
    id: 'starbase',
    name: 'Starbase (Boca Chica)',
    location: 'Boca Chica, Texas, USA',
    country: 'United States',
    latitude: 25.9972,
    longitude: -97.1560,
    operator: 'SpaceX',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'GTO', 'Lunar', 'Mars', 'Interplanetary'],
    notableLaunches: ['Starship IFT-1 (2023)', 'Starship IFT-4 booster catch (2024)', 'Starship IFT-6 (2025)'],
    vehiclesSupported: ['Starship / Super Heavy'],
    annualLaunchRate: 6,
    description: 'SpaceX\'s dedicated Starship development and launch facility. Features orbital launch mount with "chopstick" booster catch system and a second pad under construction.',
    yearEstablished: 2019,
  },
  {
    id: 'baikonur',
    name: 'Baikonur Cosmodrome',
    location: 'Baikonur, Kazakhstan',
    country: 'Kazakhstan (leased by Russia)',
    latitude: 45.9650,
    longitude: 63.3050,
    operator: 'Roscosmos',
    status: 'Active',
    padCount: 6,
    orbitalCapabilities: ['LEO', 'GTO', 'GEO', 'Interplanetary', 'ISS crew/cargo'],
    notableLaunches: ['Sputnik 1 (1957)', 'Vostok 1 - Gagarin (1961)', 'Buran (1988)', 'Soyuz ISS crew rotations'],
    vehiclesSupported: ['Soyuz-2', 'Proton-M'],
    annualLaunchRate: 12,
    description: 'The world\'s first and largest spaceport. Launched the first satellite and first human into space. Still Russia\'s primary launch site for crewed Soyuz missions to the ISS.',
    yearEstablished: 1955,
  },
  {
    id: 'vostochny',
    name: 'Vostochny Cosmodrome',
    location: 'Amur Oblast, Russia',
    country: 'Russia',
    latitude: 51.8844,
    longitude: 128.3340,
    operator: 'Roscosmos',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'SSO', 'GTO', 'Lunar'],
    notableLaunches: ['Soyuz-2.1a maiden (2016)', 'Luna 25 (2023)', 'Meteor-M No.2-4 (2024)'],
    vehiclesSupported: ['Soyuz-2', 'Angara A5 (planned)'],
    annualLaunchRate: 4,
    description: 'Russia\'s modern cosmodrome built to reduce dependence on Baikonur. Features one operational Soyuz pad and an Angara pad under construction.',
    yearEstablished: 2016,
  },
  {
    id: 'plesetsk',
    name: 'Plesetsk Cosmodrome',
    location: 'Arkhangelsk Oblast, Russia',
    country: 'Russia',
    latitude: 62.9271,
    longitude: 40.5777,
    operator: 'Russian Aerospace Forces',
    status: 'Active',
    padCount: 4,
    orbitalCapabilities: ['LEO', 'SSO', 'Polar', 'Molniya'],
    notableLaunches: ['Cosmos satellite series', 'Angara A5 test flights', 'GLONASS deployments'],
    vehiclesSupported: ['Soyuz-2', 'Angara A5', 'Rockot'],
    annualLaunchRate: 8,
    description: 'Russia\'s northern military cosmodrome. High latitude enables polar and sun-synchronous orbits. Primary site for Russian military and GLONASS satellite launches.',
    yearEstablished: 1957,
  },
  {
    id: 'kourou',
    name: 'Guiana Space Centre (CSG)',
    location: 'Kourou, French Guiana',
    country: 'France (EU)',
    latitude: 5.2360,
    longitude: -52.7686,
    operator: 'CNES / ESA / Arianespace',
    status: 'Active',
    padCount: 3,
    orbitalCapabilities: ['LEO', 'GTO', 'GEO', 'SSO', 'Interplanetary'],
    notableLaunches: ['Ariane 5 (116 launches)', 'JWST (2021)', 'Vega (2012-2024)', 'Ariane 6 maiden (2024)'],
    vehiclesSupported: ['Ariane 6', 'Vega-C'],
    annualLaunchRate: 8,
    description: 'Europe\'s spaceport. Near-equatorial location (5.2 deg N) provides excellent GTO performance. Launched the James Webb Space Telescope. Transitioning to Ariane 6.',
    yearEstablished: 1968,
  },
  {
    id: 'wenchang',
    name: 'Wenchang Space Launch Site',
    location: 'Hainan, China',
    country: 'China',
    latitude: 19.6145,
    longitude: 110.9510,
    operator: 'CNSA / CASC',
    status: 'Active',
    padCount: 4,
    orbitalCapabilities: ['LEO', 'GTO', 'GEO', 'Lunar', 'Interplanetary'],
    notableLaunches: ['Tianwen-1 Mars mission (2020)', 'Chang\'e-5 (2020)', 'CSS Tianhe core module (2021)'],
    vehiclesSupported: ['Long March 5', 'Long March 7', 'Long March 8'],
    annualLaunchRate: 10,
    description: 'China\'s newest and most capable launch site. Coastal location allows sea transport of large rockets. Primary site for heavy-lift and deep-space missions.',
    yearEstablished: 2014,
  },
  {
    id: 'jiuquan',
    name: 'Jiuquan Satellite Launch Center',
    location: 'Gansu Province, China',
    country: 'China',
    latitude: 40.9581,
    longitude: 100.2913,
    operator: 'CNSA / CASC',
    status: 'Active',
    padCount: 4,
    orbitalCapabilities: ['LEO', 'SSO'],
    notableLaunches: ['Shenzhou crewed missions', 'Tiangong-1 (2011)', 'First Chinese satellite (1970)'],
    vehiclesSupported: ['Long March 2C/2D/2F', 'Long March 4B/4C', 'Long March 11'],
    annualLaunchRate: 18,
    description: 'China\'s oldest and busiest launch center. Primary site for crewed Shenzhou missions and LEO satellite deployments. Located in the Gobi Desert.',
    yearEstablished: 1958,
  },
  {
    id: 'xichang',
    name: 'Xichang Satellite Launch Center',
    location: 'Sichuan Province, China',
    country: 'China',
    latitude: 28.2468,
    longitude: 102.0267,
    operator: 'CNSA / CASC',
    status: 'Active',
    padCount: 3,
    orbitalCapabilities: ['GTO', 'GEO', 'MEO'],
    notableLaunches: ['BeiDou navigation constellation', 'Chang\'e-1/2 (2007/2010)', 'NigComSat-1 (2007)'],
    vehiclesSupported: ['Long March 3A/3B/3C', 'Long March 2C'],
    annualLaunchRate: 14,
    description: 'China\'s primary GTO launch site. Located in a mountainous valley, it launched the entire BeiDou navigation constellation and early lunar missions.',
    yearEstablished: 1984,
  },
  {
    id: 'taiyuan',
    name: 'Taiyuan Satellite Launch Center',
    location: 'Shanxi Province, China',
    country: 'China',
    latitude: 38.8491,
    longitude: 111.6082,
    operator: 'CNSA / CASC',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'SSO', 'Polar'],
    notableLaunches: ['Fengyun weather satellites', 'Gaofen Earth observation series', 'Yaogan reconnaissance satellites'],
    vehiclesSupported: ['Long March 4B/4C', 'Long March 6', 'Long March 2C'],
    annualLaunchRate: 10,
    description: 'China\'s northern launch center specializing in sun-synchronous and polar orbit missions. Key site for weather and Earth observation satellites.',
    yearEstablished: 1988,
  },
  {
    id: 'sriharikota',
    name: 'Satish Dhawan Space Centre (SHAR)',
    location: 'Sriharikota, Andhra Pradesh, India',
    country: 'India',
    latitude: 13.7199,
    longitude: 80.2304,
    operator: 'ISRO',
    status: 'Active',
    padCount: 3,
    orbitalCapabilities: ['LEO', 'GTO', 'SSO', 'Lunar', 'Interplanetary'],
    notableLaunches: ['Chandrayaan-3 lunar landing (2023)', 'Mangalyaan Mars (2013)', 'PSLV record 104 sats (2017)'],
    vehiclesSupported: ['PSLV', 'GSLV Mk II', 'GSLV Mk III (LVM3)', 'SSLV'],
    annualLaunchRate: 8,
    description: 'India\'s primary spaceport on a barrier island. Low latitude (13.7 deg) benefits GTO launches. ISRO operates two launch pads and a vehicle assembly building.',
    yearEstablished: 1971,
  },
  {
    id: 'tanegashima',
    name: 'Tanegashima Space Center',
    location: 'Tanegashima Island, Kagoshima, Japan',
    country: 'Japan',
    latitude: 30.3670,
    longitude: 130.9688,
    operator: 'JAXA',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'GTO', 'SSO', 'Lunar', 'Interplanetary'],
    notableLaunches: ['Hayabusa2 (2014)', 'SLIM lunar lander (2024)', 'H3 maiden flight (2024)'],
    vehiclesSupported: ['H3', 'Epsilon S'],
    annualLaunchRate: 4,
    description: 'Japan\'s largest launch facility. Coastal site on a southern island. Transitioning from H-IIA to next-generation H3 rocket for cost-competitive launches.',
    yearEstablished: 1969,
  },
  {
    id: 'alcantara',
    name: 'Alcantara Launch Center',
    location: 'Maranhao, Brazil',
    country: 'Brazil',
    latitude: 2.3730,
    longitude: -44.3964,
    operator: 'Brazilian Air Force / AEB',
    status: 'Limited',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'GTO (potential)', 'SSO'],
    notableLaunches: ['VLS-1 V03 (2003, failed)', 'Suborbital sounding rockets'],
    vehiclesSupported: ['VLS-1 (development)', 'Sounding rockets', 'Commercial partners TBD'],
    annualLaunchRate: 1,
    description: 'Near-equatorial site (2.3 deg S) with the best latitude advantage of any launch site globally. US-Brazil Technology Safeguards Agreement (2019) allows commercial use.',
    yearEstablished: 1983,
  },
  {
    id: 'naro',
    name: 'Naro Space Center',
    location: 'Goheung, South Jeolla, South Korea',
    country: 'South Korea',
    latitude: 34.4317,
    longitude: 127.5350,
    operator: 'KARI / KASA',
    status: 'Active',
    padCount: 1,
    orbitalCapabilities: ['LEO', 'SSO'],
    notableLaunches: ['Nuri (KSLV-II) maiden (2022)', 'Nuri Flight 3 with payloads (2023)', 'KSLV-I / Naro-1 (2013)'],
    vehiclesSupported: ['Nuri (KSLV-II)'],
    annualLaunchRate: 2,
    description: 'South Korea\'s only orbital launch site. Nuri rocket achieved orbit in 2022, making South Korea the 7th nation with indigenous orbital capability from its own soil.',
    yearEstablished: 2009,
  },
  {
    id: 'mahia',
    name: 'Rocket Lab Launch Complex 1',
    location: 'Mahia Peninsula, New Zealand',
    country: 'New Zealand',
    latitude: -39.2626,
    longitude: 177.8649,
    operator: 'Rocket Lab',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'SSO', 'Polar', 'Lunar'],
    notableLaunches: ['CAPSTONE lunar mission (2022)', 'Electron 50th launch (2024)', 'Photon Mars mission (planned)'],
    vehiclesSupported: ['Electron'],
    annualLaunchRate: 12,
    description: 'World\'s first private orbital launch complex. Southern hemisphere location provides excellent access to SSO and high-inclination orbits with minimal maritime traffic.',
    yearEstablished: 2016,
  },
  {
    id: 'saxavord',
    name: 'SaxaVord Spaceport',
    location: 'Unst, Shetland Islands, UK',
    country: 'United Kingdom',
    latitude: 60.8259,
    longitude: -0.7720,
    operator: 'SaxaVord UK',
    status: 'Under Construction',
    padCount: 3,
    orbitalCapabilities: ['LEO', 'SSO', 'Polar'],
    notableLaunches: [],
    vehiclesSupported: ['RFA ONE', 'HyImpulse SL1', 'Orbex Prime (planned)'],
    annualLaunchRate: 0,
    description: 'UK\'s first vertical launch spaceport, on the northernmost inhabited island of the British Isles. High latitude ideal for polar orbits. First launch planned for 2025-2026.',
    yearEstablished: 2023,
  },
  {
    id: 'andoya',
    name: 'Andoya Spaceport',
    location: 'Andoya, Nordland, Norway',
    country: 'Norway',
    latitude: 69.2944,
    longitude: 16.0250,
    operator: 'Andoya Space',
    status: 'Under Construction',
    padCount: 1,
    orbitalCapabilities: ['LEO', 'SSO', 'Polar'],
    notableLaunches: ['Decades of sounding rocket launches'],
    vehiclesSupported: ['Isar Aerospace Spectrum', 'Small launch vehicles'],
    annualLaunchRate: 0,
    description: 'Europe\'s first continental orbital launch site, above the Arctic Circle. Decades of sounding rocket heritage. Orbital launch pad targeting small satellite market.',
    yearEstablished: 2023,
  },
  {
    id: 'sutherland',
    name: 'Space Hub Sutherland',
    location: 'Sutherland, Scottish Highlands, UK',
    country: 'United Kingdom',
    latitude: 58.5111,
    longitude: -4.4330,
    operator: 'Orbex / HIE',
    status: 'Proposed',
    padCount: 1,
    orbitalCapabilities: ['LEO', 'SSO', 'Polar'],
    notableLaunches: [],
    vehiclesSupported: ['Orbex Prime'],
    annualLaunchRate: 0,
    description: 'Proposed vertical launch site on Scottish mainland. Orbex Prime rocket uses bio-propane fuel. Designed as a low-environmental-impact spaceport.',
    yearEstablished: 2025,
  },
  {
    id: 'semnan',
    name: 'Imam Khomeini Space Launch Terminal',
    location: 'Semnan Province, Iran',
    country: 'Iran',
    latitude: 35.2345,
    longitude: 53.9210,
    operator: 'Iranian Space Agency',
    status: 'Active',
    padCount: 1,
    orbitalCapabilities: ['LEO'],
    notableLaunches: ['Omid (2009)', 'Noor-1 military satellite (2020)', 'Soraya (2024)'],
    vehiclesSupported: ['Simorgh', 'Qased', 'Zoljanah'],
    annualLaunchRate: 2,
    description: 'Iran\'s primary orbital launch facility in the Dasht-e Kavir desert. Used for both civilian ISA and IRGC military space launches.',
    yearEstablished: 2008,
  },
  {
    id: 'palmachim',
    name: 'Palmachim Airbase',
    location: 'Central District, Israel',
    country: 'Israel',
    latitude: 31.8978,
    longitude: 34.6836,
    operator: 'Israeli Air Force / IAI',
    status: 'Active',
    padCount: 1,
    orbitalCapabilities: ['LEO (retrograde)'],
    notableLaunches: ['Ofeq reconnaissance satellites (1988-present)', 'Shavit launches'],
    vehiclesSupported: ['Shavit'],
    annualLaunchRate: 1,
    description: 'Israel\'s orbital launch site. Uniquely launches westward (retrograde) over the Mediterranean to avoid overflying hostile neighbors, reducing payload capacity but ensuring safety.',
    yearEstablished: 1988,
  },
  {
    id: 'uchinoura',
    name: 'Uchinoura Space Center',
    location: 'Kagoshima, Japan',
    country: 'Japan',
    latitude: 31.2511,
    longitude: 131.0811,
    operator: 'JAXA',
    status: 'Active',
    padCount: 2,
    orbitalCapabilities: ['LEO', 'SSO', 'Interplanetary'],
    notableLaunches: ['Hayabusa (2003)', 'Akatsuki Venus orbiter (2010)', 'Epsilon rocket series'],
    vehiclesSupported: ['Epsilon', 'SS-520', 'Sounding rockets'],
    annualLaunchRate: 2,
    description: 'JAXA facility for solid-fuel rockets and scientific missions. Originally ISAS\'s launch site, it has launched numerous planetary science missions and sounding rockets.',
    yearEstablished: 1962,
  },
  {
    id: 'jiuquan-commercial',
    name: 'Jiuquan Commercial Launch Zone',
    location: 'Gansu Province, China',
    country: 'China',
    latitude: 40.9600,
    longitude: 100.3000,
    operator: 'Various Chinese commercial firms',
    status: 'Active',
    padCount: 3,
    orbitalCapabilities: ['LEO', 'SSO'],
    notableLaunches: ['LandSpace Zhuque-2 (2023, first methane rocket to orbit)', 'iSpace Hyperbola-1 (2019)', 'Galactic Energy Ceres-1'],
    vehiclesSupported: ['Zhuque-2', 'Ceres-1', 'Hyperbola-1', 'Kuaizhou-1A'],
    annualLaunchRate: 12,
    description: 'Dedicated commercial launch zone at Jiuquan supporting China\'s growing private launch industry. Multiple commercial companies share pads and infrastructure.',
    yearEstablished: 2018,
  },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

const ALL_COUNTRIES = Array.from(new Set(LAUNCH_SITES.map((s) => s.country))).sort();
const ALL_STATUSES: SiteStatus[] = ['Active', 'Under Construction', 'Proposed', 'Limited'];
const ALL_CAPABILITIES = Array.from(
  new Set(LAUNCH_SITES.flatMap((s) => s.orbitalCapabilities))
).sort();

function statusColor(status: SiteStatus): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Under Construction':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'Proposed':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Limited':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

function latitudeAdvantage(lat: number): { label: string; color: string; bonus: string } {
  const absLat = Math.abs(lat);
  if (absLat <= 5) return { label: 'Excellent', color: 'text-emerald-400', bonus: '~15% GTO bonus' };
  if (absLat <= 15) return { label: 'Very Good', color: 'text-green-400', bonus: '~10% GTO bonus' };
  if (absLat <= 30) return { label: 'Good', color: 'text-cyan-400', bonus: '~5% GTO bonus' };
  if (absLat <= 45) return { label: 'Moderate', color: 'text-yellow-400', bonus: 'Minimal GTO bonus' };
  return { label: 'High Latitude', color: 'text-orange-400', bonus: 'Polar orbit advantage' };
}

function formatCoordinate(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}${latDir}, ${Math.abs(lon).toFixed(2)}${lonDir}`;
}

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function LaunchSiteDatabasePage() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<string>('all');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('annualLaunchRate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // View state
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filtered and sorted sites
  const filteredSites = useMemo(() => {
    let sites = [...LAUNCH_SITES];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      sites = sites.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.operator.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          s.vehiclesSupported.some((v) => v.toLowerCase().includes(q))
      );
    }

    // Country filter
    if (countryFilter !== 'all') {
      sites = sites.filter((s) => s.country === countryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      sites = sites.filter((s) => s.status === statusFilter);
    }

    // Capability filter
    if (capabilityFilter !== 'all') {
      sites = sites.filter((s) => s.orbitalCapabilities.includes(capabilityFilter));
    }

    // Sort
    sites.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'annualLaunchRate':
          cmp = a.annualLaunchRate - b.annualLaunchRate;
          break;
        case 'padCount':
          cmp = a.padCount - b.padCount;
          break;
        case 'latitude':
          cmp = Math.abs(a.latitude) - Math.abs(b.latitude);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return sites;
  }, [searchQuery, countryFilter, statusFilter, capabilityFilter, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    const active = LAUNCH_SITES.filter((s) => s.status === 'Active').length;
    const totalPads = LAUNCH_SITES.reduce((sum, s) => sum + s.padCount, 0);
    const totalLaunches = LAUNCH_SITES.reduce((sum, s) => sum + s.annualLaunchRate, 0);
    const countries = new Set(LAUNCH_SITES.map((s) => s.country)).size;
    return { active, totalPads, totalLaunches, countries };
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Launch Site Database"
          subtitle="Comprehensive profiles of the world's orbital and suborbital launch facilities -- from historic cosmodromes to next-generation commercial spaceports."
          icon={<span role="img" aria-label="Launch site pin">&#x1F4CD;</span>}
          accentColor="cyan"
        />

        {/* Summary Statistics */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{stats.active}</p>
              <p className="text-xs text-slate-400 mt-1">Active Sites</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.totalPads}</p>
              <p className="text-xs text-slate-400 mt-1">Total Launch Pads</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">~{stats.totalLaunches}</p>
              <p className="text-xs text-slate-400 mt-1">Annual Launches (est.)</p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{stats.countries}</p>
              <p className="text-xs text-slate-400 mt-1">Countries</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Filters & Controls */}
        <ScrollReveal delay={0.1}>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              {/* Search */}
              <div className="flex-1 w-full lg:w-auto">
                <label className="block text-xs text-slate-400 mb-1">Search</label>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, location, operator, vehicle..."
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
              </div>

              {/* Country */}
              <div className="w-full lg:w-44">
                <label className="block text-xs text-slate-400 mb-1">Country</label>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="all">All Countries</option>
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="w-full lg:w-44">
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="all">All Statuses</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Capability */}
              <div className="w-full lg:w-44">
                <label className="block text-xs text-slate-400 mb-1">Orbital Capability</label>
                <select
                  value={capabilityFilter}
                  onChange={(e) => setCapabilityFilter(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="all">All Capabilities</option>
                  {ALL_CAPABILITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort & View toggles */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-700/40">
              <span className="text-xs text-slate-500">Sort by:</span>
              {[
                { field: 'annualLaunchRate' as SortField, label: 'Launch Rate' },
                { field: 'padCount' as SortField, label: 'Pad Count' },
                { field: 'latitude' as SortField, label: 'Latitude' },
                { field: 'name' as SortField, label: 'Name' },
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    sortField === field
                      ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-700/40 text-slate-400 border border-slate-600/30 hover:bg-slate-700/60 hover:text-slate-300'
                  }`}
                >
                  {label}
                  {sortIndicator(field)}
                </button>
              ))}
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-700/40 text-slate-400 border border-slate-600/30 hover:bg-slate-700/60'
                  }`}
                  aria-label="Grid view"
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === 'table'
                      ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-700/40 text-slate-400 border border-slate-600/30 hover:bg-slate-700/60'
                  }`}
                  aria-label="Table view"
                >
                  Table
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Results count */}
        <p className="text-sm text-slate-400 mb-4">
          Showing {filteredSites.length} of {LAUNCH_SITES.length} launch sites
        </p>

        {/* ── Latitude Advantage Visualization ── */}
        <ScrollReveal delay={0.15}>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-3">
              Latitude Advantage Visualization
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Launch sites closer to the equator benefit from Earth&apos;s rotational velocity (~465 m/s at equator),
              reducing fuel needed for geostationary transfer orbits. High-latitude sites excel at polar and SSO missions.
            </p>
            <div className="relative">
              {/* Latitude scale */}
              <div className="flex justify-between text-[10px] text-slate-500 mb-1 px-1">
                <span>0° (Equator)</span>
                <span>15°</span>
                <span>30°</span>
                <span>45°</span>
                <span>60°+</span>
              </div>
              {/* Background gradient bar */}
              <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500/40 via-cyan-500/30 via-yellow-500/20 to-orange-500/20 mb-3" />
              {/* Site markers */}
              <div className="relative h-auto space-y-1">
                {filteredSites.map((site) => {
                  const absLat = Math.abs(site.latitude);
                  const pct = Math.min((absLat / 70) * 100, 100);
                  const adv = latitudeAdvantage(site.latitude);
                  return (
                    <div key={site.id} className="flex items-center gap-2 group">
                      <div className="w-40 sm:w-52 text-right truncate">
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">
                          {site.name.length > 28 ? site.name.slice(0, 28) + '...' : site.name}
                        </span>
                      </div>
                      <div className="flex-1 relative h-5 bg-slate-900/40 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-600/50 to-cyan-400/30 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        >
                          <span className="text-[9px] text-cyan-300 whitespace-nowrap">
                            {absLat.toFixed(1)}°
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] w-16 text-right ${adv.color}`}>{adv.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Grid View ── */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {filteredSites.map((site, idx) => {
              const isExpanded = expandedSite === site.id;
              const adv = latitudeAdvantage(site.latitude);
              return (
                <ScrollReveal key={site.id} delay={Math.min(idx * 0.04, 0.4)}>
                  <div
                    className={`bg-slate-800/50 border rounded-xl overflow-hidden transition-all duration-300 ${
                      isExpanded
                        ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-700/50 hover:border-slate-600/60'
                    }`}
                  >
                    {/* Card Header */}
                    <button
                      onClick={() => setExpandedSite(isExpanded ? null : site.id)}
                      className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 rounded-t-xl"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-slate-100 leading-tight">
                            {site.name}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">{site.location}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{site.operator}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor(
                              site.status
                            )}`}
                          >
                            {site.status}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Est. {site.yearEstablished}
                          </span>
                        </div>
                      </div>

                      {/* Quick stats row */}
                      <div className="flex flex-wrap gap-3 mt-3">
                        <div className="text-center">
                          <p className="text-sm font-bold text-cyan-400">{site.annualLaunchRate}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Launches/yr</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-emerald-400">{site.padCount}</p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wide">Pads</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-sm font-bold ${adv.color}`}>
                            {Math.abs(site.latitude).toFixed(1)}°
                          </p>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wide">|Latitude|</p>
                        </div>
                        <div className="text-center ml-auto">
                          <p className={`text-xs font-medium ${adv.color}`}>{adv.label}</p>
                          <p className="text-[9px] text-slate-500">{adv.bonus}</p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-slate-700/40 p-4 bg-slate-900/30 space-y-4">
                        <p className="text-sm text-slate-300 leading-relaxed">{site.description}</p>

                        {/* Coordinates */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Coordinates
                          </h4>
                          <p className="text-sm text-slate-200 font-mono">
                            {formatCoordinate(site.latitude, site.longitude)}
                          </p>
                        </div>

                        {/* Orbital Capabilities */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Orbital Capabilities
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {site.orbitalCapabilities.map((cap) => (
                              <span
                                key={cap}
                                className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 rounded-md text-[11px] border border-cyan-500/20"
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Vehicles Supported */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Vehicles Supported
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {site.vehiclesSupported.map((v) => (
                              <span
                                key={v}
                                className="px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-md text-[11px] border border-purple-500/20"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Notable Launches */}
                        {site.notableLaunches.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                              Notable Launches
                            </h4>
                            <ul className="space-y-1">
                              {site.notableLaunches.map((launch, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-300 flex items-start gap-2"
                                >
                                  <span className="text-cyan-500 mt-0.5 shrink-0">&#x25B8;</span>
                                  {launch}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        {/* ── Table View ── */}
        {viewMode === 'table' && (
          <ScrollReveal>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/60">
                    {[
                      { field: 'name' as SortField, label: 'Launch Site', width: 'w-56' },
                      { field: 'name' as SortField, label: 'Country', width: 'w-32' },
                      { field: 'name' as SortField, label: 'Status', width: 'w-28' },
                      { field: 'padCount' as SortField, label: 'Pads', width: 'w-16' },
                      { field: 'annualLaunchRate' as SortField, label: 'Launches/yr', width: 'w-24' },
                      { field: 'latitude' as SortField, label: '|Lat|', width: 'w-20' },
                      { field: 'name' as SortField, label: 'Lat Advantage', width: 'w-24' },
                      { field: 'name' as SortField, label: 'Capabilities', width: '' },
                    ].map(({ field, label, width }, i) => (
                      <th
                        key={i}
                        onClick={() => handleSort(field)}
                        className={`${width} px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors`}
                      >
                        {label}
                        {sortIndicator(field)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.map((site, idx) => {
                    const adv = latitudeAdvantage(site.latitude);
                    return (
                      <tr
                        key={site.id}
                        onClick={() => setExpandedSite(expandedSite === site.id ? null : site.id)}
                        className={`border-b border-slate-800/60 cursor-pointer transition-colors ${
                          idx % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/10'
                        } hover:bg-slate-700/30`}
                      >
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-200 text-xs leading-tight">
                            {site.name}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{site.operator}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-300">{site.country}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor(
                              site.status
                            )}`}
                          >
                            {site.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-300 text-center">{site.padCount}</td>
                        <td className="px-3 py-3 text-xs text-cyan-400 font-semibold text-center">
                          {site.annualLaunchRate}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-300 font-mono text-center">
                          {Math.abs(site.latitude).toFixed(1)}°
                        </td>
                        <td className={`px-3 py-3 text-xs font-medium ${adv.color}`}>
                          {adv.label}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {site.orbitalCapabilities.slice(0, 3).map((cap) => (
                              <span
                                key={cap}
                                className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded text-[10px]"
                              >
                                {cap}
                              </span>
                            ))}
                            {site.orbitalCapabilities.length > 3 && (
                              <span className="text-[10px] text-slate-500">
                                +{site.orbitalCapabilities.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table row expansion */}
            {expandedSite && (
              <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-5 mb-8 -mt-4">
                {(() => {
                  const site = LAUNCH_SITES.find((s) => s.id === expandedSite);
                  if (!site) return null;
                  const adv = latitudeAdvantage(site.latitude);
                  return (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-100">{site.name}</h3>
                          <p className="text-sm text-slate-400">{site.location}</p>
                          <p className="text-xs text-slate-500">{site.operator} | Est. {site.yearEstablished}</p>
                        </div>
                        <button
                          onClick={() => setExpandedSite(null)}
                          className="text-slate-500 hover:text-slate-300 text-lg transition-colors"
                          aria-label="Close details"
                        >
                          &#x2715;
                        </button>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{site.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-cyan-400">{site.annualLaunchRate}</p>
                          <p className="text-[10px] text-slate-500">Launches/yr</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <p className="text-lg font-bold text-emerald-400">{site.padCount}</p>
                          <p className="text-[10px] text-slate-500">Launch Pads</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <p className="text-sm font-mono font-bold text-slate-200">
                            {formatCoordinate(site.latitude, site.longitude)}
                          </p>
                          <p className="text-[10px] text-slate-500">Coordinates</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                          <p className={`text-lg font-bold ${adv.color}`}>{adv.label}</p>
                          <p className="text-[10px] text-slate-500">{adv.bonus}</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Orbital Capabilities
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {site.orbitalCapabilities.map((cap) => (
                              <span
                                key={cap}
                                className="px-2 py-0.5 bg-cyan-500/15 text-cyan-300 rounded-md text-[11px] border border-cyan-500/20"
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Vehicles Supported
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {site.vehiclesSupported.map((v) => (
                              <span
                                key={v}
                                className="px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-md text-[11px] border border-purple-500/20"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Notable Launches
                          </h4>
                          {site.notableLaunches.length > 0 ? (
                            <ul className="space-y-1">
                              {site.notableLaunches.map((launch, i) => (
                                <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                                  <span className="text-cyan-500 mt-0.5 shrink-0">&#x25B8;</span>
                                  {launch}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-500 italic">No orbital launches yet</p>
                          )}
                        </div>

        <RelatedModules modules={PAGE_RELATIONS['launch-sites']} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </ScrollReveal>
        )}

        {/* Empty state */}
        {filteredSites.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">&#x1F50D;</p>
            <p className="text-slate-400 text-lg">No launch sites match your filters</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCountryFilter('all');
                setStatusFilter('all');
                setCapabilityFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-cyan-600/20 text-cyan-300 rounded-lg text-sm border border-cyan-500/30 hover:bg-cyan-600/30 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* ── Related Links ── */}
        <ScrollReveal delay={0.2}>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 mt-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link
                href="/spaceports"
                className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-lg border border-slate-700/40 hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-2xl" role="img" aria-label="Spaceport">&#x1F680;</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                    Spaceports
                  </p>
                  <p className="text-[10px] text-slate-500">Global spaceport directory</p>
                </div>
              </Link>
              <Link
                href="/launch-vehicles"
                className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-lg border border-slate-700/40 hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-2xl" role="img" aria-label="Rocket">&#x1F6F8;</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                    Launch Vehicles
                  </p>
                  <p className="text-[10px] text-slate-500">Rocket specs &amp; comparisons</p>
                </div>
              </Link>
              <Link
                href="/launch-windows"
                className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-lg border border-slate-700/40 hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-2xl" role="img" aria-label="Calendar">&#x1F4C5;</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                    Launch Windows
                  </p>
                  <p className="text-[10px] text-slate-500">Upcoming launch schedule</p>
                </div>
              </Link>
              <Link
                href="/mission-cost"
                className="flex items-center gap-3 p-3 bg-slate-900/40 rounded-lg border border-slate-700/40 hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all group"
              >
                <span className="text-2xl" role="img" aria-label="Calculator">&#x1F4B0;</span>
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                    Mission Planning
                  </p>
                  <p className="text-[10px] text-slate-500">Cost estimator &amp; planning tools</p>
                </div>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Footer note */}
        <div className="mt-8 pb-8 text-center">
          <p className="text-xs text-slate-500">
            Data compiled from public sources including FAA, ESA, CNSA, Roscosmos, and operator disclosures.
            Annual launch rates are approximate estimates based on recent activity.
          </p>
        </div>
      </div>
    </main>
  );
}
