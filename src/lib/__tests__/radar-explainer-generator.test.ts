/**
 * @jest-environment node
 */

const mockMessagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ messages: { create: mockMessagesCreate } })),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    regulatoryAction: { count: jest.fn(), findMany: jest.fn() },
    aIInsight: { count: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import { generateRadarExplainers } from '../radar-explainer-generator';
import { __resetRegulatoryRadarAvailability } from '../regulatory-radar';

const mockPrisma = prisma as unknown as {
  regulatoryAction: { count: jest.Mock; findMany: jest.Mock };
  aIInsight: { count: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
};

const NOW = new Date('2026-08-17T12:45:00Z');

function dbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'clxaction1',
    dedupKey: 'federal-register:2026-12345',
    source: 'federal-register',
    category: 'export-controls',
    title: 'Revisions to License Requirements for Spacecraft Components',
    summary: null,
    actionDate: new Date('2026-08-10T12:00:00Z'),
    url: 'https://www.federalregister.gov/documents/2026/08/10/2026-12345/revisions',
    agency: 'Industry and Security Bureau',
    documentType: 'Rule',
    actionText: 'Final rule.',
    commentUrl: null,
    commentCloseDate: null,
    significant: true,
    raw: JSON.stringify({
      abstract: 'BIS amends the EAR to revise license requirements for certain spacecraft components.',
      citation: '91 FR 45678',
      docketIds: ['BIS-2026-0007'],
      agencySlugs: ['industry-and-security-bureau'],
    }),
    ...overrides,
  };
}

function aiTextResponse(payload: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

const GENERATION_PAYLOAD = {
  title: 'BIS revises spacecraft component export licenses',
  summary: 'BIS amended EAR license requirements for certain spacecraft components.',
  whatChanged: 'The rule revises license requirements for certain spacecraft components.',
  whoIsAffected: 'Satellite component exporters.',
  whatToDo: '1. Read the full rule.\n2. Assess exposure.',
};

describe('generateRadarExplainers', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetRegulatoryRadarAvailability();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    // Radar availability probe
    mockPrisma.regulatoryAction.count.mockResolvedValue(1);
    mockPrisma.aIInsight.count.mockResolvedValue(0);
    mockPrisma.regulatoryAction.findMany.mockResolvedValue([dbRow()]);
    mockPrisma.aIInsight.findMany.mockResolvedValue([]);
    mockPrisma.aIInsight.upsert.mockImplementation(async (args: { create: unknown }) => args.create);
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  it('skips without any AI call when ANTHROPIC_API_KEY is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generateRadarExplainers(NOW);
    expect(result.skipped).toBe(true);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('skips without any AI call when the daily cap is already reached', async () => {
    mockPrisma.aIInsight.count.mockResolvedValue(2);
    const result = await generateRadarExplainers(NOW);
    expect(result.skipped).toBe(true);
    expect(result.skips.some((s) => s.includes('daily cap'))).toBe(true);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('publishes when the fact-check passes, with the prefixed slug and regulatory category', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(aiTextResponse(GENERATION_PAYLOAD))
      .mockResolvedValueOnce(aiTextResponse({ overallVerdict: 'pass', notes: 'Grounded.', corrections: [] }));

    const result = await generateRadarExplainers(NOW);

    expect(result).toMatchObject({ generated: 1, published: 1, held: 0 });
    expect(mockPrisma.aIInsight.upsert).toHaveBeenCalledTimes(1);
    const { where, create } = mockPrisma.aIInsight.upsert.mock.calls[0][0];
    expect(where.slug).toBe('regulatory-explainer-2026-12345');
    expect(create.category).toBe('regulatory');
    expect(create.status).toBe('published');
    expect(create.content).toContain('not legal advice');
    expect(create.content).toContain('/regulatory-radar/action/clxaction1');
  });

  it('holds the draft as pending_review when the fact-check finds major issues', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(aiTextResponse(GENERATION_PAYLOAD))
      .mockResolvedValueOnce(
        aiTextResponse({ overallVerdict: 'major_issues', notes: 'Invented a CFR cite.', corrections: ['Remove 15 CFR 744'] })
      );

    const result = await generateRadarExplainers(NOW);

    expect(result).toMatchObject({ generated: 1, published: 0, held: 1 });
    const { create } = mockPrisma.aIInsight.upsert.mock.calls[0][0];
    expect(create.status).toBe('pending_review');
    expect(create.factCheckNote).toContain('MAJOR ISSUES');
  });

  it('fails closed (held) when the fact-check response is unparseable', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(aiTextResponse(GENERATION_PAYLOAD))
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json at all' }] });

    const result = await generateRadarExplainers(NOW);

    expect(result).toMatchObject({ generated: 1, published: 0, held: 1 });
    expect(mockPrisma.aIInsight.upsert.mock.calls[0][0].create.status).toBe('pending_review');
  });

  it('grounds the generation prompt in the stored source text', async () => {
    mockMessagesCreate
      .mockResolvedValueOnce(aiTextResponse(GENERATION_PAYLOAD))
      .mockResolvedValueOnce(aiTextResponse({ overallVerdict: 'pass', notes: 'ok', corrections: [] }));

    await generateRadarExplainers(NOW);

    const generationPrompt = mockMessagesCreate.mock.calls[0][0].messages[0].content as string;
    expect(generationPrompt).toContain('BIS amends the EAR to revise license requirements');
    expect(generationPrompt).toContain('STRICT GROUNDING RULES');
    expect(generationPrompt).toContain('Do NOT invent specifics');
    // The fact-checker gets the same source material to verify grounding
    const factCheckPrompt = mockMessagesCreate.mock.calls[1][0].messages[0].content as string;
    expect(factCheckPrompt).toContain('BIS amends the EAR to revise license requirements');
  });

  it('respects the remaining daily budget (1 left → generates only the oldest backlog item)', async () => {
    mockPrisma.aIInsight.count.mockResolvedValue(1); // 1 of 2 already generated today
    mockPrisma.regulatoryAction.findMany.mockResolvedValue([
      dbRow(), // oldest first (query orders actionDate asc)
      dbRow({ id: 'clxaction2', dedupKey: 'federal-register:2026-22222', actionDate: new Date('2026-08-12T12:00:00Z') }),
    ]);
    mockMessagesCreate
      .mockResolvedValueOnce(aiTextResponse(GENERATION_PAYLOAD))
      .mockResolvedValueOnce(aiTextResponse({ overallVerdict: 'pass', notes: 'ok', corrections: [] }));

    const result = await generateRadarExplainers(NOW);

    expect(result.generated).toBe(1);
    expect(mockPrisma.aIInsight.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.aIInsight.upsert.mock.calls[0][0].where.slug).toBe('regulatory-explainer-2026-12345');
    expect(result.skips.some((s) => s.includes('deferring'))).toBe(true);
  });

  it('skips actions that already have an explainer', async () => {
    mockPrisma.aIInsight.findMany.mockResolvedValue([{ slug: 'regulatory-explainer-2026-12345' }]);
    const result = await generateRadarExplainers(NOW);
    expect(result.generated).toBe(0);
    expect(result.skips.some((s) => s.includes('already have explainers'))).toBe(true);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it('fails soft (skipped) when the RegulatoryAction table is unavailable', async () => {
    mockPrisma.regulatoryAction.count.mockRejectedValue(new Error('relation does not exist'));
    const result = await generateRadarExplainers(NOW);
    expect(result.skipped).toBe(true);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});
