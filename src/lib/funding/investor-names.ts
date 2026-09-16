/**
 * Turning an investor STRING into investor NAMES.
 *
 * THE BUG THIS FIXES
 * ------------------
 * `FundingRound.leadInvestor` is one free-text column, and our sources write a
 * jointly-led round as one string: "Eclipse / Riot Ventures",
 * "Type One Ventures / Qatar Investment Authority",
 * "137 Ventures / Banner VC". Ranked as written, each of those is a distinct
 * "investor" with exactly one round, every co-lead credit is lost, and the
 * headline of a release called Most Active Space Investors was a firm with two
 * rounds. The table was meaningless.
 *
 * THE SPLIT RULE, AND WHY IT IS THIS NARROW
 * -----------------------------------------
 * We split on a SLASH WITH WHITESPACE ON BOTH SIDES, and on nothing else.
 *
 * That is the one separator our sources actually use for co-leads, and it is
 * the one separator that does not appear inside a real firm name. The
 * alternatives are all unsafe:
 *
 *   "&"     — "Kongsberg Defence & Aerospace", "Mitsui & Co.",
 *             "Brindabella & Company" are single firms. Splitting on an
 *             ampersand would shatter them.
 *   ","     — "ESA European Launcher Challenge (Germany, UK)" is one funder
 *             whose name carries a comma inside a parenthetical.
 *   " and " — same hazard, with no upside: our sources do not use it.
 *
 * So "Brindabella & Company / NRFC" splits into two correct names with the
 * ampersand intact, while "National Reconstruction Fund Corp & Hostplus" is
 * DELIBERATELY NOT SPLIT even though it is really two co-leads. We would rather
 * under-credit a pair than invent a firm called "Hostplus" out of a name we
 * guessed at. A wrong split is far harder for a reader to spot than a missing
 * one.
 *
 * Two extra guards: a split that would produce an empty or one-character
 * segment is abandoned and the string is kept whole (so "S/W Capital" or a
 * stray slash cannot shred a name), and a slash inside parentheses is left
 * alone.
 *
 * NORMALISATION
 * -------------
 * One mechanical rule and one short alias table, both auditable:
 *
 *   MECHANICAL. Collapse whitespace, then drop a trailing parenthetical
 *   qualifier: "a16z (Andreessen Horowitz)" → "a16z", "DCVC (Data Collective)"
 *   → "DCVC", "Jed McCaleb (founder)" → "Jed McCaleb", "Lockheed Martin
 *   (strategic)" → "Lockheed Martin".
 *
 *   ALIASES. A hand-checked table of variants that appear in our own data for
 *   the same firm, each entry justified by both forms being present. It is
 *   short by design; a name not in it is left exactly as recorded.
 *
 * AUDITABILITY. `investorNameAudit()` returns every raw string that this
 * module changed, with what it became. The release publishes that table, so a
 * wrong split is visible to any reader rather than buried in an aggregate.
 *
 * Pure: no Prisma, no next/*, no model, no clock.
 */

/**
 * Strings that are recorded in the lead column but are not investors at all —
 * an editor's note about how the company changed hands. Dropped from rankings
 * and reported in the audit table so the row is not silently lost.
 *
 * Deliberately matches the VERB, not the word "acquisition": "Osprey
 * Technology Acquisition Corp", "Vector Acquisition Corp" and
 * "NextGen Acquisition Corp II" are real SPAC entities and must survive.
 */
const NOT_AN_INVESTOR = /\bacquir(?:e|es|ed|ing)\b/i;

/** A slash with whitespace on both sides — the only separator we split on. */
const CO_LEAD_SEPARATOR = /\s+\/\s+/;

/** A trailing "(...)" qualifier, dropped during normalisation. */
const TRAILING_PARENTHETICAL = /\s*\([^()]*\)\s*$/;

/**
 * Variants of one firm that both occur in our data.
 *
 * Key is the lower-cased name AFTER whitespace collapse and parenthetical
 * removal; value is the form we publish. Every entry here was added because
 * both spellings are present in FundingRound, not on general knowledge about
 * the venture industry.
 */
