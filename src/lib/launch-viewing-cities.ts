// ─── "Watch a launch from [city]" pages ─────────────────────────────────────
// Roadmap Tier 2 #10b: ~12 honest city pages where distance, bearing and
// what you can actually see genuinely differ. Geometry is computed from
// coordinates (haversine + initial bearing); visibility tiers come from
// distance to the pad, which is what determines whether you see the whole
// ascent, a rising streak on the horizon, or nothing but a stream. Everything
// else on the page is the live manifest for that site.

import { getSite } from '@/lib/launch-site-registry';

export interface ViewingCity {
  slug: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  /** launch-site-registry slug */
  site: string;
  /** curated local vantage points */
  spots: Array<{ name: string; note: string }>;
  intro: string;
}

/**
 * Pad coordinates used for geometry (representative pad per site). Keyed by
 * launch-site-registry slug. The four US entries drive the city viewing pages;
 * the rest exist so launch-weather.ts can place a launch on the map (and say
 * honestly that no forecast source covers it). Sources: published pad
 * coordinates (Wikipedia launch-complex articles / Gunter's Space Page).
 */
export const SITE_PADS: Record<string, { name: string; lat: number; lon: number }> = {
  'cape-canaveral': { name: 'SLC-40, Cape Canaveral SFS', lat: 28.5619, lon: -80.5773 },
  vandenberg: { name: 'SLC-4E, Vandenberg SFB', lat: 34.632, lon: -120.6108 },
  starbase: { name: 'Starbase OLP-A, Boca Chica', lat: 25.9971, lon: -97.1554 },
  wallops: { name: 'Pad 0A / LC-2, Wallops Island', lat: 37.8337, lon: -75.4881 },
  kourou: { name: 'ELA-4, Guiana Space Centre', lat: 5.239, lon: -52.768 },
  mahia: { name: 'LC-1, Mahia Peninsula', lat: -39.2615, lon: 177.8646 },
  baikonur: { name: 'Site 31/6, Baikonur Cosmodrome', lat: 45.9964, lon: 63.5642 },
  plesetsk: { name: 'Site 43/4, Plesetsk Cosmodrome', lat: 62.9272, lon: 40.457 },
  tanegashima: { name: 'Yoshinobu LC (LA-Y1), Tanegashima', lat: 30.401, lon: 130.975 },
  sriharikota: { name: 'Second Launch Pad, Satish Dhawan SC', lat: 13.7199, lon: 80.2304 },
  jiuquan: { name: 'LC-43/91, Jiuquan SLC', lat: 40.958, lon: 100.2913 },
  wenchang: { name: 'LC-101, Wenchang SLS', lat: 19.6145, lon: 110.951 },
  taiyuan: { name: 'LC-9, Taiyuan SLC', lat: 38.849, lon: 111.608 },
  xichang: { name: 'LC-2, Xichang SLC', lat: 28.2455, lon: 102.0272 },
  andoya: { name: 'Andøya Spaceport, Nordmela', lat: 69.2944, lon: 16.0208 },
  // haiyang (Oriental Spaceport) is deliberately absent: ship-based launches
  // have no fixed pad coordinate.
};

