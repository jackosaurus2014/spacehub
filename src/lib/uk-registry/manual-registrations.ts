/**
 * Human-verified company-number pins, for companies the resolver correctly
 * refuses to match on its own.
 *
 * This file is the pressure-release valve that lets resolver.ts stay strict.
 * Some real companies cannot be found from their own name: they trade under a
 * name that was never registered, and the register knows them by something
 * else entirely. No amount of string matching fixes that, and loosening the
 * resolver to catch them would let in the shell companies the strictness
 * exists to keep out.
 *
 * RULES FOR ADDING A ROW
 *   - Only a person may add one, never a pipeline and never a model.
 *   - `evidence` must state what was checked, and `sources` must be URLs a
 *     reader can open. A pin without evidence is a guess with better posture.
 *   - Pins are recorded with provenance method "manual", so an auditor can
 *     list every company whose number was asserted rather than derived.
 */

export interface ManualRegistration {
  /** CompanyProfile.slug. */
  slug: string;
  /** The UK company number, exactly as the register spells it. */
  companyNumber: string;
  /** The registered name at the time the pin was made. */
  registeredName: string;
  /** What was checked, in enough detail to re-check it. */
  evidence: string;
  /** Openable URLs supporting the pin. */
  sources: string[];
  /** ISO date the pin was verified by a person. */
  verifiedOn: string;
}

export const MANUAL_REGISTRATIONS: readonly ManualRegistration[] = [
  {
    slug: 'orbex',
    companyNumber: '09580714',
    registeredName: 'ORBITAL EXPRESS LAUNCH LIMITED',
    evidence:
      'Orbex is a trading name that was never registered at Companies House, so no name search can ' +
      'reach the company: searching "Orbex" returns ORBEX LTD (17198857), an unrelated business ' +
      'incorporated 2026-05-05 at 20 Wenlock Road (a company-formation accommodation address) with ' +
      'SIC 47910, retail sale via mail order. The launch company is on the register as ORBITAL ' +
      'EXPRESS LAUNCH LIMITED, number 09580714: incorporated 2015-05-08 (our founded year is 2015), ' +
      'SIC 30300 (manufacture of air and spacecraft), and its only previous registered name is ' +
      'MOONSPIKE LIMITED, changed 2016-01-29 - Moonspike being the 2015 crowdfunded moon-rocket ' +
      'company Orbex was built from. The register records it in administration, with the registered ' +
      'office moved on 2026-03-06 to c/o FRP Advisory Trading Limited, the appointed administrators.',
    sources: [
      'https://find-and-update.company-information.service.gov.uk/company/09580714',
      'https://find-and-update.company-information.service.gov.uk/company/09580714/filing-history',
      'https://www.iafastro.org/membership/all-members/orbital-express-launch-limited-orbex.html',
      'https://en.wikipedia.org/wiki/Orbex',
    ],
    verifiedOn: '2026-09-15',
  },
  {
    slug: 'satvu',
    companyNumber: '10163800',
    registeredName: 'GLOBAL SATELLITE VU LTD',
    evidence:
      'The company trades as "SatVu" and our profile records it under that name, which is five ' +
      'characters and one token - too generic to match on, and the register has no company called ' +
      'SatVu at all (a name search returns only the dissolved and unrelated SATV (UK) LIMITED). ' +
      'The registered entity is GLOBAL SATELLITE VU LTD, number 10163800, incorporated 2016-05-05, ' +
      'SIC 63110, registered at 1 New Fetter Lane, London - consistent with our recorded London ' +
      'headquarters. Crunchbase, Dealroom, Bloomberg, PrivCo and the ADS Group member list all map ' +
      'the SatVu / Satellite Vu thermal-imaging business to this entity, and PrivCo names the same ' +
      'founders our profile does (Anthony Baker, Tobias Reinicke).',
    sources: [
      'https://find-and-update.company-information.service.gov.uk/company/10163800',
      'https://www.crunchbase.com/organization/global-satellite-vu',
      'https://www.adsgroup.org.uk/members/global-satellite-vu-ltd-1/',
    ],
    verifiedOn: '2026-09-15',
  },
];

const BY_SLUG = new Map(MANUAL_REGISTRATIONS.map((m) => [m.slug, m]));

/** The human-verified pin for a slug, if one exists. */
export function manualRegistrationFor(slug: string): ManualRegistration | null {
  return BY_SLUG.get(slug) ?? null;
}
