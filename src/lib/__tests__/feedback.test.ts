/**
 * Tests for src/lib/feedback.ts — questionnaire validation, status flow, and
 * the capped founder-notification email (Resend always mocked; no real email
 * can ever be sent from tests).
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

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FEEDBACK_DAILY_NOTIFICATION_CAP,
  feedbackSubmissionSchema,
  isFeedbackStatus,
  shouldSendIndividualNotification,
  sendFeedbackNotificationEmail,
} from '@/lib/feedback';
import { FOUNDER_EMAIL } from '@/lib/constants';

describe('feedbackSubmissionSchema', () => {
  const valid = {
    category: 'bug',
    message: 'The jobs board filter resets when I paginate.',
    page: '/space-talent',
    email: 'user@example.com',
  };

  it('accepts a fully-populated valid submission', () => {
    const result = feedbackSubmissionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('bug');
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it.each(FEEDBACK_CATEGORIES)('accepts category "%s"', (category) => {
    expect(feedbackSubmissionSchema.safeParse({ ...valid, category }).success).toBe(true);
  });

  it('rejects unknown categories (including legacy /feedback ids)', () => {
    for (const category of ['feature', 'ui', 'game', 'other', '', 'BUG']) {
      expect(feedbackSubmissionSchema.safeParse({ ...valid, category }).success).toBe(false);
    }
  });

  it('requires a message of at least 5 characters and caps at 5000', () => {
    expect(feedbackSubmissionSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false);
    expect(feedbackSubmissionSchema.safeParse({ ...valid, message: 'a'.repeat(5001) }).success).toBe(false);
    expect(feedbackSubmissionSchema.safeParse({ ...valid, message: 'a'.repeat(5000) }).success).toBe(true);
  });

  it('strips HTML tags from the message', () => {
    const result = feedbackSubmissionSchema.safeParse({
      ...valid,
      message: 'Broken <script>alert(1)</script> button on <b>this</b> page',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).not.toContain('<script>');
      expect(result.data.message).not.toContain('<b>');
      expect(result.data.message).toContain('button on');
    }
  });

  it('treats an empty email string as undefined and rejects invalid emails', () => {
    const empty = feedbackSubmissionSchema.safeParse({ ...valid, email: '' });
    expect(empty.success).toBe(true);
    if (empty.success) expect(empty.data.email).toBeUndefined();

    const omitted = feedbackSubmissionSchema.safeParse({ category: 'idea', message: 'More launch data please' });
    expect(omitted.success).toBe(true);

    expect(feedbackSubmissionSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an over-long page path', () => {
    expect(feedbackSubmissionSchema.safeParse({ ...valid, page: '/x'.repeat(300) }).success).toBe(false);
  });
});

describe('status flow', () => {
  it('recognises exactly the three triage statuses', () => {
    expect(FEEDBACK_STATUSES).toEqual(['new', 'reviewed', 'actioned']);
    for (const s of FEEDBACK_STATUSES) expect(isFeedbackStatus(s)).toBe(true);
    expect(isFeedbackStatus('archived')).toBe(false);
    expect(isFeedbackStatus('')).toBe(false);
    expect(isFeedbackStatus(null)).toBe(false);
    expect(isFeedbackStatus(3)).toBe(false);
  });
});

describe('shouldSendIndividualNotification', () => {
  it('sends for the first N submissions of the day and stops past the cap', () => {
    for (let n = 1; n <= FEEDBACK_DAILY_NOTIFICATION_CAP; n++) {
      expect(shouldSendIndividualNotification(n)).toBe(true);
    }
    expect(shouldSendIndividualNotification(FEEDBACK_DAILY_NOTIFICATION_CAP + 1)).toBe(false);
    expect(shouldSendIndividualNotification(100)).toBe(false);
  });
});

describe('sendFeedbackNotificationEmail', () => {
  const payload = {
    id: 'fb-1',
    category: 'bug',
    message: 'Something broke',
    page: '/markets',
    email: 'user@example.com',
    userId: null,
    submissionNumberToday: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  });

  afterAll(() => {
    delete process.env.RESEND_API_KEY;
  });

  it('no-ops when RESEND_API_KEY is not configured', async () => {
    const result = await sendFeedbackNotificationEmail(payload);
    expect(result.sent).toBe(false);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('sends to the founder inbox when configured and under the cap', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const result = await sendFeedbackNotificationEmail(payload);
    expect(result.sent).toBe(true);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const args = mockResendSend.mock.calls[0][0];
    expect(args.to).toBe(FOUNDER_EMAIL);
    expect(args.subject).toContain('bug');
    expect(args.text).toContain('Something broke');
  });

  it('skips the individual email once the daily cap is exceeded', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const result = await sendFeedbackNotificationEmail({
      ...payload,
      submissionNumberToday: FEEDBACK_DAILY_NOTIFICATION_CAP + 1,
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toContain('cap');
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('never throws when Resend errors', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockResendSend.mockRejectedValueOnce(new Error('network down'));
    await expect(sendFeedbackNotificationEmail(payload)).resolves.toMatchObject({ sent: false });
  });
});
