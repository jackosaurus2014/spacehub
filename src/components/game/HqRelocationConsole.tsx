'use client';

// ─── Headquarters — the Relocate console (CC-2) ──────────────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2-3, §8. Docks on the Bridge
// (DashboardPanel) as one Console: the ladder with requirements met / unmet,
// seat availability and posted price per stage, the relocation cost and
// time, a two-step confirm, the project in flight with its countdown, and
// "Move back to Earth". Reachable from the Command hub's "Headquarters"
// entry (hubs.ts → sub-view 'dashboard:hq' scrolls here and focuses it).
//
// CC-4: the interstellar rung's gate is real — a COMPLETED interstellar
// expedition (a server-recorded one) alongside the colony charter — so the
// row renders it like any other gate, and every row now carries the
// `windowPreview` sentence from headquarters.ts: what the player will
// actually be looking at once they arrive. That matters most at the far end
// of the ladder, where the plates are still rendering and the Bridge falls
// back to the Earth window; the console says what is coming instead of
// leaving a stand-in unexplained.
//
// CC-3: the ladder now runs to the interstellar rung. Mars and outward sell
// their seats at a sealed-bid AUCTION, so those rows show the reserve, the
// minimum qualifying bid, a countdown and a Bid control instead of a
// Relocate button — a corporation must WIN a seat before it can file the
// charter. The seated stage's rent is charged server-side now, so the
// console carries its real state (paid through, months missed, grace left).
//
// Data: GET /api/space-tycoon/hq (server facts — persisted tier + station
// registry, research and hull gates, live seat pools, open auctions, upkeep);
// the client ladder (hq-relocation.ts buildHqLadder) stands in while signed
// out or offline. POST
// /api/space-tycoon/hq/relocate starts the project; on a 2xx the client
// debits the cost locally (ledger-reconcile.ts CLIENT_APPLIED contract) and
// adopts the returned headquarters block. Anonymous play starts a LOCAL
// project at the empty-pool seat price (no seat index — seats are a server
// fact).
//
// Accessibility: every action is a real <button>; the confirm step is a
// labelled group whose primary button takes focus and Escape cancels; the
// ladder is a DataTable (caption, sortable headers); state is never colour
// alone (StatusPip glyph + word).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  HQ_SEAT_COUNTS, HQ_UPKEEP_MONTHLY, getHeadquarters, getHqBonuses, getHqStage, hqSeatIsAuctioned,
  hqSeatLabel, isHqStageId, type HqBonuses, type HqStageId,
} from '@/lib/game/headquarters';
import {
  buildHqLadder, checkHqRelocationRequest, hqProjectProgress, hqRequirementLines, hqRequirementViewFromState,
  postedSeatPrice, startHqProject, type HqRelocationQuote, type HqRequirementCheck, type ServerHeadquartersBlock,
} from '@/lib/game/hq-relocation';
import { resolveHqManifest } from '@/lib/game/hq-manifest';
import { hqMinimumBid } from '@/lib/game/hq-seat-auctions';
import { getTierDef } from '@/lib/game/corporation-tiers';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';
import { consumeSubViewRequest, onSubViewRequest, subViewName, subViewTab } from '@/lib/game/sub-view';
import { toast } from '@/lib/toast';
import Console from '@/components/ui/Console';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusPip from '@/components/ui/StatusPip';
import HoloTip from '@/components/game/HoloTip';
import GameIcon from '@/components/game/GameIcon';

interface SeatPool { total: number; occupied: number; free: number; postedPrice: number; lastClearingPrice: number }

/** One open sealed-bid seat auction (CC-3). Rivals' bids are sealed — only
 *  `myBid` and the `minimumBid` a new bid must clear are ever published. */
interface AuctionRow {
  id: string; stage: HqStageId; seatIndex: number | null; reserve: number;
  bidCount: number; minimumBid: number; closesAtMs: number; myBid: number | null;
}

interface UpkeepView {
  stage: HqStageId; seatIndex: number | null; monthly: number; monthsDue: number; amountDue: number;
  paidThroughMs: number; missedMonths: number; graceMonths: number; graceRemaining: number; lapsed: boolean;
}

