'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface CompanyOption {
  id: string;
  slug: string;
  name: string;
  tier: number;
  country: string | null;
  sector: string | null;
  logoUrl: string | null;
}

interface CompanySelectorProps {
  selectedSlugs: string[];
  onAdd: (slug: string) => void;
  onRemove: (slug: string) => void;
  maxCompanies?: number;
}

function getTierBadge(tier: number) {
  const styles: Record<number, { bg: string; text: string; label: string }> = {
    1: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'T1' },
    2: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'T2' },
    3: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'T3' },
  };
  const style = styles[tier] || styles[3];
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export default function CompanySelector({
  selectedSlugs,
  onAdd,
  onRemove,
  maxCompanies = 4,
}: CompanySelectorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ search: q, limit: '10' });
      const res = await fetch(`/api/company-profiles?${params}`);
      if (res.ok) {
        const data = await res.json();
        const companies: CompanyOption[] = (data.companies || []).map((c: any) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          tier: c.tier,
          country: c.country,
          sector: c.sector,
          logoUrl: c.logoUrl,
        }));
        setResults(companies.filter((c: CompanyOption) => !selectedSlugs.includes(c.slug)));
      }
    } catch {
      // silent
    } finally {
      setSearching(false);
    }
  }, [selectedSlugs]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      debounceRef.current = setTimeout(() => search(query), 300);
    } else {
      setResults([]);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (slug: string) => {
    onAdd(slug);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const isFull = selectedSlugs.length >= maxCompanies;

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          placeholder={
            isFull
              ? `Maximum ${maxCompanies} companies reached`
              : 'Search for a company to compare...'
          }
          disabled={isFull}
          aria-label="Search companies to compare"
          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <svg
          className="absolute left-3 top-3.5 w-4 h-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searching && (
          <div className="absolute right-3 top-3.5">
            <div className="w-4 h-4 border-2 border-slate-500 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Dropdown */}
        {isOpen && results.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl max-h-64 overflow-y-auto"
          >
            {results.map((company) => (
              <button
                key={company.slug}
                onClick={() => handleSelect(company.slug)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm flex-shrink-0 border border-slate-600/50">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-5 h-5 rounded object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs font-bold">
                      {company.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{company.name}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {[company.sector, company.country].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {getTierBadge(company.tier)}
              </button>
            ))}
          </div>
        )}
        {isOpen && query.trim() && !searching && results.length === 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl p-4"
          >
            <p className="text-sm text-slate-500 text-center">No companies found for &quot;{query}&quot;</p>
          </div>
        )}
      </div>

      {/* Selected companies as pills */}
      {selectedSlugs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSlugs.map((slug) => (
            <span
              key={slug}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium"
            >
              {slug}
              <button
                onClick={() => onRemove(slug)}
                className="hover:text-red-400 transition-colors ml-1"
                aria-label={`Remove ${slug} from comparison`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <span className="text-xs text-slate-500 self-center">
            {selectedSlugs.length}/{maxCompanies} companies
          </span>
        </div>
      )}
    </div>
  );
}
