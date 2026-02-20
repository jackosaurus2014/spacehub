'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  CUSTOMER_SEGMENTS,
  PROCUREMENT_CATEGORIES,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPE_COLORS,
  type CustomerSegment,
  type ProcurementCategory,
} from '@/lib/customer-discovery-data';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface EnrichedSegment extends CustomerSegment {
  matchingCategories: string[];
  matchingTechNeeds: string[];
  relevanceScore: number;
}

interface RelatedCompany {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sector: string | null;
  subsector: string | null;
  tags: string[];
  headquarters: string | null;
  employeeRange: string | null;
  tier: number;
  logoUrl: string | null;
  cageCode: string | null;
  samUei: string | null;
  website: string | null;
}

interface DiscoveryResult {
  segments: EnrichedSegment[];
  totalMatches: number;
  categories: ProcurementCategory[];
  relatedCompanies: Record<string, RelatedCompany[]>;
}

type CustomerType = 'government' | 'prime_contractor' | 'commercial' | 'international' | 'end_user';

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function getCategoryName(id: string): string {
  return PROCUREMENT_CATEGORIES.find(c => c.id === id)?.name || id;
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function CustomerDiscoveryPage() {
  // State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<CustomerType | ''>('');
  const [results, setResults] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'search' | 'browse'>('search');

  // Toggle procurement category selection
  const toggleCategory = useCallback((catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  }, []);

  // Add keyword
  const addKeyword = useCallback(() => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords(prev => [...prev, trimmed]);
      setKeywordInput('');
    }
  }, [keywordInput, keywords]);

  // Remove keyword
  const removeKeyword = useCallback((kw: string) => {
    setKeywords(prev => prev.filter(k => k !== kw));
  }, []);

  // Handle Enter key for keyword input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  }, [addKeyword]);

  // Toggle expanded segment (to show companies)
  const toggleSegmentExpanded = useCallback((segmentId: string) => {
    setExpandedSegments(prev => {
      const next = new Set(prev);
      if (next.has(segmentId)) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });
  }, []);

  // Search
  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategories.length > 0) {
        params.set('categories', selectedCategories.join(','));
      }
      if (keywords.length > 0) {
        params.set('keywords', keywords.join(','));
      }
      if (typeFilter) {
        params.set('type', typeFilter);
      }
      params.set('includeCompanies', 'true');

      const res = await fetch(`/api/customer-discovery?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const json = await res.json();
      setResults(json.data);
      setExpandedSegments(new Set());
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCategories, keywords, typeFilter]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setKeywords([]);
    setKeywordInput('');
    setTypeFilter('');
    setResults(null);
    setExpandedSegments(new Set());
  }, []);

  // CSV export data
  const exportData = useMemo(() => {
    if (!results) return [];
    return results.segments.map(seg => ({
      name: seg.name,
      type: CUSTOMER_TYPE_LABELS[seg.type] || seg.type,
      budgetRange: seg.annualBudgetRange || 'N/A',
      decisionCycle: seg.decisionCycle,
      procurementCategories: seg.procurementCategories.map(getCategoryName).join('; '),
      techNeeds: seg.techNeeds.join('; '),
      matchingCategories: seg.matchingCategories.map(getCategoryName).join('; '),
      matchingTechNeeds: seg.matchingTechNeeds.join('; '),
      relevanceScore: seg.relevanceScore,
      description: seg.description,
    }));
  }, [results]);

  const exportColumns = [
    { key: 'name', label: 'Customer' },
    { key: 'type', label: 'Type' },
    { key: 'budgetRange', label: 'Annual Budget' },
    { key: 'decisionCycle', label: 'Decision Cycle' },
    { key: 'matchingCategories', label: 'Matching Categories' },
    { key: 'matchingTechNeeds', label: 'Matching Tech Needs' },
    { key: 'relevanceScore', label: 'Relevance Score' },
    { key: 'procurementCategories', label: 'All Procurement Categories' },
    { key: 'techNeeds', label: 'All Tech Needs' },
    { key: 'description', label: 'Description' },
  ];

  const customerTypes: { value: CustomerType | ''; label: string }[] = [
    { value: '', label: 'All Types' },
    { value: 'government', label: 'Government Agencies' },
    { value: 'prime_contractor', label: 'Prime Contractors' },
    { value: 'commercial', label: 'Commercial Space' },
    { value: 'international', label: 'International Agencies' },
    { value: 'end_user', label: 'End-User Industries' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Customer Discovery Database"
          subtitle="Find your space industry customers. Cross-reference procurement categories and tech needs to discover who buys what you build."
          accentColor="emerald"
          breadcrumb="Business Intelligence"
        />

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 mb-8">
          {[
            { label: 'Customer Segments', value: CUSTOMER_SEGMENTS.length.toString() },
            { label: 'Procurement Categories', value: PROCUREMENT_CATEGORIES.length.toString() },
            { label: 'Government Agencies', value: CUSTOMER_SEGMENTS.filter(s => s.type === 'government').length.toString() },
            { label: 'Industry Verticals', value: CUSTOMER_SEGMENTS.filter(s => s.type === 'end_user').length.toString() },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-emerald-400">{stat.value}</div>
              <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-700/50 pb-4">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            Customer Finder
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'browse'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            Procurement Categories
          </button>
        </div>

        {/* ── Customer Finder Tab ── */}
        {activeTab === 'search' && (
          <div className="space-y-8">
            {/* Search Panel */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">
                What does your company offer?
              </h2>

              {/* Procurement Categories */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Select procurement categories that match your product/service:
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROCUREMENT_CATEGORIES.map(cat => {
                    const selected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                          selected
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-slate-700/40 text-slate-400 border-slate-600/40 hover:text-slate-300 hover:border-slate-500/50'
                        }`}
                        title={cat.description}
                      >
                        {selected && (
                          <span className="mr-1.5">&#10003;</span>
                        )}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tech Keywords */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Technology keywords (describe your capabilities):
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., electric propulsion, AI, composite structures..."
                    className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!keywordInput.trim()}
                    className="px-4 py-2.5 bg-emerald-600/80 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Add
                  </button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map(kw => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/15 text-cyan-400 rounded-full text-sm border border-cyan-500/30"
                      >
                        {kw}
                        <button
                          onClick={() => removeKeyword(kw)}
                          className="hover:text-red-400 transition-colors ml-0.5"
                          aria-label={`Remove keyword ${kw}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Filter by customer type:
                </label>
                <div className="flex flex-wrap gap-2">
                  {customerTypes.map(ct => (
                    <button
                      key={ct.value}
                      onClick={() => setTypeFilter(ct.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        typeFilter === ct.value
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-700/40 text-slate-400 border-slate-600/40 hover:text-slate-300 hover:border-slate-500/50'
                      }`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-semibold hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {loading ? 'Searching...' : 'Find Customers'}
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-slate-400 hover:text-slate-300 rounded-lg text-sm transition-colors"
                >
                  Clear All
                </button>
                {results && results.segments.length > 0 && (
                  <div className="ml-auto">
                    <ExportButton
                      data={exportData}
                      filename="customer-discovery-results"
                      columns={exportColumns}
                      label="Export Results"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {/* Results */}
            {results && !loading && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-100">
                    {results.totalMatches === 0
                      ? 'No matching customers found'
                      : `${results.totalMatches} potential customer${results.totalMatches === 1 ? '' : 's'} found`}
                  </h2>
                  {results.totalMatches > 0 && (
                    <span className="text-sm text-slate-400">
                      Sorted by relevance
                    </span>
                  )}
                </div>

                {results.totalMatches === 0 && (
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-8 text-center">
                    <p className="text-slate-400 mb-2">
                      No customers match your current criteria.
                    </p>
                    <p className="text-sm text-slate-500">
                      Try broadening your search by adding more categories or different keywords.
                    </p>
                  </div>
                )}

                <StaggerContainer className="space-y-4">
                  {results.segments.map((segment) => {
                    const isExpanded = expandedSegments.has(segment.id);
                    const companies = results.relatedCompanies[segment.id] || [];
                    const typeBadgeColor = CUSTOMER_TYPE_COLORS[segment.type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';

                    return (
                      <StaggerItem key={segment.id}>
                        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden hover:border-slate-600/50 transition-all">
                          {/* Segment Header */}
                          <div className="p-5">
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <span className="text-3xl flex-shrink-0 mt-0.5" role="img" aria-hidden="true">
                                {segment.icon}
                              </span>

                              <div className="flex-1 min-w-0">
                                {/* Name + Badge */}
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold text-slate-100">
                                    {segment.name}
                                  </h3>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeBadgeColor}`}>
                                    {CUSTOMER_TYPE_LABELS[segment.type]}
                                  </span>
                                  {segment.relevanceScore > 0 && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                      Score: {segment.relevanceScore}
                                    </span>
                                  )}
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                                  {segment.description}
                                </p>

                                {/* Meta row */}
                                <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
                                  {segment.annualBudgetRange && (
                                    <span className="flex items-center gap-1.5">
                                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="text-slate-400">{segment.annualBudgetRange}</span>
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-slate-400">Decision cycle: {segment.decisionCycle}</span>
                                  </span>
                                </div>

                                {/* Matching categories */}
                                {segment.matchingCategories.length > 0 && (
                                  <div className="mb-3">
                                    <span className="text-xs font-medium text-emerald-400 mr-2">Matching categories:</span>
                                    <div className="inline-flex flex-wrap gap-1.5 mt-1">
                                      {segment.matchingCategories.map(catId => (
                                        <span
                                          key={catId}
                                          className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                                        >
                                          {getCategoryName(catId)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Matching tech needs */}
                                {segment.matchingTechNeeds.length > 0 && (
                                  <div className="mb-3">
                                    <span className="text-xs font-medium text-cyan-400 mr-2">Matching tech needs:</span>
                                    <div className="inline-flex flex-wrap gap-1.5 mt-1">
                                      {segment.matchingTechNeeds.map(need => (
                                        <span
                                          key={need}
                                          className="text-xs px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                                        >
                                          {need}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* All tech needs (collapsed view) */}
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-slate-500 mr-2">Tech needs:</span>
                                  <div className="inline-flex flex-wrap gap-1.5 mt-1">
                                    {segment.techNeeds
                                      .filter(n => !segment.matchingTechNeeds.includes(n))
                                      .map(need => (
                                        <span
                                          key={need}
                                          className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-400"
                                        >
                                          {need}
                                        </span>
                                      ))}
                                  </div>
                                </div>

                                {/* View Companies button */}
                                {companies.length > 0 && (
                                  <button
                                    onClick={() => toggleSegmentExpanded(segment.id)}
                                    className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                                  >
                                    <svg
                                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    {isExpanded ? 'Hide' : 'View'} {companies.length} related compan{companies.length === 1 ? 'y' : 'ies'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expanded companies panel */}
                          {isExpanded && companies.length > 0 && (
                            <div className="border-t border-slate-700/50 bg-slate-900/40 p-5">
                              <h4 className="text-sm font-semibold text-slate-300 mb-3">
                                Related Companies in Database
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {companies.map((company) => (
                                  <Link
                                    key={company.id}
                                    href={`/company-profiles/${company.slug}`}
                                    className="bg-slate-800/60 border border-slate-700/40 rounded-lg p-3 hover:border-emerald-500/30 hover:bg-slate-800/80 transition-all group"
                                  >
                                    <div className="flex items-center gap-2 mb-1.5">
                                      {company.logoUrl ? (
                                        <img
                                          src={company.logoUrl}
                                          alt=""
                                          className="w-6 h-6 rounded object-contain bg-white/10"
                                        />
                                      ) : (
                                        <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                                          {company.name.charAt(0)}
                                        </div>
                                      )}
                                      <span className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                                        {company.name}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 text-xs">
                                      {company.sector && (
                                        <span className="px-1.5 py-0.5 bg-slate-700/60 text-slate-400 rounded">
                                          {company.sector}
                                        </span>
                                      )}
                                      {company.cageCode && (
                                        <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded" title="CAGE Code">
                                          CAGE: {company.cageCode}
                                        </span>
                                      )}
                                      {company.tier === 1 && (
                                        <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded">
                                          Tier 1
                                        </span>
                                      )}
                                    </div>
                                    {company.headquarters && (
                                      <p className="text-xs text-slate-500 mt-1.5 truncate">
                                        {company.headquarters}
                                      </p>
                                    )}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              </div>
            )}

            {/* Initial state — show prompt */}
            {!results && !loading && (
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-10 text-center">
                <div className="text-4xl mb-4">&#x1F50E;</div>
                <h3 className="text-lg font-semibold text-slate-200 mb-2">
                  Discover Your Space Industry Customers
                </h3>
                <p className="text-sm text-slate-400 max-w-lg mx-auto">
                  Select the procurement categories that match your product or service, add technology keywords,
                  and we will cross-reference our database to find potential buyers, including government agencies,
                  prime contractors, commercial space companies, and end-user industries.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Procurement Categories Tab ── */}
        {activeTab === 'browse' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-2">
                Space Industry Procurement Categories
              </h2>
              <p className="text-sm text-slate-400">
                Browse procurement categories with NAICS codes, typical budgets, and key buyers.
                Understanding these categories helps you position your product for the right contracts.
              </p>
            </div>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROCUREMENT_CATEGORIES.map(cat => (
                <StaggerItem key={cat.id}>
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 hover:border-emerald-500/30 transition-all h-full flex flex-col">
                    <h3 className="text-base font-semibold text-slate-100 mb-2">
                      {cat.name}
                    </h3>
                    <p className="text-sm text-slate-400 mb-4 flex-1">
                      {cat.description}
                    </p>

                    {/* NAICS Codes */}
                    <div className="mb-3">
                      <span className="text-xs font-medium text-slate-500">NAICS Codes:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cat.naicsCodes.map(code => (
                          <span
                            key={code}
                            className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 font-mono"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="mb-3">
                      <span className="text-xs font-medium text-slate-500">Typical Budget:</span>
                      <span className="text-xs text-emerald-400 ml-2 font-medium">{cat.typicalBudget}</span>
                    </div>

                    {/* Key Buyers */}
                    <div>
                      <span className="text-xs font-medium text-slate-500">Key Buyers:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {cat.keyBuyers.map(buyer => (
                          <span
                            key={buyer}
                            className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300"
                          >
                            {buyer}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Quick use button */}
                    <button
                      onClick={() => {
                        if (!selectedCategories.includes(cat.id)) {
                          setSelectedCategories(prev => [...prev, cat.id]);
                        }
                        setActiveTab('search');
                      }}
                      className="mt-4 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Use in Customer Finder
                    </button>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        )}

        {/* All Customer Segments Overview (always visible at bottom) */}
        <div className="mt-16 mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            All Customer Segments
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            A comprehensive overview of all space industry customer segments by type.
          </p>

          {(['government', 'prime_contractor', 'commercial', 'international', 'end_user'] as CustomerType[]).map(type => {
            const segmentsOfType = CUSTOMER_SEGMENTS.filter(s => s.type === type);
            const typeColor = CUSTOMER_TYPE_COLORS[type];

            return (
              <div key={type} className="mb-8">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${typeColor.split(' ')[0]}`} />
                  {CUSTOMER_TYPE_LABELS[type]} ({segmentsOfType.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {segmentsOfType.map(seg => (
                    <div
                      key={seg.id}
                      className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4 hover:border-slate-600/50 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl" role="img" aria-hidden="true">{seg.icon}</span>
                        <span className="text-sm font-medium text-slate-200">{seg.name}</span>
                      </div>
                      {seg.annualBudgetRange && (
                        <div className="text-xs text-emerald-400 mb-1">{seg.annualBudgetRange}</div>
                      )}
                      <div className="text-xs text-slate-500">
                        {seg.procurementCategories.length} categories | {seg.decisionCycle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
