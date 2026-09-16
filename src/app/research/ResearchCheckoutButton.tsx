'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/lib/toast';

/**
 * The query parameter that carries "this person came here to buy" across a
 * sign-in round trip.
 *
 * Why it exists: until 2026-09-16 a signed-out visitor who pressed Subscribe
 * got a toast reading "Sign in first" and nothing else — no redirect, no return
 * path, the URL unchanged. That is every cold buyer, and it was the whole
 * funnel. The button now sends them to /login with a returnTo that comes back
 * to THIS page with the intent still attached, and the effect below resumes
 * checkout the moment the session resolves.
 *
 * The server gate is untouched and stays the real one: POST /api/stripe/checkout
 * answers 401 to an unauthenticated request, re-checks the flag, the interval
 * and the configured price. This is a convenience, never the gate.
 */
export const RESEARCH_CHECKOUT_PARAM = 'checkout';
export const RESEARCH_CHECKOUT_VALUE = 'research';

/** Where a signed-out buyer is sent, with the buy intent preserved. */
export const RESEARCH_SIGN_IN_HREF = `/login?returnTo=${encodeURIComponent(
  `/research?${RESEARCH_CHECKOUT_PARAM}=${RESEARCH_CHECKOUT_VALUE}`
)}`;

export default function ResearchCheckoutButton({
  priceYearly,
  totalSeats,
  /**
   * Only ONE button on the page may resume a pending checkout, or a returning
   * buyer would fire two Stripe sessions. The hero button owns it.
   */
  resumeAfterSignIn = false,
  label,
}: {
  priceYearly: number;
  totalSeats: number;
  resumeAfterSignIn?: boolean;
  label?: string;
}) {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);
  const resumed = useRef(false);

  const startCheckout = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'research', interval: 'year' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // The session lapsed between render and click. Same round trip.
        window.location.href = RESEARCH_SIGN_IN_HREF;
        return;
      }
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
  }, []);

  const start = useCallback(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      setBusy(true);
      toast.info('Taking you to sign-in — we will bring you straight back to checkout.');
      window.location.href = RESEARCH_SIGN_IN_HREF;
      return;
    }
    void startCheckout();
  }, [session, status, startCheckout]);

  // Resume the interrupted purchase. Reading window.location rather than
  // useSearchParams keeps this component out of the Suspense requirement that
  // the hook imposes on anything rendered during prerender.
  useEffect(() => {
    if (!resumeAfterSignIn || resumed.current) return;
    if (status !== 'authenticated' || !session?.user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(RESEARCH_CHECKOUT_PARAM) !== RESEARCH_CHECKOUT_VALUE) return;
    resumed.current = true;
    // Drop the parameter first so a refresh or a back button does not re-fire.
    params.delete(RESEARCH_CHECKOUT_PARAM);
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    void startCheckout();
  }, [resumeAfterSignIn, session, status, startCheckout]);

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
    >
      {busy
        ? 'Opening checkout…'
        : (label ?? `Subscribe — $${priceYearly.toLocaleString()}/year, ${totalSeats} seats`)}
    </button>
  );
}
