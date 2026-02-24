/**
 * @jest-environment node
 */

/**
 * API route handler tests for account management endpoints:
 *
 * Change Password:
 *   - POST /api/account/change-password  (change user password with bcrypt)
 *
 * Profile:
 *   - GET  /api/account/profile          (fetch user profile)
 *   - PATCH /api/account/profile         (update user name)
 *
 * Notification Preferences:
 *   - GET  /api/account/notification-preferences   (fetch or default prefs)
 *   - PATCH /api/account/notification-preferences  (upsert prefs)
 *
 * All routes require authentication via getServerSession(authOptions).
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { POST as changePassword } from '@/app/api/account/change-password/route';
import { GET as getProfile, PATCH as updateProfile } from '@/app/api/account/profile/route';
import {
  GET as getPreferences,
  PATCH as updatePreferences,
} from '@/app/api/account/notification-preferences/route';

// ── Typed mocks ──────────────────────────────────────────────────────────────

const mockGetServerSession = getServerSession as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockAuthenticated() {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'user-1', email: 'test@example.com' },
  });
}

function mockUnauthenticated() {
  mockGetServerSession.mockResolvedValue(null);
}

function makeRequest(body?: unknown): NextRequest {
  if (body === undefined) {
    return new NextRequest('http://localhost/api/test', { method: 'GET' });
  }
  return new NextRequest('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// POST /api/account/change-password
// =============================================================================

describe('POST /api/account/change-password', () => {
  const validBody = {
    currentPassword: 'OldPassword1',
    newPassword: 'NewSecurePass1',
    confirmNewPassword: 'NewSecurePass1',
  };

  it('returns 401 if not authenticated', async () => {
    mockUnauthenticated();

    const req = makeRequest(validBody);
    const res = await changePassword(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for missing fields', async () => {
    mockAuthenticated();

    const req = makeRequest({});
    const res = await changePassword(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 if passwords do not match', async () => {
    mockAuthenticated();

    const req = makeRequest({
      currentPassword: 'OldPassword1',
      newPassword: 'NewSecurePass1',
      confirmNewPassword: 'DifferentPass1',
    });
    const res = await changePassword(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 400 if current password is wrong', async () => {
    mockAuthenticated();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: '$2a$12$hashedold',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const req = makeRequest(validBody);
    const res = await changePassword(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Current password is incorrect');
  });

  it('returns 200 on successful password change', async () => {
    mockAuthenticated();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: '$2a$12$hashedold',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const req = makeRequest(validBody);
    const res = await changePassword(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Password changed successfully.');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'newhash' },
    });
  });

  it('hashes new password with cost factor 12', async () => {
    mockAuthenticated();
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: '$2a$12$hashedold',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const req = makeRequest(validBody);
    await changePassword(req);

    expect(bcrypt.hash).toHaveBeenCalledWith('NewSecurePass1', 12);
  });
});

// =============================================================================
// GET /api/account/profile
// =============================================================================

describe('GET /api/account/profile', () => {
  it('returns 401 if not authenticated', async () => {
    mockUnauthenticated();

    const res = await getProfile();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 200 with user profile', async () => {
    mockAuthenticated();

    const userData = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      createdAt: new Date('2026-01-15'),
      subscriptionTier: 'free',
    };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userData);

    const res = await getProfile();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('user-1');
    expect(body.data.name).toBe('Test User');
    expect(body.data.email).toBe('test@example.com');
    expect(body.data.subscriptionTier).toBe('free');
    expect(body.data.createdAt).toBeDefined();
  });
});

// =============================================================================
// PATCH /api/account/profile
// =============================================================================

describe('PATCH /api/account/profile', () => {
  it('returns 401 if not authenticated', async () => {
    mockUnauthenticated();

    const req = makeRequest({ name: 'Updated Name' });
    const res = await updateProfile(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for empty name', async () => {
    mockAuthenticated();

    const req = makeRequest({ name: '' });
    const res = await updateProfile(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 on successful update', async () => {
    mockAuthenticated();

    const updatedUser = {
      id: 'user-1',
      name: 'Updated Name',
      email: 'test@example.com',
      createdAt: new Date('2026-01-15'),
      subscriptionTier: 'free',
    };
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

    const req = makeRequest({ name: 'Updated Name' });
    const res = await updateProfile(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Updated Name');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'Updated Name' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subscriptionTier: true,
      },
    });
  });
});

// =============================================================================
// GET /api/account/notification-preferences
// =============================================================================

describe('GET /api/account/notification-preferences', () => {
  it('returns 401 if not authenticated', async () => {
    mockUnauthenticated();

    const res = await getPreferences();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns default preferences if none are set', async () => {
    mockAuthenticated();
    (mockPrisma as any).notificationPreference.findUnique.mockResolvedValue(null);

    const res = await getPreferences();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      emailDigest: true,
      emailAlerts: true,
      pushEnabled: true,
      forumReplies: true,
      directMessages: true,
      marketplaceUpdates: true,
      watchlistAlerts: true,
      newsDigest: true,
      digestFrequency: 'daily',
    });
  });

  it('returns saved preferences when they exist', async () => {
    mockAuthenticated();

    const savedPrefs = {
      emailDigest: false,
      emailAlerts: true,
      pushEnabled: false,
      forumReplies: true,
      directMessages: false,
      marketplaceUpdates: true,
      watchlistAlerts: false,
      newsDigest: true,
      digestFrequency: 'weekly',
    };
    (mockPrisma as any).notificationPreference.findUnique.mockResolvedValue(savedPrefs);

    const res = await getPreferences();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(savedPrefs);
  });
});

// =============================================================================
// PATCH /api/account/notification-preferences
// =============================================================================

describe('PATCH /api/account/notification-preferences', () => {
  it('returns 401 if not authenticated', async () => {
    mockUnauthenticated();

    const req = makeRequest({ emailDigest: false });
    const res = await updatePreferences(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid digestFrequency', async () => {
    mockAuthenticated();

    const req = makeRequest({ digestFrequency: 'hourly' });
    const res = await updatePreferences(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 on successful upsert', async () => {
    mockAuthenticated();

    const updatedPrefs = {
      emailDigest: false,
      emailAlerts: true,
      pushEnabled: true,
      forumReplies: true,
      directMessages: true,
      marketplaceUpdates: true,
      watchlistAlerts: true,
      newsDigest: true,
      digestFrequency: 'weekly',
    };
    (mockPrisma as any).notificationPreference.upsert.mockResolvedValue(updatedPrefs);

    const req = makeRequest({ emailDigest: false, digestFrequency: 'weekly' });
    const res = await updatePreferences(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(updatedPrefs);
    expect((mockPrisma as any).notificationPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: {
        userId: 'user-1',
        emailDigest: false,
        digestFrequency: 'weekly',
      },
      update: {
        emailDigest: false,
        digestFrequency: 'weekly',
      },
      select: {
        emailDigest: true,
        emailAlerts: true,
        pushEnabled: true,
        forumReplies: true,
        directMessages: true,
        marketplaceUpdates: true,
        watchlistAlerts: true,
        newsDigest: true,
        digestFrequency: true,
      },
    });
  });
});
