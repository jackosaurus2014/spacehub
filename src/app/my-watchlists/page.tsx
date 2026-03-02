'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import EmptyState from '@/components/ui/EmptyState';

interface WatchlistItem {
  id: string;
  priority: string;
  notifyNews: boolean;
  notifyContracts: boolean;
  notifyListings: boolean;
  notes: string | null;
  createdAt: string;
  companyProfile: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    sector: string | null;
    tier: string | null;
    status: string | null;
    tags: string[];
    totalFunding: number | null;
    marketCap: number | null;
    isPublic: boolean;
  };
}

interface SavedSearch {
  id: string;
  name: string;
  searchType: string;
  filters: Record<string, unknown>;
  query: string | null;
  alertEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-slate-500/20 text-slate-400',
};

const SEARCH_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  company_directory: { label: 'Companies', icon: '🏢', color: 'text-cyan-400' },
  marketplace_listings: { label: 'Listings', icon: '🏪', color: 'text-emerald-400' },
  marketplace_rfqs: { label: 'RFQs', icon: '📋', color: 'text-purple-400' },
};

function buildSearchUrl(search: SavedSearch): string {
  const params = new URLSearchParams();
  const filters = search.filters || {};

  if (search.query) params.set('q', search.query);

  switch (search.searchType) {
    case 'company_directory':
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') params.set(key, String(val));
      });
      return `/company-profiles?${params.toString()}`;
    case 'marketplace_listings':
      params.set('tab', 'listings');
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') params.set(key, String(val));
      });
      return `/marketplace/search?${params.toString()}`;
    case 'marketplace_rfqs':
      params.set('tab', 'rfqs');
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') params.set(key, String(val));
      });
      return `/marketplace/search?${params.toString()}`;
    default:
      return '/marketplace/search';
  }
}

function WatchlistsContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'companies');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [notAuthed, setNotAuthed] = useState(false);
  const [watchlistMeta, setWatchlistMeta] = useState<{ count: number; limit: number | null; tier: string }>({ count: 0, limit: null, tier: 'free' });
  const [searchMeta, setSearchMeta] = useState<{ count: number; limit: number | null; tier: string }>({ count: 0, limit: null, tier: 'free' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [digests, setDigests] = useState<any[]>([]);
  const [digestsLoading, setDigestsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [watchRes, searchRes] = await Promise.all([
          fetch('/api/watchlist/companies'),
          fetch('/api/saved-searches'),
        ]);

        if (watchRes.status === 401 || searchRes.status === 401) {
          setNotAuthed(true);
          return;
        }

        if (watchRes.ok) {
          const data = await watchRes.json();
          setWatchlist(data.items || []);
          setWatchlistMeta({ count: data.count || 0, limit: data.limit, tier: data.tier || 'free' });
        }
        if (searchRes.ok) {
          const data = await searchRes.json();
          setSavedSearches(data.savedSearches || []);
          setSearchMeta({ count: data.count || 0, limit: data.limit, tier: data.tier || 'free' });
        }
      } catch (err) {
        clientLogger.error('Failed to load watchlists', { error: err instanceof Error ? err.message : String(err) });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUnwatch = async (item: WatchlistItem) => {
    try {
      const res = await fetch(`/api/watchlist/companies/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        setWatchlist((prev) => prev.filter((w) => w.id !== item.id));
        setWatchlistMeta((prev) => ({ ...prev, count: prev.count - 1 }));
        toast.success(`Removed ${item.companyProfile.name} from watchlist`);
      } else {
        toast.error('Failed to remove');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleUpdateWatch = async (item: WatchlistItem, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/watchlist/companies/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist((prev) => prev.map((w) => (w.id === item.id ? { ...w, ...data.item } : w)));
      }
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDeleteSearch = async (search: SavedSearch) => {
    try {
      const res = await fetch(`/api/saved-searches/${search.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedSearches((prev) => prev.filter((s) => s.id !== search.id));
        setSearchMeta((prev) => ({ ...prev, count: prev.count - 1 }));
        toast.success(`Deleted "${search.name}"`);
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleToggleAlert = async (search: SavedSearch) => {
    try {
      const res = await fetch(`/api/saved-searches/${search.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertEnabled: !search.alertEnabled }),
      });
      if (res.ok) {
        setSavedSearches((prev) =>
          prev.map((s) => (s.id === search.id ? { ...s, alertEnabled: !s.alertEnabled } : s))
        );
      }
    } catch {
      toast.error('Failed to update alert');
    }
  };

  useEffect(() => {
    if (tab === 'digests' && digests.length === 0 && !digestsLoading) {
      setDigestsLoading(true);
      // Fetch digests for all watched companies
      const companyIds = watchlist.map((w) => w.companyProfile.id);
      if (companyIds.length > 0) {
        Promise.all(
          companyIds.slice(0, 20).map((id) =>
            fetch(`/api/company-digests?companyProfileId=${id}&limit=1`)
              .then((r) => (r.ok ? r.json() : { digests: [] }))
              .catch(() => ({ digests: [] }))
          )
        )
          .then((results) => {
            const allDigests = results.flatMap((r) => r.digests || []);
            allDigests.sort((a: any, b: any) => new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime());
            setDigests(allDigests);
          })
          .finally(() => setDigestsLoading(false));
      } else {
        setDigestsLoading(false);
      }
    }
  }, [tab, watchlist, digests.length, digestsLoading]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (notAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <h2 className="text-lg font-semibold text-white">Sign in Required</h2>
          <p className="text-sm text-slate-400">Please sign in to manage your watchlists and saved searches.</p>
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'companies', label: `Watched Companies (${watchlist.length})` },
    { key: 'searches', label: `Saved Searches (${savedSearches.length})` },
    { key: 'digests', label: 'Digests' },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <ScrollReveal>
          <AnimatedPageHeader
            title="My Watchlists"
            subtitle="Track companies and save your favorite searches"
          />
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal delay={0.1}>
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  tab === t.key ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Companies Tab */}
        {tab === 'companies' && (
          <div className="space-y-4">
            {/* Capacity indicator */}
            {watchlistMeta.limit !== null && (
              <div className="text-xs text-slate-500">
                {watchlistMeta.count} / {watchlistMeta.limit} watched ({watchlistMeta.tier} tier)
              </div>
            )}

            {watchlist.length > 0 ? (
              <ScrollReveal>
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watchlist.map((item) => (
                  <StaggerItem
                    key={item.id}
                    className="card p-4 space-y-3"
                  >
                    {/* Company Info */}
                    <div className="flex items-start justify-between">
                      <Link href={`/company-profiles/${item.companyProfile.slug}`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-sm flex-shrink-0">
                          {item.companyProfile.logoUrl ? (
                            <Image src={item.companyProfile.logoUrl} alt={`${item.companyProfile.name} logo`} width={32} height={32} sizes="32px" className="w-8 h-8 rounded-lg object-contain" unoptimized />
                          ) : (
                            item.companyProfile.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                            {item.companyProfile.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.companyProfile.sector || 'Space Industry'}
                            {item.companyProfile.tier && (
                              <span className="ml-1.5 px-1 py-0.5 rounded bg-slate-700 text-slate-400">
                                T{item.companyProfile.tier === 'tier1' ? '1' : item.companyProfile.tier === 'tier2' ? '2' : '3'}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={() => handleUnwatch(item)}
                        className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                        aria-label="Remove from watchlist"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Priority */}
                      <select
                        value={item.priority}
                        onChange={(e) => handleUpdateWatch(item, { priority: e.target.value })}
                        className={`text-xs font-bold px-1.5 py-0.5 rounded border-0 cursor-pointer ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>

                      {/* Notification toggles */}
                      <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.notifyNews}
                          onChange={(e) => handleUpdateWatch(item, { notifyNews: e.target.checked })}
                          className="w-3 h-3 rounded"
                        />
                        News
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.notifyContracts}
                          onChange={(e) => handleUpdateWatch(item, { notifyContracts: e.target.checked })}
                          className="w-3 h-3 rounded"
                        />
                        Contracts
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.notifyListings}
                          onChange={(e) => handleUpdateWatch(item, { notifyListings: e.target.checked })}
                          className="w-3 h-3 rounded"
                        />
                        Listings
                      </label>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
              </ScrollReveal>
            ) : (
              <EmptyState
                icon={<span className="text-4xl">👁️</span>}
                title="No watchlists yet"
                description="Create your first watchlist to track companies, launches, and topics that matter to you."
                action={
                  <Link href="/company-profiles">
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors">
                      Create Watchlist
                    </button>
                  </Link>
                }
              />
            )}
          </div>
        )}

        {/* Saved Searches Tab */}
        {tab === 'searches' && (
          <div className="space-y-4">
            {/* Capacity indicator */}
            {searchMeta.limit !== null && (
              <div className="text-xs text-slate-500">
                {searchMeta.count} / {searchMeta.limit} saved ({searchMeta.tier} tier)
              </div>
            )}

            {savedSearches.length > 0 ? (
              <ScrollReveal>
              <StaggerContainer className="space-y-3">
                {savedSearches.map((search) => {
                  const typeInfo = SEARCH_TYPE_LABELS[search.searchType] || SEARCH_TYPE_LABELS.company_directory;
                  const filterSummary = Object.entries(search.filters || {})
                    .filter(([, val]) => val !== null && val !== undefined && val !== '')
                    .map(([key, val]) => `${key}: ${val}`)
                    .join(', ');

                  return (
                    <StaggerItem
                      key={search.id}
                      className="card p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{typeInfo.icon}</span>
                          <span className="text-sm font-semibold text-white truncate">{search.name}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded bg-slate-700 ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {search.query && <span className="mr-2">&quot;{search.query}&quot;</span>}
                          {filterSummary && <span>{filterSummary}</span>}
                          {!search.query && !filterSummary && <span>No filters</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Alert toggle */}
                        <button
                          onClick={() => handleToggleAlert(search)}
                          title={search.alertEnabled ? 'Disable alerts' : 'Enable alerts'}
                          className={`text-sm px-2 py-1 rounded transition-colors ${
                            search.alertEnabled
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-slate-700/50 text-slate-500 hover:text-cyan-400'
                          }`}
                        >
                          {search.alertEnabled ? '🔔' : '🔕'}
                        </button>

                        {/* Run search */}
                        <Link
                          href={buildSearchUrl(search)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
                        >
                          Run →
                        </Link>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteSearch(search)}
                          className="text-slate-500 hover:text-red-400 text-xs transition-colors px-1"
                          aria-label="Delete saved search"
                        >
                          ✕
                        </button>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
              </ScrollReveal>
            ) : (
              <div className="text-center py-20">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No saved searches yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-2">
                  Save your frequently used searches from the company directory or marketplace to quickly re-run them later.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                  Enable alerts on saved searches to get notified when new results match your criteria.
                </p>
                <div className="flex justify-center gap-3">
                  <Link href="/company-profiles">
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      Company Directory
                    </button>
                  </Link>
                  <Link href="/marketplace/search">
                    <button className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                      Marketplace Search
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Digests Tab */}
        {tab === 'digests' && (
          <div className="space-y-4">
            {digestsLoading ? (
              <div className="flex justify-center py-10"><LoadingSpinner /></div>
            ) : digests.length > 0 ? (
              digests.map((digest: any, i: number) => {
                let highlights: string[] = [];
                try { highlights = Array.isArray(digest.highlights) ? digest.highlights : JSON.parse(digest.highlights || '[]'); } catch {}

                return (
                  <motion.div
                    key={digest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {digest.companyProfile && (
                          <Link href={`/company-profiles/${digest.companyProfile.slug}`} className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs flex-shrink-0">
                              {digest.companyProfile.logoUrl ? (
                                <Image src={digest.companyProfile.logoUrl} alt={`${digest.companyProfile.name} logo`} width={24} height={24} sizes="24px" className="w-6 h-6 rounded-lg object-contain" unoptimized />
                              ) : (
                                digest.companyProfile.name.charAt(0)
                              )}
                            </div>
                            <span className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                              {digest.companyProfile.name}
                            </span>
                          </Link>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(digest.periodStart).toLocaleDateString()} – {new Date(digest.periodEnd).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">{digest.summary}</p>

                    {highlights.length > 0 && (
                      <ul className="space-y-1">
                        {highlights.slice(0, 3).map((h: string, j: number) => (
                          <li key={j} className="flex items-start gap-2 text-[11px] text-slate-400">
                            <span className="text-cyan-400 mt-0.5">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="text-xs text-slate-500 pt-1 border-t border-slate-700/50">
                      {digest.newsCount} articles analyzed
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-20">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {watchlist.length === 0 ? 'No digests available' : 'Digests coming soon'}
                </h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-2">
                  {watchlist.length === 0
                    ? 'Watch some companies first to receive their weekly intelligence digests here.'
                    : 'No digests available yet. Digests are generated weekly for companies with recent news coverage.'}
                </p>
                {watchlist.length === 0 ? (
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                    Digests summarize the latest news, contract awards, and market activity for each company you follow.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                    Check back soon -- your next digest will appear after the weekly analysis runs.
                  </p>
                )}
                {watchlist.length === 0 && (
                  <Link href="/company-profiles">
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Browse Companies
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyWatchlistsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <WatchlistsContent />
    </Suspense>
  );
}
