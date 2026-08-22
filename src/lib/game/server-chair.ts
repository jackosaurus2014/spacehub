// ─── Space Tycoon AAA wave E1: server-side Accord Chair helpers ─────────────
// docs/AAA_PROGRAM_2026-08.md "E1 implementation". Prisma-touching glue shared
// by /api/space-tycoon/chair (player actions), /api/space-tycoon/chair/resolve
// (the cron certifier), and the sync route's ChairSnapshot assembly.
//
// Architecture mirrors server-equity.ts exactly: every DECISION lives in the
// pure module (accord-chair.ts); this file only reads rows, shapes inputs and
// provides the schema-probe / lazy-term plumbing. Deployment safety: the
// AccordChair* tables may not exist yet when this code ships (the same window
// server-ledger.ts and server-equity.ts document), so every entry point is
// probe-guarded and every caller wraps it in try/catch.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  CHAIR_ELECTORATE_LOOKBACK_MS,
  CHAIR_WRITS_PER_TERM,
  getChairGateStatus,
  getChairPhase,
  getChairTermWindow,
  computeChairVoteWeight,
  applyConcentrationCap,
  chairFilingFee,
  fractureReaccessionBond,
  getNpcBlocRoster,
  scaleNpcBloc,
  decideNpcBloc,
  clampChairSnapshot,
  type ChairGateStatus,
  type ChairVoterRecord,
  type ChairVoteWeight,
  type ChairSnapshot,
  type ChairWrit,
  type ChairWritMode,
  type ChairPlatform,
} from './accord-chair';
import type { FactionId } from './factions';

// ─── Schema availability probe (server-equity.ts pattern) ───────────────────

const PROBE_TTL_MS = 5 * 60 * 1000;
let chairAvailable: boolean | null = null;
let lastProbeAt = 0;

export async function isChairSchemaAvailable(): Promise<boolean> {
  if (chairAvailable === true) return true;
  const now = Date.now();
  if (chairAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.accordChairTerm.count({ take: 1 });
    chairAvailable = true;
  } catch {
    chairAvailable = false;
    logger.warn('AccordChairTerm table unavailable — Accord Chair dormant (run prisma db push)');
  }
  return chairAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetChairAvailability(): void {
  chairAvailable = null;
  lastProbeAt = 0;
}

// ─── The electorate ─────────────────────────────────────────────────────────

/**
 * How many corporations have published a quarterly inside the lookback
 * window. This — not "how many profiles synced" — is the gate's input: a
 * shard with thousands of players where nobody files a report has no
 * legitimate electorate, and the mechanic's whole premise is that the
 * franchise is earned by publishing.
 */
export async function countChairElectorate(nowMs: number = Date.now()): Promise<number> {
  const rows = await prisma.publishedCorpReport.findMany({
    where: { publishedAt: { gte: new Date(nowMs - CHAIR_ELECTORATE_LOOKBACK_MS) } },
    select: { corpId: true },
    distinct: ['corpId'],
  });
  return rows.length;
}

export async function getServerChairGate(nowMs: number = Date.now()): Promise<ChairGateStatus> {
  return getChairGateStatus(await countChairElectorate(nowMs));
}

// ─── Vote-weight inputs, straight from PublishedCorpReport ──────────────────

interface ParsedReport {
  quarterIndex: number;
  netWorth: number;
  growthRatePct: number | null;
  publishedAtMs: number;
}

/** PublishedCorpReport.quarter is `Q<quarterIndex>` (corp-report-registry.ts
 *  quarterKey). Parse defensively — a malformed key contributes nothing
 *  rather than throwing inside the tally. */
function parseQuarterKey(key: string): number | null {
  const m = /^Q(\d+)$/.exec(key);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build the franchise record for one corporation from its published reports.
 * Returns null when it has never published (or its latest filing has aged
 * out) — which computeChairVoteWeight reads as "not an elector".
 *
 * `consecutiveQuarters` counts back from the most recent filing while the
 * quarterIndex decrements by exactly one. A corporation that publishes every
 * quarter builds a record; one that publishes, skips two, publishes again
 * starts over. That is the intended pressure: the mechanic rewards standing
 * disclosure, not a single opportunistic filing before an election.
 */
export async function buildChairVoterRecord(
  profileId: string,
  nowMs: number = Date.now(),
): Promise<ChairVoterRecord | null> {
  let rows: { quarter: string; reportJson: string; publishedAt: Date }[];
  try {
    rows = await prisma.publishedCorpReport.findMany({
      where: { corpId: profileId },
      orderBy: { publishedAt: 'desc' },
      select: { quarter: true, reportJson: true, publishedAt: true },
      take: 24,
    });
  } catch {
    return null;
  }
  if (rows.length === 0) return null;

  const parsed: ParsedReport[] = [];
  for (const r of rows) {
    const qi = parseQuarterKey(r.quarter);
    if (qi === null) continue;
    let netWorth = 0;
    let growthRatePct: number | null = null;
    try {
      const j = JSON.parse(r.reportJson) as { netWorth?: number; growthRatePct?: number | null };
      if (typeof j.netWorth === 'number' && Number.isFinite(j.netWorth)) netWorth = j.netWorth;
      if (typeof j.growthRatePct === 'number' && Number.isFinite(j.growthRatePct)) growthRatePct = j.growthRatePct;
    } catch { /* a corrupt row contributes nothing rather than breaking the tally */ }
    parsed.push({ quarterIndex: qi, netWorth, growthRatePct, publishedAtMs: r.publishedAt.getTime() });
  }
  if (parsed.length === 0) return null;

  parsed.sort((a, b) => b.quarterIndex - a.quarterIndex);
  const latest = parsed[0];

  let consecutive = 1;
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].quarterIndex === parsed[i - 1].quarterIndex - 1) consecutive += 1;
    else break;
  }

  return {
    netWorth: latest.netWorth,
    growthRatePct: latest.growthRatePct,
    consecutiveQuarters: consecutive,
    latestPublishedAtMs: latest.publishedAtMs,
  };
}

