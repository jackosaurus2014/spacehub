'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';
import {
  INVESTOR_HUB_STAGES,
  DEAL_MEMO_RECOMMENDATIONS,
  DEAL_MEMO_VISIBILITIES,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  growth: 'Growth',
  late_stage: 'Late Stage',
};

const VISIBILITY_LABELS: Record<string, string> = {
  public: 'Public (anyone can read)',
  logged_in: 'Logged-in members only',
  private: 'Private (only you)',
};

export default function NewDealMemoPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [dealStage, setDealStage] = useState<string>('seed');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [thesis, setThesis] = useState('');
  const [risks, setRisks] = useState('');
  const [recommendation, setRecommendation] = useState<string>('more_info');
  const [visibility, setVisibility] = useState<string>('logged_in');
  const [publish, setPublish] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const amtNum = investmentAmount ? Number(investmentAmount) : null;
      const payload = {
        companyName,
        companyId: companyId || null,
        dealStage,
        investmentAmount: amtNum && !Number.isNaN(amtNum) ? amtNum : null,
        currency: currency || 'USD',
        thesis,
        risks: risks || null,
        recommendation,
        visibility,
        publish,
      };

      const res = await fetch('/api/investor-hub/deal-memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        setError('You must be logged in to create a deal memo.');
        return;
      }
      if (res.status === 403) {
        setError(
          json?.error?.message ??
            'Only verified investors can publish non-private memos.'
        );
        return;
      }
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to create deal memo.');
        return;
      }
      const slug = json?.data?.memo?.slug;
      if (slug) {
        router.push(`/investor-hub/deal-memos/${slug}`);
      } else {
        router.push('/investor-hub/deal-memos');
      }
    } catch (err) {
      clientLogger.error('create deal memo failed', {
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
          <Link href="/investor-hub/deal-memos" className="hover:text-white">
            Deal Memos
          </Link>{' '}
          &rsaquo; New
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">New Deal Memo</h1>
        <p className="text-white/60 mb-8 text-sm">
          Write a short memo about a specific deal. Private memos can be kept
          for personal reference; public / member-visible memos require
          verified investor status.
        </p>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-4 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Company name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Company ID (optional)
              </label>
              <input
                type="text"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="CompanyProfile id"
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Stage
              </label>
              <select
                value={dealStage}
                onChange={(e) => setDealStage(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white h-10"
              >
                {INVESTOR_HUB_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Investment amount
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
              Thesis (Markdown)
            </label>
            <textarea
              required
              rows={10}
              minLength={20}
              maxLength={20000}
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
              Risks (Markdown, optional)
            </label>
            <textarea
              rows={6}
              maxLength={10000}
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
              className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Recommendation
              </label>
              <select
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white h-10"
              >
                {DEAL_MEMO_RECOMMENDATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-1">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-sm text-white h-10"
              >
                {DEAL_MEMO_VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {VISIBILITY_LABELS[v]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="rounded"
            />
            Publish now (uncheck to keep as draft)
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : publish ? 'Publish memo' : 'Save draft'}
            </button>
            <Link
              href="/investor-hub/deal-memos"
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
