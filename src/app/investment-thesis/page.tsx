'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ============================================================================
// TYPES
// ============================================================================

interface CompanyOption {
  slug: string;
  name: string;
  sector: string | null;
  tier: number;
  logoUrl: string | null;
}

interface ThesisRisk {
  risk: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
}

interface InvestmentThesis {
  executiveSummary: string;
  recommendation: 'invest' | 'monitor' | 'pass';
  confidenceLevel: 'high' | 'medium' | 'low';
  marketOpportunity: {
    tam: string;
    growth: string;
    timing: string;
  };
  companyStrengths: string[];
  companyWeaknesses: string[];
  competitivePosition: string;
  financialAnalysis: {
    fundingEfficiency: string;
    revenueTrajectory: string;
    pathToProfitability: string;
  };
  bullCase: string;
  bearCase: string;
  keyRisks: ThesisRisk[];
  keyMilestones: string[];
  comparableTransactions: string;
  regulatoryOutlook: string;
}

interface ThesisResponse {
  company: {
    name: string;
    slug: string;
    sector: string | null;
    tier: number;
    logoUrl: string | null;
  };
  thesis: InvestmentThesis;
  generatedAt: string;
  riskAssessment: {
    overallScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    estimatedTimeline: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RECOMMENDATION_CONFIG = {
  invest: {
    label: 'INVEST',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
  },
  monitor: {
    label: 'MONITOR',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/10',
  },
  pass: {
    label: 'PASS',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/10',
  },
};

const CONFIDENCE_CONFIG = {
  high: { label: 'High Confidence', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  medium: { label: 'Medium Confidence', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  low: { label: 'Low Confidence', color: 'text-orange-400', bg: 'bg-orange-500/15' },
};

const SEVERITY_CONFIG = {
  high: { label: 'HIGH', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  medium: { label: 'MEDIUM', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  low: { label: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
};

const RISK_LEVEL_CONFIG = {
  low: { label: 'LOW', color: '#10b981', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  medium: { label: 'MEDIUM', color: '#f59e0b', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { label: 'HIGH', color: '#f97316', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  critical: { label: 'CRITICAL', color: '#ef4444', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const LOADING_MESSAGES = [
  'Analyzing company financials...',
  'Evaluating competitive landscape...',
  'Assessing market opportunity...',
  'Reviewing regulatory environment...',
  'Computing risk factors...',
  'Building investment thesis...',
  'Generating final analysis...',
];

// ============================================================================
// RISK GAUGE COMPONENT
// ============================================================================

function RiskGauge({ score, riskLevel }: { score: number; riskLevel: 'low' | 'medium' | 'high' | 'critical' }) {
  const config = RISK_LEVEL_CONFIG[riskLevel];
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (score / 100) * circumference * 0.75;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="rgba(148, 163, 184, 0.15)"
            strokeWidth="16"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={config.color}
            strokeWidth="16"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-100">{score}</span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>
      <div className={`mt-2 px-3 py-1 rounded-full ${config.bg} ${config.border} border`}>
        <span className={`text-xs font-bold ${config.text} tracking-wider`}>{config.label} RISK</span>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ThesisSkeleton() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-pulse">
      {/* Loading indicator */}
      <div className="bg-slate-800/30 border border-cyan-500/20 rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        </div>
        <p className="text-lg font-medium text-slate-200 mb-2">Generating Investment Thesis</p>
        <p className="text-sm text-cyan-400 transition-opacity duration-300">
          {LOADING_MESSAGES[messageIndex]}
        </p>
        <p className="text-xs text-slate-500 mt-4">This typically takes 10-15 seconds</p>
      </div>

      {/* Skeleton cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
            <div className="h-4 bg-slate-700/50 rounded w-1/3 mb-4" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-700/30 rounded w-full" />
              <div className="h-3 bg-slate-700/30 rounded w-5/6" />
              <div className="h-3 bg-slate-700/30 rounded w-4/6" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
        <div className="h-4 bg-slate-700/50 rounded w-1/4 mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-slate-700/30 rounded w-full" />
          <div className="h-3 bg-slate-700/30 rounded w-full" />
          <div className="h-3 bg-slate-700/30 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function InvestmentThesisPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanyOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [topCompanies, setTopCompanies] = useState<CompanyOption[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [thesisData, setThesisData] = useState<ThesisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Fetch top-tier companies on mount
  useEffect(() => {
    fetch('/api/company-profiles?tier=1&limit=20&sortBy=name&sortOrder=asc')
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) {
          setTopCompanies(
            data.companies.map((c: CompanyOption & { id?: string }) => ({
              slug: c.slug,
              name: c.name,
              sector: c.sector,
              tier: c.tier,
              logoUrl: c.logoUrl,
            }))
          );
        }
      })
      .catch(() => {
        // Silently fail - top companies is a convenience feature
      });
  }, []);

  // Search companies with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedCompany(null);
    setError(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/company-profiles?search=${encodeURIComponent(query)}&limit=10&sortBy=tier&sortOrder=asc`
        );
        const data = await res.json();
        if (data.companies) {
          setSearchResults(
            data.companies.map((c: CompanyOption & { id?: string }) => ({
              slug: c.slug,
              name: c.name,
              sector: c.sector,
              tier: c.tier,
              logoUrl: c.logoUrl,
            }))
          );
          setShowDropdown(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Select a company
  const selectCompany = useCallback((company: CompanyOption) => {
    setSelectedCompany(company);
    setSearchQuery(company.name);
    setShowDropdown(false);
    setError(null);
  }, []);

  // Generate thesis
  const generateThesis = useCallback(async () => {
    if (!selectedCompany) return;

    setIsGenerating(true);
    setError(null);
    setThesisData(null);

    try {
      const res = await fetch('/api/investment-thesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companySlug: selectedCompany.slug }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Request failed (${res.status})`);
      }

      const data: ThesisResponse = await res.json();
      setThesisData(data);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate thesis');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedCompany]);

  // Reset
  const reset = useCallback(() => {
    setSelectedCompany(null);
    setSearchQuery('');
    setThesisData(null);
    setError(null);
  }, []);

  const thesis = thesisData?.thesis;
  const recConfig = thesis ? RECOMMENDATION_CONFIG[thesis.recommendation] || RECOMMENDATION_CONFIG.monitor : null;
  const confConfig = thesis ? CONFIDENCE_CONFIG[thesis.confidenceLevel] || CONFIDENCE_CONFIG.medium : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <AnimatedPageHeader
          title="AI Investment Thesis Generator"
          subtitle="Generate comprehensive, AI-powered investment theses for space companies using SpaceNexus platform intelligence. Powered by Claude AI."
          breadcrumb="Space Market Intelligence"
          accentColor="purple"
        />

        {/* Disclaimer */}
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg px-4 py-2.5 mb-6">
          <p className="text-purple-400/90 text-xs font-medium">
            AI-generated analysis. Not financial advice. Data accuracy depends on SpaceNexus platform data. Always conduct your own due diligence.
          </p>
        </div>

        {/* ── COMPANY SELECTOR ─────────────────────────────────────────── */}
        <ScrollReveal>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold text-slate-100 mb-2">Select a Company</h2>
            <p className="text-sm text-slate-400 mb-6">
              Search for any company in our database or select from top-tier companies below.
            </p>

            {/* Search Input */}
            <div className="relative mb-6" ref={dropdownRef}>
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search companies by name, ticker, or sector..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-slate-600 border-t-purple-400 rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl shadow-black/30 max-h-72 overflow-y-auto">
                  {searchResults.map((company) => (
                    <button
                      key={company.slug}
                      onClick={() => selectCompany(company)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-700/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt=""
                          className="w-8 h-8 rounded-lg object-contain bg-white/10 p-0.5"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-400">
                            {company.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{company.name}</p>
                        <p className="text-xs text-slate-500">
                          {company.sector || 'Unknown sector'} &middot; Tier {company.tier}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Company Badge */}
            {selectedCompany && (
              <div className="flex items-center gap-3 mb-6 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                {selectedCompany.logoUrl ? (
                  <img
                    src={selectedCompany.logoUrl}
                    alt=""
                    className="w-10 h-10 rounded-lg object-contain bg-white/10 p-0.5"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-400">
                      {selectedCompany.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-300">{selectedCompany.name}</p>
                  <p className="text-xs text-slate-400">
                    {selectedCompany.sector || 'Unknown'} &middot; Tier {selectedCompany.tier}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                  title="Clear selection"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Top Companies Grid */}
            {!selectedCompany && topCompanies.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
                  Or select a top-tier company
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {topCompanies.map((company) => (
                    <button
                      key={company.slug}
                      onClick={() => selectCompany(company)}
                      className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-left hover:bg-slate-700/50 hover:border-slate-600/50 transition-all group"
                    >
                      <p className="text-xs font-medium text-slate-300 truncate group-hover:text-slate-100">
                        {company.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{company.sector}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={generateThesis}
                disabled={!selectedCompany || isGenerating}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedCompany && !isGenerating
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-400 hover:to-indigo-400 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generating Thesis...
                  </span>
                ) : (
                  'Generate Investment Thesis'
                )}
              </button>
              {thesisData && (
                <button
                  onClick={reset}
                  className="px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  New Analysis
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* ── LOADING STATE ────────────────────────────────────────────── */}
        {isGenerating && <ThesisSkeleton />}

        {/* ── THESIS RESULTS ───────────────────────────────────────────── */}
        {thesis && thesisData && !isGenerating && (
          <div ref={resultsRef}>
            <StaggerContainer className="space-y-6">
              {/* Header Card */}
              <StaggerItem>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      {thesisData.company.logoUrl ? (
                        <img
                          src={thesisData.company.logoUrl}
                          alt=""
                          className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center">
                          <span className="text-xl font-bold text-slate-400">
                            {thesisData.company.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-slate-100">{thesisData.company.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-xs text-slate-300">
                            {thesisData.company.sector || 'Unknown'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-xs text-slate-300">
                            Tier {thesisData.company.tier}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {recConfig && (
                        <div className={`px-4 py-2 rounded-xl ${recConfig.bg} ${recConfig.border} border shadow-lg ${recConfig.glow}`}>
                          <span className={`text-sm font-bold ${recConfig.color} tracking-wider`}>
                            {recConfig.label}
                          </span>
                        </div>
                      )}
                      {confConfig && (
                        <div className={`px-3 py-2 rounded-xl ${confConfig.bg}`}>
                          <span className={`text-xs font-medium ${confConfig.color}`}>
                            {confConfig.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamp + Export */}
                  <div className="flex items-center justify-between border-t border-slate-700/50 pt-4">
                    <p className="text-xs text-slate-500">
                      Generated {new Date(thesisData.generatedAt).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/company-profiles/${thesisData.company.slug}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all"
                      >
                        View Company Profile
                      </Link>
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 transition-all"
                      >
                        Export PDF
                      </button>
                    </div>
                  </div>
                </div>
              </StaggerItem>

              {/* Executive Summary */}
              <StaggerItem>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 md:p-8">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Executive Summary</h3>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                    {thesis.executiveSummary}
                  </p>
                </div>
              </StaggerItem>

              {/* Market Opportunity */}
              <StaggerItem>
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Market Opportunity</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200">TAM</h4>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{thesis.marketOpportunity.tam}</p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200">Growth Drivers</h4>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{thesis.marketOpportunity.growth}</p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200">Why Now</h4>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{thesis.marketOpportunity.timing}</p>
                  </div>
                </div>
              </StaggerItem>

              {/* Strengths & Weaknesses */}
              <StaggerItem>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="bg-slate-800/30 border border-emerald-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Strengths
                    </h3>
                    <ul className="space-y-3">
                      {thesis.companyStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-emerald-400">{i + 1}</span>
                          </div>
                          <p className="text-sm text-slate-300">{s}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-slate-800/30 border border-red-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Weaknesses
                    </h3>
                    <ul className="space-y-3">
                      {thesis.companyWeaknesses.map((w, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-red-400">{i + 1}</span>
                          </div>
                          <p className="text-sm text-slate-300">{w}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </StaggerItem>

              {/* Competitive Position */}
              <StaggerItem>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Competitive Position</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{thesis.competitivePosition}</p>
                </div>
              </StaggerItem>

              {/* Financial Analysis */}
              <StaggerItem>
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Financial Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                    <h4 className="text-sm font-semibold text-amber-400 mb-3">Funding Efficiency</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{thesis.financialAnalysis.fundingEfficiency}</p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                    <h4 className="text-sm font-semibold text-cyan-400 mb-3">Revenue Trajectory</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{thesis.financialAnalysis.revenueTrajectory}</p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                    <h4 className="text-sm font-semibold text-purple-400 mb-3">Path to Profitability</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{thesis.financialAnalysis.pathToProfitability}</p>
                  </div>
                </div>
              </StaggerItem>

              {/* Bull / Bear Cases */}
              <StaggerItem>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bull Case */}
                  <div className="bg-slate-800/30 border border-emerald-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <h3 className="text-lg font-semibold text-emerald-400">Bull Case</h3>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{thesis.bullCase}</p>
                  </div>

                  {/* Bear Case */}
                  <div className="bg-slate-800/30 border border-red-500/20 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      <h3 className="text-lg font-semibold text-red-400">Bear Case</h3>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{thesis.bearCase}</p>
                  </div>
                </div>
              </StaggerItem>

              {/* Key Risks Table */}
              <StaggerItem>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Key Risks</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pr-4">
                            Risk
                          </th>
                          <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 px-4 w-28">
                            Severity
                          </th>
                          <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3 pl-4">
                            Mitigation
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {thesis.keyRisks.map((risk, i) => {
                          const sevConfig = SEVERITY_CONFIG[risk.severity] || SEVERITY_CONFIG.medium;
                          return (
                            <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                              <td className="py-3 pr-4">
                                <p className="text-sm text-slate-300">{risk.risk}</p>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${sevConfig.bg} ${sevConfig.border} border ${sevConfig.color}`}
                                >
                                  {sevConfig.label}
                                </span>
                              </td>
                              <td className="py-3 pl-4">
                                <p className="text-sm text-slate-400">{risk.mitigation}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </StaggerItem>

              {/* Key Milestones */}
              <StaggerItem>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Key Milestones to Watch</h3>
                  <div className="space-y-3">
                    {thesis.keyMilestones.map((milestone, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-purple-400">{i + 1}</span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed pt-1">{milestone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </StaggerItem>

              {/* Comparable Transactions */}
              <StaggerItem>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Comparable Transactions</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{thesis.comparableTransactions}</p>
                </div>
              </StaggerItem>

              {/* Regulatory Outlook with Risk Gauge */}
              <StaggerItem>
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Regulatory Outlook</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <p className="text-sm text-slate-300 leading-relaxed mb-4">{thesis.regulatoryOutlook}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Timeline:</span>
                          <span className="text-slate-200 font-medium">{thesisData.riskAssessment.estimatedTimeline}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <RiskGauge
                        score={thesisData.riskAssessment.overallScore}
                        riskLevel={thesisData.riskAssessment.riskLevel}
                      />
                    </div>
                  </div>
                </div>
              </StaggerItem>

              {/* Actions */}
              <StaggerItem>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-400 hover:to-indigo-400 shadow-lg shadow-purple-500/20 transition-all"
                  >
                    Export to PDF
                  </button>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-100 transition-all"
                  >
                    New Analysis
                  </button>
                  <Link
                    href={`/company-profiles/${thesisData.company.slug}`}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                  >
                    View Full Company Profile
                  </Link>
                  <Link
                    href="/market-sizing"
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-100 transition-all"
                  >
                    Market Sizing Data
                  </Link>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Explore more tools:{' '}
            <Link href="/company-profiles" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Company Profiles
            </Link>
            {' '}&middot;{' '}
            <Link href="/market-sizing" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Market Sizing
            </Link>
            {' '}&middot;{' '}
            <Link href="/regulatory-risk" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Regulatory Risk
            </Link>
            {' '}&middot;{' '}
            <Link href="/funding-tracker" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Funding Tracker
            </Link>
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          main {
            padding-top: 0 !important;
            background: white !important;
          }
          .bg-slate-800\\/30,
          .bg-slate-800\\/50,
          .bg-slate-900\\/50 {
            background: white !important;
            border-color: #e5e7eb !important;
          }
          .text-slate-100,
          .text-slate-200,
          .text-slate-300 {
            color: #1f2937 !important;
          }
          .text-slate-400,
          .text-slate-500 {
            color: #6b7280 !important;
          }
          .text-emerald-400 {
            color: #059669 !important;
          }
          .text-red-400 {
            color: #dc2626 !important;
          }
          .text-purple-400 {
            color: #7c3aed !important;
          }
          .text-cyan-400 {
            color: #0891b2 !important;
          }
          .text-amber-400 {
            color: #d97706 !important;
          }
          .text-yellow-400 {
            color: #ca8a04 !important;
          }
          button,
          a[href*="company-profiles"],
          a[href*="market-sizing"],
          a[href*="regulatory-risk"],
          a[href*="funding-tracker"] {
            display: none !important;
          }
          .rounded-2xl {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
