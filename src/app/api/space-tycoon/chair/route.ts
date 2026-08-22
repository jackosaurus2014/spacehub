import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { recordLedgerStandalone, isLedgerAvailable } from '@/lib/game/server-ledger';
import { getGlobalGameDate } from '@/lib/game/server-time';
import { MEASURE_MAP } from '@/lib/game/accord-senate';
import { FACTION_MAP, type FactionId } from '@/lib/game/factions';
import {
  CHAIR_WRITS_PER_TERM,
  chairFilingFee,
  fractureReaccessionBond,
  checkCandidacyEligibility,
  checkReaccession,
  computeChairVoteWeight,
  applyConcentrationCap,
  getChairPhase,
  nextAmendableQuarterIndex,
  type ChairWritMode,
} from '@/lib/game/accord-chair';
import {
  isChairSchemaAvailable,
  getServerChairGate,
  buildChairVoterRecord,
  getFractureStatus,
  buildChairSnapshot,
} from '@/lib/game/server-chair';

export const dynamic = 'force-dynamic';

/**
 * AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md "E1 implementation"):
 * the Accord Chair — every player-facing action. Certification and term
 * rollover live in ./resolve (cron).
 *
 * Everything here is population-gated (accord-chair.ts getChairGateStatus):
 * below the electorate threshold every mutation answers 409
 * 'awaiting_electorate' and the panel says so honestly rather than running a
 * four-corporation election and calling it the Accord.
 *
 * POST actions:
 *   file_candidacy   — stand for the Chair on a published platform (one
 *                      catalogue measure + seat/table + a patron faction you
 *                      hold Friendly standing with). Burns a filing fee.
 *   withdraw         — pull your candidacy. The fee is NOT refunded.
 *   cast_ballot      — vote. Weight is recomputed server-side from your
 *                      PublishedCorpReport rows; the client cannot claim it.
 *   issue_writ       — THE CHAIR'S VERB. Substitute one measure into (or out
 *                      of) one upcoming Senate docket, world-shared.
 *   fracture         — file Articles of Fracture: leave Accord jurisdiction.
 *   reaccede         — rejoin, against a burned bond, after the minimum term.
 *
 * Money: the client is authoritative for its own wallet, so fees are debited
 * through the server ledger (server-ledger.ts) as negative deltas the client
 * reconciles on its next sync — the One Wallet path every other server-side
 * charge in the game uses. Both fees are BURNED (BALANCE.md money sinks):
 * neither has a matching credit anywhere.
 */

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getProfile(userId: string) {
  return prisma.gameProfile.findUnique({ where: { userId } });
}

/** Faction standing as the server knows it: the sync route stashes the
 *  client-claimed map in workforceData._factionRep (the shipped trust level
 *  for this field — see sync/route.ts and market/trade's use of the same
 *  stash). Read here to verify a patron-faction claim. */
