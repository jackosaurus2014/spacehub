// ─── Community Badge System ──────────────────────────────────────────────────
// Award badges for community contributions and milestones.

import prisma from './db';

export interface BadgeDefinition {
  type: string;
  name: string;
  icon: string;
  description: string;
  check: (user: { reputation: number; forumPostCount: number; acceptedAnswerCount: number }) => boolean;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: 'first_post',
    name: 'First Post',
    icon: '💬',
    description: 'Made your first forum post',
    check: (u) => u.forumPostCount >= 1,
  },
  {
    type: 'contributor_10',
    name: 'Active Contributor',
    icon: '📝',
    description: 'Made 10 forum posts',
    check: (u) => u.forumPostCount >= 10,
  },
  {
    type: 'helpful_5',
    name: 'Helpful Member',
    icon: '🤝',
    description: 'Had 5 answers accepted',
    check: (u) => u.acceptedAnswerCount >= 5,
  },
  {
    type: 'helpful_25',
    name: 'Community Expert',
    icon: '🎓',
    description: 'Had 25 answers accepted',
    check: (u) => u.acceptedAnswerCount >= 25,
  },
  {
    type: 'expert',
    name: 'Space Expert',
    icon: '🔭',
    description: 'Reached 500 reputation',
    check: (u) => u.reputation >= 500,
  },
  {
    type: 'top_contributor',
    name: 'Top Contributor',
    icon: '⭐',
    description: 'Made 50 forum posts',
    check: (u) => u.forumPostCount >= 50,
  },
  {
    type: 'space_authority',
    name: 'Space Authority',
    icon: '👑',
    description: 'Reached 2,500 reputation',
    check: (u) => u.reputation >= 2500,
  },
];

/**
 * Check and award any new badges a user qualifies for.
 * Returns newly awarded badge types.
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reputation: true, forumPostCount: true, acceptedAnswerCount: true },
  });
  if (!user) return [];

  const existingBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeType: true },
  });
  const existingTypes = new Set(existingBadges.map(b => b.badgeType));

  const newBadges: string[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (existingTypes.has(badge.type)) continue;
    if (badge.check(user)) {
      await prisma.userBadge.create({
        data: { userId, badgeType: badge.type },
      });
      newBadges.push(badge.type);
    }
  }

  return newBadges;
}

/** Get all badges for a user */
export async function getUserBadges(userId: string): Promise<{ type: string; awardedAt: Date }[]> {
  return prisma.userBadge.findMany({
    where: { userId },
    select: { badgeType: true, awardedAt: true },
    orderBy: { awardedAt: 'asc' },
  }).then(badges => badges.map(b => ({ type: b.badgeType, awardedAt: b.awardedAt })));
}
