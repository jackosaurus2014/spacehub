/**
 * @jest-environment node
 *
 * End-to-end regression coverage for the AI-daily publication gate.
 *
 * Reproduces the 2026-08-20 live defect: a generation batch where ONE
 * insight's fact-check legitimately fails and the SIBLING passes. The
 * sibling must publish. Also covers the bounded fact-check retry and the
 * self-healing reconciliation of rows held without justification.
 */

import { NextRequest } from 'next/server';

const mockPrisma = {
  aIInsight: {
    count: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  },
  dynamicContent: { create: jest.fn() },
  newsArticle: { findMany: jest.fn() },
  blogPost: { findMany: jest.fn() },
  legalUpdate: { findMany: jest.fn() },
};

const mockMessagesCreate = jest.fn();

jest.mock('@/lib/db', () => ({ __esModule: true, default: mockPrisma, prisma: mockPrisma }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class MockAnthropic {
    messages = { create: mockMessagesCreate };
  },
}));

const CRON_SECRET = 'test-cron-secret';

function textResponse(payload: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

function insight(title: string) {
  return {
    title,
    summary: `${title} summary`,
    content: `## What Happened\n${title} body copy.`,
    category: 'market',
    sources: ['https://example.com/a'],
  };
}

/** Queue the generation response, then one fact-check response per insight. */
function queueRun(titles: string[], factChecks: Array<unknown | Error>) {
  mockMessagesCreate.mockResolvedValueOnce(textResponse({ insights: titles.map(insight) }));
  for (const fc of factChecks) {
    if (fc instanceof Error) mockMessagesCreate.mockRejectedValueOnce(fc);
    else if (fc === null) mockMessagesCreate.mockResolvedValueOnce({ content: [] });
    else if (typeof fc === 'string') mockMessagesCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: fc }] });
    else mockMessagesCreate.mockResolvedValueOnce(textResponse(fc));
  }
}

async function runGenerate() {
  const { POST } = await import('@/app/api/ai-insights/generate/route');
  const request = new NextRequest('https://spacenexus.us/api/ai-insights/generate', {
    method: 'POST',
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  const response = await POST(request);
  return { response, body: await response.json() };
}

/** Statuses actually written, keyed by article title. */
function writtenStatuses(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const call of mockPrisma.aIInsight.upsert.mock.calls) {
    out[call[0].create.title] = call[0].create.status;
  }
  return out;
}

function writtenNotes(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const call of mockPrisma.aIInsight.upsert.mock.calls) {
    out[call[0].create.title] = call[0].create.factCheckNote;
  }
  return out;
}

