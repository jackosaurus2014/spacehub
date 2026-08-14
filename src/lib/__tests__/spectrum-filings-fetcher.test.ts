/**
 * @jest-environment node
 */
import {
  pickSearchTerm,
  isSpectrumRelevant,
  mapECFSFiling,
  dedupeByFilingId,
  fetchSpectrumFilings,
  fetchAndStoreSpectrumFilings,
  SPECTRUM_SEARCH_TERMS,
  type RawECFSFiling,
} from '../fetchers/spectrum-filings-fetcher';

// ---------------------------------------------------------------------------
// Fixtures — shaped like the real FCC ECFS /ecfs/filings API response
// ---------------------------------------------------------------------------

const FIXTURE_RAW_FILINGS: RawECFSFiling[] = [
  {
    id_submission: '1082312345678',
    short_comment: 'Comments of Example Satellite Co. on NGSO spectrum sharing proceeding',
    proceedings: [{ name: 'NGSO Spectrum Sharing', id: 'RM-11868' }],
    date_disseminated: '2026-08-10T00:00:00Z',
    filers: [{ name: 'Example Satellite Co.' }],
    type_of_filing: 'COMMENT',
    bureau: { name: 'Space Bureau' },
  },
  {
    id_submission: '1082312345679',
    short_comment: 'Petition for reconsideration regarding earth station licensing rules',
    proceedings: [{ name: 'Earth Station Licensing', id: 'IB Docket 21-102' }],
    date_disseminated: '2026-08-09T00:00:00Z',
    filers: [{ name: 'Orbital Comms LLC' }],
    type_of_filing: 'PETITION',
    bureau: { name: 'Space Bureau' },
  },
  {
    // Duplicate id_submission of the first entry — should be deduped
    id_submission: '1082312345678',
    short_comment: 'Duplicate submission',
    proceedings: [{ name: 'NGSO Spectrum Sharing', id: 'RM-11868' }],
    date_disseminated: '2026-08-10T00:00:00Z',
    filers: [{ name: 'Example Satellite Co.' }],
    type_of_filing: 'COMMENT',
    bureau: { name: 'Space Bureau' },
  },
  {
    // Not spectrum-relevant — should be filtered out
    id_submission: '1082312345680',
    short_comment: 'Comments on annual EEO public file report',
    proceedings: [{ name: 'Broadcast EEO Compliance', id: 'MB Docket 98-204' }],
    date_disseminated: '2026-08-08T00:00:00Z',
    filers: [{ name: 'Local Radio Group' }],
    type_of_filing: 'COMMENT',
    bureau: { name: 'Media Bureau' },
  },
  {
    // No id_submission, falls back to confirmation_number
    confirmation_number: 'confirm-9988',
    text_data: 'A lengthy filing regarding satellite constellation deployment milestones that runs on for a while past two hundred characters so it gets truncated by the mapper as expected in the fallback title path.',
    proceedings: [{ name: 'Satellite Constellation Milestones', id: 'IB Docket 22-411' }],
    date_submission: '2026-08-07T00:00:00Z',
    filers: [{ name: 'Constellation Ops Inc.' }],
    type_of_filing: 'NOTICE',
    bureau: { name: 'Space Bureau' },
  },
];

function fixtureResponse(overrideFilings?: RawECFSFiling[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ filings: overrideFilings ?? FIXTURE_RAW_FILINGS }),
  };
}

describe('pickSearchTerm', () => {
  it('deterministically returns one of the configured search terms', () => {
    const term = pickSearchTerm(new Date('2026-08-14T00:00:00Z'));
    expect(SPECTRUM_SEARCH_TERMS).toContain(term);
  });

  it('is deterministic for the same date', () => {
    const date = new Date('2026-03-01T12:00:00Z');
    expect(pickSearchTerm(date)).toBe(pickSearchTerm(date));
  });

  it('rotates across different days', () => {
    const terms = new Set(
      Array.from({ length: SPECTRUM_SEARCH_TERMS.length }, (_, i) =>
        pickSearchTerm(new Date(Date.UTC(2026, 0, 1 + i)))
      )
    );
    // Consecutive days should cover more than a single term across a full cycle
    expect(terms.size).toBeGreaterThan(1);
  });
});

describe('isSpectrumRelevant', () => {
  it('matches on satellite/spectrum keywords in title', () => {
    expect(isSpectrumRelevant({ title: 'NGSO satellite spectrum sharing update', proceedingName: '' })).toBe(true);
  });

  it('matches on keywords in proceeding name when title lacks them', () => {
    expect(isSpectrumRelevant({ title: 'Comment letter', proceedingName: 'Earth Station Licensing' })).toBe(true);
  });

  it('rejects unrelated filings', () => {
    expect(isSpectrumRelevant({ title: 'Annual EEO public file report', proceedingName: 'Broadcast EEO Compliance' })).toBe(false);
  });
});

