'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ORBITAL_SERVICE_CATEGORIES, ORBITAL_SERVICE_TYPES, type OrbitalServiceCategory } from '@/types';

interface OrbitalService {
  id: string;
  providerName: string;
  serviceName: string;
  category: string;
  serviceType: string;
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

  const getServiceTypeInfo = (serviceType: string) => {
    return ORBITAL_SERVICE_TYPES.find(t => t.value === serviceType) || {
      value: serviceType,
      label: serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: '📦',
      category: 'earth_observation' as OrbitalServiceCategory,
    };
  };

  // Group services by service type
  const groupServicesByType = (services: OrbitalService[]) => {
    const grouped: Record<string, OrbitalService[]> = {};

    services.forEach(service => {
      const typeKey = service.serviceType;
      if (!grouped[typeKey]) {
        grouped[typeKey] = [];
      }
      grouped[typeKey].push(service);
    });

    // Sort groups by category order
    const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
      const typeA = getServiceTypeInfo(keyA);
      const typeB = getServiceTypeInfo(keyB);
      const catOrderA = ORBITAL_SERVICE_CATEGORIES.findIndex(c => c.value === typeA.category);
      const catOrderB = ORBITAL_SERVICE_CATEGORIES.findIndex(c => c.value === typeB.category);
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;
      return typeA.label.localeCompare(typeB.label);
    });

    return sortedGroups;
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
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
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
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">🌐</span>
            Orbital Services Marketplace
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-slate-500">{error || 'No data available'}</p>
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
          <div className="text-3xl font-bold text-slate-800">
            {data.stats.totalServices}
          </div>
          <div className="text-slate-500 text-sm">Services Listed</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-nebula-300">
            {Object.keys(data.stats.byCategory).length}
          </div>
          <div className="text-slate-500 text-sm">Categories</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">
            {data.stats.totalContracts}
          </div>
          <div className="text-slate-500 text-sm">Known Contracts</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">
            ${(data.stats.totalContractValue / 1000).toFixed(1)}B
          </div>
          <div className="text-slate-500 text-sm">Contract Value</div>
        </div>
      </div>

      {/* Services by Type */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span>📦</span> Services by Type
        </h3>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {groupServicesByType(data.services).slice(0, 6).map(([serviceType, typeServices]) => {
            const typeInfo = getServiceTypeInfo(serviceType);
            return (
              <div key={serviceType} className="pb-3 border-b border-slate-200 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{typeInfo.icon}</span>
                  <span className="text-slate-800 font-medium text-sm">{typeInfo.label}</span>
                  <span className="ml-auto text-slate-400 text-xs">{typeServices.length} service{typeServices.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {typeServices.slice(0, 2).map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="min-w-0">
                        <div className="text-slate-800 text-sm truncate">{service.serviceName}</div>
                        <div className="text-slate-500 text-xs">{service.providerName}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-green-400 text-sm font-medium whitespace-nowrap">
                          {formatPrice(service.priceMin, service.priceMax, service.priceUnit)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {typeServices.length > 2 && (
                    <Link
                      href={`/orbital-services?category=${typeInfo.category}`}
                      className="text-nebula-400 text-xs hover:text-nebula-300"
                    >
                      +{typeServices.length - 2} more services →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Categories Grid */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span>📊</span> Browse by Category
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ORBITAL_SERVICE_CATEGORIES.map((category) => {
            const count = data.stats.byCategory[category.value] || 0;
            return (
              <Link
                key={category.value}
                href={`/orbital-services?category=${category.value}`}
                className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-center"
              >
                <span className="text-2xl block mb-1">{category.icon}</span>
                <span className="text-slate-800 font-medium text-sm block">{category.label}</span>
                <span className="text-nebula-300 text-xs">{count} services</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Contracts */}
      {data.contracts.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>📝</span> Recent Contracts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase border-b border-slate-200">
                  <th className="text-left py-2 px-2">Contract</th>
                  <th className="text-left py-2 px-2">Customer</th>
                  <th className="text-left py-2 px-2">Provider</th>
                  <th className="text-right py-2 px-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.contracts.slice(0, 5).map((contract) => (
                  <tr key={contract.id} className="border-b border-slate-200 hover:bg-slate-100">
                    <td className="py-2 px-2 text-slate-800">{contract.title}</td>
                    <td className="py-2 px-2 text-slate-500">{contract.customerName}</td>
                    <td className="py-2 px-2 text-slate-500">{contract.providerName}</td>
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
