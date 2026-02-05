'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ORBITAL_SERVICE_CATEGORIES } from '@/types';

interface OrbitalService {
  id: string;
  providerName: string;
  serviceName: string;
  category: string;
  priceMin: number | null;
  priceMax: number | null;
  priceUnit: string | null;
  availability: string;
  description: string;
}

interface OrbitalContract {
  id: string;
  title: string;
  customerName: string;
  providerName: string;
  contractValue: number | null;
  serviceCategory: string;
}

interface OrbitalServicesData {
  services: OrbitalService[];
  stats: {
    totalServices: number;
    totalContracts: number;
    totalContractValue: number;
    byCategory: Record<string, number>;
  };
  contracts: OrbitalContract[];
}

export default function OrbitalServicesModule() {
  const [data, setData] = useState<OrbitalServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetch('/api/orbital-services/init', { method: 'POST' });
        const [servicesRes, contractsRes] = await Promise.all([
          fetch('/api/orbital-services'),
          fetch('/api/orbital-services/contracts'),
        ]);

        const servicesData = await servicesRes.json();
        const contractsData = await contractsRes.json();

        if (servicesData.error) {
          throw new Error(servicesData.error);
        }

        const stats = servicesData.stats || {};
        setData({
          services: servicesData.services || [],
          stats: {
            totalServices: stats.totalServices || 0,
            totalContracts: stats.totalContracts || 0,
            totalContractValue: stats.totalContractValue || 0,
            byCategory: stats.servicesByCategory || {},
          },
          contracts: contractsData.contracts || [],
        });
      } catch (err) {
        console.error('Failed to fetch orbital services:', err);
        setError('Failed to load orbital services');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getCategoryInfo = (category: string) => {
    return ORBITAL_SERVICE_CATEGORIES.find(c => c.value === category);
  };

  const formatPrice = (min: number | null, max: number | null, unit: string | null) => {
    if (!min && !max) return 'Contact';
    if (min && max && min !== max) {
      return `$${min.toLocaleString()}-${max.toLocaleString()}${unit ? `/${unit}` : ''}`;
    }
    return `$${(min || max)?.toLocaleString()}${unit ? `/${unit}` : ''}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white flex items-center">
            <span className="text-3xl mr-3">🌐</span>
            Orbital Services Marketplace
          </h2>
        </div>
        <div className="card p-8 text-center">
          <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white flex items-center">
            <span className="text-3xl mr-3">🌐</span>
            Orbital Services Marketplace
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-star-300">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-white flex items-center">
          <span className="text-3xl mr-3">🌐</span>
          Orbital Services Marketplace
        </h2>
        <Link
          href="/orbital-services"
          className="text-nebula-300 hover:text-nebula-200 transition-colors text-sm"
        >
          Browse All →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-white">
            {data.stats.totalServices}
          </div>
          <div className="text-star-400 text-sm">Services Listed</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-nebula-300">
            {Object.keys(data.stats.byCategory).length}
          </div>
          <div className="text-star-400 text-sm">Categories</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">
            {data.stats.totalContracts}
          </div>
          <div className="text-star-400 text-sm">Known Contracts</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">
            ${(data.stats.totalContractValue / 1000).toFixed(1)}B
          </div>
          <div className="text-star-400 text-sm">Contract Value</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Categories */}
        <div className="lg:col-span-2 card p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📊</span> Service Categories
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {ORBITAL_SERVICE_CATEGORIES.map((category) => {
              const count = data.stats.byCategory[category.value] || 0;
              return (
                <Link
                  key={category.value}
                  href={`/orbital-services?category=${category.value}`}
                  className="p-3 bg-space-700/30 rounded-lg hover:bg-space-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{category.icon}</span>
                    <span className="text-white font-medium text-sm">{category.label}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-star-400 text-xs">{category.description}</span>
                    <span className="text-nebula-300 text-xs font-medium">{count} services</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Featured Services */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>⭐</span> Featured Services
          </h3>
          <div className="space-y-3">
            {data.services.slice(0, 4).map((service) => {
              const categoryInfo = getCategoryInfo(service.category);
              return (
                <div key={service.id} className="p-3 bg-space-700/30 rounded-lg">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{categoryInfo?.icon || '🌐'}</span>
                      <span className="text-white text-sm font-medium">{service.serviceName}</span>
                    </div>
                  </div>
                  <div className="text-star-400 text-xs mb-2">{service.providerName}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-nebula-300 text-sm font-medium">
                      {formatPrice(service.priceMin, service.priceMax, service.priceUnit)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      service.availability === 'available'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {service.availability === 'available' ? 'Available' : 'Limited'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Contracts */}
      {data.contracts.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📝</span> Recent Contracts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-star-400 text-xs uppercase border-b border-space-600">
                  <th className="text-left py-2 px-2">Contract</th>
                  <th className="text-left py-2 px-2">Customer</th>
                  <th className="text-left py-2 px-2">Provider</th>
                  <th className="text-right py-2 px-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.contracts.slice(0, 5).map((contract) => (
                  <tr key={contract.id} className="border-b border-space-700/50 hover:bg-space-700/20">
                    <td className="py-2 px-2 text-white">{contract.title}</td>
                    <td className="py-2 px-2 text-star-300">{contract.customerName}</td>
                    <td className="py-2 px-2 text-star-300">{contract.providerName}</td>
                    <td className="py-2 px-2 text-right text-green-400 font-medium">
                      {contract.contractValue
                        ? `$${contract.contractValue >= 1000
                            ? `${(contract.contractValue / 1000).toFixed(1)}B`
                            : `${contract.contractValue}M`}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
