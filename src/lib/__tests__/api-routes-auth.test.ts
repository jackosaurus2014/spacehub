/**
 * @jest-environment node
 */

/**
 * API route handler tests for auth endpoints:
 *   - POST /api/auth/register         (create account, hash password, send verification email)
 *   - POST /api/auth/forgot-password  (request password reset, anti-enumeration)
 *   - POST /api/auth/reset-password   (consume reset token, update password)
 *   - POST /api/auth/verify-email     (consume verification token, mark email verified)
 *
 * Validates input validation, anti-enumeration, token flows, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
  },
}));

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn().mockReturnValue('mock-uuid-token-1234');
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: () => mockRandomUUID(),
}));

// Mock resend (dynamically imported in route handlers)
const mockResendSend = jest.fn().mockResolvedValue({ id: 'email-1' });
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

// Mock email template generators
jest.mock('@/lib/newsletter/email-templates', () => ({
  generateVerificationEmail: jest.fn().mockReturnValue({
    html: '<p>Verify your email</p>',
    text: 'Verify your email',
  }),
  generatePasswordResetEmail: jest.fn().mockReturnValue({
    html: '<p>Reset your password</p>',
    text: 'Reset your password',
  }),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as forgotPasswordPOST } from '@/app/api/auth/forgot-password/route';
import { POST as resetPasswordPOST } from '@/app/api/auth/reset-password/route';
import { POST as verifyEmailPOST } from '@/app/api/auth/verify-email/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: '$2a$12$existinghash',
    emailVerified: false,
    verificationToken: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeResetToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-1',
    token: 'valid-reset-token',
    userId: 'user-1',
    used: false,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    createdAt: new Date('2026-01-15'),
    user: makeUser(),
    ...overrides,
  };
}

function makePostRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRandomUUID.mockReturnValue('mock-uuid-token-1234');
});

// =============================================================================
// POST /api/auth/register
// =============================================================================

describe('POST /api/auth/register', () => {
  const validBody = {
    email: 'newuser@example.com',
    password: 'StrongPass1',
    name: 'New User',
  };

  it('registers a new user successfully', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(
      makeUser({ id: 'new-user-1', email: 'newuser@example.com', name: 'New User' })
    );
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(
      makeUser({ verificationToken: 'mock-uuid-token-1234' })
    );

    const req = makePostRequest('http://localhost/api/auth/register', validBody);
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain('Registration successful');
    expect(body.message).toContain('check your email');
  });

  it('hashes the password with bcrypt(12)', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser());

    const req = makePostRequest('http://localhost/api/auth/register', validBody);
    await registerPOST(req);

    expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass1', 12);
  });

  it('stores a verification token after creating the user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(makeUser({ id: 'user-new' }));
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser());

    const req = makePostRequest('http://localhost/api/auth/register', validBody);
    await registerPOST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-new' },
      data: { verificationToken: 'mock-uuid-token-1234' },
    });
  });

  it('registers without a name (optional field)', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(makeUser({ name: null }));
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser());

    const req = makePostRequest('http://localhost/api/auth/register', {
      email: 'noname@example.com',
      password: 'StrongPass1',
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain('Registration successful');
  });

  it('returns identical success response for duplicate email (anti-enumeration)', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());

    const req = makePostRequest('http://localhost/api/auth/register', validBody);
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain('Registration successful');
    // Should not create a new user
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects missing email field', async () => {
    const req = makePostRequest('http://localhost/api/auth/register', {
      password: 'StrongPass1',
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing password field', async () => {
    const req = makePostRequest('http://localhost/api/auth/register', {
      email: 'test@example.com',
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email format', async () => {
    const req = makePostRequest('http://localhost/api/auth/register', {
      email: 'not-an-email',
      password: 'StrongPass1',
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects password shorter than 8 characters', async () => {
    const req = makePostRequest('http://localhost/api/auth/register', {
      email: 'test@example.com',
      password: 'Ab1',
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects password without uppercase letter', async () => {
    const req = makePostRequest('http://localhost/api/auth/register', {
      email: 'test@example.com',
      password: 'alllowercase1',
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects password without a number', async () => {
    const req = makePostRequest('http://localhost/api/auth/register', {
      email: 'test@example.com',
      password: 'NoNumbersHere',
    });
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('continues registration even if email sending fails', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser());
    mockResendSend.mockRejectedValueOnce(new Error('SMTP error'));

    const req = makePostRequest('http://localhost/api/auth/register', validBody);
    const res = await registerPOST(req);
    const body = await res.json();

    // Registration succeeds even when email fails
    expect(res.status).toBe(200);
    expect(body.message).toContain('Registration successful');
  });

  it('returns 500 when database throws on user creation', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = makePostRequest('http://localhost/api/auth/register', validBody);
    const res = await registerPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('normalizes email to lowercase', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(makeUser());

    const req = makePostRequest('http://localhost/api/auth/register', {
      email: 'User@Example.COM',
      password: 'StrongPass1',
    });
    await registerPOST(req);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });
});

// =============================================================================
// POST /api/auth/forgot-password
// =============================================================================

describe('POST /api/auth/forgot-password', () => {
  it('returns success and sends reset email for existing user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: 'prt-1',
      token: 'mock-uuid-token-1234',
    });

    const req = makePostRequest('http://localhost/api/auth/forgot-password', {
      email: 'test@example.com',
    });
    const res = await forgotPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('password reset link has been sent');
  });

  it('invalidates prior unused tokens before creating a new one', async () => {
    const user = makeUser();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (mockPrisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: 'prt-1',
      token: 'mock-uuid-token-1234',
    });

    const req = makePostRequest('http://localhost/api/auth/forgot-password', {
      email: 'test@example.com',
    });
    await forgotPasswordPOST(req);

    expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: user.id, used: false },
      data: { used: true },
    });
  });

  it('creates a reset token with 1-hour expiry', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: 'prt-1',
      token: 'mock-uuid-token-1234',
    });

    const req = makePostRequest('http://localhost/api/auth/forgot-password', {
      email: 'test@example.com',
    });
    const beforeCall = Date.now();
    await forgotPasswordPOST(req);

    const createCall = (mockPrisma.passwordResetToken.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.token).toBe('mock-uuid-token-1234');
    expect(createCall.data.userId).toBe('user-1');
    // Verify expiry is roughly 1 hour from now
    const expiresAt = new Date(createCall.data.expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(beforeCall + 59 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(beforeCall + 61 * 60 * 1000);
  });

  it('returns identical success for non-existing email (anti-enumeration)', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/auth/forgot-password', {
      email: 'nonexistent@example.com',
    });
    const res = await forgotPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('password reset link has been sent');
    // Should not attempt to create a token
    expect(mockPrisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('rejects missing email field', async () => {
    const req = makePostRequest('http://localhost/api/auth/forgot-password', {});
    const res = await forgotPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email format', async () => {
    const req = makePostRequest('http://localhost/api/auth/forgot-password', {
      email: 'bad-email',
    });
    const res = await forgotPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns success even when email delivery fails (anti-enumeration)', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
    (mockPrisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
      id: 'prt-1',
      token: 'mock-uuid-token-1234',
    });
    mockResendSend.mockRejectedValueOnce(new Error('Email service down'));

    const req = makePostRequest('http://localhost/api/auth/forgot-password', {
      email: 'test@example.com',
    });
    const res = await forgotPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 500 when database throws', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB down'));

    const req = makePostRequest('http://localhost/api/auth/forgot-password', {
      email: 'test@example.com',
    });
    const res = await forgotPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to process password reset request');
  });
});

// =============================================================================
// POST /api/auth/reset-password
// =============================================================================

describe('POST /api/auth/reset-password', () => {
  const validBody = {
    token: 'valid-reset-token',
    password: 'NewStrongPass1',
    confirmPassword: 'NewStrongPass1',
  };

  it('resets password successfully with valid token', async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(makeResetToken());
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const req = makePostRequest('http://localhost/api/auth/reset-password', validBody);
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Password has been reset successfully');
  });

  it('hashes the new password with bcrypt(12)', async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(makeResetToken());
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const req = makePostRequest('http://localhost/api/auth/reset-password', validBody);
    await resetPasswordPOST(req);

    expect(bcrypt.hash).toHaveBeenCalledWith('NewStrongPass1', 12);
  });

  it('uses a transaction to update password and mark token as used', async () => {
    const resetTokenRecord = makeResetToken();
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(resetTokenRecord);
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

    const req = makePostRequest('http://localhost/api/auth/reset-password', validBody);
    await resetPasswordPOST(req);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid/nonexistent token', async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/auth/reset-password', {
      ...validBody,
      token: 'nonexistent-token',
    });
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Invalid or expired reset link');
  });

  it('rejects already-used token', async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(
      makeResetToken({ used: true })
    );

    const req = makePostRequest('http://localhost/api/auth/reset-password', validBody);
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('already been used');
  });

  it('rejects expired token', async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(
      makeResetToken({ expiresAt: new Date(Date.now() - 60 * 60 * 1000) }) // 1 hour ago
    );

    const req = makePostRequest('http://localhost/api/auth/reset-password', validBody);
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('expired');
  });

  it('rejects missing token field', async () => {
    const req = makePostRequest('http://localhost/api/auth/reset-password', {
      password: 'NewStrongPass1',
      confirmPassword: 'NewStrongPass1',
    });
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing password field', async () => {
    const req = makePostRequest('http://localhost/api/auth/reset-password', {
      token: 'valid-reset-token',
      confirmPassword: 'NewStrongPass1',
    });
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects weak new password (too short)', async () => {
    const req = makePostRequest('http://localhost/api/auth/reset-password', {
      token: 'valid-reset-token',
      password: 'Ab1',
      confirmPassword: 'Ab1',
    });
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects mismatched password and confirmPassword', async () => {
    const req = makePostRequest('http://localhost/api/auth/reset-password', {
      token: 'valid-reset-token',
      password: 'NewStrongPass1',
      confirmPassword: 'DifferentPass2',
    });
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('includes user in the token lookup query', async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/auth/reset-password', validBody);
    await resetPasswordPOST(req);

    expect(mockPrisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { token: 'valid-reset-token' },
      include: { user: true },
    });
  });

  it('returns 500 when database throws', async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockRejectedValue(
      new Error('DB connection lost')
    );

    const req = makePostRequest('http://localhost/api/auth/reset-password', validBody);
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to reset password');
  });

  it('returns 500 when transaction fails', async () => {
    (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(makeResetToken());
    (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error('Transaction deadlock'));

    const req = makePostRequest('http://localhost/api/auth/reset-password', validBody);
    const res = await resetPasswordPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to reset password');
  });
});

// =============================================================================
// POST /api/auth/verify-email
// =============================================================================

describe('POST /api/auth/verify-email', () => {
  it('verifies email successfully with valid token', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(
      makeUser({ verificationToken: 'valid-verify-token', emailVerified: false })
    );
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(
      makeUser({ emailVerified: true, verificationToken: null })
    );

    const req = makePostRequest('http://localhost/api/auth/verify-email', {
      token: 'valid-verify-token',
    });
    const res = await verifyEmailPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Email verified successfully');
  });

  it('sets emailVerified to true and clears verificationToken', async () => {
    const user = makeUser({ verificationToken: 'valid-verify-token', emailVerified: false });
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(user);
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(
      makeUser({ emailVerified: true, verificationToken: null })
    );

    const req = makePostRequest('http://localhost/api/auth/verify-email', {
      token: 'valid-verify-token',
    });
    await verifyEmailPOST(req);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });
  });

  it('rejects invalid/nonexistent token', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/auth/verify-email', {
      token: 'nonexistent-token',
    });
    const res = await verifyEmailPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Invalid or expired verification link');
  });

  it('looks up user by verificationToken field', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/auth/verify-email', {
      token: 'some-token-value',
    });
    await verifyEmailPOST(req);

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: { verificationToken: 'some-token-value' },
    });
  });

  it('returns success for already-verified user without re-updating', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(
      makeUser({ emailVerified: true, verificationToken: 'old-token' })
    );

    const req = makePostRequest('http://localhost/api/auth/verify-email', {
      token: 'old-token',
    });
    const res = await verifyEmailPOST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('already verified');
    // Should not call update since user is already verified
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects missing token field', async () => {
    const req = makePostRequest('http://localhost/api/auth/verify-email', {});
    const res = await verifyEmailPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects empty token string', async () => {
    const req = makePostRequest('http://localhost/api/auth/verify-email', {
      token: '',
    });
    const res = await verifyEmailPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 when database throws on findFirst', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = makePostRequest('http://localhost/api/auth/verify-email', {
      token: 'valid-token',
    });
    const res = await verifyEmailPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to verify email');
  });

  it('returns 500 when database throws on update', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(
      makeUser({ verificationToken: 'valid-token', emailVerified: false })
    );
    (mockPrisma.user.update as jest.Mock).mockRejectedValue(new Error('DB write error'));

    const req = makePostRequest('http://localhost/api/auth/verify-email', {
      token: 'valid-token',
    });
    const res = await verifyEmailPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to verify email');
  });
});
