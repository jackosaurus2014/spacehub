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
  topGainer: { name: string; ticker: string; change: number };
  topLoser: { name: string; ticker: string; change: number };
  totalMarketCap: string;
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

        // Fetch market data
        const stockRes = await fetch('/api/stocks');
        const stockData = await stockRes.json();
        if (stockData.stocks?.length > 0) {
          const sorted = [...stockData.stocks].sort((a, b) => b.changePercent - a.changePercent);
          setMarket({
            topGainer: sorted[0] ? { name: sorted[0].name, ticker: sorted[0].ticker, change: sorted[0].changePercent } : { name: 'N/A', ticker: '', change: 0 },
            topLoser: sorted[sorted.length - 1] ? { name: sorted[sorted.length - 1].name, ticker: sorted[sorted.length - 1].ticker, change: sorted[sorted.length - 1].changePercent } : { name: 'N/A', ticker: '', change: 0 },
            totalMarketCap: '$924B',
          });
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <p className="text-xs text-slate-500">{launch.provider}</p>
          </>
        ) : (
          <p className="text-slate-400">No upcoming launches</p>
        )}
      </Link>

      {/* Market Movement */}
      <Link href="/market-intel" className="card p-4 hover:border-cyan-400/50 transition-all group">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📈</span>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Market</span>
        </div>
        {market ? (
          <>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-lg font-bold text-emerald-400">
                +{market.topGainer.change.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">{market.topGainer.ticker}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-red-400">
                {market.topLoser.change.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">{market.topLoser.ticker}</span>
            </div>
          </>
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
            <p className="text-xs text-slate-500 mt-1">{news.source}</p>
          </>
        ) : (
          <p className="text-slate-400">No recent news</p>
        )}
      </Link>

      {/* Solar Activity */}
      <Link href="/solar-flares" className="card p-4 hover:border-cyan-400/50 transition-all group">
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
