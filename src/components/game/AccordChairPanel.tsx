'use client';

// ─── The Accord Chair (AAA Round 1 wave E1) ─────────────────────────────────
// docs/AAA_PROGRAM_2026-08.md "E1 implementation". The election surface: the
// seated Chair, this corporation's franchise (itemised, from its published
// quarterly reports), the ballot, the NPC bloc with its stated reasoning, the
// Chair's agenda writs, and the Fracture ledger.
//
// SERVER-AUTHORITATIVE. Everything rendered here comes from
// state.accordChair — the sync-delivered ChairSnapshot — and every mutation
// POSTs to /api/space-tycoon/chair and then refreshes. The client never
// computes a tally, a weight, or an eligibility, because a client-computed
// election is not an election.
//
// Accessibility contract (CLAUDE.md):
//  - the ballot is a radiogroup: real <input type="radio"> semantics, arrow
//    keys, one tab stop, a submit button. Keyboard-only play works end to end.
//  - every tally is TEXT first (votes as a number, share as a percentage) with
//    a bar as redundant decoration; no state is carried by colour alone, and
//    the leader is marked with the word "Leading", not a green pill.
//  - faction identity is always the faction's NAME; its accent hex is a
//    keyline only.
//  - Fracture is a two-step confirm, because it is consequential and
//    semi-permanent — never a single mis-tap.
//  - 375px: every row stacks; the writ form and the ballot are single-column.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  CHAIR_WRITS_PER_TERM,
  CHAIR_CANDIDACY_MIN_WEIGHT,
  CHAIR_MAX_VOTE_SHARE,
  FRACTURE_CONSEQUENCES,
  getChairTermWindow,
  type ChairSnapshot,
  type ChairWritMode,
} from '@/lib/game/accord-chair';
import { MEASURE_CATALOG, MEASURE_MAP } from '@/lib/game/accord-senate';
import { FACTIONS, FACTION_MAP, type FactionId } from '@/lib/game/factions';
import { FACTION_ACCENT_HEX } from '@/lib/game/leader-moments';
import { formatMoney } from '@/lib/game/formulas';
import { ConsolePanel, HoloCard, DataChip, StatReadout } from './chrome';
import LeaderPortraitFrame from './LeaderPortraitFrame';
import { Concept } from './HoloTip';

interface Props {
  state: GameState;
}

/** The Council's own voice. LORE.md names the office-holder — Secretary-
 *  General Anatole Priest — and the roster carries no portrait art for him,
 *  so LeaderPortraitFrame renders its monogram plate. Inventing a portrait
 *  would be fabricating content; a monogram is honest. */
