'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Suggestion item from the API
interface SuggestionItem {
  type: 'company' | 'article' | 'module';
  name: string;
  path: string;
  detail: string | null;
}

interface SuggestionGroups {
  companies: SuggestionItem[];
  articles: SuggestionItem[];
  modules: SuggestionItem[];
}

interface SearchSuggestionsProps {
  query: string;
  isOpen: boolean;
  onSelect: (path: string) => void;
  /** Index offset for keyboard navigation in the parent */
  selectedIndex: number;
  /** Flat index offset: how many items precede this component in the parent list */
  indexOffset: number;
  onItemCountChange: (count: number) => void;
}

// Icons for each suggestion type
const CompanyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
  </svg>
);

const ArticleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
  </svg>
);

const ModuleIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

function getIconForType(type: SuggestionItem['type']) {
  switch (type) {
    case 'company':
      return <CompanyIcon />;
    case 'article':
      return <ArticleIcon />;
    case 'module':
      return <ModuleIcon />;
  }
}

function getColorForType(type: SuggestionItem['type'], isSelected: boolean) {
  if (isSelected) {
    switch (type) {
      case 'company':
        return 'bg-emerald-400/20 text-emerald-300';
      case 'article':
        return 'bg-blue-400/20 text-blue-300';
      case 'module':
        return 'bg-purple-400/20 text-purple-300';
    }
  }
  switch (type) {
    case 'company':
      return 'bg-emerald-500/10 text-emerald-400';
    case 'article':
      return 'bg-blue-500/10 text-blue-400';
    case 'module':
      return 'bg-purple-500/10 text-purple-400';
  }
}

function getBadgeForType(type: SuggestionItem['type']) {
  switch (type) {
    case 'company':
      return { label: 'Company', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'article':
      return { label: 'Article', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    case 'module':
      return { label: 'Module', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
  }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchSuggestions({
  query,
  isOpen,
  onSelect,
  selectedIndex,
  indexOffset,
  onItemCountChange,
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestionGroups>({
    companies: [],
    articles: [],
    modules: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounce(query, 200);

  // Fetch suggestions from the API
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions({ companies: [], articles: [], modules: [] });
      onItemCountChange(0);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);

    fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (controller.signal.aborted) return;
        const groups: SuggestionGroups = data.suggestions || {
          companies: [],
          articles: [],
          modules: [],
        };
        setSuggestions(groups);
        const totalCount =
          groups.companies.length + groups.articles.length + groups.modules.length;
        onItemCountChange(totalCount);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSuggestions({ companies: [], articles: [], modules: [] });
        onItemCountChange(0);
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, isOpen, onItemCountChange]);

  // Build a flat list of all suggestion items for index mapping
  const allItems: SuggestionItem[] = [
    ...suggestions.modules,
    ...suggestions.companies,
    ...suggestions.articles,
  ];

  if (allItems.length === 0 && !isLoading) {
    return null;
  }

  // Render groups with headers
  const groups: { label: string; items: SuggestionItem[]; startIndex: number }[] = [];
  let currentIndex = indexOffset;

  if (suggestions.modules.length > 0) {
    groups.push({ label: 'Modules', items: suggestions.modules, startIndex: currentIndex });
    currentIndex += suggestions.modules.length;
  }
  if (suggestions.companies.length > 0) {
    groups.push({ label: 'Companies', items: suggestions.companies, startIndex: currentIndex });
    currentIndex += suggestions.companies.length;
  }
  if (suggestions.articles.length > 0) {
    groups.push({ label: 'Articles', items: suggestions.articles, startIndex: currentIndex });
    currentIndex += suggestions.articles.length;
  }

  return (
    <div className="border-b border-white/10">
      {isLoading && allItems.length === 0 && (
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-white/10 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Finding suggestions...</span>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-4 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-300/60">
              {group.label}
            </span>
          </div>
          {group.items.map((item, idx) => {
            const flatIndex = group.startIndex + idx;
            const isSelected = flatIndex === selectedIndex;
            const badge = getBadgeForType(item.type);

            return (
              <button
                key={`suggestion-${item.type}-${item.path}-${idx}`}
                data-index={flatIndex}
                onClick={() => onSelect(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-white/5 border-l-2 border-white/10'
                    : 'border-l-2 border-transparent hover:bg-white/[0.06]'
                }`}
              >
                <div
                  className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${getColorForType(
                    item.type,
                    isSelected
                  )}`}
                >
                  {getIconForType(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium truncate ${
                        isSelected ? 'text-white/90' : 'text-white/90'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {item.detail && (
                    <p className="text-xs text-slate-400 truncate capitalize">
                      {item.detail.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <div className="flex-shrink-0">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-slate-400">
                      Enter
                    </kbd>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
