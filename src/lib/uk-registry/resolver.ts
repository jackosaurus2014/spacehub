/**
 * Resolving one of our CompanyProfile rows to a UK company number.
 *
 * WHY THIS IS THE HARDEST PART
 * A wrong company number is worse than no company number. It would staple
 * another business's directors, ownership and insolvency history onto our
 * profile and publish it to people paying for accuracy. So this module is
 * built to REFUSE, and the bar it sets is deliberately higher than a name
 * match - because on the UK register a name match is nearly worthless on its
 * own.
 *
 * THE ORBEX CASE, WHICH IS WHY THE BAR IS WHERE IT IS
 * Searching the register for "Orbex" returns ORBEX LTD (17198857) as the top
 * hit: an exact name match, status active, incorporated 2026-05-05. It is not
 * the launch company. It is an unrelated business registered at 20 Wenlock
 * Road - a mass company-formation accommodation address - whose SIC code is
 * 47910, retail sale via mail order. The actual Orbex is on the register as
 * ORBITAL EXPRESS LAUNCH LIMITED (09580714), a name no string comparison will
 * ever connect to "Orbex", because "Orbex" is a trading name that was never
 * registered. Its only previous registered name is MOONSPIKE LIMITED.
 *
 * Two conclusions are baked into the code below:
 *   1. An exact name match must never be sufficient by itself. Every accepted
 *      resolution needs CORROBORATION from something other than the name -
 *      the incorporation date against what we already know, the registered
 *      office against our recorded headquarters, or an industry classification
 *      consistent with a space company.
 *   2. Some companies simply cannot be resolved automatically and must be left
 *      unmatched. Orbex is one. The honest channel for those is a human-
 *      verified entry in manual-registrations.ts carrying its evidence, not a
 *      looser threshold here that would let 17198857 through.
 *
 * Nothing in this module calls a model. Every score component is a comparison
 * between two cited facts.
 */

import type { CompanyProfilePayload, SearchHit } from './parse';

// ---------------------------------------------------------------------------
// Name normalization
// ---------------------------------------------------------------------------

/**
 * Corporate-form suffixes that carry no identity. Deliberately excludes words
 * like "Space", "Aerospace", "Systems", "Labs" - those DO distinguish
 * companies and stripping them would cause false matches.
 */
const LEGAL_SUFFIXES = new Set([
  'ltd', 'limited', 'plc', 'llp', 'lp', 'llc', 'inc', 'incorporated', 'corp',
  'corporation', 'co', 'company', 'cic', 'cio', 'ug', 'gmbh', 'ag', 'ab', 'as',
  'oy', 'bv', 'nv', 'sa', 'sas', 'srl', 'spa', 'pty', 'pte', 'kk', 'holdings',
  'holding', 'group', 'the',
]);

/** Industry words that may legitimately follow a company's distinctive name. */
const INDUSTRY_TAIL_WORDS = new Set([
  'space', 'aerospace', 'aeronautics', 'astronautics', 'technologies',
  'technology', 'tech', 'systems', 'system', 'labs', 'laboratories', 'lab',
  'industries', 'industrial', 'orbital', 'orbit', 'satellite', 'satellites',
  'rocket', 'rockets', 'launch', 'dynamics', 'sciences', 'science',
  'engineering', 'robotics', 'propulsion', 'defence', 'defense', 'ventures',
  'international', 'global', 'communications', 'networks', 'operations',
  'solutions', 'services', 'innovations', 'instruments',
]);

/**
 * Generic words that may legitimately PRECEDE a company's distinctive name on
 * the register. "Satellite Vu" is registered as "GLOBAL SATELLITE VU LTD";
 * the "global" is decoration, not identity.
 */
const GENERIC_LEAD_WORDS = new Set([
  'global', 'the', 'uk', 'gb', 'british', 'international', 'new', 'european',
]);