const PRIEST_SPEAKER = {
  id: 'accord-secretary-general',
  name: 'Anatole Priest',
  title: 'Secretary-General',
  affiliation: 'The Accord Council, Luna',
  portraitUrl: null,
  cohort: 'none' as const,
  accentHex: '#22d3ee',
};

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function countdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'now';
  const totalMinutes = Math.floor(msRemaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const PHASE_COPY: Record<ChairSnapshot['phase'], { label: string; detail: string }> = {
  recess: {
    label: 'Council in recess',
    detail: 'Nominations for the coming term have not opened yet. Publish a quarterly report before they do — the franchise is earned by disclosure.',
  },
  nominations: {
    label: 'Nominations and ballot open',
    detail: 'Candidacies may be filed and ballots cast. Nominations close 72 hours before certification so every platform is public before the count.',
  },
  ballot: {
    label: 'Ballot open, nominations closed',
    detail: 'No further candidacies. Ballots remain open until the Council certifies at the turn of the month.',
  },
};

export default function AccordChairPanel({ state }: Props) {
  // The sync snapshot is the baseline; a mutation re-GETs the authoritative
  // view immediately so the player is never left looking at a stale tally for
  // up to a sync interval. The server is the source of truth in BOTH paths —
  // this is a fresher read of the same data, never a client-side recompute.
  const [override, setOverride] = useState<ChairSnapshot | null>(null);
  const snap = override ?? state.accordChair;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/chair');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.snapshot) setOverride(data.snapshot as ChairSnapshot);
    } catch { /* non-critical — the next sync delivers it anyway */ }
  }, []);

  const post = useCallback(async (payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/space-tycoon/chair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ tone: 'error', text: typeof data.error === 'string' ? data.error : 'The Council refused the filing.' });
      } else {
        setNotice({ tone: 'ok', text: okText });
        await refresh();
      }
    } catch {
      setNotice({ tone: 'error', text: 'Could not reach the Accord Council.' });
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  // ── Pre-E1 client / schema not pushed: say nothing rather than lie ──────
  if (!snap) return null;

  const termWindow = getChairTermWindow(snap.contestedTermIndex);

  if (!snap.enabled) {
    return (
      <ConsolePanel
        title="The Accord Chair"
        icon="cal-chair-election"
        accent="purple"
        variant="inert"
        subtitle="Dormant — awaiting an electorate."
      >
        <div className="mt-3 space-y-2 text-[12px] text-slate-400 leading-relaxed">
          <p>
            {snap.reason === 'disabled_by_flag'
              ? 'The Chair is suspended on this shard.'
              : `The Council seats a Chair once ${snap.requiredElectorate} corporations have published a quarterly report inside the eligibility window. ${snap.electorate} ${snap.electorate === 1 ? 'has' : 'have'} so far.`}
          </p>
          <p className="text-slate-500">
            This is deliberate. An election decided by a handful of corporations is theatre, so the
            office stays vacant and the Senate docket runs unamended until the chamber is real.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <DataChip icon="governance">Electorate {snap.electorate} / {snap.requiredElectorate}</DataChip>
            <DataChip icon="reports">Publishing a quarterly is what earns a seat</DataChip>
          </div>
        </div>
      </ConsolePanel>
    );
  }

  return (
    <div className="space-y-3">
      <ConsolePanel
        title="The Accord Chair"
        icon="cal-chair-election"
        accent="purple"
        subtitle={`${termWindow.label} term · ${PHASE_COPY[snap.phase].label}`}
        right={
          <span className="text-[10px] text-slate-400">
            {snap.phase === 'recess' ? 'Nominations open in ' : 'Closes in '}
            <span className="mat-figure text-slate-200">{countdown(snap.phaseEndsMs - now)}</span>
          </span>
        }
      >
        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
          {PHASE_COPY[snap.phase].detail} <Concept id="accord-chair">Vote weight</Concept> comes from
          your published quarterly reports — never from cash on hand.
        </p>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatReadout label="Electorate" value={snap.electorate} icon="governance" sub="corps publishing" />
          <StatReadout label="Player votes cast" value={snap.totalPlayerVotes} icon="leaderboard" />
          <StatReadout label="Signatory NPC seats" value={snap.totalNpcVotes} icon="npc" sub="voting; abstentions excluded" />
          <StatReadout
            label="Your votes"
            value={snap.myEffectiveVotes}
            icon="medal"
            sub={`raw ${snap.myWeight.raw}, capped at ${Math.round(CHAIR_MAX_VOTE_SHARE * 100)}% of the chamber`}
          />
        </div>
      </ConsolePanel>

      <SeatCard snap={snap} post={post} busy={busy} />

      {notice && (
        <div
          role="status"
          className={`rounded border px-3 py-2 text-[11px] ${
            notice.tone === 'ok'
              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          }`}
        >
          {notice.tone === 'ok' ? 'Filed: ' : 'Refused: '}{notice.text}
        </div>
      )}

      <FranchiseCard snap={snap} />
      <BallotCard snap={snap} post={post} busy={busy} />
      <CandidacyCard state={state} snap={snap} post={post} busy={busy} />
      <NpcBlocCard snap={snap} />
      <FractureCard snap={snap} post={post} busy={busy} />
      <RollCard snap={snap} />
    </div>
  );
}

// ─── The seated Chair, and the verb ─────────────────────────────────────────

