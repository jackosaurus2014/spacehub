'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface SpeakingOpportunity {
  id: string;
  title: string;
  organization: string;
  conferenceName: string | null;
  topic: string;
  description: string;
  eventDate: string;
  submissionDeadline: string | null;
  location: string | null;
  isRemote: boolean;
  compensation: string | null;
  audienceSize: number | null;
  cfpUrl: string | null;
  contactEmail: string | null;
  contactName: string | null;
  tags: string[];
  status: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

type RemoteFilter = 'all' | 'remote' | 'in-person';

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ────────────────────────────────────────
// Page
// ────────────────────────────────────────

export default function SpeakingOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<SpeakingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [remoteFilter, setRemoteFilter] = useState<RemoteFilter>('all');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [upcomingDeadline, setUpcomingDeadline] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const [query, setQuery] = useState('');

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (remoteFilter === 'remote') params.set('remote', 'true');
      if (remoteFilter === 'in-person') params.set('remote', 'false');
      if (featuredOnly) params.set('featured', 'true');
      if (upcomingDeadline) params.set('upcomingDeadline', 'true');
      if (tagFilter.trim()) params.set('tag', tagFilter.trim().toLowerCase());
      if (query.trim()) params.set('q', query.trim());
      params.set('limit', '50');

      const res = await fetch(`/api/speaking?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Failed to load');
      }
      setOpportunities(json.data.opportunities || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load opportunities';
      setError(msg);
      clientLogger.error('Failed to load speaking opportunities', { error: msg });
    } finally {
      setLoading(false);
    }
  }, [remoteFilter, featuredOnly, upcomingDeadline, tagFilter, query]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const { featured, regular } = useMemo(() => {
    const feat: SpeakingOpportunity[] = [];
    const reg: SpeakingOpportunity[] = [];
    for (const op of opportunities) {
      if (op.featured) feat.push(op);
      else reg.push(op);
    }
    return { featured: feat, regular: reg };
  }, [opportunities]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((op) => op.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [opportunities]);

  const resetFilters = () => {
    setRemoteFilter('all');
    setFeaturedOnly(false);
    setUpcomingDeadline(false);
    setTagFilter('');
    setQuery('');
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <ScrollReveal>
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
                Speaking Opportunities
              </h1>
              <p className="text-star-300 max-w-2xl">
                Calls for papers, panel invitations, and keynote slots across the global
                space community. Submit your own to help other speakers find a stage.
              </p>
            </div>
            <Link
              href="/speaking/submit"
              className="btn-primary py-2.5 px-5 text-sm font-semibold whitespace-nowrap self-start md:self-auto"
            >
              Submit an Opportunity
            </Link>
          </div>
        </ScrollReveal>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <div className="relative flex-1">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, topic, description..."
                className="input w-full text-sm"
              />
            </div>
            <select
              value={remoteFilter}
              onChange={(e) => setRemoteFilter(e.target.value as RemoteFilter)}
              className="input text-sm md:w-40"
            >
              <option value="all">All Formats</option>
              <option value="remote">Remote</option>
              <option value="in-person">In-Person</option>
            </select>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="input text-sm md:w-48"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-star-200 cursor-pointer">
              <input
                type="checkbox"
                checked={featuredOnly}
                onChange={(e) => setFeaturedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.04]"
              />
              Featured only
            </label>
            <label className="flex items-center gap-2 text-sm text-star-200 cursor-pointer">
              <input
                type="checkbox"
                checked={upcomingDeadline}
                onChange={(e) => setUpcomingDeadline(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/[0.04]"
              />
              Only with upcoming deadline
            </label>
            <button
              onClick={resetFilters}
              className="ml-auto text-xs text-star-300 hover:text-white underline underline-offset-2"
            >
              Reset filters
            </button>
          </div>
        </div>

        {/* Loading / error / empty */}
        {loading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        )}

        {!loading && error && (
          <div className="card p-6 border border-red-500/30 bg-red-500/5 text-red-300">
            <p className="font-medium">Unable to load speaking opportunities</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={fetchOpportunities}
              className="mt-3 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && opportunities.length === 0 && (
          <div className="card p-10 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              No opportunities match your filters
            </h2>
            <p className="text-star-300 text-sm mb-4">
              Try clearing filters, or be the first to submit one.
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={resetFilters} className="btn-primary text-sm py-2 px-4">
                Reset filters
              </button>
              <Link
                href="/speaking/submit"
                className="text-sm py-2 px-4 rounded-lg border border-white/10 text-white hover:bg-white/[0.04]"
              >
                Submit one
              </Link>
            </div>
          </div>
        )}

        {/* Featured */}
        {!loading && !error && featured.length > 0 && (
          <ScrollReveal>
            <div className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-star-300 mb-3">
                Featured
              </h2>
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {featured.map((op) => (
                  <StaggerItem key={op.id}>
                    <OpportunityCard op={op} featured />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </ScrollReveal>
        )}

        {/* All */}
        {!loading && !error && regular.length > 0 && (
          <ScrollReveal delay={0.05}>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-star-300 mb-3">
                {featured.length > 0 ? 'All Opportunities' : 'Opportunities'}
              </h2>
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regular.map((op) => (
                  <StaggerItem key={op.id}>
                    <OpportunityCard op={op} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Card
// ────────────────────────────────────────

function OpportunityCard({
  op,
  featured = false,
}: {
  op: SpeakingOpportunity;
  featured?: boolean;
}) {
  const deadlineDays = daysUntil(op.submissionDeadline);
  const deadlineColor =
    deadlineDays === null
      ? 'text-star-400'
      : deadlineDays < 0
      ? 'text-red-400'
      : deadlineDays <= 14
      ? 'text-amber-300'
      : 'text-star-300';

  return (
    <Link
      href={`/speaking/${op.id}`}
      className={`card p-5 flex flex-col h-full border transition-colors hover:border-white/20 ${
        featured ? 'border-white/20 bg-white/[0.03]' : 'border-white/[0.06]'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1.5">
          {featured && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-black">
              Featured
            </span>
          )}
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
              op.isRemote
                ? 'border-white/15 text-white/80'
                : 'border-white/10 text-white/60'
            }`}
          >
            {op.isRemote ? 'Remote' : 'In-Person'}
          </span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white leading-tight mb-1">{op.title}</h3>
      <p className="text-sm text-star-300 mb-3">
        {op.organization}
        {op.conferenceName ? ` · ${op.conferenceName}` : ''}
      </p>

      <p className="text-sm text-star-200 line-clamp-3 mb-4">{op.description}</p>

      <div className="mt-auto space-y-1.5 text-xs text-star-300 border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between">
          <span className="text-star-400">Event</span>
          <span className="text-white/80">{formatDate(op.eventDate)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-star-400">Deadline</span>
          <span className={deadlineColor}>
            {op.submissionDeadline
              ? `${formatDate(op.submissionDeadline)}${
                  deadlineDays !== null && deadlineDays >= 0 ? ` (${deadlineDays}d)` : ''
                }`
              : 'Rolling / none'}
          </span>
        </div>
        {op.location && (
          <div className="flex items-center justify-between">
            <span className="text-star-400">Location</span>
            <span className="text-white/80 truncate ml-2 text-right">{op.location}</span>
          </div>
        )}
        {op.compensation && (
          <div className="flex items-center justify-between">
            <span className="text-star-400">Compensation</span>
            <span className="text-white/80 truncate ml-2 text-right">{op.compensation}</span>
          </div>
        )}
      </div>

      {op.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {op.tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="text-[10px] text-star-300 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
