// ─── Space Tycoon: survey reports as sellable intelligence (mining Phase C) ──
// docs/SPACE_MINING_DESIGN_2026-09-12.md §5 (Survey Cruiser: "sells the
// survey data as a paid report") and CLAUDE.md "Market intelligence is a
// first-class feature / corporate scouting is legitimate gameplay; deeper
// intelligence is earned via espionage, paid reports or market signals —
// never free and never perfect."
//
// What a report IS: one corporation's completed survey of one rock
// (AsteroidSurvey row) that its owner has chosen to PUBLISH. Listing costs
// nothing and reveals nothing: the public listing carries the rock's name,
// field, spectral class and delta-v surcharge — all of which are already in
// the public catalogue (asteroids.ts) — plus the seller's corporation name,
// the asking price and how old the intel is. Grade, reserve and rubble risk
// stay hidden until someone pays. Nothing about a rock is ever revealed for
// free by the existence of a listing.
//
// What buying does: the buyer gets an AsteroidSurvey row of their own, at
// the seller's generation — IDENTICAL intel to having flown the survey
// themselves, which is the point (you bought the survey, not a summary of
// it). The seller keeps theirs and may sell the same report again.
//
// Why a direct listing rather than a market instrument: per-rock intel is
// not fungible, so there is nothing for an order book to match — two reports
// on two rocks are different goods. A listing is one nullable price column on
// the survey row the game already writes; a market instrument would need a
// new tradeable asset class, a book, a settlement path and a price tape.
// The listing is the smaller change by a wide margin.
//
// Pure. No React, no DB. The DB half is server-mining.ts (the listedPrice /
// listedAt / soldCount columns on AsteroidSurvey); the route is
// /api/space-tycoon/assets/mining {op:'list_report'|'unlist_report'|
// 'buy_report'}, and the public listing rides on that route's GET.

import { getAsteroid, oreForRock, type AsteroidIntel, type AsteroidRock } from './asteroids';
import { RESOURCE_MAP } from './resources';

// ─── Pricing ─────────────────────────────────────────────────────────────────

/** Floor on any listing — below this the paperwork costs more than the data. */
export const REPORT_PRICE_MIN = 250_000;

/** Hard ceiling, whatever the rock is worth: a report is intelligence, not
 *  the rock. The claim fee (asteroid-claims.ts, 3% of in-ground value) is
 *  what actually buys the ore. */
export const REPORT_PRICE_MAX = 50_000_000;

/** The asking price the console suggests: 2% of the rock's in-ground BASE
 *  value (grade x reserve x ore base price) — two thirds of what filing the
 *  claim on the same rock costs, so a buyer still pays more to own it than
 *  to know about it. */
export const REPORT_SUGGESTED_SHARE = 0.02;

/** Ceiling as a share of in-ground value, when that is lower than
 *  REPORT_PRICE_MAX. */
export const REPORT_MAX_SHARE = 0.08;

/** The broker's cut on a report sale, BURNED (no matching credit — a money
 *  sink, docs/BALANCE.md). The seller receives price x (1 - this). */
export const REPORT_BROKER_FEE = 0.08;

export function reportInGroundValue(rock: Pick<AsteroidRock, 'class'>, intel: Pick<AsteroidIntel, 'grade' | 'reserve'>): number {
  const price = RESOURCE_MAP.get(oreForRock(rock))?.baseMarketPrice ?? 0;
  return Math.max(0, intel.grade) * Math.max(0, intel.reserve) * price;
}

export interface ReportPriceBounds { min: number; max: number; suggested: number }

export function reportPriceBounds(rock: Pick<AsteroidRock, 'class'>, intel: Pick<AsteroidIntel, 'grade' | 'reserve'>): ReportPriceBounds {
  const inGround = reportInGroundValue(rock, intel);
  const max = Math.max(REPORT_PRICE_MIN * 4, Math.min(REPORT_PRICE_MAX, Math.round(inGround * REPORT_MAX_SHARE)));
  const suggested = Math.max(REPORT_PRICE_MIN, Math.min(max, Math.round(inGround * REPORT_SUGGESTED_SHARE)));
  return { min: REPORT_PRICE_MIN, max, suggested };
}

/** What the seller actually banks on a sale (the rest is burned). */
export function reportSellerProceeds(price: number): number {
  return Math.max(0, Math.round(Math.max(0, price) * (1 - REPORT_BROKER_FEE)));
}

export function reportBrokerCut(price: number): number {
  return Math.max(0, Math.round(price)) - reportSellerProceeds(price);
}

// ─── Views ───────────────────────────────────────────────────────────────────

/** A public listing. Everything here is either already public (the catalogue
 *  row) or the seller's own decision to publish (name, price). The intel
 *  itself is not in this object. */
