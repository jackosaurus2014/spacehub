// ─── Space Tycoon: Alliance Diplomacy — Treaties & Wars ────────────────────
// Propose treaties, accept/reject, declare wars, and aggregate diplomacy bonuses.

import { PrismaClient } from '@prisma/client';

// ─── Treaty / War Definitions ──────────────────────────────────────────────

export type DiplomacyType = 'trade_agreement' | 'non_aggression' | 'alliance_pact' | 'war';
export type WarObjective = 'zone_control' | 'economic_dominance' | 'event_supremacy';

export interface TreatyDefinition {
  type: DiplomacyType;
  name: string;
  description: string;
  durationDays: number;
  /** Max simultaneous treaties of this type per alliance */
  maxActive: number;
  /** Minimum alliance level to propose */
  minLevel: number;
  bonuses: {
    tradeBonus?: number;      // e.g., -2% fee => 0.02
    zoneBonus?: number;        // combined zone influence
    espionageProtection?: boolean;
  };
}

export const TREATY_DEFINITIONS: TreatyDefinition[] = [
  {
    type: 'trade_agreement', name: 'Trade Agreement',
    description: 'Mutual -2% trade fees between alliances.',
    durationDays: 30, maxActive: 5, minLevel: 10,
    bonuses: { tradeBonus: 0.02 },
  },
  {
    type: 'non_aggression', name: 'Non-Aggression Pact',
    description: 'Prevents espionage operations between alliances.',
    durationDays: 30, maxActive: 5, minLevel: 15,
    bonuses: { espionageProtection: true },
  },
  {
    type: 'alliance_pact', name: 'Alliance Pact',
    description: 'Combined +10% zone influence and trade benefits. Max 2 pacts.',
    durationDays: 60, maxActive: 2, minLevel: 20,
    bonuses: { tradeBonus: 0.02, zoneBonus: 0.10 },
  },
];

export const TREATY_MAP = new Map(
  TREATY_DEFINITIONS.map(t => [t.type, t])
);

export const WAR_DEFINITION = {
  durationDays: 7,
  minLevel: 30,
  winnerXPReward: 500,
  winnerBadge: 'war_victor',
  objectives: ['zone_control', 'economic_dominance', 'event_supremacy'] as WarObjective[],
};

// ─── Propose Diplomacy ─────────────────────────────────────────────────────

export interface ProposeDiplomacyResult {
  success: boolean;
  error?: string;
  diplomacyId?: string;
}

/**
 * Propose a treaty or declare war on another alliance.
 */
