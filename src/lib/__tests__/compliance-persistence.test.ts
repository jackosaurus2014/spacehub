/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Mock dependencies before any imports -- use inline jest.fn() to avoid hoisting
// ---------------------------------------------------------------------------
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    proposedRegulation: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/regulatory-hub-data', () => ({
  fetchFederalRegisterUpdates: jest.fn(),
}));

jest.mock('@/lib/api-cache', () => ({
  apiCache: {
    set: jest.fn(),
    getStale: jest.fn(() => null),
  },
  CacheTTL: { VERY_SLOW: 3600000 },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { POST } from '@/app/api/compliance/fetch/route';
import { fetchFederalRegisterUpdates } from '@/lib/regulatory-hub-data';
import { apiCache } from '@/lib/api-cache';
import { logger } from '@/lib/logger';
import type { FederalRegisterDocument } from '@/lib/regulatory-hub-data';

// Typed references to mocked functions
const mockUpsert = (prisma as any).proposedRegulation.upsert as jest.Mock;
const mockFetchFederalRegister = fetchFederalRegisterUpdates as jest.MockedFunction<
  typeof fetchFederalRegisterUpdates
>;
const mockApiCacheGetStale = (apiCache as any).getStale as jest.Mock;
const mockLoggerError = (logger as any).error as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal FederalRegisterDocument for testing */
function makeDocument(overrides: Partial<FederalRegisterDocument> = {}): FederalRegisterDocument {
  return {
    documentNumber: 'FR-2026-01234',
    title: 'Space Launch License Requirements',
    type: 'Proposed Rule',
    abstract: 'Updated requirements for commercial space launch licensing.',
    publicationDate: '2026-01-15',
    effectiveOn: '2026-06-01',
    agencies: ['Federal Aviation Administration'],
    agencySlugs: ['federal-aviation-administration'],
    htmlUrl: 'https://federalregister.gov/documents/2026/01234',
    pdfUrl: 'https://federalregister.gov/documents/2026/01234.pdf',
    citation: '91 FR 12345',
    docketIds: ['FAA-2026-0001'],
    regulationIdNumbers: ['2120-AL00'],
    significant: false,
    ...overrides,
  };
}

/** Create a NextRequest with JSON body */
function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/compliance/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  // Default: upsert returns a "newly created" record (createdAt === updatedAt)
  const now = new Date();
  mockUpsert.mockResolvedValue({
    id: 'test-id',
    createdAt: now,
    updatedAt: now,
  });
  // Default: cache miss
  mockApiCacheGetStale.mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------
describe('slug generation from documentNumber', () => {
  it('lowercases and replaces non-alphanumeric chars with hyphens', async () => {
    const doc = makeDocument({ documentNumber: 'FR-2026-01234' });
    mockFetchFederalRegister.mockResolvedValue({
      success: true,
      documents: [doc],
    });

    await POST(makeRequest());

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const call = mockUpsert.mock.calls[0][0];
    // 'FR-2026-01234' -> 'fr-2026-01234'
    expect(call.where.slug).toBe('fr-2026-01234');
    expect(call.create.slug).toBe('fr-2026-01234');
  });

  it('strips leading and trailing hyphens', async () => {
    const doc = makeDocument({ documentNumber: '--DOC-123--' });
    mockFetchFederalRegister.mockResolvedValue({
      success: true,
      documents: [doc],
    });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.where.slug).toBe('doc-123');
  });

  it('collapses consecutive non-alphanumeric chars into a single hyphen', async () => {
    const doc = makeDocument({ documentNumber: 'DOC///456___789' });
    mockFetchFederalRegister.mockResolvedValue({
      success: true,
      documents: [doc],
    });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.where.slug).toBe('doc-456-789');
  });
});

// ---------------------------------------------------------------------------
// Type mapping
// ---------------------------------------------------------------------------
describe('Federal Register type to regulation type mapping', () => {
  const typeTests: Array<{ frType: string; expected: string }> = [
    { frType: 'Rule', expected: 'final_rule' },
    { frType: 'Proposed Rule', expected: 'proposed_rule' },
    { frType: 'Notice', expected: 'notice' },
    { frType: 'Presidential Document', expected: 'executive_order' },
  ];

  for (const { frType, expected } of typeTests) {
    it(`maps "${frType}" to "${expected}"`, async () => {
      const doc = makeDocument({ type: frType });
      mockFetchFederalRegister.mockResolvedValue({
        success: true,
        documents: [doc],
      });

      await POST(makeRequest());

      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.type).toBe(expected);
    });
  }

  it('defaults to "notice" for unknown document types', async () => {
    const doc = makeDocument({ type: 'Unknown Type' });
    mockFetchFederalRegister.mockResolvedValue({
      success: true,
      documents: [doc],
    });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.type).toBe('notice');
  });
});

