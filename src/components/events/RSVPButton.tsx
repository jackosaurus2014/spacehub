'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/toast';

export type RSVPStatus = 'going' | 'maybe' | 'not_going' | 'waitlist';

export interface PaidTier {
  tier: string;
  amount: number; // amount in smallest currency unit (cents)
  currency?: string; // ISO 4217, defaults USD
  label?: string;
  description?: string;
}

export interface RSVPButtonProps {
  eventId: string;
  eventName: string;
  eventDate?: string;
  paidTiers?: PaidTier[];
  initialStatus?: RSVPStatus | null;
  size?: 'sm' | 'md';
  /** When true, button label is more compact ("RSVP" only). */
  compact?: boolean;
  className?: string;
}

const STATUS_LABELS: Record<RSVPStatus, string> = {
  going: 'Going',
  maybe: 'Maybe',
  not_going: 'Not Going',
  waitlist: 'Waitlist',
};

const STATUS_EMOJI: Record<RSVPStatus, string> = {
  going: '✓',
  maybe: '?',
  not_going: '✕',
  waitlist: '⌛',
};

export default function RSVPButton({
  eventId,
  eventName,
  paidTiers,
  initialStatus = null,
  size = 'sm',
  compact = false,
  className = '',
}: RSVPButtonProps) {
  const [status, setStatus] = useState<RSVPStatus | null>(initialStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showTierPicker, setShowTierPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hasPaidTiers = !!paidTiers && paidTiers.length > 0;

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowTierPicker(false);
      }
    }
    if (isOpen || showTierPicker) {
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }
  }, [isOpen, showTierPicker]);

  const submit = useCallback(
    async (
      next: RSVPStatus,
      paidTier?: PaidTier,
    ) => {
      if (isPending) return;
      const previous = status;

      // Optimistic update
      setStatus(next);
      setIsPending(true);

      try {
        const res = await fetch('/api/events/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            status: next,
            ticketTier: paidTier?.tier,
            eventName,
            ...(paidTier
              ? {
                  paidTier: {
                    tier: paidTier.tier,
                    amount: paidTier.amount,
                    currency: paidTier.currency || 'USD',
                  },
                }
              : {}),
          }),
        });

        const data: {
          success?: boolean;
          data?: { checkoutUrl?: string };
          error?: { message?: string } | string;
        } = await res.json().catch(() => ({}));

        if (!res.ok || data.success === false) {
          // Rollback
          setStatus(previous);
          const msg =
            (typeof data.error === 'string'
              ? data.error
              : data.error?.message) || 'Could not save RSVP';
          toast.error(msg);
          return;
        }

        // Paid path: redirect to Stripe
        const checkoutUrl = data.data?.checkoutUrl;
        if (paidTier && checkoutUrl) {
          toast.info('Redirecting to checkout…');
          window.location.href = checkoutUrl;
          return;
        }

        if (next === 'going') toast.success(`You're going to ${eventName}!`);
        else if (next === 'maybe') toast.info('Marked as maybe');
        else if (next === 'waitlist') toast.info('Added to waitlist');
        else toast.info('RSVP updated');
      } catch (err) {
        setStatus(previous);
        toast.error(
          err instanceof Error ? err.message : 'Network error saving RSVP'
        );
      } finally {
        setIsPending(false);
        setIsOpen(false);
        setShowTierPicker(false);
      }
    },
    [eventId, eventName, isPending, status]
  );

  const handleGoingClick = useCallback(() => {
    if (hasPaidTiers) {
      setShowTierPicker(true);
      setIsOpen(false);
      return;
    }
    void submit('going');
  }, [hasPaidTiers, submit]);

  const sizeClasses =
    size === 'md'
      ? 'px-4 py-2 text-sm'
      : 'px-3 py-1.5 text-xs';

  const isGoing = status === 'going';
  const buttonLabel = compact
    ? status
      ? `${STATUS_EMOJI[status]} ${STATUS_LABELS[status]}`
      : 'RSVP'
    : status
      ? `${STATUS_EMOJI[status]} ${STATUS_LABELS[status]}`
      : 'RSVP';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
    >
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          setShowTierPicker(false);
        }}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1.5 rounded-lg border transition-all whitespace-nowrap font-medium ${sizeClasses} ${
          isGoing
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
            : status
              ? 'bg-white/[0.08] text-slate-200 border-white/[0.1] hover:border-white/[0.2]'
              : 'bg-white/[0.06] text-slate-300 border-white/[0.1] hover:bg-white/[0.1] hover:text-white'
        } ${isPending ? 'opacity-60 cursor-wait' : ''}`}
      >
        <span>{buttonLabel}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Status dropdown */}
      {isOpen && !showTierPicker && (
        <div
          role="menu"
          className="absolute z-50 right-0 top-full mt-1 min-w-[180px] rounded-lg border border-white/[0.1] bg-black/95 backdrop-blur shadow-xl py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleGoingClick}
            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors flex items-center gap-2"
          >
            <span>✓</span>
            <span>Going</span>
            {hasPaidTiers && (
              <span className="ml-auto text-[10px] text-slate-500">
                pick tier →
              </span>
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => submit('maybe')}
            className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.06] transition-colors flex items-center gap-2"
          >
            <span>?</span>
            <span>Maybe</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => submit('not_going')}
            className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.06] transition-colors flex items-center gap-2"
          >
            <span>✕</span>
            <span>Not Going</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => submit('waitlist')}
            className="w-full text-left px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center gap-2"
          >
            <span>⌛</span>
            <span>Join Waitlist</span>
          </button>
        </div>
      )}

      {/* Paid tier picker */}
      {showTierPicker && hasPaidTiers && (
        <div
          role="menu"
          className="absolute z-50 right-0 top-full mt-1 min-w-[260px] rounded-lg border border-white/[0.1] bg-black/95 backdrop-blur shadow-xl py-1"
        >
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
            Select Ticket Tier
          </div>
          {paidTiers!.map((tier) => {
            const currency = (tier.currency || 'USD').toUpperCase();
            const formatted = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency,
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }).format(tier.amount / 100);
            return (
              <button
                key={tier.tier}
                type="button"
                role="menuitem"
                onClick={() => submit('going', tier)}
                className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-200">
                    {tier.label || tier.tier}
                  </span>
                  <span className="text-xs font-semibold text-emerald-300">
                    {formatted}
                  </span>
                </div>
                {tier.description && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {tier.description}
                  </div>
                )}
              </button>
            );
          })}
          <div className="border-t border-white/[0.06] mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowTierPicker(false);
                setIsOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-[11px] text-slate-500 hover:text-slate-300"
            >
              ← back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
