/**
 * Entity Linker - Cross-Module Company Entity Resolution
 *
 * Links company entities across modules (news, patents, jobs, launches,
 * SEC filings, contracts) to their canonical company profile pages.
 *
 * Provides:
 *   - COMPANY_ALIASES: name variation -> canonical slug mapping
 *   - findCompanySlug(): fuzzy name-to-slug matching
 *   - linkifyCompanyNames(): find company names in free text
 *   - getEntityLinks(): module deep-links for a company
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EntityLinks {
  companyProfile: string;
  relatedNews: string;
  relatedPatents: string;
  relatedJobs: string;
  relatedLaunches: string;
  relatedContracts: string;
  relatedSECFilings: string;
}

export interface TextSegment {
  text: string;
  slug?: string;
  start: number;
  end: number;
}

// ─── Company Aliases (50+ major space companies) ─────────────────────────────

export const COMPANY_ALIASES: Record<string, string> = {
  // ── Launch Providers ───────────────────────────────────────────────────
  'SpaceX': 'spacex',
  'Space Exploration Technologies': 'spacex',
  'Space Exploration Technologies Corp': 'spacex',
  'Blue Origin': 'blue-origin',
  'Blue Origin LLC': 'blue-origin',
  'Rocket Lab': 'rocket-lab',
  'Rocket Lab USA': 'rocket-lab',
  'United Launch Alliance': 'united-launch-alliance',
  'ULA': 'united-launch-alliance',
  'Virgin Orbit': 'virgin-orbit',
  'Virgin Galactic': 'virgin-galactic',
  'Virgin Galactic Holdings': 'virgin-galactic',
  'Relativity Space': 'relativity-space',
  'Astra': 'astra-space',
  'Astra Space': 'astra-space',
  'Firefly Aerospace': 'firefly-aerospace',
  'Firefly': 'firefly-aerospace',
  'Arianespace': 'arianespace',
  'ABL Space Systems': 'abl-space-systems',
  'ABL Space': 'abl-space-systems',
  'Stoke Space': 'stoke-space',
  'Stoke Space Technologies': 'stoke-space',
  'Phantom Space': 'phantom-space',
  'Impulse Space': 'impulse-space',
  'Isar Aerospace': 'isar-aerospace',
  'PLD Space': 'pld-space',
  'Gilmour Space': 'gilmour-space',
  'Gilmour Space Technologies': 'gilmour-space',
  'Skyroot Aerospace': 'skyroot-aerospace',
  'Skyroot': 'skyroot-aerospace',
  'Agnikul Cosmos': 'agnikul-cosmos',
  'Agnikul': 'agnikul-cosmos',
  'SpinLaunch': 'spinlaunch',
  'Exolaunch': 'exolaunch',

  // ── Defense & Aerospace Primes ─────────────────────────────────────────
  'Lockheed Martin': 'lockheed-martin',
  'Lockheed Martin Corporation': 'lockheed-martin',
  'Lockheed Martin Corp': 'lockheed-martin',
  'LMT': 'lockheed-martin',
  'Northrop Grumman': 'northrop-grumman',
  'Northrop Grumman Corporation': 'northrop-grumman',
  'NOC': 'northrop-grumman',
  'Boeing': 'boeing',
  'The Boeing Company': 'boeing',
  'Boeing Defense': 'boeing',
  'BA': 'boeing',
  'Raytheon': 'raytheon',
  'Raytheon Technologies': 'raytheon',
  'RTX': 'raytheon',
  'RTX Corporation': 'raytheon',
  'L3Harris': 'l3harris-technologies',
  'L3Harris Technologies': 'l3harris-technologies',
  'L3 Harris': 'l3harris-technologies',
  'LHX': 'l3harris-technologies',
  'Airbus Defence and Space': 'airbus-defence---space',
  'Airbus Defence & Space': 'airbus-defence---space',
  'Airbus Defense and Space': 'airbus-defence---space',
  'Airbus DS': 'airbus-defence---space',
  'Thales Alenia Space': 'thales-alenia-space',
  'Thales': 'thales-alenia-space',
  'General Atomics': 'general-atomics',
  'Ball Aerospace': 'ball-aerospace',
  'Ball Aerospace & Technologies': 'ball-aerospace',
  'Aerojet Rocketdyne': 'aerojet-rocketdyne',
  'Aerojet': 'aerojet-rocketdyne',
  'Parsons': 'parsons',
  'Parsons Corporation': 'parsons',
  'Peraton': 'peraton',
  'Leidos': 'leidos',
  'Leidos Holdings': 'leidos',
  'CACI International': 'caci-international',
  'CACI': 'caci-international',
  'SAIC': 'saic',
  'Science Applications International': 'saic',
  'Booz Allen Hamilton': 'booz-allen-hamilton',
  'Booz Allen': 'booz-allen-hamilton',

  // ── Satellite Operators & EO ───────────────────────────────────────────
  'Planet Labs': 'planet-labs',
  'Planet': 'planet-labs',
  'Planet Labs PBC': 'planet-labs',
  'PL': 'planet-labs',
  'Spire Global': 'spire-global',
  'Spire': 'spire-global',
  'Maxar': 'maxar-technologies',
  'Maxar Technologies': 'maxar-technologies',
  'SES': 'ses',
  'SES S.A.': 'ses',
  'Intelsat': 'intelsat',
  'Viasat': 'viasat',
  'Viasat Inc': 'viasat',
  'Iridium': 'iridium-communications',
  'Iridium Communications': 'iridium-communications',
  'OneWeb': 'oneweb',
  'Eutelsat': 'eutelsat',
  'Eutelsat OneWeb': 'eutelsat',
  'Telesat': 'telesat',
  'Amazon Kuiper': 'amazon-kuiper',
  'Amazon Project Kuiper': 'amazon-kuiper',
  'Project Kuiper': 'amazon-kuiper',
  'Capella Space': 'capella-space',
  'Capella': 'capella-space',
  'ICEYE': 'iceye',
  'BlackSky': 'blacksky',
  'BlackSky Technology': 'blacksky',
  'HawkEye 360': 'hawkeye-360',
  'Hawkeye 360': 'hawkeye-360',
  'AST SpaceMobile': 'ast-spacemobile',
  'AST & Science': 'ast-spacemobile',
  'Lynk Global': 'lynk-global',
  'Lynk': 'lynk-global',
  'Umbra': 'umbra',
  'Umbra Lab': 'umbra',
  'Albedo': 'albedo',
  'Pixxel': 'pixxel',
  'Muon Space': 'muon-space',
  'GalaxEye': 'galaxeye',

  // ── Infrastructure & Stations ──────────────────────────────────────────
  'Sierra Space': 'sierra-space',
  'Sierra Nevada Corporation': 'sierra-space',
  'Axiom Space': 'axiom-space',
  'Axiom': 'axiom-space',
  'Vast': 'vast',
  'Voyager Space': 'voyager-space',
  'Voyager': 'voyager-space',
  'Orbit Fab': 'orbit-fab',
  'ThinkOrbital': 'thinkorbital',
  'Inversion Space': 'inversion-space',
  'Outpost Technologies': 'outpost-technologies',

  // ── On-Orbit Servicing & Debris ────────────────────────────────────────
  'Astroscale': 'astroscale',
  'Astroscale Holdings': 'astroscale',
  'Starfish Space': 'starfish-space',
  'Rogue Space Systems': 'rogue-space-systems',
  'True Anomaly': 'true-anomaly',

  // ── Manufacturing & Components ─────────────────────────────────────────
  'Redwire': 'redwire',
  'Redwire Corporation': 'redwire',
  'Terran Orbital': 'terran-orbital',
  'Terran Orbital Corporation': 'terran-orbital',
  'York Space Systems': 'york-space-systems',
  'York Space': 'york-space-systems',
  'Apex': 'apex',
  'Apex Space': 'apex',
  'CesiumAstro': 'cesiumastro',
  'Phase Four': 'phase-four',
  'NanoAvionics': 'nanoavionics',
  'EnduroSat': 'endurosat',
  'AAC Clyde Space': 'aac-clyde-space',
  'Hadrian': 'hadrian',
  'Ursa Major': 'ursa-major',
  'Ursa Major Technologies': 'ursa-major',
  'X-Bow Systems': 'x-bow-systems',
  'K2 Space': 'k2-space',
  'Varda Space Industries': 'varda-space-industries',
  'Varda Space': 'varda-space-industries',
  'Varda': 'varda-space-industries',

  // ── Exploration ────────────────────────────────────────────────────────
  'Intuitive Machines': 'intuitive-machines',
  'Astrobotic': 'astrobotic',
  'Astrobotic Technology': 'astrobotic',

  // ── Analytics & Software ───────────────────────────────────────────────
  'Epsilon3': 'epsilon3',
  'Cognitive Space': 'cognitive-space',
  'Kayhan Space': 'kayhan-space',
  'Privateer': 'privateer',
  'SpiderOak': 'spideroak',
  'Atomos Space': 'atomos-space',

  // ── Tourism ────────────────────────────────────────────────────────────
  'Space Perspective': 'space-perspective',

  // ── Other Operators & Misc ─────────────────────────────────────────────
  'Momentus': 'momentus',
  'Momentus Inc': 'momentus',
  'Sidus Space': 'sidus-space',
  'Spaceflight Inc': 'spaceflight-inc',
  'Spaceflight': 'spaceflight-inc',
  'D-Orbit': 'd-orbit',
  'Rocket Factory Augsburg': 'rocket-factory-augsburg',
  'RFA': 'rocket-factory-augsburg',
  'Turion Space': 'turion-space',

  // ── Space Agencies ─────────────────────────────────────────────────────
  'NASA': 'nasa',
  'ISRO': 'isro',
  'ESA': 'esa',
  'European Space Agency': 'esa',
  'JAXA': 'jaxa',
  'CNSA': 'cnsa',
  'Roscosmos': 'roscosmos',
  'CNES': 'cnes',
  'DLR': 'dlr',
  'KARI': 'kari',
  'CSA': 'csa',
  'Canadian Space Agency': 'csa',
  'UKSA': 'uksa',
  'ASI': 'asi',
};

// ─── Pre-computed reverse index: slug -> canonical name ──────────────────────

const SLUG_TO_NAME: Record<string, string> = {};
for (const [name, slug] of Object.entries(COMPANY_ALIASES)) {
  // Use the shortest name as the canonical display name per slug
  if (!SLUG_TO_NAME[slug] || name.length < SLUG_TO_NAME[slug].length) {
    SLUG_TO_NAME[slug] = name;
  }
}

export function getCanonicalName(slug: string): string | null {
  return SLUG_TO_NAME[slug] || null;
}

// ─── Normalisation Helpers ───────────────────────────────────────────────────

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pre-build normalised lookup for fast matching
const NORMALISED_ALIASES: [string, string, string][] = Object.entries(COMPANY_ALIASES).map(
  ([name, slug]) => [normalise(name), slug, name]
);

// Sort by normalised-name length descending so longer (more specific) names match first
NORMALISED_ALIASES.sort((a, b) => b[0].length - a[0].length);

// ─── findCompanySlug ─────────────────────────────────────────────────────────

/**
 * Fuzzy-match a company name to its canonical slug.
 * Handles casing, punctuation, whitespace, and common suffixes like
 * "Inc", "Corp", "LLC", "Holdings", etc.
 */
