// ─── Space Tycoon: Alliance Treasury & Perks ──────────────────────────────
// Treasury deposits, perk definitions, perk activation, and bonus aggregation.

import { PrismaClient } from '@prisma/client';

// ─── Perk Definitions ──────────────────────────────────────────────────────

export interface AlliancePerkDefinition {
  perkId: string;
  name: string;
  description: string;
  bonusType: string;
  bonusValue: number;
  durationHours: number;
  treasuryCost: number;
  icon: string;
  /** Minimum alliance level to activate */
  minLevel: number;
}

export const ALLIANCE_PERK_DEFINITIONS: AlliancePerkDefinition[] = [
  {
    perkId: 'revenue_surge', name: 'Revenue Surge', icon: '💰',
    description: '+10% revenue for all members for 24 hours.',
    bonusType: 'revenue_bonus', bonusValue: 0.10, durationHours: 24, treasuryCost: 5_000_000_000, minLevel: 8,
  },
  {
    perkId: 'mining_frenzy', name: 'Mining Frenzy', icon: '⛏️',
    description: '+15% mining output for all members for 24 hours.',
    bonusType: 'mining_bonus', bonusValue: 0.15, durationHours: 24, treasuryCost: 5_000_000_000, minLevel: 8,
  },
  {
    perkId: 'research_rush', name: 'Research Rush', icon: '🔬',
    description: '+20% research speed for all members for 12 hours.',
    bonusType: 'research_speed', bonusValue: 0.20, durationHours: 12, treasuryCost: 3_000_000_000, minLevel: 8,
  },
  {
    perkId: 'build_sprint', name: 'Build Sprint', icon: '🏗️',
    description: '+15% build speed for all members for 12 hours.',
    bonusType: 'build_speed', bonusValue: 0.15, durationHours: 12, treasuryCost: 3_000_000_000, minLevel: 8,
  },
  {
    perkId: 'xp_multiplier', name: 'XP Multiplier', icon: '⭐',
    description: '2x alliance XP earnings for 24 hours.',
    bonusType: 'xp_multiplier', bonusValue: 2.0, durationHours: 24, treasuryCost: 8_000_000_000, minLevel: 8,
  },
  {
    perkId: 'market_edge', name: 'Market Edge', icon: '📈',
    description: '-3% trade fees for all members for 48 hours.',
    bonusType: 'trade_bonus', bonusValue: 0.03, durationHours: 48, treasuryCost: 4_000_000_000, minLevel: 8,
  },
  {
    perkId: 'lucky_strike', name: 'Lucky Strike', icon: '🍀',
    description: '+10% rare resource chance for all members for 24 hours.',
    bonusType: 'rare_chance', bonusValue: 0.10, durationHours: 24, treasuryCost: 6_000_000_000, minLevel: 8,
  },
  {
    perkId: 'double_daily', name: 'Double Daily', icon: '📋',
    description: '2x daily task XP rewards for 24 hours.',
    bonusType: 'daily_xp_multiplier', bonusValue: 2.0, durationHours: 24, treasuryCost: 2_000_000_000, minLevel: 8,
  },
  {
    perkId: 'recruitment_drive', name: 'Recruitment Drive', icon: '📢',
    description: '+5 max member capacity for 72 hours.',
    bonusType: 'member_cap', bonusValue: 5, durationHours: 72, treasuryCost: 10_000_000_000, minLevel: 8,
  },
  {
    perkId: 'war_prep', name: 'War Preparation', icon: '⚔️',
    description: '+20% zone influence for all members for 48 hours.',
    bonusType: 'zone_bonus', bonusValue: 0.20, durationHours: 48, treasuryCost: 7_000_000_000, minLevel: 8,
  },
];

export const PERK_MAP = new Map(
  ALLIANCE_PERK_DEFINITIONS.map(p => [p.perkId, p])
);

// ─── Treasury Deposit ──────────────────────────────────────────────────────

export interface DepositResult {
  success: boolean;
  error?: string;
  newTreasuryBalance: number;
  amountDeposited: number;
}

