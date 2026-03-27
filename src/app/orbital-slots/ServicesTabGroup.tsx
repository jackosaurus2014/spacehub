'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  ORBITAL_SERVICE_CATEGORIES,
  ORBITAL_PRICING_MODELS,
  ORBITAL_SERVICE_AVAILABILITY,
  ORBITAL_CUSTOMER_TYPES,
  ORBITAL_SERVICE_TYPES,
  type OrbitalService,
  type OrbitalServiceContract,
} from '@/types';

// ── Helper functions ──

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
    color: 'bg-slate-500',
  };
}

function getServiceTypeInfo(serviceType: string) {
  return ORBITAL_SERVICE_TYPES.find(t => t.value === serviceType) || {
    value: serviceType,
    label: serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon: '\u{1F4E6}',
    category: 'earth_observation' as const,
  };
}

function groupServicesByType(services: OrbitalService[]) {
  const grouped: Record<string, OrbitalService[]> = {};
  services.forEach(service => {
    const typeKey = service.serviceType;
    if (!grouped[typeKey]) grouped[typeKey] = [];
    grouped[typeKey].push(service);
  });
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
  if (service.priceMin) return `$${service.priceMin.toLocaleString()} ${unit}`;
  if (service.priceMax) return `$${service.priceMax.toLocaleString()} ${unit}`;
  return 'Contact for Quote';
}