/** Lowercase, drop punctuation and legal suffixes, squeeze whitespace. */
export function normalizeCompanyName(raw: string): string {
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

export type NameMatchQuality = 'exact' | 'industry-tail' | 'generic-lead' | 'none';

/**
 * Is a normalized name distinctive enough to be worth matching on at all?
 *
 * A single short token ("astra", "orbex", "satvu") collides with unrelated
 * businesses across the whole register, so one is never accepted on its own.
 */
function isDistinctive(normalized: string): boolean {
  const tokens = normalized.split(' ').filter(Boolean);
  return tokens.length >= 2 || normalized.length >= 7;
}

/**
 * Decide whether a registered name refers to the same company as ours.
 *
 * Three accepted shapes, nothing looser:
 *   exact          - "Space Forge"  vs "SPACE FORGE LIMITED"
 *   industry-tail  - "Astroscale"   vs "ASTROSCALE TECHNOLOGIES LTD"
 *   generic-lead   - "Satellite Vu" vs "GLOBAL SATELLITE VU LTD"
 *
 * Even an `exact` result is only ONE input to {@link scoreCandidate}; it is
 * never enough on its own. See the module header.
 */
export function matchCompanyName(ours: string, theirs: string): NameMatchQuality {
  const a = normalizeCompanyName(ours);
  const b = normalizeCompanyName(theirs);
  if (!a || !b) return 'none';
  if (a === b) return 'exact';
  if (!isDistinctive(a)) return 'none';

  if (b.startsWith(a + ' ')) {
    const tail = b.slice(a.length + 1).split(' ');
    if (tail.every((t) => INDUSTRY_TAIL_WORDS.has(t))) return 'industry-tail';
    return 'none';
  }

  if (b.endsWith(' ' + a)) {
    const lead = b.slice(0, b.length - a.length - 1).split(' ');
    if (lead.every((t) => GENERIC_LEAD_WORDS.has(t))) return 'generic-lead';
    return 'none';
  }

  return 'none';
}

/** Best name match across a candidate's current name and its former names. */
export function bestNameMatch(
  ourNames: string[],
  theirNames: string[],
): { quality: NameMatchQuality; matchedName: string | null } {
  const rank: Record<NameMatchQuality, number> = {
    exact: 3,
    'industry-tail': 2,
    'generic-lead': 2,
    none: 0,
  };
  let best: NameMatchQuality = 'none';
  let matched: string | null = null;
  for (const ours of ourNames) {
    if (!ours) continue;
    for (const theirs of theirNames) {
      if (!theirs) continue;
      const q = matchCompanyName(ours, theirs);
      if (rank[q] > rank[best]) {
        best = q;
        matched = theirs;
      }
    }
  }
  return { quality: best, matchedName: matched };
}

// ---------------------------------------------------------------------------
// Industry classification (UK SIC 2007)
// ---------------------------------------------------------------------------

/**
 * Codes that are space activity by definition. A candidate carrying one of
 * these is almost certainly in the right industry.
 */
export const STRONG_SPACE_SIC = new Set([
  '30300', // Manufacture of air and spacecraft and related machinery
  '51220', // Space transport
  '61300', // Satellite telecommunications activities
]);

/**
 * SIC divisions (the first two digits) a real space company plausibly sits in:
 * manufacturing, energy, wholesale, air and space transport, ICT, and the
 * professional/scientific/R&D block. Presence is mild corroboration.
 *
 * This list is wide on purpose. The ten UK space companies used to calibrate
 * it were spread across 74909, 71129, 71122, 63110, 27900, 51220, 71121,
 * 26110, 72190 and 30300 - there is no narrow "space SIC" to filter on, and a
 * narrow list would reject real companies.
 */
export const PLAUSIBLE_SIC_DIVISIONS = new Set([
  '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32',
  '33', '35', '46', '51', '58', '59', '60', '61', '62', '63', '71', '72', '73',
  '74',
]);

/**
 * Divisions that say nothing either way: holding companies, head offices and
 * business support. Common for a legitimate group entity, so not a red flag,
 * but no evidence of a space business either.
 */
export const NEUTRAL_SIC_DIVISIONS = new Set(['64', '66', '70', '82']);

export type SicVerdict = 'strong' | 'plausible' | 'neutral' | 'unrelated' | 'none';

/**
 * Classify a candidate by its SIC codes.
 *
 * "unrelated" is the verdict that rejected ORBEX LTD: SIC 47910 is retail sale
 * via mail order, and no reading of a launch company lands there.
 */
export function classifySic(sicCodes: string[]): SicVerdict {
  const codes = sicCodes.map((c) => c.trim()).filter(Boolean);
  if (codes.length === 0) return 'none';
  if (codes.some((c) => STRONG_SPACE_SIC.has(c))) return 'strong';
  if (codes.some((c) => PLAUSIBLE_SIC_DIVISIONS.has(c.slice(0, 2)))) return 'plausible';
  if (codes.every((c) => NEUTRAL_SIC_DIVISIONS.has(c.slice(0, 2)))) return 'neutral';
  return 'unrelated';
}

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

/** Words that carry no location information when comparing two addresses. */
const ADDRESS_STOPWORDS = new Set([
  'uk', 'united', 'kingdom', 'england', 'britain', 'great', 'ltd', 'limited',
  'house', 'street', 'road', 'avenue', 'floor', 'unit', 'suite', 'park',
  'business', 'centre', 'center', 'the', 'of', 'and', 'c', 'o', 'co',
]);

function placeTokens(value: string | null | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !ADDRESS_STOPWORDS.has(t)),
  );
}

