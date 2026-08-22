'use client';

// ─── AAA Program Round 2: the Emergency view ────────────────────────────────
// docs/AAA_PROGRAM_2026-08.md "Round 2". Lives as the fifth sub-view of the
// Reports hub (Reports → Emergency), alongside Situation Log / Mail /
// Quarterly / Legacy Hall — no 29th tab, and the same hub that already holds
// "everything that needs a decision".
//
// Presentation contract, inherited from E4's Legacy Hall and E1's Chair panel:
//  - every bar is a real role="progressbar" whose numbers are ALSO printed
//    beside it in visible text, so no meter is the sole carrier of its value;
//  - no state is ever carried by colour alone — severity, posture and
//    subscription all read as words first;
//  - Wave A chrome only (ConsolePanel / HoloCard / DataChip / StatReadout /
//    Figure / GameIcon / HoloTip), so the global reduced-motion guard and the
//    density scale come for free;
//  - phone-first: every grid starts grid-cols-1.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  CRISIS_APPROACHES,
  CRISIS_STAGES,
  CRISIS_TIER_LABEL,
  CRISIS_TIER_THRESHOLDS,
  crisisTierRank,
  getCrisisStatus,
  projectedApproachSpend,
  situationRealizedLoss,
  computeSituationRatePerMs,
  CRISIS_PREMIUM_MULTIPLIER,
  type CrisisApproachId,
  type CrisisSnapshot,
  type CrisisTier,
} from '@/lib/game/systemic-crises';
import { getGraduationGlideFraction } from '@/lib/game/frontier';
import GameIcon from './GameIcon';
import HoloTip, { Concept } from './HoloTip';
import LeaderPortraitFrame from './LeaderPortraitFrame';
import { ConsolePanel, HoloCard, DataChip, StatReadout, Figure } from './chrome';

interface Props {
  state: GameState;
  /** Applies systemic-crises.ts::setCrisisApproach to the live save. Wired in
   *  page.tsx exactly like every other panel mutation — this component never
   *  touches GameState itself. */
  onSetApproach: (approachId: CrisisApproachId) => { ok: boolean; reason?: string };
}

/** LORE.md: the Accord Council's Secretary-General. He has no portrait in the
 *  art roster, so LeaderPortraitFrame renders its monogram plate — inventing
 *  a portrait would be fabricating content (the E1 precedent). */
const PRIEST_SPEAKER = {
  id: 'accord-secretary-general',
  name: 'Anatole Priest',
  title: 'Secretary-General',
  affiliation: 'The Accord Council, Luna',
  portraitUrl: null,
  cohort: 'none' as const,
  accentHex: '#f59e0b',
};

