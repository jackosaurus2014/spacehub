'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type MissionCategory = 'Planetary' | 'Earth Observation' | 'Human Spaceflight' | 'Astronomy' | 'Communications & Navigation';
type MissionStatus = 'Active' | 'Completed' | 'Extended Mission' | 'Lost';

interface SpaceMission {
  name: string;
  agency: string;
  launchDate: string;        // ISO date string or year
  launchYear: number;
  status: MissionStatus;
  orbitDestination: string;
  keyAchievement: string;
  durationDesc: string;      // human-readable duration
  durationDays: number;      // for sorting; -1 if ongoing (use days since launch)
  category: MissionCategory;
}

// ────────────────────────────────────────
// Helper: compute days since launch for ongoing missions
// ────────────────────────────────────────

function daysSinceLaunch(isoDate: string): number {
  const launch = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDuration(days: number): string {
  if (days < 365) return `${days} days`;
  const years = Math.floor(days / 365.25);
  const remainingDays = Math.round(days - years * 365.25);
  if (remainingDays === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
}

// ────────────────────────────────────────
// Mission Data (40+ missions)
// ────────────────────────────────────────

const MISSIONS: SpaceMission[] = [
  // ── Planetary ──
  {
    name: 'Voyager 1',
    agency: 'NASA',
    launchDate: '1977-09-05',
    launchYear: 1977,
    status: 'Active',
    orbitDestination: 'Interstellar space',
    keyAchievement: 'First human-made object to enter interstellar space (2012). Most distant spacecraft from Earth at over 24 billion km.',
    durationDesc: '48+ years (ongoing)',
    durationDays: daysSinceLaunch('1977-09-05'),
    category: 'Planetary',
  },
  {
    name: 'Voyager 2',
    agency: 'NASA',
    launchDate: '1977-08-20',
    launchYear: 1977,
    status: 'Active',
    orbitDestination: 'Interstellar space',
    keyAchievement: 'Only spacecraft to visit all four outer planets (Jupiter, Saturn, Uranus, Neptune). Entered interstellar space in 2018.',
    durationDesc: '48+ years (ongoing)',
    durationDays: daysSinceLaunch('1977-08-20'),
    category: 'Planetary',
  },
  {
    name: 'Mars Curiosity (MSL)',
    agency: 'NASA / JPL',
    launchDate: '2011-11-26',
    launchYear: 2011,
    status: 'Active',
    orbitDestination: 'Mars surface (Gale Crater)',
    keyAchievement: 'Discovered organic molecules and evidence of ancient habitable lake environments on Mars. Pioneered sky-crane landing technique.',
    durationDesc: '14+ years on Mars surface',
    durationDays: daysSinceLaunch('2011-11-26'),
    category: 'Planetary',
  },
  {
    name: 'Perseverance / Ingenuity',
    agency: 'NASA / JPL',
    launchDate: '2020-07-30',
    launchYear: 2020,
    status: 'Active',
    orbitDestination: 'Mars surface (Jezero Crater)',
    keyAchievement: 'MOXIE experiment produced oxygen from Martian atmosphere. Ingenuity helicopter achieved first powered flight on another planet (72 flights total).',
    durationDesc: '5+ years (ongoing)',
    durationDays: daysSinceLaunch('2020-07-30'),
    category: 'Planetary',
  },
  {
    name: 'New Horizons',
    agency: 'NASA',
    launchDate: '2006-01-19',
    launchYear: 2006,
    status: 'Extended Mission',
    orbitDestination: 'Pluto flyby / Kuiper Belt',
    keyAchievement: 'First spacecraft to fly by Pluto (2015), revealing mountains, nitrogen glaciers, and a thin atmosphere. Later flew by Kuiper Belt object Arrokoth.',
    durationDesc: '20+ years (ongoing)',
    durationDays: daysSinceLaunch('2006-01-19'),
    category: 'Planetary',
  },
  {
    name: 'Juno',
    agency: 'NASA',
    launchDate: '2011-08-05',
    launchYear: 2011,
    status: 'Extended Mission',
    orbitDestination: 'Jupiter orbit',
    keyAchievement: 'Revealed Jupiter has a diffuse core, mapped its magnetic field in unprecedented detail, and discovered shallow lightning in the atmosphere.',
    durationDesc: '14+ years (ongoing)',
    durationDays: daysSinceLaunch('2011-08-05'),
    category: 'Planetary',
  },
  {
    name: 'OSIRIS-REx (OSIRIS-APEX)',
    agency: 'NASA',
    launchDate: '2016-09-08',
    launchYear: 2016,
    status: 'Extended Mission',
    orbitDestination: 'Asteroid Bennu / Apophis',
    keyAchievement: 'Successfully collected and returned 121.6 grams of asteroid Bennu surface material to Earth in September 2023. Now en route to asteroid Apophis.',
    durationDesc: '9+ years (ongoing)',
    durationDays: daysSinceLaunch('2016-09-08'),
    category: 'Planetary',
  },
  {
    name: 'Europa Clipper',
    agency: 'NASA / JPL',
    launchDate: '2024-10-14',
    launchYear: 2024,
    status: 'Active',
    orbitDestination: 'Jupiter system (Europa flybys)',
    keyAchievement: 'Largest spacecraft NASA has ever built for a planetary mission. Will perform 49 close flybys of Europa to investigate its subsurface ocean and habitability.',
    durationDesc: 'Launched 2024, arrives 2030',
    durationDays: daysSinceLaunch('2024-10-14'),
    category: 'Planetary',
  },
  {
    name: 'Cassini-Huygens',
    agency: 'NASA / ESA / ASI',
    launchDate: '1997-10-15',
    launchYear: 1997,
    status: 'Completed',
    orbitDestination: 'Saturn orbit',
    keyAchievement: 'Orbited Saturn for 13 years, discovered ocean worlds (Enceladus geysers, Titan methane lakes). Huygens probe landed on Titan -- first landing in the outer solar system.',
    durationDesc: '20 years (1997-2017)',
    durationDays: 7265,
    category: 'Planetary',
  },
  {
    name: 'Mars Reconnaissance Orbiter (MRO)',
    agency: 'NASA',
    launchDate: '2005-08-12',
    launchYear: 2005,
    status: 'Active',
    orbitDestination: 'Mars orbit',
    keyAchievement: 'Highest-resolution camera ever sent to another planet (HiRISE). Discovered seasonal briny water flows and serves as primary data relay for Mars surface missions.',
    durationDesc: '20+ years (ongoing)',
    durationDays: daysSinceLaunch('2005-08-12'),
    category: 'Planetary',
  },
  {
    name: 'Parker Solar Probe',
    agency: 'NASA',
    launchDate: '2018-08-12',
    launchYear: 2018,
    status: 'Active',
    orbitDestination: 'Sun (perihelion approaches)',
    keyAchievement: 'Fastest human-made object (635,266 km/h). First spacecraft to fly through the solar corona. Closest approach within 6.1 million km of the Sun.',
    durationDesc: '7+ years (ongoing)',
    durationDays: daysSinceLaunch('2018-08-12'),
    category: 'Planetary',
  },
  {
    name: 'MESSENGER',
    agency: 'NASA',
    launchDate: '2004-08-03',
    launchYear: 2004,
    status: 'Completed',
    orbitDestination: 'Mercury orbit',
    keyAchievement: 'First spacecraft to orbit Mercury. Discovered water ice in permanently shadowed craters and mapped the entire planet surface.',
    durationDesc: '11 years (2004-2015)',
    durationDays: 3944,
    category: 'Planetary',
  },

  // ── Earth Observation ──
  {
    name: 'Landsat Program',
    agency: 'NASA / USGS',
    launchDate: '1972-07-23',
    launchYear: 1972,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (sun-synchronous)',
    keyAchievement: 'Longest continuous record of Earth observation from space (50+ years). Landsat 8 and 9 currently operational. Critical for climate, agriculture, and resource monitoring.',
    durationDesc: '53+ years (Landsat 1-9)',
    durationDays: daysSinceLaunch('1972-07-23'),
    category: 'Earth Observation',
  },
  {
    name: 'Copernicus / Sentinel',
    agency: 'ESA / EU',
    launchDate: '2014-04-03',
    launchYear: 2014,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (various)',
    keyAchievement: 'World\'s largest environmental monitoring program. Sentinel-1 (radar), 2 (optical), 3 (ocean/land), 5P (atmosphere), 6 (land). Free and open data policy.',
    durationDesc: '11+ years (ongoing)',
    durationDays: daysSinceLaunch('2014-04-03'),
    category: 'Earth Observation',
  },
  {
    name: 'GOES-16 / 17 / 18',
    agency: 'NOAA / NASA',
    launchDate: '2016-11-19',
    launchYear: 2016,
    status: 'Active',
    orbitDestination: 'Geostationary orbit (GEO)',
    keyAchievement: 'Advanced weather monitoring with imagery every 30 seconds for severe storms. Supports hurricane tracking, fire detection, and lightning mapping across Western Hemisphere.',
    durationDesc: '9+ years (ongoing)',
    durationDays: daysSinceLaunch('2016-11-19'),
    category: 'Earth Observation',
  },
  {
    name: 'ICESat-2',
    agency: 'NASA',
    launchDate: '2018-09-15',
    launchYear: 2018,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (polar)',
    keyAchievement: 'Measures ice sheet elevation changes with sub-centimeter precision using photon-counting laser altimetry. Tracks Greenland/Antarctic ice loss and sea ice thickness.',
    durationDesc: '7+ years (ongoing)',
    durationDays: daysSinceLaunch('2018-09-15'),
    category: 'Earth Observation',
  },
  {
    name: 'Terra',
    agency: 'NASA',
    launchDate: '1999-12-18',
    launchYear: 1999,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (sun-synchronous)',
    keyAchievement: 'Flagship Earth Observing System satellite. Five instruments monitoring climate, weather, aerosols, and land use for 25+ years. MODIS data used worldwide.',
    durationDesc: '26+ years (ongoing)',
    durationDays: daysSinceLaunch('1999-12-18'),
    category: 'Earth Observation',
  },
  {
    name: 'GRACE-FO',
    agency: 'NASA / DLR',
    launchDate: '2018-05-22',
    launchYear: 2018,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (polar)',
    keyAchievement: 'Twin satellites measure gravity field changes to track groundwater depletion, ice mass loss, and sea level rise with monthly global maps.',
    durationDesc: '7+ years (ongoing)',
    durationDays: daysSinceLaunch('2018-05-22'),
    category: 'Earth Observation',
  },

  // ── Human Spaceflight ──
  {
    name: 'International Space Station (ISS)',
    agency: 'NASA / Roscosmos / ESA / JAXA / CSA',
    launchDate: '1998-11-20',
    launchYear: 1998,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (408 km)',
    keyAchievement: 'Largest structure ever assembled in space. Continuously crewed since November 2000. Over 3,000 scientific experiments conducted across 270+ crews from 21 countries.',
    durationDesc: '27+ years (ongoing)',
    durationDays: daysSinceLaunch('1998-11-20'),
    category: 'Human Spaceflight',
  },
  {
    name: 'Apollo 11',
    agency: 'NASA',
    launchDate: '1969-07-16',
    launchYear: 1969,
    status: 'Completed',
    orbitDestination: 'Lunar surface (Sea of Tranquility)',
    keyAchievement: 'First crewed Moon landing. Neil Armstrong and Buzz Aldrin spent 21.5 hours on the lunar surface, collected 21.5 kg of samples, and deployed scientific instruments.',
    durationDesc: '8 days, 3 hours, 18 minutes',
    durationDays: 8,
    category: 'Human Spaceflight',
  },
  {
    name: 'Artemis I',
    agency: 'NASA',
    launchDate: '2022-11-16',
    launchYear: 2022,
    status: 'Completed',
    orbitDestination: 'Lunar orbit (distant retrograde)',
    keyAchievement: 'First flight of the Space Launch System (SLS) and uncrewed Orion capsule. Traveled 2.25 million km on a 25-day mission, the farthest any crew-rated spacecraft has flown.',
    durationDesc: '25 days, 10 hours, 53 minutes',
    durationDays: 25,
    category: 'Human Spaceflight',
  },
  {
    name: 'SpaceX Crew Dragon',
    agency: 'SpaceX / NASA',
    launchDate: '2020-05-30',
    launchYear: 2020,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (ISS)',
    keyAchievement: 'First commercial vehicle to carry humans to the ISS (Demo-2, 2020). Restored US crew launch capability. Has flown 15+ crewed missions including private Inspiration4.',
    durationDesc: '5+ years of operations',
    durationDays: daysSinceLaunch('2020-05-30'),
    category: 'Human Spaceflight',
  },
  {
    name: 'Tiangong Space Station',
    agency: 'CNSA',
    launchDate: '2021-04-29',
    launchYear: 2021,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (390 km)',
    keyAchievement: 'China\'s permanently crewed space station. Three modules (Tianhe, Wentian, Mengtian) completed in 2022. Hosts continuous crew rotations and scientific research.',
    durationDesc: '4+ years (ongoing)',
    durationDays: daysSinceLaunch('2021-04-29'),
    category: 'Human Spaceflight',
  },
  {
    name: 'Space Shuttle Program',
    agency: 'NASA',
    launchDate: '1981-04-12',
    launchYear: 1981,
    status: 'Completed',
    orbitDestination: 'Low Earth orbit',
    keyAchievement: 'First reusable crewed spacecraft. 135 missions over 30 years. Built the ISS, deployed Hubble, and carried 355 astronauts. Five orbiters: Columbia, Challenger, Discovery, Atlantis, Endeavour.',
    durationDesc: '30 years (1981-2011)',
    durationDays: 10957,
    category: 'Human Spaceflight',
  },
  {
    name: 'Skylab',
    agency: 'NASA',
    launchDate: '1973-05-14',
    launchYear: 1973,
    status: 'Completed',
    orbitDestination: 'Low Earth orbit (435 km)',
    keyAchievement: 'America\'s first space station. Three crews spent a total of 171 days aboard. Proved humans could live and work in space for extended periods. Pioneered solar astronomy research.',
    durationDesc: '6 years in orbit (1973-1979)',
    durationDays: 2249,
    category: 'Human Spaceflight',
  },

  // ── Astronomy ──
  {
    name: 'Hubble Space Telescope',
    agency: 'NASA / ESA',
    launchDate: '1990-04-24',
    launchYear: 1990,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (540 km)',
    keyAchievement: 'Revolutionized astronomy with 1.5 million+ observations. Deep field images revealed galaxy evolution. Helped determine the age of the universe (13.8 billion years) and the rate of cosmic expansion.',
    durationDesc: '35+ years (ongoing)',
    durationDays: daysSinceLaunch('1990-04-24'),
    category: 'Astronomy',
  },
  {
    name: 'James Webb Space Telescope (JWST)',
    agency: 'NASA / ESA / CSA',
    launchDate: '2021-12-25',
    launchYear: 2021,
    status: 'Active',
    orbitDestination: 'Sun-Earth L2 (1.5 million km)',
    keyAchievement: 'Most powerful space telescope ever built with 6.5m primary mirror. Observes in infrared to see the first galaxies, exoplanet atmospheres, and star-forming regions hidden by dust.',
    durationDesc: '4+ years (ongoing)',
    durationDays: daysSinceLaunch('2021-12-25'),
    category: 'Astronomy',
  },
  {
    name: 'Chandra X-ray Observatory',
    agency: 'NASA',
    launchDate: '1999-07-23',
    launchYear: 1999,
    status: 'Active',
    orbitDestination: 'Highly elliptical orbit (up to 139,000 km)',
    keyAchievement: 'Premier X-ray telescope for 25+ years. Imaged supernova remnants, black hole jets, and galaxy cluster collisions. Provided key evidence for dark matter and dark energy.',
    durationDesc: '26+ years (ongoing)',
    durationDays: daysSinceLaunch('1999-07-23'),
    category: 'Astronomy',
  },
  {
    name: 'TESS (Transiting Exoplanet Survey Satellite)',
    agency: 'NASA',
    launchDate: '2018-04-18',
    launchYear: 2018,
    status: 'Active',
    orbitDestination: 'Highly elliptical orbit (P/2 lunar resonance)',
    keyAchievement: 'Surveys 85% of the sky for transiting exoplanets around nearby bright stars. Has discovered 7,000+ exoplanet candidates and 400+ confirmed planets.',
    durationDesc: '7+ years (ongoing)',
    durationDays: daysSinceLaunch('2018-04-18'),
    category: 'Astronomy',
  },
  {
    name: 'Kepler / K2',
    agency: 'NASA',
    launchDate: '2009-03-07',
    launchYear: 2009,
    status: 'Completed',
    orbitDestination: 'Earth-trailing heliocentric orbit',
    keyAchievement: 'Discovered 2,700+ confirmed exoplanets, proving planets are abundant in our galaxy. Showed small rocky planets are the most common type. Revolutionized our understanding of planetary systems.',
    durationDesc: '9 years (2009-2018)',
    durationDays: 3493,
    category: 'Astronomy',
  },
  {
    name: 'Spitzer Space Telescope',
    agency: 'NASA',
    launchDate: '2003-08-25',
    launchYear: 2003,
    status: 'Completed',
    orbitDestination: 'Earth-trailing heliocentric orbit',
    keyAchievement: 'Infrared Great Observatory. Discovered TRAPPIST-1 planetary system (7 Earth-sized planets). Mapped the Milky Way structure and studied distant galaxies in infrared for 16 years.',
    durationDesc: '16 years (2003-2020)',
    durationDays: 5983,
    category: 'Astronomy',
  },
  {
    name: 'Gaia',
    agency: 'ESA',
    launchDate: '2013-12-19',
    launchYear: 2013,
    status: 'Active',
    orbitDestination: 'Sun-Earth L2',
    keyAchievement: 'Created the most precise 3D map of the Milky Way with positions and motions of nearly 2 billion stars. Data releases have revolutionized stellar astrophysics and galactic dynamics.',
    durationDesc: '12+ years (ongoing)',
    durationDays: daysSinceLaunch('2013-12-19'),
    category: 'Astronomy',
  },
  {
    name: 'Fermi Gamma-ray Space Telescope',
    agency: 'NASA / DOE',
    launchDate: '2008-06-11',
    launchYear: 2008,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (550 km)',
    keyAchievement: 'Scans the entire sky every 3 hours in gamma-rays. Detected thousands of gamma-ray sources including pulsars, blazars, and gamma-ray bursts. Key to multi-messenger astronomy.',
    durationDesc: '17+ years (ongoing)',
    durationDays: daysSinceLaunch('2008-06-11'),
    category: 'Astronomy',
  },

  // ── Communications & Navigation ──
  {
    name: 'GPS Constellation',
    agency: 'US Space Force',
    launchDate: '1978-02-22',
    launchYear: 1978,
    status: 'Active',
    orbitDestination: 'Medium Earth orbit (20,180 km)',
    keyAchievement: 'Global navigation with meter-level accuracy for billions of users. 31 operational satellites across 6 orbital planes. Foundation for precision timing, agriculture, aviation, and autonomous vehicles.',
    durationDesc: '47+ years (ongoing)',
    durationDays: daysSinceLaunch('1978-02-22'),
    category: 'Communications & Navigation',
  },
  {
    name: 'Starlink',
    agency: 'SpaceX',
    launchDate: '2019-05-24',
    launchYear: 2019,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (550 km)',
    keyAchievement: 'World\'s largest satellite constellation with 6,000+ active satellites. Provides broadband internet to 4 million+ subscribers in 75+ countries. Pioneered mass satellite manufacturing.',
    durationDesc: '6+ years (ongoing)',
    durationDays: daysSinceLaunch('2019-05-24'),
    category: 'Communications & Navigation',
  },
  {
    name: 'Iridium NEXT',
    agency: 'Iridium Communications',
    launchDate: '2017-01-14',
    launchYear: 2017,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (780 km)',
    keyAchievement: 'Only satellite network providing true global coverage including poles and oceans. 66 active satellites plus spares. Supports voice, data, maritime tracking, and aircraft surveillance (ADS-B).',
    durationDesc: '9+ years (ongoing)',
    durationDays: daysSinceLaunch('2017-01-14'),
    category: 'Communications & Navigation',
  },
  {
    name: 'Galileo',
    agency: 'ESA / EU',
    launchDate: '2011-10-21',
    launchYear: 2011,
    status: 'Active',
    orbitDestination: 'Medium Earth orbit (23,222 km)',
    keyAchievement: 'Europe\'s independent global navigation system. 28 satellites providing meter-level accuracy. High Accuracy Service delivers 20 cm precision. Search and rescue service with return link.',
    durationDesc: '14+ years (ongoing)',
    durationDays: daysSinceLaunch('2011-10-21'),
    category: 'Communications & Navigation',
  },
  {
    name: 'Tracking and Data Relay Satellite System (TDRSS)',
    agency: 'NASA',
    launchDate: '1983-04-04',
    launchYear: 1983,
    status: 'Active',
    orbitDestination: 'Geostationary orbit (GEO)',
    keyAchievement: 'Backbone of NASA space communications for 40+ years. Provides continuous contact with ISS, Hubble, and LEO spacecraft. Eliminated the need for a worldwide ground station network.',
    durationDesc: '42+ years (ongoing)',
    durationDays: daysSinceLaunch('1983-04-04'),
    category: 'Communications & Navigation',
  },
  {
    name: 'OneWeb',
    agency: 'Eutelsat OneWeb',
    launchDate: '2020-02-06',
    launchYear: 2020,
    status: 'Active',
    orbitDestination: 'Low Earth orbit (1,200 km)',
    keyAchievement: '648-satellite broadband constellation at higher orbit than Starlink. Focuses on enterprise, government, and maritime connectivity. Merged with Eutelsat in 2023.',
    durationDesc: '6+ years (ongoing)',
    durationDays: daysSinceLaunch('2020-02-06'),
    category: 'Communications & Navigation',
  },
  {
    name: 'BeiDou-3',
    agency: 'CNSA',
    launchDate: '2015-03-30',
    launchYear: 2015,
    status: 'Active',
    orbitDestination: 'MEO / GEO / IGSO mix',
    keyAchievement: 'China\'s global navigation system completed in 2020 with 35 satellites. Sub-meter accuracy in Asia-Pacific. Provides short message communication capability unique among GNSS systems.',
    durationDesc: '10+ years (ongoing)',
    durationDays: daysSinceLaunch('2015-03-30'),
    category: 'Communications & Navigation',
  },
];

// ────────────────────────────────────────
// Filter & Sort Options
// ────────────────────────────────────────

const CATEGORY_FILTERS: { label: string; value: MissionCategory | 'All' }[] = [
  { label: 'All Categories', value: 'All' },
  { label: 'Planetary', value: 'Planetary' },
  { label: 'Earth Observation', value: 'Earth Observation' },
  { label: 'Human Spaceflight', value: 'Human Spaceflight' },
  { label: 'Astronomy', value: 'Astronomy' },
  { label: 'Communications & Nav', value: 'Communications & Navigation' },
];

const AGENCY_OPTIONS = ['All', ...Array.from(new Set(MISSIONS.map(m => {
  // Simplify multi-agency strings to primary agency
  if (m.agency.includes('NASA')) return 'NASA';
  if (m.agency.includes('ESA')) return 'ESA';
  if (m.agency.includes('CNSA')) return 'CNSA';
  if (m.agency.includes('SpaceX')) return 'SpaceX';
  if (m.agency.includes('NOAA')) return 'NOAA';
  if (m.agency.includes('US Space Force')) return 'US Space Force';
  if (m.agency.includes('Iridium')) return 'Iridium';
  if (m.agency.includes('Eutelsat')) return 'Eutelsat OneWeb';
  return m.agency;
}))).filter(a => a !== 'All')].sort((a, b) => {
  if (a === 'All') return -1;
  if (b === 'All') return 1;
  return a.localeCompare(b);
});

const STATUS_FILTERS: { label: string; value: MissionStatus | 'All' }[] = [
  { label: 'All Statuses', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Extended Mission', value: 'Extended Mission' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Lost', value: 'Lost' },
];

const DECADE_OPTIONS = ['All', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

type SortKey = 'date' | 'name' | 'duration';
const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Launch Date', value: 'date' },
  { label: 'Name', value: 'name' },
  { label: 'Duration', value: 'duration' },
];

// ────────────────────────────────────────
// Color helpers
// ────────────────────────────────────────

function categoryColor(cat: MissionCategory): string {
  switch (cat) {
    case 'Planetary': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    case 'Earth Observation': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'Human Spaceflight': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'Astronomy': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    case 'Communications & Navigation': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
}

function categoryAccent(cat: MissionCategory): string {
  switch (cat) {
    case 'Planetary': return 'text-orange-400';
    case 'Earth Observation': return 'text-emerald-400';
    case 'Human Spaceflight': return 'text-blue-400';
    case 'Astronomy': return 'text-purple-400';
    case 'Communications & Navigation': return 'text-cyan-400';
    default: return 'text-slate-400';
  }
}

function categoryDot(cat: MissionCategory): string {
  switch (cat) {
    case 'Planetary': return 'bg-orange-400';
    case 'Earth Observation': return 'bg-emerald-400';
    case 'Human Spaceflight': return 'bg-blue-400';
    case 'Astronomy': return 'bg-purple-400';
    case 'Communications & Navigation': return 'bg-cyan-400';
    default: return 'bg-slate-400';
  }
}

function statusColor(status: MissionStatus): string {
  switch (status) {
    case 'Active': return 'text-emerald-400';
    case 'Extended Mission': return 'text-amber-400';
    case 'Completed': return 'text-slate-400';
    case 'Lost': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

function statusDot(status: MissionStatus): string {
  switch (status) {
    case 'Active': return 'bg-emerald-400';
    case 'Extended Mission': return 'bg-amber-400';
    case 'Completed': return 'bg-slate-400';
    case 'Lost': return 'bg-red-400';
    default: return 'bg-slate-400';
  }
}

function categoryIcon(cat: MissionCategory): string {
  switch (cat) {
    case 'Planetary': return '\u{1F30D}';
    case 'Earth Observation': return '\u{1F6F0}\u{FE0F}';
    case 'Human Spaceflight': return '\u{1F468}\u{200D}\u{1F680}';
    case 'Astronomy': return '\u{1F52D}';
    case 'Communications & Navigation': return '\u{1F4E1}';
    default: return '\u{2B50}';
  }
}

function getDecade(year: number): string {
  const d = Math.floor(year / 10) * 10;
  return `${d}s`;
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default function MissionHeritagePage() {
  const [categoryFilter, setCategoryFilter] = useState<MissionCategory | 'All'>('All');
  const [agencyFilter, setAgencyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'All'>('All');
  const [decadeFilter, setDecadeFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (name: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // ── Filtered & Sorted ──
  const filtered = useMemo(() => {
    let results = MISSIONS;

    if (categoryFilter !== 'All') {
      results = results.filter(m => m.category === categoryFilter);
    }
    if (agencyFilter !== 'All') {
      results = results.filter(m => m.agency.includes(agencyFilter));
    }
    if (statusFilter !== 'All') {
      results = results.filter(m => m.status === statusFilter);
    }
    if (decadeFilter !== 'All') {
      results = results.filter(m => getDecade(m.launchYear) === decadeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.agency.toLowerCase().includes(q) ||
        m.keyAchievement.toLowerCase().includes(q) ||
        m.orbitDestination.toLowerCase().includes(q)
      );
    }

    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'duration':
          return b.durationDays - a.durationDays;
        default:
          return 0;
      }
    });

    return results;
  }, [categoryFilter, agencyFilter, statusFilter, decadeFilter, sortBy, searchQuery]);

  // ── Stats ──
  const activeMissions = MISSIONS.filter(m => m.status === 'Active' || m.status === 'Extended Mission').length;
  const longestRunning = MISSIONS.reduce((a, b) => a.durationDays > b.durationDays ? a : b);
  const mostRecent = MISSIONS.reduce((a, b) => new Date(a.launchDate) > new Date(b.launchDate) ? a : b);

  // ── Category distribution for pie chart ──
  const categoryDistribution = useMemo(() => {
    const counts: Record<MissionCategory, number> = {
      'Planetary': 0,
      'Earth Observation': 0,
      'Human Spaceflight': 0,
      'Astronomy': 0,
      'Communications & Navigation': 0,
    };
    MISSIONS.forEach(m => { counts[m.category]++; });
    return counts;
  }, []);

  const totalMissions = MISSIONS.length;

  // Build conic-gradient segments for pie chart
  const pieSegments = useMemo(() => {
    const catColors: Record<MissionCategory, string> = {
      'Planetary': '#f97316',
      'Earth Observation': '#10b981',
      'Human Spaceflight': '#3b82f6',
      'Astronomy': '#a855f7',
      'Communications & Navigation': '#06b6d4',
    };
    const entries = Object.entries(categoryDistribution) as [MissionCategory, number][];
    let cumulative = 0;
    const segments: string[] = [];
    entries.forEach(([cat, count]) => {
      const pct = (count / totalMissions) * 100;
      segments.push(`${catColors[cat]} ${cumulative}% ${cumulative + pct}%`);
      cumulative += pct;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [categoryDistribution, totalMissions]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={[{ label: 'Mission Heritage Database' }]} />

        {/* Header */}
        <AnimatedPageHeader
          title="Space Mission Heritage Database"
          subtitle="A comprehensive searchable database of notable space missions -- from the Voyager probes charting interstellar space to the James Webb Space Telescope peering back to the dawn of the cosmos."
          icon={<span>&#x1F680;</span>}
          accentColor="purple"
        />

        {/* Stats Row */}
        <ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{activeMissions}</div>
              <div className="text-xs text-slate-400 mt-1">Active Missions</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{totalMissions}</div>
              <div className="text-xs text-slate-400 mt-1">Total Missions</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-lg font-bold text-purple-400 truncate" title={longestRunning.name}>{longestRunning.name}</div>
              <div className="text-xs text-slate-400 mt-1">Longest Running ({formatDuration(longestRunning.durationDays)})</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-lg font-bold text-cyan-400 truncate" title={mostRecent.name}>{mostRecent.name}</div>
              <div className="text-xs text-slate-400 mt-1">Most Recent Launch ({mostRecent.launchYear})</div>
            </div>
          </div>
        </ScrollReveal>

        {/* Mission Type Distribution (Pie Chart) */}
        <ScrollReveal delay={0.05}>
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Mission Type Distribution</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* CSS Pie Chart */}
              <div className="relative shrink-0">
                <div
                  className="w-44 h-44 rounded-full"
                  style={{ background: pieSegments }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-slate-950 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xl font-bold text-slate-100">{totalMissions}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Missions</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 flex-1">
                {(Object.entries(categoryDistribution) as [MissionCategory, number][]).map(([cat, count]) => {
                  const pct = ((count / totalMissions) * 100).toFixed(0);
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className={`shrink-0 w-3 h-3 rounded-full ${categoryDot(cat)}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-200 truncate">{cat}</span>
                          <span className="text-sm font-mono text-slate-400 ml-2">{count}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${categoryDot(cat)}`}
                            style={{ width: `${pct}%`, opacity: 0.7 }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Filters & Controls */}
        <ScrollReveal delay={0.1}>
          <div className="card p-4 mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by mission name, agency, destination, or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              />
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap gap-3">
              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as MissionCategory | 'All')}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {CATEGORY_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Agency filter */}
              <select
                value={agencyFilter}
                onChange={e => setAgencyFilter(e.target.value)}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {AGENCY_OPTIONS.map(a => (
                  <option key={a} value={a}>{a === 'All' ? 'All Agencies' : a}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as MissionStatus | 'All')}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {STATUS_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>

              {/* Decade filter */}
              <select
                value={decadeFilter}
                onChange={e => setDecadeFilter(e.target.value)}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {DECADE_OPTIONS.map(d => (
                  <option key={d} value={d}>{d === 'All' ? 'All Decades' : d}</option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {SORT_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>Sort: {s.label}</option>
                ))}
              </select>

              {/* Result count */}
              <span className="ml-auto text-sm text-slate-400 self-center">
                {filtered.length} of {totalMissions} missions
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* Mission Cards */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg">No missions match your filters.</p>
              <button
                onClick={() => {
                  setCategoryFilter('All');
                  setAgencyFilter('All');
                  setStatusFilter('All');
                  setDecadeFilter('All');
                  setSearchQuery('');
                }}
                className="mt-3 text-purple-400 hover:text-purple-300 underline text-sm"
              >
                Clear all filters
              </button>
            </div>
          )}

          {filtered.map((mission, idx) => {
            const isExpanded = expandedCards.has(mission.name);
            return (
              <ScrollReveal key={mission.name} delay={Math.min(idx * 0.04, 0.4)}>
                <div className="card overflow-hidden hover:border-purple-400/40 transition-colors">
                  {/* Card Header -- always visible */}
                  <button
                    onClick={() => toggleCard(mission.name)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4"
                  >
                    {/* Category icon */}
                    <span className="text-2xl shrink-0" aria-hidden="true">
                      {categoryIcon(mission.category)}
                    </span>

                    {/* Name & agency */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-100 truncate">
                        {mission.name}
                      </h3>
                      <p className="text-sm text-slate-400 truncate">{mission.agency}</p>
                    </div>

                    {/* Key info (desktop) */}
                    <div className="hidden md:flex items-center gap-6 text-sm shrink-0">
                      <div className="text-right">
                        <div className="text-slate-300 font-mono">{mission.launchYear}</div>
                        <div className="text-xs text-slate-500">Launch</div>
                      </div>
                      <div className="text-right max-w-[150px]">
                        <div className="text-slate-300 text-xs truncate">{mission.orbitDestination}</div>
                        <div className="text-xs text-slate-500">Destination</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusDot(mission.status)}`} />
                        <span className={`text-xs ${statusColor(mission.status)}`}>{mission.status}</span>
                      </div>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${categoryColor(mission.category)}`}
                      >
                        {mission.category}
                      </span>
                    </div>

                    {/* Expand arrow */}
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Mobile info row */}
                  <div className="md:hidden px-5 pb-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-slate-400">Launch: <span className="text-slate-200 font-mono">{mission.launchYear}</span></span>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusDot(mission.status)}`} />
                      <span className={`text-xs ${statusColor(mission.status)}`}>{mission.status}</span>
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryColor(mission.category)}`}
                    >
                      {mission.category}
                    </span>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-700/50 px-5 py-4 bg-slate-800/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        {/* Agency */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Agency</div>
                          <div className="text-sm text-slate-200">{mission.agency}</div>
                        </div>

                        {/* Launch Date */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Launch Date</div>
                          <div className="text-sm font-mono text-slate-200">
                            {new Date(mission.launchDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</div>
                          <div className={`text-sm font-medium flex items-center gap-2 ${statusColor(mission.status)}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${statusDot(mission.status)}`} />
                            {mission.status}
                          </div>
                        </div>

                        {/* Orbit / Destination */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Orbit / Destination</div>
                          <div className="text-sm text-slate-200">{mission.orbitDestination}</div>
                        </div>

                        {/* Mission Duration */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Mission Duration</div>
                          <div className={`text-sm font-mono ${categoryAccent(mission.category)}`}>
                            {mission.durationDesc}
                          </div>
                        </div>

                        {/* Category */}
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Category</div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${categoryColor(mission.category)}`}>
                            {categoryIcon(mission.category)} {mission.category}
                          </span>
                        </div>
                      </div>

                      {/* Key Achievement */}
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Key Achievement</div>
                        <p className="text-sm text-slate-300 leading-relaxed">{mission.keyAchievement}</p>

        <RelatedModules modules={PAGE_RELATIONS['mission-heritage']} />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Category Overview */}
        <ScrollReveal delay={0.15}>
          <div className="mt-10 card p-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Category Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-orange-500/60" />
                <div>
                  <div className="font-medium text-orange-300">Planetary</div>
                  <div className="text-slate-400">Missions exploring other planets, moons, asteroids, and comets. Includes flybys, orbiters, landers, and sample return missions.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-emerald-500/60" />
                <div>
                  <div className="font-medium text-emerald-300">Earth Observation</div>
                  <div className="text-slate-400">Satellites monitoring Earth&apos;s climate, weather, land use, ice sheets, oceans, and atmosphere from orbit.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-blue-500/60" />
                <div>
                  <div className="font-medium text-blue-300">Human Spaceflight</div>
                  <div className="text-slate-400">Crewed missions including space stations, lunar landings, and commercial crew vehicles enabling humans to live and work in space.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-purple-500/60" />
                <div>
                  <div className="font-medium text-purple-300">Astronomy</div>
                  <div className="text-slate-400">Space telescopes observing the universe across the electromagnetic spectrum -- from infrared and optical to X-ray and gamma-ray.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 mt-0.5 w-3 h-3 rounded-full bg-cyan-500/60" />
                <div>
                  <div className="font-medium text-cyan-300">Communications &amp; Navigation</div>
                  <div className="text-slate-400">Satellite constellations providing global navigation, broadband internet, voice communications, and data relay services.</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Pages */}
        <ScrollReveal delay={0.2}>
          <div className="mt-8 mb-4">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  href: '/solar-exploration',
                  title: 'Solar System Exploration',
                  description: 'Interactive solar system data and mission tracking',
                  icon: '\u{2600}\u{FE0F}',
                },
                {
                  href: '/launch-vehicles',
                  title: 'Launch Vehicles',
                  description: 'Rocket database and performance comparison',
                  icon: '\u{1F680}',
                },
                {
                  href: '/satellites',
                  title: 'Satellite Tracker',
                  description: 'Track active satellites and orbital operations',
                  icon: '\u{1F6F0}\u{FE0F}',
                },
                {
                  href: '/timeline',
                  title: 'Space Timeline',
                  description: 'Chronological history of space exploration',
                  icon: '\u{1F4C5}',
                },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group card p-4 hover:border-purple-500/40 hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{link.icon}</span>
                    <h3 className="font-medium text-slate-200 group-hover:text-purple-300 transition-colors">
                      {link.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer note */}
        <div className="text-center text-xs text-slate-500 py-8">
          Data compiled from NASA, ESA, JAXA, CNSA, and commercial operator mission records.
          Mission dates and specifications reflect publicly available information.
        </div>
      </div>
    </main>
  );
}