function formatContractValue(value: number | null): string {
  if (!value) return 'Undisclosed';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

// ── Props ──

interface ServicesTabGroupProps {
  activeTab: 'services' | 'contracts' | 'pricing' | 'request';
  servicesData: OrbitalService[];
  contracts: OrbitalServiceContract[];
  servicesLoading: boolean;
  servicesError: string | null;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  pricingModelFilter: string;
  setPricingModelFilter: (v: string) => void;
  customerTypeFilter: string;
  setCustomerTypeFilter: (v: string) => void;
  requestForm: {
    email: string;
    companyName: string;
    category: string;
    serviceType: string;
    description: string;
    budget: string;
    timeline: string;
  };
  setRequestForm: (v: ServicesTabGroupProps['requestForm']) => void;
  submitting: boolean;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
  handleRequestSubmit: (e: React.FormEvent) => void;
}

export default function ServicesTabGroup({
  activeTab,
  servicesData,
  contracts,
  servicesLoading,
  servicesError,
  categoryFilter,
  setCategoryFilter,
  pricingModelFilter,
  setPricingModelFilter,
  customerTypeFilter,
  setCustomerTypeFilter,
  requestForm,
  setRequestForm,
  submitting,
  submitted,
  setSubmitted,
  handleRequestSubmit,
}: ServicesTabGroupProps) {
  return (
    <>
      {/* ──────────────── SERVICES TAB ──────────────── */}
      {activeTab === 'services' && (
        <div>
          {servicesLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : servicesError ? (
            <div className="card p-4 border border-red-500/30 bg-red-900/10 text-red-400">
              {servicesError}
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
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
              </div>

              {/* Services Grouped by Type */}
              <div className="space-y-8">
                {groupServicesByType(servicesData).map(([serviceType, typeServices]) => {
                  const typeInfo = getServiceTypeInfo(serviceType);
                  const catInfo = getCategoryInfo(typeInfo.category);

                  return (
                    <div key={serviceType}>
                      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-white/[0.06]">
                        <span className="text-2xl">{typeInfo.icon}</span>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{typeInfo.label}</h3>
                          <span className="text-xs text-slate-400">{catInfo.label}</span>
                        </div>
                        <span className="ml-auto bg-white/[0.08] text-slate-500 text-xs px-2 py-1 rounded-full">
                          {typeServices.length} service{typeServices.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {typeServices.map((service) => {
                          const availInfo = getAvailabilityInfo(service.availability);
                          return (
                            <div
                              key={service.id}
                              className="card overflow-hidden hover:border-white/[0.1] transition-colors"
                            >
                              <div className="p-4 border-b border-white/[0.06]">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="text-lg font-semibold text-white">{service.serviceName}</h4>
                                    <p className="text-slate-400 text-sm">{service.providerName}</p>
                                  </div>
                                  <span className={`${availInfo.color} text-white text-xs px-2 py-1 rounded-full`}>
                                    {availInfo.label}
                                  </span>
                                </div>
                              </div>
                              <div className="p-4">
                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{service.description}</p>
                                {(service.orbitType || service.coverage) && (
                                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                                    {service.orbitType && <span>Orbit: {service.orbitType}</span>}
                                    {service.coverage && <span>Coverage: {service.coverage}</span>}
                                  </div>
                                )}
                                <div className="bg-white/[0.08] rounded-lg p-3">
                                  <div className="text-xl font-bold text-green-400">{formatPrice(service)}</div>
                                  {service.pricingNotes && (
                                    <p className="text-slate-400 text-xs mt-1">{service.pricingNotes}</p>
                                  )}
                                </div>
                                {service.providerWebsite && (
                                  <a
                                    href={service.providerWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 text-white/90 hover:text-white text-sm inline-flex items-center gap-1"
                                  >
                                    Visit Provider <span>&rarr;</span>
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

              {servicesData.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No services found matching your filters.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ──────────────── CONTRACTS TAB ──────────────── */}
      {activeTab === 'contracts' && (
        <div>
          <div className="card p-4 mb-6">
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

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.08]">
                  <tr>
                    <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Contract</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Provider</th>
                    <th className="text-right px-4 py-3 text-slate-500 text-sm font-medium">Value</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Category</th>
                    <th className="text-left px-4 py-3 text-slate-500 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-white/[0.04]">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{contract.title}</div>
                        <div className="text-slate-400 text-xs mt-1 line-clamp-1">{contract.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white/90">{contract.customerName}</span>
                        <div className="text-slate-400 text-xs capitalize">{contract.customerType}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{contract.providerName}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-400 font-semibold">{formatContractValue(contract.contractValue)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 text-sm capitalize">{contract.serviceCategory.replace('_', ' ')}</span>
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
            <div className="text-center py-12 text-slate-400">
              Loading contracts...
            </div>
          )}
        </div>
      )}

      {/* ──────────────── PRICING GUIDE TAB ──────────────── */}
      {activeTab === 'pricing' && (
        <div className="space-y-8">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Pricing Benchmarks by Category</h2>
            <p className="text-slate-400 mb-6">
              Market rates based on published pricing, industry reports, and known contracts.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-white/[0.08] rounded-lg p-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
                  <span>{'\u{1F6F0}\u{FE0F}'}</span> Earth Observation
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Optical (30cm)</span><span className="text-green-400">$25-29/km{'\u00B2'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Optical (70cm-1m)</span><span className="text-green-400">$6-12/km{'\u00B2'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">SAR Imagery</span><span className="text-green-400">$10-25/km{'\u00B2'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Archive Imagery</span><span className="text-green-400">$3.80-14/km{'\u00B2'}</span></div>
                </div>
              </div>

              <div className="bg-white/[0.08] rounded-lg p-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
                  <span>{'\u{1F5A5}\u{FE0F}'}</span> In-Orbit Computing
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">GPU Compute</span><span className="text-green-400">$3-6/GPU-hour</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Edge Compute</span><span className="text-green-400">$0.50-2/hour</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Energy Advantage</span><span className="text-blue-400">~10x vs ground</span></div>
                </div>
              </div>

              <div className="bg-white/[0.08] rounded-lg p-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
                  <span>{'\u{1F4E6}'}</span> Hosted Payloads
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Annual Hosting</span><span className="text-green-400">$500K-$15M/year</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Per kg Rate</span><span className="text-green-400">$25K-75K/kg/year</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Rideshare to LEO</span><span className="text-green-400">$5,500/kg</span></div>
                </div>
              </div>

              <div className="bg-white/[0.08] rounded-lg p-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
                  <span>{'\u{1F4E1}'}</span> Communications
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Ground Station</span><span className="text-green-400">$3-15/minute</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Data Relay</span><span className="text-green-400">$10K-100K/month</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">IoT/M2M</span><span className="text-green-400">$10-500/device/mo</span></div>
                </div>
              </div>

              <div className="bg-white/[0.08] rounded-lg p-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
                  <span>{'\u{2600}\u{FE0F}'}</span> Space Solar Power
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Target LCOE</span><span className="text-green-400">$25-50/MWh</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Demo Phase</span><span className="text-yellow-400">2026-2027</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Commercial</span><span className="text-blue-400">2028+</span></div>
                </div>
              </div>

              <div className="bg-white/[0.08] rounded-lg p-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-3">
                  <span>{'\u{1F4CA}'}</span> Sensor-as-a-Service
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Weather Data</span><span className="text-green-400">$5K-50K/month</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">RF Monitoring</span><span className="text-green-400">$10K-100K/month</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">AIS Tracking</span><span className="text-green-400">$1K-25K/month</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Cost Factors</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4">
                <div className="text-3xl mb-2">{'\u{1F680}'}</div>
                <div className="text-xl font-bold text-white">$5,500/kg</div>
                <div className="text-slate-400 text-sm">Rideshare to LEO</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl mb-2">{'\u{26FD}'}</div>
                <div className="text-xl font-bold text-white">$1M-$10M</div>
                <div className="text-slate-400 text-sm">Annual Ops (per satellite)</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl mb-2">{'\u{1F4C9}'}</div>
                <div className="text-xl font-bold text-white">30-60%</div>
                <div className="text-slate-400 text-sm">Typical Gross Margin</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── REQUEST SERVICE TAB ──────────────── */}
      {activeTab === 'request' && (
        <div className="max-w-2xl mx-auto">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Request Orbital Services</h2>
            <p className="text-slate-400 mb-6">
              Tell us about your requirements and we&apos;ll help match you with the right providers.
            </p>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Request Submitted!</h3>
                <p className="text-slate-400 mb-6">
                  We&apos;ll review your requirements and get back to you soon.
                </p>
                <button onClick={() => setSubmitted(false)} className="btn-secondary">
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-slate-500 text-sm font-medium mb-2">Your Email</label>
                    <input
                      type="email"
                      value={requestForm.email}
                      onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                      className="input"
                      placeholder="you@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-sm font-medium mb-2">Company Name</label>
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
                  <label className="block text-slate-500 text-sm font-medium mb-2">
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
                  <label className="block text-slate-500 text-sm font-medium mb-2">
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
                    <label className="block text-slate-500 text-sm font-medium mb-2">Budget Range</label>
                    <input
                      type="text"
                      value={requestForm.budget}
                      onChange={(e) => setRequestForm({ ...requestForm, budget: e.target.value })}
                      className="input"
                      placeholder="e.g., $10K-50K/month"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-sm font-medium mb-2">Timeline</label>
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
  );
}
