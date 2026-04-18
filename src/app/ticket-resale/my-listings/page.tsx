'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { SPACE_EVENTS } from '@/lib/space-events-data';

export const dynamic = 'force-dynamic';

type Listing = {
  id: string;
  rsvpId: string | null;
  eventId: string;
  sellerUserId: string;
  ticketTier: string | null;
  askingPrice: number;
  currency: string;
  originalPrice: number | null;
  status: string;
  buyerUserId: string | null;
  soldAt: string | null;
  notes: string | null;
  createdAt: string;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'USD').toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function getEventName(eventId: string): string {
  const e = SPACE_EVENTS.find((ev) => ev.id === eventId);
  return e?.name || eventId;
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ticket-resale?mine=true', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        if (res.status === 401) {
          setError('Please sign in to view your listings.');
        } else {
          setError(data?.error?.message || 'Failed to load your listings');
        }
        setListings([]);
        return;
      }
      setListings(data.data?.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  const handleCancel = useCallback(
    async (id: string) => {
      if (actionId) return;
      if (!confirm('Cancel this listing? Buyers will no longer see it.')) return;
      setActionId(id);
      try {
        const res = await fetch(`/api/ticket-resale/${id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok || data?.success === false) {
          toast.error(data?.error?.message || 'Failed to cancel listing');
          return;
        }
        toast.success('Listing cancelled');
        await fetchListings();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Network error');
      } finally {
        setActionId(null);
      }
    },
    [actionId, fetchListings]
  );

  const { active, sold } = useMemo(() => {
    const activeList: Listing[] = [];
    const soldList: Listing[] = [];
    for (const l of listings) {
      if (l.status === 'sold') soldList.push(l);
      else activeList.push(l);
    }
    return { active: activeList, sold: soldList };
  }, [listings]);

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Listings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your resale tickets and review past sales.
          </p>
        </div>
        <Link
          href="/ticket-resale/list/new"
          className="text-sm px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all font-medium"
        >
          List a Ticket
        </Link>
      </div>

      {error && (
        <div className="card p-4 mb-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="card p-10 animate-pulse text-center text-slate-500 text-sm">
          Loading your listings…
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🎟️</div>
          <div className="text-sm font-semibold text-white mb-1">No listings yet</div>
          <div className="text-xs text-slate-500 mb-4">
            You haven&apos;t listed any tickets for resale. Buy a ticket to an upcoming event and
            list it here if your plans change.
          </div>
          <Link
            href="/space-events"
            className="inline-block text-xs px-4 py-2 rounded-lg bg-white/[0.06] text-slate-300 border border-white/[0.1] hover:border-white/[0.2] transition-all"
          >
            Browse events
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
            Active ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map((l) => (
              <div key={l.id} className="card p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded border font-medium ${
                        l.status === 'listed'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {l.status}
                    </span>
                    {l.ticketTier && (
                      <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.06]">
                        {l.ticketTier}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white truncate">
                    {getEventName(l.eventId)}
                  </h3>
                  <div className="text-xs text-slate-500">
                    Listed {new Date(l.createdAt).toLocaleDateString()} ·{' '}
                    <span className="text-white font-semibold">
                      {formatMoney(l.askingPrice, l.currency)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/ticket-resale/${l.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 border border-white/[0.1] hover:border-white/[0.2] transition-all"
                  >
                    View
                  </Link>
                  {l.status === 'listed' && (
                    <button
                      onClick={() => handleCancel(l.id)}
                      disabled={actionId === l.id}
                      className="text-xs px-3 py-1.5 rounded-lg text-rose-300 border border-rose-500/30 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                    >
                      {actionId === l.id ? 'Cancelling…' : 'Cancel listing'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {sold.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">
            Sold ({sold.length})
          </h2>
          <div className="space-y-3">
            {sold.map((l) => {
              const net = l.askingPrice * 0.9;
              return (
                <div key={l.id} className="card p-4 flex flex-col md:flex-row md:items-center gap-4 opacity-80">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded bg-white/[0.08] text-slate-400 border border-white/[0.1] font-medium">
                        sold
                      </span>
                      {l.ticketTier && (
                        <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.06]">
                          {l.ticketTier}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white truncate">
                      {getEventName(l.eventId)}
                    </h3>
                    <div className="text-xs text-slate-500">
                      Sold {l.soldAt ? new Date(l.soldAt).toLocaleDateString() : '—'} ·{' '}
                      <span className="text-white font-semibold">
                        {formatMoney(l.askingPrice, l.currency)}
                      </span>{' '}
                      · Your payout{' '}
                      <span className="text-emerald-400 font-semibold">
                        {formatMoney(net, l.currency)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/ticket-resale/${l.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 border border-white/[0.1] hover:border-white/[0.2] transition-all"
                  >
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
