/**
 * @jest-environment node
 *
 * Provenance is the product. These tests pin the two guarantees a research
 * buyer is actually paying for: nothing generated can be recorded as sourced,
 * and a fetcher that ran and failed cannot be mistaken for one that ran and
 * found nothing.
 */
import {
  assertNotGenerated,
  recordProvenance,
  finishRun,
  startRun,
  resumeCursor,
  PROVENANCE_METHODS,
} from '../funding/provenance';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dataProvenance: { upsert: jest.fn() },
    dataSourceRun: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require('@/lib/db').default as {
  dataProvenance: { upsert: jest.Mock };
  dataSourceRun: { create: jest.Mock; update: jest.Mock; findFirst: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  db.dataSourceRun.create.mockResolvedValue({ id: 'run1' });
  db.dataSourceRun.update.mockResolvedValue({});
  db.dataProvenance.upsert.mockResolvedValue({});
});

describe('assertNotGenerated', () => {
  it('accepts the documented methods', () => {
    for (const method of PROVENANCE_METHODS) {
      expect(() => assertNotGenerated(method, 'SEC EDGAR Form D')).not.toThrow();
    }
  });

  it('rejects an undocumented method', () => {
    expect(() => assertNotGenerated('generated', 'SEC EDGAR Form D')).toThrow(/not allowed/);
  });

  it('rejects a source that names a model or admits to estimating', () => {
    expect(() => assertNotGenerated('news', 'Claude summary of SpaceNews')).toThrow(/generated or estimated/);
    expect(() => assertNotGenerated('news', 'GPT-extracted press roundup')).toThrow(/generated or estimated/);
    expect(() => assertNotGenerated('official-filing', 'Analyst estimate')).toThrow(/generated or estimated/);
    expect(() => assertNotGenerated('derived', 'Inferred from headcount')).toThrow(/generated or estimated/);
  });
});

describe('recordProvenance', () => {
  it('refuses to write a generated value at all', async () => {
    await expect(
      recordProvenance({
        entity: 'FundingRound',
        entityId: 'r1',
        field: 'amount',
        value: 1_000_000,
        source: 'LLM extraction',
        method: 'news',
        observedAt: new Date('2026-01-01'),
      }),
    ).rejects.toThrow();
    expect(db.dataProvenance.upsert).not.toHaveBeenCalled();
  });

  it('stores the value it justifies, so an auditor can spot drift', async () => {
    await recordProvenance({
      entity: 'FundingRound',
      entityId: 'r1',
      field: 'amount',
      value: 280821725,
      source: 'SEC EDGAR Form D',
      sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1715660/x-index.htm',
      sourceRef: '0001715660-21-000003',
      method: 'official-filing',
      observedAt: new Date('2021-04-19T00:00:00Z'),
    });
    const arg = db.dataProvenance.upsert.mock.calls[0][0];
    expect(arg.where.entity_entityId_field_source).toEqual({
      entity: 'FundingRound',
      entityId: 'r1',
      field: 'amount',
      source: 'SEC EDGAR Form D',
    });
    expect(arg.create.value).toBe('280821725');
    expect(arg.create.observedAt.toISOString()).toBe('2021-04-19T00:00:00.000Z');
  });
});

describe('finishRun', () => {
  it('marks a clean run ok', async () => {
    const id = await startRun('sec-form-d');
    await finishRun(id, { itemsSeen: 10, itemsWritten: 4, httpErrors: 0, complete: true });
    expect(db.dataSourceRun.update.mock.calls[0][0].data.ok).toBe(true);
  });

  it('marks a run that wrote nothing while erroring as NOT ok', async () => {
    // This is the exact shape of the FCC fetchers that swallowed a 403 and
    // read as healthy for weeks.
    const id = await startRun('sec-form-d');
    await finishRun(id, { itemsSeen: 10, itemsWritten: 0, httpErrors: 7 });
    const data = db.dataSourceRun.update.mock.calls[0][0].data;
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/7 HTTP error/);
  });

  it('keeps a legitimately quiet run green', async () => {
    const id = await startRun('sec-form-d');
    await finishRun(id, { itemsSeen: 120, itemsWritten: 0, httpErrors: 0, complete: true });
    expect(db.dataSourceRun.update.mock.calls[0][0].data.ok).toBe(true);
  });

  it('records a thrown error verbatim', async () => {
    const id = await startRun('sec-form-d');
    await finishRun(id, { itemsSeen: 1, itemsWritten: 0, httpErrors: 0 }, new Error('EDGAR returned 403'));
    const data = db.dataSourceRun.update.mock.calls[0][0].data;
    expect(data.ok).toBe(false);
    expect(data.error).toContain('EDGAR returned 403');
  });
});

describe('resumeCursor', () => {
  it('resumes an unfinished sweep', async () => {
    db.dataSourceRun.findFirst.mockResolvedValue({ cursor: 'k2-space', complete: false });
    await expect(resumeCursor('sec-form-d')).resolves.toBe('k2-space');
  });

  it('starts over once a sweep completed', async () => {
    db.dataSourceRun.findFirst.mockResolvedValue({ cursor: 'zeno-power', complete: true });
    await expect(resumeCursor('sec-form-d')).resolves.toBeNull();
  });

  it('starts at the beginning when nothing has ever run', async () => {
    db.dataSourceRun.findFirst.mockResolvedValue(null);
    await expect(resumeCursor('sec-form-d')).resolves.toBeNull();
  });
});
