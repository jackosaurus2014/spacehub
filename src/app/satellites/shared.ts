/**
 * Shared, server-safe types and constants for /satellites.
 *
 * No 'use client', no JSX: imported by the server page (page.tsx — h1,
 * daily-SATCAT catalog stats, curated notable objects) and by the client
 * island (SatellitesClient.tsx — live map, search, featured cards).
 */
// ─── Types ──────────────────────────────────────────────────────────────────
export type OrbitClass = 'LEO' | 'MEO' | 'GEO' | 'HEO';
export type SatCategory = 'all' | 'stations' | 'starlink' | 'weather' | 'gps-ops' | 'active';

export interface SatPosition {
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
}

export interface TLESatellite {
  noradId: string;
  name: string;
  orbitClass: OrbitClass;
  category: string;
  position: SatPosition;
  tle: {
    line1: string;
    line2: string;
    epoch: string;
    inclination: number;
    eccentricity: number;
    meanMotion: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────
export const ORBIT_COLORS: Record<OrbitClass, string> = {
  LEO: '#60a5fa',   // blue-400
  MEO: '#facc15',   // yellow-400
  GEO: '#e879f9',   // fuchsia-400
  HEO: '#4ade80',   // green-400
};

export const ORBIT_LABELS: Record<OrbitClass, string> = {
  LEO: 'Low Earth Orbit',
  MEO: 'Medium Earth Orbit',
  GEO: 'Geostationary',
  HEO: 'Highly Elliptical',
};

// Educational descriptions of each orbital regime (shown below the tracker)
export const ORBIT_GUIDE: { value: OrbitClass; label: string; range: string; description: string }[] = [
  { value: 'LEO', label: 'Low Earth Orbit', range: '160-2,000 km', description: 'Home to the ISS, Starlink, and most Earth-observation satellites. Fast ~90-minute orbits.' },
  { value: 'MEO', label: 'Medium Earth Orbit', range: '2,000-35,786 km', description: 'Navigation constellations like GPS, Galileo, and GLONASS operate here.' },
  { value: 'GEO', label: 'Geostationary', range: '~35,786 km', description: 'Satellites match Earth’s rotation, appearing fixed in the sky. Communications and weather.' },
  { value: 'HEO', label: 'Highly Elliptical', range: 'Variable', description: 'Elongated orbits that dwell over high latitudes. Used for polar communications and early warning.' },
];

export const CATEGORY_OPTIONS: { value: SatCategory; label: string }[] = [
  { value: 'all', label: 'All Satellites' },
  { value: 'stations', label: 'Space Stations' },
  { value: 'starlink', label: 'Starlink' },
  { value: 'weather', label: 'Weather' },
  { value: 'gps-ops', label: 'Navigation (GPS)' },
  { value: 'active', label: 'Active' },
];

export const FEATURED_IDS = ['25544', '20580', '48274', '44713', '36585', '41866'];

export const ISS_NORAD_ID = '25544';

// ─── Notable objects (curated) ──────────────────────────────────────────────
// Server-rendered, crawlable highlights of the tracked catalog. Static,
// hand-verified facts only — names, NORAD IDs, orbital regime and typical
// altitude. Live positions come exclusively from the client-side TLE fetch;
// nothing here pretends to be a live position.

export interface NotableObject {
  name: string;
  noradId: string;
  orbitClass: OrbitClass;
  altitude: string; // typical altitude, human-readable
  role: string;
}

export const NOTABLE_OBJECTS: NotableObject[] = [
  { name: 'ISS (Zarya)', noradId: '25544', orbitClass: 'LEO', altitude: '~420 km', role: 'The International Space Station — the largest crewed outpost in orbit' },
  { name: 'Tiangong (Tianhe core)', noradId: '48274', orbitClass: 'LEO', altitude: '~390 km', role: 'Core module of China\'s crewed space station' },
  { name: 'Hubble Space Telescope', noradId: '20580', orbitClass: 'LEO', altitude: '~525 km', role: 'NASA/ESA space observatory, flying since 1990' },
  { name: 'Starlink-1007', noradId: '44713', orbitClass: 'LEO', altitude: '~550 km', role: 'Early production satellite of the largest broadband constellation' },
  { name: 'Landsat 9', noradId: '49260', orbitClass: 'LEO', altitude: '~705 km', role: 'USGS/NASA Earth-imaging workhorse' },
  { name: 'Terra', noradId: '25994', orbitClass: 'LEO', altitude: '~705 km', role: 'NASA flagship Earth-observation satellite' },
  { name: 'NOAA-20 (JPSS-1)', noradId: '43013', orbitClass: 'LEO', altitude: '~825 km', role: 'Polar-orbiting weather satellite' },
  { name: 'Sentinel-6 Michael Freilich', noradId: '46984', orbitClass: 'LEO', altitude: '~1,336 km', role: 'Sea-level-monitoring radar altimetry mission' },
  { name: 'GPS BIIF-1 (Navstar 65)', noradId: '36585', orbitClass: 'MEO', altitude: '~20,200 km', role: 'GPS Block IIF navigation satellite' },
  { name: 'GOES-16', noradId: '41866', orbitClass: 'GEO', altitude: '~35,786 km', role: 'NOAA geostationary weather satellite (GOES-R series)' },
];
