'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from '@/lib/toast';

// ============================================================
// Types
// ============================================================

interface CompanyNews {
  companyId: string;
  companyName: string;
  companySlug: string;
  articles: {
    id: string;
    title: string;
    summary: string | null;
    source: string;
    url: string;
    publishedAt: string;
  }[];
}

interface PipelineSnapshot {
  rfqs: { open: number; evaluating: number; awarded: number; cancelled: number; total: number };
  proposals: { submitted: number; shortlisted: number; awarded: number; rejected: number; total: number };
}

interface RegulatoryDeadline {
  id: string;
  title: string;
  agency: string;
  category: string;
  impactSeverity: string | null;
  commentDeadline: string;
  effectiveDate: string | null;
  status: string;
  sourceUrl: string;
  daysUntilDeadline: number;
}

interface CompanyEventItem {
  id: string;
  companyId: string;
  companyName: string;
  date: string;
  type: string;
  title: string;
  description: string | null;
  importance: number;
}

interface PendingAlert {
  id: string;
  title: string;
  message: string;
  channel: string;
  source: string;
  createdAt: string;
}

interface BriefingData {
  generatedAt: string;
  userName: string | null;
  myCompany: { id: string; name: string; slug: string } | null;
  myCompanyNews: CompanyNews | null;
  competitorWatch: CompanyNews[];
  pipeline: PipelineSnapshot;
  regulatoryDeadlines: RegulatoryDeadline[];
  recentActivity: CompanyEventItem[];
  marketPulse: {
    latestNews: { title: string; source: string; url: string; publishedAt: string } | null;
    nextLaunch: { name: string; date: string; agency: string | null; location: string | null; status: string | null } | null;
    activeSatellites: number;
  };
  pendingAlerts: PendingAlert[];
}

// ============================================================
// Helpers
// ============================================================

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function severityColor(severity: string | null): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

function eventTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    contract_win: '\u{1F3C6}',
    funding: '\u{1F4B0}',
    acquisition: '\u{1F91D}',
    ipo: '\u{1F4C8}',
    first_launch: '\u{1F680}',
    milestone: '\u{2B50}',
    product_launch: '\u{1F4E6}',
    partnership: '\u{1F517}',
    regulatory: '\u{1F4DC}',
    founding: '\u{1F3D7}',
  };
  return icons[type] || '\u{1F4CC}';
}

function deadlineUrgencyClass(days: number): string {
  if (days <= 3) return 'text-red-400';
  if (days <= 7) return 'text-orange-400';
  if (days <= 14) return 'text-yellow-400';
  return 'text-slate-400';
}

// ============================================================
// Sub-components
// ============================================================

