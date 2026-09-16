/**
 * Matching a federal award recipient to one of our CompanyProfile rows.
 *
 * WHY THIS IS THE HARD PART
 * -------------------------
 * USAspending names a recipient exactly as the government's entity registry
 * spells it, and that spelling is not our spelling: "ROCKET LAB USA INC",
 * "PLANET LABS FEDERAL, INC.", "ASTRANIS SPACE TECHNOLOGIES CORP". Around
 * those real entities sit near-namesakes that are NOT the company - most
 * often a related charity ("ASTROBOTIC FOUNDATION"), a university lab, or an
 * unrelated services firm that happens to share a first word.
 *
 * PRECISION BEATS RECALL, DELIBERATELY. A wrong award attributed to a company
 * is a number an investor will act on and we cannot defend; a missing award is
 * a coverage limit we can state on the page. So this module has exactly three
 * accept outcomes and no "fuzzy" tier:
 *
 *   uei          - the award record's Recipient UEI equals the UEI we hold for
 *                  the company. An identity, not a guess. Always preferred.
 *   exact        - the two names are identical once corporate form is stripped.
 *   federal-arm  - our name is a TOKEN-BOUNDARY PREFIX of theirs and every
 *                  extra token is a generic corporate, industry or
 *                  federal-contracting word. This is the case that catches
 *                  "Planet Labs" -> "PLANET LABS FEDERAL, INC." and
 *                  "Rocket Lab" -> "ROCKET LAB NATIONAL SECURITY LLC", both of
 *                  which are wholly-owned federal arms whose awards genuinely
 *                  belong to the parent.
 *
 * Everything else is 'none'. Three further guards sit on top:
 *
 *   1. DISTINCTIVENESS. A single short token ("Vast", "Astra", "Momentus")
 *      cannot carry a federal-arm match; there are too many unrelated federal
 *      contractors whose names begin with a common word.
 *   2. DIFFERENT-ENTITY WORDS. A recipient whose name adds "foundation",
 *      "university", "institute", "trust", "college" or similar is a DIFFERENT
 *      legal person with a different mission, and is refused unless our own
 *      name carries the same word.
 *   3. AMBIGUITY. If one recipient name would match two different companies on
 *      our roster, neither gets it. Attribution that depends on which company
 *      the loop reached first is not attribution.
 *
 * The discipline, the suffix list and the prefix rule follow
 * src/lib/fetchers/sec-form-d-fetcher.ts, which solved the same problem
 * against EDGAR's SPV clutter. The tail-word vocabulary is deliberately its
 * own: federal contracting produces "... Federal", "... Government Solutions",
 * "... National Security" arms that EDGAR does not, and EDGAR produces SPV
 * shapes that USAspending does not.
 *
 * PURE. No Prisma, no fetch, no next/*. Everything here is a string function,
 * so the test suite exercises the exact decisions the pipeline makes.
 */

/** Corporate-form tokens that carry no identity at all. */
const LEGAL_SUFFIXES = new Set([
  'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'llc', 'lc',
  'ltd', 'limited', 'plc', 'lp', 'llp', 'pbc', 'gmbh', 'ag', 'ab', 'as', 'oy',
  'bv', 'nv', 'sa', 'sas', 'srl', 'spa', 'pty', 'kk', 'pte', 'holdings',
  'holding', 'group', 'the', 'usa', 'us',
]);

/**
 * Tokens that may legitimately follow a company's distinctive name without
 * making it a different company.
 *
 * Two families, both verified against real USAspending recipient strings:
 *   - industry words ("space", "technologies", "systems") - the same set
 *     sec-form-d-fetcher.ts uses, because the same entities file both;
 *   - federal-contracting words ("federal", "national", "security",
 *     "government", "solutions", "services", "mission") - the vocabulary of a
 *     wholly-owned arm that exists to hold the government contract.
 *
 * Each addition is a decision to attribute a subsidiary's money to its parent,
 * which is right for a federal arm and wrong for a joint venture. Nothing is
 * added here that could name an independent business.
 */
