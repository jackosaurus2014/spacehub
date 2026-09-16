/**
 * Typed, personal-data-minimised readings of Companies House API payloads.
 *
 * Every function here is a literal parse of a document. Nothing is inferred,
 * nothing is estimated, and no model is involved anywhere in this module.
 *
 * TWO FIELDS ARE DELIBERATELY DROPPED
 * The officers and PSC endpoints return `date_of_birth` (month and year) and a
 * service `address` for every named individual. Both are personal data, both
 * sit outside the Open Government Licence (see attribution.ts), and neither is
 * needed to answer the question a Research buyer is paying for - who runs and
 * who controls this company. So they are parsed past and never returned. If a
 * future feature needs them, that is a privacy decision to take deliberately,
 * not something to inherit by accident from a parser that grabbed everything.
 */

import {
  companiesHouseCompanyUrl,
  companiesHouseFilingHistoryUrl,
  companiesHouseOfficersUrl,
  companiesHousePscUrl,
} from './attribution';

// ---------------------------------------------------------------------------
// Company profile
// ---------------------------------------------------------------------------

export interface RegisteredOffice {
  premises: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  locality: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface PreviousName {
  name: string;
  effectiveFrom: string | null;
  ceasedOn: string | null;
}

export interface CompanyProfilePayload {
  companyNumber: string;
  companyName: string;
  companyStatus: string;
  /** e.g. "active-proposal-to-strike-off", "transferred-from-uk". Often null. */
  companyStatusDetail: string | null;
  companyType: string | null;
  jurisdiction: string | null;
  dateOfCreation: string | null;
  dateOfCessation: string | null;
  sicCodes: string[];
  registeredOffice: RegisteredOffice | null;
  /** Flattened one-line office address, for display and for match evidence. */
  registeredOfficeLine: string | null;
  previousNames: PreviousName[];
  hasInsolvencyHistory: boolean;
  hasCharges: boolean;
  canFile: boolean;
  /** Accounts the register is still waiting for, and whether they are late. */
  accountsNextDue: string | null;
  accountsOverdue: boolean;
  accountsLastMadeUpTo: string | null;
  confirmationStatementNextDue: string | null;
  confirmationStatementOverdue: boolean;
  /** The public register page - what every row cites. */
  sourceUrl: string;
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function bool(v: unknown): boolean {
  return v === true;
}

function parseOffice(raw: unknown): RegisteredOffice | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const office: RegisteredOffice = {
    premises: str(o.premises),
    addressLine1: str(o.address_line_1),
    addressLine2: str(o.address_line_2),
    locality: str(o.locality),
    region: str(o.region),
    postalCode: str(o.postal_code),
    country: str(o.country),
  };
  const any = Object.values(office).some((v) => v !== null);
  return any ? office : null;
}

/** One-line form of a registered office, for display and match evidence. */
export function officeLine(office: RegisteredOffice | null): string | null {
  if (!office) return null;
  const parts = [
    office.premises,
    office.addressLine1,
    office.addressLine2,
    office.locality,
    office.region,
    office.postalCode,
    office.country,
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(', ') : null;
}

/** Parse GET /company/{number}. */
export function parseCompanyProfile(raw: unknown): CompanyProfilePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const number = str(c.company_number);
  const name = str(c.company_name);
  const status = str(c.company_status);
  if (!number || !name || !status) return null;

  const accounts = (c.accounts ?? {}) as Record<string, unknown>;
  const nextAccounts = (accounts.next_accounts ?? {}) as Record<string, unknown>;
  const lastAccounts = (accounts.last_accounts ?? {}) as Record<string, unknown>;
  const confirmation = (c.confirmation_statement ?? {}) as Record<string, unknown>;

  const office = parseOffice(c.registered_office_address);

  const previousNames: PreviousName[] = Array.isArray(c.previous_company_names)
    ? (c.previous_company_names as Record<string, unknown>[])
        .map((p) => ({
          name: str(p.name) ?? '',
          effectiveFrom: str(p.effective_from),
          ceasedOn: str(p.ceased_on),
        }))
        .filter((p) => p.name.length > 0)
    : [];

  return {
    companyNumber: number,
    companyName: name,
    companyStatus: status,
    companyStatusDetail: str(c.company_status_detail),
    companyType: str(c.type),
    jurisdiction: str(c.jurisdiction),
    dateOfCreation: str(c.date_of_creation),
    dateOfCessation: str(c.date_of_cessation),
    sicCodes: Array.isArray(c.sic_codes)
      ? (c.sic_codes as unknown[]).map((s) => str(s)).filter((s): s is string => Boolean(s))
      : [],
    registeredOffice: office,
    registeredOfficeLine: officeLine(office),
    previousNames,
    hasInsolvencyHistory: bool(c.has_insolvency_history),
    hasCharges: bool(c.has_charges),
    canFile: bool(c.can_file),
    accountsNextDue: str(nextAccounts.due_on) ?? str(accounts.next_due),
    accountsOverdue: bool(nextAccounts.overdue) || bool(accounts.overdue),
    accountsLastMadeUpTo: str(lastAccounts.made_up_to),
    confirmationStatementNextDue: str(confirmation.next_due),
    confirmationStatementOverdue: bool(confirmation.overdue),
    sourceUrl: companiesHouseCompanyUrl(number),
  };
}

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

export interface SearchHit {
  companyNumber: string;
  title: string;
  companyStatus: string | null;
  companyType: string | null;
  dateOfCreation: string | null;
  addressSnippet: string | null;
}

/** Parse GET /search/companies. */
export function parseCompanySearch(raw: unknown): SearchHit[] {
  if (!raw || typeof raw !== 'object') return [];
  const items = (raw as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  const out: SearchHit[] = [];
  for (const item of items as Record<string, unknown>[]) {
    const companyNumber = str(item.company_number);
    const title = str(item.title);
    if (!companyNumber || !title) continue;
    out.push({
      companyNumber,
      title,
      companyStatus: str(item.company_status),
      companyType: str(item.company_type),
      dateOfCreation: str(item.date_of_creation),
      addressSnippet: str(item.address_snippet),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Officers
// ---------------------------------------------------------------------------

export interface OfficerRecord {
  /** Stable id from links.self, e.g. the appointment token. Unique per row. */
  appointmentId: string;
  name: string;
  officerRole: string | null;
  appointedOn: string | null;
  resignedOn: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  occupation: string | null;
  isCorporate: boolean;
  sourceUrl: string;
}

/** The trailing token of links.self is the stable appointment identifier. */
export function appointmentIdFromLink(selfLink: string | null): string | null {
  if (!selfLink) return null;
  const parts = selfLink.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  return last && last.length > 0 ? last : null;
}

/**
 * Parse GET /company/{number}/officers.
 *
 * `date_of_birth` and `address` ARE present on every item and are deliberately
 * not read. See the module header.
 */
export function parseOfficers(raw: unknown, companyNumber: string): OfficerRecord[] {
  if (!raw || typeof raw !== 'object') return [];
  const items = (raw as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  const url = companiesHouseOfficersUrl(companyNumber);
  const out: OfficerRecord[] = [];
  for (const item of items as Record<string, unknown>[]) {
    const name = str(item.name);
    if (!name) continue;
    const links = (item.links ?? {}) as Record<string, unknown>;
    const appointmentId = appointmentIdFromLink(str(links.self));
    const role = str(item.officer_role);
    if (!appointmentId) continue;
    out.push({
      appointmentId,
      name,
      officerRole: role,
      appointedOn: str(item.appointed_on),
      resignedOn: str(item.resigned_on),
      nationality: str(item.nationality),
      countryOfResidence: str(item.country_of_residence),
      occupation: str(item.occupation),
      isCorporate: Boolean(role && /corporate/i.test(role)),
      sourceUrl: url,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Persons with significant control
// ---------------------------------------------------------------------------

export interface PscRecord {
  /** Stable id from links.self. Unique per row. */
  pscId: string;
  name: string;
  /** e.g. "individual-person-with-significant-control", "corporate-entity-...". */
  kind: string | null;
  naturesOfControl: string[];
  notifiedOn: string | null;
  ceasedOn: string | null;
  ceased: boolean;
  nationality: string | null;
  countryOfResidence: string | null;
  isCorporate: boolean;
  sourceUrl: string;
}

/**
 * Parse GET /company/{number}/persons-with-significant-control.
 *
 * This is the closest thing the UK publishes to a free beneficial-ownership
 * register, and nothing else aggregates it for this sector. As with officers,
 * `date_of_birth` and `address` are present and are deliberately not read.
 */
export function parsePsc(raw: unknown, companyNumber: string): PscRecord[] {
  if (!raw || typeof raw !== 'object') return [];
  const items = (raw as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  const url = companiesHousePscUrl(companyNumber);
  const out: PscRecord[] = [];
  for (const item of items as Record<string, unknown>[]) {
    const name = str(item.name);
    if (!name) continue;
    const links = (item.links ?? {}) as Record<string, unknown>;
    const pscId = appointmentIdFromLink(str(links.self));
    if (!pscId) continue;
    const kind = str(item.kind);
    out.push({
      pscId,
      name,
      kind,
      naturesOfControl: Array.isArray(item.natures_of_control)
        ? (item.natures_of_control as unknown[])
            .map((n) => str(n))
            .filter((n): n is string => Boolean(n))
        : [],
      notifiedOn: str(item.notified_on),
      ceasedOn: str(item.ceased_on),
      ceased: bool(item.ceased) || Boolean(str(item.ceased_on)),
      nationality: str(item.nationality),
      countryOfResidence: str(item.country_of_residence),
      isCorporate: Boolean(kind && /corporate|legal-person/i.test(kind)),
      sourceUrl: url,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Filing history
// ---------------------------------------------------------------------------

export interface FilingRecord {
  transactionId: string;
  category: string | null;
  subcategory: string | null;
  type: string | null;
  description: string | null;
  date: string | null;
  paperFiled: boolean;
  sourceUrl: string;
}

/**
 * Parse GET /company/{number}/filing-history.
 *
 * `subcategory` arrives as either a string or an array of strings depending on
 * the filing type; both are flattened to a single comma-joined string.
 */
export function parseFilingHistory(raw: unknown, companyNumber: string): FilingRecord[] {
  if (!raw || typeof raw !== 'object') return [];
  const items = (raw as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  const url = companiesHouseFilingHistoryUrl(companyNumber);
  const out: FilingRecord[] = [];
  for (const item of items as Record<string, unknown>[]) {
    const transactionId = str(item.transaction_id);
    if (!transactionId) continue;
    const sub = item.subcategory;
    out.push({
      transactionId,
      category: str(item.category),
      subcategory: Array.isArray(sub)
        ? (sub as unknown[]).map((s) => str(s)).filter(Boolean).join(', ') || null
        : str(sub),
      type: str(item.type),
      description: str(item.description),
      date: str(item.date),
      paperFiled: bool(item.paper_filed),
      sourceUrl: url,
    });
  }
  return out;
}

/**
 * Filing categories that describe a change in corporate STATUS rather than
 * routine housekeeping. These are the filings that date an insolvency or a
 * strike-off, which is the signal press coverage misses for months.
 */
export const STATUS_FILING_CATEGORIES = new Set([
  'insolvency',
  'gazette',
  'dissolution',
  'liquidation',
  'administration',
  'resolution',
]);

/** Is this filing evidence of a corporate-status event worth dating? */
export function isStatusFiling(filing: FilingRecord): boolean {
  const category = (filing.category ?? '').toLowerCase();
  if (STATUS_FILING_CATEGORIES.has(category)) return true;
  const sub = (filing.subcategory ?? '').toLowerCase();
  return STATUS_FILING_CATEGORIES.has(sub);
}
