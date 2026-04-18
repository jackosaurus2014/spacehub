'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal from '@/components/ui/ScrollReveal';
import HighlightedText from '@/components/search/HighlightedText';
import EmptyState from '@/components/ui/EmptyState';
import { clientLogger } from '@/lib/client-logger';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ResultType = 'news' | 'company' | 'job' | 'investor' | 'marketplace' | 'forum' | 'blog';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  snippet: string;
  url: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  score?: number;
}

interface ApiResponse {
  query: string;
  type: TabKey;
  results: {
    news: SearchResult[];
    companies: SearchResult[];
    jobs: SearchResult[];
    investors: SearchResult[];
    marketplace: SearchResult[];
    forum: SearchResult[];
    blog: SearchResult[];
  };
  totals: {
    news: number;
    companies: number;
    jobs: number;
    investors: number;
    marketplace: number;
    forum: number;
    blog: number;
    all: number;
  };
}

type TabKey = 'all' | 'news' | 'companies' | 'jobs' | 'investors' | 'marketplace' | 'forum' | 'blog';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'news', label: 'News' },
  { key: 'companies', label: 'Companies' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'investors', label: 'Investors' },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'forum', label: 'Community' },
  { key: 'blog', label: 'Blog' },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function typeColor(type: ResultType): string {
  switch (type) {
    case 'news': return 'text-blue-400';
    case 'company': return 'text-emerald-400';
    case 'job': return 'text-amber-400';
    case 'investor': return 'text-violet-400';
    case 'marketplace': return 'text-cyan-400';
    case 'forum': return 'text-orange-400';
    case 'blog': return 'text-pink-400';
    default: return 'text-star-300';
  }
}