const GENERIC_TAIL_WORDS = new Set([
  // industry
  'space', 'aerospace', 'aeronautics', 'astronautics', 'technologies',
  'technology', 'tech', 'systems', 'system', 'labs', 'laboratories', 'lab',
  'industries', 'industrial', 'orbital', 'orbit', 'satellite', 'satellites',
  'rocket', 'rockets', 'launch', 'dynamics', 'sciences', 'science',
  'engineering', 'robotics', 'propulsion', 'defense', 'defence', 'ventures',
  'international', 'global', 'communications', 'networks', 'operations',
  // federal-contracting arms
  'federal', 'national', 'security', 'government', 'solutions', 'services',
  'mission', 'programs', 'contracting', 'enterprises', 'partners',
]);

/**
 * Tokens that mark the recipient as a DIFFERENT legal person with a different
 * purpose, however similar the name. A company's charitable foundation, a
 * university spun out of it and a family trust are not the company, and their
 * grants are not its revenue.
 */
const DIFFERENT_ENTITY_WORDS = new Set([
  'foundation', 'university', 'universities', 'college', 'institute',
  'institution', 'trust', 'academy', 'school', 'museum', 'society',
  'association', 'consortium', 'charity', 'fund', 'endowment', 'regents',
  'hospital', 'clinic', 'church', 'district', 'county', 'city', 'state',
  'authority', 'commission', 'board', 'union', 'council',
]);

/**
 * Company names that are too generic to search for safely, whatever the
 * distinctiveness rule says. Each is a real or plausible roster entry whose
 * name collides with common English used by unrelated federal contractors.
 * Listed rather than inferred so the exclusion is visible and reviewable; a
 * company here is still matched by UEI, which is an identity and cannot
 * collide, and by an exact full-name match.
 */
const NAME_TOO_GENERIC = new Set([
  'astra', 'vast', 'orbit', 'space', 'launcher', 'relativity', 'momentus',
  'firefly', 'atomos', 'impulse', 'varda', 'orbex', 'skyrora', 'venus',
  'terran', 'axiom', 'voyager', 'benchmark', 'phase four', 'ursa major',
]);

/** The three accepted attributions, plus the refusal. */
export type AwardMatchQuality = 'uei' | 'exact' | 'federal-arm' | 'none';

/** Accepted qualities, strongest first. Used for ranking and for display. */
export const ACCEPTED_MATCH_QUALITIES: readonly AwardMatchQuality[] = [
  'uei',
  'exact',
  'federal-arm',
] as const;

/**
 * Lowercase, drop punctuation, drop corporate form at both ends, squeeze
 * whitespace. "PLANET LABS FEDERAL, INC." -> "planet labs federal".
 */
export function normalizeRecipientName(raw: string): string {
  const tokens = raw
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[0])) tokens.shift();
  return tokens.join(' ');
}

/**
 * True when a name is distinctive enough to risk a prefix match on. Two or
 * more tokens, or one token of at least seven characters - the same bar
 * sec-form-d-fetcher.ts sets - plus the explicit too-generic list.
 */
export function isSearchableCompanyName(name: string): boolean {
  const normalized = normalizeRecipientName(name);
  if (!normalized) return false;
  if (NAME_TOO_GENERIC.has(normalized)) return false;
  const tokens = normalized.split(' ');
  return tokens.length >= 2 || normalized.length >= 7;
}

/**
 * Compare our company name with a government recipient name.
 *
 * Returns 'exact', 'federal-arm' or 'none'. It never returns 'uei' - a UEI
 * match is an identity established outside the name comparison, and the caller
 * applies it before ever reaching here.
 */
