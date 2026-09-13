import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { notQaProfile } from '@/lib/qa-accounts';
import { tierFromProfileScalars } from '@/lib/game/corporation-tiers';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import {
  ASSET_KIND_BUILDING, ASSET_KIND_RESEARCH, ASSET_KIND_SHIP, LIVE_SHIP_STATUSES,
  ensureAssetAdoption, ensureAssetAdoption2, loadServerRegistry, rowsOfKind,
} from '@/lib/game/server-assets';
import {
  InsufficientFundsError,
  badRequest,
  debitMoney,
  findLedgerSeq,
  fundsError,
  loadAssetProfile,
} from '@/lib/game/asset-route-shared';
import { HQ_SEAT_COUNTS, getHqStage, hqSeatIsAuctioned, hqStageForLocationId, isHqStageId, type HqStageId } from '@/lib/game/headquarters';
import { checkHqRelocationRequest, type HqRequirementView } from '@/lib/game/hq-relocation';
import {
  HqSeatUnavailableError,
  claimHqSeat,
  completeDueHqRelocations,
  findHeldHqSeat,
  loadHeadquartersBlock,
  loadHqSeatPoolSummary,
  loadPendingHqRelocation,
} from '@/lib/game/hq-relocation-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/space-tycoon/hq/relocate — start a headquarters relocation
 * project (CC-2, docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2-3, §8).
 * Body: { toStage: HqStageId }.
 *
 * Server-authoritative, same shape as /assets/*: session → profile →
 * throttle → validate against PERSISTED facts only (tier from the profile
 * scalars, the required station from the ServerAsset registry, the seat
 * pool from HqSeat) → one transaction that claims the seat (posted price,
 * burned), debits the relocation cost through the One-Wallet ledger and
 * inserts the HqRelocation row. Completion is the assets-complete cron /
 * the sync's lazy pass (hq-relocation-server.ts completeDueHqRelocations).
 * Rules: ONE HQ per corporation, ONE project at a time, QA profiles never
 * hold seats, moving back to Earth costs 25% of the departing stage's fee.
 */
