/**
 * @jest-environment node
 */
import type { RadarEntry } from '../regulatory-radar';

const mockCount = jest.fn();
const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    regulatoryAction: {
      count: (...args: unknown[]) => mockCount(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}));

import {
  isPassageLevelAction,
  markExportControlItemsIncluded,
  qualifiesForExportControlWatch,
  selectExportControlWatchItems,
  toWatchItem,
  whatHappenedLine,
  whyItMattersLine,
  WATCH_MAX_ITEMS,
} from '../export-control-watch';
import { __resetRegulatoryRadarAvailability } from '../regulatory-radar';

function makeEntry(overrides: Partial<RadarEntry> = {}): RadarEntry {
  return {
    id: 'r1',
    dedupKey: 'federal-register:2026-11111',
    source: 'federal-register',
    category: 'export-controls',
    title: 'Revisions to the Commerce Control List: spacecraft items',
    summary: 'BIS amends ECCN 9x515.',
    actionDate: new Date('2026-08-14T12:00:00Z'),
    url: 'https://www.federalregister.gov/documents/2026-11111',
    agency: 'Bureau of Industry and Security',
    documentType: 'Rule',
    actionText: 'Final rule',
    commentUrl: null,
    commentCloseDate: null,
    significant: false,
    ...overrides,
  };
}

describe('qualifiesForExportControlWatch — the bar is high', () => {
  it('final rules from BIS qualify', () => {
    expect(qualifiesForExportControlWatch(makeEntry())).toBe(true);
  });

  it('interim final rules qualify', () => {
    expect(
      qualifiesForExportControlWatch(
        makeEntry({ documentType: 'Rule', actionText: 'Interim final rule with request for comments' })
      )
    ).toBe(true);
  });

  it('significant proposed rules qualify; non-significant proposed rules do not', () => {
    expect(
      qualifiesForExportControlWatch(
        makeEntry({ documentType: 'Proposed Rule', actionText: 'Proposed rule', significant: true })
      )
    ).toBe(true);
    expect(
      qualifiesForExportControlWatch(
        makeEntry({ documentType: 'Proposed Rule', actionText: 'Proposed rule', significant: false })
      )
    ).toBe(false);
  });

  it('plain notices NEVER qualify, even flagged significant', () => {
    expect(qualifiesForExportControlWatch(makeEntry({ documentType: 'Notice' }))).toBe(false);
    expect(
      qualifiesForExportControlWatch(makeEntry({ documentType: 'Notice', significant: true }))
    ).toBe(false);
  });

  it('non-export-control categories never qualify', () => {
    expect(qualifiesForExportControlWatch(makeEntry({ category: 'spectrum' }))).toBe(false);
  });

  it('FR documents from non-BIS/DDTC agencies never qualify', () => {
    expect(
      qualifiesForExportControlWatch(makeEntry({ agency: 'Federal Aviation Administration' }))
    ).toBe(false);
  });

  it('congress: passage-level actions qualify; introductions/referrals/hearings never do', () => {
    const congress = (actionText: string) =>
      makeEntry({ source: 'congress', agency: 'U.S. House', documentType: 'hr', actionText });
    expect(qualifiesForExportControlWatch(congress('Passed the House by voice vote.'))).toBe(true);
    expect(qualifiesForExportControlWatch(congress('Became Public Law No: 119-88.'))).toBe(true);
    expect(qualifiesForExportControlWatch(congress('Presented to President.'))).toBe(true);
    expect(
      qualifiesForExportControlWatch(congress('Introduced in the Senate; referred to committee.'))
    ).toBe(false);
    expect(
      qualifiesForExportControlWatch(congress('Referred to the Committee on Foreign Affairs.'))
    ).toBe(false);
    expect(qualifiesForExportControlWatch(congress('Hearings held by committee.'))).toBe(false);
  });
});

