/**
 * @jest-environment node
 *
 * Route handler tests for the Export Compliance Q&A:
 *   - POST /api/compliance/questions  (public ask form — store first, notify second)
 *   - GET  /api/compliance/questions  (published FAQ list, fail-soft)
 *   - PATCH /api/admin/compliance-qa/[id]  (founder publish/draft/archive flow)
 *
 * Resend and Prisma are always mocked — no real email, no real DB.
 */

import { NextRequest } from 'next/server';

const mockResendSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    complianceQuestion: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { __resetComplianceQaAvailability } from '@/lib/compliance-qa';
import { POST as questionsPOST, GET as questionsGET } from '@/app/api/compliance/questions/route';
import { PATCH as adminPATCH } from '@/app/api/admin/compliance-qa/[id]/route';

const mockPrisma = prisma as unknown as {
  complianceQuestion: {
    count: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const mockGetServerSession = getServerSession as jest.Mock;

const ORIGINAL_ENV = { ...process.env };

function postRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/compliance/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchRequest(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/admin/compliance-qa/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_QUESTION = 'Does a CubeSat star tracker fall under ECCN 9A515 or ITAR Category XV?';

beforeEach(() => {
  jest.clearAllMocks();
  __resetComplianceQaAvailability();
  process.env = { ...ORIGINAL_ENV };
  delete process.env.RESEND_API_KEY;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

// ---------------------------------------------------------------------------
// POST /api/compliance/questions
// ---------------------------------------------------------------------------

describe('POST /api/compliance/questions', () => {
  it('rejects an invalid (too short) question with a 400', async () => {
    const res = await questionsPOST(postRequest({ question: 'short' }));
    expect(res.status).toBe(400);
    expect(mockPrisma.complianceQuestion.create).not.toHaveBeenCalled();
  });

  it('silently drops honeypot submissions (201, nothing stored, no email)', async () => {
    const res = await questionsPOST(
      postRequest({ question: VALID_QUESTION, website: 'http://spam.example' })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockPrisma.complianceQuestion.create).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('stores the question and returns 201 even when the email cannot be sent (no key)', async () => {
    mockPrisma.complianceQuestion.count.mockResolvedValue(0);
    mockPrisma.complianceQuestion.create.mockResolvedValue({
      id: 'q1',
      question: VALID_QUESTION,
      askerName: null,
      askerEmail: null,
      status: 'new',
      createdAt: new Date(),
    });

    const res = await questionsPOST(postRequest({ question: VALID_QUESTION }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.questionId).toBe('q1');
    // Store-first invariant: stored despite no RESEND_API_KEY
    expect(mockPrisma.complianceQuestion.create).toHaveBeenCalledTimes(1);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('stores first, then notifies the founder (including earlier un-notified questions)', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.complianceQuestion.count.mockResolvedValue(0);
    mockPrisma.complianceQuestion.create.mockResolvedValue({
      id: 'q2',
      question: VALID_QUESTION,
      askerName: 'Sam',
      askerEmail: 'sam@example.com',
      status: 'new',
      createdAt: new Date(),
    });
    // The pending pass picks up an OLDER un-notified question plus the new one
    mockPrisma.complianceQuestion.findMany.mockResolvedValue([
      { id: 'q-old', question: 'Older question that never got its email?', askerName: null, askerEmail: null, createdAt: new Date() },
      { id: 'q2', question: VALID_QUESTION, askerName: 'Sam', askerEmail: 'sam@example.com', createdAt: new Date() },
    ]);
    mockPrisma.complianceQuestion.update.mockResolvedValue({});
    mockResendSend.mockResolvedValue({ error: null });

    const res = await questionsPOST(
      postRequest({ question: VALID_QUESTION, askerName: 'Sam', askerEmail: 'sam@example.com' })
    );
    expect(res.status).toBe(201);
    expect(mockResendSend).toHaveBeenCalledTimes(2);
    expect(mockResendSend.mock.calls[0][0].to).toBe('jgriffiths74@gmail.com');
    expect(mockResendSend.mock.calls[0][0].subject).toBe('New export-compliance question');
  });

  it('returns 503 (honest, no false confirmation) when the table is not migrated yet', async () => {
    mockPrisma.complianceQuestion.count.mockRejectedValue(new Error('relation does not exist'));
    const res = await questionsPOST(postRequest({ question: VALID_QUESTION }));
    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// GET /api/compliance/questions
// ---------------------------------------------------------------------------

describe('GET /api/compliance/questions', () => {
  it('returns the published items with ISO dates', async () => {
    mockPrisma.complianceQuestion.findMany.mockResolvedValue([
      { id: 'a', question: 'Q1', answer: 'A1', answeredAt: new Date('2026-08-16T00:00:00Z') },
    ]);
    const res = await questionsGET();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.items).toEqual([
      { id: 'a', question: 'Q1', answer: 'A1', answeredAt: '2026-08-16T00:00:00.000Z' },
    ]);
  });

  it('fails soft to an empty list when the table is missing', async () => {
    mockPrisma.complianceQuestion.findMany.mockRejectedValue(new Error('relation does not exist'));
    const res = await questionsGET();
    const json = await res.json();
    expect(json.data.items).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/compliance-qa/[id]
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/compliance-qa/[id]', () => {
  const params = { params: Promise.resolve({ id: 'q1' }) };
  const existingRow = {
    id: 'q1',
    question: VALID_QUESTION,
    askerName: 'Sam',
    askerEmail: 'sam@example.com',
    published: false,
  };

  it('requires an authenticated admin', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await adminPATCH(patchRequest('q1', { action: 'publish', answer: 'A.' }), params);
    expect(res.status).toBe(401);

    mockGetServerSession.mockResolvedValue({ user: { id: 'u1', isAdmin: false } });
    const res2 = await adminPATCH(patchRequest('q1', { action: 'publish', answer: 'A.' }), params);
    expect(res2.status).toBe(403);
    expect(mockPrisma.complianceQuestion.update).not.toHaveBeenCalled();
  });

  it('rejects unknown actions and publishing without an answer', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin', isAdmin: true } });
    expect((await adminPATCH(patchRequest('q1', { action: 'delete' }), params)).status).toBe(400);
    expect((await adminPATCH(patchRequest('q1', { action: 'publish', answer: '' }), params)).status).toBe(400);
  });

  it('publish updates the row and sends the courtesy email on first publish', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin', isAdmin: true } });
    mockPrisma.complianceQuestion.findUnique.mockResolvedValue(existingRow);
    mockPrisma.complianceQuestion.update.mockResolvedValue({ ...existingRow, published: true, status: 'answered' });
    mockResendSend.mockResolvedValue({ error: null });

    const res = await adminPATCH(
      patchRequest('q1', { action: 'publish', answer: 'General information: usually 9A515…' }),
      params
    );
    expect(res.status).toBe(200);
    const updateArgs = mockPrisma.complianceQuestion.update.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 'q1' });
    expect(updateArgs.data).toMatchObject({
      answer: 'General information: usually 9A515…',
      status: 'answered',
      published: true,
      answeredAt: expect.any(Date),
    });
    // Courtesy email to the asker (first publish + email present)
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    expect(mockResendSend.mock.calls[0][0].to).toBe('sam@example.com');
  });

  it('re-publish (already published) does not send a second courtesy email', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin', isAdmin: true } });
    mockPrisma.complianceQuestion.findUnique.mockResolvedValue({ ...existingRow, published: true });
    mockPrisma.complianceQuestion.update.mockResolvedValue({});
    const res = await adminPATCH(patchRequest('q1', { action: 'publish', answer: 'Edited.' }), params);
    expect(res.status).toBe(200);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('draft saves the answer without publishing; archive unpublishes', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin', isAdmin: true } });
    mockPrisma.complianceQuestion.findUnique.mockResolvedValue(existingRow);
    mockPrisma.complianceQuestion.update.mockResolvedValue({});

    await adminPATCH(patchRequest('q1', { action: 'draft', answer: 'WIP…' }), params);
    expect(mockPrisma.complianceQuestion.update.mock.calls[0][0].data).toEqual({ answer: 'WIP…' });

    await adminPATCH(patchRequest('q1', { action: 'archive' }), params);
    expect(mockPrisma.complianceQuestion.update.mock.calls[1][0].data).toEqual({
      status: 'archived',
      published: false,
    });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('404s for a missing question (and when the table is absent)', async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'admin', isAdmin: true } });
    mockPrisma.complianceQuestion.findUnique.mockResolvedValue(null);
    expect((await adminPATCH(patchRequest('q1', { action: 'draft', answer: 'x' }), params)).status).toBe(404);

    mockPrisma.complianceQuestion.findUnique.mockRejectedValue(new Error('relation does not exist'));
    expect((await adminPATCH(patchRequest('q1', { action: 'draft', answer: 'x' }), params)).status).toBe(404);
  });
});