/**
 * Does the candidate's registered office share a place name with the
 * headquarters we already recorded?
 *
 * Absence proves nothing (Harwell-based companies register at Didcot; a
 * company in administration registers at its administrator's London office),
 * so this only ever ADDS confidence - it never subtracts.
 */
export function officeMatchesHeadquarters(
  ourHeadquarters: string | null,
  theirOfficeLine: string | null,
): boolean {
  const ours = placeTokens(ourHeadquarters);
  if (ours.size === 0) return false;
  const theirs = placeTokens(theirOfficeLine);
  if (theirs.size === 0) return false;
  for (const token of ours) if (theirs.has(token)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/** The facts we already hold about a company, used to corroborate a match. */
export interface KnownCompany {
  name: string;
  legalName?: string | null;
  headquarters?: string | null;
  foundedYear?: number | null;
  /** Our own record of whether the business is still trading. */
  status?: string | null;
}

export interface CandidateScore {
  companyNumber: string;
  registeredName: string;
  score: number;
  nameQuality: NameMatchQuality;
  matchedName: string | null;
  sicVerdict: SicVerdict;
  /** Set when the candidate is refused outright, with the reason. */
  disqualifiedBecause: string | null;
  /** Every component that moved the score, for the audit trail. */
  evidence: string[];
}

/** Below this, a candidate is never accepted however it got there. */
export const ACCEPT_SCORE_THRESHOLD = 6;

/**
 * A winner must beat the runner-up by this much. Two candidates of equal
 * plausibility mean we do not actually know which is right, and the correct
 * answer then is "unmatched", not "the first one".
 */
export const ACCEPT_MARGIN = 2;

/**
 * Score one candidate against what we already know.
 *
 * Positive components (max 12):
 *   name exact .................. +3   name industry-tail/generic-lead .. +2
 *   incorporation year exact .... +3   within 1y +2, within 3y +1
 *   SIC strong .................. +2   SIC plausible ................... +1
 *   registered office matches HQ  +2
 *   status active ............... +1
 *
 * Negative components:
 *   incorporated >5y from our founded year ... -2
 *   dissolved while we record it as active ... -1
 *
 * Disqualifiers (immediate refusal, whatever the score):
 *   - no usable name match at all;
 *   - SIC codes that are all unrelated to any space activity.
 *
 * A company in administration or liquidation is NEVER disqualified. Reaction
 * Engines Limited has been on the register since 1989 and is in
 * administration; that is a fact worth publishing, not a reason to drop it.
 */
export function scoreCandidate(
  known: KnownCompany,
  candidate: CompanyProfilePayload,
): CandidateScore {
  const evidence: string[] = [];
  const ourNames = [known.name, known.legalName ?? ''].filter(Boolean);
  const theirNames = [candidate.companyName, ...candidate.previousNames.map((p) => p.name)];
  const { quality, matchedName } = bestNameMatch(ourNames, theirNames);

  const sicVerdict = classifySic(candidate.sicCodes);

  const base: CandidateScore = {
    companyNumber: candidate.companyNumber,
    registeredName: candidate.companyName,
    score: 0,
    nameQuality: quality,
    matchedName,
    sicVerdict,
    disqualifiedBecause: null,
    evidence,
  };

  if (quality === 'none') {
    return { ...base, disqualifiedBecause: 'no acceptable name match' };
  }

  if (sicVerdict === 'unrelated') {
    return {
      ...base,
      disqualifiedBecause:
        'SIC code(s) ' + candidate.sicCodes.join(', ') + ' are unrelated to any space activity',
    };
  }

  let score = 0;

  if (quality === 'exact') {
    score += 3;
    evidence.push('registered name matches exactly ("' + (matchedName ?? '') + '")');
  } else {
    score += 2;
    evidence.push('registered name matches with ' + quality + ' ("' + (matchedName ?? '') + '")');
  }
  if (matchedName && matchedName !== candidate.companyName) {
    // A former name is STRONGER evidence than a current one, not weaker.
    // Former names are not in the search index, so they collide with far
    // fewer companies, and a company that once carried our exact name is a
    // much more specific coincidence than one that carries it today.
    // Pulsar Fusion is the case: it is on the register as PULSAR AEROSPACE
    // LIMITED, renamed from PULSAR FUSION LTD on 2025-08-20.
    score += 1;
    evidence.push('matched via a FORMER registered name ("' + matchedName + '")');
  }

  // Incorporation date against the founding year we already hold.
  const incorporationYear = candidate.dateOfCreation
    ? Number(candidate.dateOfCreation.slice(0, 4))
    : null;
  if (known.foundedYear && incorporationYear) {
    const gap = Math.abs(incorporationYear - known.foundedYear);
    if (gap === 0) {
      score += 3;
      evidence.push('incorporated ' + candidate.dateOfCreation + ', matching our founded year');
    } else if (gap <= 1) {
      score += 2;
      evidence.push('incorporated ' + candidate.dateOfCreation + ', within 1y of our founded year');
    } else if (gap <= 3) {
      score += 1;
      evidence.push('incorporated ' + candidate.dateOfCreation + ', within 3y of our founded year');
    } else if (gap > 5) {
      score -= 2;
      evidence.push(
        'incorporated ' + candidate.dateOfCreation + ', ' + gap + 'y from our founded year ' +
          known.foundedYear + ' (counts against)',
      );
    }
  }

  if (sicVerdict === 'strong') {
    score += 2;
    evidence.push('SIC ' + candidate.sicCodes.join(', ') + ' is a space activity');
  } else if (sicVerdict === 'plausible') {
    score += 1;
    evidence.push('SIC ' + candidate.sicCodes.join(', ') + ' is consistent with a space company');
  }

  if (officeMatchesHeadquarters(known.headquarters ?? null, candidate.registeredOfficeLine)) {
    score += 2;
    evidence.push(
      'registered office (' + candidate.registeredOfficeLine + ') matches our headquarters (' +
        known.headquarters + ')',
    );
  }

  if (candidate.companyStatus === 'active') {
    score += 1;
    evidence.push('active on the register');
  } else {
    evidence.push('register status is "' + candidate.companyStatus + '"');
    if (candidate.companyStatus === 'dissolved' && (known.status ?? '') === 'active') {
      score -= 1;
      evidence.push('dissolved although we record the company as active (counts against)');
    }
  }

  return { ...base, score, evidence };
}

export interface ResolutionOutcome {
  /** The accepted candidate, or null when nothing cleared the bar. */
  accepted: CandidateScore | null;
  /** Why nothing was accepted. Null when something was. */
  refusedBecause: string | null;
  /** Every candidate considered, best first - the audit trail. */
  considered: CandidateScore[];
}

/**
 * Pick at most one candidate, or refuse.
 *
 * Refusal is a normal, expected outcome and is recorded as one. The three ways
 * to be refused: nothing scored at all, the best score is under the bar, or
 * the best two are too close to tell apart.
 */
export function chooseCandidate(
  known: KnownCompany,
  candidates: CompanyProfilePayload[],
): ResolutionOutcome {
  const scored = candidates
    .map((c) => scoreCandidate(known, c))
    .sort((a, b) => b.score - a.score);

  const viable = scored.filter((s) => !s.disqualifiedBecause);
  if (viable.length === 0) {
    return {
      accepted: null,
      refusedBecause:
        scored.length === 0
          ? 'no candidates returned by the register search'
          : 'every candidate was disqualified (' +
            scored.map((s) => s.companyNumber + ': ' + s.disqualifiedBecause).join('; ') + ')',
      considered: scored,
    };
  }

  const best = viable[0];
  if (best.score < ACCEPT_SCORE_THRESHOLD) {
    return {
      accepted: null,
      refusedBecause:
        'best candidate ' + best.companyNumber + ' (' + best.registeredName + ') scored ' +
        best.score + ', under the threshold of ' + ACCEPT_SCORE_THRESHOLD,
      considered: scored,
    };
  }

  const runnerUp = viable[1];
  if (runnerUp && best.score - runnerUp.score < ACCEPT_MARGIN) {
    return {
      accepted: null,
      refusedBecause:
        'ambiguous: ' + best.companyNumber + ' scored ' + best.score + ' and ' +
        runnerUp.companyNumber + ' scored ' + runnerUp.score +
        ', too close to tell apart (margin < ' + ACCEPT_MARGIN + ')',
      considered: scored,
    };
  }

  return { accepted: best, refusedBecause: null, considered: scored };
}

/**
 * Search hits worth paying a profile request for.
 *
 * The search endpoint returns up to 20 fuzzy hits and each full profile costs
 * a request, so this is the cheap first cut: a hit whose CURRENT name cannot
 * match ours is dropped before it costs anything.
 *
 * It is deliberately blind to former names, because the search result does not
 * carry them - only the full profile does. A company that renamed itself will
 * therefore survive nothing here, which is why the caller falls back to
 * probing the top few hits directly when this returns empty. See
 * FORMER_NAME_PROBE_LIMIT in the fetcher.
 */
export function prefilterSearchHits(
  known: KnownCompany,
  hits: SearchHit[],
  limit: number = 5,
): SearchHit[] {
  const ourNames = [known.name, known.legalName ?? ''].filter(Boolean);
  const kept: SearchHit[] = [];
  for (const hit of hits) {
    const { quality } = bestNameMatch(ourNames, [hit.title]);
    if (quality === 'none') continue;
    kept.push(hit);
    if (kept.length >= limit) break;
  }
  return kept;
}
