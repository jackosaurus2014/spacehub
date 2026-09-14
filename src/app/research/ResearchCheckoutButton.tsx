'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

/**
 * Starts annual Research checkout.
 *
 * This button is only ever rendered by a server component that has already
 * checked availability, and the checkout route independently re-checks the
 * flag, the interval and the configured price. The client is a convenience,
 * never the gate.
 */
export default function ResearchCheckoutButton({
  priceYearly,
  totalSeats,
}: {
  priceYearly: number;
  totalSeats: number;
}) {
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!session?.user) {
      toast.info('Sign in first — the subscription attaches to your account.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'research', interval: 'year' }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message || data.error || 'Could not start checkout.');
        return;
      }
      const url = data.data?.url;
      if (url) window.location.href = url;
      else toast.error('Could not start checkout. Please try again.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
    >
      {busy
        ? 'Opening checkout…'
        : `Subscribe — $${priceYearly.toLocaleString()}/year, ${totalSeats} seats`}
    </button>
  );
}
