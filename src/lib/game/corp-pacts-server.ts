// ─── Space Tycoon: Corp-to-corp pacts — server I/O + enforcement lookups ────
// docs/ECONOMY_PVP_2026-08.md "Diplomacy (2026-09-02)". Pure rules live in
// corp-pacts.ts. This module owns the CorpPact rows and the two calls the
// offense routes make:
//
//   findBlockingPact(actorId, targetId, action)  — poach / espionage / zone
//   findNonAggressionCampaignBlock(actorId, slug) — price campaigns, where
//     the "target" is whoever holds ≥ 40% of the market (market-share.ts)
//
// Both return null fast when the actor has no active pact at all, so the
// common case costs one indexed query.

import prisma from '@/lib/db';
import type { Prisma } from '@prisma/client';
import {
  clampPactDurationDays,
  describePactKind,
  isCorpPactKind,
  pactEndsAt,
  pactKindsBlocking,
  pactRefusal,
  CORP_PACT_BREAK_REP,
  CORP_PACT_MAX_ACTIVE_PER_PROFILE,
  NON_AGGRESSION_SHARE_THRESHOLD_PCT,
  type CorpPactKind,
  type PactGuardedAction,
  type PactRefusalBody,
} from './corp-pacts';
import { DIPLOMACY_ACTIVITY } from './corp-diplomacy';
import { getResourceShare } from './market-share';

export interface PactHandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export interface PactProfileRow {
  id: string;
  companyName: string;
}

function bad(error: string, extra: Record<string, unknown> = {}): PactHandlerResult {
  return { status: 400, body: { error, ...extra } };
}

