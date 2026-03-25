'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { SpaceCompany, FOCUS_AREAS, COUNTRY_INFO, CompanyCountry, CompanyFocusArea } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StockMiniChart from '@/components/ui/StockMiniChart';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import CompanyRequestDialog from '@/components/ui/CompanyRequestDialog';
import AdSlot from '@/components/ads/AdSlot';
import PullToRefresh from '@/components/ui/PullToRefresh';
import EmptyState from '@/components/ui/EmptyState';
import DataFreshnessBadge from '@/components/ui/DataFreshnessBadge';
import { clientLogger } from '@/lib/client-logger';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import SubscribeCTA from '@/components/marketing/SubscribeCTA';
import { getCompanyProfileUrl } from '@/lib/company-links';
import { trackTimeOnPage } from '@/lib/analytics';

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

interface SpaceETF {
  ticker: string;
  name: string;
  category: 'pure_space' | 'aerospace_defense';
  expenseRatio: number;
  leveraged?: boolean;
}

const SPACE_ETFS: SpaceETF[] = [
  // Pure Space ETFs
  { ticker: 'UFO', name: 'Procure Space ETF', category: 'pure_space', expenseRatio: 0.75 },
  { ticker: 'ARKX', name: 'ARK Space Exploration & Innovation ETF', category: 'pure_space', expenseRatio: 0.75 },
  { ticker: 'ROKT', name: 'SPDR S&P Kensho Final Frontiers ETF', category: 'pure_space', expenseRatio: 0.45 },
  // Aerospace & Defense ETFs (significant space exposure)
  { ticker: 'ITA', name: 'iShares U.S. Aerospace & Defense ETF', category: 'aerospace_defense', expenseRatio: 0.38 },
  { ticker: 'XAR', name: 'SPDR S&P Aerospace & Defense ETF', category: 'aerospace_defense', expenseRatio: 0.35 },
  { ticker: 'PPA', name: 'Invesco Aerospace & Defense ETF', category: 'aerospace_defense', expenseRatio: 0.58 },
  { ticker: 'DFEN', name: 'Direxion Daily A&D Bull 3X Shares', category: 'aerospace_defense', expenseRatio: 0.95, leveraged: true },
  { ticker: 'FITE', name: 'SPDR S&P Kensho Future Security ETF', category: 'aerospace_defense', expenseRatio: 0.45 },
];

const SECTOR_FILTERS: { value: string; label: string; focusAreas: CompanyFocusArea[] }[] = [
  { value: '', label: 'All', focusAreas: [] },
  { value: 'launch', label: 'Launch Providers', focusAreas: ['launch_provider'] },
  { value: 'satellites', label: 'Satellite Operators', focusAreas: ['satellites'] },
  { value: 'earth_observation', label: 'Earth Observation', focusAreas: ['earth_observation'] },
  { value: 'space_stations', label: 'Space Stations', focusAreas: ['space_stations'] },
  { value: 'defense', label: 'Defense & Security', focusAreas: ['defense'] },
  { value: 'ground_segment', label: 'Ground Segment', focusAreas: ['communications', 'space_infrastructure'] },
];

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

