/**
 * @jest-environment node
 */

/**
 * API route handler tests for newsletter endpoints:
 *   - POST /api/newsletter/subscribe          (new subscription, validation, re-subscribe)
 *   - GET  /api/newsletter/verify             (verify via token, redirects)
 *   - GET  /api/newsletter/unsubscribe        (unsubscribe via link, redirects)
 *   - POST /api/newsletter/unsubscribe        (RFC 8058 one-click unsubscribe)
 *   - GET  /api/newsletter/status             (admin-only subscriber stats)
 *   - POST /api/newsletter/resend-verification (resend verification email)
 *
 * Validates email validation, token handling, idempotency, authorization,
 * email sending, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    newsletterSubscriber: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    dailyDigest: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/newsletter/email-service', () => ({
  sendVerificationEmail: jest.fn(),
}));

jest.mock('@/lib/newsletter/email-templates', () => ({
  renderVerificationEmail: jest.fn().mockReturnValue({
    html: '<html>verify</html>',
    plain: 'verify',
    subject: 'Verify your email',
  }),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { sendVerificationEmail } from '@/lib/newsletter/email-service';

import { POST as subscribePOST } from '@/app/api/newsletter/subscribe/route';
import { GET as verifyGET } from '@/app/api/newsletter/verify/route';
import { GET as unsubscribeGET, POST as unsubscribePOST } from '@/app/api/newsletter/unsubscribe/route';
import { GET as statusGET } from '@/app/api/newsletter/status/route';
import { POST as resendVerificationPOST } from '@/app/api/newsletter/resend-verification/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockSendVerificationEmail = sendVerificationEmail as jest.MockedFunction<typeof sendVerificationEmail>;

function makeSubscriber(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    email: 'test@example.com',
    name: 'Test User',
    verified: false,
    verifiedAt: null,
    verificationToken: 'verify-token-abc',
    unsubscribeToken: 'unsub-token-xyz',
    unsubscribedAt: null,
    source: 'website',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  };
}

function makeSubscribeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeResendVerificationRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/newsletter/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeUnsubscribePostRequest(url: string, body?: string, contentType?: string) {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: body || undefined,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
});

// =============================================================================
// POST /api/newsletter/subscribe
// =============================================================================

describe('POST /api/newsletter/subscribe', () => {
  it('creates a new subscriber and sends verification email', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.newsletterSubscriber.create as jest.Mock).mockResolvedValue(makeSubscriber());
    mockSendVerificationEmail.mockResolvedValue({ success: true });

    const req = makeSubscribeRequest({ email: 'new@example.com', name: 'New User' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.emailSent).toBe(true);
    expect(body.message).toContain('Verification email sent');
    expect(mockPrisma.newsletterSubscriber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          name: 'New User',
          source: 'website',
        }),
      })
    );
    expect(mockSendVerificationEmail).toHaveBeenCalled();
  });

  it('accepts subscription without a name', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.newsletterSubscriber.create as jest.Mock).mockResolvedValue(makeSubscriber({ name: null }));
    mockSendVerificationEmail.mockResolvedValue({ success: true });

    const req = makeSubscribeRequest({ email: 'noname@example.com' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.newsletterSubscriber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: null,
        }),
      })
    );
  });

  it('uses custom source when provided', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.newsletterSubscriber.create as jest.Mock).mockResolvedValue(makeSubscriber());
    mockSendVerificationEmail.mockResolvedValue({ success: true });

    const req = makeSubscribeRequest({ email: 'src@example.com', source: 'footer' });
    const res = await subscribePOST(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.newsletterSubscriber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'footer' }),
      })
    );
  });

  it('rejects missing email', async () => {
    const req = makeSubscribeRequest({ name: 'No Email' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(mockPrisma.newsletterSubscriber.findUnique).not.toHaveBeenCalled();
  });

  it('rejects invalid email format', async () => {
    const req = makeSubscribeRequest({ email: 'not-an-email' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 409 when email is already subscribed and verified', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(
      makeSubscriber({ verified: true, verifiedAt: new Date() })
    );

    const req = makeSubscribeRequest({ email: 'test@example.com' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('ALREADY_SUBSCRIBED');
    expect(mockPrisma.newsletterSubscriber.create).not.toHaveBeenCalled();
  });

  it('resends verification for existing unverified subscriber', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(
      makeSubscriber({ verified: false })
    );
    (mockPrisma.newsletterSubscriber.update as jest.Mock).mockResolvedValue(makeSubscriber());
    mockSendVerificationEmail.mockResolvedValue({ success: true });

    const req = makeSubscribeRequest({ email: 'test@example.com' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Verification email sent');
    expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalled();
    expect(mockSendVerificationEmail).toHaveBeenCalled();
    expect(mockPrisma.newsletterSubscriber.create).not.toHaveBeenCalled();
  });

  it('allows re-subscription for previously unsubscribed email', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(
      makeSubscriber({ verified: true, unsubscribedAt: new Date('2026-01-10') })
    );
    (mockPrisma.newsletterSubscriber.update as jest.Mock).mockResolvedValue(makeSubscriber());
    mockSendVerificationEmail.mockResolvedValue({ success: true });

    const req = makeSubscribeRequest({ email: 'test@example.com' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verified: false,
          unsubscribedAt: null,
          verifiedAt: null,
        }),
      })
    );
  });

  it('returns success with emailSent=false when email service fails for new subscriber', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.newsletterSubscriber.create as jest.Mock).mockResolvedValue(makeSubscriber());
    mockSendVerificationEmail.mockResolvedValue({ success: false, error: 'SMTP error' });

    const req = makeSubscribeRequest({ email: 'new@example.com' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.emailSent).toBe(false);
  });

  it('returns 500 when database throws', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockRejectedValue(
      new Error('DB connection lost')
    );

    const req = makeSubscribeRequest({ email: 'fail@example.com' });
    const res = await subscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

// =============================================================================
// GET /api/newsletter/verify
// =============================================================================

describe('GET /api/newsletter/verify', () => {
  it('verifies subscriber and redirects to success page', async () => {
    const subscriber = makeSubscriber({ verified: false });
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(subscriber);
    (mockPrisma.newsletterSubscriber.update as jest.Mock).mockResolvedValue(
      makeSubscriber({ verified: true, verifiedAt: new Date() })
    );

    const req = new NextRequest('http://localhost/api/newsletter/verify?token=verify-token-abc');
    const res = await verifyGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('newsletter=verified');
    expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verified: true,
          verificationToken: null,
        }),
      })
    );
  });

  it('redirects with missing_token when no token provided', async () => {
    const req = new NextRequest('http://localhost/api/newsletter/verify');
    const res = await verifyGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('reason=missing_token');
    expect(mockPrisma.newsletterSubscriber.findUnique).not.toHaveBeenCalled();
  });

  it('redirects with invalid_token when token not found in DB', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/newsletter/verify?token=nonexistent-token');
    const res = await verifyGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('reason=invalid_token');
    expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
  });

  it('redirects with already_verified for already-verified subscriber', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(
      makeSubscriber({ verified: true, verifiedAt: new Date() })
    );

    const req = new NextRequest('http://localhost/api/newsletter/verify?token=verify-token-abc');
    const res = await verifyGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('newsletter=already_verified');
    expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
  });

  it('looks up subscriber by verificationToken field', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/newsletter/verify?token=my-special-token');
    await verifyGET(req);

    expect(mockPrisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
      where: { verificationToken: 'my-special-token' },
    });
  });

  it('redirects with server_error when database throws', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockRejectedValue(
      new Error('DB failure')
    );

    const req = new NextRequest('http://localhost/api/newsletter/verify?token=some-token');
    const res = await verifyGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('reason=server_error');
  });
});

// =============================================================================
// GET /api/newsletter/unsubscribe (link-based)
// =============================================================================

describe('GET /api/newsletter/unsubscribe', () => {
  it('unsubscribes subscriber and redirects to success page', async () => {
    const subscriber = makeSubscriber({ verified: true });
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(subscriber);
    (mockPrisma.newsletterSubscriber.update as jest.Mock).mockResolvedValue(
      makeSubscriber({ unsubscribedAt: new Date(), verified: false })
    );

    const req = new NextRequest('http://localhost/api/newsletter/unsubscribe?token=unsub-token-xyz');
    const res = await unsubscribeGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('newsletter=unsubscribed');
    expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verified: false,
        }),
      })
    );
  });

  it('redirects with missing_token when no token provided', async () => {
    const req = new NextRequest('http://localhost/api/newsletter/unsubscribe');
    const res = await unsubscribeGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('reason=missing_token');
  });

  it('redirects with invalid_token when token not found', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/newsletter/unsubscribe?token=bad-token');
    const res = await unsubscribeGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('reason=invalid_token');
  });

  it('redirects with already_unsubscribed for already-unsubscribed subscriber', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(
      makeSubscriber({ unsubscribedAt: new Date('2026-01-10') })
    );

    const req = new NextRequest('http://localhost/api/newsletter/unsubscribe?token=unsub-token-xyz');
    const res = await unsubscribeGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('newsletter=already_unsubscribed');
    expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
  });

  it('looks up subscriber by unsubscribeToken field', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/newsletter/unsubscribe?token=specific-unsub-token');
    await unsubscribeGET(req);

    expect(mockPrisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
      where: { unsubscribeToken: 'specific-unsub-token' },
    });
  });

  it('redirects with server_error when database throws', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockRejectedValue(
      new Error('DB error')
    );

    const req = new NextRequest('http://localhost/api/newsletter/unsubscribe?token=some-token');
    const res = await unsubscribeGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('reason=server_error');
  });
});

// =============================================================================
// POST /api/newsletter/unsubscribe (RFC 8058 one-click)
// =============================================================================

describe('POST /api/newsletter/unsubscribe', () => {
  it('unsubscribes with token in query string', async () => {
    const subscriber = makeSubscriber({ verified: true });
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(subscriber);
    (mockPrisma.newsletterSubscriber.update as jest.Mock).mockResolvedValue(
      makeSubscriber({ unsubscribedAt: new Date(), verified: false })
    );

    const req = makeUnsubscribePostRequest(
      'http://localhost/api/newsletter/unsubscribe?token=unsub-token-xyz'
    );
    const res = await unsubscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Successfully unsubscribed');
  });

  it('unsubscribes with token in form-urlencoded body', async () => {
    const subscriber = makeSubscriber({ verified: true });
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(subscriber);
    (mockPrisma.newsletterSubscriber.update as jest.Mock).mockResolvedValue(
      makeSubscriber({ unsubscribedAt: new Date(), verified: false })
    );

    const req = makeUnsubscribePostRequest(
      'http://localhost/api/newsletter/unsubscribe',
      'token=unsub-token-xyz',
      'application/x-www-form-urlencoded'
    );
    const res = await unsubscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Successfully unsubscribed');
  });

  it('returns 400 when no token provided', async () => {
    const req = makeUnsubscribePostRequest('http://localhost/api/newsletter/unsubscribe');
    const res = await unsubscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Missing unsubscribe token');
  });

  it('returns 404 when token not found in DB', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeUnsubscribePostRequest(
      'http://localhost/api/newsletter/unsubscribe?token=invalid-token'
    );
    const res = await unsubscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain('Invalid unsubscribe token');
  });

  it('returns success for already-unsubscribed subscriber (idempotent)', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(
      makeSubscriber({ unsubscribedAt: new Date('2026-01-10') })
    );

    const req = makeUnsubscribePostRequest(
      'http://localhost/api/newsletter/unsubscribe?token=unsub-token-xyz'
    );
    const res = await unsubscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Already unsubscribed');
    expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
  });

  it('returns 500 when database throws', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockRejectedValue(
      new Error('DB failure')
    );

    const req = makeUnsubscribePostRequest(
      'http://localhost/api/newsletter/unsubscribe?token=unsub-token-xyz'
    );
    const res = await unsubscribePOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('Failed to unsubscribe');
  });
});

// =============================================================================
// GET /api/newsletter/status (admin-only)
// =============================================================================

describe('GET /api/newsletter/status', () => {
  it('returns subscriber and digest stats for admin user', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);

    // Subscriber counts: total=100, verified=70, unsubscribed=10
    (mockPrisma.newsletterSubscriber.count as jest.Mock)
      .mockResolvedValueOnce(100)  // total
      .mockResolvedValueOnce(70)   // verified
      .mockResolvedValueOnce(10)   // unsubscribed
      .mockResolvedValueOnce(5)    // recent signups
      .mockResolvedValueOnce(2);   // recent unsubscribes

    // Digest data
    (mockPrisma.dailyDigest.findFirst as jest.Mock).mockResolvedValue({
      id: 'digest-1',
      digestDate: new Date('2026-02-19'),
      subject: 'Daily Space Digest',
      status: 'sent',
      recipientCount: 70,
      failureCount: 0,
      newsArticleCount: 12,
      sendStartedAt: new Date(),
      sendCompletedAt: new Date(),
      createdAt: new Date(),
    });
    (mockPrisma.dailyDigest.count as jest.Mock)
      .mockResolvedValueOnce(50)   // total digests
      .mockResolvedValueOnce(48);  // sent digests

    const req = new NextRequest('http://localhost/api/newsletter/status');
    const res = await statusGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subscribers.total).toBe(100);
    expect(body.subscribers.verified).toBe(70);
    expect(body.subscribers.unsubscribed).toBe(10);
    expect(body.subscribers.pendingVerification).toBe(20); // 100 - 70 - 10
    expect(body.digests.total).toBe(50);
    expect(body.digests.sent).toBe(48);
    expect(body.digests.latest).toBeDefined();
    expect(body.recentActivity.signups).toBe(5);
    expect(body.recentActivity.unsubscribes).toBe(2);
    expect(body.timestamp).toBeDefined();
  });

  it('returns 403 for non-admin user', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: false } } as any);

    const req = new NextRequest('http://localhost/api/newsletter/status');
    const res = await statusGET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
    expect(mockPrisma.newsletterSubscriber.count).not.toHaveBeenCalled();
  });

  it('returns 403 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/newsletter/status');
    const res = await statusGET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns 403 when session has no user', async () => {
    mockGetServerSession.mockResolvedValue({ user: null } as any);

    const req = new NextRequest('http://localhost/api/newsletter/status');
    const res = await statusGET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('returns null latest digest when none exist', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);

    (mockPrisma.newsletterSubscriber.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.dailyDigest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.dailyDigest.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/newsletter/status');
    const res = await statusGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.digests.latest).toBeNull();
    expect(body.digests.total).toBe(0);
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue({ user: { isAdmin: true } } as any);
    (mockPrisma.newsletterSubscriber.count as jest.Mock).mockRejectedValue(
      new Error('DB connection lost')
    );

    const req = new NextRequest('http://localhost/api/newsletter/status');
    const res = await statusGET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('Failed to fetch status');
  });
});

// =============================================================================
// POST /api/newsletter/resend-verification
// =============================================================================

describe('POST /api/newsletter/resend-verification', () => {
  it('resends verification email for unverified subscriber', async () => {
    const subscriber = makeSubscriber({ verified: false });
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(subscriber);
    (mockPrisma.newsletterSubscriber.update as jest.Mock).mockResolvedValue(subscriber);
    mockSendVerificationEmail.mockResolvedValue({ success: true });

    const req = makeResendVerificationRequest({ email: 'test@example.com' });
    const res = await resendVerificationPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrisma.newsletterSubscriber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationToken: expect.any(String),
        }),
      })
    );
    expect(mockSendVerificationEmail).toHaveBeenCalled();
  });

  it('returns generic success for already-verified subscriber (anti-enumeration)', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(
      makeSubscriber({ verified: true, verifiedAt: new Date() })
    );

    const req = makeResendVerificationRequest({ email: 'verified@example.com' });
    const res = await resendVerificationPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('If this email is registered');
    expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it('returns generic success for nonexistent email (anti-enumeration)', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeResendVerificationRequest({ email: 'unknown@example.com' });
    const res = await resendVerificationPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('If this email is registered');
    expect(mockPrisma.newsletterSubscriber.update).not.toHaveBeenCalled();
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it('returns generic success for unsubscribed email (anti-enumeration)', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(
      makeSubscriber({ unsubscribedAt: new Date(), verified: false })
    );

    const req = makeResendVerificationRequest({ email: 'unsub@example.com' });
    const res = await resendVerificationPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it('rejects missing email field', async () => {
    const req = makeResendVerificationRequest({});
    const res = await resendVerificationPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Email is required');
  });

  it('rejects non-string email field', async () => {
    const req = makeResendVerificationRequest({ email: 12345 });
    const res = await resendVerificationPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Email is required');
  });

  it('normalizes email to lowercase and trimmed', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeResendVerificationRequest({ email: '  Test@Example.COM  ' });
    const res = await resendVerificationPOST(req);

    expect(mockPrisma.newsletterSubscriber.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('returns 500 when email service fails', async () => {
    const subscriber = makeSubscriber({ verified: false });
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockResolvedValue(subscriber);
    (mockPrisma.newsletterSubscriber.update as jest.Mock).mockResolvedValue(subscriber);
    mockSendVerificationEmail.mockResolvedValue({ success: false, error: 'SMTP down' });

    const req = makeResendVerificationRequest({ email: 'test@example.com' });
    const res = await resendVerificationPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toContain('Unable to send verification email');
  });

  it('returns 500 when database throws', async () => {
    (mockPrisma.newsletterSubscriber.findUnique as jest.Mock).mockRejectedValue(
      new Error('DB failure')
    );

    const req = makeResendVerificationRequest({ email: 'test@example.com' });
    const res = await resendVerificationPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain('Internal server error');
  });
});
