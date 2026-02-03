'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SpaceCompany, FOCUS_AREAS, COUNTRY_INFO, CompanyCountry, CompanyFocusArea } from '@/types';
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

interface DetailedStockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  performance: { '1D': number; '30D': number; '1Y': number };
  chartData: { daily: Array<{ close: number }>; monthly: Array<{ close: number }> };
}

const COUNTRY_FILTERS = [
  { value: '', label: 'All Countries' },
  { value: 'USA', label: '🇺🇸 United States' },
  { value: 'CHN', label: '🇨🇳 China' },
  { value: 'RUS', label: '🇷🇺 Russia' },
  { value: 'JPN', label: '🇯🇵 Japan' },
  { value: 'FRA', label: '🇫🇷 France' },
  { value: 'EUR', label: '🇪🇺 Europe' },
];

function CompanyRow({ company }: { company: SpaceCompany }) {
  const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];

  const formatMarketCap = (cap: number | null) => {
    if (!cap) return '—';
    if (cap >= 1000) return `$${(cap / 1000).toFixed(2)}T`;
    if (cap >= 1) return `$${cap.toFixed(2)}B`;
    return `$${(cap * 1000).toFixed(0)}M`;
  };

  const formatFunding = (amount: number | null) => {
    if (!amount) return '—';
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}B`;
    return `$${amount.toFixed(0)}M`;
  };

  const formatPriceChange = (change: number | null) => {
    if (change === null || change === undefined) return null;
    const isPositive = change >= 0;
    return (
      <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
        {isPositive ? '+' : ''}{change.toFixed(2)}%
      </span>
    );
  };

  return (
    <tr className="border-b border-space-700/50 hover:bg-space-700/30 transition-colors">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
          <div>
            <div className="font-semibold text-white">{company.name}</div>
            {company.ticker ? (
              <div className="text-xs text-nebula-300 font-mono">
                {company.exchange}:{company.ticker}
              </div>
            ) : (
              <div className="text-xs text-star-400">Private</div>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        {company.isPublic ? (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-medium">
            Public
          </span>
        ) : company.isPreIPO ? (
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-medium">
            Pre-IPO
          </span>
        ) : (
          <span className="text-xs bg-space-600 text-star-300 px-2 py-1 rounded">
            Private
          </span>
        )}
      </td>
      <td className="py-4 px-4 text-right">
        <div className="text-white font-medium">
          {company.isPublic ? formatMarketCap(company.marketCap) : formatMarketCap(company.valuation)}
        </div>
        {company.isPublic && company.priceChange24h !== null && (
          <div className="text-xs">{formatPriceChange(company.priceChange24h)}</div>
        )}
      </td>
      <td className="py-4 px-4">
        {company.isPublic ? (
          <span className="text-star-400 text-sm">—</span>
        ) : (
          <div>
            {company.lastFundingRound && (
              <div className="text-sm text-white">{company.lastFundingRound}</div>
            )}
            {company.lastFundingAmount && (
              <div className="text-xs text-star-300">{formatFunding(company.lastFundingAmount)}</div>
            )}
          </div>
        )}
      </td>
      <td className="py-4 px-4">
        {company.isPreIPO && company.expectedIPODate ? (
          <span className="text-yellow-400 text-sm">{company.expectedIPODate}</span>
        ) : (
          <span className="text-star-400 text-sm">—</span>
        )}
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {(company.focusAreas as string[]).slice(0, 3).map((area) => {
            const focusInfo = FOCUS_AREAS.find(f => f.value === area);
            return (
              <span
                key={area}
                className="text-xs bg-space-700/50 text-star-200 px-2 py-0.5 rounded whitespace-nowrap"
              >
                {focusInfo?.icon} {focusInfo?.label || area}
              </span>
            );
          })}
          {(company.focusAreas as string[]).length > 3 && (
            <span className="text-xs text-star-400">
              +{(company.focusAreas as string[]).length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-nebula-400 hover:text-nebula-300 text-sm"
          >
            Visit →
          </a>
        )}
      </td>
    </tr>
  );
}

export default function MarketIntelPage() {
  const [companies, setCompanies] = useState<SpaceCompany[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    publicCount: number;
    privateCount: number;
    totalMarketCap: number;
    byCountry: Record<string, number>;
  } | null>(null);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [detailedStockData, setDetailedStockData] = useState<Record<string, DetailedStockData>>({});
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedType, setSelectedType] = useState<'' | 'public' | 'private'>('');
  const [selectedFocus, setSelectedFocus] = useState<CompanyFocusArea | ''>('');

  useEffect(() => {
    fetchData();
  }, [selectedCountry, selectedType, selectedFocus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCountry) params.set('country', selectedCountry);
      if (selectedType) params.set('isPublic', selectedType === 'public' ? 'true' : 'false');
      if (selectedFocus) params.set('focusArea', selectedFocus);

      const [companiesRes, statsRes] = await Promise.all([
        fetch(`/api/companies?${params}`),
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
      // Fetch batch stock data
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

      // Fetch detailed data for top 6 stocks
      const topTickers = publicCompanies.slice(0, 6).map((c) => c.ticker);
      const detailedPromises = topTickers.map(async (ticker) => {
        try {
          const res = await fetch(`/api/stocks/${ticker}`);
          const data = await res.json();
          if (!data.error) {
            return { ticker, data };
          }
        } catch {
          return null;
        }
      });

      const detailedResults = await Promise.all(detailedPromises);
      const detailedMap: Record<string, DetailedStockData> = {};
      detailedResults.forEach((result) => {
        if (result && result.ticker) {
          detailedMap[result.ticker] = result.data;
        }
      });
      setDetailedStockData(detailedMap);
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

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-star-300 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Market Intel</span>
          </div>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl">📊</span>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
              Market Intel
            </h1>
          </div>
          <p className="text-star-300">
            Track space industry companies, stock performance, and funding rounds
          </p>
        </div>

        {stats && stats.total > 0 && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-white">{stats.total}</div>
                <div className="text-star-300 text-sm">Total Companies</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{stats.publicCount}</div>
                <div className="text-star-300 text-sm">Publicly Traded</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{stats.privateCount}</div>
                <div className="text-star-300 text-sm">Private / Pre-IPO</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-3xl font-bold text-nebula-300">
                  ${stats.totalMarketCap >= 1000
                    ? `${(stats.totalMarketCap / 1000).toFixed(1)}T`
                    : `${stats.totalMarketCap.toFixed(0)}B`}
                </div>
                <div className="text-star-300 text-sm">Combined Market Cap</div>
              </div>
            </div>

            {/* Country Distribution */}
            <div className="card p-4 mb-8">
              <h3 className="text-white font-semibold mb-3">Companies by Region</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.byCountry).map(([country, count]) => {
                  const info = COUNTRY_INFO[country as CompanyCountry];
                  return (
                    <div
                      key={country}
                      className="flex items-center gap-2 bg-space-700/50 px-3 py-2 rounded-lg"
                    >
                      <span>{info?.flag || '🌐'}</span>
                      <span className="text-star-200">{info?.name || country}</span>
                      <span className="text-white font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Stock Ticker */}
            {Object.keys(detailedStockData).length > 0 && (
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live Stock Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companies
                    .filter((c) => c.isPublic && c.ticker && detailedStockData[c.ticker])
                    .slice(0, 6)
                    .map((company) => {
                      const stock = detailedStockData[company.ticker!];
                      const isPositive = stock.changePercent >= 0;
                      const is30DPositive = stock.performance['30D'] >= 0;
                      const is1YPositive = stock.performance['1Y'] >= 0;
                      const chartData = stock.chartData.daily.map((d) => d.close);

                      return (
                        <div
                          key={company.id}
                          className="card p-4 hover:border-nebula-500/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-white">{company.name}</div>
                              <div className="text-xs text-nebula-300 font-mono">
                                {company.exchange}:{company.ticker}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded ${
                                isPositive
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="text-2xl font-bold text-white">
                              ${stock.price.toFixed(2)}
                            </div>
                            <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {isPositive ? '+' : ''}{stock.change.toFixed(2)} today
                            </div>
                          </div>

                          {chartData.length > 0 && (
                            <div className="mb-3">
                              <StockMiniChart
                                data={chartData}
                                width={200}
                                height={48}
                                positive={is30DPositive}
                              />
                            </div>
                          )}

                          <div className="flex gap-2">
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                isPositive
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              1D: {isPositive ? '+' : ''}{stock.performance['1D'].toFixed(2)}%
                            </div>
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                is30DPositive
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              30D: {is30DPositive ? '+' : ''}{stock.performance['30D'].toFixed(2)}%
                            </div>
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                is1YPositive
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              1Y: {is1YPositive ? '+' : ''}{stock.performance['1Y'].toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-star-300 text-sm mb-1">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="bg-space-700 border border-space-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    {COUNTRY_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-star-300 text-sm mb-1">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as '' | 'public' | 'private')}
                    className="bg-space-700 border border-space-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    <option value="">All Types</option>
                    <option value="public">Public</option>
                    <option value="private">Private / Pre-IPO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-star-300 text-sm mb-1">Focus Area</label>
                  <select
                    value={selectedFocus}
                    onChange={(e) => setSelectedFocus(e.target.value as CompanyFocusArea | '')}
                    className="bg-space-700 border border-space-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    <option value="">All Focus Areas</option>
                    {FOCUS_AREAS.map((focus) => (
                      <option key={focus.value} value={focus.value}>
                        {focus.icon} {focus.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(selectedCountry || selectedType || selectedFocus) && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSelectedCountry('');
                        setSelectedType('');
                        setSelectedFocus('');
                      }}
                      className="text-sm text-nebula-400 hover:text-nebula-300 py-2"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Companies Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : companies.length === 0 && !stats?.total ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">📊</span>
            <h2 className="text-2xl font-semibold text-white mb-2">No Company Data</h2>
            <p className="text-star-300 mb-6">
              Initialize the database with space industry companies to get started.
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
        ) : companies.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">🔍</span>
            <h2 className="text-2xl font-semibold text-white mb-2">No Results</h2>
            <p className="text-star-300">
              No companies match your current filters. Try adjusting your criteria.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-space-800 border-b border-space-600">
                    <th className="text-left py-3 px-4 text-star-300 font-medium text-sm">Company</th>
                    <th className="text-left py-3 px-4 text-star-300 font-medium text-sm">Status</th>
                    <th className="text-right py-3 px-4 text-star-300 font-medium text-sm">Market Cap / Valuation</th>
                    <th className="text-left py-3 px-4 text-star-300 font-medium text-sm">Last Funding</th>
                    <th className="text-left py-3 px-4 text-star-300 font-medium text-sm">IPO Expected</th>
                    <th className="text-left py-3 px-4 text-star-300 font-medium text-sm">Focus Areas</th>
                    <th className="text-left py-3 px-4 text-star-300 font-medium text-sm">Website</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <CompanyRow key={company.id} company={company} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="card p-6 mt-8 border-dashed">
          <div className="text-center">
            <span className="text-4xl block mb-3">💡</span>
            <h3 className="text-lg font-semibold text-white mb-2">About Market Intel</h3>
            <p className="text-star-300 text-sm max-w-2xl mx-auto">
              Market data is provided for informational purposes only and may not reflect real-time prices.
              For publicly traded companies, market cap and price changes are approximate.
              Private company valuations are based on last known funding rounds and may vary.
              Always conduct your own research before making investment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