function CompanyRow({ company }: { company: SpaceCompany }) {
  const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];

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
    <tr className="border-b border-white/[0.06] hover:bg-white/[0.04] transition-colors">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
          <div>
            <div className="font-semibold text-white">
              {getCompanyProfileUrl(company.name) ? (
                <Link href={getCompanyProfileUrl(company.name)!} className="hover:underline">{company.name}</Link>
              ) : company.name}
            </div>
            {company.ticker ? (
              <div className="text-xs text-white/90 font-mono">
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
          <span className="text-xs bg-white/[0.08] text-slate-400 px-2 py-1 rounded">
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
          <span className="text-slate-400 text-sm">—</span>
        ) : (
          <div>
            {company.lastFundingRound && (
              <div className="text-sm text-white">{company.lastFundingRound}</div>
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
                className="text-xs bg-white/[0.04] text-slate-300 px-2 py-0.5 rounded whitespace-nowrap"
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
              className="text-white/90 hover:text-white text-sm"
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
            <Link href="/spectrum" className="text-xs text-white/70 hover:text-white">
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
            className="text-xs text-white/90 hover:text-white"
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

  // Track time spent on the market intel page
  useEffect(() => {
    return trackTimeOnPage('/market-intel');
  }, []);

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
  const [etfData, setEtfData] = useState<Record<string, StockData>>({});
  const [etfFilter, setEtfFilter] = useState<'all' | 'pure_space' | 'aerospace_defense'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || '');
  const [selectedType, setSelectedType] = useState<'' | 'public' | 'private'>(
    (searchParams.get('type') as '' | 'public' | 'private') || ''
  );
  const [selectedFocus, setSelectedFocus] = useState<CompanyFocusArea | ''>(
    (searchParams.get('focus') as CompanyFocusArea | '') || ''
  );
  const [showCompanyRequestDialog, setShowCompanyRequestDialog] = useState(false);
  const [publicSectorFilter, setPublicSectorFilter] = useState('');
  const [privateSectorFilter, setPrivateSectorFilter] = useState('');

  const filterBySector = useCallback((companyList: SpaceCompany[], sectorValue: string) => {
    if (!sectorValue) return companyList;
    const sectorDef = SECTOR_FILTERS.find(s => s.value === sectorValue);
    if (!sectorDef) return companyList;
    return companyList.filter(c =>
      (c.focusAreas as string[]).some(area => sectorDef.focusAreas.includes(area as CompanyFocusArea))
    );
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedType) params.set('type', selectedType);
    if (selectedFocus) params.set('focus', selectedFocus);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedCountry, selectedType, selectedFocus, router, pathname]);

  const fetchStockData = useCallback(async (publicCompanies: SpaceCompany[]) => {
    const tickers = publicCompanies.map((c) => c.ticker).join(',');
    try {
      // Fetch batch stock data + detailed data for top 6 in parallel
      const topTickers = publicCompanies.slice(0, 6).map((c) => c.ticker);

      const [batchRes, ...detailedResults] = await Promise.all([
        fetch(`/api/stocks?tickers=${tickers}`).then(r => r.json()),
        ...topTickers.map(async (ticker) => {
          try {
            const res = await fetch(`/api/stocks/${ticker}`);
            const data = await res.json();
            return !data.error ? { ticker, data } : null;
          } catch {
            return null;
          }
        }),
      ]);

      if (batchRes.stocks) {
        const stockMap: Record<string, StockData> = {};
        batchRes.stocks.forEach((stock: StockData) => {
          if (stock.success) {
            stockMap[stock.ticker] = stock;
          }
        });
        setStockData(stockMap);
      }

      const detailedMap: Record<string, DetailedStockData> = {};
      detailedResults.forEach((result) => {
        if (result && result.ticker) {
          detailedMap[result.ticker] = result.data;
        }
      });
      setDetailedStockData(detailedMap);
    } catch (error) {
      clientLogger.error('Failed to fetch stock data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    }
  }, []);

  const fetchEtfData = useCallback(async () => {
    try {
      const tickers = SPACE_ETFS.map((e) => e.ticker).join(',');
      const res = await fetch(`/api/stocks?tickers=${tickers}`);
      const data = await res.json();

      if (data.stocks) {
        const etfMap: Record<string, StockData> = {};
        data.stocks.forEach((stock: StockData) => {
          if (stock.success) {
            etfMap[stock.ticker] = stock;
          }
        });
        setEtfData(etfMap);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch ETF data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
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

      // Fetch ETF data
      fetchEtfData();
    } catch (error) {
      clientLogger.error('Failed to fetch market data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [selectedCountry, selectedType, selectedFocus, fetchStockData, fetchEtfData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/companies/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      clientLogger.error('Failed to initialize companies', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setInitializing(false);
    }
  };

  return (
    <PullToRefresh onRefresh={async () => { await fetchData(); }}>
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/art/hero-market-intel.png"
            alt=""
            fill
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>
        <div className="container mx-auto px-4 pt-6">
          <AnimatedPageHeader title="Market Intel" subtitle="Track space industry companies, stock performance, and funding rounds" icon="📊" accentColor="emerald" breadcrumb="Dashboard → Market Intel" />
        </div>
      </div>

      <div className="container mx-auto px-4">

        {/* ═══════ SpaceX IPO Market Alert ═══════ */}
        <Link href="/blog/spacex-ipo-what-it-means-for-space-investors" className="block mb-6 group">
          <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 p-5 sm:p-6 hover:border-amber-400/40 transition-all duration-300">
            {/* Subtle amber glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-lg font-bold">!</span>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80">Market Alert</span>
                  <h3 className="text-lg font-bold font-display text-white group-hover:text-amber-300 transition-colors">SpaceX IPO Watch</h3>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 font-medium">
                  Potential <span className="text-amber-400 font-semibold">$1.5&ndash;1.75T</span> valuation&nbsp;&nbsp;|&nbsp;&nbsp;Expected <span className="text-amber-400 font-semibold">June 2026</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  The largest IPO in history could reshape the space investment landscape
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 text-xs text-amber-400 font-medium group-hover:gap-2.5 transition-all whitespace-nowrap">
                Read analysis
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        <div className="mb-4">
          <DataFreshnessBadge
            lastUpdated={lastUpdated}
            source="SEC & Market Data"
            refreshInterval="on page load"
            onRefresh={() => fetchData()}
          />
        </div>

        {stats && stats.total > 0 && (
          <>
            {/* Stats Cards */}
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StaggerItem>
                <div className="card-elevated p-6 text-center">
                  <div className="text-4xl font-bold font-display tracking-tight text-white">{stats.total}</div>
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
                  <div className="text-4xl font-bold font-display tracking-tight text-white/90">
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
              <h3 className="text-white font-semibold mb-3">Companies by Region</h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.byCountry).map(([country, count]) => {
                  const info = COUNTRY_INFO[country as CompanyCountry];
                  return (
                    <div
                      key={country}
                      className="flex items-center gap-2 bg-white/[0.04] px-3 py-2 rounded-lg"
                    >
                      <span>{info?.flag || '🌐'}</span>
                      <span className="text-slate-400">{info?.name || country}</span>
                      <span className="text-white font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Request Company Addition */}
            <div className="mb-8">
              <button
                onClick={() => setShowCompanyRequestDialog(true)}
                className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2"
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
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
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
                          className="card p-4 hover:border-white/15 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-white">
                                {getCompanyProfileUrl(company.name) ? (
                                  <Link href={getCompanyProfileUrl(company.name)!} className="hover:underline">{company.name}</Link>
                                ) : company.name}
                              </div>
                              <div className="text-xs text-white/90 font-mono">
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
                        </StaggerItem>
                      );
                    })}
                </StaggerContainer>
              </div>
            )}

            {/* Space ETFs & Funds */}
            {Object.keys(etfData).length > 0 && (
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  Space ETFs & Funds
                  <span className="text-xs text-slate-400 font-normal ml-2">Live prices via Yahoo Finance</span>
                </h3>

                {/* ETF Category Tabs */}
                <div className="flex gap-2 mb-4">
                  {[
                    { value: 'all' as const, label: 'All' },
                    { value: 'pure_space' as const, label: 'Pure Space' },
                    { value: 'aerospace_defense' as const, label: 'Aerospace & Defense' },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setEtfFilter(tab.value)}
                      className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                        etfFilter === tab.value
                          ? 'bg-white text-slate-900'
                          : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {SPACE_ETFS
                    .filter((etf) => etfFilter === 'all' || etf.category === etfFilter)
                    .filter((etf) => etfData[etf.ticker])
                    .map((etf) => {
                      const data = etfData[etf.ticker];
                      const isPositive = data.changePercent >= 0;
                      const is30DPositive = (data.change30D ?? 0) >= 0;

                      return (
                        <StaggerItem key={etf.ticker}>
                          <div className="card p-4 hover:border-white/15 transition-all relative">
                            {/* Category & leveraged badges */}
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                etf.category === 'pure_space'
                                  ? 'bg-purple-500/20 text-purple-500'
                                  : 'bg-blue-500/20 text-blue-500'
                              }`}>
                                {etf.category === 'pure_space' ? 'Pure Space' : 'A&D'}
                              </span>
                              {etf.leveraged && (
                                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                  3x Leveraged
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mb-1">
                              <div className="font-mono text-sm font-bold text-white/90">{etf.ticker}</div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  isPositive
                                    ? 'bg-green-500/20 text-green-500'
                                    : 'bg-red-500/20 text-red-500'
                                }`}
                              >
                                {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 mb-2 line-clamp-1">{etf.name}</div>

                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-xl font-bold text-white">${data.price.toFixed(2)}</span>
                              <span className={`text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {isPositive ? '+' : ''}{data.change.toFixed(2)}
                              </span>
                            </div>

                            {data.chartData && data.chartData.length > 0 && (
                              <div className="mb-2">
                                <StockMiniChart
                                  data={data.chartData}
                                  width={180}
                                  height={40}
                                  positive={is30DPositive}
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>
                                30D: <span className={is30DPositive ? 'text-green-500' : 'text-red-500'}>
                                  {is30DPositive ? '+' : ''}{(data.change30D ?? 0).toFixed(1)}%
                                </span>
                              </span>
                              <span>ER: {etf.expenseRatio}%</span>
                            </div>
                          </div>
                        </StaggerItem>
                      );
                    })}
                </StaggerContainer>

                {/* Show message if filter hides all ETFs */}
                {SPACE_ETFS
                  .filter((etf) => etfFilter === 'all' || etf.category === etfFilter)
                  .filter((etf) => etfData[etf.ticker]).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">No ETF data available for this category.</p>
                )}
              </div>
            )}

            {/* Ad between ETFs and company tables */}
            <div className="mb-8">
              <AdSlot position="in_feed" module="market-intel" adsenseSlot="in_feed_market" adsenseFormat="rectangle" />
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
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
                    className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
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
                    className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
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
                      className="text-sm text-white/90 hover:text-white py-2 min-h-[44px]"
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

        {/* Error Banner */}
        {error && !loading && (
          <div role="alert" aria-live="polite" className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
            <button
              onClick={() => fetchData()}
              className="mt-3 px-4 py-2 min-h-[44px] bg-white/10 text-slate-300 rounded-lg hover:bg-slate-100/30 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Companies Table */}
        {loading ? (
          <div aria-live="polite" aria-busy="true" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded bg-white/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/[0.06] rounded w-2/3" />
                    <div className="h-3 bg-white/[0.06] rounded w-1/3" />
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-8 bg-white/[0.06] rounded flex-1" />
                  <div className="h-8 w-20 bg-white/[0.06] rounded" />
                </div>
                <div className="flex gap-1">
                  <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
                  <div className="h-5 w-20 bg-white/[0.06] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : companies.length === 0 && !stats?.total ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">📊</span>
            <h2 className="text-2xl font-semibold text-white mb-2">No Company Data</h2>
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
          <EmptyState
            icon={<span className="text-4xl">🔍</span>}
            title="No Results"
            description="No companies match your current filters. Try adjusting your criteria."
          />
        ) : (
          <div className="space-y-8">
            {/* Publicly Traded Companies */}
            {companies.filter(c => c.isPublic).length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="text-green-400">📈</span>
                    Publicly Traded Companies
                    <span className="text-slate-400 font-normal text-sm">
                      ({filterBySector(companies.filter(c => c.isPublic), publicSectorFilter).length})
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                    {SECTOR_FILTERS.map((sector) => (
                      <button
                        key={sector.value}
                        onClick={() => setPublicSectorFilter(publicSectorFilter === sector.value ? '' : sector.value)}
                        className={`px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium transition-colors ${
                          publicSectorFilter === sector.value
                            ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                            : 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.08] hover:text-slate-300'
                        }`}
                      >
                        {sector.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Desktop Table */}
                <div className="card overflow-hidden hidden md:block">
                  <div className="max-h-[500px] overflow-y-auto overflow-x-auto data-scroll-mobile">
                    <table className="w-full min-w-[640px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-white/[0.06] border-b border-white/[0.06]">
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Company</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Stock Price</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Today</th>
                          <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Market Cap</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Focus Areas</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Links</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterBySector(companies.filter(c => c.isPublic), publicSectorFilter).map((company) => {
                          const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];
                          const stock = company.ticker ? stockData[company.ticker] : null;
                          const isPositive = stock ? stock.changePercent >= 0 : true;

                          return (
                            <tr key={company.id} className="border-b border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
                                  <div>
                                    <div className="font-semibold text-white">
                                      {getCompanyProfileUrl(company.name) ? (
                                        <Link href={getCompanyProfileUrl(company.name)!} className="hover:underline">{company.name}</Link>
                                      ) : company.name}
                                    </div>
                                    <div className="text-xs text-white/90 font-mono">
                                      {company.exchange}:{company.ticker}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                {stock ? (
                                  <span className="font-mono font-medium text-white">${stock.price.toFixed(2)}</span>
                                ) : (
                                  <div className="h-4 w-16 bg-white/[0.08] rounded animate-pulse ml-auto" />
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
                                  <div className="h-4 w-14 bg-white/[0.08] rounded animate-pulse ml-auto" />
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
                                      <span key={area} className="text-xs bg-white/[0.04] text-slate-300 px-2 py-0.5 rounded whitespace-nowrap">
                                        {focusInfo?.icon} {focusInfo?.label || area}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {company.website && (
                                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white text-sm">
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

                {/* Mobile Card View - Public Companies */}
                <div className="md:hidden space-y-3">
                  {filterBySector(companies.filter(c => c.isPublic), publicSectorFilter).map((company) => {
                    const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];
                    const stock = company.ticker ? stockData[company.ticker] : null;
                    const isPositive = stock ? stock.changePercent >= 0 : true;

                    return (
                      <div key={company.id} className="card p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-lg flex-shrink-0">{countryInfo?.flag || '🌐'}</span>
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-sm truncate">
                                {getCompanyProfileUrl(company.name) ? (
                                  <Link href={getCompanyProfileUrl(company.name)!} className="hover:underline">{company.name}</Link>
                                ) : company.name}
                              </div>
                              <div className="text-xs text-white/90 font-mono">
                                {company.exchange}:{company.ticker}
                              </div>
                            </div>
                          </div>
                          {stock && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${
                              isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          {stock ? (
                            <span className="font-mono font-medium text-white">${stock.price.toFixed(2)}</span>
                          ) : (
                            <div className="h-4 w-16 bg-white/[0.08] rounded animate-pulse" />
                          )}
                          <span className="text-slate-400 text-xs">
                            {company.marketCap ? (
                              company.marketCap >= 1 ? `$${company.marketCap.toFixed(1)}B` : `$${(company.marketCap * 1000).toFixed(0)}M`
                            ) : '—'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(company.focusAreas as string[]).slice(0, 2).map((area) => {
                            const focusInfo = FOCUS_AREAS.find(f => f.value === area);
                            return (
                              <span key={area} className="text-xs bg-white/[0.04] text-slate-300 px-2 py-0.5 rounded">
                                {focusInfo?.icon} {focusInfo?.label || area}
                              </span>
                            );
                          })}
                        </div>
                        {company.website && (
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white text-xs">
                            Visit →
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Private Companies */}
            {companies.filter(c => !c.isPublic).length > 0 && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="text-yellow-400">🔒</span>
                    Private Companies
                    <span className="text-slate-400 font-normal text-sm">
                      ({filterBySector(companies.filter(c => !c.isPublic), privateSectorFilter).length})
                    </span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                    {SECTOR_FILTERS.map((sector) => (
                      <button
                        key={sector.value}
                        onClick={() => setPrivateSectorFilter(privateSectorFilter === sector.value ? '' : sector.value)}
                        className={`px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium transition-colors ${
                          privateSectorFilter === sector.value
                            ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40'
                            : 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.08] hover:text-slate-300'
                        }`}
                      >
                        {sector.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Desktop Table */}
                <div className="card overflow-hidden hidden md:block">
                  <div className="max-h-[500px] overflow-y-auto overflow-x-auto data-scroll-mobile">
                    <table className="w-full min-w-[720px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-white/[0.06] border-b border-white/[0.06]">
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
                        {filterBySector(companies.filter(c => !c.isPublic), privateSectorFilter).sort((a, b) => (b.valuation || 0) - (a.valuation || 0)).map((company) => {
                          const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];

                          return (
                            <tr key={company.id} className="border-b border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{countryInfo?.flag || '🌐'}</span>
                                  <div>
                                    <div className="font-semibold text-white">
                                      {getCompanyProfileUrl(company.name) ? (
                                        <Link href={getCompanyProfileUrl(company.name)!} className="hover:underline">{company.name}</Link>
                                      ) : company.name}
                                    </div>
                                    <div className="text-xs text-slate-400">{countryInfo?.name || company.country}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {company.isPreIPO ? (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded font-medium">Pre-IPO</span>
                                ) : (
                                  <span className="text-xs bg-white/[0.08] text-slate-400 px-2 py-1 rounded">Private</span>
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
                                    <div className="text-sm text-white">{company.lastFundingRound}</div>
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
                                      <span key={area} className="text-xs bg-white/[0.04] text-slate-300 px-2 py-0.5 rounded whitespace-nowrap">
                                        {focusInfo?.icon} {focusInfo?.label || area}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {company.website && (
                                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white text-sm">
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

                {/* Mobile Card View - Private Companies */}
                <div className="md:hidden space-y-3">
                  {filterBySector(companies.filter(c => !c.isPublic), privateSectorFilter).sort((a, b) => (b.valuation || 0) - (a.valuation || 0)).map((company) => {
                    const countryInfo = COUNTRY_INFO[company.country as CompanyCountry];

                    return (
                      <div key={company.id} className="card p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-lg flex-shrink-0">{countryInfo?.flag || '🌐'}</span>
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-sm truncate">
                                {getCompanyProfileUrl(company.name) ? (
                                  <Link href={getCompanyProfileUrl(company.name)!} className="hover:underline">{company.name}</Link>
                                ) : company.name}
                              </div>
                              <div className="text-xs text-slate-400">{countryInfo?.name || company.country}</div>
                            </div>
                          </div>
                          {company.isPreIPO ? (
                            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded font-medium flex-shrink-0">Pre-IPO</span>
                          ) : (
                            <span className="text-xs bg-white/[0.08] text-slate-400 px-2 py-0.5 rounded flex-shrink-0">Private</span>
                          )}
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">Valuation</span>
                            <span className="text-slate-300 font-medium">
                              {company.valuation ? (
                                company.valuation >= 1 ? `$${company.valuation.toFixed(1)}B` : `$${(company.valuation * 1000).toFixed(0)}M`
                              ) : '—'}
                            </span>
                          </div>
                          {company.lastFundingRound && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Last Funding</span>
                              <span className="text-slate-300">{company.lastFundingRound} {company.lastFundingAmount ? `(${formatFunding(company.lastFundingAmount)})` : ''}</span>
                            </div>
                          )}
                          {company.expectedIPODate && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">IPO Expected</span>
                              <span className="text-yellow-500">{company.expectedIPODate}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(company.focusAreas as string[]).slice(0, 2).map((area) => {
                            const focusInfo = FOCUS_AREAS.find(f => f.value === area);
                            return (
                              <span key={area} className="text-xs bg-white/[0.04] text-slate-300 px-2 py-0.5 rounded">
                                {focusInfo?.icon} {focusInfo?.label || area}
                              </span>
                            );
                          })}
                        </div>
                        {company.website && (
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white text-xs mt-2 inline-block">
                            Visit →
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Space Industry Trends Dashboard ──────────────────────── */}
        <div className="mt-8 mb-8">
          <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📈</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Space Industry Trends</h3>
                  <p className="text-xs text-slate-500">Key directional indicators updated Q1 2026</p>
                </div>
              </div>
              <Link
                href="/industry-trends"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                Full Analysis
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="space-y-3">
              {[
                {
                  trend: 'Launch Cadence',
                  direction: 'up' as const,
                  label: 'Up 15% YoY',
                  detail: '250+ launches projected for 2026, led by SpaceX Falcon 9 and Starship V3 flight tests.',
                  blogHref: '/blog/space-launch-cadence-2026',
                  blogLabel: 'Launch Cadence Report',
                },
                {
                  trend: 'Satellite Insurance',
                  direction: 'up' as const,
                  label: 'Premiums rising',
                  detail: 'Mega-constellation deployments and debris concerns pushing premiums up 8-12% across underwriters.',
                  blogHref: '/blog/satellite-insurance-market-trends',
                  blogLabel: 'Insurance Market Trends',
                },
                {
                  trend: 'VC Funding',
                  direction: 'up' as const,
                  label: '$10B+ in 2025',
                  detail: 'Defense-tech crossover and SpaceX IPO anticipation driving record investor interest.',
                  blogHref: '/blog/space-vc-funding-2025-review',
                  blogLabel: 'VC Funding Review',
                },
                {
                  trend: 'Launch Costs ($/kg)',
                  direction: 'down' as const,
                  label: 'Down 18% (Falcon 9)',
                  detail: 'Reuse cadence and competition from Neutron and New Glenn compressing per-kg costs further.',
                  blogHref: '/blog/launch-cost-trends-analysis',
                  blogLabel: 'Launch Cost Analysis',
                },
                {
                  trend: 'Regulatory Complexity',
                  direction: 'stable' as const,
                  label: 'Stable — evolving',
                  detail: 'FCC 5-year deorbit rule in effect; WRC-27 spectrum decisions still pending. ITAR reform stalled.',
                  blogHref: '/blog/space-regulatory-outlook-2026',
                  blogLabel: 'Regulatory Outlook',
                },
              ].map((item) => {
                const dirIcon = item.direction === 'up' ? '\u2191' : item.direction === 'down' ? '\u2193' : '\u2192';
                const dirColor = item.direction === 'up' ? 'text-emerald-400' : item.direction === 'down' ? 'text-red-400' : 'text-slate-400';
                const dirBg = item.direction === 'up' ? 'bg-emerald-500/10' : item.direction === 'down' ? 'bg-red-500/10' : 'bg-slate-500/10';

                return (
                  <div key={item.trend} className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-xl hover:bg-white/[0.05] transition-colors group">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold shrink-0 ${dirBg} ${dirColor}`}>
                      {dirIcon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{item.trend}</span>
                        <span className={`text-xs font-medium ${dirColor}`}>{dirIcon} {item.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                    <Link
                      href={item.blogHref}
                      className="text-[10px] text-blue-400 hover:text-blue-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                    >
                      {item.blogLabel} &rarr;
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SubscribeCTA />

        <RelatedModules modules={[
          { name: 'Company Profiles', description: '200+ detailed company pages', href: '/company-profiles', icon: '\u{1F3E2}' },
          { name: 'Space Capital', description: 'Investment tracking and VC data', href: '/space-capital', icon: '\u{1F4B0}' },
          { name: 'Funding Tracker', description: 'Recent funding rounds', href: '/funding-tracker', icon: '\u{1F4CA}' },
          { name: 'Space Economy', description: 'Market overview and trends', href: '/space-economy', icon: '\u{1F30D}' },
        ]} />

        {/* Footer Ad */}
        <div className="mt-8">
          <AdSlot position="footer" module="market-intel" adsenseSlot="footer_market" adsenseFormat="horizontal" />
        </div>

        {/* Info Note */}
        <ScrollReveal>
          <div className="card p-6 mt-8 border-dashed">
            <div className="text-center">
              <span className="text-4xl block mb-3">💡</span>
              <h3 className="text-lg font-semibold text-white mb-2">About Market Intel</h3>
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
    </PullToRefresh>
  );
}

export default function MarketIntelPage() {
  return (
    <>
    <BreadcrumbSchema items={[
      { name: 'Home', href: '/' },
      { name: 'Market Intel', href: '/market-intel' },
    ]} />
    <FAQSchema items={[
      { question: 'Where does SpaceNexus get its space market data?', answer: 'SpaceNexus aggregates data from SEC filings, public earnings reports, press releases, industry reports from organizations like SIA and Euroconsult, and real-time stock market data for publicly traded space companies.' },
      { question: 'How often is space market intelligence updated?', answer: 'Stock prices and ETF data update throughout trading hours. Company financial data, funding rounds, and industry metrics are updated daily from multiple verified sources.' },
      { question: 'What space ETFs can I track on SpaceNexus?', answer: 'SpaceNexus tracks major space-focused ETFs including UFO (Procure Space ETF), ARKX (ARK Space Exploration), ROKT (SPDR Kensho Final Frontiers), and aerospace-defense ETFs like ITA and XAR.' },
      { question: 'Is SpaceNexus market data free?', answer: 'Yes, SpaceNexus Market Intelligence is available on the free tier with basic access. Pro and Enterprise plans include advanced analytics, historical data, and API access.' },
    ]} />
    <Suspense
      fallback={
        <div className="min-h-screen container mx-auto px-4 py-12">
          <div className="h-10 w-48 bg-white/[0.06] rounded mb-6 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-6 animate-pulse"><div className="h-10 bg-white/[0.06] rounded mb-2" /><div className="h-3 bg-white/[0.06] rounded w-2/3 mx-auto" /></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-5 animate-pulse"><div className="h-4 bg-white/[0.06] rounded w-3/4 mb-3" /><div className="h-8 bg-white/[0.06] rounded mb-2" /><div className="flex gap-1"><div className="h-5 w-16 bg-white/[0.06] rounded-full" /><div className="h-5 w-20 bg-white/[0.06] rounded-full" /></div></div>
            ))}
          </div>
        </div>
      }
    >
      <MarketIntelContent />
    </Suspense>
    </>
  );
}
