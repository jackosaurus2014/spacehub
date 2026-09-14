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
    submissiontype: { description: 'COMMENT', short: 'CO' },
    proceedings: [{ name: 'RM-11868', description_display: 'NGSO Spectrum Sharing', bureau_name: 'Space Bureau' }],
    date_disseminated: '2026-08-10T00:00:00Z',
    filers: [{ name: 'Example Satellite Co.' }],
    documents: [{ filename: 'Example Satellite Comments.pdf', src: 'https://www.fcc.gov/ecfs/document/1082312345678/1' }],
  },
  {
    id_submission: '1082312345679',
    submissiontype: { description: 'PETITION' },
    proceedings: [{ name: 'IB Docket 21-102', description: 'Earth Station Licensing', bureau_name: 'Space Bureau' }],
    date_disseminated: '2026-08-09T00:00:00Z',
    filers: [{ name: 'Orbital Comms LLC' }],
  },
  {
    // Duplicate id_submission of the first entry — should be deduped
    id_submission: '1082312345678',
    submissiontype: { description: 'COMMENT' },
    proceedings: [{ name: 'RM-11868', description_display: 'NGSO Spectrum Sharing' }],
    date_disseminated: '2026-08-10T00:00:00Z',
    filers: [{ name: 'Example Satellite Co.' }],
  },
  {
    // Not spectrum-relevant — should be filtered out
    id_submission: '1082312345680',
    submissiontype: { description: 'COMMENT' },
    proceedings: [{ name: 'MB Docket 98-204', description_display: 'Broadcast EEO Compliance', bureau_name: 'Media Bureau' }],
    date_disseminated: '2026-08-08T00:00:00Z',
    filers: [{ name: 'Local Radio Group' }],
  },
  {
    // No id_submission, falls back to confirmation_number; no proceeding, so
    // the title falls back to the attached document's filename.
    confirmation_number: 'confirm-9988',
    submissiontype: { description: 'NOTICE' },
    date_submission: '2026-08-07T00:00:00Z',
    filers: [{ name: 'Constellation Ops Inc.' }],
    documents: [{ filename: 'Satellite constellation deployment milestones.pdf' }],
  },
];

function fixtureResponse(overrideFilings?: RawECFSFiling[]) {
  return {
    ok: true,
    status: 200,
    // ECFS returns the array under `filing`, singular. Reading the plural
    // is the bug that kept this feed empty until 2026-09-14.
    json: async () => ({ filing: overrideFilings ?? FIXTURE_RAW_FILINGS }),
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
      // A filing row carries no comment text; the proceeding is the substance.
      title: 'COMMENT — NGSO Spectrum Sharing',
      // `name` is the docket number, `description` the proceeding title —
      // the reverse of what this mapper assumed before 2026-09-14.
      docket: 'RM-11868',
      proceedingName: 'NGSO Spectrum Sharing',
      filer: 'Example Satellite Co.',
      filingType: 'COMMENT',
      bureau: 'Space Bureau',
      filedDate: '2026-08-10T00:00:00Z',
    });
    // The API hands us the document URL; we do not construct one.
    expect(record.url).toBe('https://www.fcc.gov/ecfs/document/1082312345678/1');
  });

  it('falls back to confirmation_number for filingId and to the document filename for title', () => {
    const record = mapECFSFiling(FIXTURE_RAW_FILINGS[4], 'satellite constellation');
    expect(record.filingId).toBe('confirm-9988');
    expect(record.title).toBe('Satellite constellation deployment milestones.pdf');
    expect(record.filedDate).toBe('2026-08-07T00:00:00Z');
    // No document src on this row, so the filing page is constructed.
    expect(record.url).toBe('https://www.fcc.gov/ecfs/filing/confirm-9988');
  });

  it(`reads the bureau off the proceeding, since the row own bureaus array is empty`, () => {
    expect(mapECFSFiling(FIXTURE_RAW_FILINGS[3], 'EEO').bureau).toBe('Media Bureau');
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
  const originalFcc = process.env.FCC_API_KEY;
  const originalCongress = process.env.CONGRESS_GOV_API_KEY;

  beforeEach(() => { process.env.FCC_API_KEY = 'test-ecfs-key'; });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalFcc === undefined) delete process.env.FCC_API_KEY; else process.env.FCC_API_KEY = originalFcc;
    if (originalCongress === undefined) delete process.env.CONGRESS_GOV_API_KEY; else process.env.CONGRESS_GOV_API_KEY = originalCongress;
    jest.restoreAllMocks();
  });

  // ECFS began refusing keyless requests in 2026 (403 API_KEY_MISSING). A
  // request we know will be refused is worse than no request: it burns the
  // circuit breaker and logs noise, so the feed skips instead.
  it('makes NO network call when neither key is configured', async () => {
    delete process.env.FCC_API_KEY;
    delete process.env.CONGRESS_GOV_API_KEY;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(fetchSpectrumFilings(new Date('2026-08-14T00:00:00Z'))).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // One api.data.gov key serves both congress.gov and ECFS (confirmed against
  // the live endpoint 2026-09-14), so the Congress key alone is enough.
  it('falls back to CONGRESS_GOV_API_KEY when FCC_API_KEY is absent', async () => {
    delete process.env.FCC_API_KEY;
    process.env.CONGRESS_GOV_API_KEY = 'shared-umbrella-key';
    const fetchMock = jest.fn().mockResolvedValue(fixtureResponse());
    global.fetch = fetchMock as unknown as typeof fetch;
    await fetchSpectrumFilings(new Date('2026-08-14T00:00:00Z'));
    expect(fetchMock.mock.calls[0][0] as string).toContain('api_key=shared-umbrella-key');
  });

  it('issues exactly one HTTP request and returns filtered, deduped, mapped records', async () => {
    const fetchMock = jest.fn().mockResolvedValue(fixtureResponse());
    global.fetch = fetchMock as unknown as typeof fetch;

    const results = await fetchSpectrumFilings(new Date('2026-08-14T00:00:00Z'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('publicapi.fcc.gov/ecfs/filings');
    expect(calledUrl).toContain('limit=20');
    expect(calledUrl).toContain('api_key=test-ecfs-key');

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
  const originalFcc = process.env.FCC_API_KEY;

  beforeEach(() => { process.env.FCC_API_KEY = 'test-ecfs-key'; });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalFcc === undefined) delete process.env.FCC_API_KEY; else process.env.FCC_API_KEY = originalFcc;
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
