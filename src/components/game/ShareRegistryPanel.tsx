'use client';

// ─── Capital & Control (Wave M6 — docs/MEANINGFUL_2026-08.md §M6) ───────────
// The share-registry / hostile-takeover surface, mounted inside
// GovernancePanel (board politics is where capital-structure decisions
// live). Server-truth via GET/POST /api/space-tycoon/equity; below the
// population gate the whole system honestly presents as "awaiting market
// depth" instead of pretending nine corporations are a market.

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import {
  TOTAL_SHARES,
  RAISE_MIN_SHARES,
  RAISE_MAX_SHARES,
  DIVIDEND_MAX_PAYOUT_PCT,
  TENDER_MIN_SHARES,
  DISTRESS_MONTHS_REQUIRED,
  type EquitySnapshot,
} from '@/lib/game/share-registry';

interface Listing {
  id: string;
  kind: 'raise' | 'distress';
  targetProfileId: string;
  targetName: string;
  pricePerShare: number;
  sharesRemaining: number;
  closesAtMs: number;
}

interface MandatoryBid {
  offerId: string;
  targetName: string;
  pricePerShare: number;
  endsAtMs: number;
  myShares: number;
}

interface DiligenceReport {
  targetName: string;
  cashEstimate: number;
  bookNetWorthEstimate: number;
  lastQuarterProfitEstimate: number | null;
  publishedQuarter: string | null;
  note: string;
}

interface TenderOnHolding {
  offerId: string;
  kind: string;
  targetName: string;
  initiatorName: string;
  pricePerShare: number;
  sharesSought: number;
  closesAtMs: number;
  myShares: number;
  myAccepted: number;
}

interface EquityResponse {
  available: boolean;
  frontierProtected?: boolean;
  snapshot: EquitySnapshot | null;
  listings?: Listing[];
  mandatoryBids?: MandatoryBid[];
  tendersOnHoldings?: TenderOnHolding[];
}

