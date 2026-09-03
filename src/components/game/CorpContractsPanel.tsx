'use client';

// ─── Corp Contracts — binding corp-to-corp supply contracts + pacts ─────────
// Diplomacy (2026-09-02, docs/ECONOMY_PVP_2026-08.md "Diplomacy"). The
// Contracts hub's `contracts:corp` sub-view. Built on the shared design
// system from day one (Console / DataTable / StatusPip / Telemetry, tokens,
// GameIcon) — no raw hex, no colour-only state.
//
// Everything here calls the server; every gate (price band, funds, bond,
// Frontier waiver, authoritative inventory, pact rules) is enforced there.
// This panel only shows the same numbers the server will use, so the player
// is never surprised by a refusal.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { RESOURCES, RESOURCE_MAP } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import { resourceCategoryIcon } from '@/lib/game/icons';
import {
  CORP_CONTRACT_DEADLINE_DAYS,
  CORP_CONTRACT_MILESTONES,
  CORP_CONTRACT_PENALTY_PCT,
  CORP_CONTRACT_PRICE_BAND,
  CORP_CONTRACT_DISPUTE_FEE_FRACTION,
  computeCollateral,
  fallbackSpotPrice,
  validateContractPrice,
} from '@/lib/game/corp-contracts';
import { CORP_PACT_DEFS, CORP_PACT_DURATION_DAYS, CORP_PACT_KINDS, CORP_PACT_BREAK_REP } from '@/lib/game/corp-pacts';
import Console from '@/components/ui/Console';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import Telemetry from '@/components/ui/Telemetry';
import GameIcon from './GameIcon';

// ─── Server view types (mirror corp-contracts-server.ts / corp-pacts-server.ts) ─

interface MilestoneView { pct: number; dueAt: string; deliveredQty: number; deliveredAt: string | null; releasedMoney: number }

interface ContractView {
  id: string;
  status: string;
  resourceSlug: string;
  resourceName: string;
  quantity: number;
  deliveredQty: number;
  pricePerUnit: number;
  totalValue: number;
  escrowHeld: number;
  escrowReleased: number;
  collateralMoney: number;
  penaltyPct: number;
  milestones: MilestoneView[];
  nextMilestone: { pct: number; dueAt: string; remainingQty: number } | null;
  deadlineAt: string;
  createdAt: string;
  publicNote: string | null;
  directed: boolean;
  issuerName: string;
  counterpartyName: string | null;
  cancelRequestedBy: string | null;
  arbitratedBy: string | null;
  ruling: string | null;
  role: 'issuer' | 'counterparty' | 'none';
}

interface PactView {
  id: string;
  kind: string;
  kindLabel: string;
  status: string;
  proposerName: string;
  counterpartyName: string;
  partnerName: string;
  durationDays: number;
  startsAt: string | null;
  endsAt: string | null;
  brokenBy: string | null;
  createdAt: string;
  role: 'proposer' | 'counterparty' | 'none';
}

interface ContractsResponse { open: ContractView[]; mine: ContractView[]; spot: Record<string, number>; profileId: string }
interface PactsResponse { active: PactView[]; proposedToMe: PactView[]; proposedByMe: PactView[]; history: PactView[]; profileId: string }

const LIVE = new Set(['accepted', 'delivering']);

function statusPip(status: string): { state: PipState; label: string } {
  switch (status) {
    case 'open': return { state: 'hold', label: 'OPEN' };
    case 'accepted': return { state: 'live', label: 'SIGNED' };
    case 'delivering': return { state: 'live', label: 'DELIVERING' };
    case 'fulfilled': return { state: 'flew', label: 'FULFILLED' };
    case 'defaulted': return { state: 'scrub', label: 'DEFAULTED' };
    case 'cancelled': return { state: 'scrub', label: 'CANCELLED' };
    case 'arbitrated': return { state: 'tminus', label: 'ARBITRATED' };
    case 'disputed': return { state: 'tminus', label: 'DISPUTED' };
    default: return { state: 'hold', label: status.toUpperCase() };
  }
}