// ─── Fracture ───────────────────────────────────────────────────────────────

export interface FractureStatus {
  fractured: boolean;
  declaredTermIndex: number | null;
  probationTermIndex: number | null;
}

export async function getFractureStatus(profileId: string): Promise<FractureStatus> {
  try {
    const row = await prisma.accordFracture.findUnique({ where: { profileId } });
    if (!row) return { fractured: false, declaredTermIndex: null, probationTermIndex: null };
    return {
      fractured: row.reaccededAt === null,
      declaredTermIndex: row.declaredTermIndex,
      probationTermIndex: row.probationTermIndex,
    };
  } catch {
    return { fractured: false, declaredTermIndex: null, probationTermIndex: null };
  }
}

/** The public fracture roster — corporations currently outside Accord
 *  jurisdiction. LORE's fracture is a declaration, not a secret. */
export async function getFractureRoster(limit = 50): Promise<{ corpName: string; sinceTermIndex: number }[]> {
  try {
    const rows = await prisma.accordFracture.findMany({
      where: { reaccededAt: null },
      orderBy: { declaredAt: 'desc' },
      select: { corpName: true, declaredTermIndex: true },
      take: limit,
    });
    return rows.map(r => ({ corpName: r.corpName, sinceTermIndex: r.declaredTermIndex }));
  } catch {
    return [];
  }
}

/**
 * Server-side effective standing input for the market/trade broker fee. The
 * client applies the same modifier through factions.ts::getFactionRep; this
 * is the server half, so a fractured corporation's fee cannot disagree
 * between the two. Returns the fracture flag only — the caller pairs it with
 * accord-chair's applyFractureRepModifier over its own stashed rep value.
 */
export async function isProfileFractured(profileId: string): Promise<boolean> {
  return (await getFractureStatus(profileId)).fractured;
}

// ─── Writs ──────────────────────────────────────────────────────────────────

/** How many terms of writs ride the snapshot. See getActiveWrits. */
export const WRIT_SNAPSHOT_TERMS = 3;

