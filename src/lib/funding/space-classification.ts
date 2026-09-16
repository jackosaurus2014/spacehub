/**
 * What belongs in a "space funding" figure.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Our FundingRound table is a record of transactions involving companies in
 * the SpaceNexus company database. Summing its `amount` column and calling the
 * result "space funding" produced a Q2 2026 headline of $84.9B, which is
 * roughly ten times the real market. Two different errors were stacked inside
 * that number:
 *
 *   1. A $75.0B SpaceX IPO and a $10.0B SpaceX tender offer were counted as
 *      funding rounds. An IPO is a public-market offering and a tender offer
 *      moves existing shares between holders. Neither is a venture round and
 *      the second puts no new capital into the company at all.
 *   2. A $5.0B Anduril round was counted as space money. Anduril is a defence
 *      autonomy company; our own record classifies its sector as `defense` and
 *      its subsector as `autonomous-defense`. Its work is overwhelmingly not
 *      space.
 *
 * THE PATTERN THIS COPIES
 * -----------------------
 * src/lib/gov-awards/aggregate.ts solved the identical problem for federal
 * awards: it reports only the subset the GOVERNMENT itself codes as space,
 * publishes the all-federal figure beside it rather than instead of it, and
 * states the coding rule on the page. This file does the equivalent for
 * private capital. Two independent tests, both set membership over fields the
 * rows already carry — never a keyword search over free text, never a
 * judgement about a company typed in here, and never a model.
 *
 * NOTHING IS DELETED. Every round stays in the database and every excluded
 * round is published in the release's own exclusions table with the rule that
 * excluded it. The figure gets smaller; the record does not.
 *
 * Pure on purpose: no Prisma, no next/*, no clock. Rows in, classification out.
 */

/** What kind of transaction the row records. */
export type InstrumentClass =
  | 'venture' // primary private capital into the company — the figure we publish
  | 'public-market' // IPO, direct listing, PIPE, registered direct, follow-on
  | 'secondary' // tender offer or share sale: existing shares, no new capital
  | 'debt' // borrowing, not equity
  | 'grant'; // non-dilutive public money, not investment

/** Whether the money went to space work. */
export type SpaceAttribution = 'space' | 'adjacent';

/**
 * Sectors in our company database that span more than one domain.
 *
 * Every other recorded sector in the database — launch, satellite,
 * ground-segment, earth-observation, infrastructure, analytics, manufacturing,
 * exploration, propulsion and the rest — describes work that only exists
 * because of spaceflight, so a company carrying one is space by its own
 * record. These do not: a `defense` or `aerospace` company may build
 * satellites or it may build missiles and aircraft, and the sector alone
 * cannot tell you which. For these, and only these, we require the company's
 * own recorded SUBSECTOR to name space work.
 *
 * A round whose company has no recorded sector at all is excluded. Missing
 * classification is not evidence of space work, and the direction to be wrong
 * in is downward.
 */
export const CROSS_DOMAIN_SECTORS: readonly string[] = [
  'defense',
  'defence',
  'defense-aerospace',
  'defence-aerospace',
  'aerospace',
  'government',
  'military',
];

/**
 * The subsector test for a cross-domain company. Matched on a word boundary
 * against the SUBSECTOR only, never the tag cloud: Anduril and Hermeus both
 * carry a `defense-space` marketing tag, and a tag match would readmit exactly
 * the two rounds this rule exists to exclude. Their subsectors —
 * `autonomous-defense` and `hypersonic-systems` — correctly say no, while True
 * Anomaly's `space-domain-awareness` correctly says yes.
 */
export const SPACE_SUBSECTOR = /\b(space|orbit|orbital|satellite|launch|lunar|spacecraft)/i;

/**
 * Stages that CONTAIN a public-market word but are private rounds.
 *
 * "Pre-IPO" is a late private round — the company has not listed, and the
 * money goes into it. Checked before the public-market test, which would
 * otherwise match the "IPO" inside it on a word boundary and throw the round
 * away. (TelePIX, $11M, 2026-03-01.)
 */
const PRIVATE_DESPITE_LABEL = /\bpre-\s?ipo\b/i;

/** Stage or type strings that name a public-market transaction. */
const PUBLIC_MARKET =
  /\b(ipo|direct listing|de-?spac|spac|pipe|registered direct|follow-?on|public offering|at-the-market|secondary offering)\b/i;

/** Stage strings that name a transfer of shares that already exist. */
const SECONDARY = /\b(tender offer|secondary|share sale|buy-?back)\b/i;

/** Round types that are borrowing rather than equity. */
const DEBT_TYPES: readonly string[] = ['debt', 'venture_debt', 'credit_facility', 'loan'];

