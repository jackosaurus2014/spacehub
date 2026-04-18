'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
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

export default function TicketResalePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string>('all');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        eventFilter === 'all'
          ? '/api/ticket-resale'
          : `/api/ticket-resale?eventId=${encodeURIComponent(eventFilter)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        setError(data?.error?.message || 'Failed to load listings');
        setListings([]);
        return;
      }
      setListings(data.data?.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [eventFilter]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  const availableEvents = useMemo(() => {
    const ids = Array.from(new Set(listings.map((l) => l.eventId)));
    return ids.map((id) => ({ id, name: getEventName(id) }));
  }, [listings]);

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Ticket Resale Marketplace</h1>
            <p className="text-sm text-slate-400 mt-1">
              Buy and sell paid tickets to upcoming space industry events. 10% platform fee
              applied at checkout to cover payment processing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/ticket-resale/list/new"
              className="text-sm px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all font-medium"
            >
              List a Ticket
            </Link>
            <Link
              href="/ticket-resale/my-listings"
              className="text-sm px-4 py-2 rounded-lg bg-white/[0.06] text-slate-300 border border-white/[0.1] hover:border-white/[0.2] transition-all"
            >
              My Listings
            </Link>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
        <label htmlFor="event-filter" className="text-xs text-slate-500">
          Filter by event
        </label>
        <select
          id="event-filter"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 text-sm focus:border-white/20 outline-none"
        >
          <option value="all">All events</option>
          {availableEvents.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-slate-500">
          {loading ? 'Loading…' : `${listings.length} active listing${listings.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-4 border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {!loading && listings.length === 0 && !error && (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-2">🎟️</div>
          <div className="text-sm font-semibold text-white mb-1">No listings right now</div>
          <div className="text-xs text-slate-500">
            Be the first to list a ticket for resale. Browse upcoming events and head to your
            RSVP to create a listing.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => {
          const eventName = getEventName(listing.eventId);
          return (
            <Link
              key={listing.id}
              href={`/ticket-resale/${listing.id}`}
              className="card p-5 hover:border-white/[0.15] transition-all block"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  Listed
                </span>
                {listing.ticketTier && (
                  <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.06]">
                    {listing.ticketTier}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                {eventName}
              </h3>
              <div className="text-xs text-slate-500 mb-3">
                Listed {new Date(listing.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-500">Asking</div>
                  <div className="text-xl font-bold text-white">
                    {formatMoney(listing.askingPrice, listing.currency)}
                  </div>
                </div>
                {listing.originalPrice && listing.originalPrice > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Original</div>
                    <div className="text-xs text-slate-400 line-through">
                      {formatMoney(listing.originalPrice, listing.currency)}
                    </div>
                  </div>
                )}
              </div>
              {listing.notes && (
                <p className="text-xs text-slate-400 mt-3 line-clamp-2">{listing.notes}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