export const VIEWING_CITIES: readonly ViewingCity[] = [
  { slug: 'orlando', name: 'Orlando', state: 'Florida', lat: 28.5384, lon: -81.3789, site: 'cape-canaveral', intro: 'Orlando is an hour from the Cape and close enough that night launches light up the eastern sky; day launches are a bright streak over the treeline.', spots: [{ name: 'Drive east to Titusville (50 min)', note: 'Space View Park and the Max Brewer Bridge — the classic free view across the Indian River.' }, { name: 'Lake Eola / downtown rooftops', note: 'Night launches only; look east-northeast, low on the horizon.' }, { name: 'Playalinda Beach (Canaveral National Seashore)', note: 'Closest public beach to LC-39 pads when open; check closures.' }] },
  { slug: 'miami', name: 'Miami', state: 'Florida', lat: 25.7617, lon: -80.1918, site: 'cape-canaveral', intro: 'Miami is far enough that you will not see liftoff, but night launches produce a rising point of light low in the north that arcs east — visible from the beach for two to three minutes.', spots: [{ name: 'Any Atlantic beach, facing north', note: 'South Beach to Sunny Isles; the darker the better.' }, { name: 'Drive to Cocoa Beach (3 h)', note: 'Worth it for crewed or Falcon Heavy launches.' }] },
  { slug: 'tampa', name: 'Tampa', state: 'Florida', lat: 27.9506, lon: -82.4572, site: 'cape-canaveral', intro: 'From Tampa Bay a night launch is a glowing ember climbing in the east; day launches are usually a faint contrail. Two hours puts you on the Space Coast.', spots: [{ name: 'Courtney Campbell Causeway trail', note: 'Open sky to the east across the bay.' }, { name: 'Drive to Titusville (2 h)', note: 'Space View Park for the real thing.' }] },
  { slug: 'jacksonville', name: 'Jacksonville', state: 'Florida', lat: 30.3322, lon: -81.6557, site: 'cape-canaveral', intro: 'Jacksonville sees night launches as a bright streak rising in the south-southeast and, for Starlink flights, the second-stage plume spreading over the Atlantic.', spots: [{ name: 'Jacksonville Beach pier', note: 'Face south along the coast.' }, { name: 'Drive to New Smyrna Beach (1 h 45)', note: 'Closer and darker; good pad view to the south.' }] },
  { slug: 'cocoa-beach', name: 'Cocoa Beach & Titusville', state: 'Florida', lat: 28.3200, lon: -80.6076, site: 'cape-canaveral', intro: 'This is the Space Coast itself: you will see the pad, hear the rumble a few seconds after ignition, and feel a Falcon Heavy or SLS in your chest.', spots: [{ name: 'Space View Park, Titusville', note: 'Directly across the river from LC-39; free, crowded for big launches.' }, { name: 'Cocoa Beach Pier / Jetty Park', note: 'Closest public beaches to SLC-40 and SLC-41; Jetty Park has a parking fee.' }, { name: 'KSC Visitor Complex viewing tickets', note: 'Paid, closest sanctioned viewing for select launches.' }] },
  { slug: 'los-angeles', name: 'Los Angeles', state: 'California', lat: 34.0522, lon: -118.2437, site: 'vandenberg', intro: 'Vandenberg twilight launches are why Los Angeles occasionally stops traffic: the exhaust plume lit by a sun below the horizon spreads across the whole western sky. Day launches are rarely visible from the basin.', spots: [{ name: 'Any west-facing beach (Santa Monica, Malibu)', note: 'Look northwest, low on the horizon, for the first two minutes.' }, { name: 'Griffith Observatory lawn', note: 'Dark-ish and elevated; twilight and night launches only.' }, { name: 'Drive to Lompoc (2 h 45)', note: 'Ocean Avenue / Surf Beach for a real pad view.' }] },
  { slug: 'santa-barbara', name: 'Santa Barbara', state: 'California', lat: 34.4208, lon: -119.6982, site: 'vandenberg', intro: 'An hour from the base, Santa Barbara gets the full ascent for most Vandenberg launches, with the rocket climbing west-northwest over the Channel.', spots: [{ name: 'Shoreline Park / Douglas Family Preserve', note: 'Clear western horizon over the ocean.' }, { name: 'Drive to Lompoc (1 h)', note: 'Ocean Avenue or Harris Grade Road for the classic view.' }] },
  { slug: 'san-diego', name: 'San Diego', state: 'California', lat: 32.7157, lon: -117.1611, site: 'vandenberg', intro: 'San Diego is far from Vandenberg but the twilight "jellyfish" plumes are visible from here as a glowing arc in the northwest; night launches show as a faint rising star.', spots: [{ name: 'Sunset Cliffs / Point Loma', note: 'Unobstructed northwest horizon.' }, { name: 'Torrey Pines Gliderport', note: 'Elevated, dark, faces the right way.' }] },
  { slug: 'houston', name: 'Houston', state: 'Texas', lat: 29.7604, lon: -95.3698, site: 'starbase', intro: 'Houston is Mission Control, not the launch site: Starbase is 350 miles south. Starship flights are not visible from Houston, but the drive to South Padre Island is six hours and every flight so far has been worth it.', spots: [{ name: 'Drive to South Padre Island (6 h)', note: 'Isla Blanca Park is the designated public viewing area.' }, { name: 'Watch the stream at Space Center Houston', note: 'Not the sky, but the right company.' }] },
  { slug: 'san-antonio', name: 'San Antonio & Austin', state: 'Texas', lat: 29.4241, lon: -98.4936, site: 'starbase', intro: 'Starbase is a four-to-five-hour drive south. Nothing is visible from central Texas, but a Starship flight is a reason to go: plan for slips and book South Padre early.', spots: [{ name: 'Drive to South Padre Island (4-5 h)', note: 'Isla Blanca Park; arrive before dawn for morning windows.' }, { name: 'Port Isabel waterfront', note: 'Quieter alternative across the causeway.' }] },
  { slug: 'south-padre-island', name: 'South Padre Island', state: 'Texas', lat: 26.1118, lon: -97.1681, site: 'starbase', intro: 'Six miles across the bay from the pad, South Padre is where Starship is watched: you see the whole stack, the 33-engine ignition, and the booster coming back to the tower.', spots: [{ name: 'Isla Blanca Park', note: 'Designated public viewing; bleachers and vendors on big flights.' }, { name: 'Hotel balconies on the bay side', note: 'Book early for announced windows; slips are common.' }, { name: 'Rocket Ranch (Boca Chica approach)', note: 'Private RV/viewing venue popular with campers.' }] },
  { slug: 'washington-dc', name: 'Washington, DC', state: 'DC', lat: 38.9072, lon: -77.0369, site: 'wallops', intro: 'Wallops is 150 miles from DC, which means night launches from Virginia are visible across the mid-Atlantic as a rising light in the southeast — Antares and Electron flights have been seen from the Mall.', spots: [{ name: 'Gravelly Point / the Mall, facing southeast', note: 'Night launches only; low on the horizon.' }, { name: 'Drive to Chincoteague (3 h)', note: 'Robert Reed Park or the Wallops Visitor Center for the pad view.' }] },
  // Wallops (2026-09-01): the three Delmarva / Hampton Roads vantages that pair with /guide/watch-a-launch-wallops.
  { slug: 'chincoteague', name: 'Chincoteague', state: 'Virginia', lat: 37.9332, lon: -75.3788, site: 'wallops', intro: 'Chincoteague is the town next door to Wallops Island: the waterfront park, the Route 175 causeway and the Assateague beach all look across the marsh at the pads, and a night Antares or Electron launch is the whole show from ignition.', spots: [{ name: 'Robert Reed Park, Main Street waterfront', note: 'The town\'s designated launch-viewing park; free, and it fills for Antares days.' }, { name: 'Wallops Visitor Center viewing area (Route 175)', note: 'NASA\'s own public viewing lawn when it opens for a launch — check the notice first.' }, { name: 'Assateague beach (Chincoteague National Wildlife Refuge)', note: 'Open ocean horizon; refuge entry fee and gate hours apply.' }] },
  { slug: 'ocean-city-md', name: 'Ocean City', state: 'Maryland', lat: 38.3365, lon: -75.0849, site: 'wallops', intro: 'Ocean City is about an hour up the coast from Wallops. The beach and boardwalk have a clear southern horizon, so a launch rises into view within seconds of liftoff and the ascent tracks out over the Atlantic — night launches are the ones to plan around.', spots: [{ name: 'Any beach, facing south-southwest', note: 'The inlet end of the boardwalk is the darkest stretch.' }, { name: 'Assateague Island (Maryland side)', note: 'Darker sky and a few miles closer.' }, { name: 'Drive to Chincoteague (about 1 h)', note: 'Robert Reed Park or the Visitor Center for the pad view.' }] },
  { slug: 'virginia-beach', name: 'Virginia Beach', state: 'Virginia', lat: 36.8529, lon: -75.978, site: 'wallops', intro: 'Virginia Beach and the rest of Hampton Roads are far enough that liftoff itself is below the horizon, but the rocket climbs into view to the north-northeast within seconds — Antares and Electron night launches are routinely seen from the Oceanfront.', spots: [{ name: 'Oceanfront boardwalk, facing north-northeast', note: 'Look up the beach, low on the horizon.' }, { name: 'Cape Henry / First Landing State Park', note: 'Darker, with an open northern horizon across the bay mouth.' }, { name: 'Drive to Chincoteague (about 2 h via the Bay Bridge-Tunnel)', note: 'For the pad view; plan around the toll and the return traffic.' }] },
  // Kourou (2026-09-01): pairs with /guide/watch-a-launch-kourou.
  { slug: 'kourou', name: 'Kourou', state: 'French Guiana', lat: 5.1597, lon: -52.6503, site: 'kourou', intro: 'Kourou is the spaceport town. The Carapa observation site on the edge of town looks straight at the launch complex, and Ariane 6 and Vega-C launches are watched from the beach and the Pointe des Roches seafront by everyone else.', spots: [{ name: 'Carapa observation site', note: 'The public viewing hill CNES opens for launches; access is arranged per launch, so check before you go.' }, { name: 'Kourou seafront / Pointe des Roches', note: 'Free; look northwest along the coast toward the complex.' }, { name: 'Toucan site (Agami / Colibri)', note: 'Invited guests only — do not plan around it.' }] },
  { slug: 'cayenne', name: 'Cayenne', state: 'French Guiana', lat: 4.9224, lon: -52.3135, site: 'kourou', intro: 'Cayenne is about an hour\'s drive down the coast from the spaceport. Liftoff is below the horizon, but the rocket rises into view to the northwest within seconds, and a night Ariane 6 launch is visible across the city.', spots: [{ name: 'Fort Cépérou hill, old town', note: 'Elevated, with a view up the coast to the northwest.' }, { name: 'Drive to Kourou (about 1 h on the RN1)', note: 'Carapa or the seafront for the real thing.' }] },
  { slug: 'sinnamary', name: 'Sinnamary', state: 'French Guiana', lat: 5.3778, lon: -52.9589, site: 'kourou', intro: 'Sinnamary is the town just up the coast from the launch complex, on the far side of the Sinnamary river — the closest community north of the pads and a quiet alternative to Kourou.', spots: [{ name: 'Sinnamary riverfront', note: 'Look south-southeast toward the complex.' }, { name: 'Drive to Kourou (under 1 h)', note: 'For the Carapa site or the seafront.' }] },
];

