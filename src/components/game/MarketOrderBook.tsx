'use client';

// ─── Market order book (Markets hub · Spot & Orders) ────────────────────────
// Design-system migration (GAME_DESIGN_REVIEW_2026-09 §3): the order book's
// chrome moved onto the shared kit — Console for the three views and the
// price-campaign console, Telemetry for the header readouts and campaign
// quote, DataTable for "My Orders", StatusPip/StatusBadge for side, order
// status, book liveness and posture (words + glyphs, never colour alone),
// the five tokens instead of green/red/cyan/amber utilities and rgba
// literals, the site's btn-* CTA classes, motion-safe: transitions, and no
// raw emoji (resource glyphs are GameIcon). Every fetch, handler and number
// is unchanged.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RESOURCE_MAP, RESOURCES } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import type { GameState } from '@/lib/game/types';
import Image from 'next/image';
import HoloTip, { Concept } from '@/components/game/HoloTip';
import { PRICE_CAMPAIGN_DURATION_MS, PRICE_CAMPAIGN_COOLDOWN_MS } from '@/lib/game/price-campaigns';
import { playSound } from '@/lib/game/sound-engine';
import Console from '@/components/ui/Console';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import StatusPip, { type PipState } from '@/components/ui/StatusPip';
import Telemetry from '@/components/ui/Telemetry';
import GameIcon from '@/components/game/GameIcon';
import { resourceCategoryIcon } from '@/lib/game/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderLevel {
  price: number;
  totalQty: number;
  orderCount: number;
  isNpc: boolean;
}

interface OrderBookData {
  resourceSlug: string;
  currentPrice: number;
  basePrice: number;
  change24h: number;
  lastTradePrice: number | null;
  /** Manufactured goods: units on each side listed by NPC industrial corps. */
  npcCorpAskQty?: number;
  npcCorpBidQty?: number;
  lastTradeAt: string | null;
  spread: { absolute: number; percentage: number } | null;
  volume24h: number;
  bids: OrderLevel[];
  asks: OrderLevel[];
}

interface MyOrder {
  id: string;
  resourceSlug: string;
  side: string;
  price: number;
  quantity: number;
  filledQty: number;
  remainingQty: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  fills: { quantity: number; price: number; executedAt: string }[];
}

interface MarketOrderBookProps {
  state: GameState;
  selectedResource?: string;
  onOrderPlaced?: () => void;
  /** Lever-discoverability pass (2026-09): the hub mirrors the selection so
   *  the Analytics NPC-demand console filters to the same resource. */
  onResourceChange?: (slug: string) => void;
  /** Increment to open the price-campaign console (a `market:campaign`
   *  sub-view request lands here). */
  campaignOpenSignal?: number;
}

/** Published NPC demand totals for one resource (GET /api/space-tycoon/npc-forecast). */
interface NpcForecastLine {
  horizonHours: number;
  buy: number;
  sell: number;
}

interface CampaignQuote {
  resourceSlug: string;
  fee: number;
  minInventory: number;
  windowTurnover: number;
}

interface ActiveCampaign {
  id: string;
  resourceSlug: string;
  byCompanyName: string;
  endsAt: string;
  feePaid: number;
}

/** Order status → pip (word + shape). */
function orderStatusPip(status: string): { state: PipState; label: string } {
  switch (status) {
    case 'filled': return { state: 'flew', label: 'FILLED' };
    case 'partial': return { state: 'tminus', label: 'PARTIAL' };
    case 'cancelled': return { state: 'scrub', label: 'CANCELLED' };
    case 'expired': return { state: 'hold', label: 'EXPIRED' };
    default: return { state: 'live', label: 'OPEN' };
  }
}

