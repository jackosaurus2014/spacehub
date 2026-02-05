'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ORBITAL_SERVICE_CATEGORIES,
  ORBITAL_PRICING_MODELS,
  ORBITAL_SERVICE_AVAILABILITY,
  ORBITAL_CUSTOMER_TYPES,
  ORBITAL_SERVICE_TYPES,
  type OrbitalService,
  type OrbitalServiceContract,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ServiceListingDialog from '@/components/ui/ServiceListingDialog';

type TabType = 'services' | 'contracts' | 'pricing' | 'request';

interface Stats {
  totalServices: number;
  activeServices: number;
  totalContracts: number;
  totalContractValue: number;
  avgContractValue: number;
  servicesByCategory: Record<string, number>;
  uniqueProviders: number;
}

export default function OrbitalServicesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('services');
  const [services, setServices] = useState<OrbitalService[]>([]);
  const [contracts, setContracts] = useState<OrbitalServiceContract[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [pricingModelFilter, setPricingModelFilter] = useState<string>('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('');

  // Request form state
  const [requestForm, setRequestForm] = useState({
    email: '',
    companyName: '',
    category: '',
    serviceType: '',
    description: '',
    budget: '',
    timeline: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showListingDialog, setShowListingDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [categoryFilter, pricingModelFilter]);

  useEffect(() => {
    if (activeTab === 'contracts') {
      fetchContracts();
    }
  }, [activeTab, customerTypeFilter]);

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (pricingModelFilter) params.append('pricingModel', pricingModelFilter);

      const res = await fetch(`/api/orbital-services?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setServices(data.services || []);
      setStats(data.stats || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }

  async function fetchContracts() {
    try {
      const params = new URLSearchParams();
      if (customerTypeFilter) params.append('customerType', customerTypeFilter);

      const res = await fetch(`/api/orbital-services/contracts?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setContracts(data.contracts || []);
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
    }
  }

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/orbital-services/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setSubmitted(true);
      setRequestForm({
        email: '',
        companyName: '',
        category: '',
        serviceType: '',
        description: '',
        budget: '',
        timeline: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  function getCategoryInfo(category: string) {
    return ORBITAL_SERVICE_CATEGORIES.find(c => c.value === category) || {
      icon: '?',
      label: category,
      description: '',
    };
  }

  function getAvailabilityInfo(availability: string) {
    return ORBITAL_SERVICE_AVAILABILITY.find(a => a.value === availability) || {
      label: availability,
      color: 'bg-gray-500',
    };
  }

  function getServiceTypeInfo(serviceType: string) {
    return ORBITAL_SERVICE_TYPES.find(t => t.value === serviceType) || {
      value: serviceType,
      label: serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: '📦',
      category: 'earth_observation' as const,
    };
  }

  // Group services by service type
  function groupServicesByType(services: OrbitalService[]) {
    const grouped: Record<string, OrbitalService[]> = {};

    services.forEach(service => {
      const typeKey = service.serviceType;
      if (!grouped[typeKey]) {
        grouped[typeKey] = [];
      }
      grouped[typeKey].push(service);
    });

    // Sort groups by category order, then alphabetically within
    const sortedGroups = Object.entries(grouped).sort(([keyA], [keyB]) => {
      const typeA = getServiceTypeInfo(keyA);
      const typeB = getServiceTypeInfo(keyB);
      const catOrderA = ORBITAL_SERVICE_CATEGORIES.findIndex(c => c.value === typeA.category);
      const catOrderB = ORBITAL_SERVICE_CATEGORIES.findIndex(c => c.value === typeB.category);
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;
      return typeA.label.localeCompare(typeB.label);
    });

    return sortedGroups;
  }

  function formatPrice(service: OrbitalService): string {
    if (service.pricingModel === 'custom') return 'Contact for Quote';
    if (!service.priceMin && !service.priceMax) return 'Contact for Quote';

    const unit = service.priceUnit || '';
    if (service.priceMin && service.priceMax && service.priceMin !== service.priceMax) {
      return `$${service.priceMin.toLocaleString()}-${service.priceMax.toLocaleString()} ${unit}`;
    }
    if (service.priceMin) {
      return `$${service.priceMin.toLocaleString()} ${unit}`;
    }
    if (service.priceMax) {
      return `$${service.priceMax.toLocaleString()} ${unit}`;
    }
    return 'Contact for Quote';
  }

  function formatContractValue(value: number | null): string {
    if (!value) return 'Undisclosed';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
    return `$${value.toFixed(0)}M`;
  }

  return (
    <div className="min-h-screen bg-white/90">
      {/* Header */}
      <header className="border-b border-slate-200 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-slate-500 hover:text-slate-500 text-sm mb-2 inline-block">
                &larr; Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <span className="text-4xl">🌐</span>
                Orbital Services Marketplace
              </h1>
              <p className="text-slate-500 mt-2">
                Discover and compare satellite-based services: imaging, compute, power, and more
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Provider CTA */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-gradient-to-r from-nebula-600/20 to-rocket-600/20 border border-nebula-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <p className="text-slate-600">
              <span className="font-medium text-slate-900">Have services to offer?</span>{' '}
              Get your orbital services listed in our marketplace.
            </p>
          </div>
          <button
            onClick={() => setShowListingDialog(true)}
            className="btn-primary whitespace-nowrap"
          >
            List Your Service
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-slate-900">{stats.totalServices}</div>
              <div className="text-slate-500 text-sm">Total Services</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-slate-900">{stats.uniqueProviders}</div>
              <div className="text-slate-500 text-sm">Providers</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-400">
                ${(stats.totalContractValue / 1000).toFixed(1)}B
              </div>
              <div className="text-slate-500 text-sm">Known Contract Value</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-slate-900">{stats.totalContracts}</div>
              <div className="text-slate-500 text-sm">Active Contracts</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="border-b border-slate-200">
          <nav className="flex gap-1">
            {[
              { id: 'services', label: 'Services', icon: '📦' },
              { id: 'contracts', label: 'Contracts', icon: '📄' },
              { id: 'pricing', label: 'Pricing Guide', icon: '💰' },
              { id: 'request', label: 'Request Service', icon: '✉️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-50 text-slate-900 border-t border-l border-r border-slate-200'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && activeTab === 'services' ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300">
            {error}
          </div>
        ) : (
          <>
            {/* Services Tab */}
            {activeTab === 'services' && (
              <div>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="">All Categories</option>
                    {ORBITAL_SERVICE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={pricingModelFilter}
                    onChange={(e) => setPricingModelFilter(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="">All Pricing Models</option>
                    {ORBITAL_PRICING_MODELS.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Services Grouped by Type */}
                <div className="space-y-8">
                  {groupServicesByType(services).map(([serviceType, typeServices]) => {
                    const typeInfo = getServiceTypeInfo(serviceType);
                    const catInfo = getCategoryInfo(typeInfo.category);

                    return (
                      <div key={serviceType}>
                        {/* Service Type Header */}
                        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-200">
                          <span className="text-2xl">{typeInfo.icon}</span>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{typeInfo.label}</h3>
                            <span className="text-xs text-slate-400">{catInfo.label}</span>
                          </div>
                          <span className="ml-auto bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full">
                            {typeServices.length} service{typeServices.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Services Grid for this Type */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {typeServices.map((service) => {
                            const availInfo = getAvailabilityInfo(service.availability);

                            return (
                              <div
                                key={service.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors"
                              >
                                {/* Header */}
                                <div className="p-4 border-b border-slate-200">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="text-lg font-semibold text-slate-900">
                                        {service.serviceName}
                                      </h4>
                                      <p className="text-slate-500 text-sm">{service.providerName}</p>
                                    </div>
                                    <span className={`${availInfo.color} text-slate-900 text-xs px-2 py-1 rounded-full`}>
                                      {availInfo.label}
                                    </span>
                                  </div>
                                </div>

                                {/* Body */}
                                <div className="p-4">
                                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                                    {service.description}
                                  </p>

                                  {/* Specs */}
                                  {(service.orbitType || service.coverage) && (
                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                                      {service.orbitType && (
                                        <span>Orbit: {service.orbitType}</span>
                                      )}
                                      {service.coverage && (
                                        <span>Coverage: {service.coverage}</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Pricing */}
                                  <div className="bg-slate-100 rounded-lg p-3">
                                    <div className="text-xl font-bold text-green-400">
                                      {formatPrice(service)}
                                    </div>
                                    {service.pricingNotes && (
                                      <p className="text-slate-500 text-xs mt-1">
                                        {service.pricingNotes}
                                      </p>
                                    )}
                                  </div>

                                  {/* Provider link */}
                                  {service.providerWebsite && (
                                    <a
                                      href={service.providerWebsite}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-3 text-nebula-400 hover:text-nebula-300 text-sm inline-flex items-center gap-1"
                                    >
                                      Visit Provider
                                      <span>&rarr;</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {services.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    No services found matching your filters.
                  </div>
                )}
              </div>
            )}

            {/* Contracts Tab */}
            {activeTab === 'contracts' && (
              <div>
                {/* Filter */}
                <div className="mb-6">
                  <select
                    value={customerTypeFilter}
                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="">All Customer Types</option>
                    {ORBITAL_CUSTOMER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contracts Table */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Contract</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Customer</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Provider</th>
                          <th className="text-right px-4 py-3 text-slate-500 text-sm font-medium">Value</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Category</th>
                          <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {contracts.map((contract) => (
                          <tr key={contract.id} className="hover:bg-slate-100/30">
                            <td className="px-4 py-3">
                              <div className="text-slate-900 font-medium">{contract.title}</div>
                              <div className="text-slate-500 text-xs mt-1 line-clamp-1">
                                {contract.description}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-600">{contract.customerName}</span>
                              <div className="text-slate-500 text-xs capitalize">
                                {contract.customerType}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{contract.providerName}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-green-400 font-semibold">
                                {formatContractValue(contract.contractValue)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-slate-500 text-sm capitalize">
                                {contract.serviceCategory.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                contract.status === 'active'
                                  ? 'bg-green-500/20 text-green-400'
                                  : contract.status === 'completed'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {contract.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {contracts.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    Loading contracts...
                  </div>
                )}
              </div>
            )}

            {/* Pricing Guide Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-8">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Pricing Benchmarks by Category</h2>
                  <p className="text-slate-500 mb-6">
                    Market rates based on published pricing, industry reports, and known contracts.
                  </p>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Earth Observation */}
                    <div className="bg-slate-100 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>🛰️</span> Earth Observation
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Optical (30cm)</span>
                          <span className="text-green-400">$25-29/km²</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Optical (70cm-1m)</span>
                          <span className="text-green-400">$6-12/km²</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">SAR Imagery</span>
                          <span className="text-green-400">$10-25/km²</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Archive Imagery</span>
                          <span className="text-green-400">$3.80-14/km²</span>
                        </div>
                      </div>
                    </div>

                    {/* In-Orbit Computing */}
                    <div className="bg-slate-100 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>🖥️</span> In-Orbit Computing
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">GPU Compute</span>
                          <span className="text-green-400">$3-6/GPU-hour</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Edge Compute</span>
                          <span className="text-green-400">$0.50-2/hour</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Energy Advantage</span>
                          <span className="text-blue-400">~10x vs ground</span>
                        </div>
                      </div>
                    </div>

                    {/* Hosted Payloads */}
                    <div className="bg-slate-100 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>📦</span> Hosted Payloads
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Annual Hosting</span>
                          <span className="text-green-400">$500K-$15M/year</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Per kg Rate</span>
                          <span className="text-green-400">$25K-75K/kg/year</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Rideshare to LEO</span>
                          <span className="text-green-400">$5,500/kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Communications */}
                    <div className="bg-slate-100 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>📡</span> Communications
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ground Station</span>
                          <span className="text-green-400">$3-15/minute</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Data Relay</span>
                          <span className="text-green-400">$10K-100K/month</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">IoT/M2M</span>
                          <span className="text-green-400">$10-500/device/mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Space Solar */}
                    <div className="bg-slate-100 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>☀️</span> Space Solar Power
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Target LCOE</span>
                          <span className="text-green-400">$25-50/MWh</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Demo Phase</span>
                          <span className="text-yellow-400">2026-2027</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Commercial</span>
                          <span className="text-blue-400">2028+</span>
                        </div>
                      </div>
                    </div>

                    {/* Sensor Services */}
                    <div className="bg-slate-100 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2 mb-3">
                        <span>📊</span> Sensor-as-a-Service
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Weather Data</span>
                          <span className="text-green-400">$5K-50K/month</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">RF Monitoring</span>
                          <span className="text-green-400">$10K-100K/month</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">AIS Tracking</span>
                          <span className="text-green-400">$1K-25K/month</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Factors */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Cost Factors</h2>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">🚀</div>
                      <div className="text-xl font-bold text-slate-900">$5,500/kg</div>
                      <div className="text-slate-500 text-sm">Rideshare to LEO</div>
                    </div>
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">⛽</div>
                      <div className="text-xl font-bold text-slate-900">$1M-$10M</div>
                      <div className="text-slate-500 text-sm">Annual Ops (per satellite)</div>
                    </div>
                    <div className="text-center p-4">
                      <div className="text-3xl mb-2">📉</div>
                      <div className="text-xl font-bold text-slate-900">30-60%</div>
                      <div className="text-slate-500 text-sm">Typical Gross Margin</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Request Tab */}
            {activeTab === 'request' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">Request Orbital Services</h2>
                  <p className="text-slate-500 mb-6">
                    Tell us about your requirements and we&apos;ll help match you with the right providers.
                  </p>

                  {submitted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Request Submitted!</h3>
                      <p className="text-slate-500 mb-6">
                        We&apos;ll review your requirements and get back to you soon.
                      </p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="btn-secondary"
                      >
                        Submit Another Request
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRequestSubmit} className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-slate-600 text-sm font-medium mb-2">
                            Your Email
                          </label>
                          <input
                            type="email"
                            value={requestForm.email}
                            onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                            className="input"
                            placeholder="you@company.com"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 text-sm font-medium mb-2">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={requestForm.companyName}
                            onChange={(e) => setRequestForm({ ...requestForm, companyName: e.target.value })}
                            className="input"
                            placeholder="Your company"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-600 text-sm font-medium mb-2">
                          Service Category <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={requestForm.category}
                          onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}
                          required
                          className="input"
                        >
                          <option value="">Select a category...</option>
                          {ORBITAL_SERVICE_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.icon} {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 text-sm font-medium mb-2">
                          Description of Requirements <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={requestForm.description}
                          onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                          required
                          rows={4}
                          className="input resize-none"
                          placeholder="Describe your requirements, use case, and any specific needs..."
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-slate-600 text-sm font-medium mb-2">
                            Budget Range
                          </label>
                          <input
                            type="text"
                            value={requestForm.budget}
                            onChange={(e) => setRequestForm({ ...requestForm, budget: e.target.value })}
                            className="input"
                            placeholder="e.g., $10K-50K/month"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 text-sm font-medium mb-2">
                            Timeline
                          </label>
                          <input
                            type="text"
                            value={requestForm.timeline}
                            onChange={(e) => setRequestForm({ ...requestForm, timeline: e.target.value })}
                            className="input"
                            placeholder="e.g., Q2 2026"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !requestForm.category || !requestForm.description}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Related Modules */}
      <div className="max-w-7xl mx-auto px-4 py-8 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Related Modules</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Link
            href="/market-intel"
            className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
          >
            <span className="text-2xl">📊</span>
            <h4 className="text-slate-900 font-medium mt-2">Market Intel</h4>
            <p className="text-slate-500 text-sm">Space company data</p>
          </Link>
          <Link
            href="/spectrum-tracker"
            className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
          >
            <span className="text-2xl">📡</span>
            <h4 className="text-slate-900 font-medium mt-2">Spectrum Tracker</h4>
            <p className="text-slate-500 text-sm">Frequency allocations</p>
          </Link>
          <Link
            href="/space-insurance"
            className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
          >
            <span className="text-2xl">🛡️</span>
            <h4 className="text-slate-900 font-medium mt-2">Space Insurance</h4>
            <p className="text-slate-500 text-sm">Coverage & risk</p>
          </Link>
          <Link
            href="/resource-exchange"
            className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
          >
            <span className="text-2xl">💰</span>
            <h4 className="text-slate-900 font-medium mt-2">Resource Exchange</h4>
            <p className="text-slate-500 text-sm">Space commodities</p>
          </Link>
        </div>
      </div>

      {/* Service Listing Dialog */}
      <ServiceListingDialog
        isOpen={showListingDialog}
        onClose={() => setShowListingDialog(false)}
      />
    </div>
  );
}