function pactPip(status: string): { state: PipState; label: string } {
  switch (status) {
    case 'active': return { state: 'live', label: 'ACTIVE' };
    case 'proposed': return { state: 'hold', label: 'PROPOSED' };
    case 'expired': return { state: 'flew', label: 'EXPIRED' };
    case 'broken': return { state: 'scrub', label: 'BROKEN' };
    case 'declined': return { state: 'scrub', label: 'DECLINED' };
    default: return { state: 'hold', label: status.toUpperCase() };
  }
}

function daysLeft(iso: string, nowMs: number): string {
  const ms = new Date(iso).getTime() - nowMs;
  if (ms <= 0) return 'due';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

const FIELD = 'w-full min-h-[40px] px-3 rounded-lg bg-[var(--elev)] text-[var(--ink)] text-[13px] border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--signal)]';
const LABEL = 'font-body text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)] block mb-1';
const BTN = 'btn-primary !min-h-[40px] !py-1.5 !px-3 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'btn-ghost !min-h-[36px] !py-1 !px-2 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed';

interface CorpContractsPanelProps {
  state: GameState;
}

export default function CorpContractsPanel({ state }: CorpContractsPanelProps) {
  const [contracts, setContracts] = useState<ContractsResponse | null>(null);
  const [pacts, setPacts] = useState<PactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const nowMs = Date.now();

  // Create form
  const [resource, setResource] = useState<string>(RESOURCES[0]?.id ?? 'iron');
  const [quantity, setQuantity] = useState(1_000);
  const [price, setPrice] = useState<number>(0);
  const [deadlineDays, setDeadlineDays] = useState<number>(CORP_CONTRACT_DEADLINE_DAYS.default);
  const [milestoneCount, setMilestoneCount] = useState<number>(CORP_CONTRACT_MILESTONES.default);
  const [penaltyPct, setPenaltyPct] = useState<number>(CORP_CONTRACT_PENALTY_PCT.default);
  const [note, setNote] = useState('');
  const [directTo, setDirectTo] = useState('');
  const [deliverQty, setDeliverQty] = useState<Record<string, number>>({});

  // Pact form
  const [pactCompany, setPactCompany] = useState('');
  const [pactKind, setPactKind] = useState<string>('no_poach');
  const [pactDays, setPactDays] = useState<number>(CORP_PACT_DURATION_DAYS.default);

  const refresh = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([
        fetch('/api/space-tycoon/corp-contracts').then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch('/api/space-tycoon/corp-pacts').then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (c) setContracts(c as ContractsResponse);
      if (p) setPacts(p as PactsResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const spot = useMemo(() => {
    const live = contracts?.spot?.[resource];
    return Number.isFinite(live) && (live as number) > 0 ? (live as number) : fallbackSpotPrice(resource);
  }, [contracts, resource]);
  const band = useMemo(() => validateContractPrice(price, spot), [price, spot]);
  useEffect(() => { setPrice(Math.round(spot)); }, [spot]);

  const totalValue = Math.round(quantity * price);
  const inFrontier = state.frontierStatus === 'active';

  const mine = useMemo(() => contracts?.mine ?? [], [contracts]);
  const liveMine = mine.filter(c => LIVE.has(c.status));
  const escrowLocked = mine.filter(c => c.role === 'issuer' && (c.status === 'open' || LIVE.has(c.status))).reduce((s, c) => s + c.escrowHeld, 0);
  const bondPosted = liveMine.filter(c => c.role === 'counterparty').reduce((s, c) => s + c.collateralMoney, 0);

  const run = useCallback(async (id: string, url: string, body: unknown, okText: (d: Record<string, unknown>) => string) => {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await postJson(url, body);
      if (res.ok) {
        playSound('milestone');
        setNotice({ tone: 'ok', text: okText(res.data) });
      } else {
        playSound('error');
        setNotice({ tone: 'err', text: String(res.data.message ?? res.data.error ?? `Request failed (${res.status})`) });
      }
      await refresh();
    } catch (error) {
      setNotice({ tone: 'err', text: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  const createContract = () => run('create', '/api/space-tycoon/corp-contracts', {
    resourceSlug: resource, quantity, pricePerUnit: price, deadlineDays, milestoneCount, penaltyPct,
    publicNote: note || undefined, counterpartyCompanyName: directTo.trim() || undefined,
  }, d => `Contract issued — ${formatMoney(Number(d.escrowed) || totalValue)} escrowed.`);

  // ── Open market table ─────────────────────────────────────────────────
  type OpenRow = ContractView & { spotDeltaPct: number; bond: number; left: string };
  const openRows: OpenRow[] = useMemo(() => (contracts?.open ?? []).map(c => {
    const s = contracts?.spot?.[c.resourceSlug] || fallbackSpotPrice(c.resourceSlug);
    return {
      ...c,
      spotDeltaPct: s > 0 ? Math.round(((c.pricePerUnit - s) / s) * 100) : 0,
      bond: computeCollateral(c.totalValue, c.penaltyPct, inFrontier),
      left: daysLeft(c.deadlineAt, nowMs),
    };
  }), [contracts, inFrontier, nowMs]);

  const openColumns: DataTableColumn<OpenRow>[] = [
    { key: 'issuerName', header: 'Issuer', render: r => <span className="text-[var(--ink)]">{r.issuerName}{r.directed && <StatusPip state="tminus" label="TO YOU" className="ml-2" />}</span> },
    {
      key: 'resourceName', header: 'Resource',
      render: r => <span className="inline-flex items-center gap-1.5"><GameIcon name={resourceCategoryIcon(RESOURCE_MAP.get(r.resourceSlug as never)?.category || 'generic')} size={12} /> {r.resourceName}</span>,
    },
    { key: 'quantity', header: 'Units', numeric: true, render: r => r.quantity.toLocaleString() },
    {
      key: 'pricePerUnit', header: 'Price', numeric: true,
      render: r => <span>{formatMoney(r.pricePerUnit)} <span className="text-[var(--ink-3)]">({r.spotDeltaPct >= 0 ? '+' : ''}{r.spotDeltaPct}% vs spot)</span></span>,
    },
    { key: 'totalValue', header: 'Value', numeric: true, render: r => formatMoney(r.totalValue) },
    { key: 'penaltyPct', header: 'Bond', numeric: true, render: r => <span title={`${r.penaltyPct}% penalty`}>{formatMoney(r.bond)}</span> },
    { key: 'deadlineAt', header: 'Deadline', render: r => <span className="text-[var(--ink-3)]">{r.left}</span> },
    {
      key: 'actions', header: '', sortable: false, align: 'right',
      render: r => (
        <button
          type="button"
          className={BTN_GHOST}
          disabled={busyId !== null}
          aria-label={`Accept ${r.issuerName}'s contract for ${r.quantity} ${r.resourceName}`}
          onClick={() => run(r.id, '/api/space-tycoon/corp-contracts/accept', { contractId: r.id }, d => `Signed — ${formatMoney(Number(d.collateralPosted) || 0)} bond posted.`)}
        >
          Accept
        </button>
      ),
    },
  ];

  // ── My contracts table ────────────────────────────────────────────────
  type MineRow = ContractView & { partner: string; pct: number; next: string; held: number };
  const mineRows: MineRow[] = useMemo(() => mine.map(c => ({
    ...c,
    partner: c.role === 'issuer' ? (c.counterpartyName ?? (c.directed ? 'offered' : 'open market')) : c.issuerName,
    pct: c.quantity > 0 ? Math.round((c.deliveredQty / c.quantity) * 100) : 0,
    next: c.nextMilestone && LIVE.has(c.status) ? `${c.nextMilestone.pct}% · ${daysLeft(c.nextMilestone.dueAt, nowMs)}` : LIVE.has(c.status) ? '' : '—',
    held: state.resources[c.resourceSlug] || 0,
  })), [mine, nowMs, state.resources]);

  const mineColumns: DataTableColumn<MineRow>[] = [
    { key: 'role', header: 'Role', render: r => <StatusPip state={r.role === 'issuer' ? 'go' : 'tminus'} label={r.role === 'issuer' ? 'BUYING' : 'SUPPLYING'} /> },
    { key: 'partner', header: 'Counterparty', render: r => <span className="text-[var(--ink)]">{r.partner}</span> },
    { key: 'resourceName', header: 'Resource' },
    {
      key: 'pct', header: 'Delivered', numeric: true,
      render: r => (
        <span className="inline-flex flex-col items-end gap-1 min-w-[84px]">
          <span className="font-mono tabular-nums">{r.deliveredQty.toLocaleString()}/{r.quantity.toLocaleString()}</span>
          <span className="h-1 w-full rounded-full overflow-hidden bg-[var(--line)]" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Delivery progress">
            <span className="block h-full rounded-full motion-safe:transition-all" style={{ width: `${r.pct}%`, background: 'var(--go)' }} />
          </span>
        </span>
      ),
    },
    { key: 'totalValue', header: 'Value', numeric: true, render: r => formatMoney(r.totalValue) },
    { key: 'next', header: 'Next milestone', sortable: false, render: r => <span className="text-[var(--ink-3)]">{r.next || '—'}</span> },
    { key: 'status', header: 'Status', render: r => { const p = statusPip(r.status); return <StatusPip state={p.state} label={p.label} />; } },
    {
      key: 'actions', header: '', sortable: false, align: 'right',
      render: r => {
        const live = LIVE.has(r.status);
        const remaining = r.quantity - r.deliveredQty;
        const defaultQty = Math.max(1, Math.min(remaining, r.held));
        const qty = deliverQty[r.id] ?? defaultQty;
        return (
          <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
            {live && r.role === 'counterparty' && (
              <>
                <input
                  type="number"
                  min={1}
                  max={remaining}
                  value={qty}
                  aria-label={`Units of ${r.resourceName} to deliver`}
                  onChange={e => setDeliverQty(prev => ({ ...prev, [r.id]: Math.max(1, Math.min(remaining, parseInt(e.target.value) || 1)) }))}
                  className="w-24 min-h-[36px] px-2 rounded bg-[var(--elev)] text-[var(--ink)] text-[12px] text-right border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--signal)]"
                />
                <button
                  type="button"
                  className={BTN_GHOST}
                  disabled={busyId !== null || r.held <= 0}
                  title={r.held <= 0 ? `You hold no ${r.resourceName}` : undefined}
                  onClick={() => run(r.id, '/api/space-tycoon/corp-contracts/deliver', { contractId: r.id, quantity: qty }, d => d.fulfilled ? 'Delivered in full — contract fulfilled, bond returned, +1 reputation.' : `Delivered ${Number(d.delivered).toLocaleString()} units${Number(d.released) > 0 ? `; ${formatMoney(Number(d.released))} released` : ''}.`)}
                >
                  Deliver
                </button>
              </>
            )}
            {r.status === 'open' && r.role === 'issuer' && (
              <button type="button" className={`${BTN_GHOST} !text-[var(--crit)]`} disabled={busyId !== null}
                onClick={() => run(r.id, '/api/space-tycoon/corp-contracts/cancel', { contractId: r.id }, d => `Withdrawn — ${formatMoney(Number(d.refunded) || 0)} refunded.`)}>
                Withdraw
              </button>
            )}
            {live && (
              <>
                <button type="button" className={BTN_GHOST} disabled={busyId !== null}
                  title="Mutual cancellation: both parties must request it"
                  onClick={() => run(r.id, '/api/space-tycoon/corp-contracts/cancel', { contractId: r.id }, d => d.cancelRequested ? `Cancellation requested — waiting on the ${String(d.awaiting)}.` : 'Cancelled by mutual consent; no penalty.')}>
                  {r.cancelRequestedBy ? 'Confirm cancel' : 'Request cancel'}
                </button>
                <button type="button" className={`${BTN_GHOST} !text-[var(--caution)]`} disabled={busyId !== null}
                  title={`Arbitration fee ${formatMoney(Math.round(r.totalValue * CORP_CONTRACT_DISPUTE_FEE_FRACTION))} (burned)`}
                  onClick={() => run(r.id, '/api/space-tycoon/corp-contracts/dispute', { contractId: r.id }, d => `${String(d.arbitratedBy)} ruled. Fee ${formatMoney(Number(d.feeBurned) || 0)} burned.`)}>
                  Dispute
                </button>
              </>
            )}
          </span>
        );
      },
    },
  ];

  const rulings = mine.filter(c => c.ruling);

  // ── Pacts ─────────────────────────────────────────────────────────────
  const proposePact = () => run('pact-propose', '/api/space-tycoon/corp-pacts', {
    action: 'propose', kind: pactKind, counterpartyCompanyName: pactCompany.trim(), durationDays: pactDays,
  }, d => `${CORP_PACT_DEFS[pactKind as keyof typeof CORP_PACT_DEFS]?.label ?? 'Pact'} proposed to ${String(d.counterparty)}.`);

  type PactRow = PactView & { ends: string };
  const pactRows: PactRow[] = useMemo(() => [
    ...(pacts?.active ?? []),
    ...(pacts?.proposedByMe ?? []),
    ...(pacts?.history ?? []).slice(0, 10),
  ].map(p => ({ ...p, ends: p.endsAt ? daysLeft(p.endsAt, nowMs) : '—' })), [pacts, nowMs]);

  const pactColumns: DataTableColumn<PactRow>[] = [
    { key: 'kindLabel', header: 'Pact', render: r => <span className="text-[var(--ink)]">{r.kindLabel}</span> },
    { key: 'partnerName', header: 'With' },
    { key: 'status', header: 'Status', render: r => { const p = pactPip(r.status); return <StatusPip state={p.state} label={r.status === 'broken' && r.brokenBy ? `BROKEN · ${r.brokenBy.toUpperCase().slice(0, 12)}` : p.label} />; } },
    { key: 'ends', header: 'Ends', render: r => <span className="text-[var(--ink-3)]">{r.ends}</span> },
    {
      key: 'actions', header: '', sortable: false, align: 'right',
      render: r => r.status === 'active' ? (
        <button type="button" className={`${BTN_GHOST} !text-[var(--crit)]`} disabled={busyId !== null}
          title={`${CORP_PACT_BREAK_REP} reputation, announced publicly`}
          onClick={() => run(r.id, '/api/space-tycoon/corp-pacts', { action: 'break', pactId: r.id }, () => `Pact broken — ${CORP_PACT_BREAK_REP} reputation, on the public timeline.`)}>
          Break pact
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-3">
      <Console
        title="Corp Contracts"
        actions={inFrontier ? <StatusPip state="go" label="FRONTIER · NO BOND" /> : undefined}
        status={loading ? 'delayed' : 'live'}
        asOf={new Date()}
      >
        <p className="font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-2)] mb-3">
          Binding supply contracts between corporations. The buyer escrows the full price; the supplier posts a bond and delivers on a milestone
          schedule from server-verified inventory. Miss the deadline and the bond pays the buyer. Either side can take a live contract to a faction
          arbitration bureau (2% fee, burned) for an immediate, deterministic ruling. Every signing, fulfilment, default and ruling is public.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Telemetry label="Open market" value={openRows.length} unit="offers" tone="ink" />
          <Telemetry label="My live contracts" value={liveMine.length} tone="signal" />
          <Telemetry label="Escrow locked" value={formatMoney(escrowLocked)} tone="ink" />
          <Telemetry label="Bond posted" value={formatMoney(bondPosted)} tone="ink" />
          <Telemetry label="Active pacts" value={pacts?.active.length ?? 0} tone="signal" sub={pacts?.proposedToMe.length ? `${pacts.proposedToMe.length} awaiting your reply` : undefined} />
        </div>
        {notice && (
          <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: notice.tone === 'ok' ? 'var(--go)' : 'var(--crit)' }}>
            <StatusPip state={notice.tone === 'ok' ? 'go' : 'scrub'} label={notice.tone === 'ok' ? 'OK' : 'REFUSED'} /> {notice.text}
          </p>
        )}
      </Console>

      <Console title="Issue a supply contract" actions={<StatusPip state="hold" label={`BAND ${CORP_CONTRACT_PRICE_BAND.min}×–${CORP_CONTRACT_PRICE_BAND.max}× SPOT`} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label htmlFor="cc-resource" className={LABEL}>Resource</label>
            <select id="cc-resource" value={resource} onChange={e => setResource(e.target.value)} className={FIELD}>
              {RESOURCES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cc-qty" className={LABEL}>Units</label>
            <input id="cc-qty" type="number" min={1} max={100_000} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(100_000, parseInt(e.target.value) || 1)))} className={FIELD} />
          </div>
          <div>
            <label htmlFor="cc-price" className={LABEL}>Price / unit</label>
            <input id="cc-price" type="number" min={band.min} max={band.max} value={price} onChange={e => setPrice(Math.max(0, parseFloat(e.target.value) || 0))} className={FIELD} aria-describedby="cc-band" />
            <p id="cc-band" className="mt-1 text-[11px] text-[var(--ink-3)] font-mono">spot {formatMoney(spot)} · {formatMoney(band.min)}–{formatMoney(band.max)}</p>
          </div>
          <div>
            <label htmlFor="cc-deadline" className={LABEL}>Deadline (days)</label>
            <input id="cc-deadline" type="number" min={CORP_CONTRACT_DEADLINE_DAYS.min} max={CORP_CONTRACT_DEADLINE_DAYS.max} value={deadlineDays} onChange={e => setDeadlineDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))} className={FIELD} />
          </div>
          <div>
            <label htmlFor="cc-milestones" className={LABEL}>Milestones</label>
            <select id="cc-milestones" value={milestoneCount} onChange={e => setMilestoneCount(parseInt(e.target.value) || 1)} className={FIELD}>
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cc-penalty" className={LABEL}>Penalty %</label>
            <input id="cc-penalty" type="number" min={CORP_CONTRACT_PENALTY_PCT.min} max={CORP_CONTRACT_PENALTY_PCT.max} value={penaltyPct} onChange={e => setPenaltyPct(Math.max(0, Math.min(25, parseInt(e.target.value) || 0)))} className={FIELD} />
          </div>
          <div>
            <label htmlFor="cc-direct" className={LABEL}>Offer only to (optional)</label>
            <input id="cc-direct" type="text" maxLength={200} value={directTo} onChange={e => setDirectTo(e.target.value)} placeholder="Company name" className={FIELD} />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label htmlFor="cc-note" className={LABEL}>Public note (≤200 chars)</label>
            <input id="cc-note" type="text" maxLength={200} value={note} onChange={e => setNote(e.target.value)} className={FIELD} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Telemetry label="Escrow now" value={formatMoney(totalValue)} tone="ember" />
          <Telemetry label="Supplier bond" value={formatMoney(computeCollateral(totalValue, penaltyPct, false))} tone="ink" sub="waived for Frontier corps" />
          <Telemetry label="Your cash" value={formatMoney(state.money)} tone="ink" />
          <button type="button" className={BTN} disabled={busyId !== null || !band.valid || state.money < totalValue} onClick={createContract}
            aria-label={`Issue contract for ${quantity} ${RESOURCE_MAP.get(resource as never)?.name ?? resource}, escrowing ${formatMoney(totalValue)}`}>
            {busyId === 'create' ? 'Issuing…' : 'Issue & escrow'}
          </button>
          {!band.valid && <span className="text-[11px] text-[var(--crit)]">Price is outside the spot band.</span>}
          {state.money < totalValue && <span className="text-[11px] text-[var(--crit)]">Insufficient cash to escrow.</span>}
        </div>
      </Console>

      <Console title="Open market" padded={false} actions={<span className="font-mono text-[11px] text-[var(--ink-3)]">{openRows.length} open</span>}>
        <DataTable
          caption="Open supply contracts you can accept"
          columns={openColumns}
          rows={openRows}
          initialSort={{ key: 'totalValue', dir: 'desc' }}
          emptyLabel={loading ? 'Loading…' : 'No open contracts from other corporations right now. Issue one above.'}
        />
      </Console>

      <Console title="My contracts" padded={false}>
        <DataTable
          caption="Contracts I issued or accepted"
          columns={mineColumns}
          rows={mineRows}
          filterable={mineRows.length > 8}
          emptyLabel={loading ? 'Loading…' : 'No contracts yet.'}
        />
      </Console>

      {rulings.length > 0 && (
        <Console title="Arbitration rulings">
          <ul className="space-y-2">
            {rulings.slice(0, 6).map(c => (
              <li key={c.id} className="text-[12px] leading-[1.55] text-[var(--ink-2)]">
                <span className="font-mono text-[11px] text-[var(--ink-3)] mr-2">{c.arbitratedBy}</span>{c.ruling}
              </li>
            ))}
          </ul>
        </Console>
      )}

      <Console title="Pacts" actions={<StatusPip state={pacts?.proposedToMe.length ? 'live' : 'hold'} label={`${pacts?.proposedToMe.length ?? 0} INBOX`} />}>
        <p className="font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-2)] mb-3">
          Time-boxed promises between two corporations, enforced by the server at the offense routes and listed on the public timeline.
          Breaking one costs {CORP_PACT_BREAK_REP} reputation, in the open.
        </p>
        {pacts && pacts.proposedToMe.length > 0 && (
          <ul className="mb-3 space-y-2" aria-label="Pact proposals awaiting your reply">
            {pacts.proposedToMe.map(p => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--elev)] px-3 py-2">
                <span className="text-[13px] text-[var(--ink)]">
                  <GameIcon name="scroll" size={12} className="inline mr-1.5" />{p.proposerName} proposes a <strong>{p.kindLabel}</strong> · {p.durationDays} days
                  <span className="block text-[11px] text-[var(--ink-3)]">{CORP_PACT_DEFS[p.kind as keyof typeof CORP_PACT_DEFS]?.description}</span>
                </span>
                <span className="inline-flex gap-1.5">
                  <button type="button" className={BTN_GHOST} disabled={busyId !== null} onClick={() => run(p.id, '/api/space-tycoon/corp-pacts', { action: 'accept', pactId: p.id }, () => `${p.kindLabel} with ${p.proposerName} signed.`)}>Sign</button>
                  <button type="button" className={`${BTN_GHOST} !text-[var(--crit)]`} disabled={busyId !== null} onClick={() => run(p.id, '/api/space-tycoon/corp-pacts', { action: 'decline', pactId: p.id }, () => 'Proposal declined.')}>Decline</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="col-span-2">
            <label htmlFor="pact-company" className={LABEL}>Propose to (company name)</label>
            <input id="pact-company" type="text" maxLength={200} value={pactCompany} onChange={e => setPactCompany(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label htmlFor="pact-kind" className={LABEL}>Kind</label>
            <select id="pact-kind" value={pactKind} onChange={e => setPactKind(e.target.value)} className={FIELD}>
              {CORP_PACT_KINDS.map(k => <option key={k} value={k}>{CORP_PACT_DEFS[k].label}{CORP_PACT_DEFS[k].enforced ? '' : ' (registered only)'}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pact-days" className={LABEL}>Days (7–90)</label>
            <input id="pact-days" type="number" min={CORP_PACT_DURATION_DAYS.min} max={CORP_PACT_DURATION_DAYS.max} value={pactDays} onChange={e => setPactDays(Math.max(7, Math.min(90, parseInt(e.target.value) || 7)))} className={FIELD} />
          </div>
        </div>
        <p className="text-[11px] text-[var(--ink-3)] mb-3">{CORP_PACT_DEFS[pactKind as keyof typeof CORP_PACT_DEFS]?.description}</p>
        <button type="button" className={BTN} disabled={busyId !== null || pactCompany.trim().length === 0} onClick={proposePact}>
          {busyId === 'pact-propose' ? 'Proposing…' : 'Propose pact'}
        </button>
        <div className="mt-3 -mx-4 -mb-4">
          <DataTable
            caption="My pacts"
            columns={pactColumns}
            rows={pactRows}
            emptyLabel={loading ? 'Loading…' : 'No pacts yet.'}
          />
        </div>
      </Console>
    </div>
  );
}
