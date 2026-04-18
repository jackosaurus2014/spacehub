'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
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

export default function TicketResaleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const searchParams = useSearchParams();
  const purchaseStatus = searchParams.get('purchase');

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  const fetchListing = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ticket-resale/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        setError(data?.error?.message || 'Failed to load listing');
        setListing(null);
        return;
      }
      setListing(data.data?.listing || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchListing();
  }, [fetchListing]);

  useEffect(() => {
    if (purchaseStatus === 'success') {
      toast.success('Purchase complete — your ticket is confirmed!');
    } else if (purchaseStatus === 'canceled') {
      toast.info('Checkout canceled. The listing is still available.');
    }
  }, [purchaseStatus]);

  const handleBuy = useCallback(async () => {
    if (!id || buying) return;
    setBuying(true);
    try {
      const res = await fetch(`/api/ticket-resale/${id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        const msg =
          (typeof data?.error === 'string'
            ? data.error
            : data?.error?.message) || 'Could not start checkout';
        toast.error(msg);
        setBuying(false);
        return;
      }
      const checkoutUrl = data.data?.checkoutUrl;
      if (checkoutUrl) {
        toast.info('Redirecting to checkout…');
        window.location.href = checkoutUrl;
      } else {
        toast.error('No checkout URL returned');
        setBuying(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error');
      setBuying(false);
    }
  }, [id, buying]);

  if (loading) {
    return (
      <div className="min-h-screen p-4 lg:p-8 max-w-[900px] mx-auto">
        <div className="card p-10 animate-pulse text-center text-slate-500 text-sm">
          Loading listing…
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen p-4 lg:p-8 max-w-[900px] mx-auto">
        <div className="card p-10 border border-rose-500/30 bg-rose-500/10 text-center">
          <div className="text-sm text-rose-300 mb-3">{error || 'Listing not found'}</div>
          <Link
            href="/ticket-resale"
            className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 border border-white/[0.1] hover:border-white/[0.2] transition-all inline-block"
          >
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  const eventName = getEventName(listing.eventId);
  const isAvailable = listing.status === 'listed';
  const platformFee = listing.askingPrice * 0.1;

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[900px] mx-auto">
      <div className="mb-4">
        <Link
          href="/ticket-resale"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Back to marketplace
        </Link>
      </div>

      <div className="card p-6 md:p-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded border font-medium ${
              listing.status === 'listed'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : listing.status === 'sold'
                  ? 'bg-white/[0.08] text-slate-400 border-white/[0.1]'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}
          >
            {listing.status}
          </span>
          {listing.ticketTier && (
            <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.06]">
              {listing.ticketTier}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">{eventName}</h1>
        <div className="text-xs text-slate-500 mb-6">
          Listed {new Date(listing.createdAt).toLocaleDateString()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
            <div className="text-xs text-slate-500 mb-1">Asking price</div>
            <div className="text-3xl font-bold text-white">
              {formatMoney(listing.askingPrice, listing.currency)}
            </div>
          </div>
          {listing.originalPrice && listing.originalPrice > 0 && (
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06]">
              <div className="text-xs text-slate-500 mb-1">Originally paid</div>
              <div className="text-3xl font-bold text-slate-400 line-through">
                {formatMoney(listing.originalPrice, listing.currency)}
              </div>
            </div>
          )}
        </div>

        {listing.notes && (
          <div className="mb-6">
            <div className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">
              Seller Notes
            </div>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {listing.notes}
            </p>
          </div>
        )}

        <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.06] mb-6">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">
            Price breakdown
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300 mb-1">
            <span>Ticket price</span>
            <span>{formatMoney(listing.askingPrice, listing.currency)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Platform fee (10%) — included in price</span>
            <span>{formatMoney(platformFee, listing.currency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold text-white pt-2 border-t border-white/[0.08]">
            <span>You pay</span>
            <span>{formatMoney(listing.askingPrice, listing.currency)}</span>
          </div>
        </div>

        {isAvailable ? (
          <button
            onClick={handleBuy}
            disabled={buying}
            className="w-full text-sm px-6 py-3 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all font-semibold disabled:opacity-50 disabled:cursor-wait"
          >
            {buying ? 'Redirecting to checkout…' : 'Buy ticket'}
          </button>
        ) : (
          <div className="w-full text-center text-sm px-6 py-3 rounded-lg bg-white/[0.04] text-slate-500 border border-white/[0.06]">
            This listing is {listing.status} and no longer available.
          </div>
        )}
      </div>
    </div>
  );
}