async function logActivity(args: { profileId: string; companyName: string; type: string; title: string; description?: string; metadata?: Record<string, unknown> }): Promise<void> {
  try {
    await prisma.playerActivity.create({
      data: {
        profileId: args.profileId,
        companyName: args.companyName,
        type: args.type,
        title: args.title,
        description: args.description ?? null,
        metadata: (args.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch { /* non-critical */ }
}

// ─── Enforcement lookups ────────────────────────────────────────────────────

export interface ActivePactLite {
  id: string;
  kind: string;
  proposerProfileId: string;
  counterpartyProfileId: string;
  endsAt: Date | null;
}

/** An active pact of one of `kinds` between the two profiles (either
 *  direction), or null. Schema lag / DB errors read as "no pact" — the
 *  offense route then behaves exactly as it did before this wave. */
export async function findActivePact(a: string, b: string, kinds: CorpPactKind[]): Promise<ActivePactLite | null> {
  if (!a || !b || a === b || kinds.length === 0) return null;
  try {
    const row = await prisma.corpPact.findFirst({
      where: {
        status: 'active',
        kind: { in: kinds },
        endsAt: { gt: new Date() },
        OR: [
          { proposerProfileId: a, counterpartyProfileId: b },
          { proposerProfileId: b, counterpartyProfileId: a },
        ],
      },
      select: { id: true, kind: true, proposerProfileId: true, counterpartyProfileId: true, endsAt: true },
    });
    return row ?? null;
  } catch {
    return null;
  }
}

/** The 400 body to return when an active pact forbids `action` against
 *  `targetId`, or null when the actor is free to proceed. */
export async function findBlockingPact(
  actorId: string,
  targetId: string,
  action: PactGuardedAction,
  targetName?: string,
): Promise<PactRefusalBody | null> {
  const kinds = pactKindsBlocking(action);
  const pact = await findActivePact(actorId, targetId, kinds);
  if (!pact) return null;
  let partner = targetName ?? '';
  if (!partner) {
    try {
      const row = await prisma.gameProfile.findUnique({ where: { id: targetId }, select: { companyName: true } });
      partner = row?.companyName ?? 'your pact partner';
    } catch { partner = 'your pact partner'; }
  }
  return pactRefusal(pact, partner, action);
}

/**
 * non_aggression clause for price campaigns: refused when ANY partner under
 * an active non-aggression pact holds ≥ NON_AGGRESSION_SHARE_THRESHOLD_PCT
 * of the resource's trailing-window traded value. The share read is
 * server-internal (`full: true`) — enforcement, not disclosure; the refusal
 * body names the partner only (a corp already knows who it signed with).
 */
export async function findNonAggressionCampaignBlock(actorId: string, resourceSlug: string): Promise<PactRefusalBody | null> {
  let pacts: ActivePactLite[] = [];
  try {
    pacts = await prisma.corpPact.findMany({
      where: {
        status: 'active', kind: 'non_aggression', endsAt: { gt: new Date() },
        OR: [{ proposerProfileId: actorId }, { counterpartyProfileId: actorId }],
      },
      select: { id: true, kind: true, proposerProfileId: true, counterpartyProfileId: true, endsAt: true },
      take: CORP_PACT_MAX_ACTIVE_PER_PROFILE,
    });
  } catch { return null; }
  if (pacts.length === 0) return null;
  const partnerIds = new Map<string, ActivePactLite>();
  for (const p of pacts) partnerIds.set(p.proposerProfileId === actorId ? p.counterpartyProfileId : p.proposerProfileId, p);
  let share: Awaited<ReturnType<typeof getResourceShare>>;
  try {
    share = await getResourceShare(resourceSlug, { full: true });
  } catch { return null; }
  for (const entry of share.entries) {
    const pact = partnerIds.get(entry.profileId);
    if (pact && entry.sharePct >= NON_AGGRESSION_SHARE_THRESHOLD_PCT) {
      return pactRefusal(pact, entry.companyName ?? 'your pact partner', 'price_campaign');
    }
  }
  return null;
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

export async function expireCorpPacts(nowMs: number = Date.now()): Promise<number> {
  const res = await prisma.corpPact.updateMany({
    where: { status: 'active', endsAt: { lt: new Date(nowMs) } },
    data: { status: 'expired', resolvedAt: new Date(nowMs) },
  });
  return res.count;
}

export interface ProposePactInput {
  counterpartyProfileId?: string;
  counterpartyCompanyName?: string;
  kind: string;
  durationDays?: number;
  terms?: unknown;
}

export async function proposeCorpPact(profile: PactProfileRow, input: ProposePactInput): Promise<PactHandlerResult> {
  if (!isCorpPactKind(input.kind)) return bad('Unknown pact kind.');
  const kind = input.kind;
  const target = input.counterpartyProfileId
    ? await prisma.gameProfile.findUnique({ where: { id: input.counterpartyProfileId }, select: { id: true, companyName: true } })
    : input.counterpartyCompanyName
      ? await prisma.gameProfile.findFirst({ where: { companyName: String(input.counterpartyCompanyName) }, select: { id: true, companyName: true } })
      : null;
  if (!target) return { status: 404, body: { error: 'Counterparty corporation not found.' } };
  if (target.id === profile.id) return bad('You cannot sign a pact with yourself.');

  const existing = await prisma.corpPact.findFirst({
    where: {
      kind, status: { in: ['proposed', 'active'] },
      OR: [
        { proposerProfileId: profile.id, counterpartyProfileId: target.id },
        { proposerProfileId: target.id, counterpartyProfileId: profile.id },
      ],
    },
    select: { id: true, status: true },
  });
  if (existing) return bad(`A ${describePactKind(kind)} with ${target.companyName} is already ${existing.status}.`, { pactId: existing.id });

  const activeCount = await prisma.corpPact.count({
    where: { status: 'active', OR: [{ proposerProfileId: profile.id }, { counterpartyProfileId: profile.id }] },
  });
  if (activeCount >= CORP_PACT_MAX_ACTIVE_PER_PROFILE) return bad(`You already hold ${CORP_PACT_MAX_ACTIVE_PER_PROFILE} active pacts.`);

  const durationDays = clampPactDurationDays(input.durationDays);
  const terms = input.terms && typeof input.terms === 'object' ? (input.terms as Prisma.InputJsonValue) : undefined;
  const pact = await prisma.corpPact.create({
    data: {
      proposerProfileId: profile.id,
      counterpartyProfileId: target.id,
      kind,
      status: 'proposed',
      durationDays,
      termsJson: terms,
    },
  });
  return { status: 200, body: { success: true, pactId: pact.id, kind, durationDays, counterparty: target.companyName, status: 'proposed' } };
}

export async function respondCorpPact(profile: PactProfileRow, pactId: string, accept: boolean): Promise<PactHandlerResult> {
  const pact = await prisma.corpPact.findUnique({
    where: { id: pactId },
    include: { proposer: { select: { id: true, companyName: true } } },
  });
  if (!pact || pact.counterpartyProfileId !== profile.id) return { status: 404, body: { error: 'No such pact proposed to you.' } };
  if (pact.status !== 'proposed') return bad(`This pact is ${pact.status}.`);

  if (!accept) {
    await prisma.corpPact.updateMany({ where: { id: pact.id, status: 'proposed' }, data: { status: 'declined', resolvedAt: new Date() } });
    return { status: 200, body: { success: true, status: 'declined' } };
  }

  const now = Date.now();
  const endsAt = new Date(pactEndsAt(now, pact.durationDays));
  const updated = await prisma.corpPact.updateMany({
    where: { id: pact.id, status: 'proposed' },
    data: { status: 'active', startsAt: new Date(now), endsAt },
  });
  if (updated.count === 0) return { status: 409, body: { error: 'Pact changed concurrently.' } };

  await logActivity({
    profileId: profile.id,
    companyName: profile.companyName,
    type: DIPLOMACY_ACTIVITY.pact_signed,
    title: `${pact.proposer.companyName} and ${profile.companyName} signed a ${describePactKind(pact.kind)}`,
    description: `${pact.durationDays}-day term, through ${endsAt.toISOString().slice(0, 10)}. Breaking it costs ${CORP_PACT_BREAK_REP} reputation, in public.`,
    metadata: { pactId: pact.id, kind: pact.kind, durationDays: pact.durationDays, parties: [pact.proposer.companyName, profile.companyName] },
  });
  return { status: 200, body: { success: true, status: 'active', endsAt: endsAt.toISOString() } };
}

export async function breakCorpPact(profile: PactProfileRow, pactId: string): Promise<PactHandlerResult> {
  const pact = await prisma.corpPact.findUnique({
    where: { id: pactId },
    include: { proposer: { select: { companyName: true } }, counterparty: { select: { companyName: true } } },
  });
  if (!pact) return { status: 404, body: { error: 'Pact not found.' } };
  if (pact.proposerProfileId !== profile.id && pact.counterpartyProfileId !== profile.id) return bad('You are not a party to this pact.');
  if (pact.status !== 'active') return bad(`This pact is ${pact.status}.`);

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const updated = await tx.corpPact.updateMany({
      where: { id: pact.id, status: 'active' },
      data: { status: 'broken', brokenByProfileId: profile.id, brokenAt: now, resolvedAt: now },
    });
    if (updated.count === 0) throw new Error('Pact changed concurrently');
    await tx.corpReputationEvent.create({
      data: { profileId: profile.id, delta: CORP_PACT_BREAK_REP, reason: 'pact_broken', refId: pact.id },
    });
  });

  const partner = pact.proposerProfileId === profile.id ? pact.counterparty.companyName : pact.proposer.companyName;
  await logActivity({
    profileId: profile.id,
    companyName: profile.companyName,
    type: DIPLOMACY_ACTIVITY.pact_broken,
    title: `${profile.companyName} broke a ${describePactKind(pact.kind)} with ${partner}`,
    description: `The pact had ${Math.max(0, Math.ceil(((pact.endsAt?.getTime() ?? now.getTime()) - now.getTime()) / 86_400_000))} days left to run. ${CORP_PACT_BREAK_REP} reputation.`,
    metadata: { pactId: pact.id, kind: pact.kind, parties: [profile.companyName, partner] },
  });
  return { status: 200, body: { success: true, status: 'broken', reputation: CORP_PACT_BREAK_REP } };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export interface PactView {
  id: string;
  kind: string;
  kindLabel: string;
  status: string;
  proposerName: string;
  counterpartyName: string;
  proposerProfileId: string;
  counterpartyProfileId: string;
  partnerName: string;
  durationDays: number;
  startsAt: string | null;
  endsAt: string | null;
  brokenBy: string | null;
  createdAt: string;
  role: 'proposer' | 'counterparty' | 'none';
}

type PactRow = Prisma.CorpPactGetPayload<{ include: { proposer: { select: { companyName: true } }; counterparty: { select: { companyName: true } } } }>;

export function toPactView(p: PactRow, viewerId: string | null): PactView {
  const role: PactView['role'] = viewerId === p.proposerProfileId ? 'proposer' : viewerId === p.counterpartyProfileId ? 'counterparty' : 'none';
  return {
    id: p.id,
    kind: p.kind,
    kindLabel: describePactKind(p.kind),
    status: p.status,
    proposerName: p.proposer.companyName,
    counterpartyName: p.counterparty.companyName,
    proposerProfileId: p.proposerProfileId,
    counterpartyProfileId: p.counterpartyProfileId,
    partnerName: role === 'proposer' ? p.counterparty.companyName : p.proposer.companyName,
    durationDays: p.durationDays,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    brokenBy: p.brokenByProfileId
      ? (p.brokenByProfileId === p.proposerProfileId ? p.proposer.companyName : p.counterparty.companyName)
      : null,
    createdAt: p.createdAt.toISOString(),
    role,
  };
}

const PACT_INCLUDE = { proposer: { select: { companyName: true } }, counterparty: { select: { companyName: true } } } as const;

export async function listCorpPacts(profileId: string): Promise<{ active: PactView[]; proposedToMe: PactView[]; proposedByMe: PactView[]; history: PactView[] }> {
  const rows = await prisma.corpPact.findMany({
    where: { OR: [{ proposerProfileId: profileId }, { counterpartyProfileId: profileId }] },
    include: PACT_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 80,
  });
  const views = rows.map(r => toPactView(r, profileId));
  return {
    active: views.filter(v => v.status === 'active'),
    proposedToMe: views.filter(v => v.status === 'proposed' && v.role === 'counterparty'),
    proposedByMe: views.filter(v => v.status === 'proposed' && v.role === 'proposer'),
    history: views.filter(v => !['active', 'proposed'].includes(v.status)).slice(0, 30),
  };
}

/** The public registry: every signed pact (active, expired, broken). */
export async function listPublicPacts(limit = 100): Promise<PactView[]> {
  const rows = await prisma.corpPact.findMany({
    where: { status: { in: ['active', 'expired', 'broken'] } },
    include: PACT_INCLUDE,
    orderBy: [{ status: 'asc' }, { endsAt: 'desc' }],
    take: Math.max(1, Math.min(200, limit)),
  });
  return rows.map(r => toPactView(r, null));
}
