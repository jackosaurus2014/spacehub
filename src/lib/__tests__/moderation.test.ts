/**
 * @jest-environment node
 */

/**
 * Unit tests for src/lib/moderation.ts
 *
 * Tests:
 *   - checkUserBanStatus returns correct ban/mute status
 *   - checkUserBanStatus auto-unbans expired temporary bans
 *   - checkUserBanStatus auto-unmutes expired temporary mutes
 *   - checkUserBanStatus handles user not found
 *   - isUserBlocked checks block relationship
 *   - getBlockedUserIds returns list of blocked user IDs
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userBlock: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { checkUserBanStatus, isUserBlocked, getBlockedUserIds } from '@/lib/moderation';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  userBlock: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// checkUserBanStatus
// =============================================================================

describe('checkUserBanStatus', () => {
  it('returns isBanned: false, isMuted: false for a normal user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      isBanned: false,
      bannedUntil: null,
      banReason: null,
      isMuted: false,
      mutedUntil: null,
    });

    const result = await checkUserBanStatus('user-1');

    expect(result).toEqual({
      isBanned: false,
      isMuted: false,
      banReason: undefined,
    });
  });

  it('returns isBanned: true for a permanently banned user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      isBanned: true,
      bannedUntil: null, // permanent
      banReason: 'Spamming',
      isMuted: false,
      mutedUntil: null,
    });

    const result = await checkUserBanStatus('user-banned');

    expect(result.isBanned).toBe(true);
    expect(result.banReason).toBe('Spamming');
    expect(result.isMuted).toBe(false);
    // Should NOT auto-unban (no expiry set)
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns isMuted: true for a muted user with future mutedUntil', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      isBanned: false,
      bannedUntil: null,
      banReason: null,
      isMuted: true,
      mutedUntil: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    });

    const result = await checkUserBanStatus('user-muted');

    expect(result.isBanned).toBe(false);
    expect(result.isMuted).toBe(true);
    // Should NOT auto-unmute (not expired)
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('auto-unbans a temporarily banned user whose bannedUntil has passed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      isBanned: true,
      bannedUntil: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      banReason: 'Temporary ban',
      isMuted: false,
      mutedUntil: null,
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await checkUserBanStatus('user-expired-ban');

    expect(result.isBanned).toBe(false);
    expect(result.isMuted).toBe(false);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-expired-ban' },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedUntil: null,
        banReason: null,
      },
    });
  });

  it('auto-unmutes a temporarily muted user whose mutedUntil has passed', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      isBanned: false,
      bannedUntil: null,
      banReason: null,
      isMuted: true,
      mutedUntil: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await checkUserBanStatus('user-expired-mute');

    expect(result.isBanned).toBe(false);
    expect(result.isMuted).toBe(false);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-expired-mute' },
      data: {
        isMuted: false,
        mutedUntil: null,
      },
    });
  });

  it('returns isBanned: false and isMuted: false for a user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await checkUserBanStatus('nonexistent-user');

    expect(result).toEqual({ isBanned: false, isMuted: false });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns banReason as undefined when no reason is stored', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      isBanned: true,
      bannedUntil: null,
      banReason: null,
      isMuted: false,
      mutedUntil: null,
    });

    const result = await checkUserBanStatus('user-no-reason');

    expect(result.isBanned).toBe(true);
    expect(result.banReason).toBeUndefined();
  });

  it('handles both banned and muted simultaneously', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      isBanned: true,
      bannedUntil: null,
      banReason: 'Multiple violations',
      isMuted: true,
      mutedUntil: null,
    });

    const result = await checkUserBanStatus('user-both');

    expect(result.isBanned).toBe(true);
    expect(result.isMuted).toBe(true);
    expect(result.banReason).toBe('Multiple violations');
  });
});

// =============================================================================
// isUserBlocked
// =============================================================================

describe('isUserBlocked', () => {
  it('returns true when a block record exists', async () => {
    mockPrisma.userBlock.findUnique.mockResolvedValue({
      blockerId: 'user-1',
      blockedId: 'user-2',
      createdAt: new Date(),
    });

    const result = await isUserBlocked('user-1', 'user-2');
    expect(result).toBe(true);
  });

  it('returns false when no block record exists', async () => {
    mockPrisma.userBlock.findUnique.mockResolvedValue(null);

    const result = await isUserBlocked('user-1', 'user-3');
    expect(result).toBe(false);
  });

  it('uses the composite key blockerId_blockedId for lookup', async () => {
    mockPrisma.userBlock.findUnique.mockResolvedValue(null);

    await isUserBlocked('blocker-id', 'blocked-id');

    expect(mockPrisma.userBlock.findUnique).toHaveBeenCalledWith({
      where: {
        blockerId_blockedId: {
          blockerId: 'blocker-id',
          blockedId: 'blocked-id',
        },
      },
    });
  });
});

// =============================================================================
// getBlockedUserIds
// =============================================================================

describe('getBlockedUserIds', () => {
  it('returns a list of blocked user IDs', async () => {
    mockPrisma.userBlock.findMany.mockResolvedValue([
      { blockedId: 'user-2' },
      { blockedId: 'user-5' },
      { blockedId: 'user-9' },
    ]);

    const result = await getBlockedUserIds('user-1');
    expect(result).toEqual(['user-2', 'user-5', 'user-9']);
  });

  it('returns an empty array when no blocks exist', async () => {
    mockPrisma.userBlock.findMany.mockResolvedValue([]);

    const result = await getBlockedUserIds('user-1');
    expect(result).toEqual([]);
  });

  it('queries with correct blockerId and selects blockedId', async () => {
    mockPrisma.userBlock.findMany.mockResolvedValue([]);

    await getBlockedUserIds('user-42');

    expect(mockPrisma.userBlock.findMany).toHaveBeenCalledWith({
      where: { blockerId: 'user-42' },
      select: { blockedId: true },
    });
  });
});