describe('POST /api/ai-insights/generate — publication gate', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.FACT_CHECK_RETRY_DELAY_MS = '0';
    delete process.env.RESEND_API_KEY;

    mockPrisma.aIInsight.count.mockResolvedValue(0);
    mockPrisma.aIInsight.findMany.mockResolvedValue([]);
    mockPrisma.aIInsight.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.aIInsight.upsert.mockImplementation(async (args: any) => ({
      id: `id-${args.create.slug}`,
      ...args.create,
    }));
    mockPrisma.dynamicContent.create.mockResolvedValue({ id: 'lock' });
    mockPrisma.newsArticle.findMany.mockResolvedValue([
      { title: 'Rocket Lab launches 9th satellite for iQPS', summary: 's', url: 'u', source: 'SpaceNews', category: 'launches' },
    ]);
    mockPrisma.blogPost.findMany.mockResolvedValue([]);
    mockPrisma.legalUpdate.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('publishes the passing sibling when the other insight fails its fact-check', async () => {
    // Exactly the 2026-08-20 shape: sibling A passes, sibling C is unparseable.
    queueRun(
      ['NASA abandons the Katalyst Swift reboost', 'LandSpace lands Zhuque-3'],
      [
        { overallVerdict: 'pass', notes: 'Core facts align with the cited sources.', corrections: [] },
        'not json at all', // unparseable -> retried
        'still not json at all', // retry also fails -> held
      ]
    );

    const { body } = await runGenerate();
    const statuses = writtenStatuses();

    expect(statuses['NASA abandons the Katalyst Swift reboost']).toBe('published');
    expect(statuses['LandSpace lands Zhuque-3']).toBe('pending_review');
    expect(body.autoPublished).toBe(1);
    expect(body.pendingReview).toBe(1);
  });

  it('publishes a minor_issues article alongside a major_issues sibling', async () => {
    // The 2026-08-19 shape.
    queueRun(
      ['Where will the space economy stand by 2035', 'Zhuque-3 second flight'],
      [
        { overallVerdict: 'minor_issues', notes: 'Internally consistent and well-sourced.', corrections: [] },
        { overallVerdict: 'major_issues', notes: 'Fabricated launch cadence figure.', corrections: ['Fix cadence'] },
      ]
    );

    const { body } = await runGenerate();
    const statuses = writtenStatuses();
    const notes = writtenNotes();

    expect(statuses['Where will the space economy stand by 2035']).toBe('published');
    expect(notes['Where will the space economy stand by 2035']).toContain('Minor notes:');
    expect(statuses['Zhuque-3 second flight']).toBe('pending_review');
    expect(notes['Zhuque-3 second flight']).toContain('MAJOR ISSUES:');
    expect(body.autoPublished).toBe(1);
  });

  it('never writes pending_review without a MAJOR ISSUES note', async () => {
    queueRun(
      ['Article one', 'Article two'],
      [
        { overallVerdict: 'minor_issues', notes: 'Small gap.', corrections: [] },
        { overallVerdict: 'major_issues', notes: 'Wrong company named.', corrections: [] },
      ]
    );
    await runGenerate();

    for (const call of mockPrisma.aIInsight.upsert.mock.calls) {
      const { status, factCheckNote } = call[0].create;
      expect(status === 'pending_review').toBe(String(factCheckNote).startsWith('MAJOR ISSUES:'));
      // create and update branches must agree — a divergence is how a row
      // ends up held while carrying a passing note.
      expect(call[0].update.status).toBe(status);
      expect(call[0].update.factCheckNote).toBe(factCheckNote);
    }
  });

  it('retries a transient fact-check failure once and publishes on success', async () => {
    queueRun(
      ['Transient hiccup article'],
      [
        new Error('529 overloaded_error'), // attempt 1 fails
        { overallVerdict: 'pass', notes: 'Verified against sources.', corrections: [] }, // attempt 2 succeeds
      ]
    );

    await runGenerate();
    const statuses = writtenStatuses();

    expect(statuses['Transient hiccup article']).toBe('published');
    // 1 generation call + 2 fact-check attempts
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });

  it('still fails closed when both fact-check attempts fail, recording both', async () => {
    queueRun(
      ['Doubly unlucky article'],
      [new Error('connection reset'), new Error('529 overloaded_error')]
    );

    await runGenerate();
    const statuses = writtenStatuses();
    const notes = writtenNotes();

    expect(statuses['Doubly unlucky article']).toBe('pending_review');
    expect(notes['Doubly unlucky article']).toContain('MAJOR ISSUES:');
    expect(notes['Doubly unlucky article']).toContain('retried once');
    expect(notes['Doubly unlucky article']).toContain('connection reset');
    expect(mockMessagesCreate).toHaveBeenCalledTimes(3);
  });

  it('retries when the fact-check returns no text block', async () => {
    queueRun(
      ['Empty response article'],
      [null, { overallVerdict: 'pass', notes: 'Fine.', corrections: [] }]
    );

    await runGenerate();
    expect(writtenStatuses()['Empty response article']).toBe('published');
  });

  it('releases mis-held rows on every invocation, including the lock-skip path', async () => {
    // Simulate an article held with a passing note (the live defect shape).
    mockPrisma.aIInsight.findMany.mockResolvedValueOnce([
      { id: 'row-1', slug: 'misheld-slug', factCheckNote: 'Minor notes: well-sourced.' },
    ]);
    mockPrisma.aIInsight.updateMany.mockResolvedValueOnce({ count: 1 });
    // Lock already held -> the run bails early.
    mockPrisma.dynamicContent.create.mockRejectedValueOnce(new Error('unique constraint'));

    const { body } = await runGenerate();

    expect(body.skipped).toBe(true);
    expect(body.releasedMisheld).toBe(1);
    expect(mockPrisma.aIInsight.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['row-1'] } },
      data: { status: 'published' },
    });
  });
});