function daysLeft(ms: number): string {
  const remaining = ms - Date.now();
  if (remaining <= 0) return 'closing';
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

export default function ShareRegistryPanel({ state }: { state: GameState }) {
  const [data, setData] = useState<EquityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [diligence, setDiligence] = useState<DiligenceReport | null>(null);
  // Forms
  const [tenderTarget, setTenderTarget] = useState('');
  const [tenderShares, setTenderShares] = useState(TENDER_MIN_SHARES);
  const [tenderPrice, setTenderPrice] = useState('');
  const [raiseShares, setRaiseShares] = useState(RAISE_MIN_SHARES);
  const [dividendPct, setDividendPct] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/equity');
      const json = (await res.json()) as EquityResponse;
      setData(json);
      if (json.snapshot?.registry) setDividendPct(json.snapshot.registry.dividendPayoutPct);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const act = useCallback(async (label: string, body: Record<string, unknown>) => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await fetch('/api/space-tycoon/equity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setNotice(json.error || 'Action failed');
        playSound('error');
        return null;
      }
      playSound('money');
      await refresh();
      return json;
    } catch {
      setNotice('Network error');
      return null;
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  if (loading) {
    return (
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="font-hud text-white text-xs font-bold uppercase tracking-wider">Capital &amp; Control</p>
        <p className="text-[10px] text-slate-500 mt-1">Reading the share registry…</p>
      </div>
    );
  }

  if (!data?.available) {
    return null; // schema not provisioned — surface nothing rather than a broken panel
  }

  const snap = data.snapshot;

  // ── Population gate: honest dormant state ───────────────────────────────
  if (!snap || !snap.enabled) {
    const active = snap?.activeCorps ?? 0;
    const required = snap?.requiredCorps ?? 25;
    return (
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <p className="font-hud text-white text-xs font-bold uppercase tracking-wider mb-1">Capital &amp; Control</p>
        <p className="text-[11px] text-slate-400 mb-2">
          <span className="text-amber-300 font-semibold">Awaiting market depth.</span>{' '}
          The interplanetary equity market — share registries, capital raises, tender offers, and
          hostile takeovers — activates once enough corporations operate in the open economy for
          tender offers to have real targets and real counterbidders.
        </p>
        <div className="flex items-center gap-2" role="progressbar" aria-valuenow={active} aria-valuemin={0} aria-valuemax={required} aria-label="Active corporations toward equity market activation">
          <div className="flex-1 h-1.5 rounded bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-400" style={{ width: `${Math.min(100, (active / Math.max(1, required)) * 100)}%` }} />
          </div>
          <span className="text-[10px] text-slate-500 whitespace-nowrap">{active} / {required} active corporations</span>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">
          When it opens: 100-share registries per corporation, board-voted capital raises (sell
          10–30% for cash), distress auctions, 7-day public tender offers with buyback
          counteroffers and white knights, mandatory-bid minority protection, and board-set
          dividends. Frontier corporations can never be tendered.
        </p>
      </div>
    );
  }

  const reg = snap.registry;

  return (
    <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-4">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center justify-between">
        <p className="font-hud text-white text-xs font-bold uppercase tracking-wider">Capital &amp; Control</p>
        <span className="text-[10px] text-slate-500">Share registry · tender offers · dividends</span>
      </div>

      {notice && (
        <p role="alert" className="text-[11px] text-amber-300 border border-amber-500/25 bg-amber-500/[0.05] rounded px-2 py-1">{notice}</p>
      )}

      {data.frontierProtected && (
        <p className="text-[10px] text-cyan-300/80 border border-cyan-500/20 bg-cyan-500/[0.04] rounded px-2 py-1">
          Protected Frontier: your corporation cannot be tendered, and graduates before it can bid,
          raise capital, or buy equity.
        </p>
      )}

      {/* ── My capital structure ─────────────────────────────────────────── */}
      {reg && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Market valuation</p>
              <p className="text-white font-semibold">{formatMoney(reg.valuation)}</p>
              <p className="text-[9px] text-slate-600">book × {reg.marketPremium.toFixed(2)} premium</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Fair value / share</p>
              <p className="text-white font-semibold">{formatMoney(reg.fairSharePrice)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Founder stake</p>
              <p className="text-white font-semibold">{reg.founderShares} / {TOTAL_SHARES}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px] uppercase">Public float</p>
              <p className="text-white font-semibold">{reg.floatShares} shares</p>
            </div>
          </div>
          {/* Ownership bar — shape + label, never color alone */}
          <div className="h-2 rounded bg-white/[0.06] overflow-hidden flex" aria-label={`Ownership: founder ${reg.founderShares} shares, float ${reg.floatShares} shares`}>
            <div className="h-full bg-cyan-500/70" style={{ width: `${reg.founderShares}%` }} />
            <div className="h-full bg-purple-500/70" style={{ width: `${reg.floatShares}%` }} />
          </div>
          {reg.controllerName && (
            <p className="text-[11px] text-purple-300">
              ◆ Controlled by <span className="font-semibold">{reg.controllerName}</span> — your corporation operates as a subsidiary.
              {reg.integrationMalusPct > 0 && ` Integration drag: −${Math.round(reg.integrationMalusPct * 100)}% service revenue while systems merge.`}
            </p>
          )}
          {reg.distressMonths > 0 && (
            <p className="text-[11px] text-amber-300">
              ⚠ Cash-negative {reg.distressMonths} of {DISTRESS_MONTHS_REQUIRED} months — at {DISTRESS_MONTHS_REQUIRED}, a
              10-share tranche auto-auctions at a discount. Restore positive cash to reset the clock.
            </p>
          )}
        </div>
      )}

      {/* ── Tenders targeting me ─────────────────────────────────────────── */}
      {snap.tendersOnMe.length > 0 && (
        <div className="border border-red-500/25 bg-red-500/[0.04] rounded-lg p-2 space-y-2">
          <p className="font-hud text-[10px] text-red-300 uppercase tracking-wider font-semibold">Tender offers for your corporation</p>
          {snap.tendersOnMe.map(t => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-300">
                <span className="font-semibold text-white">{t.initiatorName}</span>
                {t.kind === 'white_knight' ? ' (white knight)' : t.kind === 'buyback' ? ' (your buyback)' : ''} — {formatMoney(t.pricePerShare)}/share × {t.sharesSought} · closes in {daysLeft(t.closesAtMs)}
              </span>
              {t.kind !== 'buyback' && (
                <button
                  className="game-btn text-[10px] px-2 py-1 border border-cyan-500/40 rounded"
                  disabled={busy !== null}
                  onClick={() => act('buyback', { action: 'buyback', pricePerShare: t.pricePerShare, shares: reg?.floatShares })}
                >
                  Counter: buyback at match
                </button>
              )}
            </div>
          ))}
          <p className="text-[10px] to-slate-500 text-slate-500">
            The contest resolves deterministically at the deadline — highest price wins, your board&apos;s
            counteroffer wins ties. Holders (including you) choose whether to sell; nobody is forced
            out below 50%, and anyone crossing 50% must offer minorities the same price for 30 days.
          </p>
        </div>
      )}

      {/* ── Tenders on corps I hold — sell in or hold for dividends ─────── */}
      {(data.tendersOnHoldings || []).length > 0 && (
        <div className="border border-cyan-500/25 bg-cyan-500/[0.04] rounded-lg p-2 space-y-1">
          <p className="font-hud text-[10px] text-cyan-300 uppercase tracking-wider font-semibold">Tenders on your holdings</p>
          {data.tendersOnHoldings!.map(t => (
            <div key={t.offerId} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-300">
                {t.targetName}: {t.initiatorName} bids {formatMoney(t.pricePerShare)}/share (you hold {t.myShares}
                {t.myAccepted > 0 ? `, ${t.myAccepted} tendered` : ''}) · closes in {daysLeft(t.closesAtMs)}
              </span>
              <button
                className="game-btn text-[10px] px-2 py-1 border border-cyan-500/40 rounded"
                disabled={busy !== null}
                onClick={() => act('accept', { action: 'accept', offerId: t.offerId, shares: t.myShares })}
              >
                {t.myAccepted > 0 ? 'Revise: tender all' : 'Tender my shares'}
              </button>
            </div>
          ))}
          <p className="text-[10px] text-slate-500">Selling is voluntary — hold instead and collect dividends. Oversubscribed offers fill pro-rata.</p>
        </div>
      )}

      {/* ── Mandatory-bid exits on corps I hold ──────────────────────────── */}
      {(data.mandatoryBids || []).length > 0 && (
        <div className="border border-purple-500/25 bg-purple-500/[0.04] rounded-lg p-2 space-y-1">
          <p className="font-hud text-[10px] text-purple-300 uppercase tracking-wider font-semibold">Mandatory-bid windows (minority protection)</p>
          {data.mandatoryBids!.map(m => (
            <div key={m.offerId} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-300">{m.targetName}: sell up to {m.myShares} shares at {formatMoney(m.pricePerShare)} until {daysLeft(m.endsAtMs)} from now</span>
              <button
                className="game-btn text-[10px] px-2 py-1 border border-purple-500/40 rounded"
                disabled={busy !== null}
                onClick={() => act('mandatory', { action: 'exercise_mandatory_bid', offerId: m.offerId, shares: m.myShares })}
              >
                Sell at tender price
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── My holdings + my offers ──────────────────────────────────────── */}
      {(snap.holdings.length > 0 || snap.myOffers.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
          {snap.holdings.length > 0 && (
            <div>
              <p className="text-slate-500 text-[10px] uppercase mb-1">My equity holdings</p>
              {snap.holdings.map(h => (
                <p key={h.targetProfileId} className="text-slate-300">{h.targetName}: <span className="text-white font-semibold">{h.shares}</span> shares</p>
              ))}
            </div>
          )}
          {snap.myOffers.length > 0 && (
            <div>
              <p className="text-slate-500 text-[10px] uppercase mb-1">My open offers</p>
              {snap.myOffers.filter(o => o.status === 'open').map(o => (
                <div key={o.id} className="flex items-center justify-between gap-2">
                  <span className="text-slate-300">{o.kind === 'raise' ? 'Capital raise' : o.kind === 'distress' ? 'Distress tranche' : `Offer on ${o.targetName}`} — {formatMoney(o.pricePerShare)} × {o.sharesSought} · {daysLeft(o.closesAtMs)}</span>
                  <button
                    className="text-[10px] text-slate-400 underline"
                    disabled={busy !== null}
                    onClick={() => act('withdraw', { action: 'withdraw', offerId: o.id })}
                  >
                    withdraw
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Open market listings ─────────────────────────────────────────── */}
      {(data.listings || []).length > 0 && (
        <div>
          <p className="text-slate-500 text-[10px] uppercase mb-1">Open share listings</p>
          <div className="space-y-1 text-[11px]">
            {data.listings!.map(l => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-300">
                  {l.targetName} {l.kind === 'distress' ? '(distress auction)' : '(capital raise)'} — {l.sharesRemaining} shares at {formatMoney(l.pricePerShare)} · {daysLeft(l.closesAtMs)}
                </span>
                <button
                  className="game-btn text-[10px] px-2 py-1 border border-emerald-500/40 rounded"
                  disabled={busy !== null || data.frontierProtected}
                  onClick={() => act('buy', { action: 'buy_listing', offerId: l.id, shares: Math.min(5, l.sharesRemaining) })}
                >
                  Buy {Math.min(5, l.sharesRemaining)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Board actions ────────────────────────────────────────────────── */}
      {!data.frontierProtected && (
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Launch tender */}
          <div className="border border-white/[0.06] rounded-lg p-2 space-y-1.5">
            <p className="font-hud text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Launch a tender offer</p>
            <label className="block text-[10px] text-slate-500">
              Target corporation
              <input value={tenderTarget} onChange={e => setTenderTarget(e.target.value)}
                placeholder="Exact company name"
                className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
            </label>
            <div className="flex gap-2">
              <label className="block text-[10px] text-slate-500 flex-1">
                Shares ({TENDER_MIN_SHARES}–{TOTAL_SHARES})
                <input type="number" min={TENDER_MIN_SHARES} max={TOTAL_SHARES} value={tenderShares}
                  onChange={e => setTenderShares(Number(e.target.value))}
                  className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
              </label>
              <label className="block text-[10px] text-slate-500 flex-1">
                Price per share ($)
                <input type="number" min={0} value={tenderPrice}
                  onChange={e => setTenderPrice(e.target.value)}
                  className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                className="game-btn text-[10px] px-2 py-1 border border-cyan-500/40 rounded"
                disabled={busy !== null || !tenderTarget || !tenderPrice}
                onClick={() => act('tender', { action: 'tender', targetCompanyName: tenderTarget, shares: tenderShares, pricePerShare: Number(tenderPrice) })}
              >
                {busy === 'tender' ? 'Filing…' : 'File tender (7-day window)'}
              </button>
              <button
                className="game-btn text-[10px] px-2 py-1 border border-white/15 rounded"
                disabled={busy !== null || !tenderTarget}
                onClick={async () => {
                  const res = await act('diligence', { action: 'diligence', targetCompanyName: tenderTarget });
                  if (res?.report) setDiligence(res.report as DiligenceReport);
                }}
              >
                Buy diligence report
              </button>
            </div>
            <p className="text-[9px] text-slate-600">
              Escrow price × shares + a burned 2% arbitration fee. Minimum price = fair value + 20%
              control premium. Frontier corporations cannot be targeted; contested targets carry a
              30-day cooldown.
            </p>
            {diligence && (
              <div className="border border-white/[0.08] rounded p-1.5 text-[10px] text-slate-300 space-y-0.5">
                <p className="text-white font-semibold">{diligence.targetName} — diligence estimates (±15%)</p>
                <p>Cash ≈ {formatMoney(diligence.cashEstimate)} · Book NW ≈ {formatMoney(diligence.bookNetWorthEstimate)}</p>
                <p>{diligence.lastQuarterProfitEstimate !== null
                  ? `Last published quarter profit ≈ ${formatMoney(diligence.lastQuarterProfitEstimate)} (${diligence.publishedQuarter})`
                  : 'No published quarterly on file — target trades at book.'}</p>
              </div>
            )}
          </div>

          {/* Raise + dividend */}
          <div className="border border-white/[0.06] rounded-lg p-2 space-y-2">
            <div className="space-y-1">
              <p className="font-hud text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Capital raise</p>
              <div className="flex items-end gap-2">
                <label className="block text-[10px] text-slate-500 flex-1">
                  Shares to sell ({RAISE_MIN_SHARES}–{RAISE_MAX_SHARES})
                  <input type="number" min={RAISE_MIN_SHARES} max={RAISE_MAX_SHARES} value={raiseShares}
                    onChange={e => setRaiseShares(Number(e.target.value))}
                    className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
                </label>
                <button
                  className="game-btn text-[10px] px-2 py-1 border border-emerald-500/40 rounded"
                  disabled={busy !== null}
                  onClick={() => act('raise', { action: 'raise', shares: raiseShares })}
                >
                  List at fair value −10%
                </button>
              </div>
              <p className="text-[9px] text-slate-600">Real financing with real dilution: sold shares become float a rival can accumulate. 90-day cooldown.</p>
            </div>
            <div className="space-y-1">
              <p className="font-hud text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Dividend policy</p>
              <div className="flex items-end gap-2">
                <label className="block text-[10px] text-slate-500 flex-1">
                  Payout ratio (0–{DIVIDEND_MAX_PAYOUT_PCT}% of published quarterly profit)
                  <input type="number" min={0} max={DIVIDEND_MAX_PAYOUT_PCT} value={dividendPct}
                    onChange={e => setDividendPct(Number(e.target.value))}
                    className="mt-0.5 w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[11px] text-white" />
                </label>
                <button
                  className="game-btn text-[10px] px-2 py-1 border border-white/15 rounded"
                  disabled={busy !== null}
                  onClick={() => act('dividend', { action: 'set_dividend', payoutRatioPct: dividendPct })}
                >
                  Set policy
                </button>
              </div>
              <p className="text-[9px] text-slate-600">Minority holders who decline a tender hold and collect — dividends pay out of each newly published quarterly.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