export function matchRecipientName(ours: string, theirs: string): AwardMatchQuality {
  const a = normalizeRecipientName(ours);
  const b = normalizeRecipientName(theirs);
  if (!a || !b) return 'none';
  if (a === b) return 'exact';

  // Only a token-boundary prefix is ever considered. "Astro" must not reach
  // "Astroscale", and "Planet" must not reach "Planetary Resources".
  if (!b.startsWith(a + ' ')) return 'none';

  if (!isSearchableCompanyName(ours)) return 'none';

  const tail = b.slice(a.length + 1).split(' ');
  // A different legal person, even when the prefix lines up.
  const oursTokens = new Set(a.split(' '));
  if (tail.some((t) => DIFFERENT_ENTITY_WORDS.has(t) && !oursTokens.has(t))) return 'none';
  if (!tail.every((t) => GENERIC_TAIL_WORDS.has(t))) return 'none';
  return 'federal-arm';
}

export interface CompanyForMatching {
  id: string;
  slug: string;
  name: string;
  legalName?: string | null;
  samUei?: string | null;
}

export interface RecipientForMatching {
  recipientName: string;
  recipientUei?: string | null;
}

export interface AwardMatch {
  companyId: string;
  companySlug: string;
  /** The name on OUR side that produced the match. */
  matchedName: string;
  quality: Exclude<AwardMatchQuality, 'none'>;
}

/** Normalized UEI: uppercase, alphanumerics only. Empty string when absent. */
export function normalizeUei(raw: string | null | undefined): string {
  return (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Resolve one recipient against the WHOLE roster, so ambiguity is detectable.
 *
 * A UEI hit wins outright and cannot be ambiguous - two companies sharing a
 * UEI would be a duplicate profile, not a matching problem. Otherwise the best
 * name quality is taken, and if two DIFFERENT companies tie at that quality
 * the recipient is refused: an attribution that depends on iteration order is
 * not an attribution.
 */
export function resolveRecipient(
  recipient: RecipientForMatching,
  roster: readonly CompanyForMatching[]
): AwardMatch | null {
  const uei = normalizeUei(recipient.recipientUei);
  if (uei) {
    const byUei = roster.filter((c) => normalizeUei(c.samUei) === uei);
    if (byUei.length === 1) {
      return {
        companyId: byUei[0].id,
        companySlug: byUei[0].slug,
        matchedName: byUei[0].name,
        quality: 'uei',
      };
    }
  }

  let best: { quality: 'exact' | 'federal-arm'; matches: AwardMatch[] } | null = null;
  for (const company of roster) {
    const candidates = [company.name, company.legalName ?? ''].filter(Boolean);
    let companyBest: { quality: 'exact' | 'federal-arm'; name: string } | null = null;
    for (const ourName of candidates) {
      const quality = matchRecipientName(ourName, recipient.recipientName);
      if (quality === 'none' || quality === 'uei') continue;
      if (!companyBest || (quality === 'exact' && companyBest.quality === 'federal-arm')) {
        companyBest = { quality, name: ourName };
      }
    }
    if (!companyBest) continue;
    const entry: AwardMatch = {
      companyId: company.id,
      companySlug: company.slug,
      matchedName: companyBest.name,
      quality: companyBest.quality,
    };
    if (!best || (companyBest.quality === 'exact' && best.quality === 'federal-arm')) {
      best = { quality: companyBest.quality, matches: [entry] };
    } else if (companyBest.quality === best.quality) {
      best.matches.push(entry);
    }
  }

  if (!best) return null;
  // Two different companies, same strength: refuse both.
  const distinct = new Set(best.matches.map((m) => m.companyId));
  if (distinct.size !== 1) return null;
  return best.matches[0];
}

/** Exposed for the test suite and for an audit of why a company is skipped. */
export const MATCH_VOCABULARY = {
  LEGAL_SUFFIXES,
  GENERIC_TAIL_WORDS,
  DIFFERENT_ENTITY_WORDS,
  NAME_TOO_GENERIC,
} as const;