export async function proposeDiplomacy(
  prisma: PrismaClient,
  senderId: string,
  receiverId: string,
  type: DiplomacyType,
  proposedBy: string,
  warObjective?: WarObjective,
): Promise<ProposeDiplomacyResult> {
  if (senderId === receiverId) {
    return { success: false, error: 'Cannot create diplomacy with yourself.' };
  }

  // Verify proposer is leader/officer of sender alliance
  const member = await prisma.allianceMember.findUnique({
    where: { profileId: proposedBy },
    select: { allianceId: true, role: true, profile: { select: { companyName: true } } },
  });

  if (!member || member.allianceId !== senderId) {
    return { success: false, error: 'Not a member of the proposing alliance.' };
  }

  if (!['leader', 'officer'].includes(member.role)) {
    return { success: false, error: 'Only leaders and officers can propose diplomacy.' };
  }

  // Get both alliances
  const [senderAlliance, receiverAlliance] = await Promise.all([
    prisma.alliance.findUnique({ where: { id: senderId }, select: { level: true, name: true, tag: true } }),
    prisma.alliance.findUnique({ where: { id: receiverId }, select: { level: true, name: true, tag: true } }),
  ]);

  if (!senderAlliance || !receiverAlliance) {
    return { success: false, error: 'Alliance not found.' };
  }

  // Check for war
  if (type === 'war') {
    if (senderAlliance.level < WAR_DEFINITION.minLevel) {
      return { success: false, error: `Alliance must be level ${WAR_DEFINITION.minLevel} to declare war.` };
    }
    if (!warObjective || !WAR_DEFINITION.objectives.includes(warObjective)) {
      return { success: false, error: 'Invalid or missing war objective.' };
    }

    // Check no existing active war between these alliances
    const existingWar = await prisma.allianceDiplomacy.findFirst({
      where: {
        type: 'war',
        status: 'active',
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existingWar) {
      return { success: false, error: 'Already at war with this alliance.' };
    }

    // Wars start immediately (no pending state)
    const now = new Date();
    const endsAt = new Date(now.getTime() + WAR_DEFINITION.durationDays * 24 * 60 * 60 * 1000);

    const diplomacy = await prisma.allianceDiplomacy.create({
      data: {
        senderId,
        receiverId,
        type: 'war',
        status: 'active',
        proposedBy,
        warScore: { senderScore: 0, receiverScore: 0 },
        warObjective,
        startsAt: now,
        endsAt,
      },
    });

    // Log for both alliances
    await prisma.allianceLog.createMany({
      data: [
        {
          allianceId: senderId,
          type: 'war_declared',
          actorId: proposedBy,
          actorName: member.profile.companyName,
          title: `War declared against [${receiverAlliance.tag}] ${receiverAlliance.name}!`,
          description: `Objective: ${warObjective?.replace(/_/g, ' ')}. Duration: ${WAR_DEFINITION.durationDays} days.`,
          metadata: { targetAllianceId: receiverId, objective: warObjective },
        },
        {
          allianceId: receiverId,
          type: 'war_declared',
          actorId: null,
          actorName: null,
          title: `[${senderAlliance.tag}] ${senderAlliance.name} declared war!`,
          description: `Objective: ${warObjective?.replace(/_/g, ' ')}. Duration: ${WAR_DEFINITION.durationDays} days.`,
          metadata: { attackerAllianceId: senderId, objective: warObjective },
        },
      ],
    });

    return { success: true, diplomacyId: diplomacy.id };
  }

  // Treaty logic
  const treatyDef = TREATY_MAP.get(type);
  if (!treatyDef) {
    return { success: false, error: 'Unknown diplomacy type.' };
  }

  if (senderAlliance.level < treatyDef.minLevel) {
    return { success: false, error: `Alliance must be level ${treatyDef.minLevel} to propose ${treatyDef.name}.` };
  }

  // Check if treaty already exists (active or pending) between these alliances
  const existing = await prisma.allianceDiplomacy.findFirst({
    where: {
      type,
      status: { in: ['pending', 'active'] },
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });

  if (existing) {
    return { success: false, error: `A ${treatyDef.name} already exists or is pending between these alliances.` };
  }

  // Check max active treaties for sender
  const senderActiveCount = await prisma.allianceDiplomacy.count({
    where: {
      type,
      status: 'active',
      OR: [{ senderId }, { receiverId: senderId }],
    },
  });

  if (senderActiveCount >= treatyDef.maxActive) {
    return { success: false, error: `Maximum ${treatyDef.maxActive} active ${treatyDef.name}(s) allowed.` };
  }

  const diplomacy = await prisma.allianceDiplomacy.create({
    data: {
      senderId,
      receiverId,
      type,
      status: 'pending',
      proposedBy,
      tradeBonus: treatyDef.bonuses.tradeBonus ?? null,
    },
  });

  // Log for sender
  await prisma.allianceLog.create({
    data: {
      allianceId: senderId,
      type: 'treaty_proposed',
      actorId: proposedBy,
      actorName: member.profile.companyName,
      title: `${treatyDef.name} proposed to [${receiverAlliance.tag}] ${receiverAlliance.name}`,
      metadata: { diplomacyId: diplomacy.id, targetAllianceId: receiverId, treatyType: type },
    },
  });

  return { success: true, diplomacyId: diplomacy.id };
}

// ─── Respond to Diplomacy ──────────────────────────────────────────────────

export interface RespondDiplomacyResult {
  success: boolean;
  error?: string;
  status?: string;
}

/**
 * Accept or reject a pending treaty proposal.
 * Only leader/officer of the RECEIVER alliance can respond.
 */
export async function respondToDiplomacy(
  prisma: PrismaClient,
  diplomacyId: string,
  accept: boolean,
  responderId: string,
): Promise<RespondDiplomacyResult> {
  const diplomacy = await prisma.allianceDiplomacy.findUnique({
    where: { id: diplomacyId },
    include: {
      sender: { select: { name: true, tag: true } },
      receiver: { select: { name: true, tag: true } },
    },
  });

  if (!diplomacy) {
    return { success: false, error: 'Diplomacy record not found.' };
  }

  if (diplomacy.status !== 'pending') {
    return { success: false, error: `Cannot respond to a ${diplomacy.status} diplomacy.` };
  }

  // Verify responder is leader/officer of receiver alliance
  const member = await prisma.allianceMember.findUnique({
    where: { profileId: responderId },
    select: { allianceId: true, role: true, profile: { select: { companyName: true } } },
  });

  if (!member || member.allianceId !== diplomacy.receiverId) {
    return { success: false, error: 'Only members of the receiving alliance can respond.' };
  }

  if (!['leader', 'officer'].includes(member.role)) {
    return { success: false, error: 'Only leaders and officers can respond to diplomacy.' };
  }

  if (accept) {
    const treatyDef = TREATY_MAP.get(diplomacy.type as DiplomacyType);
    const durationDays = treatyDef?.durationDays ?? 30;
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await prisma.allianceDiplomacy.update({
      where: { id: diplomacyId },
      data: { status: 'active', startsAt: now, endsAt },
    });

    // Log for both
    await prisma.allianceLog.createMany({
      data: [
        {
          allianceId: diplomacy.senderId,
          type: 'treaty_signed',
          actorId: null,
          actorName: null,
          title: `${treatyDef?.name ?? diplomacy.type} accepted by [${diplomacy.receiver.tag}] ${diplomacy.receiver.name}`,
          metadata: { diplomacyId, partnerAllianceId: diplomacy.receiverId },
        },
        {
          allianceId: diplomacy.receiverId,
          type: 'treaty_signed',
          actorId: responderId,
          actorName: member.profile.companyName,
          title: `${treatyDef?.name ?? diplomacy.type} accepted with [${diplomacy.sender.tag}] ${diplomacy.sender.name}`,
          metadata: { diplomacyId, partnerAllianceId: diplomacy.senderId },
        },
      ],
    });

    return { success: true, status: 'active' };
  } else {
    await prisma.allianceDiplomacy.update({
      where: { id: diplomacyId },
      data: { status: 'rejected', resolvedAt: new Date() },
    });

    return { success: true, status: 'rejected' };
  }
}

// ─── Get Active Diplomacy ──────────────────────────────────────────────────

export interface ActiveDiplomacyRecord {
  id: string;
  type: string;
  status: string;
  partnerAllianceId: string;
  partnerAllianceName: string;
  partnerAllianceTag: string;
  tradeBonus: number | null;
  warScore: { senderScore: number; receiverScore: number } | null;
  warObjective: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  remainingMs: number;
  isSender: boolean;
}

/**
 * Get all active diplomacy records for an alliance (treaties + wars).
 * Also returns pending proposals received.
 */
export async function getActiveDiplomacy(
  prisma: PrismaClient,
  allianceId: string,
): Promise<{ active: ActiveDiplomacyRecord[]; pending: ActiveDiplomacyRecord[] }> {
  const records = await prisma.allianceDiplomacy.findMany({
    where: {
      status: { in: ['active', 'pending'] },
      OR: [
        { senderId: allianceId },
        { receiverId: allianceId },
      ],
    },
    include: {
      sender: { select: { id: true, name: true, tag: true } },
      receiver: { select: { id: true, name: true, tag: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = Date.now();
  const active: ActiveDiplomacyRecord[] = [];
  const pending: ActiveDiplomacyRecord[] = [];

  for (const r of records) {
    const isSender = r.senderId === allianceId;
    const partner = isSender ? r.receiver : r.sender;

    const record: ActiveDiplomacyRecord = {
      id: r.id,
      type: r.type,
      status: r.status,
      partnerAllianceId: partner.id,
      partnerAllianceName: partner.name,
      partnerAllianceTag: partner.tag,
      tradeBonus: r.tradeBonus,
      warScore: r.warScore as { senderScore: number; receiverScore: number } | null,
      warObjective: r.warObjective,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      remainingMs: r.endsAt ? Math.max(0, r.endsAt.getTime() - now) : 0,
      isSender,
    };

    if (r.status === 'active') {
      active.push(record);
    } else {
      pending.push(record);
    }
  }

  return { active, pending };
}

// ─── Aggregate Diplomacy Bonuses ───────────────────────────────────────────

export interface DiplomacyBonuses {
  tradeBonus: number;
  zoneBonus: number;
  espionageProtection: boolean;
}

/**
 * Aggregate bonuses from all active diplomacy for an alliance.
 */
export function getDiplomacyBonuses(
  activeDiplomacy: Array<{ type: string; tradeBonus: number | null }>,
): DiplomacyBonuses {
  const bonuses: DiplomacyBonuses = {
    tradeBonus: 0,
    zoneBonus: 0,
    espionageProtection: false,
  };

  for (const d of activeDiplomacy) {
    const def = TREATY_MAP.get(d.type as DiplomacyType);
    if (!def) continue;

    if (def.bonuses.tradeBonus) {
      bonuses.tradeBonus += def.bonuses.tradeBonus;
    }
    if (def.bonuses.zoneBonus) {
      bonuses.zoneBonus += def.bonuses.zoneBonus;
    }
    if (def.bonuses.espionageProtection) {
      bonuses.espionageProtection = true;
    }
  }

  return bonuses;
}