export interface ClassifiableCompany {
  sector: string | null;
  subsector?: string | null;
  isPublic?: boolean | null;
}

export interface ClassifiableRound {
  seriesLabel: string | null;
  roundType: string | null;
  company: ClassifiableCompany | null;
}

/**
 * Which instrument this row records, read from the row's OWN `roundType` and
 * `seriesLabel` fields.
 *
 * The one place the company is consulted is "Private Placement": into a
 * private company that is an ordinary private round, and into a listed company
 * it is a PIPE. `isPublic` settles it without anyone having to judge.
 */
export function classifyInstrument(row: ClassifiableRound): InstrumentClass {
  const type = (row.roundType ?? '').trim().toLowerCase();
  const stage = (row.seriesLabel ?? '').trim();

  if (type === 'ipo' || type === 'spac') return 'public-market';
  if (!PRIVATE_DESPITE_LABEL.test(stage) && PUBLIC_MARKET.test(stage)) return 'public-market';
  if (SECONDARY.test(stage)) return 'secondary';
  if (DEBT_TYPES.includes(type)) return 'debt';
  if (type === 'grant') return 'grant';
  if (/\bprivate placement\b/i.test(stage) && row.company?.isPublic === true) return 'public-market';
  return 'venture';
}

/** True when the recipient company's own record classifies it as space work. */
export function isSpaceAttributed(company: ClassifiableCompany | null | undefined): boolean {
  const sector = (company?.sector ?? '').trim().toLowerCase();
  if (!sector) return false;
  if (CROSS_DOMAIN_SECTORS.includes(sector)) {
    return SPACE_SUBSECTOR.test((company?.subsector ?? '').trim());
  }
  return true;
}

export function spaceAttribution(company: ClassifiableCompany | null | undefined): SpaceAttribution {
  return isSpaceAttributed(company) ? 'space' : 'adjacent';
}

/** Both tests. The only rounds that reach a published space-funding total. */
export function qualifiesAsSpaceVenture(row: ClassifiableRound): boolean {
  return classifyInstrument(row) === 'venture' && isSpaceAttributed(row.company);
}

const INSTRUMENT_REASONS: Record<Exclude<InstrumentClass, 'venture'>, string> = {
  'public-market': 'A public-market offering, not a private funding round.',
  secondary: 'A transfer of shares that already existed — no new capital reached the company.',
  debt: 'Borrowing, not equity investment.',
  grant: 'Non-dilutive public money, not investment.',
};

/** Plain-words reason a row was left out, for the exclusions table. */
export function exclusionReason(row: ClassifiableRound): string | null {
  const instrument = classifyInstrument(row);
  if (instrument !== 'venture') return INSTRUMENT_REASONS[instrument];
  if (!isSpaceAttributed(row.company)) {
    const sector = (row.company?.sector ?? '').trim();
    const subsector = (row.company?.subsector ?? '').trim();
    if (!sector) return 'The company has no recorded sector, so no space claim can be made for it.';
    return `The company's recorded sector is "${sector}"${
      subsector ? ` and its subsector "${subsector}"` : ' with no recorded subsector'
    }, and neither names space work.`;
  }
  return null;
}

/**
 * THE RULE, in the words it is published in. Rendered verbatim in the
 * release's coverage block and in every export of it, so a reader never has to
 * reconstruct what the headline counts.
 */
export const SPACE_VENTURE_RULE: readonly string[] = [
  'WHAT THE CAPITAL FIGURE COUNTS. A round reaches the disclosed-capital total only if it passes two tests, and both are read from fields the row already carries.',
  'FIRST, THE INSTRUMENT. It must be primary private capital going into the company: a priced equity round, a convertible note, a bridge or an extension. Excluded are IPOs, direct listings, SPAC mergers, PIPEs, registered directs and other public-market offerings; tender offers, secondaries and share sales, which move shares that already exist and put no new money into the company; debt, which is borrowing rather than investment; and grants, which are non-dilutive public money. The test is the round’s own recorded type and stage. One case needs the company too: a private placement into a listed company is a PIPE and is excluded, while the same label on a private company is an ordinary private round and counts.',
  'SECOND, THE RECIPIENT. The company’s own recorded sector must describe space work. Sectors such as defense, defence, aerospace, government and military span more than one domain, so for those — and only those — we additionally require the recorded subsector to name space, orbit, satellite, launch, lunar or spacecraft work. A company with no recorded sector is excluded. Marketing tags are deliberately not consulted: several defence companies tag themselves “defense-space” while building no space hardware.',
  'This makes the figure a conservative floor. A genuine space round misfiled under a cross-domain sector will be missing from it, and that is the direction we choose to be wrong in. Every excluded round is published in the exclusions table on this page with the rule that excluded it — nothing is deleted to make the number look better.',
];