// ---------------------------------------------------------------------------
// Category detection
// ---------------------------------------------------------------------------
describe('category detection from agency and content', () => {
  it('detects export_control from BIS agency slug', async () => {
    const doc = makeDocument({
      agencySlugs: ['bureau-of-industry-and-security'],
      title: 'Trade regulations update',
      abstract: 'General trade update',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.category).toBe('export_control');
  });

  it('detects export_control from ITAR keyword in abstract', async () => {
    const doc = makeDocument({
      agencySlugs: ['federal-aviation-administration'],
      title: 'Defense articles',
      abstract: 'Updated ITAR munitions list categories',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.category).toBe('export_control');
  });

  it('detects licensing from title keywords', async () => {
    const doc = makeDocument({
      agencySlugs: ['federal-aviation-administration'],
      title: 'New Launch License Requirements for Suborbital Vehicles',
      abstract: 'Updated commercial launch guidance',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.category).toBe('licensing');
  });

  it('detects safety from abstract keywords', async () => {
    const doc = makeDocument({
      agencySlugs: ['federal-aviation-administration'],
      title: 'Operational guidelines',
      abstract: 'Safety assessment requirements for crew safety during launch',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.category).toBe('safety');
  });

  it('detects spectrum from FCC agency slug', async () => {
    const doc = makeDocument({
      agencySlugs: ['federal-communications-commission'],
      title: 'Satellite allocation rules',
      abstract: 'Rules for NGSO satellite systems',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.category).toBe('spectrum');
  });

  it('detects spectrum from frequency keyword', async () => {
    const doc = makeDocument({
      agencySlugs: ['national-aeronautics-and-space-administration'],
      title: 'Frequency allocation changes',
      abstract: 'Adjustments to 2200 MHz band',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.category).toBe('spectrum');
  });

  it('detects environmental category', async () => {
    const doc = makeDocument({
      agencySlugs: ['federal-aviation-administration'],
      title: 'Launch site NEPA review',
      abstract: 'Environmental impact assessment for launch operations',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.category).toBe('environmental');
  });

  it('defaults to commercial_space when no specific category matches', async () => {
    const doc = makeDocument({
      agencySlugs: ['national-aeronautics-and-space-administration'],
      title: 'Updated procurement procedures',
      abstract: 'Administrative changes to contract management',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.category).toBe('commercial_space');
  });
});

// ---------------------------------------------------------------------------
// Impact areas detection
// ---------------------------------------------------------------------------
describe('impact areas derived from title and abstract', () => {
  it('detects launch impact area', async () => {
    const doc = makeDocument({ title: 'Launch vehicle requirements', abstract: 'Rules for reentry vehicles' });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    const impactAreas = JSON.parse(call.create.impactAreas);
    expect(impactAreas).toContain('launch');
  });

  it('detects satellite impact area', async () => {
    const doc = makeDocument({ title: 'Satellite deorbit standards', abstract: 'Spacecraft disposal rules' });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    const impactAreas = JSON.parse(call.create.impactAreas);
    expect(impactAreas).toContain('satellite');
  });

  it('detects multiple impact areas', async () => {
    const doc = makeDocument({
      title: 'Launch and satellite software requirements',
      abstract: 'Cyber security and hardware component standards for spacecraft',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    const impactAreas = JSON.parse(call.create.impactAreas);
    expect(impactAreas).toContain('launch');
    expect(impactAreas).toContain('satellite');
    expect(impactAreas).toContain('software');
    expect(impactAreas).toContain('components');
  });

  it('defaults to technology when no keywords match', async () => {
    const doc = makeDocument({
      title: 'Administrative procedures update',
      abstract: 'General administrative changes',
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    const impactAreas = JSON.parse(call.create.impactAreas);
    expect(impactAreas).toEqual(['technology']);
  });
});

// ---------------------------------------------------------------------------
// Status determination
// ---------------------------------------------------------------------------
describe('status determination', () => {
  it('sets status to "open" when effectiveOn is in the future', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const doc = makeDocument({ effectiveOn: futureDate.toISOString().split('T')[0] });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.status).toBe('open');
  });

  it('sets status to "closed" when effectiveOn is in the past', async () => {
    const doc = makeDocument({ effectiveOn: '2020-01-01' });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.status).toBe('closed');
  });

  it('sets status to "closed" for final_rule with no effectiveOn', async () => {
    const doc = makeDocument({ type: 'Rule', effectiveOn: null });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.status).toBe('closed');
  });

  it('sets status to "open" for non-final-rule with no effectiveOn', async () => {
    const doc = makeDocument({ type: 'Proposed Rule', effectiveOn: null });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.status).toBe('open');
  });
});

// ---------------------------------------------------------------------------
// Upsert deduplication
// ---------------------------------------------------------------------------
describe('upsert deduplication', () => {
  it('uses the slug as upsert where key for deduplication', async () => {
    const doc = makeDocument({ documentNumber: 'FR-2026-99999' });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.where).toEqual({ slug: 'fr-2026-99999' });
    expect(call.create.slug).toBe('fr-2026-99999');
  });

  it('passes both create and update data to the upsert', async () => {
    const doc = makeDocument({ title: 'Test Rule', abstract: 'Test abstract' });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    // create has slug + all data fields
    expect(call.create).toHaveProperty('slug');
    expect(call.create).toHaveProperty('title', 'Test Rule');
    expect(call.create).toHaveProperty('summary', 'Test abstract');
    // update has data fields but no slug (slug is immutable)
    expect(call.update).not.toHaveProperty('slug');
    expect(call.update).toHaveProperty('title', 'Test Rule');
    expect(call.update).toHaveProperty('summary', 'Test abstract');
  });
});

// ---------------------------------------------------------------------------
// New document counting logic
// ---------------------------------------------------------------------------
describe('new document counting', () => {
  it('counts documents as new when createdAt equals updatedAt', async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({ id: '1', createdAt: now, updatedAt: now });

    const docs = [makeDocument({ documentNumber: 'NEW-001' }), makeDocument({ documentNumber: 'NEW-002' })];
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: docs });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(body.newDocumentsCount).toBe(2);
  });

  it('does not count documents as new when updatedAt differs from createdAt', async () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const updated = new Date('2026-02-01T00:00:00Z');
    mockUpsert.mockResolvedValue({ id: '1', createdAt: created, updatedAt: updated });

    const docs = [makeDocument({ documentNumber: 'OLD-001' })];
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: docs });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(body.newDocumentsCount).toBe(0);
  });

  it('counts mixed new and updated documents correctly', async () => {
    const now = new Date();
    const oldCreated = new Date('2025-06-01T00:00:00Z');
    const oldUpdated = new Date('2026-01-15T00:00:00Z');

    // First call: new document; Second call: existing document
    mockUpsert
      .mockResolvedValueOnce({ id: '1', createdAt: now, updatedAt: now })
      .mockResolvedValueOnce({ id: '2', createdAt: oldCreated, updatedAt: oldUpdated });

    const docs = [
      makeDocument({ documentNumber: 'NEW-100' }),
      makeDocument({ documentNumber: 'EXISTING-200' }),
    ];
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: docs });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(body.documentsCount).toBe(2);
    expect(body.newDocumentsCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Error handling for individual upsert failures
// ---------------------------------------------------------------------------
describe('error handling for individual upsert failures', () => {
  it('continues processing after a single upsert failure', async () => {
    const now = new Date();
    mockUpsert
      .mockRejectedValueOnce(new Error('Database constraint violation'))
      .mockResolvedValueOnce({ id: '2', createdAt: now, updatedAt: now });

    const docs = [
      makeDocument({ documentNumber: 'FAIL-001' }),
      makeDocument({ documentNumber: 'SUCCESS-002' }),
    ];
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: docs });

    const response = await POST(makeRequest());
    const body = await response.json();

    // The overall response should still be successful
    expect(body.success).toBe(true);
    expect(body.documentsCount).toBe(2);
    // Only the second document was successfully inserted as new
    expect(body.newDocumentsCount).toBe(1);
    // Both upserts were attempted
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it('logs error when an individual upsert fails', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('Unique constraint failed'));

    const docs = [makeDocument({ documentNumber: 'ERR-001' })];
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: docs });

    await POST(makeRequest());

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to upsert document ERR-001'),
      expect.objectContaining({ error: 'Unique constraint failed' })
    );
  });

  it('handles all upserts failing gracefully', async () => {
    mockUpsert.mockRejectedValue(new Error('DB down'));

    const docs = [
      makeDocument({ documentNumber: 'FAIL-A' }),
      makeDocument({ documentNumber: 'FAIL-B' }),
    ];
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: docs });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.documentsCount).toBe(2);
    expect(body.newDocumentsCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Field mapping completeness
// ---------------------------------------------------------------------------
describe('field mapping from FederalRegisterDocument to ProposedRegulation', () => {
  it('maps all expected fields correctly', async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({ id: '1', createdAt: now, updatedAt: now });

    const doc = makeDocument({
      documentNumber: 'FR-2026-55555',
      title: 'Commercial Space Transportation Update',
      abstract: 'Key changes to launch operations',
      agencies: ['Federal Aviation Administration'],
      agencySlugs: ['federal-aviation-administration'],
      publicationDate: '2026-03-15',
      effectiveOn: '2026-09-01',
      htmlUrl: 'https://federalregister.gov/documents/2026/55555',
      citation: '91 FR 55555',
      docketIds: ['FAA-2026-0055'],
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    const data = call.create;

    expect(data.slug).toBe('fr-2026-55555');
    expect(data.title).toBe('Commercial Space Transportation Update');
    expect(data.summary).toBe('Key changes to launch operations');
    expect(data.agency).toBe('Federal Aviation Administration');
    expect(data.docketNumber).toBe('FAA-2026-0055');
    expect(data.federalRegisterCitation).toBe('91 FR 55555');
    expect(data.sourceUrl).toBe('https://federalregister.gov/documents/2026/55555');
    expect(data.publishedDate).toEqual(new Date('2026-03-15'));
    expect(data.effectiveDate).toEqual(new Date('2026-09-01'));
    expect(data.commentUrl).toBe('https://www.regulations.gov/docket/FAA-2026-0055');
  });

  it('uses "No abstract available" when abstract is null', async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({ id: '1', createdAt: now, updatedAt: now });

    const doc = makeDocument({ abstract: null });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.summary).toBe('No abstract available');
  });

  it('uses first agency from the list', async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({ id: '1', createdAt: now, updatedAt: now });

    const doc = makeDocument({
      agencies: ['National Aeronautics and Space Administration', 'Federal Aviation Administration'],
    });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.agency).toBe('National Aeronautics and Space Administration');
  });

  it('uses "Unknown" when agencies array is empty', async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({ id: '1', createdAt: now, updatedAt: now });

    const doc = makeDocument({ agencies: [] });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.agency).toBe('Unknown');
  });

  it('sets effectiveDate to null when effectiveOn is null', async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({ id: '1', createdAt: now, updatedAt: now });

    const doc = makeDocument({ effectiveOn: null, type: 'Notice' });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.effectiveDate).toBeNull();
  });

  it('sets commentUrl to null when no docketIds exist', async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({ id: '1', createdAt: now, updatedAt: now });

    const doc = makeDocument({ docketIds: [] });
    mockFetchFederalRegister.mockResolvedValue({ success: true, documents: [doc] });

    await POST(makeRequest());

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.commentUrl).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// API failure handling
// ---------------------------------------------------------------------------
describe('API failure handling', () => {
  it('returns fallback response when fetch fails and no cache exists', async () => {
    mockFetchFederalRegister.mockResolvedValue({
      success: false,
      error: 'API timeout',
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.documentsCount).toBe(0);
    expect(body.newDocumentsCount).toBe(0);
    expect(body.source).toBe('fallback');
    expect(body.error).toBe('API timeout');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns cached response when fetch fails and cache exists', async () => {
    const cachedData = {
      success: true,
      documentsCount: 5,
      newDocumentsCount: 2,
      documents: [],
      fetchedAt: '2026-02-20T00:00:00Z',
      source: 'live',
    };
    mockApiCacheGetStale.mockReturnValue({
      value: cachedData,
      isStale: true,
      storedAt: Date.now(),
    });

    mockFetchFederalRegister.mockResolvedValue({
      success: false,
      error: 'Server error',
    });

    const response = await POST(makeRequest());
    const body = await response.json();

    expect(body.source).toBe('cache');
    expect(body.cached).toBe(true);
    expect(body.warning).toContain('error');
    expect(body.documentsCount).toBe(5);
  });
});
