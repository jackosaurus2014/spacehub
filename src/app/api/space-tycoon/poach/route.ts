import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { WORKER_MAP, type WorkerType } from '@/lib/game/workforce';
import {
  maxPoachableCount, computeSigningBonus, computeRetentionCost,
  computePoachDetectionChance, applyPoachWageBump, isServerFrontierProtected,
  computePoachActionFee, POACH_COUNTEROFFER_WINDOW_MS, POACH_TARGET_COOLDOWN_MS,
  POACH_MIN_NET_WORTH, GUILD_ARBITRATION_TECH_ID,
} from '@/lib/game/talent-poaching';
import { getServerFeeIndexFactor } from '@/lib/game/fee-index-server';
import { resolveExpiredPoachOffers, freeRetentionUsed } from '@/lib/game/offense-server';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';
import { findBlockingPact } from '@/lib/game/corp-pacts-server';
import { validateBody, poachBodySchema } from '@/lib/validations';
import { validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Talent poaching — aimable wage war (Wave M5, docs/MEANINGFUL_2026-08.md
 * §3.2 O4). All money movement is ledgered (One Wallet); the crew headcount
 * transfer reaches both saves via the sync offense snapshot, applied
 * idempotently client-side (offense.ts). Frontier corps immune both
 * directions ([FRONTIER]); per-target cooldown 30 days.
 *
 * GET  — my inbox (pending offers against me), my outgoing offers, recent
 *        outcomes.
 * POST — { action: 'offer', targetProfileId, crewType, count }
 *        { action: 'respond', offerId, response: 'retain'|'free_retain'|'concede' }
 *        { action: 'withdraw', offerId }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) return NextResponse.json({ error: 'No game profile' }, { status: 404 });

    await resolveExpiredPoachOffers().catch(() => 0);

    const [incoming, outgoing] = await Promise.all([
      prisma.poachOffer.findMany({
        where: { targetId: profile.id },
        include: { attacker: { select: { companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      prisma.poachOffer.findMany({
        where: { attackerId: profile.id },
        include: { target: { select: { companyName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    return NextResponse.json({
      incoming: incoming.map(o => ({
        id: o.id,
        crewType: o.crewType,
        count: o.count,
        retentionCost: o.retentionCost,
        status: o.status,
        respondBy: o.respondBy.toISOString(),
        attackerName: o.detected ? o.attacker.companyName : null,
      })),
      outgoing: outgoing.map(o => ({
        id: o.id,
        crewType: o.crewType,
        count: o.count,
        signingBonusTotal: o.signingBonusTotal,
        status: o.status,
        respondBy: o.respondBy.toISOString(),
        targetName: o.target.companyName,
      })),
    });
  } catch (error) {
    logger.error('Poach GET error', { error: String(error) });
    return NextResponse.json({ incoming: [], outgoing: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) return NextResponse.json({ error: 'No game profile' }, { status: 404 });

    // L5 (2026-09-01 hardening): zod-validated body instead of String()/Number().
    const parsed = validateBody(poachBodySchema, await request.json().catch(() => null));
    if (!parsed.success) {
      const first = Object.values(parsed.errors)[0]?.[0] || 'Invalid request body';
      return validationError(first, parsed.errors);
    }
    const body = parsed.data;
    const ledgerOn = await isLedgerAvailable();

    // Lazy-resolve expired offers on every touch (no cron dependency).
    await resolveExpiredPoachOffers().catch(() => 0);

    // ── Make an offer ──────────────────────────────────────────────────────
    if (body.action === 'offer') {
      const targetId = body.targetProfileId;
      const crewType = body.crewType as WorkerType;
      const count = body.count;

      if (!WORKER_MAP.has(crewType)) {
        return NextResponse.json({ error: 'Unknown crew type' }, { status: 400 });
      }
      if (targetId === profile.id) {
        return NextResponse.json({ error: 'You cannot poach your own crew.' }, { status: 400 });
      }
      if (profile.netWorth < POACH_MIN_NET_WORTH) {
        return NextResponse.json({ error: `Poaching requires $${(POACH_MIN_NET_WORTH / 1_000_000).toFixed(0)}M net worth.` }, { status: 400 });
      }
      // [FRONTIER] — both directions.
      if (isServerFrontierProtected(profile.createdAt.getTime(), profile.netWorth)) {
        return NextResponse.json({ error: 'Economic offense unlocks after the Protected Frontier.' }, { status: 400 });
      }
      const target = await prisma.gameProfile.findUnique({
        where: { id: targetId },
        select: {
          id: true, companyName: true, netWorth: true, createdAt: true,
          workforceData: true,
          allianceMembership: { select: { allianceId: true } },
        },
      });
      if (!target) return NextResponse.json({ error: 'Target not found' }, { status: 404 });
      if (isServerFrontierProtected(target.createdAt.getTime(), target.netWorth)) {
        return NextResponse.json({ error: 'Target is protected by the Frontier shield.' }, { status: 400 });
      }
      // No poaching inside your own alliance (mirrors espionage).
      const myMembership = await prisma.allianceMember.findUnique({
        where: { profileId: profile.id }, select: { allianceId: true },
      });
      if (myMembership && target.allianceMembership && myMembership.allianceId === target.allianceMembership.allianceId) {
        return NextResponse.json({ error: 'Cannot poach from alliance members.' }, { status: 400 });
      }
      // Diplomacy (2026-09-02): an active no_poach pact with the target
      // refuses the offer until the actor breaks the pact in public
      // (corp-pacts.ts). 400 `pact` carries the pact id for the UI.
      const pactBlock = await findBlockingPact(profile.id, targetId, 'poach', target.companyName);
      if (pactBlock) {
        return NextResponse.json(pactBlock, { status: 400 });
      }

      // Per-target cooldown (30 days between offers at the same corp).
      const recentOffer = await prisma.poachOffer.findFirst({
        where: {
          attackerId: profile.id, targetId,
          createdAt: { gte: new Date(Date.now() - POACH_TARGET_COOLDOWN_MS) },
        },
        select: { id: true },
      });
      if (recentOffer) {
        return NextResponse.json({ error: 'Cooldown: you already made this corporation an offer within 30 days.' }, { status: 400 });
      }

      // Headcount cap: n ≤ 10% of the target's synced headcount of the type.
      const targetWorkforce = (target.workforceData as Record<string, unknown>) || {};
      const targetHeadcount = typeof targetWorkforce[`${crewType}s`] === 'number'
        ? (targetWorkforce[`${crewType}s`] as number) : 0;
      const maxN = maxPoachableCount(targetHeadcount);
      if (maxN <= 0) {
        return NextResponse.json({ error: `Target has too few ${crewType}s to poach (minimum team size applies).` }, { status: 400 });
      }
      if (count < 1 || count > maxN) {
        return NextResponse.json({ error: `You can poach 1-${maxN} ${crewType}s from this target (10% of their roster).` }, { status: 400 });
      }

      // Price at the live wage index (self-limiting: poaching in a boom is
      // expensive because the boom is priced in).
      let wageIndex = 1;
      try {
        const idx = await prisma.laborIndex.findUnique({ where: { crewType } });
        if (idx) wageIndex = idx.wageIndex;
      } catch { /* neutral fallback */ }

      const signingBonus = computeSigningBonus(crewType, count, wageIndex);
      // Balance Pass 9: action fee × the quarterly fee-index factor
      // (server-computed; factor 1 at relaunch by design).
      const feeFactor = await getServerFeeIndexFactor().catch(() => 1);
      const actionFee = computePoachActionFee(feeFactor);
      const totalCost = signingBonus + actionFee;
      if (profile.money < totalCost) {
        return NextResponse.json({
          error: `Insufficient funds: signing bonuses $${(signingBonus / 1_000_000).toFixed(1)}M (escrowed) + $${(actionFee / 1_000_000).toFixed(0)}M action fee.`,
        }, { status: 400 });
      }

      // Detection roll: target's espionage security level vs the attacker's
      // own security crew (finally a reason to hire them).
      const attackerWorkforce = (profile.workforceData as Record<string, unknown>) || {};
      const attackerSecurity = typeof attackerWorkforce['securitys'] === 'number'
        ? (attackerWorkforce['securitys'] as number) : 0;
      let targetSecurityLevel = 0;
      try {
        const esp = await prisma.espionageProfile.findUnique({ where: { profileId: targetId }, select: { securityLevel: true } });
        if (esp) targetSecurityLevel = esp.securityLevel;
      } catch { /* level 0 fallback */ }
      const detected = Math.random() < computePoachDetectionChance(attackerSecurity, targetSecurityLevel);

      const offer = await prisma.$transaction(async (tx) => {
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: { money: { decrement: totalCost }, totalSpent: { increment: actionFee } },
        });
        const created = await tx.poachOffer.create({
          data: {
            attackerId: profile.id,
            targetId,
            crewType,
            count,
            signingBonusTotal: signingBonus,
            retentionCost: computeRetentionCost(signingBonus),
            actionFee,
            wageIndexAtOffer: wageIndex,
            detected,
            status: 'pending',
            respondBy: new Date(Date.now() + POACH_COUNTEROFFER_WINDOW_MS),
          },
        });
        if (ledgerOn) {
          await recordLedger(tx, {
            profileId: profile.id, moneyDelta: -signingBonus,
            reason: 'poach_offer_escrow', refId: created.id,
          });
          await recordLedger(tx, {
            profileId: profile.id, moneyDelta: -actionFee,
            reason: 'poach_action_fee', refId: created.id,
          });
        }
        return created;
      });

      // Detected attacks take the public reputation hit immediately —
      // reputation is legible (canon). Covert offers surface on the feed
      // only at resolution (offense-server.ts).
      if (detected) {
        await prisma.playerActivity.create({
          data: {
            profileId: profile.id,
            companyName: profile.companyName,
            type: 'poach_offer_detected',
            title: `Caught poaching at ${target.companyName}`,
            description: `${target.companyName}'s counterintelligence identified ${profile.companyName} behind signing-bonus offers to ${count} of their ${crewType}s.`,
            metadata: { offerId: offer.id, crewType, count },
          },
        }).catch(() => { /* non-critical */ });
      }

      return NextResponse.json({
        success: true,
        offerId: offer.id,
        signingBonusEscrowed: signingBonus,
        actionFee,
        detected,
        respondBy: offer.respondBy.toISOString(),
      });
    }

    // ── Respond (target) ───────────────────────────────────────────────────
    if (body.action === 'respond') {
      const offer = await prisma.poachOffer.findUnique({
        where: { id: body.offerId },
        include: { attacker: { select: { id: true, companyName: true } } },
      });
      if (!offer || offer.targetId !== profile.id) {
        return NextResponse.json({ error: 'No such offer against you' }, { status: 404 });
      }
      if (offer.status !== 'pending' || offer.respondBy < new Date()) {
        return NextResponse.json({ error: 'This offer is no longer open.' }, { status: 400 });
      }
      const response = body.response;

      if (response === 'retain' || response === 'free_retain') {
        if (response === 'free_retain') {
          if (!profile.completedResearchList.includes(GUILD_ARBITRATION_TECH_ID)) {
            return NextResponse.json({ error: 'Free retention requires the Guild Arbitration Compact research.' }, { status: 400 });
          }
          if (await freeRetentionUsed(profile.id)) {
            return NextResponse.json({ error: 'Your free guild retention is already used this season.' }, { status: 400 });
          }
        } else if (profile.money < offer.retentionCost) {
          return NextResponse.json({
            error: `Retention costs $${(offer.retentionCost / 1_000_000).toFixed(1)}M (75% of the rival bonus, burned).`,
          }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
          const fresh = await tx.poachOffer.findUnique({ where: { id: offer.id }, select: { status: true } });
          if (!fresh || fresh.status !== 'pending') throw new Error('already resolved');
          await tx.poachOffer.update({
            where: { id: offer.id },
            data: { status: response === 'free_retain' ? 'retained_free' : 'retained', resolvedAt: new Date() },
          });
          if (response === 'retain') {
            // Retention payment is BURNED (paid to the crew — money sink).
            await tx.gameProfile.update({
              where: { id: profile.id },
              data: { money: { decrement: offer.retentionCost }, totalSpent: { increment: offer.retentionCost } },
            });
            if (ledgerOn) {
              await recordLedger(tx, {
                profileId: profile.id, moneyDelta: -offer.retentionCost,
                reason: 'poach_retention_payment', refId: offer.id,
              });
            }
          }
          // Refund the attacker's escrowed bonuses (the action fee is not
          // refunded — a defeated raid still cost something).
          await tx.gameProfile.update({
            where: { id: offer.attackerId },
            data: { money: { increment: offer.signingBonusTotal } },
          });
          if (ledgerOn) {
            await recordLedger(tx, {
              profileId: offer.attackerId, moneyDelta: offer.signingBonusTotal,
              reason: 'poach_escrow_refund', refId: offer.id,
            });
          }
        });
        return NextResponse.json({ success: true, status: response === 'free_retain' ? 'retained_free' : 'retained' });
      }

      if (response === 'concede') {
        await prisma.$transaction(async (tx) => {
          const fresh = await tx.poachOffer.findUnique({ where: { id: offer.id }, select: { status: true } });
          if (!fresh || fresh.status !== 'pending') throw new Error('already resolved');
          await tx.poachOffer.update({
            where: { id: offer.id },
            data: { status: 'poached', resolvedAt: new Date() },
          });
          // Escrowed bonuses burn (paid to the departing crew). Headcount
          // transfer applies via the sync offense snapshot on both saves.
          const idx = await tx.laborIndex.findFirst({ where: { crewType: offer.crewType } });
          if (idx) {
            await tx.laborIndex.update({
              where: { id: idx.id },
              data: { wageIndex: applyPoachWageBump(idx.wageIndex, offer.count) },
            });
          }
        });
        return NextResponse.json({ success: true, status: 'poached' });
      }

      return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
    }

    // ── Withdraw (attacker) ────────────────────────────────────────────────
    if (body.action === 'withdraw') {
      const offer = await prisma.poachOffer.findUnique({ where: { id: body.offerId } });
      if (!offer || offer.attackerId !== profile.id) {
        return NextResponse.json({ error: 'No such offer of yours' }, { status: 404 });
      }
      if (offer.status !== 'pending') {
        return NextResponse.json({ error: 'This offer is no longer open.' }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.poachOffer.findUnique({ where: { id: offer.id }, select: { status: true } });
        if (!fresh || fresh.status !== 'pending') throw new Error('already resolved');
        await tx.poachOffer.update({
          where: { id: offer.id },
          data: { status: 'withdrawn', resolvedAt: new Date() },
        });
        await tx.gameProfile.update({
          where: { id: profile.id },
          data: { money: { increment: offer.signingBonusTotal } },
        });
        if (ledgerOn) {
          await recordLedger(tx, {
            profileId: profile.id, moneyDelta: offer.signingBonusTotal,
            reason: 'poach_escrow_refund', refId: offer.id,
          });
        }
      });
      return NextResponse.json({ success: true, status: 'withdrawn' });
    }

    return validationError('Invalid action');
  } catch (error) {
    logger.error('Poach POST error', { error: String(error) });
    return NextResponse.json({ error: 'Poach action failed' }, { status: 500 });
  }
}
