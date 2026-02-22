import prisma from '@/lib/db';

export async function checkUserBanStatus(userId: string): Promise<{
  isBanned: boolean;
  isMuted: boolean;
  banReason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isBanned: true,
      bannedUntil: true,
      banReason: true,
      isMuted: true,
      mutedUntil: true,
    } as any,
  });

  if (!user) return { isBanned: false, isMuted: false };

  const now = new Date();
  let isBanned = (user as any).isBanned || false;
  let isMuted = (user as any).isMuted || false;

  // Auto-unban expired temporary bans
  if (isBanned && (user as any).bannedUntil && new Date((user as any).bannedUntil) < now) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedUntil: null,
        banReason: null,
      } as any,
    });
    isBanned = false;
  }

  // Auto-unmute expired temporary mutes
  if (isMuted && (user as any).mutedUntil && new Date((user as any).mutedUntil) < now) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isMuted: false,
        mutedUntil: null,
      } as any,
    });
    isMuted = false;
  }

  return {
    isBanned,
    isMuted,
    banReason: (user as any).banReason || undefined,
  };
}

export async function isUserBlocked(
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const block = await (prisma as any).userBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId, blockedId },
    },
  });
  return !!block;
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const blocks = await (prisma as any).userBlock.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  return blocks.map((b: any) => b.blockedId);
}
