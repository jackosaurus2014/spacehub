'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { SearchModule } from '@/lib/validations';
import CompanyIntelCard from '@/components/search/CompanyIntelCard';
import { detectSearchIntent, getIntentSuggestion } from '@/lib/search-intent';

// --- Types ---

interface NewsResult {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  publishedAt: string;
}

interface CompanyResult {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  headquarters: string | null;
  isPublic: boolean;
  ticker: string | null;
  sector: string | null;
  tier: number;
  totalFunding: number | null;
  logoUrl: string | null;
  dataCompleteness: number;
  _count: {
    newsArticles: number;
    contracts: number;
    serviceListings: number;
    satelliteAssets: number;
    fundingRounds: number;
    products: number;
  };
}

interface EventResult {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  launchDate: string | null;
  agency: string | null;
}

interface OpportunityResult {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  sector: string | null;
  publishedAt: string | null;
}

interface BlogResult {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  authorName: string | null;
  publishedAt: string;
}

interface SearchResults {
  news: NewsResult[];
  companies: CompanyResult[];
  events: EventResult[];
  opportunities: OpportunityResult[];
  blogs: BlogResult[];
}

type SortOption = 'relevance' | 'date_desc' | 'date_asc' | 'title_asc';

// --- Constants ---

const MODULE_OPTIONS: { key: SearchModule; label: string; icon: JSX.Element }[] = [
  {
    key: 'news',
    label: 'News',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
  {
    key: 'companies',
    label: 'Companies',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    key: 'events',
    label: 'Events',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    key: 'opportunities',
    label: 'Opportunities',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    key: 'blogs',
    label: 'Blogs',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'title_asc', label: 'A - Z' },
];

const ALL_MODULES: SearchModule[] = ['news', 'companies', 'events', 'opportunities', 'blogs'];

// --- Helpers ---

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function parseSortOption(sort: SortOption): { sortBy: string; sortOrder: string } {
  switch (sort) {
    case 'date_desc':
      return { sortBy: 'date', sortOrder: 'desc' };
    case 'date_asc':
      return { sortBy: 'date', sortOrder: 'asc' };
    case 'title_asc':
      return { sortBy: 'title', sortOrder: 'asc' };
    case 'relevance':
    default:
      return { sortBy: 'relevance', sortOrder: 'desc' };
  }
}

function formatDate(dateStr: string | null): string {
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

function getTotalResults(results: SearchResults | null): number {
  if (!results) return 0;
  return (
    results.news.length +
    results.companies.length +
    results.events.length +
    results.opportunities.length +
    results.blogs.length
  );
}

// --- Skeleton Components ---

function SearchResultSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start gap-4">
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Result Card Components ---

function NewsResultCard({ item }: { item: NewsResult }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-5 block hover:border-cyan-400/60 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-slate-100 font-medium group-hover:text-cyan-300 transition-colors line-clamp-1">
            {item.title}
          </h3>
          {item.summary && (
            <p className="text-star-300 text-sm mt-1 line-clamp-2">{item.summary}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-star-300">
            <span className="text-blue-400">{item.source}</span>
            {item.publishedAt && (
              <>
                <span className="text-star-300/40">|</span>
                <span>{formatDate(item.publishedAt)}</span>
              </>
            )}
          </div>
        </div>
        <svg className="w-4 h-4 text-star-300 group-hover:text-cyan-400 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </div>
    </a>
  );
}

// CompanyResultCard is now handled by the CompanyIntelCard component

function EventResultCard({ item }: { item: EventResult }) {
  return (
    <a
      href="/mission-control"
      className="card p-5 block hover:border-cyan-400/60 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-slate-100 font-medium group-hover:text-cyan-300 transition-colors line-clamp-1">
              {item.name}
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              item.status === 'upcoming'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : item.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}>
              {item.status}
            </span>
          </div>
          {item.description && (
            <p className="text-star-300 text-sm mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-star-300">
            {item.agency && <span className="text-orange-400">{item.agency}</span>}
            {item.launchDate && (
              <>
                {item.agency && <span className="text-star-300/40">|</span>}
                <span>{formatDate(item.launchDate)}</span>
              </>
            )}
            <span className="text-star-300/40">|</span>
            <span className="capitalize">{item.type.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function OpportunityResultCard({ item }: { item: OpportunityResult }) {
  return (
    <a
      href={`/business-opportunities/${item.slug}`}
      className="card p-5 block hover:border-cyan-400/60 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-slate-100 font-medium group-hover:text-cyan-300 transition-colors line-clamp-1">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-star-300 text-sm mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-star-300">
            <span className="text-purple-400 capitalize">{item.type.replace(/_/g, ' ')}</span>
            <span className="text-star-300/40">|</span>
            <span className="capitalize">{item.category.replace(/_/g, ' ')}</span>
            {item.sector && (
              <>
                <span className="text-star-300/40">|</span>
                <span className="capitalize">{item.sector}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

function BlogResultCard({ item }: { item: BlogResult }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-5 block hover:border-cyan-400/60 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-slate-100 font-medium group-hover:text-cyan-300 transition-colors line-clamp-1">
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="text-star-300 text-sm mt-1 line-clamp-2">{item.excerpt}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-star-300">
            {item.authorName && <span className="text-pink-400">{item.authorName}</span>}
            {item.publishedAt && (
              <>
                {item.authorName && <span className="text-star-300/40">|</span>}
                <span>{formatDate(item.publishedAt)}</span>
              </>
            )}
          </div>
        </div>
        <svg className="w-4 h-4 text-star-300 group-hover:text-cyan-400 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </div>
    </a>
  );
}

// --- Module Group Component ---

function ModuleGroup({
  label,
  count,
  color,
  children,
}: {
  label: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${color}`}>
          {label}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-star-300 border border-slate-600/40">
          {count} {count === 1 ? 'result' : 'results'}
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// --- Main Search Content ---

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize state from URL params
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedModules, setSelectedModules] = useState<Set<SearchModule>>(() => {
    const modulesParam = searchParams.get('modules');
    if (modulesParam) {
      const parsed = modulesParam.split(',').filter((m): m is SearchModule =>
        ALL_MODULES.includes(m as SearchModule)
      );
      return new Set(parsed.length > 0 ? parsed : ALL_MODULES);
    }
    return new Set(ALL_MODULES);
  });
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    if (sortBy === 'date' && sortOrder === 'asc') return 'date_asc';
    if (sortBy === 'date') return 'date_desc';
    if (sortBy === 'title') return 'title_asc';
    return 'relevance';
  });

  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ explanation?: string; reformulatedQueries?: string[]; suggestedCompanies?: string[] } | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);

    // Only include modules in URL if not all are selected
    if (selectedModules.size > 0 && selectedModules.size < ALL_MODULES.length) {
      params.set('modules', Array.from(selectedModules).join(','));
    }
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const { sortBy, sortOrder } = parseSortOption(sortOption);
    if (sortBy !== 'relevance') {
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
    }

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedQuery, selectedModules, dateFrom, dateTo, sortOption, router, pathname]);

  // Perform search
  const performSearch = useCallback(async () => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      params.set('q', trimmed);
      params.set('limit', '20');

      if (selectedModules.size > 0 && selectedModules.size < ALL_MODULES.length) {
        params.set('modules', Array.from(selectedModules).join(','));
      }
      if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString());
      if (dateTo) params.set('dateTo', new Date(dateTo).toISOString());

      const { sortBy, sortOrder } = parseSortOption(sortOption);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw new Error('Search request failed');
      const data: SearchResults = await res.json();
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setResults({ news: [], companies: [], events: [], opportunities: [], blogs: [] });
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedModules, dateFrom, dateTo, sortOption]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Detect search intent and show AI suggestion
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length >= 3) {
      const intent = detectSearchIntent(trimmed);
      const suggestion = getIntentSuggestion(intent);
      setAiSuggestion(intent.shouldOfferAI ? suggestion : null);
    } else {
      setAiSuggestion(null);
    }
    setAiResult(null);
  }, [debouncedQuery]);

  // Ask AI for search help
  const handleAiSearch = useCallback(async () => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed || aiLoading) return;

    setAiLoading(true);
    try {
      const res = await fetch('/api/search/ai-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
        // If AI suggests reformulated queries, search with the first one
        if (data.reformulatedQueries?.length > 0 && data.reformulatedQueries[0] !== trimmed) {
          setQuery(data.reformulatedQueries[0]);
        }
      }
    } catch (err) {
      console.error('AI search failed:', err);
    } finally {
      setAiLoading(false);
    }
  }, [debouncedQuery, aiLoading]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const toggleModule = (mod: SearchModule) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) {
        // Don't allow deselecting all modules
        if (next.size > 1) next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  };

  const selectAllModules = () => setSelectedModules(new Set(ALL_MODULES));

  const clearFilters = () => {
    setSelectedModules(new Set(ALL_MODULES));
    setDateFrom('');
    setDateTo('');
    setSortOption('relevance');
  };

  const totalResults = getTotalResults(results);
  const hasActiveFilters =
    selectedModules.size < ALL_MODULES.length ||
    dateFrom !== '' ||
    dateTo !== '' ||
    sortOption !== 'relevance';

  return (
    <>
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
          <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search across news, companies, events, opportunities, and blogs"
          placeholder="Search across news, companies, events, opportunities, and blogs..."
          className="w-full pl-14 pr-12 py-4 text-lg bg-slate-800/60 border border-cyan-400/30 rounded-2xl text-slate-100 placeholder-star-400 focus:outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition-all"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-5">
            <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}
        {!loading && query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-5 text-star-300 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* AI Search Suggestion */}
      {aiSuggestion && !aiResult && (
        <div className="mb-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-purple-300">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span>{aiSuggestion}</span>
          </div>
          <button
            onClick={handleAiSearch}
            disabled={aiLoading}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all disabled:opacity-50"
          >
            {aiLoading ? (
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                Thinking...
              </span>
            ) : (
              'Ask AI'
            )}
          </button>
        </div>
      )}

      {/* AI Result */}
      {aiResult && (
        <div className="mb-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <div className="flex items-start gap-2 mb-2">
            <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-sm text-purple-200">{aiResult.explanation}</p>
          </div>
          {aiResult.suggestedCompanies && aiResult.suggestedCompanies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-purple-400 uppercase tracking-wider mr-1 self-center">Try:</span>
              {aiResult.suggestedCompanies.map((company) => (
                <button
                  key={company}
                  onClick={() => setQuery(company)}
                  className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                >
                  {company}
                </button>
              ))}
            </div>
          )}
          {aiResult.reformulatedQueries && aiResult.reformulatedQueries.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-purple-400 uppercase tracking-wider mr-1 self-center">Also try:</span>
              {aiResult.reformulatedQueries.slice(1, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-700/40 text-star-300 border border-slate-600/30 hover:border-purple-500/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setAiResult(null)}
            className="text-[10px] text-star-400 hover:text-star-300 mt-2 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toggle (mobile) + Sort + Result Count */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterOpen
                ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/40'
                : 'bg-slate-800/60 text-star-300 border border-slate-600/40 hover:border-cyan-400/30'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            )}
          </button>

          {hasSearched && !loading && (
            <span className="text-sm text-star-300">
              {totalResults} {totalResults === 1 ? 'result' : 'results'} found
            </span>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs text-star-300 hidden sm:block">Sort:</label>
          <select
            id="sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-slate-800/60 border border-slate-600/40 rounded-xl px-3 py-2 text-sm text-star-200 focus:outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition-all appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex gap-6">
        {/* Filter Panel */}
        <aside className={`${
          filterOpen ? 'block' : 'hidden'
        } lg:block w-full lg:w-64 flex-shrink-0`}>
          <div className="card p-5 sticky top-4 space-y-6">
            {/* Module Checkboxes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-star-200 uppercase tracking-wider">Modules</h3>
                <button
                  onClick={selectAllModules}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Select All
                </button>
              </div>
              <div className="space-y-2">
                {MODULE_OPTIONS.map(({ key, label, icon }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                      selectedModules.has(key)
                        ? 'bg-cyan-400/5 border border-cyan-400/20'
                        : 'border border-transparent hover:bg-slate-700/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModules.has(key)}
                      onChange={() => toggleModule(key)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      selectedModules.has(key)
                        ? 'bg-cyan-400 border-cyan-400'
                        : 'border-star-400 bg-transparent'
                    }`}>
                      {selectedModules.has(key) && (
                        <svg className="w-3 h-3 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`${selectedModules.has(key) ? 'text-star-200' : 'text-star-300'}`}>
                      {icon}
                    </span>
                    <span className={`text-sm ${selectedModules.has(key) ? 'text-star-200' : 'text-star-300'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h3 className="text-sm font-semibold text-star-200 uppercase tracking-wider mb-3">Date Range</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="date-from" className="text-xs text-star-300 block mb-1">From</label>
                  <input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/40 rounded-xl px-3 py-2 text-sm text-star-200 focus:outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="date-to" className="text-xs text-star-300 block mb-1">To</label>
                  <input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/40 rounded-xl px-3 py-2 text-sm text-star-200 focus:outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full py-2 text-sm text-star-300 hover:text-cyan-300 border border-slate-600/40 rounded-xl hover:border-cyan-400/30 transition-all"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </aside>

        {/* Results Area */}
        <main className="flex-1 min-w-0">
          {/* Loading State */}
          {loading && (
            <SearchResultSkeleton />
          )}

          {/* Empty query state */}
          {!loading && !hasSearched && (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-star-100 mb-2">Search SpaceNexus</h2>
              <p className="text-star-300 mb-6 max-w-md mx-auto">
                Search across news articles, companies, launch events, business opportunities, and blog posts.
                Enter at least 2 characters to begin.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['SpaceX', 'Artemis', 'satellite', 'launch', 'Mars'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="px-4 py-1.5 text-sm rounded-full bg-slate-700/40 text-star-300 border border-slate-600/40 hover:border-cyan-400/30 hover:text-cyan-300 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results state */}
          {!loading && hasSearched && totalResults === 0 && (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-slate-700/40 border border-slate-600/40 flex items-center justify-center">
                <svg className="w-8 h-8 text-star-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-star-100 mb-2">No results found</h2>
              <p className="text-star-300 mb-4 max-w-md mx-auto">
                No matches found for &ldquo;{debouncedQuery}&rdquo;{hasActiveFilters ? ' with the current filters' : ''}.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-400/20 transition-all"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => setQuery('')}
                  className="px-4 py-2 text-sm rounded-xl bg-slate-700/40 text-star-300 border border-slate-600/40 hover:border-cyan-400/30 transition-all"
                >
                  Clear Search
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && hasSearched && results && totalResults > 0 && (
            <div>
              <ModuleGroup label="News" count={results.news.length} color="text-blue-400">
                {results.news.map((item) => (
                  <NewsResultCard key={item.id} item={item} />
                ))}
              </ModuleGroup>

              <ModuleGroup label="Companies" count={results.companies.length} color="text-emerald-400">
                {results.companies.map((item) => (
                  <CompanyIntelCard key={item.id} item={item} />
                ))}
              </ModuleGroup>

              <ModuleGroup label="Events" count={results.events.length} color="text-orange-400">
                {results.events.map((item) => (
                  <EventResultCard key={item.id} item={item} />
                ))}
              </ModuleGroup>

              <ModuleGroup label="Opportunities" count={results.opportunities.length} color="text-purple-400">
                {results.opportunities.map((item) => (
                  <OpportunityResultCard key={item.id} item={item} />
                ))}
              </ModuleGroup>

              <ModuleGroup label="Blogs" count={results.blogs.length} color="text-pink-400">
                {results.blogs.map((item) => (
                  <BlogResultCard key={item.id} item={item} />
                ))}
              </ModuleGroup>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// --- Page Export ---

export default function SearchPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pb-12">
        <PageHeader
          title="Search"
          subtitle="Find anything across SpaceNexus"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Search' },
          ]}
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