interface LadderApiRow {
  id: HqStageId; label: string; shortLabel: string; tier: number; comingSoon: boolean; current: boolean;
  check: HqRequirementCheck; quote: HqRelocationQuote | null; seats: SeatPool; auctioned: boolean;
  auctions: AuctionRow[]; upkeepMonthly: number; bonuses: HqBonuses;
}

interface HqApiResponse {
  success?: boolean; headquarters?: ServerHeadquartersBlock | null; ladder?: LadderApiRow[];
  upkeep?: UpkeepView | null; money?: number;
}

/** The non-neutral terms of a bonus profile, as short chips. */
export function describeHqBonuses(b: HqBonuses): string[] {
  const pct = (m: number) => `${m >= 1 ? '+' : '−'}${Math.round(Math.abs(m - 1) * 100)}%`;
  const out: string[] = [];
  if (b.hiringCostMult !== 1) out.push(`Hiring cost ${pct(b.hiringCostMult)}`);
  if (b.contractPayoutMult !== 1) out.push(`Contract payout ${pct(b.contractPayoutMult)}`);
  if (b.launchRevenueMult !== 1) out.push(`Launch-service revenue ${pct(b.launchRevenueMult)}`);
  if (b.satelliteOpsCostMult !== 1) out.push(`Satellite ops cost ${pct(b.satelliteOpsCostMult)}`);
  if (b.miningFuelMult !== 1) out.push(`Mining fuel per leg ${pct(b.miningFuelMult)}`);
  if (b.beltDeltaVMult !== 1) out.push(`Belt Δv surcharge ${pct(b.beltDeltaVMult)}`);
  if (b.colonyThroughputMult !== 1) out.push(`Colony-surface revenue ${pct(b.colonyThroughputMult)}`);
  if (b.marsOpsMult !== 1) out.push(`Mars-orbit revenue ${pct(b.marsOpsMult)}`);
  if (b.outerExtractionMult !== 1) out.push(`Outer-system extraction ${pct(b.outerExtractionMult)}`);
  if (b.scienceMult !== 1) out.push(`Science & sensing revenue ${pct(b.scienceMult)}`);
  if (b.expeditionReturnMult !== 1) out.push(`Expedition survey data ${pct(b.expeditionReturnMult)}`);
  return out;
}

interface Row {
  id: HqStageId;
  stage: string;
  tier: number;
  comingSoon: boolean;
  current: boolean;
  inbound: boolean;
  check: HqRequirementCheck;
  quote: HqRelocationQuote | null;
  seats: SeatPool | null;
  auctioned: boolean;
  auctions: AuctionRow[];
  upkeep: number;
  bonuses: string[];
  /** CC-4: what the window shows at this seat (headquarters.ts), and
   *  whether its plates are still rendering — the Bridge stands the Earth
   *  window in until they land, and the player deserves to know that is
   *  what they are looking at. */
  windowPreview: string;
  platesPending: boolean;
  /** Sort keys for the numeric columns. */
  seatFree: number;
  cost: number;
}

export interface HqRelocationConsoleProps {
  state: GameState;
  /** Adopt a server headquarters block (page.tsx → adoptServerHeadquarters). */
  onHeadquartersUpdate?: (block: ServerHeadquartersBlock) => void;
  /** Anonymous / offline play: apply a locally-started project + its debit. */
  onLocalRelocation?: (next: GameState['headquarters'], debit: number) => void;
  /** Test seam for the clock. */
  now?: () => number;
}

