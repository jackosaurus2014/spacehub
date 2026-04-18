'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from '@/lib/toast';
import { sanitizeRenderedMarkdown } from '@/lib/sanitize';
import { trackGA4Event } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BoardPrepSection {
  id: string;
  title: string;
  content: string;
}

interface BoardPrepResult {
  title: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  executiveSummary: string;
  sections: BoardPrepSection[];
}

// ---------------------------------------------------------------------------
// Simple markdown renderer (matches reports/page.tsx pattern)
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4 class="text-lg font-semibold text-white mt-6 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-xl font-semibold text-white mt-6 mb-3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-2xl font-bold text-white mt-8 mb-4">$1</h2>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-white/10 pl-4 my-3 text-slate-400 italic">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="border-white/[0.06] my-6" />')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-slate-300 list-decimal">$1</li>');

  html = html.replace(
    /(<li class="ml-4 text-slate-300">[\s\S]*?<\/li>(\n)?)+/g,
    (match) => `<ul class="list-disc space-y-1 my-3">${match}</ul>`
  );
  html = html.replace(
    /(<li class="ml-4 text-slate-300 list-decimal">[\s\S]*?<\/li>(\n)?)+/g,
    (match) => `<ol class="list-decimal space-y-1 my-3 ml-4">${match}</ol>`
  );

  html = html
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('</') || trimmed.startsWith('<li')) {
        return line;
      }
      return `<p class="text-slate-300 mb-3">${trimmed}</p>`;
    })
    .join('\n');

  return html;
}

// ---------------------------------------------------------------------------
// Period options
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days (Quarterly)' },
  { value: 180, label: '180 days (Semi-annual)' },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function BoardPrepReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [companySlug, setCompanySlug] = useState('');
  const [periodDays, setPeriodDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BoardPrepResult | null>(null);

  // Redirect unauthenticated users
  if (status === 'unauthenticated') {
    router.push('/login?callbackUrl=/reports/board-prep');
    return null;
  }

  async function handleGenerate() {
    const slug = companySlug.trim().toLowerCase();
    if (!slug) {
      toast.error('Please enter a company slug');
      return;
    }

    setLoading(true);
    setReport(null);

    try {
      const res = await fetch('/api/reports/board-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companySlug: slug, periodDays }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setReport(data);
      trackGA4Event('board_prep_generated', { company_slug: slug });
      toast.success('Board briefing generated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate board briefing');
    } finally {
      setLoading(false);
    }
  }

  function formatPeriodDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12 max-w-5xl mx-auto">
      <AnimatedPageHeader
        title="Board Prep Report"
        subtitle="Generate an AI-powered quarterly board briefing with market intelligence, competitive analysis, and strategic recommendations."
        breadcrumb="Intelligence -> Reports -> Board Prep"
        accentColor="purple"
      />

      {/* --- Input form --- */}
      <div className="card p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="company-slug" className="block text-sm font-medium text-slate-300 mb-2">
              Company Slug
            </label>
            <input
              id="company-slug"
              type="text"
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleGenerate(); }}
              placeholder="e.g., spacex"
              disabled={loading}
              className="w-full rounded-lg bg-white/[0.06] border border-white/10 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter the URL slug of the company.
            </p>
          </div>
          <div>
            <label htmlFor="period-days" className="block text-sm font-medium text-slate-300 mb-2">
              Reporting Period
            </label>
            <select
              id="period-days"
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              disabled={loading}
              className="w-full rounded-lg bg-white/[0.06] border border-white/10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 disabled:opacity-50"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              How far back to analyze data.
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !companySlug.trim()}
          className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Board Briefing'}
        </button>
      </div>

      {/* --- Loading state --- */}
      {loading && (
        <div className="card p-5 flex flex-col items-center justify-center py-16 gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-slate-300 text-lg">Generating quarterly board briefing...</p>
          <p className="text-slate-500 text-sm">Analyzing market data, regulatory changes, competitive landscape, and company performance</p>
        </div>
      )}

      {/* --- Results --- */}
      {report && !loading && (
        <div className="space-y-6">
          {/* Title & Period */}
          <div className="card p-5">
            <h2 className="text-2xl font-bold text-white">{report.title}</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-400">
              {report.periodStart && report.periodEnd && (
                <span>
                  Period: {formatPeriodDate(report.periodStart)} &mdash; {formatPeriodDate(report.periodEnd)}
                </span>
              )}
              {report.generatedAt && (
                <span>Generated: {formatPeriodDate(report.generatedAt)}</span>
              )}
            </div>
          </div>

          {/* Executive Summary (prominent) */}
          {report.executiveSummary && (
            <div className="card p-5 border border-purple-500/20 bg-purple-500/[0.03]">
              <h3 className="text-xl font-semibold text-purple-400 mb-4">Executive Summary</h3>
              <div
                className="prose prose-invert max-w-none text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeRenderedMarkdown(renderMarkdown(report.executiveSummary)) }}
              />
            </div>
          )}

          {/* Report Sections */}
          {report.sections?.map((section) => (
            <div key={section.id} className="card p-5">
              <h3 className="text-xl font-semibold text-white mb-4">{section.title}</h3>
              <div
                className="prose prose-invert max-w-none text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeRenderedMarkdown(renderMarkdown(section.content)) }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