/**
 * Writs visible to the client. Public — the whole world votes on the docket a
 * writ amends, so the amendment cannot be secret.
 *
 * Deliberately covers the seated term AND the two before it, not just the
 * current one. A writ names the accord-senate QUARTER it amends, and a player
 * whose local clock lags the world clock (long absence, away catch-up) reaches
 * that quarter later than everyone else; carrying a few terms of history means
 * they still publish the amended docket when they get there, so "the same
 * quarter index yields the same docket for everyone" stays true for any
 * realistic lag.
 *
 * HONEST BOUND, stated rather than hidden: a save that is more than
 * WRIT_SNAPSHOT_TERMS terms (≈3 real months, ≈120 accord quarters) behind the
 * world clock will publish those long-past dockets unamended. Widening the
 * window is a one-line change if that ever matters; the alternative — shipping
 * the whole writ history on every sync — is unbounded growth on the hot path
 * for a case nobody is in.
 */
export async function getActiveWrits(termIndex: number): Promise<ChairWrit[]> {
  try {
    const rows = await prisma.accordChairWrit.findMany({
      where: { termIndex: { gte: termIndex - (WRIT_SNAPSHOT_TERMS - 1), lte: termIndex } },
      orderBy: { quarterIndex: 'asc' },
      take: CHAIR_WRITS_PER_TERM * WRIT_SNAPSHOT_TERMS,
    });
    return rows.map(r => ({
      termIndex: r.termIndex,
      quarterIndex: r.quarterIndex,
      measureId: r.measureId,
      mode: (r.mode === 'table' ? 'table' : 'seat') as ChairWritMode,
      issuedAtMs: r.issuedAt.getTime(),
    }));
  } catch {
    return [];
  }
}

// ─── Snapshot assembly ──────────────────────────────────────────────────────

function toPlatform(measureId: string, mode: string, patronFactionId: string): ChairPlatform {
  return {
    measureId,
    mode: mode === 'table' ? 'table' : 'seat',
    patronFactionId: patronFactionId as FactionId,
  };
}

/**
 * Build the read-only ChairSnapshot for one profile. Read-only on the hot
 * sync path — it never creates a term row (the resolve cron does that) and
 * never mutates. Returns null when the schema has not been pushed yet, which
 * the client treats as "no Chair system" (pre-E1 behaviour).
 */