function typeLabel(type: ResultType): string {
  switch (type) {
    case 'news': return 'News';
    case 'company': return 'Company';
    case 'job': return 'Job';
    case 'investor': return 'Investor';
    case 'marketplace': return 'Marketplace';
    case 'forum': return 'Community';
    case 'blog': return 'Blog';
    default: return type;
  }
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// ─────────────────────────────────────────────────────────────
// Result card
// ─────────────────────────────────────────────────────────────

function ResultCard({ item }: { item: SearchResult }) {
  const meta = item.metadata || {};
  const external = isExternalUrl(item.url);

  const body = (
    <div className="card p-5 hover:border-white/10 transition-all group h-full">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${typeColor(item.type)}`}>
              {typeLabel(item.type)}
            </span>
            {item.createdAt && (
              <>
                <span className="text-star-300/40">·</span>
                <span className="text-[11px] text-star-300">{formatDate(item.createdAt)}</span>
              </>
            )}
          </div>
          <h3 className="text-white font-medium group-hover:text-white transition-colors line-clamp-2">
            {item.title}
          </h3>
          {item.snippet && (
            <p className="text-star-300 text-sm mt-1.5 line-clamp-2 [&_mark]:bg-white/10 [&_mark]:text-white/90 [&_mark]:rounded-sm [&_mark]:px-0.5">
              <HighlightedText html={item.snippet} fallback={item.snippet} />
            </p>
          )}
          <MetaRow type={item.type} meta={meta} />
        </div>
        {external && (
          <svg className="w-4 h-4 text-star-300 group-hover:text-white flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        )}
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        {body}
      </a>
    );
  }
  return (
    <Link href={item.url} className="block">
      {body}
    </Link>
  );
}

function MetaRow({ type, meta }: { type: ResultType; meta: Record<string, unknown> }) {
  const bits: string[] = [];

  switch (type) {
    case 'news':
      if (typeof meta.source === 'string') bits.push(meta.source);
      if (typeof meta.category === 'string') bits.push(meta.category);
      break;
    case 'company':
      if (typeof meta.sector === 'string') bits.push(meta.sector);
      if (typeof meta.headquarters === 'string') bits.push(meta.headquarters);
      if (meta.isPublic && typeof meta.ticker === 'string') bits.push(meta.ticker);
      if (typeof meta.tier === 'number') bits.push(`Tier ${meta.tier}`);
      break;
    case 'job': {
      if (typeof meta.company === 'string') bits.push(meta.company);
      if (typeof meta.location === 'string') bits.push(meta.location);
      if (meta.remoteOk) bits.push('Remote OK');
      if (typeof meta.seniorityLevel === 'string') bits.push(meta.seniorityLevel);
      break;
    }
    case 'investor':
      if (typeof meta.investorType === 'string') bits.push(String(meta.investorType).toUpperCase());
      if (typeof meta.headquarters === 'string') bits.push(meta.headquarters);
      if (typeof meta.portfolioCount === 'number') bits.push(`${meta.portfolioCount} portfolio`);
      break;
    case 'marketplace':
      if (typeof meta.companyName === 'string') bits.push(meta.companyName);
      if (typeof meta.category === 'string') bits.push(meta.category);
      if (typeof meta.pricingType === 'string') bits.push(meta.pricingType);
      break;
    case 'forum':
      if (typeof meta.categoryName === 'string') bits.push(meta.categoryName);
      if (typeof meta.authorName === 'string') bits.push(meta.authorName);
      if (typeof meta.postCount === 'number') bits.push(`${meta.postCount} replies`);
      break;
    case 'blog':
      if (typeof meta.sourceName === 'string') bits.push(meta.sourceName);
      if (typeof meta.authorName === 'string') bits.push(meta.authorName);
      break;
  }

  if (bits.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2 text-xs text-star-300">
      {bits.map((b, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-star-300/40">·</span>}
          <span className="capitalize">{b.replace(/_/g, ' ')}</span>
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section (All tab)
// ─────────────────────────────────────────────────────────────

function Section({
  title,
  tabKey,
  items,
  total,
  query,
  onTabChange,
}: {
  title: string;
  tabKey: TabKey;
  items: SearchResult[];
  total: number;
  query: string;
  onTabChange: (key: TabKey) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-star-200">
            {title}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-star-300 border border-white/[0.06]">
            {total} {total === 1 ? 'result' : 'results'}
          </span>
        </div>
        <button
          onClick={() => onTabChange(tabKey)}
          className="text-xs text-star-300 hover:text-white transition-colors"
        >
          See more →
        </button>
      </div>
      <div className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <ResultCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const t = (searchParams.get('type') || 'all').toLowerCase();
    return (TABS.some(tab => tab.key === t) ? t : 'all') as TabKey;
  });

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (activeTab !== 'all') params.set('type', activeTab);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedQuery, activeTab, router, pathname]);

  // Fetch
  const performSearch = useCallback(async () => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setData(null);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      params.set('q', trimmed);
      params.set('type', activeTab);
      params.set('limit', activeTab === 'all' ? '5' : '20');

      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (err) {
      clientLogger.error('Search failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, activeTab]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const totals = data?.totals;
  const overallTotal = totals?.all ?? 0;

  return (
    <>
      {/* Search input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
          <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search across SpaceNexus"
          placeholder="Search news, companies, jobs, investors, marketplace, community..."
          className="w-full pl-14 pr-12 py-4 text-lg bg-white/[0.06] border border-white/10 rounded-2xl text-white placeholder-star-400 focus:outline-none focus:border-white/10 focus:ring-2 focus:ring-white/20 transition-all"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-5">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {!loading && query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-5 text-star-300 hover:text-white/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-thin">
        {TABS.map((tab) => {
          const count =
            tab.key === 'all'
              ? totals?.all
              : totals?.[tab.key as Exclude<TabKey, 'all'>];
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white/10 text-white border border-white/10'
                  : 'bg-white/[0.04] text-star-300 border border-transparent hover:border-white/[0.08] hover:text-white/90'
              }`}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span className={`ml-2 text-xs ${active ? 'text-star-300' : 'text-star-300/70'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Result count */}
      {hasSearched && !loading && (
        <div className="mb-4 text-sm text-star-300" aria-live="polite">
          {overallTotal} {overallTotal === 1 ? 'result' : 'results'} found
        </div>
      )}

      {/* Content */}
      <main>
        {loading && (
          <div aria-live="polite" aria-busy="true">
            <ResultSkeleton />
          </div>
        )}

        {/* Empty query */}
        {!loading && !hasSearched && (
          <ScrollReveal>
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-star-100 mb-2">Search SpaceNexus</h2>
              <p className="text-star-300 mb-6 max-w-md mx-auto">
                Search across news, companies, jobs, investors, marketplace listings, community threads, and blog posts.
                Enter at least 2 characters to begin.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['SpaceX', 'Artemis', 'satellite', 'earth observation', 'Mars', 'propulsion engineer'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="px-4 py-1.5 text-sm rounded-full bg-white/[0.06] text-star-300 border border-white/[0.06] hover:border-white/10 hover:text-white transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* No results */}
        {!loading && hasSearched && overallTotal === 0 && (
          <ScrollReveal>
            <EmptyState
              icon={<span className="text-4xl">🔍</span>}
              title="No results found"
              description={`No matches found for "${debouncedQuery}" across ${activeTab === 'all' ? 'any category' : `the ${activeTab} category`}.`}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  {activeTab !== 'all' && (
                    <button
                      onClick={() => setActiveTab('all')}
                      className="px-4 py-2 text-sm rounded-xl bg-white/5 text-white/90 border border-white/10 hover:bg-white/[0.08] transition-all"
                    >
                      Search all categories
                    </button>
                  )}
                  <button
                    onClick={() => setQuery('')}
                    className="px-4 py-2 text-sm rounded-xl bg-white/[0.06] text-star-300 border border-white/[0.06] hover:border-white/10 transition-all"
                  >
                    Clear Search
                  </button>
                </div>
              }
            />
          </ScrollReveal>
        )}

        {/* Results — All tab (sectioned) */}
        {!loading && hasSearched && data && overallTotal > 0 && activeTab === 'all' && (
          <div>
            <Section
              title="News"
              tabKey="news"
              items={data.results.news}
              total={data.totals.news}
              query={debouncedQuery}
              onTabChange={setActiveTab}
            />
            <Section
              title="Companies"
              tabKey="companies"
              items={data.results.companies}
              total={data.totals.companies}
              query={debouncedQuery}
              onTabChange={setActiveTab}
            />
            <Section
              title="Jobs"
              tabKey="jobs"
              items={data.results.jobs}
              total={data.totals.jobs}
              query={debouncedQuery}
              onTabChange={setActiveTab}
            />
            <Section
              title="Investors"
              tabKey="investors"
              items={data.results.investors}
              total={data.totals.investors}
              query={debouncedQuery}
              onTabChange={setActiveTab}
            />
            <Section
              title="Marketplace"
              tabKey="marketplace"
              items={data.results.marketplace}
              total={data.totals.marketplace}
              query={debouncedQuery}
              onTabChange={setActiveTab}
            />
            <Section
              title="Community"
              tabKey="forum"
              items={data.results.forum}
              total={data.totals.forum}
              query={debouncedQuery}
              onTabChange={setActiveTab}
            />
            <Section
              title="Blog"
              tabKey="blog"
              items={data.results.blog}
              total={data.totals.blog}
              query={debouncedQuery}
              onTabChange={setActiveTab}
            />
          </div>
        )}

        {/* Results — single-category tabs */}
        {!loading && hasSearched && data && overallTotal > 0 && activeTab !== 'all' && (
          <div className="space-y-3">
            {(data.results[activeTab as Exclude<TabKey, 'all'>] || []).map((item) => (
              <ResultCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function SearchPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pb-12">
        <AnimatedPageHeader
          title="Search"
          subtitle="Find anything across SpaceNexus"
          icon="🔍"
          accentColor="cyan"
        />
        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <SearchContent />
        </Suspense>
      </div>
    </div>
  );
}
