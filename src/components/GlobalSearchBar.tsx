'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientLogger } from '@/lib/client-logger';

// ─────────────────────────────────────────────────────────────
// Types (mirror /api/search response shape)
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
}

interface ApiResponse {
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

interface SectionConfig {
  key: keyof ApiResponse['results'];
  title: string;
  tabKey: string; // matches /search ?type=
  accent: string;
}

const SECTIONS: SectionConfig[] = [
  { key: 'news',        title: 'News',        tabKey: 'news',        accent: 'text-blue-400' },
  { key: 'companies',   title: 'Companies',   tabKey: 'companies',   accent: 'text-emerald-400' },
  { key: 'jobs',        title: 'Jobs',        tabKey: 'jobs',        accent: 'text-amber-400' },
  { key: 'investors',   title: 'Investors',   tabKey: 'investors',   accent: 'text-violet-400' },
  { key: 'marketplace', title: 'Marketplace', tabKey: 'marketplace', accent: 'text-cyan-400' },
  { key: 'forum',       title: 'Community',   tabKey: 'forum',       accent: 'text-orange-400' },
  { key: 'blog',        title: 'Blog',        tabKey: 'blog',        accent: 'text-pink-400' },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function stripMarks(html: string): string {
  return (html || '').replace(/<\/?mark>/gi, '').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

export interface GlobalSearchBarProps {
  /**
   * How the trigger renders in the parent (e.g. Navigation).
   *  - 'button': a search-icon button (default)
   *  - 'pill':   a wider "Search…   Ctrl+K" pill suited to desktop headers
   *  - 'hidden': renders nothing visible (parent opens via the keyboard shortcut only)
   */
  triggerVariant?: 'button' | 'pill' | 'hidden';
  className?: string;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function GlobalSearchBar({
  triggerVariant = 'pill',
  className = '',
}: GlobalSearchBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 250);

  // Open/close handlers
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => {
    setOpen(false);
    setQuery('');
    setData(null);
  }, []);

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const isSearchShortcut = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      if (isSearchShortcut) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
      // Forward-slash quick-open (skip when typing in inputs/textareas)
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const editable = target?.isContentEditable;
        if (tag !== 'input' && tag !== 'textarea' && !editable) {
          e.preventDefault();
          setOpen(true);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Focus input on open + lock body scroll
  useEffect(() => {
    if (open) {
      // Defer to next tick so the input is mounted
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = 'hidden';
      return () => {
        cancelAnimationFrame(id);
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Fetch results when query changes (while modal open)
  useEffect(() => {
    if (!open) return;
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('q', trimmed);
        params.set('type', 'all');
        params.set('limit', '3');

        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const json: ApiResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        clientLogger.error('Global search bar fetch failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open]);

  // Navigate to a result and close
  const go = useCallback((url: string) => {
    closeModal();
    if (isExternalUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(url);
  }, [router, closeModal]);

  // Submit → go to full search page
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    closeModal();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router, closeModal]);

  // Render trigger
  const triggerClasses =
    'inline-flex items-center gap-2 text-star-300 hover:text-white transition-colors';

  const trigger = (() => {
    if (triggerVariant === 'hidden') return null;
    if (triggerVariant === 'button') {
      return (
        <button
          type="button"
          onClick={openModal}
          aria-label="Open global search (Ctrl+K)"
          className={`${triggerClasses} p-2 rounded-lg hover:bg-white/[0.06] ${className}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      );
    }
    // 'pill'
    return (
      <button
        type="button"
        onClick={openModal}
        aria-label="Open global search (Ctrl+K)"
        className={`${triggerClasses} hidden md:inline-flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.06] ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm">Search…</span>
        <kbd className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] text-star-300 font-mono">
          Ctrl K
        </kbd>
      </button>
    );
  })();

  return (
    <>
      {trigger}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Global search"
          className="fixed inset-0 z-[1000] flex items-start justify-center p-4 sm:pt-24"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

          {/* Panel */}
          <div
            ref={panelRef}
            className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden"
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <svg className="w-5 h-5 text-star-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search news, companies, jobs, investors, marketplace, community…"
                  aria-label="Global search"
                  className="flex-1 bg-transparent text-white placeholder-star-400 focus:outline-none text-base"
                />
                {loading && (
                  <div className="w-4 h-4 border-2 border-white/10 border-t-white rounded-full animate-spin flex-shrink-0" />
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close search"
                  className="flex-shrink-0 text-star-300 hover:text-white transition-colors p-1 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim().length < 2 && (
                <div className="p-6 text-center text-star-300 text-sm">
                  <p className="mb-3">Type at least 2 characters to search.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['SpaceX', 'Artemis', 'propulsion', 'earth observation'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        className="px-3 py-1 text-xs rounded-full bg-white/[0.06] border border-white/[0.06] text-star-300 hover:border-white/10 hover:text-white transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {query.trim().length >= 2 && !loading && data && data.totals.all === 0 && (
                <div className="p-8 text-center text-star-300 text-sm">
                  No results for <span className="text-white/80">"{query.trim()}"</span>.
                </div>
              )}

              {data && data.totals.all > 0 && (
                <div className="py-2">
                  {SECTIONS.map((section) => {
                    const items = data.results[section.key];
                    const total = data.totals[section.key];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={section.key} className="py-2">
                        <div className="flex items-center justify-between px-4 py-1.5">
                          <h3 className={`text-[10px] font-semibold uppercase tracking-widest ${section.accent}`}>
                            {section.title}
                          </h3>
                          {total > items.length && (
                            <Link
                              href={`/search?q=${encodeURIComponent(query.trim())}&type=${section.tabKey}`}
                              onClick={closeModal}
                              className="text-[10px] text-star-300 hover:text-white transition-colors"
                            >
                              View all {total} →
                            </Link>
                          )}
                        </div>
                        <ul>
                          {items.slice(0, 3).map((item) => (
                            <li key={`${item.type}-${item.id}`}>
                              <button
                                type="button"
                                onClick={() => go(item.url)}
                                className="w-full text-left px-4 py-2.5 hover:bg-white/[0.04] transition-colors flex items-start gap-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white truncate">{item.title}</p>
                                  {item.snippet && (
                                    <p className="text-xs text-star-300 mt-0.5 line-clamp-1">
                                      {stripMarks(item.snippet)}
                                    </p>
                                  )}
                                </div>
                                <svg className="w-3.5 h-3.5 text-star-300/60 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-white/[0.02] text-[11px] text-star-300">
              <span>
                Press <kbd className="px-1 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] font-mono text-[10px]">Enter</kbd> for full search
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] font-mono text-[10px]">Esc</kbd> to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
