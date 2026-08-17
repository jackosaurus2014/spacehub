/**
 * @jest-environment node
 */
import {
  federalRegisterEntryToRadarInput,
  isRelevantFederalRegisterDoc,
  mapFederalRegisterDoc,
  type FederalRegisterApiDocument,
} from '../fetchers/federal-register-fetcher';

// The fetcher pulls in @/lib/regulatory-radar → @/lib/db transitively; mock
// the prisma client so no real database is touched.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { regulatoryAction: { count: jest.fn(), upsert: jest.fn() } },
}));

function makeDoc(overrides: Partial<FederalRegisterApiDocument> = {}): FederalRegisterApiDocument {
  return {
    document_number: '2026-12345',
    title: 'Test document',
    type: 'Rule',
    abstract: null,
    publication_date: '2026-08-14',
    effective_on: null,
    agencies: [
      { raw_name: 'FAA', name: 'Federal Aviation Administration', id: 1, slug: 'federal-aviation-administration' },
    ],
    html_url: 'https://www.federalregister.gov/documents/2026/08/14/2026-12345/test',
    pdf_url: 'https://www.federalregister.gov/documents/2026-12345.pdf',
    citation: '91 FR 12345',
    docket_ids: [],
    regulation_id_numbers: [],
    significant: false,
    action: null,
    comment_url: null,
    comments_close_on: null,
    ...overrides,
  };
}

describe('isRelevantFederalRegisterDoc', () => {
  it('passes space-keyword documents from any agency', () => {
    expect(isRelevantFederalRegisterDoc(makeDoc({ title: 'Launch site licensing update' }))).toBe(true);
    expect(isRelevantFederalRegisterDoc(makeDoc({ title: 'Satellite spectrum coordination' }))).toBe(true);
  });

  it('rejects non-space documents from non-export-control agencies even with export-control terms', () => {
    expect(
      isRelevantFederalRegisterDoc(
        makeDoc({ title: 'Export control reform for maritime radar systems' })
      )
      // "export control" is in SPACE_KEYWORDS already, so this passes via the
      // legacy space filter — assert the true intent with a term outside it:
    ).toBe(true);
    expect(
      isRelevantFederalRegisterDoc(makeDoc({ title: 'Airport perimeter fencing requirements' }))
    ).toBe(false);
  });

  it('rejects routine FAA aviation actions whose titles substring-match "space"', () => {
    // "airspace"/"aerospace" contain "space" — without the title exclusion the
    // FAA's daily Class D/E airspace and airworthiness drumbeat floods the
    // Radar (caught live on day one, 8/17).
    expect(
      isRelevantFederalRegisterDoc(makeDoc({ title: 'Establishment of Class E Airspace; Havana, IL' }))
    ).toBe(false);
    expect(
      isRelevantFederalRegisterDoc(makeDoc({ title: 'Revocation of Class E Airspace; Santa Elena, TX' }))
    ).toBe(false);
    expect(
      isRelevantFederalRegisterDoc(
        makeDoc({ title: 'Airworthiness Directives; Gulfstream Aerospace LP Airplanes' })
      )
    ).toBe(false);
    expect(
      isRelevantFederalRegisterDoc(makeDoc({ title: 'Standard Instrument Approach Procedures' }))
    ).toBe(false);
    // Genuinely space-relevant FAA actions still pass:
    expect(
      isRelevantFederalRegisterDoc(
        makeDoc({ title: 'Commercial Space Launch Vehicle Reentry Site Requirements' })
      )
    ).toBe(true);
  });

  it('passes BIS documents on export-control terms with zero space-hardware words', () => {
    const doc = makeDoc({
      title: 'Additions to the Entity List; revisions to license exception availability',
      agencies: [
        { raw_name: 'BIS', name: 'Bureau of Industry and Security', id: 2, slug: 'industry-and-security-bureau' },
      ],
    });
    expect(isRelevantFederalRegisterDoc(doc)).toBe(true);
  });

  it('passes State/DDTC documents on ITAR terms with zero space-hardware words', () => {
    const doc = makeDoc({
      title: 'International Traffic in Arms Regulations: USML Category XI amendments',
      agencies: [{ raw_name: 'DOS', name: 'Department of State', id: 3, slug: 'state-department' }],
    });
    expect(isRelevantFederalRegisterDoc(doc)).toBe(true);
  });

  it('rejects generic State Department notices without export-control or space terms', () => {
    const doc = makeDoc({
      title: 'Schedule of fees for consular services',
      agencies: [{ raw_name: 'DOS', name: 'Department of State', id: 3, slug: 'state-department' }],
    });
    expect(isRelevantFederalRegisterDoc(doc)).toBe(false);
  });
});

describe('comment window extraction', () => {
  it('captures comment_url and comments_close_on', () => {
    const entry = mapFederalRegisterDoc(
      makeDoc({
        type: 'Proposed Rule',
        comment_url: 'https://www.regulations.gov/comment/FAA-2026-0001',
        comments_close_on: '2026-09-15',
      })
    );
    expect(entry.commentUrl).toBe('https://www.regulations.gov/comment/FAA-2026-0001');
    expect(entry.commentsCloseOn).toBe('2026-09-15');
  });

  it('normalizes missing comment fields to null', () => {
    const entry = mapFederalRegisterDoc(makeDoc());
    expect(entry.commentUrl).toBeNull();
    expect(entry.commentsCloseOn).toBeNull();
  });

  it('propagates the comment close date into the radar input as an end-of-day Date', () => {
    const entry = mapFederalRegisterDoc(makeDoc({ comments_close_on: '2026-09-15' }));
    const radar = federalRegisterEntryToRadarInput(entry);
    expect(radar.commentCloseDate).toEqual(new Date('2026-09-15T23:59:59Z'));
  });
});

describe('federalRegisterEntryToRadarInput', () => {
  it('builds a stable dedup key and categorized radar row', () => {
    const entry = mapFederalRegisterDoc(
      makeDoc({
        title: 'Streamlined Launch and Reentry Licensing (Part 450)',
        significant: true,
        action: 'Final rule',
      })
    );
    const radar = federalRegisterEntryToRadarInput(entry);
    expect(radar.dedupKey).toBe('federal-register:2026-12345');
    expect(radar.source).toBe('federal-register');
    expect(radar.category).toBe('launch-licensing');
    expect(radar.agency).toBe('Federal Aviation Administration');
    expect(radar.documentType).toBe('Rule');
    expect(radar.actionText).toBe('Final rule');
    expect(radar.significant).toBe(true);
    expect(radar.actionDate).toEqual(new Date('2026-08-14T12:00:00Z'));
  });

  it('handles undefined significant flags from the API safely', () => {
    const entry = mapFederalRegisterDoc(
      makeDoc({ significant: undefined as unknown as boolean, title: 'Satellite licensing' })
    );
    expect(entry.significant).toBe(false);
  });
});
