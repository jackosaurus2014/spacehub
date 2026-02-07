'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SpaceResource,
  LaunchProvider,
  RESOURCE_CATEGORIES,
  AVAILABILITY_INFO,
  ResourceAvailability,
  KG_TO_LB,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Default benchmark: Falcon 9 cost to LEO
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

function ResourceCard({
  resource,
  launchCost,
}: {
  resource: SpaceResource;
  launchCost: number;
}) {
  const categoryInfo = RESOURCE_CATEGORIES.find((c) => c.value === resource.category);
  const availabilityInfo = AVAILABILITY_INFO[resource.availability as ResourceAvailability];

  const earthPriceKg = resource.earthPricePerKg;
  const earthPriceLb = earthPriceKg / KG_TO_LB;
  const spacePriceKg = earthPriceKg + launchCost;
  const spacePriceLb = spacePriceKg / KG_TO_LB;
  const launchMultiplier = spacePriceKg / earthPriceKg;

  return (
    <div className="card p-4 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryInfo?.icon || '📦'}</span>
          <h3 className="font-semibold text-slate-800 text-sm">{resource.name}</h3>
        </div>
        <span
          className={`text-xs ${availabilityInfo?.color || 'bg-gray-500'} text-white px-2 py-0.5 rounded`}
        >
          {availabilityInfo?.label || resource.availability}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs text-slate-400 mb-1">Earth Price</div>
          <div className="text-green-400 font-semibold text-sm">
            {formatPrice(earthPriceKg)}/kg
          </div>
          <div className="text-slate-400 text-xs">{formatPrice(earthPriceLb)}/lb</div>
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-xs text-slate-400 mb-1">Space Price (LEO)</div>
          <div className="text-rocket-400 font-semibold text-sm">
            {formatPrice(spacePriceKg)}/kg
          </div>
          <div className="text-slate-400 text-xs">{formatPrice(spacePriceLb)}/lb</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="text-slate-400">{categoryInfo?.label}</span>
        <span className="text-nebula-300">
          {launchMultiplier >= 1000
            ? `${(launchMultiplier / 1000).toFixed(1)}K×`
            : `${launchMultiplier.toFixed(1)}×`}{' '}
          markup
        </span>
      </div>
    </div>
  );
}

export default function ResourceExchangeModule() {
  const [resources, setResources] = useState<SpaceResource[]>([]);
  const [providers, setProviders] = useState<LaunchProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('spacex-falcon9');
  const [launchCost, setLaunchCost] = useState(DEFAULT_LAUNCH_COST);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resourcesRes, providersRes] = await Promise.all([
        fetch('/api/resources?limit=8'),
        fetch('/api/resources/launch-providers?status=operational'),
      ]);

      const resourcesData = await resourcesRes.json();
      const providersData = await providersRes.json();

      if (resourcesData.resources) {
        setResources(resourcesData.resources);
      }
      if (providersData.providers) {
        setProviders(providersData.providers);
        // Set default launch cost from Falcon 9
        const falcon9 = providersData.providers.find(
          (p: LaunchProvider) => p.slug === 'spacex-falcon9'
        );
        if (falcon9) {
          setLaunchCost(falcon9.costPerKgToLEO);
        }
      }
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleProviderChange = (slug: string) => {
    setSelectedProvider(slug);
    const provider = providers.find((p) => p.slug === slug);
    if (provider) {
      setLaunchCost(provider.costPerKgToLEO);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="card p-8 text-center">
        <span className="text-5xl block mb-4">💰</span>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Resource Exchange</h3>
        <p className="text-slate-400 mb-4">
          Track space commodity prices and calculate launch costs.
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
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Resource Exchange</h2>
            <p className="text-slate-400 text-sm">Earth vs space commodity pricing</p>
          </div>
        </div>
        <Link href="/resource-exchange" className="btn-secondary text-sm py-1.5 px-4">
          View All →
        </Link>
      </div>

      {/* Launch Cost Selector */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Launch Provider:</span>
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-nebula-500"
            >
              {providers.map((provider) => (
                <option key={provider.slug} value={provider.slug}>
                  {provider.name} {provider.vehicle}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Cost to LEO:</span>
            <span className="text-rocket-400 font-semibold">
              ${launchCost.toLocaleString()}/kg
            </span>
            <span className="text-slate-400 text-xs">
              (${(launchCost / KG_TO_LB).toFixed(0)}/lb)
            </span>
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            launchCost={launchCost}
          />
        ))}
      </div>
    </div>
  );
}
