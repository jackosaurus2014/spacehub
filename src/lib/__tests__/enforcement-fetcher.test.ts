/**
 * @jest-environment node
 */
import type { FederalRegisterApiDocument } from '../fetchers/federal-register-fetcher';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { regulatoryAction: { count: jest.fn(), upsert: jest.fn(), findFirst: jest.fn() } },
}));

import { ENFORCEMENT_QUERIES, filterEnforcementDocs } from '../fetchers/enforcement-fetcher';
import {
  federalRegisterEntryToRadarInput,
  mapFederalRegisterDoc,
  EXPORT_CONTROL_AGENCY_SLUGS,
} from '../fetchers/federal-register-fetcher';

function doc(overrides: Partial<FederalRegisterApiDocument> = {}): FederalRegisterApiDocument {
  return {
    document_number: `2026-${Math.floor(Math.random() * 90000) + 10000}`,
    title: 'Order Relating to Acme Components LLC',
    type: 'Notice',
    abstract: null,
    publication_date: '2026-08-10',
    effective_on: null,
    agencies: [
      { raw_name: 'BUREAU OF INDUSTRY AND SECURITY', name: 'Industry and Security Bureau', id: 100, slug: 'industry-and-security-bureau' },
    ],
    html_url: 'https://www.federalregister.gov/documents/2026/08/10/example',
    pdf_url: 'https://www.govinfo.gov/example.pdf',
    citation: null,
    docket_ids: [],
    regulation_id_numbers: [],
    significant: false,
    action: null,
    comment_url: null,
    comments_close_on: null,
    ...overrides,
  };
}

describe('ENFORCEMENT_QUERIES', () => {
  it('only queries agency slugs already verified against the FR API (one bad slug 400s the whole query)', () => {
    const verified = new Set([
      ...EXPORT_CONTROL_AGENCY_SLUGS,
      'federal-aviation-administration',
      'federal-communications-commission',
    ]);
    for (const query of ENFORCEMENT_QUERIES) {
      for (const slug of query.agencies) {
        expect(verified.has(slug)).toBe(true);
      }
    }
  });
});

describe('filterEnforcementDocs', () => {
  it('keeps BIS denial orders even with null abstracts and zero space words in the title', () => {
    const denialOrder = doc({
      title:
        'Aviastar-TU, 5 b. 7 Leningradsky prospect g. Moskva, 125040, Moscow, Russia; Order Renewing Temporary Denial of Export Privileges',
    });
    expect(filterEnforcementDocs([denialOrder])).toHaveLength(1);
  });

  it('keeps DDTC statutory debarments', () => {
    const debarment = doc({
      title:
        'Bureau of Political-Military Affairs; Statutory Debarment Under the Arms Export Control Act and the International Traffic in Arms Regulations',
      agencies: [{ raw_name: 'STATE DEPARTMENT', name: 'State Department', id: 10, slug: 'state-department' }],
    });
    expect(filterEnforcementDocs([debarment])).toHaveLength(1);
  });

  it('drops term-search matches that are not enforcement actions (body-only mentions)', () => {
    const tariffRule = doc({
      title:
        'Procedures To Apply for Company-Specific Onshoring Agreements To Obtain Tariff Adjustments for Pharmaceuticals',
    });
    expect(filterEnforcementDocs([tariffRule])).toHaveLength(0);
  });

  it('requires a space hook for FCC/FAA enforcement (a broadcast forfeiture is not radar material)', () => {
    const broadcastForfeiture = doc({
      title: 'AM Radio Broadcasting Co.; Forfeiture Order',
      agencies: [{ raw_name: 'FCC', name: 'Federal Communications Commission', id: 27, slug: 'federal-communications-commission' }],
    });
    const satelliteForfeiture = doc({
      title: 'Orbital Uplink Satellite Services LLC; Forfeiture Order',
      abstract: 'Unauthorized operation of an earth station transmitting to a non-geostationary satellite system.',
      agencies: [{ raw_name: 'FCC', name: 'Federal Communications Commission', id: 27, slug: 'federal-communications-commission' }],
    });
    const kept = filterEnforcementDocs([broadcastForfeiture, satelliteForfeiture]);
    expect(kept).toHaveLength(1);
    expect(kept[0].title).toContain('Orbital Uplink');
  });
});

describe('enforcement radar mapping (via shared FR mapping path)', () => {
  it('categorizes as enforcement and surfaces the penalty amount in the summary', () => {
    const settlement = doc({
      title: 'In the Matter of: Acme Components LLC; Order Relating to Acme Components LLC',
      abstract:
        'Acme Components agreed to pay a civil penalty of $1,500,000 to settle allegations of unauthorized exports of satellite components.',
    });
    const input = federalRegisterEntryToRadarInput(mapFederalRegisterDoc(settlement));
    expect(input.category).toBe('enforcement');
    expect(input.summary).toMatch(/^Penalty: \$1,500,000\./);
    expect(input.source).toBe('federal-register');
    expect(input.dedupKey).toBe(`federal-register:${settlement.document_number}`);
  });

  it('never invents a penalty when none is parseable', () => {
    const denial = doc({
      title: 'Order Denying Export Privileges of J. Doe',
      abstract: null,
      action: 'Order denying export privileges.',
    });
    const input = federalRegisterEntryToRadarInput(mapFederalRegisterDoc(denial));
    expect(input.category).toBe('enforcement');
    expect(input.summary).toBeNull();
  });

  it('persists the FR effective date for the compliance calendar', () => {
    const rule = doc({
      title: 'Streamlined Part 450 Launch and Reentry Licensing Updates',
      type: 'Rule',
      effective_on: '2026-10-01',
      action: 'Final rule.',
    });
    const input = federalRegisterEntryToRadarInput(mapFederalRegisterDoc(rule));
    expect(input.effectiveDate).toEqual(new Date('2026-10-01T12:00:00Z'));
    expect(input.category).not.toBe('enforcement');
  });
});