export function findCompanySlug(text: string): string | null {
  if (!text || text.length < 2) return null;

  const input = normalise(text);

  // 1. Exact normalised match
  for (const [normName, slug] of NORMALISED_ALIASES) {
    if (input === normName) return slug;
  }

  // 2. Strip common corporate suffixes and retry
  const stripped = input
    .replace(/\b(inc|corp|corporation|llc|ltd|limited|holdings|plc|sa|se|ag|gmbh|co|company|group|technologies|technology)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [normName, slug] of NORMALISED_ALIASES) {
    const normStripped = normName
      .replace(/\b(inc|corp|corporation|llc|ltd|limited|holdings|plc|sa|se|ag|gmbh|co|company|group|technologies|technology)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (stripped === normStripped) return slug;
  }

  // 3. Starts-with match (input is a prefix of a known name)
  for (const [normName, slug] of NORMALISED_ALIASES) {
    if (normName.startsWith(input) && input.length >= 4) return slug;
  }

  // 4. Contains match (for very short, unique tokens like "ULA", "ICEYE")
  for (const [normName, slug] of NORMALISED_ALIASES) {
    if (input === normName) return slug;
  }

  return null;
}

// ─── linkifyCompanyNames ─────────────────────────────────────────────────────

/**
 * Find company name occurrences in a text string and return segments
 * annotated with slugs.
 *
 * @param text       The source text to scan.
 * @param knownSlugs Optional list of slugs to restrict matching to.
 *                   If empty/undefined, all aliases are considered.
 * @returns Array of TextSegment objects covering the entire input text.
 */
export function linkifyCompanyNames(
  text: string,
  knownSlugs?: string[],
): TextSegment[] {
  if (!text) return [];

  const slugSet = knownSlugs && knownSlugs.length > 0 ? new Set(knownSlugs) : null;

  // Build regex patterns from alias names, sorted longest-first
  const candidates = NORMALISED_ALIASES
    .filter(([, slug]) => !slugSet || slugSet.has(slug))
    .map(([, slug, originalName]) => ({ slug, name: originalName }));

  // Deduplicate by name
  const seen = new Set<string>();
  const unique: { slug: string; name: string }[] = [];
  for (const c of candidates) {
    if (!seen.has(c.name)) {
      seen.add(c.name);
      unique.push(c);
    }
  }

  // Sort by name length descending for greedy matching
  unique.sort((a, b) => b.name.length - a.name.length);

  // Build combined regex
  if (unique.length === 0) return [{ text, start: 0, end: text.length }];

  const escapedNames = unique.map(c => c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi');

  interface Match {
    start: number;
    end: number;
    slug: string;
    matchedText: string;
  }

  const matches: Match[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const matchedName = m[1];
    // Find slug for this match
    const slug = findCompanySlug(matchedName);
    if (slug && (!slugSet || slugSet.has(slug))) {
      matches.push({ start: m.index, end: m.index + matchedName.length, slug, matchedText: matchedName });
    }
  }

  // Remove overlapping matches (keep longer / earlier)
  const filtered: Match[] = [];
  for (const match of matches) {
    const overlaps = filtered.some(
      f => match.start < f.end && match.end > f.start
    );
    if (!overlaps) filtered.push(match);
  }

  filtered.sort((a, b) => a.start - b.start);

  // Build segments covering the full text
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of filtered) {
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start), start: cursor, end: match.start });
    }
    segments.push({ text: match.matchedText, slug: match.slug, start: match.start, end: match.end });
    cursor = match.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), start: cursor, end: text.length });
  }

  return segments;
}

// ─── getEntityLinks ──────────────────────────────────────────────────────────

/**
 * Generate deep-links to all relevant module pages for a company.
 */
export function getEntityLinks(companySlug: string): EntityLinks {
  const encodedSlug = encodeURIComponent(companySlug);
  const displayName = getCanonicalName(companySlug) || companySlug;
  const encodedName = encodeURIComponent(displayName);

  return {
    companyProfile: `/company-profiles/${encodedSlug}`,
    relatedNews: `/news?search=${encodedName}`,
    relatedPatents: `/patents?assignee=${encodedName}`,
    relatedJobs: `/space-talent?tab=jobs&search=${encodedName}`,
    relatedLaunches: `/launches?provider=${encodedName}`,
    relatedContracts: `/government-contracts?contractor=${encodedName}`,
    relatedSECFilings: `/sec-filings?company=${encodedName}`,
  };
}

// ─── getAllSlugs ──────────────────────────────────────────────────────────────

/**
 * Return all unique slugs in the alias map.
 */
export function getAllKnownSlugs(): string[] {
  return Array.from(new Set(Object.values(COMPANY_ALIASES)));
}
