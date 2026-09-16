/**
 * SEC Form 4 transaction codes, and the one classification this product makes.
 *
 * WHY THIS FILE IS SEPARATE, AND WHY IT IS PURE
 * --------------------------------------------
 * Every shallow "insider buying" dataset makes the same mistake: it sums the
 * A-coded rows (restricted stock the company granted) into "insiders bought"
 * and the F-coded rows (shares withheld to pay the tax on those grants) into
 * "insiders sold". Both are automatic. Neither is a decision anybody made. A
 * table built that way has an executive "buying" on every vesting date and
 * "selling" on every tax-withholding date, which is not a reading of the
 * filing but a misreading of it.
 *
 * So the codes are enumerated here, from the Form 4 general instructions, each
 * mapped to a class, and the aggregation elsewhere reports every class
 * separately while headlining only the class where the insider chose the
 * trade: an open-market purchase (P) or sale (S).
 *
 * Pure on purpose — no Prisma, no next/*, no fetch. The fetcher, the release
 * and the gated API route all classify through this one table, so the export
 * and the page can never disagree about what an "F" is.
 *
 * NOTHING HERE IS A RECOMMENDATION. A class describes what the filing says
 * happened. No function in this file returns a sentiment, a rating or a
 * direction, and none should ever be added.
 */

/** Our classification of a Form 4 transaction code. Descriptive only. */
export type Form4Class =
  | 'open-market-purchase'
  | 'open-market-sale'
  | 'award-or-grant'
  | 'tax-withholding'
  | 'disposition-to-issuer'
  | 'derivative-exercise'
  | 'derivative-expiration'
  | 'gift'
  | 'other';

export interface Form4Code {
  /** The single-letter code as it appears in <transactionCode>. */
  code: string;
  /** The description as the Form 4 instructions word it. */
  label: string;
  cls: Form4Class;
  /**
   * TRUE only when the insider chose to trade in the market. This is the one
   * flag the headline figures use, and it is true for exactly two codes.
   */
  discretionaryMarketTrade: boolean;
}

/**
 * The complete code table from the Form 4 general instructions. A code outside
 * this list is stored verbatim and classed 'other' — an unknown code is never
 * guessed at.
 */
export const FORM4_CODES: readonly Form4Code[] = [
  { code: 'P', label: 'Open-market or private purchase of securities', cls: 'open-market-purchase', discretionaryMarketTrade: true },
  { code: 'S', label: 'Open-market or private sale of securities', cls: 'open-market-sale', discretionaryMarketTrade: true },
  { code: 'V', label: 'Transaction voluntarily reported earlier than required', cls: 'other', discretionaryMarketTrade: false },
  { code: 'A', label: 'Grant, award or other acquisition under Rule 16b-3(d)', cls: 'award-or-grant', discretionaryMarketTrade: false },
  { code: 'D', label: 'Disposition to the issuer under Rule 16b-3(e)', cls: 'disposition-to-issuer', discretionaryMarketTrade: false },
  { code: 'F', label: 'Payment of exercise price or tax liability by delivering or withholding securities', cls: 'tax-withholding', discretionaryMarketTrade: false },
  { code: 'I', label: 'Discretionary transaction under an employee benefit plan', cls: 'other', discretionaryMarketTrade: false },
  { code: 'M', label: 'Exercise or conversion of a derivative security exempted under Rule 16b-3', cls: 'derivative-exercise', discretionaryMarketTrade: false },
  { code: 'C', label: 'Conversion of a derivative security', cls: 'derivative-exercise', discretionaryMarketTrade: false },
  { code: 'E', label: 'Expiration of a short derivative position', cls: 'derivative-expiration', discretionaryMarketTrade: false },
  { code: 'H', label: 'Expiration or cancellation of a long derivative position with value received', cls: 'derivative-expiration', discretionaryMarketTrade: false },
  { code: 'O', label: 'Exercise of an out-of-the-money derivative security', cls: 'derivative-exercise', discretionaryMarketTrade: false },
  { code: 'X', label: 'Exercise of an in-the-money or at-the-money derivative security', cls: 'derivative-exercise', discretionaryMarketTrade: false },
  { code: 'G', label: 'Bona fide gift', cls: 'gift', discretionaryMarketTrade: false },
  { code: 'L', label: 'Small acquisition under Rule 16a-6', cls: 'other', discretionaryMarketTrade: false },
  { code: 'W', label: 'Acquisition or disposition by will or the laws of descent and distribution', cls: 'other', discretionaryMarketTrade: false },
  { code: 'Z', label: 'Deposit into or withdrawal from a voting trust', cls: 'other', discretionaryMarketTrade: false },
  { code: 'J', label: 'Other acquisition or disposition, footnote required', cls: 'other', discretionaryMarketTrade: false },
  { code: 'K', label: 'Transaction in an equity swap or instrument with similar characteristics', cls: 'other', discretionaryMarketTrade: false },
  { code: 'U', label: 'Disposition pursuant to a tender of shares in a change-of-control transaction', cls: 'other', discretionaryMarketTrade: false },
];