export function getViewingCity(slug: string): ViewingCity | null {
  return VIEWING_CITIES.find((c) => c.slug === slug) ?? null;
}

const R = 6371;
function toRad(d: number) { return (d * Math.PI) / 180; }

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat); const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function compass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/** What a viewer can honestly expect at this distance. */
export function visibilityTier(km: number): { tier: 'pad' | 'ascent' | 'horizon' | 'stream'; headline: string; detail: string } {
  if (km < 25) return { tier: 'pad', headline: 'Full view of the pad and ascent', detail: 'You see ignition, hear it seconds later, and follow the rocket until stage separation. Bring ear protection for the heavy vehicles.' };
  if (km < 120) return { tier: 'ascent', headline: 'The whole ascent, low on the horizon', detail: 'Liftoff itself is behind the curve of the Earth, but the rocket rises into view within seconds and you follow it for two to three minutes. Night and twilight launches are spectacular.' };
  if (km < 400) return { tier: 'horizon', headline: 'A rising light on the horizon — night launches only', detail: 'Daytime launches are usually invisible from this distance. At night, watch for a bright, steady point climbing from the horizon in the direction shown, arcing over one to three minutes; twilight launches can paint the sky.' };
  return { tier: 'stream', headline: 'Not visible from here — but the drive is worth it', detail: 'This distance is beyond the horizon for the ascent. Watch the stream, or make the trip: the viewing guide for the site has the spots.' };
}

export function cityGeometry(city: ViewingCity) {
  const pad = SITE_PADS[city.site];
  const site = getSite(city.site);
  const km = distanceKm(city, pad);
  const brg = bearingDeg(city, pad);
  return { pad, site, km: Math.round(km), miles: Math.round(km * 0.621371), bearing: Math.round(brg), compass: compass(brg), visibility: visibilityTier(km) };
}
