// "Tonight over your town" city registry (2026-09-01, roadmap Tier 2 —
// the simple version of "will I see it from my yard": coarse city, ISS /
// Tiangong / Hubble passes, email alerts only).
//
// Pure data, no imports: the edge middleware reads this through
// src/lib/registry-routes.ts to 404 unknown /tonight/[city] slugs, so it
// must stay free of Node-only modules. The pass computation lives in
// src/lib/tonight.ts.
//
// Membership: every launch-viewing city (src/lib/launch-viewing-cities.ts,
// same coordinates — Florida, California, Texas, Delmarva, French Guiana)
// plus the 25 largest US metros not already covered and three large
// English-speaking metros abroad. `tz` is the IANA zone used to define
// "tonight" (local 18:00 → 06:00); the guard test asserts Intl accepts
// every one.

export type TonightRegion =
  | 'Northeast'
  | 'Southeast'
  | 'Midwest'
  | 'South'
  | 'Mountain West'
  | 'West Coast'
  | 'International';

export interface TonightCity {
  slug: string;
  name: string;
  region: TonightRegion;
  /** State / province / country subdivision shown after the name. */
  area: string;
  country: string;
  lat: number;
  lon: number;
  /** IANA time zone, e.g. "America/New_York". */
  tz: string;
  /**
   * Nearest launch site whose night launches are visible from here, as the
   * `shortName` used by the no-account LaunchWatch form. Only set where the
   * city viewing guides already make that claim.
   */
  launchSite?: string;
  /** Slug of the matching /guide/watch-a-launch/[city] page, if one exists. */
  viewingGuide?: string;
}

