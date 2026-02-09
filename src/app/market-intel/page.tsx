'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { SpaceCompany, FOCUS_AREAS, COUNTRY_INFO, CompanyCountry, CompanyFocusArea } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StockMiniChart from '@/components/ui/StockMiniChart';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import CompanyRequestDialog from '@/components/ui/CompanyRequestDialog';

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
  { value: 'GBR', label: '🇬🇧 United Kingdom' },
  { value: 'DEU', label: '🇩🇪 Germany' },
  { value: 'IND', label: '🇮🇳 India' },
  { value: 'KOR', label: '🇰🇷 South Korea' },
  { value: 'ISR', label: '🇮🇱 Israel' },
  { value: 'NZL', label: '🇳🇿 New Zealand' },
  { value: 'AUS', label: '🇦🇺 Australia' },
  { value: 'CAN', label: '🇨🇦 Canada' },
  { value: 'LUX', label: '🇱🇺 Luxembourg' },
  { value: 'ARE', label: '🇦🇪 UAE' },
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
    <tr className="border-b border-slate-200/50 hover:bg-slate-100/30 transition-colors">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
          <div>
            <div className="font-semibold text-slate-900">{company.name}</div>
            {company.ticker ? (
              <div className="text-xs text-nebula-300 font-mono">
                {company.exchange}:{company.ticker}
              </div>
            ) : (
              <div className="text-xs text-slate-400">Private</div>
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
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
            Private
          </span>
        )}
      </td>
      <td className="py-4 px-4 text-right">
        <div className="text-slate-900 font-medium">
          {company.isPublic ? formatMarketCap(company.marketCap) : formatMarketCap(company.valuation)}
        </div>
        {company.isPublic && company.priceChange24h !== null && (
          <div className="text-xs">{formatPriceChange(company.priceChange24h)}</div>
        )}
      </td>
      <td className="py-4 px-4">
        {company.isPublic ? (
          <span className="text-slate-400 text-sm">—</span>
        ) : (
          <div>
            {company.lastFundingRound && (
              <div className="text-sm text-slate-900">{company.lastFundingRound}</div>
            )}
            {company.lastFundingAmount && (
              <div className="text-xs text-slate-400">{formatFunding(company.lastFundingAmount)}</div>
            )}
          </div>
        )}
      </td>
      <td className="py-4 px-4">
        {company.isPreIPO && company.expectedIPODate ? (
          <span className="text-yellow-400 text-sm">{company.expectedIPODate}</span>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
        )}
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {(company.focusAreas as string[]).slice(0, 3).map((area) => {
            const focusInfo = FOCUS_AREAS.find(f => f.value === area);
            return (
              <span
                key={area}
                className="text-xs bg-slate-100/50 text-slate-600 px-2 py-0.5 rounded whitespace-nowrap"
              >
                {focusInfo?.icon} {focusInfo?.label || area}
              </span>
            );
          })}
          {(company.focusAreas as string[]).length > 3 && (
            <span className="text-xs text-slate-400">
              +{(company.focusAreas as string[]).length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-col gap-1">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-nebula-300 hover:text-nebula-200 text-sm"
            >
              Visit →
            </a>
          )}
          <Link
            href={`/workforce?tab=jobs&search=${encodeURIComponent(company.name)}`}
            className="text-xs text-green-400 hover:text-green-300"
          >
            Jobs →
          </Link>
          {(company.focusAreas as string[]).some((a) =>
            ['spectrum', 'communications', 'satellite_communications'].includes(a)
          ) && (
            <Link href="/spectrum" className="text-xs text-rocket-400 hover:text-rocket-300">
              Spectrum →
            </Link>
          )}
          {(company.focusAreas as string[]).some((a) =>
            ['launch_services', 'launch_vehicles'].includes(a)
          ) && (
            <Link href="/resource-exchange" className="text-xs text-yellow-400 hover:text-yellow-300">
              Launches →
            </Link>
          )}
          <Link
            href={`/orbital-slots?tab=operators`}
            className="text-xs text-nebula-300 hover:text-nebula-200"
          >
            Satellites →
          </Link>
        </div>
      </td>
    </tr>
  );
}

function MarketIntelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

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
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || '');
  const [selectedType, setSelectedType] = useState<'' | 'public' | 'private'>(
    (searchParams.get('type') as '' | 'public' | 'private') || ''
  );
  const [selectedFocus, setSelectedFocus] = useState<CompanyFocusArea | ''>(
    (searchParams.get('focus') as CompanyFocusArea | '') || ''
  );
  const [showCompanyRequestDialog, setShowCompanyRequestDialog] = useState(false);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedType) params.set('type', selectedType);
    if (selectedFocus) params.set('focus', selectedFocus);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedCountry, selectedType, selectedFocus, router, pathname]);

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
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader title="Market Intel" subtitle="Track space industry companies, stock performance, and funding rounds" icon="📊" accentColor="emerald" />

        {stats && stats.total > 0 && (
          <>
            {/* Stats Cards */}
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{stats.total}</div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Companies</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-green-400">{stats.publicCount}</div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Publicly Traded</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">{stats.privateCount}</div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Private / Pre-IPO</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">
                    ${stats.totalMarketCap >= 1000
                      ? `${(stats.totalMarketCap / 1000).toFixed(1)}T`
                      : `${stats.totalMarketCap.toFixed(0)}B`}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Combined Market Cap</div>
                </div>
              </StaggerItem>
            </StaggerContainer>

            {/* Country Distribution */}
            <div className="card p-4 mb-4">
              <h3 className="text-slate-900 font-semibold mb-3">Companies by Region</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.byCountry).map(([country, count]) => {
                  const info = COUNTRY_INFO[country as CompanyCountry];
                  return (
                    <div
                      key={country}
                      className="flex items-center gap-2 bg-slate-100/50 px-3 py-2 rounded-lg"
                    >
                      <span>{info?.flag || '🌐'}</span>
                      <span className="text-slate-400">{info?.name || country}</span>
                      <span className="text-slate-900 font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Request Company Addition */}
            <div className="mb-8">
              <button
                onClick={() => setShowCompanyRequestDialog(true)}
                className="text-slate-400 hover:text-nebula-200 text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Don&apos;t see your company? Request to be added.
              </button>
            </div>

            {/* Live Stock Ticker */}
            {Object.keys(detailedStockData).length > 0 && (
              <div className="mb-8">
                <h3 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live Stock Performance
                </h3>
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <StaggerItem key={company.id}>
                        <div
                          className="card p-4 hover:border-nebula-500/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-slate-900">{company.name}</div>
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
                            <div className="text-2xl font-bold text-slate-900">
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
                        </StaggerItem>
                      );
                    })}
                </StaggerContainer>
              </div>
            )}

            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    {COUNTRY_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1">Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as '' | 'public' | 'private')}
                    className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    <option value="">All Types</option>
                    <option value="public">Public</option>
                    <option value="private">Private / Pre-IPO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-1">Focus Area</label>
                  <select
                    value={selectedFocus}
                    onChange={(e) => setSelectedFocus(e.target.value as CompanyFocusArea | '')}
                    className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
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
                      className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}

                <div className="flex items-end ml-auto">
                  <ExportButton
                    data={companies}
                    filename="space-companies"
                    columns={[
                      { key: 'name', label: 'Name' },
                      { key: 'country', label: 'Country' },
                      { key: 'isPublic', label: 'Type' },
                      { key: 'focusAreas', label: 'Focus Area' },
                      { key: 'founded', label: 'Founded' },
                      { key: 'employees', label: 'Employees' },
                      { key: 'marketCap', label: 'Revenue / Market Cap' },
                      { key: 'website', label: 'Website' },
                    ]}
                  />
                </div>
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Company Data</h2>
            <p className="text-slate-400 mb-6">
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Results</h2>
            <p className="text-slate-400">
              No companies match your current filters. Try adjusting your criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Publicly Traded Companies */}
            {companies.filter(c => c.isPublic).length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-green-400">📈</span>
                  Publicly Traded Companies
                  <span className="text-slate-400 font-normal text-sm">({companies.filter(c => c.isPublic).length})</span>
                </h3>
                <div className="card overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                    <table className="w-full min-w-[640px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Company</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Stock Price</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Today</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Market Cap</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Focus Areas</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.filter(c => c.isPublic).map((company) => {
                          const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];
                          const stock = company.ticker ? stockData[company.ticker] : null;
                          const isPositive = stock ? stock.changePercent >= 0 : true;

                          return (
                            <tr key={company.id} className="border-b border-slate-200/50 hover:bg-slate-100/30 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
                                  <div>
                                    <div className="font-semibold text-slate-900">{company.name}</div>
                                    <div className="text-xs text-nebula-300 font-mono">
                                      {company.exchange}:{company.ticker}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                {stock ? (
                                  <span className="font-mono font-medium text-slate-900">${stock.price.toFixed(2)}</span>
                                ) : (
                                  <div className="h-4 w-16 bg-slate-700/50 rounded animate-pulse ml-auto" />
                                )}
                              </td>
                              <td className="py-4 px-4 text-right">
                                {stock ? (
                                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                                    isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                  </span>
                                ) : (
                                  <div className="h-4 w-14 bg-slate-700/50 rounded animate-pulse ml-auto" />
                                )}
                              </td>
                              <td className="py-4 px-4 text-right text-slate-400">
                                {company.marketCap ? (
                                  company.marketCap >= 1 ? `$${company.marketCap.toFixed(1)}B` : `$${(company.marketCap * 1000).toFixed(0)}M`
                                ) : '—'}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {(company.focusAreas as string[]).slice(0, 2).map((area) => {
                                    const focusInfo = FOCUS_AREAS.find(f => f.value === area);
                                    return (
                                      <span key={area} className="text-xs bg-slate-100/50 text-slate-600 px-2 py-0.5 rounded whitespace-nowrap">
                                        {focusInfo?.icon} {focusInfo?.label || area}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {company.website && (
                                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-nebula-300 hover:text-nebula-200 text-sm">
                                    Visit →
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Private Companies */}
            {companies.filter(c => !c.isPublic).length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-yellow-400">🔒</span>
                  Private Companies
                  <span className="text-slate-400 font-normal text-sm">({companies.filter(c => !c.isPublic).length})</span>
                </h3>
                <div className="card overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Company</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Valuation</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Last Funding</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">IPO Expected</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Focus Areas</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.filter(c => !c.isPublic).map((company) => {
                          const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];

                          const formatFunding = (amount: number | null) => {
                            if (!amount) return '—';
                            if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}B`;
                            return `$${amount.toFixed(0)}M`;
                          };

                          return (
                            <tr key={company.id} className="border-b border-slate-200/50 hover:bg-slate-100/30 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
                                  <div>
                                    <div className="font-semibold text-slate-900">{company.name}</div>
                                    <div className="text-xs text-slate-400">{countryInfo?.name || company.country}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {company.isPreIPO ? (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded font-medium">Pre-IPO</span>
                                ) : (
                                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Private</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right text-slate-400">
                                {company.valuation ? (
                                  company.valuation >= 1 ? `$${company.valuation.toFixed(1)}B` : `$${(company.valuation * 1000).toFixed(0)}M`
                                ) : '—'}
                              </td>
                              <td className="py-4 px-4">
                                {company.lastFundingRound ? (
                                  <div>
                                    <div className="text-sm text-slate-900">{company.lastFundingRound}</div>
                                    <div className="text-xs text-slate-400">{formatFunding(company.lastFundingAmount)}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                {company.expectedIPODate ? (
                                  <span className="text-yellow-500 text-sm">{company.expectedIPODate}</span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {(company.focusAreas as string[]).slice(0, 2).map((area) => {
                                    const focusInfo = FOCUS_AREAS.find(f => f.value === area);
                                    return (
                                      <span key={area} className="text-xs bg-slate-100/50 text-slate-600 px-2 py-0.5 rounded whitespace-nowrap">
                                        {focusInfo?.icon} {focusInfo?.label || area}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {company.website && (
                                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-nebula-300 hover:text-nebula-200 text-sm">
                                    Visit →
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Note */}
        <ScrollReveal>
          <div className="card p-6 mt-8 border-dashed">
            <div className="text-center">
              <span className="text-4xl block mb-3">💡</span>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">About Market Intel</h3>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Market data is provided for informational purposes only and may not reflect real-time prices.
                For publicly traded companies, market cap and price changes are approximate.
                Private company valuations are based on last known funding rounds and may vary.
                Always conduct your own research before making investment decisions.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Company Request Dialog */}
      <CompanyRequestDialog
        isOpen={showCompanyRequestDialog}
        onClose={() => setShowCompanyRequestDialog(false)}
      />
    </div>
  );
}

export default function MarketIntelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <MarketIntelContent />
    </Suspense>
  );
}
