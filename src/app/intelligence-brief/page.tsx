'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import SocialShare from '@/components/ui/SocialShare';
import ExportPDFButton from '@/components/ui/ExportPDFButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { clientLogger } from '@/lib/client-logger';

type BriefType = 'weekly_intelligence' | 'economy' | 'hiring' | 'regulatory' | 'special';

interface PublishedBrief {
  id: string;
  slug: string;
  title: string;
  briefType: BriefType;
  summary: string;
  contentMd: string;
  publishedAt: string;
  sourceInsightId: string | null;
}

const TYPE_LABELS: Record<BriefType, string> = {
  weekly_intelligence: 'Weekly Intelligence',
  economy: 'State of the Economy',
  hiring: "Who's Hiring",
  regulatory: 'Regulatory Radar',
  special: 'Special Report',
};

const TYPE_FILTERS: Array<{ value: BriefType | 'all'; label: string }> = [
  { value: 'all', label: 'All Briefs' },
  { value: 'weekly_intelligence', label: 'Weekly Intelligence' },
  { value: 'economy', label: 'State of the Economy' },
  { value: 'hiring', label: "Who's Hiring" },
  { value: 'regulatory', label: 'Regulatory Radar' },
  { value: 'special', label: 'Special' },
];

const TYPE_BADGE_COLORS: Record<BriefType, string> = {
  weekly_intelligence: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20',
  economy: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  hiring: 'text-purple-300 bg-purple-500/10 border-purple-500/20',
  regulatory: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
  special: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function IntelligenceBriefPage() {
  const [briefs, setBriefs] = useState<PublishedBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [typeFilter, setTypeFilter] = useState<BriefType | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchBriefs = useCallback(async (type: BriefType | 'all') => {
    setLoading(true);
    setError(false);
    try {
      // Deep link from /reports: ?brief=<slug> selects that edition on first
      // load. The index lists the 100 newest, so ask for the same window
      // (the API caps at 100) whenever a deep link is present.
      const wantedSlug =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('brief') : null;
      const params = new URLSearchParams();
      if (type !== 'all') params.set('type', type);
      if (wantedSlug) params.set('limit', '100');
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/published-briefs${qs}`);
      if (!res.ok) throw new Error(`Failed to fetch briefs (${res.status})`);
      const data = await res.json();
      const list: PublishedBrief[] = data.briefs || [];
      setBriefs(list);
      setSelectedId((prev) => {
        if (list.some((b) => b.id === prev)) return prev;
        const hit = wantedSlug ? list.find((b) => b.slug === wantedSlug) : undefined;
        return hit?.id ?? list[0]?.id ?? null;
      });
    } catch (err) {
      clientLogger.error('Failed to fetch published briefs', { error: err instanceof Error ? err.message : String(err) });
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefs(typeFilter);
  }, [typeFilter, fetchBriefs]);

  const selected = briefs.find((b) => b.id === selectedId) || null;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <AnimatedPageHeader
              title="Intelligence Brief Hub"
              subtitle="Every SpaceNexus brief in one place — weekly intelligence roundups, the data-driven State of the Space Economy, and Who's Hiring in Space. Filterable, newest first."
              icon="📋"
              accentColor="cyan"
            />
          </div>
          <div className="flex items-center gap-2 mt-2 flex-shrink-0">
            <SocialShare
              title="Intelligence Brief Hub - SpaceNexus"
              description="Every SpaceNexus weekly brief — intelligence roundups, economy data, and hiring trends — in one place."
            />
            <ExportPDFButton className="no-print" />
          </div>
        </div>

        {/* Subscribe + cross-link to /briefs CTA */}
        <ScrollReveal delay={0.1}>
          <div className="bg-gradient-to-r from-white/5 to-purple-500/10 border border-white/10 rounded-xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Want this week's live numbers instead?</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                This hub is the published archive. For a real-time 7-day data digest (launches, news, funding), see the current{' '}
                <Link href="/intelligence-brief" className="text-cyan-400 hover:underline">Space Industry Brief</Link>.
              </p>
            </div>
            <Link href="/newsletter" className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
              Subscribe Free
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.13}>
          <p className="text-xs text-slate-500 mb-6">
            Weekly briefs were paused March–July 2026 and resumed in August 2026 on an automated weekly cadence.
            Historic editions from before the pause are preserved below.
          </p>
        </ScrollReveal>

        {/* Type filter tabs */}
        <ScrollReveal delay={0.15}>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  typeFilter === f.value
                    ? 'bg-white/10 text-white/90 border border-white/10'
                    : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {loading && (
          <div className="space-y-3 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="card p-8 text-center mb-8">
            <p className="text-sm text-slate-400">Couldn't load briefs right now. Please try again shortly.</p>
          </div>
        )}

        {!loading && !error && briefs.length === 0 && (
          <div className="card p-8 text-center mb-8">
            <p className="text-sm text-slate-400">
              No {typeFilter === 'all' ? '' : `${TYPE_LABELS[typeFilter as BriefType]} `}briefs published yet. Check back soon —
              new editions land automatically every week.
            </p>
          </div>
        )}

        {!loading && !error && briefs.length > 0 && (
          <>
            {/* Brief Selector */}
            <ScrollReveal delay={0.17}>
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {briefs.map((brief) => (
                  <button
                    key={brief.id}
                    onClick={() => setSelectedId(brief.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedId === brief.id
                        ? 'bg-white/10 text-white/90 border border-white/10'
                        : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {formatDate(brief.publishedAt)}
                  </button>
                ))}
              </div>
            </ScrollReveal>

            {/* Selected Brief */}
            {selected && (
              <div key={selected.id}>
                <ScrollReveal delay={0.2}>
                  <div className="mb-4 flex items-center gap-3 flex-wrap">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${TYPE_BADGE_COLORS[selected.briefType]}`}>
                      {TYPE_LABELS[selected.briefType]}
                    </span>
                    <span className="text-sm text-slate-500">{formatDate(selected.publishedAt)}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{selected.title}</h2>
                  <p className="text-sm text-white/70 leading-relaxed mb-6">{selected.summary}</p>
                </ScrollReveal>

                <ScrollReveal delay={0.25}>
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 mb-8">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ children }) => <h2 className="text-xl font-bold text-white mt-8 mb-3 first:mt-0">{children}</h2>,
                        h2: ({ children }) => <h2 className="text-xl font-bold text-white mt-8 mb-3 first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-6 mb-2">{children}</h3>,
                        p: ({ children }) => <p className="text-white/70 leading-relaxed mb-4">{children}</p>,
                        a: ({ href, children }) => <a href={href} className="text-cyan-400 hover:text-cyan-300 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 text-white/70 mb-4">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 text-white/70 mb-4">{children}</ol>,
                        li: ({ children }) => <li className="text-white/70">{children}</li>,
                        strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="text-white/90">{children}</em>,
                        hr: () => <hr className="border-white/[0.08] my-6" />,
                        table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse">{children}</table></div>,
                        th: ({ children }) => <th className="border border-white/[0.1] px-3 py-2 bg-white/[0.04] text-left text-white text-sm font-semibold">{children}</th>,
                        td: ({ children }) => <td className="border border-white/[0.08] px-3 py-2 text-white/70 text-sm">{children}</td>,
                      }}
                    >
                      {selected.contentMd}
                    </ReactMarkdown>
                  </div>
                </ScrollReveal>
              </div>
            )}
          </>
        )}

        {/* Related Links */}
        <ScrollReveal delay={0.6}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Space History', href: '/history', icon: '⏳' },
              { label: 'News Feed', href: '/news', icon: '📰' },
              { label: 'Funding Tracker', href: '/funding-tracker', icon: '💰' },
              { label: 'Executive Moves', href: '/executive-moves', icon: '👤' },
            ].map((link) => (
              <Link key={link.href} href={link.href}
                className="flex items-center gap-2 p-3 card hover:border-white/10 transition-colors text-sm text-white/70 hover:text-white">
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['intelligence-brief']} />
      </div>
    </div>
  );
}