export async function buildChairSnapshot(
  profile: { id: string; companyName: string },
  nowMs: number = Date.now(),
): Promise<ChairSnapshot | null> {
  if (!(await isChairSchemaAvailable())) return null;

  const gate = await getServerChairGate(nowMs);
  const phase = getChairPhase(nowMs);
  const seatedTerm = phase.seatedTermIndex;
  const contested = phase.contestedTermIndex;

  const [seatRow, candidacyRows, ballotRows, myBallot, myRecord, fracture, roster, writs, rollRows] =
    await Promise.all([
      prisma.accordChairTerm.findUnique({ where: { termIndex: seatedTerm } }),
      prisma.accordChairCandidacy.findMany({
        where: { termIndex: contested, withdrawnAt: null },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
      prisma.accordChairBallot.findMany({ where: { termIndex: contested }, take: 5000 }),
      prisma.accordChairBallot.findUnique({
        where: { termIndex_voterProfileId: { termIndex: contested, voterProfileId: profile.id } },
      }),
      buildChairVoterRecord(profile.id, nowMs),
      getFractureStatus(profile.id),
      getFractureRoster(),
      getActiveWrits(seatedTerm),
      prisma.accordChairTerm.findMany({
        where: { status: { in: ['certified', 'vacant'] } },
        orderBy: { termIndex: 'desc' },
        take: 12,
      }),
    ]);

  const myWeight: ChairVoteWeight = computeChairVoteWeight(myRecord, nowMs);

  // Effective (capped) votes: the cap is a share of the CHAMBER, so it needs
  // the whole raw pool — recomputing it from cast ballots keeps the number
  // shown to the player and the number the tally uses identical.
  const castWeights = ballotRows.map(b => b.weight);
  const rawPool = [...castWeights, myBallot ? 0 : myWeight.raw];
  const cappedPool = applyConcentrationCap(rawPool);
  const myEffectiveVotes = myBallot ? myBallot.weight : cappedPool[cappedPool.length - 1];

  const tallyByCandidacy = new Map<string, { playerVotes: number }>();
  for (const b of ballotRows) {
    const cur = tallyByCandidacy.get(b.candidacyId) || { playerVotes: 0 };
    cur.playerVotes += b.weight;
    tallyByCandidacy.set(b.candidacyId, cur);
  }

  const candidateInputs = candidacyRows.map(c => ({
    candidacyId: c.id,
    corpName: c.corpName,
    platform: toPlatform(c.measureId, c.mode, c.patronFactionId),
  }));
  const totalPlayerVotes = ballotRows.reduce((a, b) => a + b.weight, 0);
  const bloc = scaleNpcBloc(getNpcBlocRoster(), totalPlayerVotes);
  const npcDecisions = decideNpcBloc(bloc, candidateInputs);
  const npcByCandidacy = new Map<string, number>();
  for (const d of npcDecisions) {
    if (!d.candidacyId) continue;
    npcByCandidacy.set(d.candidacyId, (npcByCandidacy.get(d.candidacyId) || 0) + d.seats);
  }

  const candidates = candidacyRows.map(c => {
    const playerVotes = tallyByCandidacy.get(c.id)?.playerVotes ?? 0;
    const npcVotes = npcByCandidacy.get(c.id) ?? 0;
    return {
      candidacyId: c.id,
      corpName: c.corpName,
      isMe: c.profileId === profile.id,
      platform: toPlatform(c.measureId, c.mode, c.patronFactionId),
      filedAtMs: c.createdAt.getTime(),
      playerVotes,
      npcVotes,
      totalVotes: playerVotes + npcVotes,
    };
  });

  const seat = seatRow && seatRow.status === 'certified' && seatRow.chairCorpName
    ? {
        termIndex: seatRow.termIndex,
        termLabel: getChairTermWindow(seatRow.termIndex).label,
        corpName: seatRow.chairCorpName,
        isMe: seatRow.chairProfileId === profile.id,
        patronFactionId: (seatRow.patronFactionId || 'the-dominion') as FactionId,
        platform: toPlatform(
          seatRow.platformMeasureId || '',
          seatRow.platformMode || 'seat',
          seatRow.patronFactionId || 'the-dominion',
        ),
        totalVotes: seatRow.winningVotes,
        // Only THIS term's writs count against the budget — the snapshot
        // also carries the two preceding terms (see getActiveWrits).
        writsRemaining: Math.max(0, CHAIR_WRITS_PER_TERM - writs.filter(w => w.termIndex === seatRow.termIndex).length),
      }
    : null;

  // Published book net worth drives both money figures the panel shows.
  const publishedNetWorth = myRecord?.netWorth ?? 0;

  const snapshot: ChairSnapshot = {
    enabled: gate.enabled,
    reason: gate.reason,
    electorate: gate.electorate,
    requiredElectorate: gate.requiredElectorate,

    phase: phase.phase,
    seatedTermIndex: seatedTerm,
    contestedTermIndex: contested,
    phaseEndsMs: phase.phaseEndsMs,

    seat,
    vacancyReason: seatRow && seatRow.status === 'vacant' ? seatRow.vacancyReason : null,

    myWeight,
    myEffectiveVotes,
    myCandidacyId: candidacyRows.find(c => c.profileId === profile.id)?.id ?? null,
    myBallotCandidacyId: myBallot?.candidacyId ?? null,
    myFilingFee: chairFilingFee(publishedNetWorth),

    candidates,
    npcBloc: npcDecisions.map(d => ({
      name: d.name,
      factionId: d.factionId,
      seats: d.seats,
      candidacyId: d.candidacyId,
      rationale: d.rationale,
    })),
    totalPlayerVotes,
    totalNpcVotes: npcDecisions.reduce((a, d) => a + (d.candidacyId ? d.seats : 0), 0),

    activeWrits: writs,

    fractured: fracture.fractured,
    fracturedSinceTermIndex: fracture.fractured ? fracture.declaredTermIndex : null,
    reaccessionBond: fractureReaccessionBond(publishedNetWorth),
    fractureRoster: roster,

    roll: rollRows.map(r => ({
      termIndex: r.termIndex,
      termLabel: getChairTermWindow(r.termIndex).label,
      corpName: r.chairCorpName,
      totalVotes: r.winningVotes,
      patronFactionId: (r.patronFactionId as FactionId | null) ?? null,
    })),

    asOf: nowMs,
  };

  return clampChairSnapshot(snapshot);
}