describe('isPassageLevelAction', () => {
  it('detects chamber passage, conference, presentment, and enactment', () => {
    expect(isPassageLevelAction('Passed the Senate with an amendment.')).toBe(true);
    expect(isPassageLevelAction('Conference report agreed to in House.')).toBe(true);
    expect(isPassageLevelAction('Cleared for the President.')).toBe(true);
    expect(isPassageLevelAction('Signed by President.')).toBe(true);
    expect(isPassageLevelAction(null)).toBe(false);
    expect(isPassageLevelAction('Committee markup held.')).toBe(false);
  });
});

describe('templated copy — no fabricated impact claims', () => {
  it('keys why-it-matters on the agency', () => {
    expect(whyItMattersLine(makeEntry())).toContain('EAR');
    expect(whyItMattersLine(makeEntry({ agency: 'Department of State' }))).toContain('ITAR');
    expect(whyItMattersLine(makeEntry({ source: 'congress' }))).toContain('legislation');
  });

  it('describes what happened from metadata only', () => {
    expect(whatHappenedLine(makeEntry())).toBe('Final rule published');
    expect(
      whatHappenedLine(makeEntry({ actionText: 'Interim final rule; request for comments' }))
    ).toBe('Interim final rule published');
    expect(
      whatHappenedLine(makeEntry({ source: 'congress', actionText: 'Passed the House.' }))
    ).toBe('Passed the House.');
  });

  it('builds a date line from the real comment close or publication date', () => {
    const withComment = toWatchItem(makeEntry({ commentCloseDate: new Date('2026-09-15T23:59:59Z') }));
    expect(withComment.dateLine).toBe('Comments close 2026-09-15');
    const withoutComment = toWatchItem(makeEntry());
    expect(withoutComment.dateLine).toBe('Published 2026-08-14');
  });
});

describe('selection + dedupe cursor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRegulatoryRadarAvailability();
    mockCount.mockResolvedValue(0); // availability probe passes
  });

  it('only queries never-digested actions (digestIncludedAt: null) — the dedupe mechanism', async () => {
    mockFindMany.mockResolvedValue([]);
    await selectExportControlWatchItems(new Date('2026-08-17T08:00:00Z'));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'export-controls',
          digestIncludedAt: null,
        }),
      })
    );
  });

  it('caps at WATCH_MAX_ITEMS with overflow flagged, filtering out unqualified rows', async () => {
    const rows = [
      makeEntry({ id: 'a', significant: true }),
      makeEntry({ id: 'b' }),
      makeEntry({ id: 'c' }),
      makeEntry({ id: 'd' }),
      makeEntry({ id: 'notice', documentType: 'Notice' }), // never qualifies
    ];
    mockFindMany.mockResolvedValue(rows);

    const selection = await selectExportControlWatchItems(new Date('2026-08-17T08:00:00Z'));

    expect(selection.items).toHaveLength(WATCH_MAX_ITEMS);
    expect(selection.includedIds).toEqual(['a', 'b', 'c']);
    expect(selection.overflow).toBe(true);
    expect(selection.items.map((i) => i.id)).not.toContain('notice');
  });

  it('marks shipped items so consecutive digests never repeat an action', async () => {
    const now = new Date('2026-08-17T08:00:00Z');
    await markExportControlItemsIncluded(['a', 'b'], now);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] } },
      data: { digestIncludedAt: now },
    });

    // Second digest: rows a/b now carry digestIncludedAt and are excluded by
    // the digestIncludedAt:null filter — simulate the DB honoring it.
    mockFindMany.mockResolvedValue([]);
    const second = await selectExportControlWatchItems(now);
    expect(second.items).toHaveLength(0);
    expect(second.includedIds).toHaveLength(0);
  });

  it('fails soft to an empty selection when the table is missing', async () => {
    mockCount.mockRejectedValue(new Error('relation "RegulatoryAction" does not exist'));
    const selection = await selectExportControlWatchItems();
    expect(selection).toEqual({ items: [], includedIds: [], overflow: false });
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