export interface SurveyReportListing {
  /** Stable id of the seller's survey row. */
  id: string;
  asteroidId: string;
  rockName: string;
  fieldId: string;
  rockClass: string;
  deltaVExtra: number;
  sellerName: string;
  /** true when the signed-in corporation is the seller. */
  mine?: boolean;
  price: number;
  listedAtMs: number;
  /** When the survey was taken — stale intel on a worked rock is worth less. */
  surveyedAtMs: number;
  soldCount: number;
}

/** One of the corporation's own surveys, with its listing state. */
export interface OwnedSurveyReport {
  id: string;
  asteroidId: string;
  rockName: string;
  fieldId: string;
  price: number | null;
  listedAtMs: number | null;
  soldCount: number;
  surveyedAtMs: number;
  /** Revenue banked from this report so far (soldCount x proceeds). */
  earned: number;
}

export function listingFromRow(row: {
  id: string; asteroidId: string; fieldId: string; listedPrice: number | null;
  listedAt: Date | number | null; surveyedAt: Date | number; soldCount: number;
  sellerName?: string | null; mine?: boolean;
}): SurveyReportListing {
  const ms = (d: Date | number | null | undefined) => (d == null ? 0 : typeof d === 'number' ? d : d.getTime());
  const rock = getAsteroid(row.asteroidId);
  return {
    id: row.id,
    asteroidId: row.asteroidId,
    rockName: rock?.name || row.asteroidId,
    fieldId: row.fieldId,
    rockClass: rock?.class || '?',
    deltaVExtra: rock?.deltaVExtra ?? 0,
    sellerName: row.sellerName || 'A corporation',
    ...(row.mine ? { mine: true } : {}),
    price: Math.max(0, Math.round(row.listedPrice ?? 0)),
    listedAtMs: ms(row.listedAt),
    surveyedAtMs: ms(row.surveyedAt),
    soldCount: Math.max(0, row.soldCount ?? 0),
  };
}

// ─── Refusals ────────────────────────────────────────────────────────────────

export type ReportError =
  | 'unknown_rock'
  | 'not_surveyed'
  | 'stale_survey'
  | 'rock_exhausted'
  | 'price_out_of_band'
  | 'not_listed'
  | 'own_report'
  | 'already_surveyed'
  | 'insufficient_funds';

export const REPORT_ERROR_TEXT: Readonly<Record<ReportError, string>> = {
  unknown_rock: 'That rock is not in the catalogue.',
  not_surveyed: 'You can only sell a survey you have actually flown.',
  stale_survey: 'That slot has been re-charted since your survey — survey it again before selling it.',
  rock_exhausted: 'That rock is exhausted; nobody will buy the survey.',
  price_out_of_band: 'Asking price is outside the allowed band for this rock.',
  not_listed: 'That report is not for sale.',
  own_report: 'That is your own report.',
  already_surveyed: 'You already hold an effective survey of that rock.',
  insufficient_funds: 'Not enough cash for that report.',
};

export interface ListReportCheckInput {
  rock: AsteroidRock | null | undefined;
  intel: Pick<AsteroidIntel, 'grade' | 'reserve'> | null | undefined;
  /** The seller's survey is of the rock's CURRENT generation. */
  surveyEffective: boolean;
  exhausted: boolean;
  price: number;
}

export type ListReportCheck = { ok: true; price: number; bounds: ReportPriceBounds } | { ok: false; error: ReportError; bounds?: ReportPriceBounds };

export function checkListReport(input: ListReportCheckInput): ListReportCheck {
  if (!input.rock) return { ok: false, error: 'unknown_rock' };
  if (!input.intel || !input.surveyEffective) return { ok: false, error: input.intel ? 'stale_survey' : 'not_surveyed' };
  if (input.exhausted || input.intel.reserve <= 0) return { ok: false, error: 'rock_exhausted' };
  const bounds = reportPriceBounds(input.rock, input.intel);
  const price = Math.round(input.price);
  if (!Number.isFinite(price) || price < bounds.min || price > bounds.max) return { ok: false, error: 'price_out_of_band', bounds };
  return { ok: true, price, bounds };
}

export interface BuyReportCheckInput {
  rock: AsteroidRock | null | undefined;
  listed: boolean;
  price: number;
  sellerIsMe: boolean;
  buyerAlreadySurveyed: boolean;
  money: number;
}

export type BuyReportCheck = { ok: true; price: number; sellerProceeds: number; brokerCut: number } | { ok: false; error: ReportError };

export function checkBuyReport(input: BuyReportCheckInput): BuyReportCheck {
  if (!input.rock) return { ok: false, error: 'unknown_rock' };
  if (input.sellerIsMe) return { ok: false, error: 'own_report' };
  if (!input.listed || !(input.price > 0)) return { ok: false, error: 'not_listed' };
  if (input.buyerAlreadySurveyed) return { ok: false, error: 'already_surveyed' };
  const price = Math.round(input.price);
  if (!Number.isFinite(input.money) || input.money < price) return { ok: false, error: 'insufficient_funds' };
  return { ok: true, price, sellerProceeds: reportSellerProceeds(price), brokerCut: reportBrokerCut(price) };
}
