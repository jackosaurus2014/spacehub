/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    docketSnapshot: { count: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
    regulatoryAction: { findMany: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import { __resetDocketIntelAvailability } from '../docket-intel';
import {
  aggregateOrganizations,
  docketIdsFromRaw,
  extractOrganization,
  fetchAndStoreDocketIntel,
  parseCommentsListResponse,
} from '../fetchers/docket-intel-fetcher';

const mockPrisma = prisma as unknown as {
  docketSnapshot: { count: jest.Mock; upsert: jest.Mock; findMany: jest.Mock };
  regulatoryAction: { findMany: jest.Mock };
};

// ─── Fixtures (Regulations.gov API v4 response shapes — no live HTTP) ───────

const COMMENTS_LIST_FIXTURE = {
  data: [
    { id: 'FAA-2026-1234-0047', type: 'comments', attributes: { title: 'Comment from SpaceX' } },
    { id: 'FAA-2026-1234-0046', type: 'comments', attributes: { title: 'Anonymous public comment' } },
  ],
  meta: { totalElements: 47, pageNumber: 1 },
};

const COMMENT_DETAIL_ORG_FIXTURE = {
  data: {
    id: 'FAA-2026-1234-0047',
    type: 'comments',
    attributes: {
      organization: 'Space Exploration Technologies Corp.',
      firstName: 'REDACTED-SHOULD-NEVER-BE-READ',
      lastName: 'REDACTED-SHOULD-NEVER-BE-READ',
      comment: 'We support the proposed rule with modifications...',
    },
  },
};

const COMMENT_DETAIL_INDIVIDUAL_FIXTURE = {
  data: {
    id: 'FAA-2026-1234-0046',
    type: 'comments',
    attributes: {
      organization: null,
      firstName: 'Jane',
      lastName: 'Doe',
      comment: 'As a private citizen I object...',
    },
  },
};

describe('parseCommentsListResponse', () => {
  it('extracts total comment count and comment ids from a v4 list response', () => {
    expect(parseCommentsListResponse(COMMENTS_LIST_FIXTURE)).toEqual({
      totalComments: 47,
      commentIds: ['FAA-2026-1234-0047', 'FAA-2026-1234-0046'],
    });
  });

  it('fails soft on malformed responses', () => {
    expect(parseCommentsListResponse(null)).toEqual({ totalComments: 0, commentIds: [] });
    expect(parseCommentsListResponse({})).toEqual({ totalComments: 0, commentIds: [] });
    expect(parseCommentsListResponse({ data: 'nope', meta: { totalElements: 'many' } })).toEqual({
      totalComments: 0,
      commentIds: [],
    });
  });
});

describe('extractOrganization — individuals stay anonymous', () => {
  it('returns the organization when present', () => {
    expect(extractOrganization(COMMENT_DETAIL_ORG_FIXTURE)).toBe('Space Exploration Technologies Corp.');
  });

  it('returns null for individual commenters (no organization) — never falls back to name fields', () => {
    expect(extractOrganization(COMMENT_DETAIL_INDIVIDUAL_FIXTURE)).toBeNull();
  });

  it('treats whitespace-only organizations as absent', () => {
    expect(
      extractOrganization({ data: { attributes: { organization: '   ', firstName: 'Jane' } } })
    ).toBeNull();
  });

  it('fails soft on malformed detail responses', () => {
    expect(extractOrganization(null)).toBeNull();
    expect(extractOrganization({})).toBeNull();
    expect(extractOrganization({ data: { attributes: { organization: 42 } } })).toBeNull();
  });
});

describe('aggregateOrganizations', () => {
  it('merges case-insensitively, keeps first-seen casing, sorts by count then name', () => {
    expect(
      aggregateOrganizations(['SpaceX', 'Iridium', 'SPACEX', 'Iridium', 'Iridium', 'Astra'])
    ).toEqual([
      { name: 'Iridium', count: 3 },
      { name: 'SpaceX', count: 2 },
      { name: 'Astra', count: 1 },
    ]);
  });

  it('ignores blank names', () => {
    expect(aggregateOrganizations(['', '  '])).toEqual([]);
  });
});

describe('docketIdsFromRaw', () => {
  it('reads camelCase docketIds from the stored FederalRegisterEntry payload', () => {
    expect(docketIdsFromRaw(JSON.stringify({ docketIds: ['FAA-2026-1234', 'FAA-2026-5678'] }))).toEqual([
      'FAA-2026-1234',
      'FAA-2026-5678',
    ]);
  });

  it('accepts snake_case docket_ids for robustness', () => {
    expect(docketIdsFromRaw(JSON.stringify({ docket_ids: ['BIS-2026-0007'] }))).toEqual(['BIS-2026-0007']);
  });

  it('fails soft on null / invalid / non-array payloads', () => {
    expect(docketIdsFromRaw(null)).toEqual([]);
    expect(docketIdsFromRaw('not json')).toEqual([]);
    expect(docketIdsFromRaw(JSON.stringify({ docketIds: 'FAA-2026-1234' }))).toEqual([]);
    expect(docketIdsFromRaw(JSON.stringify({ docketIds: [null, '', ' FAA-2026-1234 '] }))).toEqual(['FAA-2026-1234']);
  });
});

describe('fetchAndStoreDocketIntel gating', () => {
  const originalKey = process.env.REGULATIONS_GOV_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetDocketIntelAvailability();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.REGULATIONS_GOV_API_KEY;
    else process.env.REGULATIONS_GOV_API_KEY = originalKey;
    jest.restoreAllMocks();
  });

  it('returns { skipped: true } with zero network calls when REGULATIONS_GOV_API_KEY is absent', async () => {
    delete process.env.REGULATIONS_GOV_API_KEY;
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await fetchAndStoreDocketIntel();

    expect(result).toEqual({ skipped: true, docketsChecked: 0, errors: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips (fail-soft, zero network calls) when the DocketSnapshot table is absent', async () => {
    process.env.REGULATIONS_GOV_API_KEY = 'test-key';
    mockPrisma.docketSnapshot.count.mockRejectedValue(new Error('relation does not exist'));
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await fetchAndStoreDocketIntel();

    expect(result).toEqual({ skipped: true, docketsChecked: 0, errors: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('checks open-comment dockets soonest-closing first and stores only organization names', async () => {
    process.env.REGULATIONS_GOV_API_KEY = 'test-key';
    mockPrisma.docketSnapshot.count.mockResolvedValue(0);
    mockPrisma.docketSnapshot.upsert.mockResolvedValue({});
    mockPrisma.regulatoryAction.findMany.mockResolvedValue([
      {
        dedupKey: 'federal-register:2026-12345',
        raw: JSON.stringify({ docketIds: ['FAA-2026-1234'] }),
      },
    ]);

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/comments?filter')) {
        return { ok: true, json: async () => COMMENTS_LIST_FIXTURE } as unknown as Response;
      }
      if (url.endsWith('/comments/FAA-2026-1234-0047')) {
        return { ok: true, json: async () => COMMENT_DETAIL_ORG_FIXTURE } as unknown as Response;
      }
      return { ok: true, json: async () => COMMENT_DETAIL_INDIVIDUAL_FIXTURE } as unknown as Response;
    });

    const result = await fetchAndStoreDocketIntel(new Date('2026-08-17T12:00:00Z'));

    expect(result).toEqual({ skipped: false, docketsChecked: 1, errors: 0 });
    // API key travels in the X-Api-Key header
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('test-key');

    const { create } = mockPrisma.docketSnapshot.upsert.mock.calls[0][0];
    expect(create.docketId).toBe('FAA-2026-1234');
    expect(create.commentCount).toBe(47);
    const organizations = JSON.parse(create.organizations);
    // Only the organization filer is named; the individual commenter is excluded
    expect(organizations).toEqual([{ name: 'Space Exploration Technologies Corp.', count: 1 }]);
    const serialized = JSON.stringify(create);
    expect(serialized).not.toContain('Jane');
    expect(serialized).not.toContain('Doe');
    expect(serialized).not.toContain('REDACTED');
  });
});