export async function POST(request: NextRequest) {
  try {
    const loaded = await loadAssetProfile('hq');
    if (loaded.response) return loaded.response;
    const profile = loaded.profile;

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') return badRequest('Invalid body', 'invalid_body');
    const toStageRaw = body.toStage;
    if (!isHqStageId(toStageRaw)) return badRequest('Unknown headquarters stage', 'unknown_stage');
    const toStage: HqStageId = toStageRaw;

    // QA profiles never hold seats (they would strand real inventory).
    const real = await prisma.gameProfile.findFirst({ where: { id: profile.id, ...notQaProfile }, select: { id: true } });
    if (!real) return NextResponse.json({ error: 'QA accounts cannot relocate a headquarters.', code: 'qa_profile' }, { status: 403 });

    // Settle anything already due so "in progress" is a live fact.
    await completeDueHqRelocations(prisma, profile.id);
    const pending = await loadPendingHqRelocation(profile.id);
    if (pending) return NextResponse.json({ error: 'A relocation is already under way — one project at a time.', code: 'in_progress' }, { status: 409 });

    const fresh = await prisma.gameProfile.findUnique({ where: { id: profile.id }, select: { hqLocationId: true, createdAt: true, money: true } });
    const fromStage = hqStageForLocationId(fresh?.hqLocationId);

    // Requirements from persisted facts only.
    let registry;
    try {
      await ensureAssetAdoption(profile, prisma);
      await ensureAssetAdoption2(profile, prisma);
      registry = await loadServerRegistry(profile.id, profile, { mode: 'shadow' });
    } catch (err) {
      logger.error('Asset registry unavailable (hq/relocate)', { error: String(err) });
      return NextResponse.json({ error: 'Asset registry unavailable', code: 'registry_unavailable' }, { status: 503 });
    }
    const view: HqRequirementView = {
      tier: tierFromProfileScalars({
        totalEarned: profile.totalEarned, buildingCount: profile.buildingCount, researchCount: profile.researchCount,
        locationsUnlocked: profile.locationsUnlocked, serviceCount: profile.serviceCount,
      }),
      buildings: rowsOfKind(registry.rows, ASSET_KIND_BUILDING).map(r => ({ definitionId: r.definitionId, locationId: r.locationId || '', isComplete: r.status === 'complete' })),
      // CC-3: the outer rungs gate on research and hulls too — both read
      // from the registry, never from the client's claim.
      research: rowsOfKind(registry.rows, ASSET_KIND_RESEARCH).filter(r => r.status === 'complete').map(r => r.definitionId),
      ships: rowsOfKind(registry.rows, ASSET_KIND_SHIP).filter(r => LIVE_SHIP_STATUSES.includes(r.status)).map(r => r.definitionId),
    };
    // CC-3: Mars and outward are AUCTION stages — the seat must already be
    // won (or still held from a previous stay) before the charter is filed.
    const seatNeeded = HQ_SEAT_COUNTS[toStage] > 0;
    const heldSeat = seatNeeded ? await findHeldHqSeat(profile.id, toStage) : null;
    const check = checkHqRelocationRequest(
      { stage: fromStage.id, locationId: fromStage.locationId, movedAtMs: 0 },
      view,
      toStage,
      { heldSeatAtTarget: !!heldSeat },
    );
    if (!check.ok) {
      const status = check.error === 'in_progress' ? 409 : check.error === 'seat_auction' ? 409 : 400;
      return NextResponse.json({ error: check.message, code: check.error, check: check.check ?? null }, { status });
    }
    const quote = check.quote;

    // Seat: held already (an auction win, or a corporation that moved away
    // and is coming back within its lease) or — at a first-come stage only —
    // claimed now at the posted price.
    const pool = seatNeeded && !heldSeat && !hqSeatIsAuctioned(toStage) ? await loadHqSeatPoolSummary(toStage) : null;
    if (pool && pool.free <= 0) {
      return NextResponse.json({ error: `Every ${getHqStage(toStage).shortLabel} seat is taken — wait for a corporation to move or the lease to lapse.`, code: 'no_seat', pool }, { status: 409 });
    }
    const seatPriceQuoted = pool ? pool.postedPrice : 0;
    const money = fresh?.money ?? profile.money;
    const totalCost = quote.cost + seatPriceQuoted;
    if (!Number.isFinite(money) || money < totalCost) {
      return fundsError(totalCost, money, `relocation to the ${getHqStage(toStage).label}${seatPriceQuoted > 0 ? ' (incl. seat)' : ''}`);
    }

    const ledgerOn = await isLedgerAvailable();
    const now = new Date();
    const completesAt = new Date(now.getTime() + quote.durationMs);
    let created: { id: string; seatIndex: number | null; seatPrice: number };
    try {
      created = await prisma.$transaction(async (tx) => {
        let seatId: string | null = heldSeat?.id ?? null;
        let seatIndex: number | null = heldSeat?.index ?? null;
        let seatPrice = 0;
        if (seatNeeded && !heldSeat && !hqSeatIsAuctioned(toStage)) {
          const claimed = await claimHqSeat(tx, profile.id, toStage, now);
          seatId = claimed.seat.id;
          seatIndex = claimed.seat.index;
          seatPrice = claimed.price;
        }
        const row = await tx.hqRelocation.create({
          data: {
            profileId: profile.id, fromStage: fromStage.id, toStage, seatId,
            cost: quote.cost, seatPrice, status: 'pending', startedAt: now, completesAt,
          },
          select: { id: true },
        });
        if (seatPrice > 0) await debitMoney(tx, profile.id, seatPrice, 'hq_seat_lease', row.id, ledgerOn);
        await debitMoney(tx, profile.id, quote.cost, 'hq_relocation', row.id, ledgerOn);
        if (ledgerOn) {
          const seq = await findLedgerSeq(tx, profile.id, 'hq_relocation', row.id);
          if (seq !== null) await tx.hqRelocation.update({ where: { id: row.id }, data: { ledgerSeq: seq } });
        }
        return { id: row.id, seatIndex, seatPrice };
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) return fundsError(totalCost, money, `relocation to the ${getHqStage(toStage).label}`);
      if (err instanceof HqSeatUnavailableError) {
        return NextResponse.json({ error: `The last ${getHqStage(toStage).shortLabel} seat was taken a moment ago.`, code: 'no_seat' }, { status: 409 });
      }
      throw err;
    }

    logger.info('HQ relocation started', { profileId: profile.id, fromStage: fromStage.id, toStage, cost: quote.cost, seatPrice: created.seatPrice, seatIndex: created.seatIndex, relocationId: created.id, completesAt: completesAt.toISOString() });
    const headquarters = await loadHeadquartersBlock({ id: profile.id, hqLocationId: fresh?.hqLocationId, createdAt: fresh?.createdAt ?? profile.createdAt }, prisma, now);
    return NextResponse.json({
      success: true,
      relocation: {
        id: created.id, fromStage: fromStage.id, toStage,
        startedAtMs: now.getTime(), completesAtMs: completesAt.getTime(), months: quote.months,
        seatIndex: created.seatIndex,
      },
      cost: quote.cost,
      seatPrice: created.seatPrice,
      headquarters,
    });
  } catch (error) {
    logger.error('HQ relocate error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
