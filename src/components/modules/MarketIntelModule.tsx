'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SpaceCompany, FOCUS_AREAS, COUNTRY_INFO, CompanyCountry } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function CompanyCard({ company }: { company: SpaceCompany }) {
  const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];

  const formatMarketCap = (cap: number | null) => {
    if (!cap) return 'N/A';
    if (cap >= 1000) return `$${(cap / 1000).toFixed(1)}T`;
    if (cap >= 1) return `$${cap.toFixed(1)}B`;
    return `$${(cap * 1000).toFixed(0)}M`;
  };

  const formatValuation = (val: number | null) => {
    if (!val) return 'N/A';
    if (val >= 1) return `$${val.toFixed(1)}B`;
    return `$${(val * 1000).toFixed(0)}M`;
  };

  return (
    <div className="card p-4 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">{company.name}</h3>
            {company.ticker && (
              <span className="text-xs text-nebula-300 font-mono">
                {company.exchange}:{company.ticker}
              </span>
            )}
          </div>
        </div>
        {company.isPublic ? (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
            Public
          </span>
        ) : company.isPreIPO ? (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
            Pre-IPO
          </span>
        ) : (
          <span className="text-xs bg-space-600 text-star-300 px-2 py-0.5 rounded">
            Private
          </span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        {company.isPublic ? (
          <div className="flex justify-between">
            <span className="text-star-300">Market Cap:</span>
            <span className="text-white font-medium">{formatMarketCap(company.marketCap)}</span>
          </div>
        ) : (
          <div className="flex justify-between">
            <span className="text-star-300">Valuation:</span>
            <span className="text-white font-medium">{formatValuation(company.valuation)}</span>
          </div>
        )}

        {company.isPreIPO && company.expectedIPODate && (
          <div className="flex justify-between">
            <span className="text-star-300">Expected IPO:</span>
            <span className="text-yellow-400">{company.expectedIPODate}</span>
          </div>
        )}

        {!company.isPublic && company.lastFundingRound && (
          <div className="flex justify-between">
            <span className="text-star-300">Last Round:</span>
            <span className="text-nebula-300">{company.lastFundingRound}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mt-3">
        {(company.focusAreas as string[]).slice(0, 2).map((area) => {
          const focusInfo = FOCUS_AREAS.find(f => f.value === area);
          return (
            <span
              key={area}
              className="text-xs bg-space-700/50 text-star-200 px-2 py-0.5 rounded"
            >
              {focusInfo?.icon} {focusInfo?.label || area}
            </span>
          );
        })}
        {(company.focusAreas as string[]).length > 2 && (
          <span className="text-xs text-star-400">
            +{(company.focusAreas as string[]).length - 2}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MarketIntelModule() {
  const [companies, setCompanies] = useState<SpaceCompany[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    publicCount: number;
    privateCount: number;
    totalMarketCap: number;
    byCountry: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesRes, statsRes] = await Promise.all([
        fetch('/api/companies?limit=8'),
        fetch('/api/companies/stats'),
      ]);

      const companiesData = await companiesRes.json();
      const statsData = await statsRes.json();

      if (companiesData.companies) {
        setCompanies(companiesData.companies);
      }
      if (statsData.total !== undefined) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/companies/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize companies:', error);
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="text-5xl block mb-4">📊</span>
        <h3 className="text-xl font-semibold text-white mb-2">Market Intel</h3>
        <p className="text-star-300 mb-4">
          Track space industry companies, stock prices, and funding rounds.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="btn-primary"
        >
          {initializing ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Initializing...
            </span>
          ) : (
            'Load Company Data'
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <div>
            <h2 className="text-2xl font-display font-bold text-white">Market Intel</h2>
            <p className="text-star-300 text-sm">Space industry companies & investments</p>
          </div>
        </div>
        <Link
          href="/market-intel"
          className="btn-secondary text-sm py-1.5 px-4"
        >
          View All →
        </Link>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-star-300 text-xs">Companies</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.publicCount}</div>
            <div className="text-star-300 text-xs">Public</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.privateCount}</div>
            <div className="text-star-300 text-xs">Private</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-bold text-nebula-300">
              ${stats.totalMarketCap >= 1000
                ? `${(stats.totalMarketCap / 1000).toFixed(1)}T`
                : `${stats.totalMarketCap.toFixed(0)}B`}
            </div>
            <div className="text-star-300 text-xs">Total Market Cap</div>
          </div>
        </div>
      )}

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
    </div>
  );
}