describe('mapECFSFiling', () => {
  it('maps a well-formed raw filing', () => {
    const record = mapECFSFiling(FIXTURE_RAW_FILINGS[0], 'NGSO');
    expect(record).toMatchObject({
      filingId: '1082312345678',
      title: 'Comments of Example Satellite Co. on NGSO spectrum sharing proceeding',
      docket: 'RM-11868',
      proceedingName: 'NGSO Spectrum Sharing',
      filer: 'Example Satellite Co.',
      filingType: 'COMMENT',
      bureau: 'Space Bureau',
      filedDate: '2026-08-10T00:00:00Z',
    });
    expect(record.url).toBe('https://www.fcc.gov/ecfs/document/1082312345678');
  });

  it('falls back to confirmation_number for filingId and truncates text_data for title', () => {
    const record = mapECFSFiling(FIXTURE_RAW_FILINGS[4], 'satellite constellation');
    expect(record.filingId).toBe('confirm-9988');
    expect(record.title.length).toBeLessThanOrEqual(200);
    expect(record.filedDate).toBe('2026-08-07T00:00:00Z');
  });

  it('produces a search-based fallback URL when no filingId is present', () => {
    const record = mapECFSFiling({}, 'orbital debris');
    expect(record.filingId).toBe('');
    expect(record.url).toContain('orbital%20debris');
    expect(record.title).toBe('FCC ECFS filing: orbital debris');
    expect(record.filer).toBe('Unknown filer');
    expect(record.bureau).toBe('Space Bureau');
  });
});

describe('dedupeByFilingId', () => {
  it('drops duplicate filingIds and records with an empty filingId', () => {
    const records = FIXTURE_RAW_FILINGS.map((f) => mapECFSFiling(f, 'test'));
    records.push(mapECFSFiling({}, 'test')); // empty filingId
    const unique = dedupeByFilingId(records);
    const ids = unique.map((r) => r.filingId);
    expect(ids.filter((id) => id === '1082312345678')).toHaveLength(1);
    expect(ids.every((id) => id !== '')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fetch wiring
// ---------------------------------------------------------------------------

describe('fetchSpectrumFilings', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('issues exactly one HTTP request and returns filtered, deduped, mapped records', async () => {
    const fetchMock = jest.fn().mockResolvedValue(fixtureResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await fetchSpectrumFilings(new Date('2026-08-14T00:00:00Z'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('publicapi.fcc.gov/ecfs/filings');
    expect(calledUrl).toContain('limit=20');

    // 5 raw -> 1 filtered out (not relevant) -> 1 deduped -> 3 unique results
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.filingId)).toEqual(
      expect.arrayContaining(['1082312345678', '1082312345679', 'confirm-9988'])
    );
  });

  it('fails silently (returns []) when the API call rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const results = await fetchSpectrumFilings(new Date('2026-08-14T00:00:00Z'));
    expect(results).toEqual([]);
  });

  it('fails silently (returns []) on a non-OK HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    const results = await fetchSpectrumFilings(new Date('2026-08-14T00:00:00Z'));
    expect(results).toEqual([]);
  });
});

describe('fetchAndStoreSpectrumFilings', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('stores mapped filings via bulkUpsertContent under module=spectrum', async () => {
    jest.resetModules();
    jest.doMock('@/lib/dynamic-content', () => ({
      bulkUpsertContent: jest.fn().mockResolvedValue(3),
    }));

    const { fetchAndStoreSpectrumFilings: storeFn } = await import('../fetchers/spectrum-filings-fetcher');
    const { bulkUpsertContent } = await import('@/lib/dynamic-content');

    global.fetch = jest.fn().mockResolvedValue(fixtureResponse()) as unknown as typeof fetch;

    const count = await storeFn();

    expect(count).toBe(3);
    expect(bulkUpsertContent).toHaveBeenCalledWith(
      'spectrum',
      expect.arrayContaining([
        expect.objectContaining({
          contentKey: 'spectrum:recent-filing:1082312345678',
          section: 'recent-filings',
        }),
      ]),
      expect.objectContaining({ sourceType: 'api' })
    );
  });

  it('returns 0 and never throws when the underlying fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
    await expect(fetchAndStoreSpectrumFilings()).resolves.toBe(0);
  });
});
