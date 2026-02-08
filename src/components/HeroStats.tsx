'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LaunchData {
  name: string;
  date: string;
  provider: string;
  timeUntil: string;
}

interface MarketData {
  // Either an upcoming IPO or the top performing stock
  type: 'ipo' | 'top_performer';
  // IPO data
  ipoCompany?: { name: string; expectedDate: string; daysUntil: number };
  // Top performer data
  topGainer?: { name: string; ticker: string; change: number };
}

interface NewsData {
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface SolarData {
  status: 'quiet' | 'active' | 'storm';
  flareClass: string | null;
  kpIndex: number;
}

function formatTimeUntil(dateString: string): string {
  const launchDate = new Date(dateString);
  const now = new Date();
  const diff = launchDate.getTime() - now.getTime();

  if (diff < 0) return 'Launched';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function HeroStats() {
  const [launch, setLaunch] = useState<LaunchData | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [solar, setSolar] = useState<SolarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch next launch
        const launchRes = await fetch('/api/events?limit=1');
        const launchData = await launchRes.json();
        if (launchData.events?.[0]) {
          const event = launchData.events[0];
          setLaunch({
            name: event.name,
            date: event.date,
            provider: event.provider || 'Unknown',
            timeUntil: formatTimeUntil(event.date),
          });
        }

        // Check for upcoming IPOs first
        let foundIPO = false;
        try {
          const companiesRes = await fetch('/api/companies?preIPO=true');
          const companiesData = await companiesRes.json();
          if (companiesData.companies?.length > 0) {
            // Look for companies with specific IPO dates in the next 7 days
            const now = new Date();
            const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            for (const company of companiesData.companies) {
              if (company.expectedIPODate && company.expectedIPODate !== 'TBD') {
                // Try to parse as a specific date (YYYY-MM-DD format)
                const ipoDate = new Date(company.expectedIPODate);
                if (!isNaN(ipoDate.getTime()) && ipoDate >= now && ipoDate <= sevenDaysFromNow) {
                  const daysUntil = Math.ceil((ipoDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  setMarket({
                    type: 'ipo',
                    ipoCompany: {
                      name: company.name,
                      expectedDate: company.expectedIPODate,
                      daysUntil,
                    },
                  });
                  foundIPO = true;
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.error('Error fetching IPO data:', e);
        }

        // If no upcoming IPO, show top performing stock
        if (!foundIPO) {
          const stockRes = await fetch('/api/stocks?tickers=RKLB,LUNR,ASTS,PL,RDW,SPCE,BKSY,MNTS,SATL,IRDM,GSAT,VSAT');
          const stockData = await stockRes.json();
          if (stockData.stocks?.length > 0) {
            // Filter for stocks with valid numeric changePercent values
            const successfulStocks = stockData.stocks.filter((s: { success: boolean; changePercent?: number | null }) => {
              if (!s.success) return false;
              if (s.changePercent === undefined || s.changePercent === null) return false;
              if (typeof s.changePercent !== 'number') return false;
              if (isNaN(s.changePercent) || !isFinite(s.changePercent)) return false;
              return true;
            });

            if (successfulStocks.length > 0) {
              // Find the stock with the highest changePercent (best performer)
              let topStock = successfulStocks[0];
              for (let i = 1; i < successfulStocks.length; i++) {
                if (successfulStocks[i].changePercent > topStock.changePercent) {
                  topStock = successfulStocks[i];
                }
              }

              setMarket({
                type: 'top_performer',
                topGainer: {
                  name: topStock.name || topStock.ticker,
                  ticker: topStock.ticker,
                  change: topStock.changePercent
                },
              });
            }
          }
        }

        // Fetch latest news
        const newsRes = await fetch('/api/news?limit=1');
        const newsData = await newsRes.json();
        if (newsData.articles?.[0]) {
          const article = newsData.articles[0];
          setNews({
            headline: article.title,
            source: article.newsSite,
            url: article.url,
            publishedAt: article.publishedAt,
          });
        }

        // Fetch solar activity
        const solarRes = await fetch('/api/solar-flares/danger');
        const solarData = await solarRes.json();
        setSolar({
          status: solarData.dangerLevel === 'high' ? 'storm' : solarData.dangerLevel === 'elevated' ? 'active' : 'quiet',
          flareClass: solarData.recentFlares?.[0]?.classType || null,
          kpIndex: solarData.geomagneticActivity?.kpIndex || 0,
        });
      } catch (error) {
        console.error('Error fetching hero stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (!launch) return;
    const interval = setInterval(() => {
      setLaunch(prev => prev ? { ...prev, timeUntil: formatTimeUntil(prev.date) } : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [launch?.date]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-slate-600/50 rounded w-1/2 mb-2"></div>
            <div className="h-6 bg-slate-600/50 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const solarStatusColors = {
    quiet: 'text-emerald-400',
    active: 'text-amber-400',
    storm: 'text-red-400',
  };

  const solarStatusLabels = {
    quiet: 'Quiet',
    active: 'Active',
    storm: 'Storm Warning',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" role="region" aria-label="Key space industry metrics">
      <span className="sr-only">
        {`Dashboard overview: ${launch ? `Next launch ${launch.name} by ${launch.provider} in ${launch.timeUntil}` : 'No upcoming launches'}. ${
          market?.type === 'ipo' && market.ipoCompany
            ? `Upcoming IPO: ${market.ipoCompany.name} in ${market.ipoCompany.daysUntil} days`
            : market?.topGainer
              ? `Top performer: ${market.topGainer.name} (${market.topGainer.ticker}) ${market.topGainer.change >= 0 ? '+' : ''}${market.topGainer.change.toFixed(1)}%`
              : 'No market data'
        }. ${news ? `Latest news: ${news.headline} from ${news.source}` : 'No recent news'}. ${
          solar ? `Space weather: ${solarStatusLabels[solar.status]}, Kp index ${solar.kpIndex}${solar.flareClass ? `, latest flare ${solar.flareClass}` : ''}` : 'Solar data loading'
        }.`}
      </span>
      {/* Next Launch */}
      <Link href="/mission-control" className="card p-4 hover:border-cyan-400/50 transition-all group">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🚀</span>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Next Launch</span>
        </div>
        {launch ? (
          <>
            <div className="text-2xl font-bold text-cyan-400 font-mono mb-1">
              {launch.timeUntil}
            </div>
            <p className="text-sm text-slate-300 truncate group-hover:text-white transition-colors">
              {launch.name}
            </p>
            <p className="text-xs text-slate-400">{launch.provider}</p>
          </>
        ) : (
          <p className="text-slate-400">No upcoming launches</p>
        )}
      </Link>

      {/* Market Highlight */}
      <Link href="/market-intel" className="card p-4 hover:border-cyan-400/50 transition-all group">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{market?.type === 'ipo' ? '🔔' : '📈'}</span>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            {market?.type === 'ipo' ? 'Upcoming IPO' : 'Top Performer'}
          </span>
        </div>
        {market ? (
          market.type === 'ipo' && market.ipoCompany ? (
            <>
              <div className="text-2xl font-bold text-amber-400 font-mono mb-1">
                {market.ipoCompany.daysUntil === 0 ? 'Today!' : market.ipoCompany.daysUntil === 1 ? 'Tomorrow' : `${market.ipoCompany.daysUntil}d`}
              </div>
              <p className="text-sm text-slate-300 truncate group-hover:text-white transition-colors">
                {market.ipoCompany.name}
              </p>
              <p className="text-xs text-slate-400">IPO Date: {market.ipoCompany.expectedDate}</p>
            </>
          ) : market.topGainer ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-2xl font-bold font-mono ${market.topGainer.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {market.topGainer.change >= 0 ? '+' : ''}{market.topGainer.change.toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-slate-300 truncate group-hover:text-white transition-colors">
                {market.topGainer.name}
              </p>
              <p className="text-xs text-slate-400">{market.topGainer.ticker}</p>
            </>
          ) : (
            <p className="text-slate-400">No market data</p>
          )
        ) : (
          <p className="text-slate-400">Loading market data...</p>
        )}
      </Link>

      {/* Breaking News */}
      <Link href="/news" className="card p-4 hover:border-cyan-400/50 transition-all group col-span-1 lg:col-span-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📰</span>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Latest News</span>
        </div>
        {news ? (
          <>
            <p className="text-sm text-slate-200 line-clamp-2 group-hover:text-white transition-colors">
              {news.headline}
            </p>
            <p className="text-xs text-slate-400 mt-1">{news.source}</p>
          </>
        ) : (
          <p className="text-slate-400">No recent news</p>
        )}
      </Link>

      {/* Solar Activity */}
      <Link href="/space-environment" className="card p-4 hover:border-cyan-400/50 transition-all group">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">☀️</span>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Space Weather</span>
        </div>
        {solar ? (
          <>
            <div className={`text-xl font-bold ${solarStatusColors[solar.status]} mb-1`}>
              {solarStatusLabels[solar.status]}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {solar.flareClass && (
                <span>Latest: {solar.flareClass}</span>
              )}
              <span>Kp: {solar.kpIndex}</span>
            </div>
          </>
        ) : (
          <p className="text-slate-400">Loading solar data...</p>
        )}
      </Link>
    </div>
  );
}
