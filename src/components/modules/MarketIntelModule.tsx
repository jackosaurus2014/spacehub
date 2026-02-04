'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SpaceCompany, FOCUS_AREAS, COUNTRY_INFO, CompanyCountry } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StockMiniChart from '@/components/ui/StockMiniChart';

interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  change30D: number;
  chartData: number[];
  success: boolean;
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function formatChange(change: number, isPercent = false): string {
  const prefix = change >= 0 ? '+' : '';
  if (isPercent) {
    return `${prefix}${change.toFixed(2)}%`;
  }
  return `${prefix}${change.toFixed(2)}`;
}

function PublicCompanyCard({
  company,
  stockData,
}: {
  company: SpaceCompany;
  stockData?: StockData;
}) {
  const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];
  const isPositive = stockData ? stockData.changePercent >= 0 : true;
  const is30DPositive = stockData ? stockData.change30D >= 0 : true;

  return (
    <div className="card p-4 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">{company.name}</h3>
            <span className="text-xs text-nebula-300 font-mono">
              {company.exchange}:{company.ticker}
            </span>
          </div>
        </div>
        {stockData && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              isPositive
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {formatChange(stockData.changePercent, true)}
          </span>
        )}
      </div>

      {stockData ? (
        <>
          <div className="mb-3">
            <div className="text-xl font-bold text-white">
              {formatPrice(stockData.price)}
            </div>
            <div className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {formatChange(stockData.change)} today
            </div>
          </div>

          {stockData.chartData && stockData.chartData.length > 0 && (
            <div className="mb-3">
              <StockMiniChart
                data={stockData.chartData}
                width={140}
                height={36}
                positive={is30DPositive}
              />
            </div>
          )}

          <div className="flex gap-2 text-xs">
            <div
              className={`px-2 py-1 rounded ${
                isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              1D: {formatChange(stockData.changePercent, true)}
            </div>
            <div
              className={`px-2 py-1 rounded ${
                is30DPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              30D: {formatChange(stockData.change30D, true)}
            </div>
          </div>
        </>
      ) : (
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-space-700 rounded mb-2" />
          <div className="h-9 w-full bg-space-700 rounded mb-2" />
          <div className="h-6 w-32 bg-space-700 rounded" />
        </div>
      )}

      <div className="flex flex-wrap gap-1 mt-3">
        {(company.focusAreas as string[]).slice(0, 2).map((area) => {
          const focusInfo = FOCUS_AREAS.find((f) => f.value === area);
          return (
            <span
              key={area}
              className="text-xs bg-space-700/50 text-star-200 px-2 py-0.5 rounded"
            >
              {focusInfo?.icon} {focusInfo?.label || area}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const MAX_SELECTED = 5;

export default function MarketIntelModule() {
  const [companies, setCompanies] = useState<SpaceCompany[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    publicCount: number;
    privateCount: number;
    totalMarketCap: number;
    byCountry: Record<string, number>;
  } | null>(null);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesRes, statsRes] = await Promise.all([
        fetch('/api/companies?limit=50'),
        fetch('/api/companies/stats'),
      ]);

      const companiesData = await companiesRes.json();
      const statsData = await statsRes.json();

      if (companiesData.companies) {
        setCompanies(companiesData.companies);

        // Fetch stock data for public companies
        const publicCompanies = companiesData.companies.filter(
          (c: SpaceCompany) => c.isPublic && c.ticker
        );
        if (publicCompanies.length > 0) {
          setSelectedTickers(
            publicCompanies.slice(0, MAX_SELECTED).map((c: SpaceCompany) => c.ticker!)
          );
          fetchStockData(publicCompanies);
        }
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

  const fetchStockData = async (publicCompanies: SpaceCompany[]) => {
    const tickers = publicCompanies.map((c) => c.ticker).join(',');
    try {
      const res = await fetch(`/api/stocks?tickers=${tickers}`);
      const data = await res.json();

      if (data.stocks) {
        const stockMap: Record<string, StockData> = {};
        data.stocks.forEach((stock: StockData) => {
          if (stock.success) {
            stockMap[stock.ticker] = stock;
          }
        });
        setStockData(stockMap);
      }
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
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

  const publicCompanies = companies.filter((c) => c.isPublic && c.ticker);

  const toggleTicker = (ticker: string) => {
    setSelectedTickers((prev) => {
      if (prev.includes(ticker)) {
        // Don't deselect the last one
        if (prev.length <= 1) return prev;
        return prev.filter((t) => t !== ticker);
      }
      if (prev.length < MAX_SELECTED) {
        return [...prev, ticker];
      }
      // At max: replace the oldest selection
      return [...prev.slice(1), ticker];
    });
  };

  const displayedCompanies = publicCompanies.filter(
    (c) => c.ticker && selectedTickers.includes(c.ticker)
  );

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
        <Link href="/market-intel" className="btn-secondary text-sm py-1.5 px-4">
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
              {stats.totalMarketCap
                ? `$${
                    stats.totalMarketCap >= 1000
                      ? `${(stats.totalMarketCap / 1000).toFixed(1)}T`
                      : `${stats.totalMarketCap.toFixed(0)}B`
                  }`
                : 'N/A'}
            </div>
            <div className="text-star-300 text-xs">Total Market Cap</div>
          </div>
        </div>
      )}

      {/* Live Stock Prices */}
      {publicCompanies.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live Stock Prices
          </h3>

          {/* Company selector pills */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
            {publicCompanies.map((company) => {
              const isSelected = company.ticker
                ? selectedTickers.includes(company.ticker)
                : false;
              return (
                <button
                  key={company.id}
                  onClick={() => company.ticker && toggleTicker(company.ticker)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                    isSelected
                      ? 'bg-nebula-500/30 text-nebula-300 border border-nebula-500/50'
                      : 'bg-space-700/50 text-star-400 border border-space-600 hover:border-star-400/50'
                  }`}
                >
                  {company.ticker}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {displayedCompanies.map((company) => (
              <PublicCompanyCard
                key={company.id}
                company={company}
                stockData={company.ticker ? stockData[company.ticker] : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Companies List */}
      {companies.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Space Companies</h3>
          <div className="card overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
              {companies.slice(0, 10).map((company) => {
                const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];
                const companyStockData = company.ticker ? stockData[company.ticker] : null;
                const isPositive = companyStockData ? companyStockData.changePercent >= 0 : true;

                return (
                  <div
                    key={company.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-space-700 last:border-b-0 hover:bg-space-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg flex-shrink-0">{countryInfo?.flag || '🌐'}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-white text-sm truncate">{company.name}</div>
                        <div className="flex items-center gap-2 text-xs">
                          {company.isPublic && company.ticker ? (
                            <span className="text-nebula-300 font-mono">{company.exchange}:{company.ticker}</span>
                          ) : (
                            <span className="text-star-400">Private</span>
                          )}
                          {(company.focusAreas as string[]).slice(0, 1).map((area) => {
                            const focusInfo = FOCUS_AREAS.find((f) => f.value === area);
                            return (
                              <span key={area} className="text-star-400 hidden sm:inline">
                                {focusInfo?.icon} {focusInfo?.label || area}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      {company.isPublic && companyStockData ? (
                        <>
                          <span className="text-white text-sm font-medium">{formatPrice(companyStockData.price)}</span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              isPositive
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {formatChange(companyStockData.changePercent, true)}
                          </span>
                        </>
                      ) : company.isPublic && company.ticker ? (
                        <div className="h-4 w-20 bg-space-700 rounded animate-pulse" />
                      ) : (
                        <>
                          {company.isPreIPO ? (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Pre-IPO</span>
                          ) : company.valuation ? (
                            <span className="text-sm text-star-300">
                              {company.valuation >= 1 ? `$${company.valuation.toFixed(1)}B` : `$${(company.valuation * 1000).toFixed(0)}M`}
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