/**
 * Transfer money from a player's balance to the alliance treasury.
 * The actual deduction from the player's money should be handled by the caller
 * (usually via the game sync). This function just credits the treasury.
 */
export async function depositToTreasury(
  prisma: PrismaClient,
  allianceId: string,
  profileId: string,
  amount: number,
): Promise<DepositResult> {
  if (amount <= 0) {
    return { success: false, error: 'Deposit amount must be positive.', newTreasuryBalance: 0, amountDeposited: 0 };
  }

  // Verify membership
  const member = await prisma.allianceMember.findUnique({
    where: { profileId },
    select: { allianceId: true, profile: { select: { companyName: true, money: true } } },
  });

  if (!member || member.allianceId !== allianceId) {
    return { success: false, error: 'Not a member of this alliance.', newTreasuryBalance: 0, amountDeposited: 0 };
  }

  if (member.profile.money < amount) {
    return { success: false, error: 'Insufficient funds.', newTreasuryBalance: 0, amountDeposited: 0 };
  }

  // Atomically update treasury and deduct from player
  const [updatedAlliance] = await prisma.$transaction([
    prisma.alliance.update({
      where: { id: allianceId },
      data: { treasury: { increment: amount } },
      select: { treasury: true },
    }),
    prisma.gameProfile.update({
      where: { id: profileId },
      data: { money: { decrement: amount } },
    }),
    prisma.allianceLog.create({
      data: {
        allianceId,
        type: 'treasury_deposit',
        actorId: profileId,
        actorName: member.profile.companyName,
        title: `${member.profile.companyName} deposited $${formatCompact(amount)} to treasury`,
        metadata: { amount },
        xpEarned: 0,
      },
    }),
  ]);

  return {
    success: true,
    newTreasuryBalance: updatedAlliance.treasury,
    amountDeposited: amount,
  };
}

// ─── Activate Perk ─────────────────────────────────────────────────────────

export interface ActivatePerkResult {
  success: boolean;
  error?: string;
  perk?: {
    id: string;
    perkId: string;
    name: string;
    expiresAt: Date;
  };
}

/**
 * Activate a temporary perk from the alliance treasury.
 */
