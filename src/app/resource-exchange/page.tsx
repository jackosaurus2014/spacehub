'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SpaceResource,
  LaunchProvider,
  RESOURCE_CATEGORIES,
  AVAILABILITY_INFO,
  ResourceCategory,
  ResourceAvailability,
  KG_TO_LB,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';

const DEFAULT_LAUNCH_COST = 2720;

function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(2)}M`;
  }
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(2)}K`;
  }
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toFixed(4)}`;
}

function ResourceRow({
  resource,
  launchCost,
  destination,
}: {
  resource: SpaceResource;
  launchCost: number;
  destination: string;
}) {
  const categoryInfo = RESOURCE_CATEGORIES.find((c) => c.value === resource.category);
  const availabilityInfo = AVAILABILITY_INFO[resource.availability as ResourceAvailability];

  const earthPriceKg = resource.earthPricePerKg;
  const earthPriceLb = earthPriceKg / KG_TO_LB;
  const spacePriceKg = earthPriceKg + launchCost;
  const spacePriceLb = spacePriceKg / KG_TO_LB;
  const launchMultiplier = spacePriceKg / earthPriceKg;

  return (
    <tr className="border-b border-space-700/50 hover:bg-slate-100/30 transition-colors">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">{categoryInfo?.icon || '📦'}</span>
          <div>
            <div className="font-semibold text-slate-900">{resource.name}</div>
            <div className="text-xs text-slate-400">{categoryInfo?.label}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span
          className={`text-xs ${availabilityInfo?.color || 'bg-gray-500'} text-slate-900 px-2 py-1 rounded`}
        >
          {availabilityInfo?.label}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="text-green-400 font-semibold">{formatPrice(earthPriceKg)}</div>
        <div className="text-slate-400 text-xs">{formatPrice(earthPriceLb)}/lb</div>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="text-rocket-400 font-semibold">{formatPrice(spacePriceKg)}</div>
        <div className="text-slate-400 text-xs">{formatPrice(spacePriceLb)}/lb</div>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="text-nebula-300 font-medium">
          {launchMultiplier >= 10000
            ? `${(launchMultiplier / 1000).toFixed(0)}K×`
            : launchMultiplier >= 1000
            ? `${(launchMultiplier / 1000).toFixed(1)}K×`
            : `${launchMultiplier.toFixed(1)}×`}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex flex-wrap gap-1 max-w-xs">
          {(resource.applications as string[]).slice(0, 2).map((app) => (
            <span
              key={app}
              className="text-xs bg-slate-100/50 text-slate-600 px-2 py-0.5 rounded"
            >
              {app.replace(/_/g, ' ')}
            </span>
          ))}
          {(resource.applications as string[]).length > 2 && (
            <span className="text-xs text-slate-400">
              +{(resource.applications as string[]).length - 2}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function LaunchProviderCard({
  provider,
  isSelected,
  onSelect,
}: {
  provider: LaunchProvider;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`card p-4 text-left transition-all ${
        isSelected
          ? 'border-nebula-500 bg-nebula-500/10'
          : 'hover:border-space-500'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-slate-900 text-sm">{provider.vehicle}</div>
        {provider.reusable && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
            Reusable
          </span>
        )}
      </div>
      <div className="text-slate-400 text-xs mb-2">{provider.name}</div>
      <div className="text-rocket-400 font-bold">
        ${provider.costPerKgToLEO.toLocaleString()}/kg
      </div>
      <div className="text-slate-400 text-xs mb-2">
        to LEO • {provider.payloadToLEO?.toLocaleString() || 'N/A'} kg capacity
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={`/market-intel?search=${encodeURIComponent(provider.name)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-nebula-300 hover:text-nebula-200 bg-nebula-500/10 px-1.5 py-0.5 rounded transition-colors"
        >
          Company info
        </Link>
        <Link
          href="/space-insurance"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 px-1.5 py-0.5 rounded transition-colors"
        >
          Insure your launch
        </Link>
      </div>
    </button>
  );
}

function ResourceExchangeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [resources, setResources] = useState<SpaceResource[]>([]);
  const [providers, setProviders] = useState<LaunchProvider[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    byCategory: Record<string, number>;
    launchCosts: { min: number; max: number; avg: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    searchParams.get('provider') || 'spacex-falcon9'
  );
  const [launchCost, setLaunchCost] = useState(DEFAULT_LAUNCH_COST);
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | ''>(
    (searchParams.get('category') as ResourceCategory | '') || ''
  );
  const [destination, setDestination] = useState<'LEO' | 'GEO' | 'Moon' | 'Mars'>(
    (searchParams.get('destination') as 'LEO' | 'GEO' | 'Moon' | 'Mars') || 'LEO'
  );

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedProvider && selectedProvider !== 'spacex-falcon9') params.set('provider', selectedProvider);
    if (destination && destination !== 'LEO') params.set('destination', destination);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedCategory, selectedProvider, destination, router, pathname]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);

      const [resourcesRes, providersRes, statsRes] = await Promise.all([
        fetch(`/api/resources?${params}`),
        fetch('/api/resources/launch-providers'),
        fetch('/api/resources/stats'),
      ]);

      const resourcesData = await resourcesRes.json();
      const providersData = await providersRes.json();
      const statsData = await statsRes.json();

      if (resourcesData.resources) {
        setResources(resourcesData.resources);
      }
      if (providersData.providers) {
        setProviders(providersData.providers);
        const currentProvider = providersData.providers.find(
          (p: LaunchProvider) => p.slug === selectedProvider
        );
        if (currentProvider) {
          updateLaunchCost(currentProvider, destination);
        }
      }
      if (statsData.total !== undefined) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/resources/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize resources:', error);
    } finally {
      setInitializing(false);
    }
  };

  const updateLaunchCost = (provider: LaunchProvider, dest: string) => {
    switch (dest) {
      case 'GEO':
        setLaunchCost(provider.costPerKgToGEO || provider.costPerKgToLEO * 2);
        break;
      case 'Moon':
        setLaunchCost(provider.costPerKgToMoon || provider.costPerKgToLEO * 4);
        break;
      case 'Mars':
        setLaunchCost(provider.costPerKgToMars || provider.costPerKgToLEO * 8);
        break;
      default:
        setLaunchCost(provider.costPerKgToLEO);
    }
  };

  const handleProviderChange = (slug: string) => {
    setSelectedProvider(slug);
    const provider = providers.find((p) => p.slug === slug);
    if (provider) {
      updateLaunchCost(provider, destination);
    }
  };

  const handleDestinationChange = (dest: 'LEO' | 'GEO' | 'Moon' | 'Mars') => {
    setDestination(dest);
    const provider = providers.find((p) => p.slug === selectedProvider);
    if (provider) {
      updateLaunchCost(provider, dest);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Resource Exchange"
          subtitle="Compare Earth prices vs space delivery costs for commodities and materials"
          icon="⚡"
          accentColor="cyan"
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {stats && stats.total > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card-elevated p-6 text-center">
                <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{stats.total}</div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Resources Tracked</div>
              </div>
              <div className="card-elevated p-6 text-center">
                <div className="text-4xl font-bold font-display tracking-tight text-green-400">
                  {Object.keys(stats.byCategory).length}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Categories</div>
              </div>
              <div className="card-elevated p-6 text-center">
                <div className="text-4xl font-bold font-display tracking-tight text-rocket-400">
                  ${stats.launchCosts.min?.toLocaleString()}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Min Launch $/kg</div>
              </div>
              <div className="card-elevated p-6 text-center">
                <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">
                  {providers.length}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Launch Providers</div>
              </div>
            </div>

            {/* Launch Providers */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                🚀 Select Launch Provider
              </h2>
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {providers
                  .filter((p) => p.status === 'operational')
                  .slice(0, 8)
                  .map((provider) => (
                    <StaggerItem key={provider.slug}>
                      <LaunchProviderCard
                        provider={provider}
                        isSelected={selectedProvider === provider.slug}
                        onSelect={() => handleProviderChange(provider.slug)}
                      />
                    </StaggerItem>
                  ))}
              </StaggerContainer>
            </div>

            {/* Destination & Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Destination</label>
                  <div className="flex gap-2">
                    {(['LEO', 'GEO', 'Moon', 'Mars'] as const).map((dest) => (
                      <button
                        key={dest}
                        onClick={() => handleDestinationChange(dest)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          destination === dest
                            ? 'bg-slate-100 text-slate-900 border-slate-200 shadow-glow-sm'
                            : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {dest === 'LEO' && '🌍 '}
                        {dest === 'GEO' && '🛰️ '}
                        {dest === 'Moon' && '🌙 '}
                        {dest === 'Mars' && '🔴 '}
                        {dest}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) =>
                      setSelectedCategory(e.target.value as ResourceCategory | '')
                    }
                    className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
                  >
                    <option value="">All Categories</option>
                    {RESOURCE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <ExportButton
                    data={resources}
                    filename="space-resources"
                    columns={[
                      { key: 'name', label: 'Name' },
                      { key: 'category', label: 'Category' },
                      { key: 'availability', label: 'Availability' },
                      { key: 'earthPricePerKg', label: 'Earth Price/kg' },
                      { key: 'applications', label: 'Applications' },
                    ]}
                  />
                </div>

                <div className="ml-auto text-right">
                  <div className="text-slate-400 text-sm">Current Launch Cost</div>
                  <div className="text-2xl font-bold text-rocket-400">
                    ${launchCost.toLocaleString()}/kg
                  </div>
                  <div className="text-slate-400 text-xs">
                    ${(launchCost / KG_TO_LB).toFixed(0)}/lb to {destination}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Resources Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : resources.length === 0 && !stats?.total ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">💰</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">No Resource Data</h2>
            <p className="text-slate-400 mb-6">
              Initialize the database with space commodities and launch costs.
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
                'Load Resource Data'
              )}
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                      Resource
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                      Availability
                    </th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">
                      Earth Price/kg
                    </th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">
                      {destination} Price/kg
                    </th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">
                      Markup
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">
                      Applications
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <ResourceRow
                      key={resource.id}
                      resource={resource}
                      launchCost={launchCost}
                      destination={destination}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Note */}
        <ScrollReveal><div className="card p-6 mt-8 border-dashed">
          <div className="text-center">
            <span className="text-4xl block mb-3">💡</span>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Understanding Space Pricing
            </h3>
            <p className="text-slate-400 text-sm max-w-3xl mx-auto">
              Space prices are calculated by adding the Earth market price to the launch cost
              per kilogram. The actual cost can vary based on factors like payload integration,
              insurance, and specific mission requirements. Launch costs shown are approximate
              and based on publicly available data. Bulk pricing and long-term contracts may
              offer significant discounts.
            </p>
          </div>
        </div></ScrollReveal>

        {/* Dynamic Content: Price Updates, Commentary, Related News */}
        <DynamicResourceContent />
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Dynamic Content Section
// ────────────────────────────────────────

interface PriceUpdate {
  slug: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  source: string;
  commodity: string;
}

interface DynamicNewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface ResourceCommentary {
  title: string;
  summary: string;
  content: string;
  keyTakeaways: string[];
  generatedAt: string;
}

function DynamicResourceContent() {
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([]);
  const [news, setNews] = useState<DynamicNewsArticle[]>([]);
  const [commentary, setCommentary] = useState<ResourceCommentary | null>(null);
  const [showFullCommentary, setShowFullCommentary] = useState(false);
  const [pricesFetchedAt, setPricesFetchedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDynamic() {
      try {
        const res = await fetch('/api/resources/dynamic');
        if (res.ok) {
          const data = await res.json();
          setPriceUpdates(data.priceUpdates || []);
          setPricesFetchedAt(data.pricesFetchedAt || null);
          setNews(data.relatedNews || []);
          setCommentary(data.marketCommentary || null);
        }
      } catch {
        // Supplementary content — fail silently
      }
    }
    fetchDynamic();
  }, []);

  if (!commentary && priceUpdates.length === 0 && news.length === 0) return null;

  return (
    <div className="mt-10 space-y-8">
      {/* Live Price Updates */}
      {priceUpdates.length > 0 && (
        <ScrollReveal>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <h3 className="text-lg font-display font-bold text-slate-900">Live Price Updates</h3>
              </div>
              {pricesFetchedAt && (
                <span className="text-xs text-slate-400">
                  Updated {new Date(pricesFetchedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {priceUpdates.map((update) => (
                <div key={update.slug} className="p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-900">{update.name}</span>
                    <span className={`text-xs font-bold ${update.changePercent > 0 ? 'text-green-500' : update.changePercent < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {update.changePercent > 0 ? '+' : ''}{update.changePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>${update.newPrice.toLocaleString()}/kg</span>
                    <span className="text-slate-300">was ${update.oldPrice.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">via {update.commodity} ({update.source})</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* AI Market Commentary */}
      {commentary && (
        <ScrollReveal>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="text-lg font-display font-bold text-slate-900">{commentary.title}</h3>
                <p className="text-xs text-slate-400">
                  AI-generated analysis · {new Date(commentary.generatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <p className="text-slate-600 text-sm mb-4">{commentary.summary}</p>

            {commentary.keyTakeaways.length > 0 && (
              <div className="mb-4 p-4 bg-nebula-500/5 rounded-lg border border-nebula-500/20">
                <h4 className="text-sm font-semibold text-nebula-300 mb-2">Key Takeaways</h4>
                <ul className="space-y-1">
                  {commentary.keyTakeaways.map((t, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-nebula-300 mt-0.5">•</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showFullCommentary && (
              <div className="prose prose-sm max-w-none text-slate-600 mb-4">
                <div dangerouslySetInnerHTML={{ __html: commentary.content.replace(/\n/g, '<br/>').replace(/## /g, '<strong>').replace(/\n/g, '</strong><br/>') }} />
              </div>
            )}

            <button
              onClick={() => setShowFullCommentary(!showFullCommentary)}
              className="text-sm text-nebula-300 hover:text-nebula-200 font-medium transition-colors"
            >
              {showFullCommentary ? 'Show Less' : 'Read Full Analysis →'}
            </button>
          </div>
        </ScrollReveal>
      )}

      {/* Related News */}
      {news.length > 0 && (
        <ScrollReveal>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📰</span>
                <h3 className="text-lg font-display font-bold text-slate-900">Space Resources & Mining News</h3>
              </div>
              <span className="text-xs text-slate-400">{news.length} articles</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {news.slice(0, 6).map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-slate-200 hover:border-nebula-500/30 hover:bg-nebula-500/5 transition-all group"
                >
                  <h4 className="text-sm font-medium text-slate-900 group-hover:text-nebula-300 line-clamp-2 mb-1">
                    {article.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{article.source}</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}

export default function ResourceExchangePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ResourceExchangeContent />
    </Suspense>
  );
}
