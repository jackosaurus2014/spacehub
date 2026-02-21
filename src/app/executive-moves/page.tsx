'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PremiumGate from '@/components/PremiumGate';

interface ExecutiveMove {
  id: string;
  personName: string;
  fromCompany: string | null;
  fromTitle: string | null;
  toCompany: string | null;
  toTitle: string | null;
  moveType: 'hired' | 'departed' | 'promoted' | 'appointed';
  date: string;
  source?: string;
  summary?: string;
  companySlug?: string;
}

const MOVE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'hired', label: 'Hired' },
  { value: 'departed', label: 'Departed' },
  { value: 'promoted', label: 'Promoted' },
  { value: 'appointed', label: 'Appointed' },
];

function getMoveTypeBadge(type: string) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    hired: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'HIRED' },
    departed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'DEPARTED' },
    promoted: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'PROMOTED' },
    appointed: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'APPOINTED' },
  };
  const style = styles[type] || styles.hired;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text} whitespace-nowrap`}>
      {style.label}
    </span>
  );
}

function getMoveTypeIcon(type: string) {
  const icons: Record<string, string> = {
    hired: '>>>',
    departed: '<<<',
    promoted: '^^^',
    appointed: '***',
  };
  return icons[type] || '---';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysAgo(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function CompanyLink({ name, slug }: { name: string | null; slug?: string }) {
  if (!name) return <span className="text-slate-500 italic">--</span>;
  if (slug) {
    return (
      <Link
        href={`/company-profiles/${slug}`}
        className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
      >
        {name}
      </Link>
    );
  }
  return <span className="text-slate-200">{name}</span>;
}

function NotableMovesCard({ move, index }: { move: ExecutiveMove; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="card p-5 relative overflow-hidden group"
    >
      {/* Accent top border */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        move.moveType === 'hired' ? 'bg-emerald-500' :
        move.moveType === 'departed' ? 'bg-red-500' :
        move.moveType === 'promoted' ? 'bg-amber-500' :
        'bg-cyan-500'
      }`} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 border border-slate-600/50">
            {move.personName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{move.personName}</h3>
            <p className="text-[11px] text-slate-400">{formatDate(move.date)}</p>
          </div>
        </div>
        {getMoveTypeBadge(move.moveType)}
      </div>

      <div className="space-y-1.5 mb-3">
        {move.fromCompany && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 w-10 flex-shrink-0">From</span>
            <span className="text-slate-300">{move.fromTitle}</span>
            <span className="text-slate-600">@</span>
            <CompanyLink name={move.fromCompany} slug={move.companySlug} />
          </div>
        )}
        {move.toCompany && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 w-10 flex-shrink-0">To</span>
            <span className="text-white font-medium">{move.toTitle}</span>
            <span className="text-slate-600">@</span>
            <CompanyLink name={move.toCompany} slug={move.companySlug} />
          </div>
        )}
      </div>

      {move.summary && (
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
          {move.summary}
        </p>
      )}
    </motion.div>
  );
}

function ExecutiveMovesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [moves, setMoves] = useState<ExecutiveMove[]>([]);
  const [notableMoves, setNotableMoves] = useState<ExecutiveMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Read filters from URL params
  const search = searchParams.get('search') || '';
  const moveType = searchParams.get('moveType') || '';
  const company = searchParams.get('company') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

  // Local search input state (debounced)
  const [searchInput, setSearchInput] = useState(search);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // Reset to page 1 when filters change (unless we're explicitly setting page)
    if (!('page' in updates)) {
      params.delete('page');
    }
    router.push(`/executive-moves?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Fetch notable (most recent) moves for the highlight section
  useEffect(() => {
    async function fetchNotable() {
      try {
        const res = await fetch('/api/executive-moves?limit=6&page=1');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setNotableMoves(data.moves || []);
      } catch {
        // Non-critical — highlight section just won't show
      }
    }
    fetchNotable();
  }, []);

  // Fetch filtered moves
  const fetchMoves = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (moveType) params.set('moveType', moveType);
      if (company) params.set('company', company);
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/executive-moves?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMoves(data.moves || []);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load executive moves.');
    } finally {
      setLoading(false);
    }
  }, [search, moveType, company, page]);

  useEffect(() => {
    fetchMoves();
  }, [fetchMoves]);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput, search, updateParams]);

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <AnimatedPageHeader
        title="Executive Move Tracker"
        subtitle="Track C-suite and VP-level leadership changes across the space industry — hiring, departures, promotions, and appointments"
        icon="👔"
      />

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
      >
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xl">
              👤
            </div>
            <div>
              <div className="text-xl font-bold text-white">{total}</div>
              <div className="text-xs text-slate-400">Moves Tracked</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xl">
              🟢
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {notableMoves.filter(m => m.moveType === 'hired').length}
              </div>
              <div className="text-xs text-slate-400">Recent Hires</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-xl">
              ⬆️
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {notableMoves.filter(m => m.moveType === 'promoted').length}
              </div>
              <div className="text-xs text-slate-400">Recent Promotions</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-xl">
              🔴
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {notableMoves.filter(m => m.moveType === 'departed').length}
              </div>
              <div className="text-xs text-slate-400">Recent Departures</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notable Moves This Week */}
      {notableMoves.length > 0 && !search && !moveType && !company && page === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Most Recent Moves
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {notableMoves.slice(0, 6).map((move, i) => (
              <NotableMovesCard key={move.id} move={move} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-4 mb-6"
      >
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              aria-label="Search by person name, company, or title"
              placeholder="Search by person name, company, or title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
            <svg className="absolute left-3 top-3 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Move Type Filter */}
          <select
            aria-label="Filter by move type"
            value={moveType}
            onChange={(e) => updateParams({ moveType: e.target.value })}
            className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {MOVE_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Company Filter */}
          <div className="relative">
            <input
              type="text"
              aria-label="Filter by company"
              placeholder="Filter by company..."
              value={company}
              onChange={(e) => updateParams({ company: e.target.value })}
              className="w-full lg:w-48 px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Clear Filters */}
          {(search || moveType || company) && (
            <button
              onClick={() => {
                setSearchInput('');
                router.push('/executive-moves');
              }}
              className="px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>{total} executive move{total !== 1 ? 's' : ''} found</span>
          {totalPages > 1 && (
            <span>Page {page} of {totalPages}</span>
          )}
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && !loading && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : moves.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No executive moves found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="card overflow-hidden"
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Person</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">From</th>
                    <th className="text-center px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-12"></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">To</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Type</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {moves.map((move, i) => (
                      <motion.tr
                        key={move.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 border border-slate-600/50 flex-shrink-0">
                              {move.personName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-medium text-white text-sm group-hover:text-cyan-400 transition-colors">
                                {move.personName}
                              </div>
                              {move.summary && (
                                <div className="text-[10px] text-slate-500 max-w-xs truncate mt-0.5">
                                  {move.summary}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {move.fromCompany ? (
                            <div>
                              <div className="text-sm">
                                <CompanyLink
                                  name={move.fromCompany}
                                  slug={move.moveType === 'departed' ? move.companySlug : undefined}
                                />
                              </div>
                              {move.fromTitle && (
                                <div className="text-[11px] text-slate-500 mt-0.5">{move.fromTitle}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-sm">--</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className="text-slate-600 text-lg">
                            {move.moveType === 'departed' ? (
                              <svg className="w-4 h-4 mx-auto text-red-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 mx-auto text-cyan-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {move.toCompany ? (
                            <div>
                              <div className="text-sm">
                                <CompanyLink
                                  name={move.toCompany}
                                  slug={move.moveType !== 'departed' ? move.companySlug : undefined}
                                />
                              </div>
                              {move.toTitle && (
                                <div className="text-[11px] text-slate-500 mt-0.5">{move.toTitle}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-sm">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-300">{formatDate(move.date)}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {daysAgo(move.date) === 0 ? 'Today' : `${daysAgo(move.date)}d ago`}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {getMoveTypeBadge(move.moveType)}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </motion.div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            <AnimatePresence mode="popLayout">
              {moves.map((move, i) => (
                <motion.div
                  key={move.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 border border-slate-600/50 flex-shrink-0">
                        {move.personName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">{move.personName}</div>
                        <div className="text-[11px] text-slate-500">{formatDate(move.date)}</div>
                      </div>
                    </div>
                    {getMoveTypeBadge(move.moveType)}
                  </div>

                  <div className="space-y-1.5 text-xs ml-10">
                    {move.fromCompany && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-8 flex-shrink-0">From</span>
                        <div>
                          <CompanyLink
                            name={move.fromCompany}
                            slug={move.moveType === 'departed' ? move.companySlug : undefined}
                          />
                          {move.fromTitle && (
                            <span className="text-slate-500 ml-1">({move.fromTitle})</span>
                          )}
                        </div>
                      </div>
                    )}
                    {move.toCompany && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-8 flex-shrink-0">To</span>
                        <div>
                          <CompanyLink
                            name={move.toCompany}
                            slug={move.moveType !== 'departed' ? move.companySlug : undefined}
                          />
                          {move.toTitle && (
                            <span className="text-slate-500 ml-1">({move.toTitle})</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {move.summary && (
                    <p className="text-[11px] text-slate-400 mt-2 ml-10 line-clamp-2">
                      {move.summary}
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 mt-8"
            >
              <button
                onClick={() => updateParams({ page: Math.max(1, page - 1).toString() })}
                disabled={page <= 1}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => updateParams({ page: p.toString() })}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => updateParams({ page: Math.min(totalPages, page + 1).toString() })}
                disabled={page >= totalPages}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

export default function ExecutiveMovesPage() {
  return (
    <PremiumGate requiredTier="pro" context="executive-moves" showPreview={true}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }>
        <ExecutiveMovesContent />
      </Suspense>
    </PremiumGate>
  );
}