export async function activatePerk(
  prisma: PrismaClient,
  allianceId: string,
  perkId: string,
  activatedBy: string,
): Promise<ActivatePerkResult> {
  const def = PERK_MAP.get(perkId);
  if (!def) {
    return { success: false, error: 'Unknown perk.' };
  }

  // Check alliance level and treasury
  const alliance = await prisma.alliance.findUniqueOrThrow({
    where: { id: allianceId },
    select: { treasury: true, level: true },
  });

  if (alliance.level < def.minLevel) {
    return { success: false, error: `Alliance must be level ${def.minLevel} to activate perks.` };
  }

  if (alliance.treasury < def.treasuryCost) {
    return { success: false, error: `Insufficient treasury. Need $${formatCompact(def.treasuryCost)}, have $${formatCompact(alliance.treasury)}.` };
  }

  // Check if same perk is already active
  const existingActive = await prisma.alliancePerk.findFirst({
    where: {
      allianceId,
      perkId,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingActive) {
    return { success: false, error: `${def.name} is already active until ${existingActive.expiresAt.toISOString()}.` };
  }

  // Check activator membership and role
  const member = await prisma.allianceMember.findUnique({
    where: { profileId: activatedBy },
    select: { allianceId: true, role: true, profile: { select: { companyName: true } } },
  });

  if (!member || member.allianceId !== allianceId) {
    return { success: false, error: 'Not a member of this alliance.' };
  }

  if (!['leader', 'officer'].includes(member.role)) {
    return { success: false, error: 'Only leaders and officers can activate perks.' };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + def.durationHours * 60 * 60 * 1000);

  const [, perk] = await prisma.$transaction([
    prisma.alliance.update({
      where: { id: allianceId },
      data: { treasury: { decrement: def.treasuryCost } },
    }),
    prisma.alliancePerk.create({
      data: {
        allianceId,
        perkId: def.perkId,
        name: def.name,
        description: def.description,
        bonusType: def.bonusType,
        bonusValue: def.bonusValue,
        treasuryCost: def.treasuryCost,
        durationHours: def.durationHours,
        activatedAt: now,
        expiresAt,
        activatedBy,
      },
    }),
    prisma.allianceLog.create({
      data: {
        allianceId,
        type: 'perk_activated',
        actorId: activatedBy,
        actorName: member.profile.companyName,
        title: `${member.profile.companyName} activated ${def.name}`,
        description: `${def.description} Expires in ${def.durationHours}h. Cost: $${formatCompact(def.treasuryCost)}.`,
        metadata: { perkId: def.perkId, cost: def.treasuryCost, durationHours: def.durationHours },
      },
    }),
  ]);

  return {
    success: true,
    perk: { id: perk.id, perkId: perk.perkId, name: perk.name, expiresAt: perk.expiresAt },
  };
}

// ─── Get Active Perks ──────────────────────────────────────────────────────

/**
 * Get all currently active (non-expired) perks for an alliance.
 */
export async function getActivePerks(
  prisma: PrismaClient,
  allianceId: string,
): Promise<Array<{
  id: string;
  perkId: string;
  name: string;
  description: string;
  bonusType: string;
  bonusValue: number;
  activatedAt: Date;
  expiresAt: Date;
  remainingMs: number;
}>> {
  const perks = await prisma.alliancePerk.findMany({
    where: {
      allianceId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'asc' },
  });

  const now = Date.now();
  return perks.map(p => ({
    id: p.id,
    perkId: p.perkId,
    name: p.name,
    description: p.description,
    bonusType: p.bonusType,
    bonusValue: p.bonusValue,
    activatedAt: p.activatedAt,
    expiresAt: p.expiresAt,
    remainingMs: Math.max(0, p.expiresAt.getTime() - now),
  }));
}

// ─── Aggregate Perk Bonuses ────────────────────────────────────────────────

export interface PerkBonuses {
  revenueBonus: number;
  miningBonus: number;
  researchBonus: number;
  buildSpeedBonus: number;
  tradeBonus: number;
  xpMultiplier: number;
  rareChanceBonus: number;
  dailyXpMultiplier: number;
  memberCapBonus: number;
  zoneBonus: number;
}

/**
 * Aggregate bonuses from all currently active perks.
 */
export function getPerkBonuses(
  activePerks: Array<{ bonusType: string; bonusValue: number }>,
): PerkBonuses {
  const bonuses: PerkBonuses = {
    revenueBonus: 0,
    miningBonus: 0,
    researchBonus: 0,
    buildSpeedBonus: 0,
    tradeBonus: 0,
    xpMultiplier: 1,
    rareChanceBonus: 0,
    dailyXpMultiplier: 1,
    memberCapBonus: 0,
    zoneBonus: 0,
  };

  for (const p of activePerks) {
    switch (p.bonusType) {
      case 'revenue_bonus':       bonuses.revenueBonus += p.bonusValue; break;
      case 'mining_bonus':        bonuses.miningBonus += p.bonusValue; break;
      case 'research_speed':      bonuses.researchBonus += p.bonusValue; break;
      case 'build_speed':         bonuses.buildSpeedBonus += p.bonusValue; break;
      case 'trade_bonus':         bonuses.tradeBonus += p.bonusValue; break;
      case 'xp_multiplier':       bonuses.xpMultiplier = Math.max(bonuses.xpMultiplier, p.bonusValue); break;
      case 'rare_chance':         bonuses.rareChanceBonus += p.bonusValue; break;
      case 'daily_xp_multiplier': bonuses.dailyXpMultiplier = Math.max(bonuses.dailyXpMultiplier, p.bonusValue); break;
      case 'member_cap':          bonuses.memberCapBonus += p.bonusValue; break;
      case 'zone_bonus':          bonuses.zoneBonus += p.bonusValue; break;
    }
  }

  return bonuses;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(1)}T`;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  return amount.toLocaleString();
}