function SeatCard({
  snap, post, busy,
}: {
  snap: ChairSnapshot;
  post: (payload: Record<string, unknown>, ok: string) => Promise<void>;
  busy: boolean;
}) {
  const [writMeasure, setWritMeasure] = useState<string>(MEASURE_CATALOG[0].id);
  const [writMode, setWritMode] = useState<ChairWritMode>('seat');
  const seat = snap.seat;

  if (!seat) {
    return (
      <ConsolePanel title="The seat" icon="governance" variant="alert" accent="amber" compact>
        <div className="mt-2">
          <LeaderPortraitFrame
            speaker={PRIEST_SPEAKER}
            eyebrow="Accord Council"
            statusLabel="Seat vacant"
            message={
              snap.vacancyReason
                ? snap.vacancyReason
                : 'The Chair has not yet been certified for the current term. Until it is, the Senate docket runs unamended.'
            }
          />
        </div>
      </ConsolePanel>
    );
  }

  const factionDef = FACTION_MAP.get(seat.patronFactionId);
  const platformMeasure = MEASURE_MAP.get(seat.platform.measureId);

  return (
    <ConsolePanel
      title={`Chair — ${seat.termLabel} term`}
      icon="governance"
      accent="purple"
      right={<DataChip icon="scroll">{seat.writsRemaining} of {CHAIR_WRITS_PER_TERM} writs left</DataChip>}
    >
      <div className="mt-2">
        <LeaderPortraitFrame
          speaker={PRIEST_SPEAKER}
          eyebrow="Accord Council · certification"
          statusLabel={seat.isMe ? 'You hold the gavel' : 'Seated'}
          message={
            <>
              The chair for the {seat.termLabel} session is <strong className="text-white">{seat.corpName}</strong>
              {factionDef ? <>, seated under the banner of {factionDef.name}</> : null}, on{' '}
              <span className="mat-figure text-slate-100">{seat.totalVotes}</span> votes. Their declared platform:
              to {seat.platform.mode === 'seat' ? 'seat' : 'table'}{' '}
              <strong className="text-white">{platformMeasure?.name ?? seat.platform.measureId}</strong>.
            </>
          }
        />
      </div>

      {seat.isMe && (
        <div className="mt-3 rounded border border-purple-500/25 bg-purple-500/[0.04] p-3">
          <h4 className="text-white text-[12px] font-bold">Exercise an agenda writ</h4>
          <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
            A writ substitutes one measure into — or out of — the next Council session&apos;s docket,
            for every corporation in the game. It does not change the published odds, the effect
            magnitudes, or the size of the docket: the Chair decides what the Accord debates, never
            what a measure is worth. {CHAIR_WRITS_PER_TERM} per term, one per session.
          </p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
            <label className="block">
              <span className="text-[10px] text-slate-500">Measure</span>
              <select
                value={writMeasure}
                onChange={e => setWritMeasure(e.target.value)}
                className="w-full mt-0.5 bg-black/40 border border-white/10 rounded text-[11px] text-slate-200 px-2 py-1.5 min-h-[38px]"
              >
                {MEASURE_CATALOG.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-500">Action</span>
              <select
                value={writMode}
                onChange={e => setWritMode(e.target.value as ChairWritMode)}
                className="w-full mt-0.5 bg-black/40 border border-white/10 rounded text-[11px] text-slate-200 px-2 py-1.5 min-h-[38px]"
              >
                <option value="seat">Seat it on the docket</option>
                <option value="table">Table it (remove)</option>
              </select>
            </label>
            <button
              type="button"
              disabled={busy || seat.writsRemaining <= 0}
              onClick={() => post({ action: 'issue_writ', measureId: writMeasure, mode: writMode }, 'The writ is filed with the Council clerk.')}
              className={`self-end min-h-[38px] px-3 rounded text-[11px] font-bold border ${
                busy || seat.writsRemaining <= 0
                  ? 'bg-white/[0.03] text-slate-600 border-white/[0.05] cursor-not-allowed'
                  : 'bg-purple-500/15 text-purple-200 border-purple-500/40 hover:brightness-125'
              }`}
            >
              File writ
            </button>
          </div>
        </div>
      )}

      {snap.activeWrits.filter(w => w.termIndex === seat.termIndex).length > 0 && (
        <div className="mt-3">
          <h4 className="text-slate-300 text-[11px] font-bold">Writs filed this term</h4>
          <ul className="mt-1 space-y-1">
            {snap.activeWrits.filter(w => w.termIndex === seat.termIndex).map(w => (
              <li key={`${w.termIndex}-${w.quarterIndex}`} className="text-[11px] text-slate-400">
                Session {w.quarterIndex}: {w.mode === 'seat' ? 'seat' : 'table'}{' '}
                <span className="text-slate-200">{MEASURE_MAP.get(w.measureId)?.name ?? w.measureId}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ConsolePanel>
  );
}

// ─── Where your vote weight comes from ──────────────────────────────────────

function FranchiseCard({ snap }: { snap: ChairSnapshot }) {
  return (
    <ConsolePanel
      title="Your franchise"
      icon="reports"
      variant="secondary"
      compact
      subtitle="Derived from your published quarterly reports."
    >
      <ul className="mt-2 space-y-1">
        {snap.myWeight.lines.map((line, i) => (
          <li key={i} className="text-[11px] text-slate-400 leading-relaxed">{line}</li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
        Total <span className="mat-figure text-slate-200">{snap.myWeight.raw}</span> raw,{' '}
        <span className="mat-figure text-slate-200">{snap.myEffectiveVotes}</span> after the chamber
        cap. Publishing is opt-in and irreversible — your rivals read the same numbers on the public
        registry. That trade is the mechanic.
      </p>
    </ConsolePanel>
  );
}

// ─── The ballot ─────────────────────────────────────────────────────────────

function BallotCard({
  snap, post, busy,
}: {
  snap: ChairSnapshot;
  post: (payload: Record<string, unknown>, ok: string) => Promise<void>;
  busy: boolean;
}) {
  const [choice, setChoice] = useState<string>(snap.myBallotCandidacyId || '');
  const totalVotes = useMemo(
    () => snap.candidates.reduce((a, c) => a + c.totalVotes, 0),
    [snap.candidates],
  );
  const leaderId = useMemo(() => {
    let best: { id: string; votes: number } | null = null;
    for (const c of snap.candidates) {
      if (!best || c.totalVotes > best.votes) best = { id: c.candidacyId, votes: c.totalVotes };
    }
    return best && best.votes > 0 ? best.id : null;
  }, [snap.candidates]);

  if (snap.fractured) {
    return (
      <ConsolePanel title="Ballot" icon="leaderboard" variant="inert" compact>
        <p className="mt-2 text-[11px] text-slate-500">
          Your charter stands outside Accord jurisdiction. Fractured corporations have no vote in the
          chamber.
        </p>
      </ConsolePanel>
    );
  }

  if (snap.candidates.length === 0) {
    return (
      <ConsolePanel title="Ballot" icon="leaderboard" variant="inert" compact>
        <p className="mt-2 text-[11px] text-slate-500">
          No corporation has stood for the coming term. If nobody files, the seat is certified vacant
          and the docket runs unamended — the Council does not appoint a Chair by default.
        </p>
      </ConsolePanel>
    );
  }

  const canVote = snap.myWeight.raw > 0;

  return (
    <ConsolePanel
      title="Ballot"
      icon="leaderboard"
      accent="cyan"
      subtitle={`${snap.candidates.length} candidate${snap.candidates.length === 1 ? '' : 's'} · live tally, published continuously`}
    >
      <fieldset className="mt-2 border-0 p-0 m-0" disabled={!canVote || busy}>
        <legend className="sr-only">Choose a candidate for the Accord Chair</legend>
        <div role="radiogroup" aria-label="Accord Chair candidates" className="space-y-2">
          {snap.candidates.map(c => {
            const measure = MEASURE_MAP.get(c.platform.measureId);
            const faction = FACTION_MAP.get(c.platform.patronFactionId);
            const share = pct(c.totalVotes, totalVotes);
            const isLeader = c.candidacyId === leaderId;
            return (
              <HoloCard key={c.candidacyId} variant={isLeader ? 'primary' : 'secondary'}>
                <label className="flex items-start gap-2.5 p-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="chair-ballot"
                    value={c.candidacyId}
                    checked={choice === c.candidacyId}
                    onChange={() => setChoice(c.candidacyId)}
                    className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-white text-[12px] font-bold">{c.corpName}</span>
                      {c.isMe && <DataChip tone="info">You</DataChip>}
                      {isLeader && <DataChip tone="neutral">Leading</DataChip>}
                      {snap.myBallotCandidacyId === c.candidacyId && (
                        <DataChip icon="check" tone="good">Your vote</DataChip>
                      )}
                    </span>
                    <span
                      className="mt-1 block text-[11px] text-slate-400 border-l-2 pl-2"
                      style={{ borderColor: FACTION_ACCENT_HEX[c.platform.patronFactionId] }}
                    >
                      Running under {faction?.name ?? c.platform.patronFactionId}. Pledges to{' '}
                      {c.platform.mode === 'seat' ? 'seat' : 'table'}{' '}
                      <span className="text-slate-200">{measure?.name ?? c.platform.measureId}</span>.
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
                      <span className="mat-figure text-slate-100">{c.totalVotes}</span>
                      <span className="text-slate-500">votes ({share}% of the count)</span>
                      <span className="text-slate-500">
                        — {c.playerVotes} from corporations, {c.npcVotes} from signatory NPC seats
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-1 block h-1 rounded bg-white/[0.06] overflow-hidden"
                    >
                      <span className="block h-full bg-cyan-400/60" style={{ width: `${share}%` }} />
                    </span>
                  </span>
                </label>
              </HoloCard>
            );
          })}
        </div>
      </fieldset>

      {!canVote ? (
        <p className="mt-2 text-[11px] text-amber-300/90">
          You hold no seat in the chamber. Publish a quarterly corporate report to earn one.
        </p>
      ) : (
        <button
          type="button"
          disabled={busy || !choice}
          onClick={() => post({ action: 'cast_ballot', candidacyId: choice }, 'Your ballot is recorded. You may re-cast until the vote closes.')}
          className={`mt-3 w-full min-h-[40px] rounded text-[12px] font-bold border ${
            busy || !choice
              ? 'bg-white/[0.03] text-slate-600 border-white/[0.05] cursor-not-allowed'
              : 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40 hover:brightness-125'
          }`}
        >
          {snap.myBallotCandidacyId ? 'Re-cast ballot' : `Cast ${snap.myEffectiveVotes} vote${snap.myEffectiveVotes === 1 ? '' : 's'}`}
        </button>
      )}
    </ConsolePanel>
  );
}

// ─── Standing for the Chair ─────────────────────────────────────────────────

function CandidacyCard({
  state, snap, post, busy,
}: {
  state: GameState;
  snap: ChairSnapshot;
  post: (payload: Record<string, unknown>, ok: string) => Promise<void>;
  busy: boolean;
}) {
  const [measureId, setMeasureId] = useState<string>(MEASURE_CATALOG[0].id);
  const [mode, setMode] = useState<ChairWritMode>('seat');
  const [patron, setPatron] = useState<FactionId>(FACTIONS[0].id);

  if (snap.fractured) return null;

  const eligibleByWeight = snap.myWeight.raw >= CHAIR_CANDIDACY_MIN_WEIGHT;
  const standing = state.factionReputation?.[patron] ?? 0;
  const open = snap.phase === 'nominations';

  if (snap.myCandidacyId) {
    const mine = snap.candidates.find(c => c.candidacyId === snap.myCandidacyId);
    return (
      <ConsolePanel title="Your candidacy" icon="medal" accent="amber" compact>
        <p className="mt-2 text-[11px] text-slate-400">
          You are standing for the {getChairTermWindow(snap.contestedTermIndex).label} term
          {mine ? <> on <span className="mat-figure text-slate-100">{mine.totalVotes}</span> votes</> : null}.
          The filing fee is not refundable.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => post({ action: 'withdraw' }, 'Your candidacy is withdrawn. Ballots cast for it are released.')}
          className="mt-2 min-h-[38px] px-3 rounded text-[11px] font-bold border bg-white/[0.03] text-slate-300 border-white/[0.08] hover:brightness-125"
        >
          Withdraw candidacy
        </button>
      </ConsolePanel>
    );
  }

  return (
    <ConsolePanel
      title="Stand for the Chair"
      icon="medal"
      variant={open && eligibleByWeight ? 'primary' : 'inert'}
      accent="amber"
      compact
      subtitle={`Filing fee ${formatMoney(snap.myFilingFee)} — burned, and it buys nothing but ballot access.`}
    >
      {!eligibleByWeight ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Candidacy requires a published vote weight of {CHAIR_CANDIDACY_MIN_WEIGHT}; your filed
          record is worth {snap.myWeight.raw}. Publish more quarters, or grow the book value you
          publish.
        </p>
      ) : !open ? (
        <p className="mt-2 text-[11px] text-slate-500">Nominations are closed for the coming term.</p>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] text-slate-500">Platform — the writ you pledge</span>
              <select
                value={measureId}
                onChange={e => setMeasureId(e.target.value)}
                className="w-full mt-0.5 bg-black/40 border border-white/10 rounded text-[11px] text-slate-200 px-2 py-1.5 min-h-[38px]"
              >
                {MEASURE_CATALOG.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-500">Action</span>
              <select
                value={mode}
                onChange={e => setMode(e.target.value as ChairWritMode)}
                className="w-full mt-0.5 bg-black/40 border border-white/10 rounded text-[11px] text-slate-200 px-2 py-1.5 min-h-[38px]"
              >
                <option value="seat">Seat it on the docket</option>
                <option value="table">Table it (remove)</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-[10px] text-slate-500">
              Patron faction — requires Friendly standing (10+). Yours: {standing}
            </span>
            <select
              value={patron}
              onChange={e => setPatron(e.target.value as FactionId)}
              className="w-full mt-0.5 bg-black/40 border border-white/10 rounded text-[11px] text-slate-200 px-2 py-1.5 min-h-[38px]"
            >
              {FACTIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            The signatory NPC bloc reads your platform against its own faction&apos;s documented
            interests and your patron&apos;s declared rivalries. Its reasoning is published below
            before you file.
          </p>
          <button
            type="button"
            disabled={busy || standing < 10}
            onClick={() => post(
              { action: 'file_candidacy', measureId, mode, patronFactionId: patron },
              'Your candidacy is on the ballot.',
            )}
            className={`w-full min-h-[40px] rounded text-[12px] font-bold border ${
              busy || standing < 10
                ? 'bg-white/[0.03] text-slate-600 border-white/[0.05] cursor-not-allowed'
                : 'bg-amber-500/15 text-amber-200 border-amber-500/40 hover:brightness-125'
            }`}
          >
            File candidacy — {formatMoney(snap.myFilingFee)}
          </button>
        </div>
      )}
    </ConsolePanel>
  );
}

// ─── The NPC bloc, with its stated reasoning ────────────────────────────────

function NpcBlocCard({ snap }: { snap: ChairSnapshot }) {
  if (snap.npcBloc.length === 0) return null;
  return (
    <ConsolePanel
      title="The signatory bloc"
      icon="npc"
      variant="secondary"
      compact
      subtitle="Only NPC corporations aligned to an Accord signatory hold seats — the Syndicate, Corsairs and Hive left in 2143."
    >
      <ul className="mt-2 space-y-1.5">
        {snap.npcBloc.map(b => {
          const backed = b.candidacyId
            ? snap.candidates.find(c => c.candidacyId === b.candidacyId)?.corpName
            : null;
          return (
            <li key={b.name} className="text-[11px] leading-relaxed">
              <span
                className="border-l-2 pl-2 block"
                style={{ borderColor: FACTION_ACCENT_HEX[b.factionId] }}
              >
                <span className="text-slate-200 font-medium">{b.name}</span>
                <span className="text-slate-500"> · {FACTION_MAP.get(b.factionId)?.name} · {b.seats} seat{b.seats === 1 ? '' : 's'} · </span>
                <span className={backed ? 'text-slate-300' : 'text-slate-500'}>
                  {backed ? `backs ${backed}` : 'abstains'}
                </span>
                <span className="block text-slate-500">{b.rationale}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
        Seats are fixed and published. The bloc is capped as a share of the chamber and shrinks
        automatically as corporations cast more weight — a floor, never a ceiling.
      </p>
    </ConsolePanel>
  );
}

// ─── Fracture ───────────────────────────────────────────────────────────────

function FractureCard({
  snap, post, busy,
}: {
  snap: ChairSnapshot;
  post: (payload: Record<string, unknown>, ok: string) => Promise<void>;
  busy: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <ConsolePanel
      title="Articles of Fracture"
      icon="governance"
      variant={snap.fractured ? 'alert' : 'secondary'}
      accent={snap.fractured ? 'amber' : 'cyan'}
      compact
      subtitle={snap.fractured
        ? 'Your charter stands outside Accord jurisdiction.'
        : 'Refusing the Accord’s authority — canon since 2143, and a genuine bet.'}
    >
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <h4 className="text-[10px] uppercase tracking-wide text-slate-500">What it buys</h4>
          <ul className="mt-1 space-y-1">
            {FRACTURE_CONSEQUENCES.give.map((g, i) => (
              <li key={i} className="text-[11px] text-slate-400 leading-relaxed">{g}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-wide text-slate-500">What it costs</h4>
          <ul className="mt-1 space-y-1">
            {FRACTURE_CONSEQUENCES.take.map((t, i) => (
              <li key={i} className="text-[11px] text-slate-400 leading-relaxed">{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {snap.fractured ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => post({ action: 'reaccede' }, 'Your charter has re-acceded to the Accord. One term of probation before you may stand for the Chair.')}
          className="mt-3 w-full min-h-[40px] rounded text-[12px] font-bold border bg-cyan-500/15 text-cyan-200 border-cyan-500/40 hover:brightness-125"
        >
          Re-accede to the Accord — bond {formatMoney(snap.reaccessionBond)}
        </button>
      ) : confirming ? (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => { setConfirming(false); void post({ action: 'fracture' }, 'Articles of Fracture are filed. The Accord no longer has writ over your charter.'); }}
            className="flex-1 min-h-[40px] rounded text-[12px] font-bold border bg-amber-500/15 text-amber-200 border-amber-500/40 hover:brightness-125"
          >
            Confirm — file Articles of Fracture
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="flex-1 min-h-[40px] rounded text-[12px] font-bold border bg-white/[0.03] text-slate-300 border-white/[0.08]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(true)}
          className="mt-3 w-full min-h-[40px] rounded text-[12px] font-bold border bg-white/[0.03] text-slate-300 border-white/[0.08] hover:brightness-125"
        >
          File Articles of Fracture…
        </button>
      )}

      {snap.fractureRoster.length > 0 && (
        <div className="mt-3">
          <h4 className="text-slate-300 text-[11px] font-bold">Outside Accord jurisdiction</h4>
          <p className="mt-1 text-[11px] text-slate-500">
            {snap.fractureRoster.map(f => f.corpName).join(', ')}
          </p>
        </div>
      )}
    </ConsolePanel>
  );
}

// ─── The Chair roll ─────────────────────────────────────────────────────────

function RollCard({ snap }: { snap: ChairSnapshot }) {
  if (snap.roll.length === 0) return null;
  return (
    <ConsolePanel title="The Chair roll" icon="archive" variant="secondary" compact subtitle="Public history — every certified term, and every vacancy.">
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-[11px]">
          <caption className="sr-only">Certified terms of the Accord Chair, most recent first</caption>
          <thead>
            <tr className="text-slate-500 text-left">
              <th scope="col" className="font-medium py-1 pr-3">Term</th>
              <th scope="col" className="font-medium py-1 pr-3">Chair</th>
              <th scope="col" className="font-medium py-1 pr-3">Banner</th>
              <th scope="col" className="font-medium py-1 text-right">Votes</th>
            </tr>
          </thead>
          <tbody>
            {snap.roll.map(r => (
              <tr key={r.termIndex} className="border-t border-white/5">
                <td className="py-1 pr-3 text-slate-300 whitespace-nowrap">{r.termLabel}</td>
                <td className="py-1 pr-3 text-slate-300">{r.corpName ?? 'Vacant'}</td>
                <td className="py-1 pr-3 text-slate-500">
                  {r.patronFactionId ? FACTION_MAP.get(r.patronFactionId)?.name ?? '—' : '—'}
                </td>
                <td className="py-1 text-right mat-figure text-slate-200">{r.corpName ? r.totalVotes : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsolePanel>
  );
}
