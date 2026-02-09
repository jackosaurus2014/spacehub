'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { MODULE_ROUTES } from '@/lib/module-routes';
import Link from 'next/link';

interface WidgetContentProps {
  moduleId: string;
  widgetType: string;
  config?: Record<string, unknown> | null;
}

interface ContentItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  url?: string;
  date?: string;
}

/**
 * WidgetContent renders module-specific content based on moduleId and widgetType.
 * For 'stats' type: shows 3-4 key numbers
 * For 'feed' type: shows latest 5 items
 * For 'compact' type: shows summary
 * For 'chart' type: shows primary chart placeholder
 * For 'full' type: shows full module preview
 */
export default function WidgetContent({ moduleId, widgetType }: WidgetContentProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<{ label: string; value: string; trend?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch module-specific data based on moduleId
        const data = await fetchModuleData(moduleId, widgetType);
        setItems(data.items);
        setStats(data.stats);
      } catch {
        setError('Unable to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [moduleId, widgetType]);

  if (loading) {
    return <WidgetSkeleton type={widgetType} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-slate-400 text-sm">{error}</p>
        <Link
          href={MODULE_ROUTES[moduleId] || '#'}
          className="text-cyan-400 hover:text-cyan-300 text-sm mt-2 underline"
        >
          Open full module
        </Link>
      </div>
    );
  }

  const moduleRoute = MODULE_ROUTES[moduleId] || '#';

  switch (widgetType) {
    case 'stats':
      return (
        <div className="grid grid-cols-2 gap-3 p-1">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center"
            >
              <p className="text-xs text-slate-400 truncate">{stat.label}</p>
              <p className="text-lg font-bold text-slate-900">{stat.value}</p>
              {stat.trend && (
                <p className={`text-xs ${stat.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.trend}
                </p>
              )}
            </div>
          ))}
        </div>
      );

    case 'feed':
      return (
        <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No recent items</p>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                href={item.url || moduleRoute}
                className="block p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-cyan-400/40 transition-colors"
              >
                <p className="text-sm font-medium text-slate-900 line-clamp-2">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{item.subtitle}</p>
                )}
                {item.date && (
                  <p className="text-xs text-slate-400 mt-1">{item.date}</p>
                )}
              </Link>
            ))
          )}
        </div>
      );

    case 'chart':
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[160px] bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="w-full h-24 flex items-end justify-between gap-1 px-2">
            {[40, 65, 50, 80, 45, 70, 55, 90, 60, 75, 85, 50].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-cyan-500/60 to-cyan-400/30 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            View full chart in{' '}
            <Link href={moduleRoute} className="text-cyan-400 hover:underline">
              module
            </Link>
          </p>
        </div>
      );

    case 'compact':
      return (
        <div className="space-y-3">
          {stats.length > 0 && (
            <div className="flex gap-3">
              {stats.slice(0, 2).map((stat, i) => (
                <div key={i} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-400">{stat.label}</p>
                  <p className="text-sm font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <div className="space-y-1.5">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                  <span className="text-slate-700 truncate">{item.title}</span>
                </div>
              ))}
            </div>
          )}
          <Link
            href={moduleRoute}
            className="block text-xs text-cyan-400 hover:text-cyan-300 text-center"
          >
            View more
          </Link>
        </div>
      );

    case 'full':
    default:
      return (
        <div className="space-y-3 overflow-y-auto max-h-[350px]">
          {stats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.map((stat, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-400">{stat.label}</p>
                  <p className="text-sm font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.url || moduleRoute}
              className="block p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-cyan-400/40 transition-colors"
            >
              <p className="text-sm font-medium text-slate-900 line-clamp-2">{item.title}</p>
              {item.subtitle && (
                <p className="text-xs text-slate-400 mt-1">{item.subtitle}</p>
              )}
            </Link>
          ))}
          {items.length === 0 && stats.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No data available</p>
              <Link href={moduleRoute} className="text-cyan-400 hover:underline text-sm mt-1 inline-block">
                Open module
              </Link>
            </div>
          )}
        </div>
      );
  }
}

/**
 * Fetch data for a specific module, returning items and stats
 */
async function fetchModuleData(
  moduleId: string,
  widgetType: string
): Promise<{
  items: ContentItem[];
  stats: { label: string; value: string; trend?: string }[];
}> {
  // Map modules to their API endpoints for fetching data
  const apiMap: Record<string, string> = {
    'news-feed': '/api/news?limit=5',
    'market-intel': '/api/market-intel?limit=5',
    'mission-control': '/api/events?limit=5',
    'startup-tracker': '/api/startups?limit=5',
    'blogs-articles': '/api/blogs?limit=5',
    'space-defense': '/api/news?category=defense&limit=5',
    'business-opportunities': '/api/opportunities?limit=5',
    'regulatory-hub': '/api/compliance?limit=5',
  };

  const endpoint = apiMap[moduleId];

  // For modules with API endpoints, attempt to fetch real data
  if (endpoint) {
    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        const rawItems = json.data?.articles || json.data?.items || json.data?.events || json.articles || json.items || json.events || json.data || [];
        const items: ContentItem[] = (Array.isArray(rawItems) ? rawItems : []).slice(0, 5).map((item: Record<string, unknown>, index: number) => ({
          id: (item.id as string) || String(index),
          title: (item.title as string) || (item.name as string) || 'Untitled',
          subtitle: (item.source as string) || (item.category as string) || (item.company as string) || undefined,
          date: item.publishedAt
            ? new Date(item.publishedAt as string).toLocaleDateString()
            : item.date
            ? new Date(item.date as string).toLocaleDateString()
            : undefined,
          url: (item.url as string) || undefined,
        }));

        const total = json.total || json.data?.total || items.length;

        return {
          items,
          stats: widgetType === 'stats' || widgetType === 'compact' || widgetType === 'full'
            ? [
                { label: 'Total', value: String(total) },
                { label: 'Recent', value: String(items.length) },
              ]
            : [],
        };
      }
    } catch {
      // Fall through to placeholder data
    }
  }

  // Return placeholder data for modules without direct API endpoints
  return getPlaceholderData(moduleId, widgetType);
}

/**
 * Placeholder data for modules that do not have a direct feed API
 */
function getPlaceholderData(
  moduleId: string,
  widgetType: string
): {
  items: ContentItem[];
  stats: { label: string; value: string; trend?: string }[];
} {
  const moduleStatsMap: Record<string, { label: string; value: string; trend?: string }[]> = {
    'satellite-tracker': [
      { label: 'Active Satellites', value: '9,800+' },
      { label: 'Tracked Objects', value: '30,000+' },
      { label: 'Constellations', value: '15' },
      { label: 'Debris Alerts', value: '3' },
    ],
    'space-environment': [
      { label: 'Solar Activity', value: 'Moderate' },
      { label: 'Kp Index', value: '3' },
      { label: 'Debris Events', value: '12' },
      { label: 'Conjunctions', value: '8', trend: '+2' },
    ],
    'space-economy': [
      { label: 'Market Cap', value: '$546B', trend: '+4.2%' },
      { label: 'Launches YTD', value: '28' },
      { label: 'Funding', value: '$2.1B', trend: '+12%' },
      { label: 'IPOs', value: '3' },
    ],
    'constellation-tracker': [
      { label: 'Starlink', value: '6,200+' },
      { label: 'OneWeb', value: '634' },
      { label: 'Kuiper', value: '2' },
      { label: 'Total', value: '7,000+' },
    ],
    'mission-control': [
      { label: 'Upcoming', value: '12' },
      { label: 'This Week', value: '3' },
      { label: 'Completed', value: '156' },
      { label: 'Success Rate', value: '97%' },
    ],
    'market-intel': [
      { label: 'Companies', value: '250+' },
      { label: 'Public', value: '45' },
      { label: 'Avg Growth', value: '+8.3%', trend: '+8.3%' },
      { label: 'Sectors', value: '12' },
    ],
  };

  const moduleItemsMap: Record<string, ContentItem[]> = {
    'news-feed': [
      { id: '1', title: 'SpaceX launches 23 Starlink satellites', subtitle: 'SpaceNews', date: 'Today' },
      { id: '2', title: 'NASA Artemis III crew selection update', subtitle: 'NASA', date: 'Today' },
      { id: '3', title: 'Blue Origin New Glenn maiden flight preparations', subtitle: 'Blue Origin', date: 'Yesterday' },
    ],
    'mission-control': [
      { id: '1', title: 'Falcon 9 Starlink Group 12-4', subtitle: 'SpaceX', date: 'Feb 10' },
      { id: '2', title: 'Ariane 6 Flight VA263', subtitle: 'Arianespace', date: 'Feb 12' },
      { id: '3', title: 'PSLV-C60 SPADEX', subtitle: 'ISRO', date: 'Feb 15' },
    ],
    'startup-tracker': [
      { id: '1', title: 'Axiom Space raises $350M Series D', subtitle: 'Space Stations', date: 'Today' },
      { id: '2', title: 'Impulse Space secures $100M for Mars cargo', subtitle: 'In-space Transport', date: 'Yesterday' },
      { id: '3', title: 'K2 Space closes $50M for megasatellites', subtitle: 'Satellites', date: '2 days ago' },
    ],
  };

  const stats = moduleStatsMap[moduleId] || [
    { label: 'Items', value: '--' },
    { label: 'Updated', value: 'Recently' },
  ];

  const items = moduleItemsMap[moduleId] || [];

  // Return appropriate data based on widget type
  if (widgetType === 'stats') {
    return { items: [], stats };
  }
  if (widgetType === 'feed') {
    return { items, stats: [] };
  }
  return { items, stats };
}

function WidgetSkeleton({ type }: { type: string }) {
  if (type === 'stats') {
    return (
      <div className="grid grid-cols-2 gap-3 p-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-50 rounded-lg p-3">
            <Skeleton className="h-3 w-16 mx-auto mb-2" />
            <Skeleton className="h-5 w-10 mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'feed') {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-2.5 rounded-lg bg-slate-50">
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-1">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}