export const INVESTOR_ALIASES: Readonly<Record<string, string>> = {
  // "a16z (Andreessen Horowitz)", "a16z" and "Andreessen Horowitz" all appear.
  a16z: 'Andreessen Horowitz',
  // "Eclipse Ventures" and the shortened "Eclipse" (the firm's current brand).
  eclipse: 'Eclipse Ventures',
  // "B Capital Group" and "B Capital".
  'b capital': 'B Capital Group',
  // "Lightspeed Venture Partners" and "Lightspeed".
  lightspeed: 'Lightspeed Venture Partners',
  // "Seraphim Capital" is the former name of "Seraphim Space"; both appear.
  'seraphim capital': 'Seraphim Space',
  // "Google Ventures (GV)" normalises to "Google Ventures"; "GV" appears alone.
  gv: 'Google Ventures',
  // Punctuation-only difference.
  'us innovative technology fund': 'U.S. Innovative Technology Fund',
  // "T. Rowe Price accounts" is the same filer as "T. Rowe Price".
  't. rowe price accounts': 'T. Rowe Price',
  // "Mitsubishi Electric Corporation" and "Mitsubishi Electric".
  'mitsubishi electric corporation': 'Mitsubishi Electric',
  // "JPMorganChase Strategic Investment Group" and "JPMorgan Strategic Investment Group".
  'jpmorganchase strategic investment group': 'JPMorgan Strategic Investment Group',
  // "Osprey Technology Acquisition" and "Osprey Technology Acquisition Corp".
  'osprey technology acquisition': 'Osprey Technology Acquisition Corp',
  // "DCVC (Data Collective)" normalises to "DCVC", which also appears alone.
  'data collective': 'DCVC',
};

/** Collapse whitespace and drop a trailing parenthetical qualifier. */
export function normalizeInvestorName(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  const trimmed = collapsed.replace(TRAILING_PARENTHETICAL, '').trim() || collapsed;
  return INVESTOR_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

/** Key two spellings of one firm land on. Never shown to a reader. */
export function investorKey(name: string): string {
  return normalizeInvestorName(name).toLowerCase();
}

/**
 * One recorded string → the investors it names, normalised and de-duplicated.
 * Returns an empty array for a blank string or an editor's acquisition note.
 */
export function splitInvestorString(raw: string | null | undefined): string[] {
  const collapsed = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!collapsed) return [];

  let segments = [collapsed];
  // Only consider splitting outside parentheses, so "(Germany, UK)" and any
  // slash inside a parenthetical are untouched.
  if (CO_LEAD_SEPARATOR.test(collapsed) && !/\([^()]*\/[^()]*\)/.test(collapsed)) {
    const candidate = collapsed.split(CO_LEAD_SEPARATOR).map((s) => s.trim());
    // Abandon the split rather than mint a fragment that is not a firm name.
    if (candidate.length > 1 && candidate.every((s) => s.length >= 2)) segments = candidate;
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const segment of segments) {
    if (NOT_AN_INVESTOR.test(segment)) continue;
    const name = normalizeInvestorName(segment);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export interface InvestorNameAuditRow {
  /** The string exactly as it is stored. */
  recorded: string;
  /** What it was read as, joined for display. */
  resolved: string;
  /** Which rule fired. */
  action: 'split' | 'renamed' | 'split-and-renamed' | 'dropped';
  /** How many rows in this edition carry the recorded string. */
  occurrences: number;
}

/**
 * Every recorded string this module did something to, so a wrong split is
 * auditable from the published page. Strings that passed through unchanged are
 * not listed — there is nothing to check.
 */
export function investorNameAudit(recordedStrings: (string | null | undefined)[]): InvestorNameAuditRow[] {
  const counts = new Map<string, number>();
  for (const raw of recordedStrings) {
    const collapsed = (raw ?? '').replace(/\s+/g, ' ').trim();
    if (!collapsed) continue;
    counts.set(collapsed, (counts.get(collapsed) ?? 0) + 1);
  }

  const rows: InvestorNameAuditRow[] = [];
  for (const [recorded, occurrences] of counts) {
    const names = splitInvestorString(recorded);
    if (names.length === 0) {
      rows.push({ recorded, resolved: '— not an investor —', action: 'dropped', occurrences });
      continue;
    }
    const wasSplit = names.length > 1;
    const wasRenamed = names.length === 1 && names[0] !== recorded;
    const renamedInSplit = wasSplit && names.join(' / ') !== recorded;
    if (!wasSplit && !wasRenamed) continue;
    rows.push({
      recorded,
      resolved: names.join('; '),
      action: wasSplit ? (renamedInSplit ? 'split-and-renamed' : 'split') : 'renamed',
      occurrences,
    });
  }
  return rows.sort((a, b) => b.occurrences - a.occurrences || a.recorded.localeCompare(b.recorded));
}