function PendingAlertsBar({ alerts }: { alerts: PendingAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="card p-4 border border-amber-500/30 bg-amber-500/5 mb-8">
      <div className="flex items-center gap-3">
        <span className="text-lg">{'\u{1F514}'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-300">
            {alerts.length} unread alert{alerts.length !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-slate-400 truncate">{alerts[0].title}</p>
        </div>
        <Link
          href="/alerts?tab=notifications"
          className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded transition-colors"
        >
          View All
        </Link>
      </div>
    </div>
  );
}

function MarketPulseCards({ pulse }: { pulse: BriefingData['marketPulse'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="card p-5">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Latest News</p>
        {pulse.latestNews ? (
          <>
            <a
              href={pulse.latestNews.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-200 hover:text-white transition-colors line-clamp-2"
            >
              {pulse.latestNews.title}
            </a>
            <p className="text-xs text-slate-500 mt-1.5">
              {pulse.latestNews.source} &middot; {formatRelativeTime(pulse.latestNews.publishedAt)}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">No recent news</p>
        )}
      </div>

      <div className="card p-5">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Next Launch</p>
        {pulse.nextLaunch ? (
          <>
            <p className="text-sm font-medium text-slate-200 line-clamp-2">{pulse.nextLaunch.name}</p>
            <p className="text-xs text-slate-500 mt-1.5">
              {pulse.nextLaunch.agency || 'TBD'} &middot; {formatDate(pulse.nextLaunch.date)}
              {pulse.nextLaunch.location ? ` &middot; ${pulse.nextLaunch.location}` : ''}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">No upcoming launches</p>
        )}
      </div>

      <div className="card p-5">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Active Satellites</p>
        <p className="text-2xl font-semibold text-slate-200">{pulse.activeSatellites.toLocaleString()}</p>
        <p className="text-xs text-slate-500 mt-1.5">Tracked assets</p>
      </div>
    </div>
  );
}

function MySignalsSection({ news }: { news: CompanyNews | null; companyName?: string }) {
  if (!news || news.articles.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">My Signals</h2>
        <p className="text-sm text-slate-500">
          No recent news about your company in the last 7 days.{' '}
          {!news && (
            <span>
              <Link href="/company-profiles" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Claim your company profile
              </Link>{' '}
              to see signals here.
            </span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">My Signals</h2>
        <Link
          href={`/company-profiles/${news.companySlug}`}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View Profile
        </Link>
      </div>
      <div className="space-y-3">
        {news.articles.slice(0, 5).map((article) => (
          <div key={article.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-300 hover:text-white transition-colors line-clamp-2"
            >
              {article.title}
            </a>
            <p className="text-xs text-slate-500 mt-1">
              {article.source} &middot; {formatRelativeTime(article.publishedAt)}
            </p>
          </div>
        ))}
        {news.articles.length > 5 && (
          <p className="text-xs text-slate-500">+{news.articles.length - 5} more articles</p>
        )}
      </div>
    </div>
  );
}

function CompetitorWatchSection({ competitors }: { competitors: CompanyNews[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (competitors.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Competitor Watch</h2>
        <p className="text-sm text-slate-500">
          No competitors on your watchlist.{' '}
          <Link href="/company-profiles" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Add companies to your watchlist
          </Link>{' '}
          to track them here.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Competitor Watch</h2>
      <div className="space-y-4">
        {competitors.map((competitor) => (
          <div key={competitor.companyId} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
            <button
              onClick={() =>
                setExpandedId(expandedId === competitor.companyId ? null : competitor.companyId)
              }
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <Link
                  href={`/company-profiles/${competitor.companySlug}`}
                  className="text-sm font-medium text-slate-200 hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {competitor.companyName}
                </Link>
                <span className="text-xs bg-white/[0.06] text-slate-400 px-2 py-0.5 rounded">
                  {competitor.articles.length} signal{competitor.articles.length !== 1 ? 's' : ''}
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${
                  expandedId === competitor.companyId ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedId === competitor.companyId && (
              <div className="mt-3 space-y-2 pl-4 border-l border-white/10">
                {competitor.articles.slice(0, 5).map((article) => (
                  <div key={article.id}>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-400 hover:text-slate-200 transition-colors line-clamp-1"
                    >
                      {article.title}
                    </a>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {article.source} &middot; {formatRelativeTime(article.publishedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineSnapshotSection({ pipeline }: { pipeline: PipelineSnapshot }) {
  const { rfqs, proposals } = pipeline;
  const hasData = rfqs.total > 0 || proposals.total > 0;

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Pipeline Snapshot</h2>
      {!hasData ? (
        <p className="text-sm text-slate-500">
          No active RFQs or proposals.{' '}
          <Link href="/marketplace/rfq/new" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Create an RFQ
          </Link>{' '}
          or{' '}
          <Link href="/marketplace/search" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            browse the marketplace
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* RFQ stats */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">My RFQs</p>
            <div className="space-y-2">
              <StatRow label="Open" value={rfqs.open} color="text-cyan-400" />
              <StatRow label="Evaluating" value={rfqs.evaluating} color="text-yellow-400" />
              <StatRow label="Awarded" value={rfqs.awarded} color="text-green-400" />
              <StatRow label="Cancelled" value={rfqs.cancelled} color="text-slate-500" />
            </div>
            <div className="mt-2 pt-2 border-t border-white/5">
              <StatRow label="Total" value={rfqs.total} color="text-slate-300" bold />
            </div>
          </div>

          {/* Proposal stats */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Our Proposals</p>
            <div className="space-y-2">
              <StatRow label="Submitted" value={proposals.submitted} color="text-cyan-400" />
              <StatRow label="Shortlisted" value={proposals.shortlisted} color="text-yellow-400" />
              <StatRow label="Awarded" value={proposals.awarded} color="text-green-400" />
              <StatRow label="Rejected" value={proposals.rejected} color="text-red-400" />
            </div>
            <div className="mt-2 pt-2 border-t border-white/5">
              <StatRow label="Total" value={proposals.total} color="text-slate-300" bold />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: number;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-medium text-slate-300' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-semibold' : 'font-medium'} ${color}`}>{value}</span>
    </div>
  );
}

function RegulatoryDeadlinesSection({ deadlines }: { deadlines: RegulatoryDeadline[] }) {
  if (deadlines.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Regulatory Deadlines</h2>
        <p className="text-sm text-slate-500">No upcoming regulatory deadlines in the next 30 days.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Regulatory Deadlines</h2>
        <Link
          href="/compliance"
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View All
        </Link>
      </div>
      <div className="space-y-3">
        {deadlines.map((reg) => (
          <div key={reg.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <a
                  href={reg.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-300 hover:text-white transition-colors line-clamp-2"
                >
                  {reg.title}
                </a>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs bg-white/[0.06] text-slate-400 px-1.5 py-0.5 rounded">
                    {reg.agency}
                  </span>
                  {reg.impactSeverity && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded border ${severityColor(reg.impactSeverity)}`}
                    >
                      {reg.impactSeverity}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-medium ${deadlineUrgencyClass(reg.daysUntilDeadline)}`}>
                  {reg.daysUntilDeadline}d
                </p>
                <p className="text-xs text-slate-600">{formatDate(reg.commentDeadline)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivitySection({ events }: { events: CompanyEventItem[] }) {
  if (events.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Recent Activity</h2>
        <p className="text-sm text-slate-500">No recent company events from your watchlist.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Recent Activity</h2>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-white/10" />

        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="relative pl-8">
              {/* Timeline dot */}
              <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-500" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm">{eventTypeIcon(event.type)}</span>
                  <span className="text-sm font-medium text-slate-300">{event.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyan-400">{event.companyName}</span>
                  <span className="text-xs text-slate-600">&middot;</span>
                  <span className="text-xs text-slate-500">{formatRelativeTime(event.date)}</span>
                  <span className="text-xs text-slate-600">&middot;</span>
                  <span className="text-xs text-slate-600 capitalize">{event.type.replace(/_/g, ' ')}</span>
                </div>
                {event.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function ExecutiveCommandCenterPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      return;
    }

    const fetchBriefing = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/executive/briefing');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const json = await res.json();
        setBriefing(json.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load briefing';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [sessionStatus]);

  // ---- Unauthenticated ----
  if (sessionStatus === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <AnimatedPageHeader
            title="Executive Command Center"
            subtitle="Sign in to access your personalized morning briefing."
            accentColor="cyan"
          />
          <div className="card p-8 text-center">
            <p className="text-slate-400 mb-6">
              Get a consolidated view of company signals, competitor intelligence, pipeline status,
              regulatory deadlines, and market pulse -- all in one place.
            </p>
            <Link
              href="/login"
              className="inline-block bg-white hover:bg-slate-100 text-slate-900 font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---- Loading ----
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <AnimatedPageHeader
            title="Executive Command Center"
            subtitle="Preparing your morning briefing..."
            accentColor="cyan"
          />
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </main>
    );
  }

  // ---- Error ----
  if (error || !briefing) {
    return (
      <main className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <AnimatedPageHeader
            title="Executive Command Center"
            subtitle="Your personalized morning briefing"
            accentColor="cyan"
          />
          <div className="card p-8 text-center">
            <p className="text-slate-400 mb-4">{error || 'Unable to load briefing data.'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-white hover:bg-slate-100 text-slate-900 font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ---- Greeting ----
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = briefing.userName || session?.user?.name || 'Commander';

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <AnimatedPageHeader
          title="Executive Command Center"
          subtitle={`${greeting}, ${displayName}. Here is your briefing for ${formatDate(briefing.generatedAt)}.`}
          breadcrumb="Dashboard"
          accentColor="cyan"
        />

        {/* Pending alerts banner */}
        <PendingAlertsBar alerts={briefing.pendingAlerts} />

        {/* Market Pulse */}
        <ScrollReveal>
          <MarketPulseCards pulse={briefing.marketPulse} />
        </ScrollReveal>

        {/* Two-column layout for signals + pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ScrollReveal delay={0.05}>
            <MySignalsSection news={briefing.myCompanyNews} />
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <PipelineSnapshotSection pipeline={briefing.pipeline} />
          </ScrollReveal>
        </div>

        {/* Two-column layout for competitors + regulatory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ScrollReveal delay={0.15}>
            <CompetitorWatchSection competitors={briefing.competitorWatch} />
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <RegulatoryDeadlinesSection deadlines={briefing.regulatoryDeadlines} />
          </ScrollReveal>
        </div>

        {/* Full-width recent activity timeline */}
        <ScrollReveal delay={0.25}>
          <RecentActivitySection events={briefing.recentActivity} />
        </ScrollReveal>

        {/* Footer meta */}
        <div className="mt-8 text-center text-xs text-slate-600">
          Briefing generated at{' '}
          {new Date(briefing.generatedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {' '}&middot;{' '}
          <button
            onClick={() => window.location.reload()}
            className="text-slate-500 hover:text-slate-300 transition-colors underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </main>
  );
}