function stashedFactionRep(workforceData: unknown, factionId: FactionId): number {
  const rep = (workforceData as { _factionRep?: Record<string, number> } | null)?._factionRep;
  const v = rep?.[factionId];
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(-100, Math.min(100, v)) : 0;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return err('Must be logged in', 401);
    const profile = await getProfile(session.user.id);
    if (!profile) return err('No game profile', 404);

    if (!(await isChairSchemaAvailable())) {
      return NextResponse.json({ available: false, snapshot: null });
    }
    const snapshot = await buildChairSnapshot(
      { id: profile.id, companyName: profile.companyName },
      Date.now(),
    );
    return NextResponse.json({ available: true, snapshot });
  } catch (error) {
    logger.error('Chair GET failed', { error: String(error) });
    return err('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return err('Must be logged in', 401);
    const profile = await getProfile(session.user.id);
    if (!profile) return err('No game profile', 404);

    if (!(await isChairSchemaAvailable())) {
      return err('The Accord Chair is not provisioned on this shard.', 503);
    }

    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const now = Date.now();
    const gate = await getServerChairGate(now);
    const phase = getChairPhase(now);

    if (!gate.enabled) {
      return NextResponse.json(
        {
          error: gate.reason === 'disabled_by_flag'
            ? 'The Accord Chair is disabled on this shard.'
            : `The Accord Chair convenes once ${gate.requiredElectorate} corporations have published a quarterly report. ${gate.electorate} have so far.`,
          gate,
        },
        { status: 409 },
      );
    }

    const [record, fracture, ledgerOn] = await Promise.all([
      buildChairVoterRecord(profile.id, now),
      getFractureStatus(profile.id),
      isLedgerAvailable(),
    ]);
    const weight = computeChairVoteWeight(record, now);
    const publishedNetWorth = record?.netWorth ?? 0;

    switch (action) {
      // ── Stand for the Chair ────────────────────────────────────────────
      case 'file_candidacy': {
        const measureId = typeof body.measureId === 'string' ? body.measureId : '';
        const mode: ChairWritMode = body.mode === 'table' ? 'table' : 'seat';
        const patronFactionId = typeof body.patronFactionId === 'string'
          ? (body.patronFactionId as FactionId)
          : ('' as FactionId);

        if (!MEASURE_MAP.has(measureId)) return err('Unknown measure.');
        if (!FACTION_MAP.has(patronFactionId)) return err('Unknown patron faction.');

        const patronStanding = stashedFactionRep(profile.workforceData, patronFactionId);
        const check = checkCandidacyEligibility({
          weight,
          platform: { measureId, mode, patronFactionId },
          patronStanding,
          fractured: fracture.fractured,
          fractureProbationTermIndex: fracture.probationTermIndex,
          contestedTermIndex: phase.contestedTermIndex,
          phase: phase.phase,
          money: profile.money,
          publishedNetWorth,
        });
        if (!check.ok) return err(check.reason, 409);

        const existing = await prisma.accordChairCandidacy.findUnique({
          where: { termIndex_profileId: { termIndex: phase.contestedTermIndex, profileId: profile.id } },
        });
        if (existing && !existing.withdrawnAt) return err('You are already standing in this term.', 409);

        const fee = chairFilingFee(publishedNetWorth);
        const candidacy = existing
          ? await prisma.accordChairCandidacy.update({
              where: { id: existing.id },
              data: {
                corpName: profile.companyName, patronFactionId, measureId, mode,
                filingFee: fee, withdrawnAt: null,
              },
            })
          : await prisma.accordChairCandidacy.create({
              data: {
                termIndex: phase.contestedTermIndex,
                profileId: profile.id,
                corpName: profile.companyName,
                patronFactionId, measureId, mode, filingFee: fee,
              },
            });

        if (ledgerOn) {
          // BURNED — no matching credit anywhere. The fee buys ballot access
          // and cannot move a single vote (POLICY.md: no purchased advantage).
          await recordLedgerStandalone({
            profileId: profile.id,
            moneyDelta: -fee,
            reason: 'chair_filing_fee_burn',
            refId: candidacy.id,
          });
        }
        return NextResponse.json({ success: true, candidacyId: candidacy.id, filingFee: fee });
      }

      case 'withdraw': {
        const existing = await prisma.accordChairCandidacy.findUnique({
          where: { termIndex_profileId: { termIndex: phase.contestedTermIndex, profileId: profile.id } },
        });
        if (!existing || existing.withdrawnAt) return err('You are not standing in this term.', 404);
        await prisma.$transaction([
          prisma.accordChairCandidacy.update({
            where: { id: existing.id },
            data: { withdrawnAt: new Date(now) },
          }),
          // Ballots cast for a withdrawn candidacy are released, not
          // silently voided — the voter can re-cast for someone still
          // standing. Honest data: a withdrawn candidate keeps no votes.
          prisma.accordChairBallot.deleteMany({ where: { candidacyId: existing.id } }),
        ]);
        return NextResponse.json({ success: true, refunded: false });
      }

      // ── Vote ───────────────────────────────────────────────────────────
      case 'cast_ballot': {
        const candidacyId = typeof body.candidacyId === 'string' ? body.candidacyId : '';
        if (fracture.fractured) {
          return err('A fractured corporation has no vote in the Accord chamber.', 409);
        }
        if (weight.raw <= 0) {
          return err('Publish a quarterly corporate report to earn a seat in the chamber.', 409);
        }
        const candidacy = await prisma.accordChairCandidacy.findUnique({ where: { id: candidacyId } });
        if (!candidacy || candidacy.withdrawnAt || candidacy.termIndex !== phase.contestedTermIndex) {
          return err('That candidacy is not on the current ballot.', 404);
        }

        // The concentration cap is a share of the CHAMBER, so it is applied
        // against the pool of weights already cast plus this one — the same
        // computation the snapshot shows the player before they commit.
        const cast = await prisma.accordChairBallot.findMany({
          where: { termIndex: phase.contestedTermIndex },
          select: { voterProfileId: true, weight: true },
        });
        const others = cast.filter(c => c.voterProfileId !== profile.id).map(c => c.weight);
        const capped = applyConcentrationCap([...others, weight.raw]);
        const myVotes = capped[capped.length - 1];

        await prisma.accordChairBallot.upsert({
          where: { termIndex_voterProfileId: { termIndex: phase.contestedTermIndex, voterProfileId: profile.id } },
          create: {
            termIndex: phase.contestedTermIndex,
            voterProfileId: profile.id,
            candidacyId,
            weight: myVotes,
            weightJson: JSON.stringify(weight),
          },
          update: { candidacyId, weight: myVotes, weightJson: JSON.stringify(weight) },
        });
        return NextResponse.json({ success: true, weight: myVotes, derivation: weight.lines });
      }

      // ── THE VERB ───────────────────────────────────────────────────────
      case 'issue_writ': {
        const measureId = typeof body.measureId === 'string' ? body.measureId : '';
        const mode: ChairWritMode = body.mode === 'table' ? 'table' : 'seat';
        if (!MEASURE_MAP.has(measureId)) return err('Unknown measure.');

        const seatRow = await prisma.accordChairTerm.findUnique({
          where: { termIndex: phase.seatedTermIndex },
        });
        if (!seatRow || seatRow.status !== 'certified' || seatRow.chairProfileId !== profile.id) {
          return err('Only the seated Chair may exercise an agenda writ.', 403);
        }

        const issued = await prisma.accordChairWrit.count({ where: { termIndex: phase.seatedTermIndex } });
        if (issued >= CHAIR_WRITS_PER_TERM) {
          return err(`All ${CHAIR_WRITS_PER_TERM} agenda writs for this term have been exercised.`, 409);
        }

        // The earliest docket a writ issued NOW could still amend. Named by
        // quarter index, so every player reaching that quarter gets the same
        // amended docket whenever they get there — the docket stays
        // world-shared and deterministic.
        const worldMonth = getGlobalGameDate(now).totalMonths;
        const quarterIndex = nextAmendableQuarterIndex(worldMonth);

        const clash = await prisma.accordChairWrit.findUnique({
          where: { termIndex_quarterIndex: { termIndex: phase.seatedTermIndex, quarterIndex } },
        });
        if (clash) return err('A writ has already been filed for the next Council session.', 409);

        const writ = await prisma.accordChairWrit.create({
          data: {
            termIndex: phase.seatedTermIndex,
            quarterIndex,
            measureId,
            mode,
            issuedByProfileId: profile.id,
          },
        });
        return NextResponse.json({
          success: true,
          writId: writ.id,
          quarterIndex,
          writsRemaining: CHAIR_WRITS_PER_TERM - (issued + 1),
        });
      }

      // ── Refuse the result ──────────────────────────────────────────────
      case 'fracture': {
        if (fracture.fractured) return err('Your charter has already fractured.', 409);
        const existing = await prisma.accordFracture.findUnique({ where: { profileId: profile.id } });
        const data = {
          corpName: profile.companyName,
          declaredTermIndex: phase.seatedTermIndex,
          declaredAt: new Date(now),
          reaccededAt: null,
          reaccessionBond: null,
          probationTermIndex: null,
        };
        if (existing) {
          await prisma.accordFracture.update({ where: { profileId: profile.id }, data });
        } else {
          await prisma.accordFracture.create({ data: { profileId: profile.id, ...data } });
        }
        // Any live candidacy/ballot is void: a corporation outside Accord
        // jurisdiction is neither a candidate nor an elector.
        await prisma.accordChairCandidacy.updateMany({
          where: { profileId: profile.id, termIndex: phase.contestedTermIndex, withdrawnAt: null },
          data: { withdrawnAt: new Date(now) },
        });
        await prisma.accordChairBallot.deleteMany({
          where: { voterProfileId: profile.id, termIndex: phase.contestedTermIndex },
        });
        return NextResponse.json({ success: true, sinceTermIndex: phase.seatedTermIndex });
      }

      case 'reaccede': {
        const check = checkReaccession({
          fractured: fracture.fractured,
          declaredTermIndex: fracture.declaredTermIndex ?? phase.seatedTermIndex,
          currentTermIndex: phase.seatedTermIndex,
          money: profile.money,
          publishedNetWorth,
        });
        if (!check.ok) return err(check.reason, 409);

        const bond = fractureReaccessionBond(publishedNetWorth);
        await prisma.accordFracture.update({
          where: { profileId: profile.id },
          data: {
            reaccededAt: new Date(now),
            reaccessionBond: bond,
            // One term of probation before the Chair is reachable again.
            probationTermIndex: phase.contestedTermIndex,
          },
        });
        if (ledgerOn) {
          // BURNED — the Accord does not refund a walkout.
          await recordLedgerStandalone({
            profileId: profile.id,
            moneyDelta: -bond,
            reason: 'accord_reaccession_bond_burn',
            refId: `reaccede-${phase.seatedTermIndex}`,
          });
        }
        return NextResponse.json({ success: true, bond, probationTermIndex: phase.contestedTermIndex });
      }

      default:
        return err('Unknown action.');
    }
  } catch (error) {
    logger.error('Chair action failed', { error: String(error) });
    return err('Internal server error', 500);
  }
}
