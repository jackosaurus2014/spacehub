'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import CompanySelector from '@/components/compare/CompanySelector';
import CompanyComparisonTable from '@/components/compare/CompanyComparisonTable';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyData {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  sector: string | null;
  description: string | null;
  foundedYear: number | null;
  headquarters: string | null;
  country: string | null;
  employeeCount: number | null;
  employeeRange: string | null;
  tier: number;
  website: string | null;
  isPublic: boolean;
  valuation: number | null;
  revenueEstimate: number | null;
  totalFunding: number | null;
  lastFundingRound: string | null;
  marketCap: number | null;
  ownershipType: string | null;
  cageCode: string | null;
  samUei: string | null;
  tags: string[];
  scores: any[];
  satelliteAssets: any[];
  products: any[];
  contracts: any[];
  partnerships: any[];
  summary: {
    totalContractValue: number;
    activeSatellites: number;
    totalSatellites: number;
    competitors: any[];
  };
}

// ─── Inner Component (reads searchParams) ────────────────────────────────────

function CompareCompaniesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Parse slugs from URL on mount
  useEffect(() => {
    const param = searchParams.get('companies');
    if (param) {
      const parsed = param
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);
      setSlugs(parsed);
    }
  }, [searchParams]);

  // Fetch company data when slugs change
  const fetchCompanies = useCallback(async () => {
    if (slugs.length === 0) {
      setCompanies([]);
      return;
    }

    setLoading(true);
    const newErrors: Record<string, string> = {};
    const results: CompanyData[] = [];

    await Promise.all(
      slugs.map(async (slug) => {
        try {
          const res = await fetch(`/api/company-profiles/${slug}`);
          if (!res.ok) {
            newErrors[slug] = `Failed to load "${slug}"`;
            return;
          }
          const data = await res.json();
          results.push(data);
        } catch {
          newErrors[slug] = `Error loading "${slug}"`;
        }
      })
    );

    // Sort results to match slug order
    const ordered = slugs
      .map((slug) => results.find((r) => r.slug === slug))
      .filter((r): r is CompanyData => r !== undefined);

    setCompanies(ordered);
    setErrors(newErrors);
    setLoading(false);
  }, [slugs]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Update URL when slugs change
  useEffect(() => {
    const currentParam = searchParams.get('companies') || '';
    const newParam = slugs.join(',');
    if (currentParam !== newParam) {
      const url = slugs.length > 0
        ? `/compare/companies?companies=${newParam}`
        : '/compare/companies';
      router.replace(url, { scroll: false });
    }
  }, [slugs, router, searchParams]);

  const handleAdd = (slug: string) => {
    if (slugs.includes(slug) || slugs.length >= 4) return;
    setSlugs((prev) => [...prev, slug]);
  };

  const handleRemove = (slug: string) => {
    setSlugs((prev) => prev.filter((s) => s !== slug));
    setCompanies((prev) => prev.filter((c) => c.slug !== slug));
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-slate-300 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/company-profiles" className="hover:text-slate-300 transition-colors">
          Company Profiles
        </Link>
        <span>/</span>
        <span className="text-slate-400">Compare</span>
      </nav>

      <AnimatedPageHeader
        title="Compare Space Companies"
        subtitle="Side-by-side comparison of space industry companies — financials, government contracts, space assets, and capabilities"
        icon="📊"
      />

      {/* Company Selector Card */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Select Companies</h2>
          {slugs.length >= 2 && (
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share URL
                </>
              )}
            </button>
          )}
        </div>
        <CompanySelector
          selectedSlugs={slugs}
          onAdd={handleAdd}
          onRemove={handleRemove}
          maxCompanies={4}
        />
      </div>

      {/* Error messages */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
          {Object.entries(errors).map(([slug, msg]) => (
            <div key={slug} className="flex items-center gap-2 text-sm text-red-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-slate-800/30 border-b border-slate-700/50">
                <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
              </div>
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex border-b border-slate-700/30 last:border-0">
                  <div className="w-[160px] p-4 shrink-0">
                    <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
                  </div>
                  <div className="flex-1 flex gap-4 p-4">
                    {slugs.map((_, k) => (
                      <div key={k} className="h-4 flex-1 bg-slate-800 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && slugs.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Companies Selected</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Search and add up to 4 companies above to compare them side by side. Compare financials,
            space assets, government contracts, and more.
          </p>
          <Link
            href="/company-profiles"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
          >
            Browse Company Directory
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      )}

      {/* Need at least 2 companies */}
      {!loading && slugs.length === 1 && companies.length === 1 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">+</div>
          <h3 className="text-lg font-semibold text-white mb-2">Add Another Company</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            Add at least one more company using the search above to start comparing.
          </p>
        </div>
      )}

      {/* Comparison table */}
      {!loading && companies.length >= 2 && (
        <CompanyComparisonTable companies={companies} onRemove={handleRemove} />
      )}
    </div>
  );
}

// ─── Page Wrapper with Suspense ──────────────────────────────────────────────

export default function CompareCompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-800 animate-pulse" />
              <div>
                <div className="h-8 w-64 bg-slate-800 rounded animate-pulse" />
                <div className="h-1 w-16 mt-2 bg-slate-800 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <CompareCompaniesContent />
    </Suspense>
  );
}