export const TONIGHT_CITIES: readonly TonightCity[] = [
  // ── Northeast ──
  { slug: 'new-york', name: 'New York', region: 'Northeast', area: 'New York', country: 'USA', lat: 40.7128, lon: -74.006, tz: 'America/New_York' },
  { slug: 'philadelphia', name: 'Philadelphia', region: 'Northeast', area: 'Pennsylvania', country: 'USA', lat: 39.9526, lon: -75.1652, tz: 'America/New_York', launchSite: 'Wallops' },
  { slug: 'boston', name: 'Boston', region: 'Northeast', area: 'Massachusetts', country: 'USA', lat: 42.3601, lon: -71.0589, tz: 'America/New_York' },
  { slug: 'washington-dc', name: 'Washington, DC', region: 'Northeast', area: 'DC', country: 'USA', lat: 38.9072, lon: -77.0369, tz: 'America/New_York', launchSite: 'Wallops', viewingGuide: 'washington-dc' },
  { slug: 'baltimore', name: 'Baltimore', region: 'Northeast', area: 'Maryland', country: 'USA', lat: 39.2904, lon: -76.6122, tz: 'America/New_York', launchSite: 'Wallops' },
  { slug: 'pittsburgh', name: 'Pittsburgh', region: 'Northeast', area: 'Pennsylvania', country: 'USA', lat: 40.4406, lon: -79.9959, tz: 'America/New_York' },
  { slug: 'virginia-beach', name: 'Virginia Beach', region: 'Northeast', area: 'Virginia', country: 'USA', lat: 36.8529, lon: -75.978, tz: 'America/New_York', launchSite: 'Wallops', viewingGuide: 'virginia-beach' },
  { slug: 'ocean-city-md', name: 'Ocean City', region: 'Northeast', area: 'Maryland', country: 'USA', lat: 38.3365, lon: -75.0849, tz: 'America/New_York', launchSite: 'Wallops', viewingGuide: 'ocean-city-md' },
  { slug: 'chincoteague', name: 'Chincoteague', region: 'Northeast', area: 'Virginia', country: 'USA', lat: 37.9332, lon: -75.3788, tz: 'America/New_York', launchSite: 'Wallops', viewingGuide: 'chincoteague' },

  // ── Southeast ──
  { slug: 'orlando', name: 'Orlando', region: 'Southeast', area: 'Florida', country: 'USA', lat: 28.5384, lon: -81.3789, tz: 'America/New_York', launchSite: 'Cape Canaveral', viewingGuide: 'orlando' },
  { slug: 'miami', name: 'Miami', region: 'Southeast', area: 'Florida', country: 'USA', lat: 25.7617, lon: -80.1918, tz: 'America/New_York', launchSite: 'Cape Canaveral', viewingGuide: 'miami' },
  { slug: 'tampa', name: 'Tampa', region: 'Southeast', area: 'Florida', country: 'USA', lat: 27.9506, lon: -82.4572, tz: 'America/New_York', launchSite: 'Cape Canaveral', viewingGuide: 'tampa' },
  { slug: 'jacksonville', name: 'Jacksonville', region: 'Southeast', area: 'Florida', country: 'USA', lat: 30.3322, lon: -81.6557, tz: 'America/New_York', launchSite: 'Cape Canaveral', viewingGuide: 'jacksonville' },
  { slug: 'cocoa-beach', name: 'Cocoa Beach', region: 'Southeast', area: 'Florida', country: 'USA', lat: 28.32, lon: -80.6076, tz: 'America/New_York', launchSite: 'Cape Canaveral', viewingGuide: 'cocoa-beach' },
  { slug: 'atlanta', name: 'Atlanta', region: 'Southeast', area: 'Georgia', country: 'USA', lat: 33.749, lon: -84.388, tz: 'America/New_York' },
  { slug: 'charlotte', name: 'Charlotte', region: 'Southeast', area: 'North Carolina', country: 'USA', lat: 35.2271, lon: -80.8431, tz: 'America/New_York' },
  { slug: 'nashville', name: 'Nashville', region: 'Southeast', area: 'Tennessee', country: 'USA', lat: 36.1627, lon: -86.7816, tz: 'America/Chicago' },

  // ── Midwest ──
  { slug: 'chicago', name: 'Chicago', region: 'Midwest', area: 'Illinois', country: 'USA', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
  { slug: 'detroit', name: 'Detroit', region: 'Midwest', area: 'Michigan', country: 'USA', lat: 42.3314, lon: -83.0458, tz: 'America/Detroit' },
  { slug: 'minneapolis', name: 'Minneapolis', region: 'Midwest', area: 'Minnesota', country: 'USA', lat: 44.9778, lon: -93.265, tz: 'America/Chicago' },
  { slug: 'st-louis', name: 'St. Louis', region: 'Midwest', area: 'Missouri', country: 'USA', lat: 38.627, lon: -90.1994, tz: 'America/Chicago' },
  { slug: 'kansas-city', name: 'Kansas City', region: 'Midwest', area: 'Missouri', country: 'USA', lat: 39.0997, lon: -94.5786, tz: 'America/Chicago' },
  { slug: 'cincinnati', name: 'Cincinnati', region: 'Midwest', area: 'Ohio', country: 'USA', lat: 39.1031, lon: -84.512, tz: 'America/New_York' },
  { slug: 'columbus', name: 'Columbus', region: 'Midwest', area: 'Ohio', country: 'USA', lat: 39.9612, lon: -82.9988, tz: 'America/New_York' },
  { slug: 'indianapolis', name: 'Indianapolis', region: 'Midwest', area: 'Indiana', country: 'USA', lat: 39.7684, lon: -86.1581, tz: 'America/Indiana/Indianapolis' },

  // ── South ──
  { slug: 'houston', name: 'Houston', region: 'South', area: 'Texas', country: 'USA', lat: 29.7604, lon: -95.3698, tz: 'America/Chicago', viewingGuide: 'houston' },
  { slug: 'dallas', name: 'Dallas', region: 'South', area: 'Texas', country: 'USA', lat: 32.7767, lon: -96.797, tz: 'America/Chicago' },
  { slug: 'san-antonio', name: 'San Antonio', region: 'South', area: 'Texas', country: 'USA', lat: 29.4241, lon: -98.4936, tz: 'America/Chicago', viewingGuide: 'san-antonio' },
  { slug: 'south-padre-island', name: 'South Padre Island', region: 'South', area: 'Texas', country: 'USA', lat: 26.1118, lon: -97.1681, tz: 'America/Chicago', launchSite: 'Starbase', viewingGuide: 'south-padre-island' },

  // ── Mountain West ──
  { slug: 'denver', name: 'Denver', region: 'Mountain West', area: 'Colorado', country: 'USA', lat: 39.7392, lon: -104.9903, tz: 'America/Denver' },
  { slug: 'phoenix', name: 'Phoenix', region: 'Mountain West', area: 'Arizona', country: 'USA', lat: 33.4484, lon: -112.074, tz: 'America/Phoenix' },
  { slug: 'salt-lake-city', name: 'Salt Lake City', region: 'Mountain West', area: 'Utah', country: 'USA', lat: 40.7608, lon: -111.891, tz: 'America/Denver' },
  { slug: 'las-vegas', name: 'Las Vegas', region: 'Mountain West', area: 'Nevada', country: 'USA', lat: 36.1699, lon: -115.1398, tz: 'America/Los_Angeles' },

  // ── West Coast ──
  { slug: 'los-angeles', name: 'Los Angeles', region: 'West Coast', area: 'California', country: 'USA', lat: 34.0522, lon: -118.2437, tz: 'America/Los_Angeles', launchSite: 'Vandenberg', viewingGuide: 'los-angeles' },
  { slug: 'san-diego', name: 'San Diego', region: 'West Coast', area: 'California', country: 'USA', lat: 32.7157, lon: -117.1611, tz: 'America/Los_Angeles', launchSite: 'Vandenberg', viewingGuide: 'san-diego' },
  { slug: 'santa-barbara', name: 'Santa Barbara', region: 'West Coast', area: 'California', country: 'USA', lat: 34.4208, lon: -119.6982, tz: 'America/Los_Angeles', launchSite: 'Vandenberg', viewingGuide: 'santa-barbara' },
  { slug: 'san-francisco', name: 'San Francisco', region: 'West Coast', area: 'California', country: 'USA', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles' },
  { slug: 'sacramento', name: 'Sacramento', region: 'West Coast', area: 'California', country: 'USA', lat: 38.5816, lon: -121.4944, tz: 'America/Los_Angeles' },
  { slug: 'portland', name: 'Portland', region: 'West Coast', area: 'Oregon', country: 'USA', lat: 45.5152, lon: -122.6784, tz: 'America/Los_Angeles' },
  { slug: 'seattle', name: 'Seattle', region: 'West Coast', area: 'Washington', country: 'USA', lat: 47.6062, lon: -122.3321, tz: 'America/Los_Angeles' },

  // ── International ──
  { slug: 'toronto', name: 'Toronto', region: 'International', area: 'Ontario', country: 'Canada', lat: 43.6532, lon: -79.3832, tz: 'America/Toronto' },
  { slug: 'london', name: 'London', region: 'International', area: 'England', country: 'UK', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
  { slug: 'sydney', name: 'Sydney', region: 'International', area: 'New South Wales', country: 'Australia', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
  { slug: 'kourou', name: 'Kourou', region: 'International', area: 'French Guiana', country: 'France', lat: 5.1597, lon: -52.6503, tz: 'America/Cayenne', launchSite: 'Kourou', viewingGuide: 'kourou' },
  { slug: 'cayenne', name: 'Cayenne', region: 'International', area: 'French Guiana', country: 'France', lat: 4.9224, lon: -52.3135, tz: 'America/Cayenne', launchSite: 'Kourou', viewingGuide: 'cayenne' },
  { slug: 'sinnamary', name: 'Sinnamary', region: 'International', area: 'French Guiana', country: 'France', lat: 5.3778, lon: -52.9589, tz: 'America/Cayenne', launchSite: 'Kourou', viewingGuide: 'sinnamary' },
];

export const TONIGHT_REGIONS: readonly TonightRegion[] = [
  'Northeast', 'Southeast', 'Midwest', 'South', 'Mountain West', 'West Coast', 'International',
];

export function getTonightCity(slug: string): TonightCity | null {
  const s = slug.toLowerCase();
  return TONIGHT_CITIES.find((c) => c.slug === s) ?? null;
}

// ─── Client-safe presentation helpers ────────────────────────────────────────
// Shared by the server pages and the "use my location" island, which must
// not pull src/lib/tonight.ts (next/cache, logger) into the browser bundle.

export type BrightnessHint = 'bright' | 'visible' | 'faint';

/**
 * Brightness hint from peak elevation alone (higher = closer = brighter):
 * ≥ 60° bright, 30–60° visible, < 30° faint. Ignores phase angle and object
 * size, so read Hubble and Tiangong a step dimmer than the ISS.
 */
export function brightnessHint(maxElevationDeg: number): BrightnessHint {
  if (maxElevationDeg >= 60) return 'bright';
  if (maxElevationDeg >= 30) return 'visible';
  return 'faint';
}

export const BRIGHTNESS_LABEL: Record<BrightnessHint, string> = {
  bright: 'Bright — hard to miss',
  visible: 'Visible — steady moving star',
  faint: 'Faint — low on the horizon',
};

export function formatLocalTime(iso: string, tz?: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
}

export function formatLocalDate(iso: string, tz?: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDuration(sec: number): string {
  const m = Math.round(sec / 60);
  return m < 1 ? '<1 min' : `${m} min`;
}

/** ≤ 60-char page title; drops the tail when the city name is long. */
export function tonightTitle(cityName: string): string {
  const full = `ISS Passes Tonight Over ${cityName} — Times & Brightness`;
  if (full.length <= 60) return full;
  const mid = `ISS Passes Tonight Over ${cityName} — Times`;
  return mid.length <= 60 ? mid : `ISS Passes Tonight Over ${cityName}`;
}