function money(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
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

const TIER_TONE: Record<CrisisTier, 'good' | 'info' | 'warn' | 'bad'> = {
  advisory: 'good',
  elevated: 'info',
  severe: 'warn',
  systemic: 'bad',
};

/** A metered bar. The value is printed in text beside every instance by the
 *  caller; this renders the graphic AND the ARIA contract. */
function Meter({ fraction, label, tone }: { fraction: number; label: string; tone: 'cyan' | 'amber' | 'red' | 'green' }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  const fill = tone === 'red' ? 'bg-red-400' : tone === 'amber' ? 'bg-amber-400' : tone === 'green' ? 'bg-emerald-400' : 'bg-cyan-400';
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden border border-white/10"
    >
      <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SystemicCrisisPanel({ state, onSetApproach }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [override, setOverride] = useState<CrisisSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pledgeInput, setPledgeInput] = useState<string>('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // The sync snapshot is the baseline; a mutation re-GETs the authoritative
  // view immediately so the player is never left reading a stale pool for up
  // to a sync interval. The server is the source of truth on BOTH paths.
  const effectiveState = useMemo(
    () => (override ? { ...state, systemicCrisis: override } : state),
    [state, override],
  );
  const cs = useMemo(() => getCrisisStatus(effectiveState, now), [effectiveState, now]);
  const snap = cs.snapshot;
  const def = cs.def;
  const sit = cs.situation;

  const post = useCallback(async (payload: Record<string, unknown>, okText: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/space-tycoon/crisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ tone: 'error', text: String(data?.error ?? 'That could not be recorded.') });
      } else {
        if (data?.crisis) setOverride(data.crisis as CrisisSnapshot);
        setNotice({ tone: 'ok', text: okText });
      }
    } catch {
      setNotice({ tone: 'error', text: 'Network error — nothing was recorded.' });
    } finally {
      setBusy(false);
    }
  }, []);

  const glide = getGraduationGlideFraction(state, now);
  const qualifying = cs.qualifyingPledgeUsd;

  // ── The briefing ───────────────────────────────────────────────────────
  const phaseCopy = (() => {
    switch (cs.window.phase) {
      case 'forecast':
        return `Forecast published. The emergency window opens in ${countdown(cs.window.activeStartMs - now)}.`;
      case 'active':
        return `Window open — stage ${Math.min(CRISIS_STAGES, cs.window.stage + 1)} of ${CRISIS_STAGES}. Closes in ${countdown(cs.window.activeEndMs - now)}.`;
      case 'aftermath':
        return 'The window has closed. The assessment is being spent on the directed relief allocation and the cycle sealed into the register.';
      default:
        return `Register in recess. The next forecast opens in ${countdown(cs.window.forecastStartMs + 8 * 7 * 86_400_000 - now)}.`;
    }
  })();

  return (
    <div className="space-y-3">
      <ConsolePanel
        title="Accord Emergency Register"
        icon="cal-systemic-crisis"
        accent={cs.tier === 'advisory' ? 'cyan' : cs.tier === 'systemic' ? 'red' : 'amber'}
        subtitle="Every eight real weeks the Accord carries an emergency: two weeks of published forecast, four weeks live, one week of aftermath. Which emergency runs is fixed by the calendar; how hard it bites is measured."
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            <DataChip icon="cal-systemic-crisis" tone={TIER_TONE[cs.tier]}>
              {CRISIS_TIER_LABEL[cs.tier]}
            </DataChip>
            <DataChip icon="calendar">Cycle {cs.window.cycleIndex}</DataChip>
          </div>
        }
      >
        <div className="mt-2 space-y-3">
          <LeaderPortraitFrame
            speaker={PRIEST_SPEAKER}
            eyebrow={`Accord Council · ${def.name}`}
            statusLabel={CRISIS_TIER_LABEL[cs.tier]}
            message={
              <>
                {def.briefing}
                <span className="block mt-2 text-slate-400">{phaseCopy}</span>
              </>
            }
          />

          <p className="text-[11px] text-slate-500 leading-snug">
            <strong className="text-slate-300">Historical precedent.</strong> {def.precedent}
          </p>

          {/* ── Measured severity ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <StatReadout
              label="Severity in force"
              value={CRISIS_TIER_LABEL[cs.tier]}
              icon="warning"
              sub={
                <>
                  the worse of the world&apos;s and yours ·{' '}
                  <HoloTip content={{ title: 'Accord Emergency', icon: 'cal-systemic-crisis', body: <Concept id="systemic-crisis" /> }}>
                    how this is measured
                  </HoloTip>
                </>
              }
            />
            <StatReadout
              label="World index (published)"
              value={snap?.enabled ? snap.worldIndex.toFixed(2) : '—'}
              icon="market"
              sub={
                snap?.enabled
                  ? `${CRISIS_TIER_LABEL[cs.worldTier]} · ${Math.round(snap.worldIndexMeasured).toLocaleString()} of ${Math.round(snap.worldIndexAnchor).toLocaleString()} ${def.worldIndexLabel}`
                  : 'not yet published on this shard'
              }
            />
            <StatReadout
              label="Your exposure index"
              value={cs.exposure.index.toFixed(2)}
              icon="build"
              sub={`${CRISIS_TIER_LABEL[cs.exposure.tier]} · ${Math.round(cs.exposure.measured).toLocaleString()} of ${Math.round(cs.exposure.anchor).toLocaleString()} ${cs.exposure.unit}`}
            />
            <StatReadout
              label="Insurance loading"
              value={`x${cs.premiumMultiplier.toFixed(2)}`}
              icon="reports"
              sub={
                state.insuranceActive === true
                  ? cs.premiumMultiplier > 1
                    ? 'your monthly premium is loaded while the emergency is in force'
                    : 'no loading in force'
                  : 'you carry no policy — no loading, and no cover either'
              }
            />
          </div>

          <p className="text-[10px] text-slate-500 leading-snug">
            Your exposure: {cs.exposure.detail}
          </p>

          {/* Severity ladder — always words, never colour alone. */}
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Severity ladder">
            {[...CRISIS_TIER_THRESHOLDS].reverse().map(t => (
              <span key={t.tier} role="listitem">
                <DataChip
                  icon={crisisTierRank(t.tier) <= crisisTierRank(cs.tier) ? 'medal' : 'medal-outline'}
                  tone={t.tier === cs.tier ? TIER_TONE[t.tier] : 'neutral'}
                >
                  {CRISIS_TIER_LABEL[t.tier]} — index &ge; {t.minIndex.toFixed(2)}
                  {t.tier === cs.tier ? ' · in force' : ''}
                  {' · premium x'}{CRISIS_PREMIUM_MULTIPLIER[t.tier].toFixed(2)}
                </DataChip>
              </span>
            ))}
          </div>
        </div>
      </ConsolePanel>

      {/* ── Protected / inert states, stated honestly ─────────────────── */}
      {!cs.eligibility.eligible && (
        <ConsolePanel
          title={
            cs.eligibility.reason === 'frontier' ? 'Protected Frontier — exempt'
              : cs.eligibility.reason === 'onboarding' ? 'Charter filings incomplete — deferred'
                : cs.eligibility.reason === 'advisory' ? 'Advisory only — no measures in force'
                  : cs.eligibility.reason === 'no_snapshot' ? 'No emergency on the register'
                    : 'Emergency window closed'
          }
          icon="cal-systemic-crisis"
          variant="inert"
          compact
        >
          <p className="mt-2 text-[11px] text-slate-400 leading-snug">
            {cs.eligibility.detail}
            {cs.eligibility.reason === 'advisory' && (
              <> The Accord publishes the forecast and the measured index either way — an emergency is only ever declared when the numbers support it, never on a schedule alone.</>
            )}
            {cs.eligibility.reason === 'no_snapshot' && (
              <> The register is published by the Accord server; if you are playing offline it will appear on your next sync.</>
            )}
          </p>
        </ConsolePanel>
      )}

      {/* ── The exposure bar and postures ─────────────────────────────── */}
      {sit && (
        <ConsolePanel
          title="Your exposure"
          icon="warning"
          accent={cs.projectedProgress >= 1 ? 'red' : 'amber'}
          variant={sit.outcome === 'realized' ? 'alert' : 'primary'}
          right={
            <DataChip icon="warning" tone={sit.outcome === 'realized' ? 'bad' : sit.outcome === 'contained' ? 'good' : cs.projectedProgress >= 1 ? 'bad' : 'warn'}>
              {sit.outcome === 'realized' ? 'Loss realized'
                : sit.outcome === 'contained' ? 'Contained'
                  : cs.projectedProgress >= 1 ? 'On course to realize' : 'On course to contain'}
            </DataChip>
          }
        >
          <div className="mt-2 space-y-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  Exposure bar ·{' '}
                  <HoloTip content={{ title: 'Exposure Bar', icon: 'warning', body: <Concept id="crisis-situation" /> }}>
                    how it advances
                  </HoloTip>
                </span>
                <span className="text-[11px] text-slate-300">
                  <Figure value={Math.round(sit.progress * 100)} unit="%" /> now ·{' '}
                  <Figure value={Math.round(cs.projectedProgress * 100)} unit="%" /> projected at close
                </span>
              </div>
              <Meter
                fraction={sit.progress}
                label={`Exposure bar: ${Math.round(sit.progress * 100)} percent, projected ${Math.round(cs.projectedProgress * 100)} percent at the close of the window`}
                tone={cs.projectedProgress >= 1 ? 'red' : sit.progress >= 0.6 ? 'amber' : 'cyan'}
              />
              <p className="text-[10px] text-slate-500 leading-snug">
                {sit.outcome === 'realized'
                  ? `The bar reached 100%. ${money(situationRealizedLoss(sit, sit.tierAtOnset, state.money))} was written off and recovery costs are elevated for six game-months.`
                  : sit.outcome === 'contained'
                    ? 'The window closed with the bar below 100%. No loss was realized and the Accord register notes it.'
                    : `If the bar reaches 100% before the window closes, the loss is ${money(situationRealizedLoss(sit, sit.tierAtOnset, state.money))} — bounded by the capital you held at onset and hard-capped at a quarter of your cash.`}
              </p>
              {glide > 0 && (
                <p className="text-[10px] text-emerald-400/80 leading-snug">
                  Post-graduation glide: your bar advances at {Math.round((1 - glide) * 100)}% of the normal rate, easing to full over the same 14 real days as the demand-pool glide.
                </p>
              )}
            </div>

            {/* Postures */}
            {!sit.outcome && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2" role="group" aria-label="Emergency posture">
                {CRISIS_APPROACHES.map(a => {
                  const isCurrent = sit.approachId === a.id;
                  const spend = projectedApproachSpend(sit, a.id, sit.tierAtOnset, cs.window.stage);
                  const rate = computeSituationRatePerMs(sit.tierAtOnset, sit.exposureAtOnset, a.id, sit.pledged, glide);
                  const remainingMs = Math.max(0, cs.window.activeEndMs - now);
                  const projected = Math.min(1, sit.progress + rate * remainingMs);
                  return (
                    <HoloCard key={a.id} variant={isCurrent ? 'primary' : 'secondary'} className="p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-semibold text-white">{a.name}</span>
                        {isCurrent && <DataChip icon="check" tone="good">Current</DataChip>}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 leading-snug">{a.summary}</p>
                      <p className="mt-1 text-[10px] text-slate-500 leading-snug">
                        {a.id === 'harden' ? def.hardenDetail : a.id === 'divest' ? def.divestDetail : 'The exposure runs its full course.'}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <StatReadout label="Cost to window close" value={spend > 0 ? money(spend) : 'none'} />
                        <StatReadout
                          label="Projected at close"
                          value={`${Math.round(projected * 100)}%`}
                          valueClassName={projected >= 1 ? 'text-red-400' : 'text-emerald-400'}
                          sub={projected >= 1 ? 'loss realized' : 'contained'}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isCurrent || cs.window.phase !== 'active'}
                        onClick={() => {
                          const r = onSetApproach(a.id);
                          setNotice(r.ok
                            ? { tone: 'ok', text: `Posture set: ${a.name}.` }
                            : { tone: 'error', text: r.reason ?? 'Posture could not be changed.' });
                        }}
                        className="mt-2 w-full min-h-[38px] rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-[11px] font-medium text-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500/20"
                      >
                        {isCurrent ? 'Current posture' : `Adopt ${a.name.toLowerCase()}`}
                      </button>
                    </HoloCard>
                  );
                })}
              </div>
            )}
          </div>
        </ConsolePanel>
      )}

      {/* ── The Accord Stabilization Assessment ───────────────────────── */}
      {snap?.enabled && snap.assessmentTargetUsd > 0 && (
        <ConsolePanel
          title="Accord Stabilization Assessment"
          icon="alliance"
          accent="purple"
          subtitle="A pooled emergency fund every corporation may contribute to, and every corporation the emergency reached lives with the result of. Whether the target is met changes the aftermath for all of them — pledger or not. Corporations the emergency never reached (Protected Frontier, mid-FTUE, or Advisory severity) are untouched in both directions."
          right={
            <DataChip icon="alliance" tone={cs.containment >= 1 ? 'good' : 'warn'}>
              {Math.round(cs.containment * 100)}% subscribed
            </DataChip>
          }
        >
          <div className="mt-2 space-y-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  Pool ·{' '}
                  <HoloTip content={{ title: 'Stabilization Assessment', icon: 'alliance', body: <Concept id="accord-assessment" /> }}>
                    what a pledge buys
                  </HoloTip>
                </span>
                <span className="text-[11px] text-slate-300">
                  <Figure value={money(snap.pledgedUsd)} /> of <Figure value={money(snap.assessmentTargetUsd)} /> from{' '}
                  <Figure value={snap.pledgeCount} /> corporation{snap.pledgeCount === 1 ? '' : 's'}
                </span>
              </div>
              <Meter
                fraction={cs.containment}
                label={`Assessment subscription: ${Math.round(cs.containment * 100)} percent of the target`}
                tone={cs.containment >= 1 ? 'green' : 'amber'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <StatReadout label="Your pledge" value={snap.myPledgeUsd > 0 ? money(snap.myPledgeUsd) : 'none'} icon="alliance" />
              <StatReadout
                label="Qualifying pledge"
                value={money(qualifying)}
                sub="scaled to your own capital at risk — a small corporation buys the same protection proportionally"
              />
              <StatReadout
                label="Pledge mitigation"
                value={snap.myPledgeUsd >= qualifying ? '+20%' : '—'}
                sub={snap.myPledgeUsd >= qualifying
                  ? 'applied on top of your posture, total capped at 90%'
                  : 'reached at the qualifying pledge'}
              />
            </div>

            {cs.window.phase === 'active' && cs.eligibility.eligible !== false && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 min-w-[160px] flex-1">
                  <span className="text-[10px] text-slate-400">Pledge amount (US$)</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1_000_000}
                    value={pledgeInput}
                    placeholder={String(qualifying)}
                    onChange={e => setPledgeInput(e.target.value)}
                    className="min-h-[38px] rounded-lg border border-white/15 bg-black/30 px-2 text-[12px] text-white"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const amt = Math.floor(Number(pledgeInput || qualifying));
                    void post({ action: 'pledge', amountUsd: amt }, `Pledged ${money(amt)} to the assessment.`);
                  }}
                  className="min-h-[38px] px-3 rounded-lg border border-purple-500/30 bg-purple-500/10 text-[11px] font-medium text-purple-200 disabled:opacity-40 hover:bg-purple-500/20"
                >
                  {busy ? 'Recording…' : 'Pledge'}
                </button>
                <p className="text-[10px] text-slate-500 basis-full leading-snug">
                  The money is burned, not escrowed — there is nothing to withdraw. A pledge buys a bounded reduction on your own exposure and a share of a public good; it buys no resources and no advantage over another corporation.
                </p>
              </div>
            )}

            {/* Relief allocation + the Chair's directive */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400">
                Relief allocation
                {snap.reliefSetByCorp
                  ? <> · directed by <strong className="text-white">{snap.reliefSetByCorp}</strong> as seated Chair</>
                  : <> · Accord default until the seated Chair directs otherwise</>}
              </span>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                {def.reliefOptions.map(r => {
                  const chosen = r.id === snap.reliefId;
                  return (
                    <HoloCard key={r.id} variant={chosen ? 'primary' : 'secondary'} className="p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-semibold text-white">{r.name}</span>
                        {chosen && <DataChip icon="check" tone="good">Directed</DataChip>}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 leading-snug">{r.description}</p>
                      <p className="mt-1.5 text-[10px] text-slate-500 leading-snug">
                        <strong className="text-slate-300">If subscribed:</strong> {r.contained.label}.{' '}
                        <strong className="text-slate-300">If short:</strong> {r.shortfall.label}.
                      </p>
                      {snap.canSetRelief && !chosen && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void post({ action: 'set_relief', reliefId: r.id }, `Directive issued: ${r.name}.`)}
                          className="mt-2 w-full min-h-[38px] rounded-lg border border-amber-500/30 bg-amber-500/10 text-[11px] font-medium text-amber-200 disabled:opacity-40 hover:bg-amber-500/20"
                        >
                          Direct the pool here
                        </button>
                      )}
                    </HoloCard>
                  );
                })}
              </div>
              {snap.canSetRelief && (
                <p className="text-[10px] text-amber-400/80 leading-snug">
                  You hold the gavel. A directive is a public commitment issued once per emergency and cannot be revised after corporations begin pledging against it.
                </p>
              )}
            </div>

            {/* The pledge roll — reputation is legible */}
            {snap.topPledges.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <caption className="sr-only">Largest pledges to the Accord Stabilization Assessment this cycle</caption>
                  <thead>
                    <tr className="text-slate-500 text-left">
                      <th scope="col" className="py-1 pr-2 font-medium">Corporation</th>
                      <th scope="col" className="py-1 pr-2 font-medium text-right">Pledged</th>
                      <th scope="col" className="py-1 font-medium text-right">Share of pool</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snap.topPledges.map(p => (
                      <tr key={`${p.corpName}-${p.amountUsd}`} className="border-t border-white/[0.06]">
                        <td className="py-1 pr-2 text-slate-200">{p.corpName}</td>
                        <td className="py-1 pr-2 text-right"><Figure value={money(p.amountUsd)} /></td>
                        <td className="py-1 text-right text-slate-400">
                          {snap.pledgedUsd > 0 ? `${Math.round((p.amountUsd / snap.pledgedUsd) * 100)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ConsolePanel>
      )}

      {/* ── The register: sealed cycles ───────────────────────────────── */}
      {snap?.enabled && snap.history.length > 0 && (
        <ConsolePanel title="The register" icon="scroll" variant="secondary" compact
          subtitle="Sealed emergencies, most recent first. Every one is permanent public history.">
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[11px]">
              <caption className="sr-only">Sealed Accord emergencies</caption>
              <thead>
                <tr className="text-slate-500 text-left">
                  <th scope="col" className="py-1 pr-2 font-medium">Cycle</th>
                  <th scope="col" className="py-1 pr-2 font-medium">Emergency</th>
                  <th scope="col" className="py-1 pr-2 font-medium text-right">World index</th>
                  <th scope="col" className="py-1 pr-2 font-medium text-right">Subscribed</th>
                  <th scope="col" className="py-1 font-medium text-right">Pledgers</th>
                </tr>
              </thead>
              <tbody>
                {snap.history.map(h => (
                  <tr key={h.cycleIndex} className="border-t border-white/[0.06]">
                    <td className="py-1 pr-2 text-slate-400">{h.cycleIndex}</td>
                    <td className="py-1 pr-2 text-slate-200">{h.crisisId.replace(/_/g, ' ')}</td>
                    <td className="py-1 pr-2 text-right"><Figure value={h.worldIndex.toFixed(2)} /></td>
                    <td className="py-1 pr-2 text-right">
                      <Figure value={`${Math.round(h.containment * 100)}%`} />
                      <span className="ml-1 text-slate-500">{h.containment >= 1 ? 'met' : 'short'}</span>
                    </td>
                    <td className="py-1 text-right text-slate-400">{h.pledgeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ConsolePanel>
      )}

      {notice && (
        <p
          role="status"
          className={`text-[11px] ${notice.tone === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {notice.text}
        </p>
      )}

      <p className="text-[10px] text-slate-600 leading-snug">
        Anchors marked as estimates are exactly that — the measured numerator beside each is real telemetry
        (<span className="text-slate-500">{def.worldIndexLabel}</span>), read from the shared register at the
        moment the forecast phase opened and frozen for the cycle so it cannot move under you mid-emergency.
      </p>
    </div>
  );
}
