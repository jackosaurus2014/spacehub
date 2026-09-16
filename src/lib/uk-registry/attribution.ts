/**
 * Licence and attribution for UK Companies House register data.
 *
 * WHY THIS FILE EXISTS AT ALL
 * EDGAR data is a US government work in the public domain: we can republish it
 * with no strings attached. Companies House data is NOT the same thing, and
 * treating it as if it were is how a research product acquires a licence
 * problem. The register is Crown copyright, released for reuse under the Open
 * Government Licence v3.0, and the OGL is a permissive licence WITH A
 * CONDITION: you must acknowledge the source.
 *
 * The OGL's own words on the obligation:
 *   "You must ... acknowledge the source of the Information in your product or
 *    application by including or linking to any attribution statement specified
 *    by the Information Provider(s) and, where possible, provide a link to this
 *    licence".
 * and on the consequence of not doing it:
 *   "These terms are important and if you fail to comply with them the rights
 *    granted to you under this licence, or any similar licence granted by the
 *    Licensor, will end automatically."
 *
 * So attribution is not politeness here - it is the consideration that keeps
 * the licence alive. Anywhere register-derived data is DISPLAYED or EXPORTED,
 * {@link COMPANIES_HOUSE_ATTRIBUTION} must appear with it.
 *
 * WHAT THE OGL DOES NOT COVER
 * The licence explicitly excludes "personal data in the Information". Officer
 * and PSC records ARE personal data, so they are not licensed to us by the OGL
 * at all; they are published under the Companies Act disclosure regime and our
 * reuse of them sits under UK GDPR, not under this licence. That is the reason
 * src/lib/uk-registry/parse.ts deliberately drops the two personal fields the
 * API will happily hand over - date of birth (month/year) and the officer's
 * service address - and keeps only the identity-and-role facts a research
 * reader actually needs. See PERSONAL_DATA_POLICY below.
 */

/** Stable key used in DataSourceRun.source and the freshness check. */
export const UK_REGISTRY_SOURCE_KEY = 'companies-house';

/** Human-readable publisher recorded on every row and provenance record. */
export const UK_REGISTRY_SOURCE_LABEL = 'UK Companies House';

/** The licence this data is released under. */
export const COMPANIES_HOUSE_LICENCE_NAME = 'Open Government Licence v3.0';

export const COMPANIES_HOUSE_LICENCE_URL =
  'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';

/**
 * The exact acknowledgement the OGL specifies where the Information Provider
 * has not published a bespoke one. Render this string (with both links live)
 * next to any displayed or exported register-derived field.
 */
export const COMPANIES_HOUSE_ATTRIBUTION =
  'Contains public sector information licensed under the Open Government Licence v3.0.';

/**
 * The fuller credit for a page footer or an export header: names the source
 * register as well as the licence, which is what "acknowledge the source of
 * the Information" asks for.
 */
export const COMPANIES_HOUSE_ATTRIBUTION_LONG =
  'Company registration data from the UK Companies House register. ' +
  'Contains public sector information licensed under the Open Government Licence v3.0.';

/** Where a reader can check any company number we publish. */
export const COMPANIES_HOUSE_PUBLIC_BASE = 'https://find-and-update.company-information.service.gov.uk';

/** The public register page for one company - what we cite as sourceUrl. */
export function companiesHouseCompanyUrl(companyNumber: string): string {
  return `${COMPANIES_HOUSE_PUBLIC_BASE}/company/${encodeURIComponent(companyNumber)}`;
}

/** The public filing-history page for one company. */
export function companiesHouseFilingHistoryUrl(companyNumber: string): string {
  return `${companiesHouseCompanyUrl(companyNumber)}/filing-history`;
}

/** The public officers page for one company. */
export function companiesHouseOfficersUrl(companyNumber: string): string {
  return `${companiesHouseCompanyUrl(companyNumber)}/officers`;
}

/** The public persons-with-significant-control page for one company. */
export function companiesHousePscUrl(companyNumber: string): string {
  return `${companiesHouseCompanyUrl(companyNumber)}/persons-with-significant-control`;
}

/**
 * The self-imposed limit on personal data, quoted in the admin UI so the
 * decision is visible rather than buried in a parser.
 *
 * The API returns, for every director and every person with significant
 * control: a month-and-year date of birth and a service address. Neither is
 * needed to answer "who controls this company", both are personal data the
 * OGL does not license to us, and storing them would put a UK GDPR
 * controller obligation on a table that exists to hold corporate facts. So
 * neither is ever written. Names, roles, nationality, country of residence
 * and the appointment/cessation dates are kept: they are the register's
 * answer to the ownership question and they are what a Research buyer is
 * paying for.
 */
export const PERSONAL_DATA_POLICY =
  'Officer and PSC records store name, role, nationality, country of residence and ' +
  'appointment dates only. Dates of birth and service addresses are returned by the ' +
  'Companies House API and are deliberately discarded: they are personal data, they are ' +
  'outside the Open Government Licence, and they are not needed to establish control.';
