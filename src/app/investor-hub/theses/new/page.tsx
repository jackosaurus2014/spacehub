'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';
import { INVESTOR_HUB_STAGES } from '@/lib/validations';

export const dynamic = 'force-dynamic';

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  growth: 'Growth',
  late_stage: 'Late Stage',
};

export default function NewThesisPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [sectorsRaw, setSectorsRaw] = useState('');
  const [stagePreference, setStagePreference] = useState('');
  const [geography, setGeography] = useState('');
  const [publish, setPublish] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sectors = sectorsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (sectors.length === 0) {
        setError('Please provide at least one sector.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/investor-hub/theses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary,
          bodyMd,
          sectors,
          stagePreference: stagePreference || null,
          geography: geography || null,
          publish,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        setError('You must be logged in to create a thesis.');
        return;
      }
      if (res.status === 403) {
        setError(
          json?.error?.message ??
            'Only verified investors can publish theses.'
        );
        return;
      }
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to create thesis.');
        return;
      }
      const slug = json?.data?.thesis?.slug;
      if (slug) {
        router.push(`/investor-hub/theses/${slug}`);
      } else {
        router.push('/investor-hub/theses');
      }
    } catch (err) {
      clientLogger.error('create thesis failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-4">
          <Link href="/investor-hub" className="hover:text-white">
            Investor Hub
          </Link>{' '}
          &rsaquo;{' '}
          <Link href="/investor-hub/theses" className="hover:text-white">
            Theses
          </Link>{' '}
          &rsaquo; New
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Publish a Thesis</h1>
        <p className="text-white/60 mb-8 text-sm">
          Long-form theses are limited to verified investors. Markdown is
          supported in the body.
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-4 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
              Summary (1-3 sentences)
            </label>
            <textarea
              required
              minLength={20}
              maxLength={1000}
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
              Body (Markdown)
            </label>
            <textarea
              required
              minLength={50}
              maxLength={50000}
              rows={16}
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              placeholder="## Thesis\n\n## Why now?\n\n## Risks\n\n## What I'd want to see"
              className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Sectors (comma-separated)
              </label>
              <input
                type="text"
                required
                value={sectorsRaw}
                onChange={(e) => setSectorsRaw(e.target.value)}
                placeholder="launch, in-space-manufacturing"
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Stage preference
              </label>
              <select
                value={stagePreference}
                onChange={(e) => setStagePreference(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white h-10"
              >
                <option value="">No preference</option>
                {INVESTOR_HUB_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Geography
              </label>
              <input
                type="text"
                value={geography}
                onChange={(e) => setGeography(e.target.value)}
                placeholder="US, Europe..."
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="rounded"
            />
            Publish immediately (uncheck to save as a draft)
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : publish ? 'Publish thesis' : 'Save draft'}
            </button>
            <Link
              href="/investor-hub/theses"
              className="text-white/60 hover:text-white text-sm"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
