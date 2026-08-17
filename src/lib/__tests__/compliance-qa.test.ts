/**
 * @jest-environment node
 *
 * Tests for src/lib/compliance-qa.ts — the Export Compliance Q&A: ask-form
 * validation, founder-notification email composition + retry pass, fail-soft
 * behavior while the ComplianceQuestion table is missing, the admin
 * publish/draft/archive state transitions, and FAQPage JSON-LD. Resend is
 * always mocked — no real email can ever be sent from tests.
 */

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
      update: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import {
  COMPLIANCE_QA_NOTIFY_EMAIL,
  COMPLIANCE_QUESTION_MAX_LENGTH,
  __resetComplianceQaAvailability,
  applyAnswerAction,
  buildFaqJsonLd,
  complianceQuestionSchema,
  composeAskerAnsweredEmail,
  composeNewQuestionEmail,
  createComplianceQuestion,
  getPublishedComplianceQA,
  isComplianceQaAdminAction,
  notifyPendingQuestions,
  sendAskerAnsweredEmail,
} from '@/lib/compliance-qa';

const mockPrisma = prisma as unknown as {
  complianceQuestion: {
    count: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
};

const ORIGINAL_ENV = { ...process.env };

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
// Schema validation
// ---------------------------------------------------------------------------

describe('complianceQuestionSchema', () => {
  const valid = {
    question: 'Does a CubeSat star tracker fall under ECCN 9A515 or is it ITAR-controlled?',
    askerName: 'Jane Engineer',
    askerEmail: 'jane@example.com',
    website: '',
  };

  it('accepts a fully-populated valid submission', () => {
    const result = complianceQuestionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.askerEmail).toBe('jane@example.com');
      expect(result.data.askerName).toBe('Jane Engineer');
    }
  });

  it('accepts an anonymous question (name and email optional)', () => {
    const result = complianceQuestionSchema.safeParse({ question: valid.question });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.askerName).toBeUndefined();
      expect(result.data.askerEmail).toBeUndefined();
    }
  });

  it('normalizes empty-string name/email to undefined', () => {
    const result = complianceQuestionSchema.safeParse({ ...valid, askerName: '', askerEmail: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.askerName).toBeUndefined();
      expect(result.data.askerEmail).toBeUndefined();
    }
  });

  it('lowercases the asker email', () => {
    const result = complianceQuestionSchema.safeParse({ ...valid, askerEmail: 'Jane@Example.COM' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.askerEmail).toBe('jane@example.com');
  });

  it('rejects malformed emails', () => {
    expect(complianceQuestionSchema.safeParse({ ...valid, askerEmail: 'not-an-email' }).success).toBe(false);
  });

  it('requires at least 10 characters and caps at the max length', () => {
    expect(complianceQuestionSchema.safeParse({ question: 'too short' }).success).toBe(false);
    expect(
      complianceQuestionSchema.safeParse({ question: 'a'.repeat(COMPLIANCE_QUESTION_MAX_LENGTH + 1) }).success
    ).toBe(false);
    expect(
      complianceQuestionSchema.safeParse({ question: 'a'.repeat(COMPLIANCE_QUESTION_MAX_LENGTH) }).success
    ).toBe(true);
  });

  it('strips HTML tags from the question', () => {
    const result = complianceQuestionSchema.safeParse({
      question: 'Is <script>alert(1)</script> my satellite bus EAR99 or 9A515.x controlled?',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.question).not.toContain('<script>');
  });

  it('passes the honeypot value through for the route to inspect', () => {
    const result = complianceQuestionSchema.safeParse({ ...valid, website: 'http://spam.example' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBe('http://spam.example');
  });
});

// ---------------------------------------------------------------------------
// Founder notification email
// ---------------------------------------------------------------------------

describe('composeNewQuestionEmail', () => {
  it('targets the compliance-specific founder address (NOT FOUNDER_EMAIL)', () => {
    expect(COMPLIANCE_QA_NOTIFY_EMAIL).toBe('jgriffiths74@gmail.com');
  });

  it('uses the exact requested subject and includes question, asker, and admin link', () => {
    const email = composeNewQuestionEmail({
      id: 'q1',
      question: 'Can I export a flight computer to a Canadian subsidiary?',
      askerName: 'Sam',
      askerEmail: 'sam@example.com',
      createdAt: new Date('2026-08-17T12:00:00Z'),
    });
    expect(email.subject).toBe('New export-compliance question');
    expect(email.text).toContain('Can I export a flight computer to a Canadian subsidiary?');
    expect(email.text).toContain('Sam <sam@example.com>');
    expect(email.text).toContain('/admin?tab=compliance-qa');
    expect(email.html).toContain('/admin?tab=compliance-qa');
  });

  it('handles anonymous askers and escapes HTML in the question', () => {
    const email = composeNewQuestionEmail({ id: 'q2', question: 'Is <b>this</b> & that controlled? More context here.' });
    expect(email.text).toContain('Anonymous (no contact left)');
    expect(email.html).toContain('&lt;b&gt;');
    expect(email.html).not.toContain('<b>this</b>');
  });
});

describe('notifyPendingQuestions', () => {
  const pendingRow = {
    id: 'q1',
    question: 'Does my ground-station software need an export license for EU customers?',
    askerName: null,
    askerEmail: null,
    createdAt: new Date('2026-08-17T00:00:00Z'),
  };

  it('skips entirely (no DB touch) when RESEND_API_KEY is not configured', async () => {
    const result = await notifyPendingQuestions();
    expect(result.sent).toBe(0);
    expect(result.skippedReason).toBe('RESEND_API_KEY not configured');
    expect(mockPrisma.complianceQuestion.findMany).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('sends for every un-notified new question and stamps notifiedAt on success', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.complianceQuestion.count.mockResolvedValue(0);
    mockPrisma.complianceQuestion.findMany.mockResolvedValue([
      pendingRow,
      { ...pendingRow, id: 'q2', question: 'Second question that previously failed to notify?' },
    ]);
    mockPrisma.complianceQuestion.update.mockResolvedValue({});
    mockResendSend.mockResolvedValue({ error: null });

    const result = await notifyPendingQuestions();
    expect(result).toEqual({ attempted: 2, sent: 2 });
    expect(mockResendSend).toHaveBeenCalledTimes(2);
    expect(mockResendSend.mock.calls[0][0].to).toBe(COMPLIANCE_QA_NOTIFY_EMAIL);
    expect(mockResendSend.mock.calls[0][0].subject).toBe('New export-compliance question');
    // notifiedAt stamped for both
    expect(mockPrisma.complianceQuestion.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.complianceQuestion.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'q1' },
      data: { notifiedAt: expect.any(Date) },
    });
    // Only un-notified 'new' rows are queried — the retry mechanism
    expect(mockPrisma.complianceQuestion.findMany.mock.calls[0][0].where).toEqual({
      status: 'new',
      notifiedAt: null,
    });
  });

  it('leaves notifiedAt null when the send fails (retried on next submission), never throws', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.complianceQuestion.count.mockResolvedValue(0);
    mockPrisma.complianceQuestion.findMany.mockResolvedValue([pendingRow]);
    mockResendSend.mockResolvedValue({ error: { message: 'rate limited' } });

    const result = await notifyPendingQuestions();
    expect(result).toEqual({ attempted: 1, sent: 0 });
    expect(mockPrisma.complianceQuestion.update).not.toHaveBeenCalled();
  });

  it('fails soft when the table is unavailable', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.complianceQuestion.count.mockRejectedValue(new Error('relation does not exist'));
    const result = await notifyPendingQuestions();
    expect(result.sent).toBe(0);
    expect(result.skippedReason).toBe('table unavailable');
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fail-soft storage (table may not be migrated yet)
// ---------------------------------------------------------------------------

describe('fail-soft behavior while the ComplianceQuestion table is absent', () => {
  it('createComplianceQuestion returns null (never throws) when the probe fails', async () => {
    mockPrisma.complianceQuestion.count.mockRejectedValue(new Error('relation does not exist'));
    const stored = await createComplianceQuestion({ question: 'A perfectly valid question about ITAR?' });
    expect(stored).toBeNull();
    expect(mockPrisma.complianceQuestion.create).not.toHaveBeenCalled();
  });

  it('createComplianceQuestion returns null when the insert itself fails', async () => {
    mockPrisma.complianceQuestion.count.mockResolvedValue(0);
    mockPrisma.complianceQuestion.create.mockRejectedValue(new Error('boom'));
    const stored = await createComplianceQuestion({ question: 'A perfectly valid question about ITAR?' });
    expect(stored).toBeNull();
  });

  it('createComplianceQuestion stores and returns the row when available', async () => {
    mockPrisma.complianceQuestion.count.mockResolvedValue(0);
    const row = {
      id: 'q1',
      question: 'Q?',
      askerName: null,
      askerEmail: 'a@b.com',
      status: 'new',
      createdAt: new Date(),
    };
    mockPrisma.complianceQuestion.create.mockResolvedValue(row);
    const stored = await createComplianceQuestion({ question: 'Q?', askerEmail: 'a@b.com' });
    expect(stored).toEqual(row);
    expect(mockPrisma.complianceQuestion.create.mock.calls[0][0].data.status).toBe('new');
  });

  it('getPublishedComplianceQA fails soft to []', async () => {
    mockPrisma.complianceQuestion.findMany.mockRejectedValue(new Error('relation does not exist'));
    expect(await getPublishedComplianceQA()).toEqual([]);
  });

  it('getPublishedComplianceQA returns only published+answered rows, newest first', async () => {
    const rows = [
      { id: 'a', question: 'Q1', answer: 'A1', answeredAt: new Date('2026-08-16') },
      { id: 'b', question: 'Q2', answer: 'A2', answeredAt: new Date('2026-08-10') },
    ];
    mockPrisma.complianceQuestion.findMany.mockResolvedValue(rows);
    const items = await getPublishedComplianceQA();
    expect(items).toHaveLength(2);
    const where = mockPrisma.complianceQuestion.findMany.mock.calls[0][0].where;
    expect(where.published).toBe(true);
    expect(where.status).toBe('answered');
    expect(mockPrisma.complianceQuestion.findMany.mock.calls[0][0].orderBy).toEqual({ answeredAt: 'desc' });
  });
});

// ---------------------------------------------------------------------------
// Admin answer flow (publish / draft / archive)
// ---------------------------------------------------------------------------

describe('applyAnswerAction (publish flow state transitions)', () => {
  const now = new Date('2026-08-17T15:00:00Z');

  it('publish sets answer, answeredAt, status answered, published true', () => {
    const { data, shouldNotifyAsker } = applyAnswerAction(
      'publish',
      'General information: 9A515 covers most commercial satellite buses…',
      { published: false, askerEmail: 'a@b.com' },
      now
    );
    expect(data).toEqual({
      answer: 'General information: 9A515 covers most commercial satellite buses…',
      answeredAt: now,
      status: 'answered',
      published: true,
    });
    expect(shouldNotifyAsker).toBe(true);
  });

  it('first publish without an asker email sends no courtesy email', () => {
    const { shouldNotifyAsker } = applyAnswerAction('publish', 'Answer.', { published: false, askerEmail: null }, now);
    expect(shouldNotifyAsker).toBe(false);
  });

  it('re-publishing an already-published answer updates text without a second courtesy email', () => {
    const { data, shouldNotifyAsker } = applyAnswerAction(
      'publish',
      'Edited answer.',
      { published: true, askerEmail: 'a@b.com' },
      now
    );
    expect(data.published).toBe(true);
    expect(data.answer).toBe('Edited answer.');
    expect(shouldNotifyAsker).toBe(false);
  });

  it('draft saves the answer without touching status or published', () => {
    const { data, shouldNotifyAsker } = applyAnswerAction('draft', 'Work in progress…', {
      published: false,
      askerEmail: 'a@b.com',
    });
    expect(data).toEqual({ answer: 'Work in progress…' });
    expect(shouldNotifyAsker).toBe(false);
  });

  it('archive sets status archived and unpublishes', () => {
    const { data, shouldNotifyAsker } = applyAnswerAction('archive', undefined, {
      published: true,
      askerEmail: 'a@b.com',
    });
    expect(data).toEqual({ status: 'archived', published: false });
    expect(shouldNotifyAsker).toBe(false);
  });

  it('isComplianceQaAdminAction guards the action strings', () => {
    expect(isComplianceQaAdminAction('publish')).toBe(true);
    expect(isComplianceQaAdminAction('draft')).toBe(true);
    expect(isComplianceQaAdminAction('archive')).toBe(true);
    expect(isComplianceQaAdminAction('delete')).toBe(false);
    expect(isComplianceQaAdminAction(undefined)).toBe(false);
  });
});

describe('asker courtesy email', () => {
  it('composeAskerAnsweredEmail links the public Q&A and repeats the disclaimer', () => {
    const email = composeAskerAnsweredEmail({ question: 'My question?', askerName: 'Sam' });
    expect(email.subject).toBe('Your export-compliance question has been answered');
    expect(email.text).toContain('/export-compliance-qa');
    expect(email.text).toContain('not legal advice');
    expect(email.text).toContain('Hi Sam,');
  });

  it('sendAskerAnsweredEmail no-ops without an email or without RESEND_API_KEY', async () => {
    expect(await sendAskerAnsweredEmail({ id: 'q1', question: 'Q?', askerEmail: null })).toEqual({
      sent: false,
      reason: 'no asker email',
    });
    expect(await sendAskerAnsweredEmail({ id: 'q1', question: 'Q?', askerEmail: 'a@b.com' })).toEqual({
      sent: false,
      reason: 'RESEND_API_KEY not configured',
    });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('sendAskerAnsweredEmail sends to the asker when configured', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockResendSend.mockResolvedValue({ error: null });
    const result = await sendAskerAnsweredEmail({ id: 'q1', question: 'Q?', askerEmail: 'a@b.com', askerName: 'A' });
    expect(result.sent).toBe(true);
    expect(mockResendSend.mock.calls[0][0].to).toBe('a@b.com');
  });
});

// ---------------------------------------------------------------------------
// FAQPage JSON-LD
// ---------------------------------------------------------------------------

describe('buildFaqJsonLd', () => {
  it('produces schema.org FAQPage structured data from published Q&A items', () => {
    const jsonLd = buildFaqJsonLd([
      { question: 'Is EAR99 license-free?', answer: 'Generally yes, with exceptions…' },
      { question: 'What is 9A515?', answer: 'The commercial-satellite ECCN series.' },
    ]);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('FAQPage');
    const mainEntity = jsonLd.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity).toHaveLength(2);
    expect(mainEntity[0]['@type']).toBe('Question');
    expect(mainEntity[0].name).toBe('Is EAR99 license-free?');
    expect((mainEntity[0].acceptedAnswer as Record<string, unknown>).text).toBe('Generally yes, with exceptions…');
  });
});
