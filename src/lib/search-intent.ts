/**
 * Client-side search intent detection for SpaceNexus.
 * Determines user intent from search queries without AI calls.
 */

export type SearchIntentType =
  | 'company_lookup'
  | 'comparison'
  | 'capability_search'
  | 'natural_language'
  | 'ticker_lookup'
  | 'keyword';

export interface SearchIntent {
  type: SearchIntentType;
  shouldOfferAI: boolean;
  matchedCompany?: string;
  matchedTicker?: string;
  detectedSector?: string;
}

// Well-known company names for instant matching
const KNOWN_COMPANIES = new Set([
  'spacex', 'rocket lab', 'rocketlab', 'blue origin', 'ula', 'united launch alliance',
  'firefly', 'firefly aerospace', 'relativity space', 'stoke space',
  'arianespace', 'arianegroup', 'isro', 'jaxa', 'nasa', 'esa',
  'starlink', 'ses', 'telesat', 'iridium', 'viasat', 'eutelsat', 'oneweb',
  'ast spacemobile', 'planet labs', 'planet', 'blacksky', 'spire global', 'spire',
  'iceye', 'capella space', 'capella', 'umbra', 'hawkeye 360', 'maxar',
  'satellogic', 'astranis', 'kuiper', 'amazon kuiper',
  'lockheed martin', 'northrop grumman', 'boeing', 'l3harris', 'l3 harris',
  'rtx', 'raytheon', 'bae systems', 'thales alenia space', 'airbus',
  'axiom space', 'axiom', 'vast', 'sierra space', 'sierra nevada',
  'intuitive machines', 'astrobotic', 'ispace', 'redwire', 'varda',
  'astroscale', 'clearspace', 'orbit fab', 'impulse space', 'true anomaly',
  'ksat', 'mynaric', 'aalyria', 'cesiumastro',
  'aerojet rocketdyne', 'honeywell', 'heico', 'ball aerospace',
  'mda space', 'mda', 'voyager space', 'york space', 'apex',
  'slingshot aerospace', 'slingshot', 'kayhan space', 'epsilon3',
  'anduril', 'palantir', 'shield ai', 'kratos',
]);

// Known tickers
const KNOWN_TICKERS = new Set([
  'RKLB', 'LUNR', 'ASTS', 'PL', 'BKSY', 'SPIR', 'RDW', 'SATL',
  'LMT', 'NOC', 'BA', 'LHX', 'RTX', 'HON', 'HEI', 'GD', 'KTOS',
  'VSAT', 'IRDM', 'SES', 'GILT', 'MRCY', 'PLTR', 'MOG.A', 'CW', 'BWXT',
  'MDA.TO',
]);

// Sector keywords for capability searches
const SECTOR_KEYWORDS: Record<string, string> = {
  'launch': 'launch',
  'launcher': 'launch',
  'rocket': 'launch',
  'satellite': 'satellite',
  'constellation': 'satellite',
  'earth observation': 'earth_observation',
  'eo': 'earth_observation',
  'sar': 'earth_observation',
  'imaging': 'earth_observation',
  'ground station': 'ground_segment',
  'ground segment': 'ground_segment',
  'gsaas': 'ground_segment',
  'defense': 'defense',
  'military': 'defense',
  'space domain': 'defense',
  'ssa': 'defense',
  'propulsion': 'components',
  'avionics': 'components',
  'manufacturing': 'manufacturing',
  'space station': 'infrastructure',
  'habitat': 'infrastructure',
  'debris': 'sustainability',
  'servicing': 'sustainability',
  'refueling': 'sustainability',
  'mining': 'mining',
  'asteroid': 'mining',
  'lunar': 'exploration',
  'mars': 'exploration',
  'cislunar': 'exploration',
  'insurance': 'services',
  'broadband': 'communications',
  'comms': 'communications',
  'iot': 'communications',
};

// Natural language question patterns
const NL_PATTERNS = [
  /^(who|what|which|where|when|how many|how much|how does|how do|how is)\b/i,
  /^(find|list|show|give me|tell me|compare|rank|top)\b/i,
  /\b(vs\.?|versus|compared to|better than)\b/i,
  /\?$/,
];

/**
 * Detect the intent of a search query without AI.
 */
export function detectSearchIntent(query: string): SearchIntent {
  const q = query.trim();
  const qLower = q.toLowerCase();

  // Check for natural language questions
  if (NL_PATTERNS.some(pattern => pattern.test(q))) {
    // Check if it's a comparison query
    if (/\b(vs\.?|versus|compared to|compare)\b/i.test(q)) {
      return { type: 'comparison', shouldOfferAI: true };
    }
    return { type: 'natural_language', shouldOfferAI: true };
  }

  // Check for exact ticker match (uppercase, 1-5 chars)
  if (/^[A-Z]{1,5}(\.[A-Z]+)?$/.test(q) && KNOWN_TICKERS.has(q)) {
    return { type: 'ticker_lookup', shouldOfferAI: false, matchedTicker: q };
  }

  // Check for known company name match
  if (KNOWN_COMPANIES.has(qLower)) {
    return { type: 'company_lookup', shouldOfferAI: false, matchedCompany: qLower };
  }

  // Check for partial company name matches (3+ chars)
  if (qLower.length >= 3) {
    const companiesArray = Array.from(KNOWN_COMPANIES);
    for (let i = 0; i < companiesArray.length; i++) {
      const company = companiesArray[i];
      if (company.includes(qLower) || qLower.includes(company)) {
        return { type: 'company_lookup', shouldOfferAI: false, matchedCompany: company };
      }
    }
  }

  // Check for sector/capability keywords
  for (const [keyword, sector] of Object.entries(SECTOR_KEYWORDS)) {
    if (qLower.includes(keyword)) {
      return { type: 'capability_search', shouldOfferAI: true, detectedSector: sector };
    }
  }

  // Default: standard keyword search
  return { type: 'keyword', shouldOfferAI: q.split(/\s+/).length >= 4 };
}

/**
 * Get suggestion text based on detected intent.
 */
export function getIntentSuggestion(intent: SearchIntent): string | null {
  switch (intent.type) {
    case 'natural_language':
      return 'This looks like a question. Try AI-powered search for better results.';
    case 'comparison':
      return 'Comparing companies? AI search can provide a detailed analysis.';
    case 'capability_search':
      return `Searching for ${intent.detectedSector?.replace(/_/g, ' ')} companies? AI can help find the best matches.`;
    default:
      return null;
  }
}
