import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import {
  getChairPhase,
  getChairTermWindow,
  getNpcBlocRoster,
  scaleNpcBloc,
  resolveChairElection,
  type ChairPlatform,
  type ChairWritMode,
} from '@/lib/game/accord-chair';
import type { FactionId } from '@/lib/game/factions';
import {
  isChairSchemaAvailable,
  countChairElectorate,
  getServerChairGate,
} from '@/lib/game/server-chair';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * AAA Round 1 wave E1: the Accord Chair certifier
 * (cron-scheduler.ts 'tycoon-chair-resolve').
 *
 * AUTH: requireCronSecret. The previous comment here claimed CRON_SECRET
 * authentication "via middleware.ts's cronPaths" — that was false. cronPaths
 * only *skips CSRF* when a valid secret is presented; it never *requires* one,
 * so with no Bearer token this endpoint was reachable by anyone who sent a
 * matching `Origin` header, letting them certify elections on demand.
 *
 * Deterministic and idempotent. Every run:
 *   1. certifies every term whose ballot has closed and which is still
 *      'open' — plurality over the cast ballots plus the NPC bloc, tie-broken
 *      without RNG (accord-chair.ts resolveChairElection);
 *   2. seats a vacancy honestly when nobody stood or nobody voted. No
 *      fabricated winner, ever;
 *   3. opens the row for the term now being contested so candidacies and
 *      ballots have somewhere to land.
 *
 * Population gate: certification is SKIPPED while the gate is closed, and
 * open rows are marked vacant with the gate's own reason — a term contested
 * by a chamber too small to be legitimate produces no Chair rather than a
 * cheap one. Ballots already cast are left in place: if the electorate
 * recovers before the next close, they still count.
 *
 * Catch-up: a shard that was down for weeks certifies every missed term in
 * order on the next run (bounded at MAX_CATCHUP_TERMS), so the Chair roll
 * has no holes.
 */

const MAX_CATCHUP_TERMS = 24;

function toPlatform(measureId: string, mode: string, patron: string): ChairPlatform {
  return {
    measureId,
    mode: (mode === 'table' ? 'table' : 'seat') as ChairWritMode,
    patronFactionId: patron as FactionId,
  };
}

export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    if (!(await isChairSchemaAvailable())) {
      return NextResponse.json({ skipped: 'accord chair schema not provisioned' });
    }
    const now = Date.now();
    const phase = getChairPhase(now);
    const gate = await getServerChairGate(now);
    const electorate = await countChairElectorate(now);

    const summary = {
      certified: 0,
      vacancies: 0,
      termsOpened: 0,
      gateEnabled: gate.enabled,
      electorate,
    };

    // ── 1-2. Certify every closed-but-open term, oldest first ─────────────
    const pending = await prisma.accordChairTerm.findMany({
      where: { status: 'open', termIndex: { lte: phase.seatedTermIndex } },
      orderBy: { termIndex: 'asc' },
      take: MAX_CATCHUP_TERMS,
    });

    for (const termRow of pending) {
      const window = getChairTermWindow(termRow.termIndex);
      if (now < window.ballotClosesMs) continue; // not closed yet

      if (!gate.enabled) {
        await prisma.accordChairTerm.update({
          where: { termIndex: termRow.termIndex },
          data: {
            status: 'vacant',
            electorate,
            vacancyReason: gate.reason === 'disabled_by_flag'
              ? 'The Accord Chair is suspended on this shard.'
              : `The chamber did not reach the ${gate.requiredElectorate}-corporation electorate the Accord requires. The seat stands vacant and the docket runs unamended.`,
            certifiedAt: new Date(now),
          },
        });
        summary.vacancies += 1;
        continue;
      }

      const [candidacies, ballots] = await Promise.all([
        prisma.accordChairCandidacy.findMany({
          where: { termIndex: termRow.termIndex, withdrawnAt: null },
          orderBy: { createdAt: 'asc' },
          take: 50,
        }),
        prisma.accordChairBallot.findMany({ where: { termIndex: termRow.termIndex }, take: 10_000 }),
      ]);

      const totalPlayerVotes = ballots.reduce((a, b) => a + b.weight, 0);
      const bloc = scaleNpcBloc(getNpcBlocRoster(), totalPlayerVotes);

      const result = resolveChairElection(
        termRow.termIndex,
        candidacies.map(c => ({
          candidacyId: c.id,
          profileId: c.profileId,
          corpName: c.corpName,
          platform: toPlatform(c.measureId, c.mode, c.patronFactionId),
          filedAtMs: c.createdAt.getTime(),
        })),
        ballots.map(b => ({ voterProfileId: b.voterProfileId, candidacyId: b.candidacyId, weight: b.weight })),
        bloc,
        electorate,
      );

      await prisma.accordChairTerm.update({
        where: { termIndex: termRow.termIndex },
        data: {
          status: result.winner ? 'certified' : 'vacant',
          chairProfileId: result.winner?.profileId ?? null,
          chairCorpName: result.winner?.corpName ?? null,
          patronFactionId: result.winner?.platform.patronFactionId ?? null,
          platformMeasureId: result.winner?.platform.measureId ?? null,
          platformMode: result.winner?.platform.mode ?? null,
          winningVotes: result.winner?.totalVotes ?? 0,
          totalPlayerVotes: result.totalPlayerVotes,
          totalNpcVotes: result.totalNpcVotes,
          electorate: result.electorate,
          vacancyReason: result.vacancyReason,
          // The full tally is the public record. Stored verbatim so the
          // result can be audited after the fact — an election whose count
          // nobody can check is not intelligence gameplay.
          tallyJson: JSON.stringify({
            tallies: result.tallies,
            npcDecisions: result.npcDecisions,
            abstainedNpcSeats: result.abstainedNpcSeats,
          }),
          certifiedAt: new Date(now),
        },
      });
      if (result.winner) summary.certified += 1;
      else summary.vacancies += 1;
    }

    // ── 3. Open the row for the term now being contested ──────────────────
    for (const idx of [phase.seatedTermIndex, phase.contestedTermIndex]) {
      const existing = await prisma.accordChairTerm.findUnique({ where: { termIndex: idx } });
      if (existing) continue;
      await prisma.accordChairTerm.create({ data: { termIndex: idx, status: 'open', electorate } });
      summary.termsOpened += 1;
    }

    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    logger.error('Chair resolve failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
