'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from '@/lib/toast';
import { sanitizeRenderedMarkdown } from '@/lib/sanitize';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DossierSection {
  id: string;
  title: string;
  content: string;
}

interface DossierResult {
  title: string;
  generatedAt: string;
  sections: DossierSection[];
  recommendation?: string;
  dataQuality?: string;
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
// Page component
// ---------------------------------------------------------------------------

export default function DossierReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [companySlug, setCompanySlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<DossierResult | null>(null);
  const [companyName, setCompanyName] = useState('');

  // Redirect unauthenticated users
  if (status === 'unauthenticated') {
    router.push('/login?callbackUrl=/reports/dossier');
    return null;
  }

  async function handleGenerate() {
    const slug = companySlug.trim().toLowerCase();
    if (!slug) {
      toast.error('Please enter a company slug');
      return;
    }

    setLoading(true);
    setDossier(null);

    try {
      const res = await fetch('/api/reports/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companySlug: slug }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setDossier(data.dossier);
      setCompanyName(data.company?.name || slug);
      toast.success('Dossier generated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate dossier');
    } finally {
      setLoading(false);
    }
  }

  // Find the executive summary section if present
  const execSummary = dossier?.sections?.find(
    (s) => s.id.includes('executive') || s.id.includes('exec-summary') || s.title.toLowerCase().includes('executive summary')
  );
  const otherSections = dossier?.sections?.filter((s) => s !== execSummary) || [];

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-12 max-w-5xl mx-auto">
      <AnimatedPageHeader
        title="Company Intelligence Dossier"
        subtitle="Generate a comprehensive AI-powered intelligence dossier on any space industry company."
        breadcrumb="Intelligence -> Reports -> Dossier"
        accentColor="cyan"
      />

      {/* --- Input form --- */}
      <div className="card p-5 mb-8">
        <label htmlFor="company-slug" className="block text-sm font-medium text-slate-300 mb-2">
          Company Slug
        </label>
        <div className="flex gap-3">
          <input
            id="company-slug"
            type="text"
            value={companySlug}
            onChange={(e) => setCompanySlug(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleGenerate(); }}
            placeholder="e.g., spacex"
            disabled={loading}
            className="flex-1 rounded-lg bg-white/[0.06] border border-white/10 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 disabled:opacity-50"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !companySlug.trim()}
            className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Generating...' : 'Generate Dossier'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Enter the URL slug of the company (as it appears on their profile page).
        </p>
      </div>

      {/* --- Loading state --- */}
      {loading && (
        <div className="card p-5 flex flex-col items-center justify-center py-16 gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-slate-300 text-lg">Generating intelligence dossier... this may take up to 2 minutes</p>
          <p className="text-slate-500 text-sm">Querying company data, financial records, contracts, and news coverage</p>
        </div>
      )}

      {/* --- Results --- */}
      {dossier && !loading && (
        <div className="space-y-6">
          {/* Title */}
          <div className="card p-5">
            <h2 className="text-2xl font-bold text-white">{dossier.title || `Intelligence Dossier: ${companyName}`}</h2>
            {dossier.generatedAt && (
              <p className="text-sm text-slate-500 mt-1">
                Generated {new Date(dossier.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Executive Summary (prominent) */}
          {execSummary && (
            <div className="card p-5 border border-cyan-500/20 bg-cyan-500/[0.03]">
              <h3 className="text-xl font-semibold text-cyan-400 mb-4">{execSummary.title}</h3>
              <div
                className="prose prose-invert max-w-none text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeRenderedMarkdown(renderMarkdown(execSummary.content)) }}
              />
            </div>
          )}

          {/* Recommendation & Data Quality (if present) */}
          {(dossier.recommendation || dossier.dataQuality) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dossier.recommendation && (
                <div className="card p-5 border border-purple-500/20 bg-purple-500/[0.03]">
                  <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2">Strategic Recommendation</h4>
                  <p className="text-slate-300 text-sm">{dossier.recommendation}</p>
                </div>
              )}
              {dossier.dataQuality && (
                <div className="card p-5 border border-amber-500/20 bg-amber-500/[0.03]">
                  <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Data Quality Assessment</h4>
                  <p className="text-slate-300 text-sm">{dossier.dataQuality}</p>
                </div>
              )}
            </div>
          )}

          {/* Report Sections */}
          {otherSections.map((section) => (
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
