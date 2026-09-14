'use client';

import { useState, useCallback, useRef, useId } from 'react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  categorySlug: string;
  categoryName: string;
  authorName: string;
  postCount: number;
  url: string;
  anchor: { anchorType: string; subjectTitle: string; subjectUrl: string | null } | null;
}

/**
 * Forum search.
 *
 * A form, not a keystroke listener: search runs on submit, so it works with
 * the keyboard alone, does not fire a query per character, and behaves the
 * way a screen-reader user expects. Results are announced through an
 * aria-live region rather than appearing silently.
 */
export default function ForumSearch({ categorySlug }: { categorySlug?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) {
        setResults(null);
        setError(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q });
        if (categorySlug) params.set('category', categorySlug);
        const res = await fetch(`/api/forums/search?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error('search failed');
        const json = await res.json();
        setResults(json.data?.results ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Search is unavailable right now. Please try again.');
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [query, categorySlug]
  );

  const clear = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
  }, []);

  return (
    <div className="mb-6">
      <form onSubmit={runSearch} role="search" className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {categorySlug ? 'Search this category' : 'Search the forum'}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={categorySlug ? 'Search this category…' : 'Search the forum…'}
          maxLength={120}
          className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/30 outline-none"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 h-11 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
        {results !== null && (
          <button
            type="button"
            onClick={clear}
            className="px-4 h-11 bg-white/[0.08] hover:bg-white/[0.12] text-white/80 rounded-lg transition-colors flex-shrink-0"
          >
            Clear
          </button>
        )}
      </form>

      {/* Status is announced, not just drawn. */}
      <div aria-live="polite" className="mt-3">
        {error && (
          <p className="text-sm text-amber-300">{error}</p>
        )}

        {results !== null && !error && (
          <>
            <p className="text-xs text-slate-400 mb-2">
              {results.length === 0
                ? `No threads match “${query.trim()}”.`
                : `${results.length} thread${results.length === 1 ? '' : 's'} match “${query.trim()}”, best match first.`}
            </p>

            {results.length > 0 && (
              <ul className="space-y-2">
                {results.map((r) => (
                  <li key={r.id} className="card p-4">
                    <Link
                      href={r.url}
                      className="font-medium text-white hover:text-cyan-300 focus:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded"
                    >
                      {r.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.excerpt}</p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {r.categoryName} · {r.postCount}{' '}
                      {r.postCount === 1 ? 'reply' : 'replies'}
                      {r.anchor?.subjectTitle ? ` · about ${r.anchor.subjectTitle}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