export default function HqRelocationConsole({ state, onHeadquartersUpdate, onLocalRelocation, now = Date.now }: HqRelocationConsoleProps) {
  const hq = getHeadquarters(state);
  const currentStage = getHqStage(hq.stage as HqStageId);
  const [api, setApi] = useState<HqApiResponse | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingStage, setPendingStage] = useState<HqStageId | null>(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/hq', { method: 'GET', headers: { Accept: 'application/json' } });
      if (res.status === 401) { setSignedOut(true); setApi(null); return; }
      const data = await res.json().catch(() => null) as HqApiResponse | null;
      if (res.ok && data && Array.isArray(data.ladder)) {
        setSignedOut(false);
        setApi(data);
        if (data.headquarters && onHeadquartersUpdate) onHeadquartersUpdate(data.headquarters);
      } else if (res.status === 404) {
        setSignedOut(true); setApi(null);
      }
    } catch { /* offline — the client ladder stands in */ }
    finally { setLoading(false); }
  }, [onHeadquartersUpdate]);

  useEffect(() => { void refresh(); }, [refresh, hq.stage, hq.project?.completesAtMs]);

  // Countdown re-render while a project runs (once a minute is plenty).
  useEffect(() => {
    if (!hq.project) return;
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [hq.project]);

  // Hub sub-view 'dashboard:hq' → scroll here and focus the console.
  useEffect(() => {
    const focusHere = () => {
      const el = rootRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.focus({ preventScroll: true });
    };
    if (consumeSubViewRequest('dashboard') === 'hq') focusHere();
    return onSubViewRequest(token => {
      if (subViewTab(token) === 'dashboard' && subViewName(token) === 'hq' && consumeSubViewRequest('dashboard') === 'hq') focusHere();
    });
  }, []);

  useEffect(() => { if (pendingStage) confirmRef.current?.focus(); }, [pendingStage]);

  const nowMs = now();
  const rows: Row[] = useMemo(() => {
    const clientLadder = buildHqLadder(state);
    return clientLadder.map(row => {
      const server = api?.ladder?.find(r => r.id === row.stage.id);
      const check = server?.check ?? row.check;
      const quote = server?.quote ?? row.quote;
      const seats = server?.seats ?? (HQ_SEAT_COUNTS[row.stage.id] > 0
        ? { total: HQ_SEAT_COUNTS[row.stage.id], occupied: 0, free: HQ_SEAT_COUNTS[row.stage.id], postedPrice: postedSeatPrice(row.stage.id, 0), lastClearingPrice: 0 }
        : null);
      const auctioned = server?.auctioned ?? hqSeatIsAuctioned(row.stage.id);
      return {
        id: row.stage.id,
        stage: row.stage.label,
        tier: row.stage.tier,
        comingSoon: !!row.stage.comingSoon,
        current: row.current,
        inbound: row.inbound,
        check,
        quote,
        seats,
        auctioned,
        auctions: server?.auctions ?? [],
        upkeep: HQ_UPKEEP_MONTHLY[row.stage.id],
        bonuses: describeHqBonuses(getHqBonuses(row.stage.id)),
        windowPreview: row.stage.windowPreview,
        platesPending: resolveHqManifest(row.stage.id)?.fallback ?? true,
        seatFree: seats ? seats.free : Number.POSITIVE_INFINITY,
        // An auctioned seat is never bought at the posted price — the row's
        // "Move" figure is the project alone, with the reserve shown beside
        // the seat count instead.
        cost: quote ? quote.cost + (seats && !auctioned && !server?.current ? seats.postedPrice : 0) : 0,
      };
    });
  }, [state, api]);

  const pendingRow = pendingStage ? rows.find(r => r.id === pendingStage) ?? null : null;
  const pendingSeatPrice = pendingRow?.seats && !heldSeatAt(state, pendingRow.id) ? pendingRow.seats.postedPrice : 0;
  const pendingTotal = pendingRow?.quote ? pendingRow.quote.cost + pendingSeatPrice : 0;

  /**
   * Open an auction (when none is running at that stage) or raise a bid on
   * the one that is. Money is escrowed server-side and refunded in full if
   * the bid loses; the client applies the escrow locally on the 2xx, the
   * CLIENT_APPLIED contract the relocation charter already uses.
   */
  const placeBid = async (row: Row) => {
    if (busy) return;
    const live = row.auctions[0] ?? null;
    const floor = live ? live.minimumBid : hqMinimumBid(row.seats?.postedPrice ?? 0, 0);
    const raw = typeof window !== 'undefined'
      ? window.prompt(`Sealed bid for a ${row.stage} seat — minimum ${formatMoney(floor)}.`, String(floor))
      : null;
    if (raw === null) return;
    const amount = Math.round(Number(raw.replace(/[^0-9.]/g, '')));
    if (!Number.isFinite(amount) || amount < floor) {
      toast.warning(`Bids must clear ${formatMoney(floor)}.`, 'Seat auction');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/space-tycoon/hq/seat-auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(live ? { action: 'bid', auctionId: live.id, amount } : { action: 'open', stage: row.id, amount }),
      });
      const data = await res.json().catch(() => null) as (Record<string, unknown> & { error?: string; escrowed?: number }) | null;
      if (!res.ok || !data) {
        toast.warning(typeof data?.error === 'string' ? data.error : `The registry refused the bid (HTTP ${res.status}).`, 'Seat auction');
        return;
      }
      if (typeof data.escrowed === 'number' && data.escrowed > 0) onLocalRelocation?.(undefined, data.escrowed);
      toast.success(live
        ? `Bid raised to ${formatMoney(amount)} — escrowed until the auction resolves.`
        : `Auction opened for a ${row.stage} seat at ${formatMoney(amount)}.`, 'Seat auction');
      void refresh();
    } catch {
      toast.warning('The seat registry is unreachable.', 'Seat auction');
    } finally {
      setBusy(false);
    }
  };

  const beginRelocate = (stageId: HqStageId) => {
    const check = checkHqRelocationRequest(hq, hqRequirementViewFromState(state), stageId);
    if (!check.ok) { toast.warning(check.message, 'Headquarters'); return; }
    setPendingStage(stageId);
  };

  const confirmRelocate = async () => {
    if (!pendingRow || !pendingRow.quote || busy) return;
    const toStage = pendingRow.id;
    setBusy(true);
    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/space-tycoon/hq/relocate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStage }),
        });
      } catch { res = null; }
      if (res && (res.status === 401 || res.status === 404)) res = null; // anonymous / no profile → local
      if (res) {
        const data = await res.json().catch(() => null) as (Record<string, unknown> & { error?: string; code?: string; headquarters?: ServerHeadquartersBlock; cost?: number; seatPrice?: number }) | null;
        if (!res.ok || !data) {
          toast.warning(typeof data?.error === 'string' ? data.error : `The registry refused the relocation (HTTP ${res.status}).`, 'Headquarters');
          return;
        }
        const debit = (typeof data.cost === 'number' ? data.cost : 0) + (typeof data.seatPrice === 'number' ? data.seatPrice : 0);
        if (data.headquarters) {
          // CLIENT_APPLIED contract: debit locally on the 2xx, adopt the block.
          onLocalRelocation?.(undefined, debit);
          onHeadquartersUpdate?.(data.headquarters);
        }
        toast.success(`Relocation to the ${getHqStage(toStage).label} is under way — ${pendingRow.quote.months} game-months.`, 'Headquarters');
        setPendingStage(null);
        void refresh();
        return;
      }
      // Local (anonymous) project.
      const debit = pendingRow.quote.cost + (HQ_SEAT_COUNTS[toStage] > 0 ? postedSeatPrice(toStage, 0) : 0);
      if (state.money < debit) { toast.warning(`Relocation costs ${formatMoney(debit)} — not enough cash.`, 'Headquarters'); return; }
      onLocalRelocation?.(startHqProject(hq, toStage, nowMs), debit);
      toast.success(`Relocation to the ${getHqStage(toStage).label} is under way — ${pendingRow.quote.months} game-months.`, 'Headquarters');
      setPendingStage(null);
    } finally {
      setBusy(false);
    }
  };

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'stage', header: 'Stage', sortable: false,
      render: r => (
        <span className="inline-flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5">
            {r.current && <StatusPip state="live" label="HERE" />}
            {r.inbound && <StatusPip state="tminus" label="INBOUND" />}
            <span className={r.current ? 'text-cyan-200' : ''}>{r.stage}</span>
          </span>
          <span className="text-[10px] text-[var(--ink-3)]">Tier {r.tier} {getTierDef(r.tier).name}{r.comingSoon ? ' · coming soon' : ''}</span>
          <HoloTip
            content={{
              title: `${r.stage} — the window`,
              icon: 'dashboard',
              body: (
                <span>
                  {r.windowPreview}
                  {r.platesPending ? ' The plates for this stage are still being rendered; until they land the Bridge stands the Earth window in and says so.' : ''}
                </span>
              ),
              source: 'headquarters.ts windowPreview · design §1',
            }}
          >
            <span className="text-[10px]">The window</span>
          </HoloTip>
        </span>
      ),
    },
    {
      key: 'req', header: 'Requirements', sortable: false,
      render: r => r.comingSoon ? <span className="text-[var(--ink-3)]">Later update</span> : (
        <span className="inline-flex flex-col gap-0.5 text-[11px]">
          {hqRequirementLines(r.check).map(line => (
            <span key={line.label} className="inline-flex items-center gap-1">
              <StatusPip state={line.met ? 'go' : 'hold'} label={line.met ? 'MET' : 'UNMET'} /> {line.label}
            </span>
          ))}
          {r.check.seatNeeded && (
            <span className="inline-flex items-center gap-1">
              <StatusPip state={r.seats && r.seats.free > 0 ? 'go' : 'scrub'} label={r.seats && r.seats.free > 0 ? 'OPEN' : 'FULL'} />
              {r.auctioned ? 'a seat (at auction)' : 'a seat'}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'seatFree', header: 'Seats', numeric: true,
      render: r => {
        if (!r.seats) return <span className="text-[var(--ink-3)]">unlimited</span>;
        const live = r.auctions[0] ?? null;
        return (
          <span className="inline-flex flex-col items-end gap-0.5">
            <span>{r.seats.free}/{r.seats.total} free</span>
            <span className="text-[10px] text-[var(--ink-3)]">
              {r.auctioned ? `reserve ${formatMoney(r.seats.postedPrice)}` : formatMoney(r.seats.postedPrice)}
            </span>
            {live && (
              <span className="text-[10px] text-amber-200">
                auction · min {formatMoney(live.minimumBid)} · {formatCountdown(Math.max(0, (live.closesAtMs - nowMs) / 1000))}
                {live.myBid !== null ? ` · yours ${formatMoney(live.myBid)}` : ''}
              </span>
            )}
            {!live && r.seats.lastClearingPrice > 0 && (
              <span className="text-[10px] text-[var(--ink-3)]">last cleared {formatMoney(r.seats.lastClearingPrice)}</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'cost', header: 'Move', numeric: true,
      render: r => r.quote ? <span>{formatMoney(r.quote.cost)} · {r.quote.months} mo{r.quote.isReturn ? ' · return' : ''}</span> : <span className="text-[var(--ink-3)]">—</span>,
    },
    {
      key: 'bonuses', header: 'Seat bonus', sortable: false,
      render: r => (
        <span className="inline-flex flex-col gap-0.5 text-[11px]">
          {r.bonuses.map(b => <span key={b}>{b}</span>)}
          {r.upkeep > 0 && <span className="text-[var(--ink-3)]">Upkeep {formatMoney(r.upkeep)}/mo</span>}
        </span>
      ),
    },
    {
      key: 'action', header: 'Action', sortable: false, align: 'right',
      render: r => {
        if (r.current) return <span className="text-[var(--ink-3)]">Seated</span>;
        if (r.inbound) return <span className="text-amber-200">{formatCountdown(hqProjectProgress(hq.project!, nowMs).etaSeconds)}</span>;
        if (r.comingSoon) return <span className="text-[var(--ink-3)]">—</span>;
        // CC-3: at an auction stage the seat must be WON first. Until this
        // corporation holds one, the row's action is Bid, not Relocate.
        if (r.auctioned && !heldSeatAt(state, r.id)) {
          const live = r.auctions[0] ?? null;
          const canBid = r.check.met && (live !== null || (!!r.seats && r.seats.free > 0));
          return (
            <button
              type="button"
              onClick={() => void placeBid(r)}
              disabled={!canBid || busy}
              title={!r.check.met ? 'Requirements unmet' : live ? 'Raise your sealed bid' : 'Open an auction for the next vacant seat'}
              aria-label={live ? `Raise your sealed bid for a ${r.stage} seat` : `Open an auction for a ${r.stage} seat`}
              className="rounded border border-amber-400/30 bg-amber-500/10 px-2 py-1 font-hud text-[11px] uppercase tracking-wide text-amber-200 hover:bg-amber-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {live ? (live.myBid !== null ? 'Raise bid' : 'Bid') : 'Open auction'}
            </button>
          );
        }
        const blocked = !!hq.project || !r.check.met || (r.check.seatNeeded && !!r.seats && r.seats.free <= 0 && !heldSeatAt(state, r.id));
        const why = hq.project ? 'A relocation is already under way' : !r.check.met ? 'Requirements unmet' : 'No seat free';
        return (
          <button
            type="button"
            onClick={() => beginRelocate(r.id)}
            disabled={blocked || busy}
            title={blocked ? why : `Relocate the headquarters to the ${r.stage}`}
            aria-label={r.quote?.isReturn ? 'Move back to Earth' : `Relocate to the ${r.stage}`}
            className="rounded border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 font-hud text-[11px] uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {r.quote?.isReturn ? 'Move back to Earth' : 'Relocate'}
          </button>
        );
      },
    },
  ];

  const upkeep = api?.upkeep ?? null;
  const project = hq.project;
  const projectStage = project && isHqStageId(project.targetStage) ? getHqStage(project.targetStage) : null;
  const progress = project ? hqProjectProgress(project, nowMs) : null;
  const seatWord = hqSeatLabel(currentStage.id, hq.seatIndex);

  return (
    <div ref={rootRef} tabIndex={-1} id="hq-relocation-console" className="outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-[var(--radius-console)]">
      <Console
        title={<span className="inline-flex items-center gap-2"><GameIcon name="dashboard" size={13} /> Headquarters</span>}
        status={api ? 'live' : signedOut ? 'off' : loading ? 'delayed' : 'stale'}
        source={api ? 'corporate registry' : signedOut ? 'local (sign in to lease a seat)' : 'client ladder'}
        actions={<span className="font-mono text-[11px] text-cyan-300">{currentStage.label}{seatWord ? ` · ${seatWord}` : ''}</span>}
        padded={false}
      >
        {project && projectStage && progress && (
          <div className="border-b border-[var(--line)] bg-amber-500/5 px-4 py-3" role="status" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm text-amber-100">
                <StatusPip state="tminus" label="RELOCATING" /> Moving the headquarters to the <strong>{projectStage.label}</strong>
                {typeof project.seatIndex === 'number' && <span className="text-amber-200/70">({hqSeatLabel(projectStage.id, project.seatIndex)})</span>}
              </span>
              <span className="font-mono text-xs text-amber-200">{formatCountdown(progress.etaSeconds)} · {Math.round(progress.pct)}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/10" aria-hidden="true">
              <div className="h-full bg-amber-400/70" style={{ width: `${Math.round(progress.pct)}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-[var(--ink-3)]">Rivals see the move only when it completes. The window changes the moment the charter is countersigned.</p>
          </div>
        )}

        {upkeep && upkeep.monthly > 0 && (
          <div className="border-b border-[var(--line)] px-4 py-2 text-[11px]" role="status">
            <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <StatusPip state={upkeep.missedMonths > 0 ? 'hold' : 'go'} label={upkeep.missedMonths > 0 ? 'ARREARS' : 'PAID'} />
                <span className="text-[var(--ink-2)]">Seat rent {formatMoney(upkeep.monthly)}/game-month</span>
              </span>
              <span className="text-[var(--ink-3)]">paid through {new Date(upkeep.paidThroughMs).toLocaleString()}</span>
              {upkeep.missedMonths > 0 && (
                <span className="text-amber-200">
                  {upkeep.missedMonths} month{upkeep.missedMonths === 1 ? '' : 's'} unpaid · {upkeep.graceRemaining} of {upkeep.graceMonths} grace left before the seat lapses
                </span>
              )}
            </span>
          </div>
        )}

        <div className="px-4 pt-3 text-[11px] text-[var(--ink-3)]">
          One headquarters per corporation. A move costs money and a campaign-loop project (2 game-months to LEO, 4 to Luna, 6 to Mars, 8 to the outer system, 12 to deep space, 18 to another star — 1 back to Earth); off-Earth seats are finite and carry monthly rent, charged by the corporate registry. Seat bonuses are ±10–15% — "where is my business", never a free win.
          {' '}<HoloTip content={{ title: 'Seat leases and auctions', icon: 'dashboard', body: 'LEO and Luna seats lease first-come at a posted price that rises with occupancy. From Mars outward the pools are eight seats or fewer, so a vacant seat is sold at a sealed-bid auction instead: bids are escrowed, the highest at or above the reserve wins and is burned, every other bid is refunded in full, and a bid in the last ten minutes extends the close. Rent is charged monthly against the corporate wallet; two unpayable months return the seat to the pool and the headquarters to Earth.', source: 'hq-seat-auctions.ts · hq-relocation-server.ts chargeHqSeatUpkeep' }}>How seats work</HoloTip>
        </div>

        <DataTable<Row>
          caption="Headquarters ladder — stage, requirements, seats, relocation cost and seat bonuses"
          columns={columns}
          rows={rows}
          className="mt-2"
        />

        {pendingRow && pendingRow.quote && (
          <div
            role="group"
            aria-labelledby="hq-confirm-title"
            className="m-4 rounded border border-cyan-400/30 bg-cyan-500/5 p-3"
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setPendingStage(null); } }}
          >
            <h3 id="hq-confirm-title" className="font-hud text-xs uppercase tracking-[0.14em] text-cyan-200">
              Confirm relocation → {pendingRow.stage}
            </h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-4">
              <dt className="text-[var(--ink-3)]">Project</dt><dd className="font-mono">{formatMoney(pendingRow.quote.cost)}</dd>
              <dt className="text-[var(--ink-3)]">Seat</dt><dd className="font-mono">{pendingSeatPrice > 0 ? formatMoney(pendingSeatPrice) : heldSeatAt(state, pendingRow.id) ? 'held' : '—'}</dd>
              <dt className="text-[var(--ink-3)]">Total now</dt><dd className="font-mono text-cyan-100">{formatMoney(pendingTotal)}</dd>
              <dt className="text-[var(--ink-3)]">Time</dt><dd className="font-mono">{pendingRow.quote.months} game-months</dd>
              <dt className="text-[var(--ink-3)]">Upkeep</dt><dd className="font-mono">{pendingRow.upkeep > 0 ? `${formatMoney(pendingRow.upkeep)}/mo` : 'none'}</dd>
              <dt className="text-[var(--ink-3)]">You gain</dt><dd>{pendingRow.bonuses.join(' · ') || '—'}</dd>
              <dt className="text-[var(--ink-3)]">You lose</dt><dd>{describeHqBonuses(getHqBonuses(currentStage.id)).join(' · ') || '—'}</dd>
              <dt className="text-[var(--ink-3)]">Cash</dt><dd className={`font-mono ${state.money < pendingTotal ? 'text-red-300' : ''}`}>{formatMoney(state.money)}</dd>
              <dt className="text-[var(--ink-3)]">The window</dt>
              <dd className="col-span-1 sm:col-span-3">
                {pendingRow.windowPreview}
                {pendingRow.platesPending && (
                  <span className="text-[var(--ink-3)]"> Plates for this stage are still rendering — the Bridge stands the Earth window in, labelled, until they land.</span>
                )}
              </dd>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                ref={confirmRef}
                type="button"
                onClick={() => void confirmRelocate()}
                disabled={busy || state.money < pendingTotal}
                className="rounded border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 font-hud text-[11px] uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? 'Filing charter…' : 'Confirm relocation'}
              </button>
              <button
                type="button"
                onClick={() => setPendingStage(null)}
                className="rounded border border-white/15 px-3 py-1.5 font-hud text-[11px] uppercase tracking-wide text-[var(--ink-2)] hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Console>
    </div>
  );
}

/** Whether the corporation already holds a seat at a stage — only the
 *  current seat is known client-side (the server checks reservations). */
function heldSeatAt(state: GameState, stage: HqStageId): boolean {
  const hq = getHeadquarters(state);
  return hq.stage === stage && typeof hq.seatIndex === 'number';
}
