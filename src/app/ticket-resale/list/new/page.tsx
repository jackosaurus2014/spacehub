'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/toast';
import { SPACE_EVENTS } from '@/lib/space-events-data';

export const dynamic = 'force-dynamic';

type PaidRsvp = {
  id: string;
  eventId: string;
  ticketTier: string | null;
  paid: boolean;
  amount: number | null;
  currency: string | null;
  status: string;
};

function getEventName(eventId: string): string {
  const e = SPACE_EVENTS.find((ev) => ev.id === eventId);
  return e?.name || eventId;
}

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

function NewListingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRsvpId = searchParams.get('rsvpId') || '';

  const [rsvpId, setRsvpId] = useState<string>(preselectedRsvpId);
  const [askingPrice, setAskingPrice] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [paidRsvps, setPaidRsvps] = useState<PaidRsvp[] | null>(null);
  const [loadingRsvps, setLoadingRsvps] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch the user's paid RSVPs (those eligible for resale)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRsvps(true);
      try {
        // No dedicated "list mine" endpoint — rely on client nav from space-events page.
        // If a preselected rsvpId was passed, fetch minimal info by reading /api/events/rsvp?eventId=
        // Otherwise present a manual field. We'll keep the UI simple and support both flows.
        setPaidRsvps([]);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Load failed');
      } finally {
        if (!cancelled) setLoadingRsvps(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;

      const priceNum = parseFloat(askingPrice);
      if (!rsvpId.trim()) {
        toast.error('An RSVP id is required — list from your ticket confirmation.');
        return;
      }
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        toast.error('Enter a valid asking price.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/ticket-resale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rsvpId: rsvpId.trim(),
            askingPrice: priceNum,
            notes: notes.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || data?.success === false) {
          const msg =
            (typeof data?.error === 'string'
              ? data.error
              : data?.error?.message) || 'Failed to create listing';
          toast.error(msg);
          return;
        }
        toast.success('Ticket listed for resale');
        const created = data.data?.listing;
        if (created?.id) {
          router.push(`/ticket-resale/${created.id}`);
        } else {
          router.push('/ticket-resale/my-listings');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Network error');
      } finally {
        setSubmitting(false);
      }
    },
    [rsvpId, askingPrice, notes, router, submitting]
  );

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[720px] mx-auto">
      <div className="mb-4">
        <Link
          href="/ticket-resale"
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Back to marketplace
        </Link>
      </div>

      <div className="card p-6 md:p-8">
        <h1 className="text-2xl font-bold text-white mb-2">List a ticket for resale</h1>
        <p className="text-sm text-slate-400 mb-6">
          You can only list tickets you have already paid for via an event RSVP.
          SpaceNexus keeps 10% of the sale price as a platform fee; the rest is your payout.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="rsvpId" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              RSVP ID
            </label>
            <input
              id="rsvpId"
              type="text"
              value={rsvpId}
              onChange={(e) => setRsvpId(e.target.value)}
              placeholder="rsvp_abc123"
              required
              className="w-full bg-white/[0.06] border border-white/[0.1] text-white rounded-lg px-3 py-2 text-sm focus:border-white/30 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Paste your RSVP id from a paid ticket. Tip: open the event page on
              <Link href="/space-events" className="text-slate-300 underline ml-1">/space-events</Link>
              {' '}and use the &ldquo;List for resale&rdquo; option on your paid RSVP to auto-fill this.
            </p>
            {preselectedRsvpId && (
              <p className="text-xs text-emerald-400 mt-1">
                RSVP id pre-filled from your paid ticket.
              </p>
            )}
            {loadingRsvps && (
              <p className="text-xs text-slate-500 mt-1">Loading your paid RSVPs…</p>
            )}
            {loadError && (
              <p className="text-xs text-rose-400 mt-1">{loadError}</p>
            )}
            {paidRsvps && paidRsvps.length > 0 && (
              <ul className="mt-2 space-y-1">
                {paidRsvps.map((r) => (
                  <li key={r.id} className="text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => setRsvpId(r.id)}
                      className="underline hover:text-white"
                    >
                      {getEventName(r.eventId)}
                      {r.ticketTier ? ` — ${r.ticketTier}` : ''}
                      {r.amount ? ` (${formatMoney(r.amount, r.currency || 'USD')})` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="askingPrice" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Asking price (USD)
            </label>
            <input
              id="askingPrice"
              type="number"
              min="1"
              step="0.01"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              placeholder="1200"
              required
              className="w-full bg-white/[0.06] border border-white/[0.1] text-white rounded-lg px-3 py-2 text-sm focus:border-white/30 outline-none"
            />
            {askingPrice && Number.isFinite(parseFloat(askingPrice)) && parseFloat(askingPrice) > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                You will receive approximately{' '}
                <strong className="text-slate-300">
                  {formatMoney(parseFloat(askingPrice) * 0.9, 'USD')}
                </strong>{' '}
                after the 10% platform fee.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Transferable via organizer, includes VIP reception, etc."
              className="w-full bg-white/[0.06] border border-white/[0.1] text-white rounded-lg px-3 py-2 text-sm focus:border-white/30 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">{notes.length}/2000</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 text-sm px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all font-semibold disabled:opacity-50 disabled:cursor-wait"
            >
              {submitting ? 'Listing…' : 'Create listing'}
            </button>
            <Link
              href="/ticket-resale"
              className="text-sm px-4 py-2.5 rounded-lg bg-white/[0.06] text-slate-300 border border-white/[0.1] hover:border-white/[0.2] transition-all"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewListingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-4 lg:p-8 max-w-[720px] mx-auto">
          <div className="card p-10 animate-pulse text-center text-slate-500 text-sm">
            Loading…
          </div>
        </div>
      }
    >
      <NewListingInner />
    </Suspense>
  );
}
