'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';

interface Props {
  gigId: string;
  isActive: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  hasApplied: boolean;
}

export default function ApplyGigPanel({
  gigId,
  isActive,
  isOwner,
  isAuthenticated,
  hasApplied,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isActive) {
    return (
      <p className="text-sm text-slate-400">
        This gig is no longer accepting applications.
      </p>
    );
  }

  if (isOwner) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-300">
          You posted this gig. Manage it from your dashboard.
        </p>
        <Link
          href="/gig-work/my-gigs"
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          Manage my gigs
        </Link>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-300">
          Sign in to apply to this gig.
        </p>
        <Link
          href={`/auth/signin?callbackUrl=/gig-work/${gigId}`}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
        >
          Sign in to apply
        </Link>
      </div>
    );
  }

  if (hasApplied) {
    return (
      <p className="text-sm text-emerald-400">
        You have already applied to this gig. The employer will be in touch if you&apos;re a fit.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { coverNote };
      if (proposedRate.trim()) {
        const n = parseInt(proposedRate, 10);
        if (!Number.isNaN(n)) payload.proposedRate = n;
      }
      if (availableFrom.trim()) payload.availableFrom = availableFrom.trim();
      if (contactEmail.trim()) payload.contactEmail = contactEmail.trim();
      if (portfolioUrl.trim()) payload.portfolioUrl = portfolioUrl.trim();

      const res = await fetch(`/api/gig-work/${gigId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const message =
          data?.error?.message || 'Failed to submit application';
        setError(message);
        toast.error(message);
        return;
      }

      toast.success('Application submitted');
      setOpen(false);
      router.refresh();
    } catch (err) {
      clientLogger.error('Gig application failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Interested in this gig?</h3>
          <p className="text-sm text-slate-400 mt-1">
            Send the employer a short pitch and your availability.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
        >
          Apply now
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Cover note <span className="text-red-400">*</span>
        </label>
        <textarea
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          placeholder="Briefly introduce yourself, your relevant experience, and why you're a fit."
          className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Proposed rate (USD)
          </label>
          <input
            type="number"
            min={0}
            value={proposedRate}
            onChange={(e) => setProposedRate(e.target.value)}
            placeholder="e.g. 120"
            className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Available from
          </label>
          <input
            type="text"
            maxLength={100}
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            placeholder="e.g. Immediately, or May 1"
            className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Contact email
          </label>
          <input
            type="email"
            maxLength={255}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Portfolio URL
          </label>
          <input
            type="url"
            maxLength={500}
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/50"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={submitting}
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