const OVERLINE = 'font-body text-[0.6875rem] font-medium uppercase leading-[1.4] tracking-[0.14em] text-[var(--ink-3)]';
const INPUT = 'w-full min-h-[44px] rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--surface)] px-3 font-mono text-[0.875rem] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]';

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketOrderBook({ state, selectedResource, onOrderPlaced, onResourceChange, campaignOpenSignal }: MarketOrderBookProps) {
  const [resource, setResource] = useState(selectedResource || 'iron');
  const [forecast, setForecast] = useState<NpcForecastLine | null>(null);
  // Price-campaign console (lever-discoverability pass, 2026-09). The
  // Markets hub — not Analytics — is now the home of the declare form; the
  // quote shown is the SERVER's (Balance Pass 9: market-keyed fee), never a
  // client guess, and every refusal string is the route's own.
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignQuote, setCampaignQuote] = useState<CampaignQuote | null>(null);
  const [campaignsHere, setCampaignsHere] = useState<ActiveCampaign[]>([]);
  const [campaignBusy, setCampaignBusy] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState<string | null>(null);
  const [book, setBook] = useState<OrderBookData | null>(null);
  const [bookFetchedAt, setBookFetchedAt] = useState<number | null>(null);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'book' | 'place' | 'orders'>('book');

  // Order form state
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiresIn, setExpiresIn] = useState('24h');

  // ─── Data Fetching ────────────────────────────────────────────────────

  const fetchBook = useCallback(async () => {
    try {
      const res = await fetch(`/api/space-tycoon/market/orders?resourceSlug=${resource}`);
      if (res.ok) {
        const data = await res.json();
        setBook(data);
        setBookFetchedAt(Date.now());
      }
    } catch {
      // silently fail, will retry
    }
  }, [resource]);

  const fetchMyOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/market/my-orders');
      if (res.ok) {
        const data = await res.json();
        setMyOrders(data.orders || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBook(), fetchMyOrders()]).finally(() => setLoading(false));
    const interval = setInterval(() => {
      fetchBook();
      fetchMyOrders();
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchBook, fetchMyOrders]);

  // Update resource when selectedResource prop changes
  useEffect(() => {
    if (selectedResource) setResource(selectedResource);
  }, [selectedResource]);

  // Published NPC demand for the selected resource (cached 10 min server-side).
  useEffect(() => {
    let cancelled = false;
    setForecast(null);
    fetch(`/api/space-tycoon/npc-forecast?resource=${encodeURIComponent(resource)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: { horizonHours?: number; byResource?: Record<string, { buy: number; sell: number }> } | null) => {
        if (cancelled || !d) return;
        const row = d.byResource?.[resource];
        setForecast({ horizonHours: d.horizonHours || 72, buy: row?.buy || 0, sell: row?.sell || 0 });
      })
      .catch(() => { /* the line simply stays hidden */ });
    return () => { cancelled = true; };
  }, [resource]);

  // A `market:campaign` sub-view request (posture strip, Rivals hint card)
  // opens the console directly.
  useEffect(() => {
    if (campaignOpenSignal && campaignOpenSignal > 0) setCampaignOpen(true);
  }, [campaignOpenSignal]);

  const loadCampaignQuote = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/space-tycoon/market/campaign?quote=${encodeURIComponent(slug)}`);
      if (!res.ok) return;
      const data = await res.json();
      setCampaignQuote(data.quote && data.quote.resourceSlug === slug ? (data.quote as CampaignQuote) : null);
      const all: ActiveCampaign[] = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaignsHere(all.filter(c => c.resourceSlug === slug));
    } catch { /* best-effort — the console says the quote is computed at declare time */ }
  }, []);

  useEffect(() => {
    if (!campaignOpen) return;
    setCampaignQuote(null);
    setCampaignMessage(null);
    loadCampaignQuote(resource);
  }, [campaignOpen, resource, loadCampaignQuote]);

  const declareCampaign = async () => {
    if (campaignBusy) return;
    setCampaignBusy(true);
    setCampaignMessage(null);
    try {
      const res = await fetch('/api/space-tycoon/market/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'declare', resourceSlug: resource }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playSound('notification');
        setCampaignMessage(`Campaign declared — fee ${formatMoney(data.feePaid)} burned. Now sell real volume below spot; the crash sticks until ${new Date(data.endsAt).toLocaleString()}.`);
        loadCampaignQuote(resource);
      } else {
        setCampaignMessage(data.error || 'Declaration failed.');
      }
    } catch {
      setCampaignMessage('Network error — try again.');
    } finally {
      setCampaignBusy(false);
    }
  };

  // Pre-fill price from best bid/ask
  useEffect(() => {
    if (book && !price) {
      if (side === 'buy' && book.bids.length > 0) {
        setPrice(String(book.bids[0].price));
      } else if (side === 'sell' && book.asks.length > 0) {
        setPrice(String(book.asks[0].price));
      } else if (book.currentPrice) {
        setPrice(String(Math.round(book.currentPrice)));
      }
    }
  }, [book, side]);

  // ─── Actions ──────────────────────────────────────────────────────────

  const handlePlaceOrder = async () => {
    if (submitting) return;
    const priceInt = parseInt(price);
    const qtyInt = parseInt(quantity);

    if (!priceInt || priceInt < 1) {
      setError('Enter a valid price');
      return;
    }
    if (!qtyInt || qtyInt < 1) {
      setError('Enter a valid quantity');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/space-tycoon/market/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceSlug: resource,
          side,
          price: priceInt,
          quantity: qtyInt,
          expiresIn,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to place order');
      } else {
        setPrice('');
        setQuantity('');
        setError(null);
        setTab('orders');
        await Promise.all([fetchBook(), fetchMyOrders()]);
        onOrderPlaced?.();
      }
    } catch {
      setError('Network error placing order');
    }
    setSubmitting(false);
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch('/api/space-tycoon/market/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) {
        await Promise.all([fetchBook(), fetchMyOrders()]);
      }
    } catch {
      // silently fail
    }
  };

  // ─── Derived Values ───────────────────────────────────────────────────

  const resourceDef = RESOURCE_MAP.get(resource as never);
  const priceInt = parseInt(price) || 0;
  const qtyInt = parseInt(quantity) || 0;
  const totalCost = priceInt * qtyInt;
  const feeAmount = Math.round(totalCost * 0.02);
  const totalWithFee = side === 'buy' ? totalCost + feeAmount : totalCost - feeAmount;

  const maxBidQty = book?.bids.length ? Math.max(...book.bids.map(b => b.totalQty)) : 1;
  const maxAskQty = book?.asks.length ? Math.max(...book.asks.map(a => a.totalQty)) : 1;
  const maxQty = Math.max(maxBidQty, maxAskQty, 1);

  const myOrdersForResource = myOrders.filter(o => o.resourceSlug === resource && ['open', 'partial'].includes(o.status));

  // My Orders as DataTable rows (whole list, all resources — unchanged scope).
  type OrderRow = MyOrder & { resourceName: string; fillPct: number; isActive: boolean; timeLeft: string };
  const orderRows: OrderRow[] = useMemo(() => myOrders.map(order => {
    const rDef = RESOURCE_MAP.get(order.resourceSlug as never);
    const fillPct = order.quantity > 0 ? Math.round((order.filledQty / order.quantity) * 100) : 0;
    const isActive = ['open', 'partial'].includes(order.status);
    const expiresAt = order.expiresAt ? new Date(order.expiresAt) : null;
    const timeLeftMs = expiresAt ? Math.max(0, expiresAt.getTime() - Date.now()) : 0;
    const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const minsLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeLeft = isActive && expiresAt ? (hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m left` : `${minsLeft}m left`) : '';
    return { ...order, resourceName: rDef?.name || order.resourceSlug, fillPct, isActive, timeLeft };
  }), [myOrders]);

  const orderColumns: DataTableColumn<OrderRow>[] = [
    {
      key: 'side', header: 'Side',
      render: r => <StatusPip state={r.side === 'buy' ? 'go' : 'scrub'} label={r.side === 'buy' ? 'BUY' : 'SELL'} />,
    },
    {
      key: 'resourceName', header: 'Resource',
      render: r => {
        const rDef = RESOURCE_MAP.get(r.resourceSlug as never);
        return (
          <span className={`inline-flex items-center gap-1.5 ${r.isActive ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'}`}>
            <GameIcon name={resourceCategoryIcon(rDef?.category || 'generic')} size={12} /> {r.resourceName}
          </span>
        );
      },
    },
    { key: 'price', header: 'Price', numeric: true, render: r => formatMoney(r.price) },
    {
      key: 'fillPct', header: 'Filled', numeric: true,
      render: r => (
        <span className="inline-flex flex-col items-end gap-1 min-w-[72px]">
          <span className="font-mono tabular-nums">{r.filledQty}/{r.quantity}</span>
          <span className="h-1 w-full rounded-full overflow-hidden bg-[var(--line)]" role="progressbar" aria-valuenow={r.fillPct} aria-valuemin={0} aria-valuemax={100} aria-label="Fill progress">
            <span className="block h-full rounded-full motion-safe:transition-all" style={{ width: `${r.fillPct}%`, background: r.side === 'buy' ? 'var(--go)' : 'var(--crit)' }} />
          </span>
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: r => { const pip = orderStatusPip(r.status); return <StatusPip state={pip.state} label={pip.label} />; },
    },
    { key: 'timeLeft', header: 'Expires', sortable: false, render: r => <span className="text-[var(--ink-3)]">{r.timeLeft || '—'}</span> },
    {
      key: 'actions', header: '', sortable: false, align: 'right',
      render: r => r.isActive ? (
        <button
          type="button"
          onClick={() => handleCancelOrder(r.id)}
          aria-label={`Cancel ${r.side} order for ${r.resourceName}`}
          className="btn-ghost !min-h-[36px] !py-1 !px-2 text-[12px] !text-[var(--crit)]"
        >
          Cancel
        </button>
      ) : null,
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Resource Selector + header readouts */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="sprite-frame w-8 h-8 flex-shrink-0 flex items-center justify-center">
          {RESOURCE_ASSETS[resource] ? (
            <Image src={RESOURCE_ASSETS[resource]} alt="" width={32} height={32} className="w-8 h-8 rounded object-cover" />
          ) : (
            <GameIcon name={resourceCategoryIcon(resourceDef?.category || 'generic')} size={18} />
          )}
        </div>
        <select
          value={resource}
          onChange={e => { setResource(e.target.value); setPrice(''); onResourceChange?.(e.target.value); }}
          aria-label="Order book resource"
          className="min-h-[44px] px-3 rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--surface)] text-[var(--ink)] text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]"
        >
          {RESOURCES.map(r => (
            <option key={r.id} value={r.id} className="bg-[var(--surface)]">{r.name}</option>
          ))}
        </select>
      </div>

      {book && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] p-3">
          <Telemetry
            label="Last"
            value={formatMoney(book.lastTradePrice || book.currentPrice)}
            tone="signal"
            delta={book.change24h !== 0 ? { value: book.change24h, suffix: '% 24h' } : undefined}
          />
          <div>
            <HoloTip
              underline={false}
              content={{
                title: 'Bid-Ask Spread',
                icon: 'market',
                body: 'The gap between the best (highest) buy order and the best (lowest) sell order. A tighter spread means the market is more liquid — you can trade near the last price without moving it much.',
              }}
            >
              <span className={OVERLINE}>Spread</span>
            </HoloTip>
            <div className="mt-1 font-mono text-[1.25rem] font-bold leading-[1.1] tabular-nums text-[var(--ink)]">
              {book.spread ? formatMoney(book.spread.absolute) : '—'}
            </div>
            {book.spread && <div className="mt-1 font-mono text-[0.8125rem] text-[var(--ink-3)]">{book.spread.percentage}%</div>}
          </div>
          <Telemetry label="Vol 24h" value={book.volume24h.toLocaleString()} unit="units" tone="ink" />
          <div>
            <span className={OVERLINE}>NPC industry</span>
            {((book.npcCorpAskQty || 0) > 0 || (book.npcCorpBidQty || 0) > 0) ? (
              <p
                className="mt-1 font-mono text-[0.8125rem] tabular-nums text-[var(--ink-2)] inline-flex items-center gap-1.5"
                title="NPC industrial corporations fabricate hardware from raw inputs and list it here; they also buy what they consume. Everything else on the book is player-built."
              >
                <GameIcon name="npc" size={12} /> {book.npcCorpAskQty || 0} for sale · wants {book.npcCorpBidQty || 0}
              </p>
            ) : (
              <p className="mt-1 font-mono text-[0.8125rem] text-[var(--ink-3)]">— none listed</p>
            )}
          </div>
        </div>
      )}

      {/* Published NPC demand + the price-campaign lever, for the selected resource. */}
      <div className="flex items-center gap-3 flex-wrap text-[11px]">
        {forecast && (
          <HoloTip
            underline={false}
            content={{
              title: 'Scheduled NPC demand',
              icon: 'npc',
              body: 'What the NPC industrial corporations and faction procurement drives will bid for (buy) and list (sell) in this market over the next few days, published ahead of time so you can plan around it. Same numbers the hourly tick executes — full table under Markets → Analytics → NPC Demand.',
            }}
          >
            <span className="inline-flex items-center gap-1.5 text-[var(--ink-2)]" aria-live="polite">
              <GameIcon name="npc" size={12} />
              NPC demand next {forecast.horizonHours}h: <span className="font-mono tabular-nums text-[var(--ink)]">buy {forecast.buy.toLocaleString()} / sell {forecast.sell.toLocaleString()}</span>
            </span>
          </HoloTip>
        )}
        <button
          type="button"
          onClick={() => { playSound('click'); setCampaignOpen(v => !v); }}
          aria-expanded={campaignOpen}
          aria-controls="price-campaign-console"
          aria-label={`Declare a price campaign on ${resourceDef?.name || resource}`}
          className="btn-secondary !min-h-[40px] !py-1 !px-3 text-[12px] !text-[var(--crit)]"
        >
          <GameIcon name="swords" size={12} /> {campaignOpen ? 'Close campaign console' : 'Declare price campaign'}
        </button>
      </div>

      {campaignOpen && (
        <Console
          title={
            <span id="price-campaign-heading" className="inline-flex items-center gap-1.5 normal-case tracking-normal">
              <Concept id="price-campaign">Price campaign</Concept>
              <span className="text-[var(--ink-3)]">· {resourceDef?.name || resource}</span>
            </span>
          }
          actions={<StatusPip state="scrub" label="OFFENSE" />}
        >
          <div id="price-campaign-console" aria-labelledby="price-campaign-heading" className="space-y-3">
            <p className="font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-2)]">
              Declare a public dumping campaign on this market: the fee is burned, you must hold real inventory as
              ammunition, mean-reversion pauses and the NPC maker halves its bids for {Math.round(PRICE_CAMPAIGN_DURATION_MS / 86_400_000)} days.
              One campaign at a time; {Math.round(PRICE_CAMPAIGN_COOLDOWN_MS / 86_400_000)}-day cooldown per market. Every corporation sees it.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Telemetry label="Fee (burned)" value={campaignQuote ? formatMoney(campaignQuote.fee) : '—'} tone="ember" sub={campaignQuote ? undefined : 'computed at declare'} />
              <Telemetry label="Ammunition required" value={campaignQuote ? campaignQuote.minInventory.toLocaleString() : '—'} unit={campaignQuote ? 'units' : undefined} tone="ink" />
              <Telemetry label="You hold" value={(state.resources[resource] || 0).toLocaleString()} unit="units" tone="ink" />
              <Telemetry label="Window" value={Math.round(PRICE_CAMPAIGN_DURATION_MS / 86_400_000)} unit="days" tone="ink" />
            </div>
            {campaignQuote && (state.resources[resource] || 0) < campaignQuote.minInventory && (
              <p className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                <StatusPip state="hold" label="BELOW FLOOR" />
                You hold less than the ammunition floor — the server will refuse the declaration until you do.
              </p>
            )}
            {campaignsHere.length > 0 && (
              <p className="flex items-center gap-2 text-[11px] text-[var(--ink-2)]">
                <StatusPip state="live" label="UNDER CAMPAIGN" />
                {campaignsHere.map(c => `${c.byCompanyName} (until ${new Date(c.endsAt).toLocaleDateString()})`).join(', ')}.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={declareCampaign}
                disabled={campaignBusy}
                aria-label={`Confirm price campaign on ${resourceDef?.name || resource}${campaignQuote ? `, fee ${formatMoney(campaignQuote.fee)} burned` : ''}`}
                className="btn-primary text-[13px]"
              >
                {campaignBusy ? 'Declaring…' : `Confirm — burn ${campaignQuote ? formatMoney(campaignQuote.fee) : 'the fee'}`}
              </button>
              <button
                type="button"
                onClick={() => setCampaignOpen(false)}
                className="btn-secondary text-[13px]"
              >
                Cancel
              </button>
            </div>
            {campaignMessage && <p className="text-[11px] text-[var(--ink)] leading-relaxed" role="status">{campaignMessage}</p>}
          </div>
        </Console>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 overflow-x-auto game-tab-bar" role="tablist" aria-label="Market order book views">
        {(['book', 'place', 'orders'] as const).map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-[44px] px-3 py-1 text-[11px] font-medium rounded-[var(--radius-control)] border motion-safe:transition-colors whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)] ${
              tab === t
                ? 'border-[var(--ember)] bg-[var(--hover)] text-[var(--ink)]'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            {t === 'book' ? 'Order Book' : t === 'place' ? 'Place Order' : `My Orders (${myOrdersForResource.length})`}
          </button>
        ))}
      </div>

      {/* Order Book Tab */}
      {tab === 'book' && (
        <Console
          title="Order book"
          source="shared book"
          asOf={bookFetchedAt}
          status={loading ? 'delayed' : book ? 'live' : 'off'}
        >
          {loading ? (
            <div className="text-center text-[var(--ink-3)] text-xs py-8">Loading order book...</div>
          ) : !book ? (
            <div className="text-center text-[var(--ink-3)] text-xs py-8">No data available</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Bids (Buy Orders) */}
              <div role="table" aria-label="Buy orders (bids)">
                <div className={`${OVERLINE} mb-2`} style={{ color: 'var(--go)' }}>
                  <Concept id="order-book-depth"><span aria-hidden="true">▲</span> Bids (Buy)</Concept>
                </div>
                <div className="space-y-0.5">
                  {book.bids.length === 0 ? (
                    <div className="text-[var(--ink-3)] text-[10px] py-2">No buy orders</div>
                  ) : (
                    book.bids.map((bid, i) => (
                      <div key={i} role="row" className="relative flex items-center justify-between py-0.5 px-1.5 rounded-[var(--radius-badge)] text-[11px]">
                        {/* Depth bar — grows from the price column outward */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-[var(--radius-badge)]"
                          style={{
                            width: `${(bid.totalQty / maxQty) * 100}%`,
                            background: 'linear-gradient(to right, color-mix(in srgb, var(--go) 22%, transparent), color-mix(in srgb, var(--go) 4%, transparent))',
                          }}
                          role="presentation"
                          aria-label={`${bid.totalQty} units at ${formatMoney(bid.price)}`}
                        />
                        <span className="relative z-10 font-mono tabular-nums" style={{ color: 'var(--go)' }} role="cell">{formatMoney(bid.price)}</span>
                        <span className="relative z-10 font-mono tabular-nums text-[var(--ink-2)]" role="cell">
                          {bid.totalQty}
                          {bid.isNpc && <span className="text-[var(--ink-3)] ml-1">NPC</span>}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Asks (Sell Orders) */}
              <div role="table" aria-label="Sell orders (asks)">
                <div className={`${OVERLINE} mb-2`} style={{ color: 'var(--crit)' }}>
                  <span aria-hidden="true">▼</span> Asks (Sell)
                </div>
                <div className="space-y-0.5">
                  {book.asks.length === 0 ? (
                    <div className="text-[var(--ink-3)] text-[10px] py-2">No sell orders</div>
                  ) : (
                    book.asks.map((ask, i) => (
                      <div key={i} role="row" className="relative flex items-center justify-between py-0.5 px-1.5 rounded-[var(--radius-badge)] text-[11px]">
                        <div
                          className="absolute inset-y-0 right-0 rounded-[var(--radius-badge)]"
                          style={{
                            width: `${(ask.totalQty / maxQty) * 100}%`,
                            background: 'linear-gradient(to left, color-mix(in srgb, var(--crit) 22%, transparent), color-mix(in srgb, var(--crit) 4%, transparent))',
                          }}
                          role="presentation"
                          aria-label={`${ask.totalQty} units at ${formatMoney(ask.price)}`}
                        />
                        <span className="relative z-10 font-mono tabular-nums" style={{ color: 'var(--crit)' }} role="cell">{formatMoney(ask.price)}</span>
                        <span className="relative z-10 font-mono tabular-nums text-[var(--ink-2)]" role="cell">
                          {ask.totalQty}
                          {ask.isNpc && <span className="text-[var(--ink-3)] ml-1">NPC</span>}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Console>
      )}

      {/* Place Order Tab */}
      {tab === 'place' && (
        <Console title="Place order" actions={<StatusPip state={side === 'buy' ? 'go' : 'scrub'} label={side === 'buy' ? 'BUY' : 'SELL'} />}>
          <div className="space-y-3">
          {/* Buy/Sell Toggle */}
          <div className="flex rounded-[var(--radius-control)] overflow-hidden border border-[var(--line-2)]" role="group" aria-label="Order side">
            <button
              type="button"
              onClick={() => setSide('buy')}
              aria-pressed={side === 'buy'}
              className={`flex-1 min-h-[44px] py-2 text-xs font-semibold motion-safe:transition-colors border-r border-[var(--line-2)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)] ${
                side === 'buy' ? 'bg-[var(--hover)] text-[var(--ink)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              <span aria-hidden="true" style={{ color: 'var(--go)' }}>▲</span> Buy
            </button>
            <button
              type="button"
              onClick={() => setSide('sell')}
              aria-pressed={side === 'sell'}
              className={`flex-1 min-h-[44px] py-2 text-xs font-semibold motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)] ${
                side === 'sell' ? 'bg-[var(--hover)] text-[var(--ink)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
            >
              <span aria-hidden="true" style={{ color: 'var(--crit)' }}>▼</span> Sell
            </button>
          </div>

          {/* Price Input */}
          <div>
            <label htmlFor="order-price" className={`${OVERLINE} block mb-1`}>
              Price per unit
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--ink-3)] text-xs">$</span>
              <input
                id="order-price"
                type="number"
                min={1}
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder={book ? String(Math.round(book.currentPrice)) : '0'}
                className={INPUT}
              />
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label htmlFor="order-qty" className={`${OVERLINE} block mb-1`}>
              Quantity
            </label>
            <input
              id="order-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="1"
              className={INPUT}
            />
            {side === 'sell' && resourceDef && (
              <p className="text-[10px] text-[var(--ink-3)] mt-1">
                Available: {(state.resources[resource] || 0).toLocaleString()} {resourceDef.name}
              </p>
            )}
            {side === 'buy' && (
              <p className="text-[10px] text-[var(--ink-3)] mt-1">
                Balance: {formatMoney(state.money)}
              </p>
            )}
          </div>

          {/* Expiration */}
          <div>
            <label htmlFor="order-expiry" className={`${OVERLINE} block mb-1`}>
              Expires in
            </label>
            <select
              id="order-expiry"
              value={expiresIn}
              onChange={e => setExpiresIn(e.target.value)}
              className={INPUT}
            >
              <option value="1h" className="bg-[var(--surface)]">1 hour</option>
              <option value="6h" className="bg-[var(--surface)]">6 hours</option>
              <option value="24h" className="bg-[var(--surface)]">24 hours</option>
              <option value="72h" className="bg-[var(--surface)]">3 days</option>
              <option value="1w" className="bg-[var(--surface)]">1 week</option>
            </select>
          </div>

          {/* Order Summary */}
          {priceInt > 0 && qtyInt > 0 && (
            <div className="rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--elev)] p-3 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--ink-2)]">Subtotal</span>
                <span className="text-[var(--ink)] font-mono tabular-nums">{formatMoney(totalCost)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <HoloTip
                  underline={false}
                  content={{ title: 'Order Escrow', icon: 'lock', body: <Concept id="escrow" /> }}
                >
                  <span className="text-[var(--ink-2)]">Fee (2%)</span>
                </HoloTip>
                <span className="font-mono tabular-nums" style={{ color: 'var(--caution)' }}>{formatMoney(feeAmount)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-[var(--line)] pt-1">
                <span className="text-[var(--ink)] font-medium">
                  {side === 'buy' ? 'Total Cost' : 'You Receive'}
                </span>
                <span className="font-mono font-bold tabular-nums" style={{ color: side === 'buy' ? 'var(--crit)' : 'var(--go)' }}>
                  <span aria-hidden="true">{side === 'buy' ? '−' : '+'}</span>{formatMoney(totalWithFee)}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--elev)] p-2 text-[11px] text-[var(--ink)]" role="alert" aria-live="polite">
              <StatusPip state="scrub" label="ERROR" /> {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={submitting || !priceInt || !qtyInt}
            className="btn-primary w-full text-[13px]"
          >
            {submitting
              ? 'Placing...'
              : `${side === 'buy' ? 'Buy' : 'Sell'} ${qtyInt || 0} ${resourceDef?.name || resource} @ ${formatMoney(priceInt)}`}
          </button>
          </div>
        </Console>
      )}

      {/* My Orders Tab */}
      {tab === 'orders' && (
        <Console title="My orders" padded={myOrders.length === 0}>
          {myOrders.length === 0 ? (
            <div className="text-center text-[var(--ink-3)] text-xs py-6">
              No orders yet. Place your first limit order!
            </div>
          ) : (
            <div aria-live="polite">
              <DataTable<OrderRow>
                caption="My open orders"
                columns={orderColumns}
                rows={orderRows}
                initialSort={{ key: 'createdAt', dir: 'desc' }}
              />
            </div>
          )}
        </Console>
      )}
    </div>
  );
}
