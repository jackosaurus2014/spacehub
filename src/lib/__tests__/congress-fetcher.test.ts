/**
 * @jest-environment node
 */
import {
  billLabel,
  billToRadarEntry,
  buildBillUrl,
  fetchAndStoreCongressActions,
  isSpaceOrExportControlBill,
  stripHtml,
  type CongressApiBill,
} from '../fetchers/congress-fetcher';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { regulatoryAction: { count: jest.fn(), upsert: jest.fn() } },
}));

// Fixture matching the congress.gov API v3 /bill list response shape
const FIXTURE_BILL: CongressApiBill = {
  congress: 119,
  number: '3512',
  type: 'HR',
  title: 'Commercial Space Licensing Reform Act of 2026',
  originChamber: 'House',
  latestAction: {
    actionDate: '2026-08-12',
    text: 'Passed the House by voice vote.',
  },
  updateDate: '2026-08-13',
  url: 'https://api.congress.gov/v3/bill/119/hr/3512?format=json',
};

describe('isSpaceOrExportControlBill', () => {
  it('matches space bills', () => {
    expect(isSpaceOrExportControlBill('Commercial Space Licensing Reform Act')).toBe(true);
    expect(isSpaceOrExportControlBill('NASA Authorization Act of 2026')).toBe(true);
    expect(isSpaceOrExportControlBill('A bill to modernize satellite spectrum management')).toBe(true);
  });

  it('matches export-control bills with no space words', () => {
    expect(isSpaceOrExportControlBill('Export Administration Reform and Modernization Act')).toBe(true);
    expect(isSpaceOrExportControlBill('A bill to amend the Arms Export Control Act')).toBe(true);
  });

  it('does not match cyberspace or unrelated bills', () => {
    expect(isSpaceOrExportControlBill('Cyberspace Solarium Implementation Act')).toBe(false);
    expect(isSpaceOrExportControlBill('Rural Broadband Expansion Act')).toBe(false);
    expect(isSpaceOrExportControlBill('An act to rename a post office')).toBe(false);
  });
});

describe('buildBillUrl', () => {
  it('builds canonical congress.gov URLs with correct ordinals and type slugs', () => {
    expect(buildBillUrl(119, 'HR', '3512')).toBe(
      'https://www.congress.gov/bill/119th-congress/house-bill/3512'
    );
    expect(buildBillUrl(119, 'S', 98)).toBe(
      'https://www.congress.gov/bill/119th-congress/senate-bill/98'
    );
    expect(buildBillUrl(121, 'SJRES', 7)).toBe(
      'https://www.congress.gov/bill/121st-congress/senate-joint-resolution/7'
    );
    expect(buildBillUrl(122, 'HRES', 12)).toBe(
      'https://www.congress.gov/bill/122nd-congress/house-resolution/12'
    );
    expect(buildBillUrl(113, 'HR', 1)).toBe(
      'https://www.congress.gov/bill/113th-congress/house-bill/1'
    );
  });
});

describe('billLabel / stripHtml', () => {
  it('formats bill labels', () => {
    expect(billLabel('HR', '3512')).toBe('H.R. 3512');
    expect(billLabel('S', 98)).toBe('S. 98');
    expect(billLabel('SCONRES', 4)).toBe('S.Con.Res. 4');
  });

  it('strips summary HTML to plain text', () => {
    expect(stripHtml('<p>This bill <b>reforms</b> launch licensing.</p>')).toBe(
      'This bill reforms launch licensing.'
    );
  });
});

describe('billToRadarEntry', () => {
  it('maps a bill to a radar entry keyed by bill id + latest action date', () => {
    const entry = billToRadarEntry(FIXTURE_BILL, 'This bill streamlines commercial space launch licensing.');
    expect(entry.dedupKey).toBe('congress:119-hr-3512:2026-08-12');
    expect(entry.source).toBe('congress');
    expect(entry.title).toBe('H.R. 3512 — Commercial Space Licensing Reform Act of 2026');
    expect(entry.url).toBe('https://www.congress.gov/bill/119th-congress/house-bill/3512');
    expect(entry.agency).toBe('U.S. House');
    expect(entry.actionText).toBe('Passed the House by voice vote.');
    expect(entry.actionDate).toEqual(new Date('2026-08-12T12:00:00Z'));
    expect(entry.category).toBe('launch-licensing');
  });

  it('creates a NEW dedup key when the latest action date changes (status change => new radar entry)', () => {
    const later = billToRadarEntry({
      ...FIXTURE_BILL,
      latestAction: { actionDate: '2026-09-01', text: 'Received in the Senate.' },
    });
    expect(later.dedupKey).toBe('congress:119-hr-3512:2026-09-01');
    expect(later.dedupKey).not.toBe(billToRadarEntry(FIXTURE_BILL).dedupKey);
  });

  it('categorizes export-control bills as export-controls', () => {
    const entry = billToRadarEntry({
      ...FIXTURE_BILL,
      title: 'Arms Export Control Act Modernization Act',
    });
    expect(entry.category).toBe('export-controls');
  });
});

describe('fetchAndStoreCongressActions env gate', () => {
  const originalKey = process.env.CONGRESS_GOV_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.CONGRESS_GOV_API_KEY;
    else process.env.CONGRESS_GOV_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  it('returns { skipped: true } without any network call when CONGRESS_GOV_API_KEY is absent', async () => {
    delete process.env.CONGRESS_GOV_API_KEY;
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await fetchAndStoreCongressActions();

    expect(result).toEqual({ skipped: true, stored: 0, errors: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