const BY_CODE = new Map(FORM4_CODES.map((c) => [c.code, c]));

/** Look up a code. Returns null for anything not in the instructions. */
export function form4Code(code: string | null | undefined): Form4Code | null {
  if (!code) return null;
  return BY_CODE.get(code.trim().toUpperCase()) ?? null;
}

/** The class for a code; 'other' when the code is unrecognised. */
export function classifyForm4Code(code: string | null | undefined): Form4Class {
  return form4Code(code)?.cls ?? 'other';
}

/**
 * TRUE only for P and S. The single gate between "an insider chose to trade"
 * and "a compensation plan moved shares around", and the only rows the
 * headline purchase/sale figures are computed over.
 */
export function isDiscretionaryMarketTrade(code: string | null | undefined): boolean {
  return form4Code(code)?.discretionaryMarketTrade ?? false;
}

/** How a code reads in a table cell, e.g. "P — Open-market or private purchase". */
export function form4CodeLabel(code: string | null | undefined): string {
  const hit = form4Code(code);
  if (!hit) {
    return code
      ? `${code} — code not in the Form 4 instructions; reported as filed`
      : '—';
  }
  return `${hit.code} — ${hit.label}`;
}

/** Display label for a class. Descriptive; never directional. */
export const FORM4_CLASS_LABEL: Record<Form4Class, string> = {
  'open-market-purchase': 'Open-market purchase',
  'open-market-sale': 'Open-market sale',
  'award-or-grant': 'Grant or award',
  'tax-withholding': 'Shares withheld for tax or exercise price',
  'disposition-to-issuer': 'Disposition to the issuer',
  'derivative-exercise': 'Derivative exercise or conversion',
  'derivative-expiration': 'Derivative expiration or cancellation',
  gift: 'Gift',
  other: 'Other, as coded on the filing',
};

/** Stable order for class tables, so two renders cannot disagree. */
export const FORM4_CLASS_ORDER: readonly Form4Class[] = [
  'open-market-purchase',
  'open-market-sale',
  'award-or-grant',
  'tax-withholding',
  'derivative-exercise',
  'disposition-to-issuer',
  'derivative-expiration',
  'gift',
  'other',
];

/**
 * The roles a reporting owner ticked on the filing. Several can be true at
 * once; this returns them all in a fixed order and invents nothing when none
 * are ticked.
 */
export function ownerRoles(flags: {
  isDirector: boolean;
  isOfficer: boolean;
  isTenPercentOwner: boolean;
  isOther: boolean;
}): string[] {
  const out: string[] = [];
  if (flags.isDirector) out.push('Director');
  if (flags.isOfficer) out.push('Officer');
  if (flags.isTenPercentOwner) out.push('10% owner');
  if (flags.isOther) out.push('Other');
  return out;
}
